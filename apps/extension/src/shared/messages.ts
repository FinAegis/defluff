import type { DefluffErrorCode } from '@defluff/core';

export const MSG_SUMMARIZE = 'summarize' as const;
export const MSG_TRIGGER_ACTIVE = 'trigger_active' as const;
export const MSG_OPEN_OPTIONS = 'open_options' as const;

export interface SummarizeRequest {
  type: typeof MSG_SUMMARIZE;
  text: string;
}

export interface TriggerActiveRequest {
  type: typeof MSG_TRIGGER_ACTIVE;
}

export interface OpenOptionsRequest {
  type: typeof MSG_OPEN_OPTIONS;
}

export type AppRequest = SummarizeRequest | TriggerActiveRequest | OpenOptionsRequest;

export type SummarizeResponse =
  | { ok: true; bullets: string[] }
  | { ok: false; error: string; code?: DefluffErrorCode };
