// Screenshot helper (Node, playwright-core). Run AFTER main.ts has written out/:
//   node screenshots.mjs
// Takes 3 shots at 1440x900 into screenshots/: 1-board.png (board), 2-detail.png
// (detail view of rank 1), 3-filtered.png (category filter applied). Converts to
// JPEG when a PNG would exceed the 512 KiB gate cap, targeting 300-350 KB each.
// Requires a Chromium executable: set CHROME_PATH, or a playwright install at
// ~/.cache/ms-playwright (see PLAN.md if the local browser cannot be used).
import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = join(here, 'out');
const shotsDir = join(here, 'screenshots');
mkdirSync(shotsDir, { recursive: true });

const candidates = [
  process.env.CHROME_PATH,
  ...['chromium-1255', 'chromium-1181', 'chromium-1179'].flatMap((d) => [
    join(process.env.HOME ?? '', '.cache/ms-playwright', d, 'chrome-linux/chrome'),
    join(process.env.HOME ?? '', '.cache/ms-playwright', d, 'chrome-linux64/chrome'),
  ]),
].filter((p) => p && existsSync(p));
if (candidates.length === 0) {
  process.stderr.write('screenshots: no Chromium found: set CHROME_PATH or install playwright chromium\n');
  process.exit(2);
}
const executablePath = candidates[0];
console.log(`screenshots: using ${executablePath}`);

const shots = [
  { file: '1-board.png', url: 'dashboard/index.html', note: 'board' },
  { file: '2-detail.png', url: 'dashboard/index.html#p=steakhouse-financial', note: 'detail' },
  { file: '3-filtered.png', url: 'dashboard/index.html#category=RWA', note: 'filtered (RWA)' },
];

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
for (const shot of shots) {
  // A fresh page per shot: goto() to a URL that differs only in its hash is a
  // same-document navigation and does NOT reload, so the hash state would never apply.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const url = `file://${join(out, shot.url)}`;
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  if (shot.note === 'detail') await page.waitForSelector('dialog[open]', { timeout: 5000 });
  const png = join(shotsDir, shot.file);
  await page.screenshot({ path: png, fullPage: false });
  await page.close();
  const size = statSync(png).size;
  console.log(`screenshots: ${shot.file} (${shot.note}) ${size} bytes`);
  if (size > 400_000) {
    // Convert to JPEG q82; the gate accepts PNG or JPEG, each <= 512 KiB.
    const jpg = png.replace(/\.png$/, '.jpg');
    execSync(`python3 -c "from PIL import Image; im=Image.open('${png}').convert('RGB'); im.save('${jpg}','JPEG',quality=82,optimize=True)"`, { stdio: 'inherit' });
    const jsize = statSync(jpg).size;
    console.log(`screenshots: ${shot.file} -> ${jpg.split('/').pop()} ${jsize} bytes`);
    unlinkSync(png);
    renameSync(jpg, png.replace(/\.png$/, '.jpg'));
  }
}
await browser.close();
console.log('screenshots: done. Check the images, then re-run main.ts to rebuild the dossier.');
