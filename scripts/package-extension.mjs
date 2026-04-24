#!/usr/bin/env node
// Build + zip the extension into a Chrome-Web-Store-ready artifact.
//
// Output: apps/defluff-v<version>-chrome.zip, with dist/ contents at the
// archive root (the store rejects nested-folder zips).
//
// The same zip is accepted by Edge Add-ons and Firefox AMO — our manifest
// declares browser_specific_settings.gecko so AMO will take it as-is.

import { execFileSync, spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const extensionDir = resolve(repoRoot, 'apps/extension');
const distDir = resolve(extensionDir, 'dist');
const appsDir = resolve(repoRoot, 'apps');

const pkg = JSON.parse(await readFile(resolve(extensionDir, 'package.json'), 'utf8'));
const version = pkg.version;
const zipPath = resolve(appsDir, `defluff-v${version}-chrome.zip`);

console.log(`→ Building @defluff/extension@${version}`);
run('pnpm', ['--filter', '@defluff/extension', 'build'], { cwd: repoRoot });

// Verify the manifest ended up with the version we expect — cheap guard
// against a stale manifest.config.ts that doesn't match package.json.
const manifestPath = resolve(distDir, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
if (manifest.version !== version) {
  throw new Error(
    `Version mismatch: package.json is ${version} but built manifest is ${manifest.version}. ` +
      `Update apps/extension/manifest.config.ts to match package.json.`,
  );
}

// Inject the Firefox-compatible `background.scripts` fallback. @crxjs/vite-
// plugin strips any `scripts` key we declare in manifest.config.ts (it only
// emits the Chrome-style `service_worker`). Without this fallback, AMO's
// linter rejects the upload with:
//   "Unsupported /background/service_worker manifest property used without
//    /background/scripts ... as Firefox-compatible fallback."
// Chrome ignores `scripts` when `service_worker` is present; Firefox reads
// `scripts` as an event-page entry. `type: "module"` applies to both.
if (manifest.background?.service_worker && !manifest.background.scripts) {
  manifest.background.scripts = [manifest.background.service_worker];
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('→ Patched dist/manifest.json: added background.scripts fallback for Firefox');
}

// Overwrite any previous zip at this version so the script is idempotent.
await rm(zipPath, { force: true });

console.log(`→ Zipping ${distDir} → ${zipPath}`);
// Zip the *contents* of dist/, not the dist folder itself. Chrome rejects
// archives that nest everything under a single top-level directory.
execFileSync('zip', ['-r', '-q', zipPath, '.'], { cwd: distDir });

const { size } = await stat(zipPath);
console.log(`✓ ${zipPath} (${(size / 1024).toFixed(1)} KB)`);
console.log('\nUpload at https://chrome.google.com/webstore/devconsole');
console.log('  → Defluff → Package → Upload new package');

function run(cmd, args, opts) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}`);
  }
}
