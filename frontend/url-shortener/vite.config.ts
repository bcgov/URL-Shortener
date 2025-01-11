import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: 'localhost', // Ensure the server runs locally
    port: 5173,        // Set the server port explicitly
    hmr: {
      protocol: 'ws',  // Explicitly set WebSocket protocol
      host: 'localhost',
      port: 5173,      // Use the same port as the development server
    },
  },
})
