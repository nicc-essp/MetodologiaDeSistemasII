import { useState } from 'react';
import { crearFormulario } from '../services/formularioService';

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
      console.error(error);
      setError('No se pudo enviar la consulta. Intente nuevamente.');
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

        <form onSubmit={handleSubmit} className="legal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre:</label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                placeholder="Ej: Juan"
              />
            </div>

            <div className="form-group">
              <label>Apellido:</label>
              <input
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
              <label>DNI:</label>
              <input
                type="text"
                name="dni"
                value={formData.dni}
                onChange={handleChange}
                required
                placeholder="Ej: 12345678"
              />
            </div>

            <div className="form-group">
              <label>Teléfono / Celular:</label>
              <input
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
            <label>Correo Electrónico:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div className="form-group">
            <label>Asunto:</label>
            <input
              type="text"
              name="asunto"
              value={formData.asunto}
              onChange={handleChange}
              required
              placeholder="Ej: Consulta contractual"
            />
          </div>

          <div className="form-group">
            <label>Detalle del Caso:</label>
            <textarea
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

          {enviado && (
            <p>La consulta fue enviada correctamente.</p>
          )}

          {error && (
            <p>{error}</p>
          )}
        </form>
      </div>
    </section>
  );
}