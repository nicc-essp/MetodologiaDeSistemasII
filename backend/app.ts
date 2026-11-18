import express from 'express';
import cors from 'cors';
import { isUtf8 } from 'node:buffer';
import healthRouter from './routes/health.routes';
import { crearRouterFormularios } from './routes/formulario.routes';
import { crearAlmacenFormularios } from './data/formularios-guardados';
import type { AlmacenFormularios } from './data/formularios-guardados';
import { manejarErrores } from './middleware/error.middleware';
import { parsearOrigenes } from './config/app.config';

export function createApp({ almacen = crearAlmacenFormularios(), allowedOrigins = parsearOrigenes() }: {
  almacen?: AlmacenFormularios;
  allowedOrigins?: string[];
} = {}) {
  const app = express();
  app.use(cors({ origin: allowedOrigins }));
  app.use(express.json({ limit: '100kb', strict: true, verify: (_req, _res, cuerpo, encoding) => {
    if (encoding === 'utf-8' && !isUtf8(cuerpo)) {
      throw Object.assign(new Error('El cuerpo contiene UTF-8 inválido'), { status: 400 });
    }
  } }));
  app.use('/health', healthRouter);
  app.use('/formulario', crearRouterFormularios(almacen));
  app.use(manejarErrores);
  return app;
}
