import { expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { leerToken } from './services/authService';
import { formularioFicticio, perfilRepresentanteFicticio, respuestaJson } from './test/fixtures';

const apiBase = 'https://api.ejemplo.invalid';
const usuario = { id: 1, nombre: 'Cuenta ficticia', email: 'cuenta@ejemplo.invalid', tipo: 'cliente' };
const perfilCliente = { ...usuario, puedeLeerConsultas: false, expiraEn: Date.now() + 8 * 60 * 60 * 1000 };
const credenciales = { email: usuario.email, password: 'ClaveFicticiaDePrueba' };
const token = 'token-de-sesion-ficticio';

function controlarApi() {
  const api = vi.fn();
  vi.stubEnv('VITE_API_BASE_URL', apiBase);
  vi.stubGlobal('fetch', api);
  return api;
}

function respuestaLogin() {
  return respuestaJson({ token, usuario: perfilCliente });
}

function abrirRuta(ruta) {
  window.history.replaceState({}, '', ruta);
  return render(<App />);
}

async function completarCredenciales(user) {
  await user.type(screen.getByLabelText('Correo electrónico:'), credenciales.email);
  await user.type(screen.getByLabelText('Contraseña:'), credenciales.password);
}

async function ingresar(user) {
  await completarCredenciales(user);
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
}

async function registrar(user) {
  await user.type(screen.getByLabelText('Nombre:'), usuario.nombre);
  await completarCredenciales(user);
  await user.click(screen.getByRole('button', { name: 'Registrarse' }));
}

it('crea una cuenta desde el formulario e inicia sesión con las credenciales ingresadas', async () => {
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaJson(usuario, 201))
    .mockResolvedValueOnce(respuestaLogin());
  const user = userEvent.setup();
  render(<App />);
  await user.click(await screen.findByRole('link', { name: 'Registrarse' }));
  expect(screen.queryByLabelText('Tipo de cuenta:')).not.toBeInTheDocument();
  await registrar(user);

  expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  expect(screen.getByText(usuario.nombre)).toBeInTheDocument();
  expect(window.location.pathname).toBe('/');
  expect(leerToken()).toBe(token);
  expect(api).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenNthCalledWith(1, `${apiBase}/auth/register`, expect.objectContaining({ method: 'POST' }));
  expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({
    nombre: usuario.nombre, ...credenciales,
  });
  expect(api).toHaveBeenNthCalledWith(2, `${apiBase}/auth/login`, expect.objectContaining({ method: 'POST' }));
  expect(JSON.parse(api.mock.calls[1][1].body)).toEqual(credenciales);
});

it('informa el duplicado y conserva la pantalla de registro sin iniciar sesión', async () => {
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaJson({ message: 'El correo electrónico ya está registrado' }, 409));
  abrirRuta('/register');
  await registrar(userEvent.setup());

  expect(await screen.findByRole('alert')).toHaveTextContent('El correo electrónico ya está registrado');
  expect(screen.getByLabelText('Correo electrónico:')).toHaveValue(usuario.email);
  expect(screen.getByRole('button', { name: 'Registrarse' })).toBeEnabled();
  expect(window.location.pathname).toBe('/register');
  expect(api).toHaveBeenCalledExactlyOnceWith(`${apiBase}/auth/register`, expect.objectContaining({ method: 'POST' }));
  expect(leerToken()).toBe('');
});

