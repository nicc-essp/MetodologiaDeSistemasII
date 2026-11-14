export interface Formulario {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email: string;
  asunto: string;
  mensaje: string;
}

export type EntradaFormulario = Omit<Formulario, 'id'>;
