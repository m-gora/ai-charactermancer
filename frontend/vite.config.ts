import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // @a2ui-sdk/* exports lack an "import" condition. Use absolute paths so
      // Vite bypasses the package exports map entirely.
      '@a2ui-sdk/react/0.8': path.resolve(
        __dirname,
        'node_modules/@a2ui-sdk/react/dist/0.8/index.js',
      ),
      '@a2ui-sdk/types/0.8': path.resolve(
        __dirname,
        'node_modules/@a2ui-sdk/types/dist/0.8/index.js',
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/sidekick': {
        target: process.env.AGENT_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.BACKEND_URL ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.stories.{ts,tsx}'],
    },
  },
});
