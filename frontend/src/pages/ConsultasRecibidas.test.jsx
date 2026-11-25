import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConsultasRecibidas } from './ConsultasRecibidas';
import { AuthContext } from '../context/useAuth';
import { formularioFicticio, perfilRepresentanteFicticio, respuestaJson } from '../test/fixtures';

beforeEach(() => vi.stubGlobal('fetch', vi.fn()));

function renderListado() {
  return render(
    <AuthContext.Provider value={{ usuario: perfilRepresentanteFicticio, cargando: false, rechazarLectura: vi.fn() }}>
      <ConsultasRecibidas />
    </AuthContext.Provider>,
  );
}

it('distingue carga, colección disponible y muestra los datos', async () => {
  let resolver;
  fetch.mockImplementationOnce(() => new Promise(resolve => { resolver = resolve; }));
  renderListado();
  expect(screen.getByRole('status')).toHaveTextContent('Cargando consultas...');
  expect(screen.queryByText('No hay consultas recibidas.')).not.toBeInTheDocument();
  resolver(respuestaJson([formularioFicticio]));
  await screen.findByRole('heading', { name: 'Persona de prueba Sintética' });
  expect(screen.getByRole('status')).toHaveTextContent('Consultas cargadas.');
  expect(screen.getByText(formularioFicticio.email)).toBeInTheDocument();
});

it('distingue colección vacía de error', async () => {
  fetch.mockResolvedValueOnce(respuestaJson([]));
  renderListado();
  expect(await screen.findByText('No hay consultas recibidas.')).toHaveAttribute('role', 'status');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it.each(['red', 'servidor', 'forma', 'html'])('un fallo %s no se presenta como vacío', async modo => {
  if (modo === 'red') fetch.mockRejectedValueOnce(new Error('detalle interno ficticio'));
  if (modo === 'servidor') fetch.mockResolvedValueOnce(respuestaJson({ message: 'detalle interno ficticio' }, 500));
  if (modo === 'forma') fetch.mockResolvedValueOnce(respuestaJson([{}]));
  if (modo === 'html') fetch.mockResolvedValueOnce(new Response('<html>detalle interno ficticio</html>'));
  renderListado();
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las consultas. Intente nuevamente.');
  expect(screen.queryByText('No hay consultas recibidas.')).not.toBeInTheDocument();
  expect(screen.queryByText(/detalle interno ficticio/)).not.toBeInTheDocument();
});
