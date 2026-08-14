import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
) as { version: string };
const appVersion = packageJson.version;

export default defineConfig({
  base: './',
  define: {
    __FACEFALL_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    {
      name: 'facefall-version',
      transformIndexHtml(html) {
        return html
          .replace(
            /СУПЕР МАКАР \/\/ \d+\.\d+\.\d+ FAMILY SURVIVAL/g,
            `СУПЕР МАКАР // ${appVersion} FAMILY SURVIVAL`
          )
          .replace(
            /СУПЕР МАКАР · ENGINE NEXT \d+\.\d+\.\d+/g,
            `СУПЕР МАКАР · ENGINE NEXT ${appVersion}`
          );
      }
    }
  ],
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
