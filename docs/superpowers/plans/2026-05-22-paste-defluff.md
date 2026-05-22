# Paste-and-Defluff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users defluff arbitrary pasted text — via a toolbar popup in the extension and a standalone web playground — without adding any backend.

**Architecture:** Two thin UI surfaces over the existing `packages/core` `summarize()` engine. The extension popup reuses the existing `MSG_SUMMARIZE` background message verbatim (zero core or message-protocol changes). The web playground is a new page in the existing `apps/outlook-addin` Vite build, calling `summarize()` provider-direct from the browser and storing the user's key in `localStorage`. The landing page embeds the playground in an iframe.

**Tech Stack:** TypeScript (strict), React 19 (extension popup, matching `src/options/`), plain TS + DOM (playground, matching `src/taskpane/`), Vite, pnpm workspaces.

**Testing approach:** The extension and Outlook add-in have **no unit-test harness** — their `lint` and `typecheck` scripts are both `tsc --noEmit`, and `packages/core` (untouched here) owns the vitest suite. This plan does not introduce a test framework (that would be an unrequested restructure). Verification for each task is: `tsc --noEmit` passes, `vite build` succeeds, and a scripted manual smoke test. Every verification step below gives the exact command and expected result.

**Delivery:** Two PRs. Part 1 (extension popup) is committed on the current branch `feat/paste-defluff`. Part 2 (playground) is a separate branch off `main` after Part 1 merges. Run the `post-phase-review` skill before opening each PR (per global instruction).

---

## File Structure

### Part 1 — Extension popup (`apps/extension/`)

| File | Responsibility |
|---|---|
| `src/popup/index.html` (create) | Popup entry HTML — a `#root` div + module script. |
| `src/popup/main.tsx` (create) | React bootstrap — mounts `<App>` into `#root`. |
| `src/popup/App.tsx` (create) | Popup container — textarea state, request dispatch, config check, layout. |
| `src/popup/SummaryCard.tsx` (create) | Renders one `Summary` (authored badge, verdict, bullets). |
| `src/popup/ErrorCard.tsx` (create) | Renders one `UserError` (title, explanation, details, configure CTA). |
| `src/popup/styles.css` (create) | Popup styling — extension-native, 380px wide. |
| `manifest.config.ts` (modify) | Add `default_popup` to the toolbar `action`. |
| `src/background.ts` (modify) | Remove the now-dead `chrome.action.onClicked` listener. |

### Part 2 — Web playground (`apps/outlook-addin/`)

| File | Responsibility |
|---|---|
| `playground/index.html` (create) | Playground page — provider/key form + paste textarea + result containers. |
| `src/playground/main.ts` (create) | Playground logic — config save, summarize call, render. |
| `src/playground/storage.ts` (create) | `localStorage`-backed provider-config read/write. |
| `src/playground/styles.css` (create) | Playground styling — landing-page palette. |
| `vite.config.ts` (modify) | Add `playground` to `rollupOptions.input`. |
| `public/index.html` (modify) | Add a "Try it" section (iframe embed) + nav link + renumber section overlines. |

---

# Part 1 — Extension popup paste box

## Task 1: Build the popup UI surface

**Files:**
- Create: `apps/extension/src/popup/index.html`
- Create: `apps/extension/src/popup/styles.css`
- Create: `apps/extension/src/popup/SummaryCard.tsx`
- Create: `apps/extension/src/popup/ErrorCard.tsx`
- Create: `apps/extension/src/popup/App.tsx`
- Create: `apps/extension/src/popup/main.tsx`

- [ ] **Step 1: Create `apps/extension/src/popup/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Defluff</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `apps/extension/src/popup/styles.css`**

```css
:root {
  --bg: #ffffff;
  --fg: #202124;
  --muted: #5f6368;
  --border: #dadce0;
  --accent: #1a73e8;
  --accent-hover: #1558b0;
  --ok: #188038;
  --err: #d93025;
  --panel-bg: #fafbfc;
  --code-bg: #f1f3f4;
  --verdict-actionable: #d93025;
  --verdict-response: var(--accent);
  --verdict-fyi: var(--muted);
  --verdict-noise: #80868b;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #202124;
    --fg: #e8eaed;
    --muted: #9aa0a6;
    --border: #3c4043;
    --accent: #8ab4f8;
    --accent-hover: #aecbfa;
    --ok: #81c995;
    --err: #f28b82;
    --panel-bg: #292a2d;
    --code-bg: #2a2d31;
    --verdict-actionable: #f28b82;
    --verdict-noise: #6b6e73;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

.df-popup { width: 380px; padding: 14px 16px 18px; }

.df-popup header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.df-popup h1 { font-size: 16px; font-weight: 600; margin: 0; }

.df-gear {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.df-gear:hover { text-decoration: underline; }

.df-hint { color: var(--muted); font-size: 12px; margin: 6px 0 12px; }

textarea {
  width: 100%;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font: inherit;
  background: var(--bg);
  color: var(--fg);
}
textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
  border-color: var(--accent);
}

.df-actions { display: flex; gap: 8px; margin-top: 10px; }

button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
button:hover { background: var(--accent-hover); }
button:disabled { opacity: 0.6; cursor: not-allowed; }
button.secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
}
button.secondary:hover { background: var(--panel-bg); }

