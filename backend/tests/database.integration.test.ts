import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { QueryTypes } from 'sequelize';
import type { QueryInterface } from 'sequelize';
import { MigrationError } from 'umzug';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from '../database/connection';
import { crearMigrador, describirErrorPostgres, migracionInicial, migracionUsuarios } from '../database/migrate';
import { iniciarServidor } from '../index';
import { definirConsulta } from '../models/consulta.model';
import { consultaFicticia } from './helpers/fixtures';
import { comprobarDestinoDescartable, ejecutarAltaRepresentante, ejecutarCli } from './helpers/postgres';
import { autenticarRepresentante, datosRepresentanteFicticio } from './helpers/auth';

test('PostgreSQL descartable: migración, esquema, historial, modelo y permisos reales', { timeout: 90000 }, async t => {
  comprobarDestinoDescartable();
  const migrador = crearConexionPostgres(leerConfiguracionPostgres('migrador'));
  const aplicacion = crearConexionPostgres(leerConfiguracionPostgres('aplicacion'));
  const historial = () => migrador.query('SELECT name FROM app."SequelizeMeta" ORDER BY name', { type: QueryTypes.SELECT });
  const env = { ...process.env, AUTH_REPRESENTANTES_IDS: '' };
  const opcionesServidor = { puerto: 0, host: '127.0.0.1', env };
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

    const registro = crearMigrador(migrador);
    assert.deepEqual((await registro.up({ to: migracionInicial })).map(m => m.name), [migracionInicial]);
    assert.deepEqual(await historial(), [{ name: migracionInicial }]);
    assert.deepEqual((await registro.pending()).map(m => m.name), [migracionUsuarios]);
    const Consulta = definirConsulta(aplicacion);
    assert.deepEqual(await Consulta.findAll({ raw: true }), []);
    const datosAnteriores = { ...consultaFicticia, asunto: 'Consulta ficticia anterior a 002' };
    const creadaAntes = await Consulta.create(datosAnteriores);
    const idAnterior = creadaAntes.get('id');
    assert.ok(typeof idAnterior === 'number' && Number.isInteger(idAnterior) && idAnterior > 0);
    const consultaAnterior = { id: idAnterior, ...datosAnteriores };
    assert.deepEqual(await Consulta.findByPk(consultaAnterior.id, { raw: true }), consultaAnterior);

    await t.test('con solo 001 Express exige la migración de cuentas antes de escuchar', async () => {
      await assert.rejects(async () => {
        const inesperado = await iniciarServidor(opcionesServidor);
        await inesperado.cerrar();
      }, /comprobar el esquema y los permisos de cuentas/);
      assert.deepEqual(await historial(), [{ name: migracionInicial }]);
      const [tabla] = await migrador.query<{ nombre: string | null }>(
        "SELECT to_regclass('app.usuarios') AS nombre", { type: QueryTypes.SELECT });
      assert.equal(tabla.nombre, null);
    });

    await t.test('la CLI aplica solo 002 y conserva la consulta creada con 001', async () => {
      assert.equal(ejecutarCli('up'), `Migraciones aplicadas: ${migracionUsuarios}`);
      assert.deepEqual(await historial(), [{ name: migracionInicial }, { name: migracionUsuarios }]);
      assert.deepEqual(await Consulta.findAll({ raw: true }), [consultaAnterior]);
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

    await t.test('usuarios tiene las cinco columnas, secuencia del migrador, índices y tipo restringido de 002', async () => {
      const columnas = await migrador.getQueryInterface().describeTable({ schema: 'app', tableName: 'usuarios' });
      assert.deepEqual(Object.keys(columnas).sort(), ['email', 'id', 'nombre', 'password_hash', 'tipo']);
      assert.match(String(columnas.id.defaultValue), /nextval\(/);
      for (const [nombre, columna] of Object.entries(columnas)) {
        assert.equal(columna.allowNull, false, nombre);
        assert.equal(columna.type, nombre === 'id' ? 'INTEGER' : 'TEXT', nombre);
      }
      const [secuencia] = await migrador.query(`
        SELECT pg_get_serial_sequence('app.usuarios', 'id') AS nombre,
          pg_get_userbyid(relowner) AS propietario
        FROM pg_class WHERE oid = 'app.usuarios_id_seq'::regclass AND relkind = 'S'
      `, { type: QueryTypes.SELECT });
      assert.deepEqual(secuencia, { nombre: 'app.usuarios_id_seq', propietario: 'docker_laws_migrator' });

      const restricciones = await migrador.query<{
        tipo: string; nombre: string; definicion: string; validada: boolean; indice: boolean | null;
      }>(`
        SELECT c.contype::text AS tipo, c.conname AS nombre, pg_get_constraintdef(c.oid) AS definicion,
          c.convalidated AS validada, i.indisvalid AND i.indisunique AS indice
        FROM pg_constraint c LEFT JOIN pg_index i ON i.indexrelid = c.conindid
        WHERE c.conrelid = 'app.usuarios'::regclass ORDER BY tipo, nombre
      `, { type: QueryTypes.SELECT });
      assert.deepEqual(restricciones.map(({ tipo, validada, indice }) => ({ tipo, validada, indice })), [
        { tipo: 'c', validada: true, indice: null },
        { tipo: 'p', validada: true, indice: true },
        { tipo: 'u', validada: true, indice: true },
      ]);
      assert.equal(restricciones[0].nombre, 'usuarios_tipo_check');
      assert.match(restricciones[0].definicion, /'cliente'/);
      assert.match(restricciones[0].definicion, /'representante'/);
      assert.equal(restricciones[1].definicion, 'PRIMARY KEY (id)');
      assert.equal(restricciones[2].definicion, 'UNIQUE (email)');
      await assert.rejects(aplicacion.query(`
        INSERT INTO app.usuarios (nombre, email, tipo, password_hash)
        VALUES ('Cuenta ficticia', 'tipo-invalido@ejemplo.invalid', 'desconocido', 'marcador-sintetico')
      `), error => {
        assert.ok(error && typeof error === 'object' && 'original' in error);
        const causa = error.original as { code: string; constraint: string };
        assert.equal(causa.code, '23514');
        assert.equal(causa.constraint, 'usuarios_tipo_check');
        return true;
      });
    });

    await t.test('Express arranca con el rol de aplicación, recupera la consulta previa y persiste cuentas', async () => {
      const preparacion = ejecutarAltaRepresentante(datosRepresentanteFicticio);
      assert.ifError(preparacion.error);
      assert.equal(preparacion.status, 0, preparacion.stderr);
      assert.match(preparacion.stdout.trim(), /^[1-9][0-9]*$/);
      const idRepresentante = Number(preparacion.stdout.trim());
      const servicio = await iniciarServidor({
        ...opcionesServidor, env: { ...env, AUTH_REPRESENTANTES_IDS: String(idRepresentante) },
      });
      try {
        const { port } = servicio.servidor.address() as AddressInfo;
        const base = `http://127.0.0.1:${port}`;
        const headers = await autenticarRepresentante(base);
        const listado = await fetch(`${base}/formulario`, { headers });
        assert.equal(listado.status, 200);
        assert.deepEqual(await listado.json(), [consultaAnterior]);
        const detalle = await fetch(`${base}/formulario/${consultaAnterior.id}`, { headers });
        assert.equal(detalle.status, 200);
        assert.deepEqual(await detalle.json(), consultaAnterior);

        const enviar = (ruta: string, datos: object) => fetch(`${base}/auth${ruta}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
        });
        const datos = { nombre: 'Cuenta ficticia', email: 'actualizacion@ejemplo.invalid', tipo: 'cliente' };
        const credenciales = { email: datos.email, password: 'ClaveFicticia002' };
        const alta = await enviar('/register', { ...datos, ...credenciales });
        assert.equal(alta.status, 201);
        const usuario: unknown = await alta.json();
        assert.ok(usuario && typeof usuario === 'object' && 'id' in usuario
          && typeof usuario.id === 'number' && usuario.id > 0);
        assert.deepEqual(usuario, { id: usuario.id, ...datos });
        const duplicado = await enviar('/register', { ...datos, ...credenciales });
        assert.equal(duplicado.status, 409);
        assert.deepEqual(await duplicado.json(), { message: 'El correo electrónico ya está registrado' });
        const persistidos = await aplicacion.query('SELECT id, nombre, email, tipo FROM app.usuarios ORDER BY id', { type: QueryTypes.SELECT });
        assert.deepEqual(persistidos, [{
          id: idRepresentante, nombre: datosRepresentanteFicticio.nombre,
          email: datosRepresentanteFicticio.email, tipo: 'representante',
        }, usuario]);
        const login = await enviar('/login', credenciales);
        assert.equal(login.status, 200);
        const sesion: unknown = await login.json();
        assert.ok(sesion && typeof sesion === 'object' && 'usuario' in sesion);
        assert.deepEqual(sesion.usuario, { ...usuario, puedeLeerConsultas: false });
      } finally {
        await servicio.cerrar();
      }
    });

    await t.test('segunda ejecución y consulta del historial no duplican cambios', async () => {
      assert.equal(ejecutarCli('up'), 'Sin migraciones pendientes.');
      const estado = JSON.parse(ejecutarCli('status'));
      assert.deepEqual(estado.ejecutadas.map((m: { name: string }) => m.name), [migracionInicial, migracionUsuarios]);
      assert.deepEqual(estado.pendientes, []);
      assert.deepEqual(await historial(), [{ name: migracionInicial }, { name: migracionUsuarios }]);
      assert.deepEqual(await Consulta.findAll({ raw: true }), [consultaAnterior]);
    });

    await t.test('aplicación crea y lee con el modelo sin cambiar textos ni imponer unicidad de contacto', async () => {
      const primero = await Consulta.create(consultaFicticia);
      const segundo = await Consulta.create(consultaFicticia);
      assert.equal(typeof primero.get('id'), 'number');
      assert.notEqual(primero.get('id'), segundo.get('id'));
      assert.deepEqual(primero.get({ plain: true }), { id: primero.get('id'), ...consultaFicticia });
      assert.deepEqual(await Consulta.findAll({ order: [['id', 'ASC']], raw: true }),
        [consultaAnterior, primero.get({ plain: true }), segundo.get({ plain: true })]);
      await assert.rejects(aplicacion.query('INSERT INTO app.consultas (nombre) VALUES (NULL)'), error => {
        assert.ok(error && typeof error === 'object' && 'original' in error);
        assert.equal((error.original as { code: string }).code, '23502');
        return true;
      });
    });

    await t.test('aplicación sin DDL, UPDATE/DELETE ni acceso al historial; migrador dueño de los objetos', async () => {
      for (const sql of [
        "UPDATE app.consultas SET nombre = 'Cambio ficticio'", 'DELETE FROM app.consultas',
        "UPDATE app.usuarios SET nombre = 'Cambio ficticio'", 'DELETE FROM app.usuarios',
        'CREATE TABLE app.no_permitida (id integer)', 'SELECT * FROM app."SequelizeMeta"',
        'INSERT INTO app."SequelizeMeta" (name) VALUES (\'no_permitida\')', 'DELETE FROM app."SequelizeMeta"',
      ]) {
        await assert.rejects(aplicacion.query(sql), error => {
          assert.ok(error && typeof error === 'object' && 'original' in error);
          assert.equal((error.original as { code: string }).code, '42501');
          return true;
        });
      }
      for (const nombre of ['app.consultas_id_seq', 'app.usuarios_id_seq']) {
        const [secuencia] = await aplicacion.query<{ uso: boolean; actualizacion: boolean }>(`
          SELECT has_sequence_privilege(current_user, :nombre, 'USAGE') AS uso,
            has_sequence_privilege(current_user, :nombre, 'UPDATE') AS actualizacion
        `, { replacements: { nombre }, type: QueryTypes.SELECT });
        assert.deepEqual(secuencia, { uso: true, actualizacion: false }, nombre);
      }
      const propietarios = await migrador.query<{ tablename: string; tableowner: string }>(
        "SELECT tablename, tableowner FROM pg_tables WHERE schemaname='app' ORDER BY tablename", { type: QueryTypes.SELECT });
      assert.deepEqual(propietarios, [
        { tablename: 'SequelizeMeta', tableowner: 'docker_laws_migrator' },
        { tablename: 'consultas', tableowner: 'docker_laws_migrator' },
        { tablename: 'usuarios', tableowner: 'docker_laws_migrator' },
      ]);
    });
  } finally {
    await Promise.all([migrador.close(), aplicacion.close()]);
  }
});
