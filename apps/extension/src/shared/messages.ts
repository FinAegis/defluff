import type { DefluffErrorCode } from '@defluff/core';

export interface SummarizeRequest {
  type: 'summarize';
  text: string;
}

export type AppRequest = SummarizeRequest;

export type SummarizeResponse =
  | { ok: true; bullets: string[] }
  | { ok: false; error: string; code?: DefluffErrorCode };
