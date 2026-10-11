import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/*
 * French typography: a narrow no-break space (U+202F) before ; : ! ? and
 * inside « », and a no-break space (U+00A0) before % and before a unit.
 */

/** French counts 0 and 1 as one: "0 carte", "1 carte", "2 cartes". */
const plural = new Intl.PluralRules('fr');
const one = (n: number): boolean => plural.select(n) === 'one';

/** "1 mot", "2 mots". */
const words = (n: number): string => `${n} mot${one(n) ? '' : 's'}`;

/** "1 carte", "2 cartes". */
const cards = (n: number): string => `${n} carte${one(n) ? '' : 's'}`;

/** A share, as French writes it: "85 %". */
const percent = (n: number): string => `${n} %`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'désactivé', unknown: 'nouveaux mots', always: 'tous les mots' };

/** What a card went in without, joined with "ni": "sans l’audio de la phrase". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'l’audio de la phrase (cliquez sur l’icône Libregaku pour enregistrer ici)'
      : 'l’audio de la phrase'))
    .join(' ni ');

/** The media Libregaku will not attach, a sentence each, since each agrees differently. */
const MEDIA_NOT_FETCHED = {
  audio: 'Libregaku n’ajoute que les fichiers audio qu’il a récupérés lui-même.',
  video: 'Libregaku n’ajoute que les vidéos qu’il a récupérées lui-même.',
  picture: 'Libregaku n’ajoute que les images qu’il a récupérées lui-même.',
} as const;
const MEDIA_EMPTY = {
  audio: 'L’audio de cette note ne contient aucune donnée.',
  video: 'La vidéo de cette note ne contient aucune donnée.',
  picture: 'L’image de cette note ne contient aucune donnée.',
} as const;

/** What Libregaku does only to its own marks, by the change it refused. */
const ONLY_MARKS = {
  delete: 'Libregaku ne supprime que ses propres marques, et une carte qu’il a créée ces dernières minutes ' +
    'et qui n’a pas été étudiée.',
  suspend: 'Libregaku ne suspend que ses propres marques.',
  retag: 'Libregaku ne modifie les étiquettes que de ses propres marques.',
} as const;

