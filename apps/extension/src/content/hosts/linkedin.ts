import { startHost } from '../ui/wireHost.js';

// LinkedIn messaging DOM (2025-ish): individual messages live in
// .msg-s-event-listitem__body under the conversation pane. Like Gmail and
// Outlook this is a best-effort starting point — validate against live
// LinkedIn and update the selector when it changes.
export function startLinkedIn(): void {
  startHost({
    bodySelector: '.msg-s-event-listitem__body',
    findAnchor: (body) => body.parentElement ?? body,
  });
}
