# Metodología de Sistemas II

## Estudio jurídico Docker-laws

Aplicación web full stack para el estudio jurídico ficticio **Docker-laws**.

La aplicación ofrece información sobre servicios, casos, opiniones, profesionales y contactos del estudio. También permite enviar formularios para solicitar asesoría legal y un sistema de cuentas para que los clientes se comuniquen con sus representantes y sigan sus casos las 24 horas.

Los formularios de clientes se almacenan en una base de datos para que los abogados puedan consultarlos desde la misma aplicación.

## Stack tecnológico


| Área                 | Tecnología            | Uso                                                                          |
| -------------------- | --------------------- | ---------------------------------------------------------------------------- |
| Frontend y backend   | Node.js               | Mismo ecosistema en cliente y servidor                                       |
| Base de datos        | Supabase (PostgreSQL) | Persistencia de formularios, usuarios y casos                                |
| API                  | Express               | Servidor HTTP y rutas                                                        |
| ORM                  | Sequelize             | Modelos y acceso a la base de datos                                          |
| Contenedores         | Docker                | Aislamiento de la API y despliegues reproducibles                            |
| HTTPS                | Caddy                 | Proxy inverso y certificados                                                 |
| Paquetes             | pnpm                  | Instalación más rápida, menos espacio en disco y `node_modules` más estricto |
| Control de versiones | Git Flow              | Ramas `main`, `develop`, `feature/*`, `hotfix/*`                             |




## Desarrollo

- Node.js en frontend y backend.
- Supabase como base de datos.
- Docker para aislar la API y desplegar en entornos controlados.
- Caddy, junto con Docker, para HTTPS.
- pnpm en lugar de npm.
- Git Flow para organizar el trabajo en equipo.
- Express + Sequelize para la API y el acceso a PostgreSQL.



## Estructura de archivos

Pendiente. Cuando exista el código, documentar al menos:

/
├── backend/
│   ├── config/              # Configuraciones globales (DB, variables de entorno, etc.)
│   ├── controllers/         # Lógica de negocio y controladores de peticiones
│   ├── middleware/          # Middlewares (autenticación, validaciones, errores)
│   ├── migrations/          # Migraciones de base de datos
│   ├── models/              # Definición de esquemas y modelos de datos
│   ├── routes/              # Endpoints y definición de rutas de la API
│   ├── seeders/             # Cargas iniciales de datos para desarrollo/pruebas
│   ├── tests/               # Pruebas unitarias y de integración
│   └── utils/               # Funciones auxiliares y herramientas reutilizables
│
├── frontend/
│   ├── public/              # Archivos estáticos públicos
│   └── src/
│       ├── assets/          # Recursos multimedia
│       │   ├── icons/       # Iconos SVG o componentes de iconos
│       │   └── images/      # Imágenes estáticas
│       ├── components/      # Componentes reutilizables
│       │   ├── common/      # Componentes genéricos compartidos
│       │   ├── layout/      # Estructuras de diseño (Navbar, Footer, Sidebar)
│       │   └── ui/          # Elementos atómicos de UI (botones, inputs, modales)
│       ├── hooks/           # Custom hooks
│       ├── pages/           # Vistas o páginas principales de la aplicación
│       ├── services/        # Llamadas a la API y clientes HTTP
│       ├── styles/          # Hojas de estilo globales y temas
│       └── utils/           # Funciones de soporte y formateadores frontend
│
├── docker-compose.yml       # Orquestación de contenedores
└── README.md                # Documentación del proyecto

Ajustar este árbol al layout real del repositorio.

## Instalación e inicio

1. Clonar repositorio

Ejemplo con https:

```bash
git clone https://github.com/nicc-essp/MetodologiaDeSistemasII.git
```

2. Comprobar node y pnpm (en caso de no tenerlos, instalarlos según corresponda a su sistema)

```bash
node -v
pnpm -v
```

3. Ir al frontend (página de muestra)

```bash
cd frontend
```

4. Instalar dependencias

```bash
pnpm install
pnpm dev
```

5. Abrir [http://localhost:5173](http://localhost:5173) para acceder a la página local
6. NO IMPLEMENTADO: Instalar dependencias backend

```bash
cd backend
pnpm install
```

Por ahora no es posible acceder al backend