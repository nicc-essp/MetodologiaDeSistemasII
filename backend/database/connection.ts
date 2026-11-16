import { Sequelize } from 'sequelize';
import type { ConfiguracionPostgres } from '../config/database.config';

export function crearConexionPostgres(config: ConfiguracionPostgres): Sequelize {
  return new Sequelize(config.database, config.username, config.password, {
    dialect: 'postgres', host: config.host, port: config.port,
    logging: false,
    retry: { max: 0 },
    pool: { min: 0, max: 2, acquire: 5000, idle: 1000 },
    // Explícito también en local: no heredar PGSSLMODE ni aceptar TLS sin verificar.
    dialectOptions: { connectionTimeoutMillis: 5000, ssl: config.ssl },
  });
}
