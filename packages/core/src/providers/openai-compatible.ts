import { codeFromStatus, DefluffError } from '../errors.js';
import type { OpenAICompatibleConfig, ProviderAdapter, ProviderRunArgs } from '../types.js';

interface ChatCompletionsResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; type?: string };
}

/**
 * Which token-limit key to put in the request body.
 *
 * - `max_tokens`             — the historical Chat Completions parameter.
 *                              Still accepted by Ollama, LM Studio, LiteLLM
 *                              proxies, most OpenAI-compatible gateways, and
 *                              OpenAI's own non-reasoning models (gpt-4o,
 *                              gpt-4o-mini, gpt-3.5-turbo, etc.).
 * - `max_completion_tokens`  — the replacement OpenAI introduced with its
 *                              reasoning models. OpenAI's o1 / o3 / GPT-5
 *                              class REJECTS `max_tokens` with a 400 and
 *                              requires this key. Older OpenAI models also
 *                              accept it. Ollama and friends do NOT
 *                              recognize it, so keep them on `max_tokens`.
 */
type TokenLimitKey = 'max_tokens' | 'max_completion_tokens';

export const openaiCompatibleAdapter: ProviderAdapter<OpenAICompatibleConfig> = {
  async run(config, args) {
    return callOpenAICompatible(
      {
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
      },
      args,
    );
  },
};

export async function callOpenAICompatible(
  config: {
    baseUrl: string;
    apiKey?: string;
    model: string;
    /**
     * Which token-limit key to send. Defaults to `max_tokens` — right for
     * Ollama, LM Studio, and every generic OpenAI-compatible gateway.
     * The OpenAI-branded adapter (providers/openai.ts) overrides to
     * `max_completion_tokens` so its requests work on reasoning models.
     */
    tokenLimitKey?: TokenLimitKey;
    /**
     * How many tokens to allow. Reasoning models count internal chain-of-
     * thought tokens against this budget, so the OpenAI adapter uses a
     * higher value than generic OpenAI-compatible endpoints.
     */
    maxTokens?: number;
  },
  args: ProviderRunArgs,
): Promise<string> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (config.apiKey) {
    headers.authorization = `Bearer ${config.apiKey}`;
  }

  const tokenLimitKey: TokenLimitKey = config.tokenLimitKey ?? 'max_tokens';
  const tokenLimitValue = config.maxTokens ?? 512;

  const body = {
    model: config.model,
    [tokenLimitKey]: tokenLimitValue,
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
