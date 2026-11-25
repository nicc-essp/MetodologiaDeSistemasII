import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearFormulario, obtenerFormulario, obtenerFormularios, obtenerMensajeError } from './formularioService';
import { consultaFicticia, formularioFicticio, respuestaJson } from '../test/fixtures';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  vi.stubEnv('VITE_API_BASE_URL', '');
});

it('conserva POST/GET/lista/detalle y sus datos', async () => {
  const token = 'token-ficticio';
  sessionStorage.setItem('docker-laws-token', token);
  fetch.mockResolvedValueOnce(respuestaJson(formularioFicticio, 201));
  await expect(crearFormulario(consultaFicticia)).resolves.toEqual(formularioFicticio);
  expect(fetch).toHaveBeenLastCalledWith('http://localhost:3001/formulario', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consultaFicticia),
  });
  fetch.mockResolvedValueOnce(respuestaJson([formularioFicticio]));
  await expect(obtenerFormularios()).resolves.toEqual([formularioFicticio]);
  expect(fetch).toHaveBeenLastCalledWith('http://localhost:3001/formulario', {
    headers: { Authorization: `Bearer ${token}` },
  });
  fetch.mockResolvedValueOnce(respuestaJson(formularioFicticio));
  await expect(obtenerFormulario(1)).resolves.toEqual(formularioFicticio);
  expect(fetch).toHaveBeenLastCalledWith('http://localhost:3001/formulario/1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  fetch.mockResolvedValueOnce(respuestaJson([]));
  await expect(obtenerFormularios()).resolves.toEqual([]);
});

it.each([[401, 'sesion'], [403, 'permiso']])('distingue HTTP %i al consultar un detalle', async (status, categoria) => {
  fetch.mockResolvedValueOnce(respuestaJson({ message: 'detalle interno ficticio' }, status));
  await expect(obtenerFormulario(1)).rejects.toMatchObject({ categoria, message: '' });
});

it('comunica el límite de envíos con un mensaje propio', async () => {
  fetch.mockResolvedValueOnce(respuestaJson({ message: 'detalle interno ficticio' }, 429));
  const error = await crearFormulario(consultaFicticia).catch(error => error);
  expect(obtenerMensajeError(error, 'envio')).toBe('Alcanzaste el límite de envíos. Esperá e intentá nuevamente.');
  expect(fetch).toHaveBeenCalledTimes(1);
});

describe('respuestas incompatibles no son éxito', () => {
  it.each([
    null, {}, [], { ...formularioFicticio, id: 0 }, { ...formularioFicticio, id: '1' },
    ...Object.keys(consultaFicticia).map(campo => ({ ...formularioFicticio, [campo]: 123 })),
  ])('rechaza una forma de formulario inválida: %j', async datos => {
    fetch.mockResolvedValueOnce(respuestaJson(datos, 201));
    await expect(crearFormulario(consultaFicticia)).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each(['<html>detalle interno ficticio</html>', '', '{'])('rechaza un cuerpo no JSON: %s', async body => {
    fetch.mockResolvedValueOnce(new Response(body, { status: 201 }));
    await expect(crearFormulario(consultaFicticia)).rejects.toThrow();
  });

  it.each([{}, null, [null], [formularioFicticio, {}]])('rechaza una colección inválida: %j', async datos => {
    fetch.mockResolvedValueOnce(respuestaJson(datos));
    await expect(obtenerFormularios()).rejects.toThrow();
  });

  it('rechaza un estado satisfactorio distinto del contrato', async () => {
    fetch.mockResolvedValueOnce(respuestaJson(formularioFicticio, 200));
    await expect(crearFormulario(consultaFicticia)).rejects.toThrow();
  });
});

it.each([
  ['Faltan campos obligatorios'], ['El correo electrónico no tiene un formato válido'],
])('conserva el mensaje conocido de validación %s', async message => {
  fetch.mockResolvedValueOnce(respuestaJson({ message }, 400));
  const error = await crearFormulario(consultaFicticia).catch(error => error);
  expect(obtenerMensajeError(error, 'envio')).toBe(message);
});

it.each([undefined, null, 123, {}, '<script>detalle ficticio</script>'])('no muestra message externo %j', async message => {
  fetch.mockResolvedValueOnce(respuestaJson({ message }, 400));
  const error = await crearFormulario(consultaFicticia).catch(error => error);
  expect(obtenerMensajeError(error, 'envio')).toBe('Revise los datos de la consulta e intente nuevamente.');
});

it('5xx/red/errores arbitrarios son seguros y no generan reintentos', async () => {
  fetch.mockResolvedValueOnce(respuestaJson({ message: 'Faltan campos obligatorios' }, 500));
  const servidor = await crearFormulario(consultaFicticia).catch(error => error);
  expect(obtenerMensajeError(servidor, 'envio')).toBe('No se pudo confirmar el envío. Intente nuevamente.');
  fetch.mockRejectedValueOnce(new Error('detalle interno ficticio'));
  const red = await obtenerFormularios().catch(error => error);
  expect(obtenerMensajeError(red, 'listado')).toBe('No se pudieron cargar las consultas. Intente nuevamente.');
  expect(obtenerMensajeError(new Error('Faltan campos obligatorios'), 'envio')).not.toBe('Faltan campos obligatorios');
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each([
  [undefined, 'http://localhost:3001'], ['', 'http://localhost:3001'], ['  ', 'http://localhost:3001'],
  ['http://127.0.0.1:3001', 'http://127.0.0.1:3001'],
  ['https://ejemplo.invalid/api///', 'https://ejemplo.invalid/api'],
])('las tres operaciones usan la base configurada %j', async (valor, base) => {
  vi.stubEnv('VITE_API_BASE_URL', valor);
  fetch.mockResolvedValueOnce(respuestaJson(formularioFicticio, 201));
  await crearFormulario(consultaFicticia);
  expect(fetch.mock.lastCall[0]).toBe(`${base}/formulario`);
  fetch.mockResolvedValueOnce(respuestaJson([]));
  await obtenerFormularios();
  expect(fetch.mock.lastCall[0]).toBe(`${base}/formulario`);
  fetch.mockResolvedValueOnce(respuestaJson(formularioFicticio));
  await obtenerFormulario(1);
  expect(fetch.mock.lastCall[0]).toBe(`${base}/formulario/1`);
});

it('configuración inválida no rompe imports ni hace peticiones/fallback', async () => {
  vi.stubEnv('VITE_API_BASE_URL', 'destino inválido');
  const modulo = await import('./formularioService');
  for (const operar of [() => modulo.crearFormulario(consultaFicticia), modulo.obtenerFormularios, () => modulo.obtenerFormulario(1)]) {
    const error = await operar().catch(error => error);
    expect(obtenerMensajeError(error, 'envio')).toBe('La conexión con el servidor no está configurada correctamente.');
  }
  expect(fetch).not.toHaveBeenCalled();
});
