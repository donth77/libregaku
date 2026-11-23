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
node scripts/measure-word.mjs <word> <reading> <score>  # what one added adverb does to real sentences, at that score
node scripts/audit-cuts.mjs                             # words the analyser reads whole alone and cuts in sentences
node scripts/compare-unidic.mjs                         # Japanese as IPADIC reads it, with and without UniDic's second opinion
node scripts/build-zh-readings.mjs                      # which reading a Chinese character shows first
node scripts/build-ko-fixture.mjs <ko-dic directory>    # what the analyser returns for the Korean tests' lines
node scripts/measure-forms.mjs <lang>                   # a language read by its dictionary's forms, on Tatoeba
node scripts/language-pairs.mjs                         # LANGUAGE-PAIRS.md, from the code
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
the test when you can't. YouTube serves a bot-check page to CI runners, and
Amazon some days a robot check, a 503 or its offers page, so those canaries
report "inconclusive" there rather than failing. HBO Max has served its player only to a signed-in
browser since 30 October 2026, when play.hbomax.com began sending every address to www.hbomax.com,
so its canary checks only where a watch page lands now. Every wait in a canary needs a limit: a browser check
that waited on a promise the page never settled ran six hours a day, until
the month's Actions minutes were gone. The YouTube browser check is
inconclusive on most CI days for the same reason, so it says little there:
run `node scripts/smoke-youtube.mjs` from your own connection before a
release.

**Add an assumption to that registry whenever you rely on a new selector, field
or endpoint.** An unregistered assumption is one that will fail silently.

`compare-words` runs the parser fixtures, 20,000 Tatoeba sentences and any
subtitle files you give it through the extension's segmenting steps twice —
IPADIC alone, and with the words `src/morphology/extra-words.ts` adds from
JMdict — and writes out every line that changes. Run it before changing what
goes into that list or how it is scored, and when JMdict or IPADIC is bumped:
every change it reports should be a misreading put right.

`measure-word` and `audit-cuts` are for the words of speech the analyser gets
wrong (`SPOKEN_ADVERBS` in `src/morphology/extra-words.ts`, and the rules in
`spoken()` in `src/morphology/merge.ts`). A word that can be two things — たまに,
"now and then", or たま, a ball, and に — is not settled by a rule written from
one line: add it to the analyser at a score, with `measure-word`, and read
every Tatoeba sentence that changes, and the lines that mean the other thing.
`audit-cuts` lists the candidates. Both read the data `compare-words`
downloads, so run that once first.

Japanese is read by two analysers. IPADIC cuts a line the way a learner reads
it (ので, という and 彼ら are words to it) and `merge.ts` is written for it, but
it reads kana badly and knows no word newer than 2007: 彼はいつ来ますか comes
back は, い, つ. UniDic knows those and cuts everything finer. So IPADIC reads
the line and UniDic corrects it, only where the two disagree and only in the
ways `src/morphology/repair.ts` lists. `japanese.ts` is the steps a line goes
through, shared by the offscreen document and the scripts.

`compare-unidic` measures that. It reads the parser fixtures, any subtitle
files and 20,000 Tatoeba sentences (`FULL=1`: all 250,000) with and without
UniDic, and writes out every line that changes. Run it before changing what
UniDic may correct, and read the changes: UniDic is wrong too (彼女はやる is
はやる, "to be in fashion", to it), and each rule in `repair.ts` is there
because a line was read worse without it. `REREAD=1` measures the step before
it, `katakana-words.ts`, the same way. That step once read カレー as からい,
"spicy", wherever it appeared, because it was written from six examples and
never run over real sentences: nothing that rewrites what the analyser is
given goes in unmeasured.

UniDic also says which word a spelling in kanji is, where IPADIC says another:
金がない is きん to IPADIC, or キム, a surname, and かね to UniDic. Neither is
right alone (every 米 is べい, America, to UniDic), so UniDic's reading is taken
only where JMdict bears it out. `secondOpinions()` in `merge.ts` says when.
`READINGS=1 node scripts/compare-unidic.mjs` measures it against Tatoeba's word
index, which names the dictionary word for each word of 150,000 sentences, and
writes out every word put right and every word put wrong. Run it before
changing that rule, and read both lists. The index says which word a spelling
is, not how it is said (何ですか is なに to it), so a rule about how a word is
said, like 何 before です, cannot be measured with it.

