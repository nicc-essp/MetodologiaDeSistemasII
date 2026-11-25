import type { RequestHandler } from 'express';

const ventanaMs = 10 * 60 * 1000;

export function limitarSolicitudes(porIp: number, total: number): RequestHandler {
  const intentos = new Map<string, number>();
  let vence = 0;
  let acumuladas = 0;

  return (req, res, next) => {
    const ahora = Date.now();
    if (ahora >= vence) {
      vence = ahora + ventanaMs;
      intentos.clear();
      acumuladas = 0;
    }
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    const usadas = intentos.get(ip) ?? 0;
    if (usadas >= porIp || acumuladas >= total) {
      res.set('Retry-After', String(Math.ceil((vence - ahora) / 1000)));
      res.status(429).json({ message: 'Demasiadas solicitudes. Intentá nuevamente más tarde.' });
      return;
    }
    intentos.set(ip, usadas + 1);
    acumuladas += 1;
    next();
  };
}
