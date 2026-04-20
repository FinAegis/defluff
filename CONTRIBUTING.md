# Contributing to Defluff

Thanks for looking! This is a small project with a focused goal — strip AI-generated padding from emails into 3-5 bullets — and contributions that stay close to that goal are the most likely to land.

## Prerequisites

- Node.js 22+
- pnpm 9.15.0 (pinned via `packageManager` in `package.json`)
- A real Gmail or Outlook account for live-testing extension changes

## Setup

```bash
git clone https://github.com/FinAegis/defluff.git
cd defluff
pnpm install
```

## Daily workflow

```bash
pnpm -r typecheck      # type-check every package
pnpm -r test           # run vitest across all packages
pnpm -r build          # build both clients

# single-package work
pnpm --filter @defluff/core test:watch
pnpm --filter @defluff/extension dev      # Vite dev + HMR for the browser extension
pnpm --filter @defluff/outlook-addin dev  # HTTPS dev server for the Outlook add-in
```

To load the extension into Chrome:
1. `pnpm --filter @defluff/extension build`
2. `chrome://extensions` → enable Developer mode → **Load unpacked** → pick `apps/extension/dist`
3. Open the extension's options page (Details → Extension options) and configure a provider

## Architecture

| Path | Owns |
|---|---|
| `packages/core` | Extraction prompt, provider adapters, response parser, summarize orchestrator. **No DOM, no platform APIs, no UI.** Pure TS |
| `apps/extension` | MV3 browser extension. Service worker calls core; content scripts render UI |
| `apps/outlook-addin` | Office.js add-in. Task pane calls core directly from the webview |
| `apps/openclaw-skill` | Pure markdown + YAML, no code |

All clients consume `@defluff/core` — if something is cross-cutting (provider-knowledge, config validation, the extraction prompt), it belongs in core, not in a client.

## Hard constraints

These are non-negotiable. PRs that violate them will be closed with a pointer back here.

- **No backend.** The zero-retention story is structural, not policy. If a PR adds an intermediate server, close it.
- **Extension permissions are host-scoped.** Never request `<all_urls>` in `manifest.config.ts`.
- **The extraction prompt is verbatim from `requirements.md` §4.4.** Changes to the prompt require updating that spec document and must have a strong reason — loosening the wording reintroduces the fluff we exist to remove.
- **No analytics / telemetry SDKs.** Crash reporting, if ever added, must be opt-in and body-scrubbing.

## Commit and PR style

- Conventional commit subjects (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`, `test:`). Scope with the package name when useful: `feat(extension): ...`.
- One logical change per PR. Scaffolding PRs can be larger; bug fixes should be small and focused.
- Include the motivation in the commit body — *why* the change, not just *what*.
- For user-visible changes in the browser/add-in UI, include a screenshot or a short recording.

## Where to start

Issues tagged **[good first issue](https://github.com/FinAegis/defluff/labels/good%20first%20issue)** are usually self-contained and well-specified.

If you want to take on something bigger, look at **[launch-blocker](https://github.com/FinAegis/defluff/labels/launch-blocker)** — those are the real-world testing and DOM-selector passes needed before v0.1 ships.

## Testing guidelines

- Core logic changes must land with tests (`packages/core/src/*.test.ts`). Aim for one failing test per bug you're fixing.
- Extension content-script changes should come with a manual test note in the PR description: what Gmail/Outlook view you tested, on which provider.
- DOM-selector updates must include a dated comment next to the selector noting when it was last audited against the live UI.

## Code of conduct

Be kind, be direct, stay technical. We don't need a big formal CoC yet — if that changes, we'll add one.
