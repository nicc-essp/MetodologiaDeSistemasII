import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const componentes = ['backend', 'frontend'];
const categorias = ['.env', '.env.local', '.env.production', '.npmrc', '.netrc', 'ficticia.key',
  'ficticia.pem', 'ficticia.p12', 'ficticia.pfx', 'id_rsa', 'id_ed25519', 'secrets/fixture.txt'];

export function ejecutar(programa, args, options = {}) {
  return execFileSync(programa, args, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 512 * 1024 * 1024, timeout: 600000, ...options });
}

export function crearTemporal() {
  return mkdtempSync(join(tmpdir(), 'docker-laws-docker-'));
}

export function limpiarTemporal(temporal) {
  assert.equal(dirname(resolve(temporal)), resolve(tmpdir()));
  assert.ok(basename(temporal).startsWith('docker-laws-docker-'));
  assert.ok(!lstatSync(temporal).isSymbolicLink());
  rmSync(temporal, { recursive: true, force: true });
}

function esPrivado(nombre) {
  return /^\.env(?:\.|$)/i.test(nombre) || ['.npmrc', '.netrc', 'id_rsa', 'id_ed25519', 'secrets'].includes(nombre.toLowerCase())
    || /\.(key|pem|p12|pfx)$/i.test(nombre);
}

function copiarPublico(origen, destino) {
  const nombre = basename(origen);
  if (esPrivado(nombre) || ['node_modules', 'dist', '.git', '.agents', '.specify', 'specs', '.codex'].includes(nombre)) return;
  const stat = lstatSync(origen);
  // No seguir enlaces de fuentes hacia ubicaciones privadas o externas.
  if (stat.isSymbolicLink()) throw new Error('Una fuente pública es un enlace no permitido.');
  if (stat.isDirectory()) {
    mkdirSync(destino, { recursive: true });
    for (const entrada of readdirSync(origen)) copiarPublico(join(origen, entrada), join(destino, entrada));
  } else if (stat.isFile()) {
    mkdirSync(dirname(destino), { recursive: true });
    copyFileSync(origen, destino);
  } else throw new Error('Tipo de fuente no inspeccionable.');
}

export function prepararContexto(componente, raizFuentes = raiz) {
  assert.ok(componentes.includes(componente), 'Componente inválido');
  const temporal = crearTemporal();
  const contexto = join(temporal, componente);
  mkdirSync(contexto);
  const comunes = ['package.json', 'pnpm-lock.yaml', 'Dockerfile', '.dockerignore'];
  const publicos = componente === 'backend'
    ? [...comunes, 'pnpm-workspace.yaml', 'tsconfig.json', 'index.ts', 'app.ts', 'models', 'data', 'database', 'migrations', 'routes', 'controllers', 'validations', 'middleware', 'config', 'tests']
    : [...comunes, 'index.html', 'vite.config.js', 'eslint.config.js', 'src', 'public'];
  const requeridos = componente === 'backend'
    ? ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'index.ts']
    : ['package.json', 'pnpm-lock.yaml', 'index.html', 'src/main.jsx'];
  try {
    for (const path of publicos) {
      const origen = join(raizFuentes, componente, path);
      if (existsSync(origen)) copiarPublico(origen, join(contexto, path));
    }
    for (const path of [...comunes, ...requeridos]) assert.ok(existsSync(join(contexto, path)), `Falta archivo público: ${path}`);
    const fixtures = [];
    for (const prefijo of ['', 'fixtures-anidados']) {
      for (const categoria of categorias) {
        const path = join(prefijo, categoria);
        const marcador = `DOCKER_LAWS_SINTETICO_${randomUUID()}`;
        mkdirSync(dirname(join(contexto, path)), { recursive: true });
        writeFileSync(join(contexto, path), `Marcador ficticio sin credenciales válidas: ${marcador}\n`);
        fixtures.push({ path: path.replaceAll('\\', '/'), marcador });
      }
    }
    const control = { path: `control-publico-${randomUUID()}.txt`, marcador: `PUBLICO_${randomUUID()}` };
    writeFileSync(join(contexto, control.path), control.marcador);
    return { componente, temporal, contexto, fixtures, control, requeridos };
  } catch (error) {
    limpiarTemporal(temporal);
    throw error;
  }
}

export function preflight() {
  return {
    docker: ejecutar('docker', ['version', '--format', '{{.Server.Version}}']).trim(),
    buildx: ejecutar('docker', ['buildx', 'version']).trim(),
    tar: ejecutar('tar', ['--version']).trim().split(/\r?\n/)[0],
  };
}

