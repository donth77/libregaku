# Privacy policy

Last updated 19 November 2026.

Libregaku is a browser extension made by Tom Donohue. It has no account and no server. Nothing
you do with it is sent to the developer, and nothing is collected, sold, used for advertising or
analysed.

What it does with data, and the few times something leaves your computer, is set out below.

## What stays on your computer

- **Your settings**, the width of the transcript panel and a recording address if you set one.
  These are kept in Chrome's synced storage, so if you use Chrome sync they follow your Google
  account to your other computers, as any extension's settings do. Libregaku does not see or
  control that sync.
- **Saved lines, marks on words, and cards waiting for Anki**, in this browser only.
- **The dictionaries you download**, in this browser only.
- **The subtitles of the video you are watching.** They are read and split into words in your
  browser, and go nowhere else.
- **Your cards.** They go to Anki on your own computer, through the AnkiConnect add-on at
  `127.0.0.1`. Libregaku asks AnkiConnect from the moment it is installed, to see whether Anki
  is open. If you sync Anki, your cards and marks travel through Anki's own sync, not ours.

## When something leaves your computer

| To | When | What it receives |
|---|---|---|
| The video site: YouTube, Netflix, Disney+, Prime Video, HBO Max, Apple TV or Viki | While you watch | Libregaku fetches the subtitle file the site's own player asked for, from the same address and as you. The site learns nothing it would not anyway. |
| GitHub, Hugging Face, MDBG, cantonese.org or WikDict | When you choose a language, once | A request for a dictionary file. Like any download, it shows that host your IP address. No words are sent. |
| Jotoba, then Jisho | A Japanese word you look up while the Japanese dictionary is still downloading | That word, and the language you want its meaning in |
| JapanesePod101, Wikimedia Commons, Naver Dictionary, SpanishDict, or GitHub (for Chinese recordings from audio-cmn) | When you press Pronounce, or make a card | The word whose recording is wanted |
| A recording address you set in Settings | When you press Pronounce, or make a card | The word. You choose this address yourself. |
| Google | When a word has no recording, and your computer has no voice of its own for the language | Libregaku uses a voice on your computer first. Where there is none, Chrome may use one of its online "Google" voices, which sends the word to Google. |
| Another dictionary site | Only when you press a card's dictionary button | The site opens in a new tab with the word in its address. |

The help page's chat uses the model built into Chrome (Gemini Nano), on your computer. Nothing you
type is sent anywhere. Chrome downloads that model from Google itself, the first time.

## Sentence audio and pictures

On YouTube, a card's sentence audio and still image are taken from the video in your browser.

The other sites encrypt their video. There, sentence audio is recorded from the tab, which Chrome
allows only after you press Allow in Settings and then start the recording on that tab yourself.
The recording becomes part of the card in your own Anki. It is not uploaded anywhere.

## What Libregaku does not do

- No analytics, tracking, advertising or selling of data.
- No code is downloaded and run: everything it runs is in the extension you installed.
- No AI service receives anything.

## Deleting everything

Remove the extension from Chrome. That deletes its settings, saved lines, marks waiting for Anki
and downloaded dictionaries. Your cards and marks in Anki stay until you delete them there: the
decks start with `Libregaku`, and the note types are named `Libregaku` and `Libregaku Mark`.

## Changes

This page lives in the extension's source repository, and every change to it is in its history.

## Contact

Questions about privacy: [open an issue](https://github.com/donth77/libregaku/issues).
