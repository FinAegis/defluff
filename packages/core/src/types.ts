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

/**
 * Who authored the email. The model decides from visible signals in the
 * message text. "human" means the reversed prompt is skipped — there is
 * nothing to reverse.
 */
export type Authored = 'ai' | 'ai-assisted' | 'human';

export interface Summary {
  /** Authorship classification: AI, AI-assisted, or plainly human. */
  authored?: Authored;
  /** One-sentence reasoning citing the concrete signals behind `authored`. */
  authoredReason?: string;
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

/**
 * A single message in a thread. Sender and timestamp are best-effort — the
 * DOM scrape in the extension may miss them on collapsed runs or reply-all
 * blocks. The body is always required; without it there is nothing to
 * summarize.
 */
export interface ThreadMessage {
  sender?: string;
  timestamp?: string;
  body: string;
}

/**
 * Thread-level verdict. Two states, deliberately: LEGIT for real
 * conversations and SCAM for progressions where individual messages look
 * fine but the sequence is not. An older "MIXED" state (mostly legit with
 * a stray noise message) was dropped because it duplicated what the
 * per-message NOISE tag already communicates and left the reader with no
 * decision to make.
 */
export type ThreadVerdict = 'legit' | 'scam';

export interface ThreadMessageSummary {
  sender?: string;
  timestamp?: string;
  summary: Summary;
}

export interface ThreadAction {
  /** The person responsible. Free-form — "Alice", "You", "Both", "—". */
  who: string;
  /** What that person needs to do. "—" when nothing is required. */
  action: string;
}

export interface ThreadSummary {
  messages: ThreadMessageSummary[];
  /** LEGIT / MIXED / SCAM at the thread level. Optional when the model did not emit one. */
  threadVerdict?: ThreadVerdict;
  /** One-sentence reason, naming the scam pattern if applicable. */
  threadVerdictReason?: string;
  /** Per-person action list from the model. May be empty. */
  actions: ThreadAction[];
}

export interface SummarizeThreadOptions {
  messages: ThreadMessage[];
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
