import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** "1 Wort", "2 Wörter". */
const words = (n: number): string => (n === 1 ? '1 Wort' : `${n} Wörter`);

/** "1 Karte", "2 Karten". */
const cards = (n: number): string => (n === 1 ? '1 Karte' : `${n} Karten`);

/** A share, as German writes it: a space, never broken, before the %. */
const percent = (n: number): string => `${n}\u00A0%`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'aus', unknown: 'neue Wörter', always: 'alle' };

/** What a card went in without, joined with "oder": "ohne Satz-Audio". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'Satz-Audio (klicke auf das Libregaku-Symbol, um hier aufzunehmen)'
      : 'Satz-Audio'))
    .join(' oder ');

type Media = 'audio' | 'video' | 'picture';
const MEDIA_NOT_FETCHED: Record<Media, string> = {
  audio: 'Libregaku hängt nur Audio an, das es selbst geladen hat.',
  video: 'Libregaku hängt nur Videos an, die es selbst geladen hat.',
  picture: 'Libregaku hängt nur Bilder an, die es selbst geladen hat.',
};
const MEDIA_EMPTY: Record<Media, string> = {
  audio: 'Das Audio dieser Notiz enthält keine Daten.',
  video: 'Das Video dieser Notiz enthält keine Daten.',
  picture: 'Das Bild dieser Notiz enthält keine Daten.',
};

/** The interface in German. Anything left out shows in English. */
export const de: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Sprachen
    languagesHeading: 'Sprachen',
    languagesAbout: 'Wähle die Sprache, die du lernst, und deine eigene Sprache.',
    target: 'Ich lerne',
    targetLimited: (language: string): string => `${language} – eingeschränkt`,
    supportFull: 'Volle Unterstützung, mit Lesungen und Furigana.',
    supportPinyin: 'Volle Unterstützung, mit Pinyin. Definitionen sind auf Englisch.',
    supportWords: 'Volle Unterstützung. Definitionen sind auf Englisch.',
    supportBasic: 'Grundlegende Unterstützung: Wörter werden getrennt, aber es gibt noch kein Wörterbuch und keine Lesungen.',
    native: 'Deine Sprache',
    nativeHint: 'Übersetzungen und Definitionen erscheinen in dieser Sprache, wenn Video und Wörterbuch sie haben.',
    definitions: 'Definitionen auf',
    definitionsHint: 'Das Wörterbuch hat keine Definitionen in deiner Sprache, deshalb erscheinen sie in dieser.',
    definitionsHintFor: (language: string): string =>
      `Das Wörterbuch hat keine Definitionen auf ${language}, deshalb erscheinen sie in dieser Sprache.`,

    // Wörter nachschlagen
    lookupHeading: 'Wörter nachschlagen',
    lookupAbout: 'Wähle, wie und wann Wörter nachgeschlagen werden.',
    interaction: 'Nachschlagen per',
    interactionHover: 'Mouseover',
    interactionShift: 'Mouseover mit Shift',
    interactionClick: 'Klick',
    interactionHint: 'Ein Klick auf ein Wort funktioniert immer.',
    hoverPause: 'Beim Nachschlagen pausieren',
    hoverPauseHint: 'Pausiert das Video, solange dein Mauszeiger auf einem Wort ist.',
    sidebarHover: 'Kurzdefinitionen im Transkript',
    sidebarHoverHint: 'Zeigt eine kurze Definition, wenn du im Transkript auf ein Wort zeigst.',

    // Wort-Pop-up
    popupHeading: 'Wort-Pop-up',
    popupAbout: 'Wähle, was das Pop-up zeigt, wenn du ein Wort nachschlägst.',
    cardMarks: 'Schaltflächen „Bekannt“ und „Ignorieren“',
    cardMarksHint:
      '„Bekannt“ blendet die Unterstreichung eines Wortes aus, „Ignorieren“ nimmt es aus den Zählungen. ' +
      'Keins von beiden erstellt eine Karte.',
    cardTrack: 'Schaltfläche „Beobachten“',
    cardTrackHint: 'Unterstreicht Wörter, auf die du achten willst, in Lila. Erstellt keine Karte.',
    cardDeckMenu: 'Stapelmenü',
    cardDeckMenuHint:
      'Fügt neben „Zu Anki hinzufügen“ ein ▾ hinzu, mit dem du einen anderen Stapel wählst. Neue Karten kommen dann dorthin.',
    cardAddLine: 'Satzkarten',
    cardAddLineHint: 'Fügt eine Schaltfläche hinzu, die aus dem ganzen Satz eine Karte macht – mit Audio und Screenshot.',
    cardKanji: 'Kanji-Details',
    cardKanjiHint: 'Zeigt Bedeutungen und Lesungen jedes Kanji.',
    cardHanzi: 'Schriftzeichen-Details',
    cardHanziHint: 'Zeigt Bedeutungen und Lesungen jedes Schriftzeichens.',
    lookupElsewhere: 'Beispiele aus diesem Video',
    lookupElsewhereHint: 'Zeigt andere Sätze aus diesem Video mit dem Wort. Klicke auf einen, um ihn abzuspielen.',

    // Untertitel
    subtitlesHeading: 'Untertitel',
    subtitlesAbout: 'Passe an, wie Untertitel auf dem Video aussehen.',
    ruby: 'Furigana',
    rubyUnknown: 'Neue Wörter',
    rubyAlways: 'Alle',
    rubyNever: 'Aus',
    rubyHint: 'Lesungen über Kanji. Drücke R, um beim Schauen umzuschalten.',
    pinyin: 'Pinyin',
    pinyinHint: 'Lesungen über den Schriftzeichen. Drücke R, um beim Schauen umzuschalten.',
    blurPrimary: 'Untertitel weichzeichnen',
    blurPrimaryHint:
      'Fürs Hörverstehen: Untertitel bleiben weichgezeichnet, bis du darauf zeigst. Drücke H zum Umschalten.',
    subtitleSize: 'Textgröße',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Skaliert mit dem Player und sieht daher im Vollbild gleich aus.',
    subtitleBottom: 'Position',
    subtitleBottomLowest: 'Sehr tief',
    subtitleBottomLow: 'Tief',
    subtitleBottomNormal: 'Normal',
    subtitleBottomRaised: 'Etwas höher',
    subtitleBottomHigh: 'Hoch',
    subtitleBottomHighest: 'Sehr hoch',
    subtitleBottomHint:
      'Wie hoch die Untertitel sitzen. Eine andere Untertitel-Erweiterung im selben Player bleibt darunter.',
    dualSubtitles: 'Übersetzung anzeigen',
    dualSubtitlesHint:
      'Zeigt Untertitel in deiner Sprache unter denen, die du lernst. Sie kommen von der Website, ' +
      'nicht aus maschineller Übersetzung, und brauchen ein vollständiges Transkript des Videos.',

    // Unterstreichungen
    underlinesHeading: 'Unterstreichungen',
    underlinesAbout: 'Jede Farbe zeigt, wie gut du ein Wort kennst. Klicke auf eine, um sie zu ändern.',
    colorUnknown: 'Neue Wörter',
    colorUnknownHint: 'Wörter ohne Karte in Anki.',
    colorLearning: 'Lernend',
    colorLearningHint: 'Wörter mit einer Karte, die noch kein langes Intervall hat.',
    colorTracking: 'Beobachtet',
    colorTrackingHint: 'Wörter, die du beobachtest.',
    colorKnown: 'Bekannt',
    colorKnownHint: 'Wörter, deren Karte ein langes Intervall hat oder die als bekannt markiert sind.',
    markKnown: 'Bekannte Wörter unterstreichen',
    markKnownHint: 'Standardmäßig aus, damit der Bildschirm beim Lernen ruhiger wird.',
    defaultColours: 'Standardfarben',
    resetColours: 'Zurücksetzen',

    // Transkript
    transcriptHeading: 'Transkript',
    transcriptAbout: 'Die Leiste neben dem Video mit allen Untertitelzeilen.',
    sidebarOpen: 'Transkriptleiste anzeigen',
    sidebarOpenHint: 'Drücke S, um sie beim Schauen ein- oder auszublenden.',
    sidebarFollow: 'Mit dem Video scrollen',
    sidebarFollowHint: 'Hält die aktuelle Zeile im Blick. Scrollst du selbst, pausiert das; eine Schaltfläche setzt es fort.',
    headerBar: 'Kopfleiste anzeigen',
    headerBarHint: 'Erscheint oben im Video, wenn dein Mauszeiger in der Nähe ist.',
    languageBadge: 'Sprachanzeige',
    languageBadgeFlag: 'Flagge',
    languageBadgeCode: 'Kürzel',
    badgeFlag: 'Flaggen-Emoji',
    badgeFlagDefault: 'Standard',
    badgeFlagHint: 'Die Flagge für die Sprache, die du lernst. Jede Sprache behält ihre eigene.',
    languageBadgeHint: 'Wie die Kopfleiste die Sprache zeigt, die du lernst.',
    sidebarStats: 'Neue Wörter zählen',
    sidebarStatsHint:
      'Zeigt die Zahl neuer Wörter pro Zeile, deinen Anteil bekannter Wörter und die Filter, die darauf beruhen.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Verbinde Anki und wähle, wohin neue Karten kommen und welche Stapel als bekannte Wörter zählen.',
    deck: 'Stapel für neue Karten',
    deckHint: 'Der Stapel, in den jede neue Karte kommt.',
    statusScope: 'Bekannte Wörter aus',
    statusScopeHint: 'Die Karten in diesen Stapeln bestimmen, welche Wörter unterstrichen werden. Mit Unterstapeln.',
    marksInAnki: 'Markierungen in Anki speichern',
    marksInAnkiHint:
      'Speichert „Bekannt“, „Beobachten“ und „Ignorieren“ als versteckte Notizen in Anki (Libregaku::Marks), ' +
      'damit sie mit deinen anderen Geräten synchronisiert werden. Wenn aus, bleiben sie in diesem Browser.',

    // Die Stapelmenüs
    wholeCollection: 'Gesamte Sammlung',
    chooseDeck: 'Stapel wählen…',
    deckNotInAnki: (deck: string): string => `${deck} – nicht in Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (mit Unterstapeln)`,
    deckUnset: 'Wähle einen Stapel. Vorher können keine Karten hinzugefügt werden.',
    deckMissing: (deck: string): string => `Anki hat keinen Stapel namens „${deck}“ mehr. Wähle einen anderen.`,
    statusScopeMissing: (deck: string): string =>
      `Anki hat keinen Stapel namens „${deck}“ mehr, deshalb erscheint jedes Wort als neu. Wähle einen anderen.`,
    statusScopeOutside: (deck: string): string =>
      `Neue Karten kommen in „${deck}“, aber dieser Stapel ist hier nicht enthalten. Wörter, die du hinzufügst, bleiben daher ` +
      'als neu unterstrichen. Wähle einen Stapel, der ihn enthält, oder „Gesamte Sammlung“.',

    // Der Stand von Anki
    ankiChecking: 'Wird geprüft…',
    ankiConnected: 'Verbunden.',
    noteTypeInstalled: 'Notiztyp installiert.',
    cardsMade: (n: number): string => `${cards(n)} mit Libregaku erstellt.`,
    noCards: 'Noch keine Karten.',
    cardsFlushed: (n: number): string =>
      `${cards(n)} hinzugefügt, die bei geschlossenem Anki erstellt ${n === 1 ? 'wurde' : 'wurden'}.`,
    cardsNotFlushed: (n: number, error: string): string =>
      `${cards(n)} ${n === 1 ? 'konnte' : 'konnten'} nicht hinzugefügt werden: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} ${n === 1 ? 'wartet' : 'warten'} noch auf Anki.`,
    ankiOffline: (port: number): string =>
      `Anki antwortet nicht auf Port ${port}. Das ist normal, solange Anki geschlossen ist: ` +
      'Neue Karten warten hier und werden hinzugefügt, sobald es geöffnet wird.',
    ankiBlocked: 'Anki läuft, aber AnkiConnect lässt diese Erweiterung noch nicht zu.',
    ankiOccupied: (detail: string): string =>
      `${detail} Schließe das Programm, das den Port belegt, damit Anki ihn nutzen kann.`,

    // Die Anki-Schaltflächen
    checkAgain: 'Erneut prüfen',
    newDeck: 'Neuer Stapel',
    openCards: 'Karten in Anki öffnen',
    openMarks: 'Markierungen in Anki öffnen',
    newDeckPrompt: 'Name des neuen Stapels. Mit :: legst du einen Unterstapel an, etwa Japanisch::Netflix',

    // Anki verbinden
    installStep: 'Installiere Anki auf diesem Computer und öffne es. {link}',
    getAnki: 'Anki herunterladen',
    addonStep: 'Gehe in Anki zu {menu}, füge diesen Code ein und starte Anki neu.',
    addonMenu: 'Extras → Erweiterungen → Erweiterungen herunterladen …',
    aboutAnkiConnect: 'Über AnkiConnect',
    originStep: 'Gehe in Anki zu {menu}, füge diese Zeile zu {setting} hinzu und starte Anki neu.',
    originMenu: 'Extras → Erweiterungen → AnkiConnect → Konfiguration',
    runningStep: 'Lass Anki beim Schauen geöffnet. Karten kommen direkt in Anki auf diesem Computer.',
    copy: 'Kopieren',
    copyValue: (value: string): string => `${value} kopieren`,
    copied: 'Kopiert',
    copyFailed: 'Bitte markieren',

    // Anki-Karten
    ankiCardsHeading: 'Anki-Karten',
    ankiCardsAbout: 'Wähle, was jede neue Karte außer Wort, Lesung, Bedeutung und Satz bekommt.',
    cardAudio: 'Wort-Audio',
    cardAudioHint: 'Eine Aufnahme des Wortes, falls es eine gibt. Nie eine synthetische Stimme.',
    cardSentenceAudio: 'Satz-Audio',
    cardSentenceAudioHint:
      'Nimmt den Satz auf, indem er noch einmal abgespielt wird. Auf Netflix ist dafür die Berechtigung unten nötig.',
    cardScreenshot: 'Screenshot',
    cardScreenshotHint: 'Ein Standbild der Szene. Nicht auf Netflix, weil Netflix es blockiert.',
    capture: 'Satz-Audio auf Netflix',
    captureAllow: 'Zulassen',
    captureAllowInSettings: 'In den Einstellungen zulassen',
    captureRemove: 'Entfernen',
    captureAllowed:
      'Zugelassen. Klicke in jedem Netflix-Tab auf das Libregaku-Symbol und wähle „Satz-Audio hier aufnehmen“.',
    captureNeeded:
      'Netflix schützt sein Video, deshalb wird Satz-Audio aus dem Tab aufgenommen. Dafür ist deine Berechtigung nötig.',

    // Daten und Lizenzen
    creditsHeading: 'Daten und Lizenzen',
    creditJmdict:
      'Wörterbuch- und Kanji-Daten © Electronic Dictionary Research and Development Group, verwendet unter ' +
      'CC BY-SA 4.0. Als JSON aufbereitet von jmdict-simplified.',
    creditLindera:
      'Zerlegt Japanisch, Koreanisch und Chinesisch in Wörter. MIT-Lizenz; IPADIC, mecab-ko-dic und CC-CEDICT ' +
      'haben eigene Bedingungen.',
    creditCedict: 'Chinesisches Wörterbuch © MDBG und Mitwirkende, verwendet unter CC BY-SA 4.0.',
    creditWiktionary:
      'Wörterbücher für Koreanisch und Spanisch, aus Wiktionary über kaikki.org und wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditUnihan:
      'Welche Lesung eines chinesischen Schriftzeichens zuerst erscheint. © Unicode, Inc., verwendet unter der Unicode License.',
    creditJotoba: 'Zum Nachschlagen, solange das Wörterbuch lädt. Beide nutzen JMdict.',
    creditLucide: 'Symbole. ISC-Lizenz.',
    licence: 'Libregaku steht unter der MIT-Lizenz. Wörterbuchdaten werden von ihren Quellen geladen, nicht mitgeliefert.',
    built: (when: string): string => `Diese Kopie wurde am ${when} erstellt.`,

    // Tastenkombinationen
    keyLine: 'Vorherige oder nächste Zeile',
    keyReplay: 'Zeile wiederholen',
    keyTranslation: 'Übersetzung ein-/ausblenden',
    keyShiftLookup: 'Gedrückt halten, um das Wort unter dem Mauszeiger nachzuschlagen',
    keyAdd: 'Wort im Pop-up zu Anki hinzufügen',
    keyKnown: 'Wort im Pop-up als bekannt markieren',
    keyFurigana: 'Furigana umschalten: aus, neue Wörter, alle',
    keyPinyin: 'Pinyin umschalten: aus, neue Wörter, alle',
    keyBlur: 'Untertitel weichzeichnen oder scharf stellen',
    keySave: 'Aktuelle Zeile speichern',
    keyTranscript: 'Transkriptleiste ein-/ausblenden',
    keyClose: 'Pop-up schließen',
  },

  options: {
    pageTitle: 'Libregaku-Einstellungen',
    help: 'Hilfe',
    tagline: 'Änderungen gelten sofort – hier und beim Schauen in der Transkriptleiste.',
    contentsLabel: 'Einstellungsbereiche',
    settingsLabel: 'Einstellungen',
    setupHeading: 'Erste Schritte',
    setupAbout: 'Zwei Entscheidungen – für alles andere gibt es sinnvolle Standardwerte.',
    stepLanguages: 'Wähle, was du lernst',
    stepAnki: 'Verbinde Anki und wähle einen Stapel für neue Karten',
    ankiOptional:
      'Anki ist optional – Untertitel, Nachschlagen und Furigana funktionieren auch ohne. ' +
      'Anki merkt sich, welche Wörter du schon kennst.',
    nextSteps:
      'Öffne dann ein Video mit Untertiteln in der Sprache, die du lernst, und zeige mit der Maus auf ein Wort. ' +
      'Das Tastatursymbol in der Transkriptleiste listet die Tastenkombinationen auf.',
    confirmLanguages: 'Diese Sprachen stimmen',
    keepDeck: (deck: string): string => `${deck} für neue Karten verwenden`,
  },

  action: {
    help: 'Hilfe',
    settings: 'Einstellungen',
    settingsTip: 'Alle Einstellungen',
    checkingPage: 'Seite wird geprüft…',
    notActive:
      'Auf dieser Seite nicht aktiv. Öffne ein Video auf YouTube oder Netflix. Wenn du Libregaku gerade installiert ' +
      'oder neu geladen hast, lade den Tab neu.',
    unsupported: 'Libregaku funktioniert auf YouTube und Netflix.',
    waitingForSubtitles: (site: string): string =>
      `Warten auf Untertitel von ${site}. Prüfe, ob sie eingeschaltet sind.`,
    activeOn: (title: string): string => `Aktiv – ${title}`,
    active: 'Aktiv bei diesem Video.',
    subtitlesTrack: 'Untertitel',
    translationTrack: 'Übersetzung',
    noTranslation: 'Keine',
    generatedTrack: (track: string): string => `${track} (automatisch)`,
    captureNeedsPermission: 'Um hier Satz-Audio aufzunehmen, ist die Berechtigung nötig, den Ton dieses Tabs aufzuzeichnen.',
    captureAllowInSettings: 'In den Einstellungen zulassen',
    captureReady: 'Den Ton von Netflix kannst du erst aufnehmen, wenn du es für diesen Tab einschaltest.',
    captureStart: 'Satz-Audio hier aufnehmen',
    captureFailed: 'Chrome konnte diesen Tab nicht aufnehmen.',
    toggleSidebar: 'Seitenleiste ein-/ausblenden',
    ankiChecking: 'Anki: wird geprüft…',
    ankiConnected: (n: number): string => `Anki verbunden · ${cards(n)} von Libregaku`,
    ankiOffline: 'Anki läuft nicht – Wörter erscheinen als neu',
    ankiOccupied: (port: number): string => `Ein anderes Programm nutzt Port ${port}, daher ist Anki nicht erreichbar`,
    ankiBlocked: 'Anki hat diese Erweiterung abgelehnt – die Einstellungen zeigen die nötige Zeile',
    ankiBusy: 'Anki hat nicht geantwortet – vielleicht synchronisiert es gerade',
    ankiRefused: 'Anki hat die Anfrage abgelehnt',
    cardsToAdd: (n: number): string => `noch ${cards(n)} hinzuzufügen`,
    cardsWaiting: (n: number): string => `${cards(n)} ${n === 1 ? 'wartet' : 'warten'} auf Anki`,
  },

  sidebar: {
    // Die Tabs und die Schaltflächen daneben
    tabsLabel: 'Listen',
    transcriptTab: 'Transkript',
    savedTab: 'Gespeichert',
    wordsTab: 'Wörter',
    settings: 'Einstellungen',
    shortcuts: 'Tastenkombinationen',
    close: 'Schließen',
    closeLabel: 'Leiste einklappen',
    openTip: 'Transkript',
    openLabel: 'Transkript anzeigen',
    help: 'Hilfe',

    // Das Transkript durchsuchen
    searchPlaceholder: 'Transkript durchsuchen…',
    searchLabel: 'Transkript durchsuchen',
    noMatches: 'Keine Treffer',
    matchAt: (at: number, total: number): string => `${at} von ${total}`,
    matchesFound: (n: number): string => `${n} Treffer`,

    // Der Filter
    filterTip: 'Filtern',
    filterLabel: 'Zeilen filtern',
    filterAll: 'Alle Zeilen',
    filterAllAbout: 'Jede Zeile',
    filterNew: 'Mit neuen Wörtern',
    filterNewAbout: 'Zeilen mit einem Wort, für das du keine Karte hast',
    filterReady: 'Bereit zum Lernen',
    filterReadyAbout: 'Zeilen, in denen nur ein Wort neu für dich ist – daraus lernst du am leichtesten',
    filterSaved: 'Gespeichert',
    filterSavedAbout: 'Zeilen, die du für später aufgehoben hast',

    // Das Transkript
    partial: 'Entsteht beim Schauen – dieser Player gibt nur die aktuelle Zeile preis.',
    partialEmpty: 'Noch nichts da. Zeilen erscheinen hier, sobald sie gesprochen werden.',
    empty: 'Kein Transkript geladen.',
    currentLine: 'Aktuelle Zeile',
    lineNew: (n: number): string => `${n} neu`,
    saveLine: 'Zeile speichern',
    unsave: 'Lesezeichen entfernen',
    addSentence: 'Satz hinzufügen',
    addSentenceLabel: 'Satz zu Anki hinzufügen',

    // Die Übersicht über dem Transkript: eine Zahl in Fettschrift, dann ihr Name
    knownPercent: (n: number): string => percent(n),
    summaryKnown: '{n} bekannt',
    summaryNew: '{n} neu',
    summaryReady: '{n} bereit zum Lernen',
    counting: (n: number): string => `Neue Wörter werden gezählt… ${percent(n)}`,
    countFailed: 'Einige Zeilen konnten nicht gezählt werden, daher gibt es keine Summen.',

    // Die Kurzdefinition
    dictionaryLoading: (n: number): string => `Wörterbuch lädt – ${percent(n)}`,
    dictionaryUnavailable: 'Wörterbuch nicht verfügbar',
    noEntry: 'Kein Eintrag.',

    // Gespeichert
    savedEmpty:
      'Noch nichts gespeichert. Nutze das Lesezeichen an einer Transkriptzeile – oder drücke B –, um einen Satz ' +
      'aufzuheben, zu dem du zurückkehren willst.',
    thisVideo: 'dieses Video',
    remove: 'Entfernen',
    removeLabel: 'Aus den gespeicherten Zeilen entfernen',
    copySavedAbout: 'Alle gespeicherten Zeilen als tabulatorgetrennten Text kopieren',
    exportSavedAbout: 'Eine tabulatorgetrennte Datei speichern, die Anki importieren kann',
    addSavedAbout: 'Aus jeder gespeicherten Zeile eine Karte erstellen',
    linesCopied: (n: number): string => (n === 1 ? '1 Zeile kopiert.' : `${n} Zeilen kopiert.`),
    chooseDeck: 'Wähle zuerst in den Einstellungen einen Stapel – dorthin kommen neue Karten.',
    checkingAnki: 'Anki wird geprüft…',
    ankiOffline: 'Anki läuft nicht. Öffne es und versuch es noch einmal – die Schritte stehen in den Einstellungen.',
    ankiBlocked: 'AnkiConnect lässt diese Erweiterung noch nicht zu. Die Einstellungen zeigen die eine Zeile, die fehlt.',
    ankiUnreachable: 'Anki war nicht erreichbar. Die Einstellungen zeigen, warum.',
    adding: (at: number, total: number): string => `${at} von ${total} wird hinzugefügt…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${added} zu ${deck} hinzugefügt${already ? `, ${already} schon vorhanden` : ''}.`,

    // Schaltflächen und Meldungen von Gespeichert und Wörter
    copy: 'Kopieren',
    exportFile: 'Datei exportieren',
    addToAnki: 'Zu Anki hinzufügen',
    noClipboard: 'Kein Zugriff auf die Zwischenablage.',
    downloaded: 'In deinen Downloads gespeichert. In Anki: Datei → Importieren.',
    downloadBlocked: 'Diese Seite hat den Download blockiert – nutze stattdessen „Kopieren“.',

    // Wörter
    listsLabel: 'Welche Wörter',
    listTracked: 'Beobachtet',
    listKnown: 'Bekannt',
    listIgnored: 'Ignoriert',
    findPlaceholder: 'Wort suchen',
    findLabel: 'Wort in dieser Liste suchen',
    copyWordsAbout: 'Diese Liste als tabulatorgetrennten Text kopieren',
    exportWordsAbout: 'Diese Liste als tabulatorgetrennte Datei speichern, die Anki importieren kann',
    wordsCopied: (n: number): string => `${words(n)} kopiert.`,
    nothingToExport: 'In dieser Liste gibt es keine Wörter zum Exportieren.',
    lookingUp: 'Lesungen und Bedeutungen werden nachgeschlagen…',
    noWordMatches: (query: string): string => `Kein Wort in dieser Liste passt zu „${query}“.`,
    wordsMatching: (shown: number, total: number): string =>
      `${shown} von ${total} ${total === 1 ? 'Wort' : 'Wörtern'}.`,
    trackedEmpty:
      'Noch keine beobachteten Wörter. „Beobachten“ unterstreicht ein Wort, damit es dir auffällt, ohne eine Karte ' +
      'zu erstellen. Schalte die Schaltfläche in den Einstellungen unter „Wort-Pop-up“ ein.',
    trackedIntro: (n: number): string =>
      n === 1
        ? '1 Wort, das du beobachtest – unterstrichen, wo immer es vorkommt.'
        : `${n} Wörter, die du beobachtest – unterstrichen, wo immer sie vorkommen.`,
    stopTracking: 'Nicht mehr beobachten',
    knownEmpty:
      'Keine Wörter als bekannt markiert. Kennst du ein Wort und willst keine Karte, markiere es in seinem Pop-up ' +
      'als bekannt oder drücke K.',
    knownIntro: (n: number): string =>
      `${words(n)} als bekannt markiert. Hebst du eine Markierung auf, gilt wieder, was deine Anki-Karten sagen.`,
    unmarkKnown: 'Markierung aufheben',
    ignoredEmpty:
      'Keine ignorierten Wörter. Ignoriere Namen und Geräusche über ihr Pop-up, dann werden sie nie unterstrichen ' +
      'oder gezählt.',
    ignoredIntro: (n: number): string =>
      n === 1 ? '1 Wort, das nie unterstrichen oder gezählt wird.' : `${n} Wörter, die nie unterstrichen oder gezählt werden.`,
    stopIgnoring: 'Nicht mehr ignorieren',
  },

  popup: {
    // Das Pop-up und das Wort
    cardLabel: (word: string): string => `${word} – Wörterbuch`,
    commonBadge: 'häufig',
    characterNames: { kanji: 'Kanji', hanzi: 'Schriftzeichen' },
    partOfSpeech: {
      n: 'Nomen', 'n-adv': 'adverbiales Nomen', 'n-t': 'Zeitnomen', 'n-suf': 'Nomensuffix',
      'n-pref': 'Nomenpräfix', pn: 'Pronomen', 'adj-i': 'i-Adjektiv', 'adj-na': 'na-Adjektiv',
      'adj-no': 'no-Adjektiv', 'adj-pn': 'pränominales Adjektiv', adv: 'Adverb', 'adv-to': 'Adverb',
      aux: 'Hilfswort', 'aux-v': 'Hilfsverb', 'aux-adj': 'Hilfsadjektiv',
      conj: 'Konjunktion', cop: 'Kopula', ctr: 'Zählwort', exp: 'Ausdruck', int: 'Interjektion',
      num: 'Zahlwort', prt: 'Partikel', pref: 'Präfix', suf: 'Suffix', unc: 'nicht klassifiziert',
      vs: 'suru-Verb', 'vs-i': 'suru-Verb', 'vs-s': 'suru-Verb', vt: 'transitiv', vi: 'intransitiv',
      v1: 'ichidan-Verb', 'v1-s': 'ichidan-Verb', vk: 'kuru-Verb', vz: 'zuru-Verb',
      v5b: 'godan-Verb', v5g: 'godan-Verb', v5k: 'godan-Verb', 'v5k-s': 'godan-Verb',
      v5m: 'godan-Verb', v5n: 'godan-Verb', v5r: 'godan-Verb', 'v5r-i': 'godan-Verb',
      v5s: 'godan-Verb', v5t: 'godan-Verb', v5u: 'godan-Verb', 'v5u-s': 'godan-Verb',
      v5aru: 'godan-Verb',
      // Die Codes von Wiktionary, für koreanische und spanische Wörter. Erst die Wortart, dann die Grammatik:
      name: 'Eigenname', v: 'Verb', adj: 'Adjektiv', pron: 'Pronomen', det: 'Determinativ', artic: 'Artikel',
      counter: 'Zählwort', prep: 'Präposition', 'prep-phrase': 'präpositionale Wendung', ptcl: 'Partikel',
      intj: 'Interjektion', phrase: 'Wendung', prov: 'Sprichwort', r: 'Wurzel', char: 'Schriftzeichen',
      adn: 'adnominal', ptcpl: 'Partizip', contr: 'Kontraktion',
      masc: 'maskulin', fem: 'feminin', neut: 'neutral', sg: 'Singular', pl: 'Plural', 'pl-only': 'nur Plural',
      count: 'zählbar', uncount: 'nicht zählbar', vr: 'reflexiv', vdt: 'ditransitiv', impers: 'unpersönlich',
      irreg: 'unregelmäßig', reltnl: 'relational', reltv: 'relativ', interr: 'interrogativ', poss: 'possessiv',
      dim: 'Diminutiv', aug: 'Augmentativ', onoma: 'lautmalerisch',
      // Und wie oder wann das Wort gebraucht wird:
      idio: 'idiomatisch', fig: 'übertragen', literal: 'wörtlich', col: 'umgangssprachlich', inf: 'informell',
      fam: 'familiär', formal: 'formell', polite: 'höflich', lit: 'literarisch', poet: 'poetisch',
      rhet: 'rhetorisch', sl: 'Slang', vulg: 'vulgär', derog: 'abwertend', offens: 'beleidigend',
      humor: 'scherzhaft', euph: 'euphemistisch', child: 'Kindersprache', net: 'Internet', neol: 'Neologismus',
      cmn: 'gebräuchlich', uncmmn: 'ungebräuchlich', rare: 'selten', dated: 'altmodisch', arch: 'archaisch',
      obs: 'veraltet', hist: 'historisch', 'non-std': 'nicht standardsprachlich', dialect: 'dialektal',
      regio: 'regional',
    },

    // Die Schaltflächen unter dem Wort
    pronounce: 'Anhören',
    playedRecording: (word: string): string => `${word} · Aufnahme`,
    playedSynthesised: (word: string): string => `${word} · synthetisch`,
    pronounceFailed: 'Audio konnte nicht abgespielt werden',
    addSentence: 'Satz hinzufügen',
    sentenceAdded: 'Satz hinzugefügt',
    undo: 'Rückgängig',
    copyWord: 'Wort kopieren',
    copyPhrase: 'Wortgruppe kopieren',
    copySentence: 'Satz kopieren',
    wordCopied: 'Wort kopiert',
    phraseCopied: 'Wortgruppe kopiert',
    sentenceCopied: 'Satz kopiert',
    copyFailed: 'Kopieren nicht möglich – markiere stattdessen den Text',

    // Die Bedeutungen
    dictionaryLoading: (n: number): string => `Wörterbuch lädt noch – ${percent(n)}. Versuch es gleich noch einmal.`,
    dictionaryUnavailable: (error: string): string => `Wörterbuch nicht verfügbar: ${error}`,
    noEntry: 'Kein Wörterbucheintrag für dieses Wort.',
    moreMeanings: (n: number): string => `+${n} weitere ${n === 1 ? 'Bedeutung' : 'Bedeutungen'}`,

    // Andere Zeilen im Video mit dem Wort
    elsewhereCount: (n: number): string => (n === 1 ? 'Noch einmal in diesem Video' : `Noch ${n}-mal in diesem Video`),
    playLine: 'Abspielen',
    elsewhereMore: (n: number): string => `und ${n} weitere – die Transkriptsuche findet alle`,
    showAllInTranscript: 'Alle im Transkript zeigen',

    // Zu Anki hinzufügen
    addToAnki: 'Zu Anki hinzufügen',
    addToDeck: (deck: string): string => `Zu ${deck} hinzufügen`,
    adding: 'Wird hinzugefügt…',
    undoing: 'Wird rückgängig gemacht…',
    added: 'Hinzugefügt',
    inAnki: 'In Anki',
    showInAnki: 'In Anki zeigen',
    waiting: 'Wartet',
    waitingForAnki: 'Wartet auf Anki',
    goesInWhenAnkiOpens: 'Kommt in Anki, sobald Anki geöffnet wird',
    alreadyAdded: 'Schon hinzugefügt',
    alreadyInAnki: 'Schon in Anki',
    waitingForAnkiToOpen: 'Wartet, bis Anki geöffnet wird',
    addedWithWarning: (said: string, warning: string): string => `${said} – ${warning}`,

    // Das Stapelmenü
    otherDecks: 'Andere Stapel',
    addToAnotherDeck: 'Zu einem anderen Stapel hinzufügen',
    decksUnknown: 'Anki antwortet nicht, daher sind seine Stapel noch nicht bekannt.',
    newDeck: 'Neuer Stapel…',
    newDeckPrompt: 'Neuer Stapel – mit :: für einen Unterstapel, etwa Japanisch::Netflix',

    // Die Markierungen
    knownButton: 'Bekannt',
    trackButton: 'Beobachten',
    ignoreButton: 'Ignorieren',
    markKnownTip: 'Als bekannt markieren',
    trackTip: 'Beobachten',
    ignoreTip: 'Ignorieren',
    unmarkKnownTip: 'Markierung aufheben',
    stopTrackingTip: 'Nicht mehr beobachten',
    stopIgnoringTip: 'Nicht mehr ignorieren',
  },

  header: {
    knownStat: '{percent} bekannt',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Wörter, die du kennst',
    readyStat: '{count} bereit zum Lernen',
    readyTip: 'Zeilen mit einem neuen Wort',
    blurSubtitle: 'Untertitel weichzeichnen',
    unblurSubtitle: 'Untertitel scharf stellen',
    showTranslation: 'Übersetzung anzeigen',
    hideTranslation: 'Übersetzung ausblenden',
    transcript: 'Transkript',
    pinHeader: 'Kopfleiste anpinnen',
    unpinHeader: 'Kopfleiste loslösen',
    settings: 'Einstellungen',
    showHeader: 'Kopfleiste anzeigen',
    showHeaderLabel: 'Kopfleiste anzeigen',
  },

  player: {
    // Die Tasten des Players
    lastLine: 'Das war die letzte Zeile',
    noLineBefore: 'Davor gibt es keine Zeile',
    translationOn: 'Übersetzung an',
    translationOff: 'Übersetzung aus',
    blurOn: 'Untertitel weichgezeichnet, bis du darauf zeigst',
    blurOff: 'Untertitel sichtbar',
    lineSaved: 'Zeile gespeichert',
    lineUnsaved: 'Zeile nicht mehr gespeichert',
    lookUpFirst: 'Schlag zuerst ein Wort nach',
    alreadyKnown: (word: string): string => `${word} · in Anki schon bekannt`,
    alreadyInAnki: (word: string): string => `${word} · schon in Anki`,
    adding: (word: string): string => `${word} wird hinzugefügt…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Markierungen
    markOff: (word: string): string => `${word} · Markierung aufgehoben`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'als bekannt markiert', tracking: 'beobachtet', ignored: 'ignoriert', unknown: 'als neu markiert',
      }[status];
      if (refused) return `${word} · ${done}, keine Karte – Anki hat abgelehnt; neuer Versuch später`;
      return `${word} · ${done}, keine Karte${status === 'tracking' ? '. Siehe den Tab „Wörter“ in der Leiste' : ''}`;
    },

    // Die Karte eines Wortes
    pickDeck: 'Wähle zuerst einen Stapel in den Libregaku-Einstellungen',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `zu ${deck} hinzugefügt – ohne ${without(missing)}` : `zu ${deck} hinzugefügt`,
    alreadyIn: (deck: string): string => `schon in ${deck}`,
    queued: (deck: string): string => `Anki ist geschlossen – die Karte kommt in ${deck}, sobald es geöffnet wird`,
    alreadyQueued: 'wartet schon auf Anki',
    notKept: 'Anki ist geschlossen, und der Browser konnte die Karte nicht für später speichern',
    takenBack: (deck: string): string => `wieder aus ${deck} entfernt`,
    unqueued: 'wartet nicht mehr auf Anki',
    alreadySent: 'Die Karte ist schon in Anki',
    queueSent: (count: number): string =>
      `Anki ist offen – ${count === 1
        ? 'die dafür aufgehobene Karte wurde hinzugefügt'
        : `${count} dafür aufgehobene Karten wurden hinzugefügt`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `bekannte Wörter kommen aus ${scope}, daher zählen Karten in ${deck} nicht`,

    // Die Karte eines Satzes
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `Satz zu ${deck} hinzugefügt – ohne ${without(missing)}` : `Satz zu ${deck} hinzugefügt`,
    sentenceAlreadyIn: (deck: string): string => `der Satz ist schon in ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'Ton', picture && 'Bild'].filter(Boolean);
      return `Anki ist geschlossen – der Satz kommt in ${deck}, sobald es geöffnet wird` +
        `${lacking.length ? `, ohne ${lacking.join(' und ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'der Satz wartet schon auf Anki',
    sentenceTakenBack: (deck: string): string => `Satz wieder aus ${deck} entfernt`,

    // Satz-Audio
    recording: 'Zeile wird aufgenommen…',

    // Nachschlagen
    noDictionary: 'Noch kein Wörterbuch für diese Sprache.',
  },

  notices: {
    // Die Meldung
    unexpected: 'Libregaku ist auf ein unerwartetes Problem gestoßen.',
    dismiss: 'Schließen',

    // YouTube oder Netflix hat etwas geändert
    youtubeTrackList: 'Die Untertitelliste von YouTube konnte nicht gelesen werden.',
    youtubeTrackShape: 'Die Untertiteldaten von YouTube haben nicht das erwartete Format.',
    youtubeCaptionText: 'Der Untertiteltext von YouTube wurde auf der Seite nicht gefunden.',
    youtubePlayerTrackList: 'Die Untertitelliste dieses Videos konnte nicht aus dem YouTube-Player gelesen werden.',
    netflixTrackList: 'Die Untertitelliste von Netflix konnte nicht gelesen werden.',
    netflixCaptionText: 'Der Untertiteltext von Netflix wurde auf der Seite nicht gefunden.',
    netflixBlocked: 'Netflix hat den Teil von Libregaku blockiert, der Untertitel liest.',

    // Die Untertitel dieses Videos
    subtitlesOff: 'Schalte die Untertitel im Player ein, dann übernimmt Libregaku sie.',
    noTargetTrack: 'Hier gibt es keine Untertitel in der Sprache, die du lernst.',
    noSecondTrack: 'Hier gibt es keine Untertitel in deiner Sprache, also keine zweite Zeile.',
    onlyOneTrack: 'Dieses Video hat nur eine Untertitelspur, also keine zweite Zeile.',
    autoGenerated: 'Diese Untertitel sind automatisch erstellt, daher sind Wortlaut und Worttrennung ungenau.',
    noSubtitles: 'Dieses Video hat keine Untertitel.',
    secondTrackFailed: 'Die zweite Zeile konnte nicht geladen werden.',

    // Teile der Erweiterung
    analyserUnavailable:
      'Lesungen und Wörterbuchformen sind aus: Der Sprachanalysator wurde nicht geladen. ' +
      'Wörter passen nur bei exakt gleicher Schreibung zu deinen Karten.',
    markNotSaved: 'Diese Markierung konnte nicht gespeichert werden. Sie gilt bis zum Neuladen, dann geht sie verloren.',
    marksNotSynced:
      'Deine Markierungen konnten nicht in Anki gespeichert werden. Sie bleiben in diesem Browser und werden erneut versucht.',
    cardsNotAdded:
      'Anki hat einige der Karten nicht angenommen, die aufgehoben wurden, während es geschlossen war. ' +
      'Sie bleiben aufgehoben und werden erneut versucht.',

    // Details
    playerNeverLoaded: 'Der Player wurde nie fertig geladen.',
    subtitlesMaybeOff: 'Vielleicht sind die Untertitel im Player einfach ausgeschaltet.',
    lookedFor: (selector: string): string => `Gesucht wurde ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Dieses Video hat: ${languages.join(', ') || 'keine'}. ` +
      'Ändere in den Einstellungen, was du lernst, oder wähle ein anderes Video.',
    onlyPictures: 'Dieses Video hat sie nur als Bilder, nicht als Text, deshalb kann Libregaku sie nicht lesen.',
    noHumanTrack: 'Für dieses Video gab es keine von Menschen geschriebene Spur.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Dieses Video hat: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'der Analysator wurde nicht geladen',
  },

  anki: {
    // AnkiConnect erreichen
    offline: (port: number): string => `Auf Port ${port} lauscht nichts.`,
    timeout: (port: number, seconds: number): string =>
      `Auf Port ${port} kam innerhalb von ${seconds} s keine Antwort. ` +
      'Anki ist vielleicht beschäftigt (es synchronisiert oder zeigt einen Dialog), oder ein anderes Programm belegt den Port.',
    blocked: (origin: string): string =>
      `AnkiConnect hat ${origin} abgelehnt. In Anki: Extras → Erweiterungen → AnkiConnect → Konfiguration, ` +
      'und diese Zeile zu webCorsOriginList hinzufügen.',
    httpAnswer: (port: number, status: number): string =>
      `Etwas auf Port ${port} hat mit HTTP ${status} geantwortet. AnkiConnect tut das nicht.`,
    notAnkiConnect: (port: number): string => `Etwas anderes als AnkiConnect nutzt Port ${port}.`,
    noBackground: 'Der Hintergrundprozess der Erweiterung antwortet nicht.',
    unreachable: 'Anki ist nicht erreichbar.',
    callFailed: 'AnkiConnect-Aufruf fehlgeschlagen.',

    // Was Libregaku nicht an Anki sendet
    notRelayed: (action: string): string => `Libregaku sendet „${action}“ nicht an AnkiConnect.`,
    mediaNotFetched: (media: Media): string => MEDIA_NOT_FETCHED[media],
    mediaEmpty: (media: Media): string => MEDIA_EMPTY[media],
    mediaName: (prefix: string): string => `Dateien, die Libregaku hinzufügt, heißen ${prefix}…, diese nicht.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} braucht eine Liste von ${ids === 'notes' ? 'Notizen' : 'Karten'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Abgelehnt: ${count} der gesendeten ${ids === 'notes' ? 'Notizen' : 'Karten'} ` +
      `${count === 1 ? 'gehört' : 'gehören'} zu keiner Libregaku-Markierung. ` +
      (change === 'delete'
        ? 'Libregaku löscht nur seine eigenen Markierungen und eine Karte, die es in den letzten Minuten erstellt hat ' +
          'und die noch nicht gelernt wurde.'
        : change === 'suspend'
          ? 'Libregaku schließt nur seine eigenen Markierungen aus.'
          : 'Libregaku ändert nur die Schlagwörter seiner eigenen Markierungen.'),

    // Die Notiztypen von Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Deinem Notiztyp „${noteType}“ in Anki ${fields.length === 1 ? 'fehlt das Feld' : 'fehlen die Felder'} ` +
      `${fields.join(', ')}, also würden ${loses === 'cards' ? 'Karten' : 'Notizen'} ` +
      `${fields.length === 1 ? 'es' : 'sie'} verlieren. ` +
      'Libregaku ändert keinen Notiztyp, den du vielleicht bearbeitet hast: ' +
      `Benenne „${noteType}“ in Anki unter Extras → Notiztypen verwalten um (oder füge die Felder wieder hinzu) ` +
      'und klicke dann auf „Erneut prüfen“ – dann wird ein neuer installiert.',

    // Markierungen und wartende Karten
    marksNotAdded: (count: number): string =>
      `Anki hat ${count} der Markierungen nicht hinzugefügt. Sie bleiben in der Warteschlange und werden beim ` +
      'nächsten Mal erneut versucht.',
    marksNotStored: (cause: string): string => `Der Browserspeicher hat die aus Anki gelesenen Markierungen abgelehnt: ${cause}`,
    storageUnreadable: (cause: string): string => `Der Browserspeicher konnte nicht gelesen werden: ${cause}`,
  },

  errors: {
    // Den Ton eines Tabs aufnehmen
    captureNotAllowed: 'Lass Satz-Audio auf dieser Website zuerst in den Libregaku-Einstellungen zu.',
    captureRefused: 'Chrome hat die Aufnahme dieses Tabs verweigert',

    // Eine Untertitelspur, die nicht geladen wurde
    unknownTrack: (id: string): string => `unbekannte Spur ${id}`,
    noCaptionFormat: (attempts: readonly string[]): string =>
      `kein Untertitelformat hat funktioniert – ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `keine Untertitel-URL hat funktioniert – ${attempts.join('; ') || 'keine angegeben'}`,
    emptyAnswer: 'leer',
    noCues: '0 Zeilen',
    noCuesParsed: 'ergab keine Zeilen',
    noAnswerWithin: (seconds: number): string => `keine Antwort in ${seconds} s`,

    // Der Name einer Spur
    forcedTrack: (track: string): string => `${track} (erzwungen)`,

    // Wörterbuch und Analysator
    noAnswer: 'keine Antwort von der Erweiterung – lade die Seite neu, um sie neu zu starten',
    analyserLoading: 'der Analysator lädt noch',
    dictionaryLoading: 'das Wörterbuch lädt noch',
    lookupFailed: 'Nachschlagen fehlgeschlagen',
  },

  grammar: {
    // Zeit und Höflichkeit
    past: 'Vergangenheit',
    polite: 'höflich',

    // Verneinung
    negative: 'Verneinung',
    'negative intent': 'negativer Volitional',
    without: 'ohne zu',

    // Bedingung
    conditional: 'Konditional',
    whenever: 'immer wenn',

    // Wer es tut, und ob es geht
    passive: 'Passiv',
    'passive or potential': 'Passiv oder Potential',
    potential: 'Potential',
    causative: 'Kausativ',

    // Wünschen
    'want to': 'wollen',
    'seems to want to': 'scheint zu wollen',
    'want someone to': 'wollen, dass jemand',

    // Anschein und Vermutung
    seems: 'scheint',
    'seems like': 'scheint so',
    hearsay: 'Hörensagen',
    apparently: 'anscheinend',
    probably: 'vermutlich',
    might: 'vielleicht',

    // Was geschehen sollte
    'ought to': 'sollte',
    'supposed to': 'müsste',
    'intends to': 'Absicht',

    // Müssen und Dürfen
    must: 'müssen',
    'must not': 'nicht dürfen',
    "don't have to": 'nicht müssen',
    may: 'dürfen',

    // Befehle und Bitten
    imperative: 'Imperativ',
    volitional: 'Volitional',
    'polite command': 'höflicher Befehl',
    please: 'Bitte',

    // Verbindung zum Folgenden
    'te-form': 'te-Form',
    listing: 'Aufzählung',
    while: 'während',
    because: 'weil',
    'even though': 'obwohl',
    'in order to': 'um zu',
    'so that': 'damit',

    // Hilfsverben nach der te-Form
    ongoing: 'andauernd',
    'resulting state': 'Ergebniszustand',
    'completely, or regrettably': 'endgültig, oder leider',
    'in advance': 'im Voraus',
    'try doing': 'ausprobieren',
    'going forward': 'fortschreitend',
    'coming to be': 'allmählich werden',
    'receive the favour': 'Gefallen empfangen',
    'someone does for me': 'tut es für mich',
    'do for someone': 'für jemanden tun',

    // Hilfsverben nach dem Verbstamm
    'too much': 'zu viel',
    'easy to': 'leicht zu',
    'hard to': 'schwer zu',
    'start to': 'anfangen zu',
    'keep on': 'weitermachen',
    finish: 'beenden',
    again: 'erneut',
    'each other': 'gegenseitig',
    completely: 'vollständig',
    thoroughly: 'gründlich',
    around: 'herum',
    'non-stop': 'pausenlos',

    // Formen eines spanischen Wortes
    or: 'oder',
    'first-person': '1. Person',
    'second-person': '2. Person',
    'third-person': '3. Person',
    singular: 'Singular',
    plural: 'Plural',
    masculine: 'maskulin',
    feminine: 'feminin',
    present: 'Präsens',
    preterite: 'Indefinido',
    imperfect: 'Imperfekt',
    'imperfect-se': 'Imperfekt (-se)',
    future: 'Futur',
    'conditional-mood': 'Konditional',
    indicative: 'Indikativ',
    subjunctive: 'Subjuntivo',
    infinitive: 'Infinitiv',
    gerund: 'Gerundium',
    participle: 'Partizip',
    formal: 'formell',
    informal: 'informell',
    'with-tú': 'mit tú',
    'with-vos': 'mit vos',
    'vos-form': 'vos-Form',
    voseo: 'Voseo',
    'second-person-semantically': 'im Sinne von „Sie“',
    accusative: 'mit direktem Objekt',
    dative: 'mit indirektem Objekt',
    'object-first-person': 'Objekt der 1. Person',
    'object-second-person': 'Objekt der 2. Person',
    'object-third-person': 'Objekt der 3. Person',
    'object-singular': 'Objekt im Singular',
    'object-plural': 'Objekt im Plural',
    diminutive: 'Diminutiv',
    augmentative: 'Augmentativ',
    superlative: 'Superlativ',
    alternative: 'Variante',
    'alt-of': 'andere Schreibung',

    // Koreanische Endungen
    honorific: 'Honorativ',
    'future or guess': 'Futur oder Vermutung',
    'formal polite': 'formell-höflich',
    question: 'Frage',
    but: 'aber',
    "let's": 'lass uns',
    plain: 'schlicht',
    'shall we, or I wonder': 'sollen wir, oder ob wohl',
    'I will': 'Versprechen',
    'just noticed': 'gerade bemerkt',
    'as you know': 'wie du weißt',
    and: 'und',
    'because, or and then': 'weil, oder und dann',
    'but, or given that': 'aber, oder da',
    'even if': 'auch wenn',
    whether: 'ob',
    'adverb form': 'Adverbform',
    quoting: 'indirekte Rede',
    'used to': 'früher',
    topic: 'Thema',
    subject: 'Subjekt',
    object: 'Objekt',
    possessive: 'Genitiv',
    'come to': 'dazu kommen',
    when: 'wenn',
    modifier: 'Attributform',
    'noun form': 'Nominalform',
    becomes: 'werden',
    'have done before': 'schon einmal getan',
  },
};
