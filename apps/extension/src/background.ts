import { DefluffError, summarize } from '@defluff/core';
import { MSG_SUMMARIZE, type AppRequest, type SummarizeResponse } from './shared/messages.js';
import { getProviderConfig } from './shared/storage.js';

// Open the options page on fresh install so users land directly on the
// provider-configuration screen instead of having to discover it.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    void chrome.runtime.openOptionsPage();
  }
});

// Toolbar icon click opens the options page. With no default_popup set, this
// listener fires on every click. The options UI is the "settings" surface —
// summarization itself lives on the inline De-Fluff button injected into Gmail
// and Outlook Web, not the toolbar action.
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isAppRequest(message)) return undefined;

  if (message.type === MSG_SUMMARIZE) {
    void handleSummarize(message.text).then(sendResponse);
    return true; // Chrome MV3 idiom: keep the channel open for an async response.
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
