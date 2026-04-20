import { isProviderConfig, type ProviderConfig } from '@defluff/core';

const STORAGE_KEY = 'defluff.provider';

/**
 * Wrap Office.context.roamingSettings. Reads are synchronous; saves are async
 * via saveAsync(). roamingSettings are per-add-in, per-user, and synced across
 * the user's devices by Office — equivalent to chrome.storage.sync.
 */
export function getProviderConfig(): ProviderConfig | null {
  const raw = Office.context.roamingSettings.get(STORAGE_KEY);
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
  Office.context.roamingSettings.set(STORAGE_KEY, JSON.stringify(config));
  await saveRoamingSettings();
}

export async function clearProviderConfig(): Promise<void> {
  Office.context.roamingSettings.remove(STORAGE_KEY);
  await saveRoamingSettings();
}

function saveRoamingSettings(): Promise<void> {
  return new Promise((resolve, reject) => {
    Office.context.roamingSettings.saveAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve();
      } else {
        reject(new Error(result.error?.message ?? 'Failed to save settings'));
      }
    });
  });
}
