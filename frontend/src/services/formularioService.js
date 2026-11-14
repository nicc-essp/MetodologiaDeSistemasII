import { obtenerBaseApi } from '../config/apiConfig';

const campos = ['nombre', 'apellido', 'dni', 'telefono', 'email', 'asunto', 'mensaje'];
const mensajesSeguros = new Set([
  'Faltan campos obligatorios',
  'El cuerpo debe ser un objeto JSON',
  'Los campos del formulario deben ser texto',
  'El correo electrónico no tiene un formato válido',
  'El cuerpo contiene JSON inválido',
  'El cuerpo de la solicitud supera el tamaño permitido',
  'Formulario no encontrado',
]);

class ErrorFormulario extends Error {
  constructor(categoria, message = '') {
    super(message);
    this.categoria = categoria;
  }
}

function urlFormulario() {
  try {
    return `${obtenerBaseApi()}/formulario`;
  } catch {
    throw new ErrorFormulario('configuracion');
  }
}

function esFormulario(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    && Number.isInteger(valor.id) && valor.id > 0
    && campos.every(campo => typeof valor[campo] === 'string');
}

async function solicitar(url, options, estadoEsperado, listado = false) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new ErrorFormulario('red');
  }
  if (response.status >= 500) throw new ErrorFormulario('servidor');
  let datos;
  try {
    datos = await response.json();
  } catch {
    throw new ErrorFormulario(response.status >= 400 ? 'validacion' : 'protocolo');
  }
  if (response.status >= 400) {
    const message = mensajesSeguros.has(datos?.message) ? datos.message : '';
    throw new ErrorFormulario('validacion', message);
  }
  const compatible = listado ? Array.isArray(datos) && datos.every(esFormulario) : esFormulario(datos);
  if (response.status !== estadoEsperado || !compatible) throw new ErrorFormulario('protocolo');
  return datos;
}

export function obtenerMensajeError(error, operacion) {
  if (error instanceof ErrorFormulario && error.categoria === 'configuracion') {
    return 'La conexión con el servidor no está configurada correctamente.';
  }
  if (error instanceof ErrorFormulario && error.categoria === 'validacion') {
    return error.message || 'Revise los datos de la consulta e intente nuevamente.';
  }
  return operacion === 'listado'
    ? 'No se pudieron cargar las consultas. Intente nuevamente.'
    : 'No se pudo confirmar el envío. Intente nuevamente.';
}

export async function crearFormulario(formulario) {
  return solicitar(urlFormulario(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formulario)
  }, 201);
}

export async function obtenerFormulario(id) {
  return solicitar(`${urlFormulario()}/${id}`, undefined, 200);
}

export async function obtenerFormularios() {
  return solicitar(urlFormulario(), undefined, 200, true);
}
