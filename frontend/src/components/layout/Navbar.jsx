import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

export function Navbar() {
  const { usuario, cargando, salir } = useAuth();

  const handleLogout = async () => {
    try {
      await salir();
    } catch {
      // El contexto limpia la sesión local aunque falle la red.
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
        <Link to="/consultas">Consultas Recibidas</Link>
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
    </header>
  );
}
