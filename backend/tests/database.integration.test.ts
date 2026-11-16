import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QueryTypes } from 'sequelize';
import type { QueryInterface } from 'sequelize';
import { MigrationError } from 'umzug';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from '../database/connection';
import { crearMigrador, describirErrorPostgres, migracionInicial } from '../database/migrate';
import { definirConsulta } from '../models/consulta.model';
import { consultaFicticia } from './helpers/fixtures';

// Solo el wrapper de P03 entrega un destino nuevo con claves sintéticas propias.
function comprobarDestinoDescartable() {
  assert.match(process.env.DOCKER_LAWS_TEST_PROJECT ?? '', /^docker-laws-p03-test-[a-f0-9]{32}$/, 'Ejecutar mediante pnpm test:postgres.');
  assert.equal(process.env.POSTGRES_HOST, '127.0.0.1');
  assert.equal(process.env.POSTGRES_DB, 'docker_laws_test');
  const claves = realpathSync(process.env.POSTGRES_SECRETS_DIR ?? '');
  const temporal = dirname(claves);
  assert.equal(dirname(temporal), realpathSync(tmpdir()));
  assert.match(basename(temporal), /^docker-laws-postgres-[a-zA-Z0-9]+$/);
  assert.equal(basename(claves), 'test');
  assert.equal(claves, resolve(process.env.POSTGRES_SECRETS_DIR!));
}

function ejecutarCli(comando: 'up' | 'status') {
  const script = comando === 'up' ? 'db:migrate' : 'db:status';
  const opciones = { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8' as const, timeout: 20000 };
  const resultado = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `pnpm.cmd --silent run ${script}`], opciones)
    : spawnSync('pnpm', ['--silent', 'run', script], opciones);
  assert.equal(resultado.status, 0, resultado.stderr);
  return resultado.stdout.trim();
}

