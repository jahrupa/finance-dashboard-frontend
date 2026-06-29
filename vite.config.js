import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { cwd } from 'node:process';
export default defineConfig(({ mode }) => {
const env = loadEnv(mode, cwd(), '')
  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_SERVER_PORT),
      host: true,
    },
    optimizeDeps: {
      cacheDir: `node_modules/.vite-${mode}`,
    },
    build: {
      outDir: `dist-${mode}`,
    },
  }
})