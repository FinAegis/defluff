# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product: Defluff

Inline tool that strips AI-generated padding from long emails and returns a 3–5 bullet summary of the sender's actual intent, facts, and action items. Full product spec in [`requirements.md`](requirements.md) — authoritative for behavior, §5 authoritative for privacy constraints.

## Architecture

**Serverless BYOK.** No FinAegis backend exists. Every client calls the user's chosen LLM provider directly from the browser/webview using an API key stored in that client's encrypted per-user settings.

- Chrome extension bypasses CORS via MV3 `host_permissions`.
- Office add-in relies on provider CORS (Anthropic TS SDK `dangerouslyAllowBrowser`, OpenAI `dangerouslyAllowBrowser`, Gemini native CORS, Ollama via `OLLAMA_ORIGINS`). This is verified in SDK docs but must be smoke-tested on real traffic — if a provider/origin combination fails, fall back to the optional `packages/proxy` (user-deployable Cloudflare Worker). **Do not introduce a FinAegis-operated server.**

"BYOK in user's own browser" ≠ "exposing our key" — the `dangerously*` warnings in provider SDKs are about shipping *a vendor's* key in public JS, which does not apply here.

## Monorepo layout (pnpm workspaces)

| Path | Purpose |
|---|---|
| `apps/extension/` | Chrome/Edge/Firefox MV3 extension (React + Vite). Ships to Gmail + Outlook Web. |
| `apps/outlook-addin/` | Office.js add-in for Outlook desktop. Manifest XML + task pane HTML. |
| `apps/openclaw-skill/` | A single `SKILL.md` (YAML frontmatter + markdown). Published to ClawHub. |
| `packages/core/` | Shared: provider adapters (Anthropic/OpenAI/Gemini/Ollama), extraction prompt, response schema. All clients depend on this. |
| `packages/proxy/` | Optional Cloudflare Worker CORS fallback. Build only if a provider blocks a real-world origin. |

TypeScript end-to-end. Vite for the extension. pnpm for the workspace.

## Hard constraints — do not violate

- **Zero-retention is structural, not policy.** There is no server to persist on. If you find yourself adding one, stop and raise it — it's an architecture change, not an implementation detail.
- **Extension permissions must be host-specific** (`mail.google.com`, `outlook.office.com`). Never request `<all_urls>` — it fails Chrome Web Store review.
- **Provider adapters must be pluggable.** No hard-coded provider anywhere outside `packages/core/providers/`. The extraction prompt is fixed; the provider is not.
- **Extraction prompt is load-bearing.** The authoritative wording lives in `packages/core/src/prompt.ts`; `requirements.md` §4.4 summarizes it. It instructs the model to produce three things in order: the `Prompt:` reversal (soul of the product), the `Verdict:` classification (ACTIONABLE / RESPONSE-NEEDED / FYI / NOISE with scam-pattern naming in the reason), and 3–5 bullets of specifics. Preserve the restrictive framing — loosening reintroduces the fluff the product exists to remove. Any change updates both files in the same commit.
- **Latency-optimized models by default** (Claude Haiku, GPT-4o mini, Gemini Flash). This is extraction, not creative writing.

## Coding conventions

- TS strict mode everywhere. No `any` in committed code.
- Provider adapters expose a single `summarize(text: string): Promise<Bullet[]>` function — all LLM-specific logic stays behind that boundary.
- UI components: minimal and native-looking. The "De-Fluff" button should feel like a Gmail/Outlook-native button, not a branded widget. Follow each host's visual language, don't impose our own.
- No analytics SDKs, no error-tracking SDKs that send request bodies. If we ever need crash reports, use ones that scrub bodies by default and document what they send.

## Working in this repo

- Don't invent a backend. See the architecture note above.
- Don't add a provider by copying an SDK import into the extension directly — add an adapter under `packages/core/providers/` and wire it through the provider registry.
- When you change the extraction prompt or response schema, update all adapters and both clients in the same PR — the clients share the schema via `packages/core`.
