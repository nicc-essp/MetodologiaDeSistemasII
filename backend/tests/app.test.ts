import test from 'node:test';
import assert from 'node:assert/strict';
import { withHttp } from './helpers/http';
import { createApp } from '../app';
import { crearAlmacenFormularios } from '../data/formularios-guardados';
import { consultaFicticia } from './helpers/fixtures';
import { autenticarRepresentante, representanteEnMemoria } from './helpers/auth';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { iniciarServidor } from '../index';

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
  await withHttp(createApp(representanteEnMemoria()), async primera => {
    const primeraSesion = await autenticarRepresentante(primera);
    await fetch(`${primera}/formulario`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(consultaFicticia),
    });
    const registrosPrimera = await (await fetch(`${primera}/formulario`, { headers: primeraSesion })).json();
    assert.ok(Array.isArray(registrosPrimera));
    assert.equal(registrosPrimera.length, 2);
    await withHttp(createApp({ ...representanteEnMemoria(), almacen: crearAlmacenFormularios([]) }), async segunda => {
      assert.equal((await fetch(`${segunda}/formulario`, { headers: primeraSesion })).status, 401);
      const segundaSesion = await autenticarRepresentante(segunda);
      assert.deepEqual(await (await fetch(`${segunda}/formulario`, { headers: segundaSesion })).json(), []);
    });
    await withHttp(createApp(representanteEnMemoria()), async reconstruida => {
      const sesion = await autenticarRepresentante(reconstruida);
      const registros = await (await fetch(`${reconstruida}/formulario`, { headers: sesion })).json();
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

test('importar el arranque no abre HTTP ni conecta a PostgreSQL', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    'import "./index.ts"; console.log("importado");'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'importado');
});

test('arranque inválido falla antes de abrir conexiones y no recurre a memoria', async () => {
  await assert.rejects(iniciarServidor({ env: { POSTGRES_PORT: '0' }, puerto: 0 }), /validar la configuración/);
});

test('un ID inválido impide el arranque antes de leer la configuración PostgreSQL', async () => {
  let leyóDestino = false;
  const env = {
    AUTH_REPRESENTANTES_IDS: '41,valor-ficticio-no-publicable',
    get POSTGRES_TARGET() {
      leyóDestino = true;
      return 'local';
    },
  };
  await assert.rejects(iniciarServidor({ env, puerto: 0 }), {
    message: 'No se pudo iniciar el backend al validar la configuración CORS, PostgreSQL y AUTH_REPRESENTANTES_IDS. No se habilitó almacenamiento en memoria.',
  });
  assert.equal(leyóDestino, false);
});

test('el comando privado rechaza destinos Supabase antes de leer el archivo de cuenta', () => {
  const resultado = spawnSync(process.execPath, [
    '--import', 'tsx', 'scripts/crear-representante.ts', 'ruta-sintetica-inexistente.json',
  ], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 10000,
    env: { ...process.env, POSTGRES_TARGET: 'supabase-dev', SUPABASE_PROJECT_REF: 'referencia-ficticia' },
  });
  assert.ifError(resultado.error);
  assert.equal(resultado.status, 1);
  assert.equal(resultado.stdout, '');
  assert.equal(resultado.stderr.trim(), 'No se pudo preparar el representante al validar el destino PostgreSQL local.');
});
