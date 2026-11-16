import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const archivosClave = ['admin.txt', 'app.txt', 'migrator.txt'];
const valoresPrivados = new Set();

export function argumentos(args) {
  assert.ok(['preparar', 'verificar'].includes(args[0]), 'Uso: preparar [--pruebas] | verificar [--limpiar]');
  const opcion = args[0] === 'preparar' ? '--pruebas' : '--limpiar';
  assert.ok(args.length === 1 || (args.length === 2 && args[1] === opcion), 'Opción inválida.');
  return { comando: args[0], pruebas: args[1] === '--pruebas', limpiar: args[1] === '--limpiar' };
}

export function validarEndpointDocker(endpoint) {
  assert.ok(typeof endpoint === 'string' && /^(unix:\/\/\/[^\s]+|npipe:\/\/\/\/\.\/pipe\/[^\s]+)$/.test(endpoint), 'P03 solo permite un motor Docker local (unix o npipe), nunca TCP/SSH remoto.');
}

export function generarCredenciales(directorio) {
  const destino = resolve(directorio);
  // No seguir enlaces hacia ubicaciones ajenas al directorio solicitado.
  for (let actual = destino; actual !== dirname(actual); actual = dirname(actual)) {
    if (existsSync(actual)) assert.ok(!lstatSync(actual).isSymbolicLink(), 'Directorio privado enlazado no permitido.');
  }
  mkdirSync(destino, { recursive: true, mode: 0o700 });
  const existentes = archivosClave.map(nombre => existsSync(join(destino, nombre)));
  assert.ok(existentes.every(Boolean) || existentes.every(valor => !valor), 'Credenciales incompletas: no se sobrescriben archivos existentes.');
  if (!existentes.some(Boolean)) {
    for (const nombre of archivosClave) writeFileSync(join(destino, nombre), randomBytes(24).toString('hex'), { flag: 'wx', mode: 0o600 });
  }
  const valores = archivosClave.map(nombre => {
    const archivo = join(destino, nombre);
    assert.ok(lstatSync(archivo).isFile() && !lstatSync(archivo).isSymbolicLink(), 'Archivo privado no regular.');
    const valor = readFileSync(archivo, 'utf8');
    assert.ok(/^[a-f0-9]{48}$/.test(valor), 'Clave local inválida; no se reemplaza automáticamente.');
    valoresPrivados.add(valor);
    return valor;
  });
  assert.equal(new Set(valores).size, archivosClave.length, 'Los roles requieren claves diferentes.');
  return destino;
}

function ocultar(texto) {
  let resultado = String(texto);
  for (const valor of valoresPrivados) resultado = resultado.replaceAll(valor, '[clave omitida]');
  return resultado;
}

function docker(args, { env = process.env, input, permitirFallo = false } = {}) {
  const resultado = spawnSync('docker', args, { env, input, encoding: 'utf8', timeout: 300000, maxBuffer: 16 * 1024 * 1024 });
  if (resultado.error) throw new Error(ocultar(resultado.error.message));
  if (resultado.status !== 0 && !permitirFallo) throw new Error(ocultar(`Docker ${args[0]} falló: ${resultado.stderr || resultado.stdout}`));
  return { status: resultado.status, stdout: resultado.stdout, stderr: ocultar(resultado.stderr) };
}

