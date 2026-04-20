import type { OpenAIConfig, ProviderAdapter } from '../types.js';
import { callOpenAICompatible } from './openai-compatible.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export const openaiAdapter: ProviderAdapter<OpenAIConfig> = {
  async run(config, args) {
    return callOpenAICompatible(
      {
        baseUrl: DEFAULT_BASE_URL,
        apiKey: config.apiKey,
        model: config.model ?? DEFAULT_MODEL,
      },
      args,
    );
  },
};
