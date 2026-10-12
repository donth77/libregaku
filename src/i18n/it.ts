import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** Italian counts as English does, but by the rule Intl knows: "1 carta", "2 carte". */
const plural = new Intl.PluralRules('it');
const one = (n: number): boolean => plural.select(n) === 'one';

/** "1 parola", "2 parole". */
const words = (n: number): string => `${n} ${one(n) ? 'parola' : 'parole'}`;

/** "1 carta", "2 carte". */
const cards = (n: number): string => `${n} ${one(n) ? 'carta' : 'carte'}`;

/** A share, as Italian writes it: "85%". */
const percent = (n: number): string => `${n}%`;

/** "a", or "ad" before a name that starts with a: "ad Anime", "a Giapponese". */
const ad = (name: string): string => (/^[aàAÀ]/.test(name) ? 'ad' : 'a');

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'disattivato', unknown: 'parole nuove', always: 'tutte le parole' };

/** What a card went in without, joined with "né": "senza l’audio della frase". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'l’audio della frase (clicca sull’icona di Libregaku per registrare qui)'
      : 'l’audio della frase'))
    .join(' né ');

/** The media Libregaku will not attach, a sentence each. */
const MEDIA_NOT_FETCHED = {
  audio: 'Libregaku allega solo audio che ha recuperato da sé.',
  video: 'Libregaku allega solo video che ha recuperato da sé.',
  picture: 'Libregaku allega solo immagini che ha recuperato da sé.',
} as const;
const MEDIA_EMPTY = {
  audio: 'L’audio di questa nota non contiene dati.',
  video: 'Il video di questa nota non contiene dati.',
  picture: 'L’immagine di questa nota non contiene dati.',
} as const;

/** What Libregaku does only to its own marks, by the change it refused. */
const ONLY_MARKS = {
  delete: 'Libregaku elimina solo i propri contrassegni, e una carta che ha creato negli ultimi minuti ' +
    'e che non è stata studiata.',
  suspend: 'Libregaku sospende solo i propri contrassegni.',
  retag: 'Libregaku cambia le etichette solo dei propri contrassegni.',
} as const;

