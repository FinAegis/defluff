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
  });
});
