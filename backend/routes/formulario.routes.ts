import { Router } from 'express';
import { crearControladorFormularios } from '../controllers/formulario.controller';
import type { AlmacenFormularios } from '../data/formularios-guardados';
import { exigirLecturaConsultas } from '../middleware/sesion.middleware';
import type { ServicioAuth } from '../services/auth.service';

export function crearRouterFormularios(almacen: AlmacenFormularios, servicioAuth: ServicioAuth) {
  const router = Router();
  const controlador = crearControladorFormularios(almacen);
  const autorizarLectura = exigirLecturaConsultas(servicioAuth);
  router.get('/', autorizarLectura, controlador.getFormularios);
  router.get('/:id', autorizarLectura, controlador.getFormulario);
  router.post('/', controlador.createFormulario);
  return router;
}
