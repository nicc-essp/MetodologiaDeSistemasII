import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { ErrorCuenta, type AlmacenCuentas } from '../data/cuentas-guardadas';
import { publico, type TipoUsuario, type UsuarioPublico } from '../models/usuario.model';
import type { DatosRegistro } from '../validations/auth.validation';

const horasSesion = 8;

interface UsuarioSesion extends UsuarioPublico {
  puedeLeerConsultas: boolean;
}

export interface SesionIniciada {
  token: string;
  usuario: UsuarioSesion;
}

export async function crearCuenta(cuentas: AlmacenCuentas, datos: DatosRegistro, tipo: TipoUsuario): Promise<UsuarioPublico> {
  const password_hash = await hash(datos.password, 10);
  return cuentas.crear({ nombre: datos.nombre, email: datos.email, tipo, password_hash });
}

export function crearServicioAuth(cuentas: AlmacenCuentas, representantesHabilitados: ReadonlySet<number>) {
  const sesiones = new Map<string, { usuarioId: number; expira: number }>();
  const idsHabilitados = new Set(representantesHabilitados);

  function perfilDeSesion(usuario: UsuarioPublico): UsuarioSesion {
    return {
      ...usuario,
      puedeLeerConsultas: usuario.tipo === 'representante' && idsHabilitados.has(usuario.id),
    };
  }

  return {
    registrar(datos: DatosRegistro): Promise<UsuarioPublico> {
      return crearCuenta(cuentas, datos, 'cliente');
    },

    async iniciarSesion(datos: { email: string; password: string }): Promise<SesionIniciada> {
      const guardado = await cuentas.buscarPorEmail(datos.email);
      const coincide = guardado ? await compare(datos.password, guardado.password_hash) : false;
      if (!guardado || !coincide) {
        throw new ErrorCuenta(401, 'Credenciales inválidas');
      }
      const token = randomBytes(32).toString('hex');
      sesiones.set(token, { usuarioId: guardado.id, expira: Date.now() + horasSesion * 60 * 60 * 1000 });
      return { token, usuario: perfilDeSesion(publico(guardado)) };
    },

    async usuarioDeToken(token: string | undefined): Promise<UsuarioSesion> {
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
      return perfilDeSesion(usuario);
    },

    async cerrarSesion(token: string | undefined): Promise<void> {
      if (token) sesiones.delete(token);
    },
  };
}

export type ServicioAuth = ReturnType<typeof crearServicioAuth>;