export function inspeccionarDirectorio(directorio, preparado) {
  for (const { path } of preparado.fixtures) {
    assert.ok(!existsSync(join(directorio, path)), `Fixture privado presente: ${path}`);
  }
  for (const path of [...preparado.requeridos, preparado.control.path]) {
    assert.ok(existsSync(join(directorio, path)), `Falta control/archivo público: ${path}`);
  }
  assert.equal(readFileSync(join(directorio, preparado.control.path), 'utf8'), preparado.control.marcador);
  function recorrer(path) {
    for (const entrada of readdirSync(path, { withFileTypes: true })) {
      const archivo = join(path, entrada.name);
      if (entrada.isDirectory()) recorrer(archivo);
      else if (entrada.isFile()) {
        const contenido = readFileSync(archivo);
        for (const fixture of preparado.fixtures) assert.ok(!contenido.includes(Buffer.from(fixture.marcador)), `Marcador privado en ${relative(directorio, archivo)}`);
      } else throw new Error('Archivo exportado no inspeccionable.');
    }
  }
  recorrer(directorio);
}

export function verificarContexto(preparado) {
  const salida = join(preparado.temporal, `exportado-${randomUUID()}`);
  ejecutar('docker', ['buildx', 'build', '--file', '-', '--output', `type=local,dest=${salida}`, preparado.contexto], {
    input: 'FROM scratch\nCOPY . /\n',
  });
  inspeccionarDirectorio(salida, preparado);
  return { componente: preparado.componente, fixtures: preparado.fixtures.length, controlPublico: true, privados: 0 };
}

export function validarRuntime(version) {
  const [major, minor, patch] = version.replace(/^v/, '').split('.').map(Number);
  assert.ok(major === 22 && (minor > 22 || (minor === 22 && patch >= 2)), 'La imagen requiere Node 22 >=22.22.2 antes de instalar dependencias.');
}

export function comprobarRuntimeImagen() {
  const node = ejecutar('docker', ['run', '--rm', '--network', 'none', 'node:22-alpine', 'node', '-p', 'process.versions.node']).trim();
  validarRuntime(node);
  return { node, imagenBase: ejecutar('docker', ['image', 'inspect', 'node:22-alpine', '--format', '{{.Id}}']).trim() };
}

