import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: '8080',
    cors: '',
    strictPort: false,
    open: true,
    fs: {
      strict: false,
    },
    proxy: {
      '/dev-api': {
        target: `http://192.168.0.221:8085`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev-api/, ""),
      }
    }
  },
})
