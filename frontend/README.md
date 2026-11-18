# Frontend de Docker-laws

Interfaz React y JavaScript con Vite. Incluye inicio, envío de consultas jurídicas y listado de consultas recibidas. Las llamadas HTTP están centralizadas en `src/services/formularioService.js`; las cuentas, los casos y la comunicación con representantes todavía no están implementados.

Desde la raíz del repositorio, con Node 22 desde 22.22.2 y pnpm 12.3.4:

```powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend dev --host localhost --port 5173 --strictPort
```

Abrir `http://localhost:5173`. Para enviar y recuperar consultas se necesita la API en `http://localhost:3001` y PostgreSQL preparado con su migración explícita; Vite por sí solo no inicia esos servicios. `VITE_API_BASE_URL` permite cambiar el destino público de la API; el origen desde el que se abre la interfaz debe estar permitido en `CORS_ORIGINS` del backend. Usar únicamente datos ficticios: no hay autenticación ni autorización funcional de usuarios.

Comprobaciones disponibles, también desde la raíz:

```powershell
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
```

Las pruebas usan Vitest, jsdom y Testing Library con red controlada; no sustituyen un recorrido real entre navegador, API y base. Detener Vite con `Ctrl+C`. Las dos modalidades de ejecución, la preparación de PostgreSQL mediante Docker, la configuración y la rama oficial de entrega `main` se explican en el [README principal](../README.md). La [auditoría práctica](../docs/CHECKLIST.md) conserva los resultados históricos y la reproducción limpia pendiente.
