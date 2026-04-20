import type { DefluffErrorCode } from '@defluff/core';

export const MSG_SUMMARIZE = 'summarize' as const;

export interface SummarizeRequest {
  type: typeof MSG_SUMMARIZE;
  text: string;
}

export type AppRequest = SummarizeRequest;

export type SummarizeResponse =
  | { ok: true; bullets: string[] }
  | { ok: false; error: string; code?: DefluffErrorCode };
