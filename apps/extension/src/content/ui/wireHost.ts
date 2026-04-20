import type { SummarizeResponse } from '../../shared/messages.js';
import { MSG_SUMMARIZE } from '../../shared/messages.js';
import { createButton } from './button.js';
import { createPanel } from './panel.js';

const MARKER = 'data-defluff-wired';

export interface HostStrategy {
  /**
   * Selector for a "wire-eligible" message body. The caller does not need to
   * include the marker — wireHost appends `:not([data-defluff-wired])`.
   */
  bodySelector: string;
  /**
   * Where should the button be injected for a given body? The button is
   * prepended (`insertBefore(..., anchor.firstChild)`) into this anchor.
   */
  findAnchor(body: HTMLElement): HTMLElement;
}

/**
 * Bootstrap a content-script host. Returns a disconnect function for tests or
 * manual teardown; nothing calls it in production, but the handle is there.
 *
 * Perf notes (Gmail/Outlook are SPAs that fire thousands of mutations/sec):
 *   - Observer scope is narrowed to `[role="main"]` when present.
 *   - Scan is idle-scheduled and coalesced — at most one run in flight.
 *   - Scans short-circuit when there are no unwired bodies (`:not()` filter).
 */
export function startHost(strategy: HostStrategy): () => void {
  let pending = false;

  const scan = (): void => {
    const bodies = document.querySelectorAll<HTMLElement>(
      `${strategy.bodySelector}:not([${MARKER}])`,
    );
    if (bodies.length === 0) return;
    for (const body of bodies) {
      body.setAttribute(MARKER, 'true');
      const anchor = strategy.findAnchor(body);
      wireTarget(body, anchor);
    }
  };

  const onMutations: MutationCallback = (mutations) => {
    if (pending) return;
    if (!mutations.some((m) => m.addedNodes.length > 0)) return;
    pending = true;
    schedule(() => {
      pending = false;
      scan();
    });
  };

  const observer = new MutationObserver(onMutations);
  const scope = document.querySelector('[role="main"]') ?? document.body;
  observer.observe(scope, { childList: true, subtree: true });
  scan();
  return () => observer.disconnect();
}

function schedule(cb: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(cb, { timeout: 500 });
  } else {
    setTimeout(cb, 150);
  }
}

function wireTarget(body: HTMLElement, anchor: HTMLElement): void {
  let activePanel: { remove: () => void } | null = null;
  let originalDisplay = '';

  const button = createButton(async () => {
    if (activePanel) return;
    if (!body.isConnected) return;
    button.setBusy(true);

    const emailText = body.innerText.trim();
    let response: SummarizeResponse;
    try {
      response = await chrome.runtime.sendMessage({ type: MSG_SUMMARIZE, text: emailText });
    } catch (err) {
      response = {
        ok: false,
        error: err instanceof Error ? err.message : 'Extension error',
      };
    }

    button.setBusy(false);

    if (!body.isConnected || !body.parentElement) return;

    originalDisplay = body.style.display;
    if (response.ok) body.style.display = 'none';

    const restore = (): void => {
      body.style.display = originalDisplay;
      activePanel?.remove();
      activePanel = null;
    };

    const panel = createPanel({
      ...(response.ok ? { bullets: response.bullets } : { error: response.error }),
      ...(response.ok ? { onShowOriginal: restore } : {}),
      onDismiss: restore,
    });
    body.parentElement.insertBefore(panel.element, body);
    activePanel = panel;
  });

  anchor.insertBefore(button.element, anchor.firstChild);
}
