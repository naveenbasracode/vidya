import fs from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app runs on http://localhost:3000 and forwards /api calls to the backend.
// The backend port is read from backend/.env (PORT), default 5050. Port 5000 is avoided
// because macOS AirPlay Receiver listens on it.
const backendPort = (() => {
  try {
    return fs.readFileSync(new URL('../backend/.env', import.meta.url), 'utf8').match(/^PORT=(\d+)/m)?.[1];
  } catch {
    return undefined;
  }
})();
const apiTarget = process.env.VITE_API_TARGET || `http://localhost:${backendPort || 5050}`;
export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        // Carbon's Sass triggers deprecation notices in newer Sass versions; they are harmless.
        quietDeps: true,
        silenceDeprecations: ['mixed-decls', 'import', 'global-builtin', 'legacy-js-api'],
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
});
