# Persistencia de consultas — P04 técnicamente completada

P04.2 incorpora Sequelize y migraciones; P04.3 conecta la API HTTP con PostgreSQL local; P04.4a incorpora perfiles y TLS. **P04.4b fue validada y aprobada por Homero el 18/11/2026**, con persistencia real en un proyecto Supabase exclusivo de desarrollo y React/Express locales. P04 está técnicamente completada por la evidencia local y remota, registrada por separado abajo. **P01–P04 están completadas para el incremento inicial**: P01/P02 cuentan con auditoría y aprobación formal independientes del 18/11/2026, y P03 conserva su cierre aprobado. Ver [criterios y evidencias en planificación](../../docs/planificación.md#8-criterios-de-aceptación-y-pruebas); no se completan P05–P13.

**La memoria se conserva para pruebas aisladas, sin fallback en ejecución normal.** Las migraciones siguen siendo explícitas. El destino predeterminado y Compose permanecen locales; la base remota operativa no constituye un despliegue público ni incorpora autenticación/autorización de clientes.

## Compatibilidad comprobada

Referencia: 15 de noviembre de 2026. Entorno Node 22.23.4, TypeScript 7.0.2, pnpm 12.3.4, ESM mediante el `tsx` existente y PostgreSQL 17.12 de P03.

| Dependencia directa | Versión fijada | Motivo y soporte declarado |
| --- | --- | --- |
| `sequelize` | 6.37.8 | Familia 6 aprobada; tipos incluidos, Node >= 10. |
| `pg` | 8.23.1 | Controlador PostgreSQL requerido por Sequelize; Node >= 16. |
| `umzug` | 3.8.3 | Migraciones versionadas y `SequelizeStorage`; tipos incluidos, Node >= 12. |

Se verificaron metadatos oficiales antes de instalar e importaciones ESM, comprobación TypeScript sin relajar `strict` ni `skipLibCheck` y ejecución real contra PostgreSQL después de instalar. No se agregaron `sequelize-cli`, `sequelize-typescript`, `ts-node` ni tipos externos de `pg`: el código utiliza la API tipada de Sequelize.

pnpm informó cuatro dependencias transitivas deprecadas (`dottie`, `lodash.get`, `lodash.isequal` y `uuid`); no hubo incompatibilidades bloqueantes ni actualizaciones ajenas al incremento.

**`pg-hstore` no es necesario para este modelo.** La documentación general de Sequelize lo incluye para PostgreSQL, pero el código de 6.37.8 carga ese módulo al utilizar `HSTORE`. Este esquema solo usa INTEGER/TEXT; conexión, migración y lectura/inserción se comprobaron sin el paquete instalado. Si cambian los tipos o la versión, revisar nuevamente esta conclusión.

Fuentes: [compatibilidad de Sequelize](https://sequelize.org/releases/), [tipos TypeScript](https://sequelize.org/docs/v6/other-topics/typescript/), [carga de HSTORE en 6.37.8](https://github.com/sequelize/sequelize/blob/v6.37.8/src/dialects/postgres/data-types.js), [SequelizeStorage 3.8.3](https://github.com/sequelize/umzug/blob/v3.8.3/src/storage/sequelize.ts) y metadatos de npm de [Sequelize](https://registry.npmjs.org/sequelize/6.37.8), [pg](https://registry.npmjs.org/pg/8.23.1) y [Umzug](https://registry.npmjs.org/umzug/3.8.3).

## Configuración y ejecución explícita

Desde la raíz del repositorio, con Node/pnpm y Docker/Compose disponibles, dependencias backend instaladas mediante `pnpm --dir backend install --frozen-lockfile` y una terminal con configuración exclusivamente local, preparar el PostgreSQL de desarrollo según P03:

```powershell
node scripts/postgres.mjs preparar
docker compose up -d --wait postgres
pnpm --dir backend db:migrate
pnpm --dir backend db:status
pnpm --dir backend start
```

Los comandos `start` y `db:*` cargan el `.env` opcional de la raíz con Node, sin agregar dotenv; las variables del proceso tienen prioridad. Se reutilizan `POSTGRES_DB`, `POSTGRES_PORT` y `POSTGRES_SECRETS_DIR` de P03, más `POSTGRES_HOST` para el cliente. Predeterminados: `127.0.0.1:5433`, `docker_laws_dev`, `secrets/postgres/`. Una ruta relativa de secretos se interpreta desde la raíz del repositorio. `.env.example` contiene parámetros públicos; las contraseñas siguen en archivos privados ignorados y no se imprimen.

El preparador genera las claves en `secrets/postgres/` de esta copia; no importa claves ajenas ni las rota en una instancia inicializada. Los comandos anteriores utilizan el proyecto Compose de esa carpeta. Para ensayar desde cero sin reutilizar recursos habituales, seguir la [secuencia aislada del checklist](../../docs/CHECKLIST.md#134-secuencia-powershell-para-la-próxima-reproducción-limpia-pendiente); todavía no fue ejecutada. En la modalidad con aplicaciones en el host solo PostgreSQL requiere Docker; en la modalidad Compose los tres servicios se ejecutan en contenedores. Ver [README principal](../../README.md#instalación-e-inicio).

`leerConfiguracionPostgres('aplicacion')` selecciona exclusivamente `docker_laws_app`/`app.txt`; el runner utiliza `docker_laws_migrator`/`migrator.txt`. No hay selección del usuario administrador ni fallback ante claves ausentes. `crearConexionPostgres` prepara una instancia sin conectar: `authenticate`, consultas y cierre son explícitos.

El esquema `app` debe existir y pertenecer al migrador: lo prepara P03 sobre volúmenes locales nuevos. En Supabase se preparó mediante un procedimiento específico y se verificó en P04.4b; nunca reutilizar allí el inicializador local. Si no existe o fallan permisos, corregir la configuración con revisión; **no eliminar ni reinicializar un volumen de desarrollo**.

## Arranque, API y cierre — P04.3

`index.ts` valida CORS/configuración, autentica el rol de aplicación y prepara `data/formularios-postgres.ts` antes de abrir HTTP. El adaptador comprueba las ocho columnas, tipos, clave primaria y generación de ID, acceso de lectura, permisos de inserción/secuencia y existencia del historial técnico. Solo consulta metadatos de ese historial: sus registros siguen reservados al migrador y se revisan con `db:status`. No ejecuta migraciones ni `sync()` de negocio.

El adaptador cumple `AlmacenFormularios`: crear, listar por ID ascendente y buscar por ID. Proyecta objetos públicos con ID y los siete textos, sin instancias Sequelize. Conserva la conversión histórica de IDs y devuelve 404 para valores inexistentes, fraccionarios, no finitos o fuera de INTEGER. PostgreSQL comienza sin seed; recrear el backend no borra consultas.

`createApp` mantiene almacenamiento inyectable y memoria por defecto para las pruebas existentes. El arranque normal siempre inyecta PostgreSQL. Si falla configuración, conexión, esquema, permisos o escucha, cierra la conexión y termina con error seguro; no levanta una API alternativa en memoria. Los errores durante solicitudes conservan el JSON 500 genérico del middleware.

NUL y sustitutos Unicode aislados se rechazan con HTTP 400 en los siete textos, antes de insertar. Se conservan pares válidos, acentos, espacios, comillas y saltos, sin normalizarlos. El parser también rechaza bytes UTF-8 inválidos y conserva los otros charsets JSON previamente admitidos. Los mensajes y códigos anteriores permanecen para los demás casos; no se agregan formatos de DNI/teléfono.

SIGINT/SIGTERM cierran primero HTTP y después el pool Sequelize; el cierre es idempotente. Las solicitudes HTTP tienen hasta cinco segundos para finalizar antes de cerrar sus conexiones. En Docker Node es el proceso principal para recibir las señales directamente.

Para ejecutar el stack completo, aplicar primero la migración desde el host y después usar `docker compose up --build`. PostgreSQL ya es una dependencia normal, sin perfil optativo. Compose entrega al backend `POSTGRES_HOST=postgres`, puerto interno 5432 y **solo** el secreto de aplicación montado como `/run/secrets/postgres/app.txt`. Las claves de administrador/migrador no se montan en ese servicio. El puerto 5433 permanece local para herramientas del host. Todos los puertos publicados siguen limitados a `127.0.0.1`.

## Esquema, historial y permisos

- `models/consulta.model.ts` define `app.consultas`: `id` INTEGER, PK autogenerada mediante secuencia PostgreSQL; siete TEXT NOT NULL (`nombre`, `apellido`, `dni`, `telefono`, `email`, `asunto`, `mensaje`); `timestamps: false`, sin relaciones ni unicidades nuevas de contacto.
- `migrations/001-crear-consultas.ts` contiene la definición histórica independiente del modelo mutable. Crea la tabla y concede privilegios dentro de una transacción. No carga registros iniciales. El nombre versionado se registra explícitamente en `crearMigrador`; agregar nuevas migraciones al registro, sin editar las ya aplicadas.
- El migrador posee el esquema, la tabla, su secuencia y `app."SequelizeMeta"`. La aplicación solo dispone de SELECT/INSERT en consultas y USAGE en la secuencia; no tiene DDL, UPDATE/DELETE ni acceso al historial. No hay privilegios globales sobre tablas futuras.
- Umzug 3.8.3 admite `schema: 'app'` y `tableName: 'SequelizeMeta'`; se comprobó físicamente. El historial utiliza la columna `name` (VARCHAR(255), NOT NULL, clave primaria), sin timestamps. Su almacenamiento crea la tabla técnica con `sync()` sin opciones destructivas, incluso al consultar estado por primera vez. **No se sincroniza el modelo de negocio** ni se utiliza `force`/`alter`.

La segunda ejecución consulta el historial y no repite la migración. La CLI solo admite `up` y `status`; no expone `down`, `rerun` ni limpieza de bases. Los fallos producen salida distinta de cero y mensajes seguros con nombre de migración o SQLSTATE cuando corresponda.

Ejecutar un solo runner a la vez. La transacción de la migración protege su DDL y concesiones; el registro posterior de Umzug es otra operación. Si el proceso se interrumpe entre ambas, revisar tabla e historial antes de reintentar. Este incremento no agrega coordinación entre migradores concurrentes ni recuperación destructiva.

## Actualización local de 001 a 002

La revisión que incorpora cuentas prepara los almacenes de consultas y usuarios antes de abrir HTTP. Una base con solo `001-crear-consultas` requiere aplicar explícitamente `002-crear-usuarios` antes de arrancar ese backend. `002` agrega `app.usuarios` y su secuencia en una transacción. Se conservan `app.consultas`, sus permisos y el registro de `001`. El rol migrador posee los objetos nuevos. El rol de aplicación recibe `SELECT` e `INSERT` sobre usuarios y `USAGE` sobre su secuencia, y conserva la separación respecto del historial.

1. En el destino local acordado, verificar la revisión que se desea arrancar, la configuración de conexión y el respaldo cuando corresponda. Antes de migrar, revisar que el historial contenga `001`, que `app.usuarios` y su secuencia no estén creadas, y registrar el conteo de consultas. Hacer la comprobación con un solo migrador y una terminal con configuración local.
2. Ejecutar los siguientes comandos desde la raíz, uno por uno. Continuar solo si el paso anterior terminó correctamente. En el estado esperado, la CLI aplica únicamente `002-crear-usuarios`.

   ```powershell
   pnpm --dir backend db:migrate
   pnpm --dir backend db:status
   ```

3. Confirmar `001` y `002` en el historial, sin pendientes, y el conteo conservado de consultas. Verificar las cinco columnas `NOT NULL`, PK `id`, `UNIQUE(email)`, `usuarios_tipo_check`, índices válidos, secuencia y permisos. Arrancar Express con `pnpm --dir backend start` o seguir el inicio de Compose documentado arriba. El arranque usa `docker_laws_app`.

Para practicar la actualización, `pnpm --dir backend test:postgres --limpiar` usa las dos instancias descartables del runner. La suite de migraciones aplica solo `001` mediante Umzug, inserta una consulta ficticia como aplicación y verifica que Express exige `002`. Después aplica `002` con la CLI, recupera por HTTP la consulta previa con su ID y contenido, y comprueba alta, duplicado y login sobre PostgreSQL. Repite el migrador y verifica que no quede nada pendiente. La otra suite conserva el escenario de instalación desde una base vacía.

### Recuperación si falla la migración

Guardar la salida segura, detener el arranque y consultar el estado antes de reintentar. Con el rol migrador en el destino autorizado, usar consultas de solo lectura para contrastar los objetos con `app."SequelizeMeta"`. La CLI `db:status` es local y puede inicializar el historial técnico.

```sql
SELECT to_regclass('app.usuarios') AS usuarios,
       to_regclass('app.usuarios_id_seq') AS secuencia;
-- Consultar solo si se verificó la existencia del historial.
SELECT name FROM app."SequelizeMeta" ORDER BY name;
```

| Estado constatado | Acción |
| --- | --- |
| `002` ausente del historial y sin objetos nuevos | Si el DDL se revirtió, corregir la causa y cotejar que las consultas y `001` siguen intactas. Reintentar con un solo migrador en el destino autorizado. |
| `002` ausente del historial y con tabla, secuencia o restricciones existentes | Posible interrupción después del commit del DDL y antes del registro en Umzug. Suspender reintentos. Un nuevo `up` puede fallar al agregar otra vez `usuarios_tipo_check`. Cotejar estructura, propietarios, permisos, datos e historial con el respaldo y acordar una recuperación específica antes de escribir. |
| `002` registrada y objetos completos | La repetición normal de `up` debe indicar que no hay pendientes. Si Express falla, revisar configuración y permisos del rol de aplicación. |
| `002` registrada y objetos incompletos o distintos | Detener el arranque y acordar reparación o restauración verificada. El historial por sí solo no acredita convergencia del esquema. |

La CLI no ofrece `down`. Conservar ambos archivos de migración y revisar cualquier reparación del historial o restauración antes de ejecutarla. La validación de este ensayo corresponde al PostgreSQL local descartable. Supabase requiere su propio procedimiento, autorización en el momento y las comprobaciones de [seguridad y despliegue](../../docs/PLAN-SEGURIDAD-DESPLIEGUE.md#actualización-de-supabase-y-recuperación).

## Verificación reproducible

```powershell
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir backend test:postgres --limpiar
node --test scripts/postgres.test.mjs
```

La suite normal no necesita PostgreSQL. `test:postgres` reutiliza las protecciones de P03 y crea **una instancia nueva por suite**, con UUID, Compose de pruebas, puerto local aleatorio, claves sintéticas y volumen propios. No acepta una URL externa. Antes del DDL exige el destino temporal y un esquema sin tablas. Conserva las comprobaciones de migraciones/roles y agrega la API real: base vacía, contratos, orden, concurrencia, conservación de textos, rechazos sin inserción, recreación del servidor, arranques fallidos, errores seguros y cierre. Las suites no comparten base ni limpian tablas del desarrollo.

`--limpiar` retira exclusivamente sus recursos nuevos después de acreditar propiedad; sin esa opción conserva recursos detenidos y comunica sus nombres. Nunca usa el volumen habitual de desarrollo. Las pruebas solo insertan datos ficticios en la instancia descartable.

Antecedente de P04.2, aprobada por el usuario: 245 pruebas backend, 8 pruebas/subpruebas de integración PostgreSQL y 30 pruebas de las protecciones de P03 aprobadas; typecheck correcto. Se verificaron los comandos pnpm de migración/estado, la eliminación exclusiva de los recursos nuevos y la conservación del inventario Docker previo. En ese incremento todavía no se había validado Supabase ni cerrado P04.

Evidencia técnica de P04.3 — 16 de noviembre de 2026, posteriormente aprobada por el usuario:

- 271 pruebas backend aprobadas también con todos los contenedores PostgreSQL detenidos/retirados; typecheck correcto. 66 pruebas frontend aprobadas, sin modificar su código.
- Integración en instancias descartables separadas: 8 pruebas/subpruebas de migraciones y 12 de API aprobadas. Incluye base vacía, concurrencia, validación previa a inserción, fallos de arranque/permisos, errores seguros y conservación tras recrear el servidor.
- Stack Docker completo probado con puertos locales propios y datos ficticios: frontend y configuración API, CORS, creación/consulta y persistencia tras reiniciar el contenedor. Una caída real de PostgreSQL produjo 500 genérico; SIGTERM cerró el backend con salida 0.
- Imagen backend inspeccionada con 24 fixtures sintéticos: cero archivos privados detectados, control público conservado. Host Node 22.23.4 y contenedor Node 22.23.5; Docker 29.4.2.
- Se retiraron solo los recursos nuevos acreditados; permanecen los mismos 53 volúmenes y 3 redes preexistentes, sin contenedores adicionales. No se migró ni limpió el volumen habitual de desarrollo.

La aplicación sigue sin autenticación/autorización funcional y debe utilizar solo datos ficticios en un entorno controlado. `/health` conserva su contrato de estado del proceso; no es una comprobación continua de disponibilidad de la base. Esta evidencia local por sí sola no acreditaba el hito Supabase, registrado más adelante.

## P04.4a — Perfiles locales preparados, sin conexión a Supabase

La selección es explícita mediante `POSTGRES_TARGET=local|supabase-dev`. Su ausencia conserva únicamente el destino local por compatibilidad con P03; nunca se infiere Supabase a partir del host. Un valor desconocido, parámetros remotos en un perfil local o un perfil remoto incompleto impiden crear la conexión. No hay fallback a otra base ni a memoria.

Compose sigue siendo exclusivamente local: fija `POSTGRES_TARGET=local`, `POSTGRES_HOST=postgres` y no recibe parámetros TLS ni credenciales Supabase. El `.env` habitual debe conservarse local. Un perfil remoto se prepara por separado bajo `secrets/`, excluido de Git y de las imágenes.

### Variables definitivas

| Variable | Local | `supabase-dev` |
| --- | --- | --- |
| `POSTGRES_TARGET` (nueva) | `local`; predeterminado compatible | Obligatoria: `supabase-dev`. Evita inferir destinos. |
| `POSTGRES_HOST` | `127.0.0.1` predeterminado; admite `localhost`, `::1` y el servicio Docker `postgres` | Obligatoria. Directo: `db.<REF>.supabase.co`. Session: host exacto de Connect con formato `aws-<número>-<región>.pooler.supabase.com`. No admite IP, URL ni sufijos ajenos. |
| `POSTGRES_PORT` | `5433` desde host; `5432` dentro de Compose | Obligatoria: `5432`. No admite transaction pooler/6543. |
| `POSTGRES_DB` | `docker_laws_dev` predeterminado | Obligatoria: `postgres`. La referencia del proyecto no es el nombre de la base. |
| `POSTGRES_SECRETS_DIR` | `./secrets/postgres` predeterminado | Directorio privado independiente, obligatorio; se recomienda `./secrets/supabase-dev/<REF>`. Se rechazan las rutas estándar locales. |
| `POSTGRES_CONNECTION_MODE` (nueva) | No debe estar definida, ni vacía | Obligatoria: `direct` o `session`; determina host y usuario de transporte. |
| `SUPABASE_PROJECT_REF` (nueva) | No debe estar definida | Referencia de veinte caracteres alfanuméricos en minúscula; vincula host directo, usuario agrupado y confirmación del migrador. No es una credencial. |
| `POSTGRES_SSL_CA_FILE` (nueva) | No debe estar definida | Ruta obligatoria a la CA PEM correspondiente al endpoint elegido. No se descarga automáticamente. |

Las rutas relativas se resuelven desde la raíz del repositorio. No se incorporan variables de contraseña, usuario libre, URL, tamaño de pool ni un selector para reducir TLS. Se rechazan `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_SSL_MODE` y las variables alternativas `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE`, `PGSSLROOTCERT`, `PGSSLCERT`, `PGSSLKEY`, `PGSERVICE` y `PGSERVICEFILE`. Sus valores no se incluyen en los errores.

**Roles y secretos:** la aplicación lee solo `app.txt` y el runner solo `migrator.txt`. Se conserva el formato de P03: exactamente 48 caracteres hexadecimales en minúscula, sin salto de línea. En la preparación remota deberán generarse claves independientes para esos roles; no se utiliza la contraseña del administrador. En modo directo se envía `docker_laws_app` o `docker_laws_migrator`; en session pooler se agrega `.<REF>`. El rol SQL esperado sigue siendo el nombre sin sufijo. No se cambió la comprobación de permisos del almacén.

### TLS y límites de conexión

Sequelize recibe `dialectOptions.ssl` con la CA leída, `rejectUnauthorized: true` y `servername` igual al host validado. La CA debe contener certificados PEM de autoridad vigentes. Node/pg verifican la cadena y el nombre del servidor; no se reemplaza `checkServerIdentity`. `NODE_TLS_REJECT_UNAUTHORIZED=0` se rechaza en el perfil remoto. Una CA ausente, inválida o incompatible debe corregirse: nunca se recurre a `rejectUnauthorized: false`. En local se fija `ssl: false`, sin heredar opciones ambientales.

Se mantiene el pool existente de **máximo dos conexiones por proceso**, sin mínimo precalentado ni ajuste nuevo. El migrador tiene su propia instancia y la cierra al terminar. Dos procesos de aplicación podrían consumir cuatro conexiones; revisar capacidad antes de multiplicarlos. Solo debe ejecutarse un migrador a la vez.

### Procedimiento para un proyecto Supabase autorizado

P04.4b ya fue ejecutada y aprobada en el proyecto de desarrollo, con el alcance de evidencia del cierre. El procedimiento se conserva como referencia: **no autoriza repetir migraciones, preparar otros proyectos ni realizar nuevas escrituras remotas**. Los ejemplos contienen solo parámetros públicos y deben revisarse para cada operación autorizada.

1. Crear y autorizar un proyecto nuevo, aislado y exclusivamente de desarrollo. Registrar su referencia, región y responsable; usar únicamente datos sintéticos. No utilizar un proyecto compartido existente ni publicar la aplicación.
2. Revisar Connect: preferir conexión directa si existe conectividad IPv6; utilizar session pooler/5432 cuando se necesite IPv4. Confirmar el host y certificado aplicables al modo elegido. La CA del endpoint debe validar su nombre; no asumir que todos los endpoints presentan la misma cadena. Un endpoint distinto del formato soportado requiere revisión, sin flexibilizar silenciosamente la validación.
3. Preparar y revisar un procedimiento remoto específico de roles y permisos: esquema `app` propiedad de `docker_laws_migrator`, `USAGE` para aplicación; migrador con DDL/historial y capacidad de otorgar los permisos previstos; aplicación con `SELECT`/`INSERT` y uso de secuencia tras migrar, sin DDL ni acceso al historial. **No ejecutar `docker/postgres/inicializar.sh` en Supabase**: sus operaciones globales pertenecen al PostgreSQL local. Los privilegios administrados y cualquier concesión necesaria deberán comprobarse y aprobarse antes de escribir.
4. Mantener `app` fuera de los esquemas expuestos por la Data API y revisar sus permisos predeterminados. Si no se utiliza la Data API, evaluar desactivarla. No conceder acceso a `anon`, `authenticated` o `service_role` para facilitar pruebas. RLS no sustituye las futuras decisiones de autorización de Express.
5. Guardar CA y claves fuera de Git, con acceso restringido del usuario. Preparar el siguiente perfil **en un archivo privado** `secrets/supabase-dev/<REF>/conexion.env`, sustituyendo `<REF>` y las rutas, sin contraseñas ni URLs:

   ```dotenv
   POSTGRES_TARGET=supabase-dev
   POSTGRES_CONNECTION_MODE=session
   SUPABASE_PROJECT_REF=<REF>
   POSTGRES_HOST=<HOST_SESSION_POOLER_DE_CONNECT>
   POSTGRES_PORT=5432
   POSTGRES_DB=postgres
   POSTGRES_SECRETS_DIR=./secrets/supabase-dev/<REF>
   POSTGRES_SSL_CA_FILE=./secrets/supabase-dev/<REF>/ca.crt
   ```

   Sustituir los marcadores por la referencia y el host Session pooler indicados en Connect; no construir el host a partir de la región. Este es el modo comprobado en P04.4b. Para conexión directa, el código admite `direct` y `db.<REF>.supabase.co`, pero no se registra su validación real en este proyecto. El código deriva el usuario según el modo. No copiar este perfil sobre `.env` local ni emplear los fixtures TLS públicos de las pruebas.

6. Antes de cualquier nueva ejecución autorizada, verificar conexión TLS autenticada y permisos sin utilizar el runner de historial. **`db:status` no es una comprobación remota de solo lectura**: Umzug puede crear `app."SequelizeMeta"`; el runner lo bloquea para Supabase. Revisar SQL y estado antes de ejecutar. La invocación explícita de referencia, desde `backend`, es:

   ```powershell
   node --env-file=../secrets/supabase-dev/<REF>/conexion.env --import tsx database/migrate.ts up --supabase-project <REF>
   ```

   El argumento no es un secreto: debe coincidir con el perfil. Sin confirmación, con referencia diferente o con `status`, el proceso falla antes de leer claves o abrir conexión. Esta barrera prueba la selección deliberada, no certifica por sí sola que el proyecto haya sido autorizado por el equipo. No hay migración automática al iniciar Express ni rollback remoto.

7. Registrar las comprobaciones realmente realizadas sobre historial, estructura, permisos, API y conservación al reiniciar, siempre con datos ficticios y acceso HTTP local controlado. La idempotencia, búsqueda por ID, concurrencia y fallos tienen regresión local; no atribuirlos a Supabase sin evidencia de ese ensayo. Una repetición remota requiere autorización específica y revisión previa del estado. La suite local `test:postgres` **no debe reutilizarse contra Supabase**, porque incluye DDL y ensayos de permisos. No ejecutar limpiezas ni pruebas negativas destructivas remotas.

### Aislamiento y evidencia local

Los helpers Docker descartan variables `COMPOSE_*`, `POSTGRES_*`, `DATABASE_*`, `SUPABASE_*` y `PG*` heredadas y fuerzan `POSTGRES_TARGET=local`; el runner vuelve a hacerlo para el proceso de pruebas. Antes de cualquier DDL, el helper exige además ausencia de parámetros remotos, host loopback, base de pruebas, UUID y carpeta temporal propios. No se ampliaron las opciones de limpieza: solo recursos Docker nuevos con nombres y etiquetas acreditados, sin destinos externos. Estas protecciones no constituyen un mecanismo para limpiar Supabase.

Evidencia ejecutada el **16/11/2026**:

- `pnpm --dir backend test`: **288 pruebas aprobadas**, incluidas 17 nuevas de configuración, roles, barreras de migración/DDL y TLS. El handshake TLS real se ejecutó únicamente en `127.0.0.1`, con CA/certificado/clave públicos y sintéticos identificados en `tests/fixtures/tls-local/README.md`: aceptación de CA/nombre correctos y rechazo de CA ajena o nombre incorrecto. No se simuló una autenticación PostgreSQL exitosa.
- `pnpm --dir backend typecheck`: aprobado, conservando el perfil estricto y la prueba negativa temporal existente. No se agregaron dependencias ni se modificaron lockfiles.
- `node --test scripts/postgres.test.mjs`: **33 pruebas aprobadas**, incluidas la neutralización del perfil remoto heredado, configuración Compose local y rechazo de opciones de destino externo, además de las barreras de limpieza existentes.
- `docker compose --env-file .env.example config --quiet` y su variante `-f docker-compose.test.yml`: aprobadas. El motor Docker estaba detenido (pipe del daemon no disponible); no se repitieron integración PostgreSQL real, builds ni arranque de contenedores en esta revisión. No se ejecutaron limpiezas ni se modificaron recursos Docker.
- Exclusión de `.env`, perfiles, claves y CA bajo `secrets/` y de los documentos privados SDD comprobada mediante `git check-ignore`. Revisión de cambios y `git diff --check` correctos, sin tocar staging ni ramas.

La revisión posterior de P04.4a cerró la comprobación pendiente con Docker disponible: `pnpm --dir backend test:postgres --limpiar` aprobó 8 pruebas/subpruebas de migraciones y 12 de API. El proceso padre incluyó variables remotas ficticias e inválidas; fueron descartadas y se utilizó exclusivamente PostgreSQL local. Se repitieron las 17 pruebas de configuración/TLS y las 33 de protección, todas aprobadas. La limpieza retiró solo recursos nuevos y el inventario inicial/final coincidió: 53 volúmenes, 3 redes y ningún contenedor. `git diff --check` correcto. Se registra la ejecución previa sin repetirla en esta actualización documental.

Ninguna prueba sintética o handshake en loopback acredita Supabase. La evidencia real siguiente corresponde a P04.4b y está diferenciada de las suites automatizadas locales.

## P04.4b — Validación real en Supabase y cierre técnico de P04

**Registro y aprobación:** 18 de noviembre de 2026. **Fuente:** evidencia aportada y resultado técnico aprobado formalmente por Homero. Codex actualizó la documentación a partir de esa confirmación, sin abrir conexiones ni repetir migraciones o pruebas remotas. El entorno fue un proyecto Supabase exclusivo de desarrollo, con frontend React y backend Express ejecutándose localmente.

- **Conexión:** PostgreSQL 17.12 mediante Session pooler, puerto 5432, TLS verificado con CA y nombre del servidor. Data API desactivada y SSL obligatorio. Autenticación independiente de aplicación y migrador; el código adapta el usuario de transporte con la referencia del proyecto y mantiene los nombres SQL `docker_laws_app` y `docker_laws_migrator`.
- **Esquema y seguridad:** `app` pertenece al migrador. La aplicación tiene privilegios restringidos, sin UPDATE, DELETE, CREATE ni acceso al historial, según la verificación del usuario. La autenticación de estos roles técnicos no implica cuentas ni autorización funcional de clientes.
- **Migración:** `001-crear-consultas` ejecutada correctamente con Umzug. `app.consultas`, su secuencia, los propietarios y el historial `app."SequelizeMeta"` fueron verificados. La tabla comenzó vacía; no se cargaron seeds automáticos.
- **Flujo real:** GET `/formulario` inicialmente vacío; envío satisfactorio de un formulario ficticio desde React hacia Express local conectado mediante Sequelize a Supabase. Registro con ID 1 comprobado por HTTP y SQL Editor. El contenido personal ficticio no se reproduce en estos documentos.
- **Persistencia:** se detuvo y reinició únicamente el backend; el registro permaneció en la base remota. No se presenta como prueba de recuperación del servicio Supabase ni como reinicio de su infraestructura.

**Criterios de cierre:** contrato asíncrono y rutas/JSON existentes, búsqueda por ID, idempotencia de migración, concurrencia, validaciones, fallos seguros y recuperación controlada se acreditaron mediante la regresión local. La primera migración remota, roles/TLS y flujo real con persistencia se acreditan mediante la evidencia de Homero. No se afirma que las suites locales se hayan ejecutado contra Supabase, que haya habido una segunda migración remota ni que se hayan realizado pruebas destructivas remotas. Con ambos hitos cubiertos, **P04 está técnicamente completada**. P01 y P02 también están completadas y aprobadas por su auditoría independiente, registrada en planificación; ese cierre documental no añade resultados a la validación Supabase.

**Límites operativos:** la base remota es operativa para el prototipo de desarrollo; la aplicación no está desplegada públicamente. Continúan pendientes autenticación y autorización de usuarios, reglas de acceso a consultas y decisiones de despliegue, Caddy y HTTPS de la aplicación. El TLS verificado hacia PostgreSQL no acredita HTTPS del sitio. Se mantienen datos ficticios, credenciales en archivos privados excluidos de Git, ejecución explícita de migraciones con confirmación del proyecto y prohibición de dirigir los inicializadores, suites y limpiezas locales hacia Supabase. No se publican secretos ni se autoriza uso productivo por este cierre.

Fuentes oficiales consultadas: [modos de conexión Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres), [verificación TLS](https://supabase.com/docs/guides/platform/ssl-enforcement), [configuración SSL de pg y advertencia sobre URLs](https://node-postgres.com/features/ssl) y [seguridad de la Data API](https://supabase.com/docs/guides/api/securing-your-api).
