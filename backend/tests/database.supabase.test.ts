import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { connect, createServer, rootCertificates } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from '../database/connection';
import { leerConfiguracionMigracion } from '../database/migrate';
import { comprobarDestinoDescartable } from './helpers/postgres';

const proyecto = 'abcdefghijklmnopqrst';
const fixtures = new URL('./fixtures/tls-local/', import.meta.url);
const ca = readFileSync(new URL('ca.crt', fixtures), 'utf8');

async function conPerfil(run: (env: NodeJS.ProcessEnv) => void | Promise<void>) {
  const temporal = mkdtempSync(join(realpathSync(tmpdir()), 'docker-laws-supabase-config-'));
  writeFileSync(join(temporal, 'app.txt'), 'c'.repeat(48));
  writeFileSync(join(temporal, 'migrator.txt'), 'd'.repeat(48));
  const env = { POSTGRES_TARGET: 'supabase-dev', POSTGRES_CONNECTION_MODE: 'direct',
    SUPABASE_PROJECT_REF: proyecto, POSTGRES_HOST: `db.${proyecto}.supabase.co`,
    POSTGRES_PORT: '5432', POSTGRES_DB: 'postgres', POSTGRES_SECRETS_DIR: temporal,
    POSTGRES_SSL_CA_FILE: fileURLToPath(new URL('ca.crt', fixtures)) };
  try { await run(env); } finally {
    assert.equal(dirname(temporal), realpathSync(tmpdir()));
    assert.ok(basename(temporal).startsWith('docker-laws-supabase-config-'));
    rmSync(temporal, { recursive: true });
  }
}

test('destino local predeterminado y explícito conservan los valores de P03', async () => {
  await conPerfil(env => {
    for (const host of ['127.0.0.1', 'localhost', '::1', 'postgres']) {
      const local = { POSTGRES_HOST: host, POSTGRES_SECRETS_DIR: env.POSTGRES_SECRETS_DIR };
      const config = leerConfiguracionPostgres('aplicacion', local);
      assert.deepEqual(leerConfiguracionPostgres('aplicacion', { ...local, POSTGRES_TARGET: 'local' }), config);
      assert.equal(config.destino, 'local');
      assert.equal(config.ssl, false);
      assert.equal(config.port, 5433);
      assert.equal(config.database, 'docker_laws_dev');
    }
  });
});

test('roles directos y session pooler se seleccionan sin usuarios libres ni contraseñas en URL', async () => {
  await conPerfil(env => {
    for (const [rol, usuario, clave] of [['aplicacion', 'docker_laws_app', 'c'], ['migrador', 'docker_laws_migrator', 'd']] as const) {
      const directo = leerConfiguracionPostgres(rol, env);
      assert.equal(directo.username, usuario);
      assert.equal(directo.password, clave.repeat(48));
      assert.equal(directo.destino, 'supabase-dev');
      const session = leerConfiguracionPostgres(rol, { ...env, POSTGRES_CONNECTION_MODE: 'session', POSTGRES_HOST: 'aws-1-us-east-1.pooler.supabase.com' });
      assert.equal(session.username, `${usuario}.${proyecto}`);
      assert.equal(session.password, directo.password);
    }
  });
});

for (const variable of ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_SECRETS_DIR',
  'POSTGRES_CONNECTION_MODE', 'SUPABASE_PROJECT_REF', 'POSTGRES_SSL_CA_FILE']) {
  test(`perfil remoto incompleto no tiene fallback: ${variable}`, async () => {
    await conPerfil(env => {
      for (const valor of [undefined, '', ' ']) assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, [variable]: valor }), /incompleta/);
    });
  });
}

