import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiPlugin } from './vite-plugin-api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    proxy: {
      // In development, proxy API requests to the Vite dev server
      '/api': {
        target: 'http://localhost:5173',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    // For production, we'll handle API routes through Vercel's serverless functions
    outDir: 'dist',
    emptyOutDir: true,
  }
})
