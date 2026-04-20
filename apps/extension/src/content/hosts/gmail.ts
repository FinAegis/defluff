import type { SummarizeResponse } from '../../shared/messages.js';
import { createButton } from '../ui/button.js';
import { createPanel } from '../ui/panel.js';

/**
 * Gmail's DOM uses unstable, obfuscated class names. These selectors are a
 * best-effort starting point and will need iteration against live Gmail.
 *
 * Selectors in use (2025-ish Gmail):
 *   .ii.gt        — the container wrapping a single expanded message
 *   .a3s.aiL      — the HTML body of a message
 *   h2.hP         — the subject heading at the top of the conversation
 *
 * When Gmail reshuffles its DOM (common), update these here.
 */
const MESSAGE_SELECTOR = '.ii.gt';
const BODY_SELECTOR = '.a3s.aiL';
const DEFLUFF_MARKER = 'data-defluff-wired';

export function startGmail(): void {
  const observer = new MutationObserver(() => scan());
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
}

function scan(): void {
  const messages = document.querySelectorAll<HTMLElement>(MESSAGE_SELECTOR);
  messages.forEach((message) => {
    if (message.hasAttribute(DEFLUFF_MARKER)) return;
    const body = message.querySelector<HTMLElement>(BODY_SELECTOR);
    if (!body) return;
    message.setAttribute(DEFLUFF_MARKER, 'true');
    wireMessage(message, body);
  });
}

function wireMessage(message: HTMLElement, body: HTMLElement): void {
  let activePanel: { remove: () => void } | null = null;

  const button = createButton(async () => {
    if (activePanel) return;
    button.setBusy(true);

    const emailText = extractBodyText(body);
    let response: SummarizeResponse;
    try {
      response = await chrome.runtime.sendMessage({ type: 'summarize', text: emailText });
    } catch (err) {
      response = {
        ok: false,
        error: err instanceof Error ? err.message : 'Extension error',
      };
    }

    button.setBusy(false);
    activePanel = renderPanel(body, response, () => {
      activePanel = null;
    });
  });

  // Prefer placing the button next to the subject heading if present, else at
  // the top of the message body. Both are DOM-dependent; Gmail updates this.
  const subject = document.querySelector<HTMLElement>('h2.hP');
  if (subject && !subject.querySelector('[data-defluff="button"]')) {
    subject.style.display = 'flex';
    subject.style.alignItems = 'center';
    subject.style.gap = '12px';
    subject.appendChild(button.element);
  } else {
    message.insertBefore(button.element, message.firstChild);
  }
}

function extractBodyText(body: HTMLElement): string {
  // innerText strips HTML but preserves visible text. Good enough for extraction.
  // innerText reflows on visible text only, which also drops trackers / hidden
  // prefetch blocks that some senders include.
  return body.innerText.trim();
}

function renderPanel(
  body: HTMLElement,
  response: SummarizeResponse,
  onClose: () => void,
): { remove: () => void } {
  const originalDisplay = body.style.display;
  if (response.ok) body.style.display = 'none';

  const panel = createPanel({
    ...(response.ok ? { bullets: response.bullets } : { error: response.error }),
    ...(response.ok
      ? {
          onShowOriginal: () => {
            body.style.display = originalDisplay;
            panel.remove();
            onClose();
          },
        }
      : {}),
    onDismiss: () => {
      body.style.display = originalDisplay;
      panel.remove();
      onClose();
    },
  });
  body.parentElement?.insertBefore(panel.element, body);
  return { remove: () => panel.remove() };
}
