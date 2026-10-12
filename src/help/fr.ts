import type { HelpTranslation } from './content';

/** The help in French. A chapter or topic left out shows in English. */
export const fr: HelpTranslation = {
  title: 'Aide',
  intro: 'Le fonctionnement de Libregaku, et les réponses aux questions fréquentes. Lancez une recherche ou choisissez un chapitre.',
  search: 'Rechercher…',
  searchLabel: 'Rechercher dans l’aide',
  none: 'Rien ici ne mentionne « {q} ».',
  settings: 'Paramètres',
  contents: 'Chapitres',
  tipLabel: 'Astuce :',
  then: 'puis',
  link: 'Lien vers cette section',
  popular: { label: 'Populaires :' },
  chapters: [
    {
      id: 'start',
      title: 'Premiers pas',
      about: 'Trois choix, puis une vidéo.',
      topics: [
        {
          id: 'get-started',
          title: 'Configurer Libregaku',
          body: [
            [
              'Dans {Paramètres → Langues}, choisissez la langue que vous apprenez et votre propre langue.',
              'Téléchargez Anki sur https://apps.ankiweb.net. Dans {Paramètres → Anki}, suivez les étapes pour connecter Anki, puis choisissez le paquet des nouvelles cartes.',
              'Sur YouTube, Netflix ou un autre site pris en charge, ouvrez une vidéo avec des sous-titres dans la langue que vous apprenez, et posez le pointeur sur un mot.',
            ],
            { tip: 'Anki est facultatif. Les sous-titres, les recherches et la transcription fonctionnent sans lui ; c’est lui qui retient les mots que vous connaissez.' },
          ],
          keywords: ['installer', 'installation', 'commencer', 'démarrer', 'débuter', 'première fois', 'langue', 'réglages', 'setup'],
        },
        {
          id: 'anki',
          title: 'Qu’est-ce qu’Anki ?',
          body: [
            'Anki est une application gratuite de cartes mémoire. Elle vous présente à nouveau chaque carte juste avant que vous ne l’oubliiez (répétition espacée).',
            'Libregaku ajoute des cartes à Anki à partir des mots et des phrases que vous choisissez. Il lit aussi vos cartes Anki pour savoir quels mots vous connaissez déjà.',
            'Il vous faut Anki sur votre ordinateur, avec le greffon [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Téléchargez Anki sur https://apps.ankiweb.net.',
          ],
          keywords: ['flashcards', 'fiches', 'srs', 'télécharger', 'installer', 'réviser', 'révision', 'module complémentaire'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Regarder',
      about: 'Rechercher des mots, la transcription et les touches.',
      topics: [
        {
          id: 'look-up',
          title: 'Rechercher un mot',
          body: [
            'Posez le pointeur sur un mot du sous-titre ou de la transcription, et sa fenêtre contextuelle s’ouvre : la lecture, les trois premiers sens, et « +N autres sens » pour la suite.',
            'Les kanji et les exemples tirés de la vidéo occupent une ligne chacun dans la fenêtre contextuelle. Cliquez sur l’une d’elles pour l’ouvrir ; elle reste ouverte la fois suivante.',
            'Faites glisser le pointeur sur plusieurs mots pour rechercher une expression. Cliquez à nouveau dessus, ou appuyez sur `Esc`, pour l’effacer.',
            { tip: 'Par défaut, les mots se recherchent au survol. {Paramètres → Recherche de mots → Rechercher les mots} permet de choisir plutôt le survol avec `Shift` enfoncé, ou le clic.' },
          ],
          keywords: ['dictionnaire', 'définition', 'sens', 'signification', 'traduire', 'survol', 'souris', 'clic', 'maj', 'expression', 'popup', 'pop-up', 'hover'],
        },
        {
          id: 'transcript',
          title: 'Utiliser le panneau de transcription',
          body: [
            '`S` l’affiche ou le masque. Cliquez sur une ligne pour lire la vidéo à partir de là ; la zone de recherche trouve n’importe quelle ligne.',
            'Le bouton de filtre ne garde que les lignes avec de nouveaux mots, celles qui en ont exactement un, ou vos favoris. Le signet d’une ligne, ou `B`, l’ajoute aux favoris ; les favoris partent ensemble vers Anki, ou dans un fichier.',
          ],
          keywords: ['barre latérale', 'sidebar', 'panneau', 'filtrer', 'favori', 'signet', 'enregistrer', 'sauvegarder', 'exporter', 'sous-titres'],
        },
        {
          id: 'colours',
          title: 'Changer les couleurs de soulignement',
          body: [
            'Chaque couleur de soulignement indique à quel point vous connaissez un mot : nouveau, en apprentissage, suivi ou connu. {Paramètres → Soulignements} propose un sélecteur de couleur pour chacun, et Réinitialiser rétablit les couleurs par défaut.',
            { tip: 'Les mots connus ne sont pas soulignés, sauf si {Paramètres → Soulignements → Souligner les mots connus} est activé.' },
          ],
          keywords: ['couleurs', 'palette', 'thème', 'apparence', 'personnaliser', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Raccourcis clavier',
          body: [
            {
              head: ['Touche', 'Action'],
              rows: [
                ['`←` `→`', 'Ligne précédente ou suivante'],
                ['`↓`', 'Rejouer la ligne'],
                ['`↑`', 'Afficher ou masquer la traduction'],
                ['`A`', 'Ajouter à Anki le mot de la fenêtre contextuelle'],
                ['`K`', 'Marquer comme connu le mot de la fenêtre contextuelle'],
                ['`B`', 'Ajouter la ligne en cours aux favoris'],
                ['`S`', 'Afficher ou masquer le panneau de transcription'],
                ['`H`', 'Activer ou désactiver le flou des sous-titres'],
                ['`R`', 'Changer le furigana, le pinyin ou le Jyutping : désactivé, nouveaux mots, tous les mots (japonais, chinois (mandarin), cantonais)'],
                ['`Shift`', 'Maintenir pour rechercher le mot sous le pointeur, quand {Paramètres → Recherche de mots → Rechercher les mots} est réglé sur Au survol avec Shift enfoncé'],
                ['`Esc`', 'Fermer la fenêtre contextuelle'],
              ],
            },
            'L’icône clavier du panneau de transcription les affiche pendant la lecture.',
            'Désactivez {Paramètres → Sous-titres → Raccourcis à une touche} pour n’utiliser les touches de lettres qu’avec `Alt` et `Shift` enfoncées.',
            'Sans souris : atteignez un mot du sous-titre avec `Tab` et appuyez sur `Enter` pour le rechercher ; `←` `→` passent d’un mot à l’autre. Dans la transcription, `↑` `↓` passent d’une ligne à l’autre.',
          ],
          keywords: ['raccourci', 'clavier', 'touches', 'maj', 'échap', 'shortcut', 'hotkey', 'accessibilité', 'lecteur d’écran', 'alt', 'tab'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Créer des cartes',
      about: 'Un mot, ou une ligne entière, dans Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Créer une carte',
          body: [
            'Appuyez sur Ajouter à Anki en bas de la fenêtre contextuelle d’un mot, ou sur `A`. La carte contient le mot, sa lecture et son sens, la phrase et sa traduction, un enregistrement du mot, le son de la ligne elle-même et une image fixe de la scène.',
            { tip: 'Créée par erreur ? Cliquez sur Ajouté dans les minutes qui suivent pour annuler.' },
            'Pour un mot qu’Anki a déjà, le bouton affiche Dans Anki ; cliquez dessus pour voir le mot dans Anki. Si Anki est fermé, la nouvelle carte attend dans le navigateur et y est ajoutée dès qu’Anki répond.',
          ],
          keywords: ['flashcard', 'fiche', 'ajouter', 'annuler', 'supprimer', 'retirer', 'erreur'],
        },
        {
          id: 'add-line',
          title: 'Créer une carte d’une phrase entière',
          body: [
            'Dans la fenêtre contextuelle d’un mot, la bulle de dialogue avec un + crée à la place une carte de la phrase entière, avec son audio et une capture d’écran. Chaque ligne de la transcription a le même bouton quand vous la survolez.',
          ],
          keywords: ['carte de phrase', 'ligne entière', 'bulle', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Audio de la phrase',
          body: [
            'Quand vous ajoutez une carte depuis le sous-titre ou la transcription, pour un mot, une expression ou la phrase entière, Libregaku enregistre cette ligne de la vidéo et met l’enregistrement sur la carte. Pendant vos révisions, vous entendez la phrase telle qu’elle a été dite.',
            'Chrome ne peut enregistrer que pendant la lecture de la vidéo : la ligne est donc rejouée une fois, puis la vidéo revient là où vous en étiez.',
            { tip: 'Ajouter une ligne aux favoris n’enregistre rien, pas plus qu’ajouter une carte depuis les listes des Favoris. {Paramètres → Cartes Anki → Audio de la phrase} désactive l’enregistrement.' },
          ],
          keywords: ['son', 'voix', 'écouter', 'rejouer', 'révision', 'sentence audio'],
        },
        {
          id: 'decks',
          title: 'Choisir le paquet',
          body: [
            'Les nouvelles cartes vont dans le paquet choisi dans {Paramètres → Anki → Paquet des nouvelles cartes}.',
            'Chaque langue apprise a son propre paquet. Tant que vous n’en avez pas choisi, ses cartes vont dans un paquet créé pour elle avec la première carte : Libregaku-JA pour le japonais, Libregaku-ES pour l’espagnol. Changez {Paramètres → Langues → J’apprends} et le paquet change avec elle.',
            'Pour en changer pendant la lecture, activez {Paramètres → Fenêtre contextuelle → Menu des paquets}. Un ▾ apparaît à côté du bouton Ajouter à Anki ; « Ajouter à » un paquet y ajoute la carte et y envoie aussi les suivantes.',
            { tip: 'Le statut des mots est lu dans {Paramètres → Anki → Lire les mots connus dans}. Si les nouvelles cartes vont dans un paquet qui n’y est pas lu, Paramètres vous le signale.' },
          ],
          keywords: ['sous-paquet', 'nouveau paquet', 'créer un paquet', 'deck', 'subdeck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Marquer des mots',
      about: 'Connu, Suivre et Ignorer : aucun ne crée de carte.',
      topics: [
        {
          id: 'marks',
          title: 'Connu, Suivre et Ignorer',
          body: [
            'Les petits boutons à côté du mot, dans sa fenêtre contextuelle.',
            [
              'Connu (`K`) : vous le connaissez. Pas de soulignement, et il compte comme connu.',
              'Suivre : un soulignement violet, pour remarquer le mot quand il apparaît.',
              'Ignorer : pour les noms et les sons. Jamais soulignés, jamais comptés.',
            ],
            'Cliquez à nouveau sur une marque pour la retirer, ou retrouvez le mot dans l’onglet Favoris du panneau de transcription.',
          ],
          keywords: ['marque', 'marquer', 'connus', 'suivis', 'ignorés', 'soulignement', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Voir et modifier vos mots marqués',
          body: [
            'Dans le panneau de transcription, l’onglet Favoris liste les lignes que vous gardez et les mots que vous suivez, marquez comme connus ou ignorez, une liste pour chacun. Chaque mot a un bouton pour retirer sa marque (Ne plus ignorer, pour un mot ignoré), et un mot suivi peut devenir une carte depuis cet onglet.',
            'Chaque langue a ses propres listes. L’onglet Favoris affiche celles de la langue que vous apprenez, et un mot marqué dans une langue ne l’est pas dans une autre.',
            'Chaque liste a une zone de recherche, et des boutons Copier et Exporter qui vous donnent la liste dans un fichier qu’Anki et les tableurs savent ouvrir.',
          ],
          keywords: ['liste de suivi', 'watchlist', 'suivis', 'connus', 'ignorés', 'retirer la marque', 'démarquer', 'tableur', 'excel'],
        },
      ],
    },
    {
      id: 'supported-sites',
      title: 'Sites pris en charge',
      about: 'Les sites sur lesquels Libregaku fonctionne, et ce qui les distingue.',
      topics: [
        {
          id: 'supported-sites-list',
          title: 'Sur quels sites Libregaku fonctionne-t-il ?',
          body: [
            'Libregaku affiche des sous-titres interactifs sur la vidéo sur ces sites. Il utilise les sous-titres que le site propose lui-même, dans la langue que vous apprenez.',
            {
              head: ['Site', 'Audio de la phrase et capture d’écran'],
              rows: [
                ['YouTube', 'Pris dans la vidéo.'],
                ['Netflix', 'Enregistré depuis l’onglet ; pas de capture d’écran.'],
                ['Disney+', 'Enregistré depuis l’onglet ; pas de capture d’écran.'],
                ['Prime Video', 'Enregistré depuis l’onglet ; pas de capture d’écran.'],
                ['Max', 'Enregistré depuis l’onglet ; pas de capture d’écran.'],
                ['Apple TV+', 'Enregistré depuis l’onglet ; pas de capture d’écran.'],
              ],
            },
            'Le chapitre sur les sites protégés explique comment le son est enregistré depuis l’onglet. Une vidéo sans sous-titres dans la langue que vous apprenez n’a rien à afficher, et Libregaku le dit.',
          ],
          keywords: ['youtube', 'netflix', 'disney', 'prime video', 'max', 'hbo', 'sites', 'compatibles', 'streaming'],
        },
      ],
    },
    {
      id: 'protected-sites',
      title: 'Sites protégés',
      about: 'Les sites qui chiffrent leurs vidéos : Netflix, Disney+, Prime Video, Max et Apple TV+. Ce que change cette protection.',
      topics: [
        {
          id: 'protected-sites-audio',
          title: 'Audio de la phrase sur les sites protégés',
          body: [
            [
              'Ouvrez {Paramètres → Cartes Anki → Audio de la phrase sur les sites protégés} et appuyez sur Autoriser.',
              'Dans l’onglet de la vidéo, cliquez sur l’icône Libregaku dans la barre d’outils, puis sur Enregistrer l’audio de la phrase ici. À faire une fois par onglet.',
            ],
            'Les sites protégés chiffrent leurs vidéos : Libregaku ne peut donc pas en enregistrer le son comme sur YouTube. Il enregistre l’onglet à la place, ce que Chrome n’autorise que de cette façon. Pour la même raison, les cartes créées sur ces sites n’ont pas de capture d’écran.',
          ],
          keywords: ['netflix', 'disney', 'prime video', 'max', 'hbo', 'son', 'autorisation', 'permission', 'chiffrement', 'drm', 'capture d’onglet', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Mises à jour',
      topics: [
        {
          id: 'update',
          title: 'Charger une nouvelle version',
          body: [
            [
              'Ouvrez la page des extensions de votre navigateur.',
              'Cliquez sur la flèche de rechargement de Libregaku.',
              'Rechargez l’onglet de la vidéo : un onglet ouvert avant le rechargement garde l’ancienne version.',
            ],
            { tip: 'Le bas de Paramètres indique quand la copie que vous utilisez a été compilée.' },
          ],
          keywords: ['recharger', 'actualiser', 'mettre à jour', 'ancienne version', 'compilation', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Questions',
      topics: [
        {
          id: 'q-track',
          title: 'À quoi sert Suivre ?',
          body: [
            'Il souligne un mot partout où il apparaît (en violet, sauf si vous changez la couleur dans {Paramètres → Soulignements}) pour que vous le remarquiez, sans créer de carte. Le mot ne compte plus comme nouveau. Les mots suivis sont listés dans l’onglet Favoris du panneau de transcription.',
          ],
          keywords: ['suivi', 'violet', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Pourquoi un mot que je connais est-il encore souligné ?',
          body: [
            'Le statut vient de vos cartes Anki, dans les paquets de {Paramètres → Anki → Lire les mots connus dans}. Un mot dont la carte n’est pas encore mature est souligné comme en apprentissage ; un mot sans carte dans ces paquets, comme nouveau. Un mot que vous connaissez sans en avoir de carte peut être marqué Connu.',
          ],
          keywords: ['statut', 'soulignement', 'mature', 'paquets', 'scope'],
        },
        {
          id: 'q-marks-deck',
          title: 'Pourquoi y a-t-il un paquet Libregaku::Marks dans Anki ?',
          body: [
            'Connu, Suivre et Ignorer y sont gardés sous forme de notes masquées, suspendues pour ne jamais apparaître en révision : ils rejoignent ainsi vos autres appareils grâce à la synchronisation d’Anki. Dans ce paquet, chaque langue a le sien, par exemple Libregaku::Marks::JA. {Paramètres → Anki → Voir les marques dans Anki} les affiche.',
            { tip: 'Désactivez {Paramètres → Anki → Garder les marques dans Anki} pour ne garder les marques que dans ce navigateur.' },
          ],
          keywords: ['marques', 'suspendu', 'masqué', 'synchroniser', 'sync', 'deck'],
        },
        {
          id: 'q-remove',
          title: 'Puis-je supprimer une carte ?',
          body: [
            'Juste après l’ajout, cliquez sur Ajouté pour l’annuler. Pour une carte plus ancienne, cliquez sur Dans Anki dans la fenêtre contextuelle du mot, puis supprimez-la dans Anki. Libregaku ne supprime jamais une carte que vous avez étudiée.',
          ],
          keywords: ['effacer', 'retirer', 'annuler', 'delete', 'remove', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Libregaku fonctionne-t-il avec AnkiWeb ?',
          body: [
            'Pas directement : Libregaku communique avec Anki sur votre ordinateur grâce au greffon [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Anki synchronise ensuite vos cartes avec AnkiWeb et votre téléphone, comme d’habitude.',
          ],
          keywords: ['téléphone', 'mobile', 'android', 'iphone', 'ankidroid', 'synchroniser', 'sync', 'extension', 'add-on'],
        },
        {
          id: 'q-picture',
          title: 'Qu’est-ce que la capture d’écran d’une carte ?',
          body: [
            'Une image fixe de la scène, au verso de la carte, pour voir d’où vient le mot. Sur YouTube, elle est prise dans la vidéo ; les sites protégés masquent leurs vidéos aux extensions, donc les cartes créées sur ces sites n’en ont pas. {Paramètres → Cartes Anki → Capture d’écran} la désactive.',
          ],
          keywords: ['image', 'photo', 'verso', 'screenshot'],
        },
        {
          id: 'q-replay',
          title: 'Pourquoi la ligne est-elle rejouée quand j’ajoute une carte ?',
          body: [
            'Son audio est enregistré pendant la lecture : la ligne est donc rejouée une fois, puis la lecture revient là où elle en était. {Paramètres → Cartes Anki → Audio de la phrase} le désactive.',
          ],
          keywords: ['rejouer', 'retour en arrière', 'saute', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Pourquoi n’y a-t-il pas de traduction sous le sous-titre ?',
          body: [
            'La traduction, ce sont les sous-titres du site lui-même dans la langue de {Paramètres → Langues → Votre langue}. Si la vidéo n’en a pas dans cette langue, il n’y a rien à afficher, et Libregaku vous le dit. Il ne fait pas de traduction automatique.',
          ],
          keywords: ['seconde ligne', 'double', 'sous-titres doubles', 'bilingue', 'traduire', 'français', 'anglais', 'dual'],
        },
        {
          id: 'q-definitions',
          title: 'Pourquoi les définitions ne sont-elles disponibles que dans certaines langues ?',
          body: [
            'Pour le japonais, elles viennent de JMdict, qui propose des définitions dans neuf langues. Si la vôtre n’en fait pas partie, {Paramètres → Langues} affiche une deuxième ligne, Définitions en, pour choisir la langue à utiliser à la place.',
            'Les dictionnaires de chinois (mandarin), de coréen, d’espagnol, de français et d’allemand sont rédigés en anglais. Quand il en existe un dans votre langue pour la paire, il est utilisé en premier.',
          ],
          keywords: ['dictionnaire', 'sens', 'hongrois', 'slovène', 'anglais', 'cc-cedict', 'wiktionary', 'wiktionnaire'],
        },
        {
          id: 'q-languages',
          title: 'Quelles langues puis-je apprendre ?',
          body: [
            'Le japonais, le chinois (mandarin), le cantonais, le coréen, l’espagnol, le français et l’allemand ont un dictionnaire, et un mot est relié à sa carte quelle que soit la forme sous laquelle il est dit : 갔어요 trouve une carte de 가다, et hablábamos une carte de hablar. Le japonais affiche le furigana au-dessus des mots, le chinois (mandarin) le pinyin et le cantonais le Jyutping.',
            'Les autres langues de {Paramètres → Langues → J’apprends} sont marquées comme limitées. Leurs mots sont séparés, mais elles n’ont pas encore de dictionnaire.',
            'Le dictionnaire d’une langue est téléchargé la première fois que vous la choisissez. Le téléchargement pèse de 11 à 27 Mo ; sur le disque, il occupe 100 Mo pour le chinois (mandarin), 140 Mo pour le français, 200 Mo pour le coréen et l’allemand, et 470 Mo pour l’espagnol. Un dictionnaire dans votre propre langue, quand il y en a un, est un second téléchargement pouvant atteindre 18 Mo. Le japonais télécharge aussi un second dictionnaire, qui sert à séparer les lignes en mots : 46 Mo, et 190 Mo sur le disque.',
          ],
          keywords: ['coréen', 'mandarin', 'cantonais', 'jyutping', 'espagnol', 'japonais', 'limité', 'prise en charge', 'disponibles', 'taille'],
        },
        {
          id: 'q-data',
          title: 'Libregaku envoie-t-il mes données quelque part ?',
          body: [
            'Il n’y a ni compte ni serveur. Les dictionnaires sont téléchargés une fois et gardés dans le navigateur ; les cartes vont directement dans Anki sur votre ordinateur. Tant que le dictionnaire japonais est en cours de téléchargement, un mot que vous recherchez est envoyé à Jotoba pour obtenir la réponse.',
          ],
          keywords: ['confidentialité', 'vie privée', 'serveur', 'compte', 'pistage','sécurité', 'internet', 'privacy'],
        },
      ],
    },
  ],
};
