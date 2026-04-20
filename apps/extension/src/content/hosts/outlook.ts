import type { SummarizeResponse } from '../../shared/messages.js';
import { createButton } from '../ui/button.js';
import { createPanel } from '../ui/panel.js';

/**
 * Outlook Web uses obfuscated React class names. The most durable hooks are
 * ARIA roles and aria-labels. These selectors are a best-effort starting point
 * — iterate against live Outlook when wiring this up. The Outlook desktop
 * add-in is the preferred path for desktop Outlook users; this script covers
 * outlook.office.com / outlook.live.com in the browser.
 */
const READING_PANE_SELECTOR = '[role="main"] [aria-label*="Message body"]';
const SUBJECT_SELECTOR = '[role="main"] [id^="subjectLine"], [role="main"] h1, [role="main"] [role="heading"]';
const DEFLUFF_MARKER = 'data-defluff-wired';

export function startOutlook(): void {
  const observer = new MutationObserver(() => scan());
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
}

function scan(): void {
  const body = document.querySelector<HTMLElement>(READING_PANE_SELECTOR);
  if (!body || body.hasAttribute(DEFLUFF_MARKER)) return;
  body.setAttribute(DEFLUFF_MARKER, 'true');
  wireMessage(body);
}

function wireMessage(body: HTMLElement): void {
  let activePanel: { remove: () => void } | null = null;

  const button = createButton(async () => {
    if (activePanel) return;
    button.setBusy(true);

    const emailText = body.innerText.trim();
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

  const subject = document.querySelector<HTMLElement>(SUBJECT_SELECTOR);
  const anchor = subject?.parentElement ?? body;
  anchor.insertBefore(button.element, anchor.firstChild);
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
