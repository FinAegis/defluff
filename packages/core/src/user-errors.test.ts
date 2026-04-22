import { describe, expect, it } from 'vitest';
import { toUserError } from './user-errors.js';

describe('toUserError', () => {
  it('maps auth to a configure action', () => {
    expect(toUserError('auth')).toMatchObject({ action: 'configure' });
  });

  it('maps rate_limit to a retry action', () => {
    expect(toUserError('rate_limit')).toMatchObject({ action: 'retry' });
  });

  it('maps unknown_provider to a configure action with setup copy', () => {
    const err = toUserError('unknown_provider');
    expect(err.action).toBe('configure');
    expect(err.explanation).toMatch(/settings/i);
  });

  it('falls back for unknown codes', () => {
    const err = toUserError(undefined);
    expect(err.title).toBe('Something went wrong');
  });

  it('honors an explicit fallback message', () => {
    const err = toUserError(undefined, 'Custom fallback');
    expect(err.explanation).toBe('Custom fallback');
    expect(err.details).toBeUndefined();
  });

  it('surfaces raw provider message as details when code is known', () => {
    const err = toUserError(
      'bad_request',
      "The model 'gpt-5.4' does not exist or you do not have access to it.",
    );
    // Friendly preset is preserved so the user still gets a useful headline.
    expect(err.title).toBe('The provider rejected the request');
    // Raw provider message is kept alongside for developers.
    expect(err.details).toBe(
      "The model 'gpt-5.4' does not exist or you do not have access to it.",
    );
  });

  it('omits details when the raw message duplicates the canned explanation', () => {
    const err = toUserError('bad_request', 'The model name might be wrong. Check settings.');
    expect(err.details).toBeUndefined();
  });
});
