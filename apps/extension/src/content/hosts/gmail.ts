import { startHost } from '../ui/wireHost.js';

// Gmail's message body is the single DOM landmark that hasn't been renamed
// in years. `.a3s.aiL` matches only expanded message bodies, so trimmed
// quoted replies are skipped by construction unless the user expands them.
// The button sits above the body (in the body's parent) — we tried placing
// it on the `.btC` action bar per requirements.md §2.A, but above-body read
// better in practice.
//
// Last audited: 2026-04-21 against mail.google.com (en-US).
export function startGmail(): void {
  startHost({
    bodySelector: '.a3s.aiL',
    findAnchor: (body) => body.parentElement ?? body,
  });
}
