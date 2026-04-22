import { afterEach, describe, expect, it, vi } from 'vitest';
import { DefluffError } from './errors.js';
import { parseThreadSummary } from './parse.js';
import { buildThreadUserPrompt } from './prompt.js';
import { summarizeThread } from './summarize.js';

function mockFetchOnce(status: number, payload: unknown): void {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response));
}

describe('buildThreadUserPrompt', () => {
  it('numbers messages and falls back to "unknown" for missing sender / timestamp', () => {
    const prompt = buildThreadUserPrompt([
      { sender: 'Alice', timestamp: 'Tue 10:14', body: 'Need vendor list.' },
      { body: '  Sent draft.  ' },
    ]);
    expect(prompt).toContain('[1] Alice · Tue 10:14');
    expect(prompt).toContain('Need vendor list.');
    expect(prompt).toContain('[2] unknown · unknown');
    expect(prompt).toContain('Sent draft.');
    expect(prompt.startsWith('<thread>')).toBe(true);
    expect(prompt.endsWith('</thread>')).toBe(true);
  });
});

describe('parseThreadSummary', () => {
  it('parses a three-message scam progression with SCAM thread verdict', () => {
    const raw = [
      'Laycee — Mon 10:14',
      'Authored: AI — Web3 kitchen-sink pitch, formulaic opener, zero specifics',
      'Prompt: "Send a cold LinkedIn recruiter pitch for a CTO role at a Web3 project."',
      'Verdict: NOISE — likely fake recruiter',
      '',
      '- CTO OR Strategic Advisor offered to a stranger — "any title you\'ll respond to" bait.',
      '- AjunaVerse / ajuna.io — Web3 kitchen sink, no stage or funding detail.',
      '',
      '===',
      '',
      'Marijus — Mon 11:03',
      'Authored: human — short polite hedge',
      'Verdict: RESPONSE-NEEDED — asked a clarifying question',
      '',
      '- Asked what specifically the role entails',
      '',
      '===',
      '',
      'Laycee — Mon 14:22',
      'Authored: AI — Calendly drop, smart-contract framing',
      'Prompt: "Push the recipient to book a Calendly and mention our smart-contract platform."',
      'Verdict: NOISE — likely phishing via Calendly',
      '',
      '- Pushed to book calendly.com/laycee-ajuna for a 30-minute call.',
      '- Mentioned wallet connection required to preview the smart contract.',
      '',
      '===',
      '',
      'Thread: SCAM — fake recruiter → calendly + wallet',
      '',
      'Actions:',
      '- Marijus: do not book the call; block sender.',
      '- Laycee: —',
    ].join('\n');

    const thread = parseThreadSummary(raw);
    expect(thread.messages).toHaveLength(3);
    expect(thread.messages[0]?.sender).toBe('Laycee');
    expect(thread.messages[0]?.summary.authored).toBe('ai');
    expect(thread.messages[0]?.summary.verdict).toBe('noise');
    expect(thread.messages[1]?.sender).toBe('Marijus');
    expect(thread.messages[1]?.summary.authored).toBe('human');
    expect(thread.messages[1]?.summary.reversedPrompt).toBeUndefined();
    expect(thread.messages[2]?.summary.verdict).toBe('noise');
    expect(thread.threadVerdict).toBe('scam');
    expect(thread.threadVerdictReason).toMatch(/recruiter.*calendly.*wallet/);
    expect(thread.actions).toHaveLength(2);
    expect(thread.actions[0]).toEqual({
      who: 'Marijus',
      action: 'do not book the call; block sender.',
    });
    expect(thread.actions[1]?.action).toBe('—');
  });

  it('parses a LEGIT two-message thread with no Actions section', () => {
    const raw = [
      'Alice — Tue 10:14',
      'Authored: human — terse reply-on-top, named Bob',
      'Verdict: RESPONSE-NEEDED — waiting on vendor list',
      '',
      '- Q3 budget capped at $50k',
      '- Need finalized vendor list by Friday',
      '',
      '===',
      '',
      'Bob — Tue 14:02',
      'Authored: AI-assisted — polished prose around concrete vendor names',
      'Prompt: "Confirm vendors A and B and explain the C decline."',
      'Verdict: ACTIONABLE — deliverable coming Thursday',
      '',
      '- Vendor A and B confirmed',
      '- Contract draft Thursday',
      '',
      '===',
      '',
      'Thread: LEGIT — real internal coordination on vendor sign-off',
    ].join('\n');

    const thread = parseThreadSummary(raw);
    expect(thread.messages).toHaveLength(2);
    expect(thread.threadVerdict).toBe('legit');
    expect(thread.threadVerdictReason).toMatch(/vendor sign-off/);
    expect(thread.actions).toEqual([]);
  });

  it('tolerates a missing === separator by falling back on sender-header detection', () => {
    const raw = [
      'Alice — Tue 10:14',
      'Authored: human — terse',
      'Verdict: RESPONSE-NEEDED — waiting',
      '',
      '- Need the list',
      '',
      '',
      'Bob — Tue 14:02',
      'Authored: human — terse reply',
      'Verdict: ACTIONABLE — will send Thursday',
      '',
      '- Thursday delivery',
      '',
      '',
      'Thread: LEGIT — real internal chat',
    ].join('\n');

    const thread = parseThreadSummary(raw);
    expect(thread.messages).toHaveLength(2);
    expect(thread.threadVerdict).toBe('legit');
  });

  it('returns an empty-messages thread when the model emits only a Thread line', () => {
    const raw = 'Thread: LEGIT — nothing to do';
    const thread = parseThreadSummary(raw);
    expect(thread.messages).toEqual([]);
    expect(thread.threadVerdict).toBe('legit');
  });

  it('parses a two-message SCAM thread where the inbound is a fake-recruiter pitch the reader politely replied to', () => {
    // Regression for the "AjunaVerse / Laycee" case: a Web3 kitchen-sink
    // recruiter cold-pitch followed by a polite reply. The model must
    // classify the inbound as NOISE and the THREAD as SCAM — a polite
    // reply does not launder a scam into legitimacy.
    const raw = [
      'Laycee — 7:05 PM',
      'Authored: AI — clichéd opener, generic Web3 kitchen-sink, zero specifics',
      'Prompt: "Send a cold LinkedIn recruiter pitch for a CTO role at a Web3 project."',
      'Verdict: NOISE — likely fake recruiter / crypto-Web3 pitch',
      '',
      '- CTO OR Strategic Advisor offered to a stranger — "any title you\'ll respond to" bait.',
      '- AjunaVerse / ajuna.io — kitchen-sink Web3 (betting + gaming + prediction markets).',
      '- Zero specifics on stage, funding, comp, equity, or team.',
      '',
      '===',
      '',
      'Marijus — 10:08 PM',
      'Authored: human — short polite acknowledgement',
      'Verdict: FYI — polite holding reply to a scam pitch',
      '',
      '- Thanked sender, left door open for more info.',
      '',
      '===',
      '',
      'Thread: SCAM — crypto / Web3 pitch',
      '',
      'Actions:',
      '- Marijus: do not engage further; block the sender.',
      '- Laycee: —',
    ].join('\n');

    const thread = parseThreadSummary(raw);
    expect(thread.messages).toHaveLength(2);
    expect(thread.messages[0]?.summary.verdict).toBe('noise');
    expect(thread.messages[0]?.summary.verdictReason).toMatch(/fake recruiter/i);
    expect(thread.threadVerdict).toBe('scam');
    expect(thread.threadVerdictReason).toMatch(/crypto.*Web3|Web3.*crypto/i);
  });

  it('ignores legacy MIXED thread verdicts (the state was removed)', () => {
    const raw = [
      'Alice — Tue 10:14',
      'Authored: human — terse',
      'Verdict: FYI — auto-reply',
      '',
      '- Out of office this week',
      '',
      '===',
      '',
      'Thread: MIXED — one auto-reply in a legit thread',
    ].join('\n');
    const thread = parseThreadSummary(raw);
    expect(thread.messages).toHaveLength(1);
    // MIXED was removed from the verdict vocabulary; parser drops it and
    // the caller renders the per-message verdicts on their own.
    expect(thread.threadVerdict).toBeUndefined();
  });
});

