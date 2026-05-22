import {
  AUTHORED_ICONS,
  AUTHORED_LABELS,
  AUTHORED_PROMPT_LABELS,
  formatReversedPrompt,
  VERDICT_ICONS,
  VERDICT_LABELS,
  type Summary,
} from '@defluff/core';

/**
 * Render one Summary: authorship badge -> reversed prompt -> verdict row ->
 * specifics. React mirror of the content-script panel (src/content/ui/
 * panel.ts). All model text is placed as JSX children (never innerHTML), so a
 * hostile email body cannot inject markup.
 */
export function SummaryCard({ summary }: { summary: Summary }) {
  const { authored, authoredReason, reversedPrompt, verdict, verdictReason, bullets } =
    summary;

  const hasContent =
    !!authored || !!reversedPrompt || !!verdict || bullets.length > 0;
  if (!hasContent) {
    return (
      <div className="df-card">
        <p className="df-empty">
          The model didn&apos;t return a usable summary. Try again or switch
          models.
        </p>
      </div>
    );
  }

  return (
    <div className="df-card" data-verdict={verdict ?? undefined}>
      {/* Legacy fallback: model omitted the Authored line but returned a prompt. */}
      {!authored && reversedPrompt && (
        <section className="df-authored">
          <p className="df-authored-label">
            <span aria-hidden="true">💭</span> They probably asked an AI
          </p>
          <p className="df-prompt-text">{formatReversedPrompt(reversedPrompt)}</p>
        </section>
      )}

      {authored && (
        <section className="df-authored" data-authored={authored}>
          <p className="df-authored-label">
            <span aria-hidden="true">{AUTHORED_ICONS[authored]}</span>{' '}
            {authored === 'human'
              ? AUTHORED_LABELS.human
              : AUTHORED_PROMPT_LABELS[authored]}
          </p>
          {authored === 'human'
            ? authoredReason && (
                <p className="df-authored-reason">{authoredReason}</p>
              )
            : reversedPrompt && (
                <p className="df-prompt-text">
                  {formatReversedPrompt(reversedPrompt)}
                </p>
              )}
        </section>
      )}

      {verdict && (
        <div className="df-verdict" data-verdict={verdict}>
          <span aria-hidden="true">{VERDICT_ICONS[verdict]}</span>{' '}
          <span className="df-verdict-label">{VERDICT_LABELS[verdict]}</span>
          {verdictReason && (
            <span className="df-verdict-reason">{verdictReason}</span>
          )}
        </div>
      )}

      {bullets.length > 0 && (
        <ul className="df-bullets">
          {bullets.map((bullet, i) => (
            <li key={`${i}-${bullet.slice(0, 32)}`}>{bullet}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
