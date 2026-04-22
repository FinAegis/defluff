import { afterEach, describe, expect, it, vi } from 'vitest';
import { DefluffError } from './errors.js';
import { buildBaitUserPrompt, BAIT_SYSTEM_PROMPT } from './prompt.js';
import { generateBait } from './summarize.js';

function mockFetchOnce(status: number, payload: unknown): void {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response));
}

describe('BAIT_SYSTEM_PROMPT', () => {
  it('contains the load-bearing constraints', () => {
    // These constraints are what keep the feature from being a liability:
    // no fake credentials the scammer could weaponize, no phishing,
    // never reveal it's bait. If any of these drift out of the prompt
    // in future edits the whole thing becomes a safety risk.
    expect(BAIT_SYSTEM_PROMPT).toMatch(/never\s+fabricate/i);
    expect(BAIT_SYSTEM_PROMPT).toMatch(/never\s+reveal/i);
    expect(BAIT_SYSTEM_PROMPT).toMatch(/never\s+generate\s+phishing/i);
    expect(BAIT_SYSTEM_PROMPT).toMatch(/mirror.+language/i);
  });
});

describe('buildBaitUserPrompt', () => {
  it('numbers messages and wraps the thread for the model', () => {
    const prompt = buildBaitUserPrompt([
      { sender: 'Laycee', body: 'Join our Web3 project as CTO!' },
      { sender: 'Marijus', body: 'Interested in hearing more' },
    ]);
    expect(prompt).toContain('<scam-thread>');
    expect(prompt).toContain('[1] Laycee');
    expect(prompt).toContain('[2] Marijus');
    expect(prompt).toContain('Return only the reply text');
  });
});

describe('generateBait', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the trimmed reply text end-to-end through the OpenAI shape', async () => {
    const draft =
      'Thanks for the intro. Before booking anything, I\'d need audited ' +
      'financials for the last four quarters, the full cap table with ' +
      'founder vesting, the token economics whitepaper, and an independent ' +
      'smart-contract audit from Trail of Bits or Quantstamp. Once those ' +
      'are in hand I can find 15 minutes. What\'s the fastest way to send them over?';

    mockFetchOnce(200, {
      choices: [{ message: { content: `  ${draft}  \n` } }],
    });

    const text = await generateBait({
      messages: [
        { sender: 'Laycee', body: 'Exciting opportunity at ajuna.io...' },
        { sender: 'Marijus', body: 'Interested' },
        { sender: 'Laycee', body: 'Book a call: calendly.com/...' },
      ],
      provider: { kind: 'openai', apiKey: 'sk-test' },
    });

    expect(text).toBe(draft);
  });

  it('rejects an empty message list', async () => {
    await expect(
      generateBait({ messages: [], provider: { kind: 'openai', apiKey: 'sk-test' } }),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('rejects a thread with only whitespace bodies', async () => {
    await expect(
      generateBait({
        messages: [{ body: '   ' }],
        provider: { kind: 'openai', apiKey: 'sk-test' },
      }),
    ).rejects.toBeInstanceOf(DefluffError);
  });

  it('throws when the provider returns empty text', async () => {
    mockFetchOnce(200, {
      choices: [{ message: { content: '   ' } }],
    });

    await expect(
      generateBait({
        messages: [{ sender: 'A', body: 'pitch' }],
        provider: { kind: 'openai', apiKey: 'sk-test' },
      }),
    ).rejects.toMatchObject({ code: 'server' });
  });
});
