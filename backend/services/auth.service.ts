import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { ErrorCuenta, type AlmacenCuentas } from '../data/cuentas-guardadas';
import { publico, type TipoUsuario, type UsuarioPublico } from '../models/usuario.model';
import type { DatosRegistro } from '../validations/auth.validation';

const duracionSesionMs = 8 * 60 * 60 * 1000;
const limiteSesionesPorCuenta = 3;
const limiteSesiones = 256;
const costoBcrypt = 10;
// Hash sintético de trabajo con el mismo costo que las cuentas. No corresponde a una cuenta.
const hashSinCuenta = '$2b$10$QmHJ7A0t3cppcM5QL0Nq0O70j1WGkyn46/NaXsgIRYoY3qcfnNXCy';

interface UsuarioSesion extends UsuarioPublico {
  puedeLeerConsultas: boolean;
  expiraEn: number;
}

export interface SesionIniciada {
  token: string;
  usuario: UsuarioSesion;
}

export async function crearCuenta(cuentas: AlmacenCuentas, datos: DatosRegistro, tipo: TipoUsuario): Promise<UsuarioPublico> {
  const password_hash = await hash(datos.password, costoBcrypt);
  return cuentas.crear({ nombre: datos.nombre, email: datos.email, tipo, password_hash });
}

export function crearServicioAuth(cuentas: AlmacenCuentas, representantesHabilitados: ReadonlySet<number>) {
  const sesiones = new Map<string, { usuarioId: number; expiraEn: number }>();
  const idsHabilitados = new Set(representantesHabilitados);

  function perfilDeSesion(usuario: UsuarioPublico, expiraEn: number): UsuarioSesion {
    return {
      ...usuario,
      puedeLeerConsultas: usuario.tipo === 'representante' && idsHabilitados.has(usuario.id),
      expiraEn,
    };
  }

  function depurarSesiones(ahora: number) {
    for (const [token, sesion] of sesiones) {
      if (sesion.expiraEn <= ahora) sesiones.delete(token);
    }
  }

  return {
    registrar(datos: DatosRegistro): Promise<UsuarioPublico> {
      return crearCuenta(cuentas, datos, 'cliente');
    },

    async iniciarSesion(datos: { email: string; password: string }): Promise<SesionIniciada> {
      const guardado = await cuentas.buscarPorEmail(datos.email);
      const coincide = await compare(datos.password, guardado?.password_hash ?? hashSinCuenta);
      if (!guardado || !coincide) {
        throw new ErrorCuenta(401, 'Credenciales inválidas');
      }
      const ahora = Date.now();
      depurarSesiones(ahora);
      const propias = [...sesiones].filter(([, sesion]) => sesion.usuarioId === guardado.id);
      if (propias.length >= limiteSesionesPorCuenta) {
        const [[anterior]] = propias;
        sesiones.delete(anterior);
      } else if (sesiones.size >= limiteSesiones) {
        throw new ErrorCuenta(503, 'No se pudo iniciar sesión en este momento');
      }
      const token = randomBytes(32).toString('hex');
      const expiraEn = ahora + duracionSesionMs;
      sesiones.set(token, { usuarioId: guardado.id, expiraEn });
      return { token, usuario: perfilDeSesion(publico(guardado), expiraEn) };
    },

    async usuarioDeToken(token: string | undefined): Promise<UsuarioSesion> {
      if (!token) throw new ErrorCuenta(401, 'No hay una sesión activa');
      depurarSesiones(Date.now());
      const sesion = sesiones.get(token);
      if (!sesion) throw new ErrorCuenta(401, 'No hay una sesión activa');
      const usuario = await cuentas.buscarPorId(sesion.usuarioId);
      if (!usuario || !sesiones.has(token) || sesion.expiraEn <= Date.now()) {
        sesiones.delete(token);
        throw new ErrorCuenta(401, 'No hay una sesión activa');
      }
      return perfilDeSesion(usuario, sesion.expiraEn);
    },

    async cerrarSesion(token: string | undefined): Promise<void> {
      if (token) sesiones.delete(token);
    },
  };
}

export type ServicioAuth = ReturnType<typeof crearServicioAuth>;
