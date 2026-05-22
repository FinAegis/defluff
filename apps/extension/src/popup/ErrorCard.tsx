import type { UserError } from '@defluff/core';

/**
 * Render a UserError produced by core's toUserError(). The "configure" action
 * surfaces an "Open settings" button wired to onConfigure.
 */
export function ErrorCard({
  error,
  onConfigure,
}: {
  error: UserError;
  onConfigure: () => void;
}) {
  return (
    <div className="df-error">
      <strong>{error.title}</strong>
      {error.explanation && <p>{error.explanation}</p>}
      {error.details && (
        <details className="df-error-details">
          <summary>Provider response</summary>
          <pre>{error.details}</pre>
        </details>
      )}
      {error.action === 'configure' && (
        <button type="button" className="secondary" onClick={onConfigure}>
          Open settings
        </button>
      )}
    </div>
  );
}
