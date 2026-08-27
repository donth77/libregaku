/**
 * JMdict part-of-speech codes, expanded.
 *
 * The raw codes ("v5k", "adj-na") are precise and unreadable. Only the ones
 * that actually appear on subtitle vocabulary are worth expanding; anything
 * unmapped falls through as-is rather than being hidden.
 */
const POS: Record<string, string> = {
  n: 'noun', 'n-adv': 'adverbial noun', 'n-t': 'temporal noun', 'n-suf': 'noun suffix',
  'n-pref': 'noun prefix', pn: 'pronoun', 'adj-i': 'i-adjective', 'adj-na': 'na-adjective',
  'adj-no': 'no-adjective', 'adj-pn': 'pre-noun adjectival', adv: 'adverb', 'adv-to': 'adverb',
  aux: 'auxiliary', 'aux-v': 'auxiliary verb', 'aux-adj': 'auxiliary adjective',
  conj: 'conjunction', cop: 'copula', ctr: 'counter', exp: 'expression', int: 'interjection',
  num: 'numeric', prt: 'particle', pref: 'prefix', suf: 'suffix', unc: 'unclassified',
  vs: 'suru verb', 'vs-i': 'suru verb', 'vs-s': 'suru verb', vt: 'transitive', vi: 'intransitive',
  v1: 'ichidan verb', 'v1-s': 'ichidan verb', vk: 'kuru verb', vz: 'zuru verb',
  v5b: 'godan verb', v5g: 'godan verb', v5k: 'godan verb', 'v5k-s': 'godan verb',
  v5m: 'godan verb', v5n: 'godan verb', v5r: 'godan verb', 'v5r-i': 'godan verb',
  v5s: 'godan verb', v5t: 'godan verb', v5u: 'godan verb', 'v5u-s': 'godan verb',
  v5aru: 'godan verb',
};

export function readablePos(codes: string[]): string {
  const seen = new Set<string>();
  for (const c of codes) {
    const label = POS[c] ?? c;
    seen.add(label);
  }
  return [...seen].join(', ');
}
