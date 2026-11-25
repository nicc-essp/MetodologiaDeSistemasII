import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { QueryTypes } from 'sequelize';
import { createApp } from '../app';
import { iniciarServidor } from '../index';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from '../database/connection';
import { migracionInicial, migracionUsuarios } from '../database/migrate';
import { prepararAlmacenPostgres } from '../data/formularios-postgres';
import type { Formulario } from '../models/formulario';
import { consultaFicticia } from './helpers/fixtures';
import { withHttp } from './helpers/http';
import { comprobarDestinoDescartable, ejecutarCli } from './helpers/postgres';

test('API HTTP con PostgreSQL descartable: persistencia, validación, fallos y cierre', { timeout: 90000 }, async t => {
  comprobarDestinoDescartable();
  const env = { ...process.env, CORS_ORIGINS: 'http://localhost:5173' };
  const migrador = crearConexionPostgres(leerConfiguracionPostgres('migrador', env));
  let servicio: Awaited<ReturnType<typeof iniciarServidor>> | undefined;
  const url = () => `http://127.0.0.1:${(servicio!.servidor.address() as AddressInfo).port}`;
  const listar = async () => {
    const response = await fetch(`${url()}/formulario`);
    assert.equal(response.status, 200);
    const datos: unknown = await response.json();
    assert.ok(Array.isArray(datos));
    return datos as Formulario[];
  };
  const enviar = async (datos: unknown) => fetch(`${url()}/formulario`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos),
  });
  try {
    await migrador.authenticate();
    // Precondición obligatoria antes de cualquier DDL, fuera de subtests que puedan continuar tras fallar.
    assert.deepEqual(await migrador.query("SELECT tablename FROM pg_tables WHERE schemaname='app'", { type: QueryTypes.SELECT }), []);

    await t.test('sin migración no abre HTTP, no migra automáticamente ni recurre a memoria', async () => {
      await assert.rejects(async () => {
        const inesperado = await iniciarServidor({ env, puerto: 0, host: '127.0.0.1' });
        await inesperado.cerrar();
      }, /comprobar el esquema/);
      assert.deepEqual(await migrador.query("SELECT tablename FROM pg_tables WHERE schemaname='app'", { type: QueryTypes.SELECT }), []);
    });

    assert.equal(ejecutarCli('up'), `Migraciones aplicadas: ${migracionInicial}, ${migracionUsuarios}`);
    servicio = await iniciarServidor({ env, puerto: 0, host: '127.0.0.1' });
    await t.test('el arranque migrado comienza vacío y mantiene health y CORS', async () => {
      assert.deepEqual(await listar(), []);
      const health = await fetch(`${url()}/health`);
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { status: 'ok' });
      const response = await fetch(`${url()}/formulario`, { headers: { Origin: 'http://localhost:5173' } });
      assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    });

    let primero: Formulario;
    await t.test('POST conserva textos, ignora id/extras y devuelve un objeto público', async () => {
      const datos = { ...consultaFicticia, nombre: '  Persona 😀 ficticia  ', mensaje: "  Texto ⚖️ cafe\u0301\nD'Prueba\r\n  " };
      const response = await enviar({ ...datos, id: 999, extra: 'ignorado' });
      assert.equal(response.status, 201);
      primero = await response.json() as Formulario;
      assert.equal(typeof primero.id, 'number');
      assert.notEqual(primero.id, 999);
      assert.deepEqual(primero, { id: primero.id, ...datos });
      assert.deepEqual(await listar(), [primero]);
    });

    await t.test('detalle mantiene conversiones históricas y 404 para IDs inválidos/inexistentes', async () => {
      for (const id of [String(primero!.id), `0${primero!.id}`, `${primero!.id}.0`, `${primero!.id}e0`]) {
        const response = await fetch(`${url()}/formulario/${id}`);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), primero!);
      }
      for (const id of ['abc', 'NaN', 'Infinity', '-Infinity', '1.5', '0', '-1', '2147483647', '2147483648', '-2147483649', '999999999999999999999999']) {
        const response = await fetch(`${url()}/formulario/${id}`);
        assert.equal(response.status, 404, id);
        assert.deepEqual(await response.json(), { message: 'Formulario no encontrado' });
      }
    });

    await t.test('creaciones HTTP concurrentes generan IDs únicos y el listado queda ordenado', async () => {
      const creados = await Promise.all(Array.from({ length: 8 }, async (_, i) => {
        const response = await enviar({ ...consultaFicticia, mensaje: `Consulta concurrente ficticia ${i}` });
        assert.equal(response.status, 201);
        return await response.json() as Formulario;
      }));
      assert.equal(new Set(creados.map(c => c.id)).size, creados.length);
      const esperado = [primero!, ...creados].sort((a, b) => a.id - b.id);
      assert.deepEqual(await listar(), esperado);
    });

    await t.test('NUL y Unicode mal formado se rechazan en los siete campos antes de insertar', async () => {
      const antes = await listar();
      const secuenciaAntes = await migrador.query('SELECT last_value FROM app.consultas_id_seq', { type: QueryTypes.SELECT });
      for (const campo of Object.keys(consultaFicticia)) {
        for (const invalido of ['\u0000', '\uD800', '\uDFFF', '\uD800\uD800', '\uDFFF\uDFFF']) {
          const response = await enviar({ ...consultaFicticia, [campo]: `texto${invalido}` });
          assert.equal(response.status, 400);
          assert.deepEqual(await response.json(), { message: 'Los campos del formulario contienen caracteres no válidos' });
        }
      }
      const cuerpo = Buffer.from(JSON.stringify({ ...consultaFicticia, mensaje: 'MARCADOR_UTF8' }));
      cuerpo[cuerpo.indexOf('MARCADOR_UTF8')] = 0xff;
      const response = await fetch(`${url()}/formulario`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: new Uint8Array(cuerpo) });
      assert.equal(response.status, 400);
      assert.deepEqual(await listar(), antes);
      assert.deepEqual(await migrador.query('SELECT last_value FROM app.consultas_id_seq', { type: QueryTypes.SELECT }), secuenciaAntes);
    });

    await t.test('recrear el servidor conserva los datos y el cierre es idempotente', async () => {
      const antes = await listar();
      const anterior = url();
      const cierre = servicio!.cerrar();
      assert.equal(servicio!.cerrar(), cierre);
      await cierre;
      assert.equal(servicio!.servidor.listening, false);
      await assert.rejects(fetch(`${anterior}/health`, { signal: AbortSignal.timeout(2000) }));
      servicio = await iniciarServidor({ env, puerto: 0, host: '127.0.0.1' });
      assert.deepEqual(await listar(), antes);
    });

    await t.test('un error real de PostgreSQL devuelve 500 seguro y permite recuperar el acceso', async () => {
      const antes = await listar();
      await migrador.query('REVOKE SELECT ON TABLE app.consultas FROM docker_laws_app');
      try {
        const response = await fetch(`${url()}/formulario`);
        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { message: 'Error interno del servidor' });
      } finally {
        await migrador.query('GRANT SELECT ON TABLE app.consultas TO docker_laws_app');
      }
      assert.deepEqual(await listar(), antes);
    });

    await t.test('sin permisos de inserción el arranque falla antes de escuchar', async () => {
      await migrador.query('REVOKE INSERT ON TABLE app.consultas FROM docker_laws_app');
      try {
        await assert.rejects(async () => {
          const inesperado = await iniciarServidor({ env, puerto: 0, host: '127.0.0.1' });
          await inesperado.cerrar();
        }, /comprobar el esquema/);
      } finally { await migrador.query('GRANT INSERT ON TABLE app.consultas TO docker_laws_app'); }
    });

    await t.test('una conexión cerrada produce 500 en las tres operaciones, sin fallback a memoria', async () => {
      const conexion = crearConexionPostgres(leerConfiguracionPostgres('aplicacion', env));
      let almacen;
      try {
        await conexion.authenticate();
        almacen = await prepararAlmacenPostgres(conexion);
      } finally { await conexion.close(); }
      const antes = await listar();
      await withHttp(createApp({ almacen }), async base => {
        for (const [method, ruta] of [['GET', '/formulario'], ['GET', `/formulario/${primero!.id}`], ['POST', '/formulario']]) {
          const response = await fetch(`${base}${ruta}`, { method,
            headers: { 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(consultaFicticia) : undefined });
          assert.equal(response.status, 500);
          assert.deepEqual(await response.json(), { message: 'Error interno del servidor' });
        }
      });
      assert.deepEqual(await listar(), antes);
    });

    await t.test('el arranque normal sin PostgreSQL falla con salida segura, sin servidor alternativo', async () => {
      const puerto = await withHttp((_req, res) => res.end(), async base => new URL(base).port);
      const resultado = spawnSync(process.execPath, ['--import', 'tsx', 'index.ts'], {
        cwd: fileURLToPath(new URL('../', import.meta.url)), env: { ...env, POSTGRES_PORT: puerto },
        encoding: 'utf8', timeout: 15000,
      });
      assert.ifError(resultado.error);
      assert.equal(resultado.status, 1);
      assert.equal(resultado.stdout, '');
      assert.match(resultado.stderr, /conectar a PostgreSQL con el rol de aplicación/);
      assert.ok(!resultado.stderr.includes(leerConfiguracionPostgres('aplicacion', env).password));
    });
  } finally {
    try { await servicio?.cerrar(); } finally { await migrador.close(); }
  }
});
