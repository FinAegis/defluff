import type { Summary, Verdict } from '@defluff/core';
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
  summary?: Summary;
  error?: PanelError;
  onShowOriginal?: () => void;
  onDismiss?: () => void;
}

const VERDICT_LABELS: Record<Verdict, string> = {
  actionable: 'Actionable',
  'response-needed': 'Response needed',
  fyi: 'FYI',
  noise: 'Noise',
};

const VERDICT_ICONS: Record<Verdict, string> = {
  actionable: '⚡',
  'response-needed': '💬',
  fyi: 'ℹ',
  noise: '🗑',
};

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
  if (!isError && opts.summary?.verdict) {
    panel.dataset.verdict = opts.summary.verdict;
  }

  if (isError && opts.error) {
    renderError(panel, opts.error);
  } else if (opts.summary) {
    renderSummary(panel, opts.summary);
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

function renderError(panel: HTMLElement, error: PanelError): void {
  const heading = document.createElement('h3');
  const icon = document.createElement('span');
  icon.className = 'df-error-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '⚠';
  heading.appendChild(icon);
  const text = document.createElement('span');
  text.textContent = error.title;
  heading.appendChild(text);
  panel.appendChild(heading);

  if (error.explanation) {
    const p = document.createElement('p');
    p.textContent = error.explanation;
    panel.appendChild(p);
  }
}

function renderSummary(panel: HTMLElement, summary: Summary): void {
  if (summary.reversedPrompt) {
    panel.appendChild(buildPromptBlock(summary.reversedPrompt));
  }

  if (summary.verdict) {
    panel.appendChild(buildVerdictRow(summary.verdict, summary.verdictReason));
  }

  if (summary.bullets.length > 0) {
    const sectionLabel = document.createElement('p');
    sectionLabel.className = 'df-section-label';
    sectionLabel.textContent = 'Specifics';
    panel.appendChild(sectionLabel);

    const list = document.createElement('ul');
    for (const bullet of summary.bullets) {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    }
    panel.appendChild(list);
  }
}

function buildPromptBlock(reversedPrompt: string): HTMLElement {
  const block = document.createElement('section');
  block.className = 'df-prompt';

  const label = document.createElement('p');
  label.className = 'df-prompt-label';
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '💭';
  const labelText = document.createElement('span');
  labelText.textContent = 'They probably asked an AI';
  label.appendChild(icon);
  label.appendChild(labelText);
  block.appendChild(label);

  const text = document.createElement('p');
  text.className = 'df-prompt-text';
  text.textContent = `“${reversedPrompt}”`;
  block.appendChild(text);

  return block;
}

function buildVerdictRow(verdict: Verdict, reason?: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'df-verdict';
  row.dataset.verdict = verdict;

  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = VERDICT_ICONS[verdict];

  const label = document.createElement('span');
  label.className = 'df-verdict-label';
  label.textContent = VERDICT_LABELS[verdict];

  row.appendChild(icon);
  row.appendChild(label);

  if (reason) {
    const reasonSpan = document.createElement('span');
    reasonSpan.className = 'df-verdict-reason';
    reasonSpan.textContent = reason;
    row.appendChild(reasonSpan);
  }

  return row;
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
