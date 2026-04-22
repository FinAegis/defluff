import { toUserError, type Summary, type ThreadMessage, type ThreadSummary } from '@defluff/core';
import type {
  SummarizeResponse,
  SummarizeThreadResponse,
} from '../../shared/messages.js';
import {
  MSG_OPEN_OPTIONS,
  MSG_SUMMARIZE,
  MSG_SUMMARIZE_THREAD,
} from '../../shared/messages.js';
import { createButton, type ButtonController } from './button.js';
import { createPanel, type PanelError } from './panel.js';

const MARKER = 'data-defluff-wired';

/** Registry used by the keyboard shortcut to trigger the closest visible button. */
const TRIGGERS = new WeakMap<HTMLElement, () => void>();

export interface HostStrategy {
  /**
   * Selector for a "wire-eligible" message body. May contain comma-separated
   * alternatives — the caller does not need to include the marker filter;
   * wireHost applies `:not([data-defluff-wired])` to every entry.
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
  /**
   * Per-host style tweaks applied to the Shadow DOM host element after it's
   * created. Hosts like LinkedIn use this to indent the button past the
   * avatar column.
   */
  decorateButton?(host: HTMLElement): void;
  /**
   * Same as decorateButton, but for the summary panel host. LinkedIn needs
   * this to indent the panel past the avatar column so it lines up with the
   * button and the message text.
   */
  decoratePanel?(host: HTMLElement): void;
  /**
   * Skip bodies whose text is shorter than this many characters. Used by
   * LinkedIn to avoid button-stuffing on one-liner chats ("thanks", "ok").
   * Short bodies are NOT marked as wired, so if the user expands a
   * truncated message and crosses the threshold, the next scan picks it up.
   */
  minBodyChars?: number;
  /**
   * Optional thread extractor. When present, the host calls it on click
   * and sends the returned message list to the service worker as a
   * SUMMARIZE_THREAD request. If the extractor returns ≤1 message, the
   * host falls back to single-message SUMMARIZE so the round-trip shape
   * is unchanged for hosts that don't have a structured thread DOM (e.g.
   * Gmail until its adapter is updated). Defensive: the extractor MUST
   * NOT throw — return an empty array / a single message instead.
   */
  extractThread?(body: HTMLElement): ThreadMessage[];
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

  // Apply the :not([marker]) filter to EVERY entry in the comma-separated
  // selector list. Appending it to the full string only scopes it to the
  // final entry in CSS grammar, which caused wired elements to match again
  // on every MutationObserver tick.
  const scopedSelector = strategy.bodySelector
    .split(/\s*,\s*/)
    .filter(Boolean)
    .map((s) => `${s}:not([${MARKER}])`)
    .join(', ');

