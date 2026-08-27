/**
 * The Source field: where a card came from.
 *
 * Two jobs. It tells you at review time which scene a word is from, which is
 * most of what makes a mined card better than a word list. And it links back,
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
