import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { argumentos, generarCredenciales, limpiarTemporal, validarConfiguracion, validarEndpointDocker, validarRecursos } from './postgres.mjs';

test('el verificador admite sockets locales y rechaza motores remotos o destinos ausentes', () => {
  validarEndpointDocker('unix:///var/run/docker.sock');
  validarEndpointDocker('npipe:////./pipe/dockerDesktopLinuxEngine');
  for (const endpoint of [undefined, '', 'tcp://servidor:2376', 'tcp://127.0.0.1:2375', 'ssh://produccion', 'npipe:////servidor/pipe/docker_engine']) {
    assert.throws(() => validarEndpointDocker(endpoint), /motor Docker local/);
  }
});

function conTemporal(run) {
  const temporal = mkdtempSync(join(realpathSync(tmpdir()), 'docker-laws-postgres-'));
  try { run(temporal); } finally { limpiarTemporal(temporal); }
}

test('importación y argumentos inválidos no necesitan Docker ni crean credenciales', () => {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'));
  const resultado = spawnSync(process.execPath, ['--input-type=module', '-e', 'import "./scripts/postgres.mjs";'], { env, encoding: 'utf8' });
  assert.equal(resultado.status, 0, resultado.stderr);
  const invalido = spawnSync(process.execPath, ['scripts/postgres.mjs', 'verificar', '--project-name', 'ajeno'], { env, encoding: 'utf8' });
  assert.equal(invalido.status, 1);
  assert.match(invalido.stderr, /Opción inválida/);
  assert.deepEqual(argumentos(['preparar']), { comando: 'preparar', pruebas: false, limpiar: false });
  assert.equal(argumentos(['preparar', '--pruebas']).pruebas, true);
  assert.equal(argumentos(['verificar', '--limpiar']).limpiar, true);
});

for (const args of [[], ['borrar'], ['preparar', '--limpiar'], ['verificar', '--pruebas'], ['verificar', '--limpiar', '--otro']]) {
  test(`argumentos cerrados: ${JSON.stringify(args)}`, () => assert.throws(() => argumentos(args)));
}

test('credenciales aleatorias diferentes por rol/entorno y preparación repetible sin reemplazos', () => {
  conTemporal(temporal => {
    const directorios = ['dev', 'test'].map(nombre => generarCredenciales(join(temporal, nombre)));
    const leer = directorio => ['admin.txt', 'app.txt', 'migrator.txt'].map(nombre => readFileSync(join(directorio, nombre), 'utf8'));
    const antes = directorios.flatMap(leer);
    assert.equal(new Set(antes).size, 6);
    for (const directorio of directorios) generarCredenciales(directorio);
    assert.deepEqual(directorios.flatMap(leer), antes);
  });
});

test('configuración incompleta o clave inválida no se reemplaza silenciosamente', () => {
  conTemporal(temporal => {
    const claves = join(temporal, 'claves');
    mkdirSync(claves);
    writeFileSync(join(claves, 'admin.txt'), 'existente');
    assert.throws(() => generarCredenciales(claves), /incompletas/);
    assert.equal(readFileSync(join(claves, 'admin.txt'), 'utf8'), 'existente');
    assert.ok(!existsSync(join(claves, 'app.txt')));
    const invalidas = generarCredenciales(join(temporal, 'invalidas'));
    writeFileSync(join(invalidas, 'app.txt'), 'invalida');
    assert.throws(() => generarCredenciales(invalidas), error => {
      assert.match(error.message, /Clave local inválida/);
      assert.ok(!error.message.includes('invalida'));
      return true;
    });
    assert.equal(readFileSync(join(invalidas, 'app.txt'), 'utf8'), 'invalida');
  });
});

test('no se escriben credenciales a través de un directorio enlazado', () => {
  conTemporal(temporal => {
    const destino = join(temporal, 'destino');
    const enlace = join(temporal, 'enlace');
    mkdirSync(destino);
    symlinkSync(destino, enlace, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => generarCredenciales(enlace), /enlazado/);
    assert.ok(!existsSync(join(destino, 'admin.txt')));
  });
});

const proyecto = `docker-laws-p03-dev-${'a'.repeat(32)}`;
const sesion = { proyecto, nuevo: true, base: 'docker_laws_dev', volumen: `${proyecto}_postgres_dev_data`, claves: join(realpathSync(tmpdir()), 'claves-ficticias') };
const configuracion = {
  name: proyecto,
  services: { postgres: {
    image: `postgres:17.12-bookworm@sha256:${'a'.repeat(64)}`,
    environment: { POSTGRES_DB: sesion.base, POSTGRES_PASSWORD_FILE: '/run/secrets/postgres_admin' },
    ports: [{ host_ip: '127.0.0.1' }], healthcheck: { test: ['pg_isready'] },
    volumes: [{ type: 'volume', source: 'datos', target: '/var/lib/postgresql/data' }],
  } },
  volumes: { datos: { name: sesion.volumen } },
  secrets: Object.fromEntries([['postgres_admin', 'admin.txt'], ['postgres_app', 'app.txt'], ['postgres_migrator', 'migrator.txt']].map(([nombre, archivo]) => [nombre, { file: join(sesion.claves, archivo) }])),
};

test('configuración de pruebas válida, cerrada al proyecto, volumen y secretos propios', () => validarConfiguracion(configuracion, sesion));
for (const [caso, alterar] of [
  ['configuración ausente', c => { delete c.services; }],
  ['base ausente', c => { delete c.services.postgres.environment.POSTGRES_DB; }],
  ['proyecto ajeno', c => { c.name = 'desarrollo-real'; }],
  ['base ajena', c => { c.services.postgres.environment.POSTGRES_DB = 'real'; }],
  ['imagen flotante', c => { c.services.postgres.image = 'postgres:latest'; }],
  ['clave en environment', c => { c.services.postgres.environment.POSTGRES_PASSWORD = 'ficticia'; }],
  ['puerto público', c => { c.services.postgres.ports[0].host_ip = '0.0.0.0'; }],
  ['volumen externo', c => { c.volumes.datos.external = true; }],
  ['volumen ajeno', c => { c.volumes.datos.name = 'desarrollo-real'; }],
  ['secreto ajeno', c => { c.secrets.postgres_admin.file = join(sesion.claves, '..', 'ajeno'); }],
]) {
  test(`verificación rechaza ${caso} antes de iniciar contenedores`, () => {
    const config = structuredClone(configuracion);
    alterar(config);
    assert.throws(() => validarConfiguracion(config, sesion));
  });
}

const recursos = {
  contenedores: [{ Config: { Labels: { 'com.docker.compose.project': proyecto, 'com.docker.compose.service': 'postgres' } }, Mounts: [{ Type: 'volume', Name: sesion.volumen }] }],
  volumenes: [{ Name: sesion.volumen, Labels: { 'com.docker.compose.project': proyecto } }],
  redes: [{ Name: `${proyecto}_default`, Labels: { 'com.docker.compose.project': proyecto } }],
};

test('la propiedad de todos los recursos debe estar acreditada antes de limpiar', () => {
  validarRecursos(sesion, recursos);
  assert.throws(() => validarRecursos({ ...sesion, nuevo: false }, recursos));
  assert.throws(() => validarRecursos({ ...sesion, proyecto: 'desarrollo-real' }, recursos));
});

for (const [caso, alterar] of [
  ['contenedor ajeno', r => { r.contenedores[0].Config.Labels['com.docker.compose.project'] = 'ajeno'; }],
  ['otro servicio', r => { r.contenedores[0].Config.Labels['com.docker.compose.service'] = 'backend'; }],
  ['volumen montado ajeno', r => { r.contenedores[0].Mounts[0].Name = 'datos-reales'; }],
  ['volumen sin propiedad', r => { r.volumenes[0].Labels = {}; }],
  ['nombre de volumen ajeno', r => { r.volumenes[0].Name = 'datos-reales'; }],
  ['red ajena', r => { r.redes[0].Labels['com.docker.compose.project'] = 'ajeno'; }],
]) {
  test(`limpieza rechazada: ${caso}`, () => {
    const inventario = structuredClone(recursos);
    alterar(inventario);
    assert.throws(() => validarRecursos(sesion, inventario));
  });
}

test('la limpieza de archivos no acepta el workspace ni un directorio no perteneciente a la ejecución', () => {
  assert.throws(() => limpiarTemporal(process.cwd()));
  assert.throws(() => limpiarTemporal(join(realpathSync(tmpdir()), 'otra-tarea')));
});
