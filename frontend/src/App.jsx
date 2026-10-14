import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { ConsultaJuridica } from './pages/ConsultaJuridica';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/consulta-juridica" element={<ConsultaJuridica />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;