import { QueryTypes } from 'sequelize';
import type { Model, Sequelize } from 'sequelize';
import { definirConsulta } from '../models/consulta.model';
import type { EntradaFormulario, Formulario } from '../models/formulario';
import type { AlmacenFormularios } from './formularios-guardados';

const campos = ['nombre', 'apellido', 'dni', 'telefono', 'email', 'asunto', 'mensaje'] as const;

function publico(registro: Model<Formulario, EntradaFormulario>): Formulario {
  const datos = registro.get({ plain: true });
  return { id: datos.id, nombre: datos.nombre, apellido: datos.apellido, dni: datos.dni,
    telefono: datos.telefono, email: datos.email, asunto: datos.asunto, mensaje: datos.mensaje };
}

export async function prepararAlmacenPostgres(conexion: Sequelize): Promise<AlmacenFormularios> {
  const Consulta = definirConsulta(conexion);
  const columnas = await conexion.getQueryInterface().describeTable({ schema: 'app', tableName: 'consultas' });
  if (Object.keys(columnas).length !== 8 || !columnas.id?.primaryKey
    || !String(columnas.id?.defaultValue).includes('nextval(')
    || ['id', ...campos].some(campo => columnas[campo]?.allowNull !== false
      || columnas[campo]?.type !== (campo === 'id' ? 'INTEGER' : 'TEXT'))) {
    throw new Error('El esquema de consultas no corresponde a la migración requerida.');
  }
  // Verifica SELECT y los nombres físicos sin leer registros ni dar acceso al historial.
  await Consulta.findAll({ attributes: ['id', ...campos], limit: 0 });
  const [permisos] = await conexion.query<Record<string, boolean>>(`
    SELECT current_user = 'docker_laws_app' AS rol,
      has_table_privilege(current_user, 'app.consultas', 'INSERT') AS insertar,
      has_sequence_privilege(current_user, 'app.consultas_id_seq', 'USAGE') AS secuencia,
      to_regclass('app."SequelizeMeta"') IS NOT NULL AS historial
  `, { type: QueryTypes.SELECT });
  if (!permisos || Object.values(permisos).some(permitido => !permitido)) {
    throw new Error('Faltan el esquema migrado o los permisos del rol de aplicación.');
  }
  return {
    async crear(entrada) {
      return publico(await Consulta.create(entrada, { fields: [...campos] }));
    },
    async listar() {
      return (await Consulta.findAll({ attributes: ['id', ...campos], order: [['id', 'ASC']] })).map(publico);
    },
    async buscar(id) {
      // Number(...) conserva las formas históricas de ID; PostgreSQL INTEGER tiene estos límites.
      if (!Number.isInteger(id) || id < -2147483648 || id > 2147483647) return undefined;
      const encontrado = await Consulta.findByPk(id, { attributes: ['id', ...campos] });
      return encontrado ? publico(encontrado) : undefined;
    },
  };
}
