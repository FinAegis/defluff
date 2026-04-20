#!/usr/bin/env node
// Generate apps/outlook-addin/manifest.production.xml from manifest.xml by
// replacing the localhost dev URL with the hosted base URL. CI writes this
// into the Pages artifact; end users download it from there to install the
// add-in.
//
// Required env: DEFLUFF_ADDIN_BASE_URL (e.g. https://finaegis.github.io/defluff)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, '..');

const baseUrl = process.env.DEFLUFF_ADDIN_BASE_URL;
if (!baseUrl) {
  console.error('Set DEFLUFF_ADDIN_BASE_URL (e.g. https://finaegis.github.io/defluff).');
  process.exit(1);
}
const normalized = baseUrl.replace(/\/$/, '');

const src = readFileSync(join(pkgRoot, 'manifest.xml'), 'utf8');
const out = src.replaceAll('https://localhost:3000', normalized);
writeFileSync(join(pkgRoot, 'manifest.production.xml'), out);
console.log(`wrote manifest.production.xml (base = ${normalized})`);
