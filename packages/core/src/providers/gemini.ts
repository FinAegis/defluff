import { codeFromStatus, DefluffError } from '../errors.js';
import type { GeminiConfig, ProviderAdapter, ProviderRunArgs } from '../types.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { code?: number; message?: string; status?: string };
}

export const geminiAdapter: ProviderAdapter<GeminiConfig> = {
  async run(config, args) {
    const model = config.model ?? DEFAULT_MODEL;
    const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    const body = {
      systemInstruction: { parts: [{ text: args.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: args.userPrompt }] }],
      generationConfig: { maxOutputTokens: 512 },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        ...(args.signal ? { signal: args.signal } : {}),
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        throw new DefluffError('aborted', 'Request aborted', { cause });
      }
      throw new DefluffError('network', 'Network request to Gemini failed', { cause });
    }

    const json = (await response.json().catch(() => ({}))) as GeminiResponse;

    if (!response.ok) {
      throw new DefluffError(
        codeFromStatus(response.status),
        json.error?.message ?? `Gemini request failed: ${response.status}`,
        { status: response.status, detail: json.error },
      );
    }

    const text = json.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    if (!text) {
      throw new DefluffError('server', 'Gemini response contained no text part', { detail: json });
    }
    return text;
  },
};
