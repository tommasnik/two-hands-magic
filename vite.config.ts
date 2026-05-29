import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5274,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
})
