import { DefluffError, summarize } from '@defluff/core';
import type { AppRequest, SummarizeResponse } from './shared/messages.js';
import { getProviderConfig } from './shared/storage.js';

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isAppRequest(message)) return undefined;

  if (message.type === 'summarize') {
    void handleSummarize(message.text).then(sendResponse);
    return true; // keep channel open for async response
  }

  return undefined;
});

async function handleSummarize(text: string): Promise<SummarizeResponse> {
  const provider = await getProviderConfig();
  if (!provider) {
    return {
      ok: false,
      error: 'Open the Defluff options page and configure a provider first.',
      code: 'unknown_provider',
    };
  }

  try {
    const { bullets } = await summarize({ text, provider });
    return { ok: true, bullets };
  } catch (err) {
    if (err instanceof DefluffError) {
      return { ok: false, error: err.message, code: err.code };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

function isAppRequest(value: unknown): value is AppRequest {
  return !!value && typeof value === 'object' && 'type' in value;
}
