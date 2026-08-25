import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import commonjs from 'vite-plugin-commonjs'

const apiTarget = process.env.API_URL || 'http://localhost:8001'

export default defineConfig({
  plugins: [
    commonjs(),
    react(),
    tailwindcss()
  ],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/auth': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/conversations': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/chat': {
        target: apiTarget,
        changeOrigin: true,
      },
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    }
  }
})