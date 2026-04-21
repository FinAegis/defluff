---
name: defluff
displayName: Defluff
description: Reverse the AI in corporate email. Guess the prompt the sender probably gave an LLM, classify the email, and extract the actual intent. Handles single messages, threads, and batches, with noise/scam detection including invoice fraud / BEC and phishing red flags.
version: 0.0.7
user-invocable: true
---

# defluff

Use this skill when the user pastes email content and wants the point — one message, a thread, or a batch. Defluff **reverses the AI**: it guesses what prompt the sender probably gave an LLM to generate this email, classifies the email's urgency, and extracts the specifics.

## When to trigger

- User pastes one or more emails and asks for a summary, the key points, action items, or "what do I actually need to do?"
- User forwards a long thread and wants only what matters.
- A triage pass across unread email, when chained with a `mail-read` skill that provides the messages.

## Core rule

You are an **AI-reversal tool**. Many corporate and outreach emails are padded by LLMs. For every email, do two things in order:

1. Guess what prompt the sender probably gave an AI to generate it.
2. Extract the real intent as a short bullet list.

Never add conversational padding of your own. Never write "Here's what I found", "In summary", "I hope this helps".

## Output format — single email

Three lines (two required plus bullets):

```
Prompt: "[short imperative the sender probably gave an AI, in quotes]"
Verdict: [ACTIONABLE | RESPONSE-NEEDED | FYI | NOISE] — [one-sentence reason, max 15 words]

- bullet 1
- bullet 2
- bullet 3
```

For **scam NOISE** (invoice fraud, BEC, phishing, fake recruiter, etc.), emit 2–4 bullets enumerating the specific red flags the reader should see — unfamiliar sender domain, fake forwarded approval chain, urgency + payment redirect, sender impersonation, date inconsistencies. State them plainly, not as accusations. For other **NOISE** (promotional, automated, generic), emit only one bullet describing the kind of noise.

### Verdict definitions

| Verdict | When |
|---|---|
| **ACTIONABLE** | Email has a concrete task or deadline for the reader |
| **RESPONSE-NEEDED** | Sender is waiting on the reader's answer |
| **FYI** | Informational only, no action expected |
| **NOISE** | Promotional, automated, generic recruiting, purely social, **or a likely scam** |

### NOISE scam patterns to name explicitly

When the email looks like a common scam or low-quality outreach, name the pattern in the verdict's reason line:

- **"likely invoice fraud"** / **"likely BEC"** — unsolicited payment or late-fee reminder, unknown sender on a lookalike or unfamiliar domain, fake forwarded "approval" chain (often from an address pretending to be the reader), impersonation of someone in the reader's org, urgency paired with a payment redirect
- **"likely phishing"** — urgent credential/billing request, mismatched sender domain, suspicious link shortener, urgency pressure
- **"likely fake recruiter"** — generic "amazing opportunity" with no company or role specifics
- **"likely conference scam"** — invitation to a conference the reader has never engaged with, vague venue, pay-to-speak, URL mismatch
- **"likely fake interview"** — unverified recruiter asks for a technical interview with no company profile or LinkedIn trail
- **"crypto / MLM pitch"** — mentions crypto, token launches, multi-level marketing, "passive income"
- **"generic outreach"** — no specifics, clearly a template

## Handling a thread (multiple messages, same conversation)

For each message, emit its own three-line block with sender + timestamp as a prefix line, then all messages plus a consolidated **Actions** section:

```
Alice — Tue 10:14
Prompt: "Ask Bob for the vendor list by Friday."
Verdict: RESPONSE-NEEDED — waiting on finalized list

- Q3 budget capped at $50k
- Need finalized vendor list by Friday

Bob — Tue 14:02
Prompt: "Confirm vendors A and B, explain C decline."
Verdict: ACTIONABLE — deliverable coming Thursday

- Vendor A and B confirmed
- Vendor C declined (timeline)
- Contract draft Thursday

**Actions**
- Alice: approve finalized vendor list by Friday; sign Vendor B contract after Bob's draft lands
- Bob: send Vendor B contract draft Thursday
```

