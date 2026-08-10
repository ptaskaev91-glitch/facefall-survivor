import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist-next', { recursive: true });
for (const file of ['index.html', 'styles-safe.css', 'game-v050.js']) {
  await copyFile(file, `dist-next/${file}`);
}
console.log('Copied stable legacy entrypoint into dist-next alongside engine-lab.html');
