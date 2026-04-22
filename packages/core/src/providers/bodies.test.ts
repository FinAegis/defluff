import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  anthropicAdapter,
  geminiAdapter,
  openaiAdapter,
  openaiCompatibleAdapter,
} from './index.js';

/**
 * Regression tests for request-body shape. The class of bug these guard
 * against: "the provider added / removed / renamed a parameter and the
 * adapter silently broke for that provider's newer models." Example:
 * OpenAI's reasoning models (o1 / o3 / GPT-5) reject `max_tokens` and
 * require `max_completion_tokens`; Ollama's OpenAI-compatible endpoint
 * does NOT know `max_completion_tokens` and keeps `max_tokens`.
 *
 * Each test captures the outgoing fetch body and asserts on the keys
 * that have historically moved between providers.
 */

function captureFetchBody(): { body: Record<string, unknown> | null } {
  const captured: { body: Record<string, unknown> | null } = { body: null };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      captured.body = JSON.parse(init.body as string) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          // Shape that satisfies every adapter's success parser.
          choices: [{ message: { content: 'Verdict: FYI — ok\n- a\n' } }],
          content: [{ type: 'text', text: 'Verdict: FYI — ok\n- a\n' }],
          candidates: [{ content: { parts: [{ text: 'Verdict: FYI — ok\n- a\n' }] } }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }),
  );
  return captured;
}

describe('provider request bodies', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('OpenAI sends max_completion_tokens (not max_tokens) — works on reasoning models', async () => {
    const captured = captureFetchBody();
    await openaiAdapter.run(
      { kind: 'openai', apiKey: 'sk-test' },
      { systemPrompt: 'sys', userPrompt: 'usr' },
    );
    expect(captured.body).toBeTruthy();
    expect(captured.body).toHaveProperty('max_completion_tokens');
    // Regression guard: reasoning models reject max_tokens with a 400.
    expect(captured.body).not.toHaveProperty('max_tokens');
    // Reasoning models count internal tokens against the budget, so the
    // OpenAI path uses a higher value than generic Ollama endpoints.
    expect(captured.body?.max_completion_tokens).toBeGreaterThanOrEqual(1024);
  });

  it('OpenAI-compatible (Ollama / LM Studio) keeps max_tokens', async () => {
    const captured = captureFetchBody();
    await openaiCompatibleAdapter.run(
      {
        kind: 'openai-compatible',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3',
      },
      { systemPrompt: 'sys', userPrompt: 'usr' },
    );
    expect(captured.body).toBeTruthy();
    // Ollama does NOT recognize max_completion_tokens (as of late 2025).
    expect(captured.body).toHaveProperty('max_tokens');
    expect(captured.body).not.toHaveProperty('max_completion_tokens');
  });

  it('Anthropic sends max_tokens (Messages API, unchanged across Claude 3.x–4.x)', async () => {
    const captured = captureFetchBody();
    await anthropicAdapter.run(
      { kind: 'anthropic', apiKey: 'sk-ant-test' },
      { systemPrompt: 'sys', userPrompt: 'usr' },
    );
    expect(captured.body).toBeTruthy();
    expect(captured.body).toHaveProperty('max_tokens');
    // Anthropic's Messages API has a flat system field, not chat-style.
    expect(captured.body).toHaveProperty('system', 'sys');
    expect(captured.body?.messages).toEqual([{ role: 'user', content: 'usr' }]);
  });

  it('Gemini sends generationConfig.maxOutputTokens (not top-level max_tokens)', async () => {
    const captured = captureFetchBody();
    await geminiAdapter.run(
      { kind: 'gemini', apiKey: 'test-key' },
      { systemPrompt: 'sys', userPrompt: 'usr' },
    );
    expect(captured.body).toBeTruthy();
    expect(captured.body).not.toHaveProperty('max_tokens');
    expect(captured.body).not.toHaveProperty('max_completion_tokens');
    const config = captured.body?.generationConfig as
      | { maxOutputTokens?: number }
      | undefined;
    expect(config?.maxOutputTokens).toBeGreaterThan(0);
  });
});
