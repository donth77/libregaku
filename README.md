<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/libregaku-logo-horizontal-color-on-dark.svg">
    <img alt="Libregaku" src="brand/libregaku-logo-horizontal-color.svg" width="360">
  </picture>
</p>

<p align="center">
  <a href="https://github.com/donth77/libregaku/actions/workflows/ci.yml"><img alt="CI status" src="https://github.com/donth77/libregaku/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="https://github.com/donth77/libregaku/actions/workflows/canary.yml"><img alt="Live-site canary status" src="https://github.com/donth77/libregaku/actions/workflows/canary.yml/badge.svg"></a>
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="Chrome 116 or later" src="https://img.shields.io/badge/Chrome-116%2B-4285F4?logo=googlechrome&logoColor=white">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-informational">
</p>

Clickable subtitles for YouTube, Netflix, Disney+, Prime Video, HBO Max, Apple TV and Viki, with a dictionary
and a transcript. Make
Anki cards from any word or sentence. Free and open source.

---

## What it does

Watch something in the language you're learning. Unknown words are highlighted. Click
one, read the definition, make a card. Over time the highlighting fades as the words
become yours.

[`SUPPORTED-SITES.md`](SUPPORTED-SITES.md) lists the sites it works on, and what
differs between them.


## Requirements

- Chrome 116 or later, or another Chromium browser such as Brave or Edge.
- [Anki](https://apps.ankiweb.net/) with the
  [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on, to make cards and
  to know which words you've learned. Without Anki, subtitles, lookups and the
  transcript still work.

### Is Anki free?

Almost all of it is free software. The two parts that aren't are optional.

| Part | Licence | Free software? |
|---|---|---|
| Anki desktop (Windows, macOS, Linux) | AGPL-3.0 | Yes |
| AnkiDroid (Android) | GPL-3.0 | Yes |
| AnkiConnect add-on | GPL | Yes |
| Anki's own sync server (comes with Anki 2.1.57+) | AGPL-3.0 | Yes |
| AnkiWeb sync | Proprietary | No. The sync server above replaces it. |
| AnkiMobile (iPhone, iPad) | Proprietary, $24.99 once | No. Optional. |

## Install from source

```sh
git clone https://github.com/donth77/libregaku
cd libregaku
pnpm install
pnpm build
```

Then open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**,
and pick the `dist/` folder.

After each rebuild, click the extension's reload button, then reload the video tab.

```sh
pnpm dev        # rebuild on every change
pnpm typecheck
```

## Languages

| Languages | Support |
|---|---|
| Japanese | Full, with furigana |
| Chinese (Mandarin) | Full, with pinyin |
| Cantonese | Full, with Jyutping |
| Korean, Spanish, French, German, Italian, Portuguese, Thai, Hindi, Arabic, Turkish | Full |
| English | Words only, for now |

"Full" means a word is looked up, and matched to its card, in whatever form it is said:
`갔어요` finds `가다`, and `hablábamos` finds `hablar`. An Arabic word is read without the
little words written onto it (`وبكتابه` finds `كتاب`), and a Turkish one by its suffixes
(`evlerimizden` finds `ev`), and the card names what each adds.

"Words only" means the line is split into words, but there are no lookups yet, and a word
matches a card only as it is written. Libregaku says so when you choose one.

Definitions are in your own language where a dictionary in it exists for the pair, such
as Korean explained in Spanish or Chinese in French, and in English otherwise.
[`LANGUAGE-PAIRS.md`](LANGUAGE-PAIRS.md) lists every pair and the dictionaries it uses.

Each language's dictionary is downloaded the first time you choose it. The download is
11 to 27 MB; on disk it takes 100 MB for Chinese, 140 MB for French, 200 MB for Korean
and German, and 470 MB for Spanish. A dictionary in your own language, where there is
one, is a second download of up to 18 MB. Japanese also downloads a second dictionary,
used to split lines into words: 46 MB, and 190 MB on disk.

## Privacy

No account, no server, and nothing collected. [`PRIVACY.md`](PRIVACY.md) lists the few
times a word or a download request leaves your computer, and to whom.
[`TERMS.md`](TERMS.md) has the terms of use.

## Licence

The code is MIT. See [`LICENSE`](LICENSE).

Dictionary data has its own licences. It's downloaded when you use it, not shipped with
the extension. There are three exceptions, and each keeps its source's licence:

- Small samples used in tests: JMdict (`src/dict/__tests__/fixtures/jmdict-frequent.ts`),
  and a few lines of the other dictionaries inside their tests.
- `src/dict/zh-readings.ts`, a 9 KB table of which reading a Chinese character shows
  first. It is built from Unihan and CC-CEDICT by `scripts/build-zh-readings.mjs`.
- `src/dict/kana-verbs.ts`, a 42 KB table of which verb a Japanese verb written in kana
  is. It is learned from Tatoeba's sentences by `scripts/compare-unidic.mjs`.

The sources:

- [JMdict / KANJIDIC2](https://www.edrdg.org/): Electronic Dictionary Research and
  Development Group, CC BY-SA 4.0
- [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict): MDBG, CC BY-SA 4.0
- [CC-Canto](https://cantonese.org/): Pleco, CC BY-SA 3.0
- [kaikki.org](https://kaikki.org/): Wiktionary via Wiktextract, CC BY-SA, as packaged
  by [wiktionary-to-yomitan](https://github.com/yomidevs/wiktionary-to-yomitan)
- [WikDict](https://www.wikdict.com/): Wiktionary via DBnary, by Karl Bartel, CC BY-SA 4.0
- [KRDict](https://krdict.korean.go.kr/) (한국어기초사전): National Institute of Korean
  Language, CC BY-SA 2.0 KR, as packaged by
  [yomitan-ko-dic](https://github.com/Lyroxide/yomitan-ko-dic)
- [CFDICT](https://github.com/licryle/CxDICT): chine.in, kept up to date by CxDICT,
  CC BY-SA 4.0
- [HanDeDict](https://handedict.zydeo.net/): HanDeDict and its contributors, CC BY-SA 3.0
- [Lingua Libre](https://commons.wikimedia.org/wiki/Commons:Lingua_Libre) recordings on
  Wikimedia Commons: each under its own licence, CC BY-SA 4.0 for most, named with its
  speaker where it plays and on the card
- [audio-cmn](https://github.com/hugolpz/audio-cmn): Yue Tan, University of Caen,
  CC BY-SA 3.0 US
- [Unihan](https://www.unicode.org/reports/tr38/): Unicode, Inc., Unicode License
- [Tatoeba](https://tatoeba.org/): Tatoeba contributors, CC BY 2.0 FR
- [Lindera](https://github.com/lindera/lindera) dictionaries: each has its own terms
