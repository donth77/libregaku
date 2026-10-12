import type { HelpBlock, HelpContent } from './help/content';
import { ui } from './i18n';
import { uiLanguageFor } from './i18n/languages';
import { renderMarkdown } from './markdown-lite';

/**
 * Ask the help a question, answered by the model Chrome carries (Gemini Nano,
 * through the Prompt API), on the learner's own device.
 *
 * The model is small, so it is not asked from memory. The question picks the
 * few help topics and settings that come nearest, those go into the prompt,
 * and the model is told to answer from them alone. A question the help has
 * nothing near is answered without the model at all.
 *
 * Shown only where it can work: where the model is ready, the box; where it
 * can be had, a callout with a button to get it; elsewhere nothing, because
 * the help and its search are all there is.
 */

/** What of the Prompt API this uses. It is not in TypeScript's lib yet. */
export interface ModelSession {
  promptStreaming(input: string): ReadableStream<string>;
  destroy(): void;
}
export interface ModelOptions {
  expectedInputs: Array<{ type: 'text'; languages: string[] }>;
  expectedOutputs: Array<{ type: 'text'; languages: string[] }>;
  initialPrompts?: Array<{ role: 'system'; content: string }>;
  monitor?: (m: EventTarget) => void;
}
export interface ModelApi {
  availability(options: Pick<ModelOptions, 'expectedInputs' | 'expectedOutputs'>): Promise<
    'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(options: ModelOptions): Promise<ModelSession>;
}

/** Where to read about the model. */
export const ABOUT_MODEL = 'https://developer.chrome.com/docs/ai/built-in';

/** The languages the model answers in. Anyone whose own language is another sees nothing of the chat. */
const ANSWERS = new Set(['en', 'es', 'ja']);

/** What the box shows: the chat, a way to get the model, or nothing. */
export type ChatState = 'ready' | 'download' | 'update' | 'enable' | 'none';

/** The browser's model, if it has one. */
export function modelApi(): ModelApi | undefined {
  return (globalThis as { LanguageModel?: ModelApi }).LanguageModel;
}

/** Whether this is Chrome itself, the browser that carries the model. */
function isChrome(): boolean {
  const brands = (navigator as { userAgentData?: { brands?: Array<{ brand: string }> } }).userAgentData?.brands;
  return Boolean(brands?.some((b) => b.brand === 'Google Chrome'));
}

/** The language the answer is in: the learner's own, or null where the model cannot write it. */
export function answerLanguage(native: string): string | null {
  const lang = uiLanguageFor(native);
  return ANSWERS.has(lang) ? lang : null;
}

const optionsFor = (lang: string): Pick<ModelOptions, 'expectedInputs' | 'expectedOutputs'> => ({
  expectedInputs: [{ type: 'text', languages: [...new Set(['en', lang])] }],
  expectedOutputs: [{ type: 'text', languages: [lang] }],
});

export async function chatState(api: ModelApi | undefined, lang: string): Promise<ChatState> {
  if (!api) return isChrome() ? 'update' : 'none';
  try {
    const have = await api.availability(optionsFor(lang));
    console.info(`[libregaku] help chat: the model is "${have}"`);
    if (have === 'available') return 'ready';
    // Unavailable may only be off, or not downloaded: Chrome says so, so Chrome is told how.
    if (have === 'unavailable') return isChrome() ? 'enable' : 'none';
    return 'download';
  } catch (e) {
    console.info('[libregaku] help chat: asking whether the model is there failed:', e);
    return 'none';
  }
}

/** One thing the model may answer from: a help topic, or a setting and what it says. */
export interface Doc {
  title: string;
  text: string;
  keywords: string;
}

const blockText = (block: HelpBlock): string[] =>
  typeof block === 'string' ? [block]
    : Array.isArray(block) ? block
      : 'tip' in block ? [block.tip]
        : [block.head.join(' | '), ...block.rows.map((r) => r.join(' | '))];

