import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist-next',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: 'engine-lab.html',
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});
