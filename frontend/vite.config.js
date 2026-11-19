import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React app runs on http://localhost:3000 and forwards /api calls to the backend on port 5000.
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
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:5000', changeOrigin: true },
    },
  },
});
