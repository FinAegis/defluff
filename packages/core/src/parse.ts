import type { Summary, Verdict } from './types.js';

const BULLET_PATTERNS: readonly RegExp[] = [
  /^[-*•·]\s+(.+)$/,
  /^\d+[.)]\s+(.+)$/,
];

const VERDICT_MAP: Record<string, Verdict> = {
  ACTIONABLE: 'actionable',
  'RESPONSE-NEEDED': 'response-needed',
  RESPONSENEEDED: 'response-needed',
  'RESPONSE NEEDED': 'response-needed',
  FYI: 'fyi',
  NOISE: 'noise',
};

/**
 * Parse a model response into a structured Summary. The LLM is instructed
 * to produce lines in a specific order, but we parse leniently so minor
 * formatting drift doesn't break the UI.
 */
export function parseSummary(raw: string): Summary {
  const result: Summary = { bullets: [] };

  for (const rawLine of raw.split('\n')) {
    // Strip bold markers early so every downstream matcher can assume plain text.
    const line = rawLine.replace(/\*\*/g, '').replace(/__/g, '').trim();
    if (!line) continue;

    if (result.reversedPrompt === undefined) {
      const prompt = extractPromptLine(line);
      if (prompt !== undefined) {
        result.reversedPrompt = prompt;
        continue;
      }
    }

    if (result.verdict === undefined) {
      const verdictPair = extractVerdictLine(line);
      if (verdictPair) {
        result.verdict = verdictPair.verdict;
        if (verdictPair.reason) result.verdictReason = verdictPair.reason;
        continue;
      }
    }

    const bullet = extractBullet(line);
    if (bullet) result.bullets.push(bullet);
  }

  return result;
}

/**
 * @deprecated Prefer `parseSummary` which also extracts the reversed prompt
 * and verdict. Kept only for backward compatibility with older callers.
 */
export function parseBullets(raw: string): string[] {
  return parseSummary(raw).bullets;
}

function extractPromptLine(line: string): string | undefined {
  const match = /^prompt\s*[:\-—]\s*(.+)$/i.exec(line);
  if (!match || !match[1]) return undefined;
  return stripQuotes(match[1].trim());
}

// Sort once at module scope; keys are static.
const SORTED_VERDICT_KEYS = Object.keys(VERDICT_MAP).sort(
  (a, b) => b.length - a.length,
);

function extractVerdictLine(
  line: string,
): { verdict: Verdict; reason?: string } | undefined {
  const match = /^verdict\s*[:\-—]\s*(.+)$/i.exec(line);
  if (!match || !match[1]) return undefined;
  const rest = match[1].trim();
  const upper = rest.toUpperCase();

  // Longest-first key match avoids stopping inside multi-word verdicts like
  // RESPONSE-NEEDED. Boundary check ensures we don't falsely match a prefix
  // (e.g., NOISE matching NOISEMAKER).
  for (const key of SORTED_VERDICT_KEYS) {
    if (!upper.startsWith(key)) continue;
    const boundary = upper.charAt(key.length);
    // Boundary is valid when it's empty OR any non-alphanumeric character.
    // Excluding only letters/digits lets common sentence punctuation
    // (period, semicolon, parenthesis) act as a separator, which the LLM
    // uses frequently ("Verdict: NOISE. Generic recruiter pitch").
    if (boundary !== '' && /[A-Z0-9]/.test(boundary)) continue;
    const verdict = VERDICT_MAP[key];
    if (!verdict) continue;
    const reason = rest.slice(key.length).replace(/^[\s—–\-:,.;]+/, '').trim();
    return reason ? { verdict, reason } : { verdict };
  }
  return undefined;
}

// "Bullet: ...", "Point 1: ...", "Item - ...", "Note: ..." — LLMs sometimes
// add these meta-labels even though the bullet marker already exists. Strip
// them so the rendered list reads cleanly regardless.
const META_PREFIX = /^(?:bullets?|points?|items?|notes?|facts?)\s*\d*\s*[:\-—]\s*/i;

function extractBullet(line: string): string | undefined {
  for (const pattern of BULLET_PATTERNS) {
    const match = pattern.exec(line);
    if (match && match[1]) {
      return match[1].replace(META_PREFIX, '').trim();
    }
  }
  return undefined;
}

function stripQuotes(s: string): string {
  return s
    .replace(/^["'“‘«]\s*/, '')
    .replace(/\s*["'”’»]$/, '')
    .trim();
}
