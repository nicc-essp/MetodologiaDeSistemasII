import type { Request, RequestHandler } from 'express';
import { ErrorCuenta } from '../data/cuentas-guardadas';
import type { ServicioAuth } from '../services/auth.service';

export function leerToken(req: Request): string | undefined {
  const encabezado = req.get('authorization');
  if (!encabezado || !encabezado.startsWith('Bearer ')) return undefined;
  const token = encabezado.slice('Bearer '.length).trim();
  return token || undefined;
}

export function protegerTransporteCuenta(exigirHttps: boolean): RequestHandler {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (exigirHttps && !req.secure) {
      res.status(403).json({ message: 'Esta operación requiere HTTPS' });
      return;
    }
    next();
  };
}

export function exigirLecturaConsultas(servicio: ServicioAuth): RequestHandler {
  return async (req, res, next) => {
    let usuario;
    try {
      usuario = await servicio.usuarioDeToken(leerToken(req));
    } catch (error) {
      if (error instanceof ErrorCuenta && error.status === 401) {
        res.status(401).json({ message: 'No hay una sesión activa' });
        return;
      }
      throw new Error('Error interno al verificar la sesión', { cause: error });
    }
    if (!usuario.puedeLeerConsultas) {
      res.status(403).json({ message: 'No tiene permiso para consultar los formularios' });
      return;
    }
    next();
  };
}
