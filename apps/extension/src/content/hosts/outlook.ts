import { startHost } from '../ui/wireHost.js';

// Outlook Web's message body always has an `id` starting with
// `UniqueMessageBody_`. The id is language-neutral and has survived several
// Outlook UI revamps, including the move to outlook.cloud.microsoft.
//
// We deliberately do NOT fall back to `[role="document"]`:
//   - outlook.cloud.microsoft has `[role="main"]` missing from the reading
//     pane, so a `[role="main"] [role="document"]` selector doesn't match.
//   - The signature / "collapsed block" area under a message is a separate
//     element with the SAME role="document", same class, same aria-label,
//     but no UniqueMessageBody id — matching it would wire a second button
//     per message.
//
// Last audited: 2026-04-21 against outlook.cloud.microsoft (Lithuanian locale).
export function startOutlook(): void {
  startHost({
    bodySelector: '[id^="UniqueMessageBody"]',
    findAnchor: (body) => body.parentElement ?? body,
  });
}
