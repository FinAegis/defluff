import { describe, expect, it } from 'vitest';
import { parseBullets } from './parse.js';

describe('parseBullets', () => {
  it('parses dash bullets', () => {
    const raw = '- First point\n- Second point\n- Third';
    expect(parseBullets(raw)).toEqual(['First point', 'Second point', 'Third']);
  });

  it('parses asterisk and unicode bullets', () => {
    expect(parseBullets('* alpha\n• beta\n· gamma')).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('parses numbered lists (dot and paren)', () => {
    expect(parseBullets('1. first\n2) second\n10. tenth')).toEqual(['first', 'second', 'tenth']);
  });

  it('drops preamble and trailing lines without markers', () => {
    const raw = [
      'Here are the key points:',
      '',
      '- Need a timeline by Friday',
      '- Budget cap is $5k',
      '',
      'Let me know if you need anything else.',
    ].join('\n');
    expect(parseBullets(raw)).toEqual(['Need a timeline by Friday', 'Budget cap is $5k']);
  });

  it('strips inline bold markup', () => {
    expect(parseBullets('- **Urgent**: send the deck\n- __blocker__ resolved')).toEqual([
      'Urgent: send the deck',
      'blocker resolved',
    ]);
  });

  it('returns empty array when no bullets present', () => {
    expect(parseBullets('This response has no bullets at all.')).toEqual([]);
  });
});
