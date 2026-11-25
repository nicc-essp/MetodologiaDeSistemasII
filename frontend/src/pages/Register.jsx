import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { obtenerMensajeErrorCuenta } from '../services/authService';

export function Register() {
  const { usuario, cargando, registrar } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  if (!cargando && usuario) return <Navigate to="/" replace />;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setError('');
    try {
      await registrar(formData);
      navigate('/', { replace: true });
    } catch (causa) {
      setError(obtenerMensajeErrorCuenta(causa, 'acceso'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="contact-section">
      <div className="contact-container">
        <h2>Crear cuenta</h2>
        <p>Complete los datos para registrarse en Docker-laws.</p>
        <form onSubmit={handleSubmit} className="legal-form" aria-busy={enviando}>
          <div className="form-group">
            <label htmlFor="register-nombre">Nombre:</label>
            <input
              id="register-nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="register-email">Correo electrónico:</label>
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="register-password">Contraseña:</label>
            <input
              id="register-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn-submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        <p className="auth-switch">
          ¿Ya tiene una cuenta?{' '}
          <Link to="/login" className="btn-text">Iniciar sesión</Link>
        </p>
      </div>
    </section>
  );
}
