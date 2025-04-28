import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@css': fileURLToPath(new URL('./src/css', import.meta.url)),
      '@js': fileURLToPath(new URL('./src/js', import.meta.url)),
      '@node_modules': fileURLToPath(new URL('./node_modules', import.meta.url)),
    },
  },
  root: './src',   // Tu HTML ahora arranca desde src/
});
