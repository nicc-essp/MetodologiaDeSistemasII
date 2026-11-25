import assert from 'node:assert/strict';
import { hashSync } from 'bcryptjs';
import { crearAlmacenCuentas } from '../../data/cuentas-guardadas';
import type { UsuarioAlmacenado } from '../../models/usuario.model';
import type { SesionIniciada } from '../../services/auth.service';

export const datosRepresentanteFicticio = {
  nombre: 'Representante de prueba',
  email: 'representante@ejemplo.invalid',
  password: 'ClaveFicticiaRepresentante',
};

export const representanteFicticio: UsuarioAlmacenado = {
  id: 41,
  nombre: datosRepresentanteFicticio.nombre,
  email: datosRepresentanteFicticio.email,
  tipo: 'representante',
  password_hash: hashSync(datosRepresentanteFicticio.password, 4),
};

export function representanteEnMemoria() {
  return {
    cuentas: crearAlmacenCuentas([representanteFicticio]),
    representantesHabilitados: new Set([representanteFicticio.id]),
  };
}

export function encabezadosBearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function iniciarSesionFicticia(
  base: string, datos: { email: string; password: string } = datosRepresentanteFicticio,
): Promise<SesionIniciada> {
  const respuesta = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: datos.email, password: datos.password }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(respuesta.status, 200);
  const sesion = await respuesta.json() as SesionIniciada;
  assert.ok(typeof sesion.token === 'string' && sesion.token.length > 0);
  return sesion;
}

export async function autenticarRepresentante(base: string) {
  const { token, usuario } = await iniciarSesionFicticia(base);
  assert.equal(usuario.puedeLeerConsultas, true);
  return encabezadosBearer(token);
}
