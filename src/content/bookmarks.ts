/**
 * Saved lines.
 *
 * A line you want to come back to but do not want to turn into a card yet —
 * because you half-understood it, because the grammar was new, or because it
 * was simply a good sentence. Marking a *word* known and making a card are
 * both commitments; this is the cheap gesture in between, and without it the
 * only way to keep a line was to pause and copy it somewhere else.
 *
 * Saved in `chrome.storage.local`, deliberately, not `sync`: sync caps items
 * at 8 KB and the whole area at 100 KB, which a few hundred sentences would
 * blow straight through, and the failure mode is a silent write rejection.
 * The cost is that the list does not follow a Chrome profile between machines.
 *
 * A saved line is not an Anki card. It can *become* one — that is the point of
 * keeping the sentence, its translation and its timestamp together — but the
 * two lists stay separate so that clearing one never touches the other.
 */

const KEY = 'libregaku:saved';

/** Far above any plausible use; a backstop against unbounded growth, not a quota. */
const CAP = 5000;

export interface Bookmark {
  /** `site:video:startMs` — stable across visits, so a re-opened video shows its saves. */
  id: string;
  site: string;
  video: string;
  title: string;
  /** Deep link back to the moment, timestamp included where the site supports it. */
  url: string;
  text: string;
  secondary?: string;
  start: number;
  end: number;
  lang: string;
  savedAt: number;
}

export function idFor(site: string, video: string, start: number): string {
  return `${site}:${video}:${Math.round(start * 1000)}`;
}

let cache: Bookmark[] | null = null;

export async function list(): Promise<Bookmark[]> {
  if (cache) return cache;
  const got = await chrome.storage.local.get(KEY);
  cache = (got[KEY] as Bookmark[] | undefined) ?? [];
  return cache;
}

async function write(next: Bookmark[]): Promise<void> {
  cache = next;
  await chrome.storage.local.set({ [KEY]: next });
}

/** Saved lines for one video, oldest moment first — the order they were spoken. */
export async function forVideo(site: string, video: string): Promise<Bookmark[]> {
  const all = await list();
  return all.filter((b) => b.site === site && b.video === video).sort((a, b) => a.start - b.start);
}

export async function has(id: string): Promise<boolean> {
  return (await list()).some((b) => b.id === id);
}

export async function add(bm: Bookmark): Promise<void> {
  const all = await list();
  if (all.some((b) => b.id === bm.id)) return;
  const next = [...all, bm];
  // Drop the oldest saves rather than refuse the new one: hitting the cap
  // should never make the button appear broken.
  await write(next.length > CAP ? next.slice(next.length - CAP) : next);
}

export async function remove(id: string): Promise<void> {
  const all = await list();
  const next = all.filter((b) => b.id !== id);
  if (next.length !== all.length) await write(next);
}

/** Save if absent, unsave if present. Returns the state it settled on. */
export async function toggle(bm: Bookmark): Promise<boolean> {
  if (await has(bm.id)) {
    await remove(bm.id);
    return false;
  }
  await add(bm);
  return true;
}

export async function clear(): Promise<void> {
  await write([]);
}

/**
 * The lines saved in one language. A line belongs to the language it was
 * saved in, and the saved view shows the one being learned: a list of two
 * languages is a list of neither, and its lines all go to one deck.
 */
export async function inLanguage(lang: string): Promise<Bookmark[]> {
  return (await list()).filter((b) => b.lang === lang);
}

/**
 * One language's lines, newest first, and grouped by video — the shape the
 * saved view reads in. Within a video the lines stay in spoken order, so a
 * group reads like a shortened transcript rather than a pile of clips.
 */
export async function grouped(
  lang: string,
): Promise<Array<{ site: string; video: string; title: string; lines: Bookmark[] }>> {
  const all = await inLanguage(lang);
  const groups = new Map<string, { site: string; video: string; title: string; lines: Bookmark[]; last: number }>();
  for (const b of all) {
    const key = `${b.site}:${b.video}`;
    const g = groups.get(key) ?? { site: b.site, video: b.video, title: b.title, lines: [], last: 0 };
    g.lines.push(b);
    g.last = Math.max(g.last, b.savedAt);
    g.title ||= b.title;
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.last - a.last)
    .map(({ site, video, title, lines }) => ({
      site,
      video,
      title,
      lines: lines.sort((a, b) => a.start - b.start),
    }));
}

/** Invalidate the cache when another tab or the options page writes. */
export function watch(onChange: () => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[KEY]) return;
    cache = (changes[KEY].newValue as Bookmark[] | undefined) ?? [];
    onChange();
  });
}
