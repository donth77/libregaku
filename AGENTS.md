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

`check-captions` lists a YouTube video's subtitle tracks and marks each human or
auto-generated (`kind="asr"`). Use it before testing segmentation against a video —
ASR output has no punctuation and invents words, so it tells you nothing about
whether the tokenizer works.

## Layout

```
build.mjs               esbuild build — seven entry points, no plugin framework
src/manifest.json       MV3 manifest
src/assumptions.ts      every live-site assumption, and the notices shown when one breaks
src/settings.ts         settings, defaults, and which languages get which tier
src/background.ts       service worker: offscreen lifecycle, the AnkiConnect relay,
                        audio fetches, page-world injection on Netflix
src/offscreen.{html,ts} WASM host — the only place the tokenizer runs. The lindera
                        dictionary lives in OPFS; JMdict in IndexedDB
src/adapters/           one module per subtitle source (youtube, netflix), their
                        parsers (ttml, json3), the DOM-reading fallback
src/morphology/         Segmenter implementations, merge rules, furigana alignment
src/dict/               JMdict and KANJIDIC2 download, storage and lookup; remote fallbacks
src/anki/               AnkiConnect client, note type, word status, hand marks, cards
                        waiting for Anki
src/audio/              pronunciation, the recording a new card carries, and a tab's
                        sound for sentence audio where the video is encrypted
src/content/
  inject.ts             YouTube page world: captures signed caption URLs, reads the player
  inject-netflix.ts     Netflix page world: reads the manifest, drives the player's seek
  index.ts              isolated world: orchestrates adapter → segmenter → UI
  renderer.ts           subtitle overlay
  sidebar.ts            transcript panel, saved lines, settings
  popup.ts              lookup card
  keys.ts               the player's keys
  capture.ts            a line's sound and a still, for cards
  phrase.ts             a selection across words, looked up as one
  header.ts             bar across the top of the player
  player-inset.ts       moves the picture beside the open panel
src/options.*           options page (Anki setup)
src/action.*            toolbar popup: status and per-video track pickers
src/icons/              extension icons, 16/32/48/128 PNG, exported from brand/
src/logo.ts             the logo in the popup, options page and player bar, imported
                        from brand/ as markup (the build loads .svg as text)
brand/                  logo masters (SVG), PNG exports, and how to use them
scripts/                check-captions.mjs, diagnose.js
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
The status searches exclude the mark note type, and the service worker lets the page
delete, retag or suspend only notes of that type.

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
- Fail loudly. If the segmenter can't produce lemmas, the UI must say so rather than
  silently mismatching against the user's cards.
