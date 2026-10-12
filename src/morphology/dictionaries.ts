/**
 * The analyser's dictionaries, pinned to one lindera release.
 *
 * Pinned for the same reason JMdict is: lindera's dictionary format changed at
 * v6, and a "latest" URL would fetch files this build of the WASM cannot read.
 * The wasm (package.json) and these URLs move together, deliberately.
 *
 * Its own module so the contract canary can check the URL without loading the
 * offscreen document.
 */
export const LINDERA_DICTS: Record<string, string> = {
  // Japanese, ~10 MB.
  ipadic: 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-ipadic-6.0.0.zip',
  // Japanese, UniDic: ~46 MB. Reads casual speech, katakana for effect and new words IPADIC (2007) does not;
  // its words are put into IPADIC's shape for the merge rules (src/morphology/unidic.ts).
  unidic: 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-unidic-6.0.0.zip',
  // Korean (mecab-ko-dic), ~20 MB.
  'ko-dic': 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-ko-dic-6.0.0.zip',
  // Chinese, ~7 MB: CC-CEDICT as it stood in 2020, with word costs. Read for
  // where its words begin and end only — it knows one reading for each, and
  // for 了, 的 and 没 the wrong one. Readings come from the dictionary itself
  // (src/dict/cedict.ts).
  'cc-cedict': 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-cc-cedict-6.0.0.zip',
};
