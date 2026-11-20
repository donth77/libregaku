import type { HelpTranslation } from './content';

/** The help in Swedish. A chapter or topic left out shows in English. */
export const sv: HelpTranslation = {
  title: 'Hjälp',
  intro: 'Hur Libregaku fungerar, och svar på vanliga frågor. Sök eller välj ett kapitel.',
  search: 'Sök…',
  searchLabel: 'Sök i hjälpen',
  none: 'Inga träffar för ”{q}”.',
  settings: 'Inställningar',
  contents: 'Kapitel',
  tipLabel: 'Tips:',
  then: 'sedan',
  link: 'Länk hit',
  popular: { label: 'Populärt:' },
  chapters: [
    {
      id: 'start',
      title: 'Kom igång',
      about: 'Tre val, sedan en video.',
      topics: [
        {
          id: 'get-started',
          title: 'Ställ in Libregaku',
          body: [
            [
              'Välj språket du lär dig och ditt eget språk i {Inställningar → Språk}.',
              'Hämta Anki från https://apps.ankiweb.net. Följ stegen i {Inställningar → Anki} för att ansluta Anki, och välj sedan kortleken som nya kort hamnar i.',
              'Öppna en video på YouTube, Netflix eller en annan webbplats som stöds, med undertexter på språket du lär dig, och håll pekaren över ett ord.',
            ],
            { tip: 'Anki är valfritt. Undertexter, uppslag och transkriptionen fungerar utan det; det är Anki som minns vilka ord du kan.' },
          ],
          keywords: ['installera', 'installation', 'börja', 'första gången', 'språk', 'inställning', 'setup', 'install'],
        },
        {
          id: 'anki',
          title: 'Vad är Anki?',
          body: [
            'Anki är en gratis app för flashcards. Den visar varje kort igen strax innan du skulle glömma det (intervallrepetition).',
            'Libregaku lägger till kort i Anki från orden och meningarna du väljer. Det läser också dina Anki-kort för att se vilka ord du redan kan.',
            'Du behöver Anki på din dator, med tillägget [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Hämta Anki från https://apps.ankiweb.net.',
          ],
          keywords: ['studiekort', 'glosor', 'spaced repetition', 'srs', 'ladda ner', 'installera', 'repetera', 'plugin'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Titta',
      about: 'Slå upp ord, transkriptionen och tangenterna.',
      topics: [
        {
          id: 'look-up',
          title: 'Slå upp ett ord',
          body: [
            'Håll pekaren över ett ord i undertexten eller transkriptionen så öppnas dess ordruta: läsningen, de tre första betydelserna och ”+N betydelser till” för resten.',
            'Kanji och exempel från videon tar en rad var i ordrutan. Klicka på en för att öppna den; den är öppen även nästa gång.',
            'Dra över flera ord för att slå upp en fras. Klicka på den igen, eller tryck på `Esc`, för att rensa den.',
            { tip: 'Ord slås upp vid hovring som standard. {Inställningar → Slå upp ord → Slå upp ord vid} ändrar det till hovring med `Shift` nedtryckt, eller klick.' },
          ],
          keywords: ['ordbok', 'definition', 'betydelse', 'översätta', 'hovra', 'mus', 'klicka', 'fras', 'kanji', 'hover'],
        },
        {
          id: 'transcript',
          title: 'Använd transkriptionspanelen',
          body: [
            '`S` visar eller döljer den. Klicka på en rad för att spela upp därifrån; sökrutan hittar vilken rad som helst.',
            'Filterknappen visar bara rader med nya ord, de med exakt ett, eller de du har sparat. Bokmärket på en rad, eller `B`, sparar raden; sparade rader går till Anki tillsammans, eller ut som en fil.',
          ],
          keywords: ['sidofält', 'sidopanel', 'sidebar', 'sök', 'filter', 'spara', 'bokmärke', 'exportera'],
        },
        {
          id: 'colours',
          title: 'Ändra understrykningsfärgerna',
          body: [
            'Varje understrykningsfärg visar hur väl du kan ett ord: nytt, under inlärning, följt eller känt. {Inställningar → Understrykningar} har en färgväljare för var och en, och Återställ tar tillbaka standardfärgerna.',
            { tip: 'Kända ord stryks inte under om inte {Inställningar → Understrykningar → Stryk under kända ord} är på.' },
          ],
          keywords: ['färg', 'färger', 'understrykning', 'palett', 'tema', 'utseende', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Kortkommandon',
          body: [
            {
              head: ['Tangent', 'Vad den gör'],
              rows: [
                ['`←` `→`', 'Föregående eller nästa rad'],
                ['`↓`', 'Spela upp raden igen'],
                ['`↑`', 'Visa eller dölj översättningen'],
                ['`A`', 'Lägg till ordet från ordrutan i Anki'],
                ['`K`', 'Markera ordet i ordrutan som känt'],
                ['`B`', 'Spara den aktuella raden'],
                ['`S`', 'Visa eller dölj transkriptionspanelen'],
                ['`H`', 'Gör undertexter suddiga eller skarpa'],
                ['`R`', 'Växla furigana, pinyin eller Jyutping: av, nya ord, alla (japanska, kinesiska (mandarin), kantonesiska)'],
                ['`Shift`', 'Håll ned för att slå upp ordet under pekaren, när {Inställningar → Slå upp ord → Slå upp ord vid} är inställt på Hovring + Shift'],
                ['`Esc`', 'Stäng ordrutan'],
              ],
            },
            'Tangentbordsknappen i transkriptionspanelen visar dem medan du tittar.',
            'Stäng av {Inställningar → Undertexter → Kortkommandon med en tangent} för att bara använda bokstavstangenterna med `Alt` och `Shift` nedtryckta.',
            'Utan mus: gå med `Tab` till ett ord i undertexten och tryck på `Enter` för att slå upp det; `←` `→` flyttar mellan orden. I transkriptionen flyttar `↑` `↓` mellan raderna.',
          ],
          keywords: ['kortkommando', 'tangentbord', 'tangenter', 'snabbtangent', 'genväg', 'shortcut', 'hotkey', 'tillgänglighet', 'skärmläsare', 'alt', 'tab'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Skapa kort',
      about: 'Ett ord, eller en hel rad, till Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Skapa ett kort',
          body: [
            'Tryck på Lägg till i Anki längst ned i ett ords ordruta, eller på `A`. Kortet innehåller ordet, dess läsning och betydelse, meningen och dess översättning, en inspelning av ordet, radens eget ljud och en stillbild från den.',
            { tip: 'Skapat ett kort av misstag? Klicka på Tillagt inom några minuter för att ångra det.' },
            'För ett ord som Anki redan har visar knappen I Anki; klicka på den för att se ordet i Anki. Om Anki är stängt väntar ett nytt kort i webbläsaren och läggs till nästa gång Anki svarar.',
          ],
          keywords: ['flashcard', 'anki', 'lägg till', 'ångra', 'ta bort'],
        },
        {
          id: 'add-line',
          title: 'Gör ett kort av en hel mening',
          body: [
            'I ett ords ordruta gör pratbubblan med ett + i stället ett kort av hela meningen, med ljud och skärmbild. Varje rad i transkriptionen har samma knapp när du pekar på den.',
          ],
          keywords: ['mening', 'rad', 'meningskort', 'hel rad', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Meningsljud',
          body: [
            'När du lägger till ett kort från undertexten eller transkriptionen, för ett ord, en fras eller hela meningen, spelar Libregaku in raden från videon och lägger inspelningen på kortet. När du repeterar hör du meningen som den sades.',
            'Chrome kan bara spela in medan videon spelas, så raden spelas upp en gång till, och sedan går videon tillbaka dit du var.',
            { tip: 'Att spara en rad spelar inte in något, och inte heller att lägga till ett kort från listorna under Sparade. {Inställningar → Anki-kort → Meningsljud} stänger av inspelningen.' },
          ],
          keywords: ['ljud', 'inspelning', 'spela upp igen', 'röst', 'lyssna', 'sentence audio'],
        },
        {
          id: 'decks',
          title: 'Välj kortlek',
          body: [
            'Nya kort hamnar i kortleken i {Inställningar → Anki → Nya kort hamnar i}.',
            'Varje språk du lär dig har sin egen kortlek. Tills du väljer en hamnar dess kort i en kortlek som skapas för språket med det första kortet: Libregaku-JA för japanska, Libregaku-ES för spanska. Ändra {Inställningar → Språk → Jag lär mig} så byts kortleken också.',
            'För att byta medan du tittar, slå på {Inställningar → Ordruta → Kortleksmeny}. En ▾ visas bredvid Lägg till i Anki; ”Lägg till i” en kortlek lägger kortet där och skickar dit nästa kort också.',
            { tip: 'Ordens status läses från {Inställningar → Anki → Läs kända ord från}. Om nya kort hamnar i en kortlek som inte läses säger Inställningar det.' },
          ],
          keywords: ['kortlek', 'kortlekar', 'underkortlek', 'ny kortlek', 'deck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Markera ord',
      about: 'Känt, Följ och Ignorera – inget av dem skapar ett kort.',
      topics: [
        {
          id: 'marks',
          title: 'Känt, Följ och Ignorera',
          body: [
            'De små knapparna bredvid ordet i dess ordruta.',
            [
              'Känt (`K`): du kan ordet – ingen understrykning, och det räknas som känt.',
              'Följ: en lila understrykning, så att du lägger märke till ordet när det dyker upp.',
              'Ignorera: namn och ljud – stryks aldrig under och räknas aldrig.',
            ],
            'Klicka på en markering igen för att ta bort den, eller hitta ordet under fliken Sparade i transkriptionspanelen.',
          ],
          keywords: ['markera', 'markering', 'kända', 'följda', 'ignorerade', 'lila', 'understrykning', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Se och ändra dina markerade ord',
          body: [
            'I transkriptionspanelen listar fliken Sparade raderna du sparar och orden du följer, markerar som kända eller ignorerar, i en lista var. Varje ord har en knapp som tar bort markeringen – Sluta ignorera för ett ignorerat ord – och ett följt ord kan bli ett kort därifrån.',
            'Varje språk har sina egna listor. Fliken Sparade visar listorna för språket du lär dig, och ett ord som är markerat i ett språk är inte markerat i ett annat.',
            'Varje lista har en sökruta och knapparna Kopiera och Exportera fil, som ger dig listan som en fil som Anki och kalkylprogram kan öppna.',
          ],
          keywords: ['bevakningslista', 'watchlist', 'lista', 'följda', 'ignorerade', 'kända', 'ta bort markering', 'ord', 'kalkylark', 'excel'],
        },
      ],
    },
    {
      id: 'supported-sites',
      title: 'Webbplatser som stöds',
      about: 'De webbplatser där Libregaku fungerar och vad som skiljer dem åt.',
      topics: [
        {
          id: 'supported-sites-list',
          title: 'Vilka webbplatser fungerar?',
          body: [
            'Libregaku ritar interaktiva undertexter över videon på de här webbplatserna. Den använder de undertexter som webbplatsen själv erbjuder, på språket du lär dig.',
            {
              head: ['Webbplats', 'Meningsljud och skärmbild'],
              rows: [
                ['YouTube', 'Tas från videon.'],
                ['Netflix', 'Spelas in från fliken; ingen skärmbild.'],
                ['Disney+', 'Spelas in från fliken; ingen skärmbild.'],
                ['Prime Video', 'Spelas in från fliken; ingen skärmbild.'],
                ['HBO Max', 'Spelas in från fliken; ingen skärmbild.'],
                ['Apple TV', 'Spelas in från fliken; ingen skärmbild.'],
                ['Viki', 'Spelas in från fliken; ingen skärmbild.'],
              ],
            },
            'Kapitlet om skyddade webbplatser förklarar hur ljudet spelas in från fliken. En video utan undertexter på språket du lär dig har inget att visa, och Libregaku säger det.',
          ],
          keywords: ['youtube', 'netflix', 'disney', 'prime video', 'max', 'hbo', 'viki', 'rakuten', 'webbplatser', 'sidor', 'stöds', 'streaming'],
        },
      ],
    },
    {
      id: 'protected-sites',
      title: 'Skyddade webbplatser',
      about: 'Webbplatserna som krypterar sin video: Netflix, Disney+, Prime Video, HBO Max, Apple TV och Viki. Vad det ändrar.',
      topics: [
        {
          id: 'protected-sites-audio',
          title: 'Meningsljud på skyddade webbplatser',
          body: [
            [
              'Öppna {Inställningar → Anki-kort → Meningsljud på skyddade webbplatser} och tryck på Tillåt.',
              'Klicka på Libregaku-ikonen i verktygsfältet på fliken där videon spelas upp och tryck på Spela in meningsljud här. Gör det en gång per flik.',
            ],
            'Skyddade webbplatser krypterar sin video, så Libregaku kan inte spela in ljudet från videon som på YouTube. I stället spelar det in fliken, vilket Chrome bara tillåter på det här sättet. Av samma skäl har kort som skapas där ingen skärmbild.',
          ],
          keywords: ['netflix', 'disney', 'prime video', 'max', 'hbo', 'viki', 'rakuten', 'ljud', 'behörighet', 'tillåtelse', 'kryptering', 'drm', 'flikinspelning', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Uppdateringar',
      topics: [
        {
          id: 'update',
          title: 'Läs in en ny version',
          body: [
            [
              'Öppna webbläsarens sida för tillägg.',
              'Tryck på pilen för att läsa in Libregaku igen.',
              'Ladda om fliken med videon – en flik som öppnades före omladdningen har kvar den gamla versionen.',
            ],
            { tip: 'Längst ned i Inställningar står det när kopian du kör byggdes.' },
          ],
          keywords: ['ladda om', 'läs in igen', 'uppdatera', 'gammal version', 'bygge', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Frågor',
      topics: [
        {
          id: 'q-track',
          title: 'Vad gör Följ?',
          body: [
            'Den stryker under ett ord överallt där det dyker upp – i lila, om du inte ändrar det i {Inställningar → Understrykningar} – så att du lägger märke till det, utan att skapa ett kort. Ordet räknas inte längre som nytt. Följda ord listas i transkriptionspanelen, under fliken Sparade.',
          ],
          keywords: ['följa', 'följda', 'lila', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Varför är ett ord jag kan fortfarande understruket?',
          body: [
            'Statusen kommer från dina Anki-kort, i kortlekarna under {Inställningar → Anki → Läs kända ord från}. Ett ord vars kort inte är moget än stryks under som under inlärning; ett ord utan kort där som nytt. Ett ord du kan utan kort kan markeras som Känt.',
          ],
          keywords: ['status', 'understrykning', 'moget', 'omfång', 'known'],
        },
        {
          id: 'q-marks-deck',
          title: 'Varför finns det en kortlek Libregaku::Marks i Anki?',
          body: [
            'Känt, Följ och Ignorera sparas där som dolda noter, låsta så att de aldrig dyker upp vid repetition. På så sätt når de dina andra enheter genom synkningen i Anki. Där inne har varje språk en egen kortlek, till exempel Libregaku::Marks::JA. {Inställningar → Anki → Öppna markeringar i Anki} visar dem.',
            { tip: 'Stäng av {Inställningar → Anki → Spara markeringar i Anki} för att bara spara markeringar i den här webbläsaren.' },
          ],
          keywords: ['markeringar', 'kortlek', 'låst', 'synkning', 'sync', 'marks'],
        },
        {
          id: 'q-remove',
          title: 'Kan jag ta bort ett kort?',
          body: [
            'Direkt efter att du har lagt till det klickar du på Tillagt för att ångra. För ett äldre kort klickar du på I Anki i ordets ordruta och tar bort det i Anki. Libregaku tar aldrig bort ett kort som du har repeterat.',
          ],
          keywords: ['radera', 'ta bort', 'ångra', 'delete', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Fungerar det med AnkiWeb?',
          body: [
            'Inte direkt: Libregaku pratar med Anki på din dator genom tillägget [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Anki synkar sedan dina kort till AnkiWeb och din telefon som vanligt.',
          ],
          keywords: ['telefon', 'mobil', 'android', 'iphone', 'synkning', 'sync', 'ankiconnect', 'tillägg'],
        },
        {
          id: 'q-picture',
          title: 'Vad är skärmbilden på ett kort?',
          body: [
            'En stillbild från scenen, på kortets baksida, så att du ser var ordet kom ifrån. Den tas från videon på YouTube; skyddade webbplatser släcker sin video för tillägg, så kort som skapas där har ingen. {Inställningar → Anki-kort → Skärmbild} stänger av den.',
          ],
          keywords: ['bild', 'skärmdump', 'stillbild', 'screenshot', 'picture'],
        },
        {
          id: 'q-replay',
          title: 'Varför spelas raden upp igen när jag lägger till ett kort?',
          body: [
            'Ljudet spelas in medan raden spelas, så raden spelas upp en gång till; sedan går uppspelningen tillbaka dit den var. {Inställningar → Anki-kort → Meningsljud} stänger av det.',
          ],
          keywords: ['spela upp igen', 'inspelning', 'hoppar tillbaka', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Varför finns det ingen översättning under undertexten?',
          body: [
            'Översättningen är webbplatsens egna undertexter på språket under {Inställningar → Språk → Ditt språk}. Om videon inte har några på det språket finns det inget att visa, och Libregaku säger det. Den maskinöversätter inte.',
          ],
          keywords: ['andra raden', 'dubbla undertexter', 'dual', 'svenska', 'engelska', 'translation'],
        },
        {
          id: 'q-definitions',
          title: 'Varför finns definitionerna bara på vissa språk?',
          body: [
            'För japanska kommer de från JMdict, som har definitioner på nio språk. Om ditt inte är ett av dem visar {Inställningar → Språk} en andra rad, Definitioner på, för språket som ska användas i stället.',
            'Ordböckerna för kinesiska (mandarin), koreanska, spanska, franska, tyska, italienska och portugisiska är skrivna på engelska. Där det finns en på ditt eget språk för paret används den först.',
          ],
          keywords: ['ordbok', 'betydelser', 'svenska', 'ungerska', 'slovenska', 'engelska', 'jmdict', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-languages',
          title: 'Vilka språk kan jag lära mig?',
          body: [
            'Japanska, kinesiska (mandarin), kantonesiska, koreanska, spanska, franska, tyska, italienska och portugisiska har en ordbok, och ett ord matchas mot sitt kort i vilken form det än sägs: 갔어요 hittar ett kort för 가다, och hablábamos ett för hablar. Japanska visar furigana ovanför orden, kinesiska (mandarin) visar pinyin och kantonesiska visar Jyutping.',
            'De andra språken under {Inställningar → Språk → Jag lär mig} är markerade med begränsat stöd. Deras ord delas upp, och det finns ingen ordbok än.',
            'Ett språks ordbok laddas ned första gången du väljer språket. Nedladdningen är 11 till 27 MB; på disken tar den 100 MB för kinesiska (mandarin), 140 MB för franska, 200 MB för koreanska och tyska och 470 MB för spanska. En ordbok på ditt eget språk, där det finns en, är en andra nedladdning på upp till 18 MB. Japanska laddar också ned en andra ordbok, som används för att dela upp rader i ord: 46 MB, och 190 MB på disken.',
          ],
          keywords: ['koreanska', 'kinesiska', 'mandarin', 'kantonesiska', 'jyutping', 'spanska', 'japanska', 'begränsat', 'stöd', 'storlek'],
        },
        {
          id: 'q-data',
          title: 'Skickar Libregaku mina data någonstans?',
          body: [
            'Det finns inget konto och ingen server. Ordböckerna laddas ned en gång och sparas i webbläsaren; korten går direkt till Anki på din dator. Medan den japanska ordboken fortfarande laddas ned skickas ett ord du slår upp till Jotoba för att besvaras.',
          ],
          keywords: ['integritet', 'sekretess', 'data', 'server', 'konto', 'spårning', 'privacy'],
        },
      ],
    },
  ],
};
