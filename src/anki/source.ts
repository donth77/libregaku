/**
 * The Source field: where a card came from.
 *
 * Two jobs. It tells you at review time which scene a word is from, which is
 * most of what makes a card from a video better than a word list. And it links back,
 * so a half-remembered word can be re-heard in context in one click.
 */

export interface Provenance {
  title: string | null;
  seconds: number;
  url: string | null;
}

export function stampFor(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** HTML, because the field renders on the card and the link must be clickable. */
export function sourceField(p: Provenance): string {
  const label = [p.title, stampFor(p.seconds)].filter(Boolean).join(' · ');
  if (!p.url) return escapeHtml(label);
  return `<a href="${escapeHtml(p.url)}">${escapeHtml(label)}</a>`;
}

/**
 * A recording's credit, for the Audio field ahead of the recording: who spoke
 * it and under what licence, linked to its page. Most free recordings ask
 * that this go wherever they go (CC BY, CC BY-SA), and a deck that is shared
 * takes its cards' sound with it. Small: it is not what the card is for.
 */
export function creditField(credit: { by: string; licence: string; page: string }): string {
  // Square brackets are Anki's own markup ([sound:…]); a name must not write any.
  const text = escapeHtml(`${credit.by} · ${credit.licence}`).replace(/\[/g, '&#91;').replace(/\]/g, '&#93;');
  const page = credit.page.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
  const said = /^https:\/\//.test(page) ? `<a href="${escapeHtml(page)}">${text}</a>` : text;
  return `<span style="font-size:11px;opacity:.6">${said}</span> `;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
