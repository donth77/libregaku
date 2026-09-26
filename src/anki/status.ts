import { ROOT_TAG } from './model';
import { ankiCall as call } from './rpc';

/**
 * What the learner knows, derived from their Anki collection.
 *
 * The central claim of this project: Libregaku stores no authoritative record
 * of your vocabulary. It reads Anki and caches the answer, so what you know
 * stays consistent on your phone, after a reinstall, and in any other tool —
 * with no account and no server.
 *
 * Scoped by *deck*, never by our own tag. A learner's known words live all over
 * their collection, mostly in decks that predate this extension; counting only
 * cards we made would report someone fluent as a beginner.
 */

/**
 * Word statuses, following Migaku's five.
 *
 *   unknown   never studied, never marked — including a card that exists but
 *             has never been reviewed, as in a premade deck not reached yet
 *   learning  a card is being drilled, or the learner mined it with Libregaku
 *   known     the card is mature — Anki's own 21-day threshold, which is also
 *             where Migaku draws the line
 *   tracking  the learner wants this word to stand out: not new, not learned,
 *             just watched. Nothing in Anki expresses this, which is exactly
 *             why it is worth having
 *   ignored   never mark this again — names, particles, words already known
 *             long before this extension existed
 */
export type Status = 'known' | 'learning' | 'tracking' | 'unknown' | 'ignored';

/** Learning is a fact about an Anki card, never a manual override. */
export type OverrideStatus = Exclude<Status, 'learning'>;

/** Anki's own threshold for a mature card. */
export const MATURE_DAYS = 21;

/** Notes per notesInfo request: large enough to be few, small enough never to stall Anki. */
export const NOTES_PER_REQUEST = 1000;

interface NoteInfo {
  noteId?: number;
  fields?: Record<string, { value: string; order?: number }>;
}

export interface StatusMap {
  /**
   * A word's status, by the form written on its card.
   *
   * `reading` is the word's own reading, in hiragana or katakana, when the
   * caller knows it — the dictionary form's reading, not an inflected
   * surface's (see lemmaReading). It lets a word written in kanji find a card
   * written only in kana. A word written in kana needs no reading: it finds
   * cards written in kanji by theirs.
   */
  get(word: string, reading?: string): Status;
  size: number;
}

/**
 * Anki's search for "this deck and everything under it", or the whole
 * collection.
 *
 * Inside the quotes Anki still reads `\` and `"` as escapes, and `*` and `_`
 * as wildcards — so a deck called Core_2k also matched Core-2k, and a quote
 * in a deck name broke the search outright, which read as Anki being closed.
 */
export function deckQuery(scope: string): string {
  if (!scope) return 'deck:*';
  return `deck:"${scope.replace(/[\\"*_]/g, '\\$&')}"`;
}

/**
 * Three searches decide every status, and no card is read.
 *
 * The first version fetched cardsInfo for the whole collection to read two
 * numbers per card — and AnkiConnect renders every card's question and answer,
 * with its CSS, to answer that. On a real collection that froze Anki and
 * could outgrow what one extension message carries, after which every word
 * read as unknown. Searches are answered from Anki's own index:
 *
 *   studied  a card has been reviewed at least once          → learning
 *   mined    it carries our tag: added from a video           → learning
 *   mature   a card's interval is 21 days or more            → known
 *
 * A note in none of these — an unreviewed card in a premade deck — is
 * unknown, and is never fetched at all. Suspension changes nothing: a
 * suspended card is as known as its interval says.
 */
export async function buildStatusMap(scope: string): Promise<StatusMap> {
  const deck = deckQuery(scope);
  const studied = await call<number[]>('findNotes', { query: `${deck} -is:new` });
  const mined = await call<number[]>('findNotes', { query: `${deck} tag:${ROOT_TAG}` });
  const mature = new Set(
    await call<number[]>('findNotes', { query: `${deck} prop:ivl>=${MATURE_DAYS}` }),
  );

  const wanted = [...new Set([...studied, ...mined])];
  const index = new StatusIndex();
  for (let i = 0; i < wanted.length; i += NOTES_PER_REQUEST) {
    const notes = await call<NoteInfo[]>('notesInfo', { notes: wanted.slice(i, i + NOTES_PER_REQUEST) });
    for (const note of notes) {
      // A note deleted between the search and now comes back as {}.
      if (typeof note?.noteId !== 'number' || !note.fields) continue;
      index.add(note.fields, mature.has(note.noteId) ? 'known' : 'learning');
    }
  }
  return index;
}

