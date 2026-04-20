import { startHost } from '../ui/wireHost.js';

// Outlook Web localizes aria-labels, so "Message body" only matches English
// UIs. `role="document"` is the language-neutral anchor for a rendered
// message — but new Outlook nests several role=document widgets inside each
// reader pane, which caused a cascade of De-Fluff buttons. We only match the
// **innermost** role=document (the leaf), using `:not(:has(...))`.
//
// Last audited: 2026-04-20 against outlook.office.com (Lithuanian locale).
const BODY_SELECTOR = [
  '[role="main"] [role="document"]:not(:has([role="document"]))',
  '[role="main"] [aria-label*="Message body"]',
  '[role="main"] [data-convid]:not(:has([data-convid]))',
].join(', ');

export function startOutlook(): void {
  startHost({
    bodySelector: BODY_SELECTOR,
    findAnchor: (body) => body.parentElement ?? body,
  });
}
