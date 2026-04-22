/**
 * Shared CSS for the in-page button and summary panel. Lives inside a Shadow
 * DOM host so host-page styles (Gmail's own CSS) can't leak in, and vice-versa.
 *
 * Respects `prefers-color-scheme: dark`. The host page's dark mode may not
 * match OS preference (Gmail/Outlook/LinkedIn each have their own toggle) but
 * matching OS is correct more often than hard-coding light.
 */
export const CONTENT_CSS = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  --df-bg: #ffffff;
  --df-panel-bg: #f8faff;
  --df-panel-border: #dadce0;
  --df-fg: #202124;
  --df-muted: #5f6368;
  --df-accent: #1a73e8;
  --df-accent-hover: #1558b0;

  --df-error-bg: #fef7f7;
  --df-error-accent: #d93025;

  --df-verdict-actionable: #d93025;
  --df-verdict-response: #1a73e8;
  --df-verdict-fyi: #5f6368;
  --df-verdict-noise: #8a8d91;

  --df-shadow: 0 1px 2px rgba(60,64,67,.15);
  --df-prompt-bg: #eef4ff;
}

@media (prefers-color-scheme: dark) {
  :host {
    --df-bg: #202124;
    --df-panel-bg: #2a2d31;
    --df-panel-border: #3c4043;
    --df-fg: #e8eaed;
    --df-muted: #9aa0a6;
    --df-accent: #8ab4f8;
    --df-accent-hover: #aecbfa;

    --df-error-bg: #2c1e1e;
    --df-error-accent: #f28b82;

    --df-verdict-actionable: #f28b82;
    --df-verdict-response: #8ab4f8;
    --df-verdict-fyi: #9aa0a6;
    --df-verdict-noise: #6b6e73;

    --df-shadow: 0 1px 2px rgba(0,0,0,.4);
    --df-prompt-bg: #2a2f36;
  }
}

.df-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--df-panel-border);
  border-radius: 18px;
  background: var(--df-bg);
  color: var(--df-fg);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s ease, box-shadow 0.12s ease;
}
.df-button:hover { background: color-mix(in srgb, var(--df-accent) 6%, var(--df-bg)); box-shadow: var(--df-shadow); }
.df-button:focus-visible { outline: 2px solid var(--df-accent); outline-offset: 2px; }
.df-button[aria-busy="true"] { cursor: progress; }
.df-button[aria-busy="true"] .df-icon {
  animation: df-spin 0.9s linear infinite;
  display: inline-block;
}
.df-button .df-icon { font-size: 14px; line-height: 1; }
@keyframes df-spin { to { transform: rotate(360deg); } }

.df-panel {
  position: relative;
  margin: 12px 0;
  padding: 16px 18px;
  border: 1px solid var(--df-panel-border);
  border-left: 3px solid var(--df-accent);
  border-radius: 6px;
  background: var(--df-panel-bg);
  color: var(--df-fg);
  font-size: 14px;
  line-height: 1.5;
  box-shadow: var(--df-shadow);
}
.df-panel:focus-visible { outline: 2px solid var(--df-accent); outline-offset: 1px; }

/* Reversed prompt block — the emotional payoff of the product.
   No left border: the panel already has one, two parallel bars looks busy.
   The muted uppercase label is enough to signal this is a different block. */
.df-prompt {
  margin: 0 0 14px;
  padding: 10px 14px;
  background: var(--df-prompt-bg);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.df-prompt-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--df-muted);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.df-prompt-text {
  margin: 0;
  font-style: italic;
  font-size: 14px;
  color: var(--df-fg);
}
/* When the email was written by a human there is no prompt to reverse.
   The authored block stays, but the block's tint drops to a neutral panel
   background so it visually reads as "nothing to see here, just a badge"
   rather than carrying the same weight as a reversed-prompt block. */
.df-prompt[data-authored="human"] {
  background: transparent;
  padding: 0 0 4px;
}
.df-prompt[data-authored="human"] .df-prompt-label { color: var(--df-muted); }
.df-authored-reason {
  font-style: normal;
  color: var(--df-muted);
  font-size: 13px;
}