/** Higher wins when one word has several notes: known in one note stays known. */
const RANK: Record<Status, number> = { unknown: 0, ignored: 1, tracking: 2, learning: 3, known: 4 };

function higher(a: Status | undefined, b: Status | undefined): Status | undefined {
  if (!a) return b;
  if (!b) return a;
  return RANK[b] > RANK[a] ? b : a;
}

function raise(map: Map<string, Status>, key: string, status: Status): void {
  const next = higher(map.get(key), status);
  if (next) map.set(key, next);
}

/**
 * Notes indexed by how the word is written and by how it is read.
 *
 * Exact spelling alone missed the commonest case in subtitles: a word the
 * learner has on a card as 分かる, written on screen as わかる. So each note is
 * also filed under its reading, and a word written in kana is looked up by
 * reading as well as by spelling.
 *
 * Reading never joins two spellings in kanji. 紙 and 神 are both かみ and are
 * different words; only a card written in kana can be reached from kanji,
 * and only when the caller supplies the reading.
 */
class StatusIndex implements StatusMap {
  /** Spelling on the card → status. */
  #byWord = new Map<string, Status>();
  /** Hiragana reading → status, over every note whose reading is known. */
  #byReading = new Map<string, Status>();
  /** Hiragana reading → status, over notes written only in kana. */
  #kanaByReading = new Map<string, Status>();

  get size(): number {
    return this.#byWord.size;
  }

