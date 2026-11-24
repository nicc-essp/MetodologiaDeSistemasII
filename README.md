# Metodología de Sistemas II

## Estudio jurídico Docker-laws

Aplicación web full stack desarrollada para el estudio jurídico ficticio **Docker-laws**.

El proyecto busca ofrecer información sobre los servicios del estudio y permitir que los clientes realicen consultas jurídicas desde la aplicación.

Actualmente se encuentra implementado el flujo de formularios de consulta: un usuario puede completar y enviar una consulta desde el frontend, el backend la guarda en PostgreSQL mediante Sequelize y las consultas recibidas pueden visualizarse desde otra sección de la aplicación. La persistencia está verificada tanto localmente como contra un proyecto Supabase exclusivo de desarrollo.

El proyecto se encuentra en desarrollo. **P01–P04 están completadas y aprobadas para el incremento inicial de persistencia de consultas**: P01/P02 por su auditoría formal independiente, P03 por su revisión de infraestructura y P04 por sus hitos local y Supabase de desarrollo. P04.4b fue validada y aprobada por Homero el 18 de noviembre de 2026. Las cuentas de clientes, la autorización funcional, el seguimiento de casos y el despliegue público continúan pendientes; P05–P13 no se consideran completadas.

## Estado actual

Actualmente se encuentran implementadas:

- Interfaz web desarrollada con React y Vite.
- Formulario de consultas jurídicas.
- API desarrollada con Express.
- Creación de formularios mediante `POST /formulario`.
- Consulta de todos los formularios mediante `GET /formulario`.
- Consulta de un formulario mediante `GET /formulario/:id`.
- Endpoint de estado del backend mediante `GET /health`.
- Vista de consultas recibidas conectada a la API.
- Separación de las llamadas HTTP del frontend mediante `formularioService.js`.
- Configuración de CORS para la comunicación entre frontend y backend.
- Ejecución conjunta de frontend y backend mediante Docker Compose.

