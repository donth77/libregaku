import type { HelpTranslation } from './content';

/** The help in Dutch. A chapter or topic left out shows in English. */
export const nl: HelpTranslation = {
  title: 'Help',
  intro: 'Hoe Libregaku werkt, en antwoorden op wat mensen vragen. Zoek, of kies een hoofdstuk.',
  search: 'Zoeken…',
  searchLabel: 'Help doorzoeken',
  none: 'Niets hier noemt “{q}”.',
  settings: 'Instellingen',
  contents: 'Hoofdstukken',
  tipLabel: 'Tip:',
  then: 'dan',
  link: 'Link naar dit onderwerp',
  popular: { label: 'Populair:' },
  chapters: [
    {
      id: 'start',
      title: 'Aan de slag',
      about: 'Drie keuzes, daarna een video.',
      topics: [
        {
          id: 'get-started',
          title: 'Instellen',
          body: [
            [
              'Kies in {Instellingen → Talen} de taal die je leert en je eigen taal.',
              'Download Anki via https://apps.ankiweb.net. Volg in {Instellingen → Anki} de stappen om Anki te koppelen, en kies dan de set voor nieuwe kaarten.',
              'Open op YouTube, Netflix of een andere ondersteunde site een video met ondertitels in de taal die je leert, en wijs met je muis een woord aan.',
            ],
            { tip: 'Anki is optioneel. Ondertitels, opzoeken en het transcript werken ook zonder; Anki onthoudt welke woorden je kent.' },
          ],
          keywords: ['instellen', 'installeren', 'installatie', 'beginnen', 'starten', 'eerste keer', 'taal', 'setup'],
        },
        {
          id: 'anki',
          title: 'Wat is Anki?',
          body: [
            'Anki is een gratis flashcard-app. De app laat je elke kaart opnieuw zien, net voordat je hem zou vergeten (gespreide herhaling).',
            'Libregaku maakt in Anki kaarten van de woorden en zinnen die je kiest. Het leest ook je Anki-kaarten om te zien welke woorden je al kent.',
            'Je hebt Anki op je computer nodig, met de add-on [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Download Anki via https://apps.ankiweb.net.',
          ],
          keywords: ['flitskaarten', 'spaced repetition', 'srs', 'downloaden', 'installeren', 'herhalen', 'plug-in', 'overhoren'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Kijken',
      about: 'Woorden opzoeken, het transcript en de toetsen.',
      topics: [
        {
          id: 'look-up',
          title: 'Een woord opzoeken',
          body: [
            'Wijs met je muis een woord aan in de ondertitel of het transcript, en de pop-up opent: de lezing, de eerste drie betekenissen en “+N betekenissen meer” voor de rest.',
            'De kanji en de voorbeelden uit de video staan elk op één regel in de pop-up. Klik op een ervan om die te openen; de volgende keer staat die nog open.',
            'Sleep over meerdere woorden om een woordgroep op te zoeken. Klik er nog eens op, of druk op `Esc`, om de selectie op te heffen.',
            { tip: 'Woorden worden standaard opgezocht bij aanwijzen. Met {Instellingen → Woorden opzoeken → Opzoeken bij} zet je dat op aanwijzen met `Shift` ingedrukt, of op klikken.' },
          ],
          keywords: ['woordenboek', 'definitie', 'betekenis', 'vertalen', 'muis', 'aanwijzen', 'hover', 'klikken', 'woordgroep', 'kanji'],
        },
        {
          id: 'transcript',
          title: 'Het transcriptpaneel gebruiken',
          body: [
            '`S` toont of verbergt het. Klik op een regel om vanaf daar af te spelen; het zoekvak vindt elke regel.',
            'De filterknop toont alleen regels met nieuwe woorden, regels met precies één nieuw woord, of je opgeslagen regels. De bladwijzer bij een regel, of `B`, slaat die regel op; opgeslagen regels gaan samen naar Anki, of als bestand naar buiten.',
          ],
          keywords: ['zijbalk', 'sidebar', 'paneel', 'zoeken', 'filteren', 'opslaan', 'bladwijzer', 'exporteren', 'transcript'],
        },
        {
          id: 'colours',
          title: 'De onderstreepkleuren wijzigen',
          body: [
            'Elke onderstreepkleur toont hoe goed je een woord kent: nieuw, aan het leren, gevolgd of bekend. {Instellingen → Onderstrepingen} heeft voor elke kleur een kleurkiezer, en “Herstellen” zet de standaardkleuren terug.',
            { tip: 'Bekende woorden hebben geen onderstreping, tenzij {Instellingen → Onderstrepingen → Bekende woorden onderstrepen} aanstaat.' },
          ],
          keywords: ['kleur', 'kleuren', 'onderstreping', 'onderstreept', 'palet', 'thema', 'color'],
        },
        {
          id: 'keys',
          title: 'Sneltoetsen',
          body: [
            {
              head: ['Toets', 'Functie'],
              rows: [
                ['`←` `→`', 'Vorige of volgende regel'],
                ['`↓`', 'Regel herhalen'],
                ['`↑`', 'Vertaling tonen of verbergen'],
                ['`A`', 'Woord in de pop-up toevoegen aan Anki'],
                ['`K`', 'Woord in de pop-up markeren als bekend'],
                ['`B`', 'Huidige regel opslaan'],
                ['`S`', 'Transcriptpaneel tonen of verbergen'],
                ['`H`', 'Ondertitels vervagen of scherp maken'],
                ['`R`', 'Furigana, pinyin of Jyutping wisselen: uit, nieuwe woorden, alle (Japans, Chinees (Mandarijn), Kantonees)'],
                ['`Shift`', 'Ingedrukt houden om het woord onder de muis op te zoeken, als {Instellingen → Woorden opzoeken → Opzoeken bij} op “Aanwijzen met Shift” staat'],
                ['`Esc`', 'Pop-up sluiten'],
              ],
            },
            'De toetsenbordknop in het transcriptpaneel toont ze terwijl je kijkt.',
            'Zet {Instellingen → Ondertitels → Sneltoetsen met één toets} uit om de lettertoetsen alleen met `Alt` en `Shift` ingedrukt te gebruiken.',
            'Zonder muis: ga met `Tab` naar een woord in de ondertitel en druk op `Enter` om het op te zoeken; met `←` `→` ga je van woord naar woord. In het transcript ga je met `↑` `↓` van regel naar regel.',
          ],
          keywords: ['sneltoets', 'toetsenbord', 'toetsen', 'toetscombinatie', 'shortcut', 'hotkey', 'toegankelijkheid', 'schermlezer', 'alt', 'tab'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Kaarten maken',
      about: 'Een woord, of een hele regel, in Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Een kaart maken',
          body: [
            'Druk op “Toevoegen aan Anki” onderaan de pop-up van een woord, of op `A`. De kaart bevat het woord, de lezing en betekenis, de zin en de vertaling, een opname van het woord, het geluid van de regel zelf en een stilstaand beeld daaruit.',
            { tip: 'Per ongeluk gemaakt? Klik binnen een paar minuten op “Toegevoegd” om het ongedaan te maken.' },
            'Bij een woord dat al in Anki staat, zie je “In Anki”; klik erop om het woord in Anki te bekijken. Is Anki gesloten, dan wacht een nieuwe kaart in de browser en gaat ze naar Anki zodra Anki weer antwoordt.',
          ],
          keywords: ['flashcard', 'flitskaart', 'anki', 'toevoegen', 'ongedaan maken', 'verwijderen', 'wissen'],
        },
        {
          id: 'add-line',
          title: 'Een kaart van een hele zin maken',
          body: [
            'In de pop-up van een woord maakt het tekstballonnetje met een + in plaats daarvan een kaart van de hele zin, met het geluid en een screenshot. Elke regel van het transcript heeft dezelfde knop als je de regel aanwijst.',
          ],
          keywords: ['zin', 'regel', 'zinskaart', 'hele regel', 'tekstballon', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Zinsaudio',
          body: [
            'Als je een kaart toevoegt vanuit de ondertitel of het transcript, voor een woord, een woordgroep of de hele zin, neemt Libregaku die regel uit de video op en zet de opname op de kaart. Bij het herhalen hoor je de zin zoals hij werd uitgesproken.',
            'Chrome kan alleen opnemen terwijl de video speelt, dus de regel wordt nog een keer afgespeeld, en daarna gaat de video terug naar waar je was.',
            { tip: 'Een regel opslaan neemt niets op, en een kaart toevoegen vanuit de lijsten onder “Opgeslagen” ook niet. {Instellingen → Anki-kaarten → Zinsaudio} zet het opnemen uit.' },
          ],
          keywords: ['audio', 'geluid', 'opname', 'herhalen', 'stem', 'luisteren'],
        },
        {
          id: 'decks',
          title: 'De set kiezen',
          body: [
            'Nieuwe kaarten gaan naar de set in {Instellingen → Anki → Set voor nieuwe kaarten}.',
            'Elke taal die je leert, heeft een eigen set. Tot je er een kiest, gaan de kaarten naar een set die bij de eerste kaart voor die taal wordt gemaakt: Libregaku-JA voor Japans, Libregaku-ES voor Spaans. Wijzig je {Instellingen → Talen → Ik leer}, dan verandert de set mee.',
            'Wil je tijdens het kijken wisselen, zet dan {Instellingen → Woordpop-up → Setmenu} aan. Naast “Toevoegen aan Anki” verschijnt een ▾; “Toevoegen aan” een set zet de kaart daar en stuurt ook de volgende kaarten daarheen.',
            { tip: 'De woordstatus wordt gelezen uit {Instellingen → Anki → Bekende woorden uit}. Gaan nieuwe kaarten naar een set die daar niet onder valt, dan meldt Instellingen dat.' },
          ],
          keywords: ['set', 'deck', 'subset', 'stapel', 'nieuwe set', 'subdeck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Woorden markeren',
      about: 'Bekend, Volgen en Negeren – geen van drieën maakt een kaart.',
      topics: [
        {
          id: 'marks',
          title: 'Bekend, Volgen en Negeren',
          body: [
            'De kleine knoppen naast het woord in de pop-up.',
            [
              '“Bekend” (`K`): je kent het woord – geen onderstreping, en het telt als bekend.',
              '“Volgen”: een paarse onderstreping, zodat het woord je opvalt als het voorkomt.',
              '“Negeren”: voor namen en geluiden – nooit onderstreept, nooit geteld.',
            ],
            'Klik nog eens op een markering om haar te verwijderen, of zoek het woord op in het tabblad “Opgeslagen” van het transcriptpaneel.',
          ],
          keywords: ['bekend', 'volgen', 'negeren', 'markeren', 'markering', 'paars', 'onderstreping', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Je gemarkeerde woorden bekijken en wijzigen',
          body: [
            'In het transcriptpaneel toont het tabblad “Opgeslagen” de regels die je opslaat en de woorden die je volgt, als bekend hebt gemarkeerd of negeert, elk in een eigen lijst. Elk woord heeft een knop om de markering te verwijderen – “Niet meer negeren” bij een genegeerd woord – en van een gevolgd woord kun je daar een kaart maken.',
            'Elke taal heeft eigen lijsten. Het tabblad “Opgeslagen” toont die van de taal die je leert, en een woord dat je in de ene taal hebt gemarkeerd, is in een andere taal niet gemarkeerd.',
            'Elke lijst heeft een zoekvak en de knoppen “Kopiëren” en “Bestand exporteren”, die je de lijst geven als bestand dat Anki en spreadsheets kunnen openen.',
          ],
          keywords: ['volglijst', 'watchlist', 'lijst', 'genegeerd', 'bekend', 'markering verwijderen', 'woorden', 'spreadsheet', 'excel'],
        },
      ],
    },
    {
      id: 'supported-sites',
      title: 'Ondersteunde sites',
      about: 'De sites waarop Libregaku werkt en wat daartussen verschilt.',
      topics: [
        {
          id: 'supported-sites-list',
          title: 'Op welke sites werkt het?',
          body: [
            'Libregaku tekent interactieve ondertitels over de video op deze sites. Het gebruikt de ondertitels die de site zelf aanbiedt, in de taal die je leert.',
            {
              head: ['Site', 'Zinsaudio en screenshot'],
              rows: [
                ['YouTube', 'Uit de video gehaald.'],
                ['Netflix', 'Opgenomen vanaf het tabblad; geen screenshot.'],
                ['Disney+', 'Opgenomen vanaf het tabblad; geen screenshot.'],
                ['Prime Video', 'Opgenomen vanaf het tabblad; geen screenshot.'],
                ['HBO Max', 'Opgenomen vanaf het tabblad; geen screenshot.'],
                ['Apple TV', 'Opgenomen vanaf het tabblad; geen screenshot.'],
                ['Viki', 'Opgenomen vanaf het tabblad; geen screenshot.'],
              ],
            },
            'Het hoofdstuk over beschermde sites legt uit hoe het geluid vanaf het tabblad wordt opgenomen. Een video zonder ondertitels in de taal die je leert heeft niets te tonen, en Libregaku zegt dat.',
          ],
          keywords: ['youtube', 'netflix', 'disney', 'prime video', 'max', 'hbo', 'viki', 'rakuten', 'sites', 'ondersteund', 'streaming'],
        },
      ],
    },
    {
      id: 'protected-sites',
      title: 'Beschermde sites',
      about: 'De sites die hun video versleutelen: Netflix, Disney+, Prime Video, HBO Max, Apple TV en Viki. Wat dat verandert.',
      topics: [
        {
          id: 'protected-sites-audio',
          title: 'Zinsaudio op beschermde sites',
          body: [
            [
              'Open {Instellingen → Anki-kaarten → Zinsaudio op beschermde sites} en druk op “Toestaan”.',
              'Ga naar het tabblad waarin de video speelt, klik op het Libregaku-icoon in de werkbalk en druk op “Zinsaudio hier opnemen”. Doe dit één keer per tabblad.',
            ],
            'Beschermde sites versleutelen hun video, dus Libregaku kan het geluid niet uit de video opnemen zoals op YouTube. Het neemt in plaats daarvan het tabblad op, wat Chrome alleen op deze manier toestaat. Om dezelfde reden hebben kaarten die je daar maakt geen screenshot.',
          ],
          keywords: ['netflix', 'disney', 'prime video', 'max', 'hbo', 'viki', 'rakuten', 'audio', 'geluid', 'toestemming', 'versleuteling', 'beveiliging', 'drm', 'tabblad opnemen', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Up-to-date blijven',
      topics: [
        {
          id: 'update',
          title: 'Een nieuwe versie laden',
          body: [
            [
              'Open de extensiepagina van je browser.',
              'Klik bij Libregaku op de pijl om opnieuw te laden.',
              'Laad het tabblad met de video opnieuw – een tabblad dat vóór het herladen al open was, houdt de oude versie.',
            ],
            { tip: 'Onderaan Instellingen staat wanneer de kopie die je gebruikt is gebouwd.' },
          ],
          keywords: ['herladen', 'opnieuw laden', 'vernieuwen', 'bijwerken', 'update', 'oude versie', 'build', 'brave', 'reload'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Vragen',
      topics: [
        {
          id: 'q-track',
          title: 'Wat doet “Volgen”?',
          body: [
            'Het onderstreept een woord overal waar het voorkomt – in paars, tenzij je dat wijzigt in {Instellingen → Onderstrepingen} – zodat het je opvalt, zonder een kaart te maken. Het telt niet meer als nieuw. Gevolgde woorden staan in het transcriptpaneel, onder het tabblad “Opgeslagen”.',
          ],
          keywords: ['volgen', 'gevolgd', 'paars', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Waarom is een woord dat ik ken nog onderstreept?',
          body: [
            'De status komt uit je Anki-kaarten, in de sets onder {Instellingen → Anki → Bekende woorden uit}. Een woord waarvan de kaart nog niet volwassen is, wordt onderstreept als aan het leren; een woord zonder kaart in die sets als nieuw. Een woord dat je kent zonder kaart, kun je markeren als “Bekend”.',
          ],
          keywords: ['bekend', 'status', 'onderstreping', 'volwassen', 'mature'],
        },
        {
          id: 'q-marks-deck',
          title: 'Waarom staat er een set Libregaku::Marks in Anki?',
          body: [
            '“Bekend”, “Volgen” en “Negeren” worden daar bewaard als verborgen aantekeningen. Ze zijn opgeschort, zodat ze nooit in een herhaling verschijnen, en bereiken via de synchronisatie van Anki je andere apparaten. Daarin heeft elke taal een eigen set, zoals Libregaku::Marks::JA. {Instellingen → Anki → Markeringen openen in Anki} toont ze.',
            { tip: 'Zet {Instellingen → Anki → Markeringen in Anki bewaren} uit om markeringen alleen in deze browser te houden.' },
          ],
          keywords: ['markeringen', 'set', 'opgeschort', 'verborgen', 'synchroniseren', 'sync'],
        },
        {
          id: 'q-remove',
          title: 'Kan ik een kaart verwijderen?',
          body: [
            'Direct na het toevoegen klik je op “Toegevoegd” om het ongedaan te maken. Voor een oudere kaart klik je in de pop-up van het woord op “In Anki” en verwijder je de kaart in Anki. Libregaku verwijdert nooit een kaart die je hebt bestudeerd.',
          ],
          keywords: ['verwijderen', 'wissen', 'ongedaan maken', 'delete', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Werkt het met AnkiWeb?',
          body: [
            'Niet rechtstreeks: Libregaku praat met Anki op je computer via de add-on [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Anki synchroniseert je kaarten daarna zoals gewoonlijk met AnkiWeb en je telefoon.',
          ],
          keywords: ['ankiweb', 'ankiconnect', 'telefoon', 'mobiel', 'ankidroid', 'synchroniseren', 'sync', 'add-on'],
        },
        {
          id: 'q-picture',
          title: 'Wat is de screenshot op een kaart?',
          body: [
            'Een stilstaand beeld van de scène, op de achterkant van de kaart, zodat je ziet waar het woord vandaan komt. Op YouTube wordt het uit de video genomen; beschermde sites tonen extensies alleen een leeg beeld, dus kaarten van daar hebben er geen. {Instellingen → Anki-kaarten → Screenshot} zet het uit.',
          ],
          keywords: ['afbeelding', 'plaatje', 'beeld', 'schermafbeelding', 'screenshot'],
        },
        {
          id: 'q-replay',
          title: 'Waarom speelt de regel opnieuw af als ik een kaart toevoeg?',
          body: [
            'Het geluid wordt opgenomen terwijl de regel speelt, dus de regel wordt nog een keer afgespeeld; daarna gaat het afspelen terug naar waar het was. {Instellingen → Anki-kaarten → Zinsaudio} zet het uit.',
          ],
          keywords: ['opnieuw afspelen', 'opname', 'zinsaudio', 'springt terug', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Waarom staat er geen vertaling onder de ondertitel?',
          body: [
            'De vertaling zijn de eigen ondertitels van de site in de taal onder {Instellingen → Talen → Jouw taal}. Heeft de video er geen in die taal, dan valt er niets te tonen, en dat meldt Libregaku. Het gebruikt geen machinevertaling.',
          ],
          keywords: ['vertaling', 'tweede regel', 'dubbele ondertitels', 'dual', 'nederlands', 'engels'],
        },
        {
          id: 'q-definitions',
          title: 'Waarom zijn definities maar in sommige talen?',
          body: [
            'Voor Japans komen ze uit JMdict, dat definities in negen talen heeft. Staat jouw taal daar niet bij, dan toont {Instellingen → Talen} een tweede rij, “Definities in”, voor de taal die in plaats daarvan wordt gebruikt.',
            'De woordenboeken voor Chinees (Mandarijn), Koreaans, Spaans, Frans, Duits, Italiaans en Portugees zijn in het Engels geschreven. Waar er voor het paar een in je eigen taal bestaat, wordt dat eerst gebruikt.',
          ],
          keywords: ['definities', 'betekenissen', 'talen', 'jmdict', 'hongaars', 'sloveens', 'engels', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-languages',
          title: 'Welke talen kan ik leren?',
          body: [
            'Japans, Chinees (Mandarijn), Kantonees, Koreaans, Spaans, Frans, Duits, Italiaans en Portugees hebben een woordenboek, en een woord wordt aan de kaart gekoppeld in elke vorm waarin het gezegd wordt: 갔어요 vindt een kaart voor 가다, en hablábamos een voor hablar. Japans toont furigana boven woorden, Chinees (Mandarijn) pinyin en Kantonees Jyutping.',
            'De andere talen onder {Instellingen → Talen → Ik leer} zijn gemarkeerd als beperkt. Hun woorden worden gesplitst, maar er is nog geen woordenboek.',
            'Het woordenboek van een taal wordt gedownload als je die taal voor het eerst kiest. De download is 11 tot 27 MB; op schijf neemt het 100 MB in voor Chinees (Mandarijn), 140 MB voor Frans, 200 MB voor Koreaans en Duits en 470 MB voor Spaans. Een woordenboek in je eigen taal is, waar er een is, een tweede download van maximaal 18 MB. Japans downloadt daarnaast een tweede woordenboek, waarmee regels in woorden worden gesplitst: 46 MB, en 190 MB op schijf.',
          ],
          keywords: ['taal', 'koreaans', 'chinees', 'mandarijn', 'kantonees', 'jyutping', 'spaans', 'japans', 'pinyin', 'beperkt', 'ondersteund'],
        },
        {
          id: 'q-data',
          title: 'Stuurt Libregaku mijn gegevens ergens heen?',
          body: [
            'Er is geen account en geen server. Woordenboeken worden één keer gedownload en in de browser bewaard; kaarten gaan rechtstreeks naar Anki op je computer. Zolang het Japanse woordenboek nog downloadt, wordt een woord dat je opzoekt naar Jotoba gestuurd om het te beantwoorden.',
          ],
          keywords: ['privacy', 'gegevens', 'data', 'server', 'account', 'tracking'],
        },
      ],
    },
  ],
};
