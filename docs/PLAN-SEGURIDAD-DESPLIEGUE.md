# Plan de seguridad y despliegue de Docker-laws

El seguimiento comienza el **24/11/2026**. Homero dirige la revisión técnica, confirma cada incremento en Git y opera los servicios externos. El alcance es completar el sistema de cuentas de la PR #30, proteger las consultas y preparar una demostración con React/Vite en Vercel, Express/TypeScript en Render y PostgreSQL en Supabase. La publicación requiere autorización y comprobaciones específicas. Para pruebas y demostración se utilizarán datos ficticios.

## Punto de partida

- [PR #30 de Matías](https://github.com/nicc-essp/MetodologiaDeSistemasII/pull/30), `feature/cuentas-usuarios` → `develop`. Revisión local inicial `9f03385ac78449b9b12683eea0d5fa7280ce9184`, con ancestro común `1a13803cbc619be7ab9a0400b71e100af298eedb`. El diferencial de la PR incorpora 26 commits y afecta 27 archivos. Árbol y staging limpios al retomar el trabajo. Los dos archivos sin seguimiento detectados en el intento anterior ya no estaban presentes.
- Node 22, Express 5, TypeScript, React/Vite, Sequelize 6, Umzug 3, PostgreSQL 17, Docker Compose y pnpm 12.3.4. La PR incorpora `bcryptjs` 3.0.3, `app.usuarios`, autenticación por contraseña y sesiones opacas en memoria. Express verifica ambas tablas y permisos antes de escuchar.
- Matías declara «Aún no apto para validación de usuarios, fase de muestra». El servidor comprueba credenciales y sesiones en `/auth/me`. Las consultas siguen accesibles sin sesión y el registro permite elegir `representante`. El servidor carece de reglas de permisos o pertenencia para las consultas.
- La reproducción previa registró **437 casos únicos** en [CHECKLIST](CHECKLIST.md#144-suites-y-verificaciones-adicionales-de-la-reproducción). La auditoría de la PR ejecutó **288** casos backend, **66** frontend y **33** de protecciones PostgreSQL sin base real. Pasaron typecheck y build. Falló ESLint en `AuthContext.jsx`. Una verificación HTTP con memoria confirmó el acceso anónimo a consultas y el 400 incorrecto frente a fallos del almacén. PostgreSQL real y despliegue quedan por verificar para esta revisión.
- Se conserva la separación del rol migrador y el de aplicación, el historial Umzug y el destino local de Docker. D05 y D06 siguen pendientes en [planificación](planificación.md#4-decisiones-técnicas-y-estado). P05/P06 conservan sus criterios y requieren evidencia de cierre.

## Coordinación y registro

Cada turno implementa un incremento. Al terminar se revisan el alcance y `git diff --check`, se registran comandos, resultados y pendientes, y se entregan rutas explícitas para staging y un mensaje de commit. Homero realiza el commit. Con «Siguiente» se verifica que el incremento esté confirmado en Git, se registra su SHA y se trabaja exclusivamente en el próximo. Un cambio inesperado o un bloqueo detiene el avance. El historial conserva los resultados con el entorno y revisión evaluados.

Se trabaja en rama de trabajo y con lockfiles existentes. El código y las pruebas pueden realizarse dentro del mismo incremento, sin TDD ni Spec Kit. Las pruebas destructivas se limitan a los procedimientos protegidos aprobados y sus instancias nuevas descartables. Las operaciones remotas requieren autorización expresa en el momento de ejecutarlas.

## Hallazgos que guían el plan

| ID | Evidencia inicial | Incremento |
| --- | --- | --- |
| B01 | `AuthContext.jsx` exporta un componente y un hook. ESLint falla con `react-refresh/only-export-components`. | INC-01 |
| B02 | `backend/index.ts` exige cuentas antes de abrir HTTP. Falta probar la actualización de una base que solo aplicó `001`. | INC-03 |
| B03 | `formulario.routes.ts` permite listado y detalle sin sesión. Bloquea la publicación abierta. | INC-04 e INC-08 |
| I01 | El alta permite autodeclararse representante, aunque el tipo todavía no concede permisos. | INC-04 y revisión en INC-05 |
| I02 | Falta el límite de 72 bytes UTF-8 de bcrypt y el control de intentos y de enumeración de cuentas. | INC-05 |
| I03 | Si falla el logout, React limpia el usuario pero conserva el token local. El perfil puede quedar visible tras vencer. | INC-05 |
| I04 | El `Map` de sesiones es por proceso y solo elimina vencidas cuando se vuelven a consultar. | INC-05 |
| I05 | `auth.controller.ts` convierte fallos inesperados del almacén en 400. | INC-01 e INC-02 |
| I06 | El historial Umzug se escribe después de confirmar el DDL. El arranque no coteja `UNIQUE(email)` ni `CHECK(tipo)`. | INC-03 e INC-05 |
| I07 | Las aserciones añadidas por la PR cubren algunas propiedades de migración y permisos, sin probar el contrato de cuentas. | INC-02 e INC-03 |
| M01 | DTO sin referencias y alta React seguida de un login que puede fallar cuando la cuenta ya fue creada. | DTO en INC-01, experiencia de alta en INC-05 |

## Decisiones de seguridad pendientes

### Política propuesta para INC-04

Homero debe aprobar la política antes de cambiar contratos. La propuesta inicial aplica a una demostración con representantes habilitados y un conjunto ficticio de consultas.

| Operación | Sin sesión válida | Cliente autenticado | Representante autorizado |
| --- | --- | --- | --- |
| `GET /health` | Público | Público | Público |
| `POST /formulario` | Público, con validación y protección contra abuso | Igual | Igual |
| `GET /formulario` y `GET /formulario/:id` | 401 | 403 | Respuesta actual, incluido 404 para un ID inexistente |
| `POST /auth/register` | Alta pública con tipo `cliente` asignado por servidor | Mismo contrato | Mismo contrato |
| `POST /auth/login` | Verificación de credenciales | Mismo contrato | Mismo contrato |
| `GET /auth/me` | 401 | Perfil público propio | Perfil público propio |
| `POST /auth/logout` | Cierre idempotente | Revoca el token presentado | Revoca el token presentado |

La comprobación de sesión y rol se realiza en Express antes de consultar los datos. React refleja el permiso y trata 401/403. Si se conserva temporalmente `tipo` en el cuerpo del alta, la propuesta es aceptar solo `cliente` y rechazar la solicitud de `representante`. Hay que aprobar expresamente si los representantes habilitados pueden leer todas las consultas de la demostración. Una partición futura por representante requerirá sus propias reglas. El correo declarado no acredita titularidad y queda excluido como criterio para asociar consultas históricas.

Para preparar representantes ficticios se propone un comando privado operado fuera de la aplicación web, con la misma validación y hashing de cuentas y los permisos de base mínimos. Recibirá la contraseña por un canal privado, sin incluirla en argumentos ni logs. Solo creará cuentas nuevas y tratará duplicados sin promover roles. Las filas de tipo `representante` que puedan haberse creado por registro público deberán revisarse antes de confiar en esa etiqueta. Sintaxis y procedimiento quedan para INC-04. No se prevé un endpoint administrativo público.

### Sesiones, abuso y transporte para INC-05

- Para una sola instancia de Render se propone conservar tokens opacos con sesiones acotadas en memoria, vencimiento, revocación y depuración comprobables. Un reinicio o despliegue exige ingresar otra vez. Si se necesita continuidad o más instancias, evaluar antes una tabla PostgreSQL de sesiones con huella del token, referencia al usuario, vencimiento y permisos mínimos. Cualquier persistencia de sesiones requiere aprobación con sus consecuencias.
- Aplicar validaciones consistentes de alta/login y el límite UTF-8 de bcrypt. Acordar el tratamiento de cuentas anteriores, normalización de correo y respuesta a duplicados antes de alterar filas o unicidad.
- Limitar intentos de login, alta y creación pública de consultas. Si se usa la IP detrás de Render, verificar los proxies de confianza y el origen de la dirección antes de fijar el límite. Probar los rechazos y que el tráfico legítimo mantiene su contrato.
- Limpiar el token local y actualizar la interfaz al terminar una sesión. Ante fallo de red en logout, comunicar que la revocación remota puede no haberse confirmado. Usar HTTPS para tokens en entornos públicos, CORS por orígenes explícitos y respuestas de autenticación sin caché. Mantener credenciales, hashes y tokens fuera de logs y conservar la proyección pública de cuentas.

## Incrementos y aceptación

Las rutas delimitan los puntos previstos de cambio. El conjunto exacto de archivos se confirma con el diff de cada incremento.

| Incremento | Dependencias y archivos previstos | Aceptación |
| --- | --- | --- |
| **INC-01 · Correcciones básicas** | Base auditada. `backend/controllers/auth.controller.ts`, DTO sin uso en `backend/models/`, `frontend/src/context/`, `pages/Login.jsx`, `pages/Register.jsx` y `components/layout/Navbar.jsx`. | ESLint pasa y se conserva el flujo normal de cuentas. Entradas inválidas, duplicados y sesiones no válidas conservan 400/409/401. Los fallos inesperados devuelven 500 seguro. Suites, typecheck y build pasan. |
| **INC-02 · Pruebas de cuentas** | INC-01 confirmado. `backend/tests/`, helpers existentes y entrada explícita de `test` en `backend/package.json` si corresponde. Pruebas React en `frontend/src/`. | Registro válido, entradas y contraseñas inválidas, duplicado, login correcto e incorrecto, token ausente o inválido, sesión vencida, logout, revocación, perfiles sin hash y errores internos. Flujos React con red controlada. Fixtures y tiempo de prueba aislados. |
| **INC-03 · Actualización PostgreSQL** | INC-02 confirmado. `backend/tests/database.integration.test.ts`, `backend/tests/formulario.postgres.test.ts`, helpers protegidos y guía de base. Revisión de `002` y Umzug. | Instancia nueva descartable con solo `001` y consultas ficticias. Se aplica `002`, se comprueban estructura, índices, roles, secuencia y permisos. Express arranca con rol restringido y recupera las consultas previas. Segunda ejecución sin pendientes y recuperación documentada. |
| **INC-04 · Autorización en API y React** | INC-03 confirmado, política D05/D06 y alta de representantes aprobadas. Rutas, middleware, servicio/validación de cuentas, vistas y servicios React, pruebas HTTP y UI. | Lectura por HTTP directo con anónimo 401, cliente 403 y representante autorizado con resultado esperado. Alta pública restringida al tipo acordado. Preparación privada y reproducible de representantes ficticios. |
| **INC-05 · Endurecimiento de cuentas y sesiones** | INC-04 confirmado. Servicio y validaciones de cuentas, adaptador PostgreSQL, controles de solicitudes y cliente/contexto React. | Límites, expiración, depuración, revocación y fallos de red cubiertos. Restricciones físicas revisadas. Respuestas y logs seguros. Decisión sobre continuidad de sesiones y cuentas preexistentes registrada. |
| **INC-06 · Backend para Render** | INC-05 confirmado. `backend/index.ts`, configuración, scripts de inicio y guía. Dockerfiles o Compose solo si lo necesita la compatibilidad. | `PORT` validado, escucha en `0.0.0.0`, health y cierre comprobados. Compilación o uso de `tsx` justificado y verificado. Defaults locales preservados, perfil remoto explícito, TLS verificado y migraciones separadas del servicio. |
| **INC-07 · Frontend para Vercel** | INC-06 confirmado. Configuración de despliegue en `frontend/`, ejemplo de entorno y guía si corresponde. | Build reproducible a `dist`, navegación directa y recargas SPA, destino público y CORS documentados, sesiones y errores comprensibles. Verificar teclado y nombres accesibles donde haya cambios de interfaz. |
| **INC-08 · Regresión previa a publicación** | INC-07 confirmado. Entorno local independiente, verificadores existentes y documentación. | Instalación por lockfile, suites, tipos, lint, build, infraestructura, migraciones y roles probados. Recorrido anónimo/cliente/representante ficticio, persistencia después de reiniciar Express y ciclo de sesión acordado. Conteo real por caso sin duplicar contenedores TAP. Dictamen y bloqueos registrados. |

INC-03 reutiliza `pnpm --dir backend test:postgres --limpiar` y el runner protegido o su suite de integración para el escenario de actualización. Los helpers fuerzan loopback, base y claves temporales, destino local y proyecto Compose único. Aplicar `001` primero en esa instancia, insertar la consulta ficticia y ejecutar el runner normal con `002`. Comparar ID y contenido, inspeccionar restricciones y permisos de `app.usuarios` y revisar historial y repetición. Presentar cualquier procedimiento Docker nuevo para aprobación antes de ejecutarlo. Conservar `001` y cualquier migración aplicada en Supabase. Una eventual corrección de `002` depende de su historial y debe justificarse antes de elegir entre ajustar la migración o añadir otra.

Comandos para las verificaciones base.

```powershell
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
git diff --check
```

INC-08 añade `node --test scripts/postgres.test.mjs scripts/verificar-docker.test.mjs`, `node scripts/verificar-docker.mjs --modo contexto`, `node scripts/verificar-docker.mjs --modo imagenes` y el runner PostgreSQL protegido. Revisar precondiciones de Docker y registrar ejecución, resultado y motivo de toda omisión. Los 437 casos históricos son una referencia de comparación.

## Preparación de plataformas

### Render

- Servicio Express con directorio raíz `backend/`, Node 22 compatible y pnpm 12.3.4. Comando previsto de instalación `pnpm install --frozen-lockfile` desde ese directorio. El arranque actual es `pnpm start` con `tsx`. Si se elige mantenerlo, conservar `tsx` en la instalación que efectivamente ejecutará el servicio. Registrar los comandos definitivos después de INC-06.
- Validar `PORT` asignado, escucha en `0.0.0.0` y health check HTTP `/health`. El health actual informa del proceso y el esquema se verifica al arrancar. Configurar `CORS_ORIGINS` con el origen HTTPS exacto de Vercel y aprobar cualquier otro origen de prueba.
- El perfil esperado para Session pooler usa `POSTGRES_TARGET=supabase-dev`, `POSTGRES_CONNECTION_MODE=session`, `SUPABASE_PROJECT_REF`, `POSTGRES_HOST` exacto, `POSTGRES_PORT=5432`, `POSTGRES_DB=postgres`, `POSTGRES_SECRETS_DIR` y `POSTGRES_SSL_CA_FILE`. Usar las rutas privadas asignadas a `app.txt` y la CA, como `/etc/secrets/` si corresponde. La credencial `migrator.txt` pertenece al entorno separado del operador. Conservar validación de CA y nombre, y verificar que el pool de dos conexiones por proceso sea adecuado.
- Revisar cierre ordenado y logs seguros. Ver [servicios y puertos en Render](https://render.com/docs/web-services#port-binding) y [archivos privados](https://render.com/docs/configure-environment-variables#secret-files).

### Vercel

- Raíz `frontend/`, instalación `pnpm install --frozen-lockfile`, build `pnpm build`, salida `dist`. Definir `VITE_API_BASE_URL` con la URL HTTPS confirmada de Render antes de construir. Las variables `VITE_*` son públicas.
- Comprobar fallback SPA a `index.html` para enlaces directos y recargas de `/login`, `/register`, `/consulta-juridica` y `/consultas`. Verificar preflight con Bearer, estados de sesión, salida y errores desde navegador. Ver [Vite y rutas SPA en Vercel](https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas).

## Actualización de Supabase y recuperación

El estado esperado del proyecto de desarrollo es `001-crear-consultas` aplicada, según P04.4b. El estado de `002` está **pendiente de comprobar**. Cada etapa remota necesita confirmación expresa de Homero en el momento de ejecutarla. El operador realizará personalmente los pasos.

1. Confirmar revisión a desplegar, proyecto, responsable, ventana y acceso protegido. Revisar esquema `app`, TLS, Data API y roles. Preparar un respaldo con los mecanismos disponibles en el proyecto y comprobar un camino de restauración a un entorno aislado. Registrar fecha, alcance y comprobación de forma privada.
2. En una conexión de inspección autorizada, verificar objetos y registro de migraciones con SQL de solo lectura. El runner bloquea `db:status` remoto porque Umzug puede inicializar el historial. Consultar el catálogo y el historial con el rol apropiado. Comparar conteos sin registrar contenido personal.

   ```sql
   SELECT to_regclass('app.consultas') AS consultas,
          to_regclass('app.usuarios') AS usuarios,
          to_regclass('app."SequelizeMeta"') AS historial;
   ```

   Si el historial y consultas existen:

   ```sql
   SELECT name FROM app."SequelizeMeta" ORDER BY name;
   SELECT count(*) AS total_consultas FROM app.consultas;
   ```

3. Si `002` está pendiente y el estado físico es el esperado, ejecutar un solo migrador desde una revisión verificada. Usar una terminal sin overrides PostgreSQL heredados y un perfil privado separado del `.env` local. Este es el comando previsto, desde la raíz del repositorio y únicamente después de autorizar la migración:

   ```powershell
   $referencia = 'SUSTITUIR_POR_REFERENCIA_APROBADA'
   $perfil = "../secrets/supabase-dev/$referencia/conexion.env"
   Push-Location backend
   try {
       node "--env-file=$perfil" --import tsx database/migrate.ts up --supabase-project $referencia
       if ($LASTEXITCODE -ne 0) { throw 'Falló la migración. Inspeccionar el estado antes de reintentar.' }
   } finally {
       Pop-Location
   }
   ```

4. Confirmar por SQL la presencia de ambas migraciones, estructura, PK, `UNIQUE(email)`, `CHECK(tipo)`, propietarios, secuencia y conteo conservado de consultas. Comprobar lectura e inserción concedidas al rol de aplicación, uso de secuencias y permisos denegados sobre DDL, actualizaciones, borrados e historial. Revisar las cuentas de tipo `representante` antes de habilitar el acceso desde el backend publicado.
5. Ante fallo, detener el arranque público. Si se revirtió el DDL, corregir la causa antes de reintentar. Si la tabla o sus restricciones quedaron sin historial, inspeccionar el estado y acordar la recuperación antes de reintentar. Evitar modificaciones manuales a ciegas del historial, borrados o `down`. Una restauración requiere autorización y verificación previa en un destino seguro. Ver [guía de persistencia](../backend/database/README.md), [conexión a Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) y [respaldos](https://supabase.com/docs/guides/platform/backups).

Si falla la publicación, mantener restringido el acceso al backend y revisar logs y configuración sin exponer credenciales. Evaluar la última revisión compatible y autorizada con el esquema aplicado. Si una versión anterior expone consultas, mantenerla fuera de acceso público. La recuperación de la aplicación y la restauración de la base se autorizan por separado.

## Checklist de publicación supervisada

- [ ] INC-01–INC-08 confirmados en Git, con diff revisado y resultados registrados.
- [ ] D05/D06 aprobadas para la demostración. Por HTTP directo anónimos y clientes quedan excluidos de la lectura de consultas.
- [ ] Procedimiento privado de representantes ficticios y cuentas preexistentes revisados.
- [ ] Destino y respaldo Supabase confirmados. Migración, permisos, historial y exposición de Data API comprobados con autorización remota.
- [ ] Render inicia con rol de aplicación, TLS verificado y health correcto. Recuperación pactada.
- [ ] Build Vercel y recargas SPA comprobados. HTTPS, CORS, autenticación y logout verificados desde navegador.
- [ ] Consulta ficticia creada y recuperada bajo el permiso previsto. Persistencia después de reiniciar Express y efecto sobre sesiones registrados.
- [ ] Evidencia y decisión de publicación registradas. El acceso público queda condicionado a los controles de lectura y demás criterios verificados.

## Seguimiento

| Incremento | Estado | Resultado verificado | Commit manual |
| --- | --- | --- | --- |
| INC-01 | Implementado y verificado localmente | B01 e I05 resueltos. DTO sin uso retirados. 288 backend y 66 frontend aprobados, más typecheck, ESLint, build y comprobación HTTP dirigida. | Pendiente |
| INC-02 | Pendiente | Pendiente | Pendiente |
| INC-03 | Pendiente | Pendiente | Pendiente |
| INC-04 | Pendiente de aprobación de política | Pendiente | Pendiente |
| INC-05 | Pendiente | Pendiente | Pendiente |
| INC-06 | Pendiente | Pendiente | Pendiente |
| INC-07 | Pendiente | Pendiente | Pendiente |
| INC-08 | Pendiente | Pendiente | Pendiente |

Quedan abiertos el arranque con bases en `001`, el acceso de lectura sin autorización, la procedencia de cuentas representante, la interrupción entre DDL e historial, las sesiones en memoria y los ajustes pendientes para los servicios públicos. Cerrar cada riesgo con evidencia del incremento respectivo. Registrar fallos y recuperaciones junto a la revisión que se verificó.

### INC-01 · Evidencia del 24/11/2026

Partida `9f03385` en `feature/cuentas-usuarios`. Se trasladaron el objeto de contexto y el hook a `frontend/src/context/useAuth.js`. El proveedor sigue en `AuthContext.jsx` y se actualizaron los imports de navbar, login y registro. En el controlador se conservan las respuestas de `ErrorCuenta` y el middleware común emite 500 para los fallos inesperados. Se conserva la causa original sin que sus atributos se interpreten como un error de solicitud. Se retiraron `backend/models/login.dto.ts` y `backend/models/register.dto.ts` tras confirmar que carecían de consumidores.

Se verificaron los cambios en la copia temporal de la PR con Node **22.23.4** y pnpm **12.3.4**. Se reutilizaron únicamente sus dependencias instaladas desde los lockfiles durante la auditoría.

| Comando o procedimiento ejecutado | Resultado real |
| --- | --- |
| `pnpm --dir backend with current test` | **288/288**, sin fallas. Incluye HTTP en loopback, control de tipos y TLS sintético local. |
| `pnpm --dir frontend with current test --no-cache --configLoader runner` | **66/66** en cinco archivos. |
| `pnpm --dir backend with current typecheck` | Correcto. |
| `pnpm --dir frontend with current lint` | Correcto, sin desactivar reglas. |
| `pnpm --dir frontend with current build --configLoader runner --outDir <salida-temporal>` | Correcto, 38 módulos transformados. Vite informó que conservaría el contenido de la ruta externa, que era nueva para esta ejecución. |
| Comprobación HTTP dirigida con servidor efímero y almacén ficticio | Alta 201, entrada inválida 400, duplicado 409, credenciales o sesión inválidas 401, login/perfil 200 y logout 204. Fallos simulados de escritura y lectura devolvieron 500 con `{"message":"Error interno del servidor"}` en registro, login y perfil. |
| Revisión del diff y `git diff --check` | Solo los archivos del incremento y este registro. Sin errores de espacios. |

Se ejecutaron **354 casos de las suites** y la comprobación HTTP dirigida por separado. Las pruebas nuevas versionadas corresponden a INC-02. PostgreSQL real, Docker y los servicios remotos quedaron fuera de estas verificaciones. Siguen pendientes el commit manual y su confirmación antes de avanzar.