A new JMdict is measured whole: `CARDS=base FULL=1 node scripts/compare-unidic.mjs`
with the old release in the cache saves every Tatoeba sentence as the extension reads
it, each word with the entry its card opens, and `CARDS=1 FULL=1` with the new one
writes out every line that changed. Read them all before bumping `RELEASE` in
`src/dict/store.ts`, then write the parser fixtures again. A release adds entries and
splits old ones, and `rank()` can then open the new one where the old was meant: in
November 2026 ヤード the unit lost to a new ヤード, a yard to work in, in ten lines.
The same run measures a new IPADIC or UniDic, or a change to `rank()`.

A few words neither analyser can be asked about, because each reads them one
way whatever the line says: 金 (money or gold), 風 (the wind, or a way of
doing), 下 (under a table, or under a law), 今 before a noun (now, or "this").
The line says which, by a short list of what stands beside the word
(`goldOrMoney()`, `habit()` and `spoken()` in `merge.ts`). Each list was
measured against the index and over every Tatoeba sentence, and its numbers
are in the comment above it: measure again before adding to one.

A verb written in kana is several verbs to the dictionary: つく is 付く, 着く,
就く and 吐く, and JMdict says nothing of which is common. What the verb
follows says which (ピアノをひく is 弾く, 駅につく 着く), and after anything
else, what it most often is (つく alone is 付く). The merge says only what it
follows (`followedVerbs()` in `merge.ts`); `src/dict/kana-verbs.ts` says which
verb that makes it, and `rank()` weighs that after how the verb conjugates.
The table is learned from Tatoeba: every verb written in kanji, with what
stands before it, and every verb in kana that the word index names.
`VERBS=write node scripts/compare-unidic.mjs` writes it; regenerate, never
hand-edit. `VERBS=1` measures it: each verb in kana the index names, and
whether its card opens that verb, against a run saved with `VERBS=base`, every
card put right and put wrong written out. A table scores itself too well on
the sentences it was learned from, so learn from half (`VERBS=write HALF=1`),
measure on the rest (`VERBS=1 ODD=1`), then write the whole table again. Do
that before changing how it is learned or what `rank()` weighs for a verb.

`WRITE=1 node scripts/compare-unidic.mjs` writes the parser fixtures again:
`fixtures/ipadic.ts` (each line as the extension reads it once everything has
loaded, and as IPADIC alone reads it where that differs) and
`fixtures/second-opinion.ts` (what `repair()` was given for the lines UniDic
changed). `MORE='…|…'` adds lines. Regenerate, never hand-edit.

`build-zh-readings` writes `src/dict/zh-readings.ts`: for each Chinese character
with more than one reading in CC-CEDICT, the one drawn above it by default, from
Unihan's `kMandarin` and a short list of exceptions in the script. Run it when
CC-CEDICT or Unihan is bumped, and read the diff.

`build-ko-fixture` writes `src/morphology/__tests__/fixtures/ko-dic.ts`: what the
analyser really returns for the lines in `scripts/ko-fixture-lines.txt`, misreadings
included, which the Korean merge tests stand on. Run it when a line is added to that
list, and when lindera or ko-dic is bumped.

`measure-forms` is for the languages read by their dictionary's table of forms (Spanish,
French, German, Italian, Portuguese, Hindi, Arabic, Turkish, English, and Thai, which does not inflect: `BY_FORMS` in `src/morphology/index.ts`). It reads
20,000 Tatoeba sentences through the language's own segmenter, with the dictionary read by
its own source, and writes how many words find an entry, the commonest that find none, and
the commonest forms that could be more than one word with what each was read as. The hints
(`italian.ts`, `spanish.ts`…) and the `GAPS` in `src/dict/sources.ts` take a word only on
what it counts (`SHOW='…|…'` prints what the dictionary answers for a line's words, and what
each is read as): `SAVE=base`, change, then `AGAINST=base`, and read every word read
otherwise, in every one of those languages when the change is to the reader (`wty.ts`)
or to `lemma.ts` or `hyphen.ts`.

