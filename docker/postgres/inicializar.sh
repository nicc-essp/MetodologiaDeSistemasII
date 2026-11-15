#!/bin/sh
# Solo se ejecuta al inicializar un volumen nuevo. No crea tablas de negocio.
set -eu

leer_clave() {
    clave=$(cat "$1")
    # El preparador genera claves locales aleatorias, no credenciales compartidas.
    [ "${#clave}" -eq 48 ] || { echo 'Clave local ausente o inválida.' >&2; exit 1; }
    case "$clave" in *[!0-9a-f]*) echo 'Formato de clave local inválido.' >&2; exit 1 ;; esac
    printf '%s' "$clave"
}

APP_PASSWORD=$(leer_clave "$APP_PASSWORD_FILE")
MIGRATOR_PASSWORD=$(leer_clave "$MIGRATOR_PASSWORD_FILE")
export APP_PASSWORD MIGRATOR_PASSWORD

psql -X --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv app_password APP_PASSWORD
\getenv migrator_password MIGRATOR_PASSWORD
\getenv database POSTGRES_DB
BEGIN;
SELECT format('CREATE ROLE docker_laws_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'migrator_password') \gexec
SELECT format('CREATE ROLE docker_laws_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD %L', :'app_password') \gexec
REVOKE ALL ON DATABASE :"database" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"database" TO docker_laws_migrator, docker_laws_app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA app AUTHORIZATION docker_laws_migrator;
GRANT USAGE ON SCHEMA app TO docker_laws_app;
-- Sin privilegios por defecto sobre tablas: tampoco se concede acceso al futuro historial.
COMMIT;
SQL

unset APP_PASSWORD MIGRATOR_PASSWORD