/** The interface in Italian. Anything left out shows in English. */
export const it: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    mandarin: 'Cinese (mandarino)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Lingue
    languagesHeading: 'Lingue',
    languagesAbout: 'Scegli la lingua che stai imparando e la tua lingua.',
    target: 'Sto imparando',
    targetLimited: (language: string): string => `${language} (limitato)`,
    supportFull: 'Supporto completo, incluse letture e furigana.',
    supportPinyin: 'Supporto completo, incluso il pinyin. Le definizioni sono in inglese.',
    supportJyutping: 'Supporto completo, incluso il Jyutping. Le definizioni sono in inglese.',
    supportWords: 'Supporto completo. Le definizioni sono in inglese.',
    script: 'Caratteri',
    scriptHint: 'Quelli usati quando un video li ha entrambi.',
    supportBasic: 'Supporto di base: le parole vengono separate, ma non ci sono ancora né dizionario né letture.',
    native: 'La tua lingua',
    nativeHint: 'Traduzioni e definizioni vengono mostrate in questa lingua, quando il video e il dizionario la includono.',
    definitions: 'Definizioni in',
    definitionsHint: 'Il dizionario non ha definizioni nella tua lingua, quindi vengono mostrate in questa.',
    definitionsHintFor: (language: string): string =>
      `Il dizionario non ha definizioni in ${language}, quindi vengono mostrate in questa lingua.`,

    // Ricerca delle parole
    lookupHeading: 'Ricerca delle parole',
    lookupAbout: 'Scegli come e quando compaiono le definizioni.',
    interaction: 'Cerca le parole con',
    interactionHover: 'Passaggio del mouse',
    interactionShift: 'Passaggio del mouse con Shift premuto',
    interactionClick: 'Clic',
    interactionHint: 'Anche il clic su una parola funziona sempre.',
    hoverPause: 'Pausa durante la ricerca',
    hoverPauseHint: 'Mette in pausa il video mentre il puntatore è su una parola.',
    sidebarHover: 'Definizioni rapide nella trascrizione',
    sidebarHoverHint: 'Mostra una breve definizione quando passi il mouse su una parola della trascrizione.',

    // Popup della parola
    popupHeading: 'Popup della parola',
    popupAbout: 'Scegli cosa mostra il popup quando cerchi una parola.',
    cardDeckMenu: 'Menu dei mazzi',
    cardDeckMenuHint:
      'Aggiunge un ▾ accanto al pulsante Aggiungi ad Anki per scegliere un altro mazzo. Le nuove carte poi andranno lì.',
    cardHideAdd: 'Nascondi Aggiungi ad Anki',
    cardHideAddHint: 'Toglie dalla scheda il pulsante Aggiungi ad Anki e il menu dei mazzi accanto.',
    cardKanji: 'Dettaglio dei kanji',
    cardKanjiHint: 'Mostra i significati e le letture di ogni kanji.',
    cardHanzi: 'Dettaglio dei caratteri',
    cardHanziHint: 'Mostra i significati e le letture di ogni carattere.',
    lookupElsewhere: 'Esempi da questo video',
    lookupElsewhereHint: 'Mostra altre frasi di questo video che usano la parola. Clicca su una per riprodurla.',

    // Sottotitoli
    subtitlesHeading: 'Sottotitoli',
    subtitlesAbout: 'Regola l’aspetto dei sottotitoli sul video.',
    ruby: 'Furigana',
    rubyUnknown: 'Parole nuove',
    rubyAlways: 'Tutte le parole',
    rubyNever: 'Disattivato',
    rubyHint: 'Letture sopra i kanji. Premi R per cambiare mentre guardi.',
    pinyin: 'Pinyin',
    pinyinHint: 'Letture sopra i caratteri. Premi R per cambiare mentre guardi.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Letture sopra i caratteri. Premi R per cambiare mentre guardi.',
    blurPrimary: 'Sfoca i sottotitoli',
    blurPrimaryHint:
      'Per esercitare l’ascolto: i sottotitoli restano sfocati finché non ci passi sopra con il mouse. ' +
      'Premi H per attivare o disattivare.',
    showSubtitles: 'Sottotitoli sul video',
    showSubtitlesHint: 'Disegna i sottotitoli sul video. Disattivati, restano la barra in alto, la trascrizione e il pannello. Il pulsante della barra scorre: traduzione nascosta, sottotitoli nascosti, poi entrambi; ↑ fa lo stesso.',
    subtitleSize: 'Dimensione del testo',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Si adatta al player, quindi appare uguale a schermo intero.',
    subtitleBottom: 'Posizione',
    subtitleBottomLowest: 'Molto bassa',
    subtitleBottomLow: 'Bassa',
    subtitleBottomNormal: 'Normale',
    subtitleBottomRaised: 'Rialzata',
    subtitleBottomHigh: 'Alta',
    subtitleBottomHighest: 'Molto alta',
    subtitleBottomHint:
      'A che altezza stanno i sottotitoli. Un’altra estensione per sottotitoli sullo stesso player resta sotto di loro.',
    dualSubtitles: 'Mostra traduzione',
    dualSubtitlesHint:
      'Mostra i sottotitoli nella tua lingua sotto quelli della lingua che stai imparando. Vengono dal sito, ' +
      'non da una traduzione automatica, e richiedono la trascrizione completa del video.',
    singleKeys: 'Scorciatoie a un tasto',
    singleKeysHint:
      'I tasti delle lettere come A e R funzionano da soli mentre guardi. Disattivato: tieni premuti Alt e Shift insieme a loro. ' +
      'I tasti freccia funzionano comunque.',

    // Sottolineature
    underlinesHeading: 'Sottolineature',
    underlinesAbout: 'Ogni colore indica quanto conosci una parola. Clicca su un colore per cambiarlo.',
    colorUnknown: 'Parole nuove',
    colorUnknownHint: 'Parole senza carta in Anki.',
    colorLearning: 'In apprendimento',
    colorLearningHint: 'Parole con una carta non ancora matura.',
    colorTracking: 'Seguite',
    colorTrackingHint: 'Parole che segui.',
    colorKnown: 'Conosciute',
    colorKnownHint: 'Parole con una carta matura, o segnate come conosciute.',
    underlines: 'Sottolinea le parole',
    underlinesHint: 'Disattiva per sottotitoli semplici, senza colori sotto le parole.',
    markKnown: 'Sottolinea le parole conosciute',
    markKnownHint: 'Disattivato di default, così lo schermo si alleggerisce man mano che impari.',
    underlineGrammar: 'Sottolinea articoli e pronomi',
    underlineGrammarHint: 'Disattivato per impostazione predefinita: parole come «il», «io» e «lui» si possono ancora cercare, ma non contano come parole da imparare.',
    defaultColours: 'Colori predefiniti',
    resetColours: 'Ripristina',

    // Trascrizione
    transcriptHeading: 'Trascrizione',
    transcriptAbout: 'Il pannello accanto al video che elenca tutte le righe dei sottotitoli.',
    sidebarFollow: 'Scorrimento automatico',
    sidebarFollowHint: 'Tiene in vista la riga corrente. Se scorri tu, si interrompe; un pulsante lo riattiva.',
    headerBar: 'Mostra l’intestazione',
    headerBarHint: 'Compare in cima al video quando il puntatore si avvicina.',
    languageBadge: 'Badge della lingua',
    languageBadgeFlag: 'Bandiera',
    languageBadgeCode: 'Codice',
    badgeFlag: 'Bandiera del badge',
    badgeFlagDefault: 'Predefinita',
    flagSearch: 'Cerca…',
    flagSearchLabel: 'Cerca un paese',
    flagSuggested: 'Suggeriti',
    flagAll: 'Tutti i paesi',
    flagNone: (query: string): string => `Nessun paese corrisponde a “${query}”.`,
    badgeFlagHint: 'La bandiera mostrata per la lingua che stai imparando. Ogni lingua tiene la sua.',
    languageBadgeHint: 'Come l’intestazione mostra la lingua che stai imparando.',
    sidebarStats: 'Conta le parole nuove',
    sidebarStatsHint:
      'Mostra quante parole nuove ha ogni riga, la tua percentuale di parole conosciute e i filtri che usano questi dati.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Collega Anki, scegli dove vanno le nuove carte e quali mazzi contano per le parole che conosci.',
    deck: 'Mazzo per le nuove carte',
    deckHint: 'Il mazzo a cui viene aggiunta ogni nuova carta.',
    statusScope: 'Leggi le parole conosciute da',
    statusScopeHint: 'Le carte di questi mazzi decidono quali parole sono sottolineate. Mazzi figli inclusi.',
    marksInAnki: 'Salva i contrassegni in Anki',
    marksInAnkiHint:
      'Salva Conosciuta, Segui e Ignora come note nascoste in Anki (Libregaku::Marks), così si sincronizzano con ' +
      'gli altri tuoi dispositivi. Disattivato: restano in questo browser.',

    // I menu dei mazzi
    wholeCollection: 'Intera collezione',
    chooseDeck: 'Scegli un mazzo…',
    deckNotInAnki: (deck: string): string => `${deck} (non più in Anki)`,
    deckAndSubdecks: (deck: string): string => `${deck} (e mazzi figli)`,
    deckUnset: 'Scegli un mazzo. Finché non lo fai, non si possono aggiungere carte.',
    deckMissing: (deck: string): string => `Anki non ha più un mazzo chiamato “${deck}”. Scegline un altro.`,
    statusScopeMissing: (deck: string): string =>
      `Anki non ha più un mazzo chiamato “${deck}”, quindi tutte le parole risultano nuove. Scegline un altro.`,
    statusScopeOutside: (deck: string): string =>
      `Le nuove carte vanno in “${deck}”, che qui non è incluso, quindi le parole che aggiungi resteranno ` +
      'sottolineate come nuove. Scegli un mazzo che lo contenga, oppure Intera collezione.',

    // Lo stato di Anki
    ankiChecking: 'Verifica in corso…',
    ankiConnected: 'Connesso.',
    noteTypeInstalled: 'Tipo di nota installato.',
    cardsMade: (n: number): string =>
      one(n) ? `${n} carta creata con Libregaku.` : `${n} carte create con Libregaku.`,
    noCards: 'Ancora nessuna carta.',
    cardsFlushed: (n: number): string =>
      one(n)
        ? `Aggiunta ${n} carta creata mentre Anki era chiuso.`
        : `Aggiunte ${n} carte create mentre Anki era chiuso.`,
    cardsNotFlushed: (n: number, error: string): string => `Impossibile aggiungere ${cards(n)}: ${error}`,
    cardsWaiting: (n: number): string =>
      one(n) ? `${n} carta in attesa di essere aggiunta.` : `${n} carte in attesa di essere aggiunte.`,
    ankiOffline: (port: number): string =>
      `Anki non risponde sulla porta ${port}. È normale quando è chiuso: ` +
      'le nuove carte aspettano qui e vengono aggiunte quando si apre.',
    ankiBlocked: 'Anki è aperto, ma AnkiConnect non autorizza ancora questa estensione.',
    ankiOccupied: (detail: string): string => `${detail} Chiudi il programma che la usa, così Anki potrà usarla.`,

    // I pulsanti di Anki
    checkAgain: 'Controlla di nuovo',
    newDeck: 'Nuovo mazzo',
    openCards: 'Apri le carte in Anki',
    openMarks: 'Apri i contrassegni in Anki',
    newDeckPrompt: 'Dai un nome al nuovo mazzo. Usa :: per un mazzo figlio, ad es. Giapponese::Netflix',

    // Collegare Anki
    installStep: 'Installa Anki su questo computer e aprilo. {link}',
    getAnki: 'Scarica Anki',
    addonStep: 'In Anki, vai su {menu}, incolla questo codice, poi riavvia Anki.',
    addonMenu: 'Strumenti → Add-on → Scarica add-on…',
    aboutAnkiConnect: 'Informazioni su AnkiConnect',
    originStep: 'In Anki, vai su {menu}, aggiungi questa riga a {setting}, poi riavvia Anki.',
    originMenu: 'Strumenti → Add-on → AnkiConnect → Configura',
    runningStep: 'Tieni Anki aperto mentre guardi. Le carte vanno direttamente in Anki su questo computer.',
    copy: 'Copia',
    copyValue: (value: string): string => `Copia ${value}`,
    copied: 'Copiato',
    copyFailed: 'Selezionalo',

    // Carte di Anki
    ankiCardsHeading: 'Carte di Anki',
    ankiCardsAbout: 'Scegli cosa aggiungere a ogni nuova carta, oltre a parola, lettura, significato e frase.',
    cardAudio: 'Audio della parola',
    cardAudioHint: 'Una registrazione della parola, se esiste. Mai una voce sintetica.',
    cardSentenceAudio: 'Audio della frase',
    cardSentenceAudioHint: 'Registra la frase riproducendola un’altra volta. Sui siti protetti serve l’autorizzazione qui sotto.',
    cardScreenshot: 'Screenshot',
    cardScreenshotHint: 'Un fotogramma della scena. Non disponibile sui siti protetti, che lo bloccano.',
    capture: 'Audio della frase sui siti protetti',
    captureAllow: 'Consenti',
    captureAllowInSettings: 'Consenti nelle impostazioni',
    captureRemove: 'Rimuovi',
    captureAllowed:
      'Consentito. In ogni scheda di un sito protetto, clicca sull’icona di Libregaku e scegli Registra qui l’audio della frase.',
    captureNeeded:
      'I siti protetti criptano i loro video, quindi l’audio della frase viene registrato dalla scheda. Per farlo serve la tua autorizzazione.',

    // Dati e licenze
    creditsHeading: 'Dati e licenze',
    creditJmdict:
      'Dati del dizionario e dei kanji © Electronic Dictionary Research and Development Group, usati con licenza ' +
      'CC BY-SA 4.0. Convertiti in JSON da jmdict-simplified.',
    creditLindera:
      'Divide in parole il giapponese, il coreano e il cinese. Licenza MIT; IPADIC, UniDic, mecab-ko-dic e CC-CEDICT hanno ' +
      'i propri termini.',
    creditCedict: 'Dizionario di cinese © MDBG e i suoi collaboratori, usato con licenza CC BY-SA 4.0.',
    creditWiktionary:
      'Dizionari di coreano e spagnolo, e alcuni nella tua lingua, da Wiktionary tramite kaikki.org e ' +
      'wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Parole coreane spiegate nella tua lingua. © National Institute of Korean Language, usato con licenza ' +
      'CC BY-SA 2.0 KR. File creati da Lyroxide.',
    creditCfdict: 'Il cinese spiegato in francese. CFDICT © chine.in, tenuto aggiornato da CxDICT. CC BY-SA 4.0.',
    creditCanto:
      'Dizionario di cantonese e letture in Jyutping per CC-CEDICT. © Pleco Inc., usato con licenza CC BY-SA 3.0.',
    creditHandedict: 'Il cinese spiegato in tedesco. © HanDeDict e i suoi collaboratori, usato con licenza CC BY-SA 3.0.',
    creditUnihan: 'Quale lettura di un carattere cinese viene mostrata per prima. © Unicode, Inc., usato con la Unicode License.',
    creditJotoba: 'Usati per le ricerche mentre il dizionario si scarica. Entrambi usano JMdict.',
    creditLucide: 'Icone. Licenza ISC.',
    creditCommons: 'Registrazioni di parole spagnole, cinesi e coreane, pronunciate da volontari. Ognuna ha la propria licenza, CC BY-SA 4.0 per la maggior parte, indicata con il nome di chi parla durante la riproduzione e sulla carta.',
    creditAudioCmn: 'Registrazioni di parole cinesi di Yue Tan, Università di Caen. CC BY-SA 3.0 US.',
    creditNaver: 'Registrazioni di parole coreane del dizionario Naver, riprodotte solo nella scheda di consultazione. Non sono concesse in licenza per il riuso, quindi non vanno mai su una carta.',
    creditSpanishdict: 'Voce generata per le parole spagnole di SpanishDict, riprodotta dal pulsante di pronuncia quando non c’è una registrazione. Non è concessa in licenza per il riuso, quindi non va mai su una carta.',
    licence: 'Libregaku ha licenza MIT. I dati dei dizionari vengono scaricati dalle loro fonti, non sono inclusi.',
    built: (when: string): string => `Questa copia è stata compilata il ${when}.`,

    // Scorciatoie da tastiera
    keyLine: 'Riga precedente o successiva',
    keyReplay: 'Ripeti la riga',
    keyTranslation: 'Mostra o nascondi la traduzione',
    keyShiftLookup: 'Tieni premuto per cercare la parola sotto il puntatore',
    keyAdd: 'Aggiungi ad Anki la parola nel popup',
    keyKnown: 'Segna come conosciuta la parola nel popup',
    keyFurigana: 'Cambia furigana: disattivato, parole nuove, tutte le parole',
    keyPinyin: 'Cambia pinyin: disattivato, parole nuove, tutte le parole',
    keyJyutping: 'Cambia Jyutping: disattivato, parole nuove, tutte le parole',
    keyBlur: 'Attiva o disattiva la sfocatura dei sottotitoli',
    keySave: 'Salva la riga corrente',
    keyTranscript: 'Mostra o nascondi il pannello della trascrizione',
    keyClose: 'Chiudi il popup',
  },

  options: {
    pageTitle: 'Impostazioni di Libregaku',
    help: 'Guida',
    searchSettings: 'Cerca…',
    noSettingsFound: 'Nessun risultato per “{q}”.',
    contentsLabel: 'Sezioni delle impostazioni',
    settingsLabel: 'Impostazioni',
    setupHeading: 'Per iniziare',
    setupAbout: 'Due scelte: per tutto il resto c’è già un valore predefinito sensato.',
    stepLanguages: 'Scegli cosa stai imparando',
    stepAnki: 'Collega Anki e scegli un mazzo per le nuove carte',
    ankiOptional:
      'Anki è facoltativo: sottotitoli, ricerche e furigana funzionano anche senza. ' +
      'È Anki a ricordare quali parole conosci già.',
    nextSteps:
      'Poi apri un video con sottotitoli nella lingua che stai imparando e passa il mouse su una parola. ' +
      'L’icona della tastiera nel pannello della trascrizione mostra le scorciatoie da tastiera.',
    stepDone: 'Completato',
    confirmLanguages: 'Queste lingue sono giuste',
    keepDeck: (deck: string): string => `Usa ${deck} per le nuove carte`,
  },

  action: {
    help: 'Guida',
    settings: 'Impostazioni',
    settingsTip: 'Tutte le impostazioni',
    checkingPage: 'Verifica della pagina…',
    notActive:
      'Non attivo in questa pagina. Apri un video su YouTube, Netflix o un altro sito supportato. Se hai appena installato o ricaricato ' +
      'Libregaku, ricarica la scheda.',
    unsupported: 'Libregaku funziona su YouTube, Netflix, Disney+, Prime Video e Max.',
    worksOn: (site: string): string => `Libregaku funziona su ${site}.`,
    waitingForSubtitles: (site: string): string =>
      `In attesa dei sottotitoli su ${site}. Assicurati che siano attivi.`,
    activeOn: (title: string): string => `Attivo: ${title}`,
    active: 'Attivo su questo video.',
    subtitlesTrack: 'Sottotitoli',
    translationTrack: 'Traduzione',
    noTranslation: 'Nessuna',
    generatedTrack: (track: string): string => `${track} (automatici)`,
    captureNeedsPermission: 'Per registrare qui l’audio della frase serve il permesso di acquisire l’audio di questa scheda.',
    captureAllowInSettings: 'Consenti nelle impostazioni',
    captureReady: 'L’audio dei siti protetti si può registrare solo dopo aver attivato la registrazione per questa scheda.',
    captureStart: 'Registra qui l’audio della frase',
    captureFailed: 'Chrome non è riuscito a registrare questa scheda.',
    toggleSidebar: 'Mostra/nascondi barra laterale',
    ankiChecking: 'Anki: verifica in corso…',
    ankiConnected: (n: number): string => `Anki connesso · ${cards(n)} da Libregaku`,
    ankiOffline: 'Anki non è aperto: le parole risultano nuove',
    ankiOccupied: (port: number): string => `Un altro programma usa la porta ${port}, quindi Anki non è raggiungibile`,
    ankiBlocked: 'Anki ha rifiutato questa estensione: in Impostazioni trovi la riga da aggiungere',
    ankiBusy: 'Anki non ha risposto: forse sta sincronizzando',
    ankiRefused: 'Anki ha rifiutato la richiesta',
    cardsToAdd: (n: number): string => `${cards(n)} ancora da aggiungere`,
    cardsWaiting: (n: number): string => `${cards(n)} in attesa di Anki`,
  },

  sidebar: {
    panelLabel: 'Pannello della trascrizione',
    resizeLabel: 'Ridimensiona il pannello',

    // Le schede e i pulsanti accanto
    tabsLabel: 'Elenchi',
    transcriptTab: 'Trascrizione',
    savedTab: 'Salvate',
    settings: 'Impostazioni',
    shortcuts: 'Scorciatoie da tastiera',
    close: 'Chiudi',
    closeLabel: 'Chiudi il pannello',
    openTip: 'Trascrizione',
    openLabel: 'Mostra la trascrizione',
    help: 'Guida',

    // Cercare nella trascrizione
    searchPlaceholder: 'Cerca nella trascrizione…',
    searchLabel: 'Cerca nella trascrizione',
    noMatches: 'Nessun risultato',
    matchAt: (at: number, total: number): string => `${at} di ${total}`,
    matchesFound: (n: number): string => `${n} ${one(n) ? 'risultato' : 'risultati'}`,

    // Il filtro
    filterTip: 'Filtra',
    filterLabel: 'Filtra le righe',
    filterAll: 'Tutte le righe',
    filterAllAbout: 'Tutte le righe, senza filtri',
    filterNew: 'Con parole nuove',
    filterNewAbout: 'Righe con una parola per cui non hai una carta',
    filterReady: 'Pronte da imparare',
    filterReadyAbout: 'Righe in cui solo una parola è nuova per te: le più facili da cui imparare',
    filterSaved: 'Salvate',
    filterSavedAbout: 'Righe che hai tenuto per dopo',

    // La trascrizione
    partial: 'Si completa mentre guardi: questo player mostra solo la riga corrente.',
    partialEmpty: 'Ancora niente. Le righe compaiono qui man mano che vengono pronunciate.',
    empty: 'Nessuna trascrizione caricata.',
    currentLine: 'Riga corrente',
    lineNew: (n: number): string => `${n} ${one(n) ? 'nuova' : 'nuove'}`,
    playFrom: (time: string): string => `Riproduci da ${time}`,
    saveLine: 'Salva riga',
    unsave: 'Rimuovi dalle salvate',
    addSentence: 'Aggiungi frase',
    addSentenceLabel: 'Aggiungi la frase ad Anki',

    // Il riepilogo sopra la trascrizione: un’etichetta e il suo numero, che va bene per qualsiasi quantità
    knownPercent: (n: number): string => percent(n),
    summaryKnown: 'Conosciute: {n}',
    summaryNew: 'Nuove: {n}',
    summaryReady: 'Pronte da imparare: {n}',
    counting: (n: number): string => `Conteggio delle parole nuove… ${percent(n)}`,
    countFailed: 'Alcune righe non sono state contate, quindi non ci sono totali.',

    // La definizione rapida
    dictionaryLoading: (n: number): string => `Caricamento del dizionario: ${percent(n)}`,
    dictionaryUnavailable: 'Dizionario non disponibile',
    noEntry: 'Nessuna voce.',

    // Salvate
    savedEmpty:
      'Ancora niente di salvato. Usa il segnalibro su una riga della trascrizione, o premi B, per tenere una frase ' +
      'a cui vuoi tornare.',
    thisVideo: 'questo video',
    openAt: (time: string): string => `Apri il video a ${time}`,
    remove: 'Rimuovi',
    removeLabel: 'Rimuovi dalle salvate',
    copySavedAbout: 'Copia tutte le righe salvate come testo separato da tabulazioni',
    exportSavedAbout: 'Salva un file separato da tabulazioni che Anki può importare',
    addSavedAbout: 'Crea una carta da ogni riga salvata',
    linesCopied: (n: number): string => (one(n) ? `${n} riga copiata.` : `${n} righe copiate.`),
    chooseDeck: 'Prima scegli un mazzo in Impostazioni: è lì che vanno le nuove carte.',
    checkingAnki: 'Verifica di Anki…',
    ankiOffline: 'Anki non è aperto. Aprilo e riprova; in Impostazioni trovi i passaggi.',
    ankiBlocked: 'AnkiConnect non ha ancora autorizzato questa estensione. In Impostazioni trovi la riga da aggiungere.',
    ankiUnreachable: 'Impossibile raggiungere Anki. In Impostazioni trovi il motivo.',
    adding: (at: number, total: number): string => `Aggiunta in corso: ${at} di ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${added} ${one(added) ? 'carta aggiunta' : 'carte aggiunte'} ${ad(deck)} ${deck}` +
      `${already ? `, ${already} ${one(already) ? 'c’era già' : 'c’erano già'}` : ''}.`,

    // Pulsanti e messaggi delle schede Salvate e Parole
    copy: 'Copia',
    exportFile: 'Esporta',
    addToAnki: 'Aggiungi ad Anki',
    noClipboard: 'Impossibile accedere agli appunti.',
    downloaded: 'Salvato nei download. In Anki: File → Importa.',
    downloadBlocked: 'Questa pagina ha bloccato il download: usa invece Copia.',

    // Parole
    listsLabel: 'Quale elenco',
    listLines: 'Righe',
    listTracked: 'Seguite',
    listKnown: 'Conosciute',
    listIgnored: 'Ignorate',
    findPlaceholder: 'Cerca…',
    findLabel: 'Cerca in questo elenco',
    copyWordsAbout: 'Copia questo elenco come testo separato da tabulazioni',
    exportWordsAbout: 'Salva questo elenco in un file separato da tabulazioni che Anki può importare',
    wordsCopied: (n: number): string => (one(n) ? `${n} parola copiata.` : `${n} parole copiate.`),
    nothingToExport: 'In questo elenco non c’è nulla da esportare.',
    lookingUp: 'Ricerca di letture e significati…',
    noWordMatches: (query: string): string => `Nessuna parola di questo elenco corrisponde a “${query}”.`,
    noLineMatches: (query: string): string => `Nessuna riga salvata corrisponde a “${query}”.`,
    wordsMatching: (shown: number, total: number): string => `${shown} di ${words(total)}.`,
    trackedEmpty:
      'Ancora nessuna parola seguita. Segui sottolinea una parola perché tu la noti, senza creare una carta. ' +
      'Attiva il suo pulsante in Impostazioni, sotto Popup della parola.',
    trackedIntro: (n: number): string =>
      one(n)
        ? `${n} parola che segui, sottolineata ovunque compaia.`
        : `${n} parole che segui, sottolineate ovunque compaiano.`,
    stopTracking: 'Smetti di seguire',
    knownEmpty:
      'Nessuna parola segnata come conosciuta. Segna una parola come conosciuta dal suo popup, o premi K, ' +
      'quando la conosci e non vuoi una carta.',
    knownIntro: (n: number): string =>
      `${n} ${one(n) ? 'parola segnata come conosciuta' : 'parole segnate come conosciute'}. ` +
      'Se togli il contrassegno a una parola, torna a valere quello che dicono le tue carte di Anki.',
    unmarkKnown: 'Rimuovi da conosciute',
    ignoredEmpty: 'Nessuna parola ignorata. Ignora nomi e suoni dal loro popup: non verranno mai sottolineati né contati.',
    ignoredIntro: (n: number): string =>
      one(n) ? `${n} parola mai sottolineata né contata.` : `${n} parole mai sottolineate né contate.`,
    stopIgnoring: 'Smetti di ignorare',
  },

  popup: {
    // Il popup e la parola in cima
    cardLabel: (word: string): string => `${word} — dizionario`,
    commonBadge: 'comune',
    nameBadge: 'probabilmente un nome',
    characterNames: { kanji: 'Kanji', hanzi: 'Caratteri' },
    partOfSpeech: {
      n: 'sostantivo', 'n-adv': 'sostantivo avverbiale', 'n-t': 'sostantivo temporale', 'n-suf': 'suffisso nominale',
      'n-pref': 'prefisso nominale', pn: 'pronome', 'adj-i': 'aggettivo in -i', 'adj-na': 'aggettivo in -na',
      'adj-no': 'aggettivo in -no', 'adj-pn': 'aggettivo prenominale', adv: 'avverbio', 'adv-to': 'avverbio',
      aux: 'ausiliare', 'aux-v': 'verbo ausiliare', 'aux-adj': 'aggettivo ausiliare',
      conj: 'congiunzione', cop: 'copula', ctr: 'classificatore', exp: 'espressione', int: 'interiezione',
      num: 'numerale', prt: 'particella', pref: 'prefisso', suf: 'suffisso', unc: 'non classificato',
      vs: 'verbo suru', 'vs-i': 'verbo suru', 'vs-s': 'verbo suru', vt: 'transitivo', vi: 'intransitivo',
      v1: 'verbo ichidan', 'v1-s': 'verbo ichidan', vk: 'verbo kuru', vz: 'verbo zuru',
      v5b: 'verbo godan', v5g: 'verbo godan', v5k: 'verbo godan', 'v5k-s': 'verbo godan',
      v5m: 'verbo godan', v5n: 'verbo godan', v5r: 'verbo godan', 'v5r-i': 'verbo godan',
      v5s: 'verbo godan', v5t: 'verbo godan', v5u: 'verbo godan', 'v5u-s': 'verbo godan',
      v5aru: 'verbo godan',
      // I codici di Wiktionary, per le parole coreane e spagnole. Il tipo di parola, poi la sua grammatica
      name: 'nome proprio', v: 'verbo', adj: 'aggettivo', pron: 'pronome', det: 'determinante', artic: 'articolo',
      counter: 'classificatore', prep: 'preposizione', 'prep-phrase': 'locuzione preposizionale', ptcl: 'particella',
      intj: 'interiezione', phrase: 'locuzione', prov: 'proverbio', r: 'radice', char: 'carattere', adn: 'adnominale',
      ptcpl: 'participio', contr: 'contrazione',
      masc: 'maschile', fem: 'femminile', neut: 'neutro', sg: 'singolare', pl: 'plurale', 'pl-only': 'solo plurale',
      count: 'numerabile', uncount: 'non numerabile', vr: 'riflessivo', vdt: 'ditransitivo', impers: 'impersonale',
      irreg: 'irregolare', reltnl: 'relazionale', reltv: 'relativo', interr: 'interrogativo', poss: 'possessivo',
      dim: 'diminutivo', aug: 'accrescitivo', onoma: 'onomatopeico',
      // Come e quando si usa la parola
      idio: 'idiomatico', fig: 'figurato', literal: 'letterale', col: 'colloquiale', inf: 'informale', fam: 'familiare',
      formal: 'formale', polite: 'cortese', lit: 'letterario', poet: 'poetico', rhet: 'retorico', sl: 'gergale',
      vulg: 'volgare', derog: 'spregiativo', offens: 'offensivo', humor: 'scherzoso', euph: 'eufemistico',
      child: 'infantile', net: 'Internet', neol: 'neologismo', cmn: 'comune', uncmmn: 'poco comune', rare: 'raro',
      dated: 'datato', arch: 'arcaico', obs: 'obsoleto', hist: 'storico', 'non-std': 'non standard',
      dialect: 'dialettale', regio: 'regionale',
    },

    // I pulsanti sotto la parola
    pronounce: 'Ascolta',
    playedRecording: (word: string): string => `${word} · registrazione`,
    playedSynthesised: (word: string): string => `${word} · voce sintetica`,
    recordingBy: (speaker: string, licence: string): string => `Registrazione di ${speaker} · ${licence}`,
    pronounceFailed: 'impossibile riprodurre l’audio',
    addSentence: 'Aggiungi frase',
    sentenceAdded: 'Frase aggiunta',
    undo: 'Annulla',
    copyWord: 'Copia parola',
    copyPhrase: 'Copia espressione',
    copySentence: 'Copia frase',
    wordCopied: 'parola copiata',
    phraseCopied: 'espressione copiata',
    sentenceCopied: 'frase copiata',
    copyFailed: 'impossibile copiare: seleziona il testo',

    // I significati
    dictionaryLoading: (n: number): string =>
      `Il dizionario si sta ancora caricando (${percent(n)}). Riprova tra un attimo.`,
    dictionaryUnavailable: (error: string): string => `Dizionario non disponibile: ${error}`,
    noEntry: 'Nessuna voce del dizionario per questa parola.',
    noEntryName: 'Un nome, quindi non ha una voce nel dizionario.',
    moreMeanings: (n: number): string => `+${n} ${one(n) ? 'altro significato' : 'altri significati'}`,

    // Le altre righe del video con questa parola
    elsewhereCount: (n: number): string =>
      (n === 1 ? 'Ancora una volta in questo video' : `Altre ${n} volte in questo video`),
    playLine: 'Riproduci',
    elsewhereMore: (n: number): string =>
      `${one(n) ? 'e un’altra' : `e altre ${n}`}: la ricerca nella trascrizione le trova tutte`,
    showAllInTranscript: 'Mostra tutte nella trascrizione',

    // Aggiungi ad Anki
    addToAnki: 'Aggiungi ad Anki',
    addToDeck: (deck: string): string => `Aggiungi ${ad(deck)} ${deck}`,
    adding: 'Aggiunta in corso…',
    undoing: 'Annullamento…',
    added: 'Aggiunta',
    addedUndo: 'Aggiunta — annulla',
    inAnki: 'In Anki',
    showInAnki: 'Mostra in Anki',
    waiting: 'In attesa',
    waitingForAnki: 'In attesa di Anki',
    goesInWhenAnkiOpens: 'Verrà aggiunta ad Anki quando si apre',
    alreadyAdded: 'Già aggiunta',
    alreadyInAnki: 'Già in Anki',
    waitingForAnkiToOpen: 'In attesa che Anki si apra',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // Il menu dei mazzi
    otherDecks: 'Altri mazzi',
    addToAnotherDeck: 'Aggiungi a un altro mazzo',
    decksUnknown: 'Anki non risponde, quindi i suoi mazzi non sono ancora noti.',
    newDeck: 'Nuovo mazzo…',
    newDeckPrompt: 'Nuovo mazzo. Usa :: per un mazzo figlio, come in Giapponese::Netflix',

    // I contrassegni
    knownButton: 'Conosciuta',
    trackButton: 'Segui',
    ignoreButton: 'Ignora',
    markKnownTip: 'Segna come conosciuta',
    trackTip: 'Segui',
    ignoreTip: 'Ignora',
    unmarkKnownTip: 'Rimuovi da conosciute',
    stopTrackingTip: 'Smetti di seguire',
    stopIgnoringTip: 'Smetti di ignorare',
  },

  header: {
    knownStat: 'Conosciute: {percent}',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Parole che conosci',
    readyStat: 'Pronte da imparare: {count}',
    readyTip: 'Righe con una sola parola nuova',
    blurSubtitle: 'Sfoca sottotitolo',
    unblurSubtitle: 'Togli sfocatura',
    showTranslation: 'Mostra traduzione',
    hideTranslation: 'Nascondi traduzione',
    hideSubtitles: 'Nascondi i sottotitoli',
    showSubtitles: 'Mostra i sottotitoli',
    subtitles: 'Sottotitoli',
    translation: 'Traduzione',
    transcript: 'Trascrizione',
    pinHeader: 'Fissa intestazione',
    unpinHeader: 'Sblocca intestazione',
    settings: 'Impostazioni',
    showHeader: 'Mostra intestazione',
  },

  player: {
    // I tasti del player
    lastLine: 'Era l’ultima riga',
    noLineBefore: 'Nessuna riga prima di questa',
    translationOn: 'Traduzione attivata',
    translationOff: 'Traduzione disattivata',
    subtitlesOff: 'Sottotitoli disattivati',
    subtitlesOn: 'Sottotitoli attivati',
    blurOn: 'Sottotitolo sfocato finché non ci passi sopra',
    blurOff: 'Sottotitolo visibile',
    lineSaved: 'Riga salvata',
    lineUnsaved: 'Riga rimossa dalle salvate',
    lookUpFirst: 'Prima cerca una parola',
    alreadyKnown: (word: string): string => `${word} · già conosciuta in Anki`,
    alreadyInAnki: (word: string): string => `${word} · già in Anki`,
    adding: (word: string): string => `Aggiunta di ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // I contrassegni
    markOff: (word: string): string => `${word} · contrassegno rimosso`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'segnata come conosciuta', tracking: 'seguita', ignored: 'ignorata', unknown: 'segnata come nuova',
      }[status];
      if (refused) return `${word} · ${done}, nessuna carta. Anki ha rifiutato il contrassegno; nuovo tentativo più tardi`;
      return `${word} · ${done}, nessuna carta${status === 'tracking' ? '. Vedi la scheda Salvate del pannello' : ''}`;
    },

    // La carta di una parola
    pickDeck: 'Prima scegli un mazzo nelle impostazioni di Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `aggiunta ${ad(deck)} ${deck}, senza ${without(missing)}` : `aggiunta ${ad(deck)} ${deck}`,
    alreadyIn: (deck: string): string => `già in ${deck}`,
    queued: (deck: string): string => `Anki è chiuso: la carta andrà in ${deck} quando si apre`,
    alreadyQueued: 'già in attesa di Anki',
    notKept: 'Anki è chiuso e il browser non ha potuto conservare la carta per dopo',
    takenBack: (deck: string): string => `rimossa da ${deck}`,
    unqueued: 'non più in attesa di Anki',
    alreadySent: 'È già stata aggiunta ad Anki',
    queueSent: (count: number): string =>
      `Anki è aperto: ${count === 1 ? 'aggiunta la carta in attesa' : `aggiunte le ${count} carte in attesa`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `le parole che conosci vengono lette da ${scope}, quindi le carte del mazzo ${deck} non conteranno`,

    // La carta di una frase
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length
        ? `frase aggiunta ${ad(deck)} ${deck}, senza ${without(missing)}`
        : `frase aggiunta ${ad(deck)} ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `la frase è già in ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'audio', picture && 'immagine'].filter(Boolean);
      return `Anki è chiuso: la frase andrà in ${deck} quando si apre` +
        `${lacking.length ? `, senza ${lacking.join(' né ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'la frase è già in attesa di Anki',
    sentenceTakenBack: (deck: string): string => `frase rimossa da ${deck}`,

    // L’audio della frase
    recording: 'Registrazione della riga…',

    // Ricerche
    noDictionary: 'ancora nessun dizionario per questa lingua.',
  },

  notices: {
    // L’avviso
    unexpected: 'Libregaku ha incontrato un problema imprevisto.',
    dismiss: 'Chiudi',

    // YouTube o Netflix hanno cambiato qualcosa
    youtubeTrackList: 'Impossibile leggere l’elenco dei sottotitoli di YouTube.',
    youtubeTrackShape: 'I dati dei sottotitoli di YouTube non hanno la forma prevista.',
    youtubeCaptionText: 'Testo dei sottotitoli di YouTube non trovato nella pagina.',
    youtubePlayerTrackList: 'Impossibile leggere l’elenco dei sottotitoli di questo video dal player di YouTube.',
    netflixTrackList: 'Impossibile leggere l’elenco dei sottotitoli di Netflix.',
    netflixCaptionText: 'Testo dei sottotitoli di Netflix non trovato nella pagina.',
    disneyTrackList: 'Impossibile leggere l’elenco dei sottotitoli di Disney+.',
    disneyCaptionText: 'Testo dei sottotitoli di Disney+ non trovato nella pagina.',
    primeTrackList: 'Impossibile leggere l’elenco dei sottotitoli di Prime Video.',
    primeCaptionText: 'Testo dei sottotitoli di Prime Video non trovato nella pagina.',
    maxTrackList: 'Impossibile leggere l’elenco dei sottotitoli di Max.',
    maxCaptionText: 'Testo dei sottotitoli di Max non trovato nella pagina.',
    netflixBlocked: 'Netflix ha bloccato la parte di Libregaku che legge i sottotitoli.',

    // I sottotitoli di questo video
    subtitlesOff: 'Attiva i sottotitoli nel player e Libregaku li rileverà.',
    trackNotSent: 'Il player non ha ancora caricato questi sottotitoli.',
    noTargetTrack: 'Qui non ci sono sottotitoli nella lingua che stai imparando.',
    noSecondTrack: 'Qui non ci sono sottotitoli nella tua lingua, quindi non c’è una seconda riga.',
    onlyOneTrack: 'Questo video ha una sola traccia di sottotitoli, quindi non c’è una seconda riga.',
    autoGenerated: 'Questi sottotitoli sono generati automaticamente, quindi testo e divisione delle parole saranno imprecisi.',
    noSubtitles: 'Questo video non ha sottotitoli.',
    secondTrackFailed: 'Impossibile caricare la seconda riga.',

    // Le parti dell’estensione
    analyserUnavailable:
      'Letture e forme del dizionario disattivate: l’analizzatore linguistico non si è caricato. ' +
      'Le parole corrispondono alle tue carte solo se scritte in modo identico.',
    markNotSaved: 'Impossibile salvare il contrassegno. Vale finché non ricarichi la pagina, poi andrà perso.',
    marksNotSynced: 'Impossibile salvare i tuoi contrassegni in Anki. Restano in questo browser e verrà fatto un nuovo tentativo.',
    cardsNotAdded:
      'Anki non ha accettato alcune delle carte conservate mentre era chiuso. Sono ancora conservate e verrà fatto un nuovo tentativo.',

    // Dettagli
    playerNeverLoaded: 'Il player non ha mai finito di caricarsi.',
    subtitlesMaybeOff: 'Forse i sottotitoli sono semplicemente disattivati nel player.',
    lookedFor: (selector: string): string => `Elemento cercato: ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Sottotitoli di questo video: ${languages.join(', ') || 'nessuno'}. ` +
      'Cambia la lingua che stai imparando nelle impostazioni, o scegli un altro video.',
    onlyPictures: 'Questo video li ha solo come immagini, non come testo, quindi Libregaku non può leggerli.',
    chooseInPlayer: (track: string): string => `Scegli ${track} nel menu dei sottotitoli del player e Libregaku li rileverà.`,
    noHumanTrack: 'Per questo video non c’era nessuna traccia scritta da una persona.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Sottotitoli di questo video: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'l’analizzatore non si è caricato',
  },

  anki: {
    // Raggiungere AnkiConnect
    offline: (port: number): string => `Nessun programma è in ascolto sulla porta ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Nessuna risposta sulla porta ${port} entro ${seconds} s. ` +
      'Anki potrebbe essere occupato (con la sincronizzazione o una finestra di dialogo aperta), ' +
      'oppure un altro programma occupa la porta.',
    blocked: (origin: string): string =>
      `AnkiConnect ha rifiutato ${origin}. In Anki: Strumenti → Add-on → AnkiConnect → Configura, ` +
      'poi aggiungi quella riga a webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Un programma sulla porta ${port} ha risposto con HTTP ${status}, cosa che AnkiConnect non fa.`,
    notAnkiConnect: (port: number): string => `Un programma diverso da AnkiConnect sta usando la porta ${port}.`,
    noBackground: 'La parte in background dell’estensione non risponde.',
    unreachable: 'Anki non è raggiungibile.',
    callFailed: 'Chiamata ad AnkiConnect non riuscita.',

    // Quello che Libregaku si rifiuta di inviare
    notRelayed: (action: string): string => `Libregaku non invia “${action}” ad AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string => MEDIA_NOT_FETCHED[media],
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => MEDIA_EMPTY[media],
    mediaName: (prefix: string): string => `I file che Libregaku aggiunge si chiamano ${prefix}…, e questo no.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} richiede un elenco di ${ids === 'notes' ? 'note' : 'carte'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Rifiutato: ${count} ${ids === 'notes' ? 'delle note inviate' : 'delle carte inviate'} ` +
      `non ${one(count) ? 'appartiene' : 'appartengono'} a nessun contrassegno di Libregaku. ${ONLY_MARKS[change]}`,

    // I tipi di nota di Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string => {
      const single = fields.length === 1;
      return `Al tuo tipo di nota “${noteType}” in Anki ${single ? 'manca il campo' : 'mancano i campi'} ` +
        `${fields.join(', ')}, quindi ${loses === 'cards' ? 'le carte' : 'le note'} ${single ? 'lo' : 'li'} perderebbero. ` +
        'Libregaku non modifica un tipo di nota che potresti aver personalizzato: ' +
        `in Anki, Strumenti → Gestisci tipi di nota, rinomina “${noteType}” (o aggiungi di nuovo i campi), ` +
        'poi premi Controlla di nuovo e ne verrà installato uno nuovo.';
    },

    // Contrassegni e carte in attesa
    marksNotAdded: (count: number): string =>
      `Anki non ha aggiunto ${count} dei contrassegni. Restano in coda e verranno inviati di nuovo la prossima volta.`,
    marksNotStored: (cause: string): string =>
      `Lo spazio di archiviazione del browser ha rifiutato i contrassegni letti da Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Impossibile leggere lo spazio di archiviazione del browser: ${cause}`,
  },

  errors: {
    // Registrare l’audio di una scheda
    captureNotAllowed: 'Prima consenti l’audio della frase su questo sito nelle impostazioni di Libregaku.',
    captureRefused: 'Chrome non ha consentito di acquisire questa scheda',

    // Una traccia di sottotitoli che non si è caricata
    unknownTrack: (id: string): string => `traccia sconosciuta ${id}`,
    trackNotSent: 'non ancora caricata dal player: sceglila una volta nel menu dei sottotitoli del player',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `nessun formato di sottotitoli ha funzionato: ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `nessun URL dei sottotitoli ha funzionato: ${attempts.join('; ') || 'nessuno indicato'}`,
    emptyAnswer: 'vuota',
    noCues: '0 righe',
    noCuesParsed: '0 righe dopo la lettura',
    noAnswerWithin: (seconds: number): string => `nessuna risposta in ${seconds} s`,

    // Il nome di una traccia
    forcedTrack: (track: string): string => `${track} (forzati)`,

    // Il dizionario e l’analizzatore
    noAnswer: 'nessuna risposta dall’estensione: ricarica la pagina per riavviarla',
    analyserLoading: 'l’analizzatore si sta ancora caricando',
    dictionaryLoading: 'il dizionario si sta ancora caricando',
    lookupFailed: 'ricerca non riuscita',
  },

  grammar: {
    // Tempo e cortesia
    past: 'passato',
    polite: 'cortese',

    // Negazione
    negative: 'negativo',
    'negative intent': 'volitivo negativo',
    without: 'senza',

    // Condizione
    conditional: 'condizionale',
    whenever: 'ogni volta che',

    // Chi agisce, e cosa si può fare
    passive: 'passivo',
    'passive or potential': 'passivo o potenziale',
    potential: 'potenziale',
    causative: 'causativo',

    // Desiderio
    'want to': 'volere',
    'seems to want to': 'sembra volere',
    'want someone to': 'volere che qualcuno faccia',

    // Apparenza e probabilità
    seems: 'sembra',
    'seems like': 'sembra che',
    hearsay: 'si dice che',
    apparently: 'a quanto pare',
    probably: 'probabilmente',
    might: 'forse',

    // Cosa dovrebbe succedere
    'ought to': 'bisognerebbe',
    'supposed to': 'dovrebbe',
    'intends to': 'intenzione',

    // Obbligo e permesso
    must: 'obbligo',
    'must not': 'divieto',
    "don't have to": 'non serve',
    may: 'permesso',

    // Ordini e richieste
    imperative: 'imperativo',
    volitional: 'volitivo',
    'polite command': 'ordine cortese',
    please: 'richiesta',

    // Collegamento con quello che segue
    'te-form': 'forma in -te',
    listing: 'elenco',
    while: 'mentre',
    because: 'perché',
    'even though': 'nonostante',
    'in order to': 'per',
    'so that': 'affinché',

    // Verbi ausiliari dopo la forma in -te
    ongoing: 'in corso',
    'resulting state': 'stato risultante',
    'completely, or regrettably': 'del tutto, o con rammarico',
    'in advance': 'in anticipo',
    'try doing': 'provare a',
    'going forward': 'd’ora in poi',
    'coming to be': 'arrivare a',
    'receive the favour': 'favore ricevuto',
    'someone does for me': 'fatto per me',
    'do for someone': 'fare per altri',

    // Verbi ausiliari dopo la radice
    'too much': 'troppo',
    'easy to': 'facile da',
    'hard to': 'difficile da',
    'start to': 'iniziare a',
    'keep on': 'continuare a',
    finish: 'finire di',
    again: 'rifare',
    'each other': 'a vicenda',
    completely: 'completamente',
    thoroughly: 'a fondo',
    around: 'qua e là',
    'non-stop': 'senza sosta',

    // Forme di una parola spagnola
    or: 'o',
    'first-person': 'prima persona',
    'second-person': 'seconda persona',
    'third-person': 'terza persona',
    singular: 'singolare',
    plural: 'plurale',
    masculine: 'maschile',
    feminine: 'femminile',
    present: 'presente',
    preterite: 'passato remoto',
    imperfect: 'imperfetto',
    'imperfect-se': 'imperfetto (-se)',
    future: 'futuro',
    'conditional-mood': 'condizionale',
    indicative: 'indicativo',
    subjunctive: 'congiuntivo',
    infinitive: 'infinito',
    gerund: 'gerundio',
    participle: 'participio',
    formal: 'di cortesia',
    informal: 'confidenziale',
    'with-tú': 'con tú',
    'with-vos': 'con vos',
    'vos-form': 'forma di vos',
    voseo: 'voseo',
    'second-person-semantically': 'nel senso di “Lei”',
    accusative: 'con oggetto diretto',
    dative: 'con oggetto indiretto',
    'object-first-person': 'oggetto di prima persona',
    'object-second-person': 'oggetto di seconda persona',
    'object-third-person': 'oggetto di terza persona',
    'object-singular': 'oggetto singolare',
    'object-plural': 'oggetto plurale',
    diminutive: 'diminutivo',
    augmentative: 'accrescitivo',
    superlative: 'superlativo',
    alternative: 'variante',
    'alt-of': 'altra grafia',

    // Desinenze coreane
    honorific: 'onorifico',
    'future or guess': 'futuro o supposizione',
    'formal polite': 'cortese formale',
    question: 'domanda',
    but: 'ma',
    "let's": 'proposta',
    plain: 'forma piana',
    'shall we, or I wonder': 'suggerimento o dubbio',
    'I will': 'promessa',
    'just noticed': 'scoperta',
    'as you know': 'come sai',
    and: 'e',
    'because, or and then': 'perché, oppure e poi',
    'but, or given that': 'ma, oppure visto che',
    'even if': 'anche se',
    whether: 'se… o no',
    'adverb form': 'forma avverbiale',
    quoting: 'discorso indiretto',
    'used to': 'un tempo',
    topic: 'tema',
    subject: 'soggetto',
    object: 'oggetto',
    possessive: 'possessivo',
    'come to': 'finire per',
    when: 'quando',
    modifier: 'attributivo',
    'noun form': 'forma nominale',
    becomes: 'diventare',
    'have done before': 'aver già fatto',
    nominative: 'nominativo',
    genitive: 'genitivo',
    'accusative-case': 'accusativo',
    'dative-case': 'dativo',
    neuter: 'neutro',
    definite: 'determinativo',
    indefinite: 'indeterminativo',
    comparative: 'comparativo',
    strong: 'forte',
    weak: 'debole',
    mixed: 'misto',
    'without-article': 'senza articolo',
    reflexive: 'riflessivo',
  },
  helpChat: {
    heading: 'Fai una domanda',
    placeholder: 'Chiedi di un’impostazione o di come fare qualcosa',
    label: 'La tua domanda',
    send: 'Chiedi',
    thinking: 'Sto pensando…',
    note: 'Risposta data sul tuo dispositivo da Gemini Nano, in base a questa guida. Può essere sbagliata.',
    noMatch: 'La guida non lo dice. Prova la ricerca qui sopra.',
    failed: 'Gemini Nano non ha potuto rispondere. Riprova.',
    installHeading: 'Fai una domanda alla guida',
    install: 'Gemini Nano è un piccolo modello di IA che gira dentro Chrome, sul tuo computer. Scaricalo una volta e potrai fare domande qui. Nulla di ciò che scrivi lascia il tuo dispositivo.',
    download: 'Scarica Gemini Nano',
    downloading: (percent: number): string => `Download in corso… ${percent}%`,
    update: 'Chrome include un piccolo modello di IA, Gemini Nano, che può rispondere alle domande qui. Aggiorna Chrome per usarlo.',
    unavailable: 'Chrome ha un piccolo modello di IA, Gemini Nano, che può rispondere alle domande qui, ma non è pronto su questo computer. Servono spazio libero su disco e forse va attivato in chrome://flags.',
    learnMore: 'Informazioni su Gemini Nano',
  },
};
