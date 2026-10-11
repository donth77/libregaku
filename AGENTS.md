# AGENTS.md

Guidance for anyone — human or AI — writing code in this repository. Self-contained;
read it before your first change.

## What this project is

A browser extension that renders tokenized, interactive subtitles over web video and
creates Anki cards from them. Japanese is the primary target; the architecture is
language-agnostic beneath that.

## Commands

```sh
pnpm install
pnpm build       # -> dist/, load unpacked in chrome://extensions
pnpm dev         # rebuild on change
pnpm typecheck   # tsc --noEmit
pnpm test            # vitest, hermetic
pnpm test:contract   # vitest against the live sites

node scripts/check-captions.mjs --lang ja <url-or-id>   # screen a test video
node scripts/smoke-youtube.mjs                          # load dist/ on a YouTube video; passes when the overlay draws a word
node scripts/compare-words.mjs                          # IPADIC with and without JMdict's added words
```

### Tests

| Command | Scope | When |
|---|---|---|
| `pnpm test` | Pure logic — parsers, segmenter. Hermetic. | Every push |
| `pnpm test:contract` | Live-site assumptions. Networked, allowed to flake. | Daily, via CI |

Contract tests exist because this extension reads pages it does not control, and
the failure mode is silent: subtitles just stop appearing. Every assumption is
registered in `src/assumptions.ts` with what it claims, what breaks when it
stops being true, and whether a fallback covers it — so a red canary names the
cause instead of a line number. The same registry supplies the on-screen
wording when the extension gives up, so the user sees which one broke.

A canary that checks a *name* in a site's bundle is weaker than one that checks
the behaviour: Netflix's stayed green through a manifest rename because the old
field names were still in the code. Prefer checking the real response; say in
the test when you can't. YouTube serves a bot-check page to CI runners, so its
watch-page canaries report "inconclusive" there rather than failing.

**Add an assumption to that registry whenever you rely on a new selector, field
or endpoint.** An unregistered assumption is one that will fail silently.

`compare-words` runs the parser fixtures, 20,000 Tatoeba sentences and any
subtitle files you give it through the extension's segmenting steps twice —
IPADIC alone, and with the words `src/morphology/extra-words.ts` adds from
JMdict — and writes out every line that changes. Run it before changing what
goes into that list or how it is scored, and when JMdict or IPADIC is bumped:
every change it reports should be a misreading put right.

`check-captions` lists a YouTube video's subtitle tracks and marks each human or
auto-generated (`kind="asr"`). Use it before testing segmentation against a video —
ASR output has no punctuation and invents words, so it tells you nothing about
whether the tokenizer works.

## Layout

```
build.mjs               esbuild build — ten entry points, no plugin framework
src/manifest.json       MV3 manifest
src/assumptions.ts      every live-site assumption, and the notices shown when one breaks
src/settings.ts         settings, defaults, and which languages get which tier
src/background.ts       service worker: offscreen lifecycle, the AnkiConnect relay,
                        audio fetches, page-world injection on Netflix
src/offscreen.{html,ts} WASM host — the only place the tokenizer runs. The lindera
                        dictionary lives in OPFS; JMdict in IndexedDB
src/adapters/           one module per subtitle source (youtube, netflix, disney, prime), their
                        parsers (ttml, json3, hls), the DOM-reading fallback
src/morphology/         Segmenter implementations, merge rules, furigana alignment, and the
                        words from JMdict that IPADIC misreads, added to the analyser
src/dict/               JMdict and KANJIDIC2 download, storage and lookup; remote fallbacks
src/anki/               AnkiConnect client, note type, word status, hand marks, cards
                        waiting for Anki
src/audio/              pronunciation, the recording a new card carries, and a tab's
                        sound for sentence audio where the video is encrypted
src/content/
  inject.ts             YouTube page world: captures signed caption URLs, reads the player
  inject-netflix.ts     Netflix page world: reads the manifest, drives the player's seek
  inject-disney.ts      Disney+ page world: passes on the HLS master playlist the player fetched,
                        keeps the programme's clock, seeks
  inject-prime.ts       Prime Video page world: passes on the subtitle tracks in the playback
                        resources the player asked for
  index.ts              isolated world: orchestrates adapter → segmenter → UI
  renderer.ts           subtitle overlay
  sidebar.ts            transcript panel, saved lines, settings
  popup.ts              lookup card
  keys.ts               the player's keys
  capture.ts            a line's sound and a still, for cards
  phrase.ts             a selection across words, looked up as one, and copied as text
  line-card.ts          a whole line as a card: the readings it showed
  tooltip.ts            labels for icon buttons, shared by the card, panel and bar
  header.ts             bar across the top of the player
  player-inset.ts       moves the picture beside the open panel
src/options.*           options page (Anki setup)
src/action.*            toolbar popup: status and per-video track pickers
src/help.*              help page: how-tos, questions, and a search over them
src/help/content.ts     everything the help page says, in English; a file per language beside
                        it (es.ts, ja.ts…) is its translation, all.ts lists them
src/i18n/               the interface's words: en/ holds the English by surface, a file per
                        language (es.ts, ja.ts…) its translation, all.ts lists them;
                        index.ts picks the language, loads its file, names languages via Intl
src/_locales/           the extension's description, which Chrome shows in the browser's language
src/icons/              extension icons, 16/32/48/128 PNG, exported from brand/
src/logo.ts             the logo in the popup, options page and player bar, imported
                        from brand/ as markup (the build loads .svg as text)
brand/                  logo masters (SVG), PNG exports, and how to use them
scripts/                check-captions.mjs, diagnose.js, compare-words.mjs
tests/contract/         the canaries
```

