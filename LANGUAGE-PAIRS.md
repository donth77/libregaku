# Language pairs

What Libregaku does for each language you can learn, and which dictionary explains its words in your own language.

This page is written from the extension’s code by `node scripts/language-pairs.mjs`. A test fails when the two disagree.

## Languages you can learn

| Language | What you get | Dictionary | Above the words |
|---|---|---|---|
| Japanese | Full, with an analyser | JMdict | Furigana |
| Korean | Full, with an analyser | Wiktionary | — |
| Chinese | Full, with an analyser | CC-CEDICT | Pinyin |
| Cantonese | Full, with an analyser | CC-Canto | Jyutping |
| Spanish | Full | Wiktionary | — |
| French | Full | Wiktionary | — |
| German | Full | Wiktionary | — |
| Italian | Full | Wiktionary | — |
| Portuguese | Full | Wiktionary | — |
| Thai | Full | Wiktionary | — |
| English | Words only | — | — |
| Hindi | Full | Wiktionary | — |
| Arabic | Full | Wiktionary | — |
| Turkish | Words only | — | — |

- **Full**: a word is looked up, and matched to your Anki cards, in whatever form it is said: hablábamos finds hablar. The form is found in the dictionary’s list of each word’s forms.
- **Full, with an analyser**: the same, with the line split into words by an analyser that reads its grammar, as these languages need: 갔어요 finds 가다, and 食べて finds 食べる.
- **Words only**: the line is split into words, but there are no lookups yet, and a word matches a card only as it is written.

## Your own language

You can choose any of these 21: English, Spanish, French, German, Portuguese, Italian, Russian, Japanese, Chinese (Simplified), Chinese (Traditional), Korean, Arabic, Hindi, Indonesian, Vietnamese, Thai, Turkish, Polish, Ukrainian, Dutch, Swedish. The interface follows it, and so do definitions where a dictionary in it exists.

## Definitions, by the language you learn

Where a dictionary in your own language exists for a pair, a word is looked up there first, and in the language’s own dictionary when it has no entry. "Dictionary button" is the site a card’s dictionary button opens.

### Learning Japanese

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | JMdict | Jisho |
| Spanish | Spanish | JMdict | Jotoba |
| French | French | JMdict | Dictionnaire japonais |
| German | German | JMdict | Wadoku |
| Portuguese | English | JMdict | Kotobank |
| Italian | English | JMdict | Kotobank |
| Russian | Russian | JMdict | Warodai |
| Japanese | English | JMdict | Jisho |
| Chinese (Simplified) | Chinese (Simplified), then English | Wiktionary, then JMdict | MOJi |
| Chinese (Traditional) | Chinese (Traditional), then English | Wiktionary, then JMdict | Mazii |
| Korean | Korean, then English | Wiktionary, then JMdict | Naver |
| Arabic | English | JMdict | Jisho |
| Hindi | English | JMdict | Jisho |
| Indonesian | English | JMdict | Mazii |
| Vietnamese | English | JMdict | Mazii |
| Thai | English | JMdict | J-Campus |
| Turkish | English | JMdict | Lingea |
| Polish | English | JMdict | Japoński Pomocnik |
| Ukrainian | English | JMdict | Lingea |
| Dutch | Dutch | JMdict | Jotoba |
| Swedish | Swedish | JMdict | Lingea |

