import { codeFromStatus, DefluffError } from '../errors.js';
import type { OpenAICompatibleConfig, ProviderAdapter, ProviderRunArgs } from '../types.js';

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; type?: string };
}

export const openaiCompatibleAdapter: ProviderAdapter<OpenAICompatibleConfig> = {
  async run(config, args) {
    return callOpenAICompatible(
      { baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.model },
      args,
    );
  },
};

export async function callOpenAICompatible(
  config: { baseUrl: string; apiKey?: string; model: string },
  args: ProviderRunArgs,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.apiKey) {
    headers.authorization = `Bearer ${config.apiKey}`;
  }

  const body = {
    model: config.model,
    max_tokens: 512,
    messages: [
      { role: 'system', content: args.systemPrompt },
      { role: 'user', content: args.userPrompt },
    ],
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      ...(args.signal ? { signal: args.signal } : {}),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw new DefluffError('aborted', 'Request aborted', { cause });
    }
    throw new DefluffError('network', `Network request to ${url} failed`, { cause });
  }

  const json = (await response.json().catch(() => ({}))) as ChatCompletionsResponse;

  if (!response.ok) {
    throw new DefluffError(
      codeFromStatus(response.status),
      json.error?.message ?? `Request failed: ${response.status}`,
      { status: response.status, detail: json.error },
    );
  }

  const text = json.choices?.[0]?.message?.content;
  if (!text) {
    throw new DefluffError('server', 'Response contained no message content', { detail: json });
  }
  return text;
}
