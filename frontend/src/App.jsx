import ballenaImg from './assets/images/ballena.jpg'
import './App.css'

function App() {
  return (
    <div className="page">
      <header className="hero">
        <img
          src={ballenaImg}
          className="logo"
          width="180"
          height="180"
          alt="Ballena"
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

        <section className="block">
          <h2>Contacto</h2>
          <p>
            Repositorio del proyecto:{' '}
            <a
              href="https://github.com/nicc-essp/MetodologiaDeSistemasII"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
        </section>
      </main>
    </div>
  )
}

export default App
