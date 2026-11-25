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

## Decisiones de seguridad para la demostración

### Política de autorización aprobada para INC-04

Homero aprobó esta política de D05/D06 el 25/11/2026 para una demostración sobre una base que contiene exclusivamente datos ficticios.

| Operación | Sin sesión válida | Sesión válida sin permiso de lectura | Representante autorizado |
| --- | --- | --- | --- |
| `GET /health` | Público | Público | Público |
| `POST /formulario` | Público, con validación y límite de tamaño existentes. Los controles contra abuso de INC-05 son requisito de publicación. | Igual | Igual |
| `GET /formulario` y `GET /formulario/:id` | 401 | 403 | Listado de la colección de demostración o detalle. Se conservan JSON y 404 para un ID inexistente. |
| `POST /auth/register` | Alta pública como `cliente`. Se acepta omitir `tipo` o enviar `cliente`. Otros valores reciben 400. | Mismo contrato | Mismo contrato |
| `POST /auth/login` | Verificación de credenciales | Mismo contrato | Mismo contrato |
| `GET /auth/me` | 401 | Perfil propio con `puedeLeerConsultas: false` | Perfil propio con `puedeLeerConsultas: true` |
| `POST /auth/logout` | Cierre idempotente | Revoca el token presentado | Revoca el token presentado |

La lectura requiere una sesión vigente, `tipo = 'representante'` y un ID de cuenta en `AUTH_REPRESENTANTES_IDS`, una lista del servidor específica de la base de demostración. Una lista ausente o vacía deniega la lectura y una configuración mal formada impide el arranque antes de abrir la base. La lista solo incorpora IDs del procedimiento controlado y se vuelve a preparar al cambiar o recrear la base. Las cuentas que se registraron como representantes con el alta anterior quedan sin acceso mientras su ID no esté habilitado. La lectura de toda la colección es una decisión deliberada para la demostración académica. Un entorno productivo con datos reales requiere reglas de pertenencia y permisos por registro. El correo declarado queda excluido como criterio de permiso o de asociación histórica.

