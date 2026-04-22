import type { Authored, Summary, ThreadSummary, ThreadVerdict, Verdict } from '@defluff/core';
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
  /**
   * Raw provider response. Rendered as a collapsible "Provider response"
   * block under the friendly explanation so developers can diagnose
   * model-name typos, rate-limit wording, and other provider-specific
   * signals that the preset explanation would otherwise hide.
   */
  details?: string;
  cta?: { label: string; onClick: () => void };
}

export interface PanelOptions {
  summary?: Summary;
  thread?: ThreadSummary;
  error?: PanelError;
  onDismiss?: () => void;
  /**
   * Callback wired by the content host when a SCAM thread was detected
   * and the host can produce a bait reply on demand. When present and
   * the thread verdict is SCAM, the panel renders a "Waste their time"
   * button; clicking it calls this function and displays the returned
   * draft in an editable textarea.
   */
  onGenerateBait?: () => Promise<string>;
}

const THREAD_VERDICT_LABELS: Record<ThreadVerdict, string> = {
  legit: 'Legit thread',
  scam: 'Scam progression',
};

const THREAD_VERDICT_ICONS: Record<ThreadVerdict, string> = {
  legit: '✓',
  scam: '✕',
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
  panel.setAttribute(
    'aria-label',
    isError ? 'Defluff error' : opts.thread ? 'Thread summary' : 'Email summary',
  );
  panel.tabIndex = -1;
  if (!isError) {
    if (opts.thread?.threadVerdict) {
      panel.dataset.threadVerdict = opts.thread.threadVerdict;
    } else if (opts.summary?.verdict) {
      panel.dataset.verdict = opts.summary.verdict;
    }
  }

  if (isError && opts.error) {
    renderError(panel, opts.error);
  } else if (opts.thread) {
    renderThread(panel, opts.thread, opts.onGenerateBait);
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

  if (error.details) {
    const disclosure = document.createElement('details');
    disclosure.className = 'df-error-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Provider response';
    disclosure.appendChild(summary);
    const body = document.createElement('pre');
    body.className = 'df-error-details-body';
    body.textContent = error.details;
    disclosure.appendChild(body);
    panel.appendChild(disclosure);
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

/**
 * Render a thread-mode summary. Layout depends on the thread verdict:
 *
 *   SCAM:
 *     [Thread-verdict strip — red, pattern-named]
 *     [Actions list]
 *     [Waste their time button — generates a bait draft]
 *     ▸ Per-message detail (collapsed)
 *
 *   LEGIT (or unknown verdict):
 *     [Thread-verdict strip]
 *     [Per-message blocks — inline]
 *     [Actions list]
 *
 * The SCAM layout exists because per-message detail on scam threads is
 * mostly noise — the reader already knows "fake recruiter pitched me",
 * the headline is the cross-message progression and what to do about
 * it. Users who want the per-message breakdown click to expand.
 */
function renderThread(
  panel: HTMLElement,
  thread: ThreadSummary,
  onGenerateBait?: () => Promise<string>,
): void {
  const hasAnything =
    thread.messages.length > 0 || !!thread.threadVerdict || thread.actions.length > 0;

  if (!hasAnything) {
    const heading = document.createElement('h3');
    heading.textContent = 'No summary';
    panel.appendChild(heading);
    const p = document.createElement('p');
    p.textContent =
      'The model did not return a usable thread summary. Try again or switch models.';
    panel.appendChild(p);
    return;
  }

  if (thread.threadVerdict) {
    panel.appendChild(
      buildThreadVerdictStrip(thread.threadVerdict, thread.threadVerdictReason),
    );
  }

  const isScam = thread.threadVerdict === 'scam';

  if (isScam) {
    // SCAM: Actions first (the concrete answer), then bait button,
    // then per-message detail behind a disclosure.
    if (thread.actions.length > 0) {
      panel.appendChild(buildActionsBlock(thread.actions));
    }
    if (onGenerateBait) {
      panel.appendChild(buildBaitBlock(onGenerateBait));
    }
    if (thread.messages.length > 0) {
      panel.appendChild(buildCollapsedMessagesBlock(thread.messages));
    }
    return;
  }

  // LEGIT or unknown verdict: inline per-message blocks, actions at
  // the bottom — the per-message detail IS the primary content here.
  for (let i = 0; i < thread.messages.length; i++) {
    const msg = thread.messages[i];
    if (!msg) continue;
    panel.appendChild(buildMessageBlock(msg, i === 0));
  }

  if (thread.actions.length > 0) {
    panel.appendChild(buildActionsBlock(thread.actions));
  }
}

function buildCollapsedMessagesBlock(
  messages: ThreadSummary['messages'],
): HTMLElement {
  const disclosure = document.createElement('details');
  disclosure.className = 'df-thread-detail-disclosure';
  const summary = document.createElement('summary');
  summary.textContent = `Per-message detail (${messages.length})`;
  disclosure.appendChild(summary);
  const wrapper = document.createElement('div');
  wrapper.className = 'df-thread-detail-body';
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg) continue;
    wrapper.appendChild(buildMessageBlock(msg, i === 0));
  }
  disclosure.appendChild(wrapper);
  return disclosure;
}

function buildBaitBlock(
  onGenerateBait: () => Promise<string>,
): HTMLElement {
  const block = document.createElement('section');
  block.className = 'df-bait';

  const label = document.createElement('p');
  label.className = 'df-bait-label';
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '✉️';
  const labelText = document.createElement('span');
  labelText.textContent = 'Your turn';
  label.appendChild(icon);
  label.appendChild(labelText);
  block.appendChild(label);

  const note = document.createElement('p');
  note.className = 'df-bait-note';
  note.textContent =
    'Generate a time-wasting reply they can respond to by producing documentation they do not have. Your call whether to send it.';
  block.appendChild(note);

  const actions = document.createElement('div');
  actions.className = 'df-bait-actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'df-cta';
  button.textContent = 'Waste their time';
  actions.appendChild(button);
  block.appendChild(actions);

  const resultWrap = document.createElement('div');
  resultWrap.className = 'df-bait-result';
  resultWrap.hidden = true;
  block.appendChild(resultWrap);

  button.addEventListener('click', () => {
    void runBait(button, resultWrap, onGenerateBait);
  });

  return block;
}

async function runBait(
  button: HTMLButtonElement,
  result: HTMLElement,
  onGenerateBait: () => Promise<string>,
): Promise<void> {
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = 'Writing…';
  result.hidden = false;
  result.replaceChildren();

  try {
    const text = await onGenerateBait();
    renderBaitDraft(result, text);
  } catch (err) {
    renderBaitError(result, err);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel ?? 'Waste their time';
  }
}

function renderBaitDraft(host: HTMLElement, draft: string): void {
  host.replaceChildren();

  const textarea = document.createElement('textarea');
  textarea.className = 'df-bait-textarea';
  textarea.value = draft;
  textarea.rows = Math.min(14, Math.max(6, draft.split('\n').length + 1));
  textarea.spellcheck = false;
  host.appendChild(textarea);

  const row = document.createElement('div');
  row.className = 'df-bait-result-row';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'df-link';
  copyBtn.textContent = 'Copy';
  copyBtn.addEventListener('click', () => {
    void copyToClipboard(textarea.value, copyBtn);
  });
  row.appendChild(copyBtn);

  const disclaimer = document.createElement('span');
  disclaimer.className = 'df-bait-disclaimer';
  disclaimer.textContent =
    'You are still talking to a scammer — do not paste anything real.';
  row.appendChild(disclaimer);

  host.appendChild(row);
}

async function copyToClipboard(text: string, button: HTMLButtonElement): Promise<void> {
  const original = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copied';
  } catch {
    button.textContent = 'Copy failed';
  }
  window.setTimeout(() => {
    button.textContent = original ?? 'Copy';
  }, 1500);
}

