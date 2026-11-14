import type { Request, Response } from 'express';
import type { AlmacenFormularios } from '../data/formularios-guardados';
import { validarFormulario } from '../validations/formulario.validation';

export function crearControladorFormularios(almacen: AlmacenFormularios) {
  return {
    getFormularios(_req: Request, res: Response): Response {
      return res.status(200).json(almacen.listar());
    },
    getFormulario(req: Request<{ id: string }>, res: Response): Response {
      const formulario = almacen.buscar(Number(req.params.id));
      if (!formulario) {
        return res.status(404).json({ message: 'Formulario no encontrado' });
      }
      return res.status(200).json(formulario);
    },
    createFormulario(req: Request, res: Response): Response {
      const entrada: unknown = req.body;
      const resultado = validarFormulario(entrada);
      if (!resultado.ok) {
        return res.status(400).json({ message: resultado.message });
      }
      return res.status(201).json(almacen.crear(resultado.datos));
    },
  };
}
