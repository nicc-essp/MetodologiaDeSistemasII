import React from 'react';

export function Footer() {
  return (
    <footer className="footer-block">
      <p>&copy; 2026 Docker-laws — Estudio jurídico.</p>
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
    </footer>
  );
}