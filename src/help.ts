import { hasHelp, helpFor, type HelpBlock, type HelpContent, type HelpTopic } from './help/content';
import { mountChat } from './help-chat';
import { loadUiLanguage, setTranslationLoader, ui } from './i18n';
import { markSites } from './site-info';
import { en as english } from './i18n/en';
import { directionOf, localeOf, uiLanguageFor } from './i18n/languages';
import { pageHeader } from './page-header';
import { loadSettings, onSettingsChange } from './settings';

/**
 * The help page: chapters of how-tos, then questions, a search over all of
 * it, and a list of the chapters down the side.
 *
 * Its words come from src/help/content.ts, in the interface language — your
 * own, where the help has been written in it, and English until then. Search
 * narrows the page as you type rather than listing results elsewhere: what
 * matches stays, with the words found picked out, and a question that matches
 * opens.
 */

/**
 * Text as it is compared: width and case folded, and the accents of Latin
 * letters dropped, so "subtitulos" finds "subtítulos". Only those accents —
 * the marks that voice kana (が) are part of the word.
 */
const normal = (s: string): string =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').normalize('NFKC').toLowerCase();

/** The words of a search, as they are compared. */
export function terms(query: string): string[] {
  return normal(query).split(/\s+/).filter(Boolean);
}

const textOf = (block: HelpBlock): string[] =>
  typeof block === 'string' ? [block]
    : Array.isArray(block) ? block
      : 'tip' in block ? [block.tip]
        : [...block.head, ...block.rows.flat()];

/** A topic holds every word searched for, in its title, text or keywords. */
export function matches(topic: HelpTopic, words: readonly string[]): boolean {
  if (!words.length) return true;
  const text = normal([topic.title, ...topic.body.flatMap(textOf), ...(topic.keywords ?? [])].join(' '));
  return words.every((w) => text.includes(w));
}