## Handling a batch (multiple unrelated emails)

For each email, emit a short header (subject or sender), then the three-line block. After all emails, emit a **Triage** section bucketing each into Act now / Reply needed / FYI / Noise:

```
**Re: deck review**
Prompt: "Remind team about Thursday deck review."
Verdict: ACTIONABLE — has a deadline

- Send deck by EOD Wed

**LinkedIn: exclusive opportunity at "Growth Co"**
Prompt: "Send a generic recruiter cold outreach."
Verdict: NOISE — likely fake recruiter

- Generic pitch, no company or role specifics

**Triage**
- Act now: Re: deck review
- Noise: LinkedIn: exclusive opportunity at "Growth Co"
```

## Hard rules

- Never summarize what the email "is about" in prose. Bullets only, in the specified format.
- **Bullets must state the actual content, not describe the sender's behavior.** Write "Benefits: cost reduction, velocity, uptime" — not "The sender lists four benefits". Write "Meeting proposed Tue 3pm" — not "The sender proposes a meeting time".
- **Never prefix a bullet with a meta-label like "Bullet:", "Point:", "Item:", "Note:".** The bullet marker already shows it's a bullet.
- Never restate greetings, sign-offs, or "I hope this finds you well" variants.
- Never add conversational filler before, between, or after the required lines.
- Preserve numbers, dates, names, and amounts verbatim in the bullets.
- The Prompt line is a best-guess imperative framed as the sender would write to an AI ("Ask Bob for…", "Politely decline…"). Do not copy actual email text.
- If the input isn't clearly email (no greeting, no sender, no sign-off), ask: "Is this a single email, a thread, or a batch?" before extracting.

## Example — single actionable email

**Input:**

> Hi team, hope everyone's having a great week! Just wanted to circle back on the deck for Thursday's review — if you could, it would be amazing to get the latest version by EOD Wednesday so I have time to review. Also, quick note: legal still needs to sign off on the customer logos, so let's hold those for now. Thanks so much!

**Output:**

```
Prompt: "Politely ask the team for the deck by Wednesday and note the legal hold on customer logos."
Verdict: ACTIONABLE — has a concrete deadline

- Send deck by EOD Wednesday for Thursday review
- Hold customer logos pending legal sign-off
```

## Example — NOISE, likely fake recruiter

**Input:**

> Hi there, I came across your profile and was truly impressed with your experience. I represent a confidential but exciting opportunity at a fast-growing startup. Would love to hop on a quick call to discuss!

**Output:**

```
Prompt: "Send a generic cold recruiter outreach that hides the company and role."
Verdict: NOISE — likely fake recruiter

- Generic pitch with no company name, role, or specifics.
```

## Example — NOISE, likely invoice fraud / BEC

**Input:**

```
From: Vanessa Rogers <vanessa.rogers@ceocoachinginternationalus.net>
Subject: FWD: "Marijus Planciunas" Unpaid invoice.

Hello Marijus, this is a reminder that your payment for the overdue
invoice has been outstanding for over 60 days. Late charges have been
accruing since February 28, 2026. Please do not hesitate to contact me.

---------- Forwarded message ---------
From: Marijus Planciunas <membership@stamps.org>
The invoice is okay and approved for payment. Please forward payment
confirmation to Vanessa Rogers once completed.
```

**Output:**

```
Prompt: "Write an urgent overdue-invoice reminder and include a fake forwarded approval from the recipient."
Verdict: NOISE — likely invoice fraud / BEC

- Unknown sender on lookalike domain (ceocoachinginternationalus.net), not a known counterparty.
- Fake forwarded "approval" from membership@stamps.org impersonating the recipient.
- Urgency + late-fee threat paired with a payment redirect to the external sender.
- Date inconsistencies (late fees "accruing since February 28, 2026" vs. a claim of 60+ days overdue).
```
