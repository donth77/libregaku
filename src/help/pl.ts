import type { HelpTranslation } from './content';

/** The help in Polish. A chapter or topic left out shows in English. */
export const pl: HelpTranslation = {
  title: 'Pomoc',
  intro: 'Jak działa Libregaku i odpowiedzi na częste pytania. Wyszukaj albo wybierz rozdział.',
  search: 'Szukaj…',
  searchLabel: 'Szukaj w pomocy',
  none: 'Brak wyników dla „{q}”.',
  settings: 'Ustawienia',
  contents: 'Rozdziały',
  tipLabel: 'Wskazówka:',
  then: 'potem',
  link: 'Link do tego tematu',
  popular: { label: 'Popularne:' },
  chapters: [
    {
      id: 'start',
      title: 'Pierwsze kroki',
      about: 'Trzy decyzje, a potem film.',
      topics: [
        {
          id: 'get-started',
          title: 'Skonfiguruj Libregaku',
          body: [
            [
              'Otwórz {Ustawienia → Języki} i wybierz język, którego się uczysz, oraz swój własny.',
              'Otwórz {Ustawienia → Anki}, wykonaj kroki łączenia z Anki, a potem wybierz talię na nowe karty.',
              'Otwórz film na YouTube lub Netflixie z napisami w języku, którego się uczysz, i najedź kursorem na słowo.',
            ],
            { tip: 'Anki jest opcjonalne. Napisy, sprawdzanie słów i transkrypcja działają bez niego; to Anki pamięta, które słowa znasz.' },
          ],
          keywords: ['instalacja', 'konfiguracja', 'start', 'początek', 'pierwsze uruchomienie', 'język', 'setup', 'install'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Oglądanie',
      about: 'Sprawdzanie słów, transkrypcja i klawisze.',
      topics: [
        {
          id: 'look-up',
          title: 'Sprawdź słowo',
          body: [
            'Najedź kursorem na słowo w napisach lub w transkrypcji, a otworzy się jego okienko: czytanie, trzy pierwsze znaczenia i „+N innych znaczeń” dla pozostałych.',
            'Kanji i przykłady z filmu zajmują w okienku po jednej linijce. Kliknij jedną, by ją rozwinąć; następnym razem będzie już otwarta.',
            'Przeciągnij kursorem po kilku słowach, by sprawdzić frazę. Kliknij ją ponownie albo naciśnij `Esc`, by usunąć zaznaczenie.',
            { tip: 'Domyślnie słowa są sprawdzane po najechaniu kursorem. Ustawienie {Ustawienia → Sprawdzanie słów → Sprawdzaj słowa przez} zmienia to na najechanie z wciśniętym `Shift` albo kliknięcie.' },
          ],
          keywords: ['słownik', 'definicja', 'znaczenie', 'tłumaczenie', 'najechanie', 'kursor', 'mysz', 'kliknięcie', 'fraza', 'kanji', 'hover'],
        },
        {
          id: 'transcript',
          title: 'Korzystaj z panelu transkrypcji',
          body: [
            '`S` pokazuje go lub ukrywa. Kliknij linijkę, by odtworzyć film od tego miejsca; pole wyszukiwania znajdzie dowolną linijkę.',
            'Przycisk filtra zostawia tylko linijki z nowymi słowami, te z dokładnie jednym albo te zapisane. Ikona zakładki przy linijce lub `B` zapisuje linijkę; zapisane linijki trafiają do Anki razem albo do pliku.',
          ],
          keywords: ['panel boczny', 'pasek boczny', 'sidebar', 'szukaj', 'wyszukiwanie', 'filtr', 'zapisz', 'zakładka', 'eksport'],
        },
        {
          id: 'colours',
          title: 'Zmień kolory podkreśleń',
          body: [
            'Kolor podkreślenia mówi, jak dobrze znasz słowo: nowe, w nauce, śledzone lub znane. Sekcja {Ustawienia → Podkreślenia} ma wybór koloru dla każdego z nich, a Resetuj przywraca domyślne.',
            { tip: 'Znane słowa nie są podkreślane, chyba że włączysz {Ustawienia → Podkreślenia → Podkreślaj znane słowa}.' },
          ],
          keywords: ['kolor', 'kolory', 'podkreślenie', 'paleta', 'motyw', 'wygląd', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Skróty klawiszowe',
          body: [
            {
              head: ['Klawisz', 'Działanie'],
              rows: [
                ['`←` `→`', 'Poprzednia lub następna linijka'],
                ['`↓`', 'Odtwórz linijkę ponownie'],
                ['`↑`', 'Pokaż lub ukryj tłumaczenie'],
                ['`A`', 'Dodaj słowo z okienka do Anki'],
                ['`K`', 'Oznacz słowo z okienka jako znane'],
                ['`B`', 'Zapisz bieżącą linijkę'],
                ['`S`', 'Pokaż lub ukryj panel transkrypcji'],
                ['`H`', 'Rozmyj lub wyostrz napisy'],
                ['`R`', 'Przełącz furiganę: wyłączone, nowe słowa, wszystkie (japoński)'],
                ['`Shift`', 'Przytrzymaj, by sprawdzić słowo pod kursorem, gdy ustawienie {Ustawienia → Sprawdzanie słów → Sprawdzaj słowa przez} ma wartość „Najechanie + Shift”'],
                ['`Esc`', 'Zamknij okienko'],
              ],
            },
            'Przycisk klawiatury w panelu transkrypcji pokazuje je podczas oglądania.',
          ],
          keywords: ['skrót', 'skróty', 'klawiatura', 'klawisze', 'shortcut', 'hotkey'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Tworzenie kart',
      about: 'Słowo albo cała linijka do Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Utwórz kartę',
          body: [
            'Kliknij Dodaj do Anki u dołu okienka słowa albo naciśnij `A`. Karta zawiera słowo, jego czytanie i znaczenie, zdanie z tłumaczeniem, nagranie słowa, dźwięk samej linijki i jej kadr.',
            { tip: 'Karta dodana przez pomyłkę? Kliknij Dodano w ciągu kilku minut, by ją cofnąć.' },
            'Przy słowie, które jest już w Anki, przycisk pokazuje W Anki; kliknij go, by zobaczyć to słowo w Anki. Gdy Anki jest zamknięte, nowa karta czeka w przeglądarce i trafi do Anki, gdy znów odpowie.',
          ],
          keywords: ['fiszka', 'fiszki', 'anki', 'dodaj', 'cofnij', 'usuń', 'flashcard'],
        },
        {
          id: 'add-line',
          title: 'Utwórz kartę z całego zdania',
          body: [
            'W okienku słowa dymek z plusem tworzy zamiast tego kartę z całego zdania, z jego dźwiękiem i zrzutem ekranu. Każda linijka transkrypcji ma ten sam przycisk, gdy najedziesz na nią kursorem.',
          ],
          keywords: ['zdanie', 'linijka', 'karta zdania', 'cała linijka', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Audio zdania',
          body: [
            'Gdy dodajesz kartę z napisów lub z transkrypcji, dla słowa, frazy albo całego zdania, Libregaku nagrywa tę linijkę z filmu i dołącza nagranie do karty. Podczas powtórki słyszysz zdanie tak, jak zostało wypowiedziane.',
            'Chrome może nagrywać tylko podczas odtwarzania filmu, więc linijka odtwarza się jeszcze raz, a potem film wraca do poprzedniego miejsca.',
            { tip: 'Zapisanie linijki niczego nie nagrywa, podobnie jak dodanie karty z list Zapisane i Słowa. Nagrywanie wyłączysz tutaj: {Ustawienia → Karty Anki → Audio zdania}.' },
          ],
          keywords: ['audio', 'dźwięk', 'nagranie', 'nagrywanie', 'głos', 'słuchanie', 'sentence audio'],
        },
        {
          id: 'decks',
          title: 'Wybierz talię',
          body: [
            'Nowe karty trafiają do talii ustawionej tutaj: {Ustawienia → Anki → Nowe karty trafiają do}.',
            'Aby zmieniać talię podczas oglądania, włącz {Ustawienia → Okienko słowa → Menu talii}. Obok Dodaj do Anki pojawi się ▾; „Dodaj do talii…” dodaje kartę do wybranej talii i kieruje tam też kolejne.',
            { tip: 'Stan słów jest odczytywany z talii ustawionych tutaj: {Ustawienia → Anki → Odczytuj znane słowa z}. Jeśli nowe karty trafiają do talii, której to ustawienie nie obejmuje, Ustawienia o tym informują.' },
          ],
          keywords: ['talia', 'talie', 'podtalia', 'nowa talia', 'deck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Oznaczanie słów',
      about: 'Znane, Śledź i Ignoruj — żadne z nich nie tworzy karty.',
      topics: [
        {
          id: 'marks',
          title: 'Znane, Śledź i Ignoruj',
          body: [
            'Małe przyciski obok słowa w jego okienku.',
            [
              'Znane (`K`): znasz to słowo — nie jest podkreślane i liczy się jako znane.',
              'Śledź: fioletowe podkreślenie, by słowo rzucało się w oczy, gdy się pojawi. Przycisk włączysz tutaj: {Ustawienia → Okienko słowa → Przycisk Śledź}.',
              'Ignoruj: imiona i dźwięki — nigdy nie są podkreślane ani liczone.',
            ],
            'Kliknij oznaczenie ponownie, by je usunąć, albo znajdź słowo w zakładce Słowa w panelu transkrypcji.',
          ],
          keywords: ['oznacz', 'oznaczenie', 'znane', 'śledzone', 'ignorowane', 'fioletowy', 'podkreślenie', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Zobacz i zmień oznaczone słowa',
          body: [
            'W panelu transkrypcji zakładka Słowa wymienia słowa, które śledzisz, oznaczasz jako znane lub ignorujesz, każde na osobnej liście. Każde słowo ma przycisk do usunięcia oznaczenia — przy ignorowanym jest to Przestań ignorować — a śledzone słowo można stamtąd zamienić w kartę.',
            'Każda lista ma pole wyszukiwania oraz przyciski Kopiuj i Eksportuj plik, które dają listę jako plik do otwarcia w Anki i w arkuszach kalkulacyjnych.',
          ],
          keywords: ['lista obserwowanych', 'watchlist', 'lista', 'śledzone', 'ignorowane', 'znane', 'usuń oznaczenie', 'słowa', 'arkusz', 'excel'],
        },
      ],
    },
    {
      id: 'netflix',
      title: 'Netflix',
      about: 'Co zmienia jego zabezpieczenie.',
      topics: [
        {
          id: 'netflix-audio',
          title: 'Audio zdania na Netflixie',
          body: [
            [
              'Otwórz {Ustawienia → Karty Anki → Audio zdania na Netflixie} i kliknij Zezwól.',
              'W karcie z Netflixem kliknij ikonę Libregaku na pasku narzędzi i wybierz Nagrywaj tu audio zdania. Zrób to raz w każdej karcie.',
            ],
            'Netflix szyfruje wideo, więc Libregaku nie może nagrać dźwięku z filmu tak jak na YouTube. Zamiast tego nagrywa kartę przeglądarki, na co Chrome pozwala tylko w ten sposób. Z tego samego powodu karty Anki tworzone na Netflixie nie mają zrzutu ekranu.',
          ],
          keywords: ['uprawnienia', 'zgoda', 'szyfrowanie', 'drm', 'dźwięk', 'przechwytywanie karty', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Aktualizacje',
      topics: [
        {
          id: 'update',
          title: 'Wczytaj nową wersję',
          body: [
            [
              'Otwórz w przeglądarce stronę rozszerzeń.',
              'Kliknij strzałkę przeładowania przy Libregaku.',
              'Odśwież kartę z filmem — karta otwarta przed przeładowaniem działa na starej wersji.',
            ],
            { tip: 'Na dole Ustawień widać, kiedy zbudowano używaną kopię.' },
          ],
          keywords: ['przeładuj', 'odśwież', 'aktualizacja', 'aktualizuj', 'stara wersja', 'kompilacja', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Pytania',
      topics: [
        {
          id: 'q-track',
          title: 'Do czego służy Śledź?',
          body: [
            'Podkreśla słowo wszędzie, gdzie się pojawia — na fioletowo, chyba że zmienisz to w sekcji {Ustawienia → Podkreślenia} — by rzucało się w oczy, bez tworzenia karty. Słowo przestaje się liczyć jako nowe. Śledzone słowa są w panelu transkrypcji, w zakładce Słowa.',
          ],
          keywords: ['śledzenie', 'śledzone', 'fioletowy', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Dlaczego słowo, które znam, wciąż jest podkreślone?',
          body: [
            'Stan słów pochodzi z twoich kart Anki w taliach ustawionych tutaj: {Ustawienia → Anki → Odczytuj znane słowa z}. Słowo, którego karta nie jest jeszcze dojrzała, jest podkreślone jako w nauce; słowo bez karty w tych taliach — jako nowe. Słowo, które znasz bez karty, możesz oznaczyć jako Znane.',
          ],
          keywords: ['stan', 'status', 'podkreślenie', 'dojrzała', 'zakres', 'known'],
        },
        {
          id: 'q-marks-deck',
          title: 'Skąd w Anki talia Libregaku::Marks?',
          body: [
            'Znane, Śledź i Ignoruj są tam przechowywane jako ukryte notatki, zawieszone, by nigdy nie pojawiły się w powtórkach. Dzięki temu trafiają na inne urządzenia przez synchronizację Anki. Pokaże je przycisk {Ustawienia → Anki → Otwórz oznaczenia w Anki}.',
            { tip: 'Wyłącz {Ustawienia → Anki → Zapisuj oznaczenia w Anki}, by przechowywać oznaczenia tylko w tej przeglądarce.' },
          ],
          keywords: ['oznaczenia', 'talia', 'zawieszone', 'synchronizacja', 'sync', 'marks'],
        },
        {
          id: 'q-remove',
          title: 'Czy mogę usunąć kartę?',
          body: [
            'Zaraz po dodaniu kliknij Dodano, by to cofnąć. Starszą kartę otwórz przyciskiem W Anki w okienku słowa i usuń ją w Anki. Libregaku nigdy nie usuwa karty, która miała już powtórki.',
          ],
          keywords: ['usuń', 'usuwanie', 'skasuj', 'cofnij', 'delete', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Czy to działa z AnkiWeb?',
          body: [
            'Nie bezpośrednio: Libregaku łączy się z Anki na twoim komputerze przez dodatek AnkiConnect. Anki synchronizuje potem karty z AnkiWeb i z telefonem jak zwykle.',
          ],
          keywords: ['telefon', 'komórka', 'android', 'iphone', 'synchronizacja', 'sync', 'dodatek', 'ankiconnect'],
        },
        {
          id: 'q-picture',
          title: 'Czym jest zrzut ekranu na karcie?',
          body: [
            'To kadr ze sceny na odwrocie karty, by było widać, skąd pochodzi słowo. Na YouTube jest pobierany z filmu; Netflix ukrywa wideo przed rozszerzeniami, więc karty utworzone na Netflixie go nie mają. Wyłączysz go tutaj: {Ustawienia → Karty Anki → Zrzut ekranu}.',
          ],
          keywords: ['obraz', 'obrazek', 'zdjęcie', 'kadr', 'screenshot', 'picture'],
        },
        {
          id: 'q-replay',
          title: 'Dlaczego linijka odtwarza się ponownie, gdy dodaję kartę?',
          body: [
            'Jej dźwięk jest nagrywany podczas odtwarzania, więc linijka odtwarza się jeszcze raz; potem film wraca do poprzedniego miejsca. Wyłączysz to tutaj: {Ustawienia → Karty Anki → Audio zdania}.',
          ],
          keywords: ['powtórzenie', 'ponowne odtwarzanie', 'nagrywanie', 'cofa', 'przeskakuje', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Dlaczego pod napisami nie ma tłumaczenia?',
          body: [
            'Tłumaczenie to napisy samego serwisu w języku ustawionym tutaj: {Ustawienia → Języki → Twój język}. Jeśli film nie ma napisów w tym języku, nie ma czego pokazać, a Libregaku o tym informuje. Nie korzysta z tłumaczenia maszynowego.',
          ],
          keywords: ['druga linijka', 'podwójne napisy', 'dual', 'tłumacz', 'polski', 'angielski', 'translation'],
        },
        {
          id: 'q-definitions',
          title: 'Dlaczego definicje są tylko w niektórych językach?',
          body: [
            'Dla japońskiego pochodzą z JMdict, który ma definicje w dziewięciu językach. Jeśli twojego wśród nich nie ma, {Ustawienia → Języki} pokazuje drugi wiersz, Język definicji, w którym wybierasz język zastępczy.',
          ],
          keywords: ['słownik', 'znaczenia', 'polski', 'węgierski', 'słoweński', 'angielski', 'jmdict', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-data',
          title: 'Czy Libregaku wysyła gdzieś moje dane?',
          body: [
            'Nie ma konta ani serwera. Słowniki pobiera się raz i przechowuje w przeglądarce; karty trafiają prosto do Anki na twoim komputerze. Dopóki słownik japoński się pobiera, sprawdzane słowo jest wysyłane do Jotoba, by uzyskać odpowiedź.',
          ],
          keywords: ['prywatność', 'dane', 'serwer', 'konto', 'telemetria', 'internet', 'bezpieczeństwo', 'privacy'],
        },
      ],
    },
  ],
};
