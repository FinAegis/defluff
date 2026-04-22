## Technical Specification: "De-Fluff AI" Email Assistant

### 1. Product Overview
* **Objective:** To provide an inline tool that analyzes incoming, heavily padded emails, detects likely AI-generated fluff, and extracts the core human intent, facts, and action items into a scannable bulleted list.
* **Target Platforms:** Google Workspace (Gmail Web) and Microsoft 365 (Outlook Web + Modern Outlook Desktop).

### 2. Architecture & Deployment Strategy

To reach the widest audience with the best user experience, the product requires two separate client-side applications connecting to a unified backend.

#### A. Browser Extension (Chrome, Edge, Firefox)
* **Use Case:** Users accessing Gmail or Outlook via their web browser.
* **Mechanism:** The extension injects content scripts into the DOM (Document Object Model) of `mail.google.com` and the Outlook Web origins (`outlook.office.com`, `outlook.office365.com`, `outlook.live.com`, `outlook.cloud.microsoft`).
* **UI Integration:** It places a small, native-looking "De-fluff" button next to the standard "Reply" or "Forward" buttons inside the email viewing pane.

#### B. Outlook Web Add-in
* **Use Case:** Corporate users running the Outlook Desktop application (Windows/Mac).
* **Mechanism:** Built using the Office JavaScript API (`Office.js`). Microsoft is actively deprecating old COM/VSTO add-ins; the modern architecture uses a manifest file that loads a sandboxed web view inside the desktop app. 
* **UI Integration:** Adds a "De-Fluff" button to the Outlook Ribbon and an interactive Task Pane alongside the reading window.

### 3. Core Tech Stack

* **Frontend (Browser Extension):** React or Vue.js, bundled with Webpack or Vite. 
* **Frontend (Outlook Add-in):** HTML/CSS/JavaScript with the `@microsoft/office-js` library.
* **Backend Server:** Node.js with Express (or Python/FastAPI, which is often preferred for AI-heavy workflows). Deployed on AWS or Vercel.
* **AI/LLM Layer:** OpenAI API (GPT-4o mini) or Anthropic API (Claude 3.5 Haiku). You need a fast, low-latency model optimized for summarization and intent extraction, rather than complex creative writing.

### 4. Data Flow & Processing Logic

1.  **Trigger:** User opens an email and clicks the "De-Fluff" button.
2.  **Extraction:** The client grabs the `innerText` of the email body, stripping away HTML formatting, signatures, and tracking pixels.
3.  **Transmission:** The raw text is sent securely to your backend via an HTTPS POST request.
4.  **LLM Processing:** The backend (or, in the current architecture, the client) feeds the text into the LLM with a highly restrictive system prompt that does the *reversal* the product is named for. The authoritative prompt lives in `packages/core/src/prompt.ts`. In summary, it instructs the model to produce four things in order:

    1. **Authored line** — `Authored: [AI | AI-assisted | human] — reasoning` — the model's classification of who wrote the email, citing 1-2 concrete visible signals. This replaces the old always-on "they probably asked an AI" framing: when the email is plainly human-written, the tool must say so rather than invent a prompt to reverse.
    2. **Prompt line** — `Prompt: "..."` — the model's best guess at the imperative the sender probably gave an AI. Emitted **only when Authored is AI or AI-assisted**. Omitted entirely for human-authored emails (no prompt to reverse; no placeholder, no empty quotes).
    3. **Verdict line** — `Verdict: [ACTIONABLE | RESPONSE-NEEDED | FYI | NOISE] — reason` — classifies the email's urgency. NOISE covers promotional, automated, generic recruiting, AND likely scam patterns — including invoice fraud / BEC (lookalike sender domain, fake forwarded approval chain, urgent payment request), phishing, fake recruiters, fake interviews, fake conferences, crypto/MLM pitches, crypto/Web3 pitches (kitchen-sink Web3 projects offering a C-level role to a stranger with zero stage/funding/comp detail), and generic "amazing opportunity" outreach. The reason line names the specific pattern (e.g., "likely invoice fraud", "likely phishing", "crypto / Web3 pitch"). A polite reader reply does not launder a scam into legitimacy — per-message verdicts are independent of how the conversation continued.
    4. **Specifics** — a concise 3–5 bullet list of the actual facts, questions, and action items. For scam NOISE, 2–4 bullets enumerating the specific red flags the reader should see (unfamiliar sender domain, fake forwarded approval, urgency + payment redirect, etc.). For other NOISE, a single bullet identifying the pattern.

    The **output language mirrors the input email**: if the email is in French, the Authored reasoning, the Prompt quote, the Verdict reason, and every bullet must be in French. Same for German, Spanish, Lithuanian, Japanese, etc. The literal line labels (`Authored:`, `Prompt:`, `Verdict:`) and the token values (`AI`, `AI-assisted`, `human`, `ACTIONABLE`, `RESPONSE-NEEDED`, `FYI`, `NOISE`) stay English regardless of input language — parsers match them case-sensitively.

    The prompt is load-bearing: loosening its restrictive framing is how the output regains the fluff we're stripping. Changes to the wording require updating this section, `packages/core/src/prompt.ts`, **and both skill files** (`apps/openclaw-skill/SKILL.md`, `apps/claude-skill/skills/defluff/SKILL.md`) in the same commit.
5.  **Return & Display:** The backend sends the bulleted JSON/Markdown back to the client.
6.  **UI Update:** The client visually collapses the original long email and overlays the clean, bulleted summary. A "Show Original" toggle is provided to restore the full text.

### 5. Security & Privacy (The Dealbreaker)

Email is highly sensitive. If this tool looks like it is harvesting corporate data, enterprise users will ban it instantly. 
* **Zero-Retention Policy:** Your backend must only act as a passthrough. Once the LLM returns the summary, the backend must immediately discard the source text. No emails are saved to your database.
* **Permissions:** For the Chrome extension, limit permissions strictly to `activeTab` or the specific mail URLs. Avoid requesting global `<all_urls>` permission, which raises red flags during Chrome Web Store reviews.
* **AI models:** It should support connecting to all major AI models (like Claude, OpenAI, Gemini), but also connect to models running locally, and optionally Openclaw. We should also consider creating a skill for Openclaw!
