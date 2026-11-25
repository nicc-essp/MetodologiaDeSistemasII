import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { consultaFicticia, perfilRepresentanteFicticio, respuestaJson } from './test/fixtures';

const token = 'token-de-representante-ficticio';

it('navega, envía y visualiza la misma consulta con red controlada', async () => {
  const guardados = [];
  const api = vi.fn(async (url, options) => {
    if (url.endsWith('/auth/login')) {
      return respuestaJson({ token, usuario: perfilRepresentanteFicticio });
    }
    if (options?.method === 'POST') {
      const creado = { id: 1, ...JSON.parse(options.body) };
      guardados.push(creado);
      return respuestaJson(creado, 201);
    }
    return respuestaJson(guardados);
  });
  vi.stubGlobal('fetch', api);
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('link', { name: 'Consulta Jurídica' }));
  const etiquetas = ['Nombre:', 'Apellido:', 'DNI:', 'Teléfono / Celular:', 'Correo Electrónico:', 'Asunto:', 'Detalle del Caso:'];
  for (const [index, valor] of Object.values(consultaFicticia).entries()) {
    await user.type(screen.getByLabelText(etiquetas[index]), valor);
  }
  await user.click(screen.getByRole('button', { name: 'Enviar Solicitud Formal' }));
  await screen.findByText('La consulta fue enviada correctamente.');
  expect(screen.queryByRole('link', { name: 'Consultas Recibidas' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Iniciar sesión' }));
  await user.type(screen.getByLabelText('Correo electrónico:'), perfilRepresentanteFicticio.email);
  await user.type(screen.getByLabelText('Contraseña:'), 'ClaveFicticia');
  await user.click(screen.getByRole('button', { name: 'Ingresar' }));
  await user.click(await screen.findByRole('link', { name: 'Consultas Recibidas' }));
  await screen.findByRole('heading', { name: 'Persona de prueba Sintética' });
  expect(screen.getByText(consultaFicticia.email)).toBeInTheDocument();
  expect(guardados).toEqual([{ id: 1, ...consultaFicticia }]);
  expect(api.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  expect(api).toHaveBeenLastCalledWith(expect.stringMatching(/\/formulario$/), {
    headers: { Authorization: `Bearer ${token}` },
  });
});

it('el recorrido permanece operable con error de envío y de listado', async () => {
  sessionStorage.setItem('docker-laws-token', token);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respuestaJson(perfilRepresentanteFicticio))
    .mockRejectedValueOnce(new Error('fallo ficticio'))
    .mockResolvedValueOnce(respuestaJson({ message: 'detalle ficticio' }, 500)));
  const user = userEvent.setup();
  window.history.replaceState({}, '', '/consulta-juridica');
  render(<App />);
  const etiquetas = ['Nombre:', 'Apellido:', 'DNI:', 'Teléfono / Celular:', 'Correo Electrónico:', 'Asunto:', 'Detalle del Caso:'];
  for (const [index, valor] of Object.values(consultaFicticia).entries()) {
    await user.type(screen.getByLabelText(etiquetas[index]), valor);
  }
  await user.click(screen.getByRole('button', { name: 'Enviar Solicitud Formal' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo confirmar el envío.');
  expect(screen.getByLabelText('Nombre:')).toHaveValue(consultaFicticia.nombre);
  await user.click(screen.getByRole('link', { name: 'Consultas Recibidas' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las consultas.');
  expect(screen.queryByText('No hay consultas recibidas.')).not.toBeInTheDocument();
});
