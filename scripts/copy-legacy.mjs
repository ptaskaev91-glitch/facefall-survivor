import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist-next', { recursive: true });
await mkdir('dist-next/legacy', { recursive: true });

// Preserve the last stable monolithic build for direct comparison/rollback testing.
for (const file of ['index.html', 'styles-safe.css', 'game-v050.js']) {
  await copyFile(file, `dist-next/legacy/${file}`);
}

// Vite compiles engine-lab.html with bundled Three.js assets. For the 0.8 test
// milestone it becomes the primary Vercel root, while /engine-lab.html remains
// available as the same build and /legacy/ keeps the previous checkpoint.
await copyFile('dist-next/engine-lab.html', 'dist-next/index.html');

console.log('Promoted engine-next 0.8 to / and archived legacy build under /legacy/');
