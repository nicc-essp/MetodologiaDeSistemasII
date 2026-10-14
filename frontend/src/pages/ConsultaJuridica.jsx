import React, { useState } from 'react';

export function ConsultaJuridica() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    area: 'asesoria',
    mensaje: ''
  });

  const [enviado, setEnviado] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Consulta formal enviada:", formData);
    setEnviado(true);

    setTimeout(() => {
      setEnviado(false);
      setFormData({ nombre: '', email: '', telefono: '', area: 'asesoria', mensaje: '' });
    }, 5000);
  };

  return (
    <section className="contact-section">
      <div className="contact-container">
        <h2>Formulario de Consulta Formal</h2>
        <p>Complete los datos solicitados para iniciar su expediente o consulta con Docker-laws.</p>

        {enviado ? (
          <div className="success-message">
            <h3>¡Consulta enviada con éxito!</h3>
            <p>Hemos recibido sus datos de forma segura. Nos pondremos en contacto a la brevedad.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="legal-form">
            <div className="form-group">
              <label>Nombre y Apellido:</label>
              <input 
                type="text" 
                name="nombre" 
                value={formData.nombre} 
                onChange={handleChange} 
                required 
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="form-row">
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
              <label>Área de Interés:</label>
              <select name="area" value={formData.area} onChange={handleChange}>
                <option value="asesoria">Asesoría legal</option>
                <option value="seguimiento">Seguimiento de casos</option>
                <option value="profesionales">Consultas a profesionales</option>
              </select>
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

            <button type="submit" className="btn-submit">Enviar Solicitud Formal</button>
          </form>
        )}
      </div>
    </section>
  );
}