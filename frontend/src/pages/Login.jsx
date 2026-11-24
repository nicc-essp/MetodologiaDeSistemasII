import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { obtenerMensajeErrorCuenta } from '../services/authService';

export function Login() {
  const { usuario, cargando, entrar } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
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
      await entrar(formData);
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
        <h2>Iniciar sesión</h2>
        <p>Ingrese su correo y contraseña para acceder a su cuenta.</p>
        <form onSubmit={handleSubmit} className="legal-form" aria-busy={enviando}>
          <div className="form-group">
            <label htmlFor="login-email">Correo electrónico:</label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Contraseña:</label>
            <input
              id="login-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-submit" disabled={enviando}>
            {enviando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
        <p className="auth-switch">
          ¿No tiene una cuenta?{' '}
          <Link to="/register" className="btn-text">Registrarse</Link>
        </p>
      </div>
    </section>
  );
}
