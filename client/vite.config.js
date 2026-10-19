import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // `npm run build:analyze` writes an interactive bundle treemap to stats.html
    mode === 'analyze' && visualizer({ filename: 'stats.html', gzipSize: true, brotliSize: true }),
  ],
  server: {
    // Same origin in development as in production: /api is proxied to the local API (backend: php artisan serve --port=4000).
    proxy: { '/api': { target: process.env.VITE_API_PROXY || 'http://localhost:4000', changeOrigin: true } },
    // The email templates live in /emails at the repo root, shared with the backend mailer.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Page-level tests chain several waits for lazy route chunks (each up to 5 s in setup.js).
    testTimeout: 15000,
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/**/*.test.{js,jsx}', 'src/data/**', 'src/main.jsx'],
    },
  },
}));
