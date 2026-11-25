export function parsearOrigenes(valor?: string): string[] {
  if (!valor?.trim()) return ['http://localhost:5173'];
  try {
    const origenes = valor.split(',').map(entrada => {
      const origen = entrada.trim();
      if (!origen || origen.includes('?') || origen.includes('#')) throw new Error();
      const url = new URL(origen);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
        || url.pathname !== '/' || url.search || url.hash) throw new Error();
      return url.origin;
    });
    return [...new Set(origenes)];
  } catch {
    throw new Error('CORS_ORIGINS debe contener orígenes HTTP(S) válidos separados por comas.');
  }
}

export function parsearIdsRepresentantes(valor?: string): ReadonlySet<number> {
  if (!valor?.trim()) return new Set();
  const ids = valor.split(',').map(entrada => {
    const texto = entrada.trim();
    const id = Number(texto);
    if (!/^[1-9][0-9]*$/.test(texto) || id > 2147483647) {
      throw new Error('AUTH_REPRESENTANTES_IDS debe contener IDs enteros positivos de PostgreSQL separados por comas.');
    }
    return id;
  });
  return new Set(ids);
}
