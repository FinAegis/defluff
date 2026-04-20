import { startHost } from '../ui/wireHost.js';

// Outlook Web's most stable anchor is the `UniqueMessageBody_N` id pattern
// on each expanded message's body div. Language-neutral and the id prefix
// has survived multiple Outlook UI rewrites. The English aria-label and the
// leaf role=document selectors are kept as fallbacks for cases where the
// id pattern ever changes.
//
// Last audited: 2026-04-20 against outlook.office.com (Lithuanian locale).
// Live-verified DOM: <div id="UniqueMessageBody_5" role="document"
// aria-label="Pranešimo tekstas" class="OuGoX BIZfh">
const BODY_SELECTOR = [
  '[role="main"] [id^="UniqueMessageBody"]',
  '[role="main"] [aria-label*="Message body"]',
  '[role="main"] [role="document"]:not(:has([role="document"]))',
].join(', ');

export function startOutlook(): void {
  startHost({
    bodySelector: BODY_SELECTOR,
    findAnchor: (body) => body.parentElement ?? body,
  });
}
