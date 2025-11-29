import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const plugins = [];
  if (mode === 'https') {
    plugins.push(basicSsl());
  }

  return {
    plugins,
    server: {
      cors: true, // Enable CORS for cross-origin requests from production
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
  };
});
