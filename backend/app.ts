import express from 'express';
import cors from 'cors';
import { isUtf8 } from 'node:buffer';
import healthRouter from './routes/health.routes';
import { crearRouterFormularios } from './routes/formulario.routes';
import { crearAlmacenFormularios } from './data/formularios-guardados';
import type { AlmacenFormularios } from './data/formularios-guardados';
import { crearAlmacenCuentas } from './data/cuentas-guardadas';
import type { AlmacenCuentas } from './data/cuentas-guardadas';
import { manejarErrores } from './middleware/error.middleware';
import { parsearOrigenes } from './config/app.config';
import { crearRouterAuth } from './routes/auth.routes';
import { crearServicioAuth } from './services/auth.service';
import { protegerTransporteCuenta } from './middleware/sesion.middleware';

export function createApp({
  almacen = crearAlmacenFormularios(),
  cuentas = crearAlmacenCuentas(),
  allowedOrigins = parsearOrigenes(),
  representantesHabilitados = new Set<number>(),
  exigirHttpsCuentas = false,
  proxiesConfiables = [],
  enRender = false,
}: {
  almacen?: AlmacenFormularios;
  cuentas?: AlmacenCuentas;
  allowedOrigins?: string[];
  representantesHabilitados?: ReadonlySet<number>;
  exigirHttpsCuentas?: boolean;
  proxiesConfiables?: string[];
  enRender?: boolean;
} = {}) {
  const app = express();
  if (proxiesConfiables.length) {
    app.set('trust proxy', proxiesConfiables);
  } else if (enRender) {
    app.set('trust proxy', 1);
  }
  const servicioAuth = crearServicioAuth(cuentas, representantesHabilitados);
  const protegerCuenta = protegerTransporteCuenta(exigirHttpsCuentas);
  app.use(cors({ origin: allowedOrigins }));
  app.use('/auth', protegerCuenta);
  app.use(express.json({ limit: '100kb', strict: true, verify: (_req, _res, cuerpo, encoding) => {
    if (encoding === 'utf-8' && !isUtf8(cuerpo)) {
      throw Object.assign(new Error('El cuerpo contiene UTF-8 inválido'), { status: 400 });
    }
  } }));
  app.use('/health', healthRouter);
  app.use('/formulario', crearRouterFormularios(almacen, servicioAuth, protegerCuenta));
  app.use('/auth', crearRouterAuth(servicioAuth));
  app.use(manejarErrores);
  return app;
}
