import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { consultaFicticia, respuestaJson } from './test/fixtures';

it('navega, envía y visualiza la misma consulta con red controlada', async () => {
  const guardados = [];
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    if (options?.method === 'POST') {
      const creado = { id: 1, ...JSON.parse(options.body) };
      guardados.push(creado);
      return respuestaJson(creado, 201);
    }
    return respuestaJson(guardados);
  }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('link', { name: 'Consulta Jurídica' }));
  const etiquetas = ['Nombre:', 'Apellido:', 'DNI:', 'Teléfono / Celular:', 'Correo Electrónico:', 'Asunto:', 'Detalle del Caso:'];
  for (const [index, valor] of Object.values(consultaFicticia).entries()) {
    await user.type(screen.getByLabelText(etiquetas[index]), valor);
  }
  await user.click(screen.getByRole('button', { name: 'Enviar Solicitud Formal' }));
  await screen.findByText('La consulta fue enviada correctamente.');
  await user.click(screen.getByRole('link', { name: 'Consultas Recibidas' }));
  await screen.findByRole('heading', { name: 'Persona de prueba Sintética' });
  expect(screen.getByText(consultaFicticia.email)).toBeInTheDocument();
  expect(guardados).toEqual([{ id: 1, ...consultaFicticia }]);
});

it('el recorrido permanece operable con error de envío y de listado', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('fallo ficticio'))
    .mockResolvedValueOnce(respuestaJson({ message: 'detalle ficticio' }, 500)));
  const user = userEvent.setup();
  window.history.replaceState({}, '', '/consulta-juridica');
  render(<App />);
  const etiquetas = ['Nombre:', 'Apellido:', 'DNI:', 'Teléfono / Celular:', 'Correo Electrónico:', 'Asunto:', 'Detalle del Caso:'];
  for (const [index, valor] of Object.values(consultaFicticia).entries()) {
    await user.type(screen.getByLabelText(etiquetas[index]), valor);
  }
  await user.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo confirmar el envío.');
  expect(screen.getByLabelText('Nombre:')).toHaveValue(consultaFicticia.nombre);
  await user.click(screen.getByRole('link', { name: 'Consultas Recibidas' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las consultas.');
  expect(screen.queryByText('No hay consultas recibidas.')).not.toBeInTheDocument();
});
