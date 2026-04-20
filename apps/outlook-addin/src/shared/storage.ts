import type { ProviderConfig } from '@defluff/core';

const KEY = 'defluff.provider';

/**
 * Wrap Office.context.roamingSettings. Reads are synchronous; saves are async
 * via saveAsync(). roamingSettings are per-add-in, per-user, and synced across
 * the user's devices by Office — equivalent to chrome.storage.sync.
 */
export function getProviderConfig(): ProviderConfig | null {
  const raw = Office.context.roamingSettings.get(KEY);
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return isProviderConfig(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isProviderConfig(raw) ? raw : null;
}

export async function setProviderConfig(config: ProviderConfig): Promise<void> {
  Office.context.roamingSettings.set(KEY, JSON.stringify(config));
  await new Promise<void>((resolvePromise, reject) => {
    Office.context.roamingSettings.saveAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolvePromise();
      } else {
        reject(new Error(result.error?.message ?? 'Failed to save settings'));
      }
    });
  });
}

export async function clearProviderConfig(): Promise<void> {
  Office.context.roamingSettings.remove(KEY);
  await new Promise<void>((resolvePromise, reject) => {
    Office.context.roamingSettings.saveAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolvePromise();
      } else {
        reject(new Error(result.error?.message ?? 'Failed to clear settings'));
      }
    });
  });
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
