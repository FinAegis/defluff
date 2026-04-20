import type { ProviderConfig } from '@defluff/core';

const STORAGE_KEY = 'defluff.provider';

export async function getProviderConfig(): Promise<ProviderConfig | null> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return isProviderConfig(value) ? value : null;
}

export async function setProviderConfig(config: ProviderConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config });
}

export async function clearProviderConfig(): Promise<void> {
  await chrome.storage.sync.remove(STORAGE_KEY);
}

function isProviderConfig(value: unknown): value is ProviderConfig {
  if (!value || typeof value !== 'object') return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === 'anthropic' ||
    kind === 'openai' ||
    kind === 'gemini' ||
    kind === 'openai-compatible'
  );
}
