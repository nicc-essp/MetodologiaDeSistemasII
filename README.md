# Metodología de Sistemas II

## Estudio jurídico Docker-laws

Aplicación web full stack desarrollada para el estudio jurídico ficticio **Docker-laws**.

El proyecto busca ofrecer información sobre los servicios del estudio y permitir que los clientes realicen consultas jurídicas desde la aplicación.

Actualmente se encuentra implementado el flujo de formularios de consulta: un usuario puede completar y enviar una consulta desde el frontend, el backend puede recibirla y almacenarla provisionalmente, y las consultas recibidas pueden visualizarse desde otra sección de la aplicación.

El proyecto se encuentra en desarrollo. Funcionalidades como persistencia mediante base de datos, cuentas de clientes y seguimiento de casos forman parte de la evolución prevista del sistema.

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

Actualmente los formularios se almacenan **provisionalmente en memoria** en el backend. Por lo tanto, los datos creados durante la ejecución se pierden al reiniciar el servidor.

## Stack tecnológico

| Área | Tecnología | Uso |
| --- | --- | --- |
| Frontend | React + Vite | Interfaz de usuario |
| Backend | Node.js + Express + TypeScript | API HTTP, validación y almacenamiento provisional |
| Pruebas | node:test + Vitest + Testing Library | Contratos HTTP, reglas y comportamiento de la interfaz |
| Contenedores | Docker + Docker Compose | Ejecución reproducible de frontend y backend |
| Paquetes | pnpm | Gestión de dependencias |
| Control de versiones | Git / GitHub | Desarrollo mediante ramas y Pull Requests |

### Tecnologías previstas

Como parte de la evolución del proyecto se prevé incorporar:

- **Supabase (PostgreSQL)** para persistencia.
- **Sequelize** para acceso y modelado de datos.
- **Caddy** como proxy inverso y para configuración HTTPS.
- Sistema de cuentas de clientes.
- Seguimiento de casos y comunicación con representantes.

Estas funcionalidades todavía no forman parte de la implementación actual. Su incorporación y la elección definitiva de tecnologías requieren consignas y decisiones aprobadas; no son parte de la corrección de deuda técnica.

## Estructura principal

```text
├── backend/
│   ├── controllers/          # Controladores de las peticiones HTTP
│   ├── config/               # Validación de configuración pública
│   ├── data/                 # Almacenamiento provisional de datos
│   ├── middleware/           # Errores HTTP seguros
│   ├── models/               # Modelos y contratos de datos
│   ├── routes/               # Rutas de la API
│   ├── validations/          # Validación pura de entradas
│   ├── tests/                # Pruebas aisladas, HTTP y tipos
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
│   └── decisiones-diseno.md  # Análisis y decisiones de diseño
│
├── docker-compose.yml        # Orquestación de frontend y backend
└── README.md
```

## Instalación e inicio

Para las herramientas de desarrollo y pruebas se utiliza **Node 22 desde 22.22.2** y **pnpm 12.3.4**. Ambos manifiestos fijan el gestor; los lockfiles se conservan para reproducir la instalación. Las imágenes siguen siendo de desarrollo y usan `node:22-alpine`.

### Opción recomendada: Docker

#### 1. Clonar el repositorio

```bash
git clone https://github.com/nicc-essp/MetodologiaDeSistemasII.git
cd MetodologiaDeSistemasII
```

#### 2. Construir e iniciar la aplicación

Con Docker instalado y en ejecución:

```bash
docker compose up --build
```

Docker Compose inicia ambos servicios:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

Para detenerlos:

```bash
docker compose down
```

## Ejecución sin Docker

También es posible ejecutar cada parte del proyecto por separado.

### Frontend

```bash
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend dev
```

El frontend estará disponible en:

```text
http://localhost:5173
```

### Backend

```bash
pnpm --dir backend install --frozen-lockfile
pnpm --dir backend start
```

El backend estará disponible en:

```text
http://localhost:3001
```

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
pnpm --dir frontend dev --host 0.0.0.0
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

El backend usa un perfil TypeScript estricto sin emisión y seis archivos explícitos de pruebas con `node:test` y tsx. La prueba de tipos verifica el comando y la configuración reales, todos los archivos pertinentes y un error controlado en una copia temporal; no modifica las fuentes originales. Las pruebas HTTP abren un puerto efímero propio y lo cierran. Las pruebas frontend usan red controlada, datos ficticios y limpieza de DOM/estado.

En Windows, si pnpm 12.3.4 falla al administrar su propio directorio durante la instalación, con ese gestor ya disponible se puede reutilizarlo explícitamente: `pnpm --dir frontend with current install --frozen-lockfile` (equivalente para backend). No cambiar versiones para eludir un fallo sin comprobar su compatibilidad.

Para las comprobaciones Docker se necesitan motor activo, Buildx y `tar` capaz de inspeccionar los formatos generados:

```powershell
node --test scripts/verificar-docker.test.mjs
node scripts/verificar-docker.mjs --modo contexto
node scripts/verificar-docker.mjs --modo imagenes
```

El selector opcional `--componente backend` o `--componente frontend` permite comprobar una política por separado. El verificador copia únicamente fuentes públicas a temporales propios, introduce fixtures sintéticos, comprueba el contexto filtrado y las configuraciones/capas de las imágenes, e incluye controles positivos de fuga. No usa credenciales reales y falla si una herramienta o formato no puede verificarse. Las exclusiones cubren las categorías ensayadas; no constituyen un detector universal de secretos.

Las etiquetas, el teclado y las regiones de estado tienen pruebas automatizadas. **La revisión manual de anuncios con navegador y lector de pantalla reales sigue pendiente**; jsdom no la reemplaza. El prototipo conserva memoria volátil y acceso sin autenticación: utilizar exclusivamente datos sintéticos, sin publicación con datos personales reales.

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
Backend / almacenamiento provisional
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