### Learning Korean

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary, then KRDict | Naver |
| Spanish | Spanish, then English | KRDict, then Wiktionary | Naver |
| French | French, then English | KRDict, then Wiktionary | Naver |
| German | English | Wiktionary, then KRDict | Naver |
| Portuguese | English | Wiktionary, then KRDict | Naver |
| Italian | English | Wiktionary, then KRDict | Naver |
| Russian | Russian, then English | KRDict, then Wiktionary | Naver |
| Japanese | Japanese, then English | KRDict, then Wiktionary | Naver |
| Chinese (Simplified) | Chinese (Simplified), then English | KRDict, then Wiktionary | Naver |
| Chinese (Traditional) | Chinese (Traditional), then English | KRDict, then Wiktionary | Naver |
| Korean | English | Wiktionary, then KRDict | Naver |
| Arabic | Arabic, then English | KRDict, then Wiktionary | Naver |
| Hindi | English | Wiktionary, then KRDict | Naver |
| Indonesian | Indonesian, then English | KRDict, then Wiktionary | Naver |
| Vietnamese | Vietnamese, then English | KRDict, then Wiktionary | Naver |
| Thai | Thai, then English | KRDict, then Wiktionary | Naver |
| Turkish | English | Wiktionary, then KRDict | Naver |
| Polish | English | Wiktionary, then KRDict | Lingea |
| Ukrainian | English | Wiktionary, then KRDict | Lingea |
| Dutch | English | Wiktionary, then KRDict | Naver |
| Swedish | English | Wiktionary, then KRDict | Naver |

### Learning Chinese

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | CC-CEDICT | MDBG |
| Spanish | English | CC-CEDICT | PONS |
| French | French, then English | CFDICT, then CC-CEDICT | Chine Informations |
| German | German, then English | HanDeDict, then CC-CEDICT | LEO |
| Portuguese | English | CC-CEDICT | Lingea |
| Italian | English | CC-CEDICT | Lingea |
| Russian | English | CC-CEDICT | BKRS |
| Japanese | Japanese, then English | Wiktionary, then CC-CEDICT | Weblio |
| Chinese (Simplified) | English | CC-CEDICT | MDBG |
| Chinese (Traditional) | English | CC-CEDICT | MDBG |
| Korean | Korean, then English | Wiktionary, then CC-CEDICT | Naver |
| Arabic | English | CC-CEDICT | MDBG |
| Hindi | English | CC-CEDICT | Lingea |
| Indonesian | English | CC-CEDICT | Hanzii |
| Vietnamese | English | CC-CEDICT | Hanzii |
| Thai | English | CC-CEDICT | Hanzii |
| Turkish | English | CC-CEDICT | Lingea |
| Polish | English | CC-CEDICT | Lingea |
| Ukrainian | English | CC-CEDICT | Lingea |
| Dutch | English | CC-CEDICT | Lingea |
| Swedish | English | CC-CEDICT | Lingea |

### Learning Cantonese

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | CC-Canto | words.hk |
| Spanish | English | CC-Canto | words.hk |
| French | English | CC-Canto | words.hk |
| German | English | CC-Canto | words.hk |
| Portuguese | English | CC-Canto | words.hk |
| Italian | English | CC-Canto | words.hk |
| Russian | English | CC-Canto | words.hk |
| Japanese | English | CC-Canto | words.hk |
| Chinese (Simplified) | English | CC-Canto | words.hk |
| Chinese (Traditional) | English | CC-Canto | words.hk |
| Korean | English | CC-Canto | words.hk |
| Arabic | English | CC-Canto | words.hk |
| Hindi | English | CC-Canto | words.hk |
| Indonesian | English | CC-Canto | words.hk |
| Vietnamese | English | CC-Canto | words.hk |
| Thai | English | CC-Canto | words.hk |
| Turkish | English | CC-Canto | words.hk |
| Polish | English | CC-Canto | words.hk |
| Ukrainian | English | CC-Canto | words.hk |
| Dutch | English | CC-Canto | words.hk |
| Swedish | English | CC-Canto | words.hk |

### Learning Spanish

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | SpanishDict |
| Spanish | English | Wiktionary | SpanishDict |
| French | French, then English | Wiktionary | WordReference |
| German | German, then English | WikDict, then Wiktionary | PONS |
| Portuguese | Portuguese, then English | WikDict, then Wiktionary | WordReference |
| Italian | Italian, then English | WikDict, then Wiktionary | WordReference |
| Russian | Russian, then English | Wiktionary | Academic |
| Japanese | English | Wiktionary | Kotobank |
| Chinese (Simplified) | Chinese (Simplified), then English | Wiktionary | Eudic |
| Chinese (Traditional) | Chinese (Traditional), then English | Wiktionary | Eudic |
| Korean | Korean, then English | Wiktionary | Naver |
| Arabic | English | Wiktionary | WordReference |
| Hindi | English | Wiktionary | Lingea |
| Indonesian | English | Wiktionary | Lingea |
| Vietnamese | English | Wiktionary | Lingea |
| Thai | English | Wiktionary | SpanishDict |
| Turkish | English | Wiktionary | Lingea |
| Polish | Polish, then English | Wiktionary | PONS |
| Ukrainian | English | Wiktionary | Lingea |
| Dutch | Dutch, then English | Wiktionary | Lingea |
| Swedish | English | Wiktionary | Lingea |