El [alta privada de representantes ficticios](../backend/database/README.md#alta-privada-de-un-representante-ficticio) usa `cuenta:crear-representante` fuera de la aplicación web y solo acepta PostgreSQL local por loopback. Crea una cuenta con el rol de aplicación y devuelve su ID. La habilitación se configura por separado y los duplicados conservan la cuenta original.

Express comprueba el permiso antes de buscar o listar datos y aplica `Cache-Control: no-store` a las respuestas de ambas lecturas. El login y el perfil de sesión incluyen `puedeLeerConsultas`. React muestra el menú y la vista con ese permiso, envía el token para las lecturas y descarta datos ante 401, 403 o fin de sesión.

### Sesiones, abuso y transporte en INC-05

- **Sesiones.** Para la demostración en una sola instancia se conservan tokens opacos en memoria. Vencen a las ocho horas y se depuran al emitir o comprobar sesiones. Se admiten hasta tres por cuenta y 256 por proceso. La cuarta sustituye a la más antigua de esa cuenta. Si el cupo global está lleno, un nuevo ingreso que requiere otra plaza recibe 503 y las sesiones activas conservan su acceso. Un reinicio o despliegue requiere volver a ingresar. La continuidad entre procesos necesitaría una decisión y una aprobación propias.
- **Credenciales.** Alta, login y alta privada usan las mismas comprobaciones de correo y contraseña. Se recortan los bordes del correo, se conserva su capitalización y se rechazan contraseñas inválidas o de más de 72 bytes UTF-8 antes de consultar o escribir una cuenta. El login devuelve el mismo error para correo desconocido y contraseña incorrecta y ejecuta bcrypt con un hash sintético en el primer caso. El registro conserva 409 para duplicados, lo que permite deducir la existencia de una cuenta. Su frecuencia está acotada para la demostración. Ante una cuenta ficticia anterior cuya contraseña original superaba el límite, acordar su recuperación antes de usarla: el hash de bcrypt no permite recuperar la longitud original. Las cuentas anteriores quedan intactas y la habilitación de representantes mantiene las reglas de INC-04.
- **Solicitudes.** Cada ruta tiene una ventana de diez minutos. Se admiten 10 intentos de login por IP y 120 por proceso, 5 registros por IP y 40 por proceso, y 20 envíos de consultas por IP y 120 por proceso. Las solicitudes que alcanzan la ruta cuentan antes del controlador. La API devuelve 429 con `Retry-After`, en segundos. Los límites y el tamaño máximo del JSON cubren el prototipo. En INC-06 se debe comprobar la dirección efectiva de cliente y el proxy de confianza antes de usar esos límites públicamente.
- **Navegador y transporte.** El perfil de sesión incluye `expiraEn` en milisegundos Unix. React retira el perfil y los datos al vencer o cerrar la sesión. Si la revocación falla, avisa que solo se confirmó el cierre en ese navegador. Las respuestas de cuentas y lecturas protegidas llevan `Cache-Control: no-store`. Con `NODE_ENV=production` el arranque normal exige HTTPS para ambas operaciones. La confianza en proxies parte desactivada. Su habilitación y verificación en el servicio se describen en la [configuración preparada para Render](#render).

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

Configuración preparada para que Homero la aplique tras autorizar el primer despliegue. Crear un servicio en Render inicia su primer despliegue. Revisar la configuración y el estado de la base antes de confirmarlo, y mantener el autodespliegue desactivado durante la validación. Para esta demostración se prevé una sola instancia, porque las sesiones y los límites se mantienen por proceso. [Servicios web](https://render.com/docs/web-services) · [Despliegues](https://render.com/docs/deploys)

| Campo de Render | Configuración |
| --- | --- |
| Servicio y directorio raíz | Web Service con runtime Node nativo y raíz `backend`. |
| Versión y dependencias | `NODE_VERSION=22.23.4`, `SKIP_INSTALL_DEPS=true`. Corepack usa el `packageManager` fijado en `pnpm@12.3.4`. |
| Build Command | `NODE_ENV=development corepack pnpm install --frozen-lockfile && NODE_ENV=development corepack pnpm run typecheck` |
| Start Command | `exec node --import tsx index.ts` |
| Health Check Path | `/health` |

Se conserva `tsx` para ejecutar el TypeScript/ESM existente. La instalación explícita incluye `tsx` y TypeScript, y el build valida el código sin emitir JavaScript. `NODE_ENV=development` aplica solo a los comandos de build. El proceso web usa `NODE_ENV=production` y recibe `SIGTERM` directamente. El cierre deja de aceptar solicitudes, espera hasta cinco segundos antes de cerrar conexiones HTTP activas y luego cierra el pool. [Versión de Node](https://render.com/docs/node-version) · [Variables del entorno Node](https://render.com/docs/environment-variables) · [Cierre ordenado](https://render.com/docs/deploys#graceful-shutdown)

| Variable en Render | Valor o procedencia |
| --- | --- |
| `PORT` | Puerto asignado por Render. Express escucha en `0.0.0.0` y valida el puerto antes de abrir la base. El valor local por defecto es `3001`. |
| `NODE_ENV` | `production`. El indicador `RENDER=true` de la plataforma también activa el requisito HTTPS para cuentas y lecturas de consultas. |
| `CORS_ORIGINS` | Origen HTTPS exacto del frontend autorizado, con comas si se aprueba más de uno. Render exige una configuración explícita, sin fallback a localhost. |
| `TRUST_PROXY_CIDRS` | IP o CIDR de los proxies verificados que llegan a Express, separados por comas. Mantener vacío hasta confirmar la topología. |
| `AUTH_REPRESENTANTES_IDS` | Solo IDs habilitados del destino ficticio. Vacío deniega las lecturas. |
| `POSTGRES_TARGET` y `POSTGRES_CONNECTION_MODE` | `supabase-dev` y `session`. La selección del destino es explícita. |
| `SUPABASE_PROJECT_REF` y `POSTGRES_HOST` | Referencia del proyecto autorizado y host exacto de **Connect → Session pooler** en ese proyecto. |
| `POSTGRES_PORT` y `POSTGRES_DB` | `5432` y `postgres`. |
| `POSTGRES_SECRETS_DIR` y `POSTGRES_SSL_CA_FILE` | `/etc/secrets` y `/etc/secrets/supabase-ca.crt`. |

En el servicio cargar únicamente los archivos privados `app.txt` y `supabase-ca.crt`. La clave del rol de aplicación usa el formato documentado de 48 dígitos hexadecimales en minúscula, sin salto de línea. El backend deriva `docker_laws_app.<REF>` y valida la CA y el nombre del servidor. Las migraciones se preparan por separado con el rol migrador y el proyecto autorizado. Mantener dos conexiones como máximo por proceso y revisar la capacidad del pooler durante la validación, incluida la superposición temporal de instancias en un despliegue. [Archivos privados de Render](https://render.com/docs/configure-environment-variables#secret-files) · [Conexiones de Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Guía de persistencia](../backend/database/README.md)

Render termina TLS en el proxy y conecta con Express por HTTP. La documentación consultada describe el transporte pero no identifica los rangos de los saltos que alcanzarán nuestro proceso. En una verificación autorizada, confirmar las IP/CIDR de esos proxies y que el último proxy entregue un único `X-Forwarded-Proto: https` y una cadena de direcciones de cliente fiable. Revisar también los posibles accesos internos del servicio. Los rangos de salida de Render corresponden a destinos como la base y no identifican el proxy de entrada. Express empieza sin confianza en encabezados reenviados. Mientras falte esta evidencia, las operaciones protegidas sobre HTTP quedan en 403 y la publicación sigue pendiente. [TLS de servicios web](https://render.com/docs/web-services#connecting-from-the-public-internet) · [Red privada](https://render.com/docs/private-network) · [Rangos de salida](https://render.com/docs/outbound-ip-addresses) · [Express detrás de proxies](https://expressjs.com/en/guide/behind-proxies/)

En la verificación posterior, confirmar `GET /health` con 200 y después el flujo funcional de cuentas y consultas con datos ficticios. Al arrancar se comprueban conexión y esquema. `/health` mide el estado del proceso y por sí solo no detecta una caída posterior de PostgreSQL. Comprobar CORS, HTTPS, dirección efectiva para los límites y un reinicio controlado antes de habilitar la demostración. [Health checks de Render](https://render.com/docs/health-checks)

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
| INC-01 | Confirmado en Git | B01 e I05 resueltos. DTO sin uso retirados. 288 backend y 66 frontend aprobados, más typecheck, ESLint, build y comprobación HTTP dirigida. | `43f08070fdaf8fa34a8f19684a2772a21aa0d303` |
| INC-02 | Confirmado en Git | 22 casos HTTP y 7 de React nuevos. Suites completas 310/310 backend y 73/73 frontend. Typecheck, lint y build aprobados. | `e4c1a5c5387bae41946f220d2ec67b871ea7cfe4` |
| INC-03 | Confirmado en Git | Actualización 001 → 002 con datos previos, esquema y permisos comprobados. 21 casos PostgreSQL, 310 backend y 33 de protecciones aprobados. Recuperación documentada. | `1f57de518bd3d3e21f90f510123558d2aec1bd12` |
| INC-04 | Confirmado en Git | Alta pública de clientes y lecturas limitadas a representantes habilitados. 325 pruebas backend, 83 frontend y 22 casos PostgreSQL aprobados. Typecheck, lint y build correctos. | `7c1e5cd0bdc131ef88c45b1ce3524c6e101df1dc` |
| INC-05 | Confirmado en Git | Límites de credenciales, solicitudes y sesiones comprobados. 341 pruebas backend, 91 frontend y 24 casos PostgreSQL aprobados. | `f1ca19793009983a2188e9784053e64d404c362e` |
| INC-06 | Preparado y verificado localmente | Arranque, puerto, health y cierre comprobados. 350 pruebas backend, 91 frontend y 25 casos PostgreSQL aprobados. El proxy de la plataforma queda pendiente de verificación. | Pendiente |
| INC-07 | Pendiente | Pendiente | Pendiente |
| INC-08 | Pendiente | Pendiente | Pendiente |

La actualización desde `001`, los permisos de lectura y el endurecimiento de cuentas se verificaron localmente. Antes de publicar quedan la revisión de la base remota y de sus representantes, la terminación HTTPS y la dirección de cliente vistas por Express detrás del proxy, y las comprobaciones del flujo publicado. La interrupción entre DDL e historial tiene un procedimiento de diagnóstico. Revisar el estado antes de reintentar una migración interrumpida.

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

Se ejecutaron **354 casos de las suites** y la comprobación HTTP dirigida por separado. Las pruebas nuevas versionadas corresponden a INC-02. PostgreSQL real, Docker y los servicios remotos quedaron fuera de estas verificaciones. En ese momento el commit manual todavía estaba pendiente.

Homero registró INC-01 en `43f0807`. Al retomar, el commit coincidió con los nueve archivos previstos y el árbol de trabajo estaba limpio.

### INC-02 · Evidencia del 24/11/2026

Partida `43f0807` en `feature/cuentas-usuarios`. Se agregaron [pruebas HTTP de cuentas](../backend/tests/auth.http.test.ts) con Express real en loopback y almacenes en memoria y [pruebas de cuentas en React](../frontend/src/App.auth.test.jsx) con `fetch` controlado. El manifiesto backend incorpora la suite HTTP al comando `test`. Las pruebas existentes, el código de aplicación y las dependencias se conservaron.

Los **22 casos de backend** comprueban alta válida, hash verificable y respuestas públicas sin contraseña ni hash, entradas y contraseñas inválidas rechazadas antes de consultar o escribir, duplicados sin sobrescritura, login correcto e incorrecto, token omitido o desconocido, vencimiento con reloj controlado, logout, revocación y 500 seguro ante fallos de escritura o lectura. Los **7 casos de frontend** comprueban registro con login posterior, duplicado, login con restauración de perfil, avisos ante 401/500, descarte de sesión rechazada por el servidor y logout exitoso.

Verificación en la copia temporal con las dependencias de los lockfiles, Node **22.23.4** y pnpm **12.3.4**.

| Verificación ejecutada | Resultado |
| --- | --- |
| `pnpm --dir backend with current test` | **310/310**, incluidos los 22 casos nuevos. |
| `pnpm --dir frontend with current test --no-cache --configLoader runner` | **73/73** en seis archivos, incluidos los 7 casos nuevos. |
| `pnpm --dir backend with current typecheck` | Correcto con el perfil existente. |
| `pnpm --dir frontend with current lint` | Correcto. |
| `pnpm --dir frontend with current build --configLoader runner --outDir <salida-temporal>` | Correcto, 38 módulos transformados. |
| `git diff --check` y revisión del alcance | Sin errores de espacios. Solo cambiaron las dos pruebas nuevas, el script `test` de backend y este registro. |

Se ejecutaron **383 casos de las dos suites**. PostgreSQL real queda para INC-03. El manejo de logout fallido, los límites de credenciales y el endurecimiento de sesiones quedan para INC-05. La autorización de consultas sigue pendiente de INC-04.

Homero registró INC-02 en `e4c1a5c`. Al retomar, el commit coincidió con los cuatro archivos previstos y el árbol de trabajo estaba limpio.

### INC-03 · Evidencia del 25/11/2026

Partida `e4c1a5c` en `feature/cuentas-usuarios`. La suite de migraciones del runner existente aplicó solo `001` con Umzug e insertó una consulta ficticia con `docker_laws_app`. Express exigió `002` antes de escuchar. La CLI aplicó solo `002` y luego Express recuperó por listado y detalle el mismo ID y los siete campos de la consulta. Se comprobó el alta, el rechazo de duplicados y el login sobre el almacén PostgreSQL. Otra instancia descartable verificó el arranque desde base vacía aplicando ambas migraciones.

Con PostgreSQL **17.12** se verificaron las cinco columnas `NOT NULL` de usuarios, la PK, el índice único de correo y el rechazo por `usuarios_tipo_check`. El migrador conservó la propiedad de objetos e historial. La aplicación conservó las denegaciones de DDL, UPDATE, DELETE y acceso al historial. Se comprobaron `SELECT/INSERT` y `USAGE` de secuencias bajo el rol restringido. La repetición de la CLI dejó el esquema e historial sin pendientes y la consulta intacta.

| Verificación ejecutada | Resultado |
| --- | --- |
| `pnpm --dir backend with current test:postgres --limpiar` | **21 casos hoja aprobados**. Node informó 11 resultados para migraciones y 12 para API al incluir los dos casos contenedores. |
| `pnpm --dir backend with current test` | **310/310**. |
| `node --test scripts/postgres.test.mjs` | **33/33**. |
| `pnpm --dir backend with current typecheck` | Correcto. El primer intento detectó que Sequelize tipaba el ID del fixture como `unknown`. Se añadió la comprobación del ID entero antes de buscarlo. |
| Inventario Docker antes y después del runner | Mismos **5 contenedores, 60 volúmenes y 6 redes**. El runner retiró los recursos nuevos de las dos instancias protegidas. |
| Revisión del diff y `git diff --check` | Correcta. Cambios limitados a las dos pruebas PostgreSQL, la guía de persistencia y este registro. |

Docker Desktop estaba detenido al comienzo. Homero lo inició y se verificó el motor Linux local antes de ejecutar. Se usaron las dependencias de la copia de auditoría con Node **22.23.4** y pnpm **12.3.4**. En la [guía de persistencia](../backend/database/README.md#actualización-local-de-001-a-002) quedaron la secuencia local y los pasos para diagnosticar un DDL confirmado sin registro posterior. Los archivos `001` y `002`, el runner, Compose y los permisos de limpieza están intactos. La evidencia es local. La condición de endurecer las comprobaciones de restricciones en el arranque corresponde a INC-05.

INC-03 quedó confirmado en `1f57de518bd3d3e21f90f510123558d2aec1bd12`.

### INC-04 · Evidencia del 25/11/2026

Partida `1f57de5` en `feature/cuentas-usuarios`. Con la política aprobada por Homero, el backend protege el listado y detalle antes de acceder al almacén. Las pruebas HTTP cubrieron anónimos con y sin origen permitido, sesiones inválidas, vencidas y revocadas, clientes, representantes anteriores sin habilitar y representantes habilitados. Comprobaron que ni el ID de un cliente incluido en la lista ni el correo declarado en una consulta otorgan permiso. La configuración inválida bloqueó el arranque y las respuestas denegadas omitieron los datos y la existencia de los IDs.

El runner PostgreSQL verificó la transición desde `001`, la instalación desde una base vacía y la persistencia al recrear Express. Probó el alta privada con `docker_laws_app`, la salida limitada al ID, el rechazo de duplicados y el acceso con y sin habilitación explícita. React se verificó con red controlada, incluidos el acceso directo, el envío público, el menú, las respuestas 401/403 y la retirada de consultas al cerrar sesión.

| Verificación ejecutada | Resultado |
| --- | --- |
| `pnpm --dir backend with current test` y `pnpm --dir backend with current typecheck` | **325/325** y TypeScript correcto. |
| `pnpm --dir frontend with current test`, `lint` y `build` | **83/83**, ESLint y build Vite correctos. |
| `pnpm --dir backend with current test:postgres --limpiar` | **22 casos** aprobados en dos instancias locales descartables. TAP incluye un caso contenedor por suite en sus totales 11 y 13. Inventario Docker idéntico antes y después. |
| Configuración Compose de desarrollo y pruebas | Correcta. Se comprobó el valor vacío y una lista explícita en el servicio de backend. |
| `node --test scripts/postgres.test.mjs` y `node --test scripts/verificar-docker.test.mjs` | **33/33** protecciones PostgreSQL y **32/32** autopruebas del verificador Docker con fixtures sintéticos. |
| Revisión de alcance y `git diff --check` | Correcta. `.env`, `secrets/` y los archivos privados de SDD siguen excluidos. |

Las suites se ejecutaron en una copia temporal con Node **22.23.4** y pnpm **12.3.4**, usando las versiones de los lockfiles de la rama. La verificación se limitó a recursos locales y datos ficticios. INC-04 quedó confirmado en `7c1e5cd0bdc131ef88c45b1ce3524c6e101df1dc`.

### INC-05 · Evidencia del 25/11/2026

Partida `7c1e5cd` en `feature/cuentas-usuarios`. Las pruebas HTTP comprobaron el límite de 72 bytes en ASCII, caracteres acentuados y emoji, y el rechazo de 73 antes de acceder al almacén. El limitador detuvo login, alta y envío de consultas con 429 y `Retry-After`, y volvió a admitirlos en la siguiente ventana. Los tests comprobaron el cupo por cuenta y por proceso, la revocación concurrente y la recuperación del cupo de sesiones vencidas.

React se verificó con red controlada. Se comprobó el vencimiento visible, la retirada inmediata del token cuando la revocación queda sin confirmar, y el aviso de cuenta creada cuando falla el ingreso posterior. En loopback, una conexión TLS con CA sintética válida admitió el alta. El arranque normal en modo `production` rechazó el login por HTTP aun con un encabezado de protocolo reenviado.

| Verificación ejecutada | Resultado |
| --- | --- |
| `pnpm --dir backend with current test` y `pnpm --dir backend with current typecheck` | **341/341** y TypeScript correcto. |
| `pnpm --dir frontend with current test`, `lint` y `build` | **91/91**, ESLint y build Vite de producción correctos. |
| `pnpm --dir backend with current test:postgres --limpiar` | **24 casos hoja** en dos instancias PostgreSQL locales descartables. Los totales 12 y 14 de TAP incluyen un contenedor cada uno. Se comprobó el rechazo con `UNIQUE(email)` ausente o un `CHECK(tipo)` incorrecto, además del arranque en modo producción. |
| Configuración Compose de desarrollo y pruebas, y `node --test scripts/postgres.test.mjs` | Compose correcto y **33/33** protecciones aprobadas. Inventario Docker inicial y final idéntico. |
| `git diff --check` y alcance | Correctos. Las credenciales privadas y Spec Kit siguen excluidos. |

La copia temporal usó Node **22.23.4** y pnpm **12.3.4** con los lockfiles existentes. Las verificaciones usaron datos ficticios y se limitaron al equipo local. Los ensayos de restricciones cambiaron únicamente el esquema de la instancia descartable que crea el runner y restauraron las restricciones esperadas. INC-05 quedó confirmado en `f1ca19793009983a2188e9784053e64d404c362e`.

### INC-06 · Evidencia del 25/11/2026

Partida `f1ca197` en `feature/cuentas-usuarios`. El backend valida el puerto, el perfil de Render y la lista de proxies antes de leer credenciales o abrir conexiones. El log del punto de entrada confirmó `0.0.0.0` y el puerto asignado. Una petición a `/health` devolvió 200 y el proceso hijo cerró con código 0 al ejecutar su manejador de `SIGTERM`. En Windows la prueba entrega el evento a Node mediante IPC. La entrega de la señal por Render queda pendiente.

Las pruebas locales de Express comprobaron TLS directo, HTTPS reenviado desde un proxy de prueba autorizado, rechazo de protocolos ambiguos y de un origen de conexión sin confianza, y el cómputo de cupos por cliente detrás de una cadena de proxies simulada. Los ensayos confirmaron que Render requiere un destino explícito y orígenes HTTPS antes de acceder a PostgreSQL. La terminación TLS real y los rangos de entrada del servicio deberán verificarse con autorización posterior.

| Verificación ejecutada | Resultado |
| --- | --- |
| Desde `backend`, `corepack pnpm install --frozen-lockfile --offline`, `corepack pnpm run typecheck` y `corepack pnpm run test` | Instalación limpia con Node **22.23.4** y pnpm **12.3.4**, lockfile idéntico, TypeScript correcto y **350/350**. |
| Desde `frontend`, `corepack pnpm run test`, `corepack pnpm run lint` y `corepack pnpm run build` | **91/91**, ESLint y build de producción correctos. |
| Desde `backend`, `corepack pnpm run test:postgres --limpiar` | **25 casos hoja** en dos instancias locales descartables. Los totales TAP 12 y 15 incluyen un contenedor cada uno. El inventario Docker inicial y final coincidió. |
| Configuración Compose de desarrollo y pruebas, y `node --test scripts/postgres.test.mjs` | Compose correcto y **33/33** protecciones aprobadas. |
| `git diff --check` y alcance | Correctos. Los archivos privados conservan sus exclusiones. |

El primer intento offline detectó que faltaba el tarball de `bcryptjs@3.0.3`. Se recuperó la versión fijada desde el registro público de npm y se repitió la instalación offline en otra copia sin `node_modules`. La preparación queda lista para commit manual. Las verificaciones del servicio en Render y de la base Supabase requieren autorización específica.
