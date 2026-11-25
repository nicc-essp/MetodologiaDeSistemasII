import { readFile } from 'node:fs/promises';
import { leerConfiguracionPostgres } from '../config/database.config';
import { crearConexionPostgres } from '../database/connection';
import { ErrorCuenta } from '../data/cuentas-guardadas';
import { prepararAlmacenCuentasPostgres } from '../data/cuentas-postgres';
import { crearCuenta } from '../services/auth.service';
import { validarRegistro } from '../validations/auth.validation';

async function main() {
  const [archivo] = process.argv.slice(2);
  if (!archivo || process.argv.length !== 3) {
    console.error('Indicá únicamente la ruta de un archivo JSON privado con nombre, email y password.');
    process.exitCode = 1;
    return;
  }

  let etapa = 'validar el destino PostgreSQL local';
  try {
    if ((process.env.POSTGRES_TARGET ?? 'local') !== 'local') {
      throw new Error();
    }
    const config = leerConfiguracionPostgres('aplicacion');
    if (!['127.0.0.1', '::1'].includes(config.host)) {
      throw new Error();
    }

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
    console.error(error instanceof ErrorCuenta && error.status === 409
      ? 'Ya existe una cuenta con ese correo. El alta se canceló.'
      : `No se pudo preparar el representante al ${etapa}.`);
    process.exitCode = 1;
  }
}

void main();