/** Help text with its marks off: `keys`, {Settings → Anki} and [linked words](…) read as the words they are. */
const plain = (s: string): string => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[`{}]/g, '');

/** The help's topics, then whatever else is given: the settings. */
export function docsFrom(help: HelpContent, more: readonly Doc[] = []): Doc[] {
  const docs: Doc[] = help.chapters.flatMap((c) => c.topics.map((t) => ({
    title: plain(t.title),
    text: t.body.flatMap(blockText).map(plain).join('\n'),
    keywords: (t.keywords ?? []).join(' '),
  })));
  return [...docs, ...more];
}

/** A list of choices longer than this is not worth the model's room. */
const MANY = 12;

/**
 * Every setting the settings page shows, as the learner sees it: its section,
 * its name and hint, what it offers, and what it is set to now against what it
 * starts as. Read from the page's own rows, so a setting added there is known
 * here with nothing else to keep in step.
 */
export function settingsDocsFrom(
  root: ParentNode, nowSet: object, defaultSet: object,
): Doc[] {
  const now = nowSet as Record<string, unknown>;
  const defaults = defaultSet as Record<string, unknown>;
  const docs: Doc[] = [];
  for (const section of Array.from(root.querySelectorAll('section.grp-section'))) {
    const where = section.querySelector('.grp')?.textContent?.trim() ?? '';
    for (const row of Array.from(section.querySelectorAll<HTMLElement>('label.set'))) {
      // A row the language being learned has no use for is not on screen, so it is not offered.
      if (row.hidden) continue;
      const name = row.querySelector('.name')?.textContent?.trim();
      if (!name) continue;
      const hint = row.querySelector('.hint')?.textContent?.trim() ?? '';
      const control = row.querySelector<HTMLInputElement | HTMLSelectElement>('[data-setting]');
      const key = control?.dataset.setting ?? '';
      const lines = [`Found at: Settings → ${where} → ${name}.`];
      if (hint) lines.push(hint);
      let choices = '';
      if (control instanceof HTMLSelectElement) {
        const options = Array.from(control.options, (o) => ({ value: o.value, text: o.textContent ?? '' }));
        const said = (value: unknown): string => options.find((o) => o.value === String(value))?.text ?? String(value);
        if (options.length <= MANY) {
          choices = options.map((o) => o.text).join(' ');
          lines.push(`Choices: ${options.map((o) => o.text).join(', ')}.`);
        }
        lines.push(`Now: ${said(now[key])}. Starts as: ${said(defaults[key])}.`);
      } else if (control instanceof HTMLInputElement && control.type === 'checkbox') {
        lines.push(`A switch. Now: ${now[key] ? 'on' : 'off'}. Starts as: ${defaults[key] ? 'on' : 'off'}.`);
      }
      docs.push({ title: `Setting: ${name} (Settings → ${where})`, text: lines.join('\n'), keywords: `${where} ${choices}` });
    }
  }
  return docs;
}

/** The settings page's rows, built off screen to read: it is the one place that knows them all. */
export async function loadSettingsDocs(): Promise<Doc[]> {
  try {
    const [{ buildSettings }, { DEFAULTS, settings }] = await Promise.all([
      import('./content/settings-panel'), import('./settings'),
    ]);
    return settingsDocsFrom(buildSettings(() => {}), settings(), DEFAULTS);
  } catch (e) {
    console.warn('[libregaku] the help chat could not read the settings:', e);
    return [];
  }
}

const fold = (s: string): string =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').normalize('NFKC').toLowerCase();

/** Words said in every question, which say nothing of what it is about. */
const COMMON = new Set([
  'the', 'and', 'for', 'how', 'can', 'does', 'what', 'where', 'why', 'when', 'which', 'who', 'you', 'your', 'with',
  'this', 'that', 'there', 'are', 'was', 'not', 'but', 'get', 'make', 'use', 'want', 'need', 'about',
]);
/** Scripts written without spaces between words, searched by pairs of characters. */
const UNSPACED = /[฀-๿぀-ヿ㐀-鿿가-힯]+/gu;

/** What a question is about, as the words to look for: words, their stems, and pairs of characters. */
export function wordsOf(question: string): string[] {
  const text = fold(question);
  const out = new Set<string>();
  for (const run of text.match(UNSPACED) ?? []) {
    if (run.length === 1) out.add(run);
    for (let i = 0; i + 1 < run.length; i++) out.add(run.slice(i, i + 2));
  }
  for (const w of text.replace(UNSPACED, ' ').split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 3 || COMMON.has(w)) continue;
    out.add(w);
    const stem = w.replace(/(ing|ed|es|s)$/, '');
    if (stem.length >= 4) out.add(stem);
  }
  return [...out];
}

/** The docs nearest the question, nearest first; none where nothing shares a word with it. */
export function nearest(docs: readonly Doc[], question: string, count = 4): Doc[] {
  const words = wordsOf(question);
  const scored = docs.map((doc) => {
    const title = fold(doc.title);
    const keywords = fold(doc.keywords);
    const text = fold(doc.text);
    let score = 0;
    for (const w of words) {
      if (title.includes(w)) score += 3;
      if (keywords.includes(w)) score += 2;
      if (text.includes(w)) score += 1;
    }
    return { doc, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, count).map((s) => s.doc);
}

/** How many of the help's opening topics answer a question that is about nothing in particular. */
const OPENING = 3;

/** Words a question about the whole extension is made of, besides the filler above: "What can you help with?" */
const GENERAL = new Set([
  'help', 'helps', 'helping', 'about', 'use', 'using', 'extension', 'feature', 'features', 'overview', 'work',
  'works', 'working', 'start', 'begin', 'libregaku', 'know', 'learn', 'do', 'does', 'capable', 'offer', 'support',
  'have', 'has', 'show', 'tell',
]);

/**
 * What to answer from. A question with something in it goes by that. One with
 * nothing in it, like "What can you do?", is about the extension as a whole,
 * which the help's first topics are for. Nothing at all where the question has
 * words and the help has none of them.
 */
export function relevant(docs: readonly Doc[], question: string): Doc[] {
  const words = wordsOf(question);
  // A word counts whole or as the stem it was cut to: "features" is "featur" here, and "feature" there.
  const general = words.every((w) => [...GENERAL].some((g) => g === w || (w.length >= 5 && g.startsWith(w))));
  return words.length && !general ? nearest(docs, question) : docs.slice(0, OPENING);
}

/** The most of one doc that goes into the prompt: the model's room is small. */
const EACH = 1400;

const SYSTEM =
  'You answer questions about Libregaku, a Chrome extension that draws clickable subtitles over web video on ' +
  'YouTube, Netflix, Disney+, Prime Video, HBO Max and Apple TV. Click a word to look it up, mark it known, or add it as a card ' +
  'in Anki, through the AnkiConnect add-on. Words are underlined by how well the learner knows them, and a ' +
  'transcript panel beside the video lists every line. Settings and Help are pages of the extension. ' +
  'You can answer questions about what it does, how to use it and what its settings are. ' +
  'Answer only from the help text you are given. If it does not say, say so; never guess or invent features. ' +
  'For a setting, say where to find it, as "Settings → Section → Name". Use short, plain sentences.';

export function promptFor(question: string, docs: readonly Doc[]): string {
  const help = docs.map((d) => `## ${d.title}\n${d.text.slice(0, EACH)}`).join('\n\n');
  return `Help text:\n\n${help}\n\nQuestion: ${question}`;
}

