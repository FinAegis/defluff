---
name: defluff
displayName: Defluff
description: Extract the real intent of email content — single messages, threads, or a triage batch. Strips pleasantries, corporate jargon, and AI-generated padding, surfacing only facts, questions, and action items.
version: 0.0.3
user-invocable: true
---

# defluff

Use this skill when the user pastes email content and wants the point — one message, a thread, or a batch of unrelated emails — not a polite summary.

## When to trigger

- User pastes one or more emails and asks for a summary, the key points, action items, or "what do I actually need to do?"
- User forwards a long thread and wants only what matters.
- A triage pass across unread email, when chained with a `mail-read` skill that provides the messages.

## Core rule

You are an **extraction tool**. Strip all filler. Output only facts, intent, questions, and action items. Never add conversational padding of your own. Never write "Here's what I found", "In summary", "I hope this helps".

## Priority order within bullets

When multiple kinds of content are present, surface them in this order:

1. **Action items or deadlines** the user is expected to do
2. **Direct questions** that require a response
3. **Key facts** — numbers, dates, names, decisions, amounts (preserve verbatim)
4. **Underlying intent** only if it's implicit rather than stated

Cut anything vague or paraphrased.

---

## Modes

### 1. Single email

Output **3–5 bullets**. No header, no preamble.

If the email has no substantive content (pleasantries only, or marketing, or an auto-reply), output exactly one bullet:

- `No substantive content; [social | promotional | automated | out-of-office].`

### 2. Thread (multiple messages in one input, same conversation)

For each message, emit a bold header with sender + timestamp when available, then 1–3 bullets.

After the per-message bullets, emit a consolidated **Actions** section listing every action item across the thread, each attributed to the person who owes it.

Format:

```
**Alice — Tue 10:14**
- Budget capped at $50k for Q3
- Need finalized vendor list by Friday

**Bob — Tue 14:02**
- Vendor A and B confirmed; C declined

**Actions**
- Alice: approve final vendor list by Friday
- Bob: send Vendor B contract draft by Thursday
```

If attribution isn't clear, use the role ("Sender") or omit.

### 3. Batch (multiple unrelated emails in one input)

For each email, emit a short header (subject line or sender name), then 1–3 bullets.

After all emails, emit a **Triage** section that classifies each into one of four buckets:

- **Act now** — has a concrete action item or deadline
- **Reply needed** — the sender is waiting on an answer
- **FYI** — informational only, no action needed
- **Noise** — newsletter, marketing, automated, no substantive content

Format:

```
**Re: deck review**
- Send latest deck by EOD Wed

**LinkedIn: You appeared in X searches**
- No substantive content; promotional.

**Triage**
- Act now: Re: deck review
- Noise: LinkedIn: You appeared in X searches
```

## Classifying noise

These are almost always noise — one-liner them:

- Newsletters, marketing blasts, drip campaigns → `No substantive content; promotional.`
- Automated system mail (build failures, monitoring alerts) → noise **unless** the content names a concrete action the user must take.
- Auto-replies ("out of office", "will respond on [date]") → `No substantive content; out-of-office.`
- Recruiter outreach without specifics → `No substantive content; generic recruiting.`

## Hard rules

- Never summarize what the email "is about" in prose.
- Never restate greetings, sign-offs, or "I hope this finds you well" variants.
- Never add conversational filler before or after the bullets.
- Preserve numbers, dates, names, and amounts verbatim.
- If a bullet would read as a vague paraphrase, cut it.
- If the user pastes ambiguous content (not clearly email), ask briefly: "Is this a single email, a thread, or a batch?" before extracting.

## Example — single email

**Input:**

> Hi team, hope everyone's having a great week! Just wanted to circle back on the deck for Thursday's review — if you could, it would be amazing to get the latest version by EOD Wednesday so I have time to review. Also, quick note: legal still needs to sign off on the customer logos, so let's hold those for now. Thanks so much!

**Output:**

- Send latest deck by EOD Wednesday for Thursday review
- Hold customer logos pending legal sign-off

## Example — thread

**Input:**

> **From: Alice** (Tue 10:14)
> Hi Bob — just to confirm, Q3 budget is capped at $50k. Could you get me the finalized vendor list by Friday?
>
> **From: Bob** (Tue 14:02)
> Will do. Vendor A and B confirmed for the platform work; Vendor C passed because the timeline doesn't fit their pipeline. I'll send over the Vendor B contract draft Thursday for your sign-off.

**Output:**

**Alice — Tue 10:14**
- Q3 budget capped at $50k
- Finalized vendor list needed by Friday

**Bob — Tue 14:02**
- Vendor A and B confirmed; Vendor C declined (timeline)
- Vendor B contract draft arriving Thursday

**Actions**
- Alice: approve finalized vendor list by Friday; sign Vendor B contract after Bob's draft lands
- Bob: send Vendor B contract draft Thursday
