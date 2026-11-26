# Metodología de Sistemas II

## Estudio jurídico Docker-laws

Aplicación web para un estudio jurídico ficticio. Permite enviar consultas sin una cuenta, registrarse como cliente e iniciar sesión. Solo los representantes habilitados pueden consultar los registros de la demostración. React y Vite forman la interfaz. Express y TypeScript exponen la API. Sequelize y Umzug gestionan el acceso a PostgreSQL y las migraciones.

Para la defensa del Taller III, consultar [PREPARACION.md](PREPARACION.md) y la [consigna oficial](docs/Consigna_Taller_III_MSII_2026.pdf). Las razones y los límites de las decisiones se documentan en [decisiones de diseño](docs/decisiones-diseno.md).

## Instalación e inicio

Para la ejecución local se utiliza **Node.js 22 desde 22.22.2**, **pnpm 12.3.4** y Docker con contenedores Linux y Compose v2. Las instalaciones usan los lockfiles de cada componente y requieren acceso a los registros de paquetes e imágenes o una caché suficiente.

```powershell
git clone --branch main https://github.com/nicc-essp/MetodologiaDeSistemasII.git
Set-Location MetodologiaDeSistemasII
```

Los comandos locales parten de la raíz, con los puertos 5173, 3001 y 5433 disponibles. Usar una terminal sin variables de un perfil remoto y una copia propia de trabajo. La revisión que se va a entregar o demostrar se puede verificar con el [procedimiento de preparación](PREPARACION.md#verificar-la-versión-de-entrega).

### Opción recomendada: aplicación con Docker Compose

Primero [preparar PostgreSQL y aplicar las migraciones](#postgresql-local-para-desarrollo-y-pruebas-p03). Después iniciar los contenedores de aplicación.

```powershell
docker compose up --build
```

Abrir `http://localhost:5173`. La API publicada para el navegador está en `http://localhost:3001`. Dentro de Compose, Express conecta con `postgres:5432` y recibe solo el archivo de credencial de aplicación. Los puertos publicados están limitados al host local. [Configuración de Compose](docker-compose.yml).

En otra terminal, `Invoke-RestMethod http://localhost:3001/health` debe devolver `status = ok`. Esa ruta prueba que Express responde. El arranque comprueba la base, el esquema y los permisos antes de escuchar. Para detener el proyecto propio, usar `docker compose stop`. El volumen de PostgreSQL conserva los datos.

## PostgreSQL local para desarrollo y pruebas (P03)

Compose usa PostgreSQL 17.12 fijado por digest y un volumen nombrado propio para desarrollo. Los valores predeterminados para conectar desde el host son `127.0.0.1:5433`, base `docker_laws_dev` y directorio `secrets/postgres/`. `.env.example` contiene parámetros públicos y rutas. Con los defaults se puede omitir `.env`. Si ya existe un perfil privado, confirmar su destino y sus rutas sin mostrar ni sobrescribir su contenido. Los scripts del backend cargan el `.env` opcional de la raíz y las variables del proceso tienen prioridad. [Ejemplo local](.env.example) · [Arranque del backend](backend/package.json).

En una **instancia local nueva**, ejecutar los comandos en orden y continuar tras el éxito de cada paso. Para una base con datos existentes, revisar primero la [verificación previa a la migración](#verificar-y-aplicar-migraciones).

```powershell
$env:POSTGRES_TARGET = 'local'
pnpm --dir backend install --frozen-lockfile
node scripts/postgres.mjs preparar
docker compose up -d --wait postgres
docker compose ps postgres
pnpm --dir backend run db:migrate
pnpm --dir backend run db:status
```

El preparador genera `admin.txt`, `app.txt` y `migrator.txt` dentro de `secrets/postgres/`, fuera de Git. Conserva las claves existentes y rechaza un conjunto incompleto o inválido. El inicializador crea los roles y el esquema `app` únicamente al arrancar un volumen vacío. Cambiar un archivo después de inicializar el volumen requiere ajustar la contraseña de la instancia con un procedimiento autorizado. Conservar el volumen y las claves mientras se diagnostica la autenticación. [Preparación local](scripts/postgres.mjs) · [Inicializador](docker/postgres/inicializar.sh).

El healthcheck de PostgreSQL comprueba disponibilidad. Para comprobar también la autenticación del rol de aplicación sobre el proyecto local propio, se puede ejecutar esta consulta. El comando lee la clave dentro del contenedor y muestra solo el rol y la base.

```powershell
docker compose exec -T postgres sh -c 'PGPASSWORD="$(cat /run/secrets/postgres_app)" psql -h 127.0.0.1 -U docker_laws_app -d "$POSTGRES_DB" -c "SELECT current_user, current_database();"'
```

Para ensayos de infraestructura usar la [verificación descartable](#pruebas-y-comprobaciones-de-calidad). `docker-compose.test.yml` es independiente y utiliza su propia base, claves y volumen. Si se prepara ese entorno manualmente, `node scripts/postgres.mjs preparar --pruebas` genera las claves en `secrets/postgres-test/`. Usar un nombre de proyecto distinto del habitual y seleccionar solo ese archivo Compose. [Compose de pruebas](docker-compose.test.yml).

## Frontend y backend en el host, con PostgreSQL en Docker

Después de [preparar PostgreSQL local](#postgresql-local-para-desarrollo-y-pruebas-p03), ejecutar Express y Vite en terminales separadas, desde la raíz. Mantener libres los puertos de aplicación de Compose para esta modalidad.

```powershell
pnpm --dir backend run start
```

```powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend run dev --host localhost --port 5173 --strictPort
```

Abrir `http://localhost:5173` y probar la API en `http://localhost:3001/health`. Para detenerlos, usar `Ctrl+C` en las dos terminales y, en el proyecto Compose propio, `docker compose stop postgres`. El volumen permanece disponible para el próximo inicio.

## Roles y permisos de PostgreSQL

| Rol | Uso y permisos |
| --- | --- |
| `postgres` | Inicialización de la instancia local. Usar sus credenciales solo para tareas administrativas. |
| `docker_laws_migrator` | Posee el esquema `app`, las tablas de negocio, sus secuencias y `app."SequelizeMeta"`. Ejecuta el DDL y registra migraciones. Usa `migrator.txt`. |
| `docker_laws_app` | Tiene conexión, `USAGE` sobre `app`, `SELECT` e `INSERT` sobre `app.consultas` y `app.usuarios` y `USAGE` sobre sus secuencias. Usa `app.txt`. Los permisos excluyen DDL, actualizaciones, borrados y lectura del historial. |

Los roles de aplicación y migración son independientes y restringidos. Express valida la conexión, la estructura de ambas tablas y los permisos que necesita antes de abrir HTTP. El historial de Umzug se puede identificar por catálogo, y su contenido se reserva al migrador. [Adaptador de consultas](backend/data/formularios-postgres.ts) · [Adaptador de cuentas](backend/data/cuentas-postgres.ts) · [Migraciones](backend/migrations/).

## Configurar Supabase

Usar un proyecto de desarrollo autorizado con datos ficticios y SSL obligatorio. Confirmar su referencia y preparar roles y permisos para ese destino. El esquema `app` debe pertenecer al migrador y conceder a la aplicación solo los permisos previstos. Mantener `app` fuera de los esquemas expuestos por la Data API y desactivar esa API si no se utiliza. Evitar conceder acceso al esquema a `anon`, `authenticated` o `service_role` para facilitar pruebas. Reservar el inicializador de Docker para PostgreSQL local. [Roles previstos](#roles-y-permisos-de-postgresql) · [Conexión a Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

Guardar un perfil privado `secrets/supabase-dev/<REF>/conexion.env` por proyecto. Sustituir `<REF>` por la referencia aprobada de veinte caracteres alfanuméricos en minúscula y usar el host exacto que indica **Connect** para el modo elegido.

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

- Session pooler usa el host indicado en **Connect** y agrega `.<REF>` al usuario de transporte. El rol SQL conserva su nombre. La alternativa `direct` usa `db.<REF>.supabase.co` y el usuario sin sufijo. Ambos modos requieren el puerto `5432`. El perfil rechaza Transaction pooler.
- Guardar por separado `app.txt` y `migrator.txt`, cada uno con la clave de su rol, de 48 caracteres hexadecimales en minúscula y sin salto de línea. Dar acceso al archivo del migrador solo al operador. Las rutas relativas de claves y CA se resuelven desde la raíz. Usar un directorio independiente del local.
- Elegir una CA PEM vigente para el endpoint. El cliente valida la cadena y el nombre del servidor. Usar el certificado del servicio correspondiente, separado de los fixtures de pruebas. Una configuración TLS inválida impide conectar.
- Mantener el perfil separado del `.env` local y usar una terminal sin variables PostgreSQL heredadas de otro destino. El backend rechaza perfiles incompletos, mezclas y vías alternativas como `DATABASE_URL` o `PGPASSWORD`. La confirmación de referencia identifica el proyecto que se intenta usar y requiere que el operador haya verificado previamente su autorización.

El pool de Sequelize tiene un máximo de dos conexiones por proceso. Considerar los procesos simultáneos al planificar el despliegue. [Validación del perfil y de TLS](backend/config/database.config.ts) · [Conexión Sequelize](backend/database/connection.ts).

## Verificar y aplicar migraciones

Express necesita el esquema de `001-crear-consultas` y `002-crear-usuarios` listo al iniciar. Umzug ejecuta solo las migraciones pendientes y registra cada una en `app."SequelizeMeta"`. Aplicar `002` sobre una base con `001` conserva la tabla y los registros de consultas. El runner reserva el DDL al rol migrador. [Runner](backend/database/migrate.ts) · [Prueba de actualización](backend/tests/database.integration.test.ts).

**Antes de escribir en una base existente**, verificar destino, referencia y revisión del código, y acordar responsable y ventana. Revisar propietarios, permisos, conexión autenticada, TLS e historial. Preparar un respaldo y comprobar el camino de restauración a un entorno aislado según corresponda al destino. Ejecutar un solo migrador a la vez y conservar un conteo de consultas para comprobar que se preservaron. [Respaldos en Supabase](https://supabase.com/docs/guides/platform/backups).

Inspeccionar primero la existencia de los objetos con SQL de solo lectura, en el destino autorizado y con el rol de inspección apropiado.

```sql
SELECT to_regclass('app.consultas') AS consultas,
       to_regclass('app.consultas_id_seq') AS secuencia_consultas,
       to_regclass('app.usuarios') AS usuarios,
       to_regclass('app.usuarios_id_seq') AS secuencia_usuarios,
       to_regclass('app."SequelizeMeta"') AS historial;
```

Solo después de confirmar que existen las tablas correspondientes, consultar el historial y el conteo. Con una base que tiene solo `001`, la tabla de usuarios y su secuencia deben estar ausentes y el historial debe registrar `001`.

```sql
SELECT name FROM app."SequelizeMeta" ORDER BY name;
SELECT count(*) AS total_consultas FROM app.consultas;
```

### Migrar en local

En la raíz, con el perfil local, ejecutar `pnpm --dir backend run db:migrate` y, si termina correctamente, `pnpm --dir backend run db:status`. En una base con solo `001`, se aplica únicamente `002`. Confirmar ambas entradas y ninguna pendiente, y [verificar el resultado](#verificar-el-resultado-de-la-migración). `db:status` es local y puede crear la tabla técnica si todavía no existe.

### Migrar en Supabase

Solo para el proyecto y la operación autorizados, después de la inspección anterior. El perfil debe usar `supabase-dev` y el archivo privado del migrador. Sustituir el marcador por la referencia real, que debe coincidir con `SUPABASE_PROJECT_REF`. Ejecutar desde la raíz con las dependencias del backend instaladas mediante su lockfile.

```powershell
$referencia = 'REEMPLAZAR_POR_REFERENCIA_AUTORIZADA'
$perfil = "../secrets/supabase-dev/$referencia/conexion.env"
Push-Location backend
try {
    node "--env-file=$perfil" --import tsx database/migrate.ts up --supabase-project $referencia
    if ($LASTEXITCODE -ne 0) { throw 'Falló la migración. Inspeccionar el esquema y el historial antes de reintentar.' }
} finally {
    Pop-Location
}
```

Usar las consultas de inspección para el estado remoto. El runner bloquea `db:status` en Supabase porque Umzug puede inicializar el historial. Reservar las suites y limpiezas para instancias Docker locales descartables.

### Verificar el resultado de la migración

Comprobar ambas entradas de historial, tablas, columnas, PK, secuencias, propietarios y permisos antes de iniciar Express. En `app.usuarios` confirmar `UNIQUE(email)`, su índice válido y `usuarios_tipo_check`. Comparar el conteo previo cuando ya había consultas y comprobar que el rol de aplicación mantiene solo los permisos previstos.

### Recuperación ante migraciones fallidas

Detener el arranque, conservar la salida segura de error y cotejar objetos, restricciones, permisos, conteo e historial con las consultas anteriores. El DDL y sus concesiones se aplican en una transacción. Umzug registra el éxito después.

| Estado de la migración | Procedimiento |
| --- | --- |
| Ausente del historial y sin objetos nuevos | Verificar que el DDL no dejó cambios y que las consultas y migraciones previas siguen intactas. Corregir la causa antes de reintentar con un solo migrador. |
| Ausente del historial, con objetos o restricciones nuevos | Suspender los reintentos. Puede haberse confirmado el DDL antes del registro de Umzug. Comparar con el respaldo y acordar una recuperación específica antes de escribir. |
| Registrada con objetos completos | Si Express falla, revisar el perfil y los permisos de aplicación. Una ejecución normal posterior de Umzug informa que no quedan pendientes cuando el resto del historial está al día. |
| Registrada con objetos incompletos o distintos | Mantener detenido el arranque. Acordar una reparación o restauración verificada en un destino aislado antes de intervenir la base. |

Conservar las migraciones aplicadas y evitar cambios manuales a ciegas del historial, borrados o sincronización destructiva. La CLI admite avance explícito y consulta local de estado. Para ensayar errores o recuperación, usar `test:postgres` en sus instancias descartables. [Pruebas de migración](backend/tests/database.integration.test.ts).

## Cuentas y acceso a consultas

El registro público crea cuentas `cliente`. Para leer el listado y el detalle se requiere una sesión vigente, tipo `representante` e ID habilitado. El alcance de toda la colección se reserva a la demostración con datos ficticios. Cuando se reinicia Express, se vuelve a iniciar sesión. [Política de acceso](docs/decisiones-diseno.md#8-identidad-sesiones-y-autorización).

### Alta privada de un representante ficticio

Con las dos migraciones aplicadas, preparar un JSON privado UTF-8 con `nombre`, `email` y `password` ficticios en `secrets/`. La contraseña se lee del JSON y debe tener al menos ocho caracteres y hasta 72 bytes UTF-8. La CLI usa el rol de aplicación y muestra el ID en caso de éxito. Un correo duplicado conserva la cuenta original.

En **local**, usar el perfil local con una dirección literal de loopback para PostgreSQL, `127.0.0.1` o `::1`. Ejecutar desde la raíz.

```powershell
$archivo = (Resolve-Path -LiteralPath './secrets/representante-local.json').Path
pnpm --dir backend run cuenta:crear-representante $archivo
```

En **Supabase**, usar el perfil privado del proyecto autorizado y `app.txt`. Ejecutar desde la raíz con una terminal sin configuración PostgreSQL heredada.

```powershell
$referencia = 'REEMPLAZAR_POR_REFERENCIA_AUTORIZADA'
$perfil = "../secrets/supabase-dev/$referencia/conexion.env"
$archivo = (Resolve-Path -LiteralPath './secrets/representante-supabase.json').Path
Push-Location backend
try {
    node "--env-file=$perfil" --import tsx scripts/crear-representante.ts $archivo --supabase-project $referencia
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo completar el alta.' }
} finally {
    Pop-Location
}
```

Agregar el ID devuelto a `AUTH_REPRESENTANTES_IDS` del backend que usa esa misma base. En local, guardar los IDs en el `.env` de la raíz o en el entorno del proceso. Reiniciar Express o recrear solo su servicio con `docker compose up -d --force-recreate backend`. En Render, actualizar la variable del servicio y aplicar la configuración. Conservar los demás IDs autorizados de ese destino y preparar una lista nueva al cambiar o recrear la base. Iniciar sesión y comprobar el acceso a la colección ficticia. [CLI](backend/scripts/crear-representante.ts) · [Lectura de IDs](backend/config/app.config.ts).

## API de formularios

| Petición | Uso |
| --- | --- |
| `GET /health` | Disponibilidad del proceso. Devuelve `200` con `{"status":"ok"}`. |
| `POST /formulario` | Envío público por JSON. Devuelve `201` y la consulta con el ID generado por PostgreSQL. |
| `GET /formulario` | Listado con `Authorization: Bearer <token>` de representante habilitado. Devuelve `200` con una lista. |
| `GET /formulario/:id` | Detalle con el mismo permiso. Devuelve `200` o `404` si no se encuentra la consulta. |

El envío requiere `nombre`, `apellido`, `dni`, `telefono`, `email`, `asunto` y `mensaje` como textos. Un cuerpo inválido recibe `400` y el límite de 102400 bytes se aplica antes de escribir. En las lecturas, `401` indica que no hay sesión vigente y `403` indica falta de permiso o de HTTPS cuando se exige. Los estados y respuestas de las rutas de cuentas y formularios se detallan en [contratos HTTP](PREPARACION.md#contratos-http-errores-y-límites).

## Configuración pública de conexión

| Variable | Uso | Valor local por defecto |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Dirección HTTP(S) de la API alcanzable por el navegador. Vercel exige un origen HTTPS sin rutas ni credenciales. | `http://localhost:3001` |
| `CORS_ORIGINS` | Orígenes completos del frontend autorizados, separados por comas. | `http://localhost:5173` |
| `PORT` | Puerto HTTP de Express en ejecución directa, entero entre 1 y 65535. | `3001` |
| `TRUST_PROXY_CIDRS` | IP o CIDR de los proxies autorizados, separados por comas. | Lista vacía. Con `RENDER=true` se utiliza un salto cuando la lista está vacía. |
| `AUTH_REPRESENTANTES_IDS` | IDs positivos autorizados del destino actual, separados por comas. | Lista vacía. |

El navegador distingue `localhost` de `127.0.0.1`. Si se cambia de origen o puerto, actualizar CORS y la URL de la API según corresponda. El nombre `backend` de la red Compose es interno. Usar [los ejemplos públicos del backend](.env.example) y [del frontend](frontend/.env.example). Reiniciar los procesos tras cambiar sus variables y reconstruir el bundle para actualizar la URL pública. Reservar `VITE_*` para valores públicos.

## Despliegue en Render y Vercel

El equipo informa el frontend en Vercel desde `main` del fork `HomeroColomboArg/MetodologiaDeSistemasII` y el backend en Render desde `main` de `nicc-essp/MetodologiaDeSistemasII`. PostgreSQL está en Supabase. Confirmar la revisión enlazada y el disparador de despliegue en cada panel. [Arquitectura de despliegue](PREPARACION.md#5-despliegue-y-automatización).

### Render

- Usar `backend` como raíz para los comandos del manifiesto. La configuración informada utiliza Node.js 24.22.1, instalación `pnpm install --frozen-lockfile` e inicio `pnpm start`. Asegurar que la instalación del servicio incluye `tsx`, que ejecuta el código TypeScript. `typecheck` está disponible como comprobación separada.
- Configurar `CORS_ORIGINS` con el origen HTTPS de Vercel y las vistas previas que autorice el equipo. Usar `PORT` de la plataforma y `/health` como ruta de salud. Configurar `AUTH_REPRESENTANTES_IDS` para la base de demostración.
- Trasladar las variables del perfil `supabase-dev` al entorno del servicio. Guardar `app.txt` y la CA como archivos privados de Render. Si se nombra la CA `supabase-ca.crt`, usar `POSTGRES_SECRETS_DIR=/etc/secrets` y `POSTGRES_SSL_CA_FILE=/etc/secrets/supabase-ca.crt`. Reservar `migrator.txt` para el operador. [Perfil remoto](#configurar-supabase) · [Archivos privados de Render](https://render.com/docs/configure-environment-variables#secret-files).
- Confirmar que el proxy es la única entrada al puerto de Express y fija el protocolo y la IP de cliente reenviados. Con `RENDER=true` y lista vacía, el backend confía en un salto. Si hay una vía directa, aislarla o configurar `TRUST_PROXY_CIDRS` con los pares de entrada verificados. Con lista explícita, esa lista prevalece. [Decisión de transporte](docs/decisiones-diseno.md#9-transporte-y-confianza-en-proxies).

### Vercel

Usar `frontend` como raíz, Vite como framework y un runtime Node compatible con el manifiesto. El procedimiento versionado usa Corepack y pnpm 12.3.4. Habilitar Corepack con `ENABLE_EXPERIMENTAL_COREPACK=1` para esos comandos. `vercel.json` declara instalación con lockfile, build en modo `vercel`, salida `dist` y reescrituras para las vistas React.

Definir `VITE_API_BASE_URL` con el origen HTTPS de Render, con nombre DNS y puerto si corresponde. El modo `vercel` valida ese valor al construir. Si cambia la API, reconstruir el frontend. Para reproducir el empaquetado y el preview con una URL ficticia, seguir la [comprobación local del build](PREPARACION.md#qué-se-ejecuta-automáticamente-y-qué-opera-el-equipo). [Configuración versionada](frontend/vercel.json) · [Configuración de build y Corepack](https://vercel.com/docs/builds/configure-a-build#corepack).

### Verificar la publicación

Comprobar `GET /health`, HTTPS, preflight con `Authorization` y entrada o recarga directa en `/login`, `/register`, `/consulta-juridica` y `/consultas`. Usar una consulta ficticia y verificar el acceso con una sesión de cliente, una de representante habilitado y sin sesión. Comprobar el cierre de sesión y la IP usada por el limitador. Después de un reinicio controlado de Express, verificar que el dato siga disponible y se requiera iniciar sesión de nuevo. [Recorrido de demostración](PREPARACION.md#mostrar-el-comportamiento).

Ante un fallo, mantener restringida la publicación y revisar logs sin exponer credenciales. La recuperación de la aplicación debe usar una revisión autorizada que conserve los controles de acceso y sea compatible con el esquema aplicado. La restauración de la base se revisa por separado. [Recuperación de migraciones](#recuperación-ante-migraciones-fallidas).

## Pruebas y comprobaciones de calidad

Desde la raíz, con las dependencias de ambos componentes instaladas con sus lockfiles:

```powershell
pnpm --dir backend run typecheck
pnpm --dir backend run test
pnpm --dir frontend run test
pnpm --dir frontend run lint
pnpm --dir frontend run build
```

En Windows, si pnpm 12.3.4 falla al administrar su propia instalación, con esa versión ya disponible se puede usar `pnpm --dir frontend with current install --frozen-lockfile`, también aplicable a `backend`.

Con Docker local activo, y Buildx y `tar` compatibles para las verificaciones de imágenes:

```powershell
node --test scripts/postgres.test.mjs scripts/verificar-docker.test.mjs
node scripts/postgres.mjs verificar --limpiar
pnpm --dir backend run test:postgres --limpiar
node scripts/verificar-docker.mjs --modo contexto
node scripts/verificar-docker.mjs --modo imagenes
```

Los runners de PostgreSQL rechazan motores Docker remotos. Crean proyectos de nombre único, puertos de loopback, claves y volúmenes propios. `--limpiar` retira solo los recursos nuevos después de verificar su propiedad. Sin esa opción se conservan detenidos para revisión. Si la propiedad no puede acreditarse, el runner falla y conserva los recursos. Evitar aplicar estos ensayos a una base compartida, un volumen habitual o Supabase. El verificador de imágenes admite `--componente backend` o `--componente frontend` y usa marcadores sintéticos de las categorías verificadas. [Aislamiento PostgreSQL](scripts/postgres.mjs) · [Verificación de imágenes](scripts/verificar-docker.mjs) · [Estrategia y casos de prueba](PREPARACION.md#3-estrategia-y-ejecución-del-testing).
