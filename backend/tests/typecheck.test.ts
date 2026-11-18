import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const backend = fileURLToPath(new URL('../', import.meta.url));

function pnpm(args: string[], cwd: string) {
  // Los argumentos son constantes del test; las rutas se pasan mediante cwd, sin interpolarlas al shell.
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', `pnpm.cmd ${args.join(' ')}`], {
      cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, COREPACK_ENABLE_NETWORK: '0' },
    })
    : spawnSync('pnpm', args, { cwd, encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024 });
  assert.ifError(result.error);
  return { status: result.status, output: result.stdout + result.stderr };
}

function fuentes(root: string, subdir = ''): string[] {
  return readdirSync(join(root, subdir), { withFileTypes: true }).flatMap(entry => {
    if (['node_modules', 'dist'].includes(entry.name)) return [];
    const path = join(subdir, entry.name);
    if (entry.isDirectory()) return fuentes(root, path);
    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  }).sort();
}

function huellas() {
  return [...fuentes(backend), 'package.json', 'tsconfig.json'].map(path => [
    path, createHash('sha256').update(readFileSync(join(backend, path))).digest('hex'),
  ]);
}

test('typecheck real usa el perfil aprobado, incluye fuentes y detecta TS2322 sin tocarlas', () => {
  const antes = huellas();
  const manifest = JSON.parse(readFileSync(join(backend, 'package.json'), 'utf8'));
  assert.equal(manifest.scripts.typecheck, 'tsc --noEmit -p tsconfig.json');
  const config = pnpm(['exec', 'tsc', '--showConfig', '-p', 'tsconfig.json'], backend);
  assert.equal(config.status, 0, config.output);
  const efectiva = JSON.parse(config.output);
  for (const [key, value] of Object.entries({
    target: 'es2022', lib: ['es2022'], module: 'esnext', moduleResolution: 'bundler', types: ['node'],
    strict: true, noEmit: true, esModuleInterop: true, isolatedModules: true,
    verbatimModuleSyntax: true, skipLibCheck: false,
  })) assert.deepEqual(efectiva.compilerOptions[key], value, key);
  assert.notEqual(efectiva.compilerOptions.incremental, true);
  const incluidos = pnpm(['exec', 'tsc', '--listFilesOnly', '--noEmit', '-p', 'tsconfig.json'], backend);
  assert.equal(incluidos.status, 0, incluidos.output);
  const inventario = fuentes(backend);
  const listados = new Set(incluidos.output.split(/\r?\n/).map(path => resolve(path.trim())));
  const configurados = new Set(efectiva.files.map((path: string) => resolve(backend, path)));
  for (const path of inventario) {
    assert.ok(configurados.has(resolve(backend, path)), `showConfig omitió ${path}`);
    assert.ok(listados.has(resolve(backend, path)), `listFilesOnly omitió ${path}`);
  }
  const sano = pnpm(['run', 'typecheck'], backend);
  assert.equal(sano.status, 0, sano.output);

  const temporal = mkdtempSync(join(tmpdir(), 'docker-laws-typecheck-'));
  const enlace = join(temporal, 'node_modules');
  let enlazado = false;
  try {
    for (const path of [...inventario, 'package.json', 'tsconfig.json']) {
      mkdirSync(dirname(join(temporal, path)), { recursive: true });
      copyFileSync(join(backend, path), join(temporal, path));
    }
    symlinkSync(join(backend, 'node_modules'), enlace, process.platform === 'win32' ? 'junction' : 'dir');
    enlazado = true;
    const copiaSana = pnpm(['run', 'typecheck'], temporal);
    assert.equal(copiaSana.status, 0, copiaSana.output);
    const fixture = join(temporal, 'tests', 'fixtures', 'incompatibilidad.ts');
    mkdirSync(dirname(fixture), { recursive: true });
    writeFileSync(fixture, 'const prueba: string = 123;\nexport {};\n');
    const archivosCopia = pnpm(['exec', 'tsc', '--listFilesOnly', '--noEmit', '-p', 'tsconfig.json'], temporal);
    assert.equal(archivosCopia.status, 0, archivosCopia.output);
    assert.ok(archivosCopia.output.split(/\r?\n/).some(path => resolve(path.trim()) === fixture));
    const negativa = pnpm(['run', 'typecheck'], temporal);
    assert.notEqual(negativa.status, 0);
    assert.match(negativa.output, /incompatibilidad\.ts[^\r\n]*TS2322/);
  } finally {
    if (enlazado) unlinkSync(enlace);
    assert.equal(dirname(temporal), resolve(tmpdir()));
    assert.ok(temporal.startsWith(join(resolve(tmpdir()), 'docker-laws-typecheck-')));
    rmSync(temporal, { recursive: true, force: true });
    assert.deepEqual(huellas(), antes, 'Las fuentes/configuraciones originales cambiaron');
  }
});
