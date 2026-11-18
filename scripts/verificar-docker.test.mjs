import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argumentos, comprobarRuntimeImagen, construirEInspeccionar, crearTemporal, ejecutar, inspeccionarArchivo, limpiarTemporal, prepararContexto, preflight, validarRuntime, verificarContexto } from './verificar-docker.mjs';

const exclusionesSinteticas = ['.env*', '**/.env*', '.npmrc', '**/.npmrc', '.netrc', '**/.netrc',
  '*.key', '**/*.key', '*.pem', '**/*.pem', '*.p12', '**/*.p12', '*.pfx', '**/*.pfx',
  'id_rsa', '**/id_rsa', 'id_ed25519', '**/id_ed25519', 'secrets', '**/secrets'].join('\n');

function conContextoSintetico(ignore, run) {
  const fuentes = crearTemporal();
  let preparado;
  try {
    const backend = join(fuentes, 'backend');
    mkdirSync(join(backend, 'validations'), { recursive: true });
    for (const [path, contenido] of Object.entries({
      'package.json': '{"name":"fixture-sintetico"}', 'pnpm-lock.yaml': 'lockfileVersion: 9.0',
      'pnpm-workspace.yaml': 'allowBuilds: {}', 'Dockerfile': 'FROM scratch\nCOPY . /app\n',
      '.dockerignore': ignore, 'index.ts': 'export {};',
      '.env': 'PRIVADO_FICTICIO_ORIGINAL', 'validations/nueva.ts': 'export {};',
      'validations/ficticia.pem': 'PRIVADO_FICTICIO_ORIGINAL',
    })) writeFileSync(join(backend, path), contenido);
    preparado = prepararContexto('backend', fuentes);
    return run(preparado);
  } finally {
    if (preparado) limpiarTemporal(preparado.temporal);
    limpiarTemporal(fuentes);
  }
}

test('preparacion: copia fuentes nuevas sin Git y excluye privados antes de insertar fixtures', () => {
  conContextoSintetico('', preparado => {
    assert.ok(existsSync(join(preparado.contexto, 'validations/nueva.ts')));
    assert.ok(!existsSync(join(preparado.contexto, 'validations/ficticia.pem')));
    assert.ok(!readFileSync(join(preparado.contexto, '.env'), 'utf8').includes('PRIVADO_FICTICIO_ORIGINAL'));
    assert.equal(preparado.fixtures.length, 24);
    assert.equal(new Set(preparado.fixtures.map(fixture => fixture.marcador)).size, 24);
    for (const fixture of preparado.fixtures) assert.ok(readFileSync(join(preparado.contexto, fixture.path), 'utf8').includes(fixture.marcador));
    assert.equal(readFileSync(join(preparado.contexto, preparado.control.path), 'utf8'), preparado.control.marcador);
  });
});

test('preparacion: importación sin CLI ni Docker, argumentos y runtime comprobables', () => {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    'import "./scripts/verificar-docker.mjs"; console.log("importado");'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'importado');
  assert.deepEqual(argumentos(['--modo', 'contexto', '--componente', 'backend']), { modo: 'contexto', seleccionados: ['backend'] });
  assert.deepEqual(argumentos(['--modo', 'imagenes']).seleccionados, ['backend', 'frontend']);
  assert.throws(() => argumentos(['--modo', 'contexto', '--componente', 'otro']));
  assert.throws(() => argumentos(['--modo', 'contexto', '--otro', 'dato']));
  validarRuntime('22.23.4');
  assert.throws(() => validarRuntime('22.22.1'));
  assert.throws(() => validarRuntime('20.20.0'));
  assert.throws(() => limpiarTemporal(process.cwd()));
});

for (const modo of ['contexto', 'imagenes']) {
  test(`argumentos: ${modo} conserva ambos componentes cuando no hay selector`, () => {
    assert.deepEqual(argumentos(['--modo', modo]), { modo, seleccionados: ['backend', 'frontend'] });
  });
  for (const componente of ['backend', 'frontend']) {
    test(`argumentos: ${modo}/${componente} conserva ambos órdenes válidos`, () => {
      const esperado = { modo, seleccionados: [componente] };
      assert.deepEqual(argumentos(['--modo', modo, '--componente', componente]), esperado);
      assert.deepEqual(argumentos(['--componente', componente, '--modo', modo]), esperado);
    });
  }
}

