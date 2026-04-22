import type { OpenAIConfig, ProviderAdapter } from '../types.js';
import { callOpenAICompatible } from './openai-compatible.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * Token budget for OpenAI. Reasoning models (o1 / o3 / GPT-5 class)
 * consume internal chain-of-thought tokens against this budget, so 512
 * from the generic OpenAI-compatible default is too tight — the visible
 * completion gets truncated after a few hundred reasoning tokens.
 * 2048 gives comfortable headroom for both visible output (~300 tokens
 * for our structured response) and up to ~1500 reasoning tokens on the
 * short summarization task this prompt asks for.
 */
const OPENAI_MAX_COMPLETION_TOKENS = 2048;

export const openaiAdapter: ProviderAdapter<OpenAIConfig> = {
  async run(config, args) {
    // Use `max_completion_tokens` rather than `max_tokens`. Reasoning
    // models (o1-preview, o1-mini, o3-mini, GPT-5 class) REJECT
    // `max_tokens` outright with a 400; the replacement param works on
    // those AND on older OpenAI models (gpt-4o, gpt-4o-mini, etc.), so
    // one call shape covers the whole OpenAI fleet. Ollama and LM Studio
    // don't recognize `max_completion_tokens` and stay on `max_tokens`
    // via openai-compatible.ts's default.
    return callOpenAICompatible(
      {
        baseUrl: DEFAULT_BASE_URL,
        apiKey: config.apiKey,
        model: config.model ?? DEFAULT_MODEL,
        tokenLimitKey: 'max_completion_tokens',
        maxTokens: OPENAI_MAX_COMPLETION_TOKENS,
      },
      args,
    );
  },
};
