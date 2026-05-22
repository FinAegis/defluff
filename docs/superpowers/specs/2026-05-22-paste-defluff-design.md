# Paste-and-Defluff — design

- **Date:** 2026-05-22
- **Status:** Approved (brainstorming) — pending implementation plan
- **Topic:** Let users defluff arbitrary pasted text, not just emails open in Gmail/Outlook.

## Summary

Add a "paste text → Defluff" surface in two places:

1. **Extension toolbar popup** — for installed users to defluff text that isn't in
   a supported mail client (a Slack message, a forwarded blob, a doc excerpt).
2. **Website playground** — a standalone `/playground/` page on the marketing site,
   also iframe-embedded as a "Try it" section on the landing page.

Both are thin UIs over the existing `packages/core` `summarize()` engine. No backend,
no new architecture.

## Decisions made during brainstorming

| Question | Decision | Rationale |
|---|---|---|
| How to fund "free tries"? | **No free tries — BYOK only.** | A FinAegis-funded trial needs a server to hold the key, which violates the `CLAUDE.md` "no FinAegis-operated server" hard constraint, and a paid tier reverses the deliberate anti-subscription positioning in `docs/launch.md`. |
| Where does the paste box live? | **Both** the extension and the website. | Two different jobs: the extension box serves installed users with non-mail text; the web playground serves people who have a key but use an unsupported mail app (Fastmail / ProtonMail / Thunderbird / Apple Mail). |
| Playground vs landing page | **Standalone `/playground/` page, also iframe-embedded** in a "Try it" section on the landing page. | Standalone gives a shareable URL and a real no-install client; the embed makes the marketing page interactive. The landing `index.html` stays hand-edited static HTML — the iframe keeps the playground a separately-built artifact. |

## Constraints respected (non-goals)

- **No FinAegis server.** Every call goes browser → user's chosen provider, exactly as today.
- **No billing, no accounts, no analytics in the tools.** (The landing page's existing
  GA tag is marketing-site-only and unchanged; the playground page itself ships no analytics.)
- **No new extension permissions.** The popup runs in the extension context, which
  already has `host_permissions` for the provider hosts.
- **Extraction prompt untouched.** This is a new entry point to `summarize()`, not a
  prompt change — so no `prompt.ts` / `requirements.md` / skill-file edits are triggered.

## Feature 1 — Extension popup paste box

### Placement
The toolbar `action` currently has **no `default_popup`**; clicking the icon runs a
`chrome.action.onClicked` listener that opens the options page. We claim that slot.

### Changes
- `apps/extension/manifest.config.ts`: add `default_popup: 'src/popup/index.html'` to `action`.
- `apps/extension/src/background.ts`: **remove the now-dead `chrome.action.onClicked`
  listener** (with a popup set, it never fires) and update the adjacent comment. Clicking
  the icon now opens the popup; the popup itself links to options for setup/settings.
- New `apps/extension/src/popup/` — `index.html`, `main.tsx`, `App.tsx`, `styles.css`,
  mirroring the structure of `src/options/`.

### Data flow
The popup reuses the **existing** `MSG_SUMMARIZE` message — no new message types, no
core changes:

1. User pastes text, clicks "Defluff".
2. Popup sends `{ type: MSG_SUMMARIZE, text }` via `chrome.runtime.sendMessage`.
3. `background.ts` `handleSummarize()` reads the stored provider config and calls
   `summarize({ text, provider })` — the same path content scripts use.
4. Popup renders the returned `Summary` (Authored / Prompt / Verdict / bullets).

### States
- **Unconfigured** (response `code: 'unknown_provider'`): show a short "Set up a provider
  first" message with a button that sends `MSG_OPEN_OPTIONS`.
- **Empty input:** "Defluff" button disabled.
- **Loading:** spinner / disabled button while awaiting the response.
- **Error:** render `toUserError()` output, consistent with the content script.
- **Result:** the verdict card, using core's `VERDICT_LABELS` / `AUTHORED_LABELS` /
  `formatReversedPrompt`. A "Defluff another" / clear control resets the input.

### UX notes
- Popup width follows Chrome norms (~360–400px); long results scroll within the popup.
- Visual language follows the extension's own surfaces (the options page), not Gmail/Outlook —
  this is an extension surface, not an injected one.