test('configuraciones mixtas, destinos desconocidos y parámetros remotos inválidos fallan antes de conectar', async () => {
  await conPerfil(env => {
    for (const target of ['local', undefined]) assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, POSTGRES_TARGET: target }), /mixta/);
    for (const target of ['', 'produccion']) assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, POSTGRES_TARGET: target }), /POSTGRES_TARGET/);
    for (const variable of ['POSTGRES_CONNECTION_MODE', 'SUPABASE_PROJECT_REF', 'POSTGRES_SSL_CA_FILE']) {
      assert.throws(() => leerConfiguracionPostgres('aplicacion', { POSTGRES_TARGET: 'local', [variable]: '' }), /mixta/);
    }
    for (const cambio of [
      { POSTGRES_CONNECTION_MODE: 'transaction' }, { POSTGRES_PORT: '6543' }, { POSTGRES_DB: 'docker_laws_dev' },
      { SUPABASE_PROJECT_REF: 'otro' }, { POSTGRES_HOST: '127.0.0.1' }, { POSTGRES_HOST: 'db.otro.supabase.co' },
      { POSTGRES_HOST: `postgres://usuario:CLAVE_SINTETICA@db.${proyecto}.supabase.co` },
      { POSTGRES_HOST: 'db.abcdefghijklmnopqrst.supabase.co.ejemplo.com' },
      { POSTGRES_CONNECTION_MODE: 'session', POSTGRES_HOST: `db.${proyecto}.supabase.co` },
      { POSTGRES_CONNECTION_MODE: 'session', POSTGRES_HOST: 'aws-1-us-east-1.pooler.supabase.com.ejemplo.com' },
      { POSTGRES_SECRETS_DIR: './secrets/postgres' }, { POSTGRES_SECRETS_DIR: './secrets/postgres-test' },
      { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    ]) assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, ...cambio }));
    assert.throws(() => leerConfiguracionPostgres('aplicacion', { POSTGRES_HOST: env.POSTGRES_HOST }), /local debe ser/);
  });
});

test('no se aceptan credenciales, URLs ni opciones TLS alternativas heredadas', async () => {
  await conPerfil(env => {
    for (const variable of ['DATABASE_URL', 'POSTGRES_URL', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_SSL_MODE',
      'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD', 'PGSSLMODE', 'PGSSLROOTCERT', 'PGSSLCERT', 'PGSSLKEY', 'PGSERVICE', 'PGSERVICEFILE']) {
      assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, [variable]: 'SECRETO_SINTETICO' }), error => {
        assert.ok(error instanceof Error);
        assert.ok(!error.message.includes('SECRETO_SINTETICO'));
        return true;
      });
    }
  });
});

test('errores de CA y credenciales son seguros, sin rutas ni contenidos privados', async () => {
  await conPerfil(env => {
    for (const archivo of ['no-existe-SECRETO_SINTETICO', 'app.txt']) {
      assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, POSTGRES_SSL_CA_FILE: join(env.POSTGRES_SECRETS_DIR!, archivo) }), /certificados CA PEM/);
    }
    // Un certificado de servidor tampoco es una CA confiable.
    assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, POSTGRES_SSL_CA_FILE: fileURLToPath(new URL('servidor.crt', fixtures)) }), /certificados CA PEM/);
    writeFileSync(join(env.POSTGRES_SECRETS_DIR!, 'app.txt'), 'SECRETO_SINTETICO');
    for (const cambios of [{}, { POSTGRES_SECRETS_DIR: join(env.POSTGRES_SECRETS_DIR!, 'SECRETO_SINTETICO') },
      { POSTGRES_SSL_CA_FILE: join(env.POSTGRES_SECRETS_DIR!, 'SECRETO_SINTETICO') }]) {
      assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, ...cambios }), error => {
        assert.ok(error instanceof Error);
        assert.ok(!error.message.includes('SECRETO_SINTETICO'));
        assert.ok(!error.message.includes(env.POSTGRES_SECRETS_DIR!));
        return true;
      });
    }
  });
});

test('TLS obligatorio llega intacto a Sequelize y local desactiva la herencia de SSL', async () => {
  await conPerfil(async env => {
    const remoto = leerConfiguracionPostgres('aplicacion', env);
    assert.notEqual(remoto.ssl, false);
    assert.deepEqual(remoto.ssl, { ca, rejectUnauthorized: true, servername: env.POSTGRES_HOST });
    const conexion = crearConexionPostgres(remoto);
    const local = crearConexionPostgres(leerConfiguracionPostgres('aplicacion', { POSTGRES_SECRETS_DIR: env.POSTGRES_SECRETS_DIR }));
    try {
      // Sequelize 6 expone estas opciones en ejecución, pero no en su tipo público.
      const opciones: { dialectOptions: { ssl: unknown }; pool: { max: number } } = Reflect.get(conexion, 'options');
      const opcionesLocales: { dialectOptions: { ssl: unknown } } = Reflect.get(local, 'options');
      assert.deepEqual(opciones.dialectOptions.ssl, remoto.ssl);
      assert.equal(opcionesLocales.dialectOptions.ssl, false);
      assert.equal(opciones.pool.max, 2);
    } finally { await conexion.close(); await local.close(); }
  });
});

