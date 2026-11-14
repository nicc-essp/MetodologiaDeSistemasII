import type { ErrorRequestHandler } from 'express';

export const manejarErrores: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  const detalle = error && typeof error === 'object'
    ? error as { status?: unknown; type?: unknown }
    : {};
  let status = 500;
  let message = 'Error interno del servidor';
  if (detalle.status === 413 || detalle.type === 'entity.too.large') {
    status = 413;
    message = 'El cuerpo de la solicitud supera el tamaño permitido';
  } else if (detalle.type === 'entity.parse.failed') {
    status = 400;
    message = 'El cuerpo contiene JSON inválido';
  } else if (typeof detalle.status === 'number' && Number.isInteger(detalle.status)
    && detalle.status >= 400 && detalle.status < 500) {
    status = detalle.status;
    message = 'Solicitud inválida';
  }
  res.status(status).json({ message });
};
