#!/usr/bin/env node
// Wrapper around `clawhub publish` that reads the version out of the skill's
// SKILL.md frontmatter instead of requiring it on the command line. Keeps
// `apps/openclaw-skill/SKILL.md` as the single source of truth for the
// published version.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = join(here, '..', 'apps', 'openclaw-skill');
const skillMd = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');

const frontmatter = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
const version = frontmatter?.[1].match(/^version:\s*(\S+)\s*$/m)?.[1];

if (!version) {
  console.error('No "version:" key found in apps/openclaw-skill/SKILL.md frontmatter.');
  process.exit(1);
}

console.log(`Publishing apps/openclaw-skill at version ${version}`);
execFileSync('clawhub', ['publish', skillDir, '--version', version], { stdio: 'inherit' });
