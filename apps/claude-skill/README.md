# @defluff/claude-skill

A Claude Code plugin that extracts the actual intent of an email into 3–5 bullets, using the same fixed wording as the browser extension and Outlook add-in. Ships through the [FinAegis marketplace](../../.claude-plugin/marketplace.json) at the repo root.

The skill is pure markdown + YAML. No executable code, no MCP server, no hooks. Whatever model you've wired into Claude Code follows the instructions in `skills/defluff/SKILL.md`.

## Install (Claude Code)

One-time marketplace add, then install:

```bash
claude plugin marketplace add FinAegis/defluff
claude plugin install defluff@finaegis
```

Or from inside an interactive session:

```
/plugin marketplace add FinAegis/defluff
/plugin install defluff@finaegis
```

Paste an email into chat afterwards and Claude will auto-invoke it based on the skill description, or call it directly with `/defluff:defluff`.

To update: `claude plugin marketplace update finaegis` (Claude Code also auto-updates in the background).

## Install (filesystem, no marketplace)

For personal use without going through the marketplace, copy the skill folder into your Claude Code skills directory:

```bash
mkdir -p ~/.claude/skills/defluff
cp -r apps/claude-skill/skills/defluff/* ~/.claude/skills/defluff/
```

Restart Claude Code. The skill becomes `/defluff` (no plugin namespace in standalone mode).

## Install (claude.ai — Pro / Max / Team / Enterprise)

Claude.ai supports custom Skills uploaded as zip files under **Settings → Features → Skills**.

```bash
cd apps/claude-skill/skills/defluff
zip -r defluff-skill.zip .
```

Upload `defluff-skill.zip`. Claude.ai runs the skill in its own sandbox on Anthropic infrastructure — **this is not covered by Zero Data Retention**, so the browser extension and add-in are the right surface for anything sensitive. See the [privacy note](#privacy) below.

## Usage

Once installed, paste any email and ask for the point, action items, or a triage pass. Handled shapes:

| Input | Output |
|---|---|
| **Single email** | 3–5 bullets in priority order (actions → questions → facts → intent) |
| **Thread** (multiple messages, same conversation) | Per-message bullets + consolidated **Actions** section with attribution |
| **Batch** (unrelated emails) | Per-email bullets + **Triage** section (Act now / Reply needed / FYI / Noise) |

Noise comes in two flavors. **Scam NOISE** (invoice fraud / BEC, phishing, fake recruiter, fake interview, conference scam, crypto / MLM pitch) emits 2–4 bullets naming the specific red flags the reader should see — unfamiliar sender domain, fake forwarded approval chain, urgency + payment redirect, sender impersonation, date inconsistencies. **Other NOISE** (newsletters, auto-replies, automated system mail, generic outreach) collapses to a single labelled bullet. The skill will ask "single, thread, or batch?" if the input is ambiguous.

## Privacy

Where the skill runs determines the privacy surface:

| Surface | Where it executes | Who sees the email body |
|---|---|---|
| **Claude Code** (this plugin) | Your machine, your Anthropic account | You + Anthropic (your chosen Claude model) |
| **claude.ai custom Skill** | Anthropic's code-execution sandbox | Anthropic |
| **Claude API custom Skill** | Anthropic's workspace sandbox | Anthropic |

The **browser extension** and **Outlook add-in** are structurally different: they call the LLM provider directly from your browser using your own API key, so there is no FinAegis backend at all. If zero retention is a requirement, use those instead.

See the repo-root [PRIVACY.md](../../PRIVACY.md) and [SECURITY.md](../../SECURITY.md) for the full threat model.

## Keeping the skill in sync with the ClawHub version

The skill wording is load-bearing per the repo's [CLAUDE.md](../../CLAUDE.md) — any change to the extraction logic must update `apps/openclaw-skill/SKILL.md` and `apps/claude-skill/skills/defluff/SKILL.md` in the same commit. The two files should stay byte-identical below the frontmatter.
