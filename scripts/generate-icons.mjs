#!/usr/bin/env node
// Regenerate extension + Outlook add-in PNG icons from assets/icon.svg.
// Run: pnpm icons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..');
const svg = readFileSync(join(repoRoot, 'assets/icon.svg'));

const targets = [
  { dir: 'apps/extension/public/icons', sizes: [16, 32, 48, 128] },
  { dir: 'apps/outlook-addin/public/icons', sizes: [16, 32, 64, 80, 128] },
];

for (const { dir, sizes } of targets) {
  const outDir = join(repoRoot, dir);
  mkdirSync(outDir, { recursive: true });
  for (const size of sizes) {
    const png = await sharp(svg, { density: 384 })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const outPath = join(outDir, `icon-${size}.png`);
    writeFileSync(outPath, png);
    console.log(`wrote ${dir}/icon-${size}.png`);
  }
}
