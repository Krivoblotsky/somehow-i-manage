// Renders the social preview (Open Graph / Twitter card) image with the installed Chrome:
// the icon, the headline and a framed product shot on the app's dark canvas. Usage: npm run og
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = 'public/og.jpg';
const W = 1200;
const H = 630;

const data = async (path, type) =>
  `data:${type};base64,${(await readFile(path)).toString('base64')}`;
const [display, text, icon, shot] = await Promise.all([
  data('public/fonts/FixelDisplay-Bold.woff2', 'font/woff2'),
  data('public/fonts/FixelText-Regular.woff2', 'font/woff2'),
  data('public/icons/icon-512.png', 'image/png'),
  data('public/landing/map-focus.webp', 'image/webp'),
]);

const html = `<!doctype html><html><head><style>
  @font-face { font-family: 'Fixel Display'; font-weight: 700; src: url(${display}) format('woff2'); }
  @font-face { font-family: 'Fixel Text'; font-weight: 400; src: url(${text}) format('woff2'); }
  html, body { margin: 0; }
  .card {
    position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #1c1c1e;
    font-family: 'Fixel Display', system-ui, sans-serif; color: #fff;
  }
  .dots {
    position: absolute; inset: 0;
    background: radial-gradient(circle at 1px 1px, rgba(122, 109, 98, 0.55) 1px, transparent 1.6px) 0 0 / 30px 30px;
    mask-image: linear-gradient(to right, #000 55%, transparent 100%);
  }
  .glow {
    position: absolute; right: -200px; top: -200px; width: 820px; height: 820px; border-radius: 50%;
    background: radial-gradient(circle, rgba(60, 99, 234, 0.28), transparent 62%);
  }
  .left { position: absolute; left: 72px; top: 76px; width: 560px; }
  .icon { width: 92px; height: 92px; border-radius: 22px; box-shadow: 0 20px 50px rgba(0,0,0,.5); display: block; }
  h1 { margin: 40px 0 0; font-size: 66px; line-height: 1; letter-spacing: -0.03em; }
  p { margin: 26px 0 0; font-family: 'Fixel Text', system-ui, sans-serif; font-size: 24px; line-height: 1.4; color: #b8b8be; max-width: 500px; }
  .domain { position: absolute; left: 72px; bottom: 60px; font-family: 'Fixel Text', system-ui, sans-serif; font-size: 22px; color: #8e8e93; letter-spacing: 0.01em; }
  .frame {
    position: absolute; left: 660px; top: 110px; width: 760px; padding: 12px; border-radius: 26px;
    background: rgba(60, 99, 234, 0.22); box-shadow: 0 40px 100px rgba(0,0,0,.55);
    transform: rotate(-4deg); transform-origin: top left;
  }
  .frame img { display: block; width: 100%; border-radius: 16px; }
</style></head><body>
<div class="card">
  <div class="glow"></div>
  <div class="dots"></div>
  <div class="left">
    <img class="icon" src="${icon}" alt="">
    <h1>Work with people,<br>not tasks.</h1>
    <p>A task manager for managers. Every task, note and 1:1 lives with the person it’s about.</p>
  </div>
  <div class="domain">somehowimanage.app</div>
  <div class="frame"><img src="${shot}" alt=""></div>
</div></body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: OUT,
  type: 'jpeg',
  quality: 90,
  clip: { x: 0, y: 0, width: W, height: H },
});
console.log(`${OUT} ${W}×${H}`);
await browser.close();