test('TLS real en loopback acepta la CA correcta y rechaza CA ajena y nombre incorrecto; no conecta a Supabase', async () => {
  await conPerfil(async env => {
    const config = leerConfiguracionPostgres('aplicacion', env);
    assert.notEqual(config.ssl, false);
    if (!config.ssl) throw new Error('TLS requerido');
    const servidor = createServer({ key: readFileSync(new URL('servidor.key', fixtures)),
      cert: readFileSync(new URL('servidor.crt', fixtures)) }, socket => socket.end());
    servidor.on('tlsClientError', () => {});
    await new Promise<void>((resolve, reject) => {
      servidor.once('error', reject);
      servidor.listen(0, '127.0.0.1', () => { servidor.off('error', reject); resolve(); });
    });
    const direccion = servidor.address();
    assert.ok(direccion && typeof direccion !== 'string');
    const handshake = (ssl: typeof config.ssl) => new Promise<void>((resolve, reject) => {
      assert.notEqual(ssl, false);
      const socket = connect({ host: '127.0.0.1', port: direccion.port, ...ssl });
      socket.setTimeout(2000, () => socket.destroy(new Error('Tiempo TLS local agotado')));
      socket.once('error', reject);
      socket.once('secureConnect', () => { assert.equal(socket.authorized, true); socket.end(); resolve(); });
    });
    try {
      await handshake(config.ssl);
      await assert.rejects(handshake({ ...config.ssl, ca: rootCertificates[0]! }));
      await assert.rejects(handshake({ ...config.ssl, servername: 'servidor-incorrecto.example' }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
    } finally { await new Promise<void>((resolve, reject) => servidor.close(error => error ? reject(error) : resolve())); }
  });
});

test('migraciones remotas exigen up y confirmación coincidente; status nunca inicializa historial remoto', async () => {
  await conPerfil(env => {
    for (const args of [[], ['up'], ['status'], ['status', '--supabase-project', proyecto],
      ['up', '--supabase-project'], ['up', '--supabase-project', 'z'.repeat(20)],
      ['up', '--supabase-project', proyecto, '--rerun']]) {
      assert.throws(() => leerConfiguracionMigracion(args, env), /requiere up/);
    }
    const lectura = leerConfiguracionMigracion(['up', '--supabase-project', proyecto], env);
    assert.equal(lectura.comando, 'up');
    assert.equal(lectura.config.username, 'docker_laws_migrator');
    const local = { POSTGRES_TARGET: 'local', POSTGRES_SECRETS_DIR: env.POSTGRES_SECRETS_DIR };
    for (const comando of ['up', 'status']) assert.equal(leerConfiguracionMigracion([comando], local).config.destino, 'local');
    assert.throws(() => leerConfiguracionMigracion(['up', '--supabase-project', proyecto], local));
  });
});

test('CLI remota sin aprobación y db:status fallan antes de leer claves, crear conexiones o historial', () => {
  const env = { ...process.env, POSTGRES_TARGET: 'supabase-dev', SUPABASE_PROJECT_REF: proyecto,
    POSTGRES_SECRETS_DIR: 'NO_LEER', POSTGRES_HOST: 'NO_CONECTAR' };
  for (const comando of ['up', 'status']) {
    const resultado = spawnSync(process.execPath, ['--import', 'tsx', 'database/migrate.ts', comando], {
      cwd: fileURLToPath(new URL('../', import.meta.url)), env, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(resultado.status, 1);
    assert.equal(resultado.stdout, '');
    assert.match(resultado.stderr, /requiere up/);
    assert.ok(!resultado.stderr.includes('NO_LEER'));
  }
});

test('la última barrera de las pruebas con DDL rechaza un destino o parámetros Supabase', () => {
  const variables = ['POSTGRES_TARGET', 'SUPABASE_PROJECT_REF'];
  const anteriores = variables.map(variable => process.env[variable]);
  try {
    process.env.POSTGRES_TARGET = 'supabase-dev';
    assert.throws(comprobarDestinoDescartable);
    process.env.POSTGRES_TARGET = 'local';
    process.env.SUPABASE_PROJECT_REF = proyecto;
    assert.throws(comprobarDestinoDescartable, /no admiten configuración Supabase/);
  } finally {
    for (const [indice, variable] of variables.entries()) {
      if (anteriores[indice] === undefined) delete process.env[variable];
      else process.env[variable] = anteriores[indice];
    }
  }
});