for (const args of [
  ['--modo', 'contexto', '--componente'],
  ['--modo', 'imagenes', '--componente'],
  ['--modo', 'contexto', '--componente', ''],
  ['--componente', '--modo', 'contexto'],
  ['--modo', 'contexto', '--componente', '--modo', 'imagenes'],
  ['--modo', 'contexto', '--componente', '--desconocida'],
  ['--modo', 'contexto', '--componente', '-h'],
  ['--modo', 'contexto', '--componente', '--componente', 'backend'],
]) {
  test(`argumentos: rechaza valor ausente u opción posterior ${JSON.stringify(args)}`, () => {
    assert.throws(() => argumentos(args), { message: 'La opción --componente requiere un valor: backend o frontend.' });
  });
}

test('argumentos: la CLI rechaza --componente sin valor antes de consultar Docker', () => {
  const entorno = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toLowerCase() !== 'path'));
  const result = spawnSync(process.execPath, [
    'scripts/verificar-docker.mjs', '--modo', 'contexto', '--componente',
  ], { encoding: 'utf8', env: { ...entorno, PATH: '' } });
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.trim(), 'La opción --componente requiere un valor: backend o frontend.');
});

test('contexto: Docker real acepta exclusión sintética y conserva controles públicos', () => {
  preflight();
  conContextoSintetico(exclusionesSinteticas, preparado => {
    assert.deepEqual(verificarContexto(preparado), { componente: 'backend', fixtures: 24, controlPublico: true, privados: 0 });
  });
});

test('contexto: Docker real rechaza un fixture deliberadamente no excluido', () => {
  preflight();
  conContextoSintetico('', preparado => {
    assert.throws(() => verificarContexto(preparado), /Fixture privado presente/);
  });
});

function conArchivoSintetico(formato, opciones, run) {
  const temporal = crearTemporal();
  try {
    const preparado = {
      fixtures: [{ path: '.env', marcador: `SINTETICO_${randomUUID()}` }],
      control: { path: 'control.txt', marcador: `PUBLICO_${randomUUID()}` },
    };
    const contenido = join(temporal, 'contenido');
    const estructura = join(temporal, 'estructura');
    mkdirSync(join(contenido, 'app'), { recursive: true });
    mkdirSync(estructura);
    writeFileSync(join(contenido, 'app/control.txt'), preparado.control.marcador);
    if (opciones.fuga) writeFileSync(join(contenido, 'app/renombrado.txt'), preparado.fixtures[0].marcador);
    if (opciones.borrada) writeFileSync(join(contenido, 'app/.env'), preparado.fixtures[0].marcador);
    const capa = join(temporal, formato === 'oci' ? 'capa.tar.gz' : 'capa.tar');
    ejecutar('tar', [formato === 'oci' ? '-czf' : '-cf', capa, '-C', contenido, '.']);
    const datosCapa = opciones.corrupta ? Buffer.from('FORMATO_NO_INSPECCIONABLE') : readFileSync(capa);
    const config = Buffer.from(JSON.stringify({ architecture: 'amd64', os: 'linux', config: {
      Env: opciones.configFuga ? [`FICTICIO=${preparado.fixtures[0].marcador}`] : [],
    } }));

    if (formato === 'docker') {
      writeFileSync(join(estructura, 'config.json'), config);
      writeFileSync(join(estructura, 'capa.tar'), datosCapa);
      const capas = ['capa.tar'];
      if (opciones.borrada) {
        const ultima = join(temporal, 'ultima');
        mkdirSync(join(ultima, 'app'), { recursive: true });
        writeFileSync(join(ultima, 'app/.wh..env'), '');
        ejecutar('tar', ['-cf', join(estructura, 'ultima.tar'), '-C', ultima, '.']);
        capas.push('ultima.tar');
      }
      writeFileSync(join(estructura, 'manifest.json'), JSON.stringify([{ Config: 'config.json', Layers: opciones.ausente ? ['no-existe.tar'] : capas }]));
    } else if (formato === 'oci') {
      mkdirSync(join(estructura, 'blobs/sha256'), { recursive: true });
      const guardar = datos => {
        const hash = createHash('sha256').update(datos).digest('hex');
        writeFileSync(join(estructura, 'blobs/sha256', hash), datos);
        return { digest: `sha256:${hash}`, size: datos.length };
      };
      const descriptorConfig = guardar(config);
      const descriptorCapa = guardar(datosCapa);
      const manifest = guardar(Buffer.from(JSON.stringify({ schemaVersion: 2,
        config: { ...descriptorConfig, mediaType: 'application/vnd.oci.image.config.v1+json' },
        layers: [{ ...descriptorCapa, mediaType: 'application/vnd.oci.image.layer.v1.tar+gzip' }],
      })));
      const manifests = [{ ...manifest, mediaType: 'application/vnd.oci.image.manifest.v1+json' }];
      if (opciones.procedencia) {
        const procedencia = guardar(Buffer.from(JSON.stringify({
          _type: 'https://in-toto.io/Statement/v0.1',
          predicate: opciones.procedenciaFuga ? { dato: preparado.fixtures[0].marcador } : {},
        })));
        const manifestProcedencia = guardar(Buffer.from(JSON.stringify({ schemaVersion: 2,
          config: descriptorConfig, layers: [{ ...procedencia, mediaType: 'application/vnd.in-toto+json' }],
        })));
        manifests.push({ ...manifestProcedencia, mediaType: 'application/vnd.oci.image.manifest.v1+json' });
      }
      writeFileSync(join(estructura, 'index.json'), JSON.stringify({ schemaVersion: 2, manifests }));
      writeFileSync(join(estructura, 'oci-layout'), '{"imageLayoutVersion":"1.0.0"}');
    } else writeFileSync(join(estructura, 'desconocido.txt'), 'sin manifiesto');
    const archivo = join(temporal, 'imagen.tar');
    ejecutar('tar', ['-cf', archivo, '-C', estructura, '.']);
    return run(archivo, preparado);
  } finally {
    limpiarTemporal(temporal);
  }
}

