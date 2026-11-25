export type ResultadoValidacionAuth<T> = { ok: true; datos: T } | { ok: false; message: string };

export interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string';
}

function limpiar(valor: string): string {
  return valor.trim();
}

export function validarRegistro(entrada: unknown): ResultadoValidacionAuth<DatosRegistro> {
  if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON' };
  }
  const valores = entrada as Record<string, unknown>;
  const campos = ['nombre', 'email', 'password'] as const;
  if (campos.some(campo => !valores[campo] || (esTexto(valores[campo]) && !valores[campo].trim()))) {
    return { ok: false, message: 'Faltan campos obligatorios' };
  }
  if (campos.some(campo => !esTexto(valores[campo]))) {
    return { ok: false, message: 'Los campos de la cuenta deben ser texto' };
  }
  if (campos.some(campo => /[\u0000\uD800-\uDFFF]/u.test(valores[campo] as string))) {
    return { ok: false, message: 'Los campos de la cuenta contienen caracteres no válidos' };
  }
  const nombre = limpiar(valores.nombre as string);
  const email = limpiar(valores.email as string);
  const password = valores.password as string;
  if (!/^[^\s@]+@[^\s@]+$/u.test(email)) {
    return { ok: false, message: 'El correo electrónico no tiene un formato válido' };
  }
  if (Object.hasOwn(valores, 'tipo') && (!esTexto(valores.tipo) || limpiar(valores.tipo) !== 'cliente')) {
    return { ok: false, message: 'El tipo de cuenta no es válido' };
  }
  if (password.length < 8) {
    return { ok: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  return { ok: true, datos: { nombre, email, password } };
}

export function validarLogin(entrada: unknown): ResultadoValidacionAuth<{ email: string; password: string }> {
  if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON' };
  }
  const valores = entrada as Record<string, unknown>;
  if (!valores.email || !valores.password || (esTexto(valores.email) && !valores.email.trim())) {
    return { ok: false, message: 'Faltan campos obligatorios' };
  }
  if (!esTexto(valores.email) || !esTexto(valores.password)) {
    return { ok: false, message: 'Los campos de la cuenta deben ser texto' };
  }
  return { ok: true, datos: { email: limpiar(valores.email), password: valores.password } };
}