El arranque normal utiliza **PostgreSQL mediante Sequelize**, conserva los datos al reiniciar y comienza sin registros automáticos. El destino predeterminado y Docker Compose siguen siendo locales; el perfil `supabase-dev` permite usar la base remota de desarrollo validada. El almacén en memoria permanece para pruebas aisladas; no se utiliza como fallback ante errores de la base. Los cierres independientes y sus evidencias se registran en [planificación](docs/planificación.md#8-criterios-de-aceptación-y-pruebas).

## Stack tecnológico

| Área | Tecnología | Uso |
| --- | --- | --- |
| Frontend | React + Vite | Interfaz de usuario |
| Backend | Node.js + Express + TypeScript | API HTTP, validación y acceso a datos |
| Persistencia | PostgreSQL 17.12 local y Supabase de desarrollo + Sequelize 6 + Umzug | Consultas persistentes y migraciones explícitas |
| Pruebas | node:test + Vitest + Testing Library | Contratos HTTP, reglas y comportamiento de la interfaz |
| Contenedores | Docker + Docker Compose | Ejecución reproducible de frontend, backend y PostgreSQL |
| Paquetes | pnpm | Gestión de dependencias |
| Control de versiones | Git / GitHub | Desarrollo mediante ramas y Pull Requests |

### Tecnologías previstas

Como parte de la evolución del proyecto se prevé incorporar:

- **Caddy** como proxy inverso y para configuración HTTPS.
- Sistema de cuentas de clientes.
- Seguimiento de casos y comunicación con representantes.

Estas funcionalidades todavía no forman parte de la implementación actual. Su incorporación y la elección definitiva de tecnologías requieren consignas y decisiones aprobadas; no son parte de la corrección de deuda técnica.

## Estructura principal

```text
├── backend/
│   ├── controllers/          # Controladores de las peticiones HTTP
│   ├── config/               # Validación de CORS y configuración PostgreSQL
│   ├── data/                 # Acceso PostgreSQL y memoria para pruebas aisladas
│   ├── database/             # Conexión, runner Umzug y guía de persistencia
│   ├── middleware/           # Errores HTTP seguros
│   ├── migrations/           # Cambios de esquema versionados
│   ├── models/               # Modelos y contratos de datos
│   ├── routes/               # Rutas de la API
│   ├── validations/          # Validación pura de entradas
│   ├── tests/                # Pruebas aisladas, HTTP, PostgreSQL y tipos
│   ├── Dockerfile            # Imagen Docker del backend
│   ├── app.ts                # Prepara Express sin abrir un puerto
│   ├── index.ts              # Configuración y arranque explícito
│   └── package.json
│
├── frontend/
│   ├── public/               # Archivos públicos
│   ├── src/
│   │   ├── assets/           # Recursos multimedia
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/            # Vistas principales
│   │   ├── services/         # Comunicación con la API
│   │   ├── config/           # Destino público de la API
│   │   └── test/             # Preparación y fixtures de pruebas
│   ├── Dockerfile            # Imagen Docker del frontend
│   └── package.json
│
├── docs/
│   ├── decisiones-diseno.md  # Análisis y decisiones de diseño
│   ├── planificación.md      # Tareas, dependencias y cierres aprobados
│   └── CHECKLIST.md          # Auditoría práctica y reproducción limpia pendiente
│
├── docker-compose.yml        # Orquestación de frontend, backend y PostgreSQL
└── README.md
```

## Instalación e inicio

Para las herramientas de desarrollo y pruebas se utiliza **Node 22 desde 22.22.2** y **pnpm 12.3.4**. Ambos manifiestos fijan el gestor; los lockfiles se conservan para reproducir la instalación. Las imágenes siguen siendo de desarrollo y usan `node:22-alpine`.

**La rama oficial de entrega del Taller III es `main`.** Su referencia pública `686c4c2` contiene la refactorización, persistencia, pruebas y documentación previamente integradas en `develop`; las actualizaciones documentales de esta revisión requieren todavía commit e integración manuales. El [checklist](docs/CHECKLIST.md#13-actualización-documental-y-preparación-de-la-reproducción-limpia--18112026) registra la comprobación Git y los pendientes de entrega.

| Modalidad | Herramientas necesarias | Qué se ejecuta |
| --- | --- | --- |
| Aplicación con Compose | Git, Node/pnpm en el host para preparar claves y ejecutar migraciones; Docker con motor Linux y Compose v2 o posterior, como Docker Desktop con contenedores Linux. | Frontend, backend y PostgreSQL en contenedores. |
| Aplicación en el host | Git, Node/pnpm y dependencias de ambos componentes; el mismo Docker/Compose para PostgreSQL. | React/Vite y Express en terminales locales; PostgreSQL en un contenedor. |

Se necesita acceso a los registros de paquetes e imágenes, o una caché suficiente. Para los verificadores Docker adicionales también se necesitan Buildx y `tar` compatibles. No hay un procedimiento completamente independiente de Docker verificado para la persistencia local.

Los comandos siguientes parten de la raíz del repositorio y de una terminal sin variables remotas heredadas. Para el primer arranque se pueden conservar los valores locales predeterminados, sin crear `.env`. Si ya existe configuración privada, revisar su destino sin mostrar secretos ni sobrescribir archivos. Para una **copia nueva aislada de los recursos habituales**, seguir la secuencia PowerShell del checklist; su ejecución integral sigue pendiente.

### Opción recomendada: aplicación con Docker Compose

#### 1. Clonar el repositorio

```powershell
git clone --branch main https://github.com/nicc-essp/MetodologiaDeSistemasII.git
cd MetodologiaDeSistemasII
git branch --show-current
git rev-parse HEAD
```

#### 2. Preparar PostgreSQL y aplicar la migración explícita

Con Docker instalado y en ejecución, preparar las claves privadas de P03 y las herramientas del backend:

```powershell
pnpm --dir backend install --frozen-lockfile
node scripts/postgres.mjs preparar
docker compose up -d --wait postgres
pnpm --dir backend db:migrate
```

La migración se ejecuta desde el host con el rol migrador. El backend del contenedor recibe únicamente el secreto de aplicación. No se eliminan volúmenes para repetir la preparación.

#### 3. Construir e iniciar la aplicación

Sin el paso 2, Compose no tiene `secrets/postgres/*.txt` (están fuera de Git) y el contenedor de PostgreSQL no arranca.

```powershell
docker compose up --build
```

Docker Compose inicia frontend, backend y PostgreSQL:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- PostgreSQL: `127.0.0.1:5433`, solo para herramientas locales.

El backend espera disponibilidad de PostgreSQL y verifica esquema/permisos antes de escuchar HTTP. Sin conexión o sin migración, falla de forma segura y no utiliza memoria. Comprobar desde otra terminal:

```powershell
Invoke-RestMethod http://localhost:3001/health
(Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3001/formulario).Content
```

El primer comando debe indicar el estado del proceso; no comprueba continuamente la base. El segundo debe devolver `[]` en una base nueva. Abrir el frontend y comprobar creación/listado solo con datos ficticios. Los puertos 5173, 3001 y 5433 deben estar disponibles; si están ocupados, no detener procesos ajenos.

Para detenerlos:

```powershell
docker compose stop
```

Detener únicamente el proyecto propio. El volumen conserva las consultas; `docker compose down` retira contenedores y red de ese proyecto, pero conserva el volumen si no se añade `--volumes`. No borrar volúmenes ni claves para reparar un fallo de autenticación.

## PostgreSQL local para desarrollo y pruebas (P03)

P03 está completada y aprobada; P04 está técnicamente completada tras la aprobación de su hito remoto. P04.2 incorpora modelo y migración; P04.3 conecta el arranque normal y la API con PostgreSQL; P04.4b valida la persistencia real en Supabase de desarrollo. Las pruebas siguen pudiendo inyectar memoria en `createApp`. Ver [conexión, migraciones y arranque](backend/database/README.md).

P04.4a incorpora la selección explícita `local`/`supabase-dev`, los usuarios directos o session pooler y TLS con CA y comprobación de nombre. **P04.4b fue verificada y aprobada por Homero**, mediante Session pooler en el puerto 5432, PostgreSQL 17.12, Data API desactivada y SSL obligatorio. La migración `001-crear-consultas`, sus objetos e historial y los permisos separados de aplicación/migrador fueron verificados. Con React y Express ejecutándose localmente, se comprobó el listado inicialmente vacío, el envío de un formulario ficticio, su registro con ID 1 por HTTP y SQL Editor y su conservación tras reiniciar únicamente el backend. Esta es evidencia aportada por el usuario; no se repitió durante la actualización documental.

**Una base remota operativa no constituye un despliegue público de la aplicación.** No hay autenticación ni autorización de usuarios para consultar formularios; mantener datos ficticios y acceso controlado. Compose continúa siendo local. La [guía de persistencia](backend/database/README.md) distingue evidencia automatizada local y validación remota, y conserva las protecciones de credenciales y migraciones. No reutilizar las suites de pruebas o limpieza locales contra Supabase ni repetir operaciones remotas sin autorización específica.

Se utiliza `postgres:17.12-bookworm`, fijado por [digest del índice oficial de imágenes](https://github.com/docker-library/repo-info/blob/master/repos/postgres/remote/17.12-bookworm.md). El servicio de desarrollo tiene un volumen nombrado `postgres_dev_data`, gestionado por Compose. Frontend, backend y PostgreSQL publican puertos únicamente en `127.0.0.1`.

Preparar claves locales aleatorias e iniciar solo PostgreSQL:

```powershell
node scripts/postgres.mjs preparar
docker compose up -d --wait postgres
docker compose ps postgres
```

Las tres claves quedan en `secrets/postgres/`, excluido de Git. Se montan como secretos de Compose, sin contraseñas en el YAML ni en variables `VITE_*`. El preparador nunca sobrescribe claves existentes y rechaza configuraciones incompletas. `.env.example` contiene solo parámetros públicos y rutas; no es necesario copiarlo para usar los valores predeterminados. PostgreSQL escucha en `localhost:5433`.

El administrador `postgres` solo prepara la instancia. `docker_laws_migrator` es dueño del esquema `app` y puede crear objetos allí; inicialmente `docker_laws_app` solo tiene conexión y uso del esquema. La migración `001-crear-consultas` concede lectura/inserción sobre `app.consultas` y uso de su secuencia. No se conceden privilegios globales sobre tablas futuras ni acceso de aplicación al historial de migraciones. Ningún rol de aplicación o migración es superusuario ni puede crear bases o roles.

Comprobar una conexión TCP autenticada con el rol de aplicación:

```powershell
docker compose exec -T postgres sh -c 'PGPASSWORD="$(cat /run/secrets/postgres_app)" psql -h 127.0.0.1 -U docker_laws_app -d "$POSTGRES_DB" -c "SELECT current_user, current_database();"'
docker compose restart postgres
```

`pg_isready` comprueba disponibilidad; la consulta anterior comprueba autenticación. El volumen conserva datos al reiniciar o detener el servicio. Los scripts iniciales se ejecutan únicamente con un volumen vacío: modificar las claves después no cambia automáticamente las contraseñas de una instancia inicializada. No borrar el volumen para intentar reparar esa situación.

El PostgreSQL de pruebas usa `docker-compose.test.yml`, base, claves y volumen independientes. Para preparación manual de sus claves existe `node scripts/postgres.mjs preparar --pruebas`; ese archivo Compose debe ejecutarse con un proyecto diferente del desarrollo y nunca combinarse con el principal.

La verificación reproducible no utiliza el desarrollo habitual: crea dos proyectos con UUID, claves sintéticas diferentes, volúmenes propios y puertos asignados por Docker. Comprueba acceso de los tres roles, autenticación obligatoria, permisos, ausencia inicial de tablas, persistencia tras reinicio e independencia entre instancias. Solo introduce una tabla sintética `p03_verificacion` dentro de esas instancias nuevas.

```powershell
node --test scripts/postgres.test.mjs
node scripts/postgres.mjs verificar --limpiar
```

`--limpiar` autoriza retirar únicamente recursos nuevos de esa ejecución, después de comprobar nombres y etiquetas. Se rechazan proyectos/volúmenes preexistentes, secretos ajenos, puertos públicos y motores Docker remotos TCP/SSH. No se ejecutan limpiezas globales, `prune` ni borrados sobre una URL de base proporcionada externamente. Sin `--limpiar`, la verificación conserva sus recursos detenidos e informa sus nombres y el directorio temporal de claves. Si no puede acreditar propiedad o completar la limpieza, falla y deja los recursos para revisión.

PostgreSQL es una dependencia del arranque normal y no requiere activar un perfil de Compose. Las migraciones se ejecutan por separado y nunca al iniciar Express. La validación en Supabase de desarrollo está completada; esto no habilita uso productivo ni publicación. Continuar usando solo datos ficticios en este entorno sin autenticación ni autorización de usuarios.

## Frontend y backend en el host, con PostgreSQL en Docker

Esta modalidad requiere las mismas versiones de Node/pnpm y Docker/Compose activo para PostgreSQL. Las dependencias se instalan en ambos componentes con sus lockfiles. No iniciar a la vez los servicios frontend/backend de Compose sobre los mismos puertos; mantener los valores locales predeterminados o revisar la configuración acordada.

### Frontend

En una terminal propia:

```powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend dev --host localhost --port 5173 --strictPort
```

El frontend estará disponible en:

```text
http://localhost:5173
```

### Backend

En otra terminal, desde la misma raíz y con destino PostgreSQL local:

```powershell
pnpm --dir backend install --frozen-lockfile
node scripts/postgres.mjs preparar
docker compose up -d --wait postgres
pnpm --dir backend db:migrate
pnpm --dir backend start
```

El backend estará disponible en:

```text
http://localhost:3001
```

Las comprobaciones HTTP del apartado anterior también aplican aquí. Para detener, usar `Ctrl+C` en las terminales propias de Vite y Express y `docker compose stop postgres` para ese PostgreSQL. Se conserva su volumen. El ensayo limpio del checklist utiliza un nombre de proyecto único y un puerto PostgreSQL asignado por Docker para evitar reutilizar el desarrollo habitual.

## API de formularios

### Estado del backend

```http
GET /health
```

Permite comprobar que el servidor está funcionando.

### Obtener formularios

```http
GET /formulario
```

Devuelve los formularios almacenados actualmente.

### Obtener formulario por ID

```http
GET /formulario/:id
```

Devuelve el formulario correspondiente al ID indicado.

Si no existe, el backend responde con estado `404`.

### Crear formulario

```http
POST /formulario
```

El cuerpo esperado contiene:

```json
{
  "nombre": "Juan",
  "apellido": "Pérez",
  "dni": "12345678",
  "telefono": "2914000000",
  "email": "juan@ejemplo.com",
  "asunto": "Consulta contractual",
  "mensaje": "Necesito asesoramiento sobre un contrato."
}
```

El `id` no es ingresado por el usuario: es generado por el backend.

Si faltan campos obligatorios, el backend responde con estado `400`.

Los siete campos deben ser textos no vacíos ni compuestos solo por blancos. El correo requiere exactamente un `@`, partes no vacías y ausencia de blancos; no se verifica su existencia ni se exige un punto en el dominio. DNI y teléfono siguen siendo texto, sin formatos nacionales nuevos. Los valores válidos se conservan sin recortarlos.

El cuerpo debe proporcionarse como JSON. Estructuras o JSON inválidos reciben un error controlado `400`; superar **102400 bytes** conserva el rechazo `413`. Los rechazos no agregan registros ni consumen un identificador. Las respuestas de error contienen `message`; el frontend utiliza mensajes conocidos o explicaciones locales seguras.

## Configuración pública de conexión

| Variable | Uso | Valor predeterminado |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base HTTP(S) alcanzable desde el navegador; admite un prefijo de ruta. | `http://localhost:3001` |
| `CORS_ORIGINS` | Orígenes HTTP(S) permitidos, separados por comas. | `http://localhost:5173` |

Ausente o en blanco conserva el valor predeterminado; una configuración explícita inválida produce un error y no se sustituye silenciosamente. CORS controla lectura del navegador, no autentica ni autoriza usuarios.

Para Compose, `.env.example` documenta ambas variables; puede copiarse como `.env` con valores públicos. En ejecución local, Vite puede leer `frontend/.env` a partir de `frontend/.env.example`; el backend recibe variables del proceso, sin dotenv. Por ejemplo, en terminales PowerShell separadas:

```powershell
$env:CORS_ORIGINS = 'http://127.0.0.1:5173'
pnpm --dir backend start
```

```powershell
$env:VITE_API_BASE_URL = 'http://127.0.0.1:3001'
pnpm --dir frontend dev --host 127.0.0.1 --port 5173 --strictPort
```

Abrir `http://127.0.0.1:5173`. Reiniciar los procesos al cambiar configuración; un bundle construido requiere reconstrucción. Las variables `VITE_*` son públicas: no deben contener secretos. El nombre `backend` de la red Docker no es una URL general para el navegador del host.

## Pruebas y comprobaciones de calidad

```powershell
pnpm --dir backend typecheck
pnpm --dir backend test
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
```

El backend usa un perfil TypeScript estricto sin emisión y archivos explícitos de pruebas con `node:test` y tsx. La prueba de tipos verifica el comando y la configuración reales, todos los archivos pertinentes y un error controlado en una copia temporal; no modifica las fuentes originales. La suite normal usa memoria y no requiere PostgreSQL. `pnpm --dir backend test:postgres --limpiar` ejecuta migraciones y API sobre instancias nuevas separadas, con las protecciones de P03. Las pruebas HTTP abren un puerto efímero propio y lo cierran. Las pruebas frontend usan red controlada, datos ficticios y limpieza de DOM/estado.

En Windows, si pnpm 12.3.4 falla al administrar su propio directorio durante la instalación, con ese gestor ya disponible se puede reutilizarlo explícitamente: `pnpm --dir frontend with current install --frozen-lockfile` (equivalente para backend). No cambiar versiones para eludir un fallo sin comprobar su compatibilidad.

Para las comprobaciones Docker se necesitan motor activo, Buildx y `tar` capaz de inspeccionar los formatos generados:

```powershell
node --test scripts/verificar-docker.test.mjs
node scripts/verificar-docker.mjs --modo contexto
node scripts/verificar-docker.mjs --modo imagenes
```

El selector opcional `--componente backend` o `--componente frontend` permite comprobar una política por separado. El verificador copia únicamente fuentes públicas a temporales propios, introduce fixtures sintéticos, comprueba el contexto filtrado y las configuraciones/capas de las imágenes, e incluye controles positivos de fuga. No usa credenciales reales y falla si una herramienta o formato no puede verificarse. Las exclusiones cubren las categorías ensayadas; no constituyen un detector universal de secretos.

Las etiquetas, el teclado y las regiones de estado tienen pruebas automatizadas. **La revisión manual de accesibilidad del prototipo refactorizado fue completada satisfactoriamente por el usuario con Chrome y Narrador de Windows, en Windows 10.** El usuario confirmó teclado, foco visible, identificación de los siete campos, validación, anuncios de pendiente/éxito/error y navegación por consultas, incluidos fallos de red, con datos ficticios en localhost y 127.0.0.1. Esta evidencia humana complementa las pruebas automatizadas; jsdom no la reemplaza.

Las nuevas pantallas o funcionalidades y los cambios en los flujos afectados requerirán sus propias revisiones de accesibilidad; la revisión del prototipo no acredita resultados futuros ni conformidad completa con una norma. La aplicación conserva acceso sin autenticación: utilizar exclusivamente datos sintéticos, sin publicación con datos personales reales.

## Flujo actual de formularios

El flujo implementado es:

```text
ConsultaJuridica.jsx
        │
        ▼
formularioService.js
        │
        ▼
POST /formulario
        │
        ▼
Backend / Sequelize / PostgreSQL (local o Supabase de desarrollo)
        │
        ▼
GET /formulario
        │
        ▼
formularioService.js
        │
        ▼
ConsultasRecibidas.jsx
```

Las vistas del frontend no realizan directamente las peticiones HTTP. Las operaciones relacionadas con formularios se encuentran centralizadas en `frontend/src/services/formularioService.js`.

## Documentación de diseño

Las decisiones de diseño y mantenibilidad analizadas durante el desarrollo se encuentran documentadas en:

```text
docs/decisiones-diseno.md
```

Allí se documentan el código analizado, diagnóstico, alternativas consideradas, decisiones tomadas, evidencia y trade-offs.

La [discusión técnica](docs/discusion-tecnica.md) conserva el análisis exploratorio del 14/11/2026, anterior a la persistencia. Sus recomendaciones y DER de seis entidades no constituyen decisiones aprobadas ni describen el esquema implementado. D01–D04 y el cierre P01–P04 están en las decisiones y la planificación; D05–D09 continúan pendientes. La [auditoría del Taller III](docs/CHECKLIST.md) conserva las 437 pruebas únicas y resultados históricos del 18/11/2026, junto con una actualización documental y el ensayo limpio todavía pendiente. Ese ensayo no se ha ejecutado durante esta corrección.