/** Ask once: a fresh session, so one answer never crowds the next out of the model's room. */
export async function* ask(
  api: ModelApi, lang: string, question: string, docs: readonly Doc[],
): AsyncGenerator<string> {
  const session = await api.create({ ...optionsFor(lang), initialPrompts: [{ role: 'system', content: SYSTEM }] });
  try {
    const reader = session.promptStreaming(promptFor(question, docs)).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    session.destroy();
  }
}

/**
 * Whether the learner has closed the callout. Kept in this page's own storage,
 * so it stays closed until that is cleared: it is a convenience, never state
 * that matters, so a browser that will not store it just shows the callout again.
 */
const DISMISSED = 'libregaku.helpChatDismissed';
export function calloutDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false;
  }
}
function dismissCallout(): void {
  try {
    localStorage.setItem(DISMISSED, '1');
  } catch { /* shown again next time */ }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
};

function aboutLink(): HTMLAnchorElement {
  const a = el('a', 'ask-more', ui.helpChat.learnMore);
  a.href = ABOUT_MODEL;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

/** The box: a question, and the answer written under it as it arrives. */
function chatBox(api: ModelApi, help: HelpContent, lang: string): HTMLElement {
  const t = ui.helpChat;
  const box = el('section', 'ask');
  box.setAttribute('aria-labelledby', 'ask-title');
  const title = el('h2', 'ask-title', t.heading);
  title.id = 'ask-title';

  const form = el('form', 'ask-form');
  const input = el('input', 'ask-input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = t.placeholder;
  input.setAttribute('aria-label', t.label);
  const send = el('button', 'ask-send', t.send);
  send.type = 'submit';
  form.append(input, send);

  const answer = el('div', 'ask-answer');
  answer.setAttribute('aria-live', 'polite');
  const note = el('p', 'ask-note', t.note);
  note.hidden = true;
  box.append(title, form, answer, note);

  let docs: Promise<Doc[]> | null = null;
  let busy = false;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question || busy) return;
    busy = true;
    send.disabled = true;
    note.hidden = true;
    answer.textContent = t.thinking;
    void (async () => {
      try {
        docs ??= loadSettingsDocs().then((settings) => docsFrom(help, settings));
        const near = relevant(await docs, question);
        if (!near.length) {
          answer.textContent = t.noMatch;
          return;
        }
        let text = '';
        for await (const piece of ask(api, lang, question, near)) {
          text += piece;
          answer.replaceChildren(renderMarkdown(text));
        }
        if (!text.trim()) answer.textContent = t.failed;
        else note.hidden = false;
      } catch (err) {
        console.warn('[libregaku] the help chat could not answer:', err);
        answer.textContent = t.failed;
      } finally {
        busy = false;
        send.disabled = false;
      }
    })();
  });
  return box;
}

