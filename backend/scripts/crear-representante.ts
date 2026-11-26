import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from '../database/connection';
import { ErrorCuenta } from '../data/cuentas-guardadas';
import { prepararAlmacenCuentasPostgres } from '../data/cuentas-postgres';
import { crearCuenta } from '../services/auth.service';
import { validarRegistro } from '../validations/auth.validation';

class ErrorUsoAltaRepresentante extends Error {}

export function leerConfiguracionAltaRepresentante(
  args: readonly string[], env: NodeJS.ProcessEnv = process.env,
) {
  const [archivo, opcion, referencia] = args;
  const destino = env.POSTGRES_TARGET ?? 'local';
  if (!archivo || archivo.startsWith('--') || (destino === 'local' && args.length !== 1)) {
    throw new ErrorUsoAltaRepresentante('Indicá únicamente la ruta de un archivo JSON privado con nombre, email y password.');
  }
  if (destino !== 'local' && destino !== 'supabase-dev') {
    throw new ErrorUsoAltaRepresentante('El alta solo admite los destinos PostgreSQL local y supabase-dev.');
  }
  if (destino === 'supabase-dev' &&
    (args.length !== 3 || opcion !== '--supabase-project' || !referencia || referencia !== env.SUPABASE_PROJECT_REF)) {
    throw new ErrorUsoAltaRepresentante('Supabase requiere --supabase-project REF coincidente con SUPABASE_PROJECT_REF.');
  }

  const config = leerConfiguracionPostgres('aplicacion', env);
  if (config.destino === 'local' && !['127.0.0.1', '::1'].includes(config.host)) {
    throw new ErrorUsoAltaRepresentante('El alta local requiere una dirección de loopback literal (127.0.0.1 o ::1).');
  }
  return { archivo, config };
}

async function main() {
  let etapa = 'validar la configuración PostgreSQL';
  try {
    const { archivo, config } = leerConfiguracionAltaRepresentante(process.argv.slice(2));

    etapa = 'leer el JSON privado de la cuenta';
    const entrada: unknown = JSON.parse(await readFile(archivo, 'utf8'));
    etapa = 'validar nombre, email y contraseña de la cuenta';
    const resultado = validarRegistro(entrada);
    if (!resultado.ok || Object.hasOwn(entrada as object, 'tipo')) {
      throw new Error();
    }

    etapa = 'crear la cuenta con el rol de aplicación en el esquema migrado';
    const conexion = crearConexionPostgres(config);
    let id: number;
    try {
      const cuentas = await prepararAlmacenCuentasPostgres(conexion);
      ({ id } = await crearCuenta(cuentas, resultado.datos, 'representante'));
    } finally {
      await conexion.close();
    }
    console.log(id);
  } catch (error) {
    if (error instanceof ErrorUsoAltaRepresentante) {
      console.error(error.message);
    } else if (error instanceof ErrorCuenta && error.status === 409) {
      console.error('Ya existe una cuenta con ese correo. El alta se canceló.');
    } else {
      console.error(`No se pudo preparar el representante al ${etapa}.`);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main();
