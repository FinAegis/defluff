import { startHost } from '../ui/wireHost.js';

// Outlook Web's message body has both:
//   - role="document"
//   - id starting with "UniqueMessageBody_"
// on the same element. The user confirmed role=document was matching live
// (cascading was a separate wireHost bug fixed in PR #26). Using both
// anchors as OR alternatives gives belt-and-suspenders resilience to
// future Outlook revamps — if they drop the id prefix, role=document
// still works; if they drop the role, the id still works.
//
// Last audited: 2026-04-20 against outlook.office.com (Lithuanian locale).
export function startOutlook(): void {
  startHost({
    bodySelector: '[role="main"] [id^="UniqueMessageBody"], [role="main"] [role="document"]',
    findAnchor: (body) => body.parentElement ?? body,
  });
}
