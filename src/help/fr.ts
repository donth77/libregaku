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
              'Dans {Paramètres → Anki}, suivez les étapes pour connecter Anki, puis choisissez le paquet des nouvelles cartes.',
              'Ouvrez une vidéo YouTube ou Netflix avec des sous-titres dans la langue que vous apprenez, et posez le pointeur sur un mot.',
            ],
            { tip: 'Anki est facultatif. Les sous-titres, les recherches et la transcription fonctionnent sans lui ; c’est lui qui retient les mots que vous connaissez.' },
          ],
          keywords: ['installer', 'installation', 'commencer', 'démarrer', 'débuter', 'première fois', 'langue', 'réglages', 'setup'],
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
                ['`R`', 'Changer le furigana : désactivé, nouveaux mots, tous les mots (japonais)'],
                ['`Shift`', 'Maintenir pour rechercher le mot sous le pointeur, quand {Paramètres → Recherche de mots → Rechercher les mots} est réglé sur Au survol avec Shift enfoncé'],
                ['`Esc`', 'Fermer la fenêtre contextuelle'],
              ],
            },
            'L’icône clavier du panneau de transcription les affiche pendant la lecture.',
          ],
          keywords: ['raccourci', 'clavier', 'touches', 'maj', 'échap', 'shortcut', 'hotkey'],
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
            { tip: 'Ajouter une ligne aux favoris n’enregistre rien, pas plus qu’ajouter une carte depuis les listes Favoris ou Mots. {Paramètres → Cartes Anki → Audio de la phrase} désactive l’enregistrement.' },
          ],
          keywords: ['son', 'voix', 'écouter', 'rejouer', 'révision', 'sentence audio'],
        },
        {
          id: 'decks',
          title: 'Choisir le paquet',
          body: [
            'Les nouvelles cartes vont dans le paquet choisi dans {Paramètres → Anki → Paquet des nouvelles cartes}.',
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
              'Suivre : un soulignement violet, pour remarquer le mot quand il apparaît. Activez-le dans {Paramètres → Fenêtre contextuelle → Bouton Suivre}.',
              'Ignorer : pour les noms et les sons. Jamais soulignés, jamais comptés.',
            ],
            'Cliquez à nouveau sur une marque pour la retirer, ou retrouvez le mot dans l’onglet Mots du panneau de transcription.',
          ],
          keywords: ['marque', 'marquer', 'connus', 'suivis', 'ignorés', 'soulignement', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Voir et modifier vos mots marqués',
          body: [
            'Dans le panneau de transcription, l’onglet Mots liste les mots que vous suivez, marquez comme connus ou ignorez, une liste pour chacun. Chaque mot a un bouton pour retirer sa marque (Ne plus ignorer, pour un mot ignoré), et un mot suivi peut devenir une carte depuis cet onglet.',
            'Chaque liste a une zone de recherche, et des boutons Copier et Exporter qui vous donnent la liste dans un fichier qu’Anki et les tableurs savent ouvrir.',
          ],
          keywords: ['liste de suivi', 'watchlist', 'suivis', 'connus', 'ignorés', 'retirer la marque', 'démarquer', 'tableur', 'excel'],
        },
      ],
    },
    {
      id: 'netflix',
      title: 'Netflix',
      about: 'Ce que change sa protection.',
      topics: [
        {
          id: 'netflix-audio',
          title: 'Audio de la phrase sur Netflix',
          body: [
            [
              'Ouvrez {Paramètres → Cartes Anki → Audio de la phrase sur Netflix} et appuyez sur Autoriser.',
              'Dans l’onglet Netflix, cliquez sur l’icône Libregaku dans la barre d’outils, puis sur Enregistrer l’audio de la phrase ici. À faire une fois par onglet.',
            ],
            'Netflix chiffre sa vidéo : Libregaku ne peut donc pas en enregistrer le son comme sur YouTube. Il enregistre l’onglet à la place, ce que Chrome n’autorise que de cette façon. Pour la même raison, les cartes Netflix n’ont pas de capture d’écran.',
          ],
          keywords: ['son', 'autorisation', 'permission', 'chiffrement', 'drm', 'capture d’onglet', 'tab capture'],
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
            'Il souligne un mot partout où il apparaît (en violet, sauf si vous changez la couleur dans {Paramètres → Soulignements}) pour que vous le remarquiez, sans créer de carte. Le mot ne compte plus comme nouveau. Les mots suivis sont listés dans l’onglet Mots du panneau de transcription.',
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
            'Connu, Suivre et Ignorer y sont gardés sous forme de notes masquées, suspendues pour ne jamais apparaître en révision : ils rejoignent ainsi vos autres appareils grâce à la synchronisation d’Anki. {Paramètres → Anki → Voir les marques dans Anki} les affiche.',
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
            'Pas directement : Libregaku communique avec Anki sur votre ordinateur grâce au greffon AnkiConnect. Anki synchronise ensuite vos cartes avec AnkiWeb et votre téléphone, comme d’habitude.',
          ],
          keywords: ['téléphone', 'mobile', 'android', 'iphone', 'ankidroid', 'synchroniser', 'sync', 'extension', 'add-on'],
        },
        {
          id: 'q-picture',
          title: 'Qu’est-ce que la capture d’écran d’une carte ?',
          body: [
            'Une image fixe de la scène, au verso de la carte, pour voir d’où vient le mot. Sur YouTube, elle est prise dans la vidéo ; Netflix masque sa vidéo aux extensions, donc les cartes créées là-bas n’en ont pas. {Paramètres → Cartes Anki → Capture d’écran} la désactive.',
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
          ],
          keywords: ['dictionnaire', 'sens', 'hongrois', 'slovène', 'anglais', 'cc-cedict', 'wiktionary', 'wiktionnaire'],
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
