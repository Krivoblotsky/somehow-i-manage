/* global window, document */
// Product screenshots for the landing page, taken from the running dev server with the sample
// team loaded. Needs Google Chrome and `npm run dev` on :5173.  Usage: npm run shots
import { mkdir } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.SHOTS_URL ?? 'http://localhost:5173/';
const OUT = 'public/landing';
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  defaultViewport: VIEWPORT,
  args: ['--hide-scrollbars', '--force-prefers-reduced-motion'],
});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForFunction(
  () => window.__dev?.useUI && window.__dev?.useSync && window.__dev?.actions,
);

/** Sync cannot work with a pretend account: keep the status dot green for the picture. */
const healthy = () =>
  page.evaluate(() => {
    window.__dev.useSync.setState({
      phase: 'idle',
      error: null,
      pending: 0,
      online: true,
      lastSyncedAt: Date.now(),
    });
  });

// Photo-only cosmetics: the pretend account cannot sync (keep the status dot green) and the
// toasts from setting scenes up should not be in the picture.
await page.addStyleTag({
  content: `header [data-state] { background: #34c759 !important; }
    [class*="toast"] { display: none !important; }`,
});

async function shot(name) {
  await healthy();
  await sleep(150);
  await page.screenshot({ path: `${OUT}/${name}.webp`, type: 'webp', quality: 82 });
  console.log(`${OUT}/${name}.webp`);
}

// A signed-in manager (dev-only switch), then the sample team.
await page.evaluate(() => {
  window.__dev.useSync.setState({
    ready: true,
    user: { id: 'shots', email: 'alex@example.com', name: 'Alex Morgan' },
    lastSyncedAt: Date.now(),
  });
  window.__dev.useUI.setState({
    view: 'map',
    selectedItemId: null,
    personPanelOpen: false,
    tipsDismissed: true,
  });
});
await page.waitForSelector('button ::-p-text(Try with sample data)');
await page.click('button ::-p-text(Try with sample data)');
await page.waitForFunction(() => document.querySelectorAll('.react-flow__node').length >= 42);
await sleep(1500);

const personId = (name) =>
  page.evaluate(
    (n) =>
      [...document.querySelectorAll('.react-flow__node-person')]
        .find((el) => el.textContent.includes(n))
        ?.getAttribute('data-id') ?? null,
    name,
  );
const emily = await personId('Emily Carter');
const james = await personId('James Patel');
if (!emily || !james) throw new Error('sample people not found on the map');

// 1. The team on the map, zoomed in a little so the clusters read and the people past the
// edge show up as edge markers.
await page.click('.react-flow__controls-fitview');
await sleep(700);
for (let i = 0; i < 2; i++) {
  await page.click('.react-flow__controls-zoomin');
  await sleep(350);
}
await sleep(600);
await shot('map');
await page.click('.react-flow__controls-fitview');
await sleep(900);

// 2. One cluster in the spotlight, with a card open.
await page.evaluate((id) => window.__dev.useUI.getState().focusPerson(id), james);
await sleep(900);
await page.evaluate((id) => {
  const card = [...document.querySelectorAll('.react-flow__node-item')].find((el) =>
    el.textContent.includes('Regression suite'),
  );
  card?.querySelector('[class*=card]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}, james);
await sleep(700);
await shot('map-focus');
await page.evaluate(() => window.__dev.useUI.getState().closePanel());

// 3. A 1:1 in progress.
await page.evaluate((id) => window.__dev.actions.startOneOnOne(id), emily);
await page.waitForFunction(() => window.__dev.useUI.getState().view === 'meeting');
await sleep(900);
await shot('one-on-one');
await page.evaluate(() => window.__dev.actions.finishOneOnOne());

// 4. A person's page in the list view.
await page.evaluate((id) => {
  window.__dev.useUI.getState().selectPerson(id);
  window.__dev.useUI.setState({ view: 'list', personPanelOpen: false });
}, emily);
await sleep(900);
await shot('person');

// 5. Quick capture: the command palette over the map.
await page.evaluate(() => {
  window.__dev.useUI.setState({ view: 'map' });
  window.__dev.useUI.getState().openDialog({ type: 'palette' });
});
await sleep(900);
await shot('capture');

await browser.close();
