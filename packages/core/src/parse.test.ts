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
      'Authored: AI-assisted — clichéd opener, concrete deadline intact',
      'Prompt: "Politely ask the team for the deck by Wednesday."',
      'Verdict: ACTIONABLE — deadline-driven request',
      '',
      '- Send deck by EOD Wednesday',
      '- Hold customer logos pending legal sign-off',
    ].join('\n');

    const summary = parseSummary(raw);
    expect(summary.authored).toBe('ai-assisted');
    expect(summary.authoredReason).toBe('clichéd opener, concrete deadline intact');
    expect(summary.reversedPrompt).toBe('Politely ask the team for the deck by Wednesday.');
    expect(summary.verdict).toBe('actionable');
    expect(summary.verdictReason).toBe('deadline-driven request');
    expect(summary.bullets).toEqual([
      'Send deck by EOD Wednesday',
      'Hold customer logos pending legal sign-off',
    ]);
  });

  it('handles all three authorship tokens', () => {
    const samples: Array<[string, string]> = [
      ['Authored: AI — formulaic opener, no specifics', 'ai'],
      ['Authored: AI-assisted — polished prose around a real deadline', 'ai-assisted'],
      ['Authored: human — typos, terse reply-on-top', 'human'],
    ];
    for (const [line, expected] of samples) {
      expect(parseSummary(line).authored).toBe(expected);
    }
  });

  it('parses a human-authored response with no Prompt line', () => {
    const raw = [
      'Authored: human — terse, typos, named internal context',
      'Verdict: ACTIONABLE — needs deck today',
      '',
      '- Send the deck before standup',
    ].join('\n');
    const summary = parseSummary(raw);
    expect(summary.authored).toBe('human');
    expect(summary.reversedPrompt).toBeUndefined();
    expect(summary.verdict).toBe('actionable');
    expect(summary.bullets).toEqual(['Send the deck before standup']);
  });

  it('treats placeholder Prompt lines as absent (n/a, empty, none)', () => {
    for (const placeholder of ['""', '"n/a"', '"none"']) {
      const raw = [
        'Authored: human — quick internal reply',
        `Prompt: ${placeholder}`,
        'Verdict: FYI — informational',
      ].join('\n');
      expect(parseSummary(raw).reversedPrompt).toBeUndefined();
    }
  });

  it('preserves non-English reasoning, prompt, verdict reason, and bullets', () => {
    const raw = [
      'Authored: AI — Phrase d\'ouverture clichée, superlatifs génériques',
      'Prompt: "Demande polie au client de confirmer le brief avant vendredi."',
      'Verdict: RESPONSE-NEEDED — attend confirmation avant vendredi',
      '',
      '- Confirmer le brief avant vendredi 16h',
      '- Retour attendu sur les trois options proposées',
    ].join('\n');
    const summary = parseSummary(raw);
    expect(summary.authored).toBe('ai');
    expect(summary.authoredReason).toBe("Phrase d'ouverture clichée, superlatifs génériques");
    expect(summary.reversedPrompt).toBe(
      'Demande polie au client de confirmer le brief avant vendredi.',
    );
    expect(summary.verdict).toBe('response-needed');
    expect(summary.verdictReason).toBe('attend confirmation avant vendredi');
    expect(summary.bullets).toEqual([
      'Confirmer le brief avant vendredi 16h',
      'Retour attendu sur les trois options proposées',
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

  it('retains red-flag bullets on scam NOISE (invoice fraud / BEC)', () => {
    const raw = [
      'Prompt: "Write an urgent overdue-invoice reminder with a fake forwarded approval."',
      'Verdict: NOISE — likely invoice fraud / BEC',
      '',
      '- Unknown sender on lookalike domain, not a known counterparty.',
      '- Fake forwarded "approval" from an address impersonating the recipient.',
      '- Urgency + late-fee threat paired with a payment redirect.',
      '- Date inconsistencies between claimed overdue period and accrual start.',
    ].join('\n');
    const summary = parseSummary(raw);
    expect(summary.verdict).toBe('noise');
    expect(summary.verdictReason).toBe('likely invoice fraud / BEC');
    expect(summary.bullets).toHaveLength(4);
    expect(summary.bullets[0]).toMatch(/lookalike domain/);
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

  it('strips meta-labels that LLMs sometimes add inside bullets', () => {
    const raw = [
      '- Bullet: Deadline is Friday',
      '- Point 1: Budget capped at $5k',
      '- Item - Legal sign-off needed',
      '- Note: Jane is out next week',
      '- This one is fine',
    ].join('\n');
    expect(parseBullets(raw)).toEqual([
      'Deadline is Friday',
      'Budget capped at $5k',
      'Legal sign-off needed',
      'Jane is out next week',
      'This one is fine',
    ]);
  });

  it('does not strip non-meta words that happen to start a bullet', () => {
    const raw = '- Labels on the logos are wrong';
    expect(parseBullets(raw)).toEqual(['Labels on the logos are wrong']);
  });

  it('still parses when prompt / verdict lines are missing', () => {
    const raw = '- Send deck by Friday\n- Hold logos';
    const summary = parseSummary(raw);
    expect(summary.reversedPrompt).toBeUndefined();
    expect(summary.verdict).toBeUndefined();
    expect(summary.bullets).toHaveLength(2);
  });
});
