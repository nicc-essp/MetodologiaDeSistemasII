import type { Request, Response } from 'express';
import type { AlmacenFormularios } from '../data/formularios-guardados';
import { validarFormulario } from '../validations/formulario.validation';

export function crearControladorFormularios(almacen: AlmacenFormularios) {
  return {
    async getFormularios(_req: Request, res: Response): Promise<Response> {
      const formularios = await almacen.listar();
      return res.status(200).json(formularios);
    },
    async getFormulario(req: Request<{ id: string }>, res: Response): Promise<Response> {
      const formulario = await almacen.buscar(Number(req.params.id));
      if (!formulario) {
        return res.status(404).json({ message: 'Formulario no encontrado' });
      }
      return res.status(200).json(formulario);
    },
    async createFormulario(req: Request, res: Response): Promise<Response> {
      const entrada: unknown = req.body;
      const resultado = validarFormulario(entrada);
      if (!resultado.ok) {
        return res.status(400).json({ message: resultado.message });
      }
      const formulario = await almacen.crear(resultado.datos);
      return res.status(201).json(formulario);
    },
  };
}
