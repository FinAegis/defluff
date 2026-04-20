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
  --df-shadow: 0 1px 2px rgba(60,64,67,.15);
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
    --df-shadow: 0 1px 2px rgba(0,0,0,.4);
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
.df-panel h3 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--df-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}
.df-panel ul { margin: 0; padding-left: 18px; }
.df-panel li { margin-bottom: 4px; }
.df-panel li:last-child { margin-bottom: 0; }

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
.df-panel.df-error h3 { color: var(--df-error-accent); text-transform: none; letter-spacing: 0; font-size: 14px; font-weight: 600; }
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
`;
