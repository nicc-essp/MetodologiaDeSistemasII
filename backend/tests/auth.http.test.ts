import test from 'node:test';
import assert from 'node:assert/strict';
import { compare } from 'bcryptjs';
import { createApp } from '../app';
import { parsearIdsRepresentantes } from '../config/app.config';
import { crearAlmacenCuentas } from '../data/cuentas-guardadas';
import { crearAlmacenFormularios } from '../data/formularios-guardados';
import { withHttp } from './helpers/http';
import { consultaFicticia } from './helpers/fixtures';
import { encabezadosBearer, iniciarSesionFicticia, representanteEnMemoria, representanteFicticio } from './helpers/auth';

const registro = {
  nombre: 'Cuenta ficticia',
  email: 'cuenta@ejemplo.invalid',
  password: 'Ficticia',
  tipo: 'cliente',
};
const credenciales = { email: registro.email, password: registro.password };
const usuarioPublico = { id: 1, nombre: registro.nombre, email: registro.email, tipo: 'cliente' };
const perfilCliente = { ...usuarioPublico, puedeLeerConsultas: false };

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
  assert.deepEqual(sesion, { token: sesion.token, usuario: perfilCliente });
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
  ['intento de registrarse como representante', { ...registro, tipo: 'representante' }, 'El tipo de cuenta no es válido'],
  ['tipo explícito nulo', { ...registro, tipo: null }, 'El tipo de cuenta no es válido'],
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
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, perfilCliente);
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
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, perfilCliente);

    ahora = vencimiento;
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 401, sinSesion);
  });
});

