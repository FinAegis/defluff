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

export { anthropicAdapter, geminiAdapter, openaiAdapter, openaiCompatibleAdapter };
