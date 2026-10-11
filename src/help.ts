import { helpFor, type HelpBlock, type HelpContent, type HelpTopic } from './help/content';
import { logo } from './logo';

/**
 * The help page: chapters of how-tos, then questions, a search over all of
 * it, and a list of the chapters down the side.
 *
 * Its words come from src/help/content.ts, in the browser's language where
 * they have been written and in English until then. Search narrows the page
 * as you type rather than listing results elsewhere: what matches stays, with
 * the words found picked out, and a question that matches opens.
 */

const normal = (s: string): string => s.normalize('NFKC').toLowerCase();

/** The words of a search, as they are compared. */
export function terms(query: string): string[] {
  return normal(query).split(/\s+/).filter(Boolean);
}

const textOf = (block: HelpBlock): string[] =>
  typeof block === 'string' ? [block] : Array.isArray(block) ? block : [block.tip];

/** A topic holds every word searched for, in its title, text or keywords. */
export function matches(topic: HelpTopic, words: readonly string[]): boolean {
  if (!words.length) return true;
  const text = normal([topic.title, ...topic.body.flatMap(textOf), ...(topic.keywords ?? [])].join(' '));
  return words.every((w) => text.includes(w));
}

/** The words searched for, marked where they appear in `text`. */
function marked(text: string, words: readonly string[]): Node[] {
  if (!words.length) return [document.createTextNode(text)];
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return text.split(pattern).filter(Boolean).map((part) => {
    if (!words.includes(normal(part))) return document.createTextNode(part);
    const m = document.createElement('mark');
    m.textContent = part;
    return m;
  });
}

/**
 * A line of help text as nodes: `keys` drawn as keys, {Settings → Anki →
 * Picture} as the path to a setting, and the words searched for marked.
 */
export function inline(text: string, words: readonly string[]): Node[] {
  const out: Node[] = [];
  for (const piece of text.split(/(`[^`]+`|\{[^}]+\})/)) {
    if (!piece) continue;
    if (/^`[^`]+`$/.test(piece)) {
      const k = document.createElement('kbd');
      k.textContent = piece.slice(1, -1);
      out.push(k);
    } else if (/^\{[^}]+\}$/.test(piece)) {
      const path = document.createElement('span');
      path.className = 'path';
      piece.slice(1, -1).split('→').map((s) => s.trim()).forEach((step, i) => {
        if (i) {
          const sep = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '›';
          sep.setAttribute('aria-label', 'then');
          path.appendChild(sep);
        }
        const s = document.createElement('span');
        s.append(...marked(step, words));
        path.appendChild(s);
      });
      out.push(path);
    } else {
      out.push(...marked(piece, words));
    }
  }
  return out;
}

function fill(el: HTMLElement, topic: HelpTopic, words: readonly string[]): void {
  el.replaceChildren();
  for (const block of topic.body) {
    if (typeof block === 'string') {
      const p = document.createElement('p');
      p.append(...inline(block, words));
      el.appendChild(p);
    } else if (Array.isArray(block)) {
      const ol = document.createElement('ol');
      ol.className = 'steps';
      for (const step of block) {
        const li = document.createElement('li');
        li.append(...inline(step, words));
        ol.appendChild(li);
      }
      el.appendChild(ol);
    } else {
      const tip = document.createElement('p');
      tip.className = 'tip';
      tip.append(...inline(block.tip, words));
      el.appendChild(tip);
    }
  }
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
        anchor.setAttribute('aria-label', 'Link to this');
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
      s.title.replaceChildren(...inline(s.topic.title, words));
      fill(s.body, s.topic, words);
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
      for (const c of chapters) c.link?.toggleAttribute('aria-current', c === current);
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

function main(): void {
  const lang = typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage ? chrome.i18n.getUILanguage() : 'en';
  const help = helpFor(lang);
  document.title = `Libregaku — ${help.title}`;
  const h1 = document.querySelector('h1');
  const mark = logo('lockup', 46, 'Libregaku');
  if (h1 && mark) h1.replaceChildren(mark);
  const settingsLink = document.querySelector<HTMLAnchorElement>('.to-settings');
  if (settingsLink) settingsLink.textContent = help.settings;
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
  input.setAttribute('aria-label', help.search);
  if (pop) popular(pop, help);
  renderHelp(out, document.querySelector<HTMLElement>('.toc'), input, none, help);
  if (!location.hash) input.focus();
}

if (document.getElementById('help')) main();
