#!/usr/bin/env node
// Wrapper around `clawhub publish` that reads version + slug + display name
// out of the skill's SKILL.md frontmatter instead of requiring them on the
// command line. Keeps `apps/openclaw-skill/SKILL.md` as the single source of
// truth for what gets published.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = join(here, '..', 'apps', 'openclaw-skill');
const skillMd = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');

const frontmatter = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatter) {
  console.error('No frontmatter block found in apps/openclaw-skill/SKILL.md.');
  process.exit(1);
}

const getField = (key) =>
  frontmatter[1]
    .match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]
    ?.trim();

const version = getField('version');
// Slug defaults to the lowercased skill identifier. Sourced from `name:` so
// it never drifts from the folder / ClawHub URL.
const slug = getField('name');
// Display name shown on ClawHub. Falls back to a title-cased slug when the
// `displayName:` field is omitted.
const displayName =
  getField('displayName') ?? (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : undefined);

if (!version) {
  console.error('No "version:" key in apps/openclaw-skill/SKILL.md frontmatter.');
  process.exit(1);
}
if (!slug) {
  console.error('No "name:" key in apps/openclaw-skill/SKILL.md frontmatter.');
  process.exit(1);
}
if (!displayName) {
  console.error('Could not resolve a display name.');
  process.exit(1);
}

console.log(`Publishing "${displayName}" (slug: ${slug}, version: ${version})`);
execFileSync(
  'clawhub',
  ['publish', skillDir, '--slug', slug, '--name', displayName, '--version', version],
  { stdio: 'inherit' },
);