### Learning French

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | Wiktionary |
| Spanish | Spanish, then English | WikDict, then Wiktionary | Wiktionary |
| French | English | Wiktionary | Wiktionary |
| German | German, then English | WikDict, then Wiktionary | Wiktionary |
| Portuguese | Portuguese, then English | WikDict, then Wiktionary | Wiktionary |
| Italian | Italian, then English | WikDict, then Wiktionary | Wiktionary |
| Russian | Russian, then English | Wiktionary | Wiktionary |
| Japanese | Japanese, then English | Wiktionary | Wiktionary |
| Chinese (Simplified) | Chinese (Simplified), then English | Wiktionary | Wiktionary |
| Chinese (Traditional) | Chinese (Traditional), then English | Wiktionary | Wiktionary |
| Korean | Korean, then English | Wiktionary | Wiktionary |
| Arabic | English | Wiktionary | Wiktionary |
| Hindi | English | Wiktionary | Wiktionary |
| Indonesian | Indonesian, then English | WikDict, then Wiktionary | Wiktionary |
| Vietnamese | Vietnamese, then English | Wiktionary | Wiktionary |
| Thai | Thai, then English | Wiktionary | Wiktionary |
| Turkish | Turkish, then English | Wiktionary | Wiktionary |
| Polish | Polish, then English | Wiktionary | Wiktionary |
| Ukrainian | English | Wiktionary | Wiktionary |
| Dutch | Dutch, then English | Wiktionary | Wiktionary |
| Swedish | Swedish, then English | WikDict, then Wiktionary | Wiktionary |

### Learning German

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | Wiktionary |
| Spanish | Spanish, then English | WikDict, then Wiktionary | Wiktionary |
| French | French, then English | Wiktionary | Wiktionary |
| German | English | Wiktionary | Wiktionary |
| Portuguese | Portuguese, then English | WikDict, then Wiktionary | Wiktionary |
| Italian | Italian, then English | WikDict, then Wiktionary | Wiktionary |
| Russian | Russian, then English | Wiktionary | Wiktionary |
| Japanese | Japanese, then English | WikDict, then Wiktionary | Wiktionary |
| Chinese (Simplified) | Chinese (Simplified), then English | Wiktionary | Wiktionary |
| Chinese (Traditional) | Chinese (Traditional), then English | Wiktionary | Wiktionary |
| Korean | Korean, then English | Wiktionary | Wiktionary |
| Arabic | English | Wiktionary | Wiktionary |
| Hindi | English | Wiktionary | Wiktionary |
| Indonesian | English | Wiktionary | Wiktionary |
| Vietnamese | English | Wiktionary | Wiktionary |
| Thai | English | Wiktionary | Wiktionary |
| Turkish | Turkish, then English | WikDict, then Wiktionary | Wiktionary |
| Polish | Polish, then English | Wiktionary | Wiktionary |
| Ukrainian | English | Wiktionary | Wiktionary |
| Dutch | Dutch, then English | WikDict, then Wiktionary | Wiktionary |
| Swedish | Swedish, then English | WikDict, then Wiktionary | Wiktionary |

