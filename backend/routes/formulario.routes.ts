import { Router } from 'express';
import { crearControladorFormularios } from '../controllers/formulario.controller';
import type { AlmacenFormularios } from '../data/formularios-guardados';

export function crearRouterFormularios(almacen: AlmacenFormularios) {
  const router = Router();
  const controlador = crearControladorFormularios(almacen);
  router.get('/', controlador.getFormularios);
  router.get('/:id', controlador.getFormulario);
  router.post('/', controlador.createFormulario);
  return router;
}