  add(fields: Record<string, { value: string; order?: number }>, status: Status): void {
    const named = byName(fields);
    const raw = expressionOf(named);
    if (!raw) return;
    const word = strip(raw);
    if (!word) return;
    raise(this.#byWord, word, status);

    const kana = phonetic(word);
    if (kana) {
      raise(this.#byReading, kana, status);
      raise(this.#kanaByReading, kana, status);
      return;
    }
    const reading = readingOf(raw, named, word);
    if (reading) raise(this.#byReading, reading, status);
  }

  get(word: string, reading?: string): Status {
    let best = this.#byWord.get(word);
    const kana = phonetic(word);
    if (kana) {
      best = higher(best, this.#byReading.get(kana));
    } else if (reading) {
      const r = phonetic(reading.trim());
      if (r) best = higher(best, this.#kanaByReading.get(r));
    }
    return best ?? 'unknown';
  }
}

/** Field values by lower-cased name, in the note type's own order. */
function byName(fields: Record<string, { value: string; order?: number }>): Map<string, string> {
  const entries = Object.entries(fields).sort(
    ([, a], [, b]) => (a?.order ?? 0) - (b?.order ?? 0),
  );
  return new Map(entries.map(([name, f]) => [name.toLowerCase(), f?.value ?? '']));
}

/**
 * Which field holds the word being learned.
 *
 * Our own note type is known. Everyone else's is not, so fall back to the
 * first field, which by Anki convention is the sort field and in practice is
 * the expression for essentially every Japanese note type.
 */
const WORD_FIELDS = ['expression', 'word', 'vocabulary', 'front', 'kanji', '単語'];

function expressionOf(named: Map<string, string>): string | null {
  for (const name of WORD_FIELDS) {
    const v = named.get(name)?.trim();
    if (v) return v;
  }
  const first = named.values().next().value?.trim();
  return first || null;
}

/**
 * Where a note keeps its reading. Most Japanese note types have one of
 * these; ours stores 分[わ]かる in Reading, which toKana() reads as わかる.
 */
const READING_FIELDS = [
  'reading', 'furigana', 'kana', 'hiragana', '読み', 'よみ', 'ふりがな',
  'expressionreading', 'expression reading', 'expressionfurigana', 'expression furigana',
  'wordreading', 'word reading', 'wordfurigana', 'word furigana',
  'vocabulary-kana', 'vocabulary-furigana', 'vocabkana', 'vocab kana',
];

/**
 * The note's reading: bracket furigana in the expression itself, else a
 * reading field. Only accepted when the word's own kana appear in it in
 * order, so a field holding something else — a sentence's reading, a
 * romanisation — is not mistaken for the word's.
 */
function readingOf(raw: string, named: Map<string, string>, word: string): string | null {
  for (const candidate of [raw, ...READING_FIELDS.map((n) => named.get(n))]) {
    if (!candidate) continue;
    const kana = toKana(candidate);
    if (kana && fits(word, kana)) return kana;
  }
  return null;
}

/** Fields carry HTML and furigana brackets; the key is the bare expression. */
function strip(html: string): string {
  return decode(
    html
      .replace(/<[^>]*>/g, '')
      // 勉強[べんきょう] → 勉強, with the space Anki wants before a run dropped.
      .replace(/ ?([^ >[\]]+?)\[[^\]]*\]/g, '$1')
      // [sound:…] and anything else bracketed.
      .replace(/\[[^\]]*\]/g, ''),
  ).trim();
}

/** A field as its reading: 分[わ]かる → わかる. Null unless the result is kana. */
function toKana(html: string): string | null {
  const text = decode(
    html
      .replace(/<[^>]*>/g, '')
      .replace(/\[sound:[^\]]*\]/g, '')
      .replace(/ ?([^ >[\]]+?)\[([^\]]*)\]/g, '$2')
      .replace(/\[[^\]]*\]/g, ''),
  ).replace(/\s+/g, '');
  return phonetic(text);
}

/*
 * The one script-specific piece of the status layer: which characters spell a
 * word by sound. Kana, with katakana folded onto hiragana so ワカル and わかる
 * are one reading. Every other script returns null here, and matching stays
 * by exact spelling, as it always was. If a second language ever needs
 * reading matching, this belongs behind the Segmenter seam instead.
 */
const KANA = '\\u3041-\\u3096\\u309D\\u309E\\u30A1-\\u30FA\\u30FC-\\u30FE';
const KANA_ONLY = new RegExp(`^[${KANA}]+$`);
const NOT_KANA = new RegExp(`[^${KANA}]+`);

function phonetic(s: string): string | null {
  if (!KANA_ONLY.test(s)) return null;
  return s.replace(/[ァ-ヶヽヾ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** Whether the word's own kana — かる in 分かる — appear in the reading, in order. */
function fits(word: string, reading: string): boolean {
  let at = 0;
  for (const run of word.split(NOT_KANA)) {
    if (!run) continue;
    const kana = phonetic(run) ?? run;
    const i = reading.indexOf(kana, at);
    if (i < 0) return false;
    at = i + kana.length;
  }
  return true;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
};

/** Entities back to text, after brackets are handled: &#91; is text, never furigana. */
function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith('#')) {
      const hex = code[1] === 'x' || code[1] === 'X';
      const n = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : entity;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? entity;
  });
}

/**
 * The reading of a dictionary form, from the surface it was found as.
 *
 * The analyser reads what is on screen — 食べた is タベタ — while a card is
 * keyed on 食べる. Inflection only changes the kana after the shared stem, so
 * swap the surface's tail for the lemma's: たべた − た + る = たべる. Undefined
 * when either tail is not kana, which is where that stops being true.
 */
export function lemmaReading(lemma: string, surface: string, surfaceReading?: string): string | undefined {
  const reading = surfaceReading ? phonetic(surfaceReading.trim()) : null;
  if (!reading) return undefined;
  if (lemma === surface) return reading;
  // The one verb whose kanji changes its reading as it inflects: 来た is きた.
  if (lemma === '来る') return 'くる';

  let p = 0;
  while (p < lemma.length && p < surface.length && lemma[p] === surface[p]) p++;
  const surfaceTail = surface.slice(p);
  const lemmaTail = lemma.slice(p);
  const st = surfaceTail ? phonetic(surfaceTail) : '';
  const lt = lemmaTail ? phonetic(lemmaTail) : '';
  if (st === null || lt === null || !reading.endsWith(st)) return undefined;
  return reading.slice(0, reading.length - st.length) + lt;
}

/*
 * Words marked by hand, which Anki has no way to express on its own.
 *
 * Kept in chrome.storage.local. They were in sync storage, whose 8 KB limit
 * per item a few hundred marks exhausted; past that every write was refused,
 * silently, and each new mark vanished at the next refresh. Saved lines made
 * the same move for the same reason (bookmarks.ts). The cost is the same too:
 * marks stay in this browser profile.
 *
 * Still pending, and a design decision rather than a refactor: reconciling
 * these into Anki as tagged suspended notes (ROADMAP M5), which would make
 * them follow the collection to other devices and survive a reinstall.
 */
const OVERRIDES = 'libregaku.overrides';
/** Set once the old sync item has been brought over on this machine. */
const MIGRATED = 'libregaku.overrides.migrated';

function clean(raw: unknown): Record<string, OverrideStatus> {
  const out: Record<string, OverrideStatus> = {};
  if (!raw || typeof raw !== 'object') return out;
  // Older versions persisted every mined word as "learning", masking Anki
  // forever. Drop those values; the next write removes them for good.
  for (const [word, status] of Object.entries(raw as Record<string, unknown>)) {
    if (status === 'known' || status === 'tracking' || status === 'unknown' || status === 'ignored') {
      out[word] = status;
    }
  }
  return out;
}

/** The marks as stored. Throws when storage cannot be read. */
async function readOverrides(): Promise<Record<string, OverrideStatus>> {
  const got = await chrome.storage.local.get([OVERRIDES, MIGRATED]);
  const local = clean(got[OVERRIDES]);
  if (got[MIGRATED]) return local;
  return migrate(local);
}

/**
 * One time: bring the sync item over, then remove it. The flag, not the
 * removal, is what stops a second import — so a failed removal can never
 * bring back a mark cleared since.
 */
async function migrate(local: Record<string, OverrideStatus>): Promise<Record<string, OverrideStatus>> {
  let legacy: Record<string, OverrideStatus>;
  try {
    legacy = clean((await chrome.storage.sync.get(OVERRIDES))[OVERRIDES]);
  } catch {
    return local;   // sync unreadable just now; try again next time
  }
  // Anything already local was written after the sync copy, so it wins.
  const merged = { ...legacy, ...local };
  try {
    await chrome.storage.local.set({ [OVERRIDES]: merged, [MIGRATED]: true });
  } catch {
    return merged;   // shown this session; the import is retried next time
  }
  try {
    await chrome.storage.sync.remove(OVERRIDES);
  } catch {
    /* the flag already prevents a second import */
  }
  return merged;
}

export async function loadOverrides(): Promise<Map<string, OverrideStatus>> {
  try {
    return new Map(Object.entries(await readOverrides()));
  } catch {
    return new Map();
  }
}

/** Writes from this page, one at a time, each reading the one before it. */
let writing: Promise<boolean> = Promise.resolve(true);

/**
 * Record a mark, or clear it with null. Resolves false when it could not be
 * stored, so the caller can say the mark will not outlive this page.
 */
export function setOverride(word: string, status: OverrideStatus | null): Promise<boolean> {
  const run = writing.then(async () => {
    // Read strictly: writing back a map that failed to load would erase
    // every other mark.
    const marks = await readOverrides();
    if (status) marks[word] = status;
    else delete marks[word];
    await chrome.storage.local.set({ [OVERRIDES]: marks });
    return true;
  }).catch((e: unknown) => {
    console.warn('[libregaku] could not store the mark for', word, e);
    return false;
  });
  writing = run;
  return run;
}

export { ROOT_TAG };