export function inspeccionarArchivo(archivo, preparado) {
  const listados = ejecutar('tar', ['-tf', archivo]).split(/\r?\n/).filter(Boolean);
  const miembros = new Map(listados.map(original => {
    assert.ok(!original.startsWith('/') && !original.includes('\\') && !original.split('/').includes('..'), 'Ruta de archivo no permitida');
    return [original.replace(/^\.\//, ''), original];
  }));
  const capas = new Set();
  const configuraciones = new Set();
  const visitados = new Set();
  let controlPresente = false;

  function comprobarBytes(bytes, contenidoDeCapa = false) {
    for (const fixture of preparado.fixtures) assert.ok(!bytes.includes(Buffer.from(fixture.marcador)), 'Marcador privado presente en imagen');
    if (contenidoDeCapa && bytes.includes(Buffer.from(preparado.control.marcador))) controlPresente = true;
  }

  function leer(nombre) {
    assert.ok(miembros.has(nombre), `Miembro requerido ausente: ${nombre}`);
    return ejecutar('tar', ['-xOf', archivo, '--', miembros.get(nombre)], { encoding: null });
  }

  function leerJson(nombre) {
    const raw = leer(nombre);
    comprobarBytes(raw);
    const datos = JSON.parse(raw.toString('utf8'));
    comprobarBytes(Buffer.from(JSON.stringify(datos)));
    return datos;
  }

  function inspeccionarConfig(nombre) {
    if (configuraciones.has(nombre)) return;
    const config = leerJson(nombre);
    assert.ok(config && typeof config === 'object' && !Array.isArray(config), 'Configuración de imagen inválida');
    configuraciones.add(nombre);
  }

  function inspeccionarCapa(nombre, mediaType) {
    if (capas.has(nombre)) return;
    if (mediaType === 'application/vnd.in-toto+json') {
      // BuildKit puede guardar procedencia OCI como capa JSON, además de capas de filesystem.
      leerJson(nombre);
      capas.add(nombre);
      return;
    }
    const buffer = leer(nombre);
    comprobarBytes(buffer, true);
    // tar inspecciona por stdout: nunca extrae rutas recibidas de una capa al filesystem.
    const paths = ejecutar('tar', ['-tf', '-'], { input: buffer }).split(/\r?\n/).filter(Boolean);
    for (const path of paths) {
      const normalizado = path.replace(/^\.\//, '').replace(/^\//, '');
      for (const fixture of preparado.fixtures) assert.notEqual(normalizado, `app/${fixture.path}`, `Fixture privado en capa: ${fixture.path}`);
    }
    comprobarBytes(Buffer.from(ejecutar('tar', ['-tvf', '-'], { input: buffer })));
    comprobarBytes(ejecutar('tar', ['-xOf', '-'], { input: buffer, encoding: null }), true);
    capas.add(nombre);
  }

  function blob(descriptor) {
    assert.match(descriptor?.digest ?? '', /^sha256:[a-f0-9]{64}$/, 'Digest OCI no soportado');
    return `blobs/sha256/${descriptor.digest.slice(7)}`;
  }

  function recorrerOCI(descriptor, pila = new Set()) {
    const nombre = blob(descriptor);
    assert.ok(!pila.has(nombre), 'Ciclo en manifiestos OCI');
    if (visitados.has(nombre)) return;
    const datos = leerJson(nombre);
    const siguiente = new Set([...pila, nombre]);
    if (Array.isArray(datos.manifests) && datos.manifests.length) {
      for (const hijo of datos.manifests) recorrerOCI(hijo, siguiente);
    } else if (Array.isArray(datos.layers) && datos.layers.length && datos.config) {
      inspeccionarConfig(blob(datos.config));
      for (const capa of datos.layers) inspeccionarCapa(blob(capa), capa.mediaType);
    } else throw new Error('Manifiesto OCI no inspeccionable');
    visitados.add(nombre);
  }

  const formatos = [];
  if (miembros.has('manifest.json')) {
    const manifest = leerJson('manifest.json');
    assert.ok(Array.isArray(manifest) && manifest.length, 'Manifiesto Docker inválido');
    for (const imagen of manifest) {
      assert.ok(typeof imagen.Config === 'string' && Array.isArray(imagen.Layers) && imagen.Layers.length, 'Imagen Docker no inspeccionable');
      inspeccionarConfig(imagen.Config);
      for (const capa of imagen.Layers) inspeccionarCapa(capa);
    }
    formatos.push('docker');
  }
  if (miembros.has('index.json')) {
    const indice = leerJson('index.json');
    assert.ok(Array.isArray(indice.manifests) && indice.manifests.length, 'Índice OCI inválido');
    for (const descriptor of indice.manifests) recorrerOCI(descriptor);
    formatos.push('oci');
  }
  assert.ok(formatos.length && capas.size && configuraciones.size, 'Formato de imagen no inspeccionable');
  assert.ok(controlPresente, 'Control público ausente de la imagen');
  return { formato: formatos.join('+'), capasInspeccionadas: capas.size, configuracionesInspeccionadas: configuraciones.size, controlPublico: true, privados: 0 };
}

export function construirEInspeccionar(preparado, dockerfile) {
  const tag = `docker-laws-verificacion-${randomUUID()}:prueba`;
  let creada = false;
  try {
    const archivoDocker = dockerfile ? '-' : join(preparado.contexto, 'Dockerfile');
    ejecutar('docker', ['buildx', 'build', '--load', '--tag', tag, '--file', archivoDocker, preparado.contexto], dockerfile ? { input: dockerfile } : {});
    creada = true;
    const imagen = ejecutar('docker', ['image', 'inspect', tag, '--format', '{{.Id}}']).trim();
    const archivo = join(preparado.temporal, 'imagen.tar');
    ejecutar('docker', ['image', 'save', '--output', archivo, tag]);
    return { imagen, ...inspeccionarArchivo(archivo, preparado) };
  } finally {
    if (creada) ejecutar('docker', ['image', 'rm', tag]);
  }
}

export function argumentos(args) {
  let modo;
  let componente;
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--modo' && modo === undefined) modo = args[i + 1];
    else if (args[i] === '--componente' && componente === undefined) {
      const valor = args[i + 1];
      if (!valor || valor.startsWith('-')) {
        throw new Error('La opción --componente requiere un valor: backend o frontend.');
      }
      componente = valor;
    }
    else throw new Error('Uso: --modo contexto|imagenes [--componente backend|frontend]');
  }
  assert.ok(['contexto', 'imagenes'].includes(modo), 'Modo inválido');
  assert.ok(componente === undefined || componentes.includes(componente), 'Componente inválido');
  return { modo, seleccionados: componente ? [componente] : componentes };
}

async function main() {
  const { modo, seleccionados } = argumentos(process.argv.slice(2));
  const herramientas = preflight();
  const runtime = modo === 'imagenes' ? comprobarRuntimeImagen() : undefined;
  for (const componente of seleccionados) {
    const preparado = prepararContexto(componente);
    try {
      const contexto = verificarContexto(preparado);
      const imagen = modo === 'imagenes' ? construirEInspeccionar(preparado) : undefined;
      console.log(JSON.stringify({ herramientas, runtime, ...contexto, imagen,
        politicaSha256: createHash('sha256').update(readFileSync(join(preparado.contexto, '.dockerignore'))).digest('hex'),
        marcadoresFicticios: preparado.fixtures, control: preparado.control, archivosPublicos: preparado.requeridos,
      }));
    } finally {
      limpiarTemporal(preparado.temporal);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
