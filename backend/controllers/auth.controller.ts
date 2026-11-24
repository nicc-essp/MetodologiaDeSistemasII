import type { Request, Response } from 'express';
import { ErrorCuenta } from '../data/cuentas-guardadas';
import { leerToken } from '../middleware/sesion.middleware';
import type { ServicioAuth } from '../services/auth.service';
import { validarLogin, validarRegistro } from '../validations/auth.validation';

function responderError(res: Response, error: unknown): Response {
  if (error instanceof ErrorCuenta) {
    return res.status(error.status).json({ message: error.message });
  }
  return res.status(400).json({ message: 'Error al procesar la cuenta' });
}

export function crearControladorAuth(servicio: ServicioAuth) {
  return {
    async registerUser(req: Request, res: Response): Promise<Response> {
      const resultado = validarRegistro(req.body);
      if (!resultado.ok) return res.status(400).json({ message: resultado.message });
      try {
        const usuario = await servicio.registrar(resultado.datos);
        return res.status(201).json(usuario);
      } catch (error) {
        return responderError(res, error);
      }
    },

    async loginUser(req: Request, res: Response): Promise<Response> {
      const resultado = validarLogin(req.body);
      if (!resultado.ok) return res.status(400).json({ message: resultado.message });
      try {
        const sesion = await servicio.iniciarSesion(resultado.datos);
        return res.status(200).json(sesion);
      } catch (error) {
        return responderError(res, error);
      }
    },

    async me(req: Request, res: Response): Promise<Response> {
      try {
        const usuario = await servicio.usuarioDeToken(leerToken(req));
        return res.status(200).json(usuario);
      } catch (error) {
        return responderError(res, error);
      }
    },

    async logoutUser(req: Request, res: Response): Promise<Response> {
      await servicio.cerrarSesion(leerToken(req));
      return res.status(204).end();
    },
  };
}
