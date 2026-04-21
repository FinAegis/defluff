import { CONTENT_CSS } from './styles.js';

export interface ButtonController {
  element: HTMLElement;
  setBusy(busy: boolean): void;
  focus(): void;
  remove(): void;
}

/**
 * Create a Shadow-DOM-hosted button. The host element is what you attach to the
 * page; the shadow tree owns the styles so Gmail/Outlook CSS can't bleed in.
 *
 * Busy state swaps the sparkle for a spinning glyph via CSS — no extra DOM.
 * `aria-live` region inside the shadow announces state changes to screen
 * readers without visual noise.
 */
export function createButton(onClick: () => void): ButtonController {
  const host = document.createElement('span');
  host.dataset.defluff = 'button';
  host.style.display = 'inline-block';
  // Default breathing room below the button. Shadow DOM CSS can't style
  // the host's external margins, so set it inline. Hosts that need a
  // different gap (LinkedIn uses 6px) override via decorateButton.
  host.style.marginBottom = '8px';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CONTENT_CSS;
  shadow.appendChild(style);

  const button = document.createElement('button');
  button.className = 'df-button';
  button.type = 'button';
  button.setAttribute('aria-label', 'De-Fluff this email');

  const icon = document.createElement('span');
  icon.className = 'df-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✦';

  const label = document.createElement('span');
  label.textContent = 'De-Fluff';

  button.appendChild(icon);
  button.appendChild(label);

  const liveRegion = document.createElement('span');
  liveRegion.className = 'df-sr-only';
  liveRegion.setAttribute('aria-live', 'polite');

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });

  shadow.appendChild(button);
  shadow.appendChild(liveRegion);

  return {
    element: host,
    setBusy(busy) {
      button.setAttribute('aria-busy', String(busy));
      button.disabled = busy;
      icon.textContent = busy ? '↻' : '✦';
      liveRegion.textContent = busy ? 'Summarizing…' : '';
    },
    focus() {
      button.focus();
    },
    remove() {
      host.remove();
    },
  };
}