export function validarConfiguracion(config, sesion) {
  assert.equal(config.name, sesion.proyecto, 'Proyecto distinto del autorizado.');
  const servicio = config.services?.postgres;
  assert.ok(servicio, 'Falta servicio postgres.');
  assert.match(servicio.image, /^postgres:17\.12-bookworm@sha256:[a-f0-9]{64}$/, 'Se requiere imagen fijada por digest.');
  assert.equal(servicio.environment.POSTGRES_DB, sesion.base, 'Base ajena a la verificación.');
  assert.equal(servicio.environment.POSTGRES_PASSWORD_FILE, '/run/secrets/postgres_admin');
  assert.ok(!Object.keys(servicio.environment).some(k => /PASSWORD$/.test(k)), 'No entregar claves en environment.');
  assert.ok(servicio.ports?.length === 1 && servicio.ports[0].host_ip === '127.0.0.1', 'Puerto fuera del host local.');
  assert.ok(servicio.healthcheck?.test?.length, 'Falta comprobación de disponibilidad.');
  const volumen = servicio.volumes.find(montaje => montaje.type === 'volume');
  assert.ok(volumen && volumen.target === '/var/lib/postgresql/data', 'Falta volumen de datos.');
  const definicion = config.volumes[volumen.source];
  assert.ok(!definicion.external && definicion.name === sesion.volumen, 'Volumen externo o nombre no autorizado.');
  for (const [secreto, archivo] of [['postgres_admin', 'admin.txt'], ['postgres_app', 'app.txt'], ['postgres_migrator', 'migrator.txt']]) {
    assert.equal(resolve(config.secrets[secreto].file), join(sesion.claves, archivo), 'Archivo secreto fuera de esta ejecución.');
  }
}

function compose(sesion, args, opciones = {}) {
  return docker(['compose', '--env-file', sesion.envFile, '--project-name', sesion.proyecto,
    '--file', sesion.composeFile, '--profile', 'persistencia', ...args], { env: sesion.env, ...opciones });
}

function ids(tipo, proyecto) {
  return docker([tipo, 'ls', '-q', ...(tipo === 'container' ? ['-a'] : []), '--filter', `label=com.docker.compose.project=${proyecto}`]).stdout.trim().split(/\s+/).filter(Boolean);
}

function inspeccionar(tipo, referencias) {
  return referencias.length ? JSON.parse(docker([tipo, 'inspect', ...referencias]).stdout) : [];
}

export function validarRecursos(sesion, recursos) {
  assert.match(sesion.proyecto, /^docker-laws-p03-(dev|test)-[a-f0-9]{32}$/);
  assert.equal(sesion.nuevo, true, 'No hay constancia de un proyecto nuevo.');
  for (const contenedor of recursos.contenedores) {
    assert.equal(contenedor.Config.Labels['com.docker.compose.project'], sesion.proyecto, 'Contenedor ajeno.');
    assert.equal(contenedor.Config.Labels['com.docker.compose.service'], 'postgres', 'Servicio ajeno.');
    for (const montaje of contenedor.Mounts.filter(m => m.Type === 'volume')) assert.equal(montaje.Name, sesion.volumen, 'Volumen montado ajeno.');
  }
  for (const volumen of recursos.volumenes) {
    assert.equal(volumen.Labels['com.docker.compose.project'], sesion.proyecto, 'Etiqueta de volumen ajena.');
    assert.equal(volumen.Name, sesion.volumen, 'Nombre de volumen ajeno.');
  }
  for (const red of recursos.redes) {
    assert.equal(red.Labels['com.docker.compose.project'], sesion.proyecto, 'Red ajena.');
    assert.equal(red.Name, `${sesion.proyecto}_default`, 'Nombre de red ajeno.');
  }
}

function recursos(sesion) {
  const contenedores = inspeccionar('container', ids('container', sesion.proyecto));
  const volumenes = new Set(ids('volume', sesion.proyecto));
  const redes = new Set(ids('network', sesion.proyecto));
  for (const contenedor of contenedores) {
    for (const montaje of contenedor.Mounts.filter(m => m.Type === 'volume')) volumenes.add(montaje.Name);
    for (const red of Object.values(contenedor.NetworkSettings.Networks)) redes.add(red.NetworkID);
  }
  return {
    contenedores,
    volumenes: inspeccionar('volume', [...volumenes]),
    redes: inspeccionar('network', [...redes]),
  };
}