.df-setup {
  margin-top: 12px;
  padding: 14px 16px;
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
}
.df-setup p { margin: 0 0 10px; color: var(--muted); font-size: 13px; }

.df-card {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--panel-bg);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
}
.df-card[data-verdict="noise"] .df-bullets { opacity: 0.65; }
.df-empty { margin: 0; color: var(--muted); font-size: 13px; }

.df-authored {
  margin: 0 0 10px;
  padding: 8px 10px;
  background: var(--bg);
  border-left: 2px solid var(--accent);
  border-radius: 4px;
}
.df-authored[data-authored="human"] {
  background: transparent;
  border-left-color: transparent;
  padding: 0 0 4px;
}
.df-authored-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}
.df-prompt-text { margin: 4px 0 0; font-style: italic; font-size: 13px; }
.df-authored-reason { margin: 4px 0 0; font-size: 13px; color: var(--muted); }

.df-verdict {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  margin: 0 0 8px;
  font-size: 13px;
}
.df-verdict[data-verdict="actionable"] { color: var(--verdict-actionable); }
.df-verdict[data-verdict="response-needed"] { color: var(--verdict-response); }
.df-verdict[data-verdict="fyi"] { color: var(--verdict-fyi); }
.df-verdict[data-verdict="noise"] { color: var(--verdict-noise); }
.df-verdict-label {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
}
.df-verdict-reason { color: var(--fg); font-style: italic; }

.df-bullets { margin: 0; padding-left: 20px; }
.df-bullets li { margin-bottom: 4px; }

