/**
 * Shared CSS for the in-page button and summary panel. Lives inside a Shadow
 * DOM host so host-page styles (Gmail's own CSS) can't leak in, and vice-versa.
 */
export const CONTENT_CSS = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.df-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #dadce0;
  border-radius: 18px;
  background: #fff;
  color: #3c4043;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s ease, box-shadow 0.12s ease;
}
.df-button:hover { background: #f8f9fa; box-shadow: 0 1px 2px rgba(60,64,67,.15); }
.df-button:focus-visible { outline: 2px solid #1a73e8; outline-offset: 2px; }
.df-button[aria-busy="true"] { opacity: 0.7; cursor: progress; }
.df-button .df-icon { font-size: 14px; line-height: 1; }

.df-panel {
  position: relative;
  margin: 12px 0;
  padding: 16px 18px;
  border: 1px solid #dadce0;
  border-left: 3px solid #1a73e8;
  border-radius: 6px;
  background: #f8faff;
  color: #202124;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 1px 2px rgba(60,64,67,.08);
}
.df-panel h3 {
  margin: 0 0 8px 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #5f6368;
}
.df-panel ul { margin: 0; padding-left: 18px; }
.df-panel li { margin-bottom: 4px; }
.df-panel li:last-child { margin-bottom: 0; }
.df-panel .df-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
.df-panel .df-link {
  background: none;
  border: none;
  padding: 0;
  color: #1a73e8;
  font-size: 13px;
  cursor: pointer;
  font-weight: 500;
}
.df-panel .df-link:hover { text-decoration: underline; }
.df-panel.df-error { border-left-color: #d93025; background: #fef7f7; }
.df-panel.df-error h3 { color: #d93025; }
`;
