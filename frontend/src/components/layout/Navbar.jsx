
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="navbar">
      <div className="logo-nav">
        <h2>Docker-laws</h2>
      </div>
      <nav className="nav-links">
        <Link to="/">Inicio</Link>
        <Link to="/consulta-juridica" className="btn-nav">Consulta Jurídica</Link>
      </nav>
    </header>
  );
}