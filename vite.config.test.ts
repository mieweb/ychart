import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    cors: true,
    host: 'localhost',
    port: 5173
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/ychartEditor.ts',
      name: 'YChartEditor',
      fileName: () => 'ychart-editor.js',
      formats: ['iife']
    },
    minify: false,
    target: 'es2015'
  }
});
