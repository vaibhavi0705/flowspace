import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, API and websocket traffic is proxied to the Express server,
// so the browser sees a single origin and CORS never gets in the way.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
