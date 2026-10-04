/* global window, document */
// Launch assets: Product Hunt gallery frames (1270×760 @2x) and a demo video, from the running
// dev server with the sample team. Needs Google Chrome, ffmpeg and `npm run dev` on :5173.
// Usage: npm run launch-assets
import { mkdir, stat, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import puppeteer from 'puppeteer-core';

const run = promisify(execFile);
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const URL = process.env.SHOTS_URL ?? 'http://localhost:5173/';
const OUT = 'public/launch';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });

/** A page with the sample team loaded, the pretend account signed in, and no first-run prompts. */
async function openApp(browser, viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('personal.sourceAsked', '1');
    localStorage.setItem('personal.surveyDone', '1');
    localStorage.setItem('personal.firstSeen', String(Date.now()));
  });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await page.waitForFunction(
    () => window.__dev?.useUI && window.__dev?.useSync && window.__dev?.actions,
  );
  await page.evaluate(() => {
    window.__dev.useSync.setState({
      ready: true,
      user: { id: 'shots', email: 'alex@example.com', name: 'Alex Morgan' },
      lastSyncedAt: Date.now(),
      phase: 'idle',
      error: null,
      pending: 0,
      online: true,
    });
    window.__dev.useUI.setState({
      view: 'map',
      selectedItemId: null,
      personPanelOpen: false,
      tipsDismissed: true,
      projectFocusId: null,
    });
  });
  await page.waitForSelector('button ::-p-text(Try with sample data)');
  await page.click('button ::-p-text(Try with sample data)');
  await page.waitForFunction(() => document.querySelectorAll('.react-flow__node').length >= 42);
  await page.addStyleTag({
    content: `header [data-state] { background: #34c759 !important; }
      [class*="toast"] { display: none !important; }`,
  });
  await sleep(1200);
  return page;
}

const personId = (page, name) =>
  page.evaluate(
    (n) =>
      [...document.querySelectorAll('.react-flow__node-person')]
        .find((el) => el.textContent.includes(n))
        ?.getAttribute('data-id') ?? null,
    name,
  );

const centerOf = (page, selector, text) =>
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

async function fit(page, zoomSteps = 0) {
  await page.click('.react-flow__controls-fitview');
  await sleep(600);
  for (let i = 0; i < zoomSteps; i++) {
    await page.click('.react-flow__controls-zoomin');
    await sleep(300);
  }
  await sleep(400);
}

// ---------------------------------------------------------------------------------------------
// 1. Gallery frames: still, reduced motion, 1270×760 at 2x.
// ---------------------------------------------------------------------------------------------
{
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--hide-scrollbars', '--force-prefers-reduced-motion'],
  });
  const page = await openApp(browser, { width: 1270, height: 760, deviceScaleFactor: 2 });
  const shot = async (name) => {
    await sleep(300);
    await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 90 });
    console.log(`${OUT}/${name}.jpg`);
  };
  const emily = await personId(page, 'Emily Carter');
  const james = await personId(page, 'James Patel');

  // the team, close enough to read
  await fit(page, 1);
  await shot('ph-1-map');

  // a person's page open over the map
  await page.evaluate((id) => {
    window.__dev.useUI.getState().selectPerson(id);
    window.__dev.useUI.getState().focusPerson(id);
  }, james);
  await sleep(1200);
  await shot('ph-2-person');
  await page.evaluate(() => window.__dev.useUI.getState().closePanel());

  // a project in the spotlight with its page
  await fit(page, 1);
  await page.evaluate(() => {
    [...document.querySelectorAll('aside[aria-label="Projects"] button')]
      .find((b) => b.textContent.startsWith('Release 2.1'))
      ?.click();
  });
  await sleep(1200);
  await shot('ph-3-projects');
  await page.evaluate(() => window.__dev.useUI.getState().focusProject(null));

  // a 1:1 in progress
  await page.evaluate((id) => window.__dev.actions.startOneOnOne(id), emily);
  await page.waitForFunction(() => window.__dev.useUI.getState().view === 'meeting');
  await sleep(800);
  await shot('ph-4-one-on-one');
  await page.evaluate(() => window.__dev.actions.finishOneOnOne());
  await sleep(500);

  // the landing's MCP section: sign out, let the live demo in the hero finish mounting (it
  // pulls the page back to the top while it does), then scroll there and make sure we stayed
  await page.evaluate(() => {
    window.__dev.useUI.setState({ view: 'map' });
    window.__dev.useSync.setState({ user: null });
  });
  await page.waitForSelector('#mcp');
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="live-demo"] .react-flow__node').length > 0,
  );
  await sleep(1500);
  // Scroll the section into view and capture the real viewport: a default screenshot is taken
  // from the page top, and a clip further down comes out unpainted (content-visibility).
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.evaluate(() => {
      // the landing scrolls inside its own container, so ask the section itself to come into
      // view, then nudge whichever ancestor scrolled so the band's top edge shows
      const sec = document.getElementById('mcp');
      sec.scrollIntoView({ block: 'start', behavior: 'instant' });
      let el = sec.parentElement;
      while (el && !(el.scrollHeight > el.clientHeight && el.scrollTop > 0)) el = el.parentElement;
      (el ?? document.scrollingElement).scrollTop -= 24;
    });
    await sleep(700);
    const settled = await page.evaluate(() => {
      const top = document.getElementById('mcp').getBoundingClientRect().top;
      return top > -40 && top < 80;
    });
    if (settled) break;
  }
  await page.screenshot({
    path: `${OUT}/ph-5-mcp.jpg`,
    type: 'jpeg',
    quality: 90,
    captureBeyondViewport: false,
  });
  console.log(`${OUT}/ph-5-mcp.jpg`);
  await browser.close();
}

