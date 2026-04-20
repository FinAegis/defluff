import {
  DEFAULT_HOSTS_CONFIG,
  isHostsConfig,
  isProviderConfig,
  type HostsConfig,
  type ProviderConfig,
} from '@defluff/core';

const PROVIDER_KEY = 'defluff.provider';
const HOSTS_KEY = 'defluff.hosts';

export async function getProviderConfig(): Promise<ProviderConfig | null> {
  const result = await chrome.storage.sync.get(PROVIDER_KEY);
  const value = result[PROVIDER_KEY];
  return isProviderConfig(value) ? value : null;
}

export async function setProviderConfig(config: ProviderConfig): Promise<void> {
  await chrome.storage.sync.set({ [PROVIDER_KEY]: config });
}

export async function clearProviderConfig(): Promise<void> {
  await chrome.storage.sync.remove(PROVIDER_KEY);
}

export async function getHostsConfig(): Promise<HostsConfig> {
  const result = await chrome.storage.sync.get(HOSTS_KEY);
  const value = result[HOSTS_KEY];
  // Merge with defaults so new host keys added in a later release default
  // sensibly for users who stored an older shape.
  return isHostsConfig(value) ? { ...DEFAULT_HOSTS_CONFIG, ...value } : { ...DEFAULT_HOSTS_CONFIG };
}

export async function setHostsConfig(config: HostsConfig): Promise<void> {
  await chrome.storage.sync.set({ [HOSTS_KEY]: config });
}
