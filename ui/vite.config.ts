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
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('@tanstack/react-table') || id.includes('@tanstack/react-virtual')) {
            return 'table-virtual';
          }
          if (id.includes('node_modules/uplot')) {
            return 'charts';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          if (id.includes('node_modules/cmdk')) {
            return 'cmdk';
          }
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
