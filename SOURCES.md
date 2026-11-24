# Sources

Libregaku's code is under the MIT licence ([`LICENSE`](LICENSE)). The dictionaries, recordings and
other data it uses come from the projects below, each under its own licence. The extension credits
them too, under Settings → Data and licences.

Dictionaries are not shipped with the extension. Each is downloaded from its source the first time
you choose a language that uses it, and kept in your browser.

## Dictionaries

| Source | What it gives | Licence |
|---|---|---|
| [JMdict and KANJIDIC2](https://www.edrdg.org/jmdict/j_jmdict.html), by the Electronic Dictionary Research and Development Group, as JSON by [jmdict-simplified](https://github.com/scriptin/jmdict-simplified) | Japanese words, and the kanji they are written with | CC BY-SA 4.0 |
| [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict), by MDBG and its contributors | Chinese (Mandarin) words and their pinyin | CC BY-SA 4.0 |
| [CC-Canto](https://cantonese.org/), by Pleco | Cantonese words, and Jyutping for CC-CEDICT's | CC BY-SA 3.0 |
| [Wiktionary](https://www.wiktionary.org/), through [kaikki.org](https://kaikki.org/) and [wiktionary-to-yomitan](https://github.com/yomidevs/wiktionary-to-yomitan) | Most languages' words and their forms, and some of them explained in your own language, or given with your language's words for them from Wiktionary's translation tables | CC BY-SA 4.0 |
| [WikDict](https://www.wikdict.com/), by Karl Bartel, from Wiktionary through DBnary | Some languages explained in your own language | CC BY-SA 4.0 |
| [한국어기초사전 (KRDict)](https://krdict.korean.go.kr/), by the National Institute of Korean Language, as files by [Lyroxide](https://github.com/Lyroxide/yomitan-ko-dic) | Korean words explained in your own language | CC BY-SA 2.0 KR |
| [CFDICT](https://github.com/licryle/CxDICT), by chine.in, kept up to date by CxDICT | Chinese explained in French | CC BY-SA 4.0 |
| [HanDeDict](https://handedict.zydeo.net/), by HanDeDict and its contributors | Chinese explained in German | CC BY-SA 3.0 |

[`LANGUAGE-PAIRS.md`](LANGUAGE-PAIRS.md) says which of these each language you learn and each
language of your own uses.

While the Japanese dictionary is still downloading, a word you look up is looked up on
[Jotoba](https://jotoba.de/), then [Jisho](https://jisho.org/). Both are made from JMdict.

## Splitting a line into words

Japanese, Korean and Chinese are split into words by [Lindera](https://github.com/lindera/lindera)
(MIT licence), which is part of the extension. The dictionaries it reads with are downloaded:
IPADIC and UniDic for Japanese, mecab-ko-dic for Korean, and CC-CEDICT for Chinese. Each has its
own terms.

## Recordings

| Source | What it gives | Licence |
|---|---|---|
| [Lingua Libre](https://commons.wikimedia.org/wiki/Commons:Lingua_Libre) and Wiktionary's own recordings, on Wikimedia Commons | Words spoken by volunteers, in most languages | Each file its own, CC BY-SA 4.0 for most. The speaker is named where it plays and on the card. |
| [audio-cmn](https://github.com/hugolpz/audio-cmn) (Shtooka), by Yue Tan, University of Caen | Chinese words | CC BY-SA 3.0 US |
| [JapanesePod101](https://www.japanesepod101.com/), by Innovative Language Learning | Japanese words | © Innovative Language Learning |
| [Naver Dictionary](https://korean.dict.naver.com/) | Korean words, played on the lookup card only | Not licensed for reuse, so never put on a card |
| [SpanishDict](https://www.spanishdict.com/) | A generated voice for Spanish words with no recording, played only | Not licensed for reuse, so never put on a card |

Where no recording is found, your browser's own voice says the word.

## Data built into the extension

Three small tables are built from these sources and shipped with the extension. Each keeps its
source's licence.

- Which reading a Chinese character shows first (`src/dict/zh-readings.ts`), from
  [Unihan](https://www.unicode.org/reports/tr38/) (Unicode License) and CC-CEDICT.
- The traditional form of a simplified Chinese character, for meanings shown to a reader of
  traditional characters (`src/dict/zh-traditional.ts`), from CC-CEDICT, checked against Unihan.
- Which verb a Japanese verb written in kana is (`src/dict/kana-verbs.ts`), learned from
  [Tatoeba](https://tatoeba.org/)'s example sentences (CC BY 2.0 FR).

The repository's tests also hold small samples of the dictionaries above, under the same licences.

## Icons

[Lucide](https://lucide.dev/), under the ISC licence. The Libregaku logo is the project's own
([`brand/`](brand/README.md)).
