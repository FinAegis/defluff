import {
  buildProviderConfig,
  DefluffError,
  isProviderKind,
  PROVIDER_DEFAULT_MODELS,
  type ProviderConfig,
  type ProviderKind,
  summarize,
} from '@defluff/core';
import { getCurrentEmailText } from '../shared/email.js';
import {
  clearProviderConfig,
  getProviderConfig,
  setProviderConfig,
} from '../shared/storage.js';

Office.onReady(() => {
  wireUi();
  const existing = getProviderConfig();
  if (existing) {
    showWork();
  } else {
    showConfig();
  }
});

function wireUi(): void {
  byId<HTMLSelectElement>('kind').addEventListener('change', syncProviderFields);
  byId<HTMLButtonElement>('save').addEventListener('click', () => void handleSave());
  byId<HTMLButtonElement>('clear').addEventListener('click', () => void handleClear());
  byId<HTMLButtonElement>('run').addEventListener('click', () => void handleRun());
  byId<HTMLButtonElement>('edit-config').addEventListener('click', () => {
    showConfig(getProviderConfig());
  });
}

function showConfig(existing: ProviderConfig | null = getProviderConfig()): void {
  byId('status').textContent = existing
    ? 'Update your provider below.'
    : 'Pick a provider and paste your key.';
  byId('config').hidden = false;
  byId('work').hidden = true;

  if (existing) {
    byId<HTMLSelectElement>('kind').value = existing.kind;
    if ('apiKey' in existing) byId<HTMLInputElement>('apikey').value = existing.apiKey ?? '';
    if ('model' in existing && existing.model) byId<HTMLInputElement>('model').value = existing.model;
    if (existing.kind === 'openai-compatible') {
      byId<HTMLInputElement>('baseurl').value = existing.baseUrl;
    }
  }
  syncProviderFields();
}

function showWork(): void {
  byId('status').textContent = 'Ready. Open an email and click De-Fluff.';
  byId('config').hidden = true;
  byId('work').hidden = false;
  byId('result').hidden = true;
  byId('error').hidden = true;
}

function syncProviderFields(): void {
  const kind = readKind();
  byId('baseurl-field').hidden = kind !== 'openai-compatible';
  const apiKeyInput = byId<HTMLInputElement>('apikey');
  apiKeyInput.required = kind !== 'openai-compatible';
  byId<HTMLInputElement>('model').placeholder = PROVIDER_DEFAULT_MODELS[kind];
}

async function handleSave(): Promise<void> {
  try {
    const config = buildProviderConfig({
      kind: readKind(),
      apiKey: byId<HTMLInputElement>('apikey').value,
      model: byId<HTMLInputElement>('model').value,
      baseUrl: byId<HTMLInputElement>('baseurl').value,
    });
    await setProviderConfig(config);
    setSaveStatus('Saved', 'ok');
    window.setTimeout(() => showWork(), 600);
  } catch (err) {
    setSaveStatus(err instanceof Error ? err.message : 'Failed to save', 'err');
  }
}

async function handleClear(): Promise<void> {
  await clearProviderConfig();
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
    const text = await getCurrentEmailText();
    if (!text) throw new DefluffError('bad_request', 'Message body is empty.');
    const { bullets } = await summarize({ text, provider: config });
    renderBullets(bullets);
  } catch (err) {
    renderError(err);
  } finally {
    runButton.disabled = false;
    runButton.textContent = 'De-Fluff this email';
  }
}

function renderBullets(bullets: string[]): void {
  const list = byId<HTMLUListElement>('bullets');
  list.replaceChildren();
  for (const bullet of bullets) {
    const li = document.createElement('li');
    li.textContent = bullet;
    list.appendChild(li);
  }
  byId('result').hidden = false;
}

function renderError(err: unknown): void {
  const message =
    err instanceof DefluffError
      ? `${err.code}: ${err.message}`
      : err instanceof Error
        ? err.message
        : 'Unknown error';
  const pane = byId('error');
  pane.textContent = message;
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
