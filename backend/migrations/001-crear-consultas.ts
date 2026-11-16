import { DataTypes } from 'sequelize';
import type { QueryInterface } from 'sequelize';
import type { MigrationParams } from 'umzug';

export async function up({ context }: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async transaction => {
    await context.createTable({ schema: 'app', tableName: 'consultas' }, {
      id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.TEXT, allowNull: false },
      apellido: { type: DataTypes.TEXT, allowNull: false },
      dni: { type: DataTypes.TEXT, allowNull: false },
      telefono: { type: DataTypes.TEXT, allowNull: false },
      email: { type: DataTypes.TEXT, allowNull: false },
      asunto: { type: DataTypes.TEXT, allowNull: false },
      mensaje: { type: DataTypes.TEXT, allowNull: false },
    }, { transaction });
    await context.sequelize.query('GRANT SELECT, INSERT ON TABLE app.consultas TO docker_laws_app', { transaction });
    await context.sequelize.query('GRANT USAGE ON SEQUENCE app.consultas_id_seq TO docker_laws_app', { transaction });
  });
}

// Sin down: las reversiones destructivas no forman parte del incremento aprobado.
