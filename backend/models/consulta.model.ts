import { DataTypes } from 'sequelize';
import type { Model, Sequelize } from 'sequelize';
import type { EntradaFormulario, Formulario } from './formulario';

export function definirConsulta(sequelize: Sequelize) {
  return sequelize.define<Model<Formulario, EntradaFormulario>>('Consulta', {
    id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.TEXT, allowNull: false },
    apellido: { type: DataTypes.TEXT, allowNull: false },
    dni: { type: DataTypes.TEXT, allowNull: false },
    telefono: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.TEXT, allowNull: false },
    asunto: { type: DataTypes.TEXT, allowNull: false },
    mensaje: { type: DataTypes.TEXT, allowNull: false },
  }, { schema: 'app', tableName: 'consultas', timestamps: false });
}
