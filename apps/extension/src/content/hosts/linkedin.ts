import { startHost } from '../ui/wireHost.js';

// LinkedIn messaging DOM: each message lives in .msg-s-event-listitem__body.
// The sender avatar is a sibling of the message content column, so the
// content column starts indented ~56px from the left. Appending the button
// to body.parentElement lands it under the body but at the left edge — we
// use decorateButton to indent the Shadow DOM host past the avatar column
// so the button sits beneath the message text itself.
//
// Last audited: 2026-04-20.
export function startLinkedIn(): void {
  startHost({
    bodySelector: '.msg-s-event-listitem__body',
    findAnchor: (body) => body.parentElement ?? body,
    insertAs: 'last',
    decorateButton: (host) => {
      host.style.marginLeft = '64px';
      host.style.marginTop = '6px';
      host.style.marginBottom = '6px';
    },
  });
}
