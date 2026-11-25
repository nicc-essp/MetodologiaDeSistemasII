import { isIP } from 'node:net';

export function parsearPuerto(valor?: string): number {
  if (valor === undefined) return 3001;
  const puerto = Number(valor);
  if (!/^[1-9][0-9]{0,4}$/.test(valor) || puerto > 65535) {
    throw new Error('PORT debe ser un entero decimal entre 1 y 65535.');
  }
  return puerto;
}

export function parsearProxiesConfiables(valor?: string): string[] {
  if (!valor?.trim()) return [];
  const proxies = valor.split(',').map(entrada => {
    const proxy = entrada.trim();
    const [direccion, prefijo, resto] = proxy.split('/');
    const familia = isIP(direccion);
    const ipv4Mapeada = familia === 6 && !direccion.includes('%')
      && new URL(`http://[${direccion}]`).hostname.startsWith('[::ffff:');
    if (!familia || direccion.includes('%') || ipv4Mapeada || resto !== undefined
      || (prefijo !== undefined && (!/^[1-9][0-9]{0,2}$/.test(prefijo)
        || Number(prefijo) > (familia === 4 ? 32 : 128)))) {
      throw new Error('TRUST_PROXY_CIDRS debe contener direcciones IPv4, IPv6 o CIDR explícitas separadas por comas.');
    }
    return proxy;
  });
  return [...new Set(proxies)];
}

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