## Architectural invariants

These are not preferences. Changing one is a design decision, not a refactor.

**1. Word status is derived from Anki, never stored.**
The Anki collection is the single source of truth for what the user knows. We query it
and cache the result; we never keep our own authoritative list. This is what makes the
user's progress consistent across devices with no account and no server. A local
override store exists only for states Anki can't express ("known, but I don't want a
card"), and those reconcile back into Anki as tagged suspended notes.

How that works (`src/anki/marks.ts`): each mark is a note of the "Libregaku Mark"
type in the `Libregaku::Marks` deck, its card suspended so it never reaches a review,
its status a tag (`libregaku::mark::known` and so on). Marking writes to the browser
at once and queues the change; each sync with Anki flushes the queue and reads every
mark back, so a mark made on one device reaches the others through Anki's own sync.
A learner can turn "Keep marks in Anki" off: marks then stay in this browser's queue, and go
in when it comes back on — the one case where a mark is not in Anki, and their choice.
The status searches exclude the mark note type, and the service worker lets the page
delete, retag or suspend only notes of that type — with one exception, Undo: it may
delete a note of the Libregaku type made in the last 15 minutes whose cards have never
been studied (a note's id is its creation time). Nothing else the learner has in Anki
can be removed through it.

Cards made while Anki is closed are not status either: they are writes that have not
happened yet (`src/anki/card-queue.ts`), one storage key each, sent the next time Anki
answers. The page shows their words as on their way, as it does a card just added.
New notes may carry media only as bytes the extension fetched, under a `libregaku_`
file name — the service worker refuses anything AnkiConnect would fetch or read itself.

**2. The tokenizer runs in the offscreen document. Only there.**
OPFS inside a content script belongs to the *host page's* origin — wrong storage, and
it gets cleared. WASM compilation in a content script is subject to the host page's
CSP. The offscreen document is a real extension page with the extension's origin, CSP,
and persistent OPFS. Do not move WASM into the service worker (it gets killed) or a
content script (it breaks).

**3. Injected UI lives in a shadow root.**
Host pages have hostile CSS. Overlay and sidebar both mount into shadow roots so style
collisions are structurally impossible rather than an endless bug class.

**4. Everything language-specific goes behind an interface.**
`Segmenter` and `Dictionary` are the seams. Adding a language must not require touching
the overlay, the sidebar, the popup, the status layer, or the Anki integration. If a
change would put a language check in any of those, the abstraction is in the wrong
place — fix the seam instead.

*Known leaks, to close rather than copy:* there is no `Dictionary` interface yet —
`index.ts` calls the JMdict client directly and hands the sidebar the same lookup,
and the popup reads JMdict's part-of-speech codes — and the overlay and sidebar
call the Japanese furigana aligner themselves. Tier 2 is offered
for Japanese only (`TIER2_LANGS` in `settings.ts`) because the analyser reads
IPADIC's feature columns, which ko-dic and cc-cedict lay out differently.

**5. Adapters are thin, isolated, and expected to break occasionally.**
Netflix and YouTube are both first-class and both have our own adapters. A site
changing its internals must be a patch to one file in `src/adapters/`, never a change
that reaches the renderer, the segmenter, or the status layer. Budget for this: a
Netflix-only extension of comparable scope has historically needed about one fix every
two years. Keep each adapter behind the `SubtitleSource` interface so a break is
contained and a new site is additive.

**6. Capture the request; do not construct the URL.**
YouTube signs its caption URLs. `inject.ts` hooks fetch/XHR to observe the request the
page itself makes, and we reuse it. Hand-building a timedtext URL will work briefly and
then stop.

## Conventions

- TypeScript, `strict`, `noUncheckedIndexedAccess`. No `any` in committed code.
- **Overlay: no framework.** It's a hot path; use direct DOM in the shadow root.
- **Sidebar and options: plain DOM.** Preact was the plan; the panel was written
  without it. Its transcript does work in proportion to what is on screen: every line
  has a cheap row, rows sit in blocks the browser skips off screen
  (`content-visibility`), words and readings are built only for rows near the view,
  and counting runs in the background, once per line. Keep it that way — anything
  that walks every row on each update is how a 5,000-line film stalls.
- Prefer `Intl` built-ins over dependencies. `Intl.Segmenter` costs zero bytes and
  covers every language; only reach for WASM when you need lemmas and readings.
- Adapters are thin and swappable. A site changing its markup should be one file.
- Every word on screen comes from `src/i18n`, as `ui.<section>.<key>`, in the
  learner's own language ("Your language", which the interface follows; English
  where a translation has none). Read `ui` when drawing, never at module level.
  A string that needs a value is a function, and a sentence with an element in
  it is a `{placeholder}` template for `fill()`, so each language orders its own
  words. A new string goes in English in `src/i18n/en/` and in each translation;
  a test fails on one missing. Logs, Anki's data and site text stay as they are.
  Only English is bundled: each other language is its own file (dist/i18n/), run
  into the page by the service worker or imported by an extension page when it
  is chosen, so await `loadUiLanguage` before drawing. Arabic is laid out right
  to left: set `dir` beside `lang` on a new surface, and prefer the start/end
  (logical) forms of margins, padding and borders.
- Fail loudly. If the segmenter can't produce lemmas, the UI must say so rather than
  silently mismatching against the user's cards.
