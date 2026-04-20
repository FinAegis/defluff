import type { DefluffErrorCode } from './errors.js';

export type UserErrorAction = 'configure' | 'retry' | 'none';

export interface UserError {
  /** Short human-readable headline. First thing the user reads. */
  title: string;
  /** One-sentence explanation of what went wrong and what to do. */
  explanation: string;
  /** Hints to the UI what kind of CTA to render. */
  action: UserErrorAction;
}

/**
 * Map internal DefluffError codes to user-facing copy. Clients translate the
 * `action` hint into a concrete button (e.g. "Open settings" for
 * `configure`, "Try again" for `retry`). The fallback message is only used
 * when an unknown code comes through — we try to surface something useful
 * even then.
 */
export function toUserError(
  code: DefluffErrorCode | undefined,
  fallback = 'Something went wrong. Try again.',
): UserError {
  if (code && code in MESSAGES) return MESSAGES[code];
  return { title: 'Something went wrong', explanation: fallback, action: 'retry' };
}

const MESSAGES: Record<DefluffErrorCode, UserError> = {
  network: {
    title: "Couldn't reach the provider",
    explanation: 'Check your internet connection, then try again.',
    action: 'retry',
  },
  auth: {
    title: "Your API key isn't working",
    explanation: 'It may have been revoked or run out of quota. Update it in settings.',
    action: 'configure',
  },
  rate_limit: {
    title: 'Too many requests right now',
    explanation: 'Your provider is throttling. Wait a minute and try again.',
    action: 'retry',
  },
  bad_request: {
    title: 'The provider rejected the request',
    explanation: 'The model name might be wrong. Check settings.',
    action: 'configure',
  },
  server: {
    title: 'The provider had a server error',
    explanation: 'Usually temporary. Try again in a moment.',
    action: 'retry',
  },
  aborted: {
    title: 'Request cancelled',
    explanation: '',
    action: 'none',
  },
  no_bullets: {
    title: "Couldn't find a summary to extract",
    explanation: 'The model returned an unusual response. Try a different model.',
    action: 'configure',
  },
  unknown_provider: {
    title: 'No provider configured',
    explanation: 'Open settings to pick an LLM provider and paste your key.',
    action: 'configure',
  },
};