function renderBaitError(host: HTMLElement, err: unknown): void {
  host.replaceChildren();
  const msg = document.createElement('p');
  msg.className = 'df-bait-error';
  msg.textContent =
    err instanceof Error && err.message
      ? `Couldn't generate a reply: ${err.message}`
      : "Couldn't generate a reply. Try again in a moment.";
  host.appendChild(msg);
}

function buildThreadVerdictStrip(verdict: ThreadVerdict, reason?: string): HTMLElement {
  const strip = document.createElement('div');
  strip.className = 'df-thread-verdict';
  strip.dataset.threadVerdict = verdict;

  const icon = document.createElement('span');
  icon.className = 'df-thread-verdict-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = THREAD_VERDICT_ICONS[verdict];
  strip.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'df-thread-verdict-label';
  label.textContent = THREAD_VERDICT_LABELS[verdict];
  strip.appendChild(label);

  if (reason) {
    const reasonSpan = document.createElement('span');
    reasonSpan.className = 'df-thread-verdict-reason';
    reasonSpan.textContent = reason;
    strip.appendChild(reasonSpan);
  }
  return strip;
}

function buildMessageBlock(
  msg: ThreadSummary['messages'][number],
  isFirst: boolean,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'df-thread-message';
  if (isFirst) section.classList.add('df-thread-message-first');
  if (msg.summary.verdict) section.dataset.verdict = msg.summary.verdict;

  const header = document.createElement('header');
  header.className = 'df-thread-message-head';
  const sender = document.createElement('span');
  sender.className = 'df-thread-message-sender';
  sender.textContent = msg.sender ?? 'Unknown sender';
  header.appendChild(sender);
  if (msg.timestamp) {
    const ts = document.createElement('span');
    ts.className = 'df-thread-message-time';
    ts.textContent = msg.timestamp;
    header.appendChild(ts);
  }
  section.appendChild(header);

  const { summary } = msg;
  const authoredBlock = buildAuthoredBlock(summary);
  if (authoredBlock) section.appendChild(authoredBlock);

  if (summary.verdict) {
    section.appendChild(buildVerdictRow(summary.verdict, summary.verdictReason));
  }

  if (summary.bullets.length > 0) {
    const list = document.createElement('ul');
    for (const bullet of summary.bullets) {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    }
    section.appendChild(list);
  }

  return section;
}

function buildActionsBlock(actions: ThreadSummary['actions']): HTMLElement {
  const block = document.createElement('section');
  block.className = 'df-thread-actions';
  const label = document.createElement('p');
  label.className = 'df-thread-actions-label';
  label.textContent = 'Actions';
  block.appendChild(label);
  const list = document.createElement('ul');
  for (const action of actions) {
    const li = document.createElement('li');
    const who = document.createElement('strong');
    who.textContent = `${action.who}:`;
    li.appendChild(who);
    li.appendChild(document.createTextNode(` ${action.action}`));
    list.appendChild(li);
  }
  block.appendChild(list);
  return block;
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
