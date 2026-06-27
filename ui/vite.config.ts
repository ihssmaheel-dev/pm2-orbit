import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5151,
    proxy: {
      '/api': { target: 'http://127.0.0.1:9823', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:9823', ws: true },
    },
  },
  build: {
    outDir: 'dist-ui',
    emptyOutDir: true,
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'table-virtual': ['@tanstack/react-table', '@tanstack/react-virtual'],
          'charts': ['uplot'],
          'icons': ['lucide-react'],
          'cmdk': ['cmdk'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
