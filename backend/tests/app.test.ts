import test from 'node:test';
import assert from 'node:assert/strict';
import { withHttp } from './helpers/http';
import { createApp } from '../app';
import { crearAlmacenFormularios } from '../data/formularios-guardados';
import { consultaFicticia } from './helpers/fixtures';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('el helper responde con un listener sintético y cierra su servidor', async () => {
  let url = '';
  await withHttp((_request, response) => response.end('sintético'), async baseUrl => {
    url = baseUrl;
    assert.equal(await (await fetch(baseUrl)).text(), 'sintético');
  });
  await assert.rejects(fetch(url));
});

test('preparar app no escucha y el helper integra Express/health', async () => {
  const app = createApp();
  await withHttp(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('dos apps y una reconstruida tienen datos independientes', async () => {
  await withHttp(createApp(), async primera => {
    await fetch(`${primera}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consultaFicticia),
    });
    const registrosPrimera = await (await fetch(`${primera}/formulario`)).json();
    assert.ok(Array.isArray(registrosPrimera));
    assert.equal(registrosPrimera.length, 2);
    await withHttp(createApp({ almacen: crearAlmacenFormularios([]) }), async segunda => {
      assert.deepEqual(await (await fetch(`${segunda}/formulario`)).json(), []);
    });
    await withHttp(createApp(), async reconstruida => {
      const registros = await (await fetch(`${reconstruida}/formulario`)).json();
      assert.ok(Array.isArray(registros));
      assert.equal(registros.length, 1);
      assert.equal(registros[0].id, 1);
    });
  });
});

test('importar y preparar app en un proceso hijo termina sin abrir escucha', () => {
  const result = spawnSync(process.execPath, [
    '--import', 'tsx', '--input-type=module', '-e',
    'import { createApp } from "./app.ts"; createApp(); console.log("preparada");',
  ], { cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'preparada');
});
