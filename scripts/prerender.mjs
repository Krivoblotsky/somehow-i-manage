// Pre-renders the landing page into dist/index.html after `vite build`, so crawlers and AI
// agents read the real content, and a newcomer sees the page before JavaScript arrives.
import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const INDEX = 'dist/index.html';
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
try {
  // A build without a backend (no VITE_SUPABASE_* at build time) shows the setup notice, not the
  // landing page; there is nothing worth pre-rendering, and the client would disagree with it.
  const { isSyncConfigured } = await vite.ssrLoadModule('/src/sync/config.ts');
  if (!isSyncConfigured()) {
    console.log(`${INDEX}: no backend configured for this build, landing page not pre-rendered`);
    process.exit(0);
  }
  const { render } = await vite.ssrLoadModule('/src/prerender.tsx');
  const html = render();
  // the setup notice also has a heading: insist on the landing page itself
  if (!html.includes('Work with people'))
    throw new Error('prerender did not produce the landing page');
  const index = await readFile(INDEX, 'utf8');
  const marker = '<div id="root"></div>';
  if (!index.includes(marker)) throw new Error(`${INDEX} has no empty #root to fill`);
  await writeFile(INDEX, index.replace(marker, `<div id="root">${html}</div>`));
  console.log(`${INDEX}: pre-rendered landing, ${(html.length / 1024).toFixed(1)} kB`);
} finally {
  await vite.close();
}
