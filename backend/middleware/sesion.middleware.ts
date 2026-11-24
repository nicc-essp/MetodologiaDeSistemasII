import type { Request } from 'express';

export function leerToken(req: Request): string | undefined {
  const encabezado = req.get('authorization');
  if (!encabezado || !encabezado.startsWith('Bearer ')) return undefined;
  const token = encabezado.slice('Bearer '.length).trim();
  return token || undefined;
}
