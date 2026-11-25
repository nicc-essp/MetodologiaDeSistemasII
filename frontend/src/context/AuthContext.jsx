import { useEffect, useMemo, useState } from 'react';
import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuarioActual,
  registrarCuenta,
} from '../services/authService';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    obtenerUsuarioActual()
      .then(actual => {
        if (activo) setUsuario(actual);
      })
      .catch(() => {
        if (activo) setUsuario(null);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const valor = useMemo(() => ({
    usuario,
    cargando,
    async entrar(datos) {
      const sesion = await iniciarSesion(datos);
      setUsuario(sesion.usuario);
      return sesion.usuario;
    },
    async registrar(datos) {
      await registrarCuenta(datos);
      const sesion = await iniciarSesion({ email: datos.email, password: datos.password });
      setUsuario(sesion.usuario);
      return sesion.usuario;
    },
    async salir() {
      try {
        await cerrarSesion();
      } finally {
        setUsuario(null);
      }
    },
  }), [usuario, cargando]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