function prepararSesion(tipo, temporal, identificador) {
  const proyecto = `docker-laws-p03-${tipo}-${identificador}`;
  assert.ok(['container', 'volume', 'network'].every(t => ids(t, proyecto).length === 0), 'El proyecto ya tiene recursos: no se utilizarán.');
  const volumen = `${proyecto}_postgres_${tipo}_data`;
  // Detectar también colisiones con recursos sin etiquetas de Compose.
  for (const [clase, formato, nombre] of [['volume', '{{.Name}}', volumen], ['network', '{{.Name}}', `${proyecto}_default`], ['container', '{{.Names}}', `${proyecto}-postgres-1`]]) {
    const nombres = docker([clase, 'ls', ...(clase === 'container' ? ['-a'] : []), '--format', formato]).stdout.trim().split(/\r?\n/);
    assert.ok(!nombres.includes(nombre), 'Ya existe un recurso con el nombre reservado.');
  }
  const claves = generarCredenciales(join(temporal, tipo));
  const envFile = join(temporal, `${tipo}.env`);
  writeFileSync(envFile, '', { flag: 'wx', mode: 0o600 });
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(COMPOSE_|POSTGRES_|DATABASE_)/i.test(k)));
  Object.assign(env, { POSTGRES_DB: 'docker_laws_dev', POSTGRES_PORT: '0', POSTGRES_TEST_PORT: '0', POSTGRES_SECRETS_DIR: claves, POSTGRES_TEST_SECRETS_DIR: claves });
  return { proyecto, nuevo: true, claves, envFile, env, tipo, base: tipo === 'dev' ? 'docker_laws_dev' : 'docker_laws_test',
    composeFile: join(raiz, tipo === 'dev' ? 'docker-compose.yml' : 'docker-compose.test.yml'),
    volumen };
}

function sql(sesion, rol, consulta, { permitirFallo = false, sinClave = false } = {}) {
  const clave = { postgres: 'admin', docker_laws_migrator: 'migrator', docker_laws_app: 'app' }[rol];
  assert.ok(clave, 'Rol de verificación no permitido.');
  const comando = sinClave ? 'export PGPASSWORD=""; exec psql -X -w -qAt -h 127.0.0.1 -U "$1" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
    : 'export PGPASSWORD="$(cat "$1")"; shift; exec psql -X -w -qAt -h 127.0.0.1 -U "$1" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1';
  return compose(sesion, ['exec', '-T', 'postgres', 'sh', '-ec', comando, 'sh', ...(sinClave ? [] : [`/run/secrets/postgres_${clave}`]), rol], { input: consulta, permitirFallo });
}

function comprobarRoles(sesion) {
  assert.equal(sql(sesion, 'postgres', 'SHOW server_version_num;').stdout.trim(), '170012', 'Versión PostgreSQL inesperada.');
  for (const rol of ['postgres', 'docker_laws_migrator', 'docker_laws_app']) {
    assert.equal(sql(sesion, rol, 'SELECT current_user;').stdout.trim(), rol);
    assert.equal(sql(sesion, rol, 'SELECT current_database();').stdout.trim(), sesion.base);
    if (rol !== 'postgres') {
      assert.equal(sql(sesion, rol, 'SELECT rolsuper OR rolcreatedb OR rolcreaterole FROM pg_roles WHERE rolname=current_user;').stdout.trim(), 'f');
      assert.equal(sql(sesion, rol, "SELECT has_database_privilege(current_user,current_database(),'CREATE');").stdout.trim(), 'f');
    }
  }
  assert.notEqual(sql(sesion, 'docker_laws_app', 'SELECT 1;', { permitirFallo: true, sinClave: true }).status, 0, 'La conexión debe requerir contraseña.');
  assert.equal(sql(sesion, 'docker_laws_app', "SELECT has_schema_privilege(current_user,'app','USAGE'), has_schema_privilege(current_user,'app','CREATE');").stdout.trim(), 't|f');
  assert.equal(sql(sesion, 'docker_laws_migrator', "SELECT has_schema_privilege(current_user,'app','CREATE'), has_schema_privilege(current_user,'public','CREATE');").stdout.trim(), 't|f');
  assert.equal(sql(sesion, 'docker_laws_migrator', "SELECT count(*) FROM pg_tables WHERE schemaname='app';").stdout.trim(), '0', 'El entorno debe iniciar sin tablas.');
  assert.notEqual(sql(sesion, 'docker_laws_app', 'CREATE TABLE app.p03_no_permitido (id integer);', { permitirFallo: true }).status, 0);
}

