import { afterEach, describe, expect, it, vi } from 'vitest';
import { DefluffError } from './errors.js';
import { summarize } from './summarize.js';

function mockFetchOnce(status: number, payload: unknown): void {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response));
}

describe('summarize', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns parsed bullets from an OpenAI-shaped response', async () => {
    mockFetchOnce(200, {
      choices: [
        {
          message: {
            content: '- Need signoff by EOD Thursday\n- Blocker: missing legal review\n- Meeting tomorrow 10am',
          },
        },
      ],
    });

    const result = await summarize({
      text: 'Hi team, hope you are well...',
      provider: { kind: 'openai', apiKey: 'sk-test' },
    });

    expect(result.bullets).toHaveLength(3);
    expect(result.bullets[0]).toBe('Need signoff by EOD Thursday');
  });

  it('rejects empty email text', async () => {
    await expect(
      summarize({ text: '   ', provider: { kind: 'openai', apiKey: 'sk-test' } }),
    ).rejects.toBeInstanceOf(DefluffError);
  });

  it('throws no_bullets when the model returns prose only', async () => {
    mockFetchOnce(200, {
      choices: [{ message: { content: 'The sender wants help with the deck.' } }],
    });

    await expect(
      summarize({
        text: 'Hey, about the deck...',
        provider: { kind: 'openai', apiKey: 'sk-test' },
      }),
    ).rejects.toMatchObject({ code: 'no_bullets' });
  });

  it('maps a 401 response to an auth error', async () => {
    mockFetchOnce(401, { error: { message: 'Invalid API key' } });

    await expect(
      summarize({
        text: 'anything',
        provider: { kind: 'openai', apiKey: 'sk-bad' },
      }),
    ).rejects.toMatchObject({ code: 'auth', status: 401 });
  });
});
