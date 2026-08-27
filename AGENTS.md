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

### Tests

| Command | Scope | When |
|---|---|---|
| `pnpm test` | Pure logic — parsers, segmenter. Hermetic. | Every push |
| `pnpm test:contract` | Live-site assumptions. Networked, allowed to flake. | Daily, via CI |

Contract tests exist because this extension reads pages it does not control, and
the failure mode is silent: subtitles just stop appearing. Every assumption is
registered in `tests/contract/assumptions.ts` with what it claims, what breaks
when it stops being true, and whether a fallback covers it — so a red canary
names the cause instead of a line number.

**Add an assumption to that registry whenever you rely on a new selector, field
or endpoint.** An unregistered assumption is one that will fail silently.

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