function crearSonda(sesion, marcador) {
  assert.match(marcador, /^[a-f0-9]{32}$/);
  // Fixture de infraestructura en una instancia nueva; no es una tabla del modelo de negocio.
  sql(sesion, 'docker_laws_migrator', `CREATE TABLE app.p03_verificacion (id integer PRIMARY KEY, valor text NOT NULL); INSERT INTO app.p03_verificacion VALUES (1,'${marcador}');`);
  assert.notEqual(sql(sesion, 'docker_laws_app', 'SELECT * FROM app.p03_verificacion;', { permitirFallo: true }).status, 0, 'Sin concesiones globales a tablas futuras.');
  sql(sesion, 'docker_laws_migrator', 'GRANT SELECT, INSERT ON app.p03_verificacion TO docker_laws_app;');
  sql(sesion, 'docker_laws_app', `INSERT INTO app.p03_verificacion VALUES (2,'${marcador}');`);
  assert.notEqual(sql(sesion, 'docker_laws_app', 'DELETE FROM app.p03_verificacion;', { permitirFallo: true }).status, 0);
  assert.notEqual(sql(sesion, 'docker_laws_app', "UPDATE app.p03_verificacion SET valor='no permitido';", { permitirFallo: true }).status, 0);
}

export function limpiarTemporal(temporal) {
  const absoluto = resolve(temporal);
  assert.equal(dirname(absoluto), realpathSync(tmpdir()), 'Temporal fuera del directorio esperado.');
  assert.match(basename(absoluto), /^docker-laws-postgres-[a-zA-Z0-9]+$/);
  assert.ok(!lstatSync(absoluto).isSymbolicLink(), 'Temporal enlazado no permitido.');
  assert.equal(realpathSync(absoluto), absoluto);
  rmSync(absoluto, { recursive: true, force: false });
}

function comprobarDockerLocal() {
  if (process.env.DOCKER_HOST) validarEndpointDocker(process.env.DOCKER_HOST);
  validarEndpointDocker(docker(['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}']).stdout.trim());
  docker(['version', '--format', '{{.Server.Version}}']);
  assert.equal(docker(['info', '--format', '{{.OSType}}']).stdout.trim(), 'linux', 'Se necesita un motor de contenedores Linux.');
}

function finalizarSesiones(sesiones, temporal, limpiar) {
  // Solo se elimina con --limpiar explícito, después de inspeccionar propiedad y nombres.
  for (const sesion of [...sesiones].reverse()) {
    validarRecursos(sesion, recursos(sesion));
    if (limpiar) {
      validarConfiguracion(JSON.parse(compose(sesion, ['config', '--format', 'json']).stdout), sesion);
      compose(sesion, ['down', '--volumes']);
      assert.ok(['container', 'volume', 'network'].every(t => ids(t, sesion.proyecto).length === 0), 'Quedaron recursos de la ejecución.');
    } else {
      compose(sesion, ['stop', 'postgres']);
      console.log(`Recursos conservados y detenidos: ${sesion.proyecto}`);
    }
  }
  if (limpiar) limpiarTemporal(temporal);
  else console.log(`Credenciales sintéticas de la ejecución: ${temporal}`);
}

