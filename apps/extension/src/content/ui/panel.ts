import { CONTENT_CSS } from './styles.js';

export interface PanelController {
  element: HTMLElement;
  remove(): void;
}

export interface PanelOptions {
  bullets?: string[];
  error?: string;
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
  panel.className = opts.error ? 'df-panel df-error' : 'df-panel';

  const heading = document.createElement('h3');
  heading.textContent = opts.error ? 'Defluff error' : 'Defluffed summary';
  panel.appendChild(heading);

  if (opts.error) {
    const p = document.createElement('p');
    p.textContent = opts.error;
    panel.appendChild(p);
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
  if (opts.onShowOriginal) {
    actions.appendChild(makeLink('Show original', opts.onShowOriginal));
  }
  if (opts.onDismiss) {
    actions.appendChild(makeLink('Dismiss', opts.onDismiss));
  }
  if (actions.childElementCount > 0) panel.appendChild(actions);

  shadow.appendChild(panel);

  return {
    element: host,
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
