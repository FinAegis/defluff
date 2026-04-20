# Defluff

> Strip AI-generated fluff from email. Get the actual intent in 3–5 bullets.

Defluff detects corporate padding and AI-generated filler in incoming emails and extracts what the sender actually wants: the facts, the intent, the action items. One click, inside Gmail or Outlook. No servers, no tracking, your keys.

## Why

Email is drowning in AI-generated text that buries the real message under pleasantries, restated context, and "I hope this finds you well." Defluff inverts the workflow: instead of reading every word, you see a scannable list of what matters. Original email stays one click away.

## Architecture

- **Zero-retention, zero servers.** Your email never touches FinAegis infrastructure. The client calls your chosen LLM provider directly.
- **Bring your own key (BYOK).** Configure an Anthropic, OpenAI, Gemini, or local (Ollama) key once. Each request goes straight from your browser to the provider you chose.
- **Open source.** MIT licensed. Fork it, audit it, self-host the optional proxy if you need it.

## Deliverables

This is a pnpm monorepo.

| Path | What it is | Status |
|---|---|---|
| `apps/extension/` | Chrome/Edge/Firefox MV3 extension for Gmail + Outlook Web | planned |
| `apps/outlook-addin/` | Office.js add-in for Outlook desktop (Windows/Mac) | planned |
| `apps/openclaw-skill/` | [Openclaw](https://openclaw.ai) skill (`SKILL.md`) | planned |
| `packages/core/` | Shared extraction logic, provider adapters, system prompt | planned |
| `packages/proxy/` | Optional Cloudflare Worker (CORS fallback, only if needed) | planned |

## Supported providers

- Anthropic Claude (Haiku tier recommended for extraction)
- OpenAI (GPT-4o mini recommended)
- Google Gemini (Flash tier recommended)
- Any OpenAI-compatible endpoint (Ollama, llama.cpp, LM Studio, custom)

## Privacy

- Email bodies are sent only to the LLM provider *you* configure.
- No telemetry, no analytics, no accounts.
- Extension permissions are scoped to `mail.google.com` and `outlook.office.com` only — never `<all_urls>`.
- API keys are stored in the browser's/Office's encrypted per-user settings storage.

## License

MIT — see [LICENSE](LICENSE).

## Status

Pre-alpha. Spec in [`requirements.md`](requirements.md), working notes for contributors in [`CLAUDE.md`](CLAUDE.md).
