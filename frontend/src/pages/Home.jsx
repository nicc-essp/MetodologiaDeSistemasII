import React from 'react';
import { Link } from 'react-router-dom';
import ballenaImg from '../assets/images/ballena.jpg';

export function Home() {
  return (
    <div className="page">
      <header className="hero">
        <img
          src={ballenaImg}
          className="logo"
          width="180"
          height="180"
          alt="Ballena Docker-laws"
        />
        <h1>Docker-laws</h1>
        <p className="tagline">Estudio jurídico</p>
        <p>Página de demostración. El sitio está en construcción.</p>
      </header>

      <main>
        <section className="block">
          <h2>Servicios</h2>
          <ul className="services">
            <li>Asesoría legal</li>
            <li>Seguimiento de casos</li>
            <li>Consultas a profesionales</li>
          </ul>
        </section>

        <section className="block text-center">
          <Link to="/consulta-juridica" className="btn-primary">
            Ir al Formulario de Consulta
          </Link>
        </section>
      </main>
    </div>
  );
}