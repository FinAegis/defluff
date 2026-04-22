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

const MODEL_RESPONSE = [
  'Authored: AI-assisted — clichéd opener around a real deadline',
  'Prompt: "Ask the team for the deck by EOD Wednesday."',
  'Verdict: ACTIONABLE — has a concrete deadline',
  '',
  '- Send deck by EOD Wednesday',
  '- Hold customer logos pending legal',
  '- Review with Jane on Thursday',
].join('\n');

describe('summarize', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns parsed bullets plus verdict metadata from an OpenAI-shaped response', async () => {
    mockFetchOnce(200, {
      choices: [{ message: { content: MODEL_RESPONSE } }],
    });

    const result = await summarize({
      text: 'Hi team, hope you are well...',
      provider: { kind: 'openai', apiKey: 'sk-test' },
    });

    expect(result.bullets).toHaveLength(3);
    expect(result.verdict).toBe('actionable');
    expect(result.authored).toBe('ai-assisted');
    expect(result.reversedPrompt).toMatch(/deck by EOD Wednesday/);
  });

  it('rejects empty email text', async () => {
    await expect(
      summarize({ text: '   ', provider: { kind: 'openai', apiKey: 'sk-test' } }),
    ).rejects.toBeInstanceOf(DefluffError);
  });

  it('throws no_bullets only when verdict is not NOISE', async () => {
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

  it('allows a NOISE response with zero bullets', async () => {
    const noiseResponse = [
      'Prompt: "Write a generic recruiter blast."',
      'Verdict: NOISE — boilerplate recruiting pitch',
    ].join('\n');
    mockFetchOnce(200, {
      choices: [{ message: { content: noiseResponse } }],
    });

    const result = await summarize({
      text: 'Hey! Saw your profile...',
      provider: { kind: 'openai', apiKey: 'sk-test' },
    });
    expect(result.verdict).toBe('noise');
    expect(result.bullets).toEqual([]);
  });

  it('returns scam-NOISE red-flag bullets end-to-end', async () => {
    const scamResponse = [
      'Prompt: "Write an urgent overdue-invoice reminder with a fake forwarded approval."',
      'Verdict: NOISE — likely invoice fraud / BEC',
      '',
      '- Unknown sender on lookalike domain, not a known counterparty.',
      '- Fake forwarded "approval" impersonating the recipient.',
      '- Urgency + late-fee threat paired with a payment redirect.',
    ].join('\n');
    mockFetchOnce(200, {
      choices: [{ message: { content: scamResponse } }],
    });

    const result = await summarize({
      text: 'Hello, your invoice is overdue by 60 days...',
      provider: { kind: 'openai', apiKey: 'sk-test' },
    });
    expect(result.verdict).toBe('noise');
    expect(result.verdictReason).toMatch(/invoice fraud|BEC/i);
    expect(result.bullets).toHaveLength(3);
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