A dictionary in the learner's own language (`OWN_DICTIONARIES` in `settings.ts`) is added
for a pair only where it has 55% of the language's thousand commonest words, the words a
card opens as the extension reads Tatoeba. `COVER=wty-it-fr,wikdict-it-fr` counts that
(`scripts/cover.ts`), following another spelling to its word as a lookup does: with
`measure-forms` for those languages and for Chinese, which it reads with the analyser
(`measure-forms.mjs zh`), and with `compare-unidic` for Japanese. Measure every candidate,
write the shares in the comment above the pairs, and add only those over the bar.

Arabic and Turkish are read past their table of forms as well. Arabic writes the little
words of a sentence onto the word they go with (و, ب, ال in front; the pronouns behind), and
`arabic.ts` lists the ways a word may be read without them and chooses one once the
dictionary has answered for each; Turkish is a stem and a chain of suffixes, read from the
end by `turkish.ts`, which names each suffix itself because the table's descriptions of
Turkish verbs are often the next row's. Both choices rest on short measured lists (the
commonest verbs, the stems never to stop at): change one with `SAVE` and `AGAINST` as
above, and read every word read otherwise. Turkish stores only the forms with up to six
letters after their stem (`READ_BY_SUFFIXES` in `src/dict/sources.ts`), a third of the
file; a change to the suffixes is measured against the whole table too.

`language-pairs` writes `LANGUAGE-PAIRS.md`, the page the store listing links to:
what each language that can be learned gets, and which dictionaries explain its words
for each language of the learner's own. It reads `settings.ts` and `src/dict/sites.ts`,
and a test fails when the page and the code disagree, so run it whenever a language, a
dictionary or a dictionary site is added. `SUPPORTED-SITES.md`, the other page the
listing links to, is written by hand: a new site adds a row.

`check-captions` lists a YouTube video's subtitle tracks and marks each human or
auto-generated (`kind="asr"`). Use it before testing segmentation against a video —
ASR output has no punctuation and invents words, so it tells you nothing about
whether the tokenizer works.

## Layout

