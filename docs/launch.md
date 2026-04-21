# Launch Materials

Draft copy for the Defluff launch. Keep this file updated as the product evolves — the Show HN post and landing copy should always reflect what currently ships.

## The wedge

> **AI wrote this email. Let's see what they actually wanted.**

Use everywhere. It works because:
- It captures the entire value prop in one line.
- It's an inversion — memorable, quotable, reposted as-is.
- It sets up the privacy narrative: you're not trusting a new SaaS, you're turning the AI arms race back on itself with your own tools.

### Hero asset

`docs/screenshot.jpg` — real sales-outreach email, defluffed. Shows the reversed prompt + NOISE verdict + bullet specifics in a single frame. Use this everywhere a still image is needed (README, landing, Chrome Web Store promo, Product Hunt, Show HN `og:image`).

## Show HN post (draft)

**Title:** `Show HN: Defluff – strip AI-generated fluff from emails (BYOK, open source)`

---

Corporate email has become unreadable. Half of every message is AI-generated filler, restated context, and "I hope this finds you well." Defluff is a browser extension and Outlook add-in that replaces the body of an open email with 3–5 bullets of what the sender actually wants.

The interesting part isn't the summarization — that's just an LLM call with a restrictive prompt. The interesting part is the trust model. There is no Defluff backend. Your email body and your API key never leave your browser for any infrastructure we run. Each De-Fluff click goes straight from your browser to the provider you picked (Anthropic, OpenAI, Gemini, or local Ollama). Zero retention isn't a policy, it's the architecture.

This means:
- Your corporate IT has nothing to ban — we're not processing their data.
- Self-hosters can point it at Ollama and never pay for a cloud inference call.
- If you don't trust us, you can audit every line — it's MIT licensed, ~2k LOC TS total.

The pieces:
- Chrome/Edge/Firefox extension for Gmail and Outlook Web.
- Office.js add-in for desktop Outlook (Windows and Mac) and Outlook Web.
- A Claude Code plugin (install with `/plugin install defluff@finaegis`) for Anthropic users.
- An Openclaw skill for the local-agents crowd.

Everything shares one ~500-line `@defluff/core` package that owns the extraction prompt and the four provider adapters. Plain `fetch()` — no SDKs in the bundle.

Feedback welcome, especially from anyone whose enterprise has banned every mainstream AI summarizer on data-residency grounds. That's who this was built for.

Repo: https://github.com/FinAegis/defluff
Landing: https://finaegis.github.io/defluff/

---

**Post-launch reply kit** — canned answers for common HN questions:

- *"Why not use the Anthropic SDK?"* — Keeps the extension bundle small and the dependency audit surface minimal. Four plain-fetch adapters is ~200 LOC total. SDK adoption is deferred until there's a real reason.
- *"How do you handle prompt injection in emails?"* — Output renders as `textContent`, so there's no code-execution risk. The summary can be wrong or misleading if the sender is adversarial, and we document that in SECURITY.md. Don't act on a Defluff summary of a suspicious sender.
- *"Why BYOK instead of a subscription?"* — Two reasons. Privacy (covered above). And commitment: the moment we have a subscription, we're incentivized to upsell features that dilute the product's focus. BYOK keeps us honest.
- *"Does it work with Fastmail / ProtonMail / Thunderbird / Apple Mail?"* — Not yet. The architecture could extend to those; it's a matter of which client sees enough demand. Open an issue if you want one.

## Landing page copy

Single-page. Three sections: hero, how it works, the privacy sell. One CTA.

### Hero

**AI wrote this email.**
**Have AI read it.**

Defluff strips corporate fluff from Gmail and Outlook in one click. Zero servers. Your keys, your models, your data.

**[Install for Chrome]** **[Install for Outlook]**

*(before/after screenshot: 400-word corporate email on the left, 3-bullet defluffed version on the right)*

### How it works

