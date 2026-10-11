import type { HelpTranslation } from './content';

/** The help in Italian. A chapter or topic left out shows in English. */
export const it: HelpTranslation = {
  title: 'Guida',
  intro: 'Come funziona Libregaku e le risposte alle domande più comuni. Cerca o scegli un capitolo.',
  search: 'Cerca…',
  searchLabel: 'Cerca nella guida',
  none: 'Nessun risultato per “{q}”.',
  settings: 'Impostazioni',
  contents: 'Capitoli',
  tipLabel: 'Suggerimento:',
  then: 'poi',
  link: 'Link a questa sezione',
  popular: { label: 'Più letti:' },
  chapters: [
    {
      id: 'start',
      title: 'Per iniziare',
      about: 'Tre scelte, poi un video.',
      topics: [
        {
          id: 'get-started',
          title: 'Configura Libregaku',
          body: [
            [
              'In {Impostazioni → Lingue}, scegli la lingua che stai imparando e la tua lingua.',
              'Scarica Anki da https://apps.ankiweb.net. In {Impostazioni → Anki}, segui i passaggi per collegare Anki, poi scegli il mazzo in cui vanno le nuove carte.',
              'Apri un video di YouTube o Netflix con sottotitoli nella lingua che stai imparando e posa il puntatore su una parola.',
            ],
            { tip: 'Anki è facoltativo. Sottotitoli, ricerche e trascrizione funzionano tutti anche senza; Anki serve a ricordare quali parole conosci.' },
          ],
          keywords: ['installare', 'installazione', 'iniziare', 'primi passi', 'prima volta', 'lingua', 'configurazione', 'setup'],
        },
        {
          id: 'anki',
          title: 'Che cos’è Anki?',
          body: [
            'Anki è un’app gratuita di flashcard. Ti ripropone ogni carta poco prima che tu la dimentichi (ripetizione dilazionata).',
            'Libregaku aggiunge carte ad Anki dalle parole e dalle frasi che scegli. Legge anche le tue carte di Anki per sapere quali parole conosci già.',
            'Ti serve Anki sul tuo computer, con l’add-on AnkiConnect. Scarica Anki da https://apps.ankiweb.net.',
          ],
          keywords: ['schede', 'spaziata', 'spaced repetition', 'srs', 'installare', 'download', 'ripasso', 'componente aggiuntivo'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Guardare i video',
      about: 'Cercare le parole, la trascrizione e i tasti.',
      topics: [
        {
          id: 'look-up',
          title: 'Cercare una parola',
          body: [
            'Posa il puntatore su una parola del sottotitolo o della trascrizione e si apre il suo popup: la lettura, i primi tre significati e “+N altri significati” per il resto.',
            'I kanji e gli esempi dal video occupano una riga ciascuno nel popup. Clicca su una riga per aprirla; la volta dopo resterà aperta.',
            'Trascina il puntatore su più parole per cercare un’espressione. Cliccaci di nuovo, o premi `Esc`, per annullare la selezione.',
            { tip: 'Di default le parole si cercano al passaggio del mouse. Con {Impostazioni → Ricerca delle parole → Cerca le parole con} puoi scegliere invece il passaggio del mouse con `Shift` premuto, oppure il clic.' },
          ],
          keywords: ['dizionario', 'definizione', 'significato', 'tradurre', 'mouse', 'passaggio', 'clic', 'maiusc', 'espressione', 'hover'],
        },
        {
          id: 'transcript',
          title: 'Usare il pannello della trascrizione',
          body: [
            '`S` lo mostra o lo nasconde. Clicca su una riga per riprodurre da lì; la casella di ricerca trova qualsiasi riga.',
            'Il pulsante del filtro tiene solo le righe con parole nuove, quelle che ne hanno esattamente una o quelle che hai salvato. Il segnalibro su una riga, o `B`, la salva; le righe salvate vanno in Anki tutte insieme, oppure in un file.',
          ],
          keywords: ['barra laterale', 'sidebar', 'pannello', 'filtro', 'filtrare', 'segnalibro', 'salvare', 'esportare'],
        },
        {
          id: 'colours',
          title: 'Cambiare i colori delle sottolineature',
          body: [
            'Ogni colore di sottolineatura indica quanto conosci una parola: nuova, in apprendimento, seguita o conosciuta. {Impostazioni → Sottolineature} ha un selettore di colore per ciascuno, e Ripristina rimette i colori predefiniti.',
            { tip: 'Le parole conosciute non sono sottolineate, a meno che {Impostazioni → Sottolineature → Sottolinea le parole conosciute} non sia attivo.' },
          ],
          keywords: ['colori', 'tavolozza', 'tema', 'aspetto', 'personalizzare', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Scorciatoie da tastiera',
          body: [
            {
              head: ['Tasto', 'Cosa fa'],
              rows: [
                ['`←` `→`', 'Riga precedente o successiva'],
                ['`↓`', 'Ripeti la riga'],
                ['`↑`', 'Mostra o nascondi la traduzione'],
                ['`A`', 'Aggiungi ad Anki la parola nel popup'],
                ['`K`', 'Segna come conosciuta la parola nel popup'],
                ['`B`', 'Salva la riga corrente'],
                ['`S`', 'Mostra o nascondi il pannello della trascrizione'],
                ['`H`', 'Attiva o disattiva la sfocatura dei sottotitoli'],
                ['`R`', 'Cambia furigana, pinyin o Jyutping: disattivato, parole nuove, tutte le parole (giapponese, cinese, cantonese)'],
                ['`Shift`', 'Tieni premuto per cercare la parola sotto il puntatore, quando {Impostazioni → Ricerca delle parole → Cerca le parole con} è impostato su Passaggio del mouse con Shift premuto'],
                ['`Esc`', 'Chiudi il popup'],
              ],
            },
            'L’icona della tastiera nel pannello della trascrizione le mostra mentre guardi.',
            'Disattiva {Impostazioni → Sottotitoli → Scorciatoie a un tasto} per usare i tasti delle lettere solo tenendo premuti `Alt` e `Shift`.',
            'Senza mouse: raggiungi con `Tab` una parola del sottotitolo e premi `Enter` per cercarla; `←` `→` passano da una parola all’altra. Nella trascrizione, `↑` `↓` passano da una riga all’altra.',
          ],
          keywords: ['scorciatoia', 'tastiera', 'tasti', 'maiusc', 'shortcut', 'hotkey', 'accessibilità', 'screen reader', 'alt', 'tab'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Creare carte',
      about: 'Una parola, o una riga intera, in Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Creare una carta',
          body: [
            'Premi Aggiungi ad Anki in fondo al popup di una parola, oppure `A`. La carta contiene la parola, la sua lettura e il significato, la frase e la sua traduzione, una registrazione della parola, l’audio della riga stessa e un fotogramma della scena.',
            { tip: 'Creata per errore? Clicca su Aggiunta entro pochi minuti per annullare.' },
            'Per una parola che Anki ha già, il pulsante mostra In Anki; cliccaci per vedere la parola in Anki. Se Anki è chiuso, la nuova carta aspetta nel browser e viene aggiunta appena Anki risponde.',
          ],
          keywords: ['flashcard', 'aggiungere', 'annullare', 'rimuovere', 'eliminare', 'errore'],
        },
        {
          id: 'add-line',
          title: 'Creare una carta da una frase intera',
          body: [
            'Nel popup di una parola, il fumetto con un + crea invece una carta con l’intera frase, il suo audio e uno screenshot. Ogni riga della trascrizione ha lo stesso pulsante quando ci passi sopra con il mouse.',
          ],
          keywords: ['carta di frase', 'carte di frasi', 'riga intera', 'fumetto', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Audio della frase',
          body: [
            'Quando aggiungi una carta dal sottotitolo o dalla trascrizione, per una parola, un’espressione o la frase intera, Libregaku registra quella riga dal video e mette la registrazione sulla carta. Durante il ripasso senti la frase così come è stata detta.',
            'Chrome può registrare solo mentre il video è in riproduzione, quindi la riga viene riprodotta un’altra volta e poi il video torna dov’eri.',
            { tip: 'Salvare una riga non registra nulla, e nemmeno aggiungere una carta dagli elenchi di Salvate. {Impostazioni → Carte di Anki → Audio della frase} disattiva la registrazione.' },
          ],
          keywords: ['suono', 'registrazione', 'voce', 'ascoltare', 'ripasso', 'sentence audio'],
        },
        {
          id: 'decks',
          title: 'Scegliere il mazzo',
          body: [
            'Le nuove carte vanno nel mazzo scelto in {Impostazioni → Anki → Mazzo per le nuove carte}.',
            'Ogni lingua che studi ha il suo mazzo. Finché non ne scegli uno, le sue carte vanno in un mazzo creato per quella lingua con la prima carta: Libregaku-JA per il giapponese, Libregaku-ES per lo spagnolo. Se cambi {Impostazioni → Lingue → Sto imparando} cambia anche il mazzo.',
            'Per cambiarlo mentre guardi, attiva {Impostazioni → Popup della parola → Menu dei mazzi}. Accanto ad Aggiungi ad Anki compare un ▾; “Aggiungi a” un mazzo aggiunge lì la carta e ci manda anche le successive.',
            { tip: 'Lo stato delle parole viene letto da {Impostazioni → Anki → Leggi le parole conosciute da}. Se le nuove carte vanno in un mazzo che non viene letto, Impostazioni te lo segnala.' },
          ],
          keywords: ['mazzo figlio', 'mazzi figli', 'sottomazzo', 'nuovo mazzo', 'deck', 'subdeck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Segnare le parole',
      about: 'Conosciuta, Segui e Ignora: nessuno crea una carta.',
      topics: [
        {
          id: 'marks',
          title: 'Conosciuta, Segui e Ignora',
          body: [
            'I piccoli pulsanti accanto alla parola, nel suo popup.',
            [
              'Conosciuta (`K`): la conosci. Niente sottolineatura, e conta come conosciuta.',
              'Segui: una sottolineatura viola, per notare la parola quando compare. Attivalo in {Impostazioni → Popup della parola → Pulsante Segui}.',
              'Ignora: per nomi e suoni. Mai sottolineati, mai contati.',
            ],
            'Clicca di nuovo su un contrassegno per toglierlo, oppure trova la parola nella scheda Salvate del pannello della trascrizione.',
          ],
          keywords: ['contrassegno', 'segnare', 'conosciute', 'seguite', 'ignorate', 'sottolineatura', 'viola', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Vedere e cambiare le parole segnate',
          body: [
            'Nel pannello della trascrizione, la scheda Salvate elenca le righe che salvi e le parole che segui, che hai segnato come conosciute o che ignori, un elenco per ciascun tipo. Ogni parola ha un pulsante per togliere il suo contrassegno (Smetti di ignorare, per una parola ignorata), e da lì una parola seguita può diventare una carta.',
            'Ogni lingua ha i suoi elenchi. La scheda Salvate mostra quelli della lingua che stai imparando, e una parola contrassegnata in una lingua non lo è in un’altra.',
            'Ogni elenco ha una casella di ricerca e i pulsanti Copia ed Esporta, che ti danno l’elenco in un file che Anki e i fogli di calcolo sanno aprire.',
          ],
          keywords: ['lista', 'watchlist', 'seguite', 'conosciute', 'ignorate', 'togliere contrassegno', 'foglio di calcolo', 'excel'],
        },
      ],
    },
    {
      id: 'supported-sites',
      title: 'Siti supportati',
      about: 'I siti su cui funziona Libregaku e che cosa cambia tra l’uno e l’altro.',
      topics: [
        {
          id: 'supported-sites-list',
          title: 'Su quali siti funziona?',
          body: [
            'Libregaku disegna sottotitoli interattivi sul video in questi siti. Usa i sottotitoli che il sito stesso offre, nella lingua che stai imparando.',
            {
              head: ['Sito', 'Audio della frase e screenshot'],
              rows: [
                ['YouTube', 'Presi dal video.'],
                ['Netflix', 'Registrato dalla scheda; nessuno screenshot.'],
                ['Disney+', 'Registrato dalla scheda; nessuno screenshot.'],
                ['Prime Video', 'Registrato dalla scheda; nessuno screenshot.'],
                ['Max', 'Registrato dalla scheda; nessuno screenshot.'],
              ],
            },
            'Il capitolo sui siti protetti spiega come si registra il suono dalla scheda. Un video senza sottotitoli nella lingua che stai imparando non ha nulla da mostrare, e Libregaku lo dice.',
          ],
          keywords: ['youtube', 'netflix', 'disney', 'prime video', 'max', 'siti', 'supportati', 'streaming'],
        },
      ],
    },
    {
      id: 'protected-sites',
      title: 'Siti protetti',
      about: 'I siti che criptano i loro video: Netflix, Disney+, Prime Video e Max. Cosa cambia con questa protezione.',
      topics: [
        {
          id: 'protected-sites-audio',
          title: 'Audio della frase sui siti protetti',
          body: [
            [
              'Apri {Impostazioni → Carte di Anki → Audio della frase sui siti protetti} e premi Consenti.',
              'Nella scheda in cui è in riproduzione il video, clicca sull’icona di Libregaku nella barra degli strumenti e premi Registra qui l’audio della frase. Fallo una volta per scheda.',
            ],
            'I siti protetti criptano i loro video, quindi Libregaku non può registrarne l’audio dal video come fa su YouTube. Registra invece la scheda, cosa che Chrome consente solo in questo modo. Per lo stesso motivo, le carte create lì non hanno lo screenshot.',
          ],
          keywords: ['netflix', 'disney', 'prime video', 'max', 'hbo', 'suono', 'autorizzazione', 'permesso', 'crittografia', 'drm', 'acquisizione della scheda', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Aggiornamenti',
      topics: [
        {
          id: 'update',
          title: 'Caricare una nuova versione',
          body: [
            [
              'Apri la pagina delle estensioni del tuo browser.',
              'Premi la freccia di ricarica su Libregaku.',
              'Ricarica la scheda del video: una scheda aperta prima della ricarica mantiene la versione vecchia.',
            ],
            { tip: 'In fondo alle Impostazioni trovi quando è stata compilata la copia che stai usando.' },
          ],
          keywords: ['ricaricare', 'aggiornare', 'versione vecchia', 'compilazione', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Domande',
      topics: [
        {
          id: 'q-track',
          title: 'A cosa serve Segui?',
          body: [
            'Sottolinea una parola ovunque compaia (in viola, a meno che tu non cambi il colore in {Impostazioni → Sottolineature}) perché tu la noti, senza creare una carta. Non conta più come nuova. Le parole seguite sono elencate nel pannello della trascrizione, nella scheda Salvate.',
          ],
          keywords: ['seguire', 'seguite', 'viola', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Perché una parola che conosco è ancora sottolineata?',
          body: [
            'Lo stato viene dalle tue carte di Anki, nei mazzi indicati in {Impostazioni → Anki → Leggi le parole conosciute da}. Una parola la cui carta non è ancora matura è sottolineata come in apprendimento; una senza carta in quei mazzi, come nuova. Una parola che conosci senza avere una carta può essere segnata come Conosciuta.',
          ],
          keywords: ['stato', 'sottolineatura', 'matura', 'mazzi', 'scope'],
        },
        {
          id: 'q-marks-deck',
          title: 'Perché c’è un mazzo Libregaku::Marks in Anki?',
          body: [
            'Conosciuta, Segui e Ignora sono salvati lì come note nascoste, sospese perché non compaiano mai nei ripassi; così raggiungono gli altri tuoi dispositivi tramite la sincronizzazione di Anki. Lì dentro ogni lingua ha un mazzo proprio, come Libregaku::Marks::JA. {Impostazioni → Anki → Apri i contrassegni in Anki} li mostra.',
            { tip: 'Disattiva {Impostazioni → Anki → Salva i contrassegni in Anki} per tenere i contrassegni solo in questo browser.' },
          ],
          keywords: ['contrassegni', 'sospese', 'nascoste', 'sincronizzazione', 'sync', 'deck'],
        },
        {
          id: 'q-remove',
          title: 'Posso eliminare una carta?',
          body: [
            'Subito dopo averla aggiunta, clicca su Aggiunta per annullare. Per una carta più vecchia, clicca su In Anki nel popup della parola ed eliminala in Anki. Libregaku non elimina mai una carta che hai studiato.',
          ],
          keywords: ['cancellare', 'rimuovere', 'annullare', 'delete', 'remove', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Funziona con AnkiWeb?',
          body: [
            'Non direttamente: Libregaku comunica con Anki sul tuo computer tramite l’add-on AnkiConnect. Poi Anki sincronizza come sempre le tue carte con AnkiWeb e con il telefono.',
          ],
          keywords: ['telefono', 'cellulare', 'smartphone', 'android', 'iphone', 'ankidroid', 'sincronizzazione', 'sync', 'componente aggiuntivo'],
        },
        {
          id: 'q-picture',
          title: 'Cos’è lo screenshot su una carta?',
          body: [
            'Un fotogramma della scena, sul retro della carta, per vedere da dove viene la parola. Su YouTube viene preso dal video; i siti protetti oscurano i loro video alle estensioni, quindi le carte create lì non ce l’hanno. {Impostazioni → Carte di Anki → Screenshot} lo disattiva.',
          ],
          keywords: ['immagine', 'foto', 'fotogramma', 'cattura', 'retro'],
        },
        {
          id: 'q-replay',
          title: 'Perché la riga viene riprodotta di nuovo quando aggiungo una carta?',
          body: [
            'Il suo audio viene registrato mentre viene riprodotta, quindi la riga suona un’altra volta; poi la riproduzione torna dov’era. {Impostazioni → Carte di Anki → Audio della frase} lo disattiva.',
          ],
          keywords: ['ripetere', 'registrazione', 'torna indietro', 'salta', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Perché non c’è la traduzione sotto il sottotitolo?',
          body: [
            'La traduzione sono i sottotitoli del sito stesso nella lingua indicata in {Impostazioni → Lingue → La tua lingua}. Se il video non ne ha in quella lingua non c’è niente da mostrare, e Libregaku te lo dice. Non usa la traduzione automatica.',
          ],
          keywords: ['seconda riga', 'doppi sottotitoli', 'sottotitoli doppi', 'tradurre', 'italiano', 'inglese', 'dual'],
        },
        {
          id: 'q-definitions',
          title: 'Perché le definizioni sono solo in alcune lingue?',
          body: [
            'Per il giapponese vengono da JMdict, che ha definizioni in nove lingue. Se la tua non è tra queste, {Impostazioni → Lingue} mostra una seconda riga, Definizioni in, per scegliere la lingua da usare al suo posto.',
            'I dizionari di cinese, coreano e spagnolo sono scritti solo in inglese.',
          ],
          keywords: ['dizionario', 'significati', 'italiano', 'ungherese', 'sloveno', 'cc-cedict', 'wiktionary', 'wikizionario'],
        },
        {
          id: 'q-languages',
          title: 'Quali lingue posso imparare?',
          body: [
            'Giapponese, cinese, cantonese, coreano e spagnolo hanno un dizionario, e una parola viene collegata alla sua carta in qualunque forma sia detta: 갔어요 trova una carta di 가다, e hablábamos una di hablar. Il giapponese mostra il furigana sopra le parole, il cinese il pinyin e il cantonese il Jyutping.',
            'Le altre lingue in {Impostazioni → Lingue → Sto imparando} sono indicate come limitate. Le loro parole vengono separate, ma non hanno ancora un dizionario.',
            'Il dizionario di una lingua viene scaricato la prima volta che la scegli. Pesa da 11 a 27 MB.',
          ],
          keywords: ['coreano', 'mandarino', 'cantonese', 'jyutping', 'spagnolo', 'giapponese', 'limitate', 'supportate', 'disponibili', 'dimensione'],
        },
        {
          id: 'q-data',
          title: 'Libregaku invia i miei dati da qualche parte?',
          body: [
            'Non ci sono né account né server. I dizionari vengono scaricati una volta e conservati nel browser; le carte vanno direttamente in Anki sul tuo computer. Mentre il dizionario di giapponese è ancora in download, una parola che cerchi viene inviata a Jotoba per ottenere la risposta.',
          ],
          keywords: ['privacy', 'riservatezza', 'tracciamento', 'sicurezza', 'internet'],
        },
      ],
    },
  ],
};
