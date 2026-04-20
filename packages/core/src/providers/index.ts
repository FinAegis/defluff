import type { ProviderKind } from '../types.js';
import { anthropicAdapter } from './anthropic.js';
import { geminiAdapter } from './gemini.js';
import { openaiAdapter } from './openai.js';
import { openaiCompatibleAdapter } from './openai-compatible.js';

export const PROVIDER_KINDS: readonly ProviderKind[] = [
  'anthropic',
  'openai',
  'gemini',
  'openai-compatible',
] as const;

/**
 * Default model IDs for each provider. UIs use these as placeholder text
 * in the model-override field. Update these in one place when a provider
 * ships a better default — do not duplicate in client apps.
 */
export const PROVIDER_DEFAULT_MODELS: Record<ProviderKind, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash',
  'openai-compatible': 'llama3',
};

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  'openai-compatible': 'OpenAI-compatible (Ollama, LM Studio, custom)',
};

export { anthropicAdapter, geminiAdapter, openaiAdapter, openaiCompatibleAdapter };
