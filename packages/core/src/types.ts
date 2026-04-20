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

export type Verdict = 'actionable' | 'response-needed' | 'fyi' | 'noise';

export interface Summary {
  /** Best-guess imperative the sender probably gave an AI. The reversal. */
  reversedPrompt?: string;
  /** Verdict classifying how much attention the email deserves. */
  verdict?: Verdict;
  /** One-sentence justification for the verdict. */
  verdictReason?: string;
  /** Extracted specifics — facts, actions, questions. */
  bullets: string[];
}

/**
 * Which email/messaging hosts should show the De-Fluff button. Gmail and
 * Outlook are on by default; LinkedIn is opt-in because its host permission
 * requires an extra prompt (see `optional_host_permissions` in the manifest).
 */
export interface HostsConfig {
  gmail: boolean;
  outlook: boolean;
  linkedin: boolean;
}

export const DEFAULT_HOSTS_CONFIG: HostsConfig = {
  gmail: true,
  outlook: true,
  linkedin: false,
};

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
