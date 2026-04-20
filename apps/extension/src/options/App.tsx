import {
  buildProviderConfig,
  isProviderKind,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_KINDS,
  PROVIDER_LABELS,
  type ProviderKind,
} from '@defluff/core';
import { useEffect, useState } from 'react';
import { clearProviderConfig, getProviderConfig, setProviderConfig } from '../shared/storage.js';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export function App() {
  const [kind, setKind] = useState<ProviderKind>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('http://localhost:11434/v1');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const existing = await getProviderConfig();
      if (!existing) return;
      setKind(existing.kind);
      if ('apiKey' in existing) setApiKey(existing.apiKey ?? '');
      if ('model' in existing && existing.model) setModel(existing.model);
      if (existing.kind === 'openai-compatible') setBaseUrl(existing.baseUrl);
    })();
  }, []);

  const handleSave = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setStatus('saving');
    setError('');
    try {
      const config = buildProviderConfig({ kind, apiKey, model, baseUrl });
      await setProviderConfig(config);
      setStatus('saved');
      window.setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setStatus('error');
    }
  };

  const handleClear = async (): Promise<void> => {
    await clearProviderConfig();
    setApiKey('');
    setModel('');
    setStatus('idle');
  };

  const handleKindChange = (value: string): void => {
    if (isProviderKind(value)) setKind(value);
  };

  return (
    <main>
      <header>
        <h1>Defluff</h1>
        <p className="lede">
          Your emails never touch our servers. Pick a provider, paste your key,
          and every De-Fluff click goes straight from your browser to them.
        </p>
      </header>

      <form onSubmit={handleSave}>
        <label>
          Provider
          <select value={kind} onChange={(e) => handleKindChange(e.target.value)}>
            {PROVIDER_KINDS.map((k) => (
              <option key={k} value={k}>
                {PROVIDER_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        {kind === 'openai-compatible' && (
          <label>
            Base URL
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434/v1"
              required
            />
            <small>Ollama, LM Studio, or any OpenAI-compatible endpoint. No trailing <code>/chat/completions</code>.</small>
          </label>
        )}

        <label>
          API key {kind === 'openai-compatible' && <small>(optional for local Ollama)</small>}
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={kind === 'openai-compatible' ? 'leave blank for local' : 'paste your key'}
            autoComplete="off"
            required={kind !== 'openai-compatible'}
          />
        </label>

        <label>
          Model <small>(leave blank to use the default)</small>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={PROVIDER_DEFAULT_MODELS[kind]}
          />
        </label>

        <div className="actions">
          <button type="submit" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="secondary" onClick={handleClear}>
            Clear
          </button>
          {status === 'saved' && <span className="ok">Saved</span>}
          {status === 'error' && <span className="err">{error}</span>}
        </div>
      </form>

      <footer>
        <p>
          API keys are stored in <code>chrome.storage.sync</code> — encrypted at
          rest, never sent to FinAegis. Pick fast models: Claude Haiku, GPT-4o
          mini, or Gemini Flash work best for extraction.
        </p>
      </footer>
    </main>
  );
}
