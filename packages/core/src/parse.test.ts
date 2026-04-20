import { describe, expect, it } from 'vitest';
import { parseBullets, parseSummary } from './parse.js';

describe('parseBullets (legacy)', () => {
  it('parses bullets when the response has no verdict or prompt', () => {
    const raw = '- First point\n- Second point\n- Third';
    expect(parseBullets(raw)).toEqual(['First point', 'Second point', 'Third']);
  });

  it('returns empty array when no bullets present', () => {
    expect(parseBullets('This response has no bullets at all.')).toEqual([]);
  });
});

describe('parseSummary', () => {
  it('extracts reversedPrompt, verdict, reason, and bullets', () => {
    const raw = [
      'Prompt: "Politely ask the team for the deck by Wednesday."',
      'Verdict: ACTIONABLE — deadline-driven request',
      '',
      '- Send deck by EOD Wednesday',
      '- Hold customer logos pending legal sign-off',
    ].join('\n');

    const summary = parseSummary(raw);
    expect(summary.reversedPrompt).toBe('Politely ask the team for the deck by Wednesday.');
    expect(summary.verdict).toBe('actionable');
    expect(summary.verdictReason).toBe('deadline-driven request');
    expect(summary.bullets).toEqual([
      'Send deck by EOD Wednesday',
      'Hold customer logos pending legal sign-off',
    ]);
  });

  it('handles all four verdict tokens', () => {
    const samples: Array<[string, string]> = [
      ['Verdict: RESPONSE-NEEDED — waiting on approval', 'response-needed'],
      ['Verdict: FYI — informational only', 'fyi'],
      ['Verdict: NOISE — generic recruiter outreach', 'noise'],
      ['Verdict: ACTIONABLE — has a deadline', 'actionable'],
    ];
    for (const [line, expected] of samples) {
      expect(parseSummary(line).verdict).toBe(expected);
    }
  });

  it('accepts NOISE with only the prompt + verdict and zero bullets', () => {
    const raw = [
      'Prompt: "Write a generic recruiting outreach."',
      'Verdict: NOISE — boilerplate recruiter pitch',
    ].join('\n');
    const summary = parseSummary(raw);
    expect(summary.verdict).toBe('noise');
    expect(summary.bullets).toEqual([]);
  });

  it('strips fancy quotes around the reversed prompt', () => {
    const raw = 'Prompt: "Ask for the numbers"\nVerdict: FYI — informational';
    expect(parseSummary(raw).reversedPrompt).toBe('Ask for the numbers');
  });

  it('is lenient to bold markup on labels', () => {
    const raw = [
      '**Prompt:** "Ask for review"',
      '**Verdict:** ACTIONABLE — needs input',
      '- Review needed by Friday',
    ].join('\n');
    const summary = parseSummary(raw);
    expect(summary.reversedPrompt).toBe('Ask for review');
    expect(summary.verdict).toBe('actionable');
    expect(summary.bullets).toEqual(['Review needed by Friday']);
  });

  it('tolerates a verdict without an explicit reason', () => {
    const raw = 'Verdict: FYI\n- Stats are posted';
    const summary = parseSummary(raw);
    expect(summary.verdict).toBe('fyi');
    expect(summary.verdictReason).toBeUndefined();
  });

  it('handles punctuation separating the verdict from its reason', () => {
    const cases: Array<[string, string]> = [
      ['Verdict: NOISE. Generic recruiter pitch', 'Generic recruiter pitch'],
      ['Verdict: ACTIONABLE; deadline is Friday', 'deadline is Friday'],
      ['Verdict: FYI, informational only', 'informational only'],
    ];
    for (const [raw, reason] of cases) {
      const summary = parseSummary(raw);
      expect(summary.verdict).toBeDefined();
      expect(summary.verdictReason).toBe(reason);
    }
  });

  it('still parses when prompt / verdict lines are missing', () => {
    const raw = '- Send deck by Friday\n- Hold logos';
    const summary = parseSummary(raw);
    expect(summary.reversedPrompt).toBeUndefined();
    expect(summary.verdict).toBeUndefined();
    expect(summary.bullets).toHaveLength(2);
  });
});