1. **Install** the extension or Outlook add-in.
2. **Configure** your LLM provider — Anthropic, OpenAI, Gemini, or your local Ollama. Any of them. Your key, in your browser.
3. **Click De-Fluff** on any email. The message collapses into the 3–5 points that actually matter.

### The privacy sell

| | Defluff | Shortwave | Superhuman AI | Grammarly |
|---|---|---|---|---|
| Your email reaches their servers | **Never** | Yes | Yes | Yes |
| Stores your content | **Never** | Yes | Yes | Yes |
| Needs an account | **No** | Yes | Yes | Yes |
| Costs per month | **$0*** | \$12 | \$40 | \$12 |
| Open source | **Yes** | No | No | No |
| Works with local models | **Yes (Ollama)** | No | No | No |

*\* Plus whatever you pay your chosen LLM provider. Typical cost for a heavy user: under $1/month on Claude Haiku or GPT-4o mini. $0 on Ollama.*

### Proof points

- MIT licensed
- Zero analytics or telemetry
- Host-scoped permissions (`mail.google.com`, `outlook.office.com` — nothing else)
- Threat model published: [SECURITY.md](https://github.com/FinAegis/defluff/blob/main/SECURITY.md)
- ~2,000 lines of TypeScript total. Audit it over coffee.

## Channel-specific tweaks

### Hacker News (Show HN)

Lead with architecture. Audience respects "no backend" more than it respects "looks nice." The full post above is tuned for HN.

### r/LocalLLaMA

Lead with Ollama. One line: *"Your email summarizer doesn't have to leave your LAN."*

### r/selfhosted

Same as LocalLLaMA. Include a note about the optional self-hostable `packages/proxy` if/when it exists.

### r/privacy

Lead with the comparison table. The privacy row is the whole pitch.

### Product Hunt (later — not day 1)

Lead with the before/after screenshot. Wait until there are 1000+ installs from HN — PH rewards social proof more than novelty.

### Enterprise / B2B outreach

Lead with "your organization's CISO already banned Grammarly and Otter." Skip the technical architecture; reach for the compliance-team win: *nothing is processed on our servers, so no DPA, no sub-processor disclosure, no data-residency question.*

## Launch checklist

- [x] ClawHub skill published (`defluff` v0.0.7 live at https://clawhub.ai/yozaz/defluff — adds invoice fraud / BEC red-flag detection)
- [x] Claude Code plugin + single-repo marketplace live in `apps/claude-skill/` (`/plugin install defluff@finaegis`, v0.1.0)
- [ ] Submit Claude Code plugin to the official Anthropic marketplace — https://claude.ai/settings/plugins/submit
- [x] Hero screenshot in the README (`docs/screenshot.jpg`)
- [ ] All [launch-blocker issues](https://github.com/FinAegis/defluff/labels/launch-blocker) closed
- [ ] 20-second demo video (no voiceover; one click, reversed prompt + verdict + bullets, done)
- [ ] 2–3 variant screenshots: one **ACTIONABLE** (work email with deadline), one **RESPONSE-NEEDED** (colleague asking a question), one **NOISE** (✓ sales pitch, `docs/screenshot.jpg`). Chrome Web Store wants 3–5 promo shots at 1280×800.
- [ ] Landing page live
- [ ] Chrome Web Store listing approved
- [ ] Edge Add-ons listing approved
- [ ] Firefox AMO submission in queue
- [ ] AppSource submission in queue
- [ ] Show HN post drafted (above) — post Tuesday or Wednesday 8am PT
- [ ] Maintainer available for 24h to reply to comments
- [ ] Pre-warmed on r/LocalLLaMA and r/selfhosted as follow-up posts

## What not to do

- Don't Product Hunt-first. HN converts better for this profile and sets the narrative.
- Don't add telemetry to measure the launch. The zero-retention story is load-bearing. GitHub stars + Chrome Web Store installs are the only metrics.
- Don't over-promise. Ship v0.1 with what works and let people find the rest.
