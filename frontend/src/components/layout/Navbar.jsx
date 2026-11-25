import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { obtenerMensajeErrorCuenta } from '../../services/authService';

export function Navbar() {
  const { usuario, cargando, salir } = useAuth();
  const [avisoSalida, setAvisoSalida] = useState('');

  const handleLogout = async () => {
    setAvisoSalida('');
    try {
      await salir();
    } catch (causa) {
      setAvisoSalida(obtenerMensajeErrorCuenta(causa, 'salida'));
    }
  };

  return (
    <header className="navbar">
      <div className="logo-nav">
        <Link to="/">
          <h2>Docker-laws</h2>
        </Link>
      </div>

      <nav className="nav-links">
        <Link to="/">Inicio</Link>
        {!cargando && usuario?.puedeLeerConsultas === true && (
          <Link to="/consultas">Consultas Recibidas</Link>
        )}
        <Link to="/consulta-juridica">Consulta Jurídica</Link>
        {!cargando && usuario ? (
          <>
            <span className="navbar-user">{usuario.nombre}</span>
            <button type="button" className="btn-text btn-text-nav" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </>
        ) : !cargando ? (
          <>
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/register">Registrarse</Link>
          </>
        ) : null}
      </nav>
      {!usuario && avisoSalida && <p role="alert">{avisoSalida}</p>}
    </header>
  );
}
