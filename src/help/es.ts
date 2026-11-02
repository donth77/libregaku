import type { HelpTranslation } from './content';

/** The help in Spanish. A chapter or topic left out shows in English. */
export const es: HelpTranslation = {
  title: 'Ayuda',
  intro: 'Cómo funciona Libregaku y respuestas a lo que más se pregunta. Busca o elige un capítulo.',
  search: 'Buscar…',
  searchLabel: 'Buscar en la ayuda',
  none: 'No hay nada sobre “{q}”.',
  settings: 'Configuración',
  contents: 'Capítulos',
  tipLabel: 'Consejo:',
  then: 'luego',
  link: 'Enlace a este tema',
  popular: { label: 'Populares:' },
  chapters: [
    {
      id: 'start',
      title: 'Primeros pasos',
      about: 'Tres decisiones y, después, un video.',
      topics: [
        {
          id: 'get-started',
          title: 'Configurar Libregaku',
          body: [
            [
              'En {Configuración → Idiomas}, elige el idioma que aprendes y tu propio idioma.',
              'Descarga Anki desde https://apps.ankiweb.net. En {Configuración → Anki}, sigue los pasos para conectar Anki y elige el mazo al que irán las tarjetas nuevas.',
              'En YouTube, Netflix u otro sitio compatible, abre un video con subtítulos en el idioma que aprendes y deja el cursor sobre una palabra.',
            ],
            { tip: 'Anki es opcional. Los subtítulos, las búsquedas y la transcripción funcionan sin él; Anki es lo que recuerda qué palabras conoces.' },
          ],
          keywords: ['instalar', 'instalación', 'empezar', 'comenzar', 'inicio', 'primera vez', 'ajustes', 'configuracion', 'setup'],
        },
        {
          id: 'anki',
          title: '¿Qué es Anki?',
          body: [
            'Anki es una aplicación gratuita de tarjetas de memoria. Te vuelve a mostrar cada tarjeta justo antes de que la olvides (repetición espaciada).',
            'Libregaku añade tarjetas a Anki a partir de las palabras y oraciones que eliges. También lee tus tarjetas de Anki para saber qué palabras ya conoces.',
            'Necesitas Anki en tu equipo, con el complemento [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Descarga Anki desde https://apps.ankiweb.net.',
          ],
          keywords: ['flashcards', 'fichas', 'srs', 'descargar', 'instalar', 'repaso', 'repasar', 'add-on'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Ver videos',
      about: 'Buscar palabras, la transcripción y las teclas.',
      topics: [
        {
          id: 'look-up',
          title: 'Buscar una palabra',
          body: [
            'Deja el cursor sobre una palabra del subtítulo o de la transcripción y se abrirá su ventana emergente: la lectura, los tres primeros significados y “+N significados más” para el resto.',
            'Los kanji y los ejemplos del video ocupan una línea cada uno en la ventana emergente. Haz clic en una para abrirla; la próxima vez seguirá abierta.',
            'Arrastra sobre varias palabras para buscar una frase. Haz clic de nuevo en ella, o pulsa `Esc`, para quitar la selección.',
            { tip: 'Por defecto, las palabras se buscan al pasar el cursor. En {Configuración → Búsqueda de palabras → Modo de búsqueda} puedes cambiarlo a pasar el cursor con `Shift` pulsado, o a hacer clic.' },
          ],
          keywords: ['diccionario', 'definición', 'definiciones', 'consultar', 'traducir', 'hover', 'ratón', 'mouse', 'seleccionar'],
        },
        {
          id: 'transcript',
          title: 'Usar el panel de transcripción',
          body: [
            '`S` lo muestra u oculta. Haz clic en una línea para reproducir desde ahí; el cuadro de búsqueda encuentra cualquier línea.',
            'El botón de filtro deja solo las líneas con palabras nuevas, las que tienen exactamente una o las guardadas. El marcador de cada fila, o `B`, guarda una línea; las líneas guardadas se añaden juntas a Anki o se exportan a un archivo.',
          ],
          keywords: ['barra lateral', 'sidebar', 'buscar', 'filtrar', 'exportar', 'transcripcion', 'subtitulos'],
        },
        {
          id: 'colours',
          title: 'Cambiar los colores del subrayado',
          body: [
            'Cada color de subrayado indica cuánto conoces una palabra: nueva, en aprendizaje, seguida o conocida. {Configuración → Subrayado} tiene un selector de color para cada uno, y Restablecer vuelve a los colores predeterminados.',
            { tip: 'Las palabras conocidas no se subrayan, salvo que actives {Configuración → Subrayado → Subrayar palabras conocidas}.' },
          ],
          keywords: ['paleta', 'tema', 'aspecto', 'personalizar', 'underline'],
        },
        {
          id: 'keys',
          title: 'Combinaciones de teclas',
          body: [
            {
              head: ['Tecla', 'Qué hace'],
              rows: [
                ['`←` `→`', 'Línea anterior o siguiente'],
                ['`↓`', 'Repetir la línea'],
                ['`↑`', 'Mostrar u ocultar la traducción'],
                ['`A`', 'Añadir a Anki la palabra de la ventana emergente'],
                ['`K`', 'Marcar como conocida la palabra de la ventana emergente'],
                ['`B`', 'Guardar la línea actual'],
                ['`S`', 'Mostrar u ocultar el panel de transcripción'],
                ['`H`', 'Desenfocar o enfocar los subtítulos'],
                ['`R`', 'Cambiar el furigana, el pinyin o el Jyutping: desactivado, palabras nuevas, todas (japonés, chino (mandarín), cantonés)'],
                ['`Shift`', 'Mantener pulsado para buscar la palabra bajo el cursor, si {Configuración → Búsqueda de palabras → Modo de búsqueda} está en “Pasar el cursor con Shift”'],
                ['`Esc`', 'Cerrar la ventana emergente'],
              ],
            },
            'El botón del teclado del panel de transcripción las muestra mientras ves el video.',
            'Desactiva {Configuración → Subtítulos → Atajos de una tecla} para usar las teclas de letras solo con `Alt` y `Shift` pulsadas.',
            'Solo con el teclado: usa `Tab` para llegar a una palabra del subtítulo y pulsa `Enter` para buscarla; con `←` `→` pasas de una palabra a otra. En la transcripción, con `↑` `↓` pasas de una línea a otra.',
          ],
          keywords: ['atajos', 'atajos de teclado', 'accesos directos', 'shortcut', 'hotkey', 'accesibilidad', 'lector de pantalla', 'alt', 'tab'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Crear tarjetas',
      about: 'Una palabra, o una línea entera, a Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Crear una tarjeta',
          body: [
            'Pulsa Añadir a Anki al pie de la ventana emergente de una palabra, o `A`. La tarjeta lleva la palabra, su lectura y significado, la oración y su traducción, una grabación de la palabra, el sonido de la propia línea y un fotograma.',
            { tip: 'Si creas una por error, haz clic en Añadida en los minutos siguientes para deshacerlo.' },
            'Si Anki ya tiene la palabra, el botón muestra En Anki; haz clic para verla en Anki. Si Anki está cerrado, la tarjeta nueva espera en el navegador y se añade cuando Anki vuelva a responder.',
          ],
          keywords: ['flashcard', 'ficha', 'anki', 'agregar', 'borrar', 'eliminar', 'quitar'],
        },
        {
          id: 'add-line',
          title: 'Crear una tarjeta de una oración entera',
          body: [
            'En la ventana emergente de una palabra, el globo de diálogo con un + crea en su lugar una tarjeta de la oración entera, con su sonido y una captura de pantalla. Cada línea de la transcripción tiene el mismo botón al pasar el cursor por encima.',
          ],
          keywords: ['frase', 'frases', 'tarjeta de oración', 'línea entera', 'oracion', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Audio de la oración',
          body: [
            'Cuando añades una tarjeta desde el subtítulo o la transcripción, ya sea de una palabra, una frase o la oración entera, Libregaku graba esa línea del video y pone la grabación en la tarjeta. Al repasar, oyes la oración tal como se dijo.',
            'Chrome solo puede grabar mientras el video se reproduce, así que la línea suena una vez más y luego el video vuelve a donde estabas.',
            { tip: 'Guardar una línea no graba nada, y tampoco añadir una tarjeta desde las listas de Guardadas. {Configuración → Tarjetas de Anki → Audio de la oración} desactiva la grabación.' },
          ],
          keywords: ['sonido', 'voz', 'escuchar', 'repetir', 'oracion', 'sentence audio'],
        },
        {
          id: 'decks',
          title: 'Elegir el mazo',
          body: [
            'Las tarjetas nuevas van al mazo de {Configuración → Anki → Mazo para tarjetas nuevas}.',
            'Cada idioma que aprendes tiene su propio mazo. Hasta que elijas uno, sus tarjetas van a un mazo que se crea para él con la primera tarjeta: Libregaku-JA para el japonés, Libregaku-ES para el español. Si cambias {Configuración → Idiomas → Estoy aprendiendo}, también cambia el mazo.',
            'Para cambiarlo mientras ves un video, activa {Configuración → Ventana emergente → Menú de mazos}. Aparece un ▾ junto a Añadir a Anki; “Añadir a” un mazo añade la tarjeta ahí y también envía ahí las siguientes.',
            { tip: 'El estado de las palabras se lee de {Configuración → Anki → Leer palabras conocidas de}. Si las tarjetas nuevas van a un mazo que no se lee, Configuración te lo indica.' },
          ],
          keywords: ['deck', 'submazo', 'submazos', 'nuevo mazo', 'crear mazo'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Marcar palabras',
      about: 'Conocida, Seguir e Ignorar: ninguno crea una tarjeta.',
      topics: [
        {
          id: 'marks',
          title: 'Conocida, Seguir e Ignorar',
          body: [
            'Los botones pequeños junto a la palabra, en su ventana emergente.',
            [
              'Conocida (`K`): ya la conoces. No se subraya y cuenta como conocida.',
              'Seguir: un subrayado morado, para que te fijes en la palabra cuando aparezca.',
              'Ignorar: para nombres y sonidos. Nunca se subrayan ni se cuentan.',
            ],
            'Haz clic otra vez en una marca para quitarla, o busca la palabra en la pestaña Guardadas del panel de transcripción.',
          ],
          keywords: ['marcar', 'conocidas', 'seguidas', 'ignoradas', 'púrpura', 'violeta', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Ver y cambiar tus palabras marcadas',
          body: [
            'En el panel de transcripción, la pestaña Guardadas muestra las líneas que guardas y las palabras que sigues, marcas como conocidas o ignoras, en una lista cada una. Cada palabra tiene un botón para quitar su marca (Dejar de ignorar, si está ignorada), y desde ahí una palabra seguida puede convertirse en tarjeta.',
            'Cada idioma tiene sus propias listas. La pestaña Guardadas muestra las del idioma que estás aprendiendo, y una palabra marcada en un idioma no queda marcada en otro.',
            'Cada lista tiene un cuadro de búsqueda y los botones Copiar y Exportar archivo, que te dan la lista como un archivo que Anki y las hojas de cálculo pueden abrir.',
          ],
          keywords: ['seguimiento', 'lista de seguimiento', 'watchlist', 'desmarcar', 'quitar marca', 'conocidas', 'seguidas', 'ignoradas', 'excel'],
        },
      ],
    },
    {
      id: 'supported-sites',
      title: 'Sitios compatibles',
      about: 'Los sitios en los que funciona Libregaku y en qué se diferencian.',
      topics: [
        {
          id: 'supported-sites-list',
          title: '¿En qué sitios funciona?',
          body: [
            'Libregaku dibuja subtítulos interactivos sobre el video en estos sitios. Usa los subtítulos que ofrece el propio sitio, en el idioma que estás aprendiendo.',
            {
              head: ['Sitio', 'Audio de la oración y captura de pantalla'],
              rows: [
                ['YouTube', 'Se toman del video.'],
                ['Netflix', 'Se graba desde la pestaña; sin captura de pantalla.'],
                ['Disney+', 'Se graba desde la pestaña; sin captura de pantalla.'],
                ['Prime Video', 'Se graba desde la pestaña; sin captura de pantalla.'],
                ['HBO Max', 'Se graba desde la pestaña; sin captura de pantalla.'],
                ['Apple TV', 'Se graba desde la pestaña; sin captura de pantalla.'],
                ['Viki', 'Se graba desde la pestaña; sin captura de pantalla.'],
              ],
            },
            'El capítulo de sitios protegidos explica cómo se graba el sonido desde la pestaña. Un video sin subtítulos en el idioma que aprendes no tiene nada que mostrar, y Libregaku lo dice.',
          ],
          keywords: ['youtube', 'netflix', 'disney', 'prime video', 'max', 'hbo', 'viki', 'rakuten', 'sitios', 'webs', 'compatibles', 'streaming'],
        },
      ],
    },
    {
      id: 'protected-sites',
      title: 'Sitios protegidos',
      about: 'Los sitios que cifran su video: Netflix, Disney+, Prime Video, HBO Max, Apple TV y Viki. Qué cambia con esa protección.',
      topics: [
        {
          id: 'protected-sites-audio',
          title: 'Audio de la oración en sitios protegidos',
          body: [
            [
              'Abre {Configuración → Tarjetas de Anki → Audio de la oración en sitios protegidos} y pulsa Permitir.',
              'En la pestaña donde se reproduce el video, haz clic en el icono de Libregaku de la barra de herramientas y pulsa Grabar audio de la oración aquí. Hazlo una vez por pestaña.',
            ],
            'Los sitios protegidos cifran su video, así que Libregaku no puede grabar el sonido del video como en YouTube. En su lugar graba la pestaña, algo que Chrome solo permite de esta forma. Por el mismo motivo, las tarjetas creadas ahí no tienen captura de pantalla.',
          ],
          keywords: ['netflix', 'disney', 'prime video', 'max', 'hbo', 'viki', 'rakuten', 'permiso', 'permisos', 'cifrado', 'drm', 'captura de pestaña', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Actualizaciones',
      topics: [
        {
          id: 'update',
          title: 'Cargar una versión nueva',
          body: [
            [
              'Abre la página de extensiones de tu navegador.',
              'Pulsa la flecha de recargar de Libregaku.',
              'Recarga la pestaña del video: una pestaña abierta antes de recargar sigue con la versión anterior.',
            ],
            { tip: 'Al pie de Configuración se indica cuándo se compiló la copia que estás usando.' },
          ],
          keywords: ['actualizar', 'actualización', 'refrescar', 'versión antigua', 'versión vieja', 'compilación', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Preguntas',
      topics: [
        {
          id: 'q-track',
          title: '¿Qué hace Seguir?',
          body: [
            'Subraya una palabra cada vez que aparece (en morado, salvo que lo cambies en {Configuración → Subrayado}) para que te fijes en ella, sin crear una tarjeta. Deja de contar como nueva. Las palabras seguidas aparecen en el panel de transcripción, en su pestaña Guardadas.',
          ],
          keywords: ['seguimiento', 'púrpura', 'violeta', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: '¿Por qué sigue subrayada una palabra que conozco?',
          body: [
            'El estado viene de tus tarjetas de Anki, en los mazos de {Configuración → Anki → Leer palabras conocidas de}. Una palabra cuya tarjeta aún no es madura se subraya como en aprendizaje; una sin tarjeta en esos mazos, como nueva. Una palabra que conoces sin tener tarjeta se puede marcar como Conocida.',
          ],
          keywords: ['madurez', 'subrayado', 'scope'],
        },
        {
          id: 'q-marks-deck',
          title: '¿Por qué hay un mazo Libregaku::Marks en Anki?',
          body: [
            'Conocida, Seguir e Ignorar se guardan ahí como notas ocultas, suspendidas para que nunca salgan en los repasos, y así llegan a tus otros dispositivos con la sincronización de Anki. Dentro del mazo hay uno para cada idioma, como Libregaku::Marks::JA. {Configuración → Anki → Ver marcas en Anki} las muestra.',
            { tip: 'Desactiva {Configuración → Anki → Guardar marcas en Anki} para guardar las marcas solo en este navegador.' },
          ],
          keywords: ['sincronizar', 'sincronizacion', 'sync', 'deck', 'oculto'],
        },
        {
          id: 'q-remove',
          title: '¿Puedo eliminar una tarjeta?',
          body: [
            'Justo después de añadirla, haz clic en Añadida para deshacerlo. Si la tarjeta es más antigua, haz clic en En Anki en la ventana emergente de la palabra y bórrala en Anki. Libregaku nunca borra una tarjeta que hayas estudiado.',
          ],
          keywords: ['borrar', 'quitar', 'suprimir', 'delete', 'remove', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: '¿Funciona con AnkiWeb?',
          body: [
            'No directamente: Libregaku se comunica con Anki en este equipo mediante el complemento [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Después, Anki sincroniza tus tarjetas con AnkiWeb y tu teléfono como siempre.',
          ],
          keywords: ['móvil', 'celular', 'android', 'iphone', 'sincronizar', 'sync', 'add-on'],
        },
        {
          id: 'q-picture',
          title: '¿Qué es la captura de pantalla de una tarjeta?',
          body: [
            'Un fotograma de la escena, en el reverso de la tarjeta, para que veas de dónde viene la palabra. En YouTube se toma del video; los sitios protegidos ocultan su video a las extensiones, así que las tarjetas creadas ahí no tienen ninguno. {Configuración → Tarjetas de Anki → Captura de pantalla} la desactiva.',
          ],
          keywords: ['imagen', 'foto', 'pantallazo', 'screenshot'],
        },
        {
          id: 'q-replay',
          title: '¿Por qué se repite la línea al añadir una tarjeta?',
          body: [
            'Su sonido se graba mientras se reproduce, así que la línea suena una vez más; luego la reproducción vuelve a donde estaba. {Configuración → Tarjetas de Anki → Audio de la oración} lo desactiva.',
          ],
          keywords: ['grabación', 'vuelve atrás', 'salta', 'replay'],
        },
        {
          id: 'q-translation',
          title: '¿Por qué no hay traducción bajo el subtítulo?',
          body: [
            'La traducción son los propios subtítulos del sitio en el idioma de {Configuración → Idiomas → Tu idioma}. Si el video no tiene subtítulos en ese idioma, no hay nada que mostrar, y Libregaku te lo indica. No usa traducción automática.',
          ],
          keywords: ['segunda línea', 'doble', 'dual', 'subtítulos dobles', 'traducir', 'traduccion', 'español', 'inglés'],
        },
        {
          id: 'q-definitions',
          title: '¿Por qué las definiciones solo están en algunos idiomas?',
          body: [
            'Para el japonés vienen de JMdict, que tiene definiciones en nueve idiomas. Si el tuyo no es uno de ellos, {Configuración → Idiomas} muestra una segunda fila, Definiciones en, para elegir el idioma que se usará en su lugar.',
            'Los diccionarios de chino (mandarín), coreano, español, francés y alemán están escritos en inglés. Donde existe uno en tu idioma para el par, se usa primero.',
          ],
          keywords: ['diccionario', 'significados', 'húngaro', 'esloveno', 'cc-cedict', 'wiktionary', 'wikcionario'],
        },
        {
          id: 'q-languages',
          title: '¿Qué idiomas puedo aprender?',
          body: [
            'El japonés, el chino (mandarín), el cantonés, el coreano, el español, el francés y el alemán tienen diccionario, y una palabra coincide con su tarjeta en cualquier forma en que se diga: 갔어요 encuentra una tarjeta de 가다, y hablábamos, una de hablar. El japonés muestra furigana sobre las palabras, el chino (mandarín) muestra pinyin y el cantonés muestra Jyutping.',
            'Los demás idiomas de {Configuración → Idiomas → Estoy aprendiendo} aparecen como limitados. Sus palabras se separan, pero aún no tienen diccionario.',
            'El diccionario de un idioma se descarga la primera vez que lo eliges. La descarga es de 11 a 27 MB; en el disco ocupa 100 MB para el chino (mandarín), 140 MB para el francés, 200 MB para el coreano y el alemán, y 470 MB para el español. Un diccionario en tu propio idioma, cuando lo hay, es una segunda descarga de hasta 18 MB. El japonés descarga además un segundo diccionario, que sirve para separar las líneas en palabras: 46 MB, y 190 MB en el disco.',
          ],
          keywords: ['mandarín', 'cantonés', 'jyutping', 'compatibles', 'disponibles', 'soporte', 'tamaño', 'japones'],
        },
        {
          id: 'q-data',
          title: '¿Libregaku envía mis datos a alguna parte?',
          body: [
            'No hay cuenta ni servidor. Los diccionarios se descargan una vez y se guardan en el navegador; las tarjetas van directamente a Anki en este equipo. Mientras el diccionario de japonés aún se descarga, la palabra que buscas se envía a Jotoba para obtener la respuesta.',
          ],
          keywords: ['privacidad', 'privacy', 'rastreo', 'telemetría', 'internet', 'seguridad'],
        },
      ],
    },
  ],
};
