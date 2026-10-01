// Renders the app icons from assets/icon-source.png with the installed Chrome: the art centred on
// black, cut to Apple's icon shape (a superellipse, n = 5) where the platform does not cut its own.
// Usage: npm run icons
import { readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SOURCE = 'assets/icon-source.png';
// How much of the icon the source image spans. Tune per artwork: this one is a wide shape on a
// transparent 1254px canvas (94% wide, 66% tall), so it sits at ~76% of the width when the canvas
// is 0.81 of the icon, and inside the maskable safe circle at 0.7.
const FILL = 0.81;
const FILL_MASKABLE = 0.7;
const JOBS = [
  // [output, size, shape, how much of the square the art canvas fills]
  ['public/favicon.png', 128, 'squircle', FILL],
  ['public/icons/icon-192.png', 192, 'squircle', FILL],
  ['public/icons/icon-512.png', 512, 'squircle', FILL],
  // the platform masks these itself, so they bleed to the edge and keep the art in the safe zone
  ['public/icons/maskable-512.png', 512, 'square', FILL_MASKABLE],
  ['public/icons/apple-touch-icon.png', 180, 'square', FILL],
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
// favicon.ico: browsers (Safari above all) ask for it by name; it holds 16, 32 and 48px PNGs.
const icoSizes = [16, 32, 48];
const pngs = [];
for (const size of icoSizes) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">
    <div style="position:relative;width:${size}px;height:${size}px;background:#000;clip-path: path('${squirclePath(size)}')">
      <img src="${art}" width="${Math.round(size * FILL)}" height="${Math.round(size * FILL)}"
        style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)">
    </div></body></html>`);
  pngs.push(
    await page.screenshot({
      omitBackground: true,
      clip: { x: 0, y: 0, width: size, height: size },
    }),
  );
}
await writeFile('public/favicon.ico', ico(icoSizes, pngs));
console.log(`public/favicon.ico ${icoSizes.join('/')}px`);
await browser.close();

/** An ICO container around PNG images (every current browser reads PNG entries). */
function ico(sizes, images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  images.forEach((png, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 0);
    e.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    entries.push(e);
  });
  return Buffer.concat([header, ...entries, ...images]);
}
