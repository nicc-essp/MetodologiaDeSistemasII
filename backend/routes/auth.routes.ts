import { Router } from 'express';
import { crearControladorAuth } from '../controllers/auth.controller';
import { limitarSolicitudes } from '../middleware/limite-solicitudes.middleware';
import type { ServicioAuth } from '../services/auth.service';

export function crearRouterAuth(servicio: ServicioAuth) {
  const router = Router();
  const controlador = crearControladorAuth(servicio);
  router.post('/register', limitarSolicitudes(5, 40), controlador.registerUser);
  router.post('/login', limitarSolicitudes(10, 120), controlador.loginUser);
  router.get('/me', controlador.me);
  router.post('/logout', controlador.logoutUser);
  return router;
}
