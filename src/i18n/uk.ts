import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

const plural = new Intl.PluralRules('uk');

/** The form a count takes: 1 картка, 2 картки, 5 карток. A fraction takes the second: 1,5 картки. */
const form = (n: number, one: string, few: string, many: string): string => {
  const rule = plural.select(n);
  return rule === 'one' ? one : rule === 'many' ? many : few;
};

/** "1 картка", "2 картки", "5 карток". */
const cards = (n: number): string => `${n} ${form(n, 'картка', 'картки', 'карток')}`;

/** The same, as the object of a verb: "додано 1 картку". */
const cardsObject = (n: number): string => `${n} ${form(n, 'картку', 'картки', 'карток')}`;

/** "1 слово", "2 слова", "5 слів". */
const words = (n: number): string => `${n} ${form(n, 'слово', 'слова', 'слів')}`;

/** A share, as Ukrainian writes it: the % straight after the number. */
const percent = (n: number): string => `${n}%`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'вимк.', unknown: 'нові слова', always: 'усі' };

/** What a card went in without, after "без": "без аудіо речення". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'аудіо речення (натисніть значок Libregaku, щоб записувати тут)'
      : 'аудіо речення'))
    .join(' та ');

/** Media Libregaku attaches only when it fetched them itself, each with the words that agree with it. */
const MEDIA_FETCHED = {
  audio: 'аудіо, яке сам завантажив',
  video: 'відео, яке сам завантажив',
  picture: 'зображення, які сам завантажив',
} as const;

/** The same media, with the "in" that suits each: "В аудіо", "У відео". */
const MEDIA_IN = { audio: 'В аудіо', video: 'У відео', picture: 'У зображенні' } as const;

/** The interface in Ukrainian. Anything left out shows in English. */
export const uk: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Фурігана: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Піньїнь: ${RUBY[mode]}`,
    mandarin: 'Китайська (путунхуа)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Мови
    languagesHeading: 'Мови',
    languagesAbout: 'Виберіть мову, яку вивчаєте, і свою мову.',
    target: 'Я вивчаю',
    targetLimited: (language: string): string => `${language} — обмежено`,
    supportFull: 'Повна підтримка, зокрема читання та фурігана.',
    supportPinyin: 'Повна підтримка, зокрема піньїнь. Визначення англійською.',
    supportJyutping: 'Повна підтримка, зокрема Jyutping. Визначення англійською.',
    supportWords: 'Повна підтримка. Визначення англійською.',
    script: 'Письмо',
    scriptHint: 'Використовується, коли у відео є обидва варіанти.',
    supportBasic: 'Базова підтримка: текст ділиться на слова, але словника й читань поки немає.',
    native: 'Ваша мова',
    nativeHint: 'Переклади й визначення показуються цією мовою, якщо вона є у відео та в словнику.',
    definitions: 'Мова визначень',
    definitionsHint: 'У словнику немає визначень вашою мовою, тому вони показуються цією.',
    definitionsHintFor: (language: string): string =>
      `У словнику немає визначень вашою мовою (${language}), тому вони показуються цією.`,

    // Пошук у словнику
    lookupHeading: 'Пошук у словнику',
    lookupAbout: 'Виберіть, як і коли відкривається словник.',
    interaction: 'Спосіб пошуку',
    interactionHover: 'Наведення',
    interactionShift: 'Наведення з Shift',
    interactionClick: 'Натискання',
    interactionHint: 'Натискання на слово теж завжди працює.',
    hoverPause: 'Пауза під час пошуку',
    hoverPauseHint: 'Ставить відео на паузу, поки вказівник на слові.',
    sidebarHover: 'Короткі визначення в транскрипції',
    sidebarHoverHint: 'Показує коротке визначення, коли ви наводите вказівник на слово в транскрипції.',

    // Спливаюче вікно
    popupHeading: 'Спливаюче вікно',
    popupAbout: 'Виберіть, що показувати в спливаючому вікні слова.',
    cardMarks: 'Кнопки «Відомо» та «Ігнорувати»',
    cardMarksHint:
      '«Відомо» прибирає підкреслення слова, «Ігнорувати» прибирає його з підрахунків. Жодна з них не додає картку.',
    cardTrack: 'Кнопка «Відстежувати»',
    cardTrackHint: 'Підкреслює фіолетовим слова, які ви хочете помічати. Картку не додає.',
    cardDeckMenu: 'Меню колод',
    cardDeckMenuHint: 'Додає ▾ поруч із «Додати в Anki», щоб вибрати іншу колоду. Нові картки потраплятимуть туди.',
    cardHideAdd: 'Сховати «Додати в Anki»',
    cardHideAddHint: 'Прибирає з картки кнопку «Додати в Anki» і меню колод поруч із нею.',
    cardAddLine: 'Картки речень',
    cardAddLineHint: 'Додає кнопку, яка створює картку з цілого речення — з його аудіо та знімком екрана.',
    cardKanji: 'Розбір кандзі',
    cardKanjiHint: 'Показує значення й читання кожного кандзі.',
    cardHanzi: 'Розбір ієрогліфів',
    cardHanziHint: 'Показує значення й читання кожного ієрогліфа.',
    lookupElsewhere: 'Приклади з цього відео',
    lookupElsewhereHint: 'Показує інші речення з цього відео з цим словом. Натисніть будь-яке, щоб відтворити його.',

    // Субтитри
    subtitlesHeading: 'Субтитри',
    subtitlesAbout: 'Налаштуйте вигляд субтитрів на відео.',
    ruby: 'Фурігана',
    rubyUnknown: 'Нові слова',
    rubyAlways: 'Усі',
    rubyNever: 'Вимк.',
    rubyHint: 'Читання над кандзі. Натисніть R, щоб перемикати під час перегляду.',
    pinyin: 'Піньїнь',
    pinyinHint: 'Читання над ієрогліфами. Натисніть R, щоб перемикати під час перегляду.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Читання над ієрогліфами. Натисніть R, щоб перемикати під час перегляду.',
    blurPrimary: 'Розмивати субтитри',
    blurPrimaryHint:
      'Для тренування сприйняття на слух: субтитри розмиті, доки ви не наведете на них вказівник. Натисніть H, щоб перемкнути.',
    subtitleSize: 'Розмір тексту',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Масштабується разом із плеєром, тож у повноекранному режимі виглядає так само.',
    subtitleBottom: 'Положення',
    subtitleBottomLowest: 'Найнижче',
    subtitleBottomLow: 'Низьке',
    subtitleBottomNormal: 'Звичайне',
    subtitleBottomRaised: 'Підняте',
    subtitleBottomHigh: 'Високе',
    subtitleBottomHighest: 'Найвище',
    subtitleBottomHint: 'Висота субтитрів. Субтитри іншого розширення в тому самому плеєрі залишаються під ними.',
    dualSubtitles: 'Показувати переклад',
    dualSubtitlesHint:
      'Показує субтитри вашою мовою під субтитрами мовою, яку ви вивчаєте. Вони беруться із сайту, а не з машинного ' +
      'перекладу, і для них потрібна повна транскрипція відео.',
    singleKeys: 'Гарячі клавіші без Alt і Shift',
    singleKeysHint:
      'Буквені клавіші, як-от A і R, працюють самі по собі під час перегляду. ' +
      'Якщо вимкнено, утримуйте з ними Alt і Shift. Клавіші зі стрілками працюють у будь-якому разі.',

    // Підкреслення
    underlinesHeading: 'Підкреслення',
    underlinesAbout: 'Колір показує, наскільки добре ви знаєте слово. Натисніть на колір, щоб змінити його.',
    colorUnknown: 'Нові слова',
    colorUnknownHint: 'Слова без картки в Anki.',
    colorLearning: 'Вивчаються',
    colorLearningHint: 'Слова з карткою, яка ще не зріла.',
    colorTracking: 'Відстежувані',
    colorTrackingHint: 'Слова, які ви відстежуєте.',
    colorKnown: 'Відомі',
    colorKnownHint: 'Слова зі зрілою карткою або позначені як відомі.',
    underlines: 'Підкреслювати слова',
    underlinesHint: 'Вимкніть, щоб субтитри були звичайними, без кольору під словами.',
    markKnown: 'Підкреслювати відомі слова',
    markKnownHint: 'За замовчуванням вимкнено: що більше ви знаєте, то спокійніший екран.',
    defaultColours: 'Кольори за замовчуванням',
    resetColours: 'Скинути',

    // Транскрипція
    transcriptHeading: 'Транскрипція',
    transcriptAbout: 'Панель поруч із відео, де зібрано всі рядки субтитрів.',
    sidebarFollow: 'Прокручувати разом із відео',
    sidebarFollowHint:
      'Тримає поточний рядок на виду. Якщо прокрутити список вручну, автопрокручування призупиниться; кнопка відновить його.',
    headerBar: 'Показувати верхню панель',
    headerBarHint: 'З’являється вгорі відео, коли вказівник поруч.',
    languageBadge: 'Значок мови',
    languageBadgeFlag: 'Прапор',
    languageBadgeCode: 'Код',
    badgeFlag: 'Прапор на значку',
    badgeFlagDefault: 'За замовчуванням',
    flagSearch: 'Пошук…',
    flagSearchLabel: 'Пошук країни',
    flagSuggested: 'Рекомендовані',
    flagAll: 'Усі країни',
    flagNone: (query: string): string => `Немає країн за запитом «${query}».`,
    badgeFlagHint: 'Прапор, який показується для мови, яку ви вивчаєте. Для кожної мови зберігається свій.',
    languageBadgeHint: 'Як верхня панель показує мову, яку ви вивчаєте.',
    sidebarStats: 'Рахувати нові слова',
    sidebarStatsHint: 'Показує кількість нових слів у кожному рядку, ваш відсоток відомих слів і фільтри на їхній основі.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Підключіть Anki й виберіть, куди потрапляють нові картки та за якими колодами визначати відомі слова.',
    deck: 'Колода для нових карток',
    deckHint: 'Колода, до якої додається кожна нова картка.',
    statusScope: 'Джерело відомих слів',
    statusScopeHint: 'Картки в цих колодах визначають, які слова підкреслено. Разом із підколодами.',
    marksInAnki: 'Зберігати позначки в Anki',
    marksInAnkiHint:
      'Зберігає «Відомо», «Відстежувати» та «Ігнорувати» як приховані нотатки в Anki (Libregaku::Marks), щоб вони ' +
      'синхронізувалися з іншими пристроями. Якщо вимкнено, вони залишаються в цьому браузері.',

    // Меню колод
    wholeCollection: 'Уся колекція',
    chooseDeck: 'Виберіть колоду…',
    deckNotInAnki: (deck: string): string => `${deck} — немає в Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (з підколодами)`,
    deckUnset: 'Виберіть колоду. Доки ви цього не зробите, картки не можна додавати.',
    deckMissing: (deck: string): string => `В Anki більше немає колоди «${deck}». Виберіть іншу.`,
    statusScopeMissing: (deck: string): string =>
      `В Anki більше немає колоди «${deck}», тому всі слова показано як нові. Виберіть іншу.`,
    statusScopeOutside: (deck: string): string =>
      `Нові картки потрапляють до «${deck}», а ця колода сюди не входить, тож додані слова залишаться підкресленими ` +
      'як нові. Виберіть колоду, яка її містить, або «Уся колекція».',

    // Стан Anki
    ankiChecking: 'Перевірка…',
    ankiConnected: 'Підключено.',
    noteTypeInstalled: 'Тип нотатки встановлено.',
    cardsMade: (n: number): string => `За допомогою Libregaku створено ${cardsObject(n)}.`,
    noCards: 'Карток поки немає.',
    cardsFlushed: (n: number): string =>
      `Додано ${cardsObject(n)}, ${form(n, 'створену', 'створені', 'створених')}, поки Anki був закритий.`,
    cardsNotFlushed: (n: number, error: string): string => `Не вдалося додати ${cardsObject(n)}: ${error}`,
    cardsWaiting: (n: number): string => `${cards(n)} ${form(n, 'чекає', 'чекають', 'чекають')} на додавання.`,
    ankiOffline: (port: number): string =>
      `Anki не відповідає на порту ${port}. Це нормально, поки він закритий: ` +
      'нові картки чекають тут і будуть додані, коли він відкриється.',
    ankiBlocked: 'Anki запущено, але AnkiConnect поки не дозволяє доступ цьому розширенню.',
    ankiOccupied: (detail: string): string => `${detail} Закрийте програму, яка займає порт, щоб його міг використовувати Anki.`,

    // Кнопки Anki
    checkAgain: 'Перевірити знову',
    newDeck: 'Нова колода',
    openCards: 'Відкрити картки в Anki',
    openMarks: 'Відкрити позначки в Anki',
    newDeckPrompt: 'Введіть назву нової колоди. Для підколоди використовуйте ::, наприклад Японська::Netflix',

    // Підключення Anki
    installStep: 'Установіть Anki на цей комп’ютер і відкрийте його. {link}',
    getAnki: 'Завантажити Anki',
    addonStep: 'В Anki відкрийте {menu}, вставте цей код і перезапустіть Anki.',
    addonMenu: 'Інструменти → Доповнення → Отримання доповнення…',
    aboutAnkiConnect: 'Про AnkiConnect',
    originStep: 'В Anki відкрийте {menu}, додайте цей рядок до {setting} і перезапустіть Anki.',
    originMenu: 'Інструменти → Доповнення → AnkiConnect → Налашт.',
    runningStep: 'Не закривайте Anki під час перегляду. Картки потрапляють просто в Anki на цьому комп’ютері.',
    copy: 'Копіювати',
    copyValue: (value: string): string => `Копіювати ${value}`,
    copied: 'Скопійовано',
    copyFailed: 'Виділіть',

    // Картки Anki
    ankiCardsHeading: 'Картки Anki',
    ankiCardsAbout: 'Виберіть, що додавати до кожної нової картки, крім слова, читання, значення та речення.',
    cardAudio: 'Аудіо слова',
    cardAudioHint: 'Запис вимови слова, якщо він є. Ніколи не синтезований голос.',
    cardSentenceAudio: 'Аудіо речення',
    cardSentenceAudioHint: 'Записує речення, відтворюючи його ще раз. На захищених сайтах для цього потрібен дозвіл нижче.',
    cardScreenshot: 'Знімок екрана',
    cardScreenshotHint: 'Кадр зі сцени. Недоступно на захищених сайтах, бо вони це блокують.',
    capture: 'Аудіо речення на захищених сайтах',
    captureAllow: 'Дозволити',
    captureAllowInSettings: 'Дозволити в налаштуваннях',
    captureRemove: 'Відкликати',
    captureAllowed:
      'Дозволено. На кожній вкладці із захищеним сайтом натисніть значок Libregaku й виберіть «Записувати аудіо речення тут».',
    captureNeeded: 'Захищені сайти шифрують своє відео, тому аудіо речення записується з вкладки. Для цього потрібен ваш дозвіл.',

    // Дані та ліцензії
    creditsHeading: 'Дані та ліцензії',
    creditJmdict:
      'Дані словника й кандзі © Electronic Dictionary Research and Development Group, за ліцензією CC BY-SA 4.0. ' +
      'Переупаковано в JSON проєктом jmdict-simplified.',
    creditLindera:
      'Ділить японський, корейський і китайський текст на слова. Ліцензія MIT; IPADIC, mecab-ko-dic і CC-CEDICT ' +
      'мають власні умови.',
    creditCedict: 'Китайський словник © MDBG та учасники проєкту, за ліцензією CC BY-SA 4.0.',
    creditWiktionary:
      'Корейський та іспанський словники, а також деякі вашою мовою, з Wiktionary через kaikki.org і ' +
      'wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Корейські слова з поясненнями вашою мовою. © National Institute of Korean Language, за ліцензією ' +
      'CC BY-SA 2.0 KR. Автор файлів — Lyroxide.',
    creditCfdict: 'Китайська з поясненнями французькою. CFDICT © chine.in, оновлюється проєктом CxDICT. CC BY-SA 4.0.',
    creditCanto: 'Кантонський словник і читання Jyutping для CC-CEDICT. © Pleco Inc., за ліцензією CC BY-SA 3.0.',
    creditHandedict: 'Китайська з поясненнями німецькою. © HanDeDict та учасники проєкту, за ліцензією CC BY-SA 3.0.',
    creditUnihan: 'Яке читання китайського ієрогліфа показувати першим. © Unicode, Inc., за ліцензією Unicode License.',
    creditJotoba: 'Використовуються для пошуку, поки завантажується словник. Обидва засновані на JMdict.',
    creditLucide: 'Значки. Ліцензія ISC.',
    creditCommons: 'Записи іспанських, китайських і корейських слів, начитані волонтерами. Кожен має власну ліцензію, найчастіше CC BY-SA 4.0; її вказано разом з іменем диктора під час відтворення та на картці.',
    creditAudioCmn: 'Записи китайських слів: Yue Tan, Канський університет. CC BY-SA 3.0 US.',
    creditNaver: 'Записи корейських слів зі словника Naver, які звучать лише в картці пошуку. Ліцензія не дозволяє їх повторне використання, тому на картку вони не потрапляють.',
    creditSpanishdict: 'Згенерований голос для іспанських слів із SpanishDict, звучить за кнопкою вимови, коли запису немає. Ліцензія не дозволяє повторне використання, тому на картку він не потрапляє.',
    licence: 'Libregaku поширюється за ліцензією MIT. Дані словників завантажуються з джерел, а не входять до розширення.',
    built: (when: string): string => `Цю копію зібрано ${when}.`,

    // Комбінації клавіш
    keyLine: 'Попередній або наступний рядок',
    keyReplay: 'Повторити рядок',
    keyTranslation: 'Показати або сховати переклад',
    keyShiftLookup: 'Утримуйте, щоб знайти слово під вказівником',
    keyAdd: 'Додати в Anki слово зі спливаючого вікна',
    keyKnown: 'Позначити слово зі спливаючого вікна як відоме',
    keyFurigana: 'Перемкнути фурігану: вимк., нові слова, усі',
    keyPinyin: 'Перемкнути піньїнь: вимк., нові слова, усі',
    keyJyutping: 'Перемкнути Jyutping: вимк., нові слова, усі',
    keyBlur: 'Розмити субтитри або прибрати розмиття',
    keySave: 'Зберегти поточний рядок',
    keyTranscript: 'Показати або сховати панель транскрипції',
    keyClose: 'Закрити спливаюче вікно',
  },

  options: {
    pageTitle: 'Налаштування Libregaku',
    help: 'Довідка',
    searchSettings: 'Пошук…',
    noSettingsFound: 'За запитом «{q}» нічого не знайдено.',
    contentsLabel: 'Розділи налаштувань',
    settingsLabel: 'Налаштування',
    setupHeading: 'Початок роботи',
    setupAbout: 'Потрібно вибрати дві речі, для решти вже є розумні значення за замовчуванням.',
    stepLanguages: 'Виберіть мову, яку вивчаєте',
    stepAnki: 'Підключіть Anki й виберіть колоду для нових карток',
    ankiOptional:
      'Anki не обов’язковий: субтитри, словник і фурігана працюють і без нього. ' +
      'Але саме Anki пам’ятає, які слова ви вже знаєте.',
    nextSteps:
      'Потім відкрийте відео із субтитрами мовою, яку вивчаєте, і наведіть вказівник на слово. ' +
      'Кнопка з клавіатурою на панелі транскрипції покаже комбінації клавіш.',
    stepDone: 'Виконано',
    confirmLanguages: 'Мови вибрано правильно',
    keepDeck: (deck: string): string => `Використовувати ${deck} для нових карток`,
  },

  action: {
    help: 'Довідка',
    settings: 'Налаштування',
    settingsTip: 'Усі налаштування',
    checkingPage: 'Перевірка сторінки…',
    notActive:
      'На цій сторінці не працює. Відкрийте відео на YouTube, Netflix, Disney+, Prime Video або Max. Якщо ви щойно встановили чи ' +
      'перезавантажили Libregaku, оновіть вкладку.',
    unsupported: 'Libregaku працює на YouTube, Netflix, Disney+, Prime Video і Max.',
    waitingForSubtitles: (site: string): string => `Чекаємо на субтитри на ${site}. Переконайтеся, що їх увімкнено.`,
    activeOn: (title: string): string => `Працює — ${title}`,
    active: 'Працює на цьому відео.',
    subtitlesTrack: 'Субтитри',
    translationTrack: 'Переклад',
    noTranslation: 'Немає',
    generatedTrack: (track: string): string => `${track} (автоматично)`,
    captureNeedsPermission: 'Щоб записувати тут аудіо речення, потрібен дозвіл на захоплення звуку цієї вкладки.',
    captureAllowInSettings: 'Дозволити в налаштуваннях',
    captureReady: 'Звук із захищених сайтів можна записувати лише після того, як ви ввімкнете запис для цієї вкладки.',
    captureStart: 'Записувати аудіо речення тут',
    captureFailed: 'Chrome не вдалося записати цю вкладку.',
    toggleSidebar: 'Бічна панель',
    ankiChecking: 'Anki: перевірка…',
    ankiConnected: (n: number): string => `Anki підключено · ${cards(n)} з Libregaku`,
    ankiOffline: 'Anki не запущено — слова показано як нові',
    ankiOccupied: (port: number): string => `Порт ${port} зайнятий іншою програмою, тому підключитися до Anki не можна`,
    ankiBlocked: 'Anki відхилив це розширення — у налаштуваннях є рядок, який треба додати',
    ankiBusy: 'Anki не відповів — можливо, триває синхронізація',
    ankiRefused: 'Anki відхилив запит',
    cardsToAdd: (n: number): string => `залишилося додати ${cardsObject(n)}`,
    cardsWaiting: (n: number): string => `${cards(n)} ${form(n, 'чекає', 'чекають', 'чекають')} на Anki`,
  },

  sidebar: {
    panelLabel: 'Панель транскрипції',
    resizeLabel: 'Змінити розмір панелі',

    // Вкладки й кнопки поруч із ними
    tabsLabel: 'Списки',
    transcriptTab: 'Транскрипція',
    savedTab: 'Збережені',
    settings: 'Налаштування',
    shortcuts: 'Комбінації клавіш',
    close: 'Закрити',
    closeLabel: 'Закрити панель',
    openTip: 'Транскрипція',
    openLabel: 'Показати транскрипцію',
    help: 'Довідка',

    // Пошук у транскрипції
    searchPlaceholder: 'Пошук у транскрипції…',
    searchLabel: 'Пошук у транскрипції',
    noMatches: 'Немає збігів',
    matchAt: (at: number, total: number): string => `${at} з ${total}`,
    matchesFound: (n: number): string => `Знайдено: ${n}`,

    // Фільтр
    filterTip: 'Фільтр',
    filterLabel: 'Фільтр рядків',
    filterAll: 'Усі рядки',
    filterAllAbout: 'Усі рядки без фільтра',
    filterNew: 'З новими словами',
    filterNewAbout: 'Рядки зі словом, для якого у вас немає картки',
    filterReady: 'Готові до вивчення',
    filterReadyAbout: 'Рядки, де нове для вас лише одне слово, — з них найлегше вчитися',
    filterSaved: 'Збережені',
    filterSavedAbout: 'Рядки, які ви зберегли на потім',

    // Транскрипція
    partial: 'Транскрипція поповнюється під час перегляду: цей плеєр віддає лише поточний рядок.',
    partialEmpty: 'Поки порожньо. Рядки з’являтимуться тут, щойно прозвучать.',
    empty: 'Транскрипцію не завантажено.',
    currentLine: 'Поточний рядок',
    lineNew: (n: number): string => `${n} ${form(n, 'нове', 'нові', 'нових')}`,
    playFrom: (time: string): string => `Відтворити з ${time}`,
    saveLine: 'Зберегти рядок',
    unsave: 'Прибрати зі збережених',
    addSentence: 'Додати речення',
    addSentenceLabel: 'Додати речення в Anki',

    // Підсумок над транскрипцією: назва й число, яке пасує до будь-якої кількості
    knownPercent: (n: number): string => percent(n),
    summaryKnown: 'Відомо: {n}',
    summaryNew: 'Нових: {n}',
    summaryReady: 'Готово до вивчення: {n}',
    counting: (n: number): string => `Підрахунок нових слів… ${percent(n)}`,
    countFailed: 'Деякі рядки не вдалося підрахувати, тому підсумків немає.',

    // Коротке визначення
    dictionaryLoading: (n: number): string => `Завантаження словника — ${percent(n)}`,
    dictionaryUnavailable: 'Словник недоступний',
    noEntry: 'Немає в словнику.',

    // Збережені
    savedEmpty:
      'Поки нічого не збережено. Натисніть закладку біля будь-якого рядка транскрипції або клавішу B, щоб зберегти ' +
      'речення, до якого хочете повернутися.',
    thisVideo: 'це відео',
    openAt: (time: string): string => `Відкрити відео на ${time}`,
    remove: 'Прибрати',
    removeLabel: 'Прибрати зі збережених',
    copySavedAbout: 'Скопіювати всі збережені рядки як текст, розділений табуляцією',
    exportSavedAbout: 'Зберегти файл, розділений табуляцією, який можна імпортувати в Anki',
    addSavedAbout: 'Створити картку з кожного збереженого рядка',
    linesCopied: (n: number): string => `Скопійовано ${n} ${form(n, 'рядок', 'рядки', 'рядків')}.`,
    chooseDeck: 'Спершу виберіть колоду в налаштуваннях: туди потрапляють нові картки.',
    checkingAnki: 'Перевірка Anki…',
    ankiOffline: 'Anki не запущено. Відкрийте його й спробуйте ще раз — інструкція є в налаштуваннях.',
    ankiBlocked: 'AnkiConnect поки не дозволяє доступ цьому розширенню. У налаштуваннях є рядок, який треба додати.',
    ankiUnreachable: 'Не вдалося підключитися до Anki. Причину вказано в налаштуваннях.',
    adding: (at: number, total: number): string => `Додавання: ${at} з ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `До ${deck} додано ${cardsObject(added)}` +
      `${already ? `; ${already} вже ${form(already, 'була', 'були', 'були')} там` : ''}.`,

    // Кнопки й повідомлення вкладок «Збережені» та «Слова»
    copy: 'Копіювати',
    exportFile: 'Експортувати',
    addToAnki: 'Додати в Anki',
    noClipboard: 'Немає доступу до буфера обміну.',
    downloaded: 'Збережено в папці завантажень. В Anki: Файл → Імпортувати.',
    downloadBlocked: 'Сторінка заблокувала завантаження — скористайтеся кнопкою «Копіювати».',

    // Слова
    listsLabel: 'Який список',
    listLines: 'Рядки',
    listTracked: 'Відстежувані',
    listKnown: 'Відомі',
    listIgnored: 'Ігноровані',
    findPlaceholder: 'Пошук…',
    findLabel: 'Пошук у цьому списку',
    copyWordsAbout: 'Скопіювати цей список як текст, розділений табуляцією',
    exportWordsAbout: 'Зберегти цей список у файл, розділений табуляцією, який можна імпортувати в Anki',
    wordsCopied: (n: number): string => `Скопійовано ${words(n)}.`,
    nothingToExport: 'У цьому списку немає чого експортувати.',
    lookingUp: 'Шукаємо читання й значення…',
    noWordMatches: (query: string): string => `У цьому списку немає слів за запитом «${query}».`,
    noLineMatches: (query: string): string => `Немає збережених рядків за запитом «${query}».`,
    wordsMatching: (shown: number, total: number): string =>
      `${shown} з ${total} ${form(total, 'слова', 'слів', 'слів')}.`,
    trackedEmpty:
      'Поки нічого не відстежується. «Відстежувати» підкреслює слово, щоб ви його помічали, без створення картки. ' +
      'Увімкніть цю кнопку в налаштуваннях, у розділі «Спливаюче вікно».',
    trackedIntro: (n: number): string =>
      n === 1
        ? `Ви відстежуєте ${words(n)}. Воно підкреслюється скрізь, де трапляється.`
        : `Ви відстежуєте ${words(n)}. Вони підкреслюються скрізь, де трапляються.`,
    stopTracking: 'Не відстежувати',
    knownEmpty:
      'Немає слів, позначених як відомі. Якщо ви знаєте слово й не хочете картку, позначте його як відоме ' +
      'в спливаючому вікні або натисніть K.',
    knownIntro: (n: number): string =>
      `${words(n)} позначено як ${form(n, 'відоме', 'відомі', 'відомі')}. ` +
      'Якщо зняти позначку, статус слова знову залежатиме від ваших карток Anki.',
    unmarkKnown: 'Прибрати з відомих',
    ignoredEmpty:
      'Немає ігнорованих слів. Ігноруйте імена та звуки в їхньому спливаючому вікні — тоді вони ніколи не ' +
      'підкреслюватимуться й не враховуватимуться.',
    ignoredIntro: (n: number): string =>
      `${words(n)} ${form(n, 'ніколи не підкреслюється й не враховується', 'ніколи не підкреслюються й не враховуються',
        'ніколи не підкреслюються й не враховуються')}.`,
    stopIgnoring: 'Не ігнорувати',
  },

  popup: {
    // Вікно і слово
    cardLabel: (word: string): string => `${word} — словник`,
    commonBadge: 'часте',
    characterNames: { kanji: 'Кандзі', hanzi: 'Ієрогліфи' },
    partOfSpeech: {
      n: 'іменник', 'n-adv': 'прислівниковий іменник', 'n-t': 'іменник часу', 'n-suf': 'іменний суфікс',
      'n-pref': 'іменний префікс', pn: 'займенник', 'adj-i': 'і-прикметник', 'adj-na': 'на-прикметник',
      'adj-no': 'но-прикметник', 'adj-pn': 'атрибутив', adv: 'прислівник', 'adv-to': 'прислівник',
      aux: 'допоміжне слово', 'aux-v': 'допоміжне дієслово', 'aux-adj': 'допоміжний прикметник',
      conj: 'сполучник', cop: 'зв’язка', ctr: 'лічильний суфікс', exp: 'вираз', int: 'вигук',
      num: 'числівник', prt: 'частка', pref: 'префікс', suf: 'суфікс', unc: 'без категорії',
      vs: 'суру-дієслово', 'vs-i': 'суру-дієслово', 'vs-s': 'суру-дієслово', vt: 'перехідне', vi: 'неперехідне',
      v1: 'ітідан-дієслово', 'v1-s': 'ітідан-дієслово', vk: 'куру-дієслово', vz: 'дзуру-дієслово',
      v5b: 'ґодан-дієслово', v5g: 'ґодан-дієслово', v5k: 'ґодан-дієслово', 'v5k-s': 'ґодан-дієслово',
      v5m: 'ґодан-дієслово', v5n: 'ґодан-дієслово', v5r: 'ґодан-дієслово', 'v5r-i': 'ґодан-дієслово',
      v5s: 'ґодан-дієслово', v5t: 'ґодан-дієслово', v5u: 'ґодан-дієслово', 'v5u-s': 'ґодан-дієслово',
      v5aru: 'ґодан-дієслово',
      // Коди Wiktionary, для корейських та іспанських слів.
      name: 'власна назва', v: 'дієслово', adj: 'прикметник', pron: 'займенник', det: 'детермінатив',
      artic: 'артикль', counter: 'лічильне слово', prep: 'прийменник', 'prep-phrase': 'прийменниковий зворот',
      ptcl: 'частка', intj: 'вигук', phrase: 'словосполучення', prov: 'прислів’я', r: 'корінь', char: 'символ',
      adn: 'означальне слово', ptcpl: 'дієприкметник', contr: 'скорочення',
      masc: 'чоловічий рід', fem: 'жіночий рід', neut: 'середній рід', sg: 'однина', pl: 'множина',
      'pl-only': 'лише множина', count: 'злічуваний', uncount: 'незлічуваний', vr: 'зворотне',
      vdt: 'дитранзитивне', impers: 'безособове', irreg: 'неправильне', reltnl: 'відносний', reltv: 'відносний',
      interr: 'питальний', poss: 'присвійний', dim: 'зменшувальний', aug: 'збільшувальний',
      onoma: 'звуконаслідувальний',
      idio: 'ідіоматичне', fig: 'переносне', literal: 'буквальне', col: 'розмовне', inf: 'неформальне',
      fam: 'фамільярне', formal: 'офіційне', polite: 'ввічливе', lit: 'книжне', poet: 'поетичне',
      rhet: 'риторичне', sl: 'сленг', vulg: 'вульгарне', derog: 'зневажливе', offens: 'образливе',
      humor: 'жартівливе', euph: 'евфемізм', child: 'дитяче', net: 'інтернет', neol: 'неологізм', cmn: 'часте',
      uncmmn: 'маловживане', rare: 'рідкісне', dated: 'старомодне', arch: 'архаїчне', obs: 'застаріле',
      hist: 'історичне', 'non-std': 'нестандартне', dialect: 'діалектне', regio: 'регіональне',
    },

    // Кнопки під словом
    pronounce: 'Прослухати',
    playedRecording: (word: string): string => `${word} · запис`,
    playedSynthesised: (word: string): string => `${word} · синтез мовлення`,
    recordingBy: (speaker: string, licence: string): string => `Запис: ${speaker} · ${licence}`,
    pronounceFailed: 'не вдалося відтворити аудіо',
    addSentence: 'Додати речення',
    sentenceAdded: 'Речення додано',
    undo: 'Скасувати',
    copyWord: 'Копіювати слово',
    copyPhrase: 'Копіювати фразу',
    copySentence: 'Копіювати речення',
    wordCopied: 'слово скопійовано',
    phraseCopied: 'фразу скопійовано',
    sentenceCopied: 'речення скопійовано',
    copyFailed: 'не вдалося скопіювати — виділіть текст вручну',

    // Значення
    dictionaryLoading: (n: number): string => `Словник ще завантажується — ${percent(n)}. Спробуйте трохи згодом.`,
    dictionaryUnavailable: (error: string): string => `Словник недоступний: ${error}`,
    noEntry: 'Цього слова немає в словнику.',
    moreMeanings: (n: number): string => `+${n} ${form(n, 'значення', 'значення', 'значень')}`,

    // Інші рядки відео з цим словом
    elsewhereCount: (n: number): string =>
      (n === 1
        ? 'Ще раз у цьому відео'
        : `Ще ${n} ${form(n, 'раз у', 'рази в', 'разів у')} цьому відео`),
    playLine: 'Відтворити',
    elsewhereMore: (n: number): string => `і ще ${n} — пошук у транскрипції знайде всі`,
    showAllInTranscript: 'Показати всі в транскрипції',

    // Додати в Anki
    addToAnki: 'Додати в Anki',
    addToDeck: (deck: string): string => `Додати до ${deck}`,
    adding: 'Додавання…',
    undoing: 'Скасування…',
    added: 'Додано',
    addedUndo: 'Додано — скасувати',
    inAnki: 'В Anki',
    showInAnki: 'Показати в Anki',
    waiting: 'Очікування',
    waitingForAnki: 'Очікування Anki',
    goesInWhenAnkiOpens: 'Картка потрапить в Anki, коли він відкриється',
    alreadyAdded: 'Уже додано',
    alreadyInAnki: 'Уже є в Anki',
    waitingForAnkiToOpen: 'Чекає на запуск Anki',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // Меню колод
    otherDecks: 'Інші колоди',
    addToAnotherDeck: 'Додати до іншої колоди',
    decksUnknown: 'Anki не відповідає, тому список колод поки невідомий.',
    newDeck: 'Нова колода…',
    newDeckPrompt: 'Нова колода — для підколоди використовуйте ::, наприклад Японська::Netflix',

    // Позначки
    knownButton: 'Відомо',
    trackButton: 'Відстежувати',
    ignoreButton: 'Ігнорувати',
    markKnownTip: 'Позначити як відоме',
    trackTip: 'Відстежувати',
    ignoreTip: 'Ігнорувати',
    unmarkKnownTip: 'Прибрати з відомих',
    stopTrackingTip: 'Не відстежувати',
    stopIgnoringTip: 'Не ігнорувати',
  },

  header: {
    knownStat: 'Відомо: {percent}',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Слова, які ви знаєте',
    readyStat: 'Готово до вивчення: {count}',
    readyTip: 'Рядки з одним новим словом',
    blurSubtitle: 'Розмити субтитри',
    unblurSubtitle: 'Прибрати розмиття',
    showTranslation: 'Показати переклад',
    hideTranslation: 'Сховати переклад',
    translation: 'Переклад',
    transcript: 'Транскрипція',
    pinHeader: 'Закріпити панель',
    unpinHeader: 'Відкріпити панель',
    settings: 'Налаштування',
    showHeader: 'Показати панель',
  },

  player: {
    // Клавіші плеєра
    lastLine: 'Це був останній рядок',
    noLineBefore: 'Попереднього рядка немає',
    translationOn: 'Переклад увімкнено',
    translationOff: 'Переклад вимкнено',
    blurOn: 'Субтитри розмито, доки на них не наведено вказівник',
    blurOff: 'Субтитри видно',
    lineSaved: 'Рядок збережено',
    lineUnsaved: 'Рядок прибрано зі збережених',
    lookUpFirst: 'Спершу знайдіть слово в словнику',
    alreadyKnown: (word: string): string => `${word} · уже відоме за Anki`,
    alreadyInAnki: (word: string): string => `${word} · уже є в Anki`,
    adding: (word: string): string => `Додаємо ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Позначки
    markOff: (word: string): string => `${word} · позначку знято`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'позначено як відоме', tracking: 'відстежується', ignored: 'ігнорується', unknown: 'позначено як нове',
      }[status];
      if (refused) return `${word} · ${done}, без картки — Anki відхилив позначку, спробуємо пізніше`;
      return `${word} · ${done}, без картки${status === 'tracking' ? '. Дивіться вкладку «Збережені» на панелі' : ''}`;
    },

    // Картка слова
    pickDeck: 'Спершу виберіть колоду в налаштуваннях Libregaku',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `додано до ${deck} — без ${without(missing)}` : `додано до ${deck}`,
    alreadyIn: (deck: string): string => `уже є в ${deck}`,
    queued: (deck: string): string => `Anki закритий — картка потрапить до ${deck}, коли він відкриється`,
    alreadyQueued: 'уже чекає на Anki',
    notKept: 'Anki закритий, а браузер не зміг зберегти картку на потім',
    takenBack: (deck: string): string => `прибрано з ${deck}`,
    unqueued: 'більше не чекає на Anki',
    alreadySent: 'Картка вже потрапила в Anki',
    queueSent: (count: number): string =>
      `Anki відкрито — ${count === 1
        ? 'додано картку, що чекала на нього'
        : `додано ${cardsObject(count)}, що ${form(count, 'чекала', 'чекали', 'чекали')} на нього`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `відомі слова беруться з ${scope}, тому картки в ${deck} не враховуватимуться`,

    // Картка речення
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `речення додано до ${deck} — без ${without(missing)}` : `речення додано до ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `речення вже є в ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'звуку', picture && 'знімка екрана'].filter(Boolean);
      return `Anki закритий — речення потрапить до ${deck}, коли він відкриється` +
        `${lacking.length ? `, без ${lacking.join(' та ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'речення вже чекає на Anki',
    sentenceTakenBack: (deck: string): string => `речення прибрано з ${deck}`,

    // Аудіо речення
    recording: 'Запис рядка…',

    // Пошук
    noDictionary: 'для цієї мови поки немає словника.',
  },

  notices: {
    // Картка сповіщення
    unexpected: 'У Libregaku виникла непередбачена проблема.',
    dismiss: 'Закрити',

    // YouTube або Netflix щось змінили
    youtubeTrackList: 'Не вдалося прочитати список субтитрів YouTube.',
    youtubeTrackShape: 'Дані субтитрів YouTube мають неочікуваний формат.',
    youtubeCaptionText: 'Не вдалося знайти текст субтитрів YouTube на сторінці.',
    youtubePlayerTrackList: 'Не вдалося отримати список субтитрів цього відео з плеєра YouTube.',
    netflixTrackList: 'Не вдалося прочитати список субтитрів Netflix.',
    netflixCaptionText: 'Не вдалося знайти текст субтитрів Netflix на сторінці.',
    disneyTrackList: 'Не вдалося прочитати список субтитрів Disney+.',
    disneyCaptionText: 'Не вдалося знайти текст субтитрів Disney+ на сторінці.',
    primeTrackList: 'Не вдалося прочитати список субтитрів Prime Video.',
    primeCaptionText: 'Не вдалося знайти текст субтитрів Prime Video на сторінці.',
    maxTrackList: 'Не вдалося прочитати список субтитрів Max.',
    maxCaptionText: 'Не вдалося знайти текст субтитрів Max на сторінці.',
    netflixBlocked: 'Netflix заблокував частину Libregaku, яка читає субтитри.',

    // Субтитри цього відео
    subtitlesOff: 'Увімкніть субтитри в плеєрі, і Libregaku їх підхопить.',
    trackNotSent: 'Плеєр ще не завантажив ці субтитри.',
    noTargetTrack: 'Тут немає субтитрів мовою, яку ви вивчаєте.',
    noSecondTrack: 'Тут немає субтитрів вашою мовою, тому другого рядка не буде.',
    onlyOneTrack: 'Це відео має лише одну доріжку субтитрів, тому другого рядка не буде.',
    autoGenerated: 'Ці субтитри створено автоматично, тому текст і поділ на слова будуть неточними.',
    noSubtitles: 'Це відео не має субтитрів.',
    secondTrackFailed: 'Не вдалося завантажити другий рядок.',

    // Частини розширення
    analyserUnavailable:
      'Читання й словникові форми вимкнено: аналізатор мови не завантажився. Слова зіставляються з картками ' +
      'лише за точним написанням.',
    markNotSaved: 'Не вдалося зберегти позначку. Вона діятиме до перезавантаження сторінки, а потім зникне.',
    marksNotSynced: 'Не вдалося зберегти позначки в Anki. Вони зберігаються в цьому браузері, спробу буде повторено.',
    cardsNotAdded:
      'Anki не прийняв частину карток, збережених, поки він був закритий. Вони й далі зберігаються, спробу буде повторено.',

    // Подробиці
    playerNeverLoaded: 'Плеєр так і не завантажився.',
    subtitlesMaybeOff: 'Можливо, субтитри просто вимкнено в плеєрі.',
    lookedFor: (selector: string): string => `Шукали: ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Субтитри в цьому відео: ${languages.join(', ') || 'немає'}. ` +
      'Змініть мову, яку вивчаєте, у налаштуваннях або виберіть інше відео.',
    onlyPictures: 'У цьому відео вони є лише як зображення, а не текст, тому Libregaku не може їх прочитати.',
    chooseInPlayer: (track: string): string => `Виберіть ${track} у меню субтитрів плеєра, і Libregaku їх підхопить.`,
    noHumanTrack: 'Для цього відео немає доріжки, написаної людиною.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Субтитри в цьому відео: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'аналізатор не завантажився',
  },

  anki: {
    // Підключення до AnkiConnect
    offline: (port: number): string => `На порту ${port} ніхто не відповідає.`,
    timeout: (port: number, seconds: number): string =>
      `Порт ${port} не відповів за ${seconds} с. ` +
      'Можливо, Anki зайнятий (триває синхронізація або відкрито діалогове вікно) чи порт зайняла інша програма.',
    blocked: (origin: string): string =>
      `AnkiConnect відхилив ${origin}. В Anki відкрийте Інструменти → Доповнення → AnkiConnect → Налашт. ` +
      'і додайте цей рядок до webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Щось на порту ${port} відповіло HTTP ${status}. AnkiConnect так не відповідає.`,
    notAnkiConnect: (port: number): string => `Порт ${port} зайнятий чимось іншим, а не AnkiConnect.`,
    noBackground: 'Фонова частина розширення не відповідає.',
    unreachable: 'Anki недоступний.',
    callFailed: 'Помилка виклику AnkiConnect.',

    // Що Libregaku відмовляється надсилати
    notRelayed: (action: string): string => `Libregaku не надсилає «${action}» до AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku прикріплює лише ${MEDIA_FETCHED[media]}.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_IN[media]} цієї нотатки немає даних.`,
    mediaName: (prefix: string): string => `Назви файлів, які додає Libregaku, починаються з ${prefix}…, а в цього — ні.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action}: потрібен список ${ids === 'notes' ? 'нотаток' : 'карток'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Відхилено: ${count} з надісланих ${ids === 'notes' ? 'нотаток' : 'карток'} ` +
      `не ${form(count, 'належить', 'належать', 'належать')} жодній позначці Libregaku. ` +
      (change === 'delete'
        ? 'Libregaku видаляє лише власні позначки, а також картку, яку створив за останні кілька хвилин ' +
          'і яку ще не вивчали.'
        : change === 'suspend'
          ? 'Libregaku призупиняє лише власні позначки.'
          : 'Libregaku змінює мітки лише у власних позначок.'),

    // Типи нотаток Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `У типі нотатки «${noteType}» в Anki немає ${fields.length === 1 ? 'поля' : 'полів'} ${fields.join(', ')}, ` +
      `тому ${loses === 'cards' ? 'картки' : 'нотатки'} втратили б ${fields.length === 1 ? 'його' : 'їх'}. ` +
      'Libregaku не змінює тип нотатки, який ви могли редагувати: ' +
      `в Anki відкрийте Інструменти → Керувати типами нотаток, перейменуйте «${noteType}» (або поверніть поля), ` +
      'потім натисніть «Перевірити знову», і буде встановлено новий.',

    // Позначки й картки, що чекають
    marksNotAdded: (count: number): string =>
      `Anki не додав ${count} ${form(count, 'позначку', 'позначки', 'позначок')}. ` +
      `${count === 1 ? 'Вона залишається' : 'Вони залишаються'} в черзі, спробу буде повторено наступного разу.`,
    marksNotStored: (cause: string): string => `Сховище браузера не прийняло позначки, прочитані з Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Не вдалося прочитати сховище браузера: ${cause}`,
  },

  errors: {
    // Запис звуку вкладки
    captureNotAllowed: 'Спершу дозвольте аудіо речення на цьому сайті в налаштуваннях Libregaku.',
    captureRefused: 'Chrome не дозволив захопити цю вкладку',

    // Доріжка субтитрів, яка не завантажилася
    unknownTrack: (id: string): string => `невідома доріжка ${id}`,
    trackNotSent: 'плеєр її ще не завантажив — виберіть її один раз у меню субтитрів плеєра',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `жоден формат субтитрів не спрацював — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `жодна URL-адреса субтитрів не спрацювала — ${attempts.join('; ') || 'їх немає в списку'}`,
    emptyAnswer: 'порожньо',
    noCues: '0 рядків',
    noCuesParsed: 'після розбору 0 рядків',
    noAnswerWithin: (seconds: number): string => `немає відповіді за ${seconds} с`,

    // Назва доріжки
    forcedTrack: (track: string): string => `${track} (примусові)`,

    // Словник і аналізатор
    noAnswer: 'розширення не відповідає — перезавантажте сторінку, щоб перезапустити його',
    analyserLoading: 'аналізатор ще завантажується',
    dictionaryLoading: 'словник ще завантажується',
    lookupFailed: 'пошук не вдався',
  },

  grammar: {
    // Час і ввічливість
    past: 'минулий час',
    polite: 'ввічлива',

    // Заперечення
    negative: 'заперечна',
    'negative intent': 'заперечний намір',
    without: 'не роблячи',

    // Умова
    conditional: 'умовна',
    whenever: 'щоразу',

    // Хто це робить і чи можна
    passive: 'пасивна',
    'passive or potential': 'пасивна або потенційна',
    potential: 'потенційна',
    causative: 'каузативна',

    // Бажання
    'want to': 'хотіти',
    'seems to want to': 'мабуть, хоче',
    'want someone to': 'хотіти, щоб інший',

    // Звідки це відомо і наскільки точно
    seems: 'схоже',
    'seems like': 'здається',
    hearsay: 'кажуть',
    apparently: 'судячи з усього',
    probably: 'мабуть',
    might: 'можливо',

    // Що має статися
    'ought to': 'слід',
    'supposed to': 'має бути',
    'intends to': 'збиратися',

    // Обов’язок і дозвіл
    must: 'треба',
    'must not': 'не можна',
    "don't have to": 'не обов’язково',
    may: 'можна',

    // Накази, прохання й «давай»
    imperative: 'наказова',
    volitional: 'вольова',
    'polite command': 'ввічливий наказ',
    please: 'прохання',

    // Зв’язок із наступним
    'te-form': 'те-форма',
    listing: 'перелік',
    while: 'одночасно',
    because: 'тому що',
    'even though': 'хоча',
    'in order to': 'заради',
    'so that': 'щоб',

    // Допоміжні дієслова після те-форми
    ongoing: 'тривала',
    'resulting state': 'результат дії',
    'completely, or regrettably': 'до кінця або на жаль',
    'in advance': 'заздалегідь',
    'try doing': 'спробувати',
    'going forward': 'далі',
    'coming to be': 'поступово',
    'receive the favour': 'отримати послугу',
    'someone does for me': 'роблять для мене',
    'do for someone': 'зробити для іншого',

    // Допоміжні дієслова після основи
    'too much': 'занадто',
    'easy to': 'легко',
    'hard to': 'важко',
    'start to': 'почати',
    'keep on': 'продовжувати',
    finish: 'закінчити',
    again: 'наново',
    'each other': 'одне одного',
    completely: 'до кінця',
    thoroughly: 'глибоко',
    around: 'усюди',
    'non-stop': 'без упину',

    // Форми іспанського слова
    or: 'або',
    'first-person': '1-ша особа',
    'second-person': '2-га особа',
    'third-person': '3-тя особа',
    singular: 'однина',
    plural: 'множина',
    masculine: 'чоловічий рід',
    feminine: 'жіночий рід',
    present: 'теперішній час',
    preterite: 'претерит',
    imperfect: 'імперфект',
    'imperfect-se': 'імперфект (-se)',
    future: 'майбутній час',
    'conditional-mood': 'умовний спосіб',
    indicative: 'дійсний спосіб',
    subjunctive: 'суб’юнктив',
    infinitive: 'інфінітив',
    gerund: 'герундій',
    participle: 'дієприкметник',
    formal: 'ввічливе звертання',
    informal: 'неформальне звертання',
    'with-tú': 'з tú',
    'with-vos': 'з vos',
    'vos-form': 'форма vos',
    voseo: 'восео',
    'second-person-semantically': 'у значенні «ви»',
    accusative: 'з прямим додатком',
    dative: 'з непрямим додатком',
    'object-first-person': 'додаток 1-ї особи',
    'object-second-person': 'додаток 2-ї особи',
    'object-third-person': 'додаток 3-ї особи',
    'object-singular': 'в однині',
    'object-plural': 'у множині',
    diminutive: 'зменшувальна форма',
    augmentative: 'збільшувальна форма',
    superlative: 'найвищий ступінь',
    alternative: 'варіант',
    'alt-of': 'інше написання',

    // Корейські закінчення
    honorific: 'шаноблива',
    'future or guess': 'майбутнє або припущення',
    'formal polite': 'офіційно-ввічлива',
    question: 'питальна',
    but: 'але',
    "let's": 'давай',
    plain: 'простий стиль',
    'shall we, or I wonder': 'запрошення або сумнів',
    'I will': 'обіцянка',
    'just noticed': 'оце так',
    'as you know': 'адже',
    and: 'і',
    'because, or and then': 'тому що, або потім',
    'but, or given that': 'але, або раз уже',
    'even if': 'навіть якщо',
    whether: 'чи',
    'adverb form': 'прислівникова форма',
    quoting: 'непряма мова',
    'used to': 'бувало',
    topic: 'тема',
    subject: 'підмет',
    object: 'додаток',
    possessive: 'належність',
    'come to': 'зрештою',
    when: 'коли',
    modifier: 'означальна форма',
    'noun form': 'іменна форма',
    becomes: 'ставати',
    'have done before': 'доводилося',
  },
};
