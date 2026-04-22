import type {
  Authored,
  Summary,
  ThreadAction,
  ThreadMessageSummary,
  ThreadSummary,
  ThreadVerdict,
  Verdict,
} from './types.js';

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

const AUTHORED_MAP: Record<string, Authored> = {
  'AI-ASSISTED': 'ai-assisted',
  'AI ASSISTED': 'ai-assisted',
  AIASSISTED: 'ai-assisted',
  AI: 'ai',
  HUMAN: 'human',
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

    if (result.authored === undefined) {
      const authoredPair = extractAuthoredLine(line);
      if (authoredPair) {
        result.authored = authoredPair.authored;
        if (authoredPair.reason) result.authoredReason = authoredPair.reason;
        continue;
      }
    }

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
  const stripped = stripQuotes(match[1].trim());
  // A Prompt line is only emitted when authorship is AI/AI-assisted. If the
  // model lapses and writes an empty placeholder ("", "n/a", "none"), treat
  // it as absent so the UI can cleanly omit the reversed-prompt block.
  if (!stripped) return undefined;
  if (/^(?:n\/?a|none|not\s+applicable)$/i.test(stripped)) return undefined;
  return stripped;
}

// Sort once at module scope; keys are static.
const SORTED_VERDICT_KEYS = Object.keys(VERDICT_MAP).sort(
  (a, b) => b.length - a.length,
);

