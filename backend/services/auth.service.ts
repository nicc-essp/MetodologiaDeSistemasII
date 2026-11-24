import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { ErrorCuenta, type AlmacenCuentas } from '../data/cuentas-guardadas';
import type { UsuarioPublico } from '../models/usuario.model';

const horasSesion = 8;

export interface SesionIniciada {
  token: string;
  usuario: UsuarioPublico;
}

export function crearServicioAuth(cuentas: AlmacenCuentas) {
  const sesiones = new Map<string, { usuarioId: number; expira: number }>();

  return {
    async registrar(datos: { nombre: string; email: string; password: string; tipo: UsuarioPublico['tipo'] }): Promise<UsuarioPublico> {
      const password_hash = await hash(datos.password, 10);
      return cuentas.crear({
        nombre: datos.nombre,
        email: datos.email,
        tipo: datos.tipo,
        password_hash,
      });
    },

    async iniciarSesion(datos: { email: string; password: string }): Promise<SesionIniciada> {
      const guardado = await cuentas.buscarPorEmail(datos.email);
      const coincide = guardado ? await compare(datos.password, guardado.password_hash) : false;
      if (!guardado || !coincide) {
        throw new ErrorCuenta(401, 'Credenciales inválidas');
      }
      const token = randomBytes(32).toString('hex');
      sesiones.set(token, { usuarioId: guardado.id, expira: Date.now() + horasSesion * 60 * 60 * 1000 });
      return { token, usuario: { id: guardado.id, nombre: guardado.nombre, email: guardado.email, tipo: guardado.tipo } };
    },

    async usuarioDeToken(token: string | undefined): Promise<UsuarioPublico> {
      if (!token) throw new ErrorCuenta(401, 'No hay una sesión activa');
      const sesion = sesiones.get(token);
      if (!sesion || sesion.expira <= Date.now()) {
        if (sesion) sesiones.delete(token);
        throw new ErrorCuenta(401, 'No hay una sesión activa');
      }
      const usuario = await cuentas.buscarPorId(sesion.usuarioId);
      if (!usuario) {
        sesiones.delete(token);
        throw new ErrorCuenta(401, 'No hay una sesión activa');
      }
      return usuario;
    },

    async cerrarSesion(token: string | undefined): Promise<void> {
      if (token) sesiones.delete(token);
    },
  };
}

export type ServicioAuth = ReturnType<typeof crearServicioAuth>;
