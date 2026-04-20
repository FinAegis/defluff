import { CONTENT_CSS } from './styles.js';

export interface PanelController {
  element: HTMLElement;
  focus(): void;
  remove(): void;
}

export interface PanelError {
  title: string;
  explanation: string;
  cta?: { label: string; onClick: () => void };
}

export interface PanelOptions {
  bullets?: string[];
  error?: PanelError;
  onShowOriginal?: () => void;
  onDismiss?: () => void;
}

export function createPanel(opts: PanelOptions): PanelController {
  const host = document.createElement('div');
  host.dataset.defluff = 'panel';

  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = CONTENT_CSS;
  shadow.appendChild(style);

  const panel = document.createElement('div');
  const isError = !!opts.error;
  panel.className = isError ? 'df-panel df-error' : 'df-panel';
  panel.setAttribute('role', isError ? 'alert' : 'region');
  panel.setAttribute('aria-label', isError ? 'Defluff error' : 'Email summary');
  panel.tabIndex = -1;

  const heading = document.createElement('h3');
  if (isError && opts.error) {
    const icon = document.createElement('span');
    icon.className = 'df-error-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠';
    heading.appendChild(icon);
    const text = document.createElement('span');
    text.textContent = opts.error.title;
    heading.appendChild(text);
  } else {
    heading.textContent = 'Defluffed summary';
  }
  panel.appendChild(heading);

  if (opts.error) {
    if (opts.error.explanation) {
      const p = document.createElement('p');
      p.textContent = opts.error.explanation;
      panel.appendChild(p);
    }
  } else {
    const list = document.createElement('ul');
    for (const bullet of opts.bullets ?? []) {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    }
    panel.appendChild(list);
  }

  const actions = document.createElement('div');
  actions.className = 'df-actions';
  if (opts.error?.cta) {
    actions.appendChild(makeCta(opts.error.cta.label, opts.error.cta.onClick));
  }
  if (opts.onShowOriginal && !isError) {
    actions.appendChild(makeLink('Show original', opts.onShowOriginal));
  }
  if (opts.onDismiss) {
    actions.appendChild(makeLink('Dismiss', opts.onDismiss));
  }
  if (actions.childElementCount > 0) panel.appendChild(actions);

  shadow.appendChild(panel);

  return {
    element: host,
    focus() {
      panel.focus();
    },
    remove() {
      host.remove();
    },
  };
}

function makeLink(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'df-link';
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function makeCta(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'df-cta';
  btn.type = 'button';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
