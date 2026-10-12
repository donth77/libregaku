import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

const PLURAL = new Intl.PluralRules('pl');

/** A count's word in Polish: one (1), few (2–4, 22–24…), many (0, 5–21, 25…). */
const form = (n: number, one: string, few: string, many: string): string => {
  const kind = PLURAL.select(n);
  return kind === 'one' ? one : kind === 'few' ? few : many;
};

/** "1 karta", "2 karty", "5 kart". */
const cards = (n: number): string => `${n} ${form(n, 'karta', 'karty', 'kart')}`;

/** After "dodano": "1 kartę", "2 karty", "5 kart". */
const cardsAdded = (n: number): string => `${n} ${form(n, 'kartę', 'karty', 'kart')}`;

/** "1 słowo", "2 słowa", "5 słów". */
const words = (n: number): string => `${n} ${form(n, 'słowo', 'słowa', 'słów')}`;

/** A share, as Polish writes it: no space before the %. */
const percent = (n: number): string => `${n}%`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'wyłączone', unknown: 'nowe słowa', always: 'wszystkie' };

/** What a card went in without: "bez audio zdania". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'audio zdania (kliknij ikonę Libregaku, by nagrywać tutaj)'
      : 'audio zdania'))
    .join(' ani ');

const MEDIA_WHAT = { audio: 'audio', video: 'wideo', picture: 'obrazy' } as const;
const MEDIA_THE = { audio: 'Audio', video: 'Wideo', picture: 'Obraz' } as const;

/** The interface in Polish. Anything left out shows in English. */
export const pl: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    mandarin: 'Chiński (mandaryński)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Języki
    languagesHeading: 'Języki',
    languagesAbout: 'Wybierz język, którego się uczysz, i swój własny.',
    target: 'Uczę się',
    targetLimited: (language: string): string => `${language} — ograniczona obsługa`,
    supportFull: 'Pełna obsługa, w tym czytania i furigana.',
    supportPinyin: 'Pełna obsługa, w tym pinyin. Definicje są po angielsku.',
    supportJyutping: 'Pełna obsługa, w tym Jyutping. Definicje są po angielsku.',
    supportWords: 'Pełna obsługa. Definicje są po angielsku.',
    script: 'Znaki',
    scriptHint: 'Używane, gdy film ma oba rodzaje.',
    supportBasic: 'Podstawowa obsługa: słowa są rozdzielane, ale nie ma jeszcze słownika ani czytań.',
    native: 'Twój język',
    nativeHint: 'W tym języku są pokazywane tłumaczenia i definicje, o ile film i słownik je w nim mają.',
    definitions: 'Język definicji',
    definitionsHint: 'Słownik nie ma definicji w twoim języku, więc są pokazywane w tym.',
    definitionsHintFor: (language: string): string =>
      `Słownik nie ma definicji w twoim języku (${language}), więc są pokazywane w tym.`,

    // Sprawdzanie słów
    lookupHeading: 'Sprawdzanie słów',
    lookupAbout: 'Wybierz, jak i kiedy pokazuje się znaczenie słowa.',
    interaction: 'Sprawdzaj słowa przez',
    interactionHover: 'Najechanie',
    interactionShift: 'Najechanie + Shift',
    interactionClick: 'Kliknięcie',
    interactionHint: 'Kliknięcie słowa zawsze też działa.',
    hoverPause: 'Pauza podczas sprawdzania',
    hoverPauseHint: 'Zatrzymuje film, gdy kursor jest na słowie.',
    sidebarHover: 'Szybkie definicje w transkrypcji',
    sidebarHoverHint: 'Pokazuje krótką definicję po najechaniu na słowo w transkrypcji.',

    // Okienko słowa
    popupHeading: 'Okienko słowa',
    popupAbout: 'Wybierz, co pokazuje okienko po sprawdzeniu słowa.',
    cardDeckMenu: 'Menu talii',
    cardDeckMenuHint: 'Dodaje ▾ obok Dodaj do Anki, by wybrać inną talię. Nowe karty trafiają wtedy do niej.',
    cardHideAdd: 'Ukryj Dodaj do Anki',
    cardHideAddHint: 'Usuwa z karty przycisk Dodaj do Anki i menu talii obok niego.',
    cardKanji: 'Kanji w słowie',
    cardKanjiHint: 'Pokazuje znaczenia i czytania każdego kanji.',
    cardHanzi: 'Znaki w słowie',
    cardHanziHint: 'Pokazuje znaczenia i czytania każdego znaku.',
    lookupElsewhere: 'Przykłady z tego filmu',
    lookupElsewhereHint: 'Pokazuje inne zdania z tego filmu, w których jest to słowo. Kliknij zdanie, by je odtworzyć.',

    // Napisy
    subtitlesHeading: 'Napisy',
    subtitlesAbout: 'Dostosuj wygląd napisów na filmie.',
    ruby: 'Furigana',
    rubyUnknown: 'Nowe słowa',
    rubyAlways: 'Wszystkie',
    rubyNever: 'Wyłączone',
    rubyHint: 'Czytania nad kanji. Naciśnij R, by przełączać podczas oglądania.',
    pinyin: 'Pinyin',
    pinyinHint: 'Czytania nad znakami. Naciśnij R, by przełączać podczas oglądania.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Czytania nad znakami. Naciśnij R, by przełączać podczas oglądania.',
    blurPrimary: 'Rozmyj napisy',
    blurPrimaryHint: 'Do ćwiczenia słuchu: napisy są rozmyte, dopóki nie najedziesz na nie kursorem. Naciśnij H, by przełączyć.',
    showSubtitles: 'Napisy na wideo',
    showSubtitlesHint: 'Rysuje napisy na wideo. Po wyłączeniu zostają pasek u góry, transkrypcja i panel. Przycisk na pasku przełącza: tłumaczenie wyłączone, napisy wyłączone, potem oba; ↑ robi to samo.',
    subtitleSize: 'Rozmiar tekstu',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Skaluje się z odtwarzaczem, więc na pełnym ekranie wygląda tak samo.',
    subtitleBottom: 'Położenie',
    subtitleBottomLowest: 'Najniżej',
    subtitleBottomLow: 'Nisko',
    subtitleBottomNormal: 'Normalnie',
    subtitleBottomRaised: 'Nieco wyżej',
    subtitleBottomHigh: 'Wysoko',
    subtitleBottomHighest: 'Najwyżej',
    subtitleBottomHint: 'Wysokość napisów. Inne rozszerzenie z napisami w tym samym odtwarzaczu zostaje pod nimi.',
    dualSubtitles: 'Pokaż tłumaczenie',
    dualSubtitlesHint:
      'Pokazuje napisy w twoim języku pod napisami w języku, którego się uczysz. Pochodzą z serwisu, ' +
      'nie z tłumaczenia maszynowego, i wymagają pełnej transkrypcji filmu.',
    singleKeys: 'Skróty jednoklawiszowe',
    singleKeysHint:
      'Klawisze literowe, takie jak A i R, działają same podczas oglądania. Wyłączone: przytrzymaj z nimi Alt i Shift. ' +
      'Strzałki działają w obu przypadkach.',

    // Podkreślenia
    underlinesHeading: 'Podkreślenia',
    underlinesAbout: 'Każdy kolor pokazuje, jak dobrze znasz słowo. Kliknij kolor, by go zmienić.',
    colorUnknown: 'Nowe słowa',
    colorUnknownHint: 'Słowa bez karty w Anki.',
    colorLearning: 'W nauce',
    colorLearningHint: 'Słowa z kartą, która nie jest jeszcze dojrzała.',
    colorTracking: 'Śledzone',
    colorTrackingHint: 'Słowa, które śledzisz.',
    colorKnown: 'Znane',
    colorKnownHint: 'Słowa z dojrzałą kartą lub oznaczone jako znane.',
    underlines: 'Podkreślaj słowa',
    underlinesHint: 'Wyłącz, aby oglądać zwykłe napisy, bez kolorów pod słowami.',
    markKnown: 'Podkreślaj znane słowa',
    markKnownHint: 'Domyślnie wyłączone, więc w miarę nauki podkreśleń jest coraz mniej.',
    underlineGrammar: 'Podkreślaj rodzajniki i zaimki',
    underlineGrammarHint: 'Domyślnie wyłączone: słowa takie jak „the”, „ja” i „on” nadal można sprawdzić, ale nie liczą się jako słowa do nauki.',
    defaultColours: 'Domyślne kolory',
    resetColours: 'Resetuj',

    // Transkrypcja
    transcriptHeading: 'Transkrypcja',
    transcriptAbout: 'Panel obok filmu ze wszystkimi linijkami napisów.',
    sidebarFollow: 'Przewijaj z filmem',
    sidebarFollowHint: 'Utrzymuje bieżącą linijkę w widoku. Ręczne przewijanie to wstrzymuje, a przycisk wznawia.',
    headerBar: 'Pokazuj nagłówek',
    headerBarHint: 'Pojawia się u góry filmu, gdy kursor jest w pobliżu.',
    languageBadge: 'Plakietka języka',
    languageBadgeFlag: 'Flaga',
    languageBadgeCode: 'Kod',
    badgeFlag: 'Flaga na plakietce',
    badgeFlagDefault: 'Domyślna',
    flagSearch: 'Szukaj…',
    flagSearchLabel: 'Szukaj kraju',
    flagSuggested: 'Sugerowane',
    flagAll: 'Wszystkie kraje',
    flagNone: (query: string): string => `Żaden kraj nie pasuje do „${query}”.`,
    badgeFlagHint: 'Flaga pokazywana dla języka, którego się uczysz. Wybór jest zapamiętywany dla każdego języka osobno.',
    languageBadgeHint: 'Jak nagłówek pokazuje język, którego się uczysz.',
    sidebarStats: 'Licz nowe słowa',
    sidebarStatsHint: 'Pokazuje liczbę nowych słów w każdej linijce, odsetek znanych słów i filtry, które z nich korzystają.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Połącz Anki, wybierz, dokąd trafiają nowe karty i które talie wyznaczają znane słowa.',
    deck: 'Nowe karty trafiają do',
    deckHint: 'Talia, do której trafia każda nowa karta.',
    statusScope: 'Odczytuj znane słowa z',
    statusScopeHint: 'Karty z tych talii decydują, które słowa są podkreślone. Obejmuje podtalie.',
    marksInAnki: 'Zapisuj oznaczenia w Anki',
    marksInAnkiHint:
      'Zapisuje Znane, Śledź i Ignoruj jako ukryte notatki w Anki (Libregaku::Marks), dzięki czemu synchronizują się ' +
      'z innymi urządzeniami. Wyłączone: zostają w tej przeglądarce.',

    // Menu talii
    wholeCollection: 'Cała kolekcja',
    chooseDeck: 'Wybierz talię…',
    deckNotInAnki: (deck: string): string => `${deck} — nie ma w Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (z podtaliami)`,
    deckUnset: 'Wybierz talię. Do tego czasu nie można dodawać kart.',
    deckMissing: (deck: string): string => `W Anki nie ma już talii „${deck}”. Wybierz inną.`,
    statusScopeMissing: (deck: string): string =>
      `W Anki nie ma już talii „${deck}”, więc każde słowo jest pokazywane jako nowe. Wybierz inną.`,
    statusScopeOutside: (deck: string): string =>
      `Nowe karty trafiają do talii „${deck}”, której tu nie uwzględniono, więc dodawane słowa pozostaną podkreślone ` +
      'jako nowe. Wybierz talię, która ją zawiera, albo Cała kolekcja.',

    // Stan Anki
    ankiChecking: 'Sprawdzanie…',
    ankiConnected: 'Połączono.',
    noteTypeInstalled: 'Zainstalowano typ notatki.',
    cardsMade: (n: number): string => `${cards(n)} ${form(n, 'utworzona', 'utworzone', 'utworzonych')} w Libregaku.`,
    noCards: 'Na razie brak kart.',
    cardsFlushed: (n: number): string =>
      `Dodano ${n} ${form(n, 'kartę utworzoną', 'karty utworzone', 'kart utworzonych')} przy zamkniętym Anki.`,
    cardsNotFlushed: (n: number, error: string): string =>
      `Nie udało się dodać ${n} ${form(n, 'karty', 'kart', 'kart')}: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} ${form(n, 'czeka', 'czekają', 'czeka')} na dodanie.`,
    ankiOffline: (port: number): string =>
      `Anki nie odpowiada na porcie ${port}. To normalne, gdy Anki jest zamknięte: ` +
      'nowe karty czekają tutaj i zostaną dodane po jego otwarciu.',
    ankiBlocked: 'Anki jest uruchomione, ale AnkiConnect jeszcze nie zezwala na to rozszerzenie.',
    ankiOccupied: (detail: string): string => `${detail} Zamknij program, który używa tego portu, by zwolnić go dla Anki.`,

    // Przyciski Anki
    checkAgain: 'Sprawdź ponownie',
    newDeck: 'Nowa talia',
    openCards: 'Otwórz karty w Anki',
    openMarks: 'Otwórz oznaczenia w Anki',
    newDeckPrompt: 'Nazwij nową talię. Użyj :: dla podtalii, np. Japoński::Netflix',

    // Łączenie z Anki
    installStep: 'Zainstaluj i uruchom Anki na tym komputerze. {link}',
    getAnki: 'Pobierz Anki',
    addonStep: 'W Anki otwórz {menu}, wklej ten kod i uruchom Anki ponownie.',
    addonMenu: 'Narzędzia → Dodatki → Pobierz dodatki…',
    aboutAnkiConnect: 'O AnkiConnect',
    originStep: 'W Anki otwórz {menu}, dodaj ten wiersz do {setting} i uruchom Anki ponownie.',
    originMenu: 'Narzędzia → Dodatki → AnkiConnect → Konfiguracja',
    runningStep: 'Nie zamykaj Anki podczas oglądania. Karty trafiają prosto do Anki na tym komputerze.',
    copy: 'Kopiuj',
    copyValue: (value: string): string => `Kopiuj ${value}`,
    copied: 'Skopiowano',
    copyFailed: 'Zaznacz ręcznie',

    // Karty Anki
    ankiCardsHeading: 'Karty Anki',
    ankiCardsAbout: 'Wybierz, co oprócz słowa, czytania, znaczenia i zdania trafia na każdą nową kartę.',
    cardAudio: 'Audio słowa',
    cardAudioHint: 'Nagranie słowa, jeśli istnieje. Nigdy głos syntetyczny.',
    cardSentenceAudio: 'Audio zdania',
    cardSentenceAudioHint: 'Nagrywa zdanie, odtwarzając je jeszcze raz. W chronionych serwisach wymaga to zgody poniżej.',
    cardScreenshot: 'Zrzut ekranu',
    cardScreenshotHint: 'Kadr ze sceny. Niedostępny w chronionych serwisach, które to blokują.',
    capture: 'Audio zdania w chronionych serwisach',
    captureAllow: 'Zezwól',
    captureAllowInSettings: 'Zezwól w ustawieniach',
    captureRemove: 'Usuń',
    captureAllowed:
      'Zezwolono. W każdej karcie z chronionym serwisem kliknij ikonę Libregaku i wybierz Nagrywaj tu audio zdania.',
    captureNeeded:
      'Chronione serwisy szyfrują swoje wideo, więc audio zdania jest nagrywane z karty przeglądarki. Wymaga to twojej zgody.',

    // Dane i licencje
    creditsHeading: 'Dane i licencje',
    creditJmdict:
      'Dane słownika i kanji © Electronic Dictionary Research and Development Group, na licencji ' +
      'CC BY-SA 4.0. Przepakowane do JSON przez jmdict-simplified.',
    creditLindera:
      'Dzieli japoński, koreański i chiński na słowa. Licencja MIT; IPADIC, UniDic, mecab-ko-dic i CC-CEDICT ' +
      'mają własne warunki.',
    creditCedict: 'Słownik chiński © MDBG i współtwórcy, na licencji CC BY-SA 4.0.',
    creditWiktionary:
      'Słowniki koreański i hiszpański oraz niektóre w twoim języku, z Wiktionary przez kaikki.org i ' +
      'wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Koreańskie słowa objaśnione w twoim języku. © National Institute of Korean Language, na licencji CC BY-SA 2.0 KR. ' +
      'Pliki przygotowane przez Lyroxide.',
    creditCfdict:
      'Chiński objaśniony po francusku. CFDICT © chine.in, na bieżąco aktualizowany przez CxDICT. CC BY-SA 4.0.',
    creditCanto: 'Słownik kantoński i czytania Jyutping dla CC-CEDICT. © Pleco Inc., na licencji CC BY-SA 3.0.',
    creditHandedict: 'Chiński objaśniony po niemiecku. © HanDeDict i współtwórcy, na licencji CC BY-SA 3.0.',
    creditUnihan: 'Które czytanie chińskiego znaku jest pokazywane jako pierwsze. © Unicode, Inc., na licencji Unicode License.',
    creditJotoba: 'Używane do sprawdzania słów, gdy słownik się pobiera. Oba korzystają z JMdict.',
    creditLucide: 'Ikony. Licencja ISC.',
    creditCommons: 'Nagrania słów hiszpańskich, chińskich i koreańskich, czytanych przez wolontariuszy. Każde ma własną licencję, najczęściej CC BY-SA 4.0, podaną wraz z imieniem lektora przy odtwarzaniu i na karcie.',
    creditAudioCmn: 'Nagrania chińskich słów: Yue Tan, Uniwersytet w Caen. CC BY-SA 3.0 US.',
    creditNaver: 'Nagrania koreańskich słów ze słownika Naver, odtwarzane tylko na karcie wyszukiwania. Nie mają licencji na ponowne użycie, więc nigdy nie trafiają na fiszkę.',
    creditSpanishdict: 'Generowany głos dla hiszpańskich słów z SpanishDict, odtwarzany przyciskiem wymowy, gdy brak nagrania. Nie ma licencji na ponowne użycie, więc nigdy nie trafia na fiszkę.',
    licence: 'Libregaku jest na licencji MIT. Dane słowników są pobierane z ich źródeł, nie są dołączone.',
    built: (when: string): string => `Tę kopię zbudowano ${when}.`,

    // Skróty klawiszowe
    keyLine: 'Poprzednia lub następna linijka',
    keyReplay: 'Odtwórz linijkę ponownie',
    keyTranslation: 'Pokaż lub ukryj tłumaczenie',
    keyShiftLookup: 'Przytrzymaj, by sprawdzić słowo pod kursorem',
    keyAdd: 'Dodaj słowo z okienka do Anki',
    keyKnown: 'Oznacz słowo z okienka jako znane',
    keyFurigana: 'Przełącz furiganę: wyłączone, nowe słowa, wszystkie',
    keyPinyin: 'Przełącz pinyin: wyłączone, nowe słowa, wszystkie',
    keyJyutping: 'Przełącz Jyutping: wyłączone, nowe słowa, wszystkie',
    keyBlur: 'Rozmyj lub wyostrz napisy',
    keySave: 'Zapisz bieżącą linijkę',
    keyTranscript: 'Pokaż lub ukryj panel transkrypcji',
    keyClose: 'Zamknij okienko',
  },

  options: {
    pageTitle: 'Ustawienia Libregaku',
    help: 'Pomoc',
    searchSettings: 'Szukaj…',
    noSettingsFound: 'Brak wyników dla „{q}”.',
    contentsLabel: 'Sekcje ustawień',
    settingsLabel: 'Ustawienia',
    setupHeading: 'Pierwsze kroki',
    setupAbout: 'Dwie decyzje, a cała reszta ma rozsądne ustawienia domyślne.',
    stepLanguages: 'Wybierz, czego się uczysz',
    stepAnki: 'Połącz Anki i wybierz talię na nowe karty',
    ankiOptional:
      'Anki jest opcjonalne — napisy, sprawdzanie słów i furigana działają bez niego. ' +
      'To Anki pamięta, które słowa już znasz.',
    nextSteps:
      'Następnie otwórz film z napisami w języku, którego się uczysz, i najedź kursorem na słowo. ' +
      'Przycisk klawiatury w panelu transkrypcji pokazuje skróty klawiszowe.',
    stepDone: 'Gotowe',
    confirmLanguages: 'Te języki się zgadzają',
    keepDeck: (deck: string): string => `Używaj talii ${deck} na nowe karty`,
  },

  action: {
    help: 'Pomoc',
    settings: 'Ustawienia',
    settingsTip: 'Wszystkie ustawienia',
    checkingPage: 'Sprawdzanie strony…',
    notActive:
      'Nieaktywne na tej stronie. Otwórz film na YouTube, Netflixie lub w innym obsługiwanym serwisie. Jeśli Libregaku zostało właśnie zainstalowane ' +
      'lub przeładowane, odśwież stronę.',
    unsupported: 'Libregaku działa w serwisach YouTube, Netflix, Disney+, Prime Video i Max.',
    worksOn: (site: string): string => `Libregaku działa w serwisie ${site}.`,
    waitingForSubtitles: (site: string): string =>
      `Oczekiwanie na napisy w serwisie ${site}. Upewnij się, że są włączone.`,
    activeOn: (title: string): string => `Aktywne — ${title}`,
    active: 'Aktywne w tym filmie.',
    subtitlesTrack: 'Napisy',
    translationTrack: 'Tłumaczenie',
    noTranslation: 'Brak',
    generatedTrack: (track: string): string => `${track} (automatyczne)`,
    captureNeedsPermission: 'Nagrywanie tu audio zdania wymaga zgody na przechwytywanie dźwięku z tej karty.',
    captureAllowInSettings: 'Zezwól w ustawieniach',
    captureReady: 'Dźwięk z chronionych serwisów da się nagrywać dopiero wtedy, gdy włączysz to w tej karcie.',
    captureStart: 'Nagrywaj tu audio zdania',
    captureFailed: 'Nie udało się nagrać tej karty w Chrome.',
    toggleSidebar: 'Przełącz panel boczny',
    ankiChecking: 'Anki: sprawdzanie…',
    ankiConnected: (n: number): string => `Połączono z Anki · ${cards(n)} z Libregaku`,
    ankiOffline: 'Anki nie jest uruchomione — słowa są pokazywane jako nowe',
    ankiOccupied: (port: number): string => `Inny program używa portu ${port}, więc nie można połączyć się z Anki`,
    ankiBlocked: 'Anki odrzuciło to rozszerzenie — w Ustawieniach jest wiersz do dodania',
    ankiBusy: 'Anki nie odpowiedziało — może trwa synchronizacja',
    ankiRefused: 'Anki odrzuciło żądanie',
    cardsToAdd: (n: number): string => `${cards(n)} do dodania`,
    cardsWaiting: (n: number): string => `${cards(n)} ${form(n, 'czeka', 'czekają', 'czeka')} na Anki`,
  },

  sidebar: {
    panelLabel: 'Panel transkrypcji',
    resizeLabel: 'Zmień rozmiar panelu',

    // Zakładki i przyciski obok nich
    tabsLabel: 'Listy',
    transcriptTab: 'Transkrypcja',
    savedTab: 'Zapisane',
    settings: 'Ustawienia',
    shortcuts: 'Skróty klawiszowe',
    close: 'Zamknij',
    closeLabel: 'Zamknij panel',
    openTip: 'Transkrypcja',
    openLabel: 'Pokaż transkrypcję',
    help: 'Pomoc',

    // Szukanie w transkrypcji
    searchPlaceholder: 'Szukaj w transkrypcji…',
    searchLabel: 'Szukaj w transkrypcji',
    noMatches: 'Brak wyników',
    matchAt: (at: number, total: number): string => `${at} z ${total}`,
    matchesFound: (n: number): string => `${n} ${form(n, 'wynik', 'wyniki', 'wyników')}`,

    // Filtr
    filterTip: 'Filtruj',
    filterLabel: 'Filtruj linijki',
    filterAll: 'Wszystkie linijki',
    filterAllAbout: 'Każda linijka',
    filterNew: 'Z nowymi słowami',
    filterNewAbout: 'Linijki ze słowem, dla którego nie masz karty',
    filterReady: 'Gotowe do nauki',
    filterReadyAbout: 'Linijki, w których tylko jedno słowo jest dla ciebie nowe — najłatwiej się z nich uczyć',
    filterSaved: 'Zapisane',
    filterSavedAbout: 'Linijki zachowane na później',

    // Transkrypcja
    partial: 'Tworzona w trakcie oglądania — ten odtwarzacz udostępnia tylko bieżącą linijkę.',
    partialEmpty: 'Na razie nic tu nie ma. Linijki pojawiają się, gdy padają w filmie.',
    empty: 'Nie wczytano transkrypcji.',
    currentLine: 'Bieżąca linijka',
    lineNew: (n: number): string => `${n} ${form(n, 'nowe', 'nowe', 'nowych')}`,
    playFrom: (time: string): string => `Odtwórz od ${time}`,
    saveLine: 'Zapisz linijkę',
    unsave: 'Usuń z zapisanych',
    addSentence: 'Dodaj zdanie',
    addSentenceLabel: 'Dodaj zdanie do Anki',

    // Podsumowanie nad transkrypcją: etykieta i liczba, pasujące do każdej liczby
    knownPercent: (n: number): string => percent(n),
    summaryKnown: 'Znane: {n}',
    summaryNew: 'Nowe: {n}',
    summaryReady: 'Gotowe do nauki: {n}',
    counting: (n: number): string => `Liczenie nowych słów… ${percent(n)}`,
    countFailed: 'Nie udało się policzyć części linijek, więc nie ma podsumowania.',

    // Szybka definicja
    dictionaryLoading: (n: number): string => `Wczytywanie słownika — ${percent(n)}`,
    dictionaryUnavailable: 'Słownik niedostępny',
    noEntry: 'Brak w słowniku.',

    // Zapisane
    savedEmpty:
      'Nic jeszcze nie zapisano. Kliknij ikonę zakładki przy dowolnej linijce transkrypcji — albo naciśnij B — ' +
      'by zachować zdanie, do którego chcesz wrócić.',
    thisVideo: 'ten film',
    openAt: (time: string): string => `Otwórz film od ${time}`,
    remove: 'Usuń',
    removeLabel: 'Usuń z zapisanych',
    copySavedAbout: 'Kopiuj wszystkie zapisane linijki jako tekst rozdzielany tabulatorami',
    exportSavedAbout: 'Zapisz plik rozdzielany tabulatorami, który Anki może zaimportować',
    addSavedAbout: 'Utwórz kartę z każdej zapisanej linijki',
    linesCopied: (n: number): string => `Skopiowano ${n} ${form(n, 'linijkę', 'linijki', 'linijek')}.`,
    chooseDeck: 'Najpierw wybierz talię w Ustawieniach — tam trafiają nowe karty.',
    checkingAnki: 'Sprawdzanie Anki…',
    ankiOffline: 'Anki nie jest uruchomione. Otwórz je i spróbuj ponownie — kroki są w Ustawieniach.',
    ankiBlocked: 'AnkiConnect jeszcze nie zezwala na to rozszerzenie. W Ustawieniach jest wiersz do dodania.',
    ankiUnreachable: 'Nie udało się połączyć z Anki. Powód jest w Ustawieniach.',
    adding: (at: number, total: number): string => `Dodawanie ${at} z ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `Dodano ${cardsAdded(added)} do talii ${deck}` +
      `${already ? `, ${already} już tam ${form(already, 'była', 'były', 'było')}` : ''}.`,

    // Przyciski i komunikaty zakładek Zapisane i Słowa
    copy: 'Kopiuj',
    exportFile: 'Eksportuj plik',
    addToAnki: 'Dodaj do Anki',
    noClipboard: 'Brak dostępu do schowka.',
    downloaded: 'Zapisano w pobranych. W Anki: Plik → Importuj…',
    downloadBlocked: 'Ta strona zablokowała pobieranie — użyj przycisku Kopiuj.',

    // Słowa
    listsLabel: 'Która lista',
    listLines: 'Linijki',
    listTracked: 'Śledzone',
    listKnown: 'Znane',
    listIgnored: 'Ignorowane',
    findPlaceholder: 'Szukaj…',
    findLabel: 'Szukaj na tej liście',
    copyWordsAbout: 'Kopiuj tę listę jako tekst rozdzielany tabulatorami',
    exportWordsAbout: 'Zapisz tę listę jako plik rozdzielany tabulatorami, który Anki może zaimportować',
    wordsCopied: (n: number): string => `Skopiowano ${words(n)}.`,
    nothingToExport: 'Na tej liście nie ma nic do eksportu.',
    lookingUp: 'Wyszukiwanie czytań i znaczeń…',
    noWordMatches: (query: string): string => `Żadne słowo na tej liście nie pasuje do „${query}”.`,
    noLineMatches: (query: string): string => `Żadna zapisana linijka nie pasuje do „${query}”.`,
    wordsMatching: (shown: number, total: number): string =>
      `${shown} z ${total} ${form(total, 'słowa', 'słów', 'słów')}.`,
    trackedEmpty:
      'Nic jeszcze nie śledzisz. Śledź podkreśla słowo, by rzucało się w oczy, bez tworzenia karty. ' +
      'Włącz ten przycisk w Ustawieniach, w sekcji Okienko słowa.',
    trackedIntro: (n: number): string =>
      `Śledzisz ${words(n)}, ${form(n, 'podkreślone', 'podkreślone', 'podkreślonych')} wszędzie, ` +
      `gdzie ${n === 1 ? 'się pojawia' : 'się pojawiają'}.`,
    stopTracking: 'Przestań śledzić',
    knownEmpty:
      'Brak słów oznaczonych jako znane. Gdy znasz słowo i nie chcesz karty, oznacz je jako znane w jego okienku ' +
      'albo naciśnij K.',
    knownIntro: (n: number): string =>
      `${words(n)} ${form(n, 'oznaczone', 'oznaczone', 'oznaczonych')} jako znane. ` +
      'Gdy usuniesz oznaczenie, słowo wróci do stanu wynikającego z twoich kart Anki.',
    unmarkKnown: 'Usuń ze znanych',
    ignoredEmpty:
      'Brak ignorowanych słów. Ignoruj imiona i dźwięki w ich okienku, a nigdy nie będą podkreślane ani liczone.',
    ignoredIntro: (n: number): string =>
      `${words(n)}, ${n === 1 ? 'które nigdy nie jest' : 'które nigdy nie są'} podkreślane ani liczone.`,
    stopIgnoring: 'Przestań ignorować',
  },

  popup: {
    // Okienko i słowo
    cardLabel: (word: string): string => `${word} — słownik`,
    commonBadge: 'częste',
    nameBadge: 'prawdopodobnie imię',
    characterNames: { kanji: 'Kanji', hanzi: 'Znaki' },
    partOfSpeech: {
      n: 'rzeczownik', 'n-adv': 'rzeczownik przysłówkowy', 'n-t': 'rzeczownik czasowy', 'n-suf': 'przyrostek rzeczownikowy',
      'n-pref': 'przedrostek rzeczownikowy', pn: 'zaimek', 'adj-i': 'przymiotnik -i', 'adj-na': 'przymiotnik -na',
      'adj-no': 'przymiotnik -no', 'adj-pn': 'przymiotnik przedrzeczownikowy', adv: 'przysłówek', 'adv-to': 'przysłówek',
      aux: 'pomocniczy', 'aux-v': 'czasownik posiłkowy', 'aux-adj': 'przymiotnik posiłkowy',
      conj: 'spójnik', cop: 'łącznik', ctr: 'klasyfikator', exp: 'wyrażenie', int: 'wykrzyknik',
      num: 'liczebnik', prt: 'partykuła', pref: 'przedrostek', suf: 'przyrostek', unc: 'niesklasyfikowane',
      vs: 'czasownik suru', 'vs-i': 'czasownik suru', 'vs-s': 'czasownik suru', vt: 'przechodni', vi: 'nieprzechodni',
      v1: 'czasownik ichidan', 'v1-s': 'czasownik ichidan', vk: 'czasownik kuru', vz: 'czasownik zuru',
      v5b: 'czasownik godan', v5g: 'czasownik godan', v5k: 'czasownik godan', 'v5k-s': 'czasownik godan',
      v5m: 'czasownik godan', v5n: 'czasownik godan', v5r: 'czasownik godan', 'v5r-i': 'czasownik godan',
      v5s: 'czasownik godan', v5t: 'czasownik godan', v5u: 'czasownik godan', 'v5u-s': 'czasownik godan',
      v5aru: 'czasownik godan',
      // Kody Wiktionary, dla słów koreańskich i hiszpańskich.
      name: 'nazwa własna', v: 'czasownik', adj: 'przymiotnik', pron: 'zaimek', det: 'określnik', artic: 'rodzajnik',
      counter: 'klasyfikator', prep: 'przyimek', 'prep-phrase': 'wyrażenie przyimkowe', ptcl: 'partykuła',
      intj: 'wykrzyknik', phrase: 'zwrot', prov: 'przysłowie', r: 'rdzeń', char: 'znak', adn: 'przydawka',
      ptcpl: 'imiesłów', contr: 'forma ściągnięta',
      masc: 'rodzaj męski', fem: 'rodzaj żeński', neut: 'rodzaj nijaki', sg: 'liczba pojedyncza', pl: 'liczba mnoga',
      'pl-only': 'tylko liczba mnoga', count: 'policzalny', uncount: 'niepoliczalny', vr: 'zwrotny',
      vdt: 'dwuprzechodni', impers: 'nieosobowy', irreg: 'nieregularny', reltnl: 'relacyjny', reltv: 'względny',
      interr: 'pytający', poss: 'dzierżawczy', dim: 'zdrobnienie', aug: 'zgrubienie', onoma: 'dźwiękonaśladowczy',
      idio: 'idiomatycznie', fig: 'przenośnie', literal: 'dosłownie', col: 'potocznie', inf: 'nieformalnie',
      fam: 'poufale', formal: 'formalnie', polite: 'grzecznościowo', lit: 'książkowo', poet: 'poetycko',
      rhet: 'retorycznie', sl: 'slang', vulg: 'wulgarnie', derog: 'pogardliwie', offens: 'obraźliwie',
      humor: 'żartobliwie', euph: 'eufemistycznie', child: 'w mowie dziecięcej', net: 'internet', neol: 'neologizm',
      cmn: 'częste', uncmmn: 'mało używane', rare: 'rzadkie', dated: 'przestarzałe', arch: 'archaiczne',
      obs: 'wyszłe z użycia', hist: 'historyczne', 'non-std': 'niestandardowe', dialect: 'gwarowe',
      regio: 'regionalne',
    },

    // Przyciski pod słowem
    pronounce: 'Posłuchaj',
    playedRecording: (word: string): string => `${word} · nagranie`,
    playedSynthesised: (word: string): string => `${word} · głos syntetyczny`,
    recordingBy: (speaker: string, licence: string): string => `Nagranie: ${speaker} · ${licence}`,
    pronounceFailed: 'nie udało się odtworzyć audio',
    addSentence: 'Dodaj zdanie',
    sentenceAdded: 'Dodano zdanie',
    undo: 'Cofnij',
    copyWord: 'Kopiuj słowo',
    copyPhrase: 'Kopiuj frazę',
    copySentence: 'Kopiuj zdanie',
    wordCopied: 'skopiowano słowo',
    phraseCopied: 'skopiowano frazę',
    sentenceCopied: 'skopiowano zdanie',
    copyFailed: 'nie udało się skopiować — zaznacz tekst ręcznie',

    // Znaczenia
    dictionaryLoading: (n: number): string =>
      `Słownik wciąż się wczytuje — ${percent(n)}. Spróbuj ponownie za chwilę.`,
    dictionaryUnavailable: (error: string): string => `Słownik niedostępny: ${error}`,
    noEntry: 'Tego słowa nie ma w słowniku.',
    noEntryName: 'To nazwa własna, więc nie ma jej hasła w słowniku.',
    moreMeanings: (n: number): string => `+${n} ${form(n, 'inne znaczenie', 'inne znaczenia', 'innych znaczeń')}`,

    // Inne linijki z tym słowem
    elsewhereCount: (n: number): string =>
      (n === 1 ? 'Jeszcze raz w tym filmie' : `Jeszcze ${n} ${form(n, 'raz', 'razy', 'razy')} w tym filmie`),
    playLine: 'Odtwórz',
    elsewhereMore: (n: number): string => `i jeszcze ${n} — wyszukiwarka w transkrypcji znajdzie wszystkie`,
    showAllInTranscript: 'Pokaż wszystkie w transkrypcji',

    // Dodaj do Anki
    addToAnki: 'Dodaj do Anki',
    addToDeck: (deck: string): string => `Dodaj do talii ${deck}`,
    adding: 'Dodawanie…',
    undoing: 'Cofanie…',
    added: 'Dodano',
    addedUndo: 'Dodano — cofnij',
    inAnki: 'W Anki',
    showInAnki: 'Pokaż w Anki',
    waiting: 'Oczekuje',
    waitingForAnki: 'Czeka na Anki',
    goesInWhenAnkiOpens: 'Trafi do Anki po jego otwarciu',
    alreadyAdded: 'Już dodano',
    alreadyInAnki: 'Już jest w Anki',
    waitingForAnkiToOpen: 'Czeka na otwarcie Anki',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // Menu talii
    otherDecks: 'Inne talie',
    addToAnotherDeck: 'Dodaj do innej talii',
    decksUnknown: 'Anki nie odpowiada, więc jego talie nie są jeszcze znane.',
    newDeck: 'Nowa talia…',
    newDeckPrompt: 'Nowa talia — użyj :: dla podtalii, np. Japoński::Netflix',

    // Oznaczenia
    knownButton: 'Znane',
    trackButton: 'Śledź',
    ignoreButton: 'Ignoruj',
    markKnownTip: 'Oznacz jako znane',
    trackTip: 'Śledź',
    ignoreTip: 'Ignoruj',
    unmarkKnownTip: 'Usuń ze znanych',
    stopTrackingTip: 'Przestań śledzić',
    stopIgnoringTip: 'Przestań ignorować',
  },

  header: {
    knownStat: 'Znane: {percent}',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Słowa, które znasz',
    readyStat: 'Gotowe do nauki: {count}',
    readyTip: 'Linijki z jednym nowym słowem',
    blurSubtitle: 'Rozmyj napisy',
    unblurSubtitle: 'Wyostrz napisy',
    showTranslation: 'Pokaż tłumaczenie',
    hideTranslation: 'Ukryj tłumaczenie',
    hideSubtitles: 'Ukryj napisy',
    showSubtitles: 'Pokaż napisy',
    subtitles: 'Napisy',
    translation: 'Tłumaczenie',
    transcript: 'Transkrypcja',
    pinHeader: 'Przypnij nagłówek',
    unpinHeader: 'Odepnij nagłówek',
    settings: 'Ustawienia',
    showHeader: 'Pokaż nagłówek',
  },

  player: {
    // Klawisze odtwarzacza
    lastLine: 'To była ostatnia linijka',
    noLineBefore: 'Brak wcześniejszej linijki',
    translationOn: 'Tłumaczenie włączone',
    translationOff: 'Tłumaczenie wyłączone',
    subtitlesOff: 'Napisy wyłączone',
    subtitlesOn: 'Napisy włączone',
    blurOn: 'Napisy rozmyte do czasu najechania kursorem',
    blurOff: 'Napisy widoczne',
    lineSaved: 'Zapisano linijkę',
    lineUnsaved: 'Linijka nie jest już zapisana',
    lookUpFirst: 'Najpierw sprawdź jakieś słowo',
    alreadyKnown: (word: string): string => `${word} · już znane w Anki`,
    alreadyInAnki: (word: string): string => `${word} · już jest w Anki`,
    adding: (word: string): string => `Dodawanie ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Oznaczenia
    markOff: (word: string): string => `${word} · usunięto oznaczenie`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'oznaczone jako znane', tracking: 'śledzone', ignored: 'ignorowane', unknown: 'oznaczone jako nowe',
      }[status];
      if (refused) return `${word} · ${done}, bez karty — odrzucone przez Anki; kolejna próba później`;
      return `${word} · ${done}, bez karty${status === 'tracking' ? '. Zobacz zakładkę Zapisane w panelu' : ''}`;
    },

    // Karta słowa
    pickDeck: 'Najpierw wybierz talię w ustawieniach Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `dodano do talii ${deck} — bez ${without(missing)}` : `dodano do talii ${deck}`,
    alreadyIn: (deck: string): string => `już jest w talii ${deck}`,
    queued: (deck: string): string => `Anki jest zamknięte — karta trafi do talii ${deck} po jego otwarciu`,
    alreadyQueued: 'już czeka na Anki',
    notKept: 'Anki jest zamknięte, a przeglądarka nie zachowała karty na później',
    takenBack: (deck: string): string => `usunięto z talii ${deck}`,
    unqueued: 'już nie czeka na Anki',
    alreadySent: 'Karta już trafiła do Anki',
    queueSent: (count: number): string =>
      `Anki jest otwarte — dodano ${count === 1
        ? 'zachowaną kartę'
        : `${count} ${form(count, 'zachowaną kartę', 'zachowane karty', 'zachowanych kart')}`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `znane słowa są odczytywane z talii ${scope}, więc karty z talii ${deck} nie będą liczone`,

    // Karta zdania
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `dodano zdanie do talii ${deck} — bez ${without(missing)}` : `dodano zdanie do talii ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `zdanie już jest w talii ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'dźwięku', picture && 'obrazu'].filter(Boolean);
      return `Anki jest zamknięte — zdanie trafi do talii ${deck} po otwarciu Anki` +
        `${lacking.length ? `, bez ${lacking.join(' i ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'zdanie już czeka na Anki',
    sentenceTakenBack: (deck: string): string => `usunięto zdanie z talii ${deck}`,

    // Audio zdania
    recording: 'Nagrywanie linijki…',

    // Sprawdzanie
    noDictionary: 'brak jeszcze słownika dla tego języka.',
  },

  notices: {
    // Komunikat
    unexpected: 'Wystąpił nieoczekiwany problem w Libregaku.',
    dismiss: 'Odrzuć',

    // YouTube lub Netflix coś zmienił
    youtubeTrackList: 'Nie udało się odczytać listy napisów YouTube.',
    youtubeTrackShape: 'Dane napisów YouTube mają nieoczekiwany format.',
    youtubeCaptionText: 'Nie znaleziono na stronie tekstu napisów YouTube.',
    youtubePlayerTrackList: 'Nie udało się odczytać listy napisów tego filmu z odtwarzacza YouTube.',
    netflixTrackList: 'Nie udało się odczytać listy napisów Netflixa.',
    netflixCaptionText: 'Nie znaleziono na stronie tekstu napisów Netflixa.',
    disneyTrackList: 'Nie udało się odczytać listy napisów Disney+.',
    disneyCaptionText: 'Nie znaleziono na stronie tekstu napisów Disney+.',
    primeTrackList: 'Nie udało się odczytać listy napisów Prime Video.',
    primeCaptionText: 'Nie znaleziono na stronie tekstu napisów Prime Video.',
    maxTrackList: 'Nie udało się odczytać listy napisów Max.',
    maxCaptionText: 'Nie znaleziono na stronie tekstu napisów Max.',
    netflixBlocked: 'Netflix zablokował część Libregaku, która odczytuje napisy.',

    // Napisy tego filmu
    subtitlesOff: 'Włącz napisy w odtwarzaczu, a Libregaku je odczyta.',
    trackNotSent: 'Odtwarzacz nie wczytał jeszcze tych napisów.',
    noTargetTrack: 'Brak tu napisów w języku, którego się uczysz.',
    noSecondTrack: 'Brak tu napisów w twoim języku, więc nie ma drugiej linijki.',
    onlyOneTrack: 'Ten film ma tylko jedną ścieżkę napisów, więc nie ma drugiej linijki.',
    autoGenerated: 'Te napisy są generowane automatycznie, więc tekst i podział na słowa będą niedokładne.',
    noSubtitles: 'Ten film nie ma napisów.',
    secondTrackFailed: 'Nie udało się wczytać drugiej linijki.',

    // Części rozszerzenia
    analyserUnavailable:
      'Czytania i formy słownikowe są wyłączone: analizator języka się nie wczytał. ' +
      'Słowa pasują do kart tylko przy identycznej pisowni.',
    markNotSaved: 'Nie udało się zapisać tego oznaczenia. Działa do przeładowania strony, potem przepadnie.',
    marksNotSynced: 'Nie udało się zapisać oznaczeń w Anki. Są przechowywane w tej przeglądarce i nastąpi kolejna próba.',
    cardsNotAdded:
      'Anki nie przyjęło części kart zachowanych, gdy było zamknięte. Nadal są zachowane i nastąpi kolejna próba.',

    // Szczegóły
    playerNeverLoaded: 'Odtwarzacz nie wczytał się do końca.',
    subtitlesMaybeOff: 'Możliwe, że napisy są po prostu wyłączone w odtwarzaczu.',
    lookedFor: (selector: string): string => `Szukano ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Napisy w tym filmie: ${languages.join(', ') || 'brak'}. ` +
      'Zmień w ustawieniach język, którego się uczysz, albo wybierz inny film.',
    onlyPictures: 'W tym filmie są tylko jako obrazy, nie tekst, więc Libregaku nie może ich odczytać.',
    chooseInPlayer: (track: string): string => `Wybierz ${track} w menu napisów odtwarzacza, a Libregaku je odczyta.`,
    noHumanTrack: 'Ten film nie ma ścieżki napisanej przez człowieka.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Napisy w tym filmie: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'analizator się nie wczytał',
  },

  anki: {
    // Łączenie z AnkiConnect
    offline: (port: number): string => `Nic nie nasłuchuje na porcie ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Nic nie odpowiedziało na porcie ${port} w ciągu ${seconds} s. ` +
      'Anki może być zajęte (synchronizacja lub otwarte okno dialogowe) albo port zajmuje inny program.',
    blocked: (origin: string): string =>
      `AnkiConnect odrzucił ${origin}. W Anki otwórz Narzędzia → Dodatki → AnkiConnect → Konfiguracja ` +
      'i dodaj ten wiersz do webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Coś na porcie ${port} odpowiedziało kodem HTTP ${status}. AnkiConnect tak nie odpowiada.`,
    notAnkiConnect: (port: number): string => `Port ${port} zajmuje coś innego niż AnkiConnect.`,
    noBackground: 'Proces rozszerzenia działający w tle nie odpowiada.',
    unreachable: 'Brak połączenia z Anki.',
    callFailed: 'Wywołanie AnkiConnect nie powiodło się.',

    // Czego Libregaku nie wysyła
    notRelayed: (action: string): string => `Libregaku nie wysyła „${action}” do AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku dołącza tylko ${MEDIA_WHAT[media]} pobrane przez siebie.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_THE[media]} tej notatki nie zawiera danych.`,
    mediaName: (prefix: string): string => `Pliki dodawane przez Libregaku mają nazwy ${prefix}…, a ten nie.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} wymaga listy ${ids === 'notes' ? 'notatek' : 'kart'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Odrzucono: ${count} z wysłanych ${ids === 'notes' ? 'notatek' : 'kart'} ` +
      `nie ${form(count, 'należy', 'należą', 'należy')} do żadnego oznaczenia Libregaku. ` +
      `Libregaku ${{
        delete: 'usuwa tylko własne oznaczenia',
        suspend: 'zawiesza tylko własne oznaczenia',
        retag: 'zmienia tagi tylko własnych oznaczeń',
      }[change]}` +
      (change === 'delete' ? ' oraz własną kartę utworzoną w ciągu ostatnich kilku minut, jeszcze bez powtórek.' : '.'),

    // Typy notatek Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Twój typ notatki „${noteType}” w Anki nie ma ${fields.length === 1 ? 'pola' : 'pól'} ` +
      `${fields.join(', ')}, więc ${loses === 'cards' ? 'karty' : 'notatki'} straciłyby je. ` +
      'Libregaku nie zmieni typu notatki, który mógł zostać przez ciebie zmieniony: ' +
      `w Anki otwórz Narzędzia → Zarządzaj typami notatek, zmień nazwę „${noteType}” (albo przywróć pola), ` +
      'a potem kliknij Sprawdź ponownie: zostanie zainstalowany nowy.',

    // Oznaczenia i karty czekające
    marksNotAdded: (count: number): string =>
      `Anki nie dodało ${count} ${form(count, 'oznaczenia', 'oznaczeń', 'oznaczeń')}. ` +
      `${count === 1 ? 'Zostaje' : 'Zostają'} w kolejce i następnym razem nastąpi kolejna próba.`,
    marksNotStored: (cause: string): string => `Pamięć przeglądarki odrzuciła oznaczenia odczytane z Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Nie udało się odczytać pamięci przeglądarki: ${cause}`,
  },

  errors: {
    // Nagrywanie dźwięku karty przeglądarki
    captureNotAllowed: 'Najpierw zezwól na audio zdania w tej witrynie w ustawieniach Libregaku.',
    captureRefused: 'Chrome nie pozwala przechwycić tej karty',

    // Ścieżka napisów, która się nie wczytała
    unknownTrack: (id: string): string => `nieznana ścieżka ${id}`,
    trackNotSent: 'odtwarzacz jeszcze jej nie wczytał — wybierz ją raz w menu napisów odtwarzacza',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `żaden format napisów nie zadziałał — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `żaden adres URL napisów nie zadziałał — ${attempts.join('; ') || 'nie podano żadnego'}`,
    emptyAnswer: 'pusta odpowiedź',
    noCues: '0 linijek',
    noCuesParsed: '0 linijek po odczytaniu',
    noAnswerWithin: (seconds: number): string => `brak odpowiedzi w ciągu ${seconds} s`,

    // Nazwa ścieżki
    forcedTrack: (track: string): string => `${track} (wymuszone)`,

    // Słownik i analizator
    noAnswer: 'brak odpowiedzi od rozszerzenia — przeładuj stronę, by je uruchomić ponownie',
    analyserLoading: 'analizator wciąż się wczytuje',
    dictionaryLoading: 'słownik wciąż się wczytuje',
    lookupFailed: 'wyszukiwanie nie powiodło się',
  },

  grammar: {
    // Czas i grzeczność
    past: 'przeszła',
    polite: 'grzecznościowa',

    // Przeczenie
    negative: 'przecząca',
    'negative intent': 'przecząca wolicjonalna',
    without: 'bez robienia',

    // Warunek
    conditional: 'warunkowa',
    whenever: 'zawsze gdy',

    // Kto to robi i czy może
    passive: 'bierna',
    'passive or potential': 'bierna lub potencjalna',
    potential: 'potencjalna',
    causative: 'kauzatywna',

    // Chęć
    'want to': 'chcieć',
    'seems to want to': 'zdaje się chcieć',
    'want someone to': 'chcieć, by ktoś',

    // Skąd mówiący to wie i jak bardzo jest pewny
    seems: 'wydaje się',
    'seems like': 'wygląda na to',
    hearsay: 'podobno',
    apparently: 'najwyraźniej',
    probably: 'prawdopodobnie',
    might: 'może',

    // Co powinno się stać
    'ought to': 'należy',
    'supposed to': 'powinno',
    'intends to': 'zamierza',

    // Obowiązek i pozwolenie
    must: 'trzeba',
    'must not': 'nie wolno',
    "don't have to": 'nie trzeba',
    may: 'można',

    // Rozkazy, prośby i „chodźmy”
    imperative: 'rozkazująca',
    volitional: 'wolicjonalna',
    'polite command': 'uprzejme polecenie',
    please: 'prośba',

    // Łączenie z dalszą częścią
    'te-form': 'forma -te',
    listing: 'wyliczanie',
    while: 'jednocześnie',
    because: 'ponieważ',
    'even though': 'mimo że',
    'in order to': 'w celu',
    'so that': 'tak, aby',

    // Czasowniki pomocnicze po formie -te
    ongoing: 'w toku',
    'resulting state': 'stan wynikowy',
    'completely, or regrettably': 'całkowicie lub z żalem',
    'in advance': 'zawczasu',
    'try doing': 'spróbować',
    'going forward': 'dalej',
    'coming to be': 'stawać się',
    'receive the favour': 'otrzymać przysługę',
    'someone does for me': 'ktoś robi dla mnie',
    'do for someone': 'zrobić dla kogoś',

    // Czasowniki pomocnicze po temacie czasownika
    'too much': 'za dużo',
    'easy to': 'łatwo',
    'hard to': 'trudno',
    'start to': 'zacząć',
    'keep on': 'kontynuować',
    finish: 'skończyć',
    again: 'od nowa',
    'each other': 'wzajemnie',
    completely: 'do końca',
    thoroughly: 'dogłębnie',
    around: 'dookoła',
    'non-stop': 'bez przerwy',

    // Formy słowa hiszpańskiego
    or: 'lub',
    'first-person': '1. os.',
    'second-person': '2. os.',
    'third-person': '3. os.',
    singular: 'lp.',
    plural: 'lm.',
    masculine: 'r. męski',
    feminine: 'r. żeński',
    present: 'teraźniejszy',
    preterite: 'przeszły prosty',
    imperfect: 'przeszły niedokonany',
    'imperfect-se': 'przeszły niedokonany (-se)',
    future: 'przyszły',
    'conditional-mood': 'tryb warunkowy',
    indicative: 'tryb oznajmujący',
    subjunctive: 'tryb łączący',
    infinitive: 'bezokolicznik',
    gerund: 'gerundium',
    participle: 'forma imiesłowowa',
    formal: 'formalna',
    informal: 'nieformalna',
    'with-tú': 'z tú',
    'with-vos': 'z vos',
    'vos-form': 'forma vos',
    voseo: 'voseo',
    'second-person-semantically': 'w znaczeniu „Pan/Pani”',
    accusative: 'z dopełnieniem bliższym',
    dative: 'z dopełnieniem dalszym',
    'object-first-person': 'dopełnienie w 1. os.',
    'object-second-person': 'dopełnienie w 2. os.',
    'object-third-person': 'dopełnienie w 3. os.',
    'object-singular': 'dopełnienie w lp.',
    'object-plural': 'dopełnienie w lm.',
    diminutive: 'zdrobnienie',
    augmentative: 'zgrubienie',
    superlative: 'stopień najwyższy',
    alternative: 'wariant',
    'alt-of': 'inna pisownia',

    // Końcówki koreańskie
    honorific: 'honoryfikatywna',
    'future or guess': 'przyszłość lub domysł',
    'formal polite': 'oficjalna grzecznościowa',
    question: 'pytająca',
    but: 'ale',
    "let's": 'zachęcająca',
    plain: 'prosta',
    'shall we, or I wonder': 'może…? lub ciekawe, czy',
    'I will': 'obietnica',
    'just noticed': 'spostrzeżenie',
    'as you know': 'przecież',
    and: 'i',
    'because, or and then': 'ponieważ lub a potem',
    'but, or given that': 'ale lub skoro',
    'even if': 'nawet jeśli',
    whether: 'czy',
    'adverb form': 'forma przysłówkowa',
    quoting: 'mowa zależna',
    'used to': 'dawniej',
    topic: 'temat',
    subject: 'podmiot',
    object: 'dopełnienie',
    possessive: 'dzierżawczy',
    'come to': 'w końcu',
    when: 'kiedy',
    modifier: 'przydawkowa',
    'noun form': 'forma rzeczownikowa',
    becomes: 'staje się',
    'have done before': 'już kiedyś',
    nominative: 'mianownik',
    genitive: 'dopełniacz',
    'accusative-case': 'biernik',
    'dative-case': 'celownik',
    neuter: 'nijaki',
    definite: 'określony',
    indefinite: 'nieokreślony',
    comparative: 'stopień wyższy',
    strong: 'mocna',
    weak: 'słaba',
    mixed: 'mieszana',
    'without-article': 'bez rodzajnika',
    reflexive: 'zwrotny',
  },
  helpChat: {
    heading: 'Zadaj pytanie',
    placeholder: 'Zapytaj o ustawienie lub o to, jak coś zrobić',
    label: 'Twoje pytanie',
    send: 'Zapytaj',
    thinking: 'Myślę…',
    note: 'Odpowiedź na Twoim urządzeniu udziela Gemini Nano, na podstawie tej pomocy. Może być błędna.',
    noMatch: 'Pomoc o tym nie mówi. Spróbuj wyszukiwania powyżej.',
    failed: 'Gemini Nano nie mógł odpowiedzieć. Spróbuj ponownie.',
    installHeading: 'Zapytaj pomoc',
    install: 'Gemini Nano to mały model AI działający w Chrome, na Twoim komputerze. Pobierz go raz, a będziesz mógł zadawać tu pytania. Nic, co wpiszesz, nie opuszcza urządzenia.',
    download: 'Pobierz Gemini Nano',
    downloading: (percent: number): string => `Pobieranie… ${percent}%`,
    update: 'Chrome ma wbudowany mały model AI, Gemini Nano, który może tu odpowiadać na pytania. Zaktualizuj Chrome, aby go używać.',
    unavailable: 'Chrome ma mały model AI, Gemini Nano, który może tu odpowiadać na pytania, ale nie jest gotowy na tym komputerze. Potrzebuje wolnego miejsca na dysku i może wymagać włączenia na chrome://flags.',
    learnMore: 'O Gemini Nano',
  },
};
