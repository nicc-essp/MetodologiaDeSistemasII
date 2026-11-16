# Conexión y migraciones locales — P04.2

Este incremento prepara Sequelize y migraciones para PostgreSQL local. **La API continúa utilizando el almacén en memoria de P04.1.** No hay migraciones automáticas al iniciar Express, conexión con Supabase, entidades futuras ni cierre de P04.

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

Desde la raíz del repositorio, preparar el PostgreSQL de desarrollo según P03:

```powershell
node scripts/postgres.mjs preparar
docker compose --profile persistencia up -d --wait postgres
pnpm --dir backend db:migrate
pnpm --dir backend db:status
```

Los comandos `db:*` cargan el `.env` opcional de la raíz con Node, sin agregar dotenv; las variables del proceso tienen prioridad. Se reutilizan `POSTGRES_DB`, `POSTGRES_PORT` y `POSTGRES_SECRETS_DIR` de P03, más `POSTGRES_HOST` para el cliente. Predeterminados: `127.0.0.1:5433`, `docker_laws_dev`, `secrets/postgres/`. Una ruta relativa de secretos se interpreta desde la raíz del repositorio. `.env.example` contiene parámetros públicos; las contraseñas siguen en archivos privados ignorados y no se imprimen.

`leerConfiguracionPostgres('aplicacion')` selecciona exclusivamente `docker_laws_app`/`app.txt`; el runner utiliza `docker_laws_migrator`/`migrator.txt`. No hay selección del usuario administrador ni fallback ante claves ausentes. `crearConexionPostgres` prepara una instancia sin conectar: `authenticate`, consultas y cierre son explícitos.

El esquema `app` debe existir y pertenecer al migrador: lo prepara P03 sobre volúmenes nuevos. Si no existe o fallan permisos, corregir la configuración con revisión; **no eliminar ni reinicializar un volumen de desarrollo**. La conectividad y TLS para Supabase quedan fuera de este incremento.

## Esquema, historial y permisos

- `models/consulta.model.ts` define `app.consultas`: `id` INTEGER, PK autogenerada mediante secuencia PostgreSQL; siete TEXT NOT NULL (`nombre`, `apellido`, `dni`, `telefono`, `email`, `asunto`, `mensaje`); `timestamps: false`, sin relaciones ni unicidades nuevas de contacto.
- `migrations/001-crear-consultas.ts` contiene la definición histórica independiente del modelo mutable. Crea la tabla y concede privilegios dentro de una transacción. No carga registros iniciales. El nombre versionado se registra explícitamente en `crearMigrador`; agregar nuevas migraciones al registro, sin editar las ya aplicadas.
- El migrador posee el esquema, la tabla, su secuencia y `app."SequelizeMeta"`. La aplicación solo dispone de SELECT/INSERT en consultas y USAGE en la secuencia; no tiene DDL, UPDATE/DELETE ni acceso al historial. No hay privilegios globales sobre tablas futuras.
- Umzug 3.8.3 admite `schema: 'app'` y `tableName: 'SequelizeMeta'`; se comprobó físicamente. El historial utiliza la columna `name` (VARCHAR(255), NOT NULL, clave primaria), sin timestamps. Su almacenamiento crea la tabla técnica con `sync()` sin opciones destructivas, incluso al consultar estado por primera vez. **No se sincroniza el modelo de negocio** ni se utiliza `force`/`alter`.

La segunda ejecución consulta el historial y no repite la migración. La CLI solo admite `up` y `status`; no expone `down`, `rerun` ni limpieza de bases. Los fallos producen salida distinta de cero y mensajes seguros con nombre de migración o SQLSTATE cuando corresponda.

Ejecutar un solo runner a la vez. La transacción de la migración protege su DDL y concesiones; el registro posterior de Umzug es otra operación. Si el proceso se interrumpe entre ambas, revisar tabla e historial antes de reintentar. Este incremento no agrega coordinación entre migradores concurrentes ni recuperación destructiva.

## Verificación reproducible

```powershell
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir backend test:postgres --limpiar
node --test scripts/postgres.test.mjs
```

La suite normal no necesita PostgreSQL. `test:postgres` reutiliza las protecciones de P03 y crea **otra instancia nueva**, con UUID, Compose de pruebas, puerto local aleatorio, claves sintéticas y volumen propios. No acepta una URL externa. Antes del DDL exige el destino temporal y un esquema sin tablas. Comprueba roles, un fallo controlado con rollback transaccional exclusivamente allí, migración por CLI, estructura, historial, segunda ejecución, modelo y permisos.

`--limpiar` retira exclusivamente sus recursos nuevos después de acreditar propiedad; sin esa opción conserva recursos detenidos y comunica sus nombres. Nunca usa el volumen habitual de desarrollo. Las pruebas solo insertan datos ficticios en la instancia descartable.

Evidencia de esta ejecución técnica, pendiente de revisión del usuario: 245 pruebas backend, 8 pruebas/subpruebas de integración PostgreSQL y 30 pruebas de las protecciones de P03 aprobadas; typecheck correcto. Se verificaron los comandos pnpm de migración/estado, la eliminación exclusiva de los recursos nuevos y la conservación del inventario Docker previo. Estos resultados no completan P04 ni verifican Supabase.
