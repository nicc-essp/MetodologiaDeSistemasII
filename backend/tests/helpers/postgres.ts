import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function comprobarDestinoDescartable() {
  assert.equal(process.env.POSTGRES_TARGET, 'local');
  for (const variable of ['SUPABASE_PROJECT_REF', 'POSTGRES_CONNECTION_MODE', 'POSTGRES_SSL_CA_FILE']) {
    assert.equal(process.env[variable], undefined, 'Las pruebas descartables no admiten configuración Supabase.');
  }
  assert.match(process.env.DOCKER_LAWS_TEST_PROJECT ?? '', /^docker-laws-p03-test-[a-f0-9]{32}$/, 'Ejecutar mediante pnpm test:postgres.');
  assert.equal(process.env.POSTGRES_HOST, '127.0.0.1');
  assert.equal(process.env.POSTGRES_DB, 'docker_laws_test');
  const claves = realpathSync(process.env.POSTGRES_SECRETS_DIR ?? '');
  const temporal = dirname(claves);
  assert.equal(dirname(temporal), realpathSync(tmpdir()));
  assert.match(basename(temporal), /^docker-laws-postgres-[a-zA-Z0-9]+$/);
  assert.equal(basename(claves), 'test');
  assert.equal(claves, resolve(process.env.POSTGRES_SECRETS_DIR!));
}

export function ejecutarCli(comando: 'up' | 'status') {
  const script = comando === 'up' ? 'db:migrate' : 'db:status';
  const opciones = { cwd: fileURLToPath(new URL('../../', import.meta.url)), encoding: 'utf8' as const, timeout: 20000 };
  const resultado = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `pnpm.cmd --silent run ${script}`], opciones)
    : spawnSync('pnpm', ['--silent', 'run', script], opciones);
  assert.equal(resultado.status, 0, resultado.stderr);
  return resultado.stdout.trim();
}
