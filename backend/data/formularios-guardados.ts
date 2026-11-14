import type { EntradaFormulario, Formulario } from '../models/formulario';

const datosIniciales: readonly Formulario[] = [{
  id: 1,
  nombre: 'Pepe',
  apellido: 'Argento',
  dni: '123456789',
  telefono: '123456789',
  email: 'pepe.argento@example.com',
  asunto: 'Asunto del formulario',
  mensaje: 'Mensaje del formulario',
}];

export function crearAlmacenFormularios(iniciales: readonly Formulario[] = datosIniciales) {
  const formularios = iniciales.map(formulario => ({ ...formulario }));
  return {
    listar(): Formulario[] {
      return formularios.map(formulario => ({ ...formulario }));
    },
    buscar(id: number): Formulario | undefined {
      const encontrado = formularios.find(formulario => formulario.id === id);
      return encontrado ? { ...encontrado } : undefined;
    },
    crear(entrada: EntradaFormulario): Formulario {
      const id = formularios.reduce((maximo, formulario) => Math.max(maximo, formulario.id), 0) + 1;
      const formulario: Formulario = {
        id,
        nombre: entrada.nombre,
        apellido: entrada.apellido,
        dni: entrada.dni,
        telefono: entrada.telefono,
        email: entrada.email,
        asunto: entrada.asunto,
        mensaje: entrada.mensaje,
      };
      formularios.push(formulario);
      return { ...formulario };
    },
  };
}

export type AlmacenFormularios = ReturnType<typeof crearAlmacenFormularios>;