/* Verdict row — icon + label + reason */
.df-verdict {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 13px;
  flex-wrap: wrap;
}
.df-verdict[data-verdict="actionable"] { color: var(--df-verdict-actionable); }
.df-verdict[data-verdict="response-needed"] { color: var(--df-verdict-response); }
.df-verdict[data-verdict="fyi"] { color: var(--df-verdict-fyi); }
.df-verdict[data-verdict="noise"] { color: var(--df-verdict-noise); }
.df-verdict-label {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
}
.df-verdict-reason {
  color: var(--df-fg);
  font-weight: 400;
  font-style: italic;
}

.df-panel ul { margin: 0; padding-left: 18px; }
.df-panel li { margin-bottom: 4px; }
.df-panel li:last-child { margin-bottom: 0; }

/* De-emphasize bullets when verdict is noise — the reader mostly cares about the verdict */
.df-panel[data-verdict="noise"] ul { opacity: 0.65; }

.df-actions {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.df-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--df-accent);
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
  line-height: 1.4;
}
.df-link:hover { text-decoration: underline; color: var(--df-accent-hover); }
.df-link:focus-visible { outline: 2px solid var(--df-accent); outline-offset: 2px; border-radius: 2px; }

.df-cta {
  background: var(--df-accent);
  color: var(--df-bg);
  border: none;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.df-cta:hover { background: var(--df-accent-hover); }
.df-cta:focus-visible { outline: 2px solid var(--df-accent); outline-offset: 2px; }

.df-panel.df-error { border-left-color: var(--df-error-accent); background: var(--df-error-bg); }
.df-panel.df-error h3 { color: var(--df-error-accent); text-transform: none; letter-spacing: 0; font-size: 14px; font-weight: 600; margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
.df-panel.df-error p { margin: 4px 0 0; color: var(--df-fg); font-size: 13px; }
.df-panel .df-error-icon { font-size: 14px; }

/* Screen-reader-only live region */
.df-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}

/* Thread mode — a thread verdict strip at the top (LEGIT / MIXED / SCAM)
   frames the reader's attention before the per-message detail.
   SCAM gets the error palette because that's the whole point of
   thread mode: progressive-reveal scams. */
.df-thread-verdict {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 4px;
  background: var(--df-panel-bg);
  border: 1px solid var(--df-panel-border);
  font-size: 13px;
}
.df-thread-verdict[data-thread-verdict="scam"] {
  background: var(--df-error-bg);
  border-color: var(--df-error-accent);
  color: var(--df-error-accent);
}
.df-thread-verdict[data-thread-verdict="mixed"] {
  color: var(--df-verdict-fyi);
}
.df-thread-verdict-icon { font-size: 14px; font-weight: 700; }
.df-thread-verdict-label {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
}
.df-thread-verdict-reason {
  color: var(--df-fg);
  font-weight: 400;
  font-style: italic;
}
.df-thread-verdict[data-thread-verdict="scam"] .df-thread-verdict-reason { color: inherit; }

/* Per-message block — a hairline-separated stack. The first block has no
   top rule so the thread verdict strip flows into it; subsequent blocks
   carry a top rule as the separator. */
.df-thread-message {
  padding: 12px 0 6px;
  border-top: 1px solid var(--df-panel-border);
}
.df-thread-message.df-thread-message-first {
  padding-top: 0;
  border-top: none;
}
.df-thread-message[data-verdict="noise"] ul { opacity: 0.65; }

.df-thread-message-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--df-muted);
}
.df-thread-message-sender {
  font-weight: 600;
  color: var(--df-fg);
  font-size: 13px;
}
.df-thread-message-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  letter-spacing: -0.01em;
}

/* Actions block at the bottom — a compact who/what list. Keeps the scan
   simple: read the thread verdict, then the actions. Bullets sit as a
   plain list without the Gmail-adjacent chrome. */
.df-thread-actions {
  margin: 10px 0 0;
  padding: 10px 0 0;
  border-top: 1px solid var(--df-panel-border);
}
.df-thread-actions-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--df-muted);
}
.df-thread-actions ul { margin: 0; padding-left: 18px; }
.df-thread-actions li { margin-bottom: 4px; font-size: 13px; }
.df-thread-actions li strong { margin-right: 4px; color: var(--df-fg); font-weight: 600; }

/* Match the SCAM palette around the entire panel when the thread reads as
   a scam — the reader needs the hint that this is not just informational. */
.df-panel[data-thread-verdict="scam"] { border-left-color: var(--df-error-accent); }
`;
