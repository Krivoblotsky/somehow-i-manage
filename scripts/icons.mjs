// Renders the app icons from assets/icon-source.png with the installed Chrome: the art centred on
// black, cut to Apple's icon shape (a superellipse, n = 5) where the platform does not cut its own.
// Usage: npm run icons
import { readFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SOURCE = 'assets/icon-source.png';
const JOBS = [
  // [output, size, shape, how much of the square the art fills]
  ['public/favicon.png', 128, 'squircle', 0.94],
  ['public/icons/icon-192.png', 192, 'squircle', 0.94],
  ['public/icons/icon-512.png', 512, 'squircle', 0.94],
  // the platform masks these itself, so they bleed to the edge and keep the art in the safe zone
  ['public/icons/maskable-512.png', 512, 'square', 0.84],
  ['public/icons/apple-touch-icon.png', 180, 'square', 0.94],
];

/** Apple's continuous corner, close enough: |x|^5 + |y|^5 = 1, as an SVG path of `size` px. */
function squirclePath(size, n = 5) {
  const r = size / 2;
  const pts = [];
  for (let i = 0; i < 720; i++) {
    const t = (i / 720) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${(r + x * r).toFixed(2)} ${(r + y * r).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const art = `data:image/png;base64,${(await readFile(SOURCE)).toString('base64')}`;
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
for (const [output, size, shape, fill] of JOBS) {
  const clip = shape === 'squircle' ? `clip-path: path('${squirclePath(size)}');` : '';
  const artSize = Math.round(size * fill);
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <div style="position:relative;width:${size}px;height:${size}px;background:#000;${clip}">
      <img src="${art}" width="${artSize}" height="${artSize}"
        style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">
    </div></body></html>`);
  await page.screenshot({
    path: output,
    omitBackground: shape === 'squircle',
    clip: { x: 0, y: 0, width: size, height: size },
  });
  console.log(`${output} ${size}×${size} ${shape}`);
}
await browser.close();
