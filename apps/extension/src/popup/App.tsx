import { toUserError, type Summary, type UserError } from '@defluff/core';
import { useEffect, useState } from 'react';
import { MSG_SUMMARIZE, type SummarizeResponse } from '../shared/messages.js';
import { getProviderConfig } from '../shared/storage.js';
import { ErrorCard } from './ErrorCard.js';
import { SummaryCard } from './SummaryCard.js';

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; summary: Summary }
  | { status: 'error'; error: UserError };

export function App() {
  const [text, setText] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  // null = still checking; false = no provider saved; true = ready.
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void getProviderConfig().then((config) => setConfigured(config !== null));
  }, []);

  const trimmed = text.trim();

  const openOptions = (): void => {
    void chrome.runtime.openOptionsPage();
  };

  const handleDefluff = async (): Promise<void> => {
    if (!trimmed) return;
    setState({ status: 'loading' });
    try {
      // Reuse the background worker's existing MSG_SUMMARIZE handler — the
      // same path the in-page content-script button uses. Provider-fetch
      // logic stays in one place (src/background.ts).
      const raw: unknown = await chrome.runtime.sendMessage({
        type: MSG_SUMMARIZE,
        text: trimmed,
      });
      // Defensive: sendMessage can resolve with undefined if the service
      // worker terminated mid-flight before calling sendResponse. Mirror the
      // content-script guard (src/content/ui/wireHost.ts).
      const response: SummarizeResponse =
        !raw || typeof raw !== 'object' || !('ok' in raw)
          ? { ok: false, error: 'No response from the extension. Try again.' }
          : (raw as SummarizeResponse);
      if (response.ok) {
        setState({ status: 'done', summary: response.summary });
      } else {
        setState({
          status: 'error',
          error: toUserError(response.code, response.error),
        });
      }
    } catch (err) {
      setState({
        status: 'error',
        error: toUserError(
          undefined,
          err instanceof Error ? err.message : 'Unknown error',
        ),
      });
    }
  };

  return (
    <main className="df-popup">
      <header>
        <h1>Defluff</h1>
        <button type="button" className="df-gear" onClick={openOptions}>
          Settings
        </button>
      </header>

      {configured === false && (
        <div className="df-setup">
          <p>
            No provider configured yet. Pick an LLM provider and paste your API
            key — it never leaves your browser.
          </p>
          <button type="button" onClick={openOptions}>
            Open settings
          </button>
        </div>
      )}

      {configured !== false && (
        <>
          <p className="df-hint">
            Paste any email or message. Defluff sends it to the provider you
            configured — no FinAegis server.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste text to de-fluff…"
            rows={8}
            spellCheck={false}
          />
          <div className="df-actions">
            <button
              type="button"
              onClick={() => void handleDefluff()}
              disabled={state.status === 'loading' || trimmed.length === 0}
            >
              {state.status === 'loading' ? 'Defluffing…' : 'Defluff'}
            </button>
            {state.status === 'done' && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setText('');
                  setState({ status: 'idle' });
                }}
              >
                Clear
              </button>
            )}
          </div>

          {state.status === 'done' && <SummaryCard summary={state.summary} />}
          {state.status === 'error' && (
            <ErrorCard error={state.error} onConfigure={openOptions} />
          )}
        </>
      )}
    </main>
  );
}
