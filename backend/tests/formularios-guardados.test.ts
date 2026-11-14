import test from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacenFormularios } from '../data/formularios-guardados';
import { consultaFicticia } from './helpers/fixtures';

test('crear/listar/buscar conserva textos y orden', () => {
  const almacen = crearAlmacenFormularios([]);
  assert.deepEqual(almacen.listar(), []);
  const creado = almacen.crear(consultaFicticia);
  assert.deepEqual(creado, { id: 1, ...consultaFicticia });
  assert.deepEqual(almacen.buscar(1), creado);
  assert.equal(almacen.buscar(999), undefined);
  assert.equal(almacen.buscar(NaN), undefined);
  const segundo = almacen.crear(consultaFicticia);
  assert.deepEqual(almacen.listar(), [creado, segundo]);
});

test('máximo ID + 1, seed e independencia', () => {
  const almacen = crearAlmacenFormularios([{ id: 8, ...consultaFicticia }, { id: 3, ...consultaFicticia }]);
  assert.equal(almacen.crear(consultaFicticia).id, 9);
  const inicial = crearAlmacenFormularios();
  assert.equal(inicial.listar()[0].id, 1);
  assert.equal(inicial.listar()[0].nombre, 'Pepe');
  inicial.crear(consultaFicticia);
  assert.equal(crearAlmacenFormularios().listar().length, 1);
});

test('copias de entrada/salida protegen el arreglo privado', () => {
  const entrada = { ...consultaFicticia };
  const seed = { id: 4, ...entrada };
  const almacen = crearAlmacenFormularios([seed]);
  seed.nombre = 'Cambio externo';
  const creado = almacen.crear(entrada);
  entrada.nombre = 'Otro cambio';
  creado.nombre = 'Cambio en resultado';
  const lista = almacen.listar();
  lista[0].nombre = 'Cambio en lista';
  lista.pop();
  const encontrado = almacen.buscar(4)!;
  encontrado.nombre = 'Cambio en búsqueda';
  assert.deepEqual(almacen.listar(), [{ id: 4, ...consultaFicticia }, { id: 5, ...consultaFicticia }]);
});
