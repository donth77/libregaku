/**
 * A language read by its dictionary's table of forms (tier 1: src/morphology/lemma.ts), measured on Tatoeba.
 *
 * Every sentence of a spread of Tatoeba's goes through the language's own segmenter (analyserFor() in
 * src/morphology/index.ts), with the dictionary read by its own source (SOURCES in src/dict/sources.ts) and
 * answered from memory as formsOf() in src/dict/store.ts answers from the browser's store. Run with
 * scripts/measure-forms.mjs, which builds this first.
 *
 *   node scripts/measure-forms.mjs it                 # how many words find an entry; the commonest that do not,
 *                                                     # and the commonest forms that could be more than one word
 *   SAVE=base node scripts/measure-forms.mjs it       # the same, and every sentence's words saved as "base"
 *   AGAINST=base node scripts/measure-forms.mjs it    # every word read otherwise than in that run, by kind
 *   SAMPLE=40000 node scripts/measure-forms.mjs pt    # more sentences (20,000 by default)
 *
 *   COVER=wty-zh-pl,wikdict-zh-es node scripts/measure-forms.mjs zh   # how many of the commonest words each has
 *
 * Run it before adding a language or changing what its hints (italian.ts, spanish.ts…), its GAPS, the reader
 * (src/dict/wty.ts) or the hyphen joining say, and read what changes: the hints and GAPS take a word only on
 * what this counts. Data is downloaded into node_modules/.cache/libregaku-forms.
 *
 * Chinese is read too, for COVER (scripts/cover.ts): its words are found by the analyser, which is run here on
 * the dictionary the offscreen document reads it with (ANALYSED), and looked up as they are written.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import init, { TokenizerBuilder, loadDictionaryFromBytes, type Tokenizer } from 'lindera-wasm';
import { DICTIONARIES } from '../src/settings';
import { SOURCES } from '../src/dict/sources';
import type { Entry } from '../src/dict/jmdict';
import type { FormInfo, Inflection } from '../src/dict/store';
import { onlySpelling } from '../src/dict/wty';
import { LINDERA_DICTS } from '../src/morphology/dictionaries';
import { analyserFor } from '../src/morphology/index';
import { cover, keepDownloads } from './cover';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CACHE = `${ROOT}node_modules/.cache/libregaku-forms`;
const LANG = process.argv[2] ?? '';
const SAMPLE = Number(process.env.SAMPLE ?? 20000);
/** Tatoeba's names for the languages. */
const ISO3: Record<string, string> = {
  es: 'spa', fr: 'fra', de: 'deu', it: 'ita', pt: 'por', en: 'eng', tr: 'tur', th: 'tha', hi: 'hin', ar: 'ara', zh: 'cmn',
};
/**
 * The languages read by the analyser, with the Lindera dictionary the offscreen document reads each with: Chinese
 * is cc-cedict's words and nothing more of them (its reader in src/offscreen.ts), the readings coming from CC-CEDICT.
 */
const ANALYSED: Record<string, string> = { zh: 'cc-cedict' };

const source = SOURCES[DICTIONARIES[LANG] ?? ''];
const analyser = analyserFor(LANG);
if (!source || !analyser || !ISO3[LANG]) {
  console.error(`No dictionary forms for "${LANG}": give a language read by its dictionary's forms, such as es or it, or zh.`);
  process.exit(1);
}
mkdirSync(CACHE, { recursive: true });

// The source downloads with fetch; each file is fetched once and kept.
keepDownloads(CACHE);

/** The analyser on one of Lindera's dictionaries, downloaded into the cache the first time. */
async function tokenizerFor(dict: string): Promise<Tokenizer> {
  const dir = `${CACHE}/${dict}`;
  if (!existsSync(`${dir}.zip.done`)) {
    console.log(`downloading ${LINDERA_DICTS[dict]}`);
    execFileSync('curl', ['-sSL', '-o', `${dict}.zip`, LINDERA_DICTS[dict]!], { cwd: CACHE });
    execFileSync('unzip', ['-o', '-q', `${dict}.zip`, '-d', dict], { cwd: CACHE });
    writeFileSync(`${dir}.zip.done`, '');
  }
  await init({ module_or_path: readFileSync(`${ROOT}node_modules/lindera-wasm/lindera_wasm_bg.wasm`) });
  const at = `${dir}/${readdirSync(dir)[0]}`;
  const file = (n: string): Uint8Array => new Uint8Array(readFileSync(`${at}/${n}`));
  const dictionary = loadDictionaryFromBytes(
    file('metadata.json'), file('dict.trie'), file('dict.valsidx'), file('dict.vals'),
    file('dict.wordsidx'), file('dict.words'), file('matrix.mtx'), file('char_def.bin'), file('unk.bin'),
  );
  return new TokenizerBuilder().setDictionaryInstance(dictionary).setMode('normal').build();
}
const analysedWith = ANALYSED[LANG];
const tokenizer = analysedWith ? await tokenizerFor(analysedWith) : undefined;
/** A line as the offscreen document answers a 'tokenize' for it (analyse() there). */
const tokenize = (text: string): { ok: boolean; tokens: Array<{ surface: string }>; complete: boolean } => ({
  ok: true, tokens: (tokenizer?.tokenize(text) as Array<{ surface: string }> | undefined ?? []).map((t) => ({ surface: t.surface })), complete: true,
});

