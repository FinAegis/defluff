# Defluff Privacy Policy

_Last updated: 2026-04-21_

Defluff is a bring-your-own-key (BYOK) email summarization tool. This policy
describes what data Defluff handles, where it goes, and what it does not do.

## The one-line version

**Defluff has no servers. Your email content and your API key travel only from
your browser directly to the LLM provider you configured. We collect nothing,
because there is no "we" in the request path.**

## Who operates Defluff

Defluff is maintained by FinAegis as a free, open-source project. Source code:
<https://github.com/FinAegis/defluff>.

## What data Defluff handles

**Stored locally, on your device only:**

- The LLM provider you selected (Anthropic, OpenAI, Google Gemini, Ollama, or
  an OpenAI-compatible endpoint).
- The API key you entered for that provider.
- The optional model override string.
- The list of hosts where you enabled Defluff (Gmail, Outlook, LinkedIn).

These live in `chrome.storage.sync` (the browser extension) or
`Office.context.roamingSettings` (the Outlook add-in). They sync across your
browsers / Outlook installations through Google/Microsoft's native sync, not
through any Defluff infrastructure.

**Transmitted only when you click De-Fluff:**

- The text content of the email message currently open.
- Your API key (as an auth header — standard provider SDK usage).

Both are sent **directly from your browser to your configured provider**, using
the provider's own API endpoint. They do not pass through a Defluff server
because none exists.

## What Defluff does not do

- **No backend.** Defluff operates no servers, databases, or queues. The source
  tree contains no hosted infrastructure — you can verify this by auditing
  the repository.
- **No analytics in the product.** No usage metrics, crash reports, click
  tracking, feature flags, or A/B testing SDKs are embedded in the extension
  or the Outlook add-in. The marketing site at
  `https://finaegis.github.io/defluff/` uses Google Analytics to count
  visitors — that applies only to the landing page, not to the extension or
  add-in, and no email content ever reaches the landing site.
- **No account.** There is no Defluff sign-up or login.
- **No retention.** Defluff itself stores nothing beyond your local settings.
  The provider's servers may retain your data according to that provider's
  own retention policy — see below.

## Third parties: your chosen LLM provider

When you click De-Fluff, the message body is sent to the provider you
configured. Each provider has its own privacy policy:

- **Anthropic (Claude):** <https://www.anthropic.com/legal/privacy>
- **OpenAI (GPT):** <https://openai.com/policies/privacy-policy>
- **Google (Gemini):** <https://policies.google.com/privacy>
- **Ollama / local models:** No network request leaves your machine.
- **OpenAI-compatible endpoints:** Governed by the privacy policy of whoever
  operates that endpoint (your self-hosted server, your enterprise gateway,
  or a third party you chose).

Defluff does not contract with these providers on your behalf. Your usage of
them is governed by your direct relationship with each provider, established
when you signed up for their API.

## Permissions the extension requests

Host-scoped only — never `<all_urls>`:

- `mail.google.com` — to inject the De-Fluff button on Gmail.
- `outlook.office.com`, `outlook.office365.com`, `outlook.live.com`,
  `outlook.cloud.microsoft` — to inject the button on Outlook Web.
- `linkedin.com` — **optional**, granted only if you enable LinkedIn in the
  options page. Not requested at install.
- `api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com` —
  required for the service worker to reach each provider's API (MV3 requires
  the host in `host_permissions` to bypass CORS).

## Your rights and controls

- **Remove your data:** uninstall the extension (or remove the Outlook add-in)
  and all locally stored settings are deleted by the browser / Outlook.
- **Revoke a provider key:** rotate or delete the key at the provider's
  console. Defluff has no persistent copy.
- **Export:** your settings are a small JSON object in `chrome.storage.sync` /
  `roamingSettings`. Your browser and operating system provide the standard
  mechanisms to export extension storage.

## Changes to this policy

Changes will be committed to this file in the public repository. The
"Last updated" date at the top reflects the most recent change.

## Contact

Issues, concerns, or corrections: open an issue at
<https://github.com/FinAegis/defluff/issues>.