/** Where the model can be had: what it is, and the button that gets it. */
function callout(api: ModelApi | undefined, kind: ChatState, onReady: () => void, lang: string): HTMLElement {
  const t = ui.helpChat;
  const box = el('aside', 'ask callout');
  const close = el('button', 'ask-close', '×');
  close.type = 'button';
  close.setAttribute('aria-label', ui.notices.dismiss);
  close.title = ui.notices.dismiss;
  close.addEventListener('click', () => {
    dismissCallout();
    box.remove();
  });
  box.append(close, el('h2', 'ask-title', t.installHeading));
  if (!api || kind === 'enable') {
    box.append(el('p', 'ask-body', kind === 'enable' ? t.unavailable : t.update), aboutLink());
    return box;
  }
  const status = el('p', 'ask-status');
  status.setAttribute('role', 'status');
  const button = el('button', 'ask-send', t.download);
  button.type = 'button';
  button.addEventListener('click', () => {
    button.disabled = true;
    status.textContent = t.downloading(0);
    api.create({
      ...optionsFor(lang),
      monitor: (m) => m.addEventListener('downloadprogress', (e) => {
        status.textContent = t.downloading(Math.round(((e as Event & { loaded: number }).loaded || 0) * 100));
      }),
    }).then((session) => {
      session.destroy();
      onReady();
    }, () => {
      button.disabled = false;
      status.textContent = t.failed;
    });
  });
  box.append(el('p', 'ask-body', t.install), button, status, aboutLink());
  return box;
}

/**
 * Fill `host` with whichever of the box and the callout the browser calls for.
 * Nothing at all where the learner's language is not one the model answers in.
 */
export async function mountChat(host: HTMLElement, help: HelpContent, native: string): Promise<ChatState> {
  host.replaceChildren();
  const lang = answerLanguage(native);
  if (!lang) {
    console.info(`[libregaku] help chat hidden: the model does not answer in "${native}"`);
    return 'none';
  }
  const api = modelApi();
  const state = await chatState(api, lang);
  console.info(`[libregaku] help chat: ${state} (${api ? 'model API present' : 'no model API'}, answers in ${lang})`);
  if (state === 'ready' && api) host.append(chatBox(api, help, lang));
  else if ((state === 'download' || state === 'update' || state === 'enable') && !calloutDismissed()) {
    host.append(callout(api, state, () => void mountChat(host, help, native), lang));
  }
  return state;
}
