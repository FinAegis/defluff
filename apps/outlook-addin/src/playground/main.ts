import {
  AUTHORED_ICONS,
  AUTHORED_LABELS,
  AUTHORED_PROMPT_LABELS,
  buildProviderConfig,
  DefluffError,
  formatReversedPrompt,
  isProviderKind,
  PROVIDER_DEFAULT_MODELS,
  summarize,
  toUserError,
  VERDICT_ICONS,
  VERDICT_LABELS,
  type ProviderConfig,
  type ProviderKind,
  type Summary,
} from '@defluff/core';
import './styles.css';
import {
  clearProviderConfig,
  getProviderConfig,
  setProviderConfig,
} from './storage.js';

wireUi();
syncModelPlaceholder();
if (getProviderConfig()) {
  showWork();
} else {
  showConfig();
}

function wireUi(): void {
  byId<HTMLSelectElement>('kind').addEventListener('change', syncModelPlaceholder);
  byId<HTMLButtonElement>('save').addEventListener('click', () => void handleSave());
  byId<HTMLButtonElement>('clear').addEventListener('click', () => handleClear());
  byId<HTMLButtonElement>('run').addEventListener('click', () => void handleRun());
  byId<HTMLButtonElement>('edit-config').addEventListener('click', () => {
    showConfig(getProviderConfig());
  });
}

function showConfig(existing: ProviderConfig | null = getProviderConfig()): void {
  byId('status').textContent = existing
    ? 'Update your provider or key below.'
    : 'Pick a provider and paste your own API key to begin.';
  byId('config').hidden = false;
  byId('work').hidden = true;

  if (existing) {
    byId<HTMLSelectElement>('kind').value = existing.kind;
    if ('apiKey' in existing) byId<HTMLInputElement>('apikey').value = existing.apiKey ?? '';
    if ('model' in existing && existing.model) {
      byId<HTMLInputElement>('model').value = existing.model;
    }
  }
  syncModelPlaceholder();
}

function showWork(): void {
  byId('status').textContent = 'Paste an email below and click Defluff.';
  byId('config').hidden = true;
  byId('work').hidden = false;
  byId('result').hidden = true;
  byId('error').hidden = true;
}

function syncModelPlaceholder(): void {
  byId<HTMLInputElement>('model').placeholder = PROVIDER_DEFAULT_MODELS[readKind()];
}

async function handleSave(): Promise<void> {
  try {
    const config = buildProviderConfig({
      kind: readKind(),
      apiKey: byId<HTMLInputElement>('apikey').value,
      model: byId<HTMLInputElement>('model').value,
      baseUrl: '',
    });
    setProviderConfig(config);
    setSaveStatus('Saved', 'ok');
    window.setTimeout(() => showWork(), 600);
  } catch (err) {
    setSaveStatus(err instanceof Error ? err.message : 'Failed to save', 'err');
  }
}

function handleClear(): void {
  clearProviderConfig();
  byId<HTMLInputElement>('apikey').value = '';
  byId<HTMLInputElement>('model').value = '';
  setSaveStatus('Cleared', 'ok');
}

async function handleRun(): Promise<void> {
  const config = getProviderConfig();
  if (!config) {
    showConfig(null);
    return;
  }

  const runButton = byId<HTMLButtonElement>('run');
  runButton.disabled = true;
  runButton.textContent = 'Extracting…';
  byId('result').hidden = true;
  byId('error').hidden = true;

  try {
    const text = byId<HTMLTextAreaElement>('input').value.trim();
    if (!text) throw new DefluffError('bad_request', 'Paste some text first.');
    const summary = await summarize({ text, provider: config });
    renderSummary(summary);
  } catch (err) {
    renderError(err);
  } finally {
    runButton.disabled = false;
    runButton.textContent = 'Defluff';
  }
}

