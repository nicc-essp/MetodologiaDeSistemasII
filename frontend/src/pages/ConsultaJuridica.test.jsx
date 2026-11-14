import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsultaJuridica } from './ConsultaJuridica';
import { consultaFicticia, formularioFicticio, respuestaJson } from '../test/fixtures';

const etiquetas = ['Nombre:', 'Apellido:', 'DNI:', 'Teléfono / Celular:', 'Correo Electrónico:', 'Asunto:', 'Detalle del Caso:'];
beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

async function completar(user) {
  for (const [index, valor] of Object.values(consultaFicticia).entries()) {
    await user.type(screen.getByLabelText(etiquetas[index]), valor);
  }
}

it('los siete controles tienen nombre accesible, etiqueta activable y orden de teclado', async () => {
  const user = userEvent.setup();
  render(<ConsultaJuridica />);
  expect(screen.getAllByRole('textbox')).toHaveLength(7);
  for (const etiqueta of etiquetas) {
    const control = screen.getByRole('textbox', { name: etiqueta });
    expect(control).toBe(screen.getByLabelText(etiqueta));
    await user.tab();
    expect(control).toHaveFocus();
  }
  await user.tab();
  expect(screen.getByRole('button', { name: 'Enviar Solicitud Formal' })).toHaveFocus();
  await user.click(screen.getByText('Nombre:', { selector: 'label' }));
  expect(screen.getByLabelText('Nombre:')).toHaveFocus();
});

it('mantiene pendiente sin duplicar envíos y limpia solo tras confirmación válida', async () => {
  let resolver;
  fetch.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  const user = userEvent.setup();
  render(<ConsultaJuridica />);
  await completar(user);
  await user.click(screen.getByRole('button', { name: 'Enviar Solicitud Formal' }));
  expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Enviando consulta...');
  expect(screen.queryByText('La consulta fue enviada correctamente.')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Enviando...' }));
  expect(fetch).toHaveBeenCalledTimes(1);
  resolver(respuestaJson(formularioFicticio, 201));
  await screen.findByText('La consulta fue enviada correctamente.');
  for (const etiqueta of etiquetas) expect(screen.getByLabelText(etiqueta)).toHaveValue('');
  expect(screen.getByRole('status')).toHaveTextContent('La consulta fue enviada correctamente.');
});

it('muestra validación segura, conserva campos y permite corregir/reintentar', async () => {
  fetch.mockResolvedValueOnce(respuestaJson({ message: 'Faltan campos obligatorios' }, 400));
  fetch.mockResolvedValueOnce(respuestaJson(formularioFicticio, 201));
  const user = userEvent.setup();
  render(<ConsultaJuridica />);
  await completar(user);
  await user.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Faltan campos obligatorios');
  for (const [index, valor] of Object.values(consultaFicticia).entries()) {
    expect(screen.getByLabelText(etiquetas[index])).toHaveValue(valor);
  }
  expect(screen.getByRole('button')).toBeEnabled();
  await user.clear(screen.getByLabelText('Nombre:'));
  await user.type(screen.getByLabelText('Nombre:'), 'Otra persona ficticia');
  await user.click(screen.getByRole('button'));
  await screen.findByText('La consulta fue enviada correctamente.');
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each(['red', 'servidor', 'protocolo'])('conserva datos y permanece operable ante %s', async modo => {
  if (modo === 'red') fetch.mockRejectedValueOnce(new Error('detalle privado ficticio'));
  if (modo === 'servidor') fetch.mockResolvedValueOnce(respuestaJson({ message: 'detalle privado ficticio' }, 500));
  if (modo === 'protocolo') fetch.mockResolvedValueOnce(respuestaJson({}, 201));
  const user = userEvent.setup();
  render(<ConsultaJuridica />);
  await completar(user);
  await user.click(screen.getByRole('button'));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo confirmar el envío. Intente nuevamente.');
  expect(screen.getByLabelText('Nombre:')).toHaveValue(consultaFicticia.nombre);
  expect(screen.getByRole('button')).toBeEnabled();
  expect(screen.queryByText(/detalle privado ficticio/)).not.toBeInTheDocument();
});
