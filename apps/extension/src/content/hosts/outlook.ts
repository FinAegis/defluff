import { startHost } from '../ui/wireHost.js';

export function startOutlook(): void {
  startHost({
    bodySelector: '[role="main"] [aria-label*="Message body"]',
    findAnchor: (body) => body.parentElement ?? body,
  });
}
