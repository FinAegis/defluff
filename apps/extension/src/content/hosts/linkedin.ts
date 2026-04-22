import type { ThreadMessage } from '@defluff/core';
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
// Thread mode: when the user clicks any message's button, we walk the
// conversation pane and collect the full chain — sender + timestamp + body
// per message — so the model can catch progressive-reveal scams (benign
// recruiter intro → calendly drop → wallet ask). When only one message is
// found, the host falls back to single-message mode transparently.
//
// Last audited: 2026-04-22.
export function startLinkedIn(): void {
  startHost({
    bodySelector: '.msg-s-event-listitem__body',
    findAnchor: (body) => body.parentElement ?? body,
    insertAs: 'last',
    minBodyChars: 400,
    extractThread,
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

/**
 * Cap on messages sent to the model. LinkedIn conversations can run to
 * hundreds of short messages; past the last N the scam signal is already
 * in the recent tail, and token cost scales linearly. Eight is enough for
 * a recruiter-scam progression (intro + clarifying exchanges + calendly
 * drop + wallet ask) while keeping a single click cheap.
 */
const MAX_THREAD_MESSAGES = 8;

/**
 * Walk up from the clicked message body to the surrounding thread list and
 * collect every message, newest-last. Defensive: if the thread list can't
 * be found or no siblings exist, return [current body] so the caller falls
 * back to single-message mode without surfacing an error.
 *
 * LinkedIn groups consecutive messages from the same sender under one
 * avatar + name block; the name lives on the FIRST event-listitem of each
 * run. We walk sequentially and carry the last-seen sender forward so
 * collapsed runs still get attributed correctly.
 *
 * Timestamps appear in two places: per-message meta-time on the first
 * message of each run (".msg-s-event-listitem__meta-time"), and as a
 * separator above a run (".msg-s-message-list__time-heading"). We prefer
 * the per-message time and fall back to the heading when absent.
 */
function extractThread(clickedBody: HTMLElement): ThreadMessage[] {
  const list = findThreadList(clickedBody);
  if (!list) return [{ body: clickedBody.innerText.trim() }];

  const items = Array.from(
    list.querySelectorAll<HTMLElement>('.msg-s-event-listitem, li.msg-s-message-list__event'),
  );

  // Some LinkedIn layouts don't tag the listitem class — fall back to
  // walking the bodies directly and inferring context from DOM proximity.
  if (items.length === 0) {
    const bodies = Array.from(
      list.querySelectorAll<HTMLElement>('.msg-s-event-listitem__body'),
    );
    if (bodies.length === 0) return [{ body: clickedBody.innerText.trim() }];
    return bodies.map((body) => ({ body: body.innerText.trim() })).filter(hasBody);
  }

  const messages: ThreadMessage[] = [];
  let lastSender: string | undefined;
  let lastHeading: string | undefined;

  for (const item of items) {
    // Time-heading rows (run dividers) don't carry a message body but
    // update the timestamp context used by the next run.
    const heading = item
      .querySelector<HTMLElement>('.msg-s-message-list__time-heading')
      ?.innerText.trim();
    if (heading) lastHeading = heading;

    const body = item.querySelector<HTMLElement>('.msg-s-event-listitem__body');
    if (!body) continue;

    const sender =
      item
        .querySelector<HTMLElement>('.msg-s-message-group__name, .msg-s-event-listitem__name')
        ?.innerText.trim() || lastSender;
    if (sender) lastSender = sender;

    const timestamp =
      item
        .querySelector<HTMLElement>('.msg-s-message-group__timestamp, .msg-s-event-listitem__meta-time, time')
        ?.innerText.trim() || lastHeading;

    const msg: ThreadMessage = { body: body.innerText.trim() };
    if (sender) msg.sender = sender;
    if (timestamp) msg.timestamp = timestamp;
    if (hasBody(msg)) messages.push(msg);
  }

  if (messages.length === 0) return [{ body: clickedBody.innerText.trim() }];

  // Truncate from the head — the most recent messages carry the scam
  // reveal (calendly / wallet ask). The early "we'd love to chat" filler
  // is where tokens would be wasted.
  return messages.slice(-MAX_THREAD_MESSAGES);
}

function hasBody(msg: ThreadMessage): boolean {
  return msg.body.length > 0;
}

function findThreadList(start: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = start;
  while (node) {
    if (
      node.classList?.contains('msg-s-message-list') ||
      node.classList?.contains('msg-s-message-list-content')
    ) {
      return node;
    }
    node = node.parentElement;
  }
  // Fallback: query on document. A conversation pane can live in a portal.
  return (
    document.querySelector<HTMLElement>('.msg-s-message-list-content') ??
    document.querySelector<HTMLElement>('.msg-s-message-list')
  );
}