### Learning Italian

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | Wiktionary |
| Spanish | Spanish, then English | Wiktionary | Wiktionary |
| French | French, then English | Wiktionary | Wiktionary |
| German | German, then English | Wiktionary | Wiktionary |
| Portuguese | English | Wiktionary | Wiktionary |
| Italian | English | Wiktionary | Wiktionary |
| Russian | Russian, then English | Wiktionary | Wiktionary |
| Japanese | Japanese, then English | Wiktionary | Wiktionary |
| Chinese (Simplified) | Chinese (Simplified), then English | Wiktionary | Wiktionary |
| Chinese (Traditional) | Chinese (Traditional), then English | Wiktionary | Wiktionary |
| Korean | Korean, then English | Wiktionary | Wiktionary |
| Arabic | English | Wiktionary | Wiktionary |
| Hindi | English | Wiktionary | Wiktionary |
| Indonesian | English | Wiktionary | Wiktionary |
| Vietnamese | English | Wiktionary | Wiktionary |
| Thai | English | Wiktionary | Wiktionary |
| Turkish | English | Wiktionary | Wiktionary |
| Polish | Polish, then English | Wiktionary | Wiktionary |
| Ukrainian | English | Wiktionary | Wiktionary |
| Dutch | English | Wiktionary | Wiktionary |
| Swedish | English | Wiktionary | Wiktionary |

### Learning Portuguese

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | Wiktionary |
| Spanish | Spanish, then English | WikDict, then Wiktionary | Wiktionary |
| French | French, then English | Wiktionary | Wiktionary |
| German | German, then English | WikDict, then Wiktionary | Wiktionary |
| Portuguese | English | Wiktionary | Wiktionary |
| Italian | English | Wiktionary | Wiktionary |
| Russian | Russian, then English | Wiktionary | Wiktionary |
| Japanese | English | Wiktionary | Wiktionary |
| Chinese (Simplified) | English | Wiktionary | Wiktionary |
| Chinese (Traditional) | English | Wiktionary | Wiktionary |
| Korean | English | Wiktionary | Wiktionary |
| Arabic | English | Wiktionary | Wiktionary |
| Hindi | English | Wiktionary | Wiktionary |
| Indonesian | English | Wiktionary | Wiktionary |
| Vietnamese | English | Wiktionary | Wiktionary |
| Thai | English | Wiktionary | Wiktionary |
| Turkish | English | Wiktionary | Wiktionary |
| Polish | Polish, then English | Wiktionary | Wiktionary |
| Ukrainian | English | Wiktionary | Wiktionary |
| Dutch | English | Wiktionary | Wiktionary |
| Swedish | English | Wiktionary | Wiktionary |

### Learning Thai

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | Wiktionary |
| Spanish | English | Wiktionary | Wiktionary |
| French | English | Wiktionary | Wiktionary |
| German | English | Wiktionary | Wiktionary |
| Portuguese | English | Wiktionary | Wiktionary |
| Italian | English | Wiktionary | Wiktionary |
| Russian | English | Wiktionary | Wiktionary |
| Japanese | English | Wiktionary | Wiktionary |
| Chinese (Simplified) | English | Wiktionary | Wiktionary |
| Chinese (Traditional) | English | Wiktionary | Wiktionary |
| Korean | English | Wiktionary | Wiktionary |
| Arabic | English | Wiktionary | Wiktionary |
| Hindi | English | Wiktionary | Wiktionary |
| Indonesian | English | Wiktionary | Wiktionary |
| Vietnamese | English | Wiktionary | Wiktionary |
| Thai | English | Wiktionary | Wiktionary |
| Turkish | English | Wiktionary | Wiktionary |
| Polish | English | Wiktionary | Wiktionary |
| Ukrainian | English | Wiktionary | Wiktionary |
| Dutch | English | Wiktionary | Wiktionary |
| Swedish | English | Wiktionary | Wiktionary |

