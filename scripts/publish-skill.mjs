#!/usr/bin/env node
// Wrapper around `clawhub publish` that reads version + slug out of the skill's
// SKILL.md frontmatter instead of requiring them on the command line. Keeps
// `apps/openclaw-skill/SKILL.md` as the single source of truth for what gets
// published.
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
  frontmatter[1].match(new RegExp(`^${key}:\\s*(\\S+)\\s*$`, 'm'))?.[1];

const version = getField('version');
// The default slug would come from the folder name ("openclaw-skill"), which
// is too generic — someone else already claimed it on ClawHub. We use the
// `name:` field so the slug stays in sync with the skill's identity.
const slug = getField('name');

if (!version) {
  console.error('No "version:" key in apps/openclaw-skill/SKILL.md frontmatter.');
  process.exit(1);
}
if (!slug) {
  console.error('No "name:" key in apps/openclaw-skill/SKILL.md frontmatter.');
  process.exit(1);
}

console.log(`Publishing apps/openclaw-skill as "${slug}" at version ${version}`);
execFileSync(
  'clawhub',
  ['publish', skillDir, '--slug', slug, '--version', version],
  { stdio: 'inherit' },
);
