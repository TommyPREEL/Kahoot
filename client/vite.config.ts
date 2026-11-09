import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3600,
    host: true, // listen on the LAN so phones can join during development
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3650',
        ws: true,
      },
    },
  },
});
