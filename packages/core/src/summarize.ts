import { DefluffError } from './errors.js';
import { parseSummary, parseThreadSummary } from './parse.js';
import {
  buildThreadUserPrompt,
  buildUserPrompt,
  SYSTEM_PROMPT,
  THREAD_SYSTEM_PROMPT,
} from './prompt.js';
import {
  anthropicAdapter,
  geminiAdapter,
  openaiAdapter,
  openaiCompatibleAdapter,
} from './providers/index.js';
import type {
  ProviderConfig,
  ProviderRunArgs,
  Summary,
  SummarizeOptions,
  SummarizeThreadOptions,
  ThreadSummary,
} from './types.js';

export async function summarize(opts: SummarizeOptions): Promise<Summary> {
  const { text, provider, signal } = opts;
  if (!text.trim()) {
    throw new DefluffError('bad_request', 'Email text is empty.');
  }

  const args: ProviderRunArgs = {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(text),
    ...(signal ? { signal } : {}),
  };

  const raw = await dispatchProvider(provider, args);
  const summary = parseSummary(raw);
  if (summary.bullets.length === 0 && summary.verdict !== 'noise') {
    throw new DefluffError('no_bullets', 'Provider returned no parseable bullets.', {
      detail: { raw },
    });
  }
  return summary;
}

/**
 * Thread-mode summary. Takes an ordered list of messages (sender, timestamp,
 * body) and returns a per-message summary list plus a thread-level verdict
 * + actions. The thread-level verdict is where progressive-reveal scams
 * get caught — patterns that are only visible when the whole conversation
 * is considered together.
 *
 * Throws the same errors as summarize() for empty input and a new
 * `no_bullets` case if the model returned zero parseable messages.
 */
export async function summarizeThread(
  opts: SummarizeThreadOptions,
): Promise<ThreadSummary> {
  const { messages, provider, signal } = opts;
  if (messages.length === 0) {
    throw new DefluffError('bad_request', 'Thread has no messages.');
  }
  if (!messages.some((m) => m.body.trim().length > 0)) {
    throw new DefluffError('bad_request', 'Thread has no non-empty messages.');
  }

  const args: ProviderRunArgs = {
    systemPrompt: THREAD_SYSTEM_PROMPT,
    userPrompt: buildThreadUserPrompt(messages),
    ...(signal ? { signal } : {}),
  };

  const raw = await dispatchProvider(provider, args);
  const thread = parseThreadSummary(raw);
  if (thread.messages.length === 0) {
    throw new DefluffError(
      'no_bullets',
      'Provider returned a thread with no parseable messages.',
      { detail: { raw } },
    );
  }
  return thread;
}

function dispatchProvider(provider: ProviderConfig, args: ProviderRunArgs): Promise<string> {
  switch (provider.kind) {
    case 'anthropic':
      return anthropicAdapter.run(provider, args);
    case 'openai':
      return openaiAdapter.run(provider, args);
    case 'gemini':
      return geminiAdapter.run(provider, args);
    case 'openai-compatible':
      return openaiCompatibleAdapter.run(provider, args);
  }
}
