import type { EntradaFormulario } from '../models/formulario';

const campos = ['nombre', 'apellido', 'dni', 'telefono', 'email', 'asunto', 'mensaje'] as const;
type ResultadoValidacion = { ok: true; datos: EntradaFormulario } | { ok: false; message: string };

export function validarFormulario(entrada: unknown): ResultadoValidacion {
  if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return { ok: false, message: 'El cuerpo debe ser un objeto JSON' };
  }
  const valores = entrada as Record<string, unknown>;
  if (campos.some(campo => !valores[campo] || (typeof valores[campo] === 'string' && !valores[campo].trim()))) {
    return { ok: false, message: 'Faltan campos obligatorios' };
  }
  if (campos.some(campo => typeof valores[campo] !== 'string')) {
    return { ok: false, message: 'Los campos del formulario deben ser texto' };
  }
  // En modo Unicode, un par sustituto válido es un punto de código; solo coinciden los aislados.
  if (campos.some(campo => /[\u0000\uD800-\uDFFF]/u.test(valores[campo] as string))) {
    return { ok: false, message: 'Los campos del formulario contienen caracteres no válidos' };
  }
  // Los campos ya fueron comprobados; proyectar evita conservar propiedades desconocidas.
  const datos = Object.fromEntries(campos.map(campo => [campo, valores[campo]])) as EntradaFormulario;
  if (!/^[^\s@]+@[^\s@]+$/u.test(datos.email)) {
    return { ok: false, message: 'El correo electrónico no tiene un formato válido' };
  }
  return { ok: true, datos };
}
