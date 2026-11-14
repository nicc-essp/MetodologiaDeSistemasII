export function obtenerBaseApi(valor = import.meta.env.VITE_API_BASE_URL) {
  if (valor === undefined || (typeof valor === 'string' && !valor.trim())) return 'http://localhost:3001';
  try {
    if (typeof valor !== 'string') throw new Error();
    const url = new URL(valor.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
      || valor.includes('?') || valor.includes('#')) throw new Error();
    return valor.trim().replace(/\/+$/, '');
  } catch {
    throw new Error('La conexión con el servidor no está configurada correctamente.');
  }
}
