import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('react-router')
          ) {
            return 'react-vendor'
          }

          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('dompurify')
          ) {
            return 'pdf-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
