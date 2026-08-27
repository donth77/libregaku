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
pnpm test            # vitest

node scripts/check-captions.mjs --lang ja <url-or-id>   # screen a test video
```

`check-captions` lists a YouTube video's subtitle tracks and marks each human or
auto-generated (`kind="asr"`). Use it before testing segmentation against a video —
ASR output has no punctuation and invents words, so it tells you nothing about
whether the tokenizer works.

## Layout

```
build.mjs              esbuild build — four entry points, no plugin framework
src/manifest.json      MV3 manifest
src/background.ts      service worker; owns the offscreen document lifecycle
src/offscreen.{html,ts} WASM + OPFS host — the only place the tokenizer runs
src/adapters/          one module per subtitle source
src/morphology/        Segmenter implementations and token types
src/content/
  inject.ts            runs in the page world; captures subtitle request URLs
  index.ts             runs isolated; orchestrates adapter → segmenter → render
  renderer.ts          overlay DOM
```

## Architectural invariants

These are not preferences. Changing one is a design decision, not a refactor.

**1. Word status is derived from Anki, never stored.**
The Anki collection is the single source of truth for what the user knows. We query it
and cache the result; we never keep our own authoritative list. This is what makes the
user's progress consistent across devices with no account and no server. A local
override store exists only for states Anki can't express ("known, but I don't want a
card"), and those reconcile back into Anki as tagged suspended notes.

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
- **Sidebar and options: Preact.** Real components, virtualized lists, forms.
- Prefer `Intl` built-ins over dependencies. `Intl.Segmenter` costs zero bytes and
  covers every language; only reach for WASM when you need lemmas and readings.
- Adapters are thin and swappable. A site changing its markup should be one file.
- Fail loudly. If the segmenter can't produce lemmas, the UI must say so rather than
  silently mismatching against the user's cards.

## Licensing rules

Code in this repository is MIT. Two consequences that are easy to violate by accident:

- **Do not copy from GPL-licensed projects.** Yomitan in particular is GPL-3.0 and its
  deinflection ruleset is tempting. We don't need it: the morphological analyzer
  returns dictionary forms directly, which is both licence-clean and more accurate.
- **Dictionary data is not MIT.** JMdict, KANJIDIC2 and kaikki data are CC BY-SA.
  Download them at runtime, never vendor them into the repository, and keep the
  attributions in the README accurate.

## Out of scope

Do not implement these, even if they seem like obvious next steps. Each has been
considered and refused, because each turns a maintainable extension into a product
that needs a team.

| Refused | Because |
|---|---|
| A mobile app | AnkiDroid and AnkiMobile exist |
| A spaced-repetition scheduler | Anki's FSRS is better than anything we'd write |
| Accounts, a sync service, a backend | AnkiWeb already syncs the data that matters |
| Netflix subtitle extraction | See invariant 5 |
| Machine translation of subtitles | Machine-translating a translation produces noise |
| Study statistics dashboards | Anki has one |
| Hover-opened definition popups | Makes reading along impossible; click to open |
| Adding cards without confirmation | Mining is a decision, not a side effect |
| Courses or grammar lessons | Not a tooling problem |

If you believe one of these is now justified, open an issue arguing the case before
writing code.

## Pull requests

- One concern per PR.
- Include the manual check you ran — this project is hard to test purely in CI, so say
  what you loaded and what you saw.
- If you touched an adapter, name the site and the date you verified it.
- If you added a language, confirm no file outside `adapters/` and `morphology/` changed.
