import { Router } from 'express';
import type { RequestHandler } from 'express';
import { crearControladorFormularios } from '../controllers/formulario.controller';
import type { AlmacenFormularios } from '../data/formularios-guardados';
import { exigirLecturaConsultas } from '../middleware/sesion.middleware';
import { limitarSolicitudes } from '../middleware/limite-solicitudes.middleware';
import type { ServicioAuth } from '../services/auth.service';

export function crearRouterFormularios(
  almacen: AlmacenFormularios, servicioAuth: ServicioAuth, protegerCuenta: RequestHandler,
) {
  const router = Router();
  const controlador = crearControladorFormularios(almacen);
  const autorizarLectura = exigirLecturaConsultas(servicioAuth);
  router.get('/', protegerCuenta, autorizarLectura, controlador.getFormularios);
  router.get('/:id', protegerCuenta, autorizarLectura, controlador.getFormulario);
  router.post('/', limitarSolicitudes(20, 120), controlador.createFormulario);
  return router;
}
