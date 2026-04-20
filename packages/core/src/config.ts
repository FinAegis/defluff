import { PROVIDER_DEFAULT_MODELS, PROVIDER_KINDS } from './providers/index.js';
import type { ProviderConfig, ProviderKind } from './types.js';

export interface ProviderConfigInput {
  kind: ProviderKind;
  apiKey: string;
  model: string;
  baseUrl: string;
}

/**
 * Validate and assemble a ProviderConfig from form inputs. All fields are
 * trimmed. Throws on required-field violations so both clients surface the
 * same error message.
 */
export function buildProviderConfig(input: ProviderConfigInput): ProviderConfig {
  const model = input.model.trim();
  const apiKey = input.apiKey.trim();
  const baseUrl = input.baseUrl.trim();

  switch (input.kind) {
    case 'anthropic':
    case 'openai':
    case 'gemini':
      if (!apiKey) {
        throw new Error(`An API key is required for ${input.kind}.`);
      }
      return {
        kind: input.kind,
        apiKey,
        ...(model ? { model } : {}),
      };
    case 'openai-compatible':
      if (!baseUrl) {
        throw new Error('A base URL is required for OpenAI-compatible endpoints.');
      }
      return {
        kind: 'openai-compatible',
        baseUrl,
        model: model || PROVIDER_DEFAULT_MODELS['openai-compatible'],
        ...(apiKey ? { apiKey } : {}),
      };
  }
}

export function isProviderKind(value: unknown): value is ProviderKind {
  return typeof value === 'string' && (PROVIDER_KINDS as readonly string[]).includes(value);
}

export function isProviderConfig(value: unknown): value is ProviderConfig {
  return !!value && typeof value === 'object' && isProviderKind((value as { kind?: unknown }).kind);
}
