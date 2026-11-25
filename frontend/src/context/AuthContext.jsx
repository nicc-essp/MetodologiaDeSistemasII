import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  borrarToken,
  cerrarSesion,
  iniciarSesion,
  leerToken,
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

  const rechazarLectura = useCallback((categoria, token) => {
    if (leerToken() !== token) return;
    if (categoria === 'sesion') {
      borrarToken();
      setUsuario(null);
    } else if (categoria === 'permiso') {
      setUsuario(actual => actual && { ...actual, puedeLeerConsultas: false });
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;
    const token = leerToken();
    const expirar = () => rechazarLectura('sesion', token);
    const comprobarVencimiento = () => {
      if (Date.now() >= usuario.expiraEn) expirar();
    };
    const espera = Math.max(0, Math.min(2147483647, usuario.expiraEn - Date.now()));
    const temporizador = setTimeout(expirar, espera);
    window.addEventListener('focus', comprobarVencimiento);
    document.addEventListener('visibilitychange', comprobarVencimiento);
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener('focus', comprobarVencimiento);
      document.removeEventListener('visibilitychange', comprobarVencimiento);
    };
  }, [usuario, rechazarLectura]);

  const valor = useMemo(() => {
    async function entrar(datos) {
      const sesion = await iniciarSesion(datos);
      setUsuario(sesion.usuario);
      return sesion.usuario;
    }

    return {
      usuario,
      cargando,
      rechazarLectura,
      entrar,
      async registrar(datos) {
        await registrarCuenta(datos);
        try {
          return await entrar({ email: datos.email, password: datos.password });
        } catch {
          return null;
        }
      },
      salir() {
        setUsuario(null);
        return cerrarSesion();
      },
    };
  }, [usuario, cargando, rechazarLectura]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