/** The interface in French. Anything left out shows in English. */
export const fr: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana : ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin : ${RUBY[mode]}`,
    mandarin: 'Chinois (mandarin)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping : ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Langues
    languagesHeading: 'Langues',
    languagesAbout: 'Choisissez la langue que vous apprenez et votre propre langue.',
    target: 'J’apprends',
    targetLimited: (language: string): string => `${language} (limité)`,
    supportFull: 'Prise en charge complète, y compris les lectures et le furigana.',
    supportPinyin: 'Prise en charge complète, y compris le pinyin. Les définitions sont en anglais.',
    supportJyutping: 'Prise en charge complète, y compris le Jyutping. Les définitions sont en anglais.',
    supportWords: 'Prise en charge complète. Les définitions sont en anglais.',
    script: 'Caractères',
    scriptHint: 'Ceux utilisés quand une vidéo propose les deux.',
    supportBasic: 'Prise en charge de base : les mots sont séparés, mais il n’y a pas encore de dictionnaire ni de lectures.',
    native: 'Votre langue',
    nativeHint: 'Les traductions et les définitions s’affichent dans cette langue, quand la vidéo et le dictionnaire la proposent.',
    definitions: 'Définitions en',
    definitionsHint: 'Le dictionnaire n’a pas de définitions dans votre langue : elles s’affichent donc dans celle-ci.',
    definitionsHintFor: (language: string): string =>
      `Le dictionnaire n’a pas de définitions en ${language} : elles s’affichent donc dans cette langue.`,

    // Recherche de mots
    lookupHeading: 'Recherche de mots',
    lookupAbout: 'Choisissez comment et quand s’affichent les définitions.',
    interaction: 'Rechercher les mots',
    interactionHover: 'Au survol',
    interactionShift: 'Au survol avec Shift enfoncé',
    interactionClick: 'Au clic',
    interactionHint: 'Un clic sur un mot fonctionne toujours aussi.',
    hoverPause: 'Pause pendant la recherche',
    hoverPauseHint: 'Met la vidéo en pause tant que le pointeur est sur un mot.',
    sidebarHover: 'Définitions rapides dans la transcription',
    sidebarHoverHint: 'Affiche une courte définition quand vous survolez un mot de la transcription.',

    // Fenêtre contextuelle
    popupHeading: 'Fenêtre contextuelle',
    popupAbout: 'Choisissez ce qu’affiche la fenêtre contextuelle quand vous recherchez un mot.',
    cardMarks: 'Boutons Connu et Ignorer',
    cardMarksHint: 'Connu retire le soulignement d’un mot ; Ignorer l’exclut des décomptes. Aucun des deux n’ajoute de carte.',
    cardTrack: 'Bouton Suivre',
    cardTrackHint: 'Souligne en violet les mots que vous voulez remarquer. N’ajoute pas de carte.',
    cardDeckMenu: 'Menu des paquets',
    cardDeckMenuHint:
      'Ajoute un ▾ à côté du bouton Ajouter à Anki pour choisir un autre paquet. Les nouvelles cartes y vont ensuite.',
    cardAddLine: 'Cartes de phrase',
    cardAddLineHint: 'Ajoute un bouton qui crée une carte de la phrase entière, avec son audio et une capture d’écran.',
    cardKanji: 'Détail des kanji',
    cardKanjiHint: 'Affiche le sens et les lectures de chaque kanji.',
    cardHanzi: 'Détail des caractères',
    cardHanziHint: 'Affiche le sens et les lectures de chaque caractère.',
    lookupElsewhere: 'Exemples de cette vidéo',
    lookupElsewhereHint: 'Affiche d’autres phrases de cette vidéo qui utilisent le mot. Cliquez sur l’une d’elles pour la lire.',

    // Sous-titres
    subtitlesHeading: 'Sous-titres',
    subtitlesAbout: 'Réglez l’apparence des sous-titres sur la vidéo.',
    ruby: 'Furigana',
    rubyUnknown: 'Nouveaux mots',
    rubyAlways: 'Tous les mots',
    rubyNever: 'Désactivé',
    rubyHint: 'Lectures au-dessus des kanji. Appuyez sur R pour changer pendant la lecture.',
    pinyin: 'Pinyin',
    pinyinHint: 'Lectures au-dessus des caractères. Appuyez sur R pour changer pendant la lecture.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Lectures au-dessus des caractères. Appuyez sur R pour changer pendant la lecture.',
    blurPrimary: 'Flouter les sous-titres',
    blurPrimaryHint:
      'Pour travailler l’écoute : les sous-titres restent flous jusqu’à ce que vous les survoliez. ' +
      'Appuyez sur H pour activer ou désactiver.',
    subtitleSize: 'Taille du texte',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Suit la taille du lecteur : le rendu est le même en plein écran.',
    subtitleBottom: 'Position',
    subtitleBottomLowest: 'Très basse',
    subtitleBottomLow: 'Basse',
    subtitleBottomNormal: 'Normale',
    subtitleBottomRaised: 'Surélevée',
    subtitleBottomHigh: 'Haute',
    subtitleBottomHighest: 'Très haute',
    subtitleBottomHint:
      'La hauteur des sous-titres. Une autre extension de sous-titres sur le même lecteur reste en dessous.',
    dualSubtitles: 'Afficher la traduction',
    dualSubtitlesHint:
      'Affiche les sous-titres dans votre langue sous ceux de la langue apprise. Ils viennent du site, ' +
      'pas d’une traduction automatique, et nécessitent la transcription complète de la vidéo.',
    singleKeys: 'Raccourcis à une touche',
    singleKeysHint:
      'Les touches de lettres comme A et R fonctionnent seules pendant la lecture. ' +
      'Désactivé : maintenez Alt et Shift enfoncées avec elles. Les touches fléchées fonctionnent dans les deux cas.',

    // Soulignements
    underlinesHeading: 'Soulignements',
    underlinesAbout: 'Chaque couleur indique à quel point vous connaissez un mot. Cliquez sur l’une d’elles pour la changer.',
    colorUnknown: 'Nouveaux mots',
    colorUnknownHint: 'Mots sans carte dans Anki.',
    colorLearning: 'En apprentissage',
    colorLearningHint: 'Mots dont la carte n’est pas encore mature.',
    colorTracking: 'Suivis',
    colorTrackingHint: 'Mots que vous suivez.',
    colorKnown: 'Connus',
    colorKnownHint: 'Mots avec une carte mature, ou marqués comme connus.',
    underlines: 'Souligner les mots',
    underlinesHint: 'Désactivez pour des sous-titres simples, sans couleurs sous les mots.',
    markKnown: 'Souligner les mots connus',
    markKnownHint: 'Désactivé par défaut, pour que l’écran s’allège à mesure que vous apprenez.',
    defaultColours: 'Couleurs par défaut',
    resetColours: 'Réinitialiser',

    // Transcription
    transcriptHeading: 'Transcription',
    transcriptAbout: 'Le panneau à côté de la vidéo, qui liste toutes les lignes de sous-titres.',
    sidebarFollow: 'Défilement automatique',
    sidebarFollowHint:
      'Garde la ligne en cours à l’écran. Si vous faites défiler vous-même, il s’interrompt ; un bouton le relance.',
    headerBar: 'Afficher l’en-tête',
    headerBarHint: 'Apparaît en haut de la vidéo quand le pointeur s’en approche.',
    languageBadge: 'Badge de langue',
    languageBadgeFlag: 'Drapeau',
    languageBadgeCode: 'Code',
    badgeFlag: 'Drapeau du badge',
    badgeFlagDefault: 'Par défaut',
    flagSearch: 'Rechercher…',
    flagSearchLabel: 'Rechercher un pays',
    flagSuggested: 'Suggestions',
    flagAll: 'Tous les pays',
    flagNone: (query: string): string => `Aucun pays ne correspond à « ${query} ».`,
    badgeFlagHint: 'Le drapeau affiché pour la langue que vous apprenez. Chaque langue garde le sien.',
    languageBadgeHint: 'Comment l’en-tête indique la langue que vous apprenez.',
    sidebarStats: 'Compter les nouveaux mots',
    sidebarStatsHint:
      'Affiche le nombre de nouveaux mots de chaque ligne, votre pourcentage de mots connus et les filtres qui s’en servent.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Connectez Anki, choisissez où vont les nouvelles cartes et quels paquets comptent pour les mots que vous connaissez.',
    deck: 'Paquet des nouvelles cartes',
    deckHint: 'Le paquet auquel chaque nouvelle carte est ajoutée.',
    statusScope: 'Lire les mots connus dans',
    statusScopeHint: 'Les cartes de ces paquets déterminent quels mots sont soulignés. Sous-paquets compris.',
    marksInAnki: 'Garder les marques dans Anki',
    marksInAnkiHint:
      'Garde Connu, Suivre et Ignorer sous forme de notes masquées dans Anki (Libregaku::Marks) pour les synchroniser ' +
      'avec vos autres appareils. Désactivé : elles restent dans ce navigateur.',

    // Les menus des paquets
    wholeCollection: 'Toute la collection',
    chooseDeck: 'Choisir un paquet…',
    deckNotInAnki: (deck: string): string => `${deck} (absent d’Anki)`,
    deckAndSubdecks: (deck: string): string => `${deck} (et sous-paquets)`,
    deckUnset: 'Choisissez un paquet. Aucune carte ne peut être ajoutée avant.',
    deckMissing: (deck: string): string => `Anki n’a plus de paquet nommé « ${deck} ». Choisissez-en un autre.`,
    statusScopeMissing: (deck: string): string =>
      `Anki n’a plus de paquet nommé « ${deck} » : tous les mots apparaissent donc comme nouveaux. Choisissez-en un autre.`,
    statusScopeOutside: (deck: string): string =>
      `Les nouvelles cartes vont dans « ${deck} », qui n’est pas inclus ici : les mots que vous ajoutez resteront ` +
      'soulignés comme nouveaux. Choisissez un paquet qui le contient, ou Toute la collection.',

    // L’état d’Anki
    ankiChecking: 'Vérification…',
    ankiConnected: 'Connecté.',
    noteTypeInstalled: 'Type de note installé.',
    cardsMade: (n: number): string =>
      one(n) ? `${n} carte créée avec Libregaku.` : `${n} cartes créées avec Libregaku.`,
    noCards: 'Aucune carte pour l’instant.',
    cardsFlushed: (n: number): string =>
      one(n)
        ? `${n} carte créée pendant qu’Anki était fermé a été ajoutée.`
        : `${n} cartes créées pendant qu’Anki était fermé ont été ajoutées.`,
    cardsNotFlushed: (n: number, error: string): string => `Impossible d’ajouter ${cards(n)} : ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} en attente d’ajout.`,
    ankiOffline: (port: number): string =>
      `Anki ne répond pas sur le port ${port}. C’est normal quand il est fermé : ` +
      'les nouvelles cartes attendent ici et seront ajoutées à son ouverture.',
    ankiBlocked: 'Anki est ouvert, mais AnkiConnect n’autorise pas encore cette extension.',
    ankiOccupied: (detail: string): string => `${detail} Fermez le programme qui l’utilise pour qu’Anki puisse s’en servir.`,

    // Les boutons d’Anki
    checkAgain: 'Vérifier à nouveau',
    newDeck: 'Nouveau paquet',
    openCards: 'Voir les cartes dans Anki',
    openMarks: 'Voir les marques dans Anki',
    newDeckPrompt: 'Nommez le nouveau paquet. Utilisez :: pour un sous-paquet, par ex. Japonais::Netflix',

    // Connecter Anki
    installStep: 'Installez Anki sur cet ordinateur et ouvrez-le. {link}',
    getAnki: 'Télécharger Anki',
    addonStep: 'Dans Anki, allez dans {menu}, collez ce code, puis redémarrez Anki.',
    addonMenu: 'Outils → Greffons → Acquérir des greffons…',
    aboutAnkiConnect: 'À propos d’AnkiConnect',
    originStep: 'Dans Anki, allez dans {menu}, ajoutez cette ligne à {setting}, puis redémarrez Anki.',
    originMenu: 'Outils → Greffons → AnkiConnect → Configuration',
    runningStep: 'Gardez Anki ouvert pendant que vous regardez. Les cartes vont directement dans Anki sur cet ordinateur.',
    copy: 'Copier',
    copyValue: (value: string): string => `Copier ${value}`,
    copied: 'Copié',
    copyFailed: 'Sélectionnez-le',

    // Cartes Anki
    ankiCardsHeading: 'Cartes Anki',
    ankiCardsAbout: 'Choisissez ce qui est ajouté à chaque nouvelle carte, en plus du mot, de la lecture, du sens et de la phrase.',
    cardAudio: 'Audio du mot',
    cardAudioHint: 'Un enregistrement du mot, s’il en existe un. Jamais une voix de synthèse.',
    cardSentenceAudio: 'Audio de la phrase',
    cardSentenceAudioHint: 'Enregistre la phrase en la rejouant une fois. Sur Netflix, il faut l’autorisation ci-dessous.',
    cardScreenshot: 'Capture d’écran',
    cardScreenshotHint: 'Une image fixe de la scène. Indisponible sur Netflix, qui la bloque.',
    capture: 'Audio de la phrase sur Netflix',
    captureAllow: 'Autoriser',
    captureAllowInSettings: 'Autoriser dans les paramètres',
    captureRemove: 'Retirer',
    captureAllowed:
      'Autorisé. Dans chaque onglet Netflix, cliquez sur l’icône Libregaku et choisissez Enregistrer l’audio de la phrase ici.',
    captureNeeded:
      'Netflix protège sa vidéo : l’audio de la phrase est donc enregistré depuis l’onglet. Il faut pour cela votre autorisation.',

    // Données et licences
    creditsHeading: 'Données et licences',
    creditJmdict:
      'Données du dictionnaire et des kanji © Electronic Dictionary Research and Development Group, utilisées sous ' +
      'licence CC BY-SA 4.0. Converties en JSON par jmdict-simplified.',
    creditLindera:
      'Découpe le japonais, le coréen et le chinois en mots. Licence MIT ; IPADIC, mecab-ko-dic et CC-CEDICT ont ' +
      'leurs propres conditions.',
    creditCedict: 'Dictionnaire chinois © MDBG et ses contributeurs, utilisé sous licence CC BY-SA 4.0.',
    creditWiktionary:
      'Dictionnaires coréen et espagnol, ainsi que certains dans votre propre langue, tirés de Wiktionary via kaikki.org et ' +
      'wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Mots coréens expliqués dans votre propre langue. © National Institute of Korean Language, utilisé sous licence ' +
      'CC BY-SA 2.0 KR. Fichiers créés par Lyroxide.',
    creditCfdict: 'Le chinois expliqué en français. CFDICT © chine.in, tenu à jour par CxDICT. CC BY-SA 4.0.',
    creditCanto:
      'Dictionnaire cantonais et lectures en Jyutping pour CC-CEDICT. © Pleco Inc., utilisé sous licence CC BY-SA 3.0.',
    creditHandedict: 'Le chinois expliqué en allemand. © HanDeDict et ses contributeurs, utilisé sous licence CC BY-SA 3.0.',
    creditUnihan: 'La lecture affichée en premier pour un caractère chinois. © Unicode, Inc., utilisé sous la Unicode License.',
    creditJotoba: 'Utilisés pour les recherches pendant le téléchargement du dictionnaire. Tous deux utilisent JMdict.',
    creditLucide: 'Icônes. Licence ISC.',
    creditCommons: 'Enregistrements de mots espagnols, chinois et coréens, dits par des bénévoles. Chacun a sa propre licence, CC BY-SA 4.0 pour la plupart, indiquée avec le nom du locuteur à la lecture et sur la carte.',
    creditAudioCmn: 'Enregistrements de mots chinois par Yue Tan, université de Caen. CC BY-SA 3.0 US.',
    licence: 'Libregaku est sous licence MIT. Les données des dictionnaires sont téléchargées depuis leurs sources, et non intégrées.',
    built: (when: string): string => `Cette copie a été compilée le ${when}.`,

    // Raccourcis clavier
    keyLine: 'Ligne précédente ou suivante',
    keyReplay: 'Rejouer la ligne',
    keyTranslation: 'Afficher ou masquer la traduction',
    keyShiftLookup: 'Maintenir pour rechercher le mot sous le pointeur',
    keyAdd: 'Ajouter à Anki le mot de la fenêtre contextuelle',
    keyKnown: 'Marquer comme connu le mot de la fenêtre contextuelle',
    keyFurigana: 'Changer le furigana : désactivé, nouveaux mots, tous les mots',
    keyPinyin: 'Changer le pinyin : désactivé, nouveaux mots, tous les mots',
    keyJyutping: 'Changer le Jyutping : désactivé, nouveaux mots, tous les mots',
    keyBlur: 'Activer ou désactiver le flou des sous-titres',
    keySave: 'Ajouter la ligne en cours aux favoris',
    keyTranscript: 'Afficher ou masquer le panneau de transcription',
    keyClose: 'Fermer la fenêtre contextuelle',
  },

  options: {
    pageTitle: 'Paramètres de Libregaku',
    help: 'Aide',
    searchSettings: 'Rechercher…',
    noSettingsFound: 'Rien ici ne mentionne « {q} ».',
    contentsLabel: 'Sections des paramètres',
    settingsLabel: 'Paramètres',
    setupHeading: 'Premiers pas',
    setupAbout: 'Deux choix ; tout le reste a une valeur par défaut raisonnable.',
    stepLanguages: 'Choisissez ce que vous apprenez',
    stepAnki: 'Connectez Anki et choisissez un paquet pour les nouvelles cartes',
    ankiOptional:
      'Anki est facultatif : sous-titres, recherches et furigana fonctionnent sans lui. ' +
      'C’est lui qui retient les mots que vous connaissez déjà.',
    nextSteps:
      'Ouvrez ensuite une vidéo avec des sous-titres dans la langue que vous apprenez, et survolez un mot. ' +
      'L’icône clavier du panneau de transcription affiche les raccourcis clavier.',
    stepDone: 'Terminé',
    confirmLanguages: 'Ces langues sont correctes',
    keepDeck: (deck: string): string => `Utiliser ${deck} pour les nouvelles cartes`,
  },

  action: {
    help: 'Aide',
    settings: 'Paramètres',
    settingsTip: 'Tous les paramètres',
    checkingPage: 'Vérification de cette page…',
    notActive:
      'Libregaku n’est pas actif sur cette page. Ouvrez une vidéo YouTube, Netflix, Disney+, Prime Video ou Max. Si vous venez d’installer ' +
      'ou de recharger Libregaku, rechargez l’onglet.',
    unsupported: 'Libregaku fonctionne sur YouTube, Netflix, Disney+, Prime Video et Max.',
    waitingForSubtitles: (site: string): string =>
      `En attente des sous-titres sur ${site}. Vérifiez qu’ils sont activés.`,
    activeOn: (title: string): string => `Actif : ${title}`,
    active: 'Actif sur cette vidéo.',
    subtitlesTrack: 'Sous-titres',
    translationTrack: 'Traduction',
    noTranslation: 'Aucune',
    generatedTrack: (track: string): string => `${track} (auto)`,
    captureNeedsPermission:
      'Pour enregistrer ici l’audio de la phrase, il faut l’autorisation de capturer le son de cet onglet.',
    captureAllowInSettings: 'Autoriser dans les paramètres',
    captureReady: 'Le son de Netflix ne peut être enregistré qu’après activation pour cet onglet.',
    captureStart: 'Enregistrer l’audio de la phrase ici',
    captureFailed: 'Chrome n’a pas pu enregistrer cet onglet.',
    toggleSidebar: 'Afficher/masquer la barre latérale',
    ankiChecking: 'Anki : vérification…',
    ankiConnected: (n: number): string => `Anki connecté · ${cards(n)} de Libregaku`,
    ankiOffline: 'Anki n’est pas ouvert : les mots apparaissent comme nouveaux',
    ankiOccupied: (port: number): string => `Un autre programme utilise le port ${port} : impossible de joindre Anki`,
    ankiBlocked: 'Anki a refusé cette extension : la ligne à ajouter est dans Paramètres',
    ankiBusy: 'Anki n’a pas répondu : il est peut-être en train de synchroniser',
    ankiRefused: 'Anki a refusé la requête',
    cardsToAdd: (n: number): string => `${cards(n)} encore à ajouter`,
    cardsWaiting: (n: number): string => `${cards(n)} en attente d’Anki`,
  },

  sidebar: {
    panelLabel: 'Panneau de transcription',
    resizeLabel: 'Redimensionner le panneau',

    // Les onglets et les boutons à côté
    tabsLabel: 'Listes',
    transcriptTab: 'Transcription',
    savedTab: 'Favoris',
    settings: 'Paramètres',
    shortcuts: 'Raccourcis clavier',
    close: 'Fermer',
    closeLabel: 'Fermer le panneau',
    openTip: 'Transcription',
    openLabel: 'Afficher la transcription',
    help: 'Aide',

    // Rechercher dans la transcription
    searchPlaceholder: 'Rechercher dans la transcription…',
    searchLabel: 'Rechercher dans la transcription',
    noMatches: 'Aucun résultat',
    matchAt: (at: number, total: number): string => `${at} sur ${total}`,
    matchesFound: (n: number): string => `${n} résultat${one(n) ? '' : 's'}`,

    // Le filtre
    filterTip: 'Filtrer',
    filterLabel: 'Filtrer les lignes',
    filterAll: 'Toutes les lignes',
    filterAllAbout: 'Toutes les lignes, sans filtre',
    filterNew: 'Avec de nouveaux mots',
    filterNewAbout: 'Lignes contenant un mot pour lequel vous n’avez pas de carte',
    filterReady: 'Prêtes à apprendre',
    filterReadyAbout: 'Lignes où un seul mot est nouveau pour vous : les plus faciles pour apprendre',
    filterSaved: 'Favoris',
    filterSavedAbout: 'Lignes gardées pour plus tard',

    // La transcription
    partial: 'Se remplit au fil de la lecture : ce lecteur ne donne accès qu’à la ligne en cours.',
    partialEmpty: 'Rien pour l’instant. Les lignes apparaissent ici à mesure qu’elles sont prononcées.',
    empty: 'Aucune transcription chargée.',
    currentLine: 'Ligne en cours',
    lineNew: (n: number): string => `${n} nouveau${one(n) ? '' : 'x'}`,
    playFrom: (time: string): string => `Lire à partir de ${time}`,
    saveLine: 'Ajouter aux favoris',
    unsave: 'Retirer des favoris',
    addSentence: 'Ajouter la phrase',
    addSentenceLabel: 'Ajouter la phrase à Anki',

    // Le résumé au-dessus de la transcription, une étiquette puis son nombre, valable pour toute quantité
    knownPercent: (n: number): string => percent(n),
    summaryKnown: 'Connus : {n}',
    summaryNew: 'Nouveaux : {n}',
    summaryReady: 'Prêtes à apprendre : {n}',
    counting: (n: number): string => `Décompte des nouveaux mots… ${percent(n)}`,
    countFailed: 'Certaines lignes n’ont pas pu être comptées : il n’y a donc pas de totaux.',

    // La définition rapide
    dictionaryLoading: (n: number): string => `Chargement du dictionnaire : ${percent(n)}`,
    dictionaryUnavailable: 'Dictionnaire indisponible',
    noEntry: 'Aucune entrée.',

    // Favoris
    savedEmpty:
      'Aucun favori pour l’instant. Pour garder une phrase à revoir, cliquez sur le signet d’une ligne ' +
      'de la transcription, ou appuyez sur B.',
    thisVideo: 'cette vidéo',
    openAt: (time: string): string => `Ouvrir la vidéo à ${time}`,
    remove: 'Retirer',
    removeLabel: 'Retirer des favoris',
    copySavedAbout: 'Copier tous les favoris en texte séparé par des tabulations',
    exportSavedAbout: 'Enregistrer un fichier séparé par des tabulations qu’Anki peut importer',
    addSavedAbout: 'Créer une carte pour chaque favori',
    linesCopied: (n: number): string => (one(n) ? `${n} ligne copiée.` : `${n} lignes copiées.`),
    chooseDeck: 'Choisissez d’abord un paquet dans Paramètres : c’est là que vont les nouvelles cartes.',
    checkingAnki: 'Vérification d’Anki…',
    ankiOffline: 'Anki n’est pas ouvert. Ouvrez-le et réessayez ; les étapes sont dans Paramètres.',
    ankiBlocked: 'AnkiConnect n’autorise pas encore cette extension. La ligne à ajouter est dans Paramètres.',
    ankiUnreachable: 'Impossible de joindre Anki. Paramètres indique pourquoi.',
    adding: (at: number, total: number): string => `Ajout en cours : ${at} sur ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${added} ${one(added) ? 'carte ajoutée' : 'cartes ajoutées'} à ${deck}` +
      `${already ? `, ${already} ${one(already) ? 'y était déjà' : 'y étaient déjà'}` : ''}.`,

    // Les boutons et messages des onglets Favoris et Mots
    copy: 'Copier',
    exportFile: 'Exporter',
    addToAnki: 'Ajouter à Anki',
    noClipboard: 'Impossible d’accéder au presse-papiers.',
    downloaded: 'Enregistré dans vos téléchargements. Dans Anki : Fichier → Importer.',
    downloadBlocked: 'Cette page a bloqué le téléchargement : utilisez plutôt Copier.',

    // Mots
    listsLabel: 'Quelle liste',
    listLines: 'Lignes',
    listTracked: 'Suivis',
    listKnown: 'Connus',
    listIgnored: 'Ignorés',
    findPlaceholder: 'Rechercher…',
    findLabel: 'Rechercher dans cette liste',
    copyWordsAbout: 'Copier cette liste en texte séparé par des tabulations',
    exportWordsAbout: 'Enregistrer cette liste dans un fichier séparé par des tabulations qu’Anki peut importer',
    wordsCopied: (n: number): string => (one(n) ? `${n} mot copié.` : `${n} mots copiés.`),
    nothingToExport: 'Cette liste ne contient rien à exporter.',
    lookingUp: 'Recherche des lectures et des sens…',
    noWordMatches: (query: string): string => `Aucun mot de cette liste ne correspond à « ${query} ».`,
    noLineMatches: (query: string): string => `Aucun favori ne correspond à « ${query} ».`,
    wordsMatching: (shown: number, total: number): string => `${shown} sur ${words(total)}.`,
    trackedEmpty:
      'Aucun mot suivi pour l’instant. Suivre souligne un mot pour que vous le remarquiez, sans créer de carte. ' +
      'Activez ce bouton dans Paramètres, sous Fenêtre contextuelle.',
    trackedIntro: (n: number): string =>
      one(n)
        ? `${n} mot que vous suivez, souligné partout où il apparaît.`
        : `${n} mots que vous suivez, soulignés partout où ils apparaissent.`,
    stopTracking: 'Ne plus suivre',
    knownEmpty:
      'Aucun mot marqué comme connu. Quand vous connaissez un mot et ne voulez pas de carte, marquez-le comme connu ' +
      'depuis sa fenêtre contextuelle, ou appuyez sur K.',
    knownIntro: (n: number): string =>
      `${n} ${one(n) ? 'mot marqué comme connu' : 'mots marqués comme connus'}. ` +
      'Si vous retirez la marque d’un mot, il reprend le statut que lui donnent vos cartes Anki.',
    unmarkKnown: 'Ne plus marquer comme connu',
    ignoredEmpty:
      'Aucun mot ignoré. Ignorez les noms et les sons depuis leur fenêtre contextuelle : ils ne seront jamais ' +
      'soulignés ni comptés.',
    ignoredIntro: (n: number): string =>
      one(n) ? `${n} mot jamais souligné ni compté.` : `${n} mots jamais soulignés ni comptés.`,
    stopIgnoring: 'Ne plus ignorer',
  },

  popup: {
    // La fenêtre et le mot en tête
    cardLabel: (word: string): string => `${word} — dictionnaire`,
    commonBadge: 'courant',
    characterNames: { kanji: 'Kanji', hanzi: 'Caractères' },
    partOfSpeech: {
      n: 'nom', 'n-adv': 'nom adverbial', 'n-t': 'nom temporel', 'n-suf': 'suffixe nominal',
      'n-pref': 'préfixe nominal', pn: 'pronom', 'adj-i': 'adjectif en -i', 'adj-na': 'adjectif en -na',
      'adj-no': 'adjectif en -no', 'adj-pn': 'adjectif prénominal', adv: 'adverbe', 'adv-to': 'adverbe',
      aux: 'auxiliaire', 'aux-v': 'verbe auxiliaire', 'aux-adj': 'adjectif auxiliaire',
      conj: 'conjonction', cop: 'copule', ctr: 'classificateur', exp: 'expression', int: 'interjection',
      num: 'numéral', prt: 'particule', pref: 'préfixe', suf: 'suffixe', unc: 'non classé',
      vs: 'verbe suru', 'vs-i': 'verbe suru', 'vs-s': 'verbe suru', vt: 'transitif', vi: 'intransitif',
      v1: 'verbe ichidan', 'v1-s': 'verbe ichidan', vk: 'verbe kuru', vz: 'verbe zuru',
      v5b: 'verbe godan', v5g: 'verbe godan', v5k: 'verbe godan', 'v5k-s': 'verbe godan',
      v5m: 'verbe godan', v5n: 'verbe godan', v5r: 'verbe godan', 'v5r-i': 'verbe godan',
      v5s: 'verbe godan', v5t: 'verbe godan', v5u: 'verbe godan', 'v5u-s': 'verbe godan',
      v5aru: 'verbe godan',
      // Les codes du Wiktionary, pour les mots coréens et espagnols. La nature du mot, puis sa grammaire
      name: 'nom propre', v: 'verbe', adj: 'adjectif', pron: 'pronom', det: 'déterminant', artic: 'article',
      counter: 'classificateur', prep: 'préposition', 'prep-phrase': 'locution prépositionnelle', ptcl: 'particule',
      intj: 'interjection', phrase: 'locution', prov: 'proverbe', r: 'racine', char: 'caractère', adn: 'adnominal',
      ptcpl: 'participe', contr: 'contraction',
      masc: 'masculin', fem: 'féminin', neut: 'neutre', sg: 'singulier', pl: 'pluriel', 'pl-only': 'pluriel uniquement',
      count: 'dénombrable', uncount: 'indénombrable', vr: 'pronominal', vdt: 'ditransitif', impers: 'impersonnel',
      irreg: 'irrégulier', reltnl: 'relationnel', reltv: 'relatif', interr: 'interrogatif', poss: 'possessif',
      dim: 'diminutif', aug: 'augmentatif', onoma: 'onomatopéique',
      // L’usage du mot
      idio: 'idiomatique', fig: 'figuré', literal: 'littéral', col: 'parlé', inf: 'informel', fam: 'familier',
      formal: 'soutenu', polite: 'poli', lit: 'littéraire', poet: 'poétique', rhet: 'rhétorique', sl: 'argot',
      vulg: 'vulgaire', derog: 'péjoratif', offens: 'injurieux', humor: 'humoristique', euph: 'euphémique',
      child: 'enfantin', net: 'Internet', neol: 'néologisme', cmn: 'courant', uncmmn: 'peu courant', rare: 'rare',
      dated: 'vieilli', arch: 'archaïque', obs: 'obsolète', hist: 'historique', 'non-std': 'non standard',
      dialect: 'dialectal', regio: 'régional',
    },

    // Les boutons sous le mot
    pronounce: 'Écouter',
    playedRecording: (word: string): string => `${word} · enregistrement`,
    playedSynthesised: (word: string): string => `${word} · voix de synthèse`,
    recordingBy: (speaker: string, licence: string): string => `Enregistrement de ${speaker} · ${licence}`,
    pronounceFailed: 'impossible de lire l’audio',
    addSentence: 'Ajouter la phrase',
    sentenceAdded: 'Phrase ajoutée',
    undo: 'Annuler',
    copyWord: 'Copier le mot',
    copyPhrase: 'Copier l’expression',
    copySentence: 'Copier la phrase',
    wordCopied: 'mot copié',
    phraseCopied: 'expression copiée',
    sentenceCopied: 'phrase copiée',
    copyFailed: 'impossible de copier : sélectionnez le texte',

    // Les sens
    dictionaryLoading: (n: number): string =>
      `Dictionnaire en cours de chargement (${percent(n)}). Réessayez dans un instant.`,
    dictionaryUnavailable: (error: string): string => `Dictionnaire indisponible : ${error}`,
    noEntry: 'Aucune entrée de dictionnaire pour ce mot.',
    moreMeanings: (n: number): string => `+${n} autre${one(n) ? '' : 's'} sens`,

    // Les autres lignes de la vidéo avec ce mot
    elsewhereCount: (n: number): string =>
      (n === 1 ? 'Encore une fois dans cette vidéo' : `${n} autres fois dans cette vidéo`),
    playLine: 'Lire',
    elsewhereMore: (n: number): string => `et ${n} de plus : la recherche dans la transcription les trouve toutes`,
    showAllInTranscript: 'Tout voir dans la transcription',

    // Ajouter à Anki
    addToAnki: 'Ajouter à Anki',
    addToDeck: (deck: string): string => `Ajouter à ${deck}`,
    adding: 'Ajout en cours…',
    undoing: 'Annulation…',
    added: 'Ajouté',
    addedUndo: 'Ajouté — annuler',
    inAnki: 'Dans Anki',
    showInAnki: 'Voir dans Anki',
    waiting: 'En attente',
    waitingForAnki: 'En attente d’Anki',
    goesInWhenAnkiOpens: 'La carte ira dans Anki à son ouverture',
    alreadyAdded: 'Déjà ajouté',
    alreadyInAnki: 'Déjà dans Anki',
    waitingForAnkiToOpen: 'En attente de l’ouverture d’Anki',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // Le menu des paquets
    otherDecks: 'Autres paquets',
    addToAnotherDeck: 'Ajouter à un autre paquet',
    decksUnknown: 'Anki ne répond pas : ses paquets sont donc encore inconnus.',
    newDeck: 'Nouveau paquet…',
    newDeckPrompt: 'Nouveau paquet. Utilisez :: pour un sous-paquet, comme dans Japonais::Netflix',

    // Les marques
    knownButton: 'Connu',
    trackButton: 'Suivre',
    ignoreButton: 'Ignorer',
    markKnownTip: 'Marquer comme connu',
    trackTip: 'Suivre',
    ignoreTip: 'Ignorer',
    unmarkKnownTip: 'Ne plus marquer comme connu',
    stopTrackingTip: 'Ne plus suivre',
    stopIgnoringTip: 'Ne plus ignorer',
  },

  header: {
    knownStat: 'Connus : {percent}',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Mots que vous connaissez',
    readyStat: 'Prêtes à apprendre : {count}',
    readyTip: 'Lignes avec un seul nouveau mot',
    blurSubtitle: 'Flouter le sous-titre',
    unblurSubtitle: 'Retirer le flou',
    showTranslation: 'Afficher la traduction',
    hideTranslation: 'Masquer la traduction',
    translation: 'Traduction',
    transcript: 'Transcription',
    pinHeader: 'Épingler l’en-tête',
    unpinHeader: 'Désépingler l’en-tête',
    settings: 'Paramètres',
    showHeader: 'Afficher l’en-tête',
  },

  player: {
    // Les touches du lecteur
    lastLine: 'C’était la dernière ligne',
    noLineBefore: 'Aucune ligne avant celle-ci',
    translationOn: 'Traduction activée',
    translationOff: 'Traduction désactivée',
    blurOn: 'Sous-titre flouté jusqu’au survol',
    blurOff: 'Sous-titre visible',
    lineSaved: 'Ligne ajoutée aux favoris',
    lineUnsaved: 'Ligne retirée des favoris',
    lookUpFirst: 'Recherchez d’abord un mot',
    alreadyKnown: (word: string): string => `${word} · déjà connu dans Anki`,
    alreadyInAnki: (word: string): string => `${word} · déjà dans Anki`,
    adding: (word: string): string => `Ajout de ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Les marques
    markOff: (word: string): string => `${word} · marque retirée`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'marqué comme connu', tracking: 'suivi', ignored: 'ignoré', unknown: 'marqué comme nouveau',
      }[status];
      if (refused) return `${word} · ${done}, sans carte. Anki a refusé la marque ; nouvel essai plus tard`;
      return `${word} · ${done}, sans carte${status === 'tracking' ? '. Voir l’onglet Favoris du panneau' : ''}`;
    },

    // La carte d’un mot
    pickDeck: 'Choisissez d’abord un paquet dans les paramètres de Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `ajouté à ${deck}, sans ${without(missing)}` : `ajouté à ${deck}`,
    alreadyIn: (deck: string): string => `déjà dans ${deck}`,
    queued: (deck: string): string => `Anki est fermé : la carte ira dans ${deck} à son ouverture`,
    alreadyQueued: 'déjà en attente d’Anki',
    notKept: 'Anki est fermé, et le navigateur n’a pas pu garder la carte pour plus tard',
    takenBack: (deck: string): string => `retiré de ${deck}`,
    unqueued: 'n’attend plus Anki',
    alreadySent: 'La carte est déjà dans Anki',
    queueSent: (count: number): string =>
      `Anki est ouvert : ${count === 1 ? 'la carte en attente a été ajoutée' : `${count} cartes en attente ont été ajoutées`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `les mots que vous connaissez sont lus dans ${scope}, donc les cartes du paquet ${deck} ne compteront pas`,

    // La carte d’une phrase
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `phrase ajoutée à ${deck}, sans ${without(missing)}` : `phrase ajoutée à ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `la phrase est déjà dans ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'le son', picture && 'l’image'].filter(Boolean);
      return `Anki est fermé : la phrase ira dans ${deck} à son ouverture` +
        `${lacking.length ? `, sans ${lacking.join(' ni ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'la phrase est déjà en attente d’Anki',
    sentenceTakenBack: (deck: string): string => `phrase retirée de ${deck}`,

    // L’audio de la phrase
    recording: 'Enregistrement de la ligne…',

    // Recherches
    noDictionary: 'pas encore de dictionnaire pour cette langue.',
  },

  notices: {
    // La carte
    unexpected: 'Libregaku a rencontré un problème inattendu.',
    dismiss: 'Fermer',

    // YouTube ou Netflix a changé quelque chose
    youtubeTrackList: 'Impossible de lire la liste des sous-titres de YouTube.',
    youtubeTrackShape: 'Les données de sous-titres de YouTube n’ont pas la forme attendue.',
    youtubeCaptionText: 'Texte des sous-titres de YouTube introuvable sur la page.',
    youtubePlayerTrackList: 'Impossible de lire la liste des sous-titres de cette vidéo depuis le lecteur YouTube.',
    netflixTrackList: 'Impossible de lire la liste des sous-titres de Netflix.',
    netflixCaptionText: 'Texte des sous-titres de Netflix introuvable sur la page.',
    disneyTrackList: 'Impossible de lire la liste des sous-titres de Disney+.',
    disneyCaptionText: 'Texte des sous-titres de Disney+ introuvable sur la page.',
    primeTrackList: 'Impossible de lire la liste des sous-titres de Prime Video.',
    primeCaptionText: 'Texte des sous-titres de Prime Video introuvable sur la page.',
    maxTrackList: 'Impossible de lire la liste des sous-titres de Max.',
    maxCaptionText: 'Texte des sous-titres de Max introuvable sur la page.',
    netflixBlocked: 'Netflix a bloqué la partie de Libregaku qui lit les sous-titres.',

    // Les sous-titres de cette vidéo
    subtitlesOff: 'Activez les sous-titres dans le lecteur et Libregaku les détectera.',
    trackNotSent: 'Le lecteur n’a pas encore chargé ces sous-titres.',
    noTargetTrack: 'Aucun sous-titre ici dans la langue que vous apprenez.',
    noSecondTrack: 'Aucun sous-titre ici dans votre langue : il n’y a donc pas de seconde ligne.',
    onlyOneTrack: 'Cette vidéo n’a qu’une piste de sous-titres : il n’y a donc pas de seconde ligne.',
    autoGenerated: 'Ces sous-titres sont générés automatiquement : le texte et le découpage des mots seront approximatifs.',
    noSubtitles: 'Cette vidéo n’a pas de sous-titres.',
    secondTrackFailed: 'Impossible de charger la seconde ligne.',

    // Les parties de l’extension
    analyserUnavailable:
      'Lectures et formes du dictionnaire désactivées : l’analyseur de langue ne s’est pas chargé. ' +
      'Les mots ne correspondent à vos cartes que s’ils sont écrits exactement pareil.',
    markNotSaved: 'Impossible d’enregistrer cette marque. Elle s’applique jusqu’au rechargement de la page, puis elle est perdue.',
    marksNotSynced: 'Impossible d’enregistrer vos marques dans Anki. Elles sont gardées dans ce navigateur, et un nouvel essai aura lieu.',
    cardsNotAdded:
      'Anki a refusé certaines des cartes gardées pendant qu’il était fermé. Elles sont toujours gardées, et un nouvel essai aura lieu.',

    // Détails
    playerNeverLoaded: 'Le lecteur n’a jamais fini de se charger.',
    subtitlesMaybeOff: 'Les sous-titres sont peut-être simplement désactivés dans le lecteur.',
    lookedFor: (selector: string): string => `Élément recherché : ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Sous-titres de cette vidéo : ${languages.join(', ') || 'aucun'}. ` +
      'Changez la langue apprise dans les paramètres, ou choisissez une autre vidéo.',
    onlyPictures: 'Cette vidéo ne les propose qu’en images, pas en texte : Libregaku ne peut donc pas les lire.',
    chooseInPlayer: (track: string): string => `Choisissez ${track} dans le menu des sous-titres du lecteur et Libregaku les détectera.`,
    noHumanTrack: 'Aucune piste écrite par une personne n’est disponible pour cette vidéo.',
    secondTrackError: (track: string, error: string): string => `${track} : ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Sous-titres de cette vidéo : ${languages.join(', ')}.`,
    analyserDidNotLoad: 'l’analyseur ne s’est pas chargé',
  },

  anki: {
    // Joindre AnkiConnect
    offline: (port: number): string => `Aucun programme n’écoute sur le port ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Aucune réponse sur le port ${port} en ${seconds} s. ` +
      'Anki est peut-être occupé (synchronisation ou boîte de dialogue ouverte), ou un autre programme bloque le port.',
    blocked: (origin: string): string =>
      `AnkiConnect a refusé ${origin}. Dans Anki : Outils → Greffons → AnkiConnect → Configuration, ` +
      'puis ajoutez cette ligne à webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Un programme sur le port ${port} a répondu HTTP ${status}, ce que ne fait pas AnkiConnect.`,
    notAnkiConnect: (port: number): string => `Un programme autre qu’AnkiConnect utilise le port ${port}.`,
    noBackground: 'L’arrière-plan de l’extension ne répond pas.',
    unreachable: 'Anki est injoignable.',
    callFailed: 'L’appel à AnkiConnect a échoué.',

    // Ce que Libregaku refuse d’envoyer
    notRelayed: (action: string): string => `Libregaku n’envoie pas « ${action} » à AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string => MEDIA_NOT_FETCHED[media],
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => MEDIA_EMPTY[media],
    mediaName: (prefix: string): string => `Libregaku nomme ses fichiers ${prefix}…, ce qui n’est pas le cas de celui-ci.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} a besoin d’une liste de ${ids === 'notes' ? 'notes' : 'cartes'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Refusé : ${count} des ${ids === 'notes' ? 'notes' : 'cartes'} envoyées ` +
      `n’${one(count) ? 'appartient' : 'appartiennent'} à aucune marque Libregaku. ${ONLY_MARKS[change]}`,

    // Les types de note de Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string => {
      const single = fields.length === 1;
      return `Votre type de note « ${noteType} » dans Anki n’a pas ${single ? 'le champ' : 'les champs'} ` +
        `${fields.join(', ')} : ${loses === 'cards' ? 'les cartes' : 'les notes'} ${single ? 'le' : 'les'} perdraient. ` +
        'Libregaku ne touche pas à un type de note que vous avez pu personnaliser : ' +
        `dans Anki, Outils → Gérer les types de note, renommez « ${noteType} » (ou rajoutez les champs), ` +
        'puis cliquez sur Vérifier à nouveau : un nouveau type de note sera installé.';
    },

    // Marques et cartes en attente
    marksNotAdded: (count: number): string =>
      `Anki n’a pas ajouté ${count} des marques. Elles restent en attente et seront renvoyées la prochaine fois.`,
    marksNotStored: (cause: string): string => `Le stockage du navigateur a refusé les marques lues dans Anki : ${cause}`,
    storageUnreadable: (cause: string): string => `Impossible de lire le stockage du navigateur : ${cause}`,
  },

  errors: {
    // Enregistrer le son d’un onglet
    captureNotAllowed: 'Autorisez d’abord l’audio de la phrase sur ce site dans les paramètres de Libregaku.',
    captureRefused: 'Chrome a refusé de capturer cet onglet',

    // Une piste de sous-titres qui ne s’est pas chargée
    unknownTrack: (id: string): string => `piste inconnue ${id}`,
    trackNotSent: 'pas encore chargée par le lecteur ; choisissez-la une fois dans son menu des sous-titres',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `aucun format de sous-titres n’a fonctionné : ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `aucune URL de sous-titres n’a fonctionné : ${attempts.join(' ; ') || 'aucune indiquée'}`,
    emptyAnswer: 'vide',
    noCues: '0 ligne',
    noCuesParsed: '0 ligne après analyse',
    noAnswerWithin: (seconds: number): string => `pas de réponse en ${seconds} s`,

    // Le nom d’une piste
    forcedTrack: (track: string): string => `${track} (forcés)`,

    // Le dictionnaire et l’analyseur
    noAnswer: 'l’extension ne répond pas : rechargez la page pour la redémarrer',
    analyserLoading: 'l’analyseur est encore en cours de chargement',
    dictionaryLoading: 'le dictionnaire est encore en cours de chargement',
    lookupFailed: 'la recherche a échoué',
  },

  grammar: {
    // Temps et politesse
    past: 'passé',
    polite: 'poli',

    // Négation
    negative: 'négatif',
    'negative intent': 'volitif négatif',
    without: 'sans',

    // Condition
    conditional: 'conditionnel',
    whenever: 'dès que',

    // Qui agit, et ce qui est possible
    passive: 'passif',
    'passive or potential': 'passif ou potentiel',
    potential: 'potentiel',
    causative: 'causatif',

    // Désir
    'want to': 'vouloir',
    'seems to want to': 'semble vouloir',
    'want someone to': 'vouloir qu’on fasse',

    // Apparence et probabilité
    seems: 'semble',
    'seems like': 'on dirait que',
    hearsay: 'ouï-dire',
    apparently: 'apparemment',
    probably: 'probablement',
    might: 'peut-être',

    // Ce qui devrait arriver
    'ought to': 'devrait',
    'supposed to': 'censé',
    'intends to': 'intention',

    // Obligation et permission
    must: 'obligation',
    'must not': 'interdiction',
    "don't have to": 'pas obligé',
    may: 'permission',

    // Ordres et demandes
    imperative: 'impératif',
    volitional: 'volitif',
    'polite command': 'ordre poli',
    please: 'demande',

    // Liaison avec la suite
    'te-form': 'forme en -te',
    listing: 'énumération',
    while: 'tout en',
    because: 'parce que',
    'even though': 'bien que',
    'in order to': 'afin de',
    'so that': 'pour que',

    // Auxiliaires après la forme en -te
    ongoing: 'en cours',
    'resulting state': 'état résultant',
    'completely, or regrettably': 'complètement, ou à regret',
    'in advance': 'à l’avance',
    'try doing': 'essayer',
    'going forward': 'désormais',
    'coming to be': 'en venir à',
    'receive the favour': 'faveur reçue',
    'someone does for me': 'fait pour moi',
    'do for someone': 'faire pour autrui',

    // Auxiliaires après le radical
    'too much': 'trop',
    'easy to': 'facile à',
    'hard to': 'difficile à',
    'start to': 'commencer à',
    'keep on': 'continuer à',
    finish: 'finir de',
    again: 'refaire',
    'each other': 'mutuellement',
    completely: 'complètement',
    thoroughly: 'à fond',
    around: 'çà et là',
    'non-stop': 'sans arrêt',

    // Formes d’un mot espagnol
    or: 'ou',
    'first-person': 'première personne',
    'second-person': 'deuxième personne',
    'third-person': 'troisième personne',
    singular: 'singulier',
    plural: 'pluriel',
    masculine: 'masculin',
    feminine: 'féminin',
    present: 'présent',
    preterite: 'passé simple',
    imperfect: 'imparfait',
    'imperfect-se': 'imparfait (-se)',
    future: 'futur',
    'conditional-mood': 'conditionnel',
    indicative: 'indicatif',
    subjunctive: 'subjonctif',
    infinitive: 'infinitif',
    gerund: 'gérondif',
    participle: 'participe',
    formal: 'vouvoiement',
    informal: 'tutoiement',
    'with-tú': 'avec tú',
    'with-vos': 'avec vos',
    'vos-form': 'forme de vos',
    voseo: 'voseo',
    'second-person-semantically': 'au sens de « vous »',
    accusative: 'avec objet direct',
    dative: 'avec objet indirect',
    'object-first-person': 'objet de première personne',
    'object-second-person': 'objet de deuxième personne',
    'object-third-person': 'objet de troisième personne',
    'object-singular': 'objet au singulier',
    'object-plural': 'objet au pluriel',
    diminutive: 'diminutif',
    augmentative: 'augmentatif',
    superlative: 'superlatif',
    alternative: 'variante',
    'alt-of': 'autre graphie',

    // Terminaisons coréennes
    honorific: 'honorifique',
    'future or guess': 'futur ou supposition',
    'formal polite': 'poli formel',
    question: 'question',
    but: 'mais',
    "let's": 'proposition',
    plain: 'forme neutre',
    'shall we, or I wonder': 'suggestion ou doute',
    'I will': 'promesse',
    'just noticed': 'découverte',
    'as you know': 'comme vous le savez',
    and: 'et',
    'because, or and then': 'parce que, ou et puis',
    'but, or given that': 'mais, ou vu que',
    'even if': 'même si',
    whether: 'si… ou non',
    'adverb form': 'forme adverbiale',
    quoting: 'discours indirect',
    'used to': 'autrefois',
    topic: 'thème',
    subject: 'sujet',
    object: 'objet',
    possessive: 'possessif',
    'come to': 'finir par',
    when: 'quand',
    modifier: 'déterminatif',
    'noun form': 'forme nominale',
    becomes: 'devenir',
    'have done before': 'avoir déjà fait',
  },
};
