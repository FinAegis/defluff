export type ProviderKind = 'anthropic' | 'openai' | 'gemini' | 'openai-compatible';

export interface AnthropicConfig {
  kind: 'anthropic';
  apiKey: string;
  model?: string;
}

export interface OpenAIConfig {
  kind: 'openai';
  apiKey: string;
  model?: string;
}

export interface GeminiConfig {
  kind: 'gemini';
  apiKey: string;
  model?: string;
}

export interface OpenAICompatibleConfig {
  kind: 'openai-compatible';
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export type ProviderConfig =
  | AnthropicConfig
  | OpenAIConfig
  | GeminiConfig
  | OpenAICompatibleConfig;

export interface Summary {
  bullets: string[];
}

export interface SummarizeOptions {
  text: string;
  provider: ProviderConfig;
  signal?: AbortSignal;
}

export interface ProviderRunArgs {
  systemPrompt: string;
  userPrompt: string;
  signal?: AbortSignal;
}

export interface ProviderAdapter<Cfg extends ProviderConfig> {
  run(config: Cfg, args: ProviderRunArgs): Promise<string>;
}
