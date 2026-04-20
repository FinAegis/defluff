const BULLET_PATTERNS: readonly RegExp[] = [
  /^[-*•·]\s+(.+)$/,
  /^\d+[.)]\s+(.+)$/,
];

/**
 * Extract bullet strings from a model response. Lenient: accepts `-`, `*`, `•`,
 * `·`, `1.`, `1)` markers. Lines without a recognized marker are ignored, so a
 * preamble like "Here are the key points:" gets silently dropped.
 */
export function parseBullets(raw: string): string[] {
  const bullets: string[] = [];
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    for (const pattern of BULLET_PATTERNS) {
      const match = pattern.exec(line);
      if (match && match[1]) {
        bullets.push(stripInlineBold(match[1].trim()));
        break;
      }
    }
  }
  return bullets;
}

function stripInlineBold(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1');
}
