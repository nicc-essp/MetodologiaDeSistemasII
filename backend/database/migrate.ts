import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConnectionError } from 'sequelize';
import type { Sequelize } from 'sequelize';
import { MigrationError, SequelizeStorage, Umzug } from 'umzug';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from './connection';
import { up as crearConsultas } from '../migrations/001-crear-consultas';
import { up as crearUsuarios } from '../migrations/002-crear-usuarios';

export const migracionInicial = '001-crear-consultas';
export const migracionUsuarios = '002-crear-usuarios';

export function crearMigrador(sequelize: Sequelize) {
  return new Umzug({
    migrations: [
      { name: migracionInicial, up: crearConsultas },
      { name: migracionUsuarios, up: crearUsuarios },
    ],
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, schema: 'app', tableName: 'SequelizeMeta' }),
    logger: undefined,
  });
}

export function leerComando(args: readonly string[]): 'up' | 'status' {
  if (args.length !== 1 || (args[0] !== 'up' && args[0] !== 'status')) {
    throw new Error('Uso: db:migrate (up) o db:status. No se admiten reversiones ni rerun.');
  }
  return args[0];
}

export function leerConfiguracionMigracion(args: readonly string[], env: NodeJS.ProcessEnv = process.env) {
  if (env.POSTGRES_TARGET === 'supabase-dev') {
    if (args.length !== 3 || args[0] !== 'up' || args[1] !== '--supabase-project'
      || !/^[a-z0-9]{20}$/.test(args[2] ?? '') || args[2] !== env.SUPABASE_PROJECT_REF) {
      throw new Error('Supabase requiere up --supabase-project REF coincidente con el perfil autorizado. db:status remoto está deshabilitado.');
    }
    return { comando: 'up' as const, config: leerConfiguracionPostgres('migrador', env) };
  }
  return { comando: leerComando(args), config: leerConfiguracionPostgres('migrador', env) };
}

export function describirErrorPostgres(error: unknown): string {
  if (error instanceof ConnectionError) return 'No se pudo conectar a PostgreSQL. Revisá disponibilidad y credenciales del migrador.';
  const causa: unknown = error instanceof MigrationError ? error.cause : error;
  const original = causa && typeof causa === 'object' && 'original' in causa ? causa.original : undefined;
  const codigo = original && typeof original === 'object' && 'code' in original ? original.code : undefined;
  const estado = typeof codigo === 'string' && /^[0-9A-Z]{5}$/.test(codigo) ? ` (SQLSTATE ${codigo})` : '';
  const nombre = error instanceof MigrationError && error.migration.name ? ` ${error.migration.name}` : '';
  return `Falló la operación de migraciones${nombre}${estado}. Revisá el esquema app, sus objetos y los permisos del migrador.`;
}

async function main() {
  let comando: 'up' | 'status';
  let config: ReturnType<typeof leerConfiguracionPostgres>;
  try {
    ({ comando, config } = leerConfiguracionMigracion(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Configuración PostgreSQL inválida.');
    process.exitCode = 1;
    return;
  }
  const conexion = crearConexionPostgres(config);
  try {
    await conexion.authenticate();
    const migrador = crearMigrador(conexion);
    if (comando === 'up') {
      const aplicadas = await migrador.up();
      console.log(aplicadas.length ? `Migraciones aplicadas: ${aplicadas.map(m => m.name).join(', ')}` : 'Sin migraciones pendientes.');
    } else {
      console.log(JSON.stringify({ ejecutadas: await migrador.executed(), pendientes: await migrador.pending() }));
    }
  } catch (error) {
    console.error(describirErrorPostgres(error));
    process.exitCode = 1;
  } finally {
    await conexion.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main();
