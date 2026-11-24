import { Router } from 'express';
import { crearControladorAuth } from '../controllers/auth.controller';
import type { ServicioAuth } from '../services/auth.service';

export function crearRouterAuth(servicio: ServicioAuth) {
  const router = Router();
  const controlador = crearControladorAuth(servicio);
  router.post('/register', controlador.registerUser);
  router.post('/login', controlador.loginUser);
  router.get('/me', controlador.me);
  router.post('/logout', controlador.logoutUser);
  return router;
}
