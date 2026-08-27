# Libregaku

Tokenized dual subtitles, a clickable transcript, and a real dictionary — in your
browser, for free. Cards go straight into Anki, which you already use, which already
syncs to your phone.

> **Status: pre-alpha.** Nothing works yet. Watch the repo if you want to know when it does.

---

## What it does

Watch something in the language you're learning. Unknown words are highlighted. Click
one, read the definition, make a card. Over time the highlighting fades as the words
become yours.

- **Tokenized subtitles** — real word boundaries, not whitespace guessing, so Japanese,
  Korean, Chinese and Thai work properly.
- **Dual subtitles** — target language and your own, at the same time, from the source's
  own tracks. No machine translation.
- **Transcript sidebar** — the full script beside the video. Click any line to jump
  there. Hover a word for its definition, click it for the full entry. Read ahead, and
  filter to lines with exactly one unknown word.
- **Click-to-look-up** — definitions, readings, frequency and inflection, with furigana
  for Japanese.
- **Anki, properly** — cards carry the sentence, reading, definition, timestamp and a
  link back. Media where the source allows it.
- **Your word list is your Anki collection.** Libregaku stores nothing of its own, so
  what you know stays consistent everywhere without an account.

## What it deliberately doesn't do

No mobile app, no built-in review system, no accounts, no server, no subscription.
Anki does all of that already, and does it better. Libregaku is one browser extension
that feeds it.

## Requirements

- Chrome 116+ (or a Chromium browser)
- [Anki](https://apps.ankiweb.net/) with the
  [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on, for live card
  creation. Without it you can still export `.apkg` files.

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
bundled sync server, which is official and works with both mobile clients. Nothing in
that path is proprietary and nothing is hosted by anyone else.

The two proprietary entries are both **optional clients**, not the core, and neither is
required to use Libregaku.

### Does depending on Anki undercut the "libre" in the name?

No — and the reason is about licensing and control rather than price.

**Your data stays in an open format regardless.** An Anki collection is a SQLite
database with a documented schema, on your own disk. `.apkg` is a documented zip around
that database. Even an iOS user reading their cards through a proprietary client owns
open data that any free software can read. A proprietary *client* over open data is a
categorically weaker concern than proprietary data.

**The alternative would be less free, not more.** Building our own scheduler, sync
service and accounts would put your cards on a server we operate, in a format we
define. Depending instead on AGPL software that you run, writing into a file you own,
gives you more control — not less.

**Nothing Libregaku produces requires proprietary software to read.** The extension is
MIT, the dictionaries are CC BY-SA, the cards are an open format. Libregaku talks to
Anki over HTTP rather than linking, so the two remain separate programs, and the
`.apkg` export produces a portable file with no AnkiConnect involved at all.

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

Japanese is the primary target and gets every feature. Others are supported by the same
machinery, at a fidelity that depends on what data exists for them.

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

## Contributing

Issues and pull requests are welcome. Before opening a PR, read
[`AGENTS.md`](AGENTS.md) — it describes the architectural invariants and the things
this project intentionally refuses to build.

## Licence

Code is MIT. See [`LICENSE`](LICENSE).

Dictionary data carries its own terms and is downloaded at runtime rather than bundled:

- [JMdict / KANJIDIC2](https://www.edrdg.org/) — Electronic Dictionary Research and
  Development Group, CC BY-SA 4.0
- [kaikki.org](https://kaikki.org/) — Wiktionary via Wiktextract, CC BY-SA
- [Lindera](https://github.com/lindera/lindera) dictionaries — per-dictionary terms
