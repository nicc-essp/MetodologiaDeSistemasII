import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { aislarEntornoPostgresLocal, conPostgresDePruebas } from './postgres.mjs';

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--limpiar')) {
    throw new Error('Uso: node scripts/verificar-migraciones.mjs [--limpiar]. No se admiten destinos externos.');
  }
  for (const archivo of ['tests/database.integration.test.ts', 'tests/formulario.postgres.test.ts']) {
    await conPostgresDePruebas(async entorno => {
      const resultado = spawnSync(process.execPath, ['--import', 'tsx', '--test', archivo], {
        cwd: fileURLToPath(new URL('../backend/', import.meta.url)),
        env: { ...aislarEntornoPostgresLocal(), POSTGRES_HOST: entorno.host, POSTGRES_PORT: String(entorno.port),
          POSTGRES_DB: entorno.database, POSTGRES_SECRETS_DIR: entorno.claves,
          DOCKER_LAWS_TEST_PROJECT: entorno.proyecto },
        encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024,
      });
      if (resultado.stdout) console.log(entorno.ocultar(resultado.stdout).trimEnd());
      if (resultado.stderr) console.error(entorno.ocultar(resultado.stderr).trimEnd());
      if (resultado.error || resultado.status !== 0) throw new Error('Falló la verificación PostgreSQL del backend.');
    }, { limpiar: args[0] === '--limpiar' });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
