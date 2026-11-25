import { isIP } from 'node:net'
import { cwd } from 'node:process'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { obtenerBaseApi } from './src/config/apiConfig.js'

function validarApiVercel(valor) {
  try {
    const base = obtenerBaseApi(valor ?? '')
    const host = new URL(base).hostname.replace(/\.$/, '')
    if (!/^https:\/\/[^/\\@\s]+$/i.test(base) || !/^[a-z\d-]+(?:\.[a-z\d-]+)+$/i.test(host)
      || isIP(host) || /\.(local|localhost)$/i.test(host)) {
      throw new Error()
    }
  } catch {
    throw new Error('VITE_API_BASE_URL debe ser el origen HTTPS de la API en Vercel, con nombre DNS y sin credenciales, rutas, consulta ni fragmento.')
  }
}

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'vercel') {
    validarApiVercel(loadEnv(mode, cwd()).VITE_API_BASE_URL)
  }

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: false,
      environmentOptions: { jsdom: { url: 'http://localhost:5173/' } },
      setupFiles: ['./src/test/setup.js'],
    },
  }
})
