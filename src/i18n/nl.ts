import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** "1 woord", "2 woorden". */
const words = (n: number): string => (n === 1 ? '1 woord' : `${n} woorden`);

/** "1 kaart", "2 kaarten". */
const cards = (n: number): string => (n === 1 ? '1 kaart' : `${n} kaarten`);

/** A share, as Dutch usually writes it: the % right after the number. */
const percent = (n: number): string => `${n}%`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'uit', unknown: 'nieuwe woorden', always: 'alle' };

/** What a card went in without, joined with "of": "zonder zinsaudio". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'zinsaudio (klik op het Libregaku-icoon om hier op te nemen)'
      : 'zinsaudio'))
    .join(' of ');

type Media = 'audio' | 'video' | 'picture';
const MEDIA_NOT_FETCHED: Record<Media, string> = {
  audio: 'Libregaku voegt alleen audio toe die het zelf heeft opgehaald.',
  video: 'Libregaku voegt alleen video toe die het zelf heeft opgehaald.',
  picture: 'Libregaku voegt alleen afbeeldingen toe die het zelf heeft opgehaald.',
};
const MEDIA_EMPTY: Record<Media, string> = {
  audio: 'De audio van deze aantekening bevat geen gegevens.',
  video: 'De video van deze aantekening bevat geen gegevens.',
  picture: 'De afbeelding van deze aantekening bevat geen gegevens.',
};

/** The interface in Dutch. Anything left out shows in English. */
export const nl: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Talen
    languagesHeading: 'Talen',
    languagesAbout: 'Kies de taal die je leert en je eigen taal.',
    target: 'Ik leer',
    targetLimited: (language: string): string => `${language} – beperkt`,
    supportFull: 'Volledige ondersteuning, met lezingen en furigana.',
    supportPinyin: 'Volledige ondersteuning, met pinyin. Definities zijn in het Engels.',
    supportWords: 'Volledige ondersteuning. Definities zijn in het Engels.',
    supportBasic: 'Basisondersteuning: woorden worden gesplitst, maar er is nog geen woordenboek en er zijn geen lezingen.',
    native: 'Jouw taal',
    nativeHint: 'Vertalingen en definities worden in deze taal getoond, als de video en het woordenboek die hebben.',
    definitions: 'Definities in',
    definitionsHint: 'Het woordenboek heeft geen definities in jouw taal, dus worden ze in deze taal getoond.',
    definitionsHintFor: (language: string): string =>
      `Het woordenboek heeft geen definities in het ${language}, dus worden ze in deze taal getoond.`,

    // Woorden opzoeken
    lookupHeading: 'Woorden opzoeken',
    lookupAbout: 'Kies hoe en wanneer woorden worden opgezocht.',
    interaction: 'Opzoeken bij',
    interactionHover: 'Aanwijzen',
    interactionShift: 'Aanwijzen met Shift',
    interactionClick: 'Klikken',
    interactionHint: 'Op een woord klikken werkt ook altijd.',
    hoverPause: 'Pauzeren tijdens opzoeken',
    hoverPauseHint: 'Pauzeert de video zolang je muis op een woord staat.',
    sidebarHover: 'Snelle definities in het transcript',
    sidebarHoverHint: 'Toont een korte definitie als je een woord in het transcript aanwijst.',

    // Woordpop-up
    popupHeading: 'Woordpop-up',
    popupAbout: 'Kies wat de pop-up toont als je een woord opzoekt.',
    cardMarks: 'Knoppen “Bekend” en “Negeren”',
    cardMarksHint:
      '“Bekend” verbergt de onderstreping van een woord; “Negeren” laat het buiten de tellingen. Geen van beide maakt een kaart.',
    cardTrack: 'Knop “Volgen”',
    cardTrackHint: 'Geeft woorden die je wilt opmerken een paarse onderstreping. Maakt geen kaart.',
    cardDeckMenu: 'Setmenu',
    cardDeckMenuHint:
      'Zet een ▾ naast “Toevoegen aan Anki” om een andere set te kiezen. Nieuwe kaarten gaan daarna naar die set.',
    cardAddLine: 'Zinskaarten',
    cardAddLineHint: 'Voegt een knop toe die van de hele zin een kaart maakt, met de audio en een screenshot.',
    cardKanji: 'Kanjidetails',
    cardKanjiHint: 'Toont de betekenissen en lezingen van elke kanji.',
    cardHanzi: 'Karakterdetails',
    cardHanziHint: 'Toont de betekenissen en lezingen van elk karakter.',
    lookupElsewhere: 'Voorbeelden uit deze video',
    lookupElsewhereHint: 'Toont andere zinnen in deze video met het woord. Klik op een zin om hem af te spelen.',

    // Ondertitels
    subtitlesHeading: 'Ondertitels',
    subtitlesAbout: 'Pas aan hoe ondertitels er op de video uitzien.',
    ruby: 'Furigana',
    rubyUnknown: 'Nieuwe woorden',
    rubyAlways: 'Alle',
    rubyNever: 'Uit',
    rubyHint: 'Lezingen boven kanji. Druk op R om tijdens het kijken te wisselen.',
    pinyin: 'Pinyin',
    pinyinHint: 'Lezingen boven karakters. Druk op R om tijdens het kijken te wisselen.',
    blurPrimary: 'Ondertitels vervagen',
    blurPrimaryHint: 'Om luisteren te oefenen: ondertitels blijven vaag tot je ze aanwijst. Druk op H om te wisselen.',
    subtitleSize: 'Tekstgrootte',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Schaalt mee met de speler en ziet er op volledig scherm dus hetzelfde uit.',
    subtitleBottom: 'Positie',
    subtitleBottomLowest: 'Zeer laag',
    subtitleBottomLow: 'Laag',
    subtitleBottomNormal: 'Normaal',
    subtitleBottomRaised: 'Iets hoger',
    subtitleBottomHigh: 'Hoog',
    subtitleBottomHighest: 'Zeer hoog',
    subtitleBottomHint: 'Hoe hoog de ondertitels staan. Een andere ondertitelextensie op dezelfde speler blijft eronder.',
    dualSubtitles: 'Vertaling tonen',
    dualSubtitlesHint:
      'Toont ondertitels in jouw taal onder die van de taal die je leert. Ze komen van de site, ' +
      'niet van een machinevertaling, en hebben een volledig transcript van de video nodig.',

    // Onderstrepingen
    underlinesHeading: 'Onderstrepingen',
    underlinesAbout: 'Elke kleur toont hoe goed je een woord kent. Klik op een kleur om die te wijzigen.',
    colorUnknown: 'Nieuwe woorden',
    colorUnknownHint: 'Woorden zonder kaart in Anki.',
    colorLearning: 'Aan het leren',
    colorLearningHint: 'Woorden met een kaart die nog niet volwassen is.',
    colorTracking: 'Gevolgd',
    colorTrackingHint: 'Woorden die je volgt.',
    colorKnown: 'Bekend',
    colorKnownHint: 'Woorden met een volwassen kaart, of gemarkeerd als bekend.',
    markKnown: 'Bekende woorden onderstrepen',
    markKnownHint: 'Standaard uit, zodat het scherm rustiger wordt naarmate je leert.',
    defaultColours: 'Standaardkleuren',
    resetColours: 'Herstellen',

    // Transcript
    transcriptHeading: 'Transcript',
    transcriptAbout: 'Het paneel naast de video met alle ondertitelregels.',
    sidebarOpen: 'Transcriptpaneel tonen',
    sidebarOpenHint: 'Druk op S om het tijdens het kijken te tonen of te verbergen.',
    sidebarFollow: 'Meescrollen met de video',
    sidebarFollowHint: 'Houdt de huidige regel in beeld. Scrol je zelf, dan pauzeert dit; een knop hervat het.',
    headerBar: 'Bovenbalk tonen',
    headerBarHint: 'Verschijnt boven in de video als je muis in de buurt komt.',
    languageBadge: 'Taalaanduiding',
    languageBadgeFlag: 'Vlag',
    languageBadgeCode: 'Code',
    languageBadgeHint: 'Hoe de bovenbalk de taal toont die je leert.',
    sidebarStats: 'Nieuwe woorden tellen',
    sidebarStatsHint:
      'Toont het aantal nieuwe woorden per regel, je percentage bekende woorden en de filters die daarop werken.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Koppel Anki, kies waar nieuwe kaarten heen gaan en welke sets meetellen als woorden die je kent.',
    deck: 'Set voor nieuwe kaarten',
    deckHint: 'De set waaraan elke nieuwe kaart wordt toegevoegd.',
    statusScope: 'Bekende woorden uit',
    statusScopeHint: 'Kaarten in deze sets bepalen welke woorden worden onderstreept. Inclusief subsets.',
    marksInAnki: 'Markeringen in Anki bewaren',
    marksInAnkiHint:
      'Bewaart “Bekend”, “Volgen” en “Negeren” als verborgen aantekeningen in Anki (Libregaku::Marks), zodat ze ' +
      'naar je andere apparaten synchroniseren. Uit: ze blijven in deze browser.',

    // De setmenu's
    wholeCollection: 'Volledige collectie',
    chooseDeck: 'Kies een set…',
    deckNotInAnki: (deck: string): string => `${deck} – niet in Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (en subsets)`,
    deckUnset: 'Kies een set. Tot dan kunnen er geen kaarten worden toegevoegd.',
    deckMissing: (deck: string): string => `Anki heeft geen set meer met de naam “${deck}”. Kies een andere.`,
    statusScopeMissing: (deck: string): string =>
      `Anki heeft geen set meer met de naam “${deck}”, dus elk woord staat als nieuw. Kies een andere.`,
    statusScopeOutside: (deck: string): string =>
      `Nieuwe kaarten gaan naar “${deck}”, maar die set valt hier niet onder, dus woorden die je toevoegt blijven ` +
      'als nieuw onderstreept. Kies een set waar die in zit, of “Volledige collectie”.',

    // De stand van Anki
    ankiChecking: 'Controleren…',
    ankiConnected: 'Verbonden.',
    noteTypeInstalled: 'Aantekeningstype geïnstalleerd.',
    cardsMade: (n: number): string => `${cards(n)} gemaakt met Libregaku.`,
    noCards: 'Nog geen kaarten.',
    cardsFlushed: (n: number): string =>
      `${cards(n)} toegevoegd die ${n === 1 ? 'is' : 'zijn'} gemaakt terwijl Anki gesloten was.`,
    cardsNotFlushed: (n: number, error: string): string =>
      `${cards(n)} ${n === 1 ? 'kon' : 'konden'} niet worden toegevoegd: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} ${n === 1 ? 'wacht' : 'wachten'} nog op Anki.`,
    ankiOffline: (port: number): string =>
      `Anki reageert niet op poort ${port}. Dat is normaal zolang Anki gesloten is: ` +
      'nieuwe kaarten wachten hier en worden toegevoegd zodra het opent.',
    ankiBlocked: 'Anki draait, maar AnkiConnect laat deze extensie nog niet toe.',
    ankiOccupied: (detail: string): string =>
      `${detail} Sluit het programma dat de poort gebruikt, zodat Anki hem kan gebruiken.`,

    // De Anki-knoppen
    checkAgain: 'Opnieuw controleren',
    newDeck: 'Nieuwe set',
    openCards: 'Kaarten openen in Anki',
    openMarks: 'Markeringen openen in Anki',
    newDeckPrompt: 'Geef de nieuwe set een naam. Gebruik :: voor een subset, zoals Japans::Netflix',

    // Anki koppelen
    installStep: 'Installeer Anki op deze computer en open het. {link}',
    getAnki: 'Anki downloaden',
    addonStep: 'Ga in Anki naar {menu}, plak deze code en start Anki opnieuw.',
    addonMenu: 'Hulpmiddelen → Add-ons → Add-ons downloaden…',
    aboutAnkiConnect: 'Over AnkiConnect',
    originStep: 'Ga in Anki naar {menu}, voeg deze regel toe aan {setting} en start Anki opnieuw.',
    originMenu: 'Hulpmiddelen → Add-ons → AnkiConnect → Configuratie',
    runningStep: 'Houd Anki open terwijl je kijkt. Kaarten gaan rechtstreeks naar Anki op deze computer.',
    copy: 'Kopiëren',
    copyValue: (value: string): string => `${value} kopiëren`,
    copied: 'Gekopieerd',
    copyFailed: 'Selecteer het',

    // Anki-kaarten
    ankiCardsHeading: 'Anki-kaarten',
    ankiCardsAbout: 'Kies wat er naast het woord, de lezing, de betekenis en de zin op elke nieuwe kaart komt.',
    cardAudio: 'Woordaudio',
    cardAudioHint: 'Een opname van het woord, als die bestaat. Nooit een synthetische stem.',
    cardSentenceAudio: 'Zinsaudio',
    cardSentenceAudioHint:
      'Neemt de zin op door hem nog een keer af te spelen. Op Netflix is daarvoor de toestemming hieronder nodig.',
    cardScreenshot: 'Screenshot',
    cardScreenshotHint: 'Een stilstaand beeld van de scène. Niet op Netflix, omdat Netflix het blokkeert.',
    capture: 'Zinsaudio op Netflix',
    captureAllow: 'Toestaan',
    captureAllowInSettings: 'Toestaan in instellingen',
    captureRemove: 'Verwijderen',
    captureAllowed:
      'Toegestaan. Klik op elk Netflix-tabblad op het Libregaku-icoon en kies “Zinsaudio hier opnemen”.',
    captureNeeded:
      'Netflix beschermt zijn video, dus wordt zinsaudio via het tabblad opgenomen. Daarvoor is je toestemming nodig.',

    // Gegevens en licenties
    creditsHeading: 'Gegevens en licenties',
    creditJmdict:
      'Woordenboek- en kanjigegevens © Electronic Dictionary Research and Development Group, gebruikt onder ' +
      'CC BY-SA 4.0. Als JSON verpakt door jmdict-simplified.',
    creditLindera:
      'Splitst Japans, Koreaans en Chinees in woorden. MIT-licentie; IPADIC, mecab-ko-dic en CC-CEDICT hebben ' +
      'hun eigen voorwaarden.',
    creditCedict: 'Chinees woordenboek © MDBG en bijdragers, gebruikt onder CC BY-SA 4.0.',
    creditWiktionary:
      'Woordenboeken voor Koreaans en Spaans, uit Wiktionary via kaikki.org en wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditUnihan:
      'Welke lezing van een Chinees karakter eerst wordt getoond. © Unicode, Inc., gebruikt onder de Unicode License.',
    creditJotoba: 'Gebruikt voor opzoeken zolang het woordenboek downloadt. Beide gebruiken JMdict.',
    creditLucide: 'Iconen. ISC-licentie.',
    licence: 'Libregaku heeft een MIT-licentie. Woordenboekgegevens worden van hun bronnen gedownload, niet meegeleverd.',
    built: (when: string): string => `Deze kopie is gebouwd op ${when}.`,

    // Sneltoetsen
    keyLine: 'Vorige of volgende regel',
    keyReplay: 'Regel herhalen',
    keyTranslation: 'Vertaling tonen of verbergen',
    keyShiftLookup: 'Ingedrukt houden om het woord onder de muis op te zoeken',
    keyAdd: 'Woord in de pop-up toevoegen aan Anki',
    keyKnown: 'Woord in de pop-up markeren als bekend',
    keyFurigana: 'Furigana wisselen: uit, nieuwe woorden, alle',
    keyPinyin: 'Pinyin wisselen: uit, nieuwe woorden, alle',
    keyBlur: 'Ondertitels vervagen of scherp maken',
    keySave: 'Huidige regel opslaan',
    keyTranscript: 'Transcriptpaneel tonen of verbergen',
    keyClose: 'Pop-up sluiten',
  },

  options: {
    pageTitle: 'Libregaku-instellingen',
    help: 'Help',
    tagline: 'Wijzigingen gelden meteen, hier en in het transcriptpaneel terwijl je kijkt.',
    contentsLabel: 'Onderdelen van de instellingen',
    settingsLabel: 'Instellingen',
    setupHeading: 'Aan de slag',
    setupAbout: 'Twee keuzes; voor al het andere is er een verstandige standaard.',
    stepLanguages: 'Kies wat je leert',
    stepAnki: 'Koppel Anki en kies een set voor nieuwe kaarten',
    ankiOptional:
      'Anki is optioneel: ondertitels, opzoeken en furigana werken ook zonder. ' +
      'Anki onthoudt welke woorden je al kent.',
    nextSteps:
      'Open daarna een video met ondertitels in de taal die je leert, en wijs met je muis een woord aan. ' +
      'De toetsenbordknop in het transcriptpaneel toont de sneltoetsen.',
    confirmLanguages: 'Deze talen kloppen',
    keepDeck: (deck: string): string => `${deck} gebruiken voor nieuwe kaarten`,
  },

  action: {
    help: 'Help',
    settings: 'Instellingen',
    settingsTip: 'Alle instellingen',
    checkingPage: 'Pagina controleren…',
    notActive:
      'Niet actief op deze pagina. Open een video op YouTube of Netflix. Heb je Libregaku net geïnstalleerd of ' +
      'opnieuw geladen, laad het tabblad dan opnieuw.',
    unsupported: 'Libregaku werkt op YouTube en Netflix.',
    waitingForSubtitles: (site: string): string => `Wachten op ondertitels van ${site}. Controleer of ze aanstaan.`,
    activeOn: (title: string): string => `Actief – ${title}`,
    active: 'Actief op deze video.',
    subtitlesTrack: 'Ondertitels',
    translationTrack: 'Vertaling',
    noTranslation: 'Geen',
    generatedTrack: (track: string): string => `${track} (automatisch)`,
    captureNeedsPermission: 'Om hier zinsaudio op te nemen, is toestemming nodig om het geluid van dit tabblad op te nemen.',
    captureAllowInSettings: 'Toestaan in instellingen',
    captureReady: 'Het geluid van Netflix kan pas worden opgenomen als je het voor dit tabblad aanzet.',
    captureStart: 'Zinsaudio hier opnemen',
    captureFailed: 'Chrome kon dit tabblad niet opnemen.',
    toggleSidebar: 'Zijbalk tonen/verbergen',
    ankiChecking: 'Anki: controleren…',
    ankiConnected: (n: number): string => `Anki verbonden · ${cards(n)} van Libregaku`,
    ankiOffline: 'Anki draait niet – woorden staan als nieuw',
    ankiOccupied: (port: number): string => `Een ander programma gebruikt poort ${port}, dus Anki is niet bereikbaar`,
    ankiBlocked: 'Anki heeft deze extensie geweigerd – in Instellingen staat de regel die je moet toevoegen',
    ankiBusy: 'Anki antwoordde niet – misschien is het aan het synchroniseren',
    ankiRefused: 'Anki heeft het verzoek geweigerd',
    cardsToAdd: (n: number): string => `nog ${cards(n)} toe te voegen`,
    cardsWaiting: (n: number): string => `${cards(n)} ${n === 1 ? 'wacht' : 'wachten'} op Anki`,
  },

  sidebar: {
    // De tabbladen en de knoppen ernaast
    tabsLabel: 'Lijsten',
    transcriptTab: 'Transcript',
    savedTab: 'Opgeslagen',
    wordsTab: 'Woorden',
    settings: 'Instellingen',
    shortcuts: 'Sneltoetsen',
    close: 'Sluiten',
    closeLabel: 'Paneel inklappen',
    openTip: 'Transcript',
    openLabel: 'Transcript tonen',
    help: 'Help',

    // Het transcript doorzoeken
    searchPlaceholder: 'Transcript doorzoeken…',
    searchLabel: 'Transcript doorzoeken',
    noMatches: 'Geen resultaten',
    matchAt: (at: number, total: number): string => `${at} van ${total}`,
    matchesFound: (n: number): string => `${n} gevonden`,

    // Het filter
    filterTip: 'Filteren',
    filterLabel: 'Regels filteren',
    filterAll: 'Alle regels',
    filterAllAbout: 'Elke regel',
    filterNew: 'Met nieuwe woorden',
    filterNewAbout: 'Regels met een woord waarvoor je geen kaart hebt',
    filterReady: 'Klaar om te leren',
    filterReadyAbout: 'Regels waarin maar één woord nieuw voor je is – daar leer je het makkelijkst van',
    filterSaved: 'Opgeslagen',
    filterSavedAbout: 'Regels die je voor later hebt bewaard',

    // Het transcript
    partial: 'Groeit terwijl je kijkt – deze speler geeft alleen de huidige regel door.',
    partialEmpty: 'Nog niets. Regels verschijnen hier zodra ze worden uitgesproken.',
    empty: 'Geen transcript geladen.',
    currentLine: 'Huidige regel',
    lineNew: (n: number): string => `${n} nieuw`,
    saveLine: 'Regel opslaan',
    unsave: 'Bladwijzer verwijderen',
    addSentence: 'Zin toevoegen',
    addSentenceLabel: 'Zin toevoegen aan Anki',

    // Het overzicht boven het transcript: een vetgedrukt getal, dan wat het telt
    knownPercent: (n: number): string => percent(n),
    summaryKnown: '{n} bekend',
    summaryNew: '{n} nieuw',
    summaryReady: '{n} klaar om te leren',
    counting: (n: number): string => `Nieuwe woorden tellen… ${percent(n)}`,
    countFailed: 'Sommige regels konden niet worden geteld, dus er zijn geen totalen.',

    // De snelle definitie
    dictionaryLoading: (n: number): string => `Woordenboek laden – ${percent(n)}`,
    dictionaryUnavailable: 'Woordenboek niet beschikbaar',
    noEntry: 'Niet in het woordenboek.',

    // Opgeslagen
    savedEmpty:
      'Nog niets opgeslagen. Gebruik de bladwijzer bij een regel in het transcript – of druk op B – om een zin te ' +
      'bewaren waar je naar terug wilt.',
    thisVideo: 'deze video',
    remove: 'Verwijderen',
    removeLabel: 'Verwijderen uit opgeslagen',
    copySavedAbout: 'Alle opgeslagen regels kopiëren als tekst met tabs',
    exportSavedAbout: 'Een bestand met tabs opslaan dat Anki kan importeren',
    addSavedAbout: 'Van elke opgeslagen regel een kaart maken',
    linesCopied: (n: number): string => (n === 1 ? '1 regel gekopieerd.' : `${n} regels gekopieerd.`),
    chooseDeck: 'Kies eerst een set in Instellingen – daar gaan nieuwe kaarten heen.',
    checkingAnki: 'Anki controleren…',
    ankiOffline: 'Anki draait niet. Open het en probeer het opnieuw – de stappen staan in Instellingen.',
    ankiBlocked: 'AnkiConnect laat deze extensie nog niet toe. In Instellingen staat de ene regel die je moet toevoegen.',
    ankiUnreachable: 'Anki was niet bereikbaar. In Instellingen staat waarom.',
    adding: (at: number, total: number): string => `${at} van ${total} toevoegen…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${added} toegevoegd aan ${deck}${already ? `, ${already} ${already === 1 ? 'stond' : 'stonden'} er al` : ''}.`,

    // Knoppen en meldingen van Opgeslagen en Woorden
    copy: 'Kopiëren',
    exportFile: 'Bestand exporteren',
    addToAnki: 'Toevoegen aan Anki',
    noClipboard: 'Geen toegang tot het klembord.',
    downloaded: 'Opgeslagen in je downloads. In Anki: Bestand → Importeren.',
    downloadBlocked: 'Deze pagina heeft de download geblokkeerd – gebruik “Kopiëren”.',

    // Woorden
    listsLabel: 'Welke woorden',
    listTracked: 'Gevolgd',
    listKnown: 'Bekend',
    listIgnored: 'Genegeerd',
    findPlaceholder: 'Woord zoeken',
    findLabel: 'Woord zoeken in deze lijst',
    copyWordsAbout: 'Deze lijst kopiëren als tekst met tabs',
    exportWordsAbout: 'Deze lijst opslaan als bestand met tabs dat Anki kan importeren',
    wordsCopied: (n: number): string => `${words(n)} gekopieerd.`,
    nothingToExport: 'Er staan geen woorden in deze lijst om te exporteren.',
    lookingUp: 'Lezingen en betekenissen opzoeken…',
    noWordMatches: (query: string): string => `Geen woord in deze lijst past bij “${query}”.`,
    wordsMatching: (shown: number, total: number): string => `${shown} van ${words(total)}.`,
    trackedEmpty:
      'Je volgt nog niets. “Volgen” onderstreept een woord zodat het je opvalt, zonder een kaart te maken. ' +
      'Zet de knop aan in Instellingen, onder “Woordpop-up”.',
    trackedIntro: (n: number): string =>
      n === 1
        ? 'Je volgt 1 woord, onderstreept overal waar het voorkomt.'
        : `Je volgt ${n} woorden, onderstreept overal waar ze voorkomen.`,
    stopTracking: 'Niet meer volgen',
    knownEmpty:
      'Geen woorden gemarkeerd als bekend. Ken je een woord en wil je er geen kaart van, markeer het dan als bekend ' +
      'in de pop-up of druk op K.',
    knownIntro: (n: number): string =>
      `${words(n)} gemarkeerd als bekend. Verwijder je een markering, dan geldt weer wat je Anki-kaarten zeggen.`,
    unmarkKnown: 'Markering verwijderen',
    ignoredEmpty:
      'Geen genegeerde woorden. Negeer namen en geluiden via hun pop-up, dan worden ze nooit onderstreept of geteld.',
    ignoredIntro: (n: number): string =>
      `${words(n)} die nooit ${n === 1 ? 'wordt' : 'worden'} onderstreept of geteld.`,
    stopIgnoring: 'Niet meer negeren',
  },

  popup: {
    // De pop-up en het woord
    cardLabel: (word: string): string => `${word} – woordenboek`,
    commonBadge: 'veelgebruikt',
    characterNames: { kanji: 'Kanji', hanzi: 'Karakters' },
    partOfSpeech: {
      n: 'zelfstandig naamwoord', 'n-adv': 'bijwoordelijk naamwoord', 'n-t': 'tijdsnaamwoord',
      'n-suf': 'achtervoegsel bij naamwoord', 'n-pref': 'voorvoegsel bij naamwoord', pn: 'voornaamwoord',
      'adj-i': 'i-adjectief', 'adj-na': 'na-adjectief', 'adj-no': 'no-adjectief',
      'adj-pn': 'prenominaal adjectief', adv: 'bijwoord', 'adv-to': 'bijwoord',
      aux: 'hulpwoord', 'aux-v': 'hulpwerkwoord', 'aux-adj': 'hulpadjectief',
      conj: 'voegwoord', cop: 'koppelwerkwoord', ctr: 'maatwoord', exp: 'uitdrukking', int: 'tussenwerpsel',
      num: 'telwoord', prt: 'partikel', pref: 'voorvoegsel', suf: 'achtervoegsel', unc: 'niet ingedeeld',
      vs: 'suru-werkwoord', 'vs-i': 'suru-werkwoord', 'vs-s': 'suru-werkwoord', vt: 'overgankelijk',
      vi: 'onovergankelijk',
      v1: 'ichidan-werkwoord', 'v1-s': 'ichidan-werkwoord', vk: 'kuru-werkwoord', vz: 'zuru-werkwoord',
      v5b: 'godan-werkwoord', v5g: 'godan-werkwoord', v5k: 'godan-werkwoord', 'v5k-s': 'godan-werkwoord',
      v5m: 'godan-werkwoord', v5n: 'godan-werkwoord', v5r: 'godan-werkwoord', 'v5r-i': 'godan-werkwoord',
      v5s: 'godan-werkwoord', v5t: 'godan-werkwoord', v5u: 'godan-werkwoord', 'v5u-s': 'godan-werkwoord',
      v5aru: 'godan-werkwoord',
      // De codes van Wiktionary, voor Koreaanse en Spaanse woorden. Eerst de woordsoort, dan de grammatica:
      name: 'eigennaam', v: 'werkwoord', adj: 'bijvoeglijk naamwoord', pron: 'voornaamwoord', det: 'determinator',
      artic: 'lidwoord', counter: 'maatwoord', prep: 'voorzetsel', 'prep-phrase': 'voorzetselgroep',
      ptcl: 'partikel', intj: 'tussenwerpsel', phrase: 'uitdrukking', prov: 'spreekwoord', r: 'stam',
      char: 'karakter', adn: 'adnominaal', ptcpl: 'deelwoord', contr: 'samentrekking',
      masc: 'mannelijk', fem: 'vrouwelijk', neut: 'onzijdig', sg: 'enkelvoud', pl: 'meervoud',
      'pl-only': 'alleen meervoud', count: 'telbaar', uncount: 'ontelbaar', vr: 'wederkerend',
      vdt: 'ditransitief', impers: 'onpersoonlijk', irreg: 'onregelmatig', reltnl: 'relationeel',
      reltv: 'betrekkelijk', interr: 'vragend', poss: 'bezittelijk', dim: 'verkleinwoord', aug: 'vergrotend',
      onoma: 'klanknabootsend',
      // En hoe of wanneer het woord gebruikt wordt:
      idio: 'idiomatisch', fig: 'figuurlijk', literal: 'letterlijk', col: 'spreektaal', inf: 'informeel',
      fam: 'familiair', formal: 'formeel', polite: 'beleefd', lit: 'literair', poet: 'poëtisch',
      rhet: 'retorisch', sl: 'slang', vulg: 'vulgair', derog: 'denigrerend', offens: 'beledigend',
      humor: 'schertsend', euph: 'eufemistisch', child: 'kindertaal', net: 'internet', neol: 'neologisme',
      cmn: 'gangbaar', uncmmn: 'ongebruikelijk', rare: 'zeldzaam', dated: 'gedateerd', arch: 'archaïsch',
      obs: 'verouderd', hist: 'historisch', 'non-std': 'niet-standaard', dialect: 'dialect', regio: 'regionaal',
    },

    // De knoppen onder het woord
    pronounce: 'Luisteren',
    playedRecording: (word: string): string => `${word} · opname`,
    playedSynthesised: (word: string): string => `${word} · synthetisch`,
    pronounceFailed: 'kon de audio niet afspelen',
    addSentence: 'Zin toevoegen',
    sentenceAdded: 'Zin toegevoegd',
    undo: 'Ongedaan maken',
    copyWord: 'Woord kopiëren',
    copyPhrase: 'Woordgroep kopiëren',
    copySentence: 'Zin kopiëren',
    wordCopied: 'woord gekopieerd',
    phraseCopied: 'woordgroep gekopieerd',
    sentenceCopied: 'zin gekopieerd',
    copyFailed: 'kopiëren mislukt – selecteer de tekst',

    // De betekenissen
    dictionaryLoading: (n: number): string =>
      `Het woordenboek wordt nog geladen – ${percent(n)}. Probeer het zo opnieuw.`,
    dictionaryUnavailable: (error: string): string => `Woordenboek niet beschikbaar: ${error}`,
    noEntry: 'Dit woord staat niet in het woordenboek.',
    moreMeanings: (n: number): string => `+${n} ${n === 1 ? 'betekenis' : 'betekenissen'} meer`,

    // Andere regels in de video met het woord
    elsewhereCount: (n: number): string => (n === 1 ? 'Nog één keer in deze video' : `Nog ${n} keer in deze video`),
    playLine: 'Afspelen',
    elsewhereMore: (n: number): string => `en nog ${n} – de zoekfunctie van het transcript vindt ze allemaal`,
    showAllInTranscript: 'Alle tonen in transcript',

    // Toevoegen aan Anki
    addToAnki: 'Toevoegen aan Anki',
    addToDeck: (deck: string): string => `Toevoegen aan ${deck}`,
    adding: 'Toevoegen…',
    undoing: 'Ongedaan maken…',
    added: 'Toegevoegd',
    inAnki: 'In Anki',
    showInAnki: 'Tonen in Anki',
    waiting: 'Wacht',
    waitingForAnki: 'Wacht op Anki',
    goesInWhenAnkiOpens: 'Gaat naar Anki zodra Anki opent',
    alreadyAdded: 'Al toegevoegd',
    alreadyInAnki: 'Staat al in Anki',
    waitingForAnkiToOpen: 'Wacht tot Anki opent',
    addedWithWarning: (said: string, warning: string): string => `${said} – ${warning}`,

    // Het setmenu
    otherDecks: 'Andere sets',
    addToAnotherDeck: 'Toevoegen aan een andere set',
    decksUnknown: 'Anki antwoordt niet, dus de sets zijn nog niet bekend.',
    newDeck: 'Nieuwe set…',
    newDeckPrompt: 'Nieuwe set – gebruik :: voor een subset, zoals in Japans::Netflix',

    // De markeringen
    knownButton: 'Bekend',
    trackButton: 'Volgen',
    ignoreButton: 'Negeren',
    markKnownTip: 'Markeren als bekend',
    trackTip: 'Volgen',
    ignoreTip: 'Negeren',
    unmarkKnownTip: 'Markering verwijderen',
    stopTrackingTip: 'Niet meer volgen',
    stopIgnoringTip: 'Niet meer negeren',
  },

  header: {
    knownStat: '{percent} bekend',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Woorden die je kent',
    readyStat: '{count} klaar om te leren',
    readyTip: 'Regels met één nieuw woord',
    blurSubtitle: 'Ondertitel vervagen',
    unblurSubtitle: 'Ondertitel scherp maken',
    showTranslation: 'Vertaling tonen',
    hideTranslation: 'Vertaling verbergen',
    transcript: 'Transcript',
    pinHeader: 'Bovenbalk vastzetten',
    unpinHeader: 'Bovenbalk losmaken',
    settings: 'Instellingen',
    showHeader: 'Bovenbalk tonen',
    showHeaderLabel: 'De bovenbalk tonen',
  },

  player: {
    // De toetsen van de speler
    lastLine: 'Dat was de laatste regel',
    noLineBefore: 'Er is geen eerdere regel',
    translationOn: 'Vertaling aan',
    translationOff: 'Vertaling uit',
    blurOn: 'Ondertitel vaag tot je hem aanwijst',
    blurOff: 'Ondertitel zichtbaar',
    lineSaved: 'Regel opgeslagen',
    lineUnsaved: 'Regel niet meer opgeslagen',
    lookUpFirst: 'Zoek eerst een woord op',
    alreadyKnown: (word: string): string => `${word} · al bekend in Anki`,
    alreadyInAnki: (word: string): string => `${word} · staat al in Anki`,
    adding: (word: string): string => `${word} toevoegen…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Markeringen
    markOff: (word: string): string => `${word} · markering verwijderd`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'gemarkeerd als bekend', tracking: 'gevolgd', ignored: 'genegeerd', unknown: 'gemarkeerd als nieuw',
      }[status];
      if (refused) return `${word} · ${done}, geen kaart – Anki weigerde het; later wordt het opnieuw geprobeerd`;
      return `${word} · ${done}, geen kaart${status === 'tracking' ? '. Zie het tabblad “Woorden” in het paneel' : ''}`;
    },

    // De kaart van een woord
    pickDeck: 'Kies eerst een set in de instellingen van Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `toegevoegd aan ${deck} – zonder ${without(missing)}` : `toegevoegd aan ${deck}`,
    alreadyIn: (deck: string): string => `staat al in ${deck}`,
    queued: (deck: string): string => `Anki is gesloten – de kaart gaat naar ${deck} zodra het opent`,
    alreadyQueued: 'wacht al op Anki',
    notKept: 'Anki is gesloten en de browser kon de kaart niet bewaren voor later',
    takenBack: (deck: string): string => `weer uit ${deck} gehaald`,
    unqueued: 'wacht niet meer op Anki',
    alreadySent: 'De kaart staat al in Anki',
    queueSent: (count: number): string =>
      `Anki is open – ${count === 1 ? 'de bewaarde kaart is toegevoegd' : `${count} bewaarde kaarten zijn toegevoegd`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `woorden die je kent worden uit ${scope} gelezen, dus kaarten in ${deck} tellen niet mee`,

    // De kaart van een zin
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `zin toegevoegd aan ${deck} – zonder ${without(missing)}` : `zin toegevoegd aan ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `de zin staat al in ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'geluid', picture && 'beeld'].filter(Boolean);
      return `Anki is gesloten – de zin gaat naar ${deck} zodra het opent` +
        `${lacking.length ? `, zonder ${lacking.join(' en ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'de zin wacht al op Anki',
    sentenceTakenBack: (deck: string): string => `zin weer uit ${deck} gehaald`,

    // Zinsaudio
    recording: 'Regel opnemen…',

    // Opzoeken
    noDictionary: 'Nog geen woordenboek voor deze taal.',
  },

  notices: {
    // De melding
    unexpected: 'Libregaku liep tegen een onverwacht probleem aan.',
    dismiss: 'Sluiten',

    // YouTube of Netflix heeft iets veranderd
    youtubeTrackList: 'Kon de ondertitellijst van YouTube niet lezen.',
    youtubeTrackShape: 'De ondertitelgegevens van YouTube hebben niet de verwachte vorm.',
    youtubeCaptionText: 'Kon de ondertiteltekst van YouTube niet vinden op de pagina.',
    youtubePlayerTrackList: 'Kon de ondertitellijst van deze video niet uit de speler van YouTube lezen.',
    netflixTrackList: 'Kon de ondertitellijst van Netflix niet lezen.',
    netflixCaptionText: 'Kon de ondertiteltekst van Netflix niet vinden op de pagina.',
    netflixBlocked: 'Netflix heeft het deel van Libregaku geblokkeerd dat ondertitels leest.',

    // De ondertitels van deze video
    subtitlesOff: 'Zet ondertitels aan in de speler, dan pikt Libregaku ze op.',
    noTargetTrack: 'Hier zijn geen ondertitels in de taal die je leert.',
    noSecondTrack: 'Hier zijn geen ondertitels in jouw taal, dus er is geen tweede regel.',
    onlyOneTrack: 'Deze video heeft maar één ondertitelspoor, dus er is geen tweede regel.',
    autoGenerated: 'Deze ondertitels zijn automatisch gegenereerd, dus de tekst en de woordgrenzen zijn onnauwkeurig.',
    noSubtitles: 'Deze video heeft geen ondertitels.',
    secondTrackFailed: 'De tweede regel kon niet worden geladen.',

    // Onderdelen van de extensie
    analyserUnavailable:
      'Lezingen en woordenboekvormen staan uit: de taalanalysator is niet geladen. ' +
      'Woorden komen alleen met je kaarten overeen als ze precies hetzelfde gespeld zijn.',
    markNotSaved: 'Kon die markering niet opslaan. Ze geldt tot je de pagina herlaadt; daarna is ze weg.',
    marksNotSynced: 'Kon je markeringen niet in Anki opslaan. Ze blijven in deze browser en worden opnieuw geprobeerd.',
    cardsNotAdded:
      'Anki nam sommige kaarten niet aan die bewaard werden terwijl het gesloten was. ' +
      'Ze blijven bewaard en worden opnieuw geprobeerd.',

    // Details
    playerNeverLoaded: 'De speler is nooit helemaal geladen.',
    subtitlesMaybeOff: 'Misschien staan de ondertitels gewoon uit in de speler.',
    lookedFor: (selector: string): string => `Gezocht naar ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Deze video heeft: ${languages.join(', ') || 'geen'}. ` +
      'Wijzig in de instellingen wat je leert, of kies een andere video.',
    noHumanTrack: 'Er was voor deze video geen spoor dat door mensen is geschreven.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Deze video heeft: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'de analysator is niet geladen',
  },

  anki: {
    // AnkiConnect bereiken
    offline: (port: number): string => `Er luistert niets op poort ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Niets antwoordde binnen ${seconds} s op poort ${port}. ` +
      'Anki is misschien bezig (aan het synchroniseren, of er staat een dialoogvenster open), ' +
      'of een ander programma houdt de poort bezet.',
    blocked: (origin: string): string =>
      `AnkiConnect heeft ${origin} geweigerd. In Anki: Hulpmiddelen → Add-ons → AnkiConnect → Configuratie, ` +
      'en voeg die regel toe aan webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Iets op poort ${port} antwoordde met HTTP ${status}. AnkiConnect doet dat niet.`,
    notAnkiConnect: (port: number): string => `Iets anders dan AnkiConnect gebruikt poort ${port}.`,
    noBackground: 'Het achtergrondproces van de extensie reageert niet.',
    unreachable: 'Anki is niet bereikbaar.',
    callFailed: 'Aanroep van AnkiConnect mislukt.',

    // Wat Libregaku niet naar Anki stuurt
    notRelayed: (action: string): string => `Libregaku stuurt “${action}” niet naar AnkiConnect.`,
    mediaNotFetched: (media: Media): string => MEDIA_NOT_FETCHED[media],
    mediaEmpty: (media: Media): string => MEDIA_EMPTY[media],
    mediaName: (prefix: string): string => `Bestanden die Libregaku toevoegt heten ${prefix}…, dit bestand niet.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} heeft een lijst met ${ids === 'notes' ? 'aantekeningen' : 'kaarten'} nodig.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Geweigerd: ${count} van de verzonden ${ids === 'notes' ? 'aantekeningen' : 'kaarten'} ` +
      `${count === 1 ? 'hoort' : 'horen'} bij geen enkele markering van Libregaku. ` +
      (change === 'delete'
        ? 'Libregaku verwijdert alleen zijn eigen markeringen, en een kaart die het in de laatste paar minuten ' +
          'heeft gemaakt en die nog niet is bestudeerd.'
        : change === 'suspend'
          ? 'Libregaku schort alleen zijn eigen markeringen op.'
          : 'Libregaku wijzigt alleen de tags van zijn eigen markeringen.'),

    // De aantekeningstypes van Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Je aantekeningstype “${noteType}” in Anki mist ${fields.length === 1 ? 'het veld' : 'de velden'} ` +
      `${fields.join(', ')}, dus ${loses === 'cards' ? 'kaarten' : 'aantekeningen'} zouden ` +
      `${fields.length === 1 ? 'het' : 'ze'} kwijtraken. ` +
      'Libregaku wijzigt geen aantekeningstype dat je misschien hebt bewerkt: ' +
      `hernoem “${noteType}” in Anki via Hulpmiddelen → Aantekeningstype beheren (of voeg de velden weer toe) ` +
      'en klik dan op “Opnieuw controleren”, dan wordt er een nieuw geïnstalleerd.',

    // Markeringen en wachtende kaarten
    marksNotAdded: (count: number): string =>
      `Anki heeft ${count} van de markeringen niet toegevoegd. Ze blijven in de wachtrij en worden de volgende keer ` +
      'opnieuw geprobeerd.',
    marksNotStored: (cause: string): string => `De browseropslag weigerde de markeringen die uit Anki zijn gelezen: ${cause}`,
    storageUnreadable: (cause: string): string => `De browseropslag kon niet worden gelezen: ${cause}`,
  },

  errors: {
    // Het geluid van een tabblad opnemen
    captureNotAllowed: 'Sta zinsaudio op deze site eerst toe in de instellingen van Libregaku.',
    captureRefused: 'Chrome wilde dit tabblad niet opnemen',

    // Een ondertitelspoor dat niet laadde
    unknownTrack: (id: string): string => `onbekend spoor ${id}`,
    noCaptionFormat: (attempts: readonly string[]): string =>
      `geen enkel ondertitelformaat werkte – ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `geen enkele ondertitel-URL werkte – ${attempts.join('; ') || 'geen vermeld'}`,
    emptyAnswer: 'leeg',
    noCues: '0 regels',
    noCuesParsed: 'leverde 0 regels op',
    noAnswerWithin: (seconds: number): string => `geen antwoord binnen ${seconds} s`,

    // De naam van een spoor
    forcedTrack: (track: string): string => `${track} (geforceerd)`,

    // Het woordenboek en de analysator
    noAnswer: 'geen antwoord van de extensie – laad de pagina opnieuw om haar te herstarten',
    analyserLoading: 'de analysator wordt nog geladen',
    dictionaryLoading: 'het woordenboek wordt nog geladen',
    lookupFailed: 'opzoeken mislukt',
  },

  grammar: {
    // Tijd en beleefdheid
    past: 'verleden tijd',
    polite: 'beleefd',

    // Ontkenning
    negative: 'ontkenning',
    'negative intent': 'ontkennende wilsvorm',
    without: 'zonder te',

    // Voorwaarde
    conditional: 'voorwaardelijk',
    whenever: 'telkens als',

    // Wie het doet, en of het kan
    passive: 'passief',
    'passive or potential': 'passief of potentieel',
    potential: 'potentieel',
    causative: 'causatief',

    // Willen
    'want to': 'willen',
    'seems to want to': 'lijkt te willen',
    'want someone to': 'willen dat iemand',

    // Schijn en vermoeden
    seems: 'lijkt',
    'seems like': 'lijkt erop',
    hearsay: 'van horen zeggen',
    apparently: 'blijkbaar',
    probably: 'waarschijnlijk',
    might: 'misschien',

    // Wat zou moeten gebeuren
    'ought to': 'zou moeten',
    'supposed to': 'hoort te',
    'intends to': 'van plan',

    // Moeten en mogen
    must: 'moeten',
    'must not': 'niet mogen',
    "don't have to": 'niet hoeven',
    may: 'mogen',

    // Bevelen en verzoeken
    imperative: 'gebiedende wijs',
    volitional: 'wilsvorm',
    'polite command': 'beleefd bevel',
    please: 'verzoek',

    // Verbinden met wat volgt
    'te-form': 'te-vorm',
    listing: 'opsomming',
    while: 'terwijl',
    because: 'omdat',
    'even though': 'hoewel',
    'in order to': 'om te',
    'so that': 'zodat',

    // Hulpwerkwoorden na de te-vorm
    ongoing: 'voortdurend',
    'resulting state': 'resulterende toestand',
    'completely, or regrettably': 'helemaal, of helaas',
    'in advance': 'van tevoren',
    'try doing': 'proberen',
    'going forward': 'voortgaand',
    'coming to be': 'geleidelijk worden',
    'receive the favour': 'gunst ontvangen',
    'someone does for me': 'doet het voor mij',
    'do for someone': 'voor iemand doen',

    // Hulpwerkwoorden na de stam
    'too much': 'te veel',
    'easy to': 'makkelijk te',
    'hard to': 'moeilijk te',
    'start to': 'beginnen te',
    'keep on': 'blijven',
    finish: 'afmaken',
    again: 'opnieuw',
    'each other': 'elkaar',
    completely: 'volledig',
    thoroughly: 'grondig',
    around: 'rond',
    'non-stop': 'aan één stuk',

    // Vormen van een Spaans woord
    or: 'of',
    'first-person': 'eerste persoon',
    'second-person': 'tweede persoon',
    'third-person': 'derde persoon',
    singular: 'enkelvoud',
    plural: 'meervoud',
    masculine: 'mannelijk',
    feminine: 'vrouwelijk',
    present: 'presens',
    preterite: 'preteritum',
    imperfect: 'imperfectum',
    'imperfect-se': 'imperfectum (-se)',
    future: 'futurum',
    'conditional-mood': 'conditionalis',
    indicative: 'indicatief',
    subjunctive: 'subjunctief',
    infinitive: 'infinitief',
    gerund: 'gerundium',
    participle: 'deelwoord',
    formal: 'formeel',
    informal: 'informeel',
    'with-tú': 'met tú',
    'with-vos': 'met vos',
    'vos-form': 'vos-vorm',
    voseo: 'voseo',
    'second-person-semantically': 'in de zin van “u”',
    accusative: 'met lijdend voorwerp',
    dative: 'met meewerkend voorwerp',
    'object-first-person': 'voorwerp eerste persoon',
    'object-second-person': 'voorwerp tweede persoon',
    'object-third-person': 'voorwerp derde persoon',
    'object-singular': 'enkelvoudig voorwerp',
    'object-plural': 'meervoudig voorwerp',
    diminutive: 'verkleinwoord',
    augmentative: 'augmentatief',
    superlative: 'overtreffende trap',
    alternative: 'variant',
    'alt-of': 'andere spelling',

    // Koreaanse uitgangen
    honorific: 'honorifiek',
    'future or guess': 'toekomst of vermoeden',
    'formal polite': 'formeel beleefd',
    question: 'vraag',
    but: 'maar',
    "let's": 'laten we',
    plain: 'eenvoudig',
    'shall we, or I wonder': 'zullen we, of ik vraag me af',
    'I will': 'belofte',
    'just noticed': 'net gemerkt',
    'as you know': 'zoals je weet',
    and: 'en',
    'because, or and then': 'omdat, of en dan',
    'but, or given that': 'maar, of aangezien',
    'even if': 'zelfs als',
    whether: 'indirecte vraag',
    'adverb form': 'bijwoordelijke vorm',
    quoting: 'indirecte rede',
    'used to': 'vroeger',
    topic: 'thema',
    subject: 'onderwerp',
    object: 'lijdend voorwerp',
    possessive: 'bezittelijk',
    'come to': 'ertoe komen',
    when: 'wanneer',
    modifier: 'bijvoeglijke vorm',
    'noun form': 'nominalisering',
    becomes: 'worden',
    'have done before': 'al eens gedaan',
  },
};
