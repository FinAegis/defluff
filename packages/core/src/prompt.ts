/**
 * The exact extraction prompt is load-bearing. Do not soften, expand, or rephrase
 * without updating requirements.md §4.4 — this wording is what keeps the output
 * terse and fluff-free. Loosening it reintroduces the padding the product exists
 * to remove.
 */
export const SYSTEM_PROMPT =
  'You are an extraction tool. Analyze the following email. Strip away all ' +
  'pleasantries, corporate jargon, and likely AI-generated padding. Output only ' +
  "the core facts, the sender's underlying intent, and any specific action items " +
  'or questions requested. Format strictly as a concise, 3-5 bullet point list. ' +
  'Do not add conversational filler.';

export function buildUserPrompt(emailText: string): string {
  return `<email>\n${emailText.trim()}\n</email>`;
}
