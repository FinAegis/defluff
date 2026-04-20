import { startHost } from '../ui/wireHost.js';

// LinkedIn messaging DOM (2025-ish): individual messages live in
// .msg-s-event-listitem__body under the conversation pane. Like Gmail and
// Outlook this is a best-effort starting point — validate against live
// LinkedIn and update the selector when it changes.
//
// LinkedIn places the sender avatar as a sibling of the message content.
// Prepending to the body's parent crowds the avatar; we append instead so
// the button lands below the message, with breathing room.
export function startLinkedIn(): void {
  startHost({
    bodySelector: '.msg-s-event-listitem__body',
    findAnchor: (body) => body.parentElement ?? body,
    insertAs: 'last',
  });
}
