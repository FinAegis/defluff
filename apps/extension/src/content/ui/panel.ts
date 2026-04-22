import type { Authored, Summary, Verdict } from '@defluff/core';
import {
  AUTHORED_ICONS,
  AUTHORED_LABELS,
  AUTHORED_PROMPT_LABELS,
  formatReversedPrompt,
  VERDICT_ICONS,
  VERDICT_LABELS,
} from '@defluff/core';
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
  const hasContent =
    !!summary.authored ||
    !!summary.reversedPrompt ||
    !!summary.verdict ||
    summary.bullets.length > 0;

  if (!hasContent) {
    // Defensive: should never happen (summarize() throws on empty with non-noise
    // verdict), but render a graceful fallback instead of an empty panel.
    const heading = document.createElement('h3');
    heading.textContent = 'No summary';
    panel.appendChild(heading);
    const p = document.createElement('p');
    p.textContent = 'The model did not return a usable summary for this email. Try again or switch models.';
    panel.appendChild(p);
    return;
  }

  const authoredBlock = buildAuthoredBlock(summary);
  if (authoredBlock) panel.appendChild(authoredBlock);

  if (summary.verdict) {
    panel.appendChild(buildVerdictRow(summary.verdict, summary.verdictReason));
  }

  if (summary.bullets.length > 0) {
    const list = document.createElement('ul');
    for (const bullet of summary.bullets) {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    }
    panel.appendChild(list);
  }
}

/**
 * Combined authorship + reversed-prompt block. For AI/AI-assisted emails we
 * show the detection badge and the reversed prompt. For human-authored
 * emails we show only the badge — there is no prompt to reverse, and this
 * is the whole point of the authorship step: stop claiming "they probably
 * asked an AI" on messages that were clearly written by hand.
 *
 * If the model omits the authored line (older models or drift), fall back
 * to the prompt-only block that predated the Authored field.
 */
function buildAuthoredBlock(summary: Summary): HTMLElement | undefined {
  const { authored, authoredReason, reversedPrompt } = summary;

  if (!authored && reversedPrompt) {
    return buildLegacyPromptBlock(reversedPrompt);
  }
  if (!authored) return undefined;

  const block = document.createElement('section');
  block.className = 'df-prompt';
  block.dataset.authored = authored;

  const label = document.createElement('p');
  label.className = 'df-prompt-label';
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = AUTHORED_ICONS[authored];
  const labelText = document.createElement('span');
  labelText.textContent =
    authored === 'human'
      ? AUTHORED_LABELS.human
      : AUTHORED_PROMPT_LABELS[authored];
  label.appendChild(icon);
  label.appendChild(labelText);
  block.appendChild(label);

  if (authored === 'human') {
    if (authoredReason) {
      const reason = document.createElement('p');
      reason.className = 'df-prompt-text df-authored-reason';
      reason.textContent = authoredReason;
      block.appendChild(reason);
    }
    return block;
  }

  if (reversedPrompt) {
    const text = document.createElement('p');
    text.className = 'df-prompt-text';
    text.textContent = formatReversedPrompt(reversedPrompt);
    block.appendChild(text);
  }
  return block;
}

function buildLegacyPromptBlock(reversedPrompt: string): HTMLElement {
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
  text.textContent = formatReversedPrompt(reversedPrompt);
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
