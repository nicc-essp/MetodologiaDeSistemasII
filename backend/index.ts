import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Sequelize } from 'sequelize';
import { createApp } from './app';
import { parsearIdsRepresentantes, parsearOrigenes, parsearProxiesConfiables, parsearPuerto } from './config/app.config';
import { leerConfiguracionPostgres } from './config/database.config';
import { crearConexionPostgres } from './database/connection';
import { prepararAlmacenPostgres } from './data/formularios-postgres';
import { prepararAlmacenCuentasPostgres } from './data/cuentas-postgres';

export async function iniciarServidor({ env = process.env, puerto, host = '0.0.0.0' }: {
  env?: NodeJS.ProcessEnv; puerto?: number; host?: string;
} = {}) {
  let conexion: Sequelize | undefined;
  let etapa = 'validar PORT';
  try {
    const puertoHttp = puerto ?? parsearPuerto(env.PORT);
    etapa = 'validar la configuración CORS y AUTH_REPRESENTANTES_IDS';
    const representantesHabilitados = parsearIdsRepresentantes(env.AUTH_REPRESENTANTES_IDS);
    const allowedOrigins = parsearOrigenes(env.CORS_ORIGINS);
    const enRender = env.RENDER === 'true';
    if (enRender) {
      etapa = 'validar POSTGRES_TARGET=supabase-dev para Render';
      if (env.POSTGRES_TARGET !== 'supabase-dev') throw new Error();
      etapa = 'validar orígenes HTTPS explícitos en CORS_ORIGINS para Render';
      if (!env.CORS_ORIGINS?.trim() || allowedOrigins.some(origen => !origen.startsWith('https://'))) throw new Error();
    }
    etapa = 'validar TRUST_PROXY_CIDRS';
    const proxiesConfiables = parsearProxiesConfiables(env.TRUST_PROXY_CIDRS);
    etapa = 'validar la configuración PostgreSQL';
    const config = leerConfiguracionPostgres('aplicacion', env);
    conexion = crearConexionPostgres(config);
    etapa = 'conectar a PostgreSQL con el rol de aplicación';
    await conexion.authenticate();
    etapa = 'comprobar el esquema y los permisos de consultas (ejecutá db:migrate explícitamente)';
    const almacen = await prepararAlmacenPostgres(conexion);
    etapa = 'comprobar el esquema y los permisos de cuentas (ejecutá db:migrate explícitamente)';
    const cuentas = await prepararAlmacenCuentasPostgres(conexion);
    const servidor = createServer(createApp({
      almacen, cuentas, allowedOrigins, representantesHabilitados, proxiesConfiables, enRender,
      exigirHttpsCuentas: enRender || env.NODE_ENV === 'production',
    }));
    etapa = 'abrir el puerto HTTP';
    await new Promise<void>((resolve, reject) => {
      servidor.once('error', reject);
      servidor.listen(puertoHttp, host, () => { servidor.off('error', reject); resolve(); });
    });
    const base = conexion;
    let cierre: Promise<void> | undefined;
    return {
      servidor,
      cerrar(): Promise<void> {
        cierre ??= cerrarServidor(servidor, base);
        return cierre;
      },
    };
  } catch {
    try { await conexion?.close(); } finally {
      throw new Error(`No se pudo iniciar el backend al ${etapa}. No se habilitó almacenamiento en memoria.`);
    }
  }
}

async function cerrarServidor(servidor: Server, conexion: Sequelize): Promise<void> {
  const limite = setTimeout(() => servidor.closeAllConnections(), 5000);
  limite.unref();
  try {
    await new Promise<void>((resolve, reject) => servidor.close(error => error ? reject(error) : resolve()));
  } finally {
    clearTimeout(limite);
    await conexion.close();
  }
}

async function main() {
  try {
    const servicio = await iniciarServidor();
    const direccion = servicio.servidor.address();
    if (direccion && typeof direccion !== 'string') {
      console.log(`Backend escuchando en ${direccion.address}:${direccion.port}.`);
    }
    const detener = () => {
      void servicio.cerrar().then(() => {
        console.log('Backend detenido.');
      }).catch(() => {
        console.error('No se pudo completar el cierre ordenado del backend.');
        process.exitCode = 1;
      }).finally(() => {
        process.off('SIGINT', detener);
        process.off('SIGTERM', detener);
      });
    };
    process.once('SIGINT', detener);
    process.once('SIGTERM', detener);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'No se pudo iniciar el backend.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) void main();
