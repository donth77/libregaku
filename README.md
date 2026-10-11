# Libregaku

Tokenized dual subtitles, interactive transcript, and a dictionary in your browser, for free. Cards go straight into Anki, which you already use and syncs to your phone.

---

## What it does

Watch something in the language you're learning. Unknown words are highlighted. Click
one, read the definition, make a card. Over time the highlighting fades as the words
become yours.

- **Tokenized subtitles** — real word boundaries, not whitespace guessing, which is
  what languages written without spaces need. Japanese gets dictionary forms, readings
  and furigana; other languages get word boundaries for now.
- **Dual subtitles** — target language and your own, at the same time, from the source's
  own tracks. No machine translation.
- **Transcript sidebar** — the full script beside the video. Click any line to jump
  there. Hover a word for its definition, click it for the full entry. Read ahead, and
  filter to lines with exactly one unknown word.
- **Look-up on hover, Shift-hover or click** — definitions, readings, a common-word
  marker and what the endings do, with furigana for Japanese, the kanji a word is written
  with, and the other lines in the video that use it. Drag across words, or shift-click a
  second one, to look up a whole phrase. Copying from the subtitle copies the line as
  text, without its readings.
- **Anki integration** — cards carry the sentence and its translation, the reading,
  definition, a recording of the word where JapanesePod101 has one, the line itself as
  it was said, a still from it, the timestamp and a link back to that moment. A line can
  be a card of its own as well — the line with the readings it showed, its sound, its
  translation and a still — from the word's card or the transcript. Recording the line
  plays it once more. The card's Add to Anki takes a card back out again for a few
  minutes (Undo), opens a word Anki already has in Anki's own browser, and — if you turn
  it on — has a menu of decks to add to. On Netflix the line's sound needs a permission you
  allow in settings, then a click on the toolbar icon on that tab; its video cannot be
  copied, so there is no still. A card made while Anki is closed waits in the browser
  and goes in when Anki next answers, without the line's sound or still.
- **Keyboard** — ← and → move a line at a time, ↓ plays the line again, ↑ shows or
  hides the translation, A adds a card for the word looked up, K marks it known, R
  steps through furigana (for Japanese), H blurs the subtitle until you hover it, B saves the line,
  S shows the panel. The keyboard button in the transcript panel lists them.
- **Your word list is your Anki collection.** What you know is read from Anki, so it
  stays consistent everywhere without an account. Words you mark by hand — known,
  tracked, ignored — are saved into Anki too, as hidden notes that never come up for
  review, so they follow your collection to every device. The transcript panel's Words
  tab lists them, each with a button to take the mark off. Libregaku keeps only your
  settings, saved lines, and any cards still waiting for Anki in the browser.
- **Underline colours** — new, learning, tracked and known words each have a colour you
  can change in Settings.
- **Help** — how-tos, answers to common questions, and a search over them, on a page of
  its own; Settings, the toolbar popup and the transcript panel link to it.

## Requirements

- Chrome 116+ (or a Chromium browser)
- [Anki](https://apps.ankiweb.net/) with the
  [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on, for card
  creation and word status. Without it, subtitles, lookups and the transcript still
  work, and saved lines export as a tab-separated file Anki can import.

### What you're depending on

Libregaku leans on Anki heavily, so here is exactly what that pulls in.

| Piece | Licence | Note |
|---|---|---|
| Anki desktop (Windows/macOS/Linux) | AGPL-3.0 | free software |
| AnkiDroid (Android) | GPL-3.0 | free software |
| AnkiConnect add-on | GPL | free software |
| Self-hosted sync server | AGPL-3.0, bundled with Anki 2.1.57+ | free software, official |
| AnkiWeb sync | proprietary service | optional — the bundled server replaces it |
| AnkiMobile (iPhone/iPad) | proprietary | optional client, $24.99 one-time |

You can run the entire stack as free software: Anki desktop, AnkiDroid, and Anki's own
bundled sync server, which is official and works with both mobile clients. 

## Install from source

```sh
git clone https://github.com/donth77/libregaku
cd libregaku
pnpm install
pnpm build
```

Then open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
and select the `dist/` directory.

```sh
pnpm dev        # rebuild on change
pnpm typecheck
```

## Languages

Japanese is the primary target and, today, the only language with a dictionary and an
analyser behind it. Any other language gets word boundaries only. The rest is planned
on the same machinery, at a fidelity that depends on what data exists for each.

| | Languages | Status |
|---|---|---|
| Full | Japanese | v1 |
| Planned | Spanish, French, German, Italian, Portuguese | v1.1 |
| Planned | Korean, Chinese | v1.2 |
| Planned | Thai | v1.3 |
| Basic | anything else with a Wiktionary edition | v1.1 |

"Basic" means word boundaries and lookups, but no dictionary-form matching — so an
inflected word may not match a card you already have. The interface tells you when
that applies.

## Licence

Code is MIT. See [`LICENSE`](LICENSE).

Dictionary data carries its own terms and is downloaded at runtime rather than bundled.
The one exception is a small JMdict excerpt used as a test fixture
(`src/dict/__tests__/fixtures/jmdict-frequent.ts`), which stays under JMdict's licence:

- [JMdict / KANJIDIC2](https://www.edrdg.org/) — Electronic Dictionary Research and
  Development Group, CC BY-SA 4.0
- [kaikki.org](https://kaikki.org/) — Wiktionary via Wiktextract, CC BY-SA
- [Lindera](https://github.com/lindera/lindera) dictionaries — per-dictionary terms
