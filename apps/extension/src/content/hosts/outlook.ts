import { startHost } from '../ui/wireHost.js';

// Outlook Web's message body always has an `id` starting with
// `UniqueMessageBody_`. Verified live on outlook.office.com (Lithuanian
// locale) with both single and threaded conversation views:
//   <div id="UniqueMessageBody_1" role="document" ...>
//   <div id="UniqueMessageBody_5" role="document" ...>
//
// This id prefix is language-neutral and has outlasted multiple Outlook UI
// revamps. Any future regression: re-audit and update in place.
export function startOutlook(): void {
  startHost({
    bodySelector: '[role="main"] [id^="UniqueMessageBody"]',
    findAnchor: (body) => body.parentElement ?? body,
  });
}
