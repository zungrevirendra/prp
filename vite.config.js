import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://0.0.0.0:3000',
        changeOrigin: true
      }
    }
  },
  base: './'
})
