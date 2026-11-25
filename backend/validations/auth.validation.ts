export type ResultadoValidacionAuth<T> = { ok: true; datos: T } | { ok: false; message: string };

export interface DatosRegistro {
  nombre: string;
  email: string;
  password: string;
}

type Credenciales = Pick<DatosRegistro, 'email' | 'password'>;
const textoInvalido = /[\u0000\uD800-\uDFFF]/u;

function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string';
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

function faltaTexto(valor: unknown): boolean {
  return !valor || (esTexto(valor) && !valor.trim());
}

function validarCredenciales({ email, password }: Record<string, unknown>): ResultadoValidacionAuth<Credenciales> {
  if (faltaTexto(email) || faltaTexto(password)) {
    return { ok: false, message: 'Faltan campos obligatorios' };
  }
  if (!esTexto(email) || !esTexto(password)) {
    return { ok: false, message: 'Los campos de la cuenta deben ser texto' };
  }
  if (textoInvalido.test(email) || textoInvalido.test(password)) {
    return { ok: false, message: 'Los campos de la cuenta contienen caracteres no válidos' };
  }
  const correo = email.trim();
  if (!/^[^\s@]+@[^\s@]+$/u.test(correo)) {
    return { ok: false, message: 'El correo electrónico no tiene un formato válido' };
  }
  if (password.length < 8) {
    return { ok: false, message: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return { ok: false, message: 'La contraseña no puede superar los 72 bytes en UTF-8' };
  }
  return { ok: true, datos: { email: correo, password } };
}

export function validarRegistro(entrada: unknown): ResultadoValidacionAuth<DatosRegistro> {
  if (!esObjeto(entrada)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON' };
  }
  const { nombre, tipo } = entrada;
  if (faltaTexto(nombre)) {
    return { ok: false, message: 'Faltan campos obligatorios' };
  }
  if (!esTexto(nombre)) {
    return { ok: false, message: 'Los campos de la cuenta deben ser texto' };
  }
  if (textoInvalido.test(nombre)) {
    return { ok: false, message: 'Los campos de la cuenta contienen caracteres no válidos' };
  }
  const credenciales = validarCredenciales(entrada);
  if (!credenciales.ok) return credenciales;
  if (Object.hasOwn(entrada, 'tipo') && (!esTexto(tipo) || tipo.trim() !== 'cliente')) {
    return { ok: false, message: 'El tipo de cuenta no es válido' };
  }
  return { ok: true, datos: { nombre: nombre.trim(), ...credenciales.datos } };
}

export function validarLogin(entrada: unknown): ResultadoValidacionAuth<Credenciales> {
  if (!esObjeto(entrada)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON' };
  }
  return validarCredenciales(entrada);
}
