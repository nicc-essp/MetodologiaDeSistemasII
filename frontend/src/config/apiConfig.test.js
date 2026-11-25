import { beforeEach, expect, it, vi } from 'vitest';
import { obtenerBaseApi } from './apiConfig';
import configurarVite from '../../vite.config.js';

beforeEach(() => vi.stubEnv('VITE_API_BASE_URL', ''));

it.each([undefined, '', ' \t\n'])('usa default con %j', valor => {
  expect(obtenerBaseApi(valor)).toBe('http://localhost:3001');
});

it.each([
  ['http://127.0.0.1:3001', 'http://127.0.0.1:3001'],
  [' https://ejemplo.invalid/api/// ', 'https://ejemplo.invalid/api'],
  ['http://localhost:3001/', 'http://localhost:3001'],
])('conserva base/prefijo y normaliza barras: %s', (valor, esperado) => {
  expect(obtenerBaseApi(valor)).toBe(esperado);
});

it.each(['localhost:3001', '/api', 'ftp://ejemplo.invalid', 'https://user:pass@ejemplo.invalid',
  'https://ejemplo.invalid?dato=1', 'https://ejemplo.invalid#dato', 'https://ejemplo.invalid?',
  'https://ejemplo.invalid#', null, 1])('rechaza base explícita inválida %j', valor => {
  expect(() => obtenerBaseApi(valor)).toThrow('La conexión con el servidor no está configurada correctamente.');
});

it('lee la configuración al operar, sin estado importado permanente', () => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:3001/api');
  expect(obtenerBaseApi()).toBe('http://127.0.0.1:3001/api');
  vi.stubEnv('VITE_API_BASE_URL', 'valor inválido');
  expect(() => obtenerBaseApi()).toThrow();
});

it.each(['https://api.ejemplo.invalid', ' https://api.ejemplo.invalid/ '])(
  'el build de Vercel acepta un origen HTTPS explícito (%j)',
  valor => {
    vi.stubEnv('VITE_API_BASE_URL', valor);
    expect(() => configurarVite({ command: 'build', mode: 'vercel' })).not.toThrow();
  },
);

it.each(['', ' ', 'http://api.ejemplo.invalid', 'https://localhost', 'https://api.localhost.',
  'https://api.local', 'https://127.1', 'https://[::1]', 'https://192.0.2.1',
  'https:api.ejemplo.invalid', 'https://api.ejemplo.invalid/api', 'https://api.ejemplo.invalid?',
  'https://api.ejemplo.invalid#', 'https://usuario:marcador-ficticio@api.ejemplo.invalid'])(
  'el build de Vercel rechaza una base no apta (%j) con un error sin su valor',
  valor => {
    vi.stubEnv('VITE_API_BASE_URL', valor);
    expect(() => configurarVite({ command: 'build', mode: 'vercel' })).toThrow(
      'VITE_API_BASE_URL debe ser el origen HTTPS de la API en Vercel, con nombre DNS y sin credenciales, rutas, consulta ni fragmento.',
    );
  },
);

it('el build local sigue admitiendo el destino predeterminado', () => {
  expect(() => configurarVite({ command: 'build', mode: 'production' })).not.toThrow();
  expect(obtenerBaseApi()).toBe('http://localhost:3001');
});
