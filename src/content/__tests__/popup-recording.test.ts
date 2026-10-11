import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Spoken } from '../../audio/pronounce';

/**
 * The lookup card's Pronounce button and the recording it plays: which word
 * it asks for, and the credit a free recording is owed where it is played.
 */

const audio = vi.hoisted(() => ({
  asked: [] as unknown[][],
  spoken: { source: 'synthesis', human: false } as Spoken,
}));

vi.mock('../../audio/pronounce', async (original) => ({
  ...await original<typeof import('../../audio/pronounce')>(),
  pronounce: async (...args: unknown[]): Promise<Spoken> => {
    audio.asked.push(args);
    return audio.spoken;
  },
}));

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: { sendMessage: async () => ({}) },
});

import { closePopup, draftFor, showPopup } from '../popup';
import type { LookupResult } from '../../dict/client';

const entry = (word: string, reading: string, more: Record<string, unknown> = {}): LookupResult => ({
  state: 'ok',
  entries: [{ id: '1', word, reading, common: true, senses: [{ pos: ['n'], glosses: ['house'] }], ...more }],
});

function open(result: LookupResult, lang: string, surface: string): ShadowRoot {
  const mount = document.createElement('div');
  const anchor = document.createElement('span');
  mount.appendChild(anchor);
  document.body.appendChild(mount);
  showPopup(mount, anchor, result, {
    token: { surface, start: 0, end: surface.length },
    sentence: surface,
    status: 'unknown',
    lang,
    onMark: () => {},
    onAddCard: async () => 'added',
  });
  return document.querySelector('.libregaku-popup')!.shadowRoot!;
}

/** Press Pronounce, the first button under the word, and let it answer. */
async function pronounce(card: ShadowRoot): Promise<void> {
  card.querySelector<HTMLButtonElement>('.tools .tb')!.click();
  await new Promise((r) => setTimeout(r, 0));
}

const credit = (card: ShadowRoot): HTMLAnchorElement => card.querySelector<HTMLAnchorElement>('a.credit')!;

afterEach(() => {
  closePopup();
  document.body.replaceChildren();
  audio.asked = [];
  audio.spoken = { source: 'synthesis', human: false };
});

describe('the recording a word is said with', () => {
  it('is credited under the buttons: its speaker and licence, linked to its page', async () => {
    audio.spoken = {
      source: 'commons', human: true,
      credit: { by: 'Julie Samothrace', licence: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-Julie_Samothrace-casa.wav' },
    };
    const card = open(entry('casa', ''), 'es', 'casa');
    // Nothing to credit until something has played.
    expect(credit(card).hidden).toBe(true);

    await pronounce(card);
    const line = credit(card);
    expect(line.hidden).toBe(false);
    expect(line.textContent).toBe('Recording by Julie Samothrace · CC BY-SA 4.0');
    expect(line.href).toBe('https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-Julie_Samothrace-casa.wav');
    // A link out of the video's page: a new tab, and nothing handed to it.
    expect(line.target).toBe('_blank');
    expect(line.rel).toBe('noopener noreferrer');
    // Right under the buttons, above everything that scrolls.
    expect(line.previousElementSibling?.className).toBe('tools');
    expect(card.querySelector('.toast')?.textContent).toBe('casa · recording');
  });

  it('has no credit line for the browser\'s voice, or for a recording that names no one', async () => {
    const card = open(entry('casa', ''), 'es', 'casa');
    await pronounce(card);
    expect(credit(card).hidden).toBe(true);
    expect(card.querySelector('.toast')?.textContent).toBe('casa · synthesised');

    audio.spoken = { source: 'jpod101', human: true };
    await pronounce(card);
    expect(credit(card).hidden).toBe(true);
  });

  it('takes the last credit away when the next press plays something else', async () => {
    audio.spoken = { source: 'audio-cmn', human: true, credit: { by: 'Yue Tan', licence: 'CC BY-SA 3.0 US', page: 'https://github.com/hugolpz/audio-cmn#license' } };
    const card = open(entry('学生', 'xué shēng'), 'zh', '学生');
    await pronounce(card);
    expect(credit(card).textContent).toBe('Recording by Yue Tan · CC BY-SA 3.0 US');

    audio.spoken = { source: 'synthesis', human: false };
    await pronounce(card);
    expect(credit(card).hidden).toBe(true);
  });

  it("is asked for by the dictionary's word in the language being learned, and by its other script", async () => {
    // Traditional subtitles: the entry was reached by 醫生, and is filed under 医生 too.
    const card = open(entry('醫生', 'yī shēng', { alt: '医生' }), 'zh', '醫生');
    await pronounce(card);
    expect(audio.asked).toEqual([['醫生', 'yī shēng', 'zh', ['医生']]]);

    closePopup();
    audio.asked = [];
    await pronounce(open(entry('casa', ''), 'es', 'casas'));
    // The headword, not the form on screen; a word written one way has no other.
    expect(audio.asked).toEqual([['casa', '', 'es', []]]);
  });
});

describe('the card a lookup makes', () => {
  it("carries the word's other script, for the recording that goes on it", () => {
    const token = { surface: '醫生', start: 0, end: 2 };
    expect(draftFor(entry('醫生', 'yī shēng', { alt: '医生' }), token, '他是醫生。')).toEqual({
      expression: '醫生', reading: 'yī shēng', meaning: 'house', sentence: '他是醫生。', alt: '医生',
    });
    // And says nothing of one for a word written one way.
    expect(draftFor(entry('casa', ''), { surface: 'casa', start: 0, end: 4 }, 'Mi casa.')).toEqual({
      expression: 'casa', reading: '', meaning: 'house', sentence: 'Mi casa.',
    });
  });
});
