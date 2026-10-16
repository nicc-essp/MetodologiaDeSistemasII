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
| Backend | Node.js + Express | API HTTP y lógica del servidor |
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

Estas funcionalidades todavía no forman parte de la implementación actual.

## Estructura principal

```text
├── backend/
│   ├── controllers/          # Controladores de las peticiones HTTP
│   ├── data/                 # Almacenamiento provisional de datos
│   ├── models/               # Modelos y contratos de datos
│   ├── routes/               # Rutas de la API
│   ├── Dockerfile            # Imagen Docker del backend
│   ├── index.ts              # Configuración y entrada del servidor
│   └── package.json
│
├── frontend/
│   ├── public/               # Archivos públicos
│   ├── src/
│   │   ├── assets/           # Recursos multimedia
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/            # Vistas principales
│   │   ├── services/         # Comunicación con la API
│   │   └── styles/           # Estilos
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
pnpm --dir frontend install
pnpm --dir frontend dev
```

El frontend estará disponible en:

```text
http://localhost:5173
```

### Backend

```bash
pnpm --dir backend install
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