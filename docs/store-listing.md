# Chrome Web Store listing

Drop-in copy for the Chrome Web Store developer dashboard.
Edge Add-ons and Firefox AMO accept the same descriptions — just swap the
name/developer blocks for their schemas.

---

## Name

`Defluff — strip AI fluff from emails`

_(Chrome Web Store: max 75 chars. Current: 40.)_

## Short description

`Replace AI-padded emails with 3–5 bullets of real intent. BYOK (Claude / GPT / Gemini / Ollama). Zero retention — no Defluff servers.`

_(Chrome Web Store: max 132 chars. Current: 130.)_

## Category

Productivity.

## Language

English (en-US). Add more as community translations land.

## Detailed description

```
Corporate email is being drowned in AI-generated filler. Half of every message is restated context, "I hope this finds you well," and softening qualifiers that exist only because a model was asked to pad a one-line request into four paragraphs.

Defluff adds a one-click "De-Fluff" button next to emails in Gmail, Outlook Web, and LinkedIn messages. Click it — the message collapses into 3–5 bullets of what the sender actually wanted, plus a verdict (ACTIONABLE / RESPONSE-NEEDED / FYI / NOISE). When the email was actually written by AI, Defluff reverses it: one line naming the prompt the sender probably gave their LLM. When the email was written by a human, Defluff says so and doesn't fake it.

🤖 AI-AUTHORSHIP DETECTION
Defluff classifies every email as AI-written, AI-polished, or human. You only see "they probably asked an AI to write this" when that's actually true — human messages are labelled as human, not mislabelled as prompts.

🌍 YOUR LANGUAGE
The summary, reversed prompt, verdict reason, and bullets come back in the same language as the email — French email gets French bullets, German email gets German bullets. No forced-English summaries.

What makes Defluff different is the architecture.

🔒 ZERO RETENTION BY DESIGN
There is no Defluff backend. Your email body and your API key never leave your browser for any infrastructure we run. Every De-Fluff click goes straight from your browser to the LLM provider you picked.

🔑 BRING YOUR OWN KEY
Use Anthropic (Claude), OpenAI (GPT), Google Gemini, or a local Ollama server. Your choice, your API key, your bill. Switch at any time.

🌐 HOST-SCOPED PERMISSIONS
Defluff only injects into mail.google.com, outlook.office.com (and Microsoft's other Outlook origins), and — only if you opt in via the options page — linkedin.com. Never "all URLs." You can read every host permission in the manifest before you install.

📖 OPEN SOURCE (MIT)
Around 2,000 lines of TypeScript total. Auditable in an afternoon: github.com/FinAegis/defluff

🔕 NO TELEMETRY
No analytics SDKs, no crash reports that ship request bodies, no usage tracking. The extension makes exactly one external request per click — to the LLM provider you configured.

TYPICAL USE
• A 400-word "circling back" email → two bullets + NOISE verdict.
• A status update buried in three paragraphs → three bullets of what's on fire.
• A sales pitch disguised as a personalized intro → the reversed prompt makes it obvious.

COST
$0 for the extension. Your provider bills you per request directly — typically under $1/month on Claude Haiku or GPT-4o mini, even for heavy users. $0 total if you point Defluff at a local Ollama model.

WHO IT'S FOR
• Anyone who reads more email than they write.
• Teams whose CISO has already banned Grammarly, Otter, Shortwave, and Superhuman on data-residency grounds — Defluff has nothing to ban, because no data flows through a Defluff server.
• Self-hosters who want AI assistance without handing content to a SaaS.

PRIVACY POLICY
github.com/FinAegis/defluff/blob/main/PRIVACY.md

Short version: no backend, no analytics, no account. Your email content goes only to the LLM provider you configured, using the API key you control.

SUPPORT
• Issues & feedback: github.com/FinAegis/defluff/issues
• Source: github.com/FinAegis/defluff (MIT)
• Buy us a coffee (optional): buymeacoffee.com/finaegis
```

_(Chrome Web Store: max 16,000 chars. Current: ~2,200.)_

## Developer contact

- Email: _(fill in a reachable address — required on Chrome Web Store)_
- Website: <https://finaegis.github.io/defluff/>

## Privacy policy URL

<https://github.com/FinAegis/defluff/blob/main/PRIVACY.md>

_(GitHub renders markdown — acceptable as a privacy policy URL for all three stores.)_

## Permission justifications

Chrome Web Store prompts for per-permission justification. These are the answers:

- **`storage`** — Used to save the user's LLM provider choice, API key, and enabled-host list to `chrome.storage.sync`. No content or usage data is stored.
- **`host_permissions: mail.google.com/*`** — Required to inject the De-Fluff button and read the currently viewed email body in Gmail.
- **`host_permissions: outlook.office.com/*`, `outlook.office365.com/*`, `outlook.live.com/*`, `outlook.cloud.microsoft/*`** — Same as Gmail, for Outlook Web's four origins. (Microsoft is migrating tenants to `outlook.cloud.microsoft`, which requires its own host match.)
- **`host_permissions: api.anthropic.com/*`, `api.openai.com/*`, `generativelanguage.googleapis.com/*`** — The service worker sends the email body to one of these provider APIs when the user clicks De-Fluff. MV3 requires the host to be declared in `host_permissions` for the extension's background fetch to bypass CORS.
- **`optional_host_permissions: linkedin.com/*`** — Granted only when the user enables the LinkedIn toggle in the options page. Not requested at install time, so users who don't want LinkedIn never see the permission prompt.
- **`commands` (`Ctrl+Shift+D`)** — Keyboard shortcut that triggers the De-Fluff button nearest the viewport.

## Remote code use

Answer: **No.** The extension does not load remote code. Third-party requests are limited to standard LLM API calls (request contains prompt + API key; response is JSON). No `eval`, no remote script injection, no dynamic imports from external origins.

## Screenshots (1280×800)

1. `docs/store-listing-1.jpg` — Outlook Web: NOISE verdict, SEO sales pitch. (Hero.)
2. `docs/store-listing-2.jpg` — Options page: provider config + host toggles.
3. `docs/store-listing-3.jpg` — Message view (any host): reversed prompt + verdict + bullets.

_Chrome Web Store accepts 3–5 screenshots. Edge Add-ons requires at least 1. AMO requires at least 1._

## Promo tile (440×280)

Not in the repo yet. If we want to rank higher in Chrome Web Store search, add one before submission — a crop of the hero shot with a bold "DEFLUFF" wordmark works.

## Version

`0.1.0` (matches `apps/extension/manifest.config.ts` and `apps/extension/package.json`).

## Upload artifact

```
pnpm --filter @defluff/extension build
cd apps/extension/dist
zip -r ../../defluff-v0.1.0-chrome.zip .
```

The resulting zip is what you upload. First submission carries the one-time
$5 Chrome Web Store developer fee.

## Firefox AMO differences

- Firefox requires `browser_specific_settings.gecko.id` — already set to `defluff@finaegis.com` in the manifest (f07e98a).
- AMO review is slower (days, not hours).
- AMO accepts the same zip; upload via <https://addons.mozilla.org/developers/>.

## Edge Add-ons differences

- Free developer account at <https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview>.
- Same zip, typically auto-approves in hours.

## Timing

Submit Chrome Web Store + Edge Add-ons simultaneously. Wait for Chrome to approve (often 1–3 days) before Firefox, so the Chrome Web Store URL can be linked from the AMO listing and the landing page install buttons. Firefox is the longest review — submit last so the other stores don't block on it.
