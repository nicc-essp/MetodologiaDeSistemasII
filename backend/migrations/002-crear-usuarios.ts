import { DataTypes } from 'sequelize';
import type { QueryInterface } from 'sequelize';
import type { MigrationParams } from 'umzug';

export async function up({ context }: MigrationParams<QueryInterface>): Promise<void> {
  await context.sequelize.transaction(async transaction => {
    await context.createTable({ schema: 'app', tableName: 'usuarios' }, {
      id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
      nombre: { type: DataTypes.TEXT, allowNull: false },
      email: { type: DataTypes.TEXT, allowNull: false, unique: true },
      tipo: { type: DataTypes.TEXT, allowNull: false },
      password_hash: { type: DataTypes.TEXT, allowNull: false },
    }, { transaction });
    await context.sequelize.query(
      "ALTER TABLE app.usuarios ADD CONSTRAINT usuarios_tipo_check CHECK (tipo IN ('cliente', 'representante'))",
      { transaction },
    );
    await context.sequelize.query('GRANT SELECT, INSERT ON TABLE app.usuarios TO docker_laws_app', { transaction });
    await context.sequelize.query('GRANT USAGE ON SEQUENCE app.usuarios_id_seq TO docker_laws_app', { transaction });
  });
}
