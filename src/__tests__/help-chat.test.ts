import { afterEach, describe, expect, it, vi } from 'vitest';
import { HELP_EN } from '../help/content';
import {
  answerLanguage, chatState, docsFrom, mountChat, nearest, promptFor, relevant, settingsDocsFrom, wordsOf, type ModelApi,
} from '../help-chat';
import { buildSettings } from '../content/settings-panel';
import { DEFAULTS, settings } from '../settings';
import { ui } from '../i18n';

// What the settings page reaches for when it is built: Anki, which is not there, and storage.
vi.mock('../anki/client', () => ({
  probe: async () => ({ kind: 'offline' }),
  browseOurCards: async () => {},
  createDeck: async () => {},
}));
vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: { getURL: (p: string) => `chrome-extension://testid/${p}` },
});

/**
 * Ask the help: shown only where the browser's model is ready, offered where
 * it can be had, and absent otherwise. The model answers from the few topics
 * nearest the question, and not at all when none is.
 */

type Have = Awaited<ReturnType<ModelApi['availability']>>;

function fakeApi(have: Have, reply = ['Turn it off ', 'in Settings.']): ModelApi & { prompts: string[]; create: ReturnType<typeof vi.fn> } {
  const prompts: string[] = [];
  const create = vi.fn(async () => ({
    promptStreaming: (input: string) => {
      prompts.push(input);
      return new ReadableStream<string>({
        start(c) {
          for (const piece of reply) c.enqueue(piece);
          c.close();
        },
      });
    },
    destroy: vi.fn(),
  }));
  return { availability: async () => have, create, prompts } as unknown as ModelApi & { prompts: string[]; create: ReturnType<typeof vi.fn> };
}

const brands = (names: string[]): void => {
  Object.defineProperty(navigator, 'userAgentData', { value: { brands: names.map((brand) => ({ brand })) }, configurable: true });
};

afterEach(() => {
  delete (globalThis as { LanguageModel?: unknown }).LanguageModel;
  Object.defineProperty(navigator, 'userAgentData', { value: undefined, configurable: true });
  document.body.replaceChildren();
});

describe('which of the box and the callout shows', () => {
  it('is the box where the model is ready', async () => {
    expect(await chatState(fakeApi('available'), 'en')).toBe('ready');
  });

  it('is the download where the model can be had, started or not', async () => {
    expect(await chatState(fakeApi('downloadable'), 'en')).toBe('download');
    expect(await chatState(fakeApi('downloading'), 'en')).toBe('download');
  });

  it('is nothing where the device cannot run it, or the check fails', async () => {
    expect(await chatState(fakeApi('unavailable'), 'en')).toBe('none');
    brands(['Chromium', 'Brave']);
    expect(await chatState(fakeApi('unavailable'), 'en')).toBe('none');
    const broken = { availability: async () => { throw new Error('no'); }, create: vi.fn() } as unknown as ModelApi;
    expect(await chatState(broken, 'en')).toBe('none');
  });

  it('asks Chrome to update where it has no model API, and other browsers for nothing', async () => {
    brands(['Chromium', 'Google Chrome']);
    expect(await chatState(undefined, 'en')).toBe('update');
    brands(['Chromium', 'Microsoft Edge']);
    expect(await chatState(undefined, 'en')).toBe('none');
  });
});

describe('the language of the answer', () => {
  it('is the learner\'s own where the model answers in it, and none where not', () => {
    expect(answerLanguage('en')).toBe('en');
    expect(answerLanguage('ja')).toBe('ja');
    expect(answerLanguage('es')).toBe('es');
    expect(answerLanguage('de')).toBeNull();
    expect(answerLanguage('zh')).toBeNull();
  });
});

