import { useState } from 'react';
import { crearFormulario, obtenerMensajeError } from '../services/formularioService';

export function ConsultaJuridica() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: '',
    email: '',
    asunto: '',
    mensaje: ''
  });

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setEnviado(false);
    setError('');

    try {
      await crearFormulario(formData);

      setEnviado(true);

      setFormData({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        email: '',
        asunto: '',
        mensaje: ''
      });
    } catch (error) {
      setError(obtenerMensajeError(error, 'envio'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="contact-container">
        <h2>Formulario de Consulta Formal</h2>

        <p>
          Complete los datos solicitados para iniciar su expediente o consulta
          con Docker-laws.
        </p>

        <form onSubmit={handleSubmit} className="legal-form" aria-busy={enviando}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="consulta-nombre">Nombre:</label>
              <input
                id="consulta-nombre"
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                placeholder="Ej: Juan"
              />
            </div>

            <div className="form-group">
              <label htmlFor="consulta-apellido">Apellido:</label>
              <input
                id="consulta-apellido"
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                required
                placeholder="Ej: Pérez"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="consulta-dni">DNI:</label>
              <input
                id="consulta-dni"
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                required
                placeholder="Ej: 12345678"
              />
            </div>

            <div className="form-group">
              <label htmlFor="consulta-telefono">Teléfono / Celular:</label>
              <input
                id="consulta-telefono"
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                required
                placeholder="291 4000000"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="consulta-email">Correo Electrónico:</label>
            <input
              id="consulta-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="consulta-asunto">Asunto:</label>
            <input
              id="consulta-asunto"
              type="text"
              name="asunto"
              value={formData.asunto}
              onChange={handleChange}
              required
              placeholder="Ej: Consulta contractual"
            />
          </div>

          <div className="form-group">
            <label htmlFor="consulta-mensaje">Detalle del Caso:</label>
            <textarea
              id="consulta-mensaje"
              name="mensaje"
              rows="4"
              value={formData.mensaje}
              onChange={handleChange}
              required
              placeholder="Describa brevemente su situación..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={enviando}
          >
            {enviando ? 'Enviando...' : 'Enviar Solicitud Formal'}
          </button>

        </form>
        <p role="status">
          {enviando ? 'Enviando consulta...' : enviado ? 'La consulta fue enviada correctamente.' : ''}
        </p>
        {error && <p role="alert">{error}</p>}
      </div>
    </section>
  );
}