// Reutiliza el aislamiento y las protecciones de P03 para pruebas del backend.
export async function conPostgresDePruebas(run, { limpiar = false } = {}) {
  comprobarDockerLocal();
  const temporal = mkdtempSync(join(realpathSync(tmpdir()), 'docker-laws-postgres-'));
  const sesiones = [];
  try {
    const sesion = prepararSesion('test', temporal, randomUUID().replaceAll('-', ''));
    sesiones.push(sesion);
    validarConfiguracion(JSON.parse(compose(sesion, ['config', '--format', 'json']).stdout), sesion);
    console.log(`PostgreSQL descartable: ${sesion.proyecto}`);
    compose(sesion, ['up', '-d', '--wait', '--wait-timeout', '120', 'postgres']);
    validarRecursos(sesion, recursos(sesion));
    comprobarRoles(sesion);
    const puerto = compose(sesion, ['port', 'postgres', '5432']).stdout.trim();
    assert.match(puerto, /^127\.0\.0\.1:\d+$/, 'Puerto de pruebas fuera del host local.');
    return await run({ proyecto: sesion.proyecto, host: '127.0.0.1', port: Number(puerto.split(':')[1]),
      database: sesion.base, claves: sesion.claves, ocultar });
  } finally {
    finalizarSesiones(sesiones, temporal, limpiar);
  }
}

export function verificar({ limpiar = false } = {}) {
  comprobarDockerLocal();
  const temporal = mkdtempSync(join(realpathSync(tmpdir()), 'docker-laws-postgres-'));
  const identificador = randomUUID().replaceAll('-', '');
  const sesiones = [];
  let verificado = false;
  try {
    for (const tipo of ['dev', 'test']) {
      const sesion = prepararSesion(tipo, temporal, identificador);
      sesiones.push(sesion);
      const config = JSON.parse(compose(sesion, ['config', '--format', 'json']).stdout);
      validarConfiguracion(config, sesion);
      console.log(`Iniciando PostgreSQL aislado (${tipo}): ${sesion.proyecto}`);
      compose(sesion, ['up', '-d', '--wait', '--wait-timeout', '120', 'postgres']);
      validarRecursos(sesion, recursos(sesion));
      comprobarRoles(sesion);
      crearSonda(sesion, identificador);
    }
    const [desarrollo, pruebas] = sesiones;
    const leer = sesion => sql(sesion, 'docker_laws_app', 'SELECT id, valor FROM app.p03_verificacion ORDER BY id;').stdout.trim();
    const antes = leer(desarrollo);
    compose(desarrollo, ['restart', 'postgres']);
    compose(desarrollo, ['up', '-d', '--wait', '--wait-timeout', '120', 'postgres']);
    assert.equal(leer(desarrollo), antes, 'El reinicio perdió los datos.');
    sql(pruebas, 'docker_laws_app', `INSERT INTO app.p03_verificacion VALUES (3,'${identificador}');`);
    assert.equal(leer(desarrollo), antes, 'Las pruebas modificaron desarrollo.');
    compose(pruebas, ['stop', 'postgres']);
    assert.equal(leer(desarrollo), antes, 'Detener pruebas afectó desarrollo.');
    validarRecursos(desarrollo, recursos(desarrollo));
    verificado = true;
    console.log('P03: PostgreSQL 17.12, conexión autenticada, permisos, volumen tras reinicio e independencia verificados.');
  } finally {
    finalizarSesiones(sesiones, temporal, limpiar);
  }
  return { verificado, proyectos: sesiones.map(s => s.proyecto), limpiados: limpiar };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const opciones = argumentos(process.argv.slice(2));
    if (opciones.comando === 'preparar') {
      const carpeta = generarCredenciales(join(raiz, 'secrets', opciones.pruebas ? 'postgres-test' : 'postgres'));
      console.log(`Credenciales locales preparadas en ${carpeta}. No se muestran ni sobrescriben claves existentes.`);
    } else verificar(opciones);
  } catch (error) {
    console.error(ocultar(error.message));
    process.exitCode = 1;
  }
}