function renderSummary(summary: Summary): void {
  const result = byId('result');
  result.dataset.verdict = summary.verdict ?? '';

  const promptBlock = byId('prompt-block');
  const promptIcon = byId<HTMLElement>('prompt-icon');
  const promptLabel = byId<HTMLElement>('prompt-label-text');
  const promptText = byId<HTMLElement>('prompt-text');
  const authored = summary.authored;
  if (authored) {
    promptBlock.dataset.authored = authored;
    promptIcon.textContent = AUTHORED_ICONS[authored];
    promptLabel.textContent =
      authored === 'human' ? AUTHORED_LABELS.human : AUTHORED_PROMPT_LABELS[authored];
    if (authored === 'human') {
      promptText.textContent = summary.authoredReason ?? '';
      promptText.hidden = !summary.authoredReason;
    } else {
      promptText.textContent = summary.reversedPrompt
        ? formatReversedPrompt(summary.reversedPrompt)
        : '';
      promptText.hidden = !summary.reversedPrompt;
    }
    promptBlock.hidden = false;
  } else if (summary.reversedPrompt) {
    // Legacy fallback: older models may omit Authored.
    delete promptBlock.dataset.authored;
    promptIcon.textContent = '💭';
    promptLabel.textContent = 'They probably asked an AI';
    promptText.textContent = formatReversedPrompt(summary.reversedPrompt);
    promptText.hidden = false;
    promptBlock.hidden = false;
  } else {
    promptBlock.hidden = true;
  }

  const verdictRow = byId('verdict-row');
  if (summary.verdict) {
    verdictRow.dataset.verdict = summary.verdict;
    byId<HTMLElement>('verdict-icon').textContent = VERDICT_ICONS[summary.verdict];
    byId<HTMLElement>('verdict-label').textContent = VERDICT_LABELS[summary.verdict];
    byId<HTMLElement>('verdict-reason').textContent = summary.verdictReason ?? '';
    verdictRow.hidden = false;
  } else {
    verdictRow.hidden = true;
  }

  const list = byId<HTMLUListElement>('bullets');
  list.replaceChildren();
  const bulletsLabel = byId('bullets-label');
  if (summary.bullets.length > 0) {
    for (const bullet of summary.bullets) {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    }
    list.hidden = false;
    bulletsLabel.hidden = false;
  } else {
    list.hidden = true;
    bulletsLabel.hidden = true;
  }

  result.hidden = false;
}

function renderError(err: unknown): void {
  const userError =
    err instanceof DefluffError
      ? toUserError(err.code, err.message)
      : toUserError(undefined, err instanceof Error ? err.message : 'Unknown error');

  const pane = byId('error');
  pane.replaceChildren();

  const heading = document.createElement('strong');
  heading.textContent = userError.title;
  pane.appendChild(heading);

  if (userError.explanation) {
    const p = document.createElement('p');
    p.textContent = userError.explanation;
    pane.appendChild(p);
  }

  if (userError.details) {
    const disclosure = document.createElement('details');
    disclosure.className = 'error-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Provider response';
    disclosure.appendChild(summary);
    const body = document.createElement('pre');
    body.className = 'error-details-body';
    body.textContent = userError.details;
    disclosure.appendChild(body);
    pane.appendChild(disclosure);
  }

  if (userError.action === 'configure') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary';
    btn.textContent = 'Change provider';
    btn.addEventListener('click', () => showConfig(getProviderConfig()));
    pane.appendChild(btn);
  }

  pane.hidden = false;
}

function readKind(): ProviderKind {
  const value = byId<HTMLSelectElement>('kind').value;
  return isProviderKind(value) ? value : 'anthropic';
}

function setSaveStatus(text: string, variant: 'ok' | 'err'): void {
  const el = byId('save-status');
  el.textContent = text;
  el.className = `status-msg ${variant}`;
  window.setTimeout(() => {
    el.textContent = '';
    el.className = 'status-msg';
  }, 2000);
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
}