### Learning Hindi

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | Wiktionary |
| Spanish | English | Wiktionary | Wiktionary |
| French | English | Wiktionary | Wiktionary |
| German | English | Wiktionary | Wiktionary |
| Portuguese | English | Wiktionary | Wiktionary |
| Italian | English | Wiktionary | Wiktionary |
| Russian | English | Wiktionary | Wiktionary |
| Japanese | English | Wiktionary | Wiktionary |
| Chinese (Simplified) | English | Wiktionary | Wiktionary |
| Chinese (Traditional) | English | Wiktionary | Wiktionary |
| Korean | English | Wiktionary | Wiktionary |
| Arabic | English | Wiktionary | Wiktionary |
| Hindi | English | Wiktionary | Wiktionary |
| Indonesian | English | Wiktionary | Wiktionary |
| Vietnamese | English | Wiktionary | Wiktionary |
| Thai | English | Wiktionary | Wiktionary |
| Turkish | English | Wiktionary | Wiktionary |
| Polish | English | Wiktionary | Wiktionary |
| Ukrainian | English | Wiktionary | Wiktionary |
| Dutch | English | Wiktionary | Wiktionary |
| Swedish | English | Wiktionary | Wiktionary |

### Learning Arabic

| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |
|---|---|---|---|
| English | English | Wiktionary | Wiktionary |
| Spanish | English | Wiktionary | Wiktionary |
| French | French, then English | Wiktionary | Wiktionary |
| German | English | Wiktionary | Wiktionary |
| Portuguese | English | Wiktionary | Wiktionary |
| Italian | English | Wiktionary | Wiktionary |
| Russian | Russian, then English | Wiktionary | Wiktionary |
| Japanese | English | Wiktionary | Wiktionary |
| Chinese (Simplified) | English | Wiktionary | Wiktionary |
| Chinese (Traditional) | English | Wiktionary | Wiktionary |
| Korean | English | Wiktionary | Wiktionary |
| Arabic | English | Wiktionary | Wiktionary |
| Hindi | English | Wiktionary | Wiktionary |
| Indonesian | English | Wiktionary | Wiktionary |
| Vietnamese | English | Wiktionary | Wiktionary |
| Thai | English | Wiktionary | Wiktionary |
| Turkish | English | Wiktionary | Wiktionary |
| Polish | Polish, then English | Wiktionary | Wiktionary |
| Ukrainian | English | Wiktionary | Wiktionary |
| Dutch | English | Wiktionary | Wiktionary |
| Swedish | English | Wiktionary | Wiktionary |

Definitions are in your own language in 79 of the 252 pairs, and in English in the rest.

## Recordings of a word

The Pronounce button plays the first of these that has the word. Only recordings licensed for reuse go on a card.

| Language | Recordings, best first | On a card |
|---|---|---|
| Japanese | JapanesePod101, then Lingua Libre | Both |
| Korean | Wiktionary, then Lingua Libre, then Naver Dictionary (heard on the lookup card only) | The first two |
| Chinese | audio-cmn, then Lingua Libre | Both |
| Cantonese | Lingua Libre | Yes |
| Spanish | Lingua Libre, then SpanishDict’s generated voice (the Pronounce button only) | Lingua Libre |
| French | Lingua Libre | Yes |
| German | Lingua Libre | Yes |

Where none has the word, your own recording address is tried, then your browser’s voice.

## The dictionaries

Each is downloaded from its source the first time a language needs it, and keeps its own licence.

- [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html): Japanese, by the Electronic Dictionary Research and Development Group, in English and eight other languages. CC BY-SA 4.0.
- [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict): Chinese explained in English, by MDBG and its contributors. CC BY-SA 4.0.
- [CC-Canto](https://cantonese.org/): Cantonese explained in English, with Jyutping, by Pleco. CC BY-SA 3.0.
- [Wiktionary](https://kaikki.org/): Wiktionary’s editions, through kaikki.org and wiktionary-to-yomitan. CC BY-SA 4.0.
- [KRDict](https://krdict.korean.go.kr/): Korea’s dictionary for learners, by the National Institute of Korean Language, in eleven languages. CC BY-SA 2.0 KR.
- [WikDict](https://www.wikdict.com/): Wiktionary’s translations, by Karl Bartel through DBnary, made into a dictionary for each pair of languages. CC BY-SA 4.0.
- [CFDICT](https://github.com/licryle/CxDICT): Chinese explained in French, by chine.in, kept up to date by CxDICT. CC BY-SA 4.0.
- [HanDeDict](https://handedict.zydeo.net/): Chinese explained in German. CC BY-SA 3.0.
