import { QueryTypes, UniqueConstraintError } from 'sequelize';
import type { Sequelize } from 'sequelize';
import { definirUsuario, publico } from '../models/usuario.model';
import { ErrorCuenta, type AlmacenCuentas } from './cuentas-guardadas';

const campos = ['nombre', 'email', 'tipo', 'password_hash'] as const;

export async function prepararAlmacenCuentasPostgres(conexion: Sequelize): Promise<AlmacenCuentas> {
  const Usuario = definirUsuario(conexion);
  const columnas = await conexion.getQueryInterface().describeTable({ schema: 'app', tableName: 'usuarios' });
  if (Object.keys(columnas).length !== 5 || !columnas.id?.primaryKey
    || !String(columnas.id?.defaultValue).includes('nextval(')
    || ['id', ...campos].some(campo => columnas[campo]?.allowNull !== false
      || columnas[campo]?.type !== (campo === 'id' ? 'INTEGER' : 'TEXT'))) {
    throw new Error('El esquema de usuarios no corresponde a la migración requerida.');
  }
  const restricciones = await conexion.query<{
    tipo: string; nombre: string; definicion: string; validada: boolean; indiceValido: boolean | null;
  }>(`
    SELECT c.contype::text AS tipo, c.conname AS nombre, pg_get_constraintdef(c.oid) AS definicion,
      c.convalidated AS validada, i.indisvalid AND i.indisunique AND i.indisready AS "indiceValido"
    FROM pg_catalog.pg_constraint c
    LEFT JOIN pg_catalog.pg_index i ON i.indexrelid = c.conindid
    WHERE c.conrelid = 'app.usuarios'::regclass AND c.contype IN ('u', 'c')
  `, { type: QueryTypes.SELECT });
  const correoUnico = restricciones.some(r =>
    r.tipo === 'u' && r.validada && r.indiceValido && r.definicion === 'UNIQUE (email)');
  const tiposRestringidos = restricciones.some(r =>
    r.tipo === 'c' && r.nombre === 'usuarios_tipo_check' && r.validada
    && r.definicion === "CHECK ((tipo = ANY (ARRAY['cliente'::text, 'representante'::text])))");
  if (!correoUnico || !tiposRestringidos) {
    throw new Error('Faltan las restricciones UNIQUE(email) y CHECK(tipo) requeridas por 002.');
  }
  await Usuario.findAll({ attributes: ['id', ...campos], limit: 0 });
  const [permisos] = await conexion.query<Record<string, boolean>>(`
    SELECT current_user = 'docker_laws_app' AS rol,
      has_table_privilege(current_user, 'app.usuarios', 'INSERT') AS insertar,
      has_sequence_privilege(current_user, 'app.usuarios_id_seq', 'USAGE') AS secuencia
  `, { type: QueryTypes.SELECT });
  if (!permisos || Object.values(permisos).some(permitido => !permitido)) {
    throw new Error('Faltan el esquema migrado o los permisos del rol de aplicación.');
  }
  return {
    async crear(entrada) {
      try {
        const registro = await Usuario.create(entrada, { fields: [...campos] });
        return publico(registro.get({ plain: true }));
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          throw new ErrorCuenta(409, 'El correo electrónico ya está registrado');
        }
        throw error;
      }
    },
    async buscarPorEmail(email) {
      const encontrado = await Usuario.findOne({ where: { email }, attributes: ['id', ...campos] });
      return encontrado ? encontrado.get({ plain: true }) : undefined;
    },
    async buscarPorId(id) {
      if (!Number.isInteger(id) || id < -2147483648 || id > 2147483647) return undefined;
      const encontrado = await Usuario.findByPk(id, { attributes: ['id', ...campos] });
      return encontrado ? publico(encontrado.get({ plain: true })) : undefined;
    },
  };
}