// The dictionary as the store keeps it: entries under their keys, and the forms.
const entries = new Map<string, Entry[]>();
const forms = new Map<string, Inflection[]>();
for await (const batch of await source.read('en')) {
  for (const { entry, keys } of batch.entries) for (const k of keys) entries.set(k, [...(entries.get(k) ?? []), entry]);
  for (const row of batch.inflections ?? []) forms.set(row.form, [...(forms.get(row.form) ?? []), row]);
}

// formsOf(), from memory.
function headword(word: string): { senses: number; kind: string[]; spellingOf: string[] } {
  const kind = new Set<string>();
  let senses = 0;
  for (const e of entries.get(word) ?? []) {
    senses += e.senses.length;
    for (const k of e.kind ?? e.senses[0]?.pos ?? []) kind.add(k);
  }
  const spellingOf = (forms.get(word) ?? []).flatMap((r) => r.of).filter((w) => w.tags.some((t) => t === 'alternative' || t === 'alt-of')).map((w) => w.lemma);
  return { senses, kind: [...kind], spellingOf: [...new Set(spellingOf)] };
}
function formsOf(asked: string[]): Record<string, FormInfo> {
  const out: Record<string, FormInfo> = {};
  for (const form of new Set(asked)) {
    const self = headword(form);
    const rows = forms.get(form) ?? [];
    if (!self.senses && !rows.length) continue;
    const of: FormInfo['of'] = [];
    for (const row of rows) {
      for (const way of row.of) {
        const pos = row.pos ? { pos: row.pos } : {};
        const target = headword(way.lemma);
        const further = target.senses ? [] : (forms.get(way.lemma) ?? []).flatMap((r) => r.of);
        if (!further.length) {
          of.push({ ...way, ...pos, senses: target.senses, ...(target.spellingOf.length ? { spellingOf: target.spellingOf } : {}) });
          continue;
        }
        // As formsOf() does: a form of another spelling of a word is marked so, with no meanings to weigh.
        for (const hop of further) {
          if (hop.lemma === form) continue;
          if (onlySpelling(hop.tags)) of.push({ lemma: hop.lemma, tags: way.tags, ...pos, senses: 0, through: way.lemma });
          else of.push({ lemma: hop.lemma, tags: way.tags, ...pos, senses: headword(hop.lemma).senses });
        }
      }
    }
    out[form] = { word: self.senses > 0, senses: self.senses, kind: self.kind, of };
  }
  return out;
}
(globalThis as unknown as { chrome: unknown }).chrome = {
  runtime: {
    sendMessage: async (msg: { type?: string; forms?: string[]; text?: string }) => (
      msg.type === 'dict-forms' ? { ok: true, forms: formsOf(msg.forms ?? []) }
        : msg.type === 'tokenize' && tokenizer ? tokenize(msg.text ?? '')
          : {}),
  },
};

// SHOW='มั้ย|เด็กๆ': what the dictionary answers for each line's words, and what each is read as.
if (process.env.SHOW) {
  const segmenter = analyser.make();
  for (const text of process.env.SHOW.split('|')) {
    for (const t of (await segmenter.segment(text)).filter((x) => !x.punct)) {
      console.log(`${t.surface} → ${t.lemma ?? '-'} ${JSON.stringify(formsOf([t.surface]))}`);
    }
  }
  process.exit(0);
}

// A spread of Tatoeba's sentences.
const iso = ISO3[LANG]!;
const tsv = `${CACHE}/${iso}_sentences.tsv`;
if (!existsSync(tsv)) {
  const url = `https://downloads.tatoeba.org/exports/per_language/${iso}/${iso}_sentences.tsv.bz2`;
  console.log(`downloading ${url}`);
  execFileSync('curl', ['-sSL', '-o', `${iso}_sentences.tsv.bz2`, url], { cwd: CACHE });
  execFileSync('bzip2', ['-dkf', `${iso}_sentences.tsv.bz2`], { cwd: CACHE });
}
const all = readFileSync(tsv, 'utf8').split('\n').map((l) => l.split('\t')[2]).filter((s): s is string => Boolean(s));
const step = Math.max(1, Math.floor(all.length / SAMPLE));
const lines = all.filter((_, i) => i % step === 0).slice(0, SAMPLE);