describe('summarizeThread', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('parses a three-message scam thread end-to-end through the OpenAI shape', async () => {
    const modelResponse = [
      'Laycee — Mon 10:14',
      'Authored: AI — generic Web3 pitch',
      'Prompt: "Cold LinkedIn recruiter pitch for a CTO role."',
      'Verdict: NOISE — likely fake recruiter',
      '',
      '- Generic Web3 pitch, no specifics',
      '',
      '===',
      '',
      'Laycee — Mon 14:22',
      'Authored: AI — calendly drop',
      'Prompt: "Push recipient to book a calendly and connect wallet."',
      'Verdict: NOISE — likely phishing',
      '',
      '- Calendly + wallet-connect ask',
      '',
      '===',
      '',
      'Thread: SCAM — fake recruiter → calendly + wallet',
      '',
      'Actions:',
      '- You: do not respond; block sender.',
    ].join('\n');

    mockFetchOnce(200, {
      choices: [{ message: { content: modelResponse } }],
    });

    const result = await summarizeThread({
      messages: [
        { sender: 'Laycee', timestamp: 'Mon 10:14', body: 'Exciting opportunity at ajuna.io...' },
        { sender: 'Laycee', timestamp: 'Mon 14:22', body: 'Book a time: calendly.com/...' },
      ],
      provider: { kind: 'openai', apiKey: 'sk-test' },
    });

    expect(result.messages).toHaveLength(2);
    expect(result.threadVerdict).toBe('scam');
    expect(result.threadVerdictReason).toMatch(/calendly/i);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]?.who).toBe('You');
  });

  it('rejects an empty message list', async () => {
    await expect(
      summarizeThread({ messages: [], provider: { kind: 'openai', apiKey: 'sk-test' } }),
    ).rejects.toMatchObject({ code: 'bad_request' });
  });

  it('rejects a thread with only whitespace bodies', async () => {
    await expect(
      summarizeThread({
        messages: [{ body: '  ' }, { body: '\n\n' }],
        provider: { kind: 'openai', apiKey: 'sk-test' },
      }),
    ).rejects.toBeInstanceOf(DefluffError);
  });

  it('throws no_bullets when the response parses to zero messages and no thread verdict', async () => {
    mockFetchOnce(200, {
      choices: [{ message: { content: 'I cannot summarize this thread.' } }],
    });

    await expect(
      summarizeThread({
        messages: [{ body: 'Hello.' }],
        provider: { kind: 'openai', apiKey: 'sk-test' },
      }),
    ).rejects.toMatchObject({ code: 'no_bullets' });
  });
});
