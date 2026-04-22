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
/**
 * Default model IDs. We default to each provider's current frontier
 * model (Claude Opus 4.7, GPT-5.4, Gemini 2.5 Pro) rather than a cheap
 * mini/haiku/flash tier. Scam detection and authorship classification
 * are judgment tasks where smaller models regress meaningfully — see
 * the AjunaVerse / fake-recruiter thread that a mini classified as
 * "legit recruitment opportunity" until the prompt was tightened.
 *
 * Cost per click with these defaults is roughly 2–5× a mini tier
 * (Anthropic Opus 4.7: $5 in / $25 out per 1M; GPT-5.4: $2.50 in /
 * $15 out; Gemini 2.5 Pro: $1.25 in / $10 out at <=200K context).
 * For a typical email (~500-1500 tokens in, ~200 tokens out) that
 * works out to a few cents per click — still effectively free for
 * personal use. Users who want to trade quality for cost can override
 * the model from the options page.
 */
export const PROVIDER_DEFAULT_MODELS: Record<ProviderKind, string> = {
  anthropic: 'claude-opus-4-7',
  openai: 'gpt-5.4',
  // GA Pro, not the 3.1 preview — preview carries SLA risk and the
  // user is paying per-token on their own key, so GA is the right
  // default. Users can override to gemini-3.1-pro-preview or
  // gemini-2.5-flash from the options page.
  gemini: 'gemini-2.5-pro',
  'openai-compatible': 'llama3',
};

export const PROVIDER_LABELS: Record<ProviderKind, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  'openai-compatible': 'OpenAI-compatible (Ollama, LM Studio, custom)',
};

export { anthropicAdapter, geminiAdapter, openaiAdapter, openaiCompatibleAdapter };
