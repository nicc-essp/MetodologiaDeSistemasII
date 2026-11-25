import { DataTypes } from 'sequelize';
import type { Model, Sequelize } from 'sequelize';

export type TipoUsuario = 'cliente' | 'representante';

export interface UsuarioPublico {
  id: number;
  nombre: string;
  email: string;
  tipo: TipoUsuario;
}

export interface RegistroUsuario {
  nombre: string;
  email: string;
  tipo: TipoUsuario;
  password_hash: string;
}

export interface UsuarioAlmacenado extends RegistroUsuario {
  id: number;
}

export function definirUsuario(sequelize: Sequelize) {
  return sequelize.define<Model<UsuarioAlmacenado, RegistroUsuario>>('Usuario', {
    id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.TEXT, allowNull: false, unique: true },
    tipo: { type: DataTypes.TEXT, allowNull: false },
    password_hash: { type: DataTypes.TEXT, allowNull: false },
  }, { schema: 'app', tableName: 'usuarios', timestamps: false });
}

export function publico(usuario: UsuarioAlmacenado): UsuarioPublico {
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, tipo: usuario.tipo };
}
