import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** "1 palabra", "2 palabras". */
const words = (n: number): string => `${n} palabra${n === 1 ? '' : 's'}`;

/** "1 tarjeta", "2 tarjetas". */
const cards = (n: number): string => `${n} tarjeta${n === 1 ? '' : 's'}`;

/** A share, as Spanish writes it: a space, never broken, before the %. */
const percent = (n: number): string => `${n}\u00A0%`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'desactivado', unknown: 'palabras nuevas', always: 'todas' };

/** What a card went in without, joined with "ni": "sin audio de la oración". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'audio de la oración (haz clic en el icono de Libregaku para grabar aquí)'
      : 'audio de la oración'))
    .join(' ni ');

const MEDIA_WHAT = { audio: 'audio', video: 'video', picture: 'imágenes' } as const;
const MEDIA_THE = { audio: 'El audio', video: 'El video', picture: 'La imagen' } as const;

/** The interface in Spanish. Anything left out shows in English. */
export const es: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    mandarin: 'Chino (mandarín)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Idiomas
    languagesHeading: 'Idiomas',
    languagesAbout: 'Elige el idioma que aprendes y tu propio idioma.',
    target: 'Estoy aprendiendo',
    targetLimited: (language: string): string => `${language} (limitado)`,
    supportFull: (definitions: string): string => `Compatibilidad completa, incluidas las lecturas y el furigana. ${definitions}`,
    supportPinyin: (definitions: string): string => `Compatibilidad completa, incluido el pinyin. ${definitions}`,
    supportJyutping: (definitions: string): string => `Compatibilidad completa, incluido el Jyutping. ${definitions}`,
    supportWords: (definitions: string): string => `Compatibilidad completa. ${definitions}`,
    supportDefinitions: (language: string): string => `Las definiciones están en ${language}.`,
    supportDefinitionsOwn: (language: string, fallback: string): string =>
      `Las definiciones están en ${language}, y en ${fallback} para las palabras que no tiene el diccionario en ${language}.`,
    script: 'Caracteres',
    scriptHint: 'Los que se usan cuando un video tiene ambos.',
    supportBasic: 'Compatibilidad básica: se separan las palabras, pero aún no hay diccionario ni lecturas.',
    native: 'Tu idioma',
    nativeHint: 'Las traducciones y las definiciones se muestran en este idioma, cuando el video y el diccionario lo tienen.',
    definitions: 'Definiciones en',
    definitionsHint: 'El diccionario no tiene definiciones en tu idioma, así que se muestran en este.',
    definitionsHintFor: (language: string): string =>
      `El diccionario no tiene definiciones en ${language}, así que se muestran en este idioma.`,
    definitionsHintOwn: (language: string): string =>
      `Las palabras que no tiene el diccionario en ${language} se explican en este idioma.`,

    // Búsqueda de palabras
    lookupHeading: 'Búsqueda de palabras',
    lookupAbout: 'Elige cómo y cuándo se buscan las palabras.',
    interaction: 'Modo de búsqueda',
    interactionHover: 'Pasar el cursor',
    interactionShift: 'Pasar el cursor con Shift',
    interactionClick: 'Hacer clic',
    interactionHint: 'Hacer clic en una palabra también funciona siempre.',
    hoverPause: 'Pausar al buscar',
    hoverPauseHint: 'Pausa el video mientras el cursor está sobre una palabra.',
    sidebarHover: 'Definiciones rápidas en la transcripción',
    sidebarHoverHint: 'Muestra una definición breve al pasar el cursor por una palabra de la transcripción.',

    // Ventana emergente
    popupHeading: 'Ventana emergente',
    popupAbout: 'Elige qué muestra la ventana emergente al buscar una palabra.',
    cardDeckMenu: 'Menú de mazos',
    cardDeckMenuHint: 'Añade un ▾ junto a Añadir a Anki para elegir otro mazo. Las tarjetas nuevas irán a ese mazo.',
    cardHideAdd: 'Ocultar Añadir a Anki',
    cardHideAddHint: 'Quita de la tarjeta el botón Añadir a Anki y el menú de mazos que lo acompaña.',
    cardKanji: 'Desglose de kanji',
    cardKanjiHint: 'Muestra los significados y las lecturas de cada kanji.',
    cardHanzi: 'Desglose de caracteres',
    cardHanziHint: 'Muestra los significados y las lecturas de cada carácter.',
    lookupElsewhere: 'Ejemplos de este video',
    lookupElsewhereHint: 'Muestra otras oraciones de este video que usan la palabra. Haz clic en una para reproducirla.',

    // Subtítulos
    subtitlesHeading: 'Subtítulos',
    subtitlesAbout: 'Ajusta cómo se ven los subtítulos en el video.',
    ruby: 'Furigana',
    rubyUnknown: 'Palabras nuevas',
    rubyAlways: 'Todas',
    rubyNever: 'Desactivado',
    rubyHint: 'Lecturas sobre los kanji. Pulsa R para cambiar mientras ves el video.',
    pinyin: 'Pinyin',
    pinyinHint: 'Lecturas sobre los caracteres. Pulsa R para cambiar mientras ves el video.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Lecturas sobre los caracteres. Pulsa R para cambiar mientras ves el video.',
    blurPrimary: 'Desenfocar subtítulos',
    blurPrimaryHint:
      'Para practicar la comprensión auditiva: los subtítulos se quedan desenfocados hasta que pasas el cursor por encima. ' +
      'Pulsa H para cambiar.',
    showSubtitles: 'Subtítulos en el video',
    showSubtitlesHint: 'Dibuja los subtítulos sobre el video. Desactivado, quedan la barra superior, la transcripción y el panel. El botón de la barra recorre: traducción fuera, subtítulos fuera, y ambos de nuevo; ↑ hace lo mismo.',
    subtitleSize: 'Tamaño del texto',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Se adapta al reproductor, así que se ve igual en pantalla completa.',
    subtitleBottom: 'Posición',
    subtitleBottomLowest: 'Muy baja',
    subtitleBottomLow: 'Baja',
    subtitleBottomNormal: 'Normal',
    subtitleBottomRaised: 'Algo alta',
    subtitleBottomHigh: 'Alta',
    subtitleBottomHighest: 'Muy alta',
    subtitleBottomHint:
      'A qué altura se colocan los subtítulos. Otra extensión de subtítulos en el mismo reproductor queda debajo de ellos.',
    dualSubtitles: 'Mostrar traducción',
    dualSubtitlesHint:
      'Muestra subtítulos en tu idioma debajo de los del idioma que aprendes. Vienen del sitio, ' +
      'no de una traducción automática, y necesitan la transcripción completa del video.',
    singleKeys: 'Atajos de una tecla',
    singleKeysHint:
      'Las teclas de letras como A y R funcionan solas mientras ves el video. Desactivado: mantén pulsadas Alt y Shift con ellas. ' +
      'Las teclas de flecha funcionan en ambos casos.',

    // Subrayado
    underlinesHeading: 'Subrayado',
    underlinesAbout: 'Cada color indica cuánto conoces una palabra. Haz clic en uno para cambiarlo.',
    colorUnknown: 'Palabras nuevas',
    colorUnknownHint: 'Palabras sin tarjeta en Anki.',
    colorLearning: 'En aprendizaje',
    colorLearningHint: 'Palabras con una tarjeta que aún no es madura.',
    colorTracking: 'Seguidas',
    colorTrackingHint: 'Palabras que sigues.',
    colorKnown: 'Conocidas',
    colorKnownHint: 'Palabras con una tarjeta madura o marcadas como conocidas.',
    underlines: 'Subrayar palabras',
    underlinesHint: 'Desactívalo para ver subtítulos simples, sin colores bajo las palabras.',
    markKnown: 'Subrayar palabras conocidas',
    markKnownHint: 'Desactivado por defecto, para que la pantalla se vea más limpia a medida que aprendes.',
    underlineGrammar: 'Subrayar artículos y pronombres',
    underlineGrammarHint: 'Desactivado por defecto: palabras como «el», «yo» y «él» se pueden seguir consultando, pero no cuentan como palabras por aprender.',
    defaultColours: 'Colores predeterminados',
    resetColours: 'Restablecer',

    // Transcripción
    transcriptHeading: 'Transcripción',
    transcriptAbout: 'El panel junto al video con todas las líneas de subtítulos.',
    sidebarFollow: 'Desplazamiento automático',
    sidebarFollowHint: 'Mantiene visible la línea actual. Si te desplazas tú, se pausa; un botón lo reanuda.',
    headerBar: 'Mostrar el encabezado',
    headerBarHint: 'Aparece en la parte superior del video cuando acercas el cursor.',
    languageBadge: 'Indicador de idioma',
    languageBadgeFlag: 'Bandera',
    languageBadgeCode: 'Código',
    badgeFlag: 'Bandera del indicador',
    badgeFlagDefault: 'Predeterminada',
    flagSearch: 'Buscar…',
    flagSearchLabel: 'Buscar países',
    flagSuggested: 'Sugeridos',
    flagAll: 'Todos los países',
    flagNone: (query: string): string => `Ningún país coincide con “${query}”.`,
    badgeFlagHint: 'La bandera que se muestra para el idioma que aprendes. Cada idioma guarda la suya.',
    languageBadgeHint: 'Cómo muestra el encabezado el idioma que aprendes.',
    sidebarStats: 'Contar palabras nuevas',
    sidebarStatsHint:
      'Muestra cuántas palabras nuevas tiene cada línea, tu porcentaje de palabras conocidas y los filtros que usan esos datos.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Conecta Anki, elige adónde van las tarjetas nuevas y qué mazos cuentan para las palabras que conoces.',
    deck: 'Mazo para tarjetas nuevas',
    deckHint: 'El mazo al que se añade cada tarjeta nueva.',
    statusScope: 'Leer palabras conocidas de',
    statusScopeHint: 'Las tarjetas de estos mazos deciden qué palabras se subrayan. Incluye los submazos.',
    marksInAnki: 'Guardar marcas en Anki',
    marksInAnkiHint:
      'Guarda Conocida, Seguir e Ignorar como notas ocultas en Anki (Libregaku::Marks) para que se sincronicen con tus ' +
      'otros dispositivos. Desactivado: se quedan en este navegador.',

    // Los menús de mazos
    wholeCollection: 'Colección completa',
    chooseDeck: 'Elige un mazo…',
    deckNotInAnki: (deck: string): string => `${deck} (no está en Anki)`,
    deckAndSubdecks: (deck: string): string => `${deck} (y submazos)`,
    deckUnset: 'Elige un mazo. No se pueden añadir tarjetas hasta que lo hagas.',
    deckMissing: (deck: string): string => `Anki ya no tiene un mazo llamado “${deck}”. Elige otro.`,
    statusScopeMissing: (deck: string): string =>
      `Anki ya no tiene un mazo llamado “${deck}”, así que todas las palabras aparecen como nuevas. Elige otro.`,
    statusScopeOutside: (deck: string): string =>
      `Las tarjetas nuevas van a “${deck}”, que no está incluido aquí, así que las palabras que añadas seguirán ` +
      'subrayadas como nuevas. Elige un mazo que lo contenga o Colección completa.',

    // El estado de Anki
    ankiChecking: 'Comprobando…',
    ankiConnected: 'Conectado.',
    noteTypeInstalled: 'Tipo de nota instalado.',
    cardsMade: (n: number): string => `${cards(n)} creada${n === 1 ? '' : 's'} con Libregaku.`,
    noCards: 'Aún no hay tarjetas.',
    cardsFlushed: (n: number): string =>
      n === 1
        ? 'Se añadió 1 tarjeta creada mientras Anki estaba cerrado.'
        : `Se añadieron ${n} tarjetas creadas mientras Anki estaba cerrado.`,
    cardsNotFlushed: (n: number, error: string): string =>
      n === 1 ? `No se pudo añadir 1 tarjeta: ${error}` : `No se pudieron añadir ${n} tarjetas: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} pendiente${n === 1 ? '' : 's'} de añadir.`,
    ankiOffline: (port: number): string =>
      `Anki no responde en el puerto ${port}. Es normal mientras está cerrado: ` +
      'las tarjetas nuevas esperan aquí y se añaden cuando se abre.',
    ankiBlocked: 'Anki está abierto, pero AnkiConnect aún no permite esta extensión.',
    ankiOccupied: (detail: string): string => `${detail} Cierra el programa que lo usa para que Anki pueda usarlo.`,

    // Los botones de Anki
    checkAgain: 'Volver a comprobar',
    newDeck: 'Nuevo mazo',
    openCards: 'Ver tarjetas en Anki',
    openMarks: 'Ver marcas en Anki',
    newDeckPrompt: 'Ponle nombre al nuevo mazo. Usa :: para un submazo, como en Japonés::Netflix',

    // Conectar Anki
    installStep: 'Instala Anki en este equipo y ábrelo. {link}',
    getAnki: 'Descargar Anki',
    addonStep: 'En Anki, ve a {menu}, pega este código y reinicia Anki.',
    addonMenu: 'Herramientas → Complementos → Descargar complementos…',
    aboutAnkiConnect: 'Acerca de AnkiConnect',
    originStep: 'En Anki, ve a {menu}, añade esta línea a {setting} y reinicia Anki.',
    originMenu: 'Herramientas → Complementos → AnkiConnect → Configuración',
    runningStep: 'Mantén Anki abierto mientras ves videos. Las tarjetas van directamente a Anki en este equipo.',
    copy: 'Copiar',
    copyValue: (value: string): string => `Copiar ${value}`,
    copied: 'Copiado',
    copyFailed: 'Selecciónalo',

    // Tarjetas de Anki
    ankiCardsHeading: 'Tarjetas de Anki',
    ankiCardsAbout: 'Elige qué se añade a cada tarjeta nueva, además de la palabra, la lectura, el significado y la oración.',
    cardAudio: 'Audio de la palabra',
    cardAudioHint: 'Una grabación de la palabra, si existe. Nunca una voz sintética.',
    cardSentenceAudio: 'Audio de la oración',
    cardSentenceAudioHint: 'Graba la oración reproduciéndola una vez más. En los sitios protegidos, necesita el permiso de abajo.',
    cardScreenshot: 'Captura de pantalla',
    cardScreenshotHint: 'Un fotograma de la escena. No está disponible en los sitios protegidos, que lo bloquean.',
    capture: 'Audio de la oración en sitios protegidos',
    captureAllow: 'Permitir',
    captureAllowInSettings: 'Permitir en la configuración',
    captureRemove: 'Quitar',
    captureAllowed:
      'Permitido. En cada pestaña de un sitio protegido, haz clic en el icono de Libregaku y elige Grabar audio de la oración aquí.',
    captureNeeded:
      'Los sitios protegidos cifran su video, así que el audio de la oración se graba desde la pestaña. Para ello necesita tu permiso.',

    // Datos y licencias
    creditsHeading: 'Datos y licencias',
    creditJmdict:
      'Datos del diccionario y de kanji © Electronic Dictionary Research and Development Group, con licencia ' +
      'CC BY-SA 4.0. Reempaquetados en JSON por jmdict-simplified.',
    creditLindera:
      'Divide el japonés, el coreano y el chino en palabras. Licencia MIT; IPADIC, UniDic, mecab-ko-dic y CC-CEDICT tienen ' +
      'sus propias condiciones.',
    creditCedict: 'Diccionario de chino © MDBG y sus colaboradores, con licencia CC BY-SA 4.0.',
    creditWiktionary: 'Diccionarios de la mayoría de los idiomas, y algunos en tu propio idioma, de Wiktionary a través de kaikki.org y wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Palabras coreanas explicadas en tu propio idioma. © National Institute of Korean Language, con licencia ' +
      'CC BY-SA 2.0 KR. Archivos creados por Lyroxide.',
    creditCfdict: 'Chino explicado en francés. CFDICT © chine.in, mantenido al día por CxDICT. CC BY-SA 4.0.',
    creditCanto:
      'Diccionario de cantonés y lecturas en Jyutping para CC-CEDICT. © Pleco Inc., con licencia CC BY-SA 3.0.',
    creditHandedict: 'Chino explicado en alemán. © HanDeDict y sus colaboradores, con licencia CC BY-SA 3.0.',
    creditWikdict: 'Algunos diccionarios en tu propio idioma, creados por Karl Bartel a partir de las traducciones de Wiktionary mediante DBnary. CC BY-SA 4.0.',
    creditUnihan: 'Qué lectura de un carácter chino se muestra primero. © Unicode, Inc., con la Unicode License.',
    creditTatoeba:
      'Qué verbo es un verbo japonés escrito en kana, aprendido de estas frases de ejemplo. © Colaboradores de Tatoeba, con CC BY 2.0 FR.',
    creditJotoba: 'Se usan para las búsquedas mientras se descarga el diccionario. Ambos usan JMdict.',
    creditLucide: 'Iconos. Licencia ISC.',
    creditCommons: 'Grabaciones de palabras, hechas por voluntarios. Cada una tiene su propia licencia, CC BY-SA 4.0 en la mayoría, que se indica junto al hablante al reproducirla y en la tarjeta.',
    creditAudioCmn: 'Grabaciones de palabras en chino de Yue Tan, Universidad de Caen. CC BY-SA 3.0 US.',
    creditNaver: 'Grabaciones de palabras en coreano de Naver Dictionary, que solo suenan en la tarjeta de consulta. No tienen licencia para reutilizarse, así que nunca van en una tarjeta.',
    creditSpanishdict: 'Voz generada para palabras en español de SpanishDict, que suena con el botón de pronunciación cuando no hay grabación. No tiene licencia para reutilizarse, así que nunca va en una tarjeta.',
    licence: 'Libregaku tiene licencia MIT. Los datos de los diccionarios se descargan de sus fuentes; no vienen incluidos.',
    built: (when: string): string => `Esta copia se compiló el ${when}.`,

    // Combinaciones de teclas
    keyLine: 'Línea anterior o siguiente',
    keyReplay: 'Repetir la línea',
    keyTranslation: 'Mostrar u ocultar la traducción',
    keyShiftLookup: 'Mantener pulsado para buscar la palabra bajo el cursor',
    keyAdd: 'Añadir a Anki la palabra de la ventana emergente',
    keyKnown: 'Marcar como conocida la palabra de la ventana emergente',
    keyFurigana: 'Cambiar el furigana: desactivado, palabras nuevas, todas',
    keyPinyin: 'Cambiar el pinyin: desactivado, palabras nuevas, todas',
    keyJyutping: 'Cambiar el Jyutping: desactivado, palabras nuevas, todas',
    keyBlur: 'Desenfocar o enfocar los subtítulos',
    keySave: 'Guardar la línea actual',
    keyTranscript: 'Mostrar u ocultar el panel de transcripción',
    keyClose: 'Cerrar la ventana emergente',
  },

  options: {
    pageTitle: 'Configuración de Libregaku',
    help: 'Ayuda',
    searchSettings: 'Buscar…',
    noSettingsFound: 'No hay nada sobre “{q}”.',
    contentsLabel: 'Secciones de la configuración',
    settingsLabel: 'Configuración',
    setupHeading: 'Primeros pasos',
    setupAbout: 'Dos decisiones; todo lo demás ya tiene un valor predeterminado razonable.',
    stepLanguages: 'Elige qué idioma aprendes',
    stepAnki: 'Conecta Anki y elige un mazo para las tarjetas nuevas',
    ankiOptional:
      'Anki es opcional: los subtítulos, las búsquedas y el furigana funcionan sin él. ' +
      'Anki es lo que recuerda qué palabras ya conoces.',
    nextSteps:
      'Después, abre un video con subtítulos en el idioma que aprendes y pasa el cursor sobre una palabra. ' +
      'El botón del teclado del panel de transcripción muestra las combinaciones de teclas.',
    stepDone: 'Completado',
    confirmLanguages: 'Estos idiomas son correctos',
    keepDeck: (deck: string): string => `Usar ${deck} para las tarjetas nuevas`,
  },

  action: {
    help: 'Ayuda',
    settings: 'Configuración',
    settingsTip: 'Toda la configuración',
    checkingPage: 'Comprobando esta página…',
    notActive:
      'No está activo en esta página. Abre un video en YouTube, Netflix u otro sitio compatible. Si acabas de instalar o recargar Libregaku, ' +
      'recarga la pestaña.',
    unsupported: 'Libregaku funciona en YouTube, Netflix, Disney+, Prime Video, HBO Max, Apple TV y Viki.',
    worksOn: (site: string): string => `Libregaku funciona en ${site}.`,
    waitingForSubtitles: (site: string): string =>
      `Esperando los subtítulos de ${site}. Asegúrate de que estén activados.`,
    activeOn: (title: string): string => `Activo: ${title}`,
    active: 'Activo en este video.',
    subtitlesTrack: 'Subtítulos',
    translationTrack: 'Traducción',
    noTranslation: 'Ninguna',
    generatedTrack: (track: string): string => `${track} (automático)`,
    captureNeedsPermission: 'Para grabar aquí el audio de la oración hace falta permiso para capturar el sonido de esta pestaña.',
    captureAllowInSettings: 'Permitir en la configuración',
    captureReady: 'El sonido de los sitios protegidos solo se puede grabar después de activar la grabación en esta pestaña.',
    captureStart: 'Grabar audio de la oración aquí',
    captureFailed: 'Chrome no pudo grabar esta pestaña.',
    toggleSidebar: 'Alternar barra lateral',
    ankiChecking: 'Anki: comprobando…',
    ankiConnected: (n: number): string => `Anki conectado · ${cards(n)} de Libregaku`,
    ankiOffline: 'Anki no está abierto: las palabras aparecen como nuevas',
    ankiOccupied: (port: number): string =>
      `Otro programa está usando el puerto ${port}, así que no se puede conectar con Anki`,
    ankiBlocked: 'Anki rechazó esta extensión; en Configuración está la línea que hay que añadir',
    ankiBusy: 'Anki no respondió; puede que esté sincronizando',
    ankiRefused: 'Anki rechazó la solicitud',
    cardsToAdd: (n: number): string => `${cards(n)} por añadir`,
    cardsWaiting: (n: number): string => `${cards(n)} esperando a Anki`,
  },

  sidebar: {
    panelLabel: 'Panel de transcripción',
    resizeLabel: 'Cambiar el tamaño del panel',

    // Las pestañas y los botones de al lado
    tabsLabel: 'Listas',
    transcriptTab: 'Transcripción',
    savedTab: 'Guardadas',
    settings: 'Configuración',
    shortcuts: 'Combinaciones de teclas',
    close: 'Cerrar',
    closeLabel: 'Cerrar el panel',
    openTip: 'Transcripción',
    openLabel: 'Mostrar la transcripción',
    help: 'Ayuda',

    // Buscar en la transcripción
    searchPlaceholder: 'Buscar en la transcripción…',
    searchLabel: 'Buscar en la transcripción',
    noMatches: 'Sin resultados',
    matchAt: (at: number, total: number): string => `${at} de ${total}`,
    matchesFound: (n: number): string => `${n} resultado${n === 1 ? '' : 's'}`,

    // El filtro
    filterTip: 'Filtrar',
    filterLabel: 'Filtrar líneas',
    filterAll: 'Todas las líneas',
    filterAllAbout: 'Todas las líneas, sin filtrar',
    filterNew: 'Con palabras nuevas',
    filterNewAbout: 'Líneas con alguna palabra de la que no tienes tarjeta',
    filterReady: 'Listas para aprender',
    filterReadyAbout: 'Líneas con una sola palabra nueva para ti: las más fáciles para aprender',
    filterSaved: 'Guardadas',
    filterSavedAbout: 'Líneas guardadas para después',

    // La transcripción
    partial: 'Se completa mientras ves el video: este reproductor solo da acceso a la línea actual.',
    partialEmpty: 'Aún no hay nada. Las líneas aparecen aquí a medida que se dicen.',
    empty: 'No hay ninguna transcripción cargada.',
    currentLine: 'Línea actual',
    lineNew: (n: number): string => `${n} nueva${n === 1 ? '' : 's'}`,
    playFrom: (time: string): string => `Reproducir desde ${time}`,
    saveLine: 'Guardar línea',
    unsave: 'Quitar de guardadas',
    addSentence: 'Añadir oración',
    addSentenceLabel: 'Añadir la oración a Anki',

    // El resumen sobre la transcripción: una etiqueta y su número, que vale para cualquier cantidad
    knownPercent: (n: number): string => percent(n),
    summaryKnown: 'Conocidas: {n}',
    summaryNew: 'Nuevas: {n}',
    summaryReady: 'Listas para aprender: {n}',
    counting: (n: number): string => `Contando palabras nuevas… ${percent(n)}`,
    countFailed: 'No se pudieron contar algunas líneas, así que no hay totales.',

    // La definición rápida
    dictionaryLoading: (n: number): string => `Cargando el diccionario: ${percent(n)}`,
    dictionaryUnavailable: 'Diccionario no disponible',
    noEntry: 'No está en el diccionario.',

    // Guardadas
    savedEmpty:
      'Aún no hay nada guardado. Usa el marcador de cualquier línea de la transcripción, o pulsa B, para guardar ' +
      'una oración a la que quieras volver.',
    thisVideo: 'este video',
    openAt: (time: string): string => `Abrir el video en ${time}`,
    remove: 'Quitar',
    removeLabel: 'Quitar de guardadas',
    copySavedAbout: 'Copia todas las líneas guardadas como texto separado por tabulaciones',
    exportSavedAbout: 'Guarda un archivo separado por tabulaciones que Anki puede importar',
    addSavedAbout: 'Crea una tarjeta con cada línea guardada',
    linesCopied: (n: number): string => (n === 1 ? '1 línea copiada.' : `${n} líneas copiadas.`),
    chooseDeck: 'Primero elige un mazo en Configuración: ahí van las tarjetas nuevas.',
    checkingAnki: 'Comprobando Anki…',
    ankiOffline: 'Anki no está abierto. Ábrelo y vuelve a intentarlo; los pasos están en Configuración.',
    ankiBlocked: 'AnkiConnect aún no permite esta extensión. En Configuración está la línea que hay que añadir.',
    ankiUnreachable: 'No se pudo conectar con Anki. En Configuración se explica por qué.',
    adding: (at: number, total: number): string => `Añadiendo ${at} de ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${cards(added)} añadida${added === 1 ? '' : 's'} a ${deck}` +
      `${already ? `; ${already} ya estaba${already === 1 ? '' : 'n'} allí` : ''}.`,

    // Botones y mensajes de Guardadas y Palabras
    copy: 'Copiar',
    exportFile: 'Exportar archivo',
    addToAnki: 'Añadir a Anki',
    noClipboard: 'No se pudo acceder al portapapeles.',
    downloaded: 'Guardado en tus descargas. En Anki: Archivo → Importar.',
    downloadBlocked: 'Esta página bloqueó la descarga; usa Copiar.',

    // Palabras
    listsLabel: 'Qué lista',
    listLines: 'Líneas',
    listTracked: 'Seguidas',
    listKnown: 'Conocidas',
    listIgnored: 'Ignoradas',
    findPlaceholder: 'Buscar…',
    findLabel: 'Buscar en esta lista',
    copyWordsAbout: 'Copia esta lista como texto separado por tabulaciones',
    exportWordsAbout: 'Guarda esta lista en un archivo separado por tabulaciones que Anki puede importar',
    wordsCopied: (n: number): string => (n === 1 ? '1 palabra copiada.' : `${n} palabras copiadas.`),
    nothingToExport: 'No hay nada en esta lista para exportar.',
    lookingUp: 'Buscando lecturas y significados…',
    noWordMatches: (query: string): string => `Ninguna palabra de esta lista coincide con “${query}”.`,
    noLineMatches: (query: string): string => `Ninguna línea guardada coincide con “${query}”.`,
    wordsMatching: (shown: number, total: number): string => `${shown} de ${words(total)}.`,
    trackedEmpty:
      'Aún no sigues ninguna palabra. El botón Seguir subraya una palabra para que te fijes en ella, sin crear una ' +
      'tarjeta. Actívalo en Configuración, en Ventana emergente.',
    trackedIntro: (n: number): string =>
      n === 1
        ? 'Sigues 1 palabra, subrayada cada vez que aparece.'
        : `Sigues ${n} palabras, subrayadas cada vez que aparecen.`,
    stopTracking: 'Dejar de seguir',
    knownEmpty:
      'No hay palabras marcadas como conocidas. Cuando conozcas una palabra y no quieras una tarjeta, márcala como ' +
      'conocida desde su ventana emergente o pulsa K.',
    knownIntro: (n: number): string =>
      `${words(n)} marcada${n === 1 ? '' : 's'} como conocida${n === 1 ? '' : 's'}. ` +
      'Si desmarcas una, su estado vuelve a depender de tus tarjetas de Anki.',
    unmarkKnown: 'Desmarcar como conocida',
    ignoredEmpty:
      'No hay palabras ignoradas. Ignora nombres y sonidos desde su ventana emergente y nunca se subrayarán ni se contarán.',
    ignoredIntro: (n: number): string =>
      n === 1 ? '1 palabra que nunca se subraya ni se cuenta.' : `${n} palabras que nunca se subrayan ni se cuentan.`,
    stopIgnoring: 'Dejar de ignorar',
  },

  popup: {
    // La ventana y la palabra
    cardLabel: (word: string): string => `${word} (diccionario)`,
    commonBadge: 'común',
    nameBadge: 'probablemente un nombre',
    characterNames: { kanji: 'Kanji', hanzi: 'Caracteres' },
    partOfSpeech: {
      n: 'sustantivo', 'n-adv': 'sustantivo adverbial', 'n-t': 'sustantivo temporal', 'n-suf': 'sufijo nominal',
      'n-pref': 'prefijo nominal', pn: 'pronombre', 'adj-i': 'adjetivo -i', 'adj-na': 'adjetivo -na',
      'adj-no': 'adjetivo -no', 'adj-pn': 'adjetivo prenominal', adv: 'adverbio', 'adv-to': 'adverbio',
      aux: 'auxiliar', 'aux-v': 'verbo auxiliar', 'aux-adj': 'adjetivo auxiliar',
      conj: 'conjunción', cop: 'cópula', ctr: 'contador', exp: 'expresión', int: 'interjección',
      num: 'numeral', prt: 'partícula', pref: 'prefijo', suf: 'sufijo', unc: 'sin clasificar',
      vs: 'verbo suru', 'vs-i': 'verbo suru', 'vs-s': 'verbo suru', vt: 'transitivo', vi: 'intransitivo',
      v1: 'verbo ichidan', 'v1-s': 'verbo ichidan', vk: 'verbo kuru', vz: 'verbo zuru',
      v5b: 'verbo godan', v5g: 'verbo godan', v5k: 'verbo godan', 'v5k-s': 'verbo godan',
      v5m: 'verbo godan', v5n: 'verbo godan', v5r: 'verbo godan', 'v5r-i': 'verbo godan',
      v5s: 'verbo godan', v5t: 'verbo godan', v5u: 'verbo godan', 'v5u-s': 'verbo godan',
      v5aru: 'verbo godan',
      // Los códigos de Wiktionary, para palabras coreanas y españolas.
      name: 'nombre propio', v: 'verbo', adj: 'adjetivo', pron: 'pronombre', det: 'determinante', artic: 'artículo',
      counter: 'contador', prep: 'preposición', 'prep-phrase': 'locución preposicional', ptcl: 'partícula',
      intj: 'interjección', phrase: 'locución', prov: 'refrán', r: 'raíz', char: 'carácter', adn: 'adnominal',
      ptcpl: 'participio', contr: 'contracción', masc: 'masculino', fem: 'femenino', neut: 'neutro', sg: 'singular',
      pl: 'plural', 'pl-only': 'solo plural', count: 'contable', uncount: 'incontable', vr: 'reflexivo',
      vdt: 'ditransitivo', impers: 'impersonal', irreg: 'irregular', reltnl: 'relacional', reltv: 'relativo',
      interr: 'interrogativo', poss: 'posesivo', dim: 'diminutivo', aug: 'aumentativo', onoma: 'onomatopéyico',
      idio: 'idiomático', fig: 'figurado', literal: 'literal', col: 'coloquial', inf: 'informal', fam: 'familiar',
      formal: 'formal', polite: 'cortés', lit: 'literario', poet: 'poético', rhet: 'retórico', sl: 'jerga',
      vulg: 'vulgar', derog: 'despectivo', offens: 'ofensivo', humor: 'humorístico', euph: 'eufemístico',
      child: 'infantil', net: 'Internet', neol: 'neologismo', cmn: 'común', uncmmn: 'poco común', rare: 'raro',
      dated: 'anticuado', arch: 'arcaico', obs: 'obsoleto', hist: 'histórico', 'non-std': 'no estándar',
      dialect: 'dialectal', regio: 'regional',
    },

    // Los botones bajo la palabra
    pronounce: 'Escuchar',
    playedRecording: (word: string): string => `${word} · grabación`,
    playedSynthesised: (word: string): string => `${word} · voz sintética`,
    recordingBy: (speaker: string, licence: string): string => `Grabación de ${speaker} · ${licence}`,
    pronounceFailed: 'no se pudo reproducir el audio',
    addSentence: 'Añadir oración',
    sentenceAdded: 'Oración añadida',
    undo: 'Deshacer',
    copyWord: 'Copiar palabra',
    copyPhrase: 'Copiar frase',
    copySentence: 'Copiar oración',
    wordCopied: 'palabra copiada',
    phraseCopied: 'frase copiada',
    sentenceCopied: 'oración copiada',
    copyFailed: 'no se pudo copiar; selecciona el texto',

    // Los significados
    dictionaryLoading: (n: number): string =>
      `El diccionario aún se está cargando (${percent(n)}). Inténtalo de nuevo en un momento.`,
    dictionaryUnavailable: (error: string): string => `Diccionario no disponible: ${error}`,
    noEntry: 'Esta palabra no está en el diccionario.',
    noEntryName: 'Un nombre, por eso no tiene entrada en el diccionario.',
    moreMeanings: (n: number): string => `+${n} significado${n === 1 ? '' : 's'} más`,

    // Otras líneas del video con la palabra
    elsewhereCount: (n: number): string => (n === 1 ? 'Una vez más en este video' : `${n} veces más en este video`),
    playLine: 'Reproducir',
    elsewhereMore: (n: number): string => `y ${n} más; la búsqueda de la transcripción las encuentra todas`,
    showAllInTranscript: 'Ver todas en la transcripción',

    // Añadir a Anki
    addToAnki: 'Añadir a Anki',
    addToDeck: (deck: string): string => `Añadir a ${deck}`,
    adding: 'Añadiendo…',
    undoing: 'Deshaciendo…',
    added: 'Añadida',
    addedUndo: 'Añadida: deshacer',
    inAnki: 'En Anki',
    showInAnki: 'Ver en Anki',
    waiting: 'En espera',
    waitingForAnki: 'Esperando a Anki',
    goesInWhenAnkiOpens: 'Se añadirá a Anki cuando se abra',
    alreadyAdded: 'Ya añadida',
    alreadyInAnki: 'Ya está en Anki',
    waitingForAnkiToOpen: 'Esperando a que se abra Anki',
    addedWithWarning: (said: string, warning: string): string => `${said}; ${warning}`,

    // El menú de mazos
    otherDecks: 'Otros mazos',
    addToAnotherDeck: 'Añadir a otro mazo',
    decksUnknown: 'Anki no responde, así que aún no se sabe qué mazos tiene.',
    newDeck: 'Nuevo mazo…',
    newDeckPrompt: 'Nuevo mazo. Usa :: para un submazo, como en Japonés::Netflix',

    // Las marcas
    knownButton: 'Conocida',
    trackButton: 'Seguir',
    ignoreButton: 'Ignorar',
    markKnownTip: 'Marcar como conocida',
    trackTip: 'Seguir',
    ignoreTip: 'Ignorar',
    unmarkKnownTip: 'Desmarcar como conocida',
    stopTrackingTip: 'Dejar de seguir',
    stopIgnoringTip: 'Dejar de ignorar',
  },

  header: {
    knownStat: 'Conocidas: {percent}',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Palabras que conoces',
    readyStat: 'Listas para aprender: {count}',
    readyTip: 'Líneas con una palabra nueva',
    blurSubtitle: 'Desenfocar subtítulo',
    unblurSubtitle: 'Enfocar subtítulo',
    showTranslation: 'Mostrar traducción',
    hideTranslation: 'Ocultar traducción',
    hideSubtitles: 'Ocultar subtítulos',
    showSubtitles: 'Mostrar subtítulos',
    subtitles: 'Subtítulos',
    translation: 'Traducción',
    transcript: 'Transcripción',
    pinHeader: 'Fijar encabezado',
    unpinHeader: 'No fijar encabezado',
    settings: 'Configuración',
    showHeader: 'Mostrar encabezado',
  },

  player: {
    // Las teclas del reproductor
    lastLine: 'Era la última línea',
    noLineBefore: 'No hay ninguna línea anterior',
    translationOn: 'Traducción activada',
    translationOff: 'Traducción desactivada',
    subtitlesOff: 'Subtítulos desactivados',
    subtitlesOn: 'Subtítulos activados',
    blurOn: 'Subtítulo desenfocado hasta que pases el cursor por encima',
    blurOff: 'Subtítulo visible',
    lineSaved: 'Línea guardada',
    lineUnsaved: 'Línea quitada de guardadas',
    lookUpFirst: 'Primero busca una palabra',
    alreadyKnown: (word: string): string => `${word} · ya es conocida en Anki`,
    alreadyInAnki: (word: string): string => `${word} · ya está en Anki`,
    adding: (word: string): string => `Añadiendo ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Las marcas
    markOff: (word: string): string => `${word} · marca quitada`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'marcada como conocida', tracking: 'seguida', ignored: 'ignorada', unknown: 'marcada como nueva',
      }[status];
      if (refused) return `${word} · ${done}, sin tarjeta. Anki rechazó la marca; se volverá a intentar más tarde`;
      return `${word} · ${done}, sin tarjeta${status === 'tracking' ? '. Mírala en la pestaña Guardadas del panel' : ''}`;
    },

    // La tarjeta de una palabra
    pickDeck: 'Primero elige un mazo en la configuración de Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `añadida a ${deck}, sin ${without(missing)}` : `añadida a ${deck}`,
    alreadyIn: (deck: string): string => `ya está en ${deck}`,
    queued: (deck: string): string => `Anki está cerrado: se añadirá a ${deck} cuando se abra`,
    alreadyQueued: 'ya está esperando a Anki',
    notKept: 'Anki está cerrado y el navegador no pudo guardar la tarjeta para después',
    takenBack: (deck: string): string => `quitada de ${deck}`,
    unqueued: 'ya no espera a Anki',
    alreadySent: 'Ya se añadió a Anki',
    queueSent: (count: number): string =>
      `Anki está abierto: ${count === 1 ? 'se añadió la tarjeta pendiente' : `se añadieron ${count} tarjetas pendientes`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `las palabras que conoces se leen de ${scope}, así que las tarjetas de ${deck} no contarán`,

    // La tarjeta de una oración
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `oración añadida a ${deck}, sin ${without(missing)}` : `oración añadida a ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `la oración ya está en ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'su sonido', picture && 'su imagen'].filter(Boolean);
      return `Anki está cerrado: la oración se añadirá a ${deck} cuando se abra` +
        `${lacking.length ? `, sin ${lacking.join(' ni ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'la oración ya está esperando a Anki',
    sentenceTakenBack: (deck: string): string => `oración quitada de ${deck}`,

    // El audio de la oración
    recording: 'Grabando la línea…',

    // Búsquedas
    noDictionary: 'aún no hay diccionario para este idioma.',
  },

  notices: {
    // La tarjeta
    unexpected: 'Libregaku encontró un problema inesperado.',
    dismiss: 'Descartar',

    // YouTube o Netflix cambiaron algo
    youtubeTrackList: 'No se pudo leer la lista de subtítulos de YouTube.',
    youtubeTrackShape: 'Los datos de subtítulos de YouTube no tienen el formato esperado.',
    youtubeCaptionText: 'No se encontró el texto de los subtítulos de YouTube en la página.',
    youtubePlayerTrackList: 'No se pudo leer la lista de subtítulos de este video desde el reproductor de YouTube.',
    netflixTrackList: 'No se pudo leer la lista de subtítulos de Netflix.',
    netflixCaptionText: 'No se encontró el texto de los subtítulos de Netflix en la página.',
    disneyTrackList: 'No se pudo leer la lista de subtítulos de Disney+.',
    appleTrackList: 'No se pudo leer la lista de subtítulos de Apple TV.',
    appleTiming: 'No se pudieron alinear los subtítulos de Apple TV con el video.',
    disneyCaptionText: 'No se encontró el texto de los subtítulos de Disney+ en la página.',
    primeTrackList: 'No se pudo leer la lista de subtítulos de Prime Video.',
    primeCaptionText: 'No se encontró el texto de los subtítulos de Prime Video en la página.',
    maxTrackList: 'No se pudo leer la lista de subtítulos de HBO Max.',
    maxCaptionText: 'No se encontró el texto de los subtítulos de HBO Max en la página.',
    vikiTrackList: 'No se pudo leer la lista de subtítulos de Viki.',
    vikiCaptionText: 'No se encontró el texto de los subtítulos de Viki en la página.',
    netflixBlocked: 'Netflix bloqueó la parte de Libregaku que lee los subtítulos.',

    // Los subtítulos de este video
    subtitlesOff: 'Activa los subtítulos en el reproductor y Libregaku los detectará.',
    trackNotSent: 'El reproductor aún no ha cargado estos subtítulos.',
    noTargetTrack: 'Aquí no hay subtítulos en el idioma que aprendes.',
    noSecondTrack: 'Aquí no hay subtítulos en tu idioma, así que no hay segunda línea.',
    onlyOneTrack: 'Este video solo tiene una pista de subtítulos, así que no hay segunda línea.',
    autoGenerated: 'Estos subtítulos son automáticos, así que el texto y la separación de palabras serán imprecisos.',
    noSubtitles: 'Este video no tiene subtítulos.',
    secondTrackFailed: 'No se pudo cargar la segunda línea.',

    // Las partes de la extensión
    analyserUnavailable:
      'Las lecturas y las formas de diccionario están desactivadas porque el analizador del idioma no se cargó. ' +
      'Las palabras solo coinciden con tus tarjetas si se escriben exactamente igual.',
    markNotSaved: 'No se pudo guardar esa marca. Se aplica hasta que recargues la página; después se perderá.',
    marksNotSynced: 'No se pudieron guardar tus marcas en Anki. Se conservan en este navegador y se volverá a intentar.',
    cardsNotAdded:
      'Anki no aceptó algunas de las tarjetas guardadas mientras estaba cerrado. Siguen guardadas y se volverá a intentar.',
    extensionReloaded: 'Libregaku se actualizó o se reinició. Vuelve a cargar esta pestaña para buscar palabras de nuevo.',

    // Detalles
    playerNeverLoaded: 'El reproductor no terminó de cargarse.',
    subtitlesMaybeOff: 'Puede que los subtítulos simplemente estén desactivados en el reproductor.',
    lookedFor: (selector: string): string => `Se buscó ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Subtítulos de este video: ${languages.join(', ') || 'ninguno'}. ` +
      'Cambia el idioma que aprendes en la configuración o elige otro video.',
    onlyPictures: 'Este video solo los tiene como imágenes, no como texto, así que Libregaku no puede leerlos.',
    chooseInPlayer: (track: string): string => `Elige ${track} en el menú de subtítulos del reproductor y Libregaku los detectará.`,
    noHumanTrack: 'Este video no tiene ninguna pista escrita por una persona.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Subtítulos de este video: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'el analizador no se cargó',
  },

  anki: {
    // Conectar con AnkiConnect
    offline: (port: number): string => `No hay nada escuchando en el puerto ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Nada respondió en el puerto ${port} en ${seconds} s. ` +
      'Puede que Anki esté ocupado (sincronizando o mostrando un cuadro de diálogo) o que otro programa esté usando el puerto.',
    blocked: (origin: string): string =>
      `AnkiConnect rechazó ${origin}. En Anki: Herramientas → Complementos → AnkiConnect → Configuración, ` +
      'y añade esa línea a webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Algo en el puerto ${port} respondió con HTTP ${status}. AnkiConnect no responde así.`,
    notAnkiConnect: (port: number): string => `Algo que no es AnkiConnect está usando el puerto ${port}.`,
    noBackground: 'El proceso en segundo plano de la extensión no responde.',
    unreachable: 'No se puede conectar con Anki.',
    callFailed: 'Falló la llamada a AnkiConnect.',

    // Lo que Libregaku se niega a enviar
    notRelayed: (action: string): string => `Libregaku no envía “${action}” a AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku solo adjunta ${MEDIA_WHAT[media]} que haya descargado él mismo.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_THE[media]} de esta nota no tiene datos.`,
    mediaName: (prefix: string): string => `Los archivos que añade Libregaku se llaman ${prefix}…, y este no.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} necesita una lista de ${ids === 'notes' ? 'notas' : 'tarjetas'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Rechazado: ${count} de las ${ids === 'notes' ? 'notas' : 'tarjetas'} enviadas ` +
      `no ${count === 1 ? 'pertenece' : 'pertenecen'} a ninguna marca de Libregaku. ` +
      `Libregaku solo ${change === 'delete' ? 'borra' : change === 'suspend' ? 'suspende' : 'cambia las etiquetas de'} ` +
      'sus propias marcas' +
      (change === 'delete' ? ', y una tarjeta que haya creado en los últimos minutos y que no se haya estudiado.' : '.'),

    // Los tipos de nota de Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Al tipo de nota “${noteType}” de Anki le ${fields.length === 1 ? 'falta el campo' : 'faltan los campos'} ` +
      `${fields.join(', ')}, así que ${loses === 'cards' ? 'las tarjetas' : 'las notas'} ` +
      `${fields.length === 1 ? 'lo' : 'los'} perderían. ` +
      'Libregaku no cambiará un tipo de nota que quizá hayas editado: ' +
      `en Anki, ve a Herramientas → Administrar tipos de nota, cambia el nombre de “${noteType}” (o vuelve a añadir ` +
      'los campos) y luego pulsa Volver a comprobar: se instalará uno nuevo.',

    // Marcas y tarjetas en espera
    marksNotAdded: (count: number): string =>
      `Anki no añadió ${count} de las marcas. Siguen en cola y se volverá a intentar la próxima vez.`,
    marksNotStored: (cause: string): string => `El almacenamiento del navegador rechazó las marcas leídas de Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `No se pudo leer el almacenamiento del navegador: ${cause}`,
  },

  errors: {
    // Grabar el sonido de una pestaña
    captureNotAllowed: 'Primero permite el audio de la oración en este sitio desde la configuración de Libregaku.',
    captureRefused: 'Chrome no permitió capturar esta pestaña',

    // Una pista de subtítulos que no se cargó
    unknownTrack: (id: string): string => `pista desconocida ${id}`,
    trackNotSent: 'el reproductor aún no la ha cargado; elígela una vez en su menú de subtítulos',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `ningún formato de subtítulos funcionó: ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `ninguna URL de subtítulos funcionó: ${attempts.join('; ') || 'no había ninguna'}`,
    emptyAnswer: 'respuesta vacía',
    noCues: '0 líneas',
    noCuesParsed: '0 líneas al leerla',
    noAnswerWithin: (seconds: number): string => `sin respuesta en ${seconds} s`,

    // El nombre de una pista
    forcedTrack: (track: string): string => `${track} (forzados)`,

    // El diccionario y el analizador
    noAnswer: 'la extensión no responde; recarga la página para reiniciarla',
    analyserLoading: 'el analizador aún se está cargando',
    dictionaryLoading: 'el diccionario aún se está cargando',
    lookupFailed: 'la búsqueda falló',
  },

  grammar: {
    // Tiempo y cortesía
    past: 'pasado',
    polite: 'cortés',

    // Negación
    negative: 'negativo',
    'negative intent': 'volitiva negativa',
    without: 'sin hacer',

    // Condición
    conditional: 'condicional',
    whenever: 'cada vez que',

    // Quién lo hace, y si se puede
    passive: 'pasiva',
    'passive or potential': 'pasiva o potencial',
    potential: 'potencial',
    causative: 'causativa',

    // Deseo
    'want to': 'querer',
    'seems to want to': 'parece querer',
    'want someone to': 'querer que otro lo haga',

    // Apariencia y probabilidad
    seems: 'parece',
    'seems like': 'parece que',
    hearsay: 'según dicen',
    apparently: 'al parecer',
    probably: 'probablemente',
    might: 'tal vez',

    // Lo que debería pasar
    'ought to': 'debería',
    'supposed to': 'se supone que',
    'intends to': 'intención',

    // Obligación y permiso
    must: 'obligación',
    'must not': 'prohibición',
    "don't have to": 'sin obligación',
    may: 'permiso',

    // Órdenes y peticiones
    imperative: 'imperativo',
    volitional: 'volitiva',
    'polite command': 'orden cortés',
    please: 'petición',

    // Enlace con lo que sigue
    'te-form': 'forma て',
    listing: 'enumeración',
    while: 'mientras',
    because: 'porque',
    'even though': 'aunque',
    'in order to': 'para',
    'so that': 'para que',

    // Auxiliares tras la forma て
    ongoing: 'en curso',
    'resulting state': 'estado resultante',
    'completely, or regrettably': 'por completo, o con pesar',
    'in advance': 'de antemano',
    'try doing': 'probar',
    'going forward': 'hacia adelante',
    'coming to be': 'llegar a ser',
    'receive the favour': 'recibir el favor',
    'someone does for me': 'hacen por mí',
    'do for someone': 'hacer por otro',

    // Auxiliares tras la raíz
    'too much': 'demasiado',
    'easy to': 'fácil de',
    'hard to': 'difícil de',
    'start to': 'empezar a',
    'keep on': 'continuar',
    finish: 'terminar',
    again: 'de nuevo',
    'each other': 'mutuamente',
    completely: 'por completo',
    thoroughly: 'a fondo',
    around: 'de un lado a otro',
    'non-stop': 'sin parar',

    // Formas de una palabra en español
    or: 'o',
    'first-person': 'primera persona',
    'second-person': 'segunda persona',
    'third-person': 'tercera persona',
    singular: 'singular',
    plural: 'plural',
    masculine: 'masculino',
    feminine: 'femenino',
    present: 'presente',
    preterite: 'pretérito',
    imperfect: 'imperfecto',
    'imperfect-se': 'imperfecto (-se)',
    future: 'futuro',
    'conditional-mood': 'condicional',
    indicative: 'indicativo',
    subjunctive: 'subjuntivo',
    infinitive: 'infinitivo',
    gerund: 'gerundio',
    participle: 'participio',
    formal: 'formal',
    informal: 'informal',
    'with-tú': 'de tú',
    'with-vos': 'de vos',
    'vos-form': 'forma de vos',
    voseo: 'voseo',
    'second-person-semantically': 'de usted',
    accusative: 'con objeto directo',
    dative: 'con objeto indirecto',
    'object-first-person': 'objeto de primera persona',
    'object-second-person': 'objeto de segunda persona',
    'object-third-person': 'objeto de tercera persona',
    // These two always follow one of the three above, so they read "objeto de tercera persona singular".
    'object-singular': 'singular',
    'object-plural': 'plural',
    diminutive: 'diminutivo',
    augmentative: 'aumentativo',
    superlative: 'superlativo',
    alternative: 'variante',
    'alt-of': 'otra grafía',

    // Terminaciones coreanas
    honorific: 'honorífico',
    'future or guess': 'futuro o suposición',
    'formal polite': 'cortés formal',
    question: 'pregunta',
    but: 'pero',
    "let's": 'vamos a',
    plain: 'llano',
    'shall we, or I wonder': 'propuesta o duda',
    'I will': 'promesa',
    'just noticed': 'descubrimiento',
    'as you know': 'ya sabes',
    and: 'y',
    'because, or and then': 'causa o secuencia',
    'but, or given that': 'contraste o contexto',
    'even if': 'incluso si',
    whether: 'si… o no',
    'adverb form': 'forma adverbial',
    quoting: 'estilo indirecto',
    'used to': 'solía',
    topic: 'tema',
    subject: 'sujeto',
    object: 'objeto',
    possessive: 'posesivo',
    'come to': 'llegar a',
    when: 'cuando',
    modifier: 'modificador',
    'noun form': 'forma nominal',
    becomes: 'volverse',
    'have done before': 'experiencia previa',
    nominative: 'nominativo',
    genitive: 'genitivo',
    'accusative-case': 'acusativo',
    'dative-case': 'dativo',
    neuter: 'neutro',
    definite: 'definido',
    indefinite: 'indefinido',
    comparative: 'comparativo',
    strong: 'fuerte',
    weak: 'débil',
    mixed: 'mixto',
    'without-article': 'sin artículo',
    reflexive: 'reflexivo',
    'non-past': 'no pasado',
    dual: 'dual',
    jussive: 'yusivo',
    construct: 'estado constructo',
    'attached-and': 'y',
    'attached-so': 'así que, entonces',
    'attached-with': 'con, en, por',
    'attached-for': 'para, a',
    'attached-like': 'como',
    'attached-my': 'mi',
    'attached-your': 'tu, vuestro, su',
    'attached-his': 'su (de él)',
    'attached-her': 'su (de ella)',
    'attached-its': 'su (de él o de ella)',
    'attached-our': 'nuestro',
    'attached-their': 'su (de ellos)',
    'attached-me': 'me',
    'attached-you': 'te, os',
    'attached-him': 'lo, le',
    'attached-her-object': 'la, le',
    'attached-us': 'nos',
    'attached-them': 'los, les',
    locative: 'locativo',
    ablative: 'ablativo',
    instrumental: 'instrumental',
    'that-is': 'el que está',
    assertive: 'como hecho',
    habitual: 'habitual',
    having: 'con, de',
  },
  helpChat: {
    heading: 'Hacer una pregunta',
    placeholder: 'Pregunta por un ajuste o cómo hacer algo',
    label: 'Tu pregunta',
    send: 'Preguntar',
    thinking: 'Pensando…',
    note: 'Respondido en tu dispositivo por Gemini Nano, a partir de esta ayuda. Puede equivocarse.',
    noMatch: 'La ayuda no dice nada de eso. Prueba la búsqueda de arriba.',
    failed: 'Gemini Nano no pudo responder. Inténtalo de nuevo.',
    installHeading: 'Pregunta a la ayuda',
    install: 'Gemini Nano es un modelo de IA pequeño que se ejecuta dentro de Chrome, en tu ordenador. Descárgalo una vez y podrás hacer preguntas aquí. Nada de lo que escribas sale de tu dispositivo.',
    download: 'Descargar Gemini Nano',
    downloading: (percent: number): string => `Descargando… ${percent} %`,
    update: 'Chrome trae un modelo de IA pequeño, Gemini Nano, que puede responder preguntas aquí. Actualiza Chrome para usarlo.',
    unavailable: 'Chrome tiene un modelo de IA pequeño, Gemini Nano, que puede responder preguntas aquí, pero no está listo en este equipo. Necesita espacio libre en disco y quizá haya que activarlo en chrome://flags.',
    learnMore: 'Acerca de Gemini Nano',
  },
};