describe('finding what a question is about', () => {
  const settingsDocs = settingsDocsFrom(buildSettings(() => {}), settings(), DEFAULTS);
  const docs = docsFrom(HELP_EN, settingsDocs);

  it('reads the help as topics, then the settings', () => {
    expect(docs.length).toBe(HELP_EN.chapters.flatMap((c) => c.topics).length + settingsDocs.length);
    // The marks are off: no backticks, braces or link addresses in what the model reads.
    expect(docs.some((d) => /[`{}]|\]\(/.test(d.text))).toBe(false);
  });

  it('says of each setting where it is, what it offers, and what it is set to', () => {
    const ruby = settingsDocs.find((d) => d.title.startsWith('Setting: Furigana'))!;
    expect(ruby.title).toMatch(/\(Settings → /);
    expect(ruby.text).toMatch(/Found at: Settings → .+ → Furigana\./);
    expect(ruby.text).toMatch(/Choices: .+\./);
    expect(ruby.text).toMatch(/Now: .+ Starts as: .+\./);
    const underline = settingsDocs.find((d) => d.title.startsWith('Setting: Underline words'))!;
    expect(underline.text).toContain('A switch. Now: on. Starts as: on.');
    // A long list (every language) is named by its setting, not listed.
    const native = settingsDocs.find((d) => d.title.startsWith('Setting: Your language'));
    if (native) expect(native.text).not.toContain('Choices:');
  });

  it('drops the words every question has, and stems the rest', () => {
    const words = wordsOf('How can I turn off underlines?');
    expect(words).toContain('underlines');
    // The stem is in "underline" and "underlines" both.
    expect(words).toContain('underlin');
    expect(words).not.toContain('how');
  });

  it('breaks a language without spaces into pairs of characters', () => {
    expect(wordsOf('下線を消すには')).toEqual(expect.arrayContaining(['下線', '線を', '消す']));
  });

  it('answers a question about nothing in particular from the help\'s opening topics', () => {
    expect(wordsOf('What can you do?')).toEqual([]);
    const near = relevant(docs, 'What can you do?');
    expect(near.map((d) => d.title)).toEqual(docs.slice(0, 3).map((d) => d.title));
    expect(near.length).toBe(3);
    // A question with words in it still goes by them, and finds nothing where the help has none.
    expect(relevant(docs, 'qzxv wvkq')).toEqual([]);
  });

  it('puts the topic about it first', () => {
    const near = nearest(docs, 'How do I underline known words?');
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThanOrEqual(4);
    expect(near.some((d) => /known/i.test(d.title))).toBe(true);
  });

  it('finds nothing near a question about something else', () => {
    expect(nearest(docs, 'qzxv wvkq')).toEqual([]);
  });

  it('puts only what is near into the prompt, with the question after it', () => {
    const prompt = promptFor('why?', [{ title: 'T', text: 'x'.repeat(5000), keywords: '' }]);
    expect(prompt.startsWith('Help text:')).toBe(true);
    expect(prompt.length).toBeLessThan(1700);
    expect(prompt.endsWith('Question: why?')).toBe(true);
  });
});

describe('the chat on the help page', () => {
  const host = (): HTMLElement => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
  };
  const settle = async (): Promise<void> => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
  };

  it('answers from the help, as the answer arrives, and says who gave it', async () => {
    const api = fakeApi('available');
    (globalThis as { LanguageModel?: unknown }).LanguageModel = api;
    const el = host();
    expect(await mountChat(el, HELP_EN, 'en')).toBe('ready');
    const input = el.querySelector<HTMLInputElement>('.ask-input')!;
    input.value = 'How do I underline known words?';
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(el.querySelector('.ask-answer')!.textContent).toBe('Turn it off in Settings.');
    expect(el.querySelector<HTMLElement>('.ask-note')!.hidden).toBe(false);
    expect(api.prompts[0]).toContain('Question: How do I underline known words?');
    expect(api.prompts[0]).toContain('Help text:');
  });

  it('answers "What can you do?" from the help rather than turning it away', async () => {
    const api = fakeApi('available');
    (globalThis as { LanguageModel?: unknown }).LanguageModel = api;
    const el = host();
    await mountChat(el, HELP_EN, 'en');
    el.querySelector<HTMLInputElement>('.ask-input')!.value = 'What can you do?';
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(el.querySelector('.ask-answer')!.textContent).toBe('Turn it off in Settings.');
    expect(api.prompts[0]).toContain(`## ${HELP_EN.chapters[0]!.topics[0]!.title}`);
  });

  it('says the help does not, and asks nothing of the model, when nothing is near', async () => {
    const api = fakeApi('available');
    (globalThis as { LanguageModel?: unknown }).LanguageModel = api;
    const el = host();
    await mountChat(el, HELP_EN, 'en');
    el.querySelector<HTMLInputElement>('.ask-input')!.value = 'qzxv wvkq';
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
    expect(el.querySelector('.ask-answer')!.textContent).toBe(ui.helpChat.noMatch);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('offers the download, shows its progress, and swaps in the box when it is done', async () => {
    const api = fakeApi('downloadable');
    let progress: ((e: Event) => void) | undefined;
    api.create.mockImplementationOnce(async (options: { monitor?: (m: EventTarget) => void }) => {
      const target = new EventTarget();
      options.monitor?.(target);
      progress = (e) => target.dispatchEvent(e);
      return { promptStreaming: vi.fn(), destroy: vi.fn() };
    });
    (globalThis as { LanguageModel?: unknown }).LanguageModel = api;
    const el = host();
    expect(await mountChat(el, HELP_EN, 'en')).toBe('download');
    expect(el.querySelector('.ask-input')).toBeNull();
    expect(el.querySelector('.callout')!.textContent).toContain('Gemini Nano');
    const link = el.querySelector<HTMLAnchorElement>('a.ask-more')!;
    expect(link.href).toMatch(/^https:\/\/developer\.chrome\.com\//);
    el.querySelector<HTMLButtonElement>('button.ask-send')!.click();
    expect(el.querySelector('.ask-status')!.textContent).toBe('Downloading… 0%');
    const loaded = Object.assign(new Event('downloadprogress'), { loaded: 0.4 });
    progress?.(loaded);
    expect(el.querySelector('.ask-status')!.textContent).toBe('Downloading… 40%');
    (api as { availability: ModelApi['availability'] }).availability = async () => 'available';
    await settle();
    expect(el.querySelector('.ask-input')).not.toBeNull();
  });

  it('shows nothing, even a download, in a language the model does not answer in', async () => {
    (globalThis as { LanguageModel?: unknown }).LanguageModel = fakeApi('downloadable');
    const el = host();
    expect(await mountChat(el, HELP_EN, 'de')).toBe('none');
    expect(el.children.length).toBe(0);
    brands(['Google Chrome']);
    delete (globalThis as { LanguageModel?: unknown }).LanguageModel;
    expect(await mountChat(el, HELP_EN, 'ko')).toBe('none');
    expect(el.children.length).toBe(0);
  });

  it('closes the callout, and keeps it closed until storage is cleared', async () => {
    localStorage.clear();
    (globalThis as { LanguageModel?: unknown }).LanguageModel = fakeApi('downloadable');
    const el = host();
    await mountChat(el, HELP_EN, 'en');
    el.querySelector<HTMLButtonElement>('.ask-close')!.click();
    expect(el.querySelector('.callout')).toBeNull();
    // Opened again: not shown.
    const again = host();
    expect(await mountChat(again, HELP_EN, 'en')).toBe('download');
    expect(again.querySelector('.callout')).toBeNull();
    // Storage cleared: it is back.
    localStorage.clear();
    await mountChat(again, HELP_EN, 'en');
    expect(again.querySelector('.callout')).not.toBeNull();
  });

  it('shows the box when the model is ready, whether or not the callout was closed', async () => {
    localStorage.setItem('libregaku.helpChatDismissed', '1');
    (globalThis as { LanguageModel?: unknown }).LanguageModel = fakeApi('available');
    const el = host();
    expect(await mountChat(el, HELP_EN, 'en')).toBe('ready');
    expect(el.querySelector('.ask-input')).not.toBeNull();
    localStorage.clear();
  });

  it('shows nothing where the model cannot run', async () => {
    (globalThis as { LanguageModel?: unknown }).LanguageModel = fakeApi('unavailable');
    const el = host();
    expect(await mountChat(el, HELP_EN, 'en')).toBe('none');
    expect(el.children.length).toBe(0);
  });

  it('tells Chrome that has the API but reports the model unavailable how to turn it on, with no button', async () => {
    brands(['Chromium', 'Google Chrome']);
    (globalThis as { LanguageModel?: unknown }).LanguageModel = fakeApi('unavailable');
    const el = host();
    expect(await mountChat(el, HELP_EN, 'en')).toBe('enable');
    expect(el.querySelector('.callout')!.textContent).toContain('chrome://flags');
    expect(el.querySelector('button.ask-send')).toBeNull();
    expect(el.querySelector('a.ask-more')).not.toBeNull();
  });

  it('points an old Chrome at updating, with a link and no button', async () => {
    brands(['Google Chrome']);
    const el = host();
    expect(await mountChat(el, HELP_EN, 'en')).toBe('update');
    expect(el.querySelector('button.ask-send')).toBeNull();
    expect(el.querySelector('a.ask-more')).not.toBeNull();
  });
});
