import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8301,
    allowedHosts: ['ae52-2400-1a00-b030-4a8c-382c-93ee-12ba-fdc0.ngrok-free.app'],
  },
  define: {
    'process.env': process.env,
  },
});
