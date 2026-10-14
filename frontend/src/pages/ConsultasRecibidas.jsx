const consultasMock = [
  {
    id: 1,
    nombre: 'Juan',
    apellido: 'Pérez',
    dni: '12345678',
    telefono: '291 4000000',
    email: 'juan@ejemplo.com',
    asunto: 'Consulta contractual',
    mensaje: 'Necesito asesoramiento sobre un contrato.'
  },
  {
    id: 2,
    nombre: 'María',
    apellido: 'González',
    dni: '23456789',
    telefono: '291 4111111',
    email: 'maria@ejemplo.com',
    asunto: 'Seguimiento de caso',
    mensaje: 'Quisiera conocer el estado de mi caso.'
  }
];

export function ConsultasRecibidas() {
  return (
    <section className="contact-section">
      <div className="contact-container">
        <h2>Consultas recibidas</h2>
        <p>Formularios enviados por los clientes.</p>

        {consultasMock.map((consulta) => (
          <article key={consulta.id} className="consulta-card">
            <h3>
              {consulta.nombre} {consulta.apellido}
            </h3>

            <p><strong>DNI:</strong> {consulta.dni}</p>
            <p><strong>Teléfono:</strong> {consulta.telefono}</p>
            <p><strong>Email:</strong> {consulta.email}</p>
            <p><strong>Asunto:</strong> {consulta.asunto}</p>
            <p><strong>Mensaje:</strong> {consulta.mensaje}</p>
          </article>
        ))}
      </div>
    </section>
  );
}