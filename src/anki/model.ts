/**
 * How a Libregaku card identifies itself inside Anki.
 *
 * Three mechanisms, because they answer different questions:
 *
 *   note type  — "what shape is this card?"  Lets us template furigana, audio
 *                and screenshots, and makes our cards structurally distinct
 *                from anything else in the collection.
 *   tags       — "where did this come from?"  Filterable in Anki's own browser,
 *                hierarchical, survives editing, and syncs.
 *   Source     — "which moment, exactly?"  A per-card link back to the video
 *                and timestamp the word was mined from.
 *
 * A deliberate non-use: none of these scope the *status* query. Words a learner
 * knows live all over their collection, usually in decks that predate this
 * extension, and counting only our own cards would report someone fluent as a
 * beginner. Status is scoped by deck, which the user chooses.
 */

export const MODEL_NAME = 'Libregaku';
export const ROOT_TAG = 'libregaku';

export const FIELDS = [
  'Expression',      // 勉強する
  'Reading',         // 勉強[べんきょう]する — Anki's furigana syntax
  'Meaning',
  'Sentence',
  'SentenceMeaning',
  'Source',          // title · 12:34 · deep link
  'Audio',
  'Image',
] as const;

/**
 * `{{furigana:…}}` renders 漢字[かんじ] as ruby, and is why Reading is stored
 * in bracket form rather than as bare kana.
 */
const FRONT = `
<div class="expression">{{furigana:Reading}}</div>
{{#Audio}}<div class="audio">{{Audio}}</div>{{/Audio}}
{{#Sentence}}<div class="sentence">{{furigana:Sentence}}</div>{{/Sentence}}
`.trim();

const BACK = `
{{FrontSide}}
<hr id="answer">
<div class="meaning">{{Meaning}}</div>
{{#SentenceMeaning}}<div class="sentence-meaning">{{SentenceMeaning}}</div>{{/SentenceMeaning}}
{{#Image}}<div class="image">{{Image}}</div>{{/Image}}
{{#Source}}<div class="source">{{Source}}</div>{{/Source}}
`.trim();

const CSS = `
.card {
  font-family: -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif;
  font-size: 20px; text-align: center; color: #1a1a1a; background: #fff;
}
.expression { font-size: 42px; line-height: 1.6; margin-bottom: 8px; }
.expression rt { font-size: 40%; color: #666; }
.sentence { font-size: 22px; line-height: 1.9; color: #333; margin-top: 14px; }
.sentence rt { font-size: 40%; color: #888; }
.meaning { font-size: 20px; margin: 12px 0; }
.sentence-meaning { font-size: 16px; color: #555; }
.image img { max-width: 90%; max-height: 260px; border-radius: 6px; margin-top: 12px; }
.source { font-size: 11px; color: #999; margin-top: 16px; }
.source a { color: #999; }
hr#answer { border: 0; border-top: 1px solid #ddd; margin: 16px 0; }
.night_mode .card { color: #e8ecf6; background: #1a1a1a; }
.night_mode .expression rt, .night_mode .sentence rt { color: #999; }
.night_mode .meaning { color: #e8ecf6; }
.night_mode hr#answer { border-color: #333; }
`.trim();

export const MODEL = {
  modelName: MODEL_NAME,
  inOrderFields: [...FIELDS],
  css: CSS,
  isCloze: false,
  cardTemplates: [{ Name: 'Recognition', Front: FRONT, Back: BACK }],
};

/*
 * A hand mark — "I know this", "track this", "ignore this" — as a note.
 *
 * Its own note type rather than a flag on a vocabulary card, because a mark
 * is usually exactly what has no card: marking is not carding. Word is the
 * key the extension looks words up by, and so also the field Anki's
 * duplicate check reads, which keeps one note per word. The card exists only
 * because Anki has no note without one; it is suspended as soon as it is made
 * and never reviewed.
 *
 * The status is a tag, not a field: tags are cheap to change in bulk, visible
 * in Anki's browser, and searchable — `tag:libregaku::mark::known`.
 */
