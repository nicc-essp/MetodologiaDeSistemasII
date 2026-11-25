import test from 'node:test';
import assert from 'node:assert/strict';
import { compare } from 'bcryptjs';
import { createApp } from '../app';
import { crearAlmacenCuentas } from '../data/cuentas-guardadas';
import { withHttp } from './helpers/http';

const registro = {
  nombre: 'Cuenta ficticia',
  email: 'cuenta@ejemplo.invalid',
  password: 'Ficticia',
  tipo: 'cliente',
};
const credenciales = { email: registro.email, password: registro.password };
const usuarioPublico = { id: 1, nombre: registro.nombre, email: registro.email, tipo: 'cliente' };

function solicitar(base: string, ruta: string, { method = 'GET', datos, token }: {
  method?: 'GET' | 'POST';
  datos?: unknown;
  token?: string;
} = {}) {
  const headers = new Headers();
  if (datos !== undefined) headers.set('Content-Type', 'application/json');
  if (token !== undefined) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${base}/auth${ruta}`, {
    method, headers, body: datos === undefined ? undefined : JSON.stringify(datos),
    signal: AbortSignal.timeout(5000),
  });
}

async function comprobarRespuesta(respuesta: Response, status: number, cuerpo: unknown) {
  assert.equal(respuesta.status, status);
  assert.deepEqual(await respuesta.json(), cuerpo);
}

async function registrarCuenta(base: string, datos = registro) {
  await comprobarRespuesta(await solicitar(base, '/register', { method: 'POST', datos }), 201, usuarioPublico);
}

async function iniciarSesion(base: string) {
  const respuesta = await solicitar(base, '/login', { method: 'POST', datos: credenciales });
  assert.equal(respuesta.status, 200);
  const sesion: unknown = await respuesta.json();
  assert.ok(sesion && typeof sesion === 'object' && 'token' in sesion);
  assert.ok(typeof sesion.token === 'string' && sesion.token.length > 0);
  assert.deepEqual(sesion, { token: sesion.token, usuario: usuarioPublico });
  return sesion.token;
}

test('registro HTTP guarda un hash verificable y responde únicamente con el perfil público', async () => {
  const cuentas = crearAlmacenCuentas();
  await withHttp(createApp({ cuentas }), base => registrarCuenta(base, {
    ...registro, nombre: `  ${registro.nombre}  `, email: ` ${registro.email} `,
  }));

  const guardado = await cuentas.buscarPorEmail(registro.email);
  assert.ok(guardado);
  assert.notEqual(guardado.password_hash, registro.password);
  assert.ok(await compare(registro.password, guardado.password_hash));
});

for (const [caso, datos, message] of [
  ['cuerpo que no es un objeto', [], 'El cuerpo debe ser un objeto JSON'],
  ['campo obligatorio ausente', { ...registro, nombre: undefined }, 'Faltan campos obligatorios'],
  ['correo mal formado', { ...registro, email: 'sin-arroba' }, 'El correo electrónico no tiene un formato válido'],
  ['tipo desconocido', { ...registro, tipo: 'desconocido' }, 'El tipo de cuenta no es válido'],
  ['texto con un carácter NUL', { ...registro, nombre: 'Prueba\u0000' }, 'Los campos de la cuenta contienen caracteres no válidos'],
  ['contraseña en blanco', { ...registro, password: '        ' }, 'Faltan campos obligatorios'],
  ['contraseña que no es texto', { ...registro, password: 12345678 }, 'Los campos de la cuenta deben ser texto'],
  ['contraseña de siete caracteres', { ...registro, password: 'abcdefg' }, 'La contraseña debe tener al menos 8 caracteres'],
] as const) {
  test(`registro HTTP rechaza ${caso} sin guardar una cuenta`, async t => {
    const almacen = crearAlmacenCuentas();
    const crear = t.mock.fn(almacen.crear);
    await withHttp(createApp({ cuentas: { ...almacen, crear } }), async base => {
      const respuesta = await solicitar(base, '/register', { method: 'POST', datos });
      await comprobarRespuesta(respuesta, 400, { message });
    });
    assert.equal(crear.mock.callCount(), 0);
  });
}

test('registro HTTP devuelve 409 por un correo duplicado y preserva la cuenta original', async () => {
  const cuentas = crearAlmacenCuentas();
  await withHttp(createApp({ cuentas }), async base => {
    await registrarCuenta(base);
    const original = await cuentas.buscarPorEmail(registro.email);
    assert.ok(original);
    const respuesta = await solicitar(base, '/register', {
      method: 'POST', datos: { ...registro, nombre: 'Otra cuenta ficticia', password: 'OtraClaveFicticia' },
    });
    await comprobarRespuesta(respuesta, 409, { message: 'El correo electrónico ya está registrado' });
    assert.deepEqual(await cuentas.buscarPorEmail(registro.email), original);
  });
});

test('credenciales correctas permiten consultar el perfil sin exponer hash ni contraseña', async () => {
  await withHttp(createApp(), async base => {
    await registrarCuenta(base);
    const token = await iniciarSesion(base);
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, usuarioPublico);
  });
});

for (const [caso, datos] of [
  ['correo desconocido', { ...credenciales, email: 'otra@ejemplo.invalid' }],
  ['contraseña incorrecta', { ...credenciales, password: 'OtraClaveFicticia' }],
] as const) {
  test(`login HTTP rechaza ${caso} con el mismo error y sin emitir token`, async () => {
    await withHttp(createApp(), async base => {
      await registrarCuenta(base);
      const respuesta = await solicitar(base, '/login', { method: 'POST', datos });
      await comprobarRespuesta(respuesta, 401, { message: 'Credenciales inválidas' });
    });
  });
}

for (const [caso, password, message] of [
  ['contraseña ausente', undefined, 'Faltan campos obligatorios'],
  ['contraseña de tipo inválido', 42, 'Los campos de la cuenta deben ser texto'],
] as const) {
  test(`login HTTP rechaza ${caso} antes de consultar el almacén`, async t => {
    const almacen = crearAlmacenCuentas();
    const buscarPorEmail = t.mock.fn(almacen.buscarPorEmail);
    await withHttp(createApp({ cuentas: { ...almacen, buscarPorEmail } }), async base => {
      const respuesta = await solicitar(base, '/login', {
        method: 'POST', datos: { ...credenciales, password },
      });
      await comprobarRespuesta(respuesta, 400, { message });
    });
    assert.equal(buscarPorEmail.mock.callCount(), 0);
  });
}

const sinSesion = { message: 'No hay una sesión activa' };

for (const [caso, opciones] of [
  ['token ausente', {}],
  ['token desconocido', { token: 'token-ficticio-sin-sesion' }],
] as const) {
  test(`perfil HTTP deniega el acceso con ${caso}`, async () => {
    await withHttp(createApp(), async base => {
      await comprobarRespuesta(await solicitar(base, '/me', opciones), 401, sinSesion);
    });
  });
}

test('el token es válido justo antes de su vencimiento y se rechaza al alcanzarlo', async t => {
  await withHttp(createApp(), async base => {
    await registrarCuenta(base);
    const inicio = Date.UTC(2026, 0, 1);
    const vencimiento = inicio + 8 * 60 * 60 * 1000;
    let ahora = inicio;
    t.mock.method(Date, 'now', () => ahora);
    const token = await iniciarSesion(base);

    ahora = vencimiento - 1;
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, usuarioPublico);

    ahora = vencimiento;
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 401, sinSesion);
  });
});

test('logout responde 204 y el token deja de servir para consultar el perfil', async () => {
  await withHttp(createApp(), async base => {
    await registrarCuenta(base);
    const token = await iniciarSesion(base);
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, usuarioPublico);

    const logout = await solicitar(base, '/logout', { method: 'POST', token });
    assert.equal(logout.status, 204);
    assert.equal(await logout.text(), '');
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 401, sinSesion);
  });
});

function falloPersistencia(): never {
  throw Object.assign(new Error('Detalle interno sintético del almacén'), { status: 400 });
}

const errorSeguro = { message: 'Error interno del servidor' };

test('registro HTTP responde 500 seguro cuando falla la escritura de la cuenta', async () => {
  const cuentas = { ...crearAlmacenCuentas(), crear: async () => falloPersistencia() };
  await withHttp(createApp({ cuentas }), async base => {
    const respuesta = await solicitar(base, '/register', { method: 'POST', datos: registro });
    await comprobarRespuesta(respuesta, 500, errorSeguro);
  });
});

test('login HTTP responde 500 seguro cuando falla la búsqueda por correo', async () => {
  const cuentas = { ...crearAlmacenCuentas(), buscarPorEmail: async () => falloPersistencia() };
  await withHttp(createApp({ cuentas }), async base => {
    const respuesta = await solicitar(base, '/login', { method: 'POST', datos: credenciales });
    await comprobarRespuesta(respuesta, 500, errorSeguro);
  });
});

test('perfil HTTP responde 500 seguro si falla la lectura de una cuenta con sesión válida', async () => {
  const cuentas = { ...crearAlmacenCuentas(), buscarPorId: async () => falloPersistencia() };
  await withHttp(createApp({ cuentas }), async base => {
    await registrarCuenta(base);
    const token = await iniciarSesion(base);
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 500, errorSeguro);
  });
});
