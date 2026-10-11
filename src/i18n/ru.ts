import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

const plural = new Intl.PluralRules('ru');

/** The form a count takes: 1 карточка, 2 карточки, 5 карточек. A fraction takes the second: 1,5 карточки. */
const form = (n: number, one: string, few: string, many: string): string => {
  const rule = plural.select(n);
  return rule === 'one' ? one : rule === 'many' ? many : few;
};

/** "1 карточка", "2 карточки", "5 карточек". */
const cards = (n: number): string => `${n} ${form(n, 'карточка', 'карточки', 'карточек')}`;

/** The same, as the object of a verb: "добавить 1 карточку". */
const cardsObject = (n: number): string => `${n} ${form(n, 'карточку', 'карточки', 'карточек')}`;

/** "1 слово", "2 слова", "5 слов". */
const words = (n: number): string => `${n} ${form(n, 'слово', 'слова', 'слов')}`;

/** A share, as Russian writes it: a space, never broken, before the %. */
const percent = (n: number): string => `${n}\u00A0%`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'выкл.', unknown: 'новые слова', always: 'все' };

/** What a card went in without, after "без": "без аудио предложения". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'аудио предложения (нажмите на значок Libregaku, чтобы записывать здесь)'
      : 'аудио предложения'))
    .join(' и ');

/** Media Libregaku attaches only when it fetched them itself, each with the words that agree with it. */
const MEDIA_FETCHED = {
  audio: 'аудио, которое скачал сам',
  video: 'видео, которое скачал сам',
  picture: 'изображения, которые скачал сам',
} as const;

/** The same media, after "в": "в аудио". */
const MEDIA_IN = { audio: 'аудио', video: 'видео', picture: 'изображении' } as const;