  const scan = (): void => {
    const bodies = document.querySelectorAll<HTMLElement>(scopedSelector);
    if (bodies.length === 0) return;
    for (const body of bodies) {
      // Length gate: don't mark, so the body re-qualifies if the user
      // expands a truncated message and pushes it over the threshold.
      if (
        strategy.minBodyChars !== undefined &&
        body.innerText.trim().length < strategy.minBodyChars
      ) {
        continue;
      }
      body.setAttribute(MARKER, 'true');
      const anchor = strategy.findAnchor(body);
      // Anchor-level dedup: Gmail (and probably others) re-renders the body
      // element after a reply is sent, which drops our marker — but the
      // anchor (body.parentElement) sticks around with the old button still
      // attached. Skipping here prevents a second button from stacking into
      // the same anchor on the next MutationObserver tick.
      if (anchor.querySelector('[data-defluff="button"]')) continue;
      wireTarget(
        body,
        anchor,
        strategy.insertAs ?? 'first',
        strategy.decorateButton,
        strategy.decoratePanel,
        strategy.extractThread,
      );
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
  decorateButton?: (host: HTMLElement) => void,
  decoratePanel?: (host: HTMLElement) => void,
  extractThread?: (body: HTMLElement) => ThreadMessage[],
): void {
  let activePanel: { remove: () => void; focus: () => void } | null = null;
  let button: ButtonController;

  const trigger = async (): Promise<void> => {
    if (activePanel) {
      activePanel.focus();
      return;
    }
    if (!body.isConnected) return;
    button.setBusy(true);

    let thread: ThreadMessage[] | undefined;
    if (extractThread) {
      try {
        thread = extractThread(body);
      } catch {
        thread = undefined;
      }
    }

    let singleResponse: SummarizeResponse | undefined;
    let threadResponse: SummarizeThreadResponse | undefined;

    // Thread mode earns its cost on conversations with a real progression
    // — typically three or more messages (scam intro, the reader's reply,
    // a scam-reveal message). A 1+1 exchange (inbound pitch + the
    // reader's polite reply) is still effectively single-message for
    // analysis purposes: the signal lives in the inbound message, and
    // adding the reader's reply as a second block only dilutes the
    // verdict and doubles token cost. For two-message threads we fall
    // back to single-message mode on the clicked message, which lets
    // the user get a per-message analysis by clicking the specific
    // message they want defluffed.
    const nonEmpty = Array.isArray(thread)
      ? thread.filter((m) => m.body.trim().length > 0)
      : [];
    const useThread = nonEmpty.length >= 3;

    try {
      if (useThread) {
        threadResponse = await chrome.runtime.sendMessage({
          type: MSG_SUMMARIZE_THREAD,
          messages: thread as ThreadMessage[],
        });
      } else {
        const emailText = body.innerText.trim();
        singleResponse = await chrome.runtime.sendMessage({
          type: MSG_SUMMARIZE,
          text: emailText,
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Extension error';
      if (useThread) {
        threadResponse = { ok: false, error };
      } else {
        singleResponse = { ok: false, error };
      }
    }

    button.setBusy(false);

    // Defensive: sendMessage can resolve with undefined if the service worker
    // terminated mid-flight before calling sendResponse. Treat as a generic
    // network-class failure rather than crashing on `response.ok`.
    if (useThread) {
      if (!threadResponse || typeof threadResponse !== 'object' || !('ok' in threadResponse)) {
        threadResponse = { ok: false, error: 'No response from the extension. Try again.' };
      }
    } else if (!singleResponse || typeof singleResponse !== 'object' || !('ok' in singleResponse)) {
      singleResponse = { ok: false, error: 'No response from the extension. Try again.' };
    }

    // Body may have been reparented while we waited on the LLM. Pick a
    // rendering strategy that still shows the result somewhere visible.
    const bodyConnected = body.isConnected && !!body.parentElement;

    const dismiss = (): void => {
      activePanel?.remove();
      activePanel = null;
      if (button.element.isConnected) button.focus();
    };

    const activeResponse = useThread ? threadResponse! : singleResponse!;
    const errorPayload = !activeResponse.ok
      ? buildErrorPayload(activeResponse, dismiss)
      : undefined;

    const panel = createPanel({
      ...(useThread && activeResponse.ok
        ? { thread: (activeResponse as { thread: ThreadSummary }).thread }
        : {}),
      ...(!useThread && activeResponse.ok
        ? { summary: (activeResponse as { summary: Summary }).summary }
        : {}),
      ...(errorPayload ? { error: errorPayload } : {}),
      onDismiss: dismiss,
    });
    decoratePanel?.(panel.element);

    if (bodyConnected) {
      // Position the panel on the same side of the body as the button, so
      // the two read as one unit. insertAs === 'last' (LinkedIn) → panel
      // goes below the body; 'first' (Gmail/Outlook) → above.
      if (insertAs === 'last') {
        body.parentElement!.insertBefore(panel.element, body.nextSibling);
      } else {
        body.parentElement!.insertBefore(panel.element, body);
      }
    } else {
      // Fallback: float the panel over the page so the user sees *something*
      // rather than a silently-dead spinner when the email view reflows.
      panel.element.classList.add('df-floating');
      panel.element.style.position = 'fixed';
      panel.element.style.top = '16px';
      panel.element.style.right = '16px';
      panel.element.style.zIndex = '2147483647';
      panel.element.style.maxWidth = 'min(440px, calc(100vw - 32px))';
      document.body.appendChild(panel.element);
    }

    panel.focus();
    activePanel = panel;
  };

  button = createButton(() => {
    void trigger();
  });
  decorateButton?.(button.element);
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
