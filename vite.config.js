import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/build/**'],
      usePolling: true,
      interval: 1000, // Check every 1 second
    },
    host: '0.0.0.0',
    port: 3000,
    open: false,
  }
})
