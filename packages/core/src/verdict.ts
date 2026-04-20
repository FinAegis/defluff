import type { Verdict } from './types.js';

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

/** Wrap a reversed prompt in curly double quotes for display. */
export function formatReversedPrompt(reversedPrompt: string): string {
  return `“${reversedPrompt}”`;
}
