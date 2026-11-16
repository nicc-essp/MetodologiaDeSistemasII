import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createApp } from '../app';
import { crearAlmacenFormularios } from '../data/formularios-guardados';
import type { AlmacenFormularios } from '../data/formularios-guardados';
import { withHttp } from './helpers/http';
import { consultaFicticia } from './helpers/fixtures';

test('HTTP: creación, listado, detalle, extras ignorados y health', async () => {
  await withHttp(createApp({ almacen: crearAlmacenFormularios([]) }), async base => {
    const inicial = await fetch(`${base}/formulario`);
    assert.equal(inicial.status, 200);
    assert.deepEqual(await inicial.json(), []);
    const response = await fetch(`${base}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...consultaFicticia, id: 999, extra: 'ignorado' }),
    });
    assert.equal(response.status, 201);
    const esperado = { id: 1, ...consultaFicticia };
    assert.deepEqual(await response.json(), esperado);
    assert.deepEqual(await (await fetch(`${base}/formulario`)).json(), [esperado]);
    for (const id of ['1', '01', '1.0', '1e0']) {
      const detalle = await fetch(`${base}/formulario/${id}`);
      assert.equal(detalle.status, 200);
      assert.deepEqual(await detalle.json(), esperado);
    }
    for (const id of ['999', 'abc']) {
      const detalle = await fetch(`${base}/formulario/${id}`);
      assert.equal(detalle.status, 404);
      assert.deepEqual(await detalle.json(), { message: 'Formulario no encontrado' });
    }
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });
    const siguiente = await fetch(`${base}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consultaFicticia),
    });
    assert.deepEqual(await siguiente.json(), { id: 2, ...consultaFicticia });
    assert.deepEqual(await (await fetch(`${base}/formulario`)).json(), [esperado, { id: 2, ...consultaFicticia }]);
  });
});

test('HTTP espera el almacenamiento asíncrono en creación, listado y búsqueda', { timeout: 5000 }, async t => {
  const formulario = { id: 7, ...consultaFicticia };
  const llamadas: string[] = [];
  const almacen: AlmacenFormularios = {
    async listar() {
      await setImmediate();
      llamadas.push('listar');
      return [formulario];
    },
    async buscar(id) {
      await setImmediate();
      llamadas.push(`buscar:${id}`);
      return id === 7 ? formulario : undefined;
    },
    async crear(entrada) {
      await setImmediate();
      assert.deepEqual(entrada, consultaFicticia);
      llamadas.push('crear');
      return formulario;
    },
  };
  await withHttp(createApp({ almacen }), async base => {
    for (const caso of [
      { method: 'GET', ruta: '/formulario', status: 200, respuesta: [formulario] },
      { method: 'GET', ruta: '/formulario/7', status: 200, respuesta: formulario },
      { method: 'GET', ruta: '/formulario/999', status: 404, respuesta: { message: 'Formulario no encontrado' } },
      { method: 'POST', ruta: '/formulario', status: 201, respuesta: formulario },
    ]) {
      const response = await fetch(`${base}${caso.ruta}`, {
        method: caso.method, signal: t.signal,
        headers: { 'Content-Type': 'application/json' },
        body: caso.method === 'POST' ? JSON.stringify(consultaFicticia) : undefined,
      });
      assert.equal(response.status, caso.status);
      assert.deepEqual(await response.json(), caso.respuesta);
    }
  });
  assert.deepEqual(llamadas, ['listar', 'buscar:7', 'buscar:999', 'crear']);
});

async function comprobarRechazo(body: string | undefined, status = 400, contentType = 'application/json') {
  const almacen = crearAlmacenFormularios([{ id: 7, ...consultaFicticia }]);
  const antes = await almacen.listar();
  await withHttp(createApp({ almacen }), async base => {
    const response = await fetch(`${base}/formulario`, {
      method: 'POST', headers: { 'Content-Type': contentType }, body,
    });
    assert.equal(response.status, status);
    const error: unknown = await response.json();
    assert.ok(error && typeof error === 'object' && 'message' in error);
    assert.equal(typeof error.message, 'string');
    assert.deepEqual(Object.keys(error), ['message']);
    assert.deepEqual(await almacen.listar(), antes);
    assert.deepEqual(await (await fetch(`${base}/formulario`)).json(), antes);
    const siguiente = await fetch(`${base}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consultaFicticia),
    });
    assert.equal(siguiente.status, 201);
    assert.deepEqual(await siguiente.json(), { id: 8, ...consultaFicticia });
    return error.message;
  });
}

for (const campo of Object.keys(consultaFicticia)) {
  for (const valor of [undefined, '', ' \t\n', null, 0, false, 1, true, {}, [], ['texto']]) {
    test(`HTTP sin efectos: ${campo} con ${JSON.stringify(valor)}`, async () => {
      await comprobarRechazo(JSON.stringify({ ...consultaFicticia, [campo]: valor }));
    });
  }
}

for (const body of [undefined, 'null', '[]', 'true', '1', '"texto"', '{"nombre":', '']) {
  test(`HTTP raíz/JSON inválido ${JSON.stringify(body)}`, async () => {
    await comprobarRechazo(body);
  });
}

for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'application/octet-stream']) {
  test(`HTTP Content-Type incompatible ${contentType}`, async () => {
    await comprobarRechazo(JSON.stringify(consultaFicticia), 400, contentType);
  });
}

for (const email of ['sin-arroba', '@dominio', 'local@', 'a@@b', 'a @b', 'a@b\n']) {
  test(`HTTP correo inválido ${JSON.stringify(email)}`, async () => {
    await comprobarRechazo(JSON.stringify({ ...consultaFicticia, email }));
  });
}

test('HTTP mantiene el mensaje histórico de campo ausente', async () => {
  const almacen = crearAlmacenFormularios([]);
  await withHttp(createApp({ almacen }), async base => {
    const response = await fetch(`${base}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message: 'Faltan campos obligatorios' });
  });
});

test('HTTP rechaza texto mal formado y bytes UTF-8 inválidos antes del almacenamiento', async () => {
  for (const mensaje of ['texto\u0000', '\uD800', '\uDFFF']) {
    await comprobarRechazo(JSON.stringify({ ...consultaFicticia, mensaje }));
  }
  const almacen = crearAlmacenFormularios([]);
  const cuerpo = Buffer.from(JSON.stringify({ ...consultaFicticia, mensaje: 'MARCADOR_UTF8' }));
  cuerpo[cuerpo.indexOf('MARCADOR_UTF8')] = 0xff;
  await withHttp(createApp({ almacen }), async base => {
    const response = await fetch(`${base}/formulario`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: new Uint8Array(cuerpo) });
    assert.equal(response.status, 400);
    assert.deepEqual(await almacen.listar(), []);
  });
});

test('HTTP conserva JSON válido con charset UTF-16LE', async () => {
  await withHttp(createApp({ almacen: crearAlmacenFormularios([]) }), async base => {
    const cuerpo = Buffer.from(JSON.stringify(consultaFicticia), 'utf16le');
    const response = await fetch(`${base}/formulario`, { method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-16le' }, body: new Uint8Array(cuerpo) });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), { id: 1, ...consultaFicticia });
  });
});

test('HTTP límite exacto de 102400 bytes y exceso 413 sin efectos', async () => {
  const longitudBase = Buffer.byteLength(JSON.stringify({ ...consultaFicticia, mensaje: '' }));
  const body = JSON.stringify({ ...consultaFicticia, mensaje: 'a'.repeat(102400 - longitudBase) });
  assert.equal(Buffer.byteLength(body), 102400);
  await withHttp(createApp({ almacen: crearAlmacenFormularios([]) }), async base => {
    const response = await fetch(`${base}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(response.status, 201);
  });
  await comprobarRechazo(JSON.stringify({ ...consultaFicticia, mensaje: 'a'.repeat(102401 - longitudBase) }), 413);
});

test('HTTP conserva 415 del parser y oculta detalles internos en 500', async () => {
  await comprobarRechazo(JSON.stringify(consultaFicticia), 415, 'application/json; charset=inexistente');
  const almacen = crearAlmacenFormularios([]);
  await withHttp(createApp({ almacen: { ...almacen, crear() { throw new Error('detalle interno ficticio'); } } }), async base => {
    const response = await fetch(`${base}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consultaFicticia),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: 'Error interno del servidor' });
    assert.deepEqual(await almacen.listar(), []);
  });
});

for (const [operacion, method, ruta] of [
  ['listar', 'GET', '/formulario'],
  ['buscar', 'GET', '/formulario/1'],
  ['crear', 'POST', '/formulario'],
] as const) {
  test(`HTTP propaga el rechazo asíncrono de ${operacion} sin filtrar detalles`, { timeout: 5000 }, async t => {
    const almacen = crearAlmacenFormularios([]);
    const conFallo: AlmacenFormularios = {
      ...almacen,
      async [operacion]() {
        await setImmediate();
        throw new Error('detalle interno ficticio');
      },
    };
    await withHttp(createApp({ almacen: conFallo }), async base => {
      const response = await fetch(`${base}${ruta}`, {
        method, signal: t.signal,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? JSON.stringify(consultaFicticia) : undefined,
      });
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { message: 'Error interno del servidor' });
      assert.deepEqual(await almacen.listar(), []);
    });
  });
}

test('HTTP CORS: permitidos, denegados, preflight y sin Origin', async () => {
  for (const origen of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
    await withHttp(createApp({ allowedOrigins: [origen] }), async base => {
      const permitido = await fetch(`${base}/formulario`, { headers: { Origin: origen } });
      assert.equal(permitido.status, 200);
      assert.equal(permitido.headers.get('access-control-allow-origin'), origen);
      const preflight = await fetch(`${base}/formulario`, { method: 'OPTIONS', headers: {
        Origin: origen, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
      } });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), origen);
      assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /POST/);
      const denegado = await fetch(`${base}/formulario`, { headers: { Origin: 'https://no-permitido.invalid' } });
      assert.equal(denegado.status, 200);
      assert.equal(denegado.headers.get('access-control-allow-origin'), null);
      const sinOrigen = await fetch(`${base}/formulario`);
      assert.equal(sinOrigen.status, 200);
      assert.equal(sinOrigen.headers.get('access-control-allow-origin'), null);
    });
  }
});
