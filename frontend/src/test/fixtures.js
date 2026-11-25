// Datos inventados: no representan consultas ni personas reales.
export const consultaFicticia = {
  nombre: 'Persona de prueba',
  apellido: 'Sintética',
  dni: '00000000',
  telefono: '0000000000',
  email: 'consulta@ejemplo.invalid',
  asunto: 'Prueba del prototipo',
  mensaje: 'Contenido ficticio de prueba.',
};

export const formularioFicticio = { id: 1, ...consultaFicticia };

export const perfilRepresentanteFicticio = {
  id: 41,
  nombre: 'Representante de prueba',
  email: 'representante@ejemplo.invalid',
  tipo: 'representante',
  puedeLeerConsultas: true,
  expiraEn: Date.now() + 8 * 60 * 60 * 1000,
};
export const respuestaJson = (datos, status = 200) => new Response(JSON.stringify(datos), {
  status, headers: { 'Content-Type': 'application/json' },
});
