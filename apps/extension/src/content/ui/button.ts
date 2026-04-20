import { CONTENT_CSS } from './styles.js';

export interface ButtonController {
  element: HTMLElement;
  setBusy(busy: boolean): void;
  remove(): void;
}

/**
 * Create a Shadow-DOM-hosted button. The host element is what you attach to the
 * page; the shadow tree owns the styles so Gmail/Outlook CSS can't bleed in.
 */
export function createButton(onClick: () => void): ButtonController {
  const host = document.createElement('span');
  host.dataset.defluff = 'button';
  host.style.display = 'inline-block';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CONTENT_CSS;
  shadow.appendChild(style);

  const button = document.createElement('button');
  button.className = 'df-button';
  button.type = 'button';

  const icon = document.createElement('span');
  icon.className = 'df-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✦';

  const label = document.createElement('span');
  label.textContent = 'De-Fluff';

  button.appendChild(icon);
  button.appendChild(label);

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  shadow.appendChild(button);

  return {
    element: host,
    setBusy(busy) {
      button.setAttribute('aria-busy', String(busy));
      button.disabled = busy;
    },
    remove() {
      host.remove();
    },
  };
}
