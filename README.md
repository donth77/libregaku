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

Clickable subtitles for YouTube, Netflix, Disney+, Prime Video, Max and Apple TV, with a dictionary
and a transcript. Make
Anki cards from any word or sentence. Free and open source.

---

## What it does

Watch something in the language you're learning. Unknown words are highlighted. Click
one, read the definition, make a card. Over time the highlighting fades as the words
become yours.


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

Japanese, Chinese, Korean and Spanish are fully supported. Other languages are only
split into words for now.

| Languages | Support | When |
|---|---|---|
| Japanese | Full, with furigana | Now (v1) |
| Chinese (Mandarin) | Full, with pinyin | Now |
| Korean, Spanish | Full | Now |
| French, German, Italian, Portuguese | Planned | v1.1 |
| Thai | Planned | v1.3 |
| Any other language Wiktionary covers | Basic | v1.1 |

"Full" means a word is looked up, and matched to its card, in whatever form it is said:
`갔어요` finds `가다`, and `hablábamos` finds `hablar`. Definitions for Chinese, Korean
and Spanish are in English.

"Basic" means you can look words up, but an inflected word (say, "went" for "go") may
not match its card. Libregaku tells you when this applies.

Each language's dictionary is downloaded the first time you choose it. The download is
11 to 27 MB; on disk it takes 100 MB for Chinese, 200 MB for Korean and 470 MB for
Spanish.

## Licence

The code is MIT. See [`LICENSE`](LICENSE).

Dictionary data has its own licences. It's downloaded when you use it, not shipped with
the extension. There are two exceptions, and each keeps its source's licence:

- Small samples used in tests: JMdict (`src/dict/__tests__/fixtures/jmdict-frequent.ts`),
  and a few lines of the other dictionaries inside their tests.
- `src/dict/zh-readings.ts`, a 9 KB table of which reading a Chinese character shows
  first. It is built from Unihan and CC-CEDICT by `scripts/build-zh-readings.mjs`.

The sources:

- [JMdict / KANJIDIC2](https://www.edrdg.org/): Electronic Dictionary Research and
  Development Group, CC BY-SA 4.0
- [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict): MDBG, CC BY-SA 4.0
- [kaikki.org](https://kaikki.org/): Wiktionary via Wiktextract, CC BY-SA, as packaged
  by [wiktionary-to-yomitan](https://github.com/yomidevs/wiktionary-to-yomitan)
- [Unihan](https://www.unicode.org/reports/tr38/): Unicode, Inc., Unicode License
- [Lindera](https://github.com/lindera/lindera) dictionaries: each has its own terms