/** The interface in Russian. Anything left out shows in English. */
export const ru: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Фуригана: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Пиньинь: ${RUBY[mode]}`,
    mandarin: 'Китайский (путунхуа)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Языки
    languagesHeading: 'Языки',
    languagesAbout: 'Выберите язык, который изучаете, и свой язык.',
    target: 'Я изучаю',
    targetLimited: (language: string): string => `${language} — ограниченно`,
    supportFull: 'Полная поддержка, включая чтения и фуригану.',
    supportPinyin: 'Полная поддержка, включая пиньинь. Определения на английском.',
    supportJyutping: 'Полная поддержка, включая Jyutping. Определения на английском.',
    supportWords: 'Полная поддержка. Определения на английском.',
    script: 'Письменность',
    scriptHint: 'Используется, когда в видео есть обе.',
    supportBasic: 'Базовая поддержка: текст делится на слова, но словаря и чтений пока нет.',
    native: 'Ваш язык',
    nativeHint: 'Переводы и определения показываются на этом языке, если он есть у видео и в словаре.',
    definitions: 'Язык определений',
    definitionsHint: 'В словаре нет определений на вашем языке, поэтому они показываются на этом.',
    definitionsHintFor: (language: string): string =>
      `В словаре нет определений на вашем языке (${language}), поэтому они показываются на этом.`,

    // Поиск в словаре
    lookupHeading: 'Поиск в словаре',
    lookupAbout: 'Выберите, как и когда открывается словарь.',
    interaction: 'Способ поиска',
    interactionHover: 'Наведение',
    interactionShift: 'Наведение с Shift',
    interactionClick: 'Нажатие',
    interactionHint: 'Нажатие на слово тоже всегда работает.',
    hoverPause: 'Пауза при поиске',
    hoverPauseHint: 'Ставит видео на паузу, пока указатель на слове.',
    sidebarHover: 'Краткие определения в расшифровке',
    sidebarHoverHint: 'Показывает краткое определение, когда вы наводите указатель на слово в расшифровке.',

    // Всплывающее окно
    popupHeading: 'Всплывающее окно',
    popupAbout: 'Выберите, что показывать во всплывающем окне слова.',
    cardMarks: 'Кнопки «Известно» и «Игнорировать»',
    cardMarksHint:
      '«Известно» убирает подчёркивание слова, «Игнорировать» убирает его из подсчётов. Карточку не добавляет ни одна из них.',
    cardTrack: 'Кнопка «Отслеживать»',
    cardTrackHint: 'Подчёркивает фиолетовым слова, которые вы хотите замечать. Карточку не добавляет.',
    cardDeckMenu: 'Меню колод',
    cardDeckMenuHint: 'Добавляет ▾ рядом с «Добавить в Anki», чтобы выбрать другую колоду. Новые карточки будут попадать туда.',
    cardHideAdd: 'Скрыть «Добавить в Anki»',
    cardHideAddHint: 'Убирает с карточки кнопку «Добавить в Anki» и меню колод рядом с ней.',
    cardAddLine: 'Карточки предложений',
    cardAddLineHint: 'Добавляет кнопку, которая создаёт карточку из целого предложения — с его аудио и скриншотом.',
    cardKanji: 'Разбор кандзи',
    cardKanjiHint: 'Показывает значения и чтения каждого кандзи.',
    cardHanzi: 'Разбор иероглифов',
    cardHanziHint: 'Показывает значения и чтения каждого иероглифа.',
    lookupElsewhere: 'Примеры из этого видео',
    lookupElsewhereHint: 'Показывает другие предложения из этого видео с этим словом. Нажмите на любое, чтобы воспроизвести его.',

    // Субтитры
    subtitlesHeading: 'Субтитры',
    subtitlesAbout: 'Настройте вид субтитров на видео.',
    ruby: 'Фуригана',
    rubyUnknown: 'Новые слова',
    rubyAlways: 'Все',
    rubyNever: 'Выкл.',
    rubyHint: 'Чтения над кандзи. Нажмите R, чтобы переключать во время просмотра.',
    pinyin: 'Пиньинь',
    pinyinHint: 'Чтения над иероглифами. Нажмите R, чтобы переключать во время просмотра.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Чтения над иероглифами. Нажмите R, чтобы переключать во время просмотра.',
    blurPrimary: 'Размывать субтитры',
    blurPrimaryHint:
      'Для тренировки восприятия на слух: субтитры размыты, пока вы не наведёте на них указатель. Нажмите H, чтобы переключить.',
    subtitleSize: 'Размер текста',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Масштабируется вместе с плеером, поэтому в полноэкранном режиме выглядит так же.',
    subtitleBottom: 'Положение',
    subtitleBottomLowest: 'Самое низкое',
    subtitleBottomLow: 'Низкое',
    subtitleBottomNormal: 'Обычное',
    subtitleBottomRaised: 'Приподнятое',
    subtitleBottomHigh: 'Высокое',
    subtitleBottomHighest: 'Самое высокое',
    subtitleBottomHint: 'Высота субтитров. Субтитры другого расширения в том же плеере остаются под ними.',
    dualSubtitles: 'Показывать перевод',
    dualSubtitlesHint:
      'Показывает субтитры на вашем языке под субтитрами на изучаемом. Они берутся с сайта, а не из машинного ' +
      'перевода, и для них нужна полная расшифровка видео.',
    singleKeys: 'Быстрые клавиши без Alt и Shift',
    singleKeysHint:
      'Буквенные клавиши, например A и R, работают сами по себе во время просмотра. ' +
      'Если выключено, удерживайте с ними Alt и Shift. Клавиши со стрелками работают в любом случае.',

    // Подчёркивание
    underlinesHeading: 'Подчёркивание',
    underlinesAbout: 'Цвет показывает, насколько хорошо вы знаете слово. Нажмите на цвет, чтобы изменить его.',
    colorUnknown: 'Новые слова',
    colorUnknownHint: 'Слова без карточки в Anki.',
    colorLearning: 'Изучаемые',
    colorLearningHint: 'Слова с карточкой, которая ещё не закреплена.',
    colorTracking: 'Отслеживаемые',
    colorTrackingHint: 'Слова, которые вы отслеживаете.',
    colorKnown: 'Известные',
    colorKnownHint: 'Слова с закреплённой карточкой или отмеченные как известные.',
    underlines: 'Подчёркивать слова',
    underlinesHint: 'Выключите, чтобы субтитры были обычными, без цвета под словами.',
    markKnown: 'Подчёркивать известные слова',
    markKnownHint: 'По умолчанию выключено: чем больше вы знаете, тем спокойнее экран.',
    defaultColours: 'Цвета по умолчанию',
    resetColours: 'Сбросить',

    // Расшифровка
    transcriptHeading: 'Расшифровка',
    transcriptAbout: 'Панель рядом с видео, где собраны все строки субтитров.',
    sidebarFollow: 'Прокручивать вместе с видео',
    sidebarFollowHint: 'Держит текущую строку на виду. Если прокрутить список вручную, автопрокрутка приостановится; кнопка возобновит её.',
    headerBar: 'Показывать верхнюю панель',
    headerBarHint: 'Появляется вверху видео, когда указатель рядом.',
    languageBadge: 'Значок языка',
    languageBadgeFlag: 'Флаг',
    languageBadgeCode: 'Код',
    badgeFlag: 'Флаг на значке',
    badgeFlagDefault: 'По умолчанию',
    flagSearch: 'Поиск…',
    flagSearchLabel: 'Поиск страны',
    flagSuggested: 'Рекомендуемые',
    flagAll: 'Все страны',
    flagNone: (query: string): string => `Нет стран по запросу «${query}».`,
    badgeFlagHint: 'Флаг, который показывается для изучаемого языка. Для каждого языка сохраняется свой.',
    languageBadgeHint: 'Как верхняя панель показывает изучаемый язык.',
    sidebarStats: 'Считать новые слова',
    sidebarStatsHint: 'Показывает число новых слов в каждой строке, ваш процент известных слов и фильтры на их основе.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Подключите Anki и выберите, куда попадают новые карточки и по каким колодам определять известные слова.',
    deck: 'Колода для новых карточек',
    deckHint: 'Колода, в которую добавляется каждая новая карточка.',
    statusScope: 'Источник известных слов',
    statusScopeHint: 'Карточки в этих колодах определяют, какие слова подчёркнуты. Включая подколоды.',
    marksInAnki: 'Хранить отметки в Anki',
    marksInAnkiHint:
      'Сохраняет «Известно», «Отслеживать» и «Игнорировать» как скрытые записи в Anki (Libregaku::Marks), чтобы они ' +
      'синхронизировались с другими устройствами. Если выключено, они остаются в этом браузере.',

    // Меню колод
    wholeCollection: 'Вся коллекция',
    chooseDeck: 'Выберите колоду…',
    deckNotInAnki: (deck: string): string => `${deck} — нет в Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (с подколодами)`,
    deckUnset: 'Выберите колоду. Пока вы этого не сделаете, карточки добавлять нельзя.',
    deckMissing: (deck: string): string => `В Anki больше нет колоды «${deck}». Выберите другую.`,
    statusScopeMissing: (deck: string): string =>
      `В Anki больше нет колоды «${deck}», поэтому все слова показаны как новые. Выберите другую.`,
    statusScopeOutside: (deck: string): string =>
      `Новые карточки попадают в «${deck}», а эта колода сюда не входит, поэтому добавленные слова останутся ` +
      'подчёркнутыми как новые. Выберите колоду, в которую она входит, или «Вся коллекция».',

    // Состояние Anki
    ankiChecking: 'Проверка…',
    ankiConnected: 'Подключено.',
    noteTypeInstalled: 'Тип записи установлен.',
    cardsMade: (n: number): string => `${cards(n)} ${form(n, 'создана', 'созданы', 'создано')} в Libregaku.`,
    noCards: 'Карточек пока нет.',
    cardsFlushed: (n: number): string =>
      `${form(n, 'Добавлена', 'Добавлены', 'Добавлено')} ${cards(n)}, ` +
      `${form(n, 'созданная', 'созданные', 'созданных')}, пока Anki был закрыт.`,
    cardsNotFlushed: (n: number, error: string): string => `Не удалось добавить ${cardsObject(n)}: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} ${form(n, 'ждёт', 'ждут', 'ждут')} добавления.`,
    ankiOffline: (port: number): string =>
      `Anki не отвечает на порту ${port}. Это нормально, пока он закрыт: ` +
      'новые карточки ждут здесь и будут добавлены, когда он откроется.',
    ankiBlocked: 'Anki запущен, но AnkiConnect пока не разрешает доступ этому расширению.',
    ankiOccupied: (detail: string): string => `${detail} Закройте программу, которая занимает порт, чтобы его мог использовать Anki.`,

    // Кнопки Anki
    checkAgain: 'Проверить снова',
    newDeck: 'Новая колода',
    openCards: 'Открыть карточки в Anki',
    openMarks: 'Открыть отметки в Anki',
    newDeckPrompt: 'Введите название новой колоды. Для подколоды используйте ::, например Японский::Netflix',

    // Подключение Anki
    installStep: 'Установите Anki на этот компьютер и откройте его. {link}',
    getAnki: 'Скачать Anki',
    addonStep: 'В Anki откройте {menu}, вставьте этот код и перезапустите Anki.',
    addonMenu: 'Инструменты → Дополнения → Установить дополнения…',
    aboutAnkiConnect: 'Об AnkiConnect',
    originStep: 'В Anki откройте {menu}, добавьте эту строку в {setting} и перезапустите Anki.',
    originMenu: 'Инструменты → Дополнения → AnkiConnect → Конфигурация',
    runningStep: 'Не закрывайте Anki во время просмотра. Карточки попадают прямо в Anki на этом компьютере.',
    copy: 'Копировать',
    copyValue: (value: string): string => `Копировать ${value}`,
    copied: 'Скопировано',
    copyFailed: 'Выделите',

    // Карточки Anki
    ankiCardsHeading: 'Карточки Anki',
    ankiCardsAbout: 'Выберите, что добавлять в каждую новую карточку, помимо слова, чтения, значения и предложения.',
    cardAudio: 'Аудио слова',
    cardAudioHint: 'Запись произношения слова, если она есть. Никогда не синтезированный голос.',
    cardSentenceAudio: 'Аудио предложения',
    cardSentenceAudioHint: 'Записывает предложение, проигрывая его ещё раз. На защищённых сайтах для этого нужно разрешение ниже.',
    cardScreenshot: 'Скриншот',
    cardScreenshotHint: 'Кадр из сцены. Недоступно на защищённых сайтах: они это блокируют.',
    capture: 'Аудио предложения на защищённых сайтах',
    captureAllow: 'Разрешить',
    captureAllowInSettings: 'Разрешить в настройках',
    captureRemove: 'Отозвать',
    captureAllowed:
      'Разрешено. На каждой вкладке с защищённым сайтом нажмите на значок Libregaku и выберите «Записывать аудио предложения здесь».',
    captureNeeded: 'Защищённые сайты шифруют своё видео, поэтому аудио предложения записывается с вкладки. Для этого нужно ваше разрешение.',

    // Данные и лицензии
    creditsHeading: 'Данные и лицензии',
    creditJmdict:
      'Данные словаря и кандзи © Electronic Dictionary Research and Development Group, по лицензии CC BY-SA 4.0. ' +
      'В JSON переупакованы проектом jmdict-simplified.',
    creditLindera:
      'Делит японский, корейский и китайский текст на слова. Лицензия MIT; у IPADIC, mecab-ko-dic и CC-CEDICT ' +
      'свои условия.',
    creditCedict: 'Китайский словарь © MDBG и участники проекта, по лицензии CC BY-SA 4.0.',
    creditWiktionary:
      'Корейский и испанский словари, а также некоторые на вашем языке, из Wiktionary через kaikki.org и ' +
      'wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Корейские слова с объяснениями на вашем языке. © National Institute of Korean Language, по лицензии ' +
      'CC BY-SA 2.0 KR. Автор файлов — Lyroxide.',
    creditCfdict:
      'Китайский с объяснениями на французском. CFDICT © chine.in, обновляется проектом CxDICT. CC BY-SA 4.0.',
    creditCanto: 'Кантонский словарь и чтения Jyutping для CC-CEDICT. © Pleco Inc., по лицензии CC BY-SA 3.0.',
    creditHandedict: 'Китайский с объяснениями на немецком. © HanDeDict и участники проекта, по лицензии CC BY-SA 3.0.',
    creditUnihan: 'Какое чтение китайского иероглифа показывать первым. © Unicode, Inc., по лицензии Unicode License.',
    creditJotoba: 'Используются для поиска, пока загружается словарь. Оба основаны на JMdict.',
    creditLucide: 'Значки. Лицензия ISC.',
    creditCommons: 'Записи испанских, китайских и корейских слов, начитанные добровольцами. У каждой своя лицензия, чаще всего CC BY-SA 4.0; она указана вместе с именем диктора при воспроизведении и на карточке.',
    creditAudioCmn: 'Записи китайских слов: Yue Tan, Канский университет. CC BY-SA 3.0 US.',
    creditNaver: 'Записи корейских слов из словаря Naver, которые звучат только в карточке поиска. Лицензия не разрешает их повторное использование, поэтому на карточку они не попадают.',
    creditSpanishdict: 'Сгенерированный голос для испанских слов из SpanishDict, звучит по кнопке произношения, когда записи нет. Лицензия не разрешает повторное использование, поэтому на карточку он не попадает.',
    licence: 'Libregaku распространяется по лицензии MIT. Данные словарей скачиваются из источников, а не входят в расширение.',
    built: (when: string): string => `Эта копия собрана ${when}.`,

    // Быстрые клавиши
    keyLine: 'Предыдущая или следующая строка',
    keyReplay: 'Повторить строку',
    keyTranslation: 'Показать или скрыть перевод',
    keyShiftLookup: 'Удерживайте, чтобы найти слово под указателем',
    keyAdd: 'Добавить в Anki слово из всплывающего окна',
    keyKnown: 'Отметить слово из всплывающего окна как известное',
    keyFurigana: 'Переключить фуригану: выкл., новые слова, все',
    keyPinyin: 'Переключить пиньинь: выкл., новые слова, все',
    keyJyutping: 'Переключить Jyutping: выкл., новые слова, все',
    keyBlur: 'Размыть субтитры или убрать размытие',
    keySave: 'Сохранить текущую строку',
    keyTranscript: 'Показать или скрыть панель расшифровки',
    keyClose: 'Закрыть всплывающее окно',
  },

  options: {
    pageTitle: 'Настройки Libregaku',
    help: 'Справка',
    searchSettings: 'Поиск…',
    noSettingsFound: 'По запросу «{q}» ничего не найдено.',
    contentsLabel: 'Разделы настроек',
    settingsLabel: 'Настройки',
    setupHeading: 'Начало работы',
    setupAbout: 'Нужно выбрать две вещи, для остального уже заданы разумные значения.',
    stepLanguages: 'Выберите язык, который изучаете',
    stepAnki: 'Подключите Anki и выберите колоду для новых карточек',
    ankiOptional:
      'Anki необязателен: субтитры, словарь и фуригана работают и без него. ' +
      'Но именно Anki помнит, какие слова вы уже знаете.',
    nextSteps:
      'Затем откройте видео с субтитрами на изучаемом языке и наведите указатель на слово. ' +
      'Кнопка с клавиатурой на панели расшифровки покажет быстрые клавиши.',
    stepDone: 'Выполнено',
    confirmLanguages: 'Языки выбраны верно',
    keepDeck: (deck: string): string => `Использовать ${deck} для новых карточек`,
  },

  action: {
    help: 'Справка',
    settings: 'Настройки',
    settingsTip: 'Все настройки',
    checkingPage: 'Проверка страницы…',
    notActive:
      'На этой странице не работает. Откройте видео на YouTube, Netflix или другом поддерживаемом сайте. Если вы только что установили ' +
      'или перезагрузили Libregaku, обновите вкладку.',
    unsupported: 'Libregaku работает на YouTube, Netflix, Disney+, Prime Video и Max.',
    waitingForSubtitles: (site: string): string => `Ждём субтитры на ${site}. Убедитесь, что они включены.`,
    activeOn: (title: string): string => `Работает — ${title}`,
    active: 'Работает на этом видео.',
    subtitlesTrack: 'Субтитры',
    translationTrack: 'Перевод',
    noTranslation: 'Нет',
    generatedTrack: (track: string): string => `${track} (автоматически)`,
    captureNeedsPermission: 'Чтобы записывать здесь аудио предложения, нужно разрешение на захват звука этой вкладки.',
    captureAllowInSettings: 'Разрешить в настройках',
    captureReady: 'Звук с защищённых сайтов можно записывать, только когда вы включите запись для этой вкладки.',
    captureStart: 'Записывать аудио предложения здесь',
    captureFailed: 'Chrome не удалось записать эту вкладку.',
    toggleSidebar: 'Боковая панель',
    ankiChecking: 'Anki: проверка…',
    ankiConnected: (n: number): string => `Anki подключён · ${cards(n)} из Libregaku`,
    ankiOffline: 'Anki не запущен — слова показаны как новые',
    ankiOccupied: (port: number): string => `Порт ${port} занят другой программой, поэтому подключиться к Anki нельзя`,
    ankiBlocked: 'Anki отклонил это расширение — в настройках есть строка, которую нужно добавить',
    ankiBusy: 'Anki не ответил — возможно, идёт синхронизация',
    ankiRefused: 'Anki отклонил запрос',
    cardsToAdd: (n: number): string => `осталось добавить ${cardsObject(n)}`,
    cardsWaiting: (n: number): string => `${cards(n)} ${form(n, 'ждёт', 'ждут', 'ждут')} Anki`,
  },

  sidebar: {
    panelLabel: 'Панель расшифровки',
    resizeLabel: 'Изменить размер панели',

    // Вкладки и кнопки рядом с ними
    tabsLabel: 'Списки',
    transcriptTab: 'Расшифровка',
    savedTab: 'Сохранённые',
    settings: 'Настройки',
    shortcuts: 'Быстрые клавиши',
    close: 'Закрыть',
    closeLabel: 'Закрыть панель',
    openTip: 'Расшифровка',
    openLabel: 'Показать расшифровку',
    help: 'Справка',

    // Поиск по расшифровке
    searchPlaceholder: 'Поиск в расшифровке…',
    searchLabel: 'Поиск в расшифровке',
    noMatches: 'Нет совпадений',
    matchAt: (at: number, total: number): string => `${at} из ${total}`,
    matchesFound: (n: number): string => `Найдено: ${n}`,

    // Фильтр
    filterTip: 'Фильтр',
    filterLabel: 'Фильтр строк',
    filterAll: 'Все строки',
    filterAllAbout: 'Все строки без фильтра',
    filterNew: 'С новыми словами',
    filterNewAbout: 'Строки со словом, для которого у вас нет карточки',
    filterReady: 'Готовы к изучению',
    filterReadyAbout: 'Строки, где новое для вас только одно слово, — по ним проще всего учиться',
    filterSaved: 'Сохранённые',
    filterSavedAbout: 'Строки, которые вы сохранили на потом',

    // Расшифровка
    partial: 'Расшифровка пополняется по ходу просмотра: этот плеер отдаёт только текущую строку.',
    partialEmpty: 'Пока пусто. Строки появятся здесь, когда прозвучат.',
    empty: 'Расшифровка не загружена.',
    currentLine: 'Текущая строка',
    lineNew: (n: number): string => `${n} ${form(n, 'новое', 'новых', 'новых')}`,
    playFrom: (time: string): string => `Воспроизвести с ${time}`,
    saveLine: 'Сохранить строку',
    unsave: 'Убрать из сохранённых',
    addSentence: 'Добавить предложение',
    addSentenceLabel: 'Добавить предложение в Anki',

    // Сводка над расшифровкой: название и число, которое подходит к любому количеству
    knownPercent: (n: number): string => percent(n),
    summaryKnown: 'Известно: {n}',
    summaryNew: 'Новых: {n}',
    summaryReady: 'Готово к изучению: {n}',
    counting: (n: number): string => `Подсчёт новых слов… ${percent(n)}`,
    countFailed: 'Некоторые строки не удалось подсчитать, поэтому итогов нет.',

    // Краткое определение
    dictionaryLoading: (n: number): string => `Загрузка словаря — ${percent(n)}`,
    dictionaryUnavailable: 'Словарь недоступен',
    noEntry: 'Нет в словаре.',

    // Сохранённые
    savedEmpty:
      'Пока ничего не сохранено. Нажмите на закладку у любой строки расшифровки или клавишу B, чтобы сохранить ' +
      'предложение, к которому хотите вернуться.',
    thisVideo: 'это видео',
    openAt: (time: string): string => `Открыть видео на ${time}`,
    remove: 'Убрать',
    removeLabel: 'Убрать из сохранённых',
    copySavedAbout: 'Скопировать все сохранённые строки как текст с разделителями-табуляциями',
    exportSavedAbout: 'Сохранить файл с разделителями-табуляциями, который можно импортировать в Anki',
    addSavedAbout: 'Создать карточку из каждой сохранённой строки',
    linesCopied: (n: number): string =>
      `${form(n, 'Скопирована', 'Скопированы', 'Скопировано')} ${n} ${form(n, 'строка', 'строки', 'строк')}.`,
    chooseDeck: 'Сначала выберите колоду в настройках: туда попадают новые карточки.',
    checkingAnki: 'Проверка Anki…',
    ankiOffline: 'Anki не запущен. Откройте его и повторите попытку — инструкция есть в настройках.',
    ankiBlocked: 'AnkiConnect пока не разрешает доступ этому расширению. В настройках есть строка, которую нужно добавить.',
    ankiUnreachable: 'Не удалось подключиться к Anki. Причина указана в настройках.',
    adding: (at: number, total: number): string => `Добавление: ${at} из ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${form(added, 'Добавлена', 'Добавлены', 'Добавлено')} ${cards(added)} в ${deck}` +
      `${already ? `; ${already} уже ${form(already, 'была', 'были', 'были')} там` : ''}.`,

    // Кнопки и сообщения вкладок «Сохранённые» и «Слова»
    copy: 'Копировать',
    exportFile: 'Экспорт',
    addToAnki: 'Добавить в Anki',
    noClipboard: 'Нет доступа к буферу обмена.',
    downloaded: 'Сохранено в загрузки. В Anki: Файл → Импортировать.',
    downloadBlocked: 'Страница заблокировала скачивание — используйте «Копировать».',

    // Слова
    listsLabel: 'Какой список',
    listLines: 'Строки',
    listTracked: 'Отслеживаемые',
    listKnown: 'Известные',
    listIgnored: 'Игнорируемые',
    findPlaceholder: 'Поиск…',
    findLabel: 'Поиск по этому списку',
    copyWordsAbout: 'Скопировать список как текст с разделителями-табуляциями',
    exportWordsAbout: 'Сохранить список в файл с разделителями-табуляциями, который можно импортировать в Anki',
    wordsCopied: (n: number): string => `Скопировано ${words(n)}.`,
    nothingToExport: 'В этом списке нечего экспортировать.',
    lookingUp: 'Ищем чтения и значения…',
    noWordMatches: (query: string): string => `В этом списке нет слов по запросу «${query}».`,
    noLineMatches: (query: string): string => `Нет сохранённых строк по запросу «${query}».`,
    wordsMatching: (shown: number, total: number): string =>
      `${shown} из ${total} ${form(total, 'слова', 'слов', 'слов')}.`,
    trackedEmpty:
      'Пока ничего не отслеживается. «Отслеживать» подчёркивает слово, чтобы вы его замечали, без создания карточки. ' +
      'Включите эту кнопку в настройках, в разделе «Всплывающее окно».',
    trackedIntro: (n: number): string =>
      n === 1
        ? `Вы отслеживаете ${words(n)}. Оно подчёркивается везде, где встречается.`
        : `Вы отслеживаете ${words(n)}. Они подчёркиваются везде, где встречаются.`,
    stopTracking: 'Не отслеживать',
    knownEmpty:
      'Нет слов, отмеченных как известные. Если вы знаете слово и не хотите карточку, отметьте его как известное ' +
      'во всплывающем окне или нажмите K.',
    knownIntro: (n: number): string =>
      `${words(n)} ${form(n, 'отмечено как известное', 'отмечены как известные', 'отмечены как известные')}. ` +
      'Если снять отметку, статус слова снова будет зависеть от ваших карточек Anki.',
    unmarkKnown: 'Убрать из известных',
    ignoredEmpty:
      'Нет игнорируемых слов. Игнорируйте имена и звуки в их всплывающем окне — тогда они никогда не будут ' +
      'подчёркиваться и учитываться.',
    ignoredIntro: (n: number): string =>
      `${words(n)} ${form(n, 'никогда не подчёркивается и не учитывается', 'никогда не подчёркиваются и не учитываются',
        'никогда не подчёркиваются и не учитываются')}.`,
    stopIgnoring: 'Не игнорировать',
  },

  popup: {
    // Окно и слово
    cardLabel: (word: string): string => `${word} — словарь`,
    commonBadge: 'частое',
    characterNames: { kanji: 'Кандзи', hanzi: 'Иероглифы' },
    partOfSpeech: {
      n: 'существительное', 'n-adv': 'наречное существительное', 'n-t': 'существительное времени',
      'n-suf': 'именной суффикс', 'n-pref': 'именной префикс', pn: 'местоимение', 'adj-i': 'и-прилагательное',
      'adj-na': 'на-прилагательное', 'adj-no': 'но-прилагательное', 'adj-pn': 'атрибутив', adv: 'наречие',
      'adv-to': 'наречие', aux: 'вспомогательное слово', 'aux-v': 'вспомогательный глагол',
      'aux-adj': 'вспомогательное прилагательное', conj: 'союз', cop: 'связка', ctr: 'счётный суффикс',
      exp: 'выражение', int: 'междометие', num: 'числительное', prt: 'частица', pref: 'префикс', suf: 'суффикс',
      unc: 'без категории', vs: 'суру-глагол', 'vs-i': 'суру-глагол', 'vs-s': 'суру-глагол', vt: 'переходный',
      vi: 'непереходный', v1: 'итидан-глагол', 'v1-s': 'итидан-глагол', vk: 'куру-глагол', vz: 'дзуру-глагол',
      v5b: 'годан-глагол', v5g: 'годан-глагол', v5k: 'годан-глагол', 'v5k-s': 'годан-глагол',
      v5m: 'годан-глагол', v5n: 'годан-глагол', v5r: 'годан-глагол', 'v5r-i': 'годан-глагол',
      v5s: 'годан-глагол', v5t: 'годан-глагол', v5u: 'годан-глагол', 'v5u-s': 'годан-глагол',
      v5aru: 'годан-глагол',
      // Коды Wiktionary, для корейских и испанских слов.
      name: 'имя собственное', v: 'глагол', adj: 'прилагательное', pron: 'местоимение', det: 'детерминатив',
      artic: 'артикль', counter: 'счётное слово', prep: 'предлог', 'prep-phrase': 'предложный оборот',
      ptcl: 'частица', intj: 'междометие', phrase: 'словосочетание', prov: 'пословица', r: 'корень', char: 'символ',
      adn: 'определительное слово', ptcpl: 'причастие', contr: 'сокращение',
      masc: 'мужской род', fem: 'женский род', neut: 'средний род', sg: 'единственное число',
      pl: 'множественное число', 'pl-only': 'только множественное число', count: 'исчисляемое',
      uncount: 'неисчисляемое', vr: 'возвратный', vdt: 'дитранзитивный', impers: 'безличный', irreg: 'неправильный',
      reltnl: 'относительное', reltv: 'относительное', interr: 'вопросительное', poss: 'притяжательное',
      dim: 'уменьшительное', aug: 'увеличительное', onoma: 'звукоподражательное',
      idio: 'идиоматическое', fig: 'переносное', literal: 'буквальное', col: 'разговорное', inf: 'неформальное',
      fam: 'фамильярное', formal: 'официальное', polite: 'вежливое', lit: 'книжное', poet: 'поэтическое',
      rhet: 'риторическое', sl: 'сленг', vulg: 'вульгарное', derog: 'пренебрежительное', offens: 'оскорбительное',
      humor: 'шутливое', euph: 'эвфемизм', child: 'детское', net: 'интернет', neol: 'неологизм', cmn: 'частое',
      uncmmn: 'малоупотребительное', rare: 'редкое', dated: 'устаревающее', arch: 'архаичное', obs: 'устаревшее',
      hist: 'историческое', 'non-std': 'нестандартное', dialect: 'диалектное', regio: 'региональное',
    },

    // Кнопки под словом
    pronounce: 'Прослушать',
    playedRecording: (word: string): string => `${word} · запись`,
    playedSynthesised: (word: string): string => `${word} · синтез речи`,
    recordingBy: (speaker: string, licence: string): string => `Запись: ${speaker} · ${licence}`,
    pronounceFailed: 'не удалось воспроизвести аудио',
    addSentence: 'Добавить предложение',
    sentenceAdded: 'Предложение добавлено',
    undo: 'Отменить',
    copyWord: 'Копировать слово',
    copyPhrase: 'Копировать фразу',
    copySentence: 'Копировать предложение',
    wordCopied: 'слово скопировано',
    phraseCopied: 'фраза скопирована',
    sentenceCopied: 'предложение скопировано',
    copyFailed: 'не удалось скопировать — выделите текст вручную',

    // Значения
    dictionaryLoading: (n: number): string => `Словарь ещё загружается — ${percent(n)}. Попробуйте чуть позже.`,
    dictionaryUnavailable: (error: string): string => `Словарь недоступен: ${error}`,
    noEntry: 'Этого слова нет в словаре.',
    moreMeanings: (n: number): string => `+${n} ${form(n, 'значение', 'значения', 'значений')}`,

    // Другие строки видео с этим словом
    elsewhereCount: (n: number): string =>
      (n === 1 ? 'Ещё раз в этом видео' : `Ещё ${n} ${form(n, 'раз', 'раза', 'раз')} в этом видео`),
    playLine: 'Воспроизвести',
    elsewhereMore: (n: number): string => `и ещё ${n} — поиск по расшифровке найдёт все`,
    showAllInTranscript: 'Показать все в расшифровке',

    // Добавить в Anki
    addToAnki: 'Добавить в Anki',
    addToDeck: (deck: string): string => `Добавить в ${deck}`,
    adding: 'Добавление…',
    undoing: 'Отмена…',
    added: 'Добавлено',
    addedUndo: 'Добавлено — отменить',
    inAnki: 'В Anki',
    showInAnki: 'Показать в Anki',
    waiting: 'Ожидание',
    waitingForAnki: 'Ожидание Anki',
    goesInWhenAnkiOpens: 'Карточка попадёт в Anki, когда он откроется',
    alreadyAdded: 'Уже добавлено',
    alreadyInAnki: 'Уже есть в Anki',
    waitingForAnkiToOpen: 'Ждёт запуска Anki',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // Меню колод
    otherDecks: 'Другие колоды',
    addToAnotherDeck: 'Добавить в другую колоду',
    decksUnknown: 'Anki не отвечает, поэтому список колод пока неизвестен.',
    newDeck: 'Новая колода…',
    newDeckPrompt: 'Новая колода — для подколоды используйте ::, например Японский::Netflix',

    // Отметки
    knownButton: 'Известно',
    trackButton: 'Отслеживать',
    ignoreButton: 'Игнорировать',
    markKnownTip: 'Отметить как известное',
    trackTip: 'Отслеживать',
    ignoreTip: 'Игнорировать',
    unmarkKnownTip: 'Убрать из известных',
    stopTrackingTip: 'Не отслеживать',
    stopIgnoringTip: 'Не игнорировать',
  },

  header: {
    knownStat: 'Известно: {percent}',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Слова, которые вы знаете',
    readyStat: 'Готово к изучению: {count}',
    readyTip: 'Строки с одним новым словом',
    blurSubtitle: 'Размыть субтитры',
    unblurSubtitle: 'Убрать размытие',
    showTranslation: 'Показать перевод',
    hideTranslation: 'Скрыть перевод',
    translation: 'Перевод',
    transcript: 'Расшифровка',
    pinHeader: 'Закрепить панель',
    unpinHeader: 'Открепить панель',
    settings: 'Настройки',
    showHeader: 'Показать панель',
  },

  player: {
    // Клавиши плеера
    lastLine: 'Это была последняя строка',
    noLineBefore: 'Предыдущей строки нет',
    translationOn: 'Перевод включён',
    translationOff: 'Перевод выключен',
    blurOn: 'Субтитры размыты, пока на них не наведён указатель',
    blurOff: 'Субтитры видны',
    lineSaved: 'Строка сохранена',
    lineUnsaved: 'Строка убрана из сохранённых',
    lookUpFirst: 'Сначала найдите слово в словаре',
    alreadyKnown: (word: string): string => `${word} · уже известно по Anki`,
    alreadyInAnki: (word: string): string => `${word} · уже есть в Anki`,
    adding: (word: string): string => `Добавляем ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Отметки
    markOff: (word: string): string => `${word} · отметка снята`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'отмечено как известное', tracking: 'отслеживается', ignored: 'игнорируется', unknown: 'отмечено как новое',
      }[status];
      if (refused) return `${word} · ${done}, без карточки — Anki отклонил отметку, повторим попытку позже`;
      return `${word} · ${done}, без карточки${status === 'tracking' ? '. Смотрите вкладку «Сохранённые» на панели' : ''}`;
    },

    // Карточка слова
    pickDeck: 'Сначала выберите колоду в настройках Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `добавлено в ${deck} — без ${without(missing)}` : `добавлено в ${deck}`,
    alreadyIn: (deck: string): string => `уже есть в ${deck}`,
    queued: (deck: string): string => `Anki закрыт — карточка попадёт в ${deck}, когда он откроется`,
    alreadyQueued: 'уже ждёт Anki',
    notKept: 'Anki закрыт, а браузер не смог сохранить карточку на потом',
    takenBack: (deck: string): string => `убрано из ${deck}`,
    unqueued: 'больше не ждёт Anki',
    alreadySent: 'Карточка уже попала в Anki',
    queueSent: (count: number): string =>
      `Anki открыт — ${count === 1
        ? 'добавлена ожидавшая карточка'
        : `${form(count, 'добавлена', 'добавлены', 'добавлено')} ${count} ` +
          `${form(count, 'ожидавшая карточка', 'ожидавшие карточки', 'ожидавших карточек')}`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `известные слова берутся из ${scope}, поэтому карточки в ${deck} не будут учитываться`,

    // Карточка предложения
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `предложение добавлено в ${deck} — без ${without(missing)}` : `предложение добавлено в ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `предложение уже есть в ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'звука', picture && 'скриншота'].filter(Boolean);
      return `Anki закрыт — предложение попадёт в ${deck}, когда он откроется` +
        `${lacking.length ? `, без ${lacking.join(' и ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'предложение уже ждёт Anki',
    sentenceTakenBack: (deck: string): string => `предложение убрано из ${deck}`,

    // Аудио предложения
    recording: 'Запись строки…',

    // Поиск
    noDictionary: 'для этого языка пока нет словаря.',
  },

  notices: {
    // Карточка уведомления
    unexpected: 'В Libregaku возникла непредвиденная проблема.',
    dismiss: 'Закрыть',

    // YouTube или Netflix что-то изменили
    youtubeTrackList: 'Не удалось прочитать список субтитров YouTube.',
    youtubeTrackShape: 'Данные субтитров YouTube пришли в неожиданном формате.',
    youtubeCaptionText: 'Не удалось найти текст субтитров YouTube на странице.',
    youtubePlayerTrackList: 'Не удалось получить список субтитров этого видео из плеера YouTube.',
    netflixTrackList: 'Не удалось прочитать список субтитров Netflix.',
    netflixCaptionText: 'Не удалось найти текст субтитров Netflix на странице.',
    disneyTrackList: 'Не удалось прочитать список субтитров Disney+.',
    disneyCaptionText: 'Не удалось найти текст субтитров Disney+ на странице.',
    primeTrackList: 'Не удалось прочитать список субтитров Prime Video.',
    primeCaptionText: 'Не удалось найти текст субтитров Prime Video на странице.',
    maxTrackList: 'Не удалось прочитать список субтитров Max.',
    maxCaptionText: 'Не удалось найти текст субтитров Max на странице.',
    netflixBlocked: 'Netflix заблокировал часть Libregaku, которая читает субтитры.',

    // Субтитры этого видео
    subtitlesOff: 'Включите субтитры в плеере, и Libregaku их подхватит.',
    trackNotSent: 'Плеер ещё не загрузил эти субтитры.',
    noTargetTrack: 'Здесь нет субтитров на изучаемом языке.',
    noSecondTrack: 'Здесь нет субтитров на вашем языке, поэтому второй строки не будет.',
    onlyOneTrack: 'У этого видео только одна дорожка субтитров, поэтому второй строки не будет.',
    autoGenerated: 'Эти субтитры созданы автоматически, поэтому текст и деление на слова будут неточными.',
    noSubtitles: 'У этого видео нет субтитров.',
    secondTrackFailed: 'Не удалось загрузить вторую строку.',

    // Части расширения
    analyserUnavailable:
      'Чтения и словарные формы отключены: анализатор языка не загрузился. Слова сопоставляются с карточками ' +
      'только по точному написанию.',
    markNotSaved: 'Не удалось сохранить отметку. Она действует до перезагрузки страницы, а потом пропадёт.',
    marksNotSynced: 'Не удалось сохранить отметки в Anki. Они хранятся в этом браузере, попытка будет повторена.',
    cardsNotAdded:
      'Anki не принял часть карточек, сохранённых, пока он был закрыт. Они по-прежнему хранятся, попытка будет повторена.',

    // Подробности
    playerNeverLoaded: 'Плеер так и не загрузился.',
    subtitlesMaybeOff: 'Возможно, субтитры просто выключены в плеере.',
    lookedFor: (selector: string): string => `Искали: ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Субтитры в этом видео: ${languages.join(', ') || 'нет'}. ` +
      'Измените изучаемый язык в настройках или выберите другое видео.',
    onlyPictures: 'В этом видео они есть только в виде картинок, а не текста, поэтому Libregaku не может их прочитать.',
    chooseInPlayer: (track: string): string => `Выберите ${track} в меню субтитров плеера, и Libregaku их подхватит.`,
    noHumanTrack: 'Для этого видео нет дорожки, написанной человеком.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Субтитры в этом видео: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'анализатор не загрузился',
  },

  anki: {
    // Подключение к AnkiConnect
    offline: (port: number): string => `На порту ${port} никто не отвечает.`,
    timeout: (port: number, seconds: number): string =>
      `Порт ${port} не ответил за ${seconds} с. ` +
      'Возможно, Anki занят (идёт синхронизация или открыто диалоговое окно) или порт занят другой программой.',
    blocked: (origin: string): string =>
      `AnkiConnect отклонил ${origin}. В Anki откройте Инструменты → Дополнения → AnkiConnect → Конфигурация ` +
      'и добавьте эту строку в webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Что-то на порту ${port} ответило HTTP ${status}. AnkiConnect так не отвечает.`,
    notAnkiConnect: (port: number): string => `Порт ${port} занят чем-то другим, а не AnkiConnect.`,
    noBackground: 'Фоновая часть расширения не отвечает.',
    unreachable: 'Anki недоступен.',
    callFailed: 'Ошибка вызова AnkiConnect.',

    // Что Libregaku отказывается отправлять
    notRelayed: (action: string): string => `Libregaku не отправляет «${action}» в AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku прикрепляет только ${MEDIA_FETCHED[media]}.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `В ${MEDIA_IN[media]} этой записи нет данных.`,
    mediaName: (prefix: string): string => `Имена файлов, которые добавляет Libregaku, начинаются с ${prefix}…, а у этого — нет.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action}: нужен список ${ids === 'notes' ? 'записей' : 'карточек'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Отклонено: ${count} из отправленных ${ids === 'notes' ? 'записей' : 'карточек'} ` +
      `не ${form(count, 'принадлежит', 'принадлежат', 'принадлежат')} ни одной отметке Libregaku. ` +
      (change === 'delete'
        ? 'Libregaku удаляет только свои отметки, а также карточку, которую создал в последние несколько минут ' +
          'и которую ещё не изучали.'
        : change === 'suspend'
          ? 'Libregaku исключает только свои отметки.'
          : 'Libregaku меняет метки только у своих отметок.'),

    // Типы записей Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `В типе записи «${noteType}» в Anki нет ${fields.length === 1 ? 'поля' : 'полей'} ${fields.join(', ')}, ` +
      `поэтому ${loses === 'cards' ? 'карточки' : 'записи'} потеряли бы ${fields.length === 1 ? 'его' : 'их'}. ` +
      'Libregaku не меняет тип записи, который вы могли изменить: ' +
      `в Anki откройте Инструменты → Управление типами записей, переименуйте «${noteType}» (или верните поля), ` +
      'затем нажмите «Проверить снова», и будет установлен новый.',

    // Отметки и ожидающие карточки
    marksNotAdded: (count: number): string =>
      `Anki не добавил ${count} ${form(count, 'отметку', 'отметки', 'отметок')}. ` +
      `${count === 1 ? 'Она остаётся' : 'Они остаются'} в очереди, попытка будет повторена в следующий раз.`,
    marksNotStored: (cause: string): string => `Хранилище браузера не приняло отметки, прочитанные из Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Не удалось прочитать хранилище браузера: ${cause}`,
  },

  errors: {
    // Запись звука вкладки
    captureNotAllowed: 'Сначала разрешите аудио предложения на этом сайте в настройках Libregaku.',
    captureRefused: 'Chrome не разрешил захват этой вкладки',

    // Дорожка субтитров, которая не загрузилась
    unknownTrack: (id: string): string => `неизвестная дорожка ${id}`,
    trackNotSent: 'плеер её ещё не загрузил — выберите её один раз в меню субтитров плеера',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `ни один формат субтитров не сработал — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `ни один URL субтитров не сработал — ${attempts.join('; ') || 'их нет в списке'}`,
    emptyAnswer: 'пусто',
    noCues: '0 строк',
    noCuesParsed: 'после разбора 0 строк',
    noAnswerWithin: (seconds: number): string => `нет ответа за ${seconds} с`,

    // Название дорожки
    forcedTrack: (track: string): string => `${track} (принудительные)`,

    // Словарь и анализатор
    noAnswer: 'расширение не отвечает — перезагрузите страницу, чтобы перезапустить его',
    analyserLoading: 'анализатор ещё загружается',
    dictionaryLoading: 'словарь ещё загружается',
    lookupFailed: 'поиск не удался',
  },

  grammar: {
    // Время и вежливость
    past: 'прошедшее',
    polite: 'вежливая',

    // Отрицание
    negative: 'отрицательная',
    'negative intent': 'отрицательное намерение',
    without: 'не делая',

    // Условие
    conditional: 'условная',
    whenever: 'всякий раз',

    // Кто делает и можно ли
    passive: 'пассивная',
    'passive or potential': 'пассивная или потенциальная',
    potential: 'потенциальная',
    causative: 'каузативная',

    // Желание
    'want to': 'хотеть',
    'seems to want to': 'видимо, хочет',
    'want someone to': 'хотеть, чтобы другой',

    // Откуда известно и насколько точно
    seems: 'похоже',
    'seems like': 'кажется',
    hearsay: 'говорят',
    apparently: 'по-видимому',
    probably: 'наверное',
    might: 'может быть',

    // Что должно быть
    'ought to': 'следует',
    'supposed to': 'должно быть',
    'intends to': 'собираться',

    // Необходимость и разрешение
    must: 'надо',
    'must not': 'нельзя',
    "don't have to": 'не обязательно',
    may: 'можно',

    // Приказы, просьбы и «давай»
    imperative: 'повелительная',
    volitional: 'волитивная',
    'polite command': 'вежливый приказ',
    please: 'просьба',

    // Связь с продолжением
    'te-form': 'тэ-форма',
    listing: 'перечисление',
    while: 'одновременно',
    because: 'потому что',
    'even though': 'хотя',
    'in order to': 'ради',
    'so that': 'чтобы',

    // Вспомогательные глаголы после тэ-формы
    ongoing: 'длительная',
    'resulting state': 'результат действия',
    'completely, or regrettably': 'до конца или с сожалением',
    'in advance': 'заранее',
    'try doing': 'попробовать',
    'going forward': 'дальше',
    'coming to be': 'постепенно',
    'receive the favour': 'получить одолжение',
    'someone does for me': 'делают для меня',
    'do for someone': 'сделать для другого',

    // Вспомогательные глаголы после основы
    'too much': 'слишком',
    'easy to': 'легко',
    'hard to': 'трудно',
    'start to': 'начать',
    'keep on': 'продолжать',
    finish: 'закончить',
    again: 'заново',
    'each other': 'друг друга',
    completely: 'до конца',
    thoroughly: 'глубоко',
    around: 'повсюду',
    'non-stop': 'без остановки',

    // Формы испанского слова
    or: 'или',
    'first-person': '1-е лицо',
    'second-person': '2-е лицо',
    'third-person': '3-е лицо',
    singular: 'ед. ч.',
    plural: 'мн. ч.',
    masculine: 'м. р.',
    feminine: 'ж. р.',
    present: 'настоящее',
    preterite: 'претерит',
    imperfect: 'имперфект',
    'imperfect-se': 'имперфект (-se)',
    future: 'будущее',
    'conditional-mood': 'условное наклонение',
    indicative: 'изъявительное наклонение',
    subjunctive: 'сослагательное наклонение',
    infinitive: 'инфинитив',
    gerund: 'герундий',
    participle: 'причастие',
    formal: 'вежливое обращение',
    informal: 'неформальное обращение',
    'with-tú': 'с tú',
    'with-vos': 'с vos',
    'vos-form': 'форма vos',
    voseo: 'восео',
    'second-person-semantically': 'в значении «вы»',
    accusative: 'с прямым дополнением',
    dative: 'с косвенным дополнением',
    'object-first-person': 'дополнение 1-го лица',
    'object-second-person': 'дополнение 2-го лица',
    'object-third-person': 'дополнение 3-го лица',
    'object-singular': 'в ед. ч.',
    'object-plural': 'во мн. ч.',
    diminutive: 'уменьшительная форма',
    augmentative: 'увеличительная форма',
    superlative: 'превосходная степень',
    alternative: 'вариант',
    'alt-of': 'другое написание',

    // Корейские окончания
    honorific: 'почтительная',
    'future or guess': 'будущее или предположение',
    'formal polite': 'официально-вежливая',
    question: 'вопросительная',
    but: 'но',
    "let's": 'давай',
    plain: 'простой стиль',
    'shall we, or I wonder': 'приглашение или сомнение',
    'I will': 'обещание',
    'just noticed': 'надо же',
    'as you know': 'ведь',
    and: 'и',
    'because, or and then': 'потому что, или затем',
    'but, or given that': 'но, или раз уж',
    'even if': 'даже если',
    whether: 'ли',
    'adverb form': 'наречная форма',
    quoting: 'косвенная речь',
    'used to': 'бывало',
    topic: 'тема',
    subject: 'подлежащее',
    object: 'дополнение',
    possessive: 'принадлежность',
    'come to': 'в итоге',
    when: 'когда',
    modifier: 'определительная форма',
    'noun form': 'именная форма',
    becomes: 'становиться',
    'have done before': 'доводилось',
  },
};