/** The words searched for, marked where they appear in `text`. */
function marked(text: string, words: readonly string[]): Node[] {
  if (!words.length) return [document.createTextNode(text)];
  // Fold the text as the search folds it, one character at a time, keeping
  // where each folded character came from: "subtitulos" then finds, and
  // marks, the "subtítulos" written.
  let folded = '';
  const from: number[] = [];
  let at = 0;
  for (const ch of text) {
    const f = normal(ch);
    for (let k = 0; k < f.length; k++) from.push(at);
    folded += f;
    at += ch.length;
  }
  from.push(text.length);
  const spans: Array<[number, number]> = [];
  for (const word of words) {
    for (let hit = folded.indexOf(word); hit >= 0; hit = folded.indexOf(word, hit + word.length)) {
      const last = from[hit + word.length - 1]!;
      // To the end of the character the match ends in, however it folded.
      const stop = Math.max(from[hit + word.length]!, last + String.fromCodePoint(text.codePointAt(last)!).length);
      spans.push([from[hit]!, stop]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const out: Node[] = [];
  let done = 0;
  for (const [begin, stop] of spans) {
    if (stop <= done) continue;
    const open = Math.max(begin, done);
    if (open > done) out.push(document.createTextNode(text.slice(done, open)));
    const m = document.createElement('mark');
    m.textContent = text.slice(open, stop);
    out.push(m);
    done = stop;
  }
  if (done < text.length) out.push(document.createTextNode(text.slice(done)));
  return out;
}

/** The settings page's sections: the id each has there, and the string that names it. */
const SECTIONS = [
  ['languages', 'languagesHeading'], ['looking-words-up', 'lookupHeading'], ['word-popup', 'popupHeading'],
  ['subtitles', 'subtitlesHeading'], ['underlines', 'underlinesHeading'], ['transcript', 'transcriptHeading'],
  ['anki', 'ankiHeading'], ['anki-cards', 'ankiCardsHeading'], ['data-and-licences', 'creditsHeading'],
] as const;

/**
 * The settings section a step of a path names, in the interface's language or in English, which
 * is what a topic not yet translated says.
 */
function sectionNamed(step: string): string | undefined {
  const wanted = normal(step);
  return SECTIONS.find(([, key]) => normal(ui.settings[key]) === wanted || normal(english.settings[key]) === wanted)?.[0];
}

/**
 * A line of help text as nodes: `keys` drawn as keys, {Settings → Anki →
 * Picture} as the path to a setting, a web address as a link to it, [words](https://…)
 * as those words linked, and the words searched for marked.
 *
 * A web address ends at its last letter, digit or slash, so a full stop after
 * it, or the words of a language written without spaces, stay text.
 */
export function inline(text: string, words: readonly string[], then = 'then'): Node[] {
  const out: Node[] = [];
  for (const piece of text.split(/(`[^`]+`|\{[^}]+\}|\[[^\]]+\]\(https:\/\/[^)\s]+\)|https:\/\/[\w.~/?#%&=+:-]*[\w/])/)) {
    if (!piece) continue;
    if (/^`[^`]+`$/.test(piece)) {
      const k = document.createElement('kbd');
      k.textContent = piece.slice(1, -1);
      out.push(k);
    } else if (/^\{[^}]+\}$/.test(piece)) {
      const steps = piece.slice(1, -1).split('→').map((s) => s.trim());
      // Where a path names a section of the settings, it goes there.
      const section = steps.length > 1 ? sectionNamed(steps[1]!) : undefined;
      const path = document.createElement(section ? 'a' : 'span');
      path.className = 'path';
      if (section) (path as HTMLAnchorElement).href = `options.html#lg-${section}`;
      steps.forEach((step, i) => {
        if (i) {
          // Seen as ›, heard as "then": a span has no name of its own to give it.
          const sep = document.createElement('span');
          sep.className = 'sep';
          const arrow = document.createElement('span');
          arrow.setAttribute('aria-hidden', 'true');
          arrow.textContent = '›';
          const said = document.createElement('span');
          said.className = 'vh';
          said.textContent = ` ${then} `;
          sep.append(arrow, said);
          path.appendChild(sep);
        }
        const s = document.createElement('span');
        s.append(...marked(step, words));
        path.appendChild(s);
      });
      out.push(path);
    } else if (/^\[[^\]]+\]\(https:\/\/[^)\s]+\)$/.test(piece)) {
      // Words that are a link: [AnkiConnect](https://…).
      const [, label = '', href = ''] = /^\[([^\]]+)\]\((.+)\)$/.exec(piece) ?? [];
      const a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.append(...marked(label, words));
      out.push(a);
    } else if (/^https:\/\/[\w.~/?#%&=+:-]*[\w/]$/.test(piece)) {
      // Opened in a new tab, and shown as people say it: apps.ankiweb.net.
      const a = document.createElement('a');
      a.href = piece;
      a.target = '_blank';
      a.rel = 'noopener';
      a.append(...marked(piece.replace(/^https:\/\//, '').replace(/\/$/, ''), words));
      out.push(a);
    } else {
      out.push(...marked(piece, words));
    }
  }
  return out;
}

/**
 * Go to a part of the page at once, where the page's own links glide to theirs:
 * a link meant to take you somewhere else is not one to watch arrive.
 */
function jumpTo(id: string): void {
  history.pushState(null, '', `#${id}`);
  document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
}

function fill(el: HTMLElement, topic: HelpTopic, words: readonly string[], help: HelpContent): void {
  const nodes = (text: string): Node[] => inline(text, words, help.then);
  el.replaceChildren();
  for (const block of topic.body) {
    if (typeof block === 'string') {
      const p = document.createElement('p');
      p.append(...nodes(block));
      el.appendChild(p);
    } else if (Array.isArray(block)) {
      const ol = document.createElement('ol');
      ol.className = 'steps';
      for (const step of block) {
        const li = document.createElement('li');
        li.append(...nodes(step));
        ol.appendChild(li);
      }
      el.appendChild(ol);
    } else if ('tip' in block) {
      const tip = document.createElement('p');
      tip.className = 'tip';
      const label = document.createElement('strong');
      label.textContent = help.tipLabel;
      tip.append(label, ' ', ...nodes(block.tip));
      el.appendChild(tip);
    } else {
      const table = document.createElement('table');
      table.className = 'grid';
      const head = table.createTHead().insertRow();
      for (const cell of block.head) {
        const th = document.createElement('th');
        th.scope = 'col';
        th.append(...nodes(cell));
        head.appendChild(th);
      }
      const body = table.createTBody();
      for (const row of block.rows) {
        const tr = body.insertRow();
        for (const cell of row) tr.insertCell().append(...nodes(cell));
      }
      el.appendChild(table);
    }
  }
  // "Protected sites" names its sites on hover, and goes to their chapter: not from inside it.
  if (!topic.id.startsWith('protected-sites')) markSites(el, document.documentElement.lang || 'en', () => jumpTo('protected-sites'));
}

interface Shown {
  topic: HelpTopic;
  el: HTMLElement;
  title: HTMLElement;
  body: HTMLElement;
  question: boolean;
}

/** Build the page into `main`, with its contents in `toc`, and narrow it to what `input` asks for. */
export function renderHelp(
  main: HTMLElement, toc: HTMLElement | null, input: HTMLInputElement, none: HTMLElement, help: HelpContent,
): void {
  const shown: Shown[] = [];
  const chapters: Array<{ el: HTMLElement; link: HTMLAnchorElement | null }> = [];
  for (const chapter of help.chapters) {
    const section = document.createElement('section');
    section.className = chapter.questions ? 'chapter questions' : 'chapter';
    section.id = chapter.id;
    const head = document.createElement('div');
    head.className = 'chapter-head';
    const h = document.createElement('h2');
    h.textContent = chapter.title;
    head.appendChild(h);
    if (chapter.about) {
      const about = document.createElement('p');
      about.textContent = chapter.about;
      head.appendChild(about);
    }
    section.appendChild(head);
    for (const topic of chapter.topics) {
      const body = document.createElement('div');
      body.className = 'body';
      let el: HTMLElement;
      const title = document.createElement('span');
      if (chapter.questions) {
        // A question opens to its answer; search opens the ones it finds. Its
        // words are one element, so marking one does not space it apart.
        const d = document.createElement('details');
        const summary = document.createElement('summary');
        summary.appendChild(title);
        d.append(summary, body);
        el = d;
      } else {
        el = document.createElement('article');
        const h3 = document.createElement('h3');
        const anchor = document.createElement('a');
        anchor.className = 'anchor';
        anchor.href = `#${topic.id}`;
        anchor.textContent = '#';
        anchor.setAttribute('aria-label', help.link);
        h3.append(title, anchor);
        el.append(h3, body);
      }
      el.className = 'topic';
      el.id = topic.id;
      section.appendChild(el);
      shown.push({ topic, el, title, body, question: Boolean(chapter.questions) });
    }
    main.appendChild(section);
    let link: HTMLAnchorElement | null = null;
    if (toc) {
      link = document.createElement('a');
      link.href = `#${chapter.id}`;
      link.textContent = chapter.title;
      toc.appendChild(link);
    }
    chapters.push({ el: section, link });
  }

  const apply = (): void => {
    const words = terms(input.value);
    let any = false;
    for (const s of shown) {
      const hit = matches(s.topic, words);
      s.el.hidden = !hit;
      any ||= hit;
      s.title.replaceChildren(...inline(s.topic.title, words, help.then));
      fill(s.body, s.topic, words, help);
      if (s.question) (s.el as HTMLDetailsElement).open = words.length > 0 && hit;
    }
    for (const c of chapters) {
      const empty = !c.el.querySelector('.topic:not([hidden])');
      c.el.hidden = empty;
      if (c.link) c.link.hidden = empty;
    }
    none.hidden = any;
    none.textContent = any ? '' : help.none.replace('{q}', input.value.trim());
  };
  input.addEventListener('input', apply);
  apply();

  // A link to a question opens it.
  const target = location.hash.slice(1);
  const linked = shown.find((s) => s.topic.id === target);
  if (linked?.question) (linked.el as HTMLDetailsElement).open = true;

  // The chapter being read, marked in the contents.
  if (toc && typeof IntersectionObserver !== 'undefined') {
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      const current = chapters.find((c) => seen.has(c.el));
      if (!current) return;
      // "true", as the settings page marks its section: toggleAttribute wrote aria-current="", which means none.
      for (const c of chapters) {
        if (c === current) c.link?.setAttribute('aria-current', 'true');
        else c.link?.removeAttribute('aria-current');
      }
    }, { rootMargin: '-15% 0px -70% 0px' });
    for (const c of chapters) io.observe(c.el);
  }
}

/** The popular topics, as links under the search. */
function popular(el: HTMLElement, help: HelpContent): void {
  const label = document.createElement('span');
  label.className = 'popular-label';
  label.textContent = help.popular.label;
  el.appendChild(label);
  const topics = help.chapters.flatMap((c) => c.topics);
  for (const id of help.popular.ids) {
    const topic = topics.find((t) => t.id === id);
    if (!topic) continue;
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = topic.title;
    el.appendChild(a);
  }
}

async function main(): Promise<void> {
  const { native } = await loadSettings();
  const lang = uiLanguageFor(native);
  // Another language chosen while this is open: read the page again in it.
  onSettingsChange((s) => {
    if (uiLanguageFor(s.native) !== lang) location.reload();
  });
  // The help in another language is a file of its own, imported when needed.
  if (!hasHelp(lang)) {
    await import(chrome.runtime.getURL(`i18n/help-${lang}.js`)).catch((e: unknown) =>
      console.warn(`[libregaku] the help in ${lang} could not be loaded:`, e));
  }
  const help = helpFor(lang);
  setTranslationLoader((code) => import(chrome.runtime.getURL(`i18n/${code}.js`)));
  await loadUiLanguage(native);
  document.documentElement.lang = localeOf(lang);
  document.documentElement.dir = directionOf(lang);
  document.title = `Libregaku — ${help.title}`;
  pageHeader('help', { heading: help.title, other: help.settings });
  const set = (id: string, text: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('title', help.title);
  set('intro', help.intro);
  set('toc-title', help.contents);
  const input = document.getElementById('q') as HTMLInputElement | null;
  const out = document.getElementById('help');
  const none = document.getElementById('none');
  const pop = document.getElementById('popular');
  if (!input || !out || !none) return;
  input.placeholder = help.search;
  input.setAttribute('aria-label', help.searchLabel);
  if (pop) popular(pop, help);
  const ask = document.getElementById('ask');
  if (ask) void mountChat(ask, help, native);
  renderHelp(out, document.querySelector<HTMLElement>('.toc'), input, none, help);
  if (!location.hash) input.focus();
  // The page is built after it loads, so the browser found no anchor to go to.
  else document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' });
}

if (document.getElementById('help')) void main();
