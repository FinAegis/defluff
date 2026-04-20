import { codeFromStatus, DefluffError } from '../errors.js';
import type { AnthropicConfig, ProviderAdapter, ProviderRunArgs } from '../types.js';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?: { type?: string; message?: string };
}

export const anthropicAdapter: ProviderAdapter<AnthropicConfig> = {
  async run(config, args) {
    return callAnthropic(config, args);
  },
};

async function callAnthropic(
  config: AnthropicConfig,
  args: ProviderRunArgs,
): Promise<string> {
  const body = {
    model: config.model ?? DEFAULT_MODEL,
    max_tokens: 512,
    system: args.systemPrompt,
    messages: [{ role: 'user', content: args.userPrompt }],
  };

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': API_VERSION,
        // Opt in to browser-origin requests. Safe here because the key is the
        // user's own (BYOK), stored in per-user encrypted extension storage.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      ...(args.signal ? { signal: args.signal } : {}),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new DefluffError('aborted', 'Request aborted', { cause });
    }
    throw new DefluffError('network', 'Network request to Anthropic failed', { cause });
  }

  const json = (await response.json().catch(() => ({}))) as AnthropicResponse;

  if (!response.ok) {
    throw new DefluffError(
      codeFromStatus(response.status),
      json.error?.message ?? `Anthropic request failed: ${response.status}`,
      { status: response.status, detail: json.error },
    );
  }

  const text = json.content?.find((block) => block.type === 'text')?.text;
  if (!text) {
    throw new DefluffError('server', 'Anthropic response contained no text block', { detail: json });
  }
  return text;
}
