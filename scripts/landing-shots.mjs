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

/** Fit everyone, then zoom in `steps` and pan the canvas down a little, out from under the header. */
async function frameMap(steps) {
  await page.click('.react-flow__controls-fitview');
  await sleep(700);
  for (let i = 0; i < steps; i++) {
    await page.click('.react-flow__controls-zoomin');
    await sleep(350);
  }
  // pan down a touch by dragging an empty bit of canvas
  const spot = await page.evaluate(() => {
    for (const [x, y] of [
      [1180, 760],
      [1300, 700],
      [900, 760],
      [700, 300],
    ]) {
      const el = document.elementFromPoint(x, y);
      if (el && el.classList.contains('react-flow__pane')) return { x, y };
    }
    return null;
  });
  if (spot) {
    await page.mouse.move(spot.x, spot.y);
    await page.mouse.down();
    await page.mouse.move(spot.x, spot.y + 110, { steps: 8 });
    await page.mouse.up();
  } else console.log('no empty canvas spot found to pan from');
  await sleep(600);
}
const centerOf = async (selector, text) =>
  page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find((n) => n.textContent.includes(t));
      if (!el) return null;
      const target =
        el.querySelector('[class*=avatarWrap]') ?? el.querySelector('[class*=card]') ?? el;
      const r = target.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    selector,
    text,
  );

// 1. The team on the map, close enough to read.
await frameMap(2);
await shot('map');

// 2. Handing a card over: mid-drag, the receiving hub lit up.
const card = await centerOf('.react-flow__node-item', 'Business Trip');
const hub = await centerOf('.react-flow__node-person', 'Marcus Johnson');
if (card && hub) {
  await page.mouse.move(card.x, card.y);
  await page.mouse.down();
  await page.mouse.move(hub.x + 64, hub.y - 56, { steps: 14 }); // over the hub, not on top of it
  await sleep(400);
  await shot('map-drag');
  await page.mouse.move(card.x, card.y, { steps: 10 }); // back where it came from, nothing changes
  await sleep(200);
  await page.mouse.up();
  await sleep(400);
} else console.log('drag shot skipped: card or hub not on screen');

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
await sleep(400);

// 2a. A project in the spotlight: its cards lit across two people, the island counting them.
await frameMap(1);
await page.evaluate(() => {
  [...document.querySelectorAll('aside[aria-label="Projects"] button')]
    .find((b) => b.textContent.startsWith('Release 2.1'))
    ?.click();
});
await sleep(700);
await shot('map-projects');
await page.evaluate(() => window.__dev.useUI.getState().focusProject(null));
await sleep(400);

// 2b. Closer still: the people past the edge become markers.
await frameMap(3);
await shot('map-edges');
await page.click('.react-flow__controls-fitview');
await sleep(800);

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
