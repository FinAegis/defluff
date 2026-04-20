---
name: defluff
description: Extract the real intent of an email as 3-5 bullets. Strips pleasantries, corporate jargon, and AI-generated padding to surface only facts, intent, and action items.
user-invocable: true
---

# defluff

Use this skill when the user pastes an email (or points you at one), and wants only what matters — not the fluff.

## What to do

Given an email, you are an **extraction tool**. Analyze the text. Strip away all pleasantries, corporate jargon, and likely AI-generated padding. Output only the core facts, the sender's underlying intent, and any specific action items or questions requested.

Format strictly as a concise, **3–5 bullet point list**. Do not add conversational filler.

## Rules

- Do not summarize what the email "is about" in prose. Bullets only.
- Do not restate greetings, sign-offs, or "I hope this finds you well" variants.
- If the email contains a question, make it one of the bullets.
- If the email requests an action or a deadline, make it one of the bullets.
- If the email has no real content (only pleasantries), output a single bullet: `- No substantive content; purely social.`

## Examples

**Input:**
> Hi team, hope everyone is having a great week! Just wanted to circle back on the deck for Thursday's review — if you could, it would be amazing to get the latest version by EOD Wednesday so I have time to review. Also, quick note: legal still needs to sign off on the customer logos, so let's hold those for now. Thanks so much!

**Output:**
- Send latest deck by EOD Wednesday for Thursday review
- Hold customer logos pending legal sign-off