for (const formato of ['docker', 'oci']) {
  test(`inspector: archivo ${formato} limpio, incluye gzip OCI y control público`, () => {
    conArchivoSintetico(formato, {}, (archivo, preparado) => {
      assert.deepEqual(inspeccionarArchivo(archivo, preparado), {
        formato, capasInspeccionadas: 1, configuracionesInspeccionadas: 1, controlPublico: true, privados: 0,
      });
    });
  });
}

for (const [nombre, formato, opciones] of [
  ['contenido renombrado', 'docker', { fuga: true }],
  ['configuración', 'oci', { configFuga: true }],
  ['capa anterior aunque se borre después', 'docker', { borrada: true }],
]) {
  test(`inspector: detecta marcador ficticio en ${nombre}`, () => {
    conArchivoSintetico(formato, opciones, (archivo, preparado) => {
      assert.throws(() => inspeccionarArchivo(archivo, preparado), /privado/);
    });
  });
}

for (const [formato, opciones] of [['oci', { corrupta: true }], ['docker', { ausente: true }], ['otro', {}]]) {
  test(`inspector: falla cerrado en archivo no verificable ${formato}/${JSON.stringify(opciones)}`, () => {
    conArchivoSintetico(formato, opciones, (archivo, preparado) => {
      assert.throws(() => inspeccionarArchivo(archivo, preparado));
    });
  });
}

test('inspector: recorre procedencia OCI JSON y detecta fugas también allí', () => {
  conArchivoSintetico('oci', { procedencia: true }, (archivo, preparado) => {
    assert.equal(inspeccionarArchivo(archivo, preparado).capasInspeccionadas, 2);
  });
  conArchivoSintetico('oci', { procedencia: true, procedenciaFuga: true }, (archivo, preparado) => {
    assert.throws(() => inspeccionarArchivo(archivo, preparado), /privado/);
  });
});

test('imagen real: contexto limpio conserva control público y no confunde certificados', () => {
  conContextoSintetico(exclusionesSinteticas, preparado => {
    const resultado = construirEInspeccionar(preparado, 'FROM scratch\nCOPY . /app\n');
    assert.equal(resultado.privados, 0);
    assert.equal(resultado.controlPublico, true);
    assert.ok(resultado.capasInspeccionadas >= 1);
  });
});

test('imagen real: el detector encuentra la fuga sintética deliberada', () => {
  conContextoSintetico('', preparado => {
    assert.throws(() => construirEInspeccionar(preparado, 'FROM scratch\nCOPY . /app\n'), /privado/);
  });
});

test('imagen real: detecta un marcador en configuración aunque el contexto lo excluya', () => {
  conContextoSintetico(exclusionesSinteticas, preparado => {
    const dockerfile = `FROM scratch\nENV FICTICIO=${preparado.fixtures[0].marcador}\nCOPY . /app\n`;
    assert.throws(() => construirEInspeccionar(preparado, dockerfile), /privado/);
  });
});

test('imagen real: detecta el secreto ficticio borrado en una capa posterior', () => {
  comprobarRuntimeImagen();
  conContextoSintetico('', preparado => {
    const dockerfile = `FROM node:22-alpine\nCOPY .env /app/.env\nRUN rm /app/.env\nCOPY ${preparado.control.path} /app/${preparado.control.path}\n`;
    assert.throws(() => construirEInspeccionar(preparado, dockerfile), /privado/);
  });
});
