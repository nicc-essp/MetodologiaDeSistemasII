import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { X509Certificate } from 'node:crypto';

export type RolPostgres = 'aplicacion' | 'migrador';
interface ConexionPostgres {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}
export type ConfiguracionPostgres = ConexionPostgres & (
  | { destino: 'local'; ssl: false }
  | { destino: 'supabase-dev'; proyecto: string;
      ssl: { ca: string; rejectUnauthorized: true; servername: string } }
);

const variablesRemotas = ['POSTGRES_CONNECTION_MODE', 'SUPABASE_PROJECT_REF', 'POSTGRES_SSL_CA_FILE'];

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const roles = {
  aplicacion: { username: 'docker_laws_app', archivo: 'app.txt' },
  migrador: { username: 'docker_laws_migrator', archivo: 'migrator.txt' },
} as const;

export function leerConfiguracionPostgres(
  rol: RolPostgres = 'aplicacion', env: NodeJS.ProcessEnv = process.env,
): ConfiguracionPostgres {
  if (!Object.hasOwn(roles, rol)) throw new Error('Rol PostgreSQL no permitido.');
  // No aceptar vías alternativas de credenciales o TLS que pg pueda heredar.
  for (const variable of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_USER', 'POSTGRES_PASSWORD',
    'POSTGRES_SSL_MODE', 'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD',
    'PGSSLMODE', 'PGSSLROOTCERT', 'PGSSLCERT', 'PGSSLKEY', 'PGSERVICE', 'PGSERVICEFILE']) {
    if (env[variable] !== undefined) throw new Error(`No se admite ${variable}; utilizá la configuración PostgreSQL del proyecto.`);
  }
  const destino = env.POSTGRES_TARGET ?? 'local';
  if (destino !== 'local' && destino !== 'supabase-dev') throw new Error('POSTGRES_TARGET debe ser local o supabase-dev.');
  if (destino === 'local' && variablesRemotas.some(variable => env[variable] !== undefined)) {
    throw new Error('Configuración PostgreSQL mixta: el destino local no admite parámetros Supabase.');
  }
  if (destino === 'supabase-dev') {
    for (const variable of ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_PORT', 'POSTGRES_SECRETS_DIR', ...variablesRemotas]) {
      if (!env[variable]?.trim()) throw new Error(`Configuración supabase-dev incompleta: falta ${variable}.`);
    }
  }
  const host = env.POSTGRES_HOST ?? '127.0.0.1';
  const database = env.POSTGRES_DB ?? 'docker_laws_dev';
  const puerto = env.POSTGRES_PORT ?? '5433';
  if (!host.trim() || !database.trim()) throw new Error('POSTGRES_HOST y POSTGRES_DB no pueden estar vacíos.');
  if (!/^\d+$/.test(puerto) || Number(puerto) < 1 || Number(puerto) > 65535) {
    throw new Error('POSTGRES_PORT debe ser un puerto entre 1 y 65535.');
  }
  const directorio = env.POSTGRES_SECRETS_DIR ?? './secrets/postgres';
  if (!directorio.trim()) throw new Error('POSTGRES_SECRETS_DIR no puede estar vacío.');
  let username: string = roles[rol].username;
  const { archivo } = roles[rol];
  let remoto: Pick<Extract<ConfiguracionPostgres, { destino: 'supabase-dev' }>, 'proyecto' | 'ssl'> | undefined;
  if (destino === 'local') {
    if (!['127.0.0.1', 'localhost', '::1', 'postgres'].includes(host)) {
      throw new Error('POSTGRES_HOST local debe ser loopback o el servicio Docker postgres.');
    }
  } else {
    const proyecto = env.SUPABASE_PROJECT_REF!;
    const modo = env.POSTGRES_CONNECTION_MODE;
    if (!/^[a-z0-9]{20}$/.test(proyecto)) throw new Error('SUPABASE_PROJECT_REF debe ser una referencia de proyecto válida.');
    if (modo !== 'direct' && modo !== 'session') throw new Error('POSTGRES_CONNECTION_MODE debe ser direct o session.');
    if (Number(puerto) !== 5432 || database !== 'postgres') {
      throw new Error('supabase-dev requiere POSTGRES_PORT=5432 y POSTGRES_DB=postgres. No se admite transaction pooler.');
    }
    if (modo === 'direct' ? host !== `db.${proyecto}.supabase.co` : !/^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(host)) {
      throw new Error('POSTGRES_HOST no corresponde al modo Supabase seleccionado. Revisá Connect sin utilizar URLs.');
    }
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('No se permite desactivar la verificación TLS.');
    const ruta = resolve(raiz, directorio);
    if (['./secrets/postgres', './secrets/postgres-test', '/run/secrets/postgres'].some(local => ruta === resolve(raiz, local))) {
      throw new Error('supabase-dev requiere un directorio de credenciales independiente del entorno local.');
    }
    let ca: string;
    try {
      ca = readFileSync(resolve(raiz, env.POSTGRES_SSL_CA_FILE!), 'utf8');
      const certificados = ca.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g);
      if (!certificados?.length || ca.replace(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g, '').trim()) throw new Error();
      for (const pem of certificados) {
        const certificado = new X509Certificate(pem);
        if (!certificado.ca || Date.now() < Date.parse(certificado.validFrom) || Date.now() > Date.parse(certificado.validTo)) throw new Error();
      }
    } catch {
      throw new Error('POSTGRES_SSL_CA_FILE debe contener certificados CA PEM vigentes y legibles.');
    }
    if (modo === 'session') username = `${username}.${proyecto}`;
    remoto = { proyecto,
      ssl: { ca, rejectUnauthorized: true, servername: host } };
  }
  let password: string;
  try {
    password = readFileSync(resolve(raiz, directorio, archivo), 'utf8');
  } catch {
    throw new Error(`No se pudo leer ${archivo}. Prepará las credenciales privadas de P03.`);
  }
  if (!/^[a-f0-9]{48}$/.test(password)) throw new Error(`Formato de ${archivo} incompatible con las credenciales de P03.`);
  const conexion = { host, port: Number(puerto), database, username, password };
  return remoto ? { ...conexion, destino: 'supabase-dev', ...remoto }
    : { ...conexion, destino: 'local', ssl: false };
}
