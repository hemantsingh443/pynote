import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/', // Explicitly set the base URL
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // In development, proxy API requests to the Vite dev server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['@monaco-editor/react', 'pyodide']
        }
      }
    },
    // Ensure proper MIME types for all assets
    assetsInlineLimit: 0
  },
  // Ensure Vite serves the correct MIME types for modules
  esbuild: {
    jsxInject: `import React from 'react'`
  },
  optimizeDeps: {
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis'
      },
      // Ensure proper MIME types for JS modules
      loader: { '.js': 'jsx' }
    }
  },
  // Configure static asset handling
  publicDir: 'public',
  // Ensure proper module resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
})
