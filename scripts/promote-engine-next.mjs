import { copyFile } from 'node:fs/promises';

// Vite builds engine-lab.html as the canonical application entrypoint.
// Production serves the exact same compiled document from `/`.
await copyFile('dist-next/engine-lab.html', 'dist-next/index.html');

console.log('Promoted bundled engine-next build to deployment root /');
