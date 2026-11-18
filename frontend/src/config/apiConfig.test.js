import { beforeEach, expect, it, vi } from 'vitest';
import { obtenerBaseApi } from './apiConfig';

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