export const MARK_MODEL_NAME = 'Libregaku Mark';
export const MARK_FIELDS = ['Word', 'Reading'] as const;
export const MARK_DECK = 'Libregaku::Marks';
/** Anki's search for every mark note, whatever deck it has been moved to. */
export const MARK_SEARCH = `note:"${MARK_MODEL_NAME}"`;
export const MARK_TAG = `${ROOT_TAG}::mark`;

export const MARK_MODEL = {
  modelName: MARK_MODEL_NAME,
  inOrderFields: [...MARK_FIELDS],
  css: '.card { font-family: -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif; font-size: 28px; text-align: center; }',
  isCloze: false,
  cardTemplates: [{
    Name: 'Mark',
    Front: '{{Word}}',
    Back: '{{FrontSide}}{{#Reading}}<hr id="answer">{{Reading}}{{/Reading}}',
  }],
};

/** The tag that carries a mark's status: libregaku::mark::known. */
export function markTag(status: string): string {
  return `${MARK_TAG}::${status}`;
}

/**
 * Hierarchical, so Anki can filter at any level: `tag:libregaku` for
 * everything, `tag:libregaku::netflix` for one source.
 */
export function tagsFor(opts: { source: string; lang: string }): string[] {
  return [ROOT_TAG, `${ROOT_TAG}::${opts.source}`, `${ROOT_TAG}::lang::${opts.lang}`];
}

/**
 * Anki's furigana syntax: 勉強[べんきょう]する, with a space before kanji runs.
 *
 * The brackets are ours; everything between them is escaped, so a `[` or a
 * `<` in the text itself can never become ruby or markup. The result is field
 * HTML, ready to store — escaping it again would double the entities.
 */
export function toAnkiFurigana(segments: Array<{ text: string; ruby?: string }>): string {
  return segments
    .map((s, i) => {
      if (!s.ruby) return escapeText(s.text);
      // Anki needs whitespace before a bracketed run unless it starts the field.
      return `${i === 0 ? '' : ' '}${escapeText(s.text)}[${escapeText(s.ruby)}]`;
    })
    .join('');
}

/*
 * Field values are HTML: Anki renders them, and so does every client that
 * syncs them. Text from a subtitle or a dictionary is text, so none of it may
 * arrive as markup — an uploader's caption containing <img onerror> would
 * otherwise run in the reviewer.
 *
 * Brackets are escaped as well as markup. The templates render Reading and
 * Sentence through {{furigana:}}, which reads any `word[reading]` as ruby, so
 * a line such as ねえ[笑] put 笑 over ねえ as if it were its reading. An entity
 * is not a bracket to that filter, and still displays as one.
 */
const ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '[': '&#91;', ']': '&#93;',
};

function escapeText(text: string): string {
  return text.replace(/[&<>[\]]/g, (c) => ENTITIES[c] ?? c);
}

/** Text as a field: nothing in it becomes markup or ruby, and line breaks stay line breaks. */
export function fieldHtml(text: string): string {
  return escapeText(text).replace(/\r?\n/g, '<br>');
}

/**
 * The first field, which Anki's duplicate check reads.
 *
 * Escaped like any other, but a line break stays a raw newline. Anki checksums
 * the field with tags removed and entities decoded, so escaping leaves the
 * checksum alone — a `<br>` would not, and every multi-line line saved before
 * this change would stop being recognised as already added.
 */
export function keyField(text: string): string {
  return escapeText(text);
}

/**
 * Furigana markup we built, made safe to store: our brackets kept, any markup
 * neutralised. Idempotent over toAnkiFurigana's output, which has no raw `<`,
 * `>` or bare `&` left to find.
 */
export function furiganaField(markup: string): string {
  return markup
    .replace(/&(?!(?:[a-z][a-z0-9]*|#\d+|#x[0-9a-f]+);)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r?\n/g, '<br>');
}