it('inicia sesión y recupera el perfil del servidor al volver a montar la aplicación', async () => {
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaLogin())
    .mockResolvedValueOnce(respuestaJson(perfilCliente));
  const pantalla = abrirRuta('/login');
  await ingresar(userEvent.setup());

  expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/');
  expect(leerToken()).toBe(token);
  expect(api).toHaveBeenNthCalledWith(1, `${apiBase}/auth/login`, expect.objectContaining({ method: 'POST' }));
  expect(JSON.parse(api.mock.calls[0][1].body)).toEqual(credenciales);

  pantalla.unmount();
  render(<App />);

  expect(await screen.findByText(usuario.nombre)).toBeInTheDocument();
  expect(api).toHaveBeenNthCalledWith(2, `${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
});

it.each([
  [400, 'La contraseña no puede superar los 72 bytes en UTF-8', 'La contraseña no puede superar los 72 bytes en UTF-8'],
  [401, 'Credenciales inválidas', 'Credenciales inválidas'],
  [429, 'Detalle interno ficticio', 'Alcanzaste el límite de solicitudes. Esperá e intentá nuevamente.'],
  [500, 'Detalle interno ficticio', 'No se pudo completar el acceso. Intente nuevamente.'],
])('mantiene el formulario de login operable ante HTTP %i', async (status, message, esperado) => {
  const api = controlarApi().mockResolvedValueOnce(respuestaJson({ message }, status));
  abrirRuta('/login');
  await ingresar(userEvent.setup());

  expect(await screen.findByRole('alert')).toHaveTextContent(esperado);
  expect(screen.queryByText('Detalle interno ficticio')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Correo electrónico:')).toHaveValue(usuario.email);
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(1);
  expect(leerToken()).toBe('');
});

it('descarta el token guardado cuando el servidor rechaza la restauración de la sesión', async () => {
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaLogin())
    .mockResolvedValueOnce(respuestaJson({ message: 'No hay una sesión activa' }, 401));
  const pantalla = abrirRuta('/login');
  await ingresar(userEvent.setup());
  await screen.findByRole('button', { name: 'Cerrar sesión' });
  expect(leerToken()).toBe(token);

  pantalla.unmount();
  render(<App />);

  expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByText(usuario.nombre)).not.toBeInTheDocument();
  expect(api).toHaveBeenNthCalledWith(2, `${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(leerToken()).toBe('');
});

it('envía el token al cerrar sesión y vuelve al estado anónimo después del 204', async () => {
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaLogin())
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  const user = userEvent.setup();
  abrirRuta('/login');
  await ingresar(user);
  expect(leerToken()).toBe(token);
  await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));

  expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(screen.queryByText(usuario.nombre)).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenNthCalledWith(2, `${apiBase}/auth/logout`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  expect(leerToken()).toBe('');
});

it('el acceso directo anónimo a las consultas no hace peticiones de lectura', async () => {
  const api = controlarApi();
  abrirRuta('/consultas');
  expect(await screen.findByRole('alert')).toHaveTextContent('Iniciá sesión para ver las consultas recibidas.');
  expect(screen.queryByRole('link', { name: 'Consultas Recibidas' })).not.toBeInTheDocument();
  expect(api).not.toHaveBeenCalled();
});

