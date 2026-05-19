import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    allowedHosts: ['yggdrasil.home.arpa'],
    proxy: {
      '/api/asgard':        { target: 'http://localhost:5001', changeOrigin: true },
      '/api/vanaheim':      { target: 'http://localhost:5003', changeOrigin: true },
      '/api/svartalfheim':  { target: 'http://localhost:5002', changeOrigin: true },
      '/api/bifrost':       { target: 'http://localhost:5004', changeOrigin: true },
      '/api/niflheim':      { target: 'http://localhost:5005', changeOrigin: true },
      '/api/realms':        { target: 'http://localhost:5000', changeOrigin: true },
      '/midgard/static':    { target: 'http://localhost:5000', changeOrigin: true },
      '/vanaheim/static':   { target: 'http://localhost:5003', changeOrigin: true },
    },
  },
  build: { outDir: 'dist' },
})
