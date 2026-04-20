import { startHost } from '../ui/wireHost.js';

// Outlook Web localizes aria-labels, so "Message body" only matches English
// UIs. `role="document"` is typical for the rendered email body and is
// language-neutral; `[data-convid]` appears on the conversation reader in
// new Outlook. We try each in order; the first hit wins for each body.
//
// Last audited: 2026-04-20 against outlook.office.com (Lithuanian locale).
const BODY_SELECTOR = [
  '[role="main"] [role="document"]',
  '[role="main"] [aria-label*="Message body"]',
  '[role="main"] [data-convid]',
].join(', ');

export function startOutlook(): void {
  startHost({
    bodySelector: BODY_SELECTOR,
    findAnchor: (body) => body.parentElement ?? body,
  });
}
