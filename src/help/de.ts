import type { HelpTranslation } from './content';

/** The help in German. A chapter or topic left out shows in English. */
export const de: HelpTranslation = {
  title: 'Hilfe',
  intro: 'Wie Libregaku funktioniert, und Antworten auf häufige Fragen. Suche oder wähle ein Kapitel.',
  search: 'Suchen…',
  searchLabel: 'Hilfe durchsuchen',
  none: 'Nichts hier erwähnt „{q}“.',
  settings: 'Einstellungen',
  contents: 'Kapitel',
  tipLabel: 'Tipp:',
  then: 'dann',
  link: 'Link zu diesem Thema',
  popular: { label: 'Beliebt:' },
  chapters: [
    {
      id: 'start',
      title: 'Erste Schritte',
      about: 'Drei Entscheidungen, dann ein Video.',
      topics: [
        {
          id: 'get-started',
          title: 'Einrichten',
          body: [
            [
              'Wähle unter {Einstellungen → Sprachen} die Sprache, die du lernst, und deine eigene Sprache.',
              'Folge unter {Einstellungen → Anki} den Schritten, um Anki zu verbinden, und wähle dann den Stapel für neue Karten.',
              'Öffne ein Video auf YouTube oder Netflix mit Untertiteln in der Sprache, die du lernst, und zeige mit der Maus auf ein Wort.',
            ],
            { tip: 'Anki ist optional. Untertitel, Nachschlagen und das Transkript funktionieren auch ohne; Anki merkt sich, welche Wörter du kennst.' },
          ],
          keywords: ['einrichtung', 'installieren', 'installation', 'anfangen', 'beginnen', 'erste schritte', 'start', 'sprache', 'setup'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Beim Schauen',
      about: 'Wörter nachschlagen, das Transkript und die Tasten.',
      topics: [
        {
          id: 'look-up',
          title: 'Ein Wort nachschlagen',
          body: [
            'Zeige mit der Maus auf ein Wort im Untertitel oder im Transkript, und sein Pop-up öffnet sich: die Lesung, die ersten drei Bedeutungen und „+N weitere Bedeutungen“ für den Rest.',
            'Die Kanji und die Beispiele aus dem Video stehen im Pop-up jeweils in einer Zeile. Klicke auf eine, um sie aufzuklappen; beim nächsten Mal ist sie wieder offen.',
            'Ziehe über mehrere Wörter, um eine Wortgruppe nachzuschlagen. Klicke sie erneut an oder drücke `Esc`, um die Auswahl aufzuheben.',
            { tip: 'Standardmäßig werden Wörter per Mouseover nachgeschlagen. Unter {Einstellungen → Wörter nachschlagen → Nachschlagen per} stellst du auf Mouseover mit gedrückter `Shift`-Taste oder auf Klick um.' },
          ],
          keywords: ['wörterbuch', 'definition', 'bedeutung', 'übersetzen', 'mouseover', 'hover', 'maus', 'klicken', 'wortgruppe', 'kanji'],
        },
        {
          id: 'transcript',
          title: 'Die Transkriptleiste nutzen',
          body: [
            '`S` blendet sie ein oder aus. Klicke auf eine Zeile, um ab dort abzuspielen; das Suchfeld findet jede Zeile.',
            'Der Filter zeigt nur Zeilen mit neuen Wörtern, Zeilen mit genau einem neuen Wort oder deine gespeicherten Zeilen. Das Lesezeichen an einer Zeile oder `B` speichert sie; gespeicherte Zeilen gehen gemeinsam an Anki oder als Datei hinaus.',
          ],
          keywords: ['seitenleiste', 'sidebar', 'leiste', 'suchen', 'filtern', 'speichern', 'lesezeichen', 'exportieren', 'transkript'],
        },
        {
          id: 'colours',
          title: 'Unterstreichungsfarben ändern',
          body: [
            'Jede Unterstreichungsfarbe zeigt, wie gut du ein Wort kennst: neu, lernend, beobachtet oder bekannt. {Einstellungen → Unterstreichungen} hat für jede eine Farbauswahl, und „Zurücksetzen“ stellt die Standardfarben wieder her.',
            { tip: 'Bekannte Wörter haben keine Unterstreichung, außer {Einstellungen → Unterstreichungen → Bekannte Wörter unterstreichen} ist an.' },
          ],
          keywords: ['farbe', 'farben', 'unterstreichung', 'unterstrichen', 'palette', 'design', 'color'],
        },
        {
          id: 'keys',
          title: 'Tastenkombinationen',
          body: [
            {
              head: ['Taste', 'Funktion'],
              rows: [
                ['`←` `→`', 'Vorherige oder nächste Zeile'],
                ['`↓`', 'Zeile wiederholen'],
                ['`↑`', 'Übersetzung ein-/ausblenden'],
                ['`A`', 'Wort im Pop-up zu Anki hinzufügen'],
                ['`K`', 'Wort im Pop-up als bekannt markieren'],
                ['`B`', 'Aktuelle Zeile speichern'],
                ['`S`', 'Transkriptleiste ein-/ausblenden'],
                ['`H`', 'Untertitel weichzeichnen oder scharf stellen'],
                ['`R`', 'Furigana umschalten: aus, neue Wörter, alle (Japanisch)'],
                ['`Shift`', 'Gedrückt halten, um das Wort unter dem Mauszeiger nachzuschlagen, wenn {Einstellungen → Wörter nachschlagen → Nachschlagen per} auf „Mouseover mit Shift“ steht'],
                ['`Esc`', 'Pop-up schließen'],
              ],
            },
            'Das Tastatursymbol in der Transkriptleiste zeigt sie dir beim Schauen.',
          ],
          keywords: ['tastenkürzel', 'kürzel', 'tastatur', 'tasten', 'hotkey', 'shortcut'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Karten erstellen',
      about: 'Ein Wort oder eine ganze Zeile in Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Eine Karte erstellen',
          body: [
            'Drücke „Zu Anki hinzufügen“ unten im Pop-up eines Wortes oder `A`. Die Karte enthält das Wort, seine Lesung und Bedeutung, den Satz und seine Übersetzung, eine Aufnahme des Wortes, den Ton der Zeile selbst und ein Standbild daraus.',
            { tip: 'Aus Versehen erstellt? Klicke innerhalb weniger Minuten auf „Hinzugefügt“, um es rückgängig zu machen.' },
            'Bei einem Wort, das Anki schon hat, steht „In Anki“; klicke darauf, um das Wort in Anki zu sehen. Ist Anki geschlossen, wartet eine neue Karte im Browser und kommt in Anki, sobald es wieder antwortet.',
          ],
          keywords: ['karteikarte', 'lernkarte', 'flashcard', 'anki', 'hinzufügen', 'rückgängig', 'entfernen', 'löschen'],
        },
        {
          id: 'add-line',
          title: 'Eine Karte aus einem ganzen Satz erstellen',
          body: [
            'Im Pop-up eines Wortes macht die Sprechblase mit dem + stattdessen eine Karte aus dem ganzen Satz, mit Ton und Screenshot. Jede Zeile im Transkript hat dieselbe Schaltfläche, wenn du darauf zeigst.',
          ],
          keywords: ['satz', 'zeile', 'satzkarte', 'ganze zeile', 'sprechblase', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Satz-Audio',
          body: [
            'Wenn du aus dem Untertitel oder dem Transkript eine Karte hinzufügst – für ein Wort, eine Wortgruppe oder den ganzen Satz –, nimmt Libregaku diese Zeile aus dem Video auf und legt die Aufnahme auf die Karte. Beim Wiederholen hörst du den Satz so, wie er gesprochen wurde.',
            'Chrome kann nur aufnehmen, während das Video läuft. Deshalb wird die Zeile noch einmal abgespielt, und danach springt das Video dorthin zurück, wo du warst.',
            { tip: 'Das Speichern einer Zeile nimmt nichts auf, ebenso wenig das Hinzufügen einer Karte aus den Listen „Gespeichert“ oder „Wörter“. {Einstellungen → Anki-Karten → Satz-Audio} schaltet die Aufnahme aus.' },
          ],
          keywords: ['audio', 'ton', 'aufnahme', 'wiederholen', 'stimme', 'hören', 'anhören'],
        },
        {
          id: 'decks',
          title: 'Den Stapel wählen',
          body: [
            'Neue Karten kommen in den Stapel unter {Einstellungen → Anki → Stapel für neue Karten}.',
            'Um beim Schauen zu wechseln, schalte {Einstellungen → Wort-Pop-up → Stapelmenü} ein. Neben „Zu Anki hinzufügen“ erscheint ein ▾; „Zu … hinzufügen“ legt die Karte in diesen Stapel und schickt auch die nächsten dorthin.',
            { tip: 'Der Wortstatus wird aus {Einstellungen → Anki → Bekannte Wörter aus} gelesen. Kommen neue Karten in einen Stapel, der dort nicht gelesen wird, weisen die Einstellungen darauf hin.' },
          ],
          keywords: ['stapel', 'deck', 'unterstapel', 'neuer stapel', 'subdeck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Wörter markieren',
      about: 'Bekannt, Beobachten und Ignorieren – keins davon erstellt eine Karte.',
      topics: [
        {
          id: 'marks',
          title: 'Bekannt, Beobachten und Ignorieren',
          body: [
            'Die kleinen Schaltflächen neben dem Wort in seinem Pop-up.',
            [
              '„Bekannt“ (`K`): Du kennst das Wort – keine Unterstreichung, und es zählt als bekannt.',
              '„Beobachten“: eine lila Unterstreichung, damit dir das Wort auffällt, wenn es vorkommt. Schalte die Schaltfläche unter {Einstellungen → Wort-Pop-up → Schaltfläche „Beobachten“} ein.',
              '„Ignorieren“: für Namen und Geräusche – nie unterstrichen, nie gezählt.',
            ],
            'Klicke erneut auf eine Markierung, um sie aufzuheben, oder suche das Wort im Tab „Wörter“ der Transkriptleiste.',
          ],
          keywords: ['bekannt', 'beobachten', 'ignorieren', 'markieren', 'markierung', 'lila', 'unterstreichung', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Markierte Wörter ansehen und ändern',
          body: [
            'In der Transkriptleiste zeigt der Tab „Wörter“ die Wörter, die du beobachtest, als bekannt markiert hast oder ignorierst, in je einer Liste. Jedes Wort hat eine Schaltfläche, die seine Markierung aufhebt – „Nicht mehr ignorieren“ bei einem ignorierten –, und aus einem beobachteten Wort kannst du dort eine Karte machen.',
            'Jede Liste hat ein Suchfeld sowie die Schaltflächen „Kopieren“ und „Datei exportieren“, die dir die Liste als Datei geben, die Anki und Tabellenprogramme öffnen.',
          ],
          keywords: ['beobachtungsliste', 'watchlist', 'liste', 'ignoriert', 'bekannt', 'markierung aufheben', 'wörter', 'tabelle', 'excel'],
        },
      ],
    },
    {
      id: 'netflix',
      title: 'Netflix',
      about: 'Was sein Kopierschutz ändert.',
      topics: [
        {
          id: 'netflix-audio',
          title: 'Satz-Audio auf Netflix',
          body: [
            [
              'Öffne {Einstellungen → Anki-Karten → Satz-Audio auf Netflix} und drücke „Zulassen“.',
              'Klicke im Netflix-Tab in der Symbolleiste auf das Libregaku-Symbol und drücke „Satz-Audio hier aufnehmen“. Das machst du einmal pro Tab.',
            ],
            'Netflix verschlüsselt sein Video, deshalb kann Libregaku den Ton nicht wie auf YouTube aus dem Video aufnehmen. Stattdessen nimmt es den Tab auf, was Chrome nur auf diesem Weg erlaubt. Aus demselben Grund haben Netflix-Karten keinen Screenshot.',
          ],
          keywords: ['netflix', 'audio', 'ton', 'berechtigung', 'verschlüsselung', 'kopierschutz', 'drm', 'tab-aufnahme', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Auf dem neuesten Stand',
      topics: [
        {
          id: 'update',
          title: 'Eine neue Version laden',
          body: [
            [
              'Öffne die Erweiterungsseite deines Browsers.',
              'Klicke bei Libregaku auf den Pfeil zum Neuladen.',
              'Lade den Video-Tab neu – ein Tab, der vor dem Neuladen geöffnet war, behält die alte Version.',
            ],
            { tip: 'Unten in den Einstellungen steht, wann deine Kopie erstellt wurde.' },
          ],
          keywords: ['neu laden', 'aktualisieren', 'update', 'alte version', 'build', 'brave', 'reload'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Fragen',
      topics: [
        {
          id: 'q-track',
          title: 'Was macht „Beobachten“?',
          body: [
            'Es unterstreicht ein Wort überall, wo es vorkommt – in Lila, außer du änderst das unter {Einstellungen → Unterstreichungen} –, damit es dir auffällt, ohne eine Karte zu erstellen. Es zählt dann nicht mehr als neu. Beobachtete Wörter stehen in der Transkriptleiste im Tab „Wörter“.',
          ],
          keywords: ['beobachten', 'beobachtet', 'lila', 'violett', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Warum ist ein Wort, das ich kenne, noch unterstrichen?',
          body: [
            'Der Status kommt aus deinen Anki-Karten in den Stapeln unter {Einstellungen → Anki → Bekannte Wörter aus}. Ein Wort, dessen Karte noch kein langes Intervall hat, wird als lernend unterstrichen; ein Wort ohne Karte dort als neu. Ein Wort, das du ohne Karte kennst, kannst du als „Bekannt“ markieren.',
          ],
          keywords: ['bekannt', 'status', 'unterstreichung', 'intervall', 'langes intervall', 'mature'],
        },
        {
          id: 'q-marks-deck',
          title: 'Warum gibt es in Anki einen Stapel Libregaku::Marks?',
          body: [
            '„Bekannt“, „Beobachten“ und „Ignorieren“ werden dort als versteckte Notizen gespeichert. Sie sind dauerhaft ausgeschlossen, kommen also nie zur Wiederholung, und erreichen über die Synchronisierung von Anki deine anderen Geräte. {Einstellungen → Anki → Markierungen in Anki öffnen} zeigt sie.',
            { tip: 'Schalte {Einstellungen → Anki → Markierungen in Anki speichern} aus, um Markierungen nur in diesem Browser zu behalten.' },
          ],
          keywords: ['markierungen', 'stapel', 'ausgeschlossen', 'versteckt', 'synchronisieren', 'sync'],
        },
        {
          id: 'q-remove',
          title: 'Kann ich eine Karte entfernen?',
          body: [
            'Direkt nach dem Hinzufügen klickst du auf „Hinzugefügt“, um es rückgängig zu machen. Bei einer älteren Karte klickst du im Pop-up des Wortes auf „In Anki“ und löschst sie in Anki. Libregaku löscht nie eine Karte, die du schon gelernt hast.',
          ],
          keywords: ['löschen', 'entfernen', 'rückgängig', 'delete', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Funktioniert es mit AnkiWeb?',
          body: [
            'Nicht direkt: Libregaku spricht über die Erweiterung AnkiConnect mit Anki auf deinem Computer. Anki synchronisiert deine Karten dann wie gewohnt mit AnkiWeb und deinem Handy.',
          ],
          keywords: ['ankiweb', 'ankiconnect', 'handy', 'smartphone', 'mobil', 'ankidroid', 'synchronisieren', 'sync', 'add-on'],
        },
        {
          id: 'q-picture',
          title: 'Was ist der Screenshot auf einer Karte?',
          body: [
            'Ein Standbild der Szene auf der Rückseite der Karte, damit du siehst, woher das Wort kommt. Auf YouTube wird es aus dem Video genommen; Netflix zeigt Erweiterungen sein Video nur leer, daher haben Karten von dort keins. {Einstellungen → Anki-Karten → Screenshot} schaltet es aus.',
          ],
          keywords: ['bild', 'foto', 'standbild', 'bildschirmfoto', 'screenshot'],
        },
        {
          id: 'q-replay',
          title: 'Warum läuft die Zeile noch einmal, wenn ich eine Karte hinzufüge?',
          body: [
            'Ihr Ton wird beim Abspielen aufgenommen, deshalb läuft die Zeile noch einmal; danach springt die Wiedergabe dorthin zurück, wo sie war. {Einstellungen → Anki-Karten → Satz-Audio} schaltet das aus.',
          ],
          keywords: ['wiederholung', 'aufnahme', 'satz-audio', 'springt zurück', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Warum gibt es keine Übersetzung unter dem Untertitel?',
          body: [
            'Die Übersetzung sind die eigenen Untertitel der Website in der Sprache unter {Einstellungen → Sprachen → Deine Sprache}. Hat das Video keine in dieser Sprache, gibt es nichts anzuzeigen, und Libregaku sagt das. Es übersetzt nicht maschinell.',
          ],
          keywords: ['übersetzung', 'zweite zeile', 'doppelte untertitel', 'dual', 'deutsch', 'englisch'],
        },
        {
          id: 'q-definitions',
          title: 'Warum gibt es Definitionen nur in manchen Sprachen?',
          body: [
            'Für Japanisch kommen sie aus JMdict, das Definitionen in neun Sprachen hat. Ist deine nicht dabei, zeigt {Einstellungen → Sprachen} eine zweite Zeile, „Definitionen auf“, für die Sprache, die stattdessen verwendet wird.',
          ],
          keywords: ['definitionen', 'bedeutungen', 'sprachen', 'jmdict', 'ungarisch', 'slowenisch', 'englisch', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-data',
          title: 'Sendet Libregaku meine Daten irgendwohin?',
          body: [
            'Es gibt kein Konto und keinen Server. Wörterbücher werden einmal heruntergeladen und im Browser gespeichert; Karten gehen direkt an Anki auf deinem Computer. Solange das japanische Wörterbuch noch lädt, wird ein Wort, das du nachschlägst, an Jotoba geschickt, um es zu beantworten.',
          ],
          keywords: ['datenschutz', 'privatsphäre', 'daten', 'server', 'konto', 'tracking', 'privacy'],
        },
      ],
    },
  ],
};
