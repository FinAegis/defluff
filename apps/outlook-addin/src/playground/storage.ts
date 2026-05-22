import { isProviderConfig, type ProviderConfig } from '@defluff/core';

// The playground is a plain web page — no Office.js, no chrome.storage. The
// user's provider config (including their API key) lives only in this
// browser's localStorage and is sent only to the provider they pick.
const STORAGE_KEY = 'defluff.playground.provider';

/** Read the saved provider config. Returns null if unset or malformed. */
export function getProviderConfig(): ProviderConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProviderConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setProviderConfig(config: ProviderConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearProviderConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
