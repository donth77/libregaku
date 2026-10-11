import { protectedSites } from './sites';

/**
 * Which sites "protected sites" means, wherever the interface says it.
 *
 * The words themselves are marked: underlined, naming the sites on hover, and
 * opening the help chapter on them when clicked (markSites). Where a language's
 * text does not use the phrase, a small "i" beside it does the same
 * (siteInfo). The names are proper nouns, so the list needs no translation
 * beyond how a language joins a list.
 *
 * The locale is passed in, not read from the interface's own tables: the help
 * page uses this too, and does not carry them.
 */
export const SITE_INFO_STYLE = `
  .siteinfo {
    display: inline-grid; place-items: center; width: 15px; height: 15px; margin-left: 6px; padding: 0;
    vertical-align: 1px; border-radius: 50%; cursor: help;
    border: 1px solid #5B6684; background: none; color: #8A94AF;
    font: italic 700 10px/1 Georgia, serif; letter-spacing: 0; text-transform: none;
  }
  .siteinfo:hover { border-color: #C7CFE2; color: #F2F5FC; }
  .sites {
    display: inline; padding: 0; margin: 0; border: 0; background: none; color: inherit; font: inherit;
    letter-spacing: inherit; text-transform: none; cursor: help;
    text-decoration: underline dotted; text-underline-offset: 3px;
  }
  .sites:hover { color: #F2F5FC; text-decoration-style: solid; }
  .sites:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; border-radius: 2px; }
  .siteinfo:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; }
`;

/** Open the help chapter that lists them. A page cannot open an extension page itself: the service worker does. */
function openHelp(): void {
  void chrome.runtime.sendMessage({ type: 'open-help', topic: 'protected-sites' }).catch(() => {});
}

function control(className: string, text: string, locale: string, open: () => void): HTMLButtonElement {
  const list = protectedSites(locale);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = text;
  b.title = list;
  b.addEventListener('click', (e) => {
    // Inside a setting's label, a click would otherwise flip the setting.
    e.preventDefault();
    e.stopPropagation();
    open();
  });
  return b;
}

export function siteInfo(locale: string, open: () => void = openHelp): HTMLButtonElement {
  const b = control('siteinfo', 'i', locale, open);
  b.setAttribute('aria-label', b.title);
  return b;
}

/** The phrase as English writes it. A translation that words it otherwise gets the "i" instead. */
const PHRASE = /protected sites?/gi;

/**
 * Mark every "protected sites" in the text under `root`, leaving the words as
 * they are. Text inside a link, a button or a heading is left alone: a button
 * cannot go inside either of the first two, and a heading names the chapter
 * the mark would open. So is a settings path in the help, which names a row
 * as the settings spell it. True when anything was marked.
 */
export function markSites(root: Node, locale: string, open: () => void = openHelp): boolean {
  const texts: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const parent = (n as Text).parentElement;
    if (!parent || parent.closest('a, button, h1, h2, h3, summary, select, option, kbd, .path')) continue;
    PHRASE.lastIndex = 0;
    if (PHRASE.test(n.nodeValue ?? '')) texts.push(n as Text);
  }
  for (const node of texts) {
    const text = node.nodeValue ?? '';
    const parts: Node[] = [];
    let at = 0;
    PHRASE.lastIndex = 0;
    for (let m = PHRASE.exec(text); m; m = PHRASE.exec(text)) {
      if (m.index > at) parts.push(document.createTextNode(text.slice(at, m.index)));
      parts.push(control('sites', m[0], locale, open));
      at = m.index + m[0].length;
    }
    if (at < text.length) parts.push(document.createTextNode(text.slice(at)));
    node.replaceWith(...parts);
  }
  return texts.length > 0;
}
