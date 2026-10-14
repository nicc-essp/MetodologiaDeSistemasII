

const consultasMock = [
  {
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    telefono: '291 4000000',
    area: 'asesoria',
    mensaje: 'Necesito asesoramiento sobre un contrato.'
  },
  {
    id: 2,
    nombre: 'María González',
    email: 'maria@ejemplo.com',
    telefono: '291 4111111',
    area: 'seguimiento',
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
            <h3>{consulta.nombre}</h3>

            <p><strong>Email:</strong> {consulta.email}</p>
            <p><strong>Teléfono:</strong> {consulta.telefono}</p>
            <p><strong>Área:</strong> {consulta.area}</p>
            <p><strong>Consulta:</strong> {consulta.mensaje}</p>
          </article>
        ))}
      </div>
    </section>
  );
}