import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearIdsRepresentantes, parsearOrigenes, parsearProxiesConfiables, parsearPuerto } from '../config/app.config';

test('PORT usa 3001 local por defecto y acepta puertos decimales válidos', () => {
  assert.equal(parsearPuerto(), 3001);
  for (const puerto of [1, 3001, 10000, 65535]) assert.equal(parsearPuerto(String(puerto)), puerto);
});

test('PORT explícito inválido falla con un mensaje sin el valor de entrada', () => {
  for (const valor of ['', ' ', '0', '-1', '01', '1e4', '3.5', '0x50', '65536', ' 3001 ', 'dato-sintetico']) {
    assert.throws(() => parsearPuerto(valor), { message: 'PORT debe ser un entero decimal entre 1 y 65535.' });
  }
});

test('la confianza del proxy es optativa y permite solo direcciones o CIDR explícitas', () => {
  assert.deepEqual(parsearProxiesConfiables(), []);
  assert.deepEqual(parsearProxiesConfiables('  '), []);
  assert.deepEqual(parsearProxiesConfiables('127.0.0.1, 192.0.2.0/24, 2001:db8::/64, 127.0.0.1'), [
    '127.0.0.1', '192.0.2.0/24', '2001:db8::/64',
  ]);
});

test('la confianza rechaza comodines, saltos, rangos globales y listas mezcladas', () => {
  for (const valor of ['*', 'true', '1', 'uniquelocal', '0.0.0.0/0', '::/0', '192.0.2.1/33',
    '2001:db8::/129', '::ffff:192.0.2.1', '0:0:0:0:0:ffff:c000:201/96', 'fe80::1%eth0',
    '127.0.0.1/32/1', '127.0.0.1,', '127.0.0.1,valor-ficticio']) {
    assert.throws(() => parsearProxiesConfiables(valor), {
      message: 'TRUST_PROXY_CIDRS debe contener direcciones IPv4, IPv6 o CIDR explícitas separadas por comas.',
    });
  }
});

for (const valor of [undefined, '', ' \t\n']) {
  test(`CORS default con ${JSON.stringify(valor)}`, () => {
    assert.deepEqual(parsearOrigenes(valor), ['http://localhost:5173']);
  });
}

test('CORS normaliza orígenes, CSV, barra raíz y duplicados', () => {
  assert.deepEqual(parsearOrigenes(' http://127.0.0.1:5173/ , https://ejemplo.invalid, http://127.0.0.1:5173 '), [
    'http://127.0.0.1:5173', 'https://ejemplo.invalid',
  ]);
});

for (const [valor, esperado] of [
  ['http://localhost:5173', 'http://localhost:5173'],
  [' http://localhost:5173/ ', 'http://localhost:5173'],
  ['http://127.0.0.1:5173/', 'http://127.0.0.1:5173'],
  ['https://ejemplo.invalid', 'https://ejemplo.invalid'],
]) {
  test(`CORS conserva el origen legítimo ${valor}`, () => {
    assert.deepEqual(parsearOrigenes(valor), [esperado]);
  });
}

for (const valor of ['*', 'null', '/.*/', ',http://localhost:5173', 'http://localhost:5173,', ',',
  'http://user:pass@localhost:5173', 'http://localhost/ruta', 'http://localhost/?dato=1',
  'http://localhost/#dato', 'ftp://localhost', 'localhost:5173',
  'http://localhost:5173?', 'http://localhost:5173#',
  'http://127.0.0.1:5173/?', 'http://127.0.0.1:5173/#',
  'https://ejemplo.invalid/?', 'https://ejemplo.invalid/#',
  'http://localhost:5173, http://127.0.0.1:5173?',
  'http://localhost:5173, http://127.0.0.1:5173#']) {
  test(`CORS rechaza configuración explícita inválida ${valor}`, () => {
    assert.throws(() => parsearOrigenes(valor), { message: 'CORS_ORIGINS debe contener orígenes HTTP(S) válidos separados por comas.' });
  });
}

test('el parser no consulta process.env implícitamente', () => {
  const anterior = process.env.CORS_ORIGINS;
  try {
    process.env.CORS_ORIGINS = '*';
    assert.deepEqual(parsearOrigenes(), ['http://localhost:5173']);
  } finally {
    if (anterior === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = anterior;
  }
});

test('una lista ausente, vacía o en blanco habilita cero representantes', () => {
  for (const valor of [undefined, '', ' \t\n']) {
    assert.deepEqual(parsearIdsRepresentantes(valor), new Set());
  }
});

test('la lista admite IDs positivos INTEGER, espacios y duplicados', () => {
  assert.deepEqual(parsearIdsRepresentantes(' 1, 2147483647, 1 '), new Set([1, 2147483647]));
});

test('un valor inválido rechaza la lista completa sin reproducir su contenido', () => {
  for (const valor of ['0', '-1', '+1', '01', '1.0', '1e1', '0x1', '2147483648', '1,',
    ',1', '1,,2', '1 2', '1,valor-ficticio-no-publicable']) {
    assert.throws(() => parsearIdsRepresentantes(valor), {
      message: 'AUTH_REPRESENTANTES_IDS debe contener IDs enteros positivos de PostgreSQL separados por comas.',
    });
  }
});
