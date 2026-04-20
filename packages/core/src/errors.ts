export type DefluffErrorCode =
  | 'network'
  | 'auth'
  | 'rate_limit'
  | 'bad_request'
  | 'server'
  | 'aborted'
  | 'no_bullets'
  | 'unknown_provider';

export class DefluffError extends Error {
  override readonly name = 'DefluffError';
  readonly code: DefluffErrorCode;
  readonly status: number | undefined;
  readonly detail: unknown;

  constructor(
    code: DefluffErrorCode,
    message: string,
    options?: { status?: number; detail?: unknown; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.code = code;
    this.status = options?.status;
    this.detail = options?.detail;
  }
}

/**
 * Map an HTTP status to a DefluffErrorCode. Providers differ wildly in their
 * error shapes, so we normalize on the status + a best-effort message here and
 * let callers surface a friendly UX.
 */
export function codeFromStatus(status: number): DefluffErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  if (status >= 400) return 'bad_request';
  return 'unknown_provider';
}
