# Security

Defluff runs entirely in the user's browser. There is no FinAegis-operated backend — no server that receives email text, stores API keys, or processes requests on your behalf. This shapes our threat model.

## Architecture at a glance

```
  your browser / Outlook webview
  ─────────────────────────────────
  [De-Fluff button] ──► [email body text] ──► [user's LLM provider]
                                                ↑
                                   (api.anthropic.com / api.openai.com /
                                    generativelanguage.googleapis.com /
                                    user-chosen OpenAI-compatible URL)
```

Your email body and your API key travel one edge: from your browser to the provider you picked. Neither passes through any Defluff infrastructure.

## What we commit to

| Property | How it's enforced |
|---|---|
| **Zero retention of email content** | Structural — there's no server to retain on |
| **No analytics or telemetry** | We ship zero analytics SDKs. If we ever need crash reports, they will be opt-in and scrubbed of request bodies |
| **Minimal permissions** | Extension requests host-specific permissions only (`mail.google.com`, `outlook.office.com`, and the exact LLM endpoints). Never `<all_urls>` |
| **API key storage** | `chrome.storage.sync` (encrypted at rest by Chrome) for the extension; `Office.context.roamingSettings` for the Outlook add-in. Per-user, per-device, synced by the platform |
| **Transport security** | All LLM requests use HTTPS. Local Ollama endpoints are an exception — documented in the options page |
| **Source availability** | MIT licensed. Anyone can audit the code, and we encourage reproducible builds |

## What's explicitly in scope for security concerns

- **DOM injection into Gmail / Outlook Web.** Content scripts inject UI into these hosts. All user-visible text goes through `textContent`, never `innerHTML`. Shadow DOM isolates our styles from the host page (and vice versa).
- **LLM response rendering.** The model returns bullet strings. These are rendered as `textContent` on `<li>` elements — no HTML parsing, no XSS surface even if the model were adversarial.
- **Runtime validation of stored values.** `isProviderConfig()` rejects malformed persisted data. If someone tampered with `chrome.storage.sync`, we fail closed rather than crash.
- **Message-passing boundary.** The background service worker only listens to intra-extension messages (`chrome.runtime.onMessage`, not `onMessageExternal`) and validates the request shape before dispatching.

## What's explicitly out of scope

- **Your LLM provider's security.** If Anthropic, OpenAI, or Google is compromised, your emails are exposed. That's the provider's responsibility, not ours. The BYOK model means you pick the trust anchor.
- **Your device security.** If your machine is compromised, so is everything running on it — your API key, your browser session, your email. We can't protect against a rooted OS.
- **`chrome.storage.sync` encryption.** Chrome encrypts sync storage at rest, but the keys are yours to trust Google with. If you don't trust Chrome Sync, use a separate profile for Defluff or paste your API key each session (future feature).
- **Prompt injection via email content.** A sender can include text like "ignore previous instructions and…" in the email body. The model may follow it. The output is rendered as text, so there's no code-execution risk, but the bullets may be wrong or misleading. Don't take action on a Defluff summary of a suspicious sender's email without reading the original.

## Reporting a vulnerability

Please **do not open a public issue** for security bugs.

Open a private advisory via GitHub: https://github.com/FinAegis/defluff/security/advisories/new

Include:
- A description of the vulnerability and how you found it.
- Reproduction steps or a proof of concept.
- The affected component (extension, Outlook add-in, core package, Openclaw skill).
- The versions you tested against.

We aim to acknowledge within 3 business days and to ship a fix within 14 days for high-severity issues. Coordinated disclosure preferred — we'll agree on a publication date with you before any public write-up.
