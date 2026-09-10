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

```text
/
├── frontend/          # Interfaz web
├── backend/           # API Express
├── docker-compose.yml
└── README.md
```

Ajustar este árbol al layout real del repositorio.

## Instalación e inicio



## Licencia

