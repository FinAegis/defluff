# @defluff/openclaw-skill

An [Openclaw](https://openclaw.ai) skill that extracts the actual intent of an email into 3–5 bullets, using the same fixed prompt wording as the browser extension and Outlook add-in.

The skill is pure markdown + YAML — no executable code. Openclaw's configured agent follows the instructions in `SKILL.md` using whatever model the user has set up locally.

## Install

From the Openclaw CLI:

```bash
# copy into your local skills directory
mkdir -p ~/.openclaw/workspace/skills/defluff
cp SKILL.md ~/.openclaw/workspace/skills/defluff/
```

Or publish to ClawHub:

```bash
# from this directory
clawhub publish
```

See the [Openclaw skills docs](https://docs.openclaw.ai/tools/skills) for details on discovery and updates.

## Usage

Once installed, invoke with a chat prompt like:

> /defluff [paste email here]

Or (with `user-invocable: true`, which is set in the frontmatter) as a slash command in Openclaw's chat interface.
