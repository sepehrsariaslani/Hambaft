import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(async ({ mode }) => {
  const isDev = mode === 'development'

  return {
    base: isDev ? '/' : '/assets/hambaft/frontend/',
    plugins: [
      vue(),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      fs: {
        allow: ['..', 'node_modules'],
      },
      proxy: {
        '^/(api|assets|files)': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      include: [
        'frappe-ui',
        'feather-icons',
      ],
    },
    build: {
      outDir: path.resolve(__dirname, '../public/frontend'),
      emptyOutDir: true,
      sourcemap: true,
      inlineDynamicImports: false,
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  }
})
