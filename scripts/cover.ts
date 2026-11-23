/**
 * COVER: how much of a language's commonest words a dictionary in another language has, as a dictionary in the
 * learner's own language for the pair (OWN_DICTIONARIES in settings.ts) is asked first. The bar there is 55% of
 * the thousand commonest words.
 *
 * The words come from the script that reads the language as the extension does — scripts/measure-forms.ts for the
 * languages read by their dictionary's forms and for Chinese, scripts/compare-unidic.ts for Japanese — each the
 * dictionary word a card opens for a word of a line, counted over Tatoeba. Each dictionary is read by its own
 * source (src/dict/sources.ts), and has a word where one of its keys is that word.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { SOURCES, wikdict, wty } from '../src/dict/sources';
import { FORMS_FOLLOWED, type Source } from '../src/dict/store';

/** Every download kept in `dir` under a hash of its address, and fetched only the first time. */
export function keepDownloads(dir: string): void {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const path = `${dir}/${createHash('sha1').update(url).digest('hex')}`;
    if (!existsSync(path)) {
      console.log(`downloading ${url}`);
      const res = await realFetch(input, init);
      if (!res.ok) return res;
      writeFileSync(path, new Uint8Array(await res.arrayBuffer()));
    }
    const body = readFileSync(path);
    return new Response(body, { headers: { 'content-length': String(body.length) } });
  }) as typeof fetch;
}

/** A dictionary by its id, the extension's own or one it could have: wty-ja-pl, wikdict-zh-es. */
function sourceOf(id: string): { source: Source; native: string } | undefined {
  const [kind, target = '', native = ''] = id.split('-');
  const source = kind === 'wty' ? wty(target, native) : kind === 'wikdict' ? wikdict(target, native) : SOURCES[id];
  return source ? { source, native } : undefined;
}

/**
 * The report's lines for `ids`, a dictionary each: its keys, the share of the words it has, and the share of their
 * uses. `common` is the thousand commonest words, each with how often it was used.
 */
export async function cover(common: Array<[word: string, uses: number]>, ids: string[]): Promise<string[]> {
  const uses = common.reduce((n, [, c]) => n + c, 0);
  const lines = [
    `THE ${common.length} COMMONEST WORDS, IN DICTIONARIES OF ANOTHER LANGUAGE: words had, and the share of their uses`,
  ];
  for (const id of ids) {
    const found = sourceOf(id);
    if (!found) {
      lines.push(`${id}\tno such dictionary`);
      continue;
    }
    const keys = new Set<string>();
    const forms = new Map<string, string[]>();
    try {
      for await (const batch of await found.source.read(found.native)) {
        for (const entry of batch.entries) for (const k of entry.keys) keys.add(k);
        for (const row of batch.inflections ?? []) forms.set(row.form, [...(forms.get(row.form) ?? []), ...row.of.map((o) => o.lemma)]);
      }
    } catch (e) {
      lines.push(`${id}\t${String(e).slice(0, 80)}`);
      console.log(lines.at(-1));
      continue;
    }
    // As lookup() in src/dict/store.ts answers: an entry under the word, or one for a word it is a form or another
    // spelling of, as 說 is of 说 where only the simplified has an entry.
    const has = (word: string): boolean =>
      keys.has(word) || [...new Set(forms.get(word) ?? [])].slice(0, FORMS_FOLLOWED).some((lemma) => keys.has(lemma));
    const words = common.filter(([w]) => has(w));
    const used = words.reduce((n, [, c]) => n + c, 0);
    const share = (100 * words.length) / Math.max(1, common.length);
    lines.push(`${id}\t${keys.size} keys\t${share.toFixed(1)}% of the words\t${((100 * used) / Math.max(1, uses)).toFixed(1)}% of their uses`);
    console.log(lines.at(-1));
    // What it is asked for most and does not have, to read.
    lines.push(`\tlacks ${common.filter(([w]) => !has(w)).slice(0, 40).map(([w]) => w).join(' ')}`);
  }
  return lines;
}
