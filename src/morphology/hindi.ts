import type { Ending, LemmaHints } from './lemma';

/**
 * What Hindi forms need said of them that Wiktionary's table does not say
 * (lemma.ts, as Spanish's does in spanish.ts). है and था are होना before
 * anything else they are.
 */
export const HINDI: LemmaHints = {
  first: ['होना', 'करना', 'जाना', 'रहना', 'सकना', 'आना', 'देना', 'लेना', 'कहना'],
  common: [],
  auxiliaries: [],
  // The pronouns that stand for a person. Hindi has no articles.
  grammar: ['मैं', 'तू', 'तुम', 'आप', 'वह', 'वो', 'यह', 'ये', 'वे', 'हम', 'मुझे', 'तुम्हें', 'उसे', 'हमें', 'उन्हें', 'इसे'],
};

const NUKTA = /़/g;
const CHANDRABINDU = /ँ/g;
/** A nasal consonant with a virama before another consonant: न्द, म्प, ङ्ग. */
const HALF_NASAL = /[ङञणनम]्(?=[क-ह])/g;
/** The mark that takes the vowel off a consonant: बिल्कुल is often written बिलकुल, ख़त्म खतम, गर्म गरम. */
const VIRAMA = /्/g;

/**
 * The key a Hindi word is looked up by, the same however it is spelt. Hindi
 * writes one sound several ways, and subtitles and dictionaries choose
 * differently: the dot under a letter for a sound from Persian or English
 * (ख़ूबसूरत, खूबसूरत), a nasal vowel with the moon and dot or the dot alone
 * (हूँ, हूं), and a nasal before a consonant as a half letter or a dot
 * (ज़िन्दगी, ज़िंदगी), and a consonant with its vowel taken off or left on
 * (बिल्कुल, बिलकुल). The dictionary keeps each word under this key as well
 * as under its own spelling (src/dict/sources.ts), and a line's words are
 * looked up by it.
 */
export function foldHindi(word: string): string {
  return word.normalize('NFC').replace(NUKTA, '').replace(CHANDRABINDU, 'ं').replace(HALF_NASAL, 'ं').replace(VIRAMA, '');
}

/**
 * The word a Hindi word may be by its ending, where the dictionary has none
 * for it: the polite imperative, a verb's stem and -इए (आइए, बताइए) or -िए
 * (सुनिए, बैठिए), is of the verb in -ना, and a noun or adjective in -ा takes
 * -े in the oblique and the plural (वाले, डब्बे), which Wiktionary lists for
 * some words only. Measured on 16,479 Tatoeba sentences.
 */
export function hindiEndings(word: string): Ending[] {
  const out: Ending[] = [];
  if (word.endsWith('इए') || word.endsWith('िए')) out.push({ key: `${word.slice(0, -2)}ना`, label: 'imperative' });
  if (word.endsWith('े')) out.push({ key: `${word.slice(0, -1)}ा` });
  return out;
}