it.each([
  ['un cliente', perfilCliente],
  ['un representante sin habilitar', { ...perfilRepresentanteFicticio, puedeLeerConsultas: false }],
  ['un perfil sin permiso declarado', { ...perfilRepresentanteFicticio, puedeLeerConsultas: undefined }],
])('el acceso directo de %s consulta el perfil pero no los formularios', async (_caso, perfil) => {
  sessionStorage.setItem('docker-laws-token', token);
  const api = controlarApi().mockResolvedValueOnce(respuestaJson(perfil));
  abrirRuta('/consultas');
  expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta no tiene permiso para ver las consultas recibidas.');
  expect(screen.queryByRole('link', { name: 'Consultas Recibidas' })).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledExactlyOnceWith(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
});

it('espera la restauración del permiso y retira las consultas al cerrar sesión', async () => {
  sessionStorage.setItem('docker-laws-token', token);
  let resolverPerfil;
  const api = controlarApi()
    .mockImplementationOnce(() => new Promise(resolve => { resolverPerfil = resolve; }))
    .mockResolvedValueOnce(respuestaJson([formularioFicticio]))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  abrirRuta('/consultas');
  expect(screen.getByRole('status')).toHaveTextContent('Comprobando la sesión...');
  expect(api).toHaveBeenCalledTimes(1);
  resolverPerfil(respuestaJson(perfilRepresentanteFicticio));
  expect(await screen.findByText(formularioFicticio.email)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Consultas Recibidas' })).toBeInTheDocument();
  expect(api).toHaveBeenNthCalledWith(2, `${apiBase}/formulario`, { headers: { Authorization: `Bearer ${token}` } });
  await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Iniciá sesión para ver las consultas recibidas.');
  expect(screen.queryByText(formularioFicticio.email)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Consultas Recibidas' })).not.toBeInTheDocument();
});

it.each([
  [401, 'Iniciá sesión para ver las consultas recibidas.', ''],
  [403, 'Tu cuenta no tiene permiso para ver las consultas recibidas.', token],
])('un GET con HTTP %i retira el acceso y descarta el cuerpo de la respuesta', async (status, mensaje, tokenEsperado) => {
  sessionStorage.setItem('docker-laws-token', token);
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaJson(perfilRepresentanteFicticio))
    .mockResolvedValueOnce(respuestaJson([formularioFicticio], status));
  abrirRuta('/consultas');
  expect(await screen.findByRole('alert')).toHaveTextContent(mensaje);
  expect(screen.queryByText(formularioFicticio.email)).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Consultas Recibidas' })).not.toBeInTheDocument();
  expect(leerToken()).toBe(tokenEsperado);
  expect(api).toHaveBeenCalledTimes(2);
});

it('descarta una respuesta de consultas que llega después de cerrar sesión', async () => {
  sessionStorage.setItem('docker-laws-token', token);
  let resolverListado;
  controlarApi()
    .mockResolvedValueOnce(respuestaJson(perfilRepresentanteFicticio))
    .mockImplementationOnce(() => new Promise(resolve => { resolverListado = resolve; }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  abrirRuta('/consultas');
  await screen.findByText('Cargando consultas...');
  await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Iniciá sesión para ver las consultas recibidas.');
  await act(async () => { resolverListado(respuestaJson([formularioFicticio])); });
  expect(screen.queryByText(formularioFicticio.email)).not.toBeInTheDocument();
});

it('cierra la sesión local de inmediato y comunica una revocación sin confirmar', async () => {
  sessionStorage.setItem('docker-laws-token', token);
  let rechazarLogout;
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaJson(perfilRepresentanteFicticio))
    .mockResolvedValueOnce(respuestaJson([formularioFicticio]))
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rechazarLogout = reject; }));
  abrirRuta('/consultas');
  await screen.findByText(formularioFicticio.email);

  await userEvent.setup().click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(leerToken()).toBe('');
  expect(screen.queryByText(formularioFicticio.email)).not.toBeInTheDocument();
  expect(api).toHaveBeenNthCalledWith(3, `${apiBase}/auth/logout`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  await act(async () => { rechazarLogout(new Error('fallo de red ficticio')); });
  expect(screen.getByText('Sesión cerrada en este navegador. No se pudo confirmar su revocación en el servidor.')).toBeInTheDocument();
  expect(screen.queryByText('fallo de red ficticio')).not.toBeInTheDocument();
  expect(leerToken()).toBe('');
});

it('vence una sesión restaurada y retira el perfil, las consultas y el token', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  try {
    sessionStorage.setItem('docker-laws-token', token);
    const perfil = { ...perfilRepresentanteFicticio, expiraEn: Date.now() + 1000 };
    const api = controlarApi()
      .mockResolvedValueOnce(respuestaJson(perfil))
      .mockResolvedValueOnce(respuestaJson([formularioFicticio]));
    await act(async () => { abrirRuta('/consultas'); });
    expect(screen.getByText(formularioFicticio.email)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(999); });
    expect(leerToken()).toBe(token);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByRole('alert')).toHaveTextContent('Iniciá sesión para ver las consultas recibidas.');
    expect(screen.queryByText(formularioFicticio.email)).not.toBeInTheDocument();
    expect(screen.queryByText(perfil.nombre)).not.toBeInTheDocument();
    expect(leerToken()).toBe('');
    expect(api).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
});

it.each([undefined, 1])('descarta un perfil restaurado con vencimiento ausente o inválido (%s)', async expiraEn => {
  sessionStorage.setItem('docker-laws-token', token);
  const api = controlarApi().mockResolvedValueOnce(respuestaJson({ ...perfilRepresentanteFicticio, expiraEn }));
  abrirRuta('/consultas');
  expect(await screen.findByRole('alert')).toHaveTextContent('Iniciá sesión para ver las consultas recibidas.');
  expect(leerToken()).toBe('');
  expect(api).toHaveBeenCalledTimes(1);
});

it('informa que la cuenta ya existe tras un alta exitosa y un fallo de acceso posterior', async () => {
  const api = controlarApi()
    .mockResolvedValueOnce(respuestaJson(usuario, 201))
    .mockRejectedValueOnce(new Error('fallo de red ficticio'));
  abrirRuta('/register');
  await registrar(userEvent.setup());
  expect(await screen.findByRole('status')).toHaveTextContent('La cuenta se creó. Iniciá sesión para continuar.');
  expect(screen.queryByRole('button', { name: 'Registrarse' })).not.toBeInTheDocument();
  expect(api).toHaveBeenCalledTimes(2);
  expect(leerToken()).toBe('');
});
