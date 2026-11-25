# Frontend de Docker-laws

Interfaz React y JavaScript con Vite. Incluye inicio, envío público de consultas jurídicas, registro de clientes, inicio y cierre de sesión y listado para representantes habilitados. Los servicios `src/services/formularioService.js` y `src/services/authService.js` centralizan las llamadas a la API.

Desde la raíz del repositorio, con Node 22 desde 22.22.2 y pnpm 12.3.4:

```powershell
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend dev --host localhost --port 5173 --strictPort
```

Abrir `http://localhost:5173`. Para enviar o recuperar consultas se necesita la API en `http://localhost:3001` y PostgreSQL con las migraciones aplicadas explícitamente. `VITE_API_BASE_URL` configura el destino público de la API. El origen de la interfaz debe estar permitido en `CORS_ORIGINS`. Para abrir «Consultas recibidas», iniciar sesión con un [representante ficticio habilitado](../backend/database/README.md#alta-privada-de-un-representante-ficticio). React refleja el permiso otorgado por Express y envía el token en las lecturas. Usar exclusivamente datos ficticios.

Comprobaciones disponibles, también desde la raíz:

```powershell
pnpm --dir frontend test
pnpm --dir frontend lint
pnpm --dir frontend build
```

Las pruebas usan Vitest, jsdom y Testing Library con red controlada; no sustituyen un recorrido real entre navegador, API y base. Detener Vite con `Ctrl+C`. Las dos modalidades de ejecución, la preparación de PostgreSQL mediante Docker, la configuración y la rama oficial de entrega `main` se explican en el [README principal](../README.md). La [auditoría práctica](../docs/CHECKLIST.md) conserva los resultados históricos y la reproducción limpia pendiente.