const SORTED_AUTHORED_KEYS = Object.keys(AUTHORED_MAP).sort(
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

function extractAuthoredLine(
  line: string,
): { authored: Authored; reason?: string } | undefined {
  const match = /^authored\s*[:\-—]\s*(.+)$/i.exec(line);
  if (!match || !match[1]) return undefined;
  const rest = match[1].trim();
  const upper = rest.toUpperCase();

  // Longest-first prevents "AI" from eating "AI-ASSISTED". Boundary check
  // uses the same logic as the verdict matcher, but treats "-" and " " as
  // internal separators in known multi-word keys (already collapsed in
  // the map key variants).
  for (const key of SORTED_AUTHORED_KEYS) {
    if (!upper.startsWith(key)) continue;
    const boundary = upper.charAt(key.length);
    if (boundary !== '' && /[A-Z0-9]/.test(boundary)) continue;
    const authored = AUTHORED_MAP[key];
    if (!authored) continue;
    const reason = rest.slice(key.length).replace(/^[\s—–\-:,.;]+/, '').trim();
    return reason ? { authored, reason } : { authored };
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

const THREAD_VERDICT_MAP: Record<string, ThreadVerdict> = {
  LEGIT: 'legit',
  SCAM: 'scam',
};

/**
 * Parse a thread-mode model response into a structured ThreadSummary.
 *
 * Input shape (authored by `THREAD_SYSTEM_PROMPT`):
 *   <message block 1>
 *   ===
 *   <message block 2>
 *   ===
 *   Thread: ... — ...
 *   Actions:
 *   - ...: ...
 *
 * Each message block starts with a "Sender — timestamp" header followed by
 * the same Authored/Prompt/Verdict/bullets shape parsed by parseSummary.
 * The thread tail is identified by the "Thread:" line; anything after it
 * up to an "Actions:" header is the verdict; anything after "Actions:" is
 * the action list.
 *
 * The parser is lenient — if the model drops the === separators, it falls
 * back to splitting on blank lines before a Sender-header-shaped line. If
 * the Thread line is missing, threadVerdict stays undefined and the caller
 * renders whatever messages it could extract.
 */
export function parseThreadSummary(raw: string): ThreadSummary {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  const blocks = splitThreadBlocks(normalized);

  const messages: ThreadMessageSummary[] = [];
  let threadVerdict: ThreadVerdict | undefined;
  let threadVerdictReason: string | undefined;
  const actions: ThreadAction[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (isThreadTailBlock(trimmed)) {
      const tail = parseThreadTail(trimmed);
      if (tail.threadVerdict) threadVerdict = tail.threadVerdict;
      if (tail.threadVerdictReason) threadVerdictReason = tail.threadVerdictReason;
      actions.push(...tail.actions);
      continue;
    }

    const message = parseMessageBlock(trimmed);
    if (message) messages.push(message);
  }

  const out: ThreadSummary = { messages, actions };
  if (threadVerdict) out.threadVerdict = threadVerdict;
  if (threadVerdictReason) out.threadVerdictReason = threadVerdictReason;
  return out;
}

function splitThreadBlocks(raw: string): string[] {
  // Primary: === on its own line. Accept 3+ equals for leniency.
  if (/^={3,}$/m.test(raw)) {
    return raw.split(/^={3,}$/m);
  }
  // Fallback: split on blank lines that precede either a sender-header or
  // the thread tail. This mostly catches drift where the model forgot the
  // separators but kept the block structure.
  const parts: string[] = [];
  let current: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    const startsNewBlock =
      current.length > 0 &&
      current[current.length - 1]?.trim() === '' &&
      (looksLikeSenderHeader(trimmed) || /^Thread\s*:/i.test(trimmed));
    if (startsNewBlock) {
      parts.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) parts.push(current.join('\n'));
  return parts.length > 1 ? parts : [raw];
}

function looksLikeSenderHeader(line: string): boolean {
  if (!line) return false;
  // "Sender — timestamp", "[2] Sender · timestamp", or variants. The key
  // signal is that it's NOT a known label line (Authored/Prompt/Verdict/-).
  if (/^(authored|prompt|verdict|thread|actions?)\s*[:\-—]/i.test(line)) return false;
  if (line.startsWith('-') || line.startsWith('*')) return false;
  // Sender and timestamp separated by — / - / · / :. At least some
  // non-empty left-hand side with at least one letter.
  return /[A-Za-zÀ-ÿ]/.test(line) && /[—\-·:]/.test(line);
}

function isThreadTailBlock(block: string): boolean {
  return /^\s*Thread\s*[:\-—]/im.test(block);
}

interface ThreadTailParsed {
  threadVerdict?: ThreadVerdict;
  threadVerdictReason?: string;
  actions: ThreadAction[];
}

function parseThreadTail(block: string): ThreadTailParsed {
  const lines = block.split('\n');
  const out: ThreadTailParsed = { actions: [] };
  let inActions = false;
  for (const raw of lines) {
    const line = raw.replace(/\*\*/g, '').replace(/__/g, '').trim();
    if (!line) continue;

    if (!inActions) {
      const threadMatch = /^thread\s*[:\-—]\s*(.+)$/i.exec(line);
      if (threadMatch && threadMatch[1]) {
        const parsed = extractThreadVerdict(threadMatch[1].trim());
        if (parsed) {
          out.threadVerdict = parsed.verdict;
          if (parsed.reason) out.threadVerdictReason = parsed.reason;
        }
        continue;
      }
      if (/^actions?\s*[:\-—]?\s*$/i.test(line)) {
        inActions = true;
        continue;
      }
    }

    if (inActions) {
      const action = extractActionLine(line);
      if (action) out.actions.push(action);
    }
  }
  return out;
}

function extractThreadVerdict(
  rest: string,
): { verdict: ThreadVerdict; reason?: string } | undefined {
  const upper = rest.toUpperCase();
  // MIXED is intentionally absent — legacy responses that emit it fall
  // through and the thread simply has no thread-level verdict, which is
  // the right behaviour (the per-message NOISE tags carry the signal).
  for (const key of ['LEGIT', 'SCAM']) {
    if (!upper.startsWith(key)) continue;
    const boundary = upper.charAt(key.length);
    if (boundary !== '' && /[A-Z0-9]/.test(boundary)) continue;
    const verdict = THREAD_VERDICT_MAP[key];
    if (!verdict) continue;
    const reason = rest.slice(key.length).replace(/^[\s—–\-:,.;]+/, '').trim();
    return reason ? { verdict, reason } : { verdict };
  }
  return undefined;
}

function extractActionLine(line: string): ThreadAction | undefined {
  // "- Alice: approve finalized vendor list"
  const match = /^[-*•·]\s+(.+)$/.exec(line);
  if (!match || !match[1]) return undefined;
  const content = match[1].trim();
  // "Alice: do the thing". Allow em-dash and en-dash as the separator too.
  const splitMatch = /^([^:—–]{1,40})\s*[:\-—–]\s*(.+)$/.exec(content);
  if (!splitMatch || !splitMatch[1] || !splitMatch[2]) return undefined;
  return { who: splitMatch[1].trim(), action: splitMatch[2].trim() };
}

function parseMessageBlock(block: string): ThreadMessageSummary | undefined {
  const lines = block.split('\n');
  let header: string | undefined;
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine.replace(/\*\*/g, '').replace(/__/g, '').trim();
    if (!line) continue;
    if (looksLikeSenderHeader(line)) {
      header = line;
      headerIndex = i;
      break;
    }
    // If the first non-empty line is already an Authored/Verdict/Prompt
    // line, there is no sender header — treat the whole block as the body.
    if (/^(authored|prompt|verdict)\s*[:\-—]/i.test(line)) break;
  }

  const body = (headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines).join('\n');
  const summary = parseSummary(body);
  const hasAnySignal =
    !!summary.authored ||
    !!summary.reversedPrompt ||
    !!summary.verdict ||
    summary.bullets.length > 0;
  if (!hasAnySignal && !header) return undefined;

  const out: ThreadMessageSummary = { summary };
  if (header) {
    const parsed = parseSenderHeader(header);
    if (parsed.sender) out.sender = parsed.sender;
    if (parsed.timestamp) out.timestamp = parsed.timestamp;
  }
  return out;
}

function parseSenderHeader(line: string): { sender?: string; timestamp?: string } {
  // Strip a leading "[1] " marker if the model echoed our user-prompt
  // numbering back at us.
  const stripped = line.replace(/^\[\d+\]\s*/, '');
  // Split on the first of em-dash / en-dash / " · " / " - " / " : ".
  const match = /^([^—–·:]+?)\s*[—–·:\-]\s*(.+)$/.exec(stripped);
  if (match && match[1] && match[2]) {
    return { sender: match[1].trim(), timestamp: match[2].trim() };
  }
  return stripped ? { sender: stripped.trim() } : {};
}
