import type { RegistroUsuario, UsuarioAlmacenado, UsuarioPublico } from '../models/usuario.model';
import { publico } from '../models/usuario.model';

export class ErrorCuenta extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export interface AlmacenCuentas {
  crear(entrada: RegistroUsuario): Promise<UsuarioPublico>;
  buscarPorEmail(email: string): Promise<UsuarioAlmacenado | undefined>;
  buscarPorId(id: number): Promise<UsuarioPublico | undefined>;
}

export function crearAlmacenCuentas(iniciales: readonly UsuarioAlmacenado[] = []): AlmacenCuentas {
  const usuarios = iniciales.map(usuario => ({ ...usuario }));
  return {
    async crear(entrada) {
      if (usuarios.some(usuario => usuario.email === entrada.email)) {
        throw new ErrorCuenta(409, 'El correo electrónico ya está registrado');
      }
      const id = usuarios.reduce((maximo, usuario) => Math.max(maximo, usuario.id), 0) + 1;
      const guardado: UsuarioAlmacenado = { id, ...entrada };
      usuarios.push(guardado);
      return publico(guardado);
    },
    async buscarPorEmail(email) {
      const encontrado = usuarios.find(usuario => usuario.email === email);
      return encontrado ? { ...encontrado } : undefined;
    },
    async buscarPorId(id) {
      const encontrado = usuarios.find(usuario => usuario.id === id);
      return encontrado ? publico(encontrado) : undefined;
    },
  };
}
