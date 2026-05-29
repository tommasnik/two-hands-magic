import { defineConfig } from 'vite'

const base = process.env.BASE_PATH || '/'
const siteName = base.replace(/^\/|\/$/g, '') || 'two-hands-magic'

export default defineConfig({
  base,
  server: {
    host: true,
    port: 5274,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        entryFileNames: `assets/${siteName}-[name]-[hash].js`,
        chunkFileNames: `assets/${siteName}-[name]-[hash].js`,
        assetFileNames: `assets/${siteName}-[name]-[hash][extname]`,
      },
    },
  },
})
