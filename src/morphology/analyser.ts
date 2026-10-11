import { ui } from '../i18n';
import type { Token } from './types';

/**
 * The content-script side of the analyser in the offscreen document, shared
 * by every language it reads. Asking is async and subtitles change on a
 * frame timer, so each segmenter keeps the lines it has already analysed.
 */

export interface AnalyserStatus {
  ready: boolean;
  phase: string;
  percent: number;
  error: string | null;
}

/** Have the offscreen document load one of the analyser's dictionaries, downloading it the first time. */
export async function ensureAnalyser(dict: string): Promise<{ ok: boolean; error?: string }> {
  await chrome.runtime.sendMessage({ type: 'ensure-offscreen' });
  const res = (await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'load',
    dict,
  })) as { ok?: boolean; error?: string } | undefined;
  // No reply at all is a different fault from a refusal, and reporting it as
  // `undefined` is how it went unread for so long.
  if (!res) return { ok: false, error: ui.errors.noAnswer };
  return { ok: Boolean(res.ok), error: res.error };
}

export async function analyserStatus(): Promise<AnalyserStatus> {
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'status' })) as
    | AnalyserStatus
    | undefined;
  return res ?? { ready: false, phase: 'unavailable', percent: 0, error: null };
}

/** What the offscreen document answers a 'tokenize' with: the analyser's rows, as it read them. */
export interface Analysed<T> {
  ok?: boolean;
  tokens?: T[];
  /** False when the dictionary could not be consulted, so a retry may know more. */
  complete?: boolean;
  error?: string;
  /** A code for why not, where the offscreen document has one: the page words it. */
  reason?: string;
}

/** One line, analysed. Throws when the analyser cannot answer, so the caller can fall back for that line. */
export async function analyse<T>(text: string): Promise<Analysed<T> & { tokens: T[] }> {
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'tokenize', text })) as
    | Analysed<T>
    | undefined;
  if (!res) throw new Error(ui.errors.noAnswer);
  if (!res.ok || !res.tokens) {
    throw new Error(res.reason === 'analyserLoading' ? ui.errors.analyserLoading : res.error ?? 'tokenizer unavailable');
  }
  return res as Analysed<T> & { tokens: T[] };
}

/** The lines a segmenter has analysed, by their text — the same line is never analysed twice. */
export class LineCache {
  readonly #lines = new Map<string, Token[]>();

  get(text: string): Token[] | undefined {
    return this.#lines.get(text);
  }

  set(text: string, tokens: Token[]): void {
    // Bounded: a long film is a few thousand lines, and they are short.
    if (this.#lines.size > 4000) this.#lines.clear();
    this.#lines.set(text, tokens);
  }
}
