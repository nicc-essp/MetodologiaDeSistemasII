import test from 'node:test';
import assert from 'node:assert/strict';
import { parsearIdsRepresentantes, parsearOrigenes } from '../config/app.config';

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