test('logout responde 204 y el token deja de servir para consultar el perfil', async () => {
  await withHttp(createApp(), async base => {
    await registrarCuenta(base);
    const token = await iniciarSesion(base);
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, perfilCliente);

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

const sinPermiso = { message: 'No tiene permiso para consultar los formularios' };

async function comprobarLecturasDenegadas(base: string, status: 401 | 403, headers?: Record<string, string>) {
  for (const ruta of ['/formulario', '/formulario/1', '/formulario/999', '/formulario/invalido']) {
    const respuesta = await fetch(`${base}${ruta}`, { headers });
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
    await comprobarRespuesta(respuesta, status, status === 401 ? sinSesion : sinPermiso);
  }
}

test('ni una sesión ausente ni un token desconocido consultan el almacenamiento', async t => {
  const store = crearAlmacenFormularios([{ id: 1, ...consultaFicticia }]);
  const listar = t.mock.fn(store.listar);
  const buscar = t.mock.fn(store.buscar);
  await withHttp(createApp({ ...representanteEnMemoria(), almacen: { ...store, listar, buscar } }), async base => {
    await comprobarLecturasDenegadas(base, 401);
    await comprobarLecturasDenegadas(base, 401, { Origin: 'http://localhost:5173' });
    await comprobarLecturasDenegadas(base, 401, encabezadosBearer('token-ficticio-desconocido'));
  });
  assert.equal(listar.mock.callCount(), 0);
  assert.equal(buscar.mock.callCount(), 0);
});

test('dos clientes reciben 403 aunque un ID coincida con la lista o el correo con la consulta', async t => {
  const datos = { nombre: registro.nombre, email: consultaFicticia.email, password: registro.password };
  const store = crearAlmacenFormularios([{ id: 1, ...consultaFicticia }]);
  const listar = t.mock.fn(store.listar);
  const buscar = t.mock.fn(store.buscar);
  const app = createApp({ almacen: { ...store, listar, buscar }, representantesHabilitados: new Set([1]) });
  await withHttp(app, async base => {
    await registrarCuenta(base);
    const otro = await solicitar(base, '/register', { method: 'POST', datos });
    await comprobarRespuesta(otro, 201, { id: 2, nombre: datos.nombre, email: datos.email, tipo: 'cliente' });
    const primera = await iniciarSesion(base);
    const segunda = await iniciarSesionFicticia(base, datos);
    assert.equal(segunda.usuario.puedeLeerConsultas, false);
    await comprobarLecturasDenegadas(base, 403, encabezadosBearer(primera));
    await comprobarLecturasDenegadas(base, 403, encabezadosBearer(segunda.token));
  });
  assert.equal(listar.mock.callCount(), 0);
  assert.equal(buscar.mock.callCount(), 0);
});

for (const [situacion, representantesHabilitados] of [
  ['ausente', undefined],
  ['vacía', parsearIdsRepresentantes('')],
  ['sin su ID', parsearIdsRepresentantes('42')],
] as const) {
  test(`representante de la etapa de alta pública recibe 403 con la lista ${situacion}`, async t => {
    const cuentas = crearAlmacenCuentas([representanteFicticio]);
    const store = crearAlmacenFormularios([{ id: 1, ...consultaFicticia }]);
    const listar = t.mock.fn(store.listar);
    const buscar = t.mock.fn(store.buscar);
    await withHttp(createApp({ cuentas, representantesHabilitados, almacen: { ...store, listar, buscar } }), async base => {
      const { token, usuario } = await iniciarSesionFicticia(base);
      assert.equal(usuario.tipo, 'representante');
      assert.equal(usuario.puedeLeerConsultas, false);
      await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, usuario);
      await comprobarLecturasDenegadas(base, 403, encabezadosBearer(token));
    });
    assert.equal(listar.mock.callCount(), 0);
    assert.equal(buscar.mock.callCount(), 0);
  });
}

test('el representante habilitado recibe permiso en login y perfil y puede leer la colección', async () => {
  const fixture = { id: 1, ...consultaFicticia };
  const almacen = crearAlmacenFormularios([fixture]);
  await withHttp(createApp({ ...representanteEnMemoria(), almacen }), async base => {
    const { token, usuario } = await iniciarSesionFicticia(base);
    assert.deepEqual(usuario, {
      id: representanteFicticio.id,
      nombre: representanteFicticio.nombre,
      email: representanteFicticio.email,
      tipo: 'representante',
      puedeLeerConsultas: true,
    });
    await comprobarRespuesta(await solicitar(base, '/me', { token }), 200, usuario);
    const headers = encabezadosBearer(token);
    const listado = await fetch(`${base}/formulario`, { headers });
    assert.equal(listado.headers.get('cache-control'), 'no-store');
    await comprobarRespuesta(listado, 200, [fixture]);
    const detalle = await fetch(`${base}/formulario/1`, { headers });
    assert.equal(detalle.headers.get('cache-control'), 'no-store');
    await comprobarRespuesta(detalle, 200, fixture);
    await comprobarRespuesta(await fetch(`${base}/formulario/999`, { headers }), 404, { message: 'Formulario no encontrado' });
  });
});

test('un token de representante habilitado no permite lecturas después de vencer o cerrar sesión', async t => {
  const inicio = Date.UTC(2026, 0, 1);
  let ahora = inicio;
  t.mock.method(Date, 'now', () => ahora);
  await withHttp(createApp(representanteEnMemoria()), async base => {
    const vencida = await iniciarSesionFicticia(base);
    ahora = inicio + 8 * 60 * 60 * 1000;
    await comprobarLecturasDenegadas(base, 401, encabezadosBearer(vencida.token));
    const revocada = await iniciarSesionFicticia(base);
    const logout = await solicitar(base, '/logout', { method: 'POST', token: revocada.token });
    assert.equal(logout.status, 204);
    await comprobarLecturasDenegadas(base, 401, encabezadosBearer(revocada.token));
  });
});

test('una falla al verificar la sesión de lectura devuelve 500 seguro', async () => {
  const opciones = representanteEnMemoria();
  const cuentas = { ...opciones.cuentas, buscarPorId: async () => falloPersistencia() };
  await withHttp(createApp({ ...opciones, cuentas }), async base => {
    const { token } = await iniciarSesionFicticia(base);
    const headers = encabezadosBearer(token);
    await comprobarRespuesta(await fetch(`${base}/formulario`, { headers }), 500, errorSeguro);
    await comprobarRespuesta(await fetch(`${base}/formulario/1`, { headers }), 500, errorSeguro);
  });
});
