import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import { leerToken } from '../services/authService';
import { obtenerFormularios, obtenerMensajeError } from '../services/formularioService';

export function ConsultasRecibidas() {
  const { usuario, cargando, rechazarLectura } = useAuth();
  let contenido;
  if (cargando) {
    contenido = <p role="status">Comprobando la sesión...</p>;
  } else if (!usuario) {
    contenido = <p role="alert">Iniciá sesión para ver las consultas recibidas.</p>;
  } else if (usuario.puedeLeerConsultas !== true) {
    contenido = <p role="alert">Tu cuenta no tiene permiso para ver las consultas recibidas.</p>;
  } else {
    contenido = <ListadoConsultas key={usuario.id} rechazarLectura={rechazarLectura} />;
  }

  return (
    <section className="contact-section">
      <div className="contact-container">
        <h2>Consultas recibidas</h2>
        {contenido}
      </div>
    </section>
  );
}

function ListadoConsultas({ rechazarLectura }) {
  const [consultas, setConsultas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = leerToken();
    let activo = true;
    const cargarConsultas = async () => {
      try {
        const formularios = await obtenerFormularios();
        if (activo && leerToken() === token) setConsultas(formularios);
      } catch (error) {
        if (!activo || leerToken() !== token) return;
        if (error.categoria === 'sesion' || error.categoria === 'permiso') {
          rechazarLectura(error.categoria, token);
        } else {
          setError(obtenerMensajeError(error, 'listado'));
        }
      } finally {
        if (activo) setCargando(false);
      }
    };

    cargarConsultas();
    return () => { activo = false; };
  }, [rechazarLectura]);

  return (
    <>
      <p>Formularios enviados por los clientes.</p>

      <p role="status">
        {cargando ? 'Cargando consultas...' : !error
          ? consultas.length === 0 ? 'No hay consultas recibidas.' : 'Consultas cargadas.'
          : ''}
      </p>
      {error && <p role="alert">{error}</p>}

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
    </>
  );
}
