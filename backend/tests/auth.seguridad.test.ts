import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer, request } from 'node:https';
import type { Request, Response } from 'express';
import { createApp } from '../app';
import { crearAlmacenCuentas } from '../data/cuentas-guardadas';
import { crearAlmacenFormularios } from '../data/formularios-guardados';
import { limitarSolicitudes } from '../middleware/limite-solicitudes.middleware';
import { publico } from '../models/usuario.model';
import { crearServicioAuth } from '../services/auth.service';
import { datosRepresentanteFicticio, representanteEnMemoria, representanteFicticio } from './helpers/auth';
import { consultaFicticia } from './helpers/fixtures';
import { withHttp } from './helpers/http';

const datosCliente = { ...datosRepresentanteFicticio, email: 'cliente-limite@ejemplo.invalid' };
const ventanaMs = 10 * 60 * 1000;

for (const { ruta, maximo, datos, status } of [
  { ruta: '/auth/login', maximo: 10, datos: datosCliente, status: 401 },
  { ruta: '/auth/register', maximo: 5, datos: datosCliente, status: 201 },
  { ruta: '/formulario', maximo: 20, datos: consultaFicticia, status: 201 },
]) {
  test(`${ruta} limita por separado y vuelve a admitir solicitudes al llegar a Retry-After`, async t => {
    let ahora = Date.UTC(2026, 0, 1);
    t.mock.method(Date, 'now', () => ahora);
    const cuentas = crearAlmacenCuentas();
    const almacen = crearAlmacenFormularios([]);
    const leer = t.mock.fn(cuentas.buscarPorEmail);
    const crearCuenta = t.mock.fn(cuentas.crear);
    const crearConsulta = t.mock.fn(almacen.crear);
    const app = createApp({
      cuentas: { ...cuentas, crear: crearCuenta, buscarPorEmail: leer },
      almacen: { ...almacen, crear: crearConsulta },
    });
    await withHttp(app, async base => {
      function enviar(destino: string, body: unknown, headers: Record<string, string> = {}) {
        return fetch(base + destino, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        });
      }
      for (let i = 0; i < maximo; i++) {
        const respuesta = await enviar(ruta, {});
        assert.equal(respuesta.status, 400);
        await respuesta.text();
      }
      ahora += 1000;
      const bloqueo = await enviar(ruta, datos, { 'X-Forwarded-For': '192.0.2.21' });
      assert.equal(bloqueo.status, 429);
      assert.equal(bloqueo.headers.get('retry-after'), '599');
      assert.deepEqual(await bloqueo.json(), { message: 'Demasiadas solicitudes. Intentá nuevamente más tarde.' });
      assert.equal(leer.mock.callCount() + crearCuenta.mock.callCount() + crearConsulta.mock.callCount(), 0);
      const otraRuta = ruta === '/auth/login' ? '/formulario' : '/auth/login';
      assert.equal((await enviar(otraRuta, {})).status, 400);

      ahora += ventanaMs - 1000;
      assert.equal((await enviar(ruta, datos)).status, status);
      assert.equal(leer.mock.callCount() + crearCuenta.mock.callCount() + crearConsulta.mock.callCount(), 1);
    });
  });
}

test('el cupo global del limitador abarca IP distintas y se libera al cambiar de ventana', t => {
  let ahora = Date.UTC(2026, 0, 1);
  t.mock.method(Date, 'now', () => ahora);
  const limitar = limitarSolicitudes(2, 3);
  function consultar(ip: string) {
    let status = 0;
    const res = {
      set() { return this; },
      status(codigo: number) { status = codigo; return this; },
      json() { return this; },
    };
    limitar({ ip } as Request, res as unknown as Response, () => { status = 200; });
    return status;
  }
  for (const sufijo of [1, 2, 3]) assert.equal(consultar(`192.0.2.${sufijo}`), 200);
  assert.equal(consultar('192.0.2.4'), 429);
  ahora += ventanaMs;
  assert.equal(consultar('192.0.2.4'), 200);
});

test('la política HTTPS protege cuentas y lecturas en HTTP sin confiar en encabezados reenviados', async () => {
  await withHttp(createApp({ exigirHttpsCuentas: true }), async base => {
    for (const [method, ruta] of [
      ['POST', '/auth/register'], ['POST', '/auth/login'], ['GET', '/auth/me'], ['POST', '/auth/logout'],
      ['GET', '/formulario'], ['GET', '/formulario/1'],
    ]) {
      const respuesta = await fetch(base + ruta, { method, headers: { 'X-Forwarded-Proto': 'https' } });
      assert.equal(respuesta.status, 403);
      assert.equal(respuesta.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await respuesta.json(), { message: 'Esta operación requiere HTTPS' });
    }
    assert.equal((await fetch(base + '/health')).status, 200);
  });
});

test('la política HTTPS admite el alta local con TLS real y CA sintética verificada', async () => {
  const fixture = new URL('./fixtures/tls-local/', import.meta.url);
  const cert = readFileSync(new URL('servidor.crt', fixture));
  const key = readFileSync(new URL('servidor.key', fixture));
  const ca = readFileSync(new URL('ca.crt', fixture));
  const servidor = createServer({ cert, key }, createApp({ exigirHttpsCuentas: true }));
  try {
    await new Promise<void>((ok, error) => {
      servidor.once('error', error);
      servidor.listen(0, '127.0.0.1', ok);
    });
    const direccion = servidor.address();
    assert.ok(direccion && typeof direccion !== 'string');
    const cuerpo = await new Promise<string>((ok, error) => {
      const req = request({
        host: '127.0.0.1', port: direccion.port, method: 'POST', path: '/auth/register',
        servername: 'db.abcdefghijklmnopqrst.supabase.co', ca,
        headers: { 'Content-Type': 'application/json' },
      }, respuesta => {
        let body = '';
        respuesta.setEncoding('utf8');
        respuesta.on('data', chunk => { body += chunk; });
        respuesta.on('error', error);
        respuesta.on('end', () => {
          try {
            assert.equal(respuesta.statusCode, 201);
            assert.equal(respuesta.headers['cache-control'], 'no-store');
            ok(body);
          } catch (causa) { error(causa); }
        });
      });
      req.on('error', error);
      req.setTimeout(5000, () => req.destroy(new Error('Solicitud TLS local vencida')));
      req.end(JSON.stringify(datosCliente));
    });
    assert.deepEqual(JSON.parse(cuerpo), { id: 1, nombre: datosCliente.nombre, email: datosCliente.email, tipo: 'cliente' });
  } finally {
    if (servidor.listening) await new Promise<void>(ok => servidor.close(() => ok()));
  }
});

test('HTTPS reenviado solo se admite desde un proxy configurado y con un protocolo inequívoco', async () => {
  for (const [proxy, esperado] of [['192.0.2.10', 403], ['127.0.0.1/32', 200]] as const) {
    const app = createApp({
      ...representanteEnMemoria(), proxiesConfiables: [proxy], exigirHttpsCuentas: true,
    });
    await withHttp(app, async base => {
      const ingresar = (protocolo: string) => fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': protocolo },
        body: JSON.stringify({
          email: datosRepresentanteFicticio.email, password: datosRepresentanteFicticio.password,
        }),
      });
      for (const ambiguo of ['https, http', 'http, https', 'http']) {
        assert.equal((await ingresar(ambiguo)).status, 403);
      }
      const respuesta = await ingresar('https');
      assert.equal(respuesta.status, esperado);
      assert.equal(respuesta.headers.get('cache-control'), 'no-store');
      const datos = await respuesta.json() as { token?: string };
      assert.equal(typeof datos.token, esperado === 200 ? 'string' : 'undefined');
    });
  }
});

test('el límite por IP se aplica al cliente detrás de proxies identificados', async () => {
  const app = createApp({ proxiesConfiables: ['127.0.0.1', '203.0.113.7'], exigirHttpsCuentas: true });
  await withHttp(app, async base => {
    const intentar = (cadena: string) => fetch(base + '/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https', 'X-Forwarded-For': cadena,
      },
      body: '{}',
    });
    for (let i = 1; i <= 10; i++) {
      const respuesta = await intentar(`198.51.100.${i}, 192.0.2.4, 203.0.113.7`);
      assert.equal(respuesta.status, 400);
      await respuesta.text();
    }
    assert.equal((await intentar('198.51.100.11, 192.0.2.4, 203.0.113.7')).status, 429);
    assert.equal((await intentar('192.0.2.5, 203.0.113.7')).status, 400);
  });
});

test('al emitir una cuarta sesión solo se revoca la más antigua de esa cuenta', async () => {
  const otraCuenta = { ...representanteFicticio, id: 42, email: 'otra-cuenta@ejemplo.invalid' };
  const servicio = crearServicioAuth(crearAlmacenCuentas([representanteFicticio, otraCuenta]), new Set());
  const otra = await servicio.iniciarSesion({ ...datosRepresentanteFicticio, email: otraCuenta.email });
  const sesiones = [];
  for (let i = 0; i < 4; i++) sesiones.push(await servicio.iniciarSesion(datosRepresentanteFicticio));
  await assert.rejects(servicio.usuarioDeToken(sesiones[0].token), { status: 401 });
  for (const { token } of sesiones.slice(1)) assert.equal((await servicio.usuarioDeToken(token)).id, representanteFicticio.id);
  assert.equal((await servicio.usuarioDeToken(otra.token)).id, otraCuenta.id);
});

test('el cupo de 256 sesiones conserva las activas y recupera espacio de vencidas al emitir', async t => {
  let ahora = Date.UTC(2026, 0, 1);
  t.mock.method(Date, 'now', () => ahora);
  const cuentas = Array.from({ length: 257 }, (_, i) => ({
    ...representanteFicticio, id: i + 1, email: `cuenta-${i + 1}@ejemplo.invalid`,
  }));
  const servicio = crearServicioAuth(crearAlmacenCuentas(cuentas), new Set());
  const datos = (i: number) => ({ ...datosRepresentanteFicticio, email: cuentas[i].email });
  const primera = await servicio.iniciarSesion(datos(0));
  for (let i = 1; i < 256; i++) await servicio.iniciarSesion(datos(i));
  await assert.rejects(servicio.iniciarSesion(datos(256)), { status: 503 });
  assert.equal((await servicio.usuarioDeToken(primera.token)).id, 1);
  ahora = primera.usuario.expiraEn;
  const posterior = await servicio.iniciarSesion(datos(256));
  assert.equal((await servicio.usuarioDeToken(posterior.token)).id, 257);
  await assert.rejects(servicio.usuarioDeToken(primera.token), { status: 401 });
});

test('una verificación en curso deniega la sesión si se revoca mientras se consulta la cuenta', async () => {
  const cuentas = crearAlmacenCuentas([representanteFicticio]);
  let confirmarCuenta!: (usuario: ReturnType<typeof publico>) => void;
  const pendiente = new Promise<ReturnType<typeof publico>>(resolve => { confirmarCuenta = resolve; });
  const servicio = crearServicioAuth({ ...cuentas, buscarPorId: () => pendiente }, new Set());
  const { token } = await servicio.iniciarSesion(datosRepresentanteFicticio);
  const consulta = servicio.usuarioDeToken(token);
  await servicio.cerrarSesion(token);
  confirmarCuenta(publico(representanteFicticio));
  await assert.rejects(consulta, { status: 401 });
});
