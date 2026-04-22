import type { DefluffErrorCode, Summary, ThreadMessage, ThreadSummary } from '@defluff/core';

export const MSG_SUMMARIZE = 'summarize' as const;
export const MSG_SUMMARIZE_THREAD = 'summarize_thread' as const;
export const MSG_GENERATE_BAIT = 'generate_bait' as const;
export const MSG_TRIGGER_ACTIVE = 'trigger_active' as const;
export const MSG_OPEN_OPTIONS = 'open_options' as const;

export interface SummarizeRequest {
  type: typeof MSG_SUMMARIZE;
  text: string;
}

export interface SummarizeThreadRequest {
  type: typeof MSG_SUMMARIZE_THREAD;
  messages: ThreadMessage[];
}

export interface GenerateBaitRequest {
  type: typeof MSG_GENERATE_BAIT;
  messages: ThreadMessage[];
}

export interface TriggerActiveRequest {
  type: typeof MSG_TRIGGER_ACTIVE;
}

export interface OpenOptionsRequest {
  type: typeof MSG_OPEN_OPTIONS;
}

export type AppRequest =
  | SummarizeRequest
  | SummarizeThreadRequest
  | GenerateBaitRequest
  | TriggerActiveRequest
  | OpenOptionsRequest;

export type SummarizeResponse =
  | { ok: true; summary: Summary }
  | { ok: false; error: string; code?: DefluffErrorCode };

export type SummarizeThreadResponse =
  | { ok: true; thread: ThreadSummary }
  | { ok: false; error: string; code?: DefluffErrorCode };

export type GenerateBaitResponse =
  | { ok: true; text: string }
  | { ok: false; error: string; code?: DefluffErrorCode };
