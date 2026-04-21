import { startHost } from '../ui/wireHost.js';

// LinkedIn messaging DOM: each message lives in .msg-s-event-listitem__body.
// The sender avatar is a sibling of the message content column, so the
// content column starts indented ~56px from the left. Appending the button
// to body.parentElement lands it under the body but at the left edge — we
// use decorateButton to indent the Shadow DOM host past the avatar column
// so the button sits beneath the message text itself.
//
// Short-message gate: LinkedIn is mostly one-liners ("thanks", "ok, cool")
// where a summarize button is pure clutter. 400 chars is roughly the point
// where a message is long enough that AI-generated fluff becomes possible —
// below that, there's nothing to de-fluff. Bodies under the threshold are
// left unmarked, so if the user clicks "…see more" to expand a truncated
// message past 400 chars, the next scan wires it.
//
// Last audited: 2026-04-21.
export function startLinkedIn(): void {
  startHost({
    bodySelector: '.msg-s-event-listitem__body',
    findAnchor: (body) => body.parentElement ?? body,
    insertAs: 'last',
    minBodyChars: 400,
    decorateButton: (host) => {
      host.style.marginLeft = '64px';
      host.style.marginTop = '6px';
      host.style.marginBottom = '6px';
    },
    decoratePanel: (host) => {
      // Match the button's indent so summary, button, and message text all
      // share the same left edge past the avatar column.
      host.style.marginLeft = '64px';
    },
  });
}
