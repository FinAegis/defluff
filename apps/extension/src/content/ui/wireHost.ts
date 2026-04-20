import { toUserError } from '@defluff/core';
import type { SummarizeResponse } from '../../shared/messages.js';
import { MSG_OPEN_OPTIONS, MSG_SUMMARIZE } from '../../shared/messages.js';
import { createButton, type ButtonController } from './button.js';
import { createPanel, type PanelError } from './panel.js';

const MARKER = 'data-defluff-wired';

/** Registry used by the keyboard shortcut to trigger the closest visible button. */
const TRIGGERS = new WeakMap<HTMLElement, () => void>();

export interface HostStrategy {
  /**
   * Selector for a "wire-eligible" message body. The caller does not need to
   * include the marker — wireHost appends `:not([data-defluff-wired])`.
   */
  bodySelector: string;
  /**
   * Where should the button be injected for a given body? Combined with
   * `insertAs` below to decide whether the button prepends or appends inside
   * this anchor.
   */
  findAnchor(body: HTMLElement): HTMLElement;
  /**
   * Insert position inside the anchor: 'first' (prepend) or 'last' (append).
   * Default is 'first', which works for Gmail and Outlook where the anchor
   * is the body's parent and we want the button at the top. LinkedIn places
   * the avatar next to the body, so LinkedIn uses 'last' to land the button
   * below the message, away from the profile picture.
   */
  insertAs?: 'first' | 'last';
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
      wireTarget(body, anchor, strategy.insertAs ?? 'first');
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

/**
 * Trigger the De-Fluff button closest to the viewport center. Returns true
 * if a button was triggered. Called by the content-script message handler
 * when the keyboard shortcut fires.
 */
export function triggerClosestButton(): boolean {
  const hosts = Array.from(
    document.querySelectorAll<HTMLElement>('[data-defluff="button"]'),
  );
  if (hosts.length === 0) return false;

  const viewportCenter = window.innerHeight / 2;
  let best: HTMLElement | null = null;
  let bestDistance = Infinity;

  for (const host of hosts) {
    const rect = host.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    const center = (rect.top + rect.bottom) / 2;
    const distance = Math.abs(center - viewportCenter);
    if (distance < bestDistance) {
      best = host;
      bestDistance = distance;
    }
  }

  const target = best ?? hosts[0] ?? null;
  if (!target) return false;
  const handler = TRIGGERS.get(target);
  if (!handler) return false;
  handler();
  return true;
}

function schedule(cb: () => void): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(cb, { timeout: 500 });
  } else {
    setTimeout(cb, 150);
  }
}

function wireTarget(
  body: HTMLElement,
  anchor: HTMLElement,
  insertAs: 'first' | 'last',
): void {
  let activePanel: { remove: () => void; focus: () => void } | null = null;
  let originalDisplay = '';
  let button: ButtonController;

  const trigger = async (): Promise<void> => {
    if (activePanel) {
      activePanel.focus();
      return;
    }
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
      button.focus();
    };

    const panel = createPanel({
      ...(response.ok ? { bullets: response.bullets } : {}),
      ...(response.ok ? {} : { error: buildErrorPayload(response, restore) }),
      ...(response.ok ? { onShowOriginal: restore } : {}),
      onDismiss: restore,
    });
    body.parentElement.insertBefore(panel.element, body);
    panel.focus();
    activePanel = panel;
  };

  button = createButton(() => {
    void trigger();
  });
  TRIGGERS.set(button.element, () => void trigger());
  if (insertAs === 'last') {
    anchor.appendChild(button.element);
  } else {
    anchor.insertBefore(button.element, anchor.firstChild);
  }
}

function buildErrorPayload(
  response: { ok: false; error: string; code?: Parameters<typeof toUserError>[0] },
  restore: () => void,
): PanelError {
  const userError = toUserError(response.code, response.error);
  const base: PanelError = { title: userError.title, explanation: userError.explanation };
  if (userError.action === 'configure') {
    base.cta = {
      label: 'Open settings',
      onClick: () => {
        void chrome.runtime.sendMessage({ type: MSG_OPEN_OPTIONS });
        restore();
      },
    };
  }
  return base;
}
