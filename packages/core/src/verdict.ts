import type { Authored, Verdict } from './types.js';

/**
 * User-facing labels for each verdict. Shared between the extension and the
 * Outlook add-in so a new verdict only needs to be defined here.
 */
export const VERDICT_LABELS: Record<Verdict, string> = {
  actionable: 'Actionable',
  'response-needed': 'Response needed',
  fyi: 'FYI',
  noise: 'Noise',
};

export const VERDICT_ICONS: Record<Verdict, string> = {
  actionable: '⚡',
  'response-needed': '💬',
  fyi: 'ℹ',
  noise: '🗑',
};

/**
 * Short badge labels for the authorship classification. This is what the
 * reader sees instead of the old always-on "They probably asked an AI" —
 * the whole point of the detection step is so the UI can say something
 * true.
 */
export const AUTHORED_LABELS: Record<Authored, string> = {
  ai: 'Written by AI',
  'ai-assisted': 'AI-polished',
  human: 'Human-written',
};

export const AUTHORED_ICONS: Record<Authored, string> = {
  ai: '🤖',
  'ai-assisted': '✨',
  human: '✍️',
};

/**
 * Label shown immediately above the reversed prompt in the panel. Only AI
 * and AI-assisted emails ever show this — human emails have no prompt to
 * reverse, so the block is suppressed entirely.
 */
export const AUTHORED_PROMPT_LABELS: Record<Exclude<Authored, 'human'>, string> = {
  ai: 'Written by AI — the prompt',
  'ai-assisted': 'AI-polished — probable prompt',
};

/** Wrap a reversed prompt in curly double quotes for display. */
export function formatReversedPrompt(reversedPrompt: string): string {
  return `“${reversedPrompt}”`;
}
