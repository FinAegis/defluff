import { describe, expect, it } from 'vitest';
import { buildProviderConfig, isHostsConfig, isProviderConfig, isProviderKind } from './config.js';

describe('isProviderKind', () => {
  it('accepts known kinds', () => {
    expect(isProviderKind('anthropic')).toBe(true);
    expect(isProviderKind('openai')).toBe(true);
    expect(isProviderKind('gemini')).toBe(true);
    expect(isProviderKind('openai-compatible')).toBe(true);
  });

  it('rejects unknown strings and non-strings', () => {
    expect(isProviderKind('grok')).toBe(false);
    expect(isProviderKind(null)).toBe(false);
    expect(isProviderKind(undefined)).toBe(false);
    expect(isProviderKind({ kind: 'anthropic' })).toBe(false);
  });
});

describe('isProviderConfig', () => {
  it('accepts objects with a valid kind', () => {
    expect(isProviderConfig({ kind: 'anthropic', apiKey: 'sk' })).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isProviderConfig(null)).toBe(false);
    expect(isProviderConfig({})).toBe(false);
    expect(isProviderConfig({ kind: 'invalid' })).toBe(false);
    expect(isProviderConfig('anthropic')).toBe(false);
  });
});

describe('buildProviderConfig', () => {
  it('builds anthropic config with default model when model is blank', () => {
    const config = buildProviderConfig({
      kind: 'anthropic',
      apiKey: '  sk-test  ',
      model: '',
      baseUrl: '',
    });
    expect(config).toEqual({ kind: 'anthropic', apiKey: 'sk-test' });
  });

  it('builds openai config with explicit model override', () => {
    const config = buildProviderConfig({
      kind: 'openai',
      apiKey: 'sk',
      model: 'gpt-4o',
      baseUrl: '',
    });
    expect(config).toEqual({ kind: 'openai', apiKey: 'sk', model: 'gpt-4o' });
  });

  it('throws when API key is missing for key-required providers', () => {
    expect(() =>
      buildProviderConfig({ kind: 'anthropic', apiKey: '', model: '', baseUrl: '' }),
    ).toThrow(/API key/);
  });

  it('builds openai-compatible with no api key (local ollama)', () => {
    const config = buildProviderConfig({
      kind: 'openai-compatible',
      apiKey: '',
      model: 'llama3',
      baseUrl: 'http://localhost:11434/v1',
    });
    expect(config).toEqual({
      kind: 'openai-compatible',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    });
  });

  it('falls back to default model for openai-compatible when blank', () => {
    const config = buildProviderConfig({
      kind: 'openai-compatible',
      apiKey: '',
      model: '',
      baseUrl: 'http://localhost:11434/v1',
    });
    expect(config).toMatchObject({ kind: 'openai-compatible', model: 'llama3' });
  });

  it('throws when base URL is missing for openai-compatible', () => {
    expect(() =>
      buildProviderConfig({
        kind: 'openai-compatible',
        apiKey: '',
        model: 'llama3',
        baseUrl: '',
      }),
    ).toThrow(/base URL/i);
  });
});

describe('isHostsConfig', () => {
  it('accepts objects with all three boolean fields', () => {
    expect(isHostsConfig({ gmail: true, outlook: true, linkedin: false })).toBe(true);
    expect(isHostsConfig({ gmail: false, outlook: false, linkedin: true })).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isHostsConfig({ gmail: true, outlook: true })).toBe(false);
    expect(isHostsConfig({ gmail: true, outlook: true, linkedin: 'yes' })).toBe(false);
    expect(isHostsConfig({})).toBe(false);
    expect(isHostsConfig(null)).toBe(false);
  });
});