.df-error {
  margin-top: 14px;
  padding: 12px 14px;
  background: var(--code-bg);
  border-left: 3px solid var(--err);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.df-error strong { color: var(--err); }
.df-error p { margin: 0; }
.df-error-details summary { cursor: pointer; color: var(--muted); font-size: 12px; }
.df-error-details pre {
  margin: 6px 0 0;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow: auto;
}
.df-error button { align-self: flex-start; }
```

- [ ] **Step 3: Create `apps/extension/src/popup/SummaryCard.tsx`**

```tsx
import {
  AUTHORED_ICONS,
  AUTHORED_LABELS,
  AUTHORED_PROMPT_LABELS,
  formatReversedPrompt,
  VERDICT_ICONS,
  VERDICT_LABELS,
  type Summary,
} from '@defluff/core';

/**
 * Render one Summary: authorship badge -> reversed prompt -> verdict row ->
 * specifics. React mirror of the content-script panel (src/content/ui/
 * panel.ts). All model text is placed as JSX children (never innerHTML), so a
 * hostile email body cannot inject markup.
 */
export function SummaryCard({ summary }: { summary: Summary }) {
  const { authored, authoredReason, reversedPrompt, verdict, verdictReason, bullets } =
    summary;

  const hasContent =
    !!authored || !!reversedPrompt || !!verdict || bullets.length > 0;
  if (!hasContent) {
    return (
      <div className="df-card">
        <p className="df-empty">
          The model didn&apos;t return a usable summary. Try again or switch
          models.
        </p>
      </div>
    );
  }

  return (
    <div className="df-card" data-verdict={verdict ?? ''}>
      {/* Legacy fallback: model omitted the Authored line but returned a prompt. */}
      {!authored && reversedPrompt && (
        <section className="df-authored">
          <p className="df-authored-label">
            <span aria-hidden="true">💭</span> They probably asked an AI
          </p>
          <p className="df-prompt-text">{formatReversedPrompt(reversedPrompt)}</p>
        </section>
      )}

      {authored && (
        <section className="df-authored" data-authored={authored}>
          <p className="df-authored-label">
            <span aria-hidden="true">{AUTHORED_ICONS[authored]}</span>{' '}
            {authored === 'human'
              ? AUTHORED_LABELS.human
              : AUTHORED_PROMPT_LABELS[authored]}
          </p>
          {authored === 'human'
            ? authoredReason && (
                <p className="df-authored-reason">{authoredReason}</p>
              )
            : reversedPrompt && (
                <p className="df-prompt-text">
                  {formatReversedPrompt(reversedPrompt)}
                </p>
              )}
        </section>
      )}

      {verdict && (
        <div className="df-verdict" data-verdict={verdict}>
          <span aria-hidden="true">{VERDICT_ICONS[verdict]}</span>{' '}
          <span className="df-verdict-label">{VERDICT_LABELS[verdict]}</span>
          {verdictReason && (
            <span className="df-verdict-reason">{verdictReason}</span>
          )}
        </div>
      )}

      {bullets.length > 0 && (
        <ul className="df-bullets">
          {bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `apps/extension/src/popup/ErrorCard.tsx`**

```tsx
import type { UserError } from '@defluff/core';

/**
 * Render a UserError produced by core's toUserError(). The "configure" action
 * surfaces an "Open settings" button wired to onConfigure.
 */
export function ErrorCard({
  error,
  onConfigure,
}: {
  error: UserError;
  onConfigure: () => void;
}) {
  return (
    <div className="df-error">
      <strong>{error.title}</strong>
      {error.explanation && <p>{error.explanation}</p>}
      {error.details && (
        <details className="df-error-details">
          <summary>Provider response</summary>
          <pre>{error.details}</pre>
        </details>
      )}
      {error.action === 'configure' && (
        <button type="button" className="secondary" onClick={onConfigure}>
          Open settings
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create `apps/extension/src/popup/App.tsx`**

```tsx
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

  const openOptions = (): void => {
    void chrome.runtime.openOptionsPage();
  };

  const handleDefluff = async (): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setState({ status: 'loading' });
    try {
      // Reuse the background worker's existing MSG_SUMMARIZE handler — the
      // same path the in-page content-script button uses. Provider-fetch
      // logic stays in one place (src/background.ts).
      const response = (await chrome.runtime.sendMessage({
        type: MSG_SUMMARIZE,
        text: trimmed,
      })) as SummarizeResponse;
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
              disabled={state.status === 'loading' || text.trim().length === 0}
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
```

- [ ] **Step 6: Create `apps/extension/src/popup/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element missing');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Typecheck the new files**

Run: `pnpm --filter @defluff/extension typecheck`
Expected: exits 0, no output. (The popup `.tsx` files are under `src/**/*`, so `tsc` compiles them even before the manifest references the HTML.)

If it fails, fix the reported type error before continuing.

- [ ] **Step 8: Commit**

```bash
git add apps/extension/src/popup/
git commit -m "feat(extension): add paste-and-Defluff popup UI

Popup React surface (textarea + result card) mirroring src/options/.
Not yet wired into the manifest — Task 2 claims the toolbar action.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Task 2: Wire the popup into the extension

**Files:**
- Modify: `apps/extension/manifest.config.ts`
- Modify: `apps/extension/src/background.ts`

- [ ] **Step 1: Add `default_popup` to the toolbar action**

In `apps/extension/manifest.config.ts`, replace this block:

```ts
  action: {
    default_title: 'Defluff',
    default_icon: ICONS,
  },
```

with:

```ts
  action: {
    default_title: 'Defluff',
    default_icon: ICONS,
    // Clicking the toolbar icon opens the paste-and-Defluff popup. The popup
    // links to the options page for provider/host settings.
    default_popup: 'src/popup/index.html',
  },
```

- [ ] **Step 2: Remove the dead `onClicked` listener from `background.ts`**

In `apps/extension/src/background.ts`, replace this block:

```ts
// Toolbar icon click opens the options page. With no default_popup set, this
// listener fires on every click. The options UI is the "settings" surface —
// summarization itself lives on the inline De-Fluff button injected into Gmail
// and Outlook Web, not the toolbar action.
chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
```

with:

```ts
// The toolbar icon opens the paste-and-Defluff popup (action.default_popup in
// manifest.config.ts). Chrome does not fire chrome.action.onClicked when a
// popup is set, so there is no onClicked handler.
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @defluff/extension typecheck`
Expected: exits 0, no output.

- [ ] **Step 4: Build the extension**

Run: `pnpm --filter @defluff/extension build`
Expected: build succeeds. Confirm the popup is in the output:

Run: `ls apps/extension/dist/src/popup/`
Expected: an `index.html` (and hashed assets) exist. The crxjs plugin discovers `src/popup/index.html` because the manifest now references it.

- [ ] **Step 5: Manual smoke test**

1. Open `chrome://extensions`, enable Developer mode, **Load unpacked** → select `apps/extension/dist`.
2. Click the Defluff toolbar icon.
   - If no provider is configured: the popup shows the "No provider configured yet" setup block with an **Open settings** button. Click it → the options page opens. Configure a provider + key, save.
   - Click the toolbar icon again: the popup now shows the textarea + **Defluff** button.
3. Paste a padded email into the textarea, click **Defluff**.
   - Expected: button reads "Defluffing…", then a result card appears with an authorship badge, a verdict row, and bullets.
4. Click **Clear** → textarea empties, card disappears.
5. Error path: open options, set an obviously invalid API key, save. In the popup, paste text and Defluff.
   - Expected: an error card with a title (e.g. "Your API key isn't working") and, for auth/config errors, an **Open settings** button.

Record the result of each numbered check. All must pass.

- [ ] **Step 6: Commit**

```bash
git add apps/extension/manifest.config.ts apps/extension/src/background.ts
git commit -m "feat(extension): open the paste popup from the toolbar icon

Adds action.default_popup and removes the now-dead chrome.action.onClicked
listener (Chrome does not fire it when a popup is set).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Task 3: Open PR 1

- [ ] **Step 1: Run the post-phase-review skill**

Invoke the `post-phase-review` skill against the `feat/paste-defluff` branch. Fix any critical/important issues it raises before opening the PR.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin feat/paste-defluff
gh pr create --title "feat(extension): paste-and-Defluff toolbar popup" \
  --body "$(cat <<'EOF'
## Summary
Adds a toolbar popup so users can defluff any pasted text — not just emails open in Gmail/Outlook. Also includes the brainstorming spec and this implementation plan.

- New React popup (`src/popup/`) reusing the existing `MSG_SUMMARIZE` background path — zero core or message-protocol changes.
- Toolbar icon now opens the popup (`action.default_popup`); the dead `chrome.action.onClicked` listener is removed.
- BYOK, no server — consistent with the zero-retention architecture.

Part 1 of 2. Part 2 (web playground) follows in a separate PR. Spec: `docs/superpowers/specs/2026-05-22-paste-defluff-design.md`.

## Test plan
- `pnpm --filter @defluff/extension typecheck` / `build` pass.
- Manual: load unpacked, click toolbar icon, paste an email, Defluff → result card; unconfigured → setup prompt; bad key → error card.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Merge once approved**

After review approval, merge the PR.

---

# Part 2 — Web playground

> Start Part 2 only after Part 1 has merged. First: `git checkout main && git pull && git checkout -b feat/paste-defluff-playground`.

## Task 4: Build the playground page

**Files:**
- Create: `apps/outlook-addin/src/playground/storage.ts`
- Create: `apps/outlook-addin/src/playground/styles.css`
- Create: `apps/outlook-addin/src/playground/main.ts`
- Create: `apps/outlook-addin/playground/index.html`

- [ ] **Step 1: Create `apps/outlook-addin/src/playground/storage.ts`**

```ts
import { isProviderConfig, type ProviderConfig } from '@defluff/core';

// The playground is a plain web page — no Office.js, no chrome.storage. The
// user's provider config (including their API key) lives only in this
// browser's localStorage and is sent only to the provider they pick.
const STORAGE_KEY = 'defluff.playground.provider';

/** Read the saved provider config. Returns null if unset or malformed. */
export function getProviderConfig(): ProviderConfig | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProviderConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function setProviderConfig(config: ProviderConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function clearProviderConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 2: Create `apps/outlook-addin/src/playground/styles.css`**

```css
:root {
  --bg: #ffffff;
  --fg: #202124;
  --muted: #5f6368;
  --border: #dadce0;
  --accent: #1a73e8;
  --accent-hover: #1558b0;
  --ok: #188038;
  --err: #d93025;
  --panel: #f8faff;
  --err-bg: #fce8e6;
  --code-bg: #f1f3f4;
  --verdict-actionable: #d93025;
  --verdict-response: var(--accent);
  --verdict-fyi: var(--muted);
  --verdict-noise: #80868b;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #202124;
    --fg: #e8eaed;
    --muted: #9aa0a6;
    --border: #3c4043;
    --accent: #8ab4f8;
    --accent-hover: #aecbfa;
    --ok: #81c995;
    --err: #f28b82;
    --panel: #2a2d31;
    --err-bg: #3a1e21;
    --code-bg: #2a2d31;
    --verdict-actionable: #f28b82;
    --verdict-noise: #6b6e73;
  }
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}

main { max-width: 640px; margin: 0 auto; padding: 32px 24px 56px; }

header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 600; }
.lede { color: var(--muted); margin: 0 0 24px; }

section { display: flex; flex-direction: column; gap: 14px; }

.trust {
  margin: 0;
  padding: 12px 14px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--muted);
}
.trust a { color: var(--accent); }

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
}
label small { font-weight: 400; color: var(--muted); }

input, select, textarea {
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font: inherit;
  background: var(--bg);
  color: var(--fg);
}
textarea { resize: vertical; }
input:focus, select:focus, textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: -1px;
  border-color: var(--accent);
}

.actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

button {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: #fff;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}
button:hover { background: var(--accent-hover); }
button:disabled { opacity: 0.6; cursor: not-allowed; }
button.secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
}
button.secondary:hover { background: var(--panel); }
button.primary { width: 100%; padding: 12px; font-size: 15px; }
button.link {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
button.link:hover { text-decoration: underline; }

.status-msg { font-weight: 500; font-size: 13px; }
.status-msg.ok { color: var(--ok); }
.status-msg.err { color: var(--err); }

.result {
  padding: 14px 16px;
  background: var(--panel);
  border-left: 3px solid var(--accent);
  border-radius: 4px;
}
.result[data-verdict="noise"] ul { opacity: 0.65; }

.prompt-block {
  margin: 0 0 12px;
  padding: 10px 12px;
  background: var(--bg);
  border-left: 2px solid var(--accent);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.prompt-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 4px;
}
.prompt-text { margin: 0; font-style: italic; font-size: 13px; color: var(--fg); }
.prompt-block[data-authored="human"] {
  background: transparent;
  border-left-color: transparent;
  padding: 0 0 4px;
}
.prompt-block[data-authored="human"] .prompt-text {
  font-style: normal;
  color: var(--muted);
}

.verdict {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 0 0 10px;
  font-size: 13px;
  flex-wrap: wrap;
}
.verdict[data-verdict="actionable"] { color: var(--verdict-actionable); }
.verdict[data-verdict="response-needed"] { color: var(--verdict-response); }
.verdict[data-verdict="fyi"] { color: var(--verdict-fyi); }
.verdict[data-verdict="noise"] { color: var(--verdict-noise); }
.verdict-label {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
}
.verdict-reason { color: var(--fg); font-style: italic; font-weight: 400; }

.section-label {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}
.result ul { margin: 0; padding-left: 20px; }
.result li { margin-bottom: 4px; }

.error {
  padding: 14px 16px;
  background: var(--err-bg);
  border-left: 3px solid var(--err);
  color: var(--fg);
  font-size: 13px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.error strong { color: var(--err); font-size: 14px; }
.error p { margin: 0; }
.error button { align-self: flex-start; margin-top: 4px; }

.error-details { font-size: 12px; }
.error-details summary { cursor: pointer; color: var(--muted); }
.error-details-body {
  margin: 6px 0 0;
  padding: 8px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
}

.settings-link { margin: 4px 0 0; font-size: 13px; color: var(--muted); }
```

- [ ] **Step 3: Create `apps/outlook-addin/src/playground/main.ts`**

```ts
import {
  AUTHORED_ICONS,
  AUTHORED_LABELS,
  AUTHORED_PROMPT_LABELS,
  buildProviderConfig,
  DefluffError,
  formatReversedPrompt,
  isProviderKind,
  PROVIDER_DEFAULT_MODELS,
  summarize,
  toUserError,
  VERDICT_ICONS,
  VERDICT_LABELS,
  type ProviderConfig,
  type ProviderKind,
  type Summary,
} from '@defluff/core';
import './styles.css';
import {
  clearProviderConfig,
  getProviderConfig,
  setProviderConfig,
} from './storage.js';

wireUi();
syncModelPlaceholder();
if (getProviderConfig()) {
  showWork();
} else {
  showConfig();
}

function wireUi(): void {
  byId<HTMLSelectElement>('kind').addEventListener('change', syncModelPlaceholder);
  byId<HTMLButtonElement>('save').addEventListener('click', () => void handleSave());
  byId<HTMLButtonElement>('clear').addEventListener('click', () => handleClear());
  byId<HTMLButtonElement>('run').addEventListener('click', () => void handleRun());
  byId<HTMLButtonElement>('edit-config').addEventListener('click', () => {
    showConfig(getProviderConfig());
  });
}

function showConfig(existing: ProviderConfig | null = getProviderConfig()): void {
  byId('status').textContent = existing
    ? 'Update your provider or key below.'
    : 'Pick a provider and paste your own API key to begin.';
  byId('config').hidden = false;
  byId('work').hidden = true;

  if (existing) {
    byId<HTMLSelectElement>('kind').value = existing.kind;
    if ('apiKey' in existing) byId<HTMLInputElement>('apikey').value = existing.apiKey ?? '';
    if ('model' in existing && existing.model) {
      byId<HTMLInputElement>('model').value = existing.model;
    }
  }
  syncModelPlaceholder();
}

function showWork(): void {
  byId('status').textContent = 'Paste an email below and click Defluff.';
  byId('config').hidden = true;
  byId('work').hidden = false;
  byId('result').hidden = true;
  byId('error').hidden = true;
}

function syncModelPlaceholder(): void {
  byId<HTMLInputElement>('model').placeholder = PROVIDER_DEFAULT_MODELS[readKind()];
}

async function handleSave(): Promise<void> {
  try {
    const config = buildProviderConfig({
      kind: readKind(),
      apiKey: byId<HTMLInputElement>('apikey').value,
      model: byId<HTMLInputElement>('model').value,
      baseUrl: '',
    });
    setProviderConfig(config);
    setSaveStatus('Saved', 'ok');
    window.setTimeout(() => showWork(), 600);
  } catch (err) {
    setSaveStatus(err instanceof Error ? err.message : 'Failed to save', 'err');
  }
}

function handleClear(): void {
  clearProviderConfig();
  byId<HTMLInputElement>('apikey').value = '';
  byId<HTMLInputElement>('model').value = '';
  setSaveStatus('Cleared', 'ok');
}

async function handleRun(): Promise<void> {
  const config = getProviderConfig();
  if (!config) {
    showConfig(null);
    return;
  }

  const runButton = byId<HTMLButtonElement>('run');
  runButton.disabled = true;
  runButton.textContent = 'Extracting…';
  byId('result').hidden = true;
  byId('error').hidden = true;

  try {
    const text = byId<HTMLTextAreaElement>('input').value.trim();
    if (!text) throw new DefluffError('bad_request', 'Paste some text first.');
    const summary = await summarize({ text, provider: config });
    renderSummary(summary);
  } catch (err) {
    renderError(err);
  } finally {
    runButton.disabled = false;
    runButton.textContent = 'Defluff';
  }
}

function renderSummary(summary: Summary): void {
  const result = byId('result');
  result.dataset.verdict = summary.verdict ?? '';

  const promptBlock = byId('prompt-block');
  const promptIcon = byId<HTMLElement>('prompt-icon');
  const promptLabel = byId<HTMLElement>('prompt-label-text');
  const promptText = byId<HTMLElement>('prompt-text');
  const authored = summary.authored;
  if (authored) {
    promptBlock.dataset.authored = authored;
    promptIcon.textContent = AUTHORED_ICONS[authored];
    promptLabel.textContent =
      authored === 'human' ? AUTHORED_LABELS.human : AUTHORED_PROMPT_LABELS[authored];
    if (authored === 'human') {
      promptText.textContent = summary.authoredReason ?? '';
      promptText.hidden = !summary.authoredReason;
    } else {
      promptText.textContent = summary.reversedPrompt
        ? formatReversedPrompt(summary.reversedPrompt)
        : '';
      promptText.hidden = !summary.reversedPrompt;
    }
    promptBlock.hidden = false;
  } else if (summary.reversedPrompt) {
    // Legacy fallback: older models may omit Authored.
    delete promptBlock.dataset.authored;
    promptIcon.textContent = '💭';
    promptLabel.textContent = 'They probably asked an AI';
    promptText.textContent = formatReversedPrompt(summary.reversedPrompt);
    promptText.hidden = false;
    promptBlock.hidden = false;
  } else {
    promptBlock.hidden = true;
  }

  const verdictRow = byId('verdict-row');
  if (summary.verdict) {
    verdictRow.dataset.verdict = summary.verdict;
    byId<HTMLElement>('verdict-icon').textContent = VERDICT_ICONS[summary.verdict];
    byId<HTMLElement>('verdict-label').textContent = VERDICT_LABELS[summary.verdict];
    byId<HTMLElement>('verdict-reason').textContent = summary.verdictReason ?? '';
    verdictRow.hidden = false;
  } else {
    verdictRow.hidden = true;
  }

  const list = byId<HTMLUListElement>('bullets');
  list.replaceChildren();
  const bulletsLabel = byId('bullets-label');
  if (summary.bullets.length > 0) {
    for (const bullet of summary.bullets) {
      const li = document.createElement('li');
      li.textContent = bullet;
      list.appendChild(li);
    }
    list.hidden = false;
    bulletsLabel.hidden = false;
  } else {
    list.hidden = true;
    bulletsLabel.hidden = true;
  }

  result.hidden = false;
}

function renderError(err: unknown): void {
  const userError =
    err instanceof DefluffError
      ? toUserError(err.code, err.message)
      : toUserError(undefined, err instanceof Error ? err.message : 'Unknown error');

  const pane = byId('error');
  pane.replaceChildren();

  const heading = document.createElement('strong');
  heading.textContent = userError.title;
  pane.appendChild(heading);

  if (userError.explanation) {
    const p = document.createElement('p');
    p.textContent = userError.explanation;
    pane.appendChild(p);
  }

  if (userError.details) {
    const disclosure = document.createElement('details');
    disclosure.className = 'error-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Provider response';
    disclosure.appendChild(summary);
    const body = document.createElement('pre');
    body.className = 'error-details-body';
    body.textContent = userError.details;
    disclosure.appendChild(body);
    pane.appendChild(disclosure);
  }

  if (userError.action === 'configure') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary';
    btn.textContent = 'Change provider';
    btn.addEventListener('click', () => showConfig(getProviderConfig()));
    pane.appendChild(btn);
  }

  pane.hidden = false;
}

function readKind(): ProviderKind {
  const value = byId<HTMLSelectElement>('kind').value;
  return isProviderKind(value) ? value : 'anthropic';
}

function setSaveStatus(text: string, variant: 'ok' | 'err'): void {
  const el = byId('save-status');
  el.textContent = text;
  el.className = `status-msg ${variant}`;
  window.setTimeout(() => {
    el.textContent = '';
    el.className = 'status-msg';
  }, 2000);
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el as T;
}
```

- [ ] **Step 4: Create `apps/outlook-addin/playground/index.html`**

Note the path: this file sits in a new `playground/` directory at the **app root** (`apps/outlook-addin/playground/`), not under `src/`. That makes the built URL `/defluff/playground/`. The module script uses a root-absolute path so Vite resolves it with the configured `base`.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Defluff Playground — paste an email, get the point</title>
    <meta
      name="description"
      content="Try Defluff in your browser. Paste any email, bring your own API key — nothing is sent to a FinAegis server."
    />
  </head>
  <body>
    <main>
      <header>
        <h1>Defluff Playground</h1>
        <p class="lede" id="status">Loading…</p>
      </header>

      <section id="config" hidden>
        <h2>Bring your own key</h2>
        <p class="trust">
          Your key and the text you paste stay in this browser. They go straight
          to the provider you pick — never to a FinAegis server. Open your
          browser's DevTools → Network tab and watch: the only request is to your
          provider.
          <a href="https://github.com/FinAegis/defluff" target="_blank" rel="noopener">Read the source.</a>
        </p>

        <label>
          Provider
          <select id="kind">
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </label>

        <label>
          API key
          <input id="apikey" type="password" autocomplete="off" placeholder="paste your key" />
        </label>

        <label>
          Model <small>(optional — leave blank for the provider default)</small>
          <input id="model" type="text" placeholder="default model for the provider" />
        </label>

        <div class="actions">
          <button id="save" type="button">Save key</button>
          <button id="clear" type="button" class="secondary">Clear</button>
          <span id="save-status" class="status-msg"></span>
        </div>
      </section>

      <section id="work" hidden>
        <label>
          Paste an email
          <textarea
            id="input"
            rows="12"
            spellcheck="false"
            placeholder="Paste the email body here…"
          ></textarea>
        </label>
        <button id="run" type="button" class="primary">Defluff</button>
        <div id="result" class="result" hidden>
          <section id="prompt-block" class="prompt-block" hidden>
            <p class="prompt-label">
              <span aria-hidden="true" id="prompt-icon">💭</span>
              <span id="prompt-label-text">Authorship</span>
            </p>
            <p class="prompt-text" id="prompt-text"></p>
          </section>
          <div id="verdict-row" class="verdict" hidden>
            <span class="verdict-icon" id="verdict-icon" aria-hidden="true"></span>
            <span class="verdict-label" id="verdict-label"></span>
            <span class="verdict-reason" id="verdict-reason"></span>
          </div>
          <p class="section-label" id="bullets-label" hidden>Specifics</p>
          <ul id="bullets"></ul>
        </div>
        <div id="error" class="error" hidden></div>
        <p class="settings-link">
          <button id="edit-config" type="button" class="link">Change provider or key…</button>
        </p>
      </section>
    </main>
    <script type="module" src="/src/playground/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @defluff/outlook-addin typecheck`
Expected: exits 0, no output. (`src/playground/*.ts` is covered by the addin tsconfig `include`.)

- [ ] **Step 6: Commit**

```bash
git add apps/outlook-addin/src/playground/ apps/outlook-addin/playground/
git commit -m "feat(playground): add BYOK web playground page

Standalone paste-and-Defluff page (plain TS, mirrors the Outlook task
pane). Provider config + API key in localStorage; summarize() runs
provider-direct from the browser. Not yet wired into the Vite build.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Task 5: Wire the playground into the build

**Files:**
- Modify: `apps/outlook-addin/vite.config.ts`

- [ ] **Step 1: Add the playground entry**

In `apps/outlook-addin/vite.config.ts`, replace this block:

```ts
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, 'src/taskpane/index.html'),
        commands: resolve(__dirname, 'src/commands/commands.html'),
      },
    },
```

with:

```ts
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, 'src/taskpane/index.html'),
        commands: resolve(__dirname, 'src/commands/commands.html'),
        playground: resolve(__dirname, 'playground/index.html'),
      },
    },
```

- [ ] **Step 2: Build**

Run: `pnpm --filter @defluff/outlook-addin build`
Expected: build succeeds.

Run: `ls apps/outlook-addin/dist/playground/`
Expected: an `index.html` exists — the page will be served at `/defluff/playground/`.

- [ ] **Step 3: Manual smoke test**

1. Run `pnpm --filter @defluff/outlook-addin dev`.
2. Open `https://localhost:3000/playground/` (accept the self-signed cert warning).
   - Expected: the config screen — provider select, API key field, model field.
3. Pick a provider, paste a real API key for it, click **Save key**.
   - Expected: "Saved", then the screen switches to the paste textarea.
4. Paste a padded email, click **Defluff**.
   - Expected: button reads "Extracting…", then a result block with authorship, verdict, and bullets.
   - **CORS check:** open DevTools → Network and confirm the only outbound request is to the provider's API host (e.g. `api.anthropic.com`). If a provider's request is blocked by CORS, note it — per `CLAUDE.md` the documented fallback is the user-deployed `packages/proxy` worker; record which provider/origin failed.
5. Click **Change provider or key…** → returns to the config screen with current values prefilled.
6. Error path: save an invalid key, Defluff → an error block with a title and a **Change provider** button.

Record the result of each numbered check.

- [ ] **Step 4: Commit**

```bash
git add apps/outlook-addin/vite.config.ts
git commit -m "build(playground): add the playground page to the Vite build

Deploys at /defluff/playground/ via the existing GitHub Pages workflow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Task 6: Embed the playground on the landing page

**Files:**
- Modify: `apps/outlook-addin/public/index.html`

- [ ] **Step 1: Add the iframe stylesheet rule**

In `apps/outlook-addin/public/index.html`, find this line inside the `<style>` block:

```css
    section.band h2 { margin-bottom: 8px; }
```

Add immediately after it:

```css
    .playground-embed {
      width: 100%;
      height: 720px;
      margin-top: 24px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      box-shadow: var(--shadow);
    }
    @media (max-width: 600px) {
      .playground-embed { height: 760px; }
    }
```

- [ ] **Step 2: Add the nav link**

Replace this block:

```html
      <nav>
        <a href="#how">How it works</a>
        <a href="#surfaces">Works with</a>
        <a href="#privacy">Privacy</a>
        <a href="https://github.com/FinAegis/defluff">GitHub</a>
      </nav>
```

with:

```html
      <nav>
        <a href="#try">Try it</a>
        <a href="#how">How it works</a>
        <a href="#surfaces">Works with</a>
        <a href="#privacy">Privacy</a>
        <a href="https://github.com/FinAegis/defluff">GitHub</a>
      </nav>
```

- [ ] **Step 3: Insert the "Try it" section**

Find this line (the start of the "How it works" section):

```html
  <section id="how" class="band">
```

Insert immediately **before** it:

```html
  <section id="try" class="band alt">
    <div class="container">
      <p class="section-overline"><span class="mark">§</span>01 · Try it now</p>
      <h2>Try it in your browser</h2>
      <p class="lede">
        Paste an email, bring your own API key, see the bullets. The playground
        calls your provider straight from this page — nothing reaches a FinAegis
        server. <a href="playground/">Open the full playground ↗</a>
      </p>
      <iframe
        class="playground-embed"
        src="playground/"
        title="Defluff playground — paste an email and extract its intent"
        loading="lazy"
      ></iframe>
    </div>
  </section>

```

(The `band alt` class keeps the section-background zebra correct: the new section is `alt`, and the existing sequence starting at `#how` (`band`) already alternates after it.)

- [ ] **Step 4: Renumber the existing section overlines**

The new "Try it" section is §01, so the five existing overlines shift by one. Make these five exact replacements in `apps/outlook-addin/public/index.html`:

1. `<span class="mark">§</span>01 · How it works` → `<span class="mark">§</span>02 · How it works`
2. `<span class="mark">§</span>02 · Where it works` → `<span class="mark">§</span>03 · Where it works`
3. `<span class="mark">§</span>03 · Agent surfaces` → `<span class="mark">§</span>04 · Agent surfaces`
4. `<span class="mark">§</span>04 · Privacy` → `<span class="mark">§</span>05 · Privacy`
5. `<span class="mark">§</span>05 · Proof points` → `<span class="mark">§</span>06 · Proof points`

- [ ] **Step 5: Build and verify the landing page**

Run: `pnpm --filter @defluff/outlook-addin build`
Expected: build succeeds.

Run: `pnpm --filter @defluff/outlook-addin preview`
Open the preview URL. Verify:
- The "Try it" section appears right after the hero, with the playground loaded inside the iframe.
- The "Try it" nav link scrolls to it.
- Section overlines now read §01 Try it → §02 How it works → … → §06 Proof points, in order.
- The "Open the full playground ↗" link opens the standalone playground page.

Record each check.

- [ ] **Step 6: Commit**

```bash
git add apps/outlook-addin/public/index.html
git commit -m "feat(landing): embed the Defluff playground in a Try it section

Adds an interactive Try-it section (iframe to /playground/) plus a nav
link, and renumbers the section overlines.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

## Task 7: Open PR 2

- [ ] **Step 1: Run the post-phase-review skill**

Invoke the `post-phase-review` skill against the `feat/paste-defluff-playground` branch. Fix any critical/important issues before opening the PR.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin feat/paste-defluff-playground
gh pr create --title "feat(playground): BYOK web playground + landing-page embed" \
  --body "$(cat <<'EOF'
## Summary
Adds a standalone web playground so anyone with an API key can defluff pasted text without installing the extension — and embeds it on the landing page.

- New `/defluff/playground/` page (plain TS, mirrors the Outlook task pane). Provider config + key in `localStorage`; `summarize()` runs provider-direct from the browser.
- One-line addition to the existing `apps/outlook-addin` Vite build — no new app, no new CI.
- Landing page gains an interactive "Try it" section (iframe) + nav link.

Part 2 of 2. Spec: `docs/superpowers/specs/2026-05-22-paste-defluff-design.md`.

## Test plan
- `pnpm --filter @defluff/outlook-addin typecheck` / `build` pass; `dist/playground/index.html` produced.
- Manual: open `/playground/`, save a key, paste an email, Defluff → result; DevTools Network shows only the provider request (CORS verified per provider used); landing page shows the embed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Merge once approved**

After review approval, merge the PR.

---

## Self-review notes (for the plan author / reviewer)

- **Spec coverage:** Extension popup → Tasks 1–2. Reuse of `MSG_SUMMARIZE` → Task 1 Step 5. Unconfigured setup prompt → Task 1 Step 5 (`configured` state). Playground page → Tasks 4–5. localStorage key + trust UX → Task 4 Steps 1, 4. Standalone `/playground/` + landing embed → Tasks 5–6. Two PRs with `post-phase-review` → Tasks 3, 7. Thread/batch paste is explicitly out of scope per the spec and is not implemented.
- **Provider set:** the playground offers Anthropic / OpenAI / Gemini only (not `openai-compatible`). An Ollama/OpenAI-compatible endpoint reached from the public `finaegis.github.io` origin needs the user's local server to allow that origin (CORS) — out of scope for a v1 public playground. The extension popup keeps full provider support because it routes through the background worker.
- **No core changes:** `packages/core` and `apps/extension/src/shared/messages.ts` are untouched — the popup reuses `MSG_SUMMARIZE` as-is.
