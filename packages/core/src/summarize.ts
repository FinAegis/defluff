import { DefluffError } from './errors.js';
import { parseBullets } from './parse.js';
import { buildUserPrompt, SYSTEM_PROMPT } from './prompt.js';
import {
  anthropicAdapter,
  geminiAdapter,
  openaiAdapter,
  openaiCompatibleAdapter,
} from './providers/index.js';
import type { ProviderConfig, ProviderRunArgs, Summary, SummarizeOptions } from './types.js';

export async function summarize(opts: SummarizeOptions): Promise<Summary> {
  const { text, provider, signal } = opts;
  if (!text.trim()) {
    throw new DefluffError('bad_request', 'Email text is empty.');
  }

  const args: ProviderRunArgs = {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(text),
    ...(signal ? { signal } : {}),
  };

  const raw = await dispatchProvider(provider, args);
  const bullets = parseBullets(raw);
  if (bullets.length === 0) {
    throw new DefluffError('no_bullets', 'Provider returned no parseable bullets.', {
      detail: { raw },
    });
  }
  return { bullets };
}

function dispatchProvider(provider: ProviderConfig, args: ProviderRunArgs): Promise<string> {
  switch (provider.kind) {
    case 'anthropic':
      return anthropicAdapter.run(provider, args);
    case 'openai':
      return openaiAdapter.run(provider, args);
    case 'gemini':
      return geminiAdapter.run(provider, args);
    case 'openai-compatible':
      return openaiCompatibleAdapter.run(provider, args);
  }
}