```
build.mjs               esbuild build — thirteen entry points, no plugin framework
src/manifest.json       MV3 manifest
src/assumptions.ts      every live-site assumption, and the notices shown when one breaks
src/settings.ts         settings, defaults, and which languages get which tier
src/background.ts       service worker: offscreen lifecycle, the AnkiConnect relay,
                        audio fetches, page-world injection on Netflix
src/offscreen.{html,ts} WASM host — the only place the tokenizer runs. The lindera
                        dictionaries live in OPFS (two for Japanese: IPADIC, and UniDic
                        loaded after it); JMdict in IndexedDB
src/adapters/           one module per subtitle source (youtube, netflix, disney, prime, max, apple, viki), their
                        parsers (ttml, json3, hls, dash), the DOM-reading fallback, and the
                        offset Apple TV's player keeps from its subtitle files (apple-clock)
src/morphology/         Segmenter implementations and which language gets which (index.ts),
                        merge rules for Japanese and Korean, furigana and pinyin alignment,
                        what Spanish, French, German, Italian and Portuguese forms need said
                        of them (spanish.ts, french.ts, german.ts, italian.ts, portuguese.ts), Thai's
                        repeated words (thai.ts), the spellings and endings of Hindi words
                        (hindi.ts), the little words written onto an Arabic word (arabic.ts),
                        the suffixes of a Turkish one (turkish.ts), which verb an English past or
                        participle is (english.ts), the words from JMdict that IPADIC
                        misreads, added to the analyser, and UniDic's second opinion on
                        IPADIC's reading of a line (japanese.ts, repair.ts)
src/dict/               one dictionary per language (sources.ts): download, storage and
                        lookup for JMdict, KANJIDIC2, CC-CEDICT and Wiktionary; remote
                        fallbacks for Japanese; which verb a Japanese verb in kana is
                        (kana-verbs.ts, learned from Tatoeba by compare-unidic)
src/anki/               AnkiConnect client, note type, word status, hand marks, cards
                        waiting for Anki
src/audio/              pronunciation and where a word's recording is found (recordings.ts),
                        the recording a new card carries, and a tab's sound for sentence
                        audio where the video is encrypted
src/content/
  inject.ts             YouTube page world: captures signed caption URLs, reads the player
  inject-netflix.ts     Netflix page world: reads a title's manifests, has the player fetch a
                        track it was sent only by name, drives the player's seek
  inject-disney.ts      Disney+ page world: passes on the HLS master playlist the player fetched,
                        keeps the programme's clock, seeks
  inject-prime.ts       Prime Video page world: passes on the subtitle tracks in the playback
                        resources the player asked for
  inject-max.ts         HBO Max page world: passes on the DASH manifest the player fetched
  inject-apple.ts       Apple TV page world: passes on the HLS master playlist the player fetched
  inject-viki.ts        Viki page world: passes on the DASH manifest the player fetched
  index.ts              isolated world: orchestrates adapter → segmenter → UI
  track-choice.ts       which of a video's tracks is studied, and which is the line under it
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
LANGUAGE-PAIRS.md       every language pair and its dictionaries, written by scripts/language-pairs.mjs
SUPPORTED-SITES.md      the sites it works on, by hand
SOURCES.md              every dictionary, recording and data source and its licence, by hand: a new
                        source adds a row here and a credit in the settings panel (settings-panel.ts)
PRIVACY.md, TERMS.md    the privacy policy and terms the store listing links: change PRIVACY.md with
                        any change to what leaves the learner's computer
scripts/                check-captions.mjs, diagnose.js, compare-words.mjs, measure-word.mjs, audit-cuts.mjs, compare-unidic.mjs,
                        build-zh-readings.mjs,
                        build-ko-fixture.mjs and the lines it reads (ko-fixture-lines.txt),
                        language-pairs.mjs and the page it writes (language-pairs-page.ts),
                        measure-forms.mjs and what it runs (measure-forms.ts),
                        cover.ts (COVER for measure-forms and compare-unidic)
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
type, its card suspended so it never reaches a review, its status a tag
(`libregaku::mark::known` and so on). Marking writes to the browser at once and queues
the change; each sync with Anki flushes the queue and reads every mark back, so a mark
made on one device reaches the others through Anki's own sync.

A mark belongs to one language, and so does every list the learner sees: 人 known in
Japanese says nothing about 人 in Chinese. A mark's language is a tag, the one a card
carries (`libregaku::lang::ja`), and its deck is that language's own
(`Libregaku::Marks::JA`). The page holds only the marks of the language being learned,
and saved lines are listed the same way. Decks never mix languages by default either:
until the learner chooses one, a language's cards go to its own deck (`Libregaku-JA`,
made by its first card). A mark from before marks had a language is given one once —
Japanese for kana and kanji, the script's own language for Hangul and Thai, and the
language being learned for anything else — then tagged and moved to that deck.
A learner can turn "Keep marks in Anki" off: marks then stay in this browser's queue, and go
in when it comes back on — the one case where a mark is not in Anki, and their choice.
The status searches exclude the mark note type, and the service worker lets the page
delete, retag or suspend only notes of that type, and move them only into a mark deck
— with one exception, Undo: it may delete a note of the Libregaku type made in the
last 15 minutes whose cards have never been studied (a note's id is its creation
time). Nothing else the learner has in Anki can be removed or moved through it.

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

How a language plugs in: its analysis is a line in `src/morphology/index.ts` with a
`Segmenter` behind it, and its dictionary is a `Source` in `src/dict/sources.ts`,
named in `DICTIONARIES` in `settings.ts` and kept in an IndexedDB database of its
own. The analyser reads each Lindera dictionary through its own reader in
`offscreen.ts`, because IPADIC, ko-dic and cc-cedict lay their columns out
differently. Whatever draws a word asks the segmenter how its reading goes above
it (`Segmenter.ruby`), and a control only some languages have a use for is asked
about by feature (`featuresOf`), never by the language's name.

A word the line uses in another form than a dictionary lists it under is the
segmenter's to say, too. 勉強しています is 勉強する, and every Japanese
dictionary lists that under 勉強: so the token's `lemma` is 勉強, which is what
is carded, marked and matched against Anki, and `usedAs` is 勉強する, which the
card shows the line's form leading to. Status and marks try both, so a deck
that writes 勉強する still counts, and none of them asks which language it is.

*Known leaks, to close rather than copy:* the lookup card names an entry's kind
through one table of every dictionary's codes (`ui.popup.partOfSpeech`), the status
layer matches readings for kana only (`src/anki/text.ts`), and a mark from before
marks had a language is sorted by its script, which is a guess for Latin letters
(`languageOf` in `src/anki/marks.ts`).

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
