import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** "1 kort", "2 kort": the same word for one and many. */
const cards = (n: number): string => `${n} kort`;

/** "1 ord", "2 ord". */
const words = (n: number): string => `${n} ord`;

const PLURAL = new Intl.PluralRules('sv');

/** Whether a count takes the singular, for the words around it that change: "1 kort skapat", "2 kort skapade". */
const one = (n: number): boolean => PLURAL.select(n) === 'one';

/** A share, as Swedish writes it: a no-break space before the %. */
const percent = (n: number): string => `${n}\u00A0%`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'av', unknown: 'nya ord', always: 'alla' };

/** What a card went in without, joined with "eller": "utan meningsljud". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'meningsljud (klicka på Libregaku-ikonen för att spela in här)'
      : 'meningsljud'))
    .join(' eller ');

const MEDIA_WHAT = { audio: 'ljud', video: 'video', picture: 'bilder' } as const;
const MEDIA_THE = { audio: 'Ljudet', video: 'Videon', picture: 'Bilden' } as const;

/** The interface in Swedish. Anything left out shows in English. */
export const sv: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    mandarin: 'Kinesiska (mandarin)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Språk
    languagesHeading: 'Språk',
    languagesAbout: 'Välj språket du lär dig och ditt eget språk.',
    target: 'Jag lär mig',
    targetLimited: (language: string): string => `${language} – begränsat stöd`,
    supportFull: 'Fullt stöd, med läsningar och furigana.',
    supportPinyin: 'Fullt stöd, med pinyin. Definitionerna är på engelska.',
    supportJyutping: 'Fullt stöd, med Jyutping. Definitionerna är på engelska.',
    supportWords: 'Fullt stöd. Definitionerna är på engelska.',
    script: 'Skrivtecken',
    scriptHint: 'Används när en video har båda.',
    supportBasic: 'Grundläggande stöd: orden delas upp, men det finns ännu ingen ordbok och inga läsningar.',
    native: 'Ditt språk',
    nativeHint: 'Översättningar och definitioner visas på det här språket, när videon och ordboken har det.',
    definitions: 'Definitioner på',
    definitionsHint: 'Ordboken har inga definitioner på ditt språk, så de visas på det här.',
    definitionsHintFor: (language: string): string =>
      `Ordboken har inga definitioner på ${language}, så de visas på det här språket.`,

    // Slå upp ord
    lookupHeading: 'Slå upp ord',
    lookupAbout: 'Välj hur och när uppslag visas.',
    interaction: 'Slå upp ord vid',
    interactionHover: 'Hovring',
    interactionShift: 'Hovring + Shift',
    interactionClick: 'Klick',
    interactionHint: 'Det går alltid att klicka på ett ord också.',
    hoverPause: 'Pausa vid uppslag',
    hoverPauseHint: 'Pausar videon medan pekaren är på ett ord.',
    sidebarHover: 'Snabbdefinitioner i transkriptionen',
    sidebarHoverHint: 'Visar en kort definition när du pekar på ett ord i transkriptionen.',

    // Ordruta
    popupHeading: 'Ordruta',
    popupAbout: 'Välj vad ordrutan visar när du slår upp ett ord.',
    cardDeckMenu: 'Kortleksmeny',
    cardDeckMenuHint: 'Lägger till en ▾ bredvid Lägg till i Anki för att välja en annan kortlek. Nya kort hamnar sedan där.',
    cardHideAdd: 'Dölj Lägg till i Anki',
    cardHideAddHint: 'Tar bort knappen Lägg till i Anki och kortleksmenyn bredvid den från kortet.',
    cardKanji: 'Kanji i ordet',
    cardKanjiHint: 'Visar betydelser och läsningar för varje kanji.',
    cardHanzi: 'Tecken i ordet',
    cardHanziHint: 'Visar betydelser och läsningar för varje tecken.',
    lookupElsewhere: 'Exempel från den här videon',
    lookupElsewhereHint: 'Visar andra meningar i videon som använder ordet. Klicka på en för att spela upp den.',

    // Undertexter
    subtitlesHeading: 'Undertexter',
    subtitlesAbout: 'Ändra hur undertexterna ser ut på videon.',
    ruby: 'Furigana',
    rubyUnknown: 'Nya ord',
    rubyAlways: 'Alla',
    rubyNever: 'Av',
    rubyHint: 'Läsningar ovanför kanji. Tryck på R för att växla medan du tittar.',
    pinyin: 'Pinyin',
    pinyinHint: 'Läsningar ovanför tecknen. Tryck på R för att växla medan du tittar.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Läsningar ovanför tecknen. Tryck på R för att växla medan du tittar.',
    blurPrimary: 'Gör undertexter suddiga',
    blurPrimaryHint: 'För hörförståelse: undertexterna är suddiga tills du pekar på dem. Tryck på H för att växla.',
    showSubtitles: 'Undertexter på videon',
    showSubtitlesHint: 'Ritar undertexterna över videon. Av behålls raden överst, transkriptionen och panelen. Knappen i raden växlar: översättning av, undertexter av, sedan båda på; ↑ gör detsamma.',
    subtitleSize: 'Textstorlek',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Skalas med spelaren, så den ser likadan ut i helskärm.',
    subtitleBottom: 'Position',
    subtitleBottomLowest: 'Lägst',
    subtitleBottomLow: 'Låg',
    subtitleBottomNormal: 'Normal',
    subtitleBottomRaised: 'Lite högre',
    subtitleBottomHigh: 'Hög',
    subtitleBottomHighest: 'Högst',
    subtitleBottomHint: 'Hur högt undertexterna sitter. Ett annat undertextstillägg i samma spelare hamnar under dem.',
    dualSubtitles: 'Visa översättning',
    dualSubtitlesHint:
      'Visar undertexter på ditt språk under dem du lär dig. De kommer från webbplatsen, inte från ' +
      'maskinöversättning, och kräver en fullständig transkription av videon.',
    singleKeys: 'Kortkommandon med en tangent',
    singleKeysHint:
      'Bokstavstangenter som A och R fungerar på egen hand medan du tittar. Av: håll ned Alt och Shift tillsammans med dem. ' +
      'Piltangenterna fungerar i båda fallen.',

    // Understrykningar
    underlinesHeading: 'Understrykningar',
    underlinesAbout: 'Varje färg visar hur väl du kan ett ord. Klicka på en för att ändra den.',
    colorUnknown: 'Nya ord',
    colorUnknownHint: 'Ord utan kort i Anki.',
    colorLearning: 'Under inlärning',
    colorLearningHint: 'Ord med ett kort som ännu inte är moget.',
    colorTracking: 'Följda',
    colorTrackingHint: 'Ord som du följer.',
    colorKnown: 'Kända',
    colorKnownHint: 'Ord med ett moget kort, eller markerade som kända.',
    underlines: 'Stryk under ord',
    underlinesHint: 'Stäng av för vanliga undertexter, utan färger under orden.',
    markKnown: 'Stryk under kända ord',
    markKnownHint: 'Av som standard, så att skärmen blir lugnare ju mer du lär dig.',
    underlineGrammar: 'Stryk under artiklar och pronomen',
    underlineGrammarHint: 'Av som standard: ord som ”the”, ”jag” och ”han” går fortfarande att slå upp, men räknas inte som ord att lära sig.',
    defaultColours: 'Standardfärger',
    resetColours: 'Återställ',

    // Transkription
    transcriptHeading: 'Transkription',
    transcriptAbout: 'Panelen bredvid videon som visar alla undertextrader.',
    sidebarFollow: 'Rulla med videon',
    sidebarFollowHint: 'Håller den aktuella raden synlig. Om du rullar själv pausas det; en knapp återupptar det.',
    headerBar: 'Visa toppfältet',
    headerBarHint: 'Visas längs videons överkant när pekaren är nära den.',
    languageBadge: 'Språkmärke',
    languageBadgeFlag: 'Flagga',
    languageBadgeCode: 'Kod',
    badgeFlag: 'Flagga i märket',
    badgeFlagDefault: 'Standard',
    flagSearch: 'Sök…',
    flagSearchLabel: 'Sök efter land',
    flagSuggested: 'Förslag',
    flagAll: 'Alla länder',
    flagNone: (query: string): string => `Inget land matchar ”${query}”.`,
    badgeFlagHint: 'Flaggan som visas för språket du lär dig. Varje språk behåller sin egen.',
    languageBadgeHint: 'Hur toppfältet visar språket du lär dig.',
    sidebarStats: 'Räkna nya ord',
    sidebarStatsHint: 'Visar antalet nya ord på varje rad, din andel kända ord och filtren som använder dem.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Anslut Anki, välj var nya kort hamnar och vilka kortlekar som avgör vilka ord du kan.',
    deck: 'Nya kort hamnar i',
    deckHint: 'Kortleken som varje nytt kort läggs till i.',
    statusScope: 'Läs kända ord från',
    statusScopeHint: 'Korten i de här kortlekarna avgör vilka ord som stryks under. Underkortlekar ingår.',
    marksInAnki: 'Spara markeringar i Anki',
    marksInAnkiHint:
      'Sparar Känt, Följ och Ignorera som dolda noter i Anki (Libregaku::Marks) så att de synkas till dina andra ' +
      'enheter. Av: de stannar i den här webbläsaren.',

    // Kortleksmenyerna
    wholeCollection: 'Hela samlingen',
    chooseDeck: 'Välj en kortlek…',
    deckNotInAnki: (deck: string): string => `${deck} – finns inte i Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (med underkortlekar)`,
    deckUnset: 'Välj en kortlek. Inga kort kan läggas till förrän du gör det.',
    deckMissing: (deck: string): string => `Anki har inte längre någon kortlek som heter ”${deck}”. Välj en annan.`,
    statusScopeMissing: (deck: string): string =>
      `Anki har inte längre någon kortlek som heter ”${deck}”, så alla ord visas som nya. Välj en annan.`,
    statusScopeOutside: (deck: string): string =>
      `Nya kort hamnar i ”${deck}”, som inte ingår här, så ord du lägger till förblir understrukna som nya. ` +
      'Välj en kortlek som innehåller den, eller Hela samlingen.',

    // Ankis status
    ankiChecking: 'Kontrollerar…',
    ankiConnected: 'Ansluten.',
    noteTypeInstalled: 'Nottypen har installerats.',
    cardsMade: (n: number): string => `${cards(n)} ${one(n) ? 'skapat' : 'skapade'} med Libregaku.`,
    noCards: 'Inga kort än.',
    cardsFlushed: (n: number): string => `La till ${cards(n)} som skapades medan Anki var stängt.`,
    cardsNotFlushed: (n: number, error: string): string => `${cards(n)} kunde inte läggas till: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} väntar på att läggas till.`,
    ankiOffline: (port: number): string =>
      `Anki svarar inte på port ${port}. Det är väntat när Anki är stängt: ` +
      'nya kort väntar här och läggs till när det öppnas.',
    ankiBlocked: 'Anki körs, men AnkiConnect tillåter inte det här tillägget än.',
    ankiOccupied: (detail: string): string => `${detail} Stäng programmet som använder porten så att Anki kan använda den.`,

    // Anki-knapparna
    checkAgain: 'Kontrollera igen',
    newDeck: 'Ny kortlek',
    openCards: 'Öppna kort i Anki',
    openMarks: 'Öppna markeringar i Anki',
    newDeckPrompt: 'Namnge den nya kortleken. Använd :: för en underkortlek, t.ex. Japanska::Netflix',

    // Ansluta Anki
    installStep: 'Installera Anki på den här datorn och öppna det. {link}',
    getAnki: 'Hämta Anki',
    addonStep: 'Gå till {menu} i Anki, klistra in den här koden och starta sedan om Anki.',
    addonMenu: 'Verktyg → Tillägg → Hämta tillägg',
    aboutAnkiConnect: 'Om AnkiConnect',
    originStep: 'Gå till {menu} i Anki, lägg till den här raden i {setting} och starta sedan om Anki.',
    originMenu: 'Verktyg → Tillägg → AnkiConnect → Konfiguration',
    runningStep: 'Ha Anki öppet medan du tittar. Korten hamnar direkt i Anki på den här datorn.',
    copy: 'Kopiera',
    copyValue: (value: string): string => `Kopiera ${value}`,
    copied: 'Kopierat',
    copyFailed: 'Markera manuellt',

    // Anki-kort
    ankiCardsHeading: 'Anki-kort',
    ankiCardsAbout: 'Välj vad som läggs till på varje nytt kort, förutom ordet, läsningen, betydelsen och meningen.',
    cardAudio: 'Ordljud',
    cardAudioHint: 'En inspelning av ordet, om det finns någon. Aldrig en syntetisk röst.',
    cardSentenceAudio: 'Meningsljud',
    cardSentenceAudioHint: 'Spelar in meningen genom att spela upp den en gång till. På skyddade webbplatser krävs behörigheten nedan.',
    cardScreenshot: 'Skärmbild',
    cardScreenshotHint: 'En stillbild från scenen. Finns inte på skyddade webbplatser, som blockerar det.',
    capture: 'Meningsljud på skyddade webbplatser',
    captureAllow: 'Tillåt',
    captureAllowInSettings: 'Tillåt i inställningarna',
    captureRemove: 'Ta bort',
    captureAllowed: 'Tillåtet. Klicka på Libregaku-ikonen på varje flik med en skyddad webbplats och välj Spela in meningsljud här.',
    captureNeeded: 'Skyddade webbplatser krypterar sin video, så meningsljud spelas in från fliken. Det kräver din tillåtelse.',

    // Data och licenser
    creditsHeading: 'Data och licenser',
    creditJmdict:
      'Ordboks- och kanjidata © Electronic Dictionary Research and Development Group, används under ' +
      'CC BY-SA 4.0. Ompaketerat som JSON av jmdict-simplified.',
    creditLindera:
      'Delar upp japanska, koreanska och kinesiska i ord. MIT-licens; IPADIC, UniDic, mecab-ko-dic och CC-CEDICT har ' +
      'egna villkor.',
    creditCedict: 'Kinesisk ordbok © MDBG och bidragsgivarna, används under CC BY-SA 4.0.',
    creditWiktionary: 'Ordböcker för de flesta språk, och några på ditt eget språk, från Wiktionary via kaikki.org och wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Koreanska ord förklarade på ditt eget språk. © National Institute of Korean Language, används under ' +
      'CC BY-SA 2.0 KR. Filer av Lyroxide.',
    creditCfdict: 'Kinesiska förklarad på franska. CFDICT © chine.in, hålls uppdaterad av CxDICT. CC BY-SA 4.0.',
    creditCanto: 'Kantonesisk ordbok och Jyutping-läsningar för CC-CEDICT. © Pleco Inc., används under CC BY-SA 3.0.',
    creditHandedict: 'Kinesiska förklarad på tyska. © HanDeDict och bidragsgivarna, används under CC BY-SA 3.0.',
    creditWikdict: 'Några ordböcker på ditt eget språk, gjorda av Karl Bartel från översättningarna i Wiktionary via DBnary. CC BY-SA 4.0.',
    creditUnihan: 'Vilken läsning av ett kinesiskt tecken som visas först. © Unicode, Inc., används under Unicode License.',
    creditTatoeba:
      'Vilket verb ett japanskt verb skrivet med kana är, inlärt från de här exempelmeningarna. © Tatoebas bidragsgivare, används under CC BY 2.0 FR.',
    creditJotoba: 'Används för uppslag medan ordboken laddas ned. Båda använder JMdict.',
    creditLucide: 'Ikoner. ISC-licens.',
    creditCommons: 'Inspelningar av ord, inlästa av frivilliga. Varje inspelning har sin egen licens, oftast CC BY-SA 4.0, som visas med talarens namn vid uppspelning och på kortet.',
    creditAudioCmn: 'Inspelningar av kinesiska ord av Yue Tan, universitetet i Caen. CC BY-SA 3.0 US.',
    creditNaver: 'Inspelningar av koreanska ord från Naver Dictionary, som bara spelas på sökkortet. De har ingen licens för återanvändning och läggs därför aldrig på ett kort.',
    creditSpanishdict: 'Genererad röst för spanska ord från SpanishDict, som spelas med uttalsknappen när det saknas en inspelning. Ingen licens för återanvändning, så den läggs aldrig på ett kort.',
    licence: 'Libregaku är MIT-licensierat. Ordboksdata laddas ned från källorna och ingår inte.',
    built: (when: string): string => `Den här kopian byggdes ${when}.`,

    // Kortkommandon
    keyLine: 'Föregående eller nästa rad',
    keyReplay: 'Spela upp raden igen',
    keyTranslation: 'Visa eller dölj översättningen',
    keyShiftLookup: 'Håll ned för att slå upp ordet under pekaren',
    keyAdd: 'Lägg till ordet från ordrutan i Anki',
    keyKnown: 'Markera ordet i ordrutan som känt',
    keyFurigana: 'Växla furigana: av, nya ord, alla',
    keyPinyin: 'Växla pinyin: av, nya ord, alla',
    keyJyutping: 'Växla Jyutping: av, nya ord, alla',
    keyBlur: 'Gör undertexter suddiga eller skarpa',
    keySave: 'Spara den aktuella raden',
    keyTranscript: 'Visa eller dölj transkriptionspanelen',
    keyClose: 'Stäng ordrutan',
  },

  options: {
    pageTitle: 'Inställningar för Libregaku',
    help: 'Hjälp',
    searchSettings: 'Sök…',
    noSettingsFound: 'Inga träffar för ”{q}”.',
    contentsLabel: 'Avsnitt i inställningarna',
    settingsLabel: 'Inställningar',
    setupHeading: 'Kom igång',
    setupAbout: 'Två val – allt annat har rimliga standardvärden.',
    stepLanguages: 'Välj vad du lär dig',
    stepAnki: 'Anslut Anki och välj en kortlek för nya kort',
    ankiOptional:
      'Anki är valfritt – undertexter, uppslag och furigana fungerar utan det. ' +
      'Det är Anki som minns vilka ord du redan kan.',
    nextSteps:
      'Öppna sedan en video med undertexter på språket du lär dig och håll pekaren över ett ord. ' +
      'Tangentbordsknappen i transkriptionspanelen visar kortkommandona.',
    stepDone: 'Klart',
    confirmLanguages: 'Språken stämmer',
    keepDeck: (deck: string): string => `Använd ${deck} för nya kort`,
  },

  action: {
    help: 'Hjälp',
    settings: 'Inställningar',
    settingsTip: 'Alla inställningar',
    checkingPage: 'Kontrollerar sidan…',
    notActive:
      'Inte aktivt på den här sidan. Öppna en video på YouTube, Netflix eller en annan webbplats som stöds. Om du nyss har installerat Libregaku ' +
      'eller läst in det igen, ladda om fliken.',
    unsupported: 'Libregaku fungerar på YouTube, Netflix, Disney+, Prime Video, HBO Max, Apple TV och Viki.',
    worksOn: (site: string): string => `Libregaku fungerar på ${site}.`,
    waitingForSubtitles: (site: string): string => `Väntar på undertexter på ${site}. Se till att de är på.`,
    activeOn: (title: string): string => `Aktivt – ${title}`,
    active: 'Aktivt på den här videon.',
    subtitlesTrack: 'Undertexter',
    translationTrack: 'Översättning',
    noTranslation: 'Ingen',
    generatedTrack: (track: string): string => `${track} (automatisk)`,
    captureNeedsPermission: 'För att spela in meningsljud här krävs behörighet att fånga ljudet från den här fliken.',
    captureAllowInSettings: 'Tillåt i inställningarna',
    captureReady: 'Ljudet från skyddade webbplatser kan bara spelas in när du har slagit på det för den här fliken.',
    captureStart: 'Spela in meningsljud här',
    captureFailed: 'Chrome kunde inte spela in den här fliken.',
    toggleSidebar: 'Växla sidofält',
    ankiChecking: 'Anki: kontrollerar…',
    ankiConnected: (n: number): string => `Anki anslutet · ${cards(n)} från Libregaku`,
    ankiOffline: 'Anki körs inte – orden visas som nya',
    ankiOccupied: (port: number): string => `Ett annat program använder port ${port}, så Anki kan inte nås`,
    ankiBlocked: 'Anki nekade det här tillägget – Inställningar har raden att lägga till',
    ankiBusy: 'Anki svarade inte – det kanske synkar',
    ankiRefused: 'Anki nekade begäran',
    cardsToAdd: (n: number): string => `${cards(n)} kvar att lägga till`,
    cardsWaiting: (n: number): string => `${cards(n)} väntar på Anki`,
  },

  sidebar: {
    panelLabel: 'Transkriptionspanel',
    resizeLabel: 'Ändra storlek på panelen',

    // Flikarna och knapparna bredvid dem
    tabsLabel: 'Listor',
    transcriptTab: 'Transkription',
    savedTab: 'Sparade',
    settings: 'Inställningar',
    shortcuts: 'Kortkommandon',
    close: 'Stäng',
    closeLabel: 'Stäng panelen',
    openTip: 'Transkription',
    openLabel: 'Visa transkriptionen',
    help: 'Hjälp',

    // Sök i transkriptionen
    searchPlaceholder: 'Sök i transkriptionen…',
    searchLabel: 'Sök i transkriptionen',
    noMatches: 'Inga träffar',
    matchAt: (at: number, total: number): string => `${at} av ${total}`,
    matchesFound: (n: number): string => `${n} ${one(n) ? 'träff' : 'träffar'}`,

    // Filtret
    filterTip: 'Filtrera',
    filterLabel: 'Filtrera rader',
    filterAll: 'Alla rader',
    filterAllAbout: 'Varje rad',
    filterNew: 'Har nya ord',
    filterNewAbout: 'Rader med ett ord som du inte har något kort för',
    filterReady: 'Redo för inlärning',
    filterReadyAbout: 'Rader där bara ett ord är nytt för dig – lättast att lära sig av',
    filterSaved: 'Sparade',
    filterSavedAbout: 'Rader du har sparat till senare',

    // Transkriptionen
    partial: 'Byggs upp medan du tittar – den här spelaren visar bara den aktuella raden.',
    partialEmpty: 'Inget än. Raderna dyker upp här när de sägs.',
    empty: 'Ingen transkription laddad.',
    currentLine: 'Aktuell rad',
    lineNew: (n: number): string => `${n} ${one(n) ? 'nytt' : 'nya'}`,
    playFrom: (time: string): string => `Spela upp från ${time}`,
    saveLine: 'Spara rad',
    unsave: 'Ta bort från sparade',
    addSentence: 'Lägg till mening',
    addSentenceLabel: 'Lägg till meningen i Anki',

    // Sammanfattningen ovanför transkriptionen: en etikett och ett tal, som passar alla antal
    knownPercent: (n: number): string => percent(n),
    summaryKnown: 'Kända: {n}',
    summaryNew: 'Nya: {n}',
    summaryReady: 'Redo för inlärning: {n}',
    counting: (n: number): string => `Räknar nya ord… ${percent(n)}`,
    countFailed: 'Vissa rader kunde inte räknas, så det finns inga summor.',

    // Snabbdefinitionen
    dictionaryLoading: (n: number): string => `Ordboken laddas – ${percent(n)}`,
    dictionaryUnavailable: 'Ordboken är inte tillgänglig',
    noEntry: 'Finns inte i ordboken.',

    // Sparade
    savedEmpty:
      'Inget sparat än. Använd bokmärket på en rad i transkriptionen – eller tryck på B – för att spara en mening ' +
      'du vill komma tillbaka till.',
    thisVideo: 'den här videon',
    openAt: (time: string): string => `Öppna videon vid ${time}`,
    remove: 'Ta bort',
    removeLabel: 'Ta bort från sparade',
    copySavedAbout: 'Kopiera alla sparade rader som tabbavgränsad text',
    exportSavedAbout: 'Spara en tabbavgränsad fil som Anki kan importera',
    addSavedAbout: 'Gör ett kort av varje sparad rad',
    linesCopied: (n: number): string => `${n} ${one(n) ? 'rad kopierad' : 'rader kopierade'}.`,
    chooseDeck: 'Välj först en kortlek i Inställningar – dit hamnar nya kort.',
    checkingAnki: 'Kontrollerar Anki…',
    ankiOffline: 'Anki körs inte. Öppna det och försök igen – Inställningar har stegen.',
    ankiBlocked: 'AnkiConnect har inte tillåtit det här tillägget än. Inställningar har raden att lägga till.',
    ankiUnreachable: 'Anki kunde inte nås. Inställningar visar varför.',
    adding: (at: number, total: number): string => `Lägger till ${at} av ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${cards(added)} ${one(added) ? 'tillagt' : 'tillagda'} i ${deck}` +
      `${already ? `, ${already} fanns redan där` : ''}.`,

    // Knappar och meddelanden för Sparade och Ord
    copy: 'Kopiera',
    exportFile: 'Exportera fil',
    addToAnki: 'Lägg till i Anki',
    noClipboard: 'Kunde inte komma åt urklipp.',
    downloaded: 'Sparad bland dina nedladdningar. I Anki: Arkiv → Importera.',
    downloadBlocked: 'Sidan blockerade nedladdningen – använd Kopiera i stället.',

    // Ord
    listsLabel: 'Vilken lista',
    listLines: 'Rader',
    listTracked: 'Följda',
    listKnown: 'Kända',
    listIgnored: 'Ignorerade',
    findPlaceholder: 'Sök…',
    findLabel: 'Sök i listan',
    copyWordsAbout: 'Kopiera listan som tabbavgränsad text',
    exportWordsAbout: 'Spara listan som en tabbavgränsad fil som Anki kan importera',
    wordsCopied: (n: number): string => `${words(n)} ${one(n) ? 'kopierat' : 'kopierade'}.`,
    nothingToExport: 'Det finns inget i listan att exportera.',
    lookingUp: 'Slår upp läsningar och betydelser…',
    noWordMatches: (query: string): string => `Inget ord i listan matchar ”${query}”.`,
    noLineMatches: (query: string): string => `Ingen sparad rad matchar ”${query}”.`,
    wordsMatching: (shown: number, total: number): string => `${shown} av ${words(total)}.`,
    trackedEmpty:
      'Inga följda ord än. Följ stryker under ett ord så att du lägger märke till det, utan att skapa ett kort. ' +
      'Slå på knappen i Inställningar, under Ordruta.',
    trackedIntro: (n: number): string =>
      `${words(n)} som du följer, ${one(n) ? 'understruket varhelst det dyker' : 'understrukna varhelst de dyker'} upp.`,
    stopTracking: 'Sluta följa',
    knownEmpty:
      'Inga ord markerade som kända. Markera ett ord som känt i dess ordruta, eller tryck på K, när du kan det ' +
      'och inte vill ha något kort.',
    knownIntro: (n: number): string =>
      `${words(n)} ${one(n) ? 'markerat som känt' : 'markerade som kända'}. ` +
      'Ta bort markeringen så går ordet tillbaka till vad dina Anki-kort säger.',
    unmarkKnown: 'Ta bort från kända',
    ignoredEmpty:
      'Inga ignorerade ord. Ignorera namn och ljud i deras ordruta, så stryks de aldrig under och räknas aldrig.',
    ignoredIntro: (n: number): string => `${words(n)} som aldrig stryks under eller räknas.`,
    stopIgnoring: 'Sluta ignorera',
  },

  popup: {
    // Rutan och ordet
    cardLabel: (word: string): string => `${word} – ordbok`,
    commonBadge: 'vanligt',
    nameBadge: 'troligen ett namn',
    characterNames: { kanji: 'Kanji', hanzi: 'Tecken' },
    partOfSpeech: {
      n: 'substantiv', 'n-adv': 'adverbiellt substantiv', 'n-t': 'tidssubstantiv', 'n-suf': 'substantivsuffix',
      'n-pref': 'substantivprefix', pn: 'pronomen', 'adj-i': 'i-adjektiv', 'adj-na': 'na-adjektiv',
      'adj-no': 'no-adjektiv', 'adj-pn': 'prenominalt adjektiv', adv: 'adverb', 'adv-to': 'adverb',
      aux: 'hjälpord', 'aux-v': 'hjälpverb', 'aux-adj': 'hjälpadjektiv',
      conj: 'konjunktion', cop: 'kopula', ctr: 'räknare', exp: 'uttryck', int: 'interjektion',
      num: 'räkneord', prt: 'partikel', pref: 'prefix', suf: 'suffix', unc: 'oklassificerat',
      vs: 'suru-verb', 'vs-i': 'suru-verb', 'vs-s': 'suru-verb', vt: 'transitivt', vi: 'intransitivt',
      v1: 'ichidan-verb', 'v1-s': 'ichidan-verb', vk: 'kuru-verb', vz: 'zuru-verb',
      v5b: 'godan-verb', v5g: 'godan-verb', v5k: 'godan-verb', 'v5k-s': 'godan-verb',
      v5m: 'godan-verb', v5n: 'godan-verb', v5r: 'godan-verb', 'v5r-i': 'godan-verb',
      v5s: 'godan-verb', v5t: 'godan-verb', v5u: 'godan-verb', 'v5u-s': 'godan-verb',
      v5aru: 'godan-verb',
      // Wiktionarys koder, för koreanska och spanska ord.
      name: 'egennamn', v: 'verb', adj: 'adjektiv', pron: 'pronomen', det: 'determinerare', artic: 'artikel',
      counter: 'räknare', prep: 'preposition', 'prep-phrase': 'prepositionsfras', ptcl: 'partikel',
      intj: 'interjektion', phrase: 'fras', prov: 'ordspråk', r: 'rot', char: 'tecken', adn: 'adnominal',
      ptcpl: 'particip', contr: 'sammandragning',
      masc: 'maskulinum', fem: 'femininum', neut: 'neutrum', sg: 'singular', pl: 'plural', 'pl-only': 'endast plural',
      count: 'räknebart', uncount: 'oräknebart', vr: 'reflexivt', vdt: 'ditransitivt', impers: 'opersonligt',
      irreg: 'oregelbundet', reltnl: 'relationellt', reltv: 'relativt', interr: 'frågande', poss: 'possessivt',
      dim: 'diminutiv', aug: 'augmentativ', onoma: 'ljudhärmande',
      idio: 'idiomatiskt', fig: 'bildligt', literal: 'bokstavligt', col: 'vardagligt', inf: 'informellt',
      fam: 'familjärt', formal: 'formellt', polite: 'artigt', lit: 'litterärt', poet: 'poetiskt', rhet: 'retoriskt',
      sl: 'slang', vulg: 'vulgärt', derog: 'nedsättande', offens: 'kränkande', humor: 'skämtsamt',
      euph: 'eufemistiskt', child: 'barnspråk', net: 'internet', neol: 'nyord', cmn: 'vanligt', uncmmn: 'ovanligt',
      rare: 'sällsynt', dated: 'ålderdomligt', arch: 'arkaiskt', obs: 'föråldrat', hist: 'historiskt',
      'non-std': 'icke-standard', dialect: 'dialektalt', regio: 'regionalt',
    },

    // Knapparna under ordet
    pronounce: 'Lyssna',
    playedRecording: (word: string): string => `${word} · inspelning`,
    playedSynthesised: (word: string): string => `${word} · syntetisk röst`,
    recordingBy: (speaker: string, licence: string): string => `Inspelning av ${speaker} · ${licence}`,
    pronounceFailed: 'kunde inte spela upp ljudet',
    addSentence: 'Lägg till mening',
    sentenceAdded: 'Mening tillagd',
    undo: 'Ångra',
    copyWord: 'Kopiera ord',
    copyPhrase: 'Kopiera fras',
    copySentence: 'Kopiera mening',
    wordCopied: 'ordet kopierat',
    phraseCopied: 'frasen kopierad',
    sentenceCopied: 'meningen kopierad',
    copyFailed: 'kunde inte kopiera – markera texten i stället',

    // Betydelserna
    dictionaryLoading: (n: number): string =>
      `Ordboken laddas fortfarande – ${percent(n)}. Försök igen om en stund.`,
    dictionaryUnavailable: (error: string): string => `Ordboken är inte tillgänglig: ${error}`,
    noEntry: 'Ordet finns inte i ordboken.',
    noEntryName: 'Ett namn, så det finns ingen ordboksartikel.',
    moreMeanings: (n: number): string => `+${n} ${one(n) ? 'betydelse' : 'betydelser'} till`,

    // Ordets andra rader i videon
    elsewhereCount: (n: number): string =>
      (n === 1 ? 'En gång till i den här videon' : `${n} gånger till i den här videon`),
    playLine: 'Spela upp',
    elsewhereMore: (n: number): string => `och ${n} till – sökningen i transkriptionen hittar alla`,
    showAllInTranscript: 'Visa alla i transkriptionen',

    // Lägg till i Anki
    addToAnki: 'Lägg till i Anki',
    addToDeck: (deck: string): string => `Lägg till i ${deck}`,
    adding: 'Lägger till…',
    undoing: 'Ångrar…',
    added: 'Tillagt',
    addedUndo: 'Tillagt – ångra',
    inAnki: 'I Anki',
    showInAnki: 'Visa i Anki',
    waiting: 'Väntar',
    waitingForAnki: 'Väntar på Anki',
    goesInWhenAnkiOpens: 'Det läggs till i Anki när Anki öppnas',
    alreadyAdded: 'Redan tillagt',
    alreadyInAnki: 'Redan i Anki',
    waitingForAnkiToOpen: 'Väntar på att Anki öppnas',
    addedWithWarning: (said: string, warning: string): string => `${said} – ${warning}`,

    // Kortleksmenyn
    otherDecks: 'Andra kortlekar',
    addToAnotherDeck: 'Lägg till i en annan kortlek',
    decksUnknown: 'Anki svarar inte, så dess kortlekar är inte kända än.',
    newDeck: 'Ny kortlek…',
    newDeckPrompt: 'Ny kortlek – använd :: för en underkortlek, som i Japanska::Netflix',

    // Markeringarna
    knownButton: 'Känt',
    trackButton: 'Följ',
    ignoreButton: 'Ignorera',
    markKnownTip: 'Markera som känt',
    trackTip: 'Följ',
    ignoreTip: 'Ignorera',
    unmarkKnownTip: 'Ta bort från kända',
    stopTrackingTip: 'Sluta följa',
    stopIgnoringTip: 'Sluta ignorera',
  },

  header: {
    knownStat: 'Kända: {percent}',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Ord du kan',
    readyStat: 'Redo för inlärning: {count}',
    readyTip: 'Rader med ett nytt ord',
    blurSubtitle: 'Gör undertexten suddig',
    unblurSubtitle: 'Gör undertexten skarp',
    showTranslation: 'Visa översättning',
    hideTranslation: 'Dölj översättning',
    hideSubtitles: 'Dölj undertexter',
    showSubtitles: 'Visa undertexter',
    subtitles: 'Undertexter',
    translation: 'Översättning',
    transcript: 'Transkription',
    pinHeader: 'Fäst toppfältet',
    unpinHeader: 'Lossa toppfältet',
    settings: 'Inställningar',
    showHeader: 'Visa toppfältet',
  },

  player: {
    // Spelarens tangenter
    lastLine: 'Det var sista raden',
    noLineBefore: 'Ingen rad före den här',
    translationOn: 'Översättning på',
    translationOff: 'Översättning av',
    subtitlesOff: 'Undertexter av',
    subtitlesOn: 'Undertexter på',
    blurOn: 'Undertexten är suddig tills du pekar på den',
    blurOff: 'Undertexten visas',
    lineSaved: 'Raden sparad',
    lineUnsaved: 'Raden är inte längre sparad',
    lookUpFirst: 'Slå upp ett ord först',
    alreadyKnown: (word: string): string => `${word} · redan känt i Anki`,
    alreadyInAnki: (word: string): string => `${word} · redan i Anki`,
    adding: (word: string): string => `Lägger till ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Markeringar
    markOff: (word: string): string => `${word} · markeringen borttagen`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'markerat som känt', tracking: 'följt', ignored: 'ignorerat', unknown: 'markerat som nytt',
      }[status];
      if (refused) return `${word} · ${done}, inget kort – Anki nekade; försöker igen senare`;
      return `${word} · ${done}, inget kort${status === 'tracking' ? '. Se fliken Sparade i panelen' : ''}`;
    },

    // Ett ords kort
    pickDeck: 'Välj först en kortlek i inställningarna för Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `tillagt i ${deck} – utan ${without(missing)}` : `tillagt i ${deck}`,
    alreadyIn: (deck: string): string => `finns redan i ${deck}`,
    queued: (deck: string): string => `Anki är stängt – kortet hamnar i ${deck} när Anki öppnas`,
    alreadyQueued: 'väntar redan på Anki',
    notKept: 'Anki är stängt, och webbläsaren kunde inte spara kortet till senare',
    takenBack: (deck: string): string => `borttaget ur ${deck}`,
    unqueued: 'väntar inte längre på Anki',
    alreadySent: 'Det har redan lagts till i Anki',
    queueSent: (count: number): string =>
      `Anki är öppet – ${count === 1 ? 'kortet som väntade har' : `${count} kort som väntade har`} lagts till`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `kända ord läses från ${scope}, så kort i ${deck} räknas inte`,

    // Ett meningskort
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `mening tillagd i ${deck} – utan ${without(missing)}` : `mening tillagd i ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `meningen finns redan i ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'ljud', picture && 'bild'].filter(Boolean);
      return `Anki är stängt – meningen hamnar i ${deck} när Anki öppnas` +
        `${lacking.length ? `, utan ${lacking.join(' eller ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'meningen väntar redan på Anki',
    sentenceTakenBack: (deck: string): string => `meningen borttagen ur ${deck}`,

    // Meningsljud
    recording: 'Spelar in raden…',

    // Uppslag
    noDictionary: 'ingen ordbok för det här språket än.',
  },

  notices: {
    // Rutan
    unexpected: 'Libregaku stötte på ett oväntat problem.',
    dismiss: 'Stäng',

    // YouTube eller Netflix har ändrat något
    youtubeTrackList: 'Kunde inte läsa undertextlistan på YouTube.',
    youtubeTrackShape: 'Undertextdatan från YouTube har inte det väntade formatet.',
    youtubeCaptionText: 'Kunde inte hitta undertexterna på YouTube-sidan.',
    youtubePlayerTrackList: 'Kunde inte läsa videons undertextlista från YouTube-spelaren.',
    netflixTrackList: 'Kunde inte läsa undertextlistan på Netflix.',
    netflixCaptionText: 'Kunde inte hitta undertexterna på Netflix-sidan.',
    disneyTrackList: 'Kunde inte läsa undertextlistan på Disney+.',
    appleTrackList: 'Kunde inte läsa undertextlistan på Apple TV.',
    appleTiming: 'Kunde inte synkronisera undertexterna på Apple TV med videon.',
    disneyCaptionText: 'Kunde inte hitta undertexterna på Disney+-sidan.',
    primeTrackList: 'Kunde inte läsa undertextlistan på Prime Video.',
    primeCaptionText: 'Kunde inte hitta undertexterna på Prime Video-sidan.',
    maxTrackList: 'Kunde inte läsa undertextlistan på HBO Max.',
    maxCaptionText: 'Kunde inte hitta undertexterna på HBO Max-sidan.',
    vikiTrackList: 'Kunde inte läsa undertextlistan på Viki.',
    vikiCaptionText: 'Kunde inte hitta undertexterna på Viki-sidan.',
    netflixBlocked: 'Netflix blockerade den del av Libregaku som läser undertexter.',

    // Videons undertexter
    subtitlesOff: 'Slå på undertexter i spelaren så hämtar Libregaku dem.',
    trackNotSent: 'Spelaren har inte läst in de här undertexterna än.',
    noTargetTrack: 'Det finns inga undertexter här på språket du lär dig.',
    noSecondTrack: 'Det finns inga undertexter här på ditt språk, så det blir ingen andra rad.',
    onlyOneTrack: 'Videon har bara ett undertextspår, så det blir ingen andra rad.',
    autoGenerated: 'Undertexterna är automatiskt genererade, så ordval och orddelning blir ungefärliga.',
    noSubtitles: 'Videon har inga undertexter.',
    secondTrackFailed: 'Den andra raden kunde inte laddas.',

    // Tilläggets egna delar
    analyserUnavailable:
      'Läsningar och grundformer är avstängda: språkanalysen laddades inte. Ord matchas mot dina kort ' +
      'bara på exakt stavning.',
    markNotSaved: 'Kunde inte spara markeringen. Den gäller tills du laddar om sidan, sedan försvinner den.',
    marksNotSynced: 'Kunde inte spara dina markeringar i Anki. De finns kvar i den här webbläsaren och skickas igen.',
    cardsNotAdded:
      'Anki tog inte emot några av korten som sparades medan det var stängt. De finns kvar och skickas igen.',

    // Detaljer
    playerNeverLoaded: 'Spelaren laddades aldrig klart.',
    subtitlesMaybeOff: 'Undertexterna kanske bara är avstängda i spelaren.',
    lookedFor: (selector: string): string => `Letade efter ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Undertexter i videon: ${languages.join(', ') || 'inga'}. ` +
      'Byt språket du lär dig i inställningarna, eller välj en annan video.',
    onlyPictures: 'Videon har dem bara som bilder, inte som text, så Libregaku kan inte läsa dem.',
    chooseInPlayer: (track: string): string => `Välj ${track} i spelarens undertextmeny så hämtar Libregaku dem.`,
    noHumanTrack: 'Den här videon hade inget spår skrivet av en människa.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Undertexter i videon: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'språkanalysen laddades inte',
  },

  anki: {
    // Nå AnkiConnect
    offline: (port: number): string => `Inget lyssnar på port ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Inget svarade på port ${port} inom ${seconds} s. ` +
      'Anki kan vara upptaget (synkar eller visar en dialogruta), eller så håller ett annat program porten.',
    blocked: (origin: string): string =>
      `AnkiConnect nekade ${origin}. I Anki: Verktyg → Tillägg → AnkiConnect → Konfiguration, ` +
      'och lägg till den raden i webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Något på port ${port} svarade med HTTP ${status}. Det gör inte AnkiConnect.`,
    notAnkiConnect: (port: number): string => `Något annat än AnkiConnect använder port ${port}.`,
    noBackground: 'Tilläggets bakgrundsprocess svarar inte.',
    unreachable: 'Anki går inte att nå.',
    callFailed: 'Anropet till AnkiConnect misslyckades.',

    // Det Libregaku inte skickar
    notRelayed: (action: string): string => `Libregaku skickar inte ”${action}” till AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku bifogar bara ${MEDIA_WHAT[media]} som det själv har hämtat.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_THE[media]} för den här noten innehåller ingen data.`,
    mediaName: (prefix: string): string => `Filer som Libregaku lägger till heter ${prefix}…, men inte den här.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} behöver en lista med ${ids === 'notes' ? 'noter' : 'kort'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Nekat: ${count} av ${ids === 'notes' ? 'noterna' : 'korten'} som skickades hör inte till någon markering ` +
      `från Libregaku. Libregaku ${{
        delete: 'tar bara bort',
        suspend: 'låser bara',
        retag: 'ändrar bara etiketter på',
      }[change]} sina egna markeringar` +
      (change === 'delete' ? ', och ett kort som det skapat de senaste minuterna och som inte har repeterats.' : '.'),

    // Libregakus nottyper
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Din nottyp ”${noteType}” i Anki saknar ${fields.length === 1 ? 'fältet' : 'fälten'} ` +
      `${fields.join(', ')}, så ${loses === 'cards' ? 'korten' : 'noterna'} skulle förlora ` +
      `${fields.length === 1 ? 'det' : 'dem'}. Libregaku ändrar inte en nottyp som du kan ha redigerat: ` +
      `gå till Verktyg → Hantera nottyper i Anki, byt namn på ”${noteType}” (eller lägg tillbaka fälten) och ` +
      'klicka sedan på Kontrollera igen, så installeras en ny.',

    // Markeringar och väntande kort
    marksNotAdded: (count: number): string =>
      `Anki lade inte till ${count} av markeringarna. ${count === 1 ? 'Den står' : 'De står'} kvar i kön ` +
      'och skickas igen nästa gång.',
    marksNotStored: (cause: string): string => `Webbläsarens lagring nekade markeringarna som lästes från Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Webbläsarens lagring kunde inte läsas: ${cause}`,
  },

  errors: {
    // Spela in en fliks ljud
    captureNotAllowed: 'Tillåt först meningsljud på den här webbplatsen i inställningarna för Libregaku.',
    captureRefused: 'Chrome ville inte fånga den här fliken',

    // Ett undertextspår som inte laddades
    unknownTrack: (id: string): string => `okänt spår ${id}`,
    trackNotSent: 'inte inläst av spelaren än – välj det en gång i spelarens undertextmeny',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `inget undertextformat fungerade – ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `ingen undertext-URL fungerade – ${attempts.join('; ') || 'inga angivna'}`,
    emptyAnswer: 'tomt svar',
    noCues: '0 rader',
    noCuesParsed: 'tolkades till 0 rader',
    noAnswerWithin: (seconds: number): string => `inget svar inom ${seconds} s`,

    // Ett spårs namn
    forcedTrack: (track: string): string => `${track} (tvingande)`,

    // Ordboken och språkanalysen
    noAnswer: 'inget svar från tillägget – ladda om sidan för att starta om det',
    analyserLoading: 'språkanalysen laddas fortfarande',
    dictionaryLoading: 'ordboken laddas fortfarande',
    lookupFailed: 'uppslaget misslyckades',
  },

  grammar: {
    // Tempus och artighet
    past: 'dåtid',
    polite: 'artig',

    // Att inte göra det
    negative: 'nekande',
    'negative intent': 'nekande avsikt',
    without: 'utan att',

    // Om och när
    conditional: 'villkorsform',
    whenever: 'varje gång',

    // Vem som gör det, och om det går
    passive: 'passiv',
    'passive or potential': 'passiv eller potentialform',
    potential: 'potentialform',
    causative: 'kausativ',

    // Att vilja
    'want to': 'vilja',
    'seems to want to': 'verkar vilja',
    'want someone to': 'vilja att någon',

    // Hur talaren vet det, och hur säker hen är
    seems: 'verkar',
    'seems like': 'ser ut som',
    hearsay: 'sägs',
    apparently: 'tydligen',
    probably: 'troligen',
    might: 'kanske',

    // Vad som bör eller ska hända
    'ought to': 'borde',
    'supposed to': 'förväntas',
    'intends to': 'tänker',

    // Måsten och tillåtelse
    must: 'måste',
    'must not': 'får inte',
    "don't have to": 'behöver inte',
    may: 'får',

    // Uppmaningar, önskemål och ”låt oss”
    imperative: 'imperativ',
    volitional: 'volitionalform',
    'polite command': 'artig uppmaning',
    please: 'begäran',

    // Koppling till det som följer
    'te-form': 'te-form',
    listing: 'uppräkning',
    while: 'medan',
    because: 'eftersom',
    'even though': 'trots att',
    'in order to': 'för att',
    'so that': 'så att',

    // Hjälpverb efter te-formen
    ongoing: 'pågående',
    'resulting state': 'resultattillstånd',
    'completely, or regrettably': 'helt, eller tyvärr',
    'in advance': 'i förväg',
    'try doing': 'försöka',
    'going forward': 'framåt',
    'coming to be': 'börja bli',
    'receive the favour': 'få en tjänst',
    'someone does for me': 'någon gör åt mig',
    'do for someone': 'göra åt någon',

    // Hjälpverb efter verbstammen
    'too much': 'för mycket',
    'easy to': 'lätt att',
    'hard to': 'svårt att',
    'start to': 'börja',
    'keep on': 'fortsätta',
    finish: 'avsluta',
    again: 'på nytt',
    'each other': 'varandra',
    completely: 'helt och hållet',
    thoroughly: 'grundligt',
    around: 'omkring',
    'non-stop': 'oavbrutet',

    // Former av ett spanskt ord
    or: 'eller',
    'first-person': 'första person',
    'second-person': 'andra person',
    'third-person': 'tredje person',
    singular: 'singular',
    plural: 'plural',
    masculine: 'maskulinum',
    feminine: 'femininum',
    present: 'presens',
    preterite: 'preteritum',
    imperfect: 'imperfekt',
    'imperfect-se': 'imperfekt (-se)',
    future: 'futurum',
    'conditional-mood': 'konditionalis',
    indicative: 'indikativ',
    subjunctive: 'konjunktiv',
    infinitive: 'infinitiv',
    gerund: 'gerundium',
    participle: 'particip',
    formal: 'formell',
    informal: 'informell',
    'with-tú': 'med tú',
    'with-vos': 'med vos',
    'vos-form': 'vos-form',
    voseo: 'voseo',
    'second-person-semantically': 'i betydelsen ”du”',
    accusative: 'med direkt objekt',
    dative: 'med indirekt objekt',
    'object-first-person': 'objekt i första person',
    'object-second-person': 'objekt i andra person',
    'object-third-person': 'objekt i tredje person',
    'object-singular': 'objekt i singular',
    'object-plural': 'objekt i plural',
    diminutive: 'diminutiv',
    augmentative: 'augmentativ',
    superlative: 'superlativ',
    alternative: 'variant',
    'alt-of': 'annan stavning',

    // Koreanska ändelser
    honorific: 'hedersform',
    'future or guess': 'framtid eller antagande',
    'formal polite': 'formell artig',
    question: 'fråga',
    but: 'men',
    "let's": 'låt oss',
    plain: 'enkel form',
    'shall we, or I wonder': 'ska vi, eller jag undrar',
    'I will': 'jag ska',
    'just noticed': 'upptäckt',
    'as you know': 'som du vet',
    and: 'och',
    'because, or and then': 'eftersom, eller och sedan',
    'but, or given that': 'men, eller givet att',
    'even if': 'även om',
    whether: 'huruvida',
    'adverb form': 'adverbform',
    quoting: 'indirekt tal',
    'used to': 'brukade',
    topic: 'topik',
    subject: 'subjekt',
    object: 'objekt',
    possessive: 'possessiv',
    'come to': 'komma att',
    when: 'när',
    modifier: 'attributiv form',
    'noun form': 'substantivform',
    becomes: 'blir',
    'have done before': 'har gjort förut',
    nominative: 'nominativ',
    genitive: 'genitiv',
    'accusative-case': 'ackusativ',
    'dative-case': 'dativ',
    neuter: 'neutrum',
    definite: 'bestämd',
    indefinite: 'obestämd',
    comparative: 'komparativ',
    strong: 'stark',
    weak: 'svag',
    mixed: 'blandad',
    'without-article': 'utan artikel',
    reflexive: 'reflexiv',
    'non-past': 'icke-dåtid',
    dual: 'dualis',
    jussive: 'jussiv',
    construct: 'status constructus',
    'attached-and': 'och',
    'attached-so': 'så, då',
    'attached-with': 'med, i, genom',
    'attached-for': 'för, till',
    'attached-like': 'som, liksom',
    'attached-my': 'min',
    'attached-your': 'din, er',
    'attached-his': 'hans, dess',
    'attached-her': 'hennes, dess',
    'attached-its': 'hans, hennes, dess',
    'attached-our': 'vår',
    'attached-their': 'deras',
    'attached-me': 'mig',
    'attached-you': 'dig, er',
    'attached-him': 'honom, den',
    'attached-her-object': 'henne, den',
    'attached-us': 'oss',
    'attached-them': 'dem',
    locative: 'lokativ',
    ablative: 'ablativ',
    instrumental: 'instrumentalis',
    'that-is': 'den som är',
    assertive: 'som fakta',
    habitual: 'vanemässig',
    having: 'med, från',
  },
  helpChat: {
    heading: 'Ställ en fråga',
    placeholder: 'Fråga om en inställning eller hur något går till',
    label: 'Din fråga',
    send: 'Fråga',
    thinking: 'Tänker…',
    note: 'Besvarat på din enhet av Gemini Nano, utifrån den här hjälpen. Svaret kan vara fel.',
    noMatch: 'Hjälpen säger inget om det. Prova sökningen ovan.',
    failed: 'Gemini Nano kunde inte svara. Försök igen.',
    installHeading: 'Fråga hjälpen',
    install: 'Gemini Nano är en liten AI-modell som körs i Chrome, på din dator. Ladda ner den en gång så kan du ställa frågor här. Inget du skriver lämnar din enhet.',
    download: 'Ladda ner Gemini Nano',
    downloading: (percent: number): string => `Laddar ner… ${percent} %`,
    update: 'Chrome har en liten AI-modell inbyggd, Gemini Nano, som kan svara på frågor här. Uppdatera Chrome för att använda den.',
    unavailable: 'Chrome har en liten AI-modell, Gemini Nano, som kan svara på frågor här, men den är inte redo på den här datorn. Den behöver ledigt diskutrymme och kan behöva slås på på chrome://flags.',
    learnMore: 'Om Gemini Nano',
  },
};
