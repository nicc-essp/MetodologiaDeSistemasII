import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { leerToken } from './services/authService';
import { respuestaJson } from './test/fixtures';

const apiBase = 'https://api.ejemplo.invalid';
const usuario = { id: 1, nombre: 'Cuenta ficticia', email: 'cuenta@ejemplo.invalid', tipo: 'cliente' };
const credenciales = { email: usuario.email, password: 'ClaveFicticiaDePrueba' };
const token = 'token-de-sesion-ficticio';

function controlarApi() {
  const api = vi.fn();
  vi.stubEnv('VITE_API_BASE_URL', apiBase);
  vi.stubGlobal('fetch', api);
  return api;
}

function respuestaLogin() {
  return respuestaJson({ token, usuario });
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
  await registrar(user);

  expect(await screen.findByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  expect(screen.getByText(usuario.nombre)).toBeInTheDocument();
  expect(window.location.pathname).toBe('/');
  expect(leerToken()).toBe(token);
  expect(api).toHaveBeenCalledTimes(2);
  expect(api).toHaveBeenNthCalledWith(1, `${apiBase}/auth/register`, expect.objectContaining({ method: 'POST' }));
  expect(JSON.parse(api.mock.calls[0][1].body)).toEqual({
    nombre: usuario.nombre, ...credenciales, tipo: 'cliente',
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
    .mockResolvedValueOnce(respuestaJson(usuario));
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
  [401, 'Credenciales inválidas', 'Credenciales inválidas'],
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
