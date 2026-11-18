import test from 'node:test';
import assert from 'node:assert/strict';
import { crearAlmacenFormularios } from '../data/formularios-guardados';
import { consultaFicticia } from './helpers/fixtures';

test('crear/listar/buscar conserva textos y orden', async () => {
  const almacen = crearAlmacenFormularios([]);
  assert.deepEqual(await almacen.listar(), []);
  const creado = await almacen.crear(consultaFicticia);
  assert.deepEqual(creado, { id: 1, ...consultaFicticia });
  assert.deepEqual(await almacen.buscar(1), creado);
  assert.equal(await almacen.buscar(999), undefined);
  assert.equal(await almacen.buscar(NaN), undefined);
  const segundo = await almacen.crear(consultaFicticia);
  assert.deepEqual(await almacen.listar(), [creado, segundo]);
});

test('máximo ID + 1, seed e independencia', async () => {
  const almacen = crearAlmacenFormularios([{ id: 8, ...consultaFicticia }, { id: 3, ...consultaFicticia }]);
  assert.equal((await almacen.crear(consultaFicticia)).id, 9);
  const inicial = crearAlmacenFormularios();
  assert.equal((await inicial.listar())[0].id, 1);
  assert.equal((await inicial.listar())[0].nombre, 'Pepe');
  await inicial.crear(consultaFicticia);
  assert.equal((await crearAlmacenFormularios().listar()).length, 1);
});

test('copias de entrada/salida protegen el arreglo privado', async () => {
  const entrada = { ...consultaFicticia };
  const seed = { id: 4, ...entrada };
  const almacen = crearAlmacenFormularios([seed]);
  seed.nombre = 'Cambio externo';
  const creado = await almacen.crear(entrada);
  entrada.nombre = 'Otro cambio';
  creado.nombre = 'Cambio en resultado';
  const lista = await almacen.listar();
  lista[0].nombre = 'Cambio en lista';
  lista.pop();
  const encontrado = (await almacen.buscar(4))!;
  encontrado.nombre = 'Cambio en búsqueda';
  assert.deepEqual(await almacen.listar(), [{ id: 4, ...consultaFicticia }, { id: 5, ...consultaFicticia }]);
});

test('creaciones concurrentes en memoria conservan IDs únicos y orden', async () => {
  const almacen = crearAlmacenFormularios([]);
  const creados = await Promise.all([
    almacen.crear(consultaFicticia),
    almacen.crear(consultaFicticia),
    almacen.crear(consultaFicticia),
  ]);
  assert.deepEqual(creados.map(formulario => formulario.id), [1, 2, 3]);
  assert.deepEqual(await almacen.listar(), creados);
});
