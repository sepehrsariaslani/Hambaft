import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  cacheDir: '/tmp/.vite-cache',
  base: '/assets/hambaft/frontend/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Disable Vite's automatic publicDir copy — post-build.js handles this explicitly
  publicDir: false,
  build: {
    outDir: resolve(__dirname, '../hambaft/public'),
    // This app builds directly into Frappe's tracked public directory.
    // In the production container that path may not be deletable by the build user,
    // so we keep old assets around and let post-build handle lightweight cleanup.
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
    globals: true,
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
  },
})
