
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { ConsultaJuridica } from './pages/ConsultaJuridica';
import { ConsultasRecibidas } from './pages/ConsultasRecibidas';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthProvider } from './context/AuthContext';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Navbar />

          <main className="main-content">
            <Routes>
              <Route path="/consultas" element={<ConsultasRecibidas />} />
              <Route path="/" element={<Home />} />
              <Route path="/consulta-juridica" element={<ConsultaJuridica />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
