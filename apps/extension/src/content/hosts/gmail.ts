import { startHost } from '../ui/wireHost.js';

// requirements.md §2.A: the De-Fluff button should sit next to Reply /
// Forward, not float above the message body. Gmail renders its per-message
// action bar as `.btC` — a classname that's survived since the 2018ish
// redesign. We anchor on the body (`.a3s.aiL` — the one DOM landmark Gmail
// hasn't renamed) and walk up to the message container (`.adn.ads`) to find
// the `.btC` inside, so conversation threads don't pull a neighbor message's
// action bar by mistake.
//
// Fallback: if a message has no action bar (trimmed quoted replies, delivery
// notices, calendar invites), fall back to the body's parent so the button
// still appears somewhere visible instead of being silently dropped.
//
// Last audited: 2026-04-21 against mail.google.com (en-US).
export function startGmail(): void {
  startHost({
    bodySelector: '.a3s.aiL',
    findAnchor: (body) => findActionBar(body) ?? body.parentElement ?? body,
    insertAs: 'last',
  });
}

function findActionBar(body: HTMLElement): HTMLElement | null {
  const message = body.closest<HTMLElement>('.adn, .ads');
  if (!message) return null;
  return message.querySelector<HTMLElement>('.btC');
}