test('PostgreSQL descartable: migración, esquema, historial, modelo y permisos reales', { timeout: 90000 }, async t => {
  comprobarDestinoDescartable();
  const migrador = crearConexionPostgres(leerConfiguracionPostgres('migrador'));
  const aplicacion = crearConexionPostgres(leerConfiguracionPostgres('aplicacion'));
  try {
    // Fuera de los subtests: una base que ya tenga tablas detiene todo antes del DDL.
    await migrador.authenticate();
    assert.deepEqual(await migrador.query("SELECT tablename FROM pg_tables WHERE schemaname = 'app'", { type: QueryTypes.SELECT }), []);
    await t.test('autenticación de roles limitados sin instalar pg-hstore', async () => {
      assert.throws(() => createRequire(import.meta.url).resolve('pg-hstore'), { code: 'MODULE_NOT_FOUND' });
      for (const [conexion, rol] of [[migrador, 'docker_laws_migrator'], [aplicacion, 'docker_laws_app']] as const) {
        await conexion.authenticate();
        const [identidad] = await conexion.query<{ rol: string; base: string; superusuario: boolean }>(
          'SELECT current_user AS rol, current_database() AS base, rolsuper AS superusuario FROM pg_roles WHERE rolname = current_user',
          { type: QueryTypes.SELECT });
        assert.deepEqual(identidad, { rol, base: 'docker_laws_test', superusuario: false });
      }
    });

    await t.test('fallo controlado revierte el DDL de la transacción y no registra éxito', async () => {
      const interfaz = migrador.getQueryInterface();
      const crearTabla = interfaz.createTable;
      const registro = crearMigrador(migrador);
      // Solo falla después de crear consultas; la creación técnica del historial sigue intacta.
      interfaz.createTable = async (...args: Parameters<QueryInterface['createTable']>) => {
        await crearTabla.apply(interfaz, args);
        if (typeof args[0] === 'object' && args[0].tableName === 'consultas') throw new Error('fallo controlado ficticio');
      };
      try {
        await assert.rejects(registro.up(), error => {
          assert.ok(error instanceof MigrationError);
          assert.match(describirErrorPostgres(error), /001-crear-consultas/);
          assert.ok(!describirErrorPostgres(error).includes('fallo controlado ficticio'));
          return true;
        });
      } finally { interfaz.createTable = crearTabla; }
      const [tabla] = await migrador.query<{ nombre: string | null }>("SELECT to_regclass('app.consultas') AS nombre", { type: QueryTypes.SELECT });
      assert.equal(tabla.nombre, null);
      assert.deepEqual(await registro.executed(), []);
    });

    await t.test('la CLI aplica la migración sobre una base sin tablas de negocio', async () => {
      assert.match(ejecutarCli('up'), /Migraciones aplicadas: 001-crear-consultas/);
      assert.deepEqual(await migrador.query('SELECT name FROM app."SequelizeMeta"', { type: QueryTypes.SELECT }), [{ name: migracionInicial }]);
      assert.deepEqual(await migrador.query('SELECT * FROM app.consultas', { type: QueryTypes.SELECT }), []);
    });

    await t.test('estructura física exacta: INTEGER generado, siete TEXT NOT NULL y sin timestamps', async () => {
      const columnas = await migrador.query<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>(
        "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='app' AND table_name='consultas' ORDER BY ordinal_position", { type: QueryTypes.SELECT });
      assert.deepEqual(columnas.map(c => c.column_name), ['id', 'nombre', 'apellido', 'dni', 'telefono', 'email', 'asunto', 'mensaje']);
      assert.equal(columnas[0].data_type, 'integer');
      assert.match(columnas[0].column_default ?? '', /nextval\(/);
      for (const columna of columnas) {
        assert.equal(columna.is_nullable, 'NO');
        if (columna.column_name !== 'id') assert.equal(columna.data_type, 'text');
      }
      const claves = await migrador.query<{ columna: string }>(
        "SELECT a.attname AS columna FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.conrelid='app.consultas'::regclass AND c.contype='p'", { type: QueryTypes.SELECT });
      assert.deepEqual(claves, [{ columna: 'id' }]);
    });

    await t.test('segunda ejecución y consulta del historial no duplican cambios', async () => {
      assert.equal(ejecutarCli('up'), 'Sin migraciones pendientes.');
      const estado = JSON.parse(ejecutarCli('status'));
      assert.deepEqual(estado.ejecutadas.map((m: { name: string }) => m.name), [migracionInicial]);
      assert.deepEqual(estado.pendientes, []);
      assert.deepEqual(await migrador.query('SELECT name FROM app."SequelizeMeta"', { type: QueryTypes.SELECT }), [{ name: migracionInicial }]);
    });

    await t.test('aplicación crea y lee con el modelo sin cambiar textos ni imponer unicidad de contacto', async () => {
      const Consulta = definirConsulta(aplicacion);
      const primero = await Consulta.create(consultaFicticia);
      const segundo = await Consulta.create(consultaFicticia);
      assert.equal(typeof primero.get('id'), 'number');
      assert.notEqual(primero.get('id'), segundo.get('id'));
      assert.deepEqual(primero.get({ plain: true }), { id: primero.get('id'), ...consultaFicticia });
      assert.deepEqual(await Consulta.findAll({ order: [['id', 'ASC']], raw: true }), [primero.get({ plain: true }), segundo.get({ plain: true })]);
      await assert.rejects(aplicacion.query('INSERT INTO app.consultas (nombre) VALUES (NULL)'), error => {
        assert.ok(error && typeof error === 'object' && 'original' in error);
        assert.equal((error.original as { code: string }).code, '23502');
        return true;
      });
    });

    await t.test('aplicación sin DDL, UPDATE/DELETE ni acceso al historial; migrador dueño de los objetos', async () => {
      for (const sql of [
        "UPDATE app.consultas SET nombre = 'Cambio ficticio'", 'DELETE FROM app.consultas',
        'CREATE TABLE app.no_permitida (id integer)', 'SELECT * FROM app."SequelizeMeta"',
        'INSERT INTO app."SequelizeMeta" (name) VALUES (\'no_permitida\')', 'DELETE FROM app."SequelizeMeta"',
      ]) {
        await assert.rejects(aplicacion.query(sql), error => {
          assert.ok(error && typeof error === 'object' && 'original' in error);
          assert.equal((error.original as { code: string }).code, '42501');
          return true;
        });
      }
      const [secuencia] = await aplicacion.query<{ uso: boolean; actualizacion: boolean }>(
        "SELECT has_sequence_privilege(current_user,'app.consultas_id_seq','USAGE') AS uso, has_sequence_privilege(current_user,'app.consultas_id_seq','UPDATE') AS actualizacion", { type: QueryTypes.SELECT });
      assert.deepEqual(secuencia, { uso: true, actualizacion: false });
      const propietarios = await migrador.query<{ tablename: string; tableowner: string }>(
        "SELECT tablename, tableowner FROM pg_tables WHERE schemaname='app' ORDER BY tablename", { type: QueryTypes.SELECT });
      assert.deepEqual(propietarios, [
        { tablename: 'SequelizeMeta', tableowner: 'docker_laws_migrator' },
        { tablename: 'consultas', tableowner: 'docker_laws_migrator' },
      ]);
    });
  } finally {
    await Promise.all([migrador.close(), aplicacion.close()]);
  }
});