const segmenter = analyser.make();
const lower = (s: string): string => s.toLocaleLowerCase(LANG);
const missing = new Map<string, number>();
const ambiguous = new Map<string, { n: number; chose: Map<string, number>; could: string }>();
const saved: string[] = [];
let seen = 0;
let found = 0;
for (const text of lines) {
  const tokens = await segmenter.segment(text);
  const words = tokens.filter((t) => !t.punct);
  saved.push(`${words.map((t) => `${t.surface}${t.lemma && t.lemma !== t.surface ? `>${t.lemma}` : ''}`).join(' ')}\t${text}`);
  for (const t of words) {
    if (!/\p{L}/u.test(t.surface)) continue;
    seen++;
    if ([t.lemma, t.surface, lower(t.surface)].some((k) => k && entries.has(k))) found++;
    // Names are mostly capitalised; counted only in lower case.
    else if (t.surface === lower(t.surface)) missing.set(t.surface, (missing.get(t.surface) ?? 0) + 1);
    const info = formsOf([t.surface, lower(t.surface)]);
    const at = info[t.surface] ?? info[lower(t.surface)];
    if (!at) continue;
    const could = [...new Set([...(at.word ? [lower(t.surface)] : []), ...at.of.map((o) => o.lemma)])];
    if (could.length < 2) continue;
    const a = ambiguous.get(lower(t.surface)) ?? { n: 0, chose: new Map<string, number>(), could: could.join(' | ') };
    a.n++;
    a.chose.set(t.lemma ?? t.surface, (a.chose.get(t.lemma ?? t.surface) ?? 0) + 1);
    ambiguous.set(lower(t.surface), a);
  }
}

const out = `${CACHE}/${LANG}-report.txt`;
const report = [
  `${LANG}: ${lines.length} sentences, ${seen} words, ${found} with an entry (${((100 * found) / seen).toFixed(2)}%)`,
  '',
  'NO ENTRY, the commonest written in lower case (what GAPS is for):',
  ...[...missing].sort((a, b) => b[1] - a[1]).slice(0, 80).map(([w, n]) => `${n}\t${w}`),
  '',
  'MORE THAN ONE WORD, the commonest forms: what each was read as, and what it could be (what the hints are for):',
  ...[...ambiguous].sort((a, b) => b[1].n - a[1].n).slice(0, 150)
    .map(([w, a]) => `${a.n}\t${w}\t${[...a.chose].map(([l, n]) => `${l} ${n}`).join(', ')}\tcould be ${a.could}`),
];

/*
 * COVER=wty-it-fr,wikdict-it-fr: how much of the language's commonest words each dictionary has (scripts/cover.ts).
 * The words are the thousand commonest dictionary forms the lines were read as.
 */
if (process.env.COVER) {
  const counts = new Map<string, number>();
  for (const line of saved) {
    for (const w of (line.split('\t')[0] ?? '').split(' ')) {
      const [surface = '', lemma] = w.split('>');
      const key = lemma ?? lower(surface);
      if (/\p{L}/u.test(key) && entries.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const common = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 1000);
  report.push('', ...(await cover(common, process.env.COVER.split(','))));
}

if (process.env.SAVE) writeFileSync(`${CACHE}/${LANG}-${process.env.SAVE}.tsv`, saved.join('\n'));
if (process.env.AGAINST) {
  const was = readFileSync(`${CACHE}/${LANG}-${process.env.AGAINST}.tsv`, 'utf8').split('\n');
  const kinds = new Map<string, { n: number; eg: string }>();
  saved.forEach((now, i) => {
    const [before = ''] = (was[i] ?? '').split('\t');
    const [after = '', text = ''] = now.split('\t');
    if (before === after) return;
    const x = before.split(' ');
    const y = after.split(' ');
    const changes = x.length === y.length
      ? x.flatMap((w, j) => (w === y[j] ? [] : [`${w}  =>  ${y[j]}`]))
      : [`${before}  =>  ${after}`];
    for (const k of changes) {
      const kind = kinds.get(k) ?? { n: 0, eg: text };
      kind.n++;
      kinds.set(k, kind);
    }
  });
  const total = [...kinds.values()].reduce((n, k) => n + k.n, 0);
  report.push('', `READ OTHERWISE THAN IN "${process.env.AGAINST}": ${total} words`,
    ...[...kinds].sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${v.n}\t${k}\t${v.eg}`));
}
writeFileSync(out, report.join('\n'));
console.log(report[0]);
console.log(`the words with no entry, the forms that could be more than one word${process.env.AGAINST ? ', and every change' : ''}: ${out}`);
