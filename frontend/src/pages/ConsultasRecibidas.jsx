import { useEffect, useState } from 'react';
import { obtenerFormularios } from '../services/formularioService';

export function ConsultasRecibidas() {
  const [consultas, setConsultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarConsultas = async () => {
      try {
        const formularios = await obtenerFormularios();
        setConsultas(formularios);
      } catch (error) {
        console.error(error);
        setError('No se pudieron cargar las consultas.');
      } finally {
        setCargando(false);
      }
    };

    cargarConsultas();
  }, []);

  return (
    <section className="contact-section">
      <div className="contact-container">
        <h2>Consultas recibidas</h2>
        <p>Formularios enviados por los clientes.</p>

        {cargando && <p>Cargando consultas...</p>}

        {error && <p>{error}</p>}

        {!cargando && !error && consultas.length === 0 && (
          <p>No hay consultas recibidas.</p>
        )}

        {consultas.map((consulta) => (
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