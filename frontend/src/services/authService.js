import { obtenerBaseApi } from '../config/apiConfig';

const claveToken = 'docker-laws-token';
const mensajesSeguros = new Set([
  'Faltan campos obligatorios',
  'El cuerpo debe ser un objeto JSON',
  'Los campos de la cuenta deben ser texto',
  'Los campos de la cuenta contienen caracteres no válidos',
  'El correo electrónico no tiene un formato válido',
  'El tipo de cuenta no es válido',
  'La contraseña debe tener al menos 8 caracteres',
  'El correo electrónico ya está registrado',
  'Credenciales inválidas',
  'No hay una sesión activa',
]);

class ErrorCuenta extends Error {
  constructor(categoria, message = '') {
    super(message);
    this.categoria = categoria;
  }
}

function urlAuth(ruta) {
  try {
    return `${obtenerBaseApi()}/auth${ruta}`;
  } catch {
    throw new ErrorCuenta('configuracion');
  }
}

function esUsuario(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    && Number.isInteger(valor.id) && valor.id > 0
    && typeof valor.nombre === 'string' && typeof valor.email === 'string'
    && (valor.tipo === 'cliente' || valor.tipo === 'representante')
    && !('password' in valor) && !('password_hash' in valor);
}

function esSesion(valor) {
  return valor !== null && typeof valor === 'object' && typeof valor.token === 'string'
    && valor.token.length > 0 && esUsuario(valor.usuario);
}

export function leerToken() {
  return sessionStorage.getItem(claveToken) || '';
}

export function encabezadosAuth(headers = {}) {
  const token = leerToken();
  return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
}

async function solicitar(url, options, estadoEsperado) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new ErrorCuenta('red');
  }
  if (response.status >= 500) throw new ErrorCuenta('servidor');
  if (estadoEsperado === 204) {
    if (response.status !== 204) throw new ErrorCuenta(response.status >= 400 ? 'validacion' : 'protocolo');
    return undefined;
  }
  let datos;
  try {
    datos = await response.json();
  } catch {
    throw new ErrorCuenta(response.status >= 400 ? 'validacion' : 'protocolo');
  }
  if (response.status >= 400) {
    const message = mensajesSeguros.has(datos?.message) ? datos.message : '';
    throw new ErrorCuenta('validacion', message);
  }
  if (response.status !== estadoEsperado) throw new ErrorCuenta('protocolo');
  return datos;
}

export function obtenerMensajeErrorCuenta(error, operacion) {
  if (error instanceof ErrorCuenta && error.categoria === 'configuracion') {
    return 'La conexión con el servidor no está configurada correctamente.';
  }
  if (error instanceof ErrorCuenta && error.categoria === 'validacion') {
    return error.message || 'Revise los datos de la cuenta e intente nuevamente.';
  }
  if (operacion === 'sesion') return 'No se pudo comprobar la sesión. Intente nuevamente.';
  if (operacion === 'salida') return 'No se pudo cerrar la sesión. Intente nuevamente.';
  return 'No se pudo completar el acceso. Intente nuevamente.';
}

export async function registrarCuenta(datos) {
  return solicitar(urlAuth('/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  }, 201).then(usuario => {
    if (!esUsuario(usuario)) throw new ErrorCuenta('protocolo');
    return usuario;
  });
}

export async function iniciarSesion(datos) {
  const sesion = await solicitar(urlAuth('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  }, 200);
  if (!esSesion(sesion)) throw new ErrorCuenta('protocolo');
  sessionStorage.setItem(claveToken, sesion.token);
  return sesion;
}

export async function obtenerUsuarioActual() {
  const token = leerToken();
  if (!token) return null;
  try {
    const usuario = await solicitar(urlAuth('/me'), { headers: encabezadosAuth() }, 200);
    if (!esUsuario(usuario)) throw new ErrorCuenta('protocolo');
    return usuario;
  } catch (error) {
    if (error instanceof ErrorCuenta && error.categoria === 'validacion') {
      sessionStorage.removeItem(claveToken);
      return null;
    }
    throw error;
  }
}

export async function cerrarSesion() {
  const token = leerToken();
  if (token) {
    await solicitar(urlAuth('/logout'), { method: 'POST', headers: encabezadosAuth() }, 204);
  }
  sessionStorage.removeItem(claveToken);
}
