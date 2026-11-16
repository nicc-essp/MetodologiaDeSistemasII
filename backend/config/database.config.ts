import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type RolPostgres = 'aplicacion' | 'migrador';
export interface ConfiguracionPostgres {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const roles = {
  aplicacion: { username: 'docker_laws_app', archivo: 'app.txt' },
  migrador: { username: 'docker_laws_migrator', archivo: 'migrator.txt' },
} as const;

export function leerConfiguracionPostgres(
  rol: RolPostgres = 'aplicacion', env: NodeJS.ProcessEnv = process.env,
): ConfiguracionPostgres {
  if (!Object.hasOwn(roles, rol)) throw new Error('Rol PostgreSQL no permitido.');
  const host = env.POSTGRES_HOST ?? '127.0.0.1';
  const database = env.POSTGRES_DB ?? 'docker_laws_dev';
  const puerto = env.POSTGRES_PORT ?? '5433';
  if (!host.trim() || !database.trim()) throw new Error('POSTGRES_HOST y POSTGRES_DB no pueden estar vacíos.');
  if (!/^\d+$/.test(puerto) || Number(puerto) < 1 || Number(puerto) > 65535) {
    throw new Error('POSTGRES_PORT debe ser un puerto entre 1 y 65535.');
  }
  const directorio = env.POSTGRES_SECRETS_DIR ?? './secrets/postgres';
  if (!directorio.trim()) throw new Error('POSTGRES_SECRETS_DIR no puede estar vacío.');
  const { username, archivo } = roles[rol];
  let password: string;
  try {
    password = readFileSync(resolve(raiz, directorio, archivo), 'utf8');
  } catch {
    throw new Error(`No se pudo leer ${archivo}. Prepará las credenciales privadas de P03.`);
  }
  if (!/^[a-f0-9]{48}$/.test(password)) throw new Error(`Formato de ${archivo} incompatible con las credenciales de P03.`);
  return { host, port: Number(puerto), database, username, password };
}