// ---------------------------------------------------------------------------------------------
// 2. The demo video: real motion, a visible cursor, one scenario a manager would recognise.
// ---------------------------------------------------------------------------------------------
{
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--hide-scrollbars'],
  });
  const page = await openApp(browser, { width: 1440, height: 900, deviceScaleFactor: 1 });
  // a cursor the recording can see (the real one is not drawn in a headless capture)
  await page.evaluate(() => {
    const c = document.createElement('div');
    c.id = 'demo-cursor';
    c.style.cssText =
      'position:fixed;left:0;top:0;width:22px;height:22px;z-index:99999;pointer-events:none;' +
      'transform:translate(-3px,-2px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));';
    c.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 8.5-6.5 1.4L16 20l-2.6 1.3-3.4-7.2L5 18z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    document.addEventListener(
      'mousemove',
      (e) => {
        c.style.left = `${e.clientX}px`;
        c.style.top = `${e.clientY}px`;
      },
      true,
    );
    document.addEventListener(
      'mousedown',
      () => {
        c.style.transform = 'translate(-3px,-2px) scale(0.85)';
      },
      true,
    );
    document.addEventListener(
      'mouseup',
      () => {
        c.style.transform = 'translate(-3px,-2px)';
      },
      true,
    );
  });
  const move = (x, y, steps = 28) => page.mouse.move(x, y, { steps });
  const emily = await personId(page, 'Emily Carter');
  await fit(page, 1);
  await move(720, 450, 5);

  const recorder = await page.screencast({ path: `${OUT}/demo.webm` });
  await sleep(1500);

  // 1. open a person
  const hub = await centerOf(page, '.react-flow__node-person', 'Emily Carter');
  await move(hub.x, hub.y);
  await sleep(300);
  await page.mouse.click(hub.x, hub.y);
  await sleep(1600);

  // 2. capture a task with her, in the panel's field
  const field = await page.$(
    'section[aria-label="Person details"] input[placeholder^="Something"]',
  );
  const box = await field.boundingBox();
  await move(box.x + 40, box.y + box.height / 2);
  await page.mouse.click(box.x + 40, box.y + box.height / 2);
  await sleep(400);
  await page.keyboard.type('Agree the Staff promotion timeline with HR', { delay: 38 });
  await sleep(500);
  await page.keyboard.press('Enter');
  await sleep(1800);

  // 3. close the panel, hand a card over to Marcus
  await page.keyboard.press('Escape');
  await sleep(900);
  const card = await centerOf(page, '.react-flow__node-item', 'Business Trip');
  const marcus = await centerOf(page, '.react-flow__node-person', 'Marcus Johnson');
  if (card && marcus) {
    await move(card.x, card.y);
    await sleep(300);
    await page.mouse.down();
    await move(marcus.x + 20, marcus.y - 10, 40);
    await sleep(500);
    await page.mouse.up();
    await sleep(1600);
  }

  // 4. a project across people
  const island = await page.$('aside[aria-label="Projects"]');
  const ib = await island.boundingBox();
  await move(ib.x + 40, ib.y + 18);
  await sleep(900);
  const row = await centerOf(page, 'aside[aria-label="Projects"] button', 'Release 2.1');
  if (row) {
    await move(row.x, row.y);
    await sleep(300);
    await page.mouse.click(row.x, row.y);
    await sleep(2200);
    await page.keyboard.press('Escape');
    await sleep(800);
  }

  // 5. the 1:1, prepared
  await page.evaluate((id) => window.__dev.actions.startOneOnOne(id), emily);
  await page.waitForFunction(() => window.__dev.useUI.getState().view === 'meeting');
  await sleep(1500);
  const tick = await page.$('[data-testid="one-on-one"] button[aria-label^="Mark as completed"]');
  if (tick) {
    const tb = await tick.boundingBox();
    await move(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await sleep(300);
    await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await sleep(1400);
  }
  const end = await page.$('button ::-p-text(End 1:1)');
  if (end) {
    const eb = await end.boundingBox();
    await move(eb.x + eb.width / 2, eb.y + eb.height / 2);
    await sleep(300);
    await page.mouse.click(eb.x + eb.width / 2, eb.y + eb.height / 2);
    await sleep(1600);
  }

  // 6. ⌘K
  await page.evaluate(() => window.__dev.useUI.getState().openDialog({ type: 'palette' }));
  await sleep(700);
  await page.keyboard.type('Patents', { delay: 60 });
  await sleep(1600);
  await page.keyboard.press('Escape');
  await sleep(1200);

  await recorder.stop();
  await browser.close();

  // webm → mp4 for Product Hunt and X; a 10 fps GIF for Reddit and LinkedIn if it stays small
  await run('ffmpeg', [
    '-y',
    '-i',
    `${OUT}/demo.webm`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-crf',
    '22',
    `${OUT}/demo.mp4`,
  ]);
  await run('ffmpeg', [
    '-y',
    '-i',
    `${OUT}/demo.mp4`,
    '-vf',
    'fps=10,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5',
    `${OUT}/demo.gif`,
  ]);
  await unlink(`${OUT}/demo.webm`); // the recording itself is only an intermediate
  for (const f of ['demo.mp4', 'demo.gif']) {
    const { size } = await stat(`${OUT}/${f}`);
    console.log(`${OUT}/${f} ${(size / 1_048_576).toFixed(1)} MB`);
  }
}
