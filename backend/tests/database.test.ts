import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConnectionError } from 'sequelize';
import { MigrationError } from 'umzug';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from '../database/connection';
import { crearMigrador, describirErrorPostgres, leerComando, migracionInicial } from '../database/migrate';
import { definirConsulta } from '../models/consulta.model';

function conCredenciales(run: (env: NodeJS.ProcessEnv) => void) {
  const temporal = mkdtempSync(join(realpathSync(tmpdir()), 'docker-laws-db-config-'));
  const directorio = join(temporal, 'claves');
  mkdirSync(directorio);
  writeFileSync(join(directorio, 'app.txt'), 'a'.repeat(48));
  writeFileSync(join(directorio, 'migrator.txt'), 'b'.repeat(48));
  try { run({ POSTGRES_SECRETS_DIR: directorio }); } finally {
    assert.equal(dirname(temporal), realpathSync(tmpdir()));
    assert.ok(basename(temporal).startsWith('docker-laws-db-config-'));
    rmSync(temporal, { recursive: true });
  }
}

test('configuración reutiliza archivos de P03 y fija un rol limitado por finalidad', () => {
  conCredenciales(env => {
    const aplicacion = leerConfiguracionPostgres('aplicacion', env);
    assert.deepEqual(aplicacion, { host: '127.0.0.1', port: 5433, database: 'docker_laws_dev',
      username: 'docker_laws_app', password: 'a'.repeat(48) });
    const migrador = leerConfiguracionPostgres('migrador', { ...env, POSTGRES_DB: 'docker_laws_test', POSTGRES_PORT: '5544' });
    assert.equal(migrador.username, 'docker_laws_migrator');
    assert.equal(migrador.password, 'b'.repeat(48));
    assert.equal(migrador.database, 'docker_laws_test');
    assert.equal(migrador.port, 5544);
    assert.equal(readFileSync(join(env.POSTGRES_SECRETS_DIR!, 'app.txt'), 'utf8'), 'a'.repeat(48));
  });
});

for (const invalido of ['', '0', '-1', '65536', '5433.5', 'texto']) {
  test(`configuración rechaza puerto inválido ${JSON.stringify(invalido)}`, () => {
    assert.throws(() => leerConfiguracionPostgres('aplicacion', { POSTGRES_PORT: invalido }), /POSTGRES_PORT/);
  });
}

test('configuración ausente o inválida falla sin revelar contenidos privados', () => {
  conCredenciales(env => {
    const envAusente = { ...env, POSTGRES_SECRETS_DIR: join(env.POSTGRES_SECRETS_DIR!, 'ausente') };
    assert.throws(() => leerConfiguracionPostgres('migrador', envAusente), /Prepará las credenciales/);
    assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, POSTGRES_DB: '' }), /POSTGRES_DB/);
    assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, POSTGRES_HOST: '' }), /POSTGRES_HOST/);
    assert.throws(() => leerConfiguracionPostgres('aplicacion', { ...env, POSTGRES_SECRETS_DIR: '' }), /POSTGRES_SECRETS_DIR/);
    writeFileSync(join(env.POSTGRES_SECRETS_DIR!, 'app.txt'), 'CLAVE_FICTICIA_INVALIDA');
    assert.throws(() => leerConfiguracionPostgres('aplicacion', env), error => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Formato de app.txt/);
      assert.ok(!error.message.includes('CLAVE_FICTICIA_INVALIDA'));
      return true;
    });
  });
});

test('modelo y registro de migraciones se preparan sin conectar ni sincronizar negocio', async () => {
  const conexion = crearConexionPostgres({ host: '127.0.0.1', port: 1, database: 'ficticia', username: 'docker_laws_app', password: 'ficticia' });
  try {
    const Consulta = definirConsulta(conexion);
    assert.equal(Consulta.tableName, 'consultas');
    assert.equal(Consulta.options.schema, 'app');
    assert.equal(Consulta.options.timestamps, false);
    const atributos = Consulta.getAttributes();
    assert.deepEqual(Object.keys(atributos), ['id', 'nombre', 'apellido', 'dni', 'telefono', 'email', 'asunto', 'mensaje']);
    assert.equal(String(atributos.id.type), 'INTEGER');
    assert.equal(atributos.id.primaryKey, true);
    assert.equal(atributos.id.autoIncrement, true);
    for (const [nombre, atributo] of Object.entries(atributos)) {
      assert.equal(atributo.allowNull, false);
      if (nombre !== 'id') assert.equal(String(atributo.type), 'TEXT');
    }
    const migrador = crearMigrador(conexion);
    assert.deepEqual((await migrador.migrations(conexion.getQueryInterface())).map(m => m.name), [migracionInicial]);
    assert.equal(conexion.model('SequelizeMeta').tableName, 'SequelizeMeta');
    assert.equal(conexion.model('SequelizeMeta').options.schema, 'app');
  } finally { await conexion.close(); }
});

test('runner solo acepta up/status y presenta errores seguros', () => {
  assert.equal(leerComando(['up']), 'up');
  assert.equal(leerComando(['status']), 'status');
  for (const args of [[], ['down'], ['up', '--rerun'], ['up', '--to', 'otra']]) {
    assert.throws(() => leerComando(args), /No se admiten reversiones ni rerun/);
  }
  const causa = Object.assign(new Error('SQL Y CLAVE FICTICIOS'), { original: { code: '42501' } });
  const error = new MigrationError({ name: migracionInicial, direction: 'up', context: {} }, causa);
  const mensaje = describirErrorPostgres(error);
  assert.match(mensaje, /001-crear-consultas/);
  assert.match(mensaje, /42501/);
  assert.ok(!mensaje.includes('SQL Y CLAVE FICTICIOS'));
  assert.match(describirErrorPostgres(new ConnectionError(new Error('CLAVE_FICTICIA'))), /No se pudo conectar/);
});

test('importar el runner no conecta y la CLI rechaza down antes de leer credenciales', () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const importacion = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    'import "./database/migrate.ts"; console.log("importado");'], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.equal(importacion.status, 0, importacion.stderr);
  assert.equal(importacion.stdout.trim(), 'importado');
  const invalido = spawnSync(process.execPath, ['--import', 'tsx', 'database/migrate.ts', 'down'], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.equal(invalido.status, 1);
  assert.match(invalido.stderr, /No se admiten reversiones ni rerun/);
});