- This is purely the paste tool. Defluffing an email already open in Gmail/Outlook stays
  the injected in-page button + the `Ctrl+Shift+D` command — no overlap, no regression.

## Feature 2 — Website playground

### Build & deploy
The Pages site is built from `apps/outlook-addin` (Vite, multi-page `rollupOptions.input`)
and deployed by `.github/workflows/deploy-addin.yml`. The playground is a new entry:

- `apps/outlook-addin/vite.config.ts`: add `playground: resolve(__dirname, 'playground/index.html')`
  to `rollupOptions.input`.
- New `apps/outlook-addin/playground/index.html` (its `<script>` imports the entry in
  `apps/outlook-addin/src/playground/`). Output lands at `dist/playground/index.html` →
  served at `https://finaegis.github.io/defluff/playground/`.
- No new app and no new CI workflow — the existing build and deploy cover it.
- Honest note: hosting a generic web playground under `apps/outlook-addin` is pragmatic
  (that app already owns the Pages build and bundles `@defluff/core`). It can graduate to
  a dedicated `apps/web` later if it grows; not worth the extra Vite config + workflow now.

### Data flow
Provider-direct from the browser — there is no extension background here:

1. User picks a provider and enters their API key (Anthropic / OpenAI / Gemini; the same
   set the Outlook task pane supports).
2. Key is persisted in `localStorage` so it survives reloads.
3. On "Defluff": build the provider config via core's `buildProviderConfig`, call
   `summarize({ text, provider })` directly (the provider-direct CORS path the Outlook
   task pane already uses).
4. Render the `Summary` card; errors via `toUserError()`.

### Key-trust UX
The whole feature depends on the visitor trusting a webpage with their API key:

- Plain-language note next to the key field: the key and the pasted text stay in this
  browser, are sent only to the provider the user picked, and never touch a FinAegis server.
- "Verify it yourself" — invite the user to open DevTools → Network and watch where the
  request goes; link to the source on GitHub.
- The key field is `type="password"`; offer a "clear saved key" control.

### Landing page embed
- `apps/outlook-addin/public/index.html` (hand-edited static landing page) gains a
  "Try it" section that embeds `/playground/` in an `<iframe>`.
- The landing page also gets a direct link/CTA to the standalone `/playground/` URL —
  useful while the Chrome Web Store CTA is disabled pending review (commit `b557d21`),
  and shareable.

## Shared

| Comes from `packages/core` (unchanged) | New per surface |
|---|---|
| `summarize()` — the engine | Popup: `src/popup/` React UI |
| `buildProviderConfig`, provider constants | Playground: `playground/index.html` + `src/playground/` UI |
| `VERDICT_LABELS`, `AUTHORED_LABELS`, `formatReversedPrompt`, icons | A result-card render in each (each matches its host's visual language) |
| `toUserError()` for error display | Manifest + Vite config one-line additions |

The result card is rendered independently in each surface (per `CLAUDE.md`: follow each
host's visual language). If duplication becomes real, a shared render helper can be
extracted later — not in v1.

## Scope

- **v1:** single pasted message → `summarize()`, in both surfaces.
- **Fast-follow (out of scope):** thread / batch paste. Core has `summarizeThread`, but
  detecting message boundaries in raw pasted text (vs. structured Gmail DOM) is a separate
  problem worth its own design.

## Risks

- **CORS.** `CLAUDE.md` requires provider/origin combinations to be smoke-tested on real
  traffic. The playground runs from the `finaegis.github.io` origin; the Outlook task pane
  already proves the provider-direct path, but each provider must still be verified from
  the playground page. If one fails, the documented fallback is the optional user-deployed
  `packages/proxy` Cloudflare Worker — not a FinAegis-operated server.
- **Popup size.** Long verdict results must scroll cleanly inside the constrained popup;
  verify with a worst-case (5-bullet NOISE) result.
- **Key-in-webpage trust.** Inherent to a BYOK web playground; mitigated by the trust UX
  above, not eliminated.

## Delivery plan

Two PRs, each running `post-phase-review` before opening (per global instruction):

1. **Extension popup paste box** — manifest + `background.ts` cleanup + `src/popup/`.
2. **Website playground** — Vite entry + `playground/` + `src/playground/` + landing-page
   "Try it" section and CTA.
