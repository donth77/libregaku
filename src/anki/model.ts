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

/**
 * Hierarchical, so Anki can filter at any level: `tag:libregaku` for
 * everything, `tag:libregaku::netflix` for one source.
 */
export function tagsFor(opts: { source: string; lang: string }): string[] {
  return [ROOT_TAG, `${ROOT_TAG}::${opts.source}`, `${ROOT_TAG}::lang::${opts.lang}`];
}

/** Anki's furigana syntax: 勉強[べんきょう]する, with a space before kanji runs. */
export function toAnkiFurigana(segments: Array<{ text: string; ruby?: string }>): string {
  return segments
    .map((s, i) => {
      if (!s.ruby) return s.text;
      // Anki needs whitespace before a bracketed run unless it starts the field.
      return `${i === 0 ? '' : ' '}${s.text}[${s.ruby}]`;
    })
    .join('');
}
