import { startHost } from '../ui/wireHost.js';

export function startGmail(): void {
  startHost({
    bodySelector: '.a3s.aiL',
    findAnchor: (body) => body.parentElement ?? body,
  });
}
