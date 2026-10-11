import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** Arabic counts in six ways: zero, one, two, few (3–10), many (11–99) and other (100 up). */
const plural = new Intl.PluralRules('ar');

/**
 * A noun in each form a count takes: one and two are words of their own (the
 * dual, as a subject and then as an object), 3 to 10 take the plural, 11 to
 * 99 a singular that a masculine noun writes with ًا, and 100 up the plain
 * singular. Zero counts as 100 does.
 */
type Noun = readonly [one: string, two: string, twoObject: string, few: string, many: string, other: string];

/** "بطاقة واحدة", "بطاقتان", "3 بطاقات", "11 بطاقة". `object` puts the dual in its object form, as after a verb or من. */
const count = (n: number, noun: Noun, object = false): string => {
  const [one, two, twoObject, few, many, other] = noun;
  switch (plural.select(n)) {
    case 'one': return one;
    case 'two': return object ? twoObject : two;
    case 'few': return `${n} ${few}`;
    case 'many': return `${n} ${many}`;
    default: return `${n} ${other}`;
  }
};

const CARD: Noun = ['بطاقة واحدة', 'بطاقتان', 'بطاقتين', 'بطاقات', 'بطاقة', 'بطاقة'];
const WORD: Noun = ['كلمة واحدة', 'كلمتان', 'كلمتين', 'كلمات', 'كلمة', 'كلمة'];
const LINE: Noun = ['سطر واحد', 'سطران', 'سطرين', 'أسطر', 'سطرًا', 'سطر'];
const RESULT: Noun = ['نتيجة واحدة', 'نتيجتان', 'نتيجتين', 'نتائج', 'نتيجة', 'نتيجة'];
const SECOND: Noun = ['ثانية واحدة', 'ثانيتان', 'ثانيتين', 'ثوانٍ', 'ثانية', 'ثانية'];
const MORE_TIMES: Noun = ['مرة أخرى', 'مرتان أخريان', 'مرتين أخريين', 'مرات أخرى', 'مرة أخرى', 'مرة أخرى'];
const MORE_LINES: Noun = ['سطر آخر', 'سطران آخران', 'سطرين آخرين', 'أسطر أخرى', 'سطرًا آخر', 'سطر آخر'];
const MORE_MEANINGS: Noun = ['معنى آخر', 'معنيان آخران', 'معنيين آخرين', 'معانٍ أخرى', 'معنًى آخر', 'معنى آخر'];

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'إيقاف', unknown: 'الكلمات الجديدة', always: 'الكل' };

/** What a card went in without, joined with "ولا": "بدون صوت الجملة". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'صوت الجملة (انقر على رمز Libregaku لتسجيله هنا)'
      : 'صوت الجملة'))
    .join(' ولا ');

const MEDIA_WHAT = { audio: 'الصوت', video: 'الفيديو', picture: 'الصور' } as const;
const MEDIA_EMPTY = {
  audio: 'الصوت المرفق بهذه الملحوظة فارغ.',
  video: 'الفيديو المرفق بهذه الملحوظة فارغ.',
  picture: 'الصورة المرفقة بهذه الملحوظة فارغة.',
} as const;

/** The interface in Arabic. Anything left out shows in English. */
export const ar: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `فوريغانا: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `بينيين: ${RUBY[mode]}`,
    mandarin: 'الصينية (الماندرين)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // اللغات
    languagesHeading: 'اللغات',
    languagesAbout: 'اختر اللغة التي تتعلمها ولغتك.',
    target: 'أتعلّم',
    targetLimited: (language: string): string => `${language} — دعم محدود`,
    supportFull: 'دعم كامل، يشمل القراءات والفوريغانا.',
    supportPinyin: 'دعم كامل، يشمل البينيين. التعريفات بالإنجليزية.',
    supportJyutping: 'دعم كامل، يشمل Jyutping. التعريفات بالإنجليزية.',
    supportWords: 'دعم كامل. التعريفات بالإنجليزية.',
    script: 'الكتابة',
    scriptHint: 'هي المستخدمة عندما يتوفّر الفيديو بالنوعين.',
    supportBasic: 'دعم أساسي: تُقسَّم الكلمات، لكن لا يوجد قاموس ولا قراءات بعد.',
    native: 'لغتك',
    nativeHint: 'تظهر الترجمات والتعريفات بهذه اللغة، حيثما توفّرت في الفيديو والقاموس.',
    definitions: 'لغة التعريفات',
    definitionsHint: 'لا يحتوي القاموس على تعريفات بلغتك، لذا تظهر بهذه اللغة.',
    definitionsHintFor: (language: string): string =>
      `لا يحتوي القاموس على تعريفات باللغة ${language}، لذا تظهر بهذه اللغة.`,

    // البحث عن الكلمات
    lookupHeading: 'البحث عن الكلمات',
    lookupAbout: 'اختر طريقة البحث عن الكلمات وتوقيته.',
    interaction: 'طريقة البحث',
    interactionHover: 'تمرير المؤشر',
    interactionShift: 'تمرير المؤشر مع Shift',
    interactionClick: 'النقر',
    interactionHint: 'النقر على الكلمة يعمل دائمًا أيضًا.',
    hoverPause: 'إيقاف مؤقت أثناء البحث',
    hoverPauseHint: 'يوقف الفيديو مؤقتًا ما دام المؤشر على كلمة.',
    sidebarHover: 'تعريفات سريعة في النص',
    sidebarHoverHint: 'يعرض تعريفًا قصيرًا عند تمرير المؤشر فوق كلمة في النص.',

    // نافذة الكلمة
    popupHeading: 'نافذة الكلمة',
    popupAbout: 'اختر ما تعرضه النافذة عند البحث عن كلمة.',
    cardMarks: 'زرّا «معروفة» و«تجاهل»',
    cardMarksHint: '«معروفة» يُخفي تسطير الكلمة، و«تجاهل» يستبعدها من الإحصاء. ولا يضيف أيٌّ منهما بطاقة.',
    cardTrack: 'زر «تتبّع»',
    cardTrackHint: 'يضع تسطيرًا بنفسجيًا تحت الكلمات التي تريد الانتباه إليها. لا يضيف بطاقة.',
    cardDeckMenu: 'قائمة الرزم',
    cardDeckMenuHint: 'يضيف ▾ بجانب «إضافة إلى Anki» لاختيار رزمة أخرى. تذهب البطاقات الجديدة إليها بعد ذلك.',
    cardAddLine: 'بطاقات الجمل',
    cardAddLineHint: 'يضيف زرًّا يُنشئ بطاقة من الجملة كاملة، مع صوتها ولقطة شاشة.',
    cardKanji: 'تفصيل الكانجي',
    cardKanjiHint: 'يعرض معاني كل كانجي وقراءاته.',
    cardHanzi: 'تفصيل الحروف',
    cardHanziHint: 'يعرض معاني كل حرف وقراءاته.',
    lookupElsewhere: 'أمثلة من هذا الفيديو',
    lookupElsewhereHint: 'يعرض جملًا أخرى في هذا الفيديو تستخدم الكلمة. انقر على إحداها لتشغيلها.',

    // الترجمة
    subtitlesHeading: 'الترجمة',
    subtitlesAbout: 'اضبط شكل الترجمة على الفيديو.',
    ruby: 'فوريغانا',
    rubyUnknown: 'الكلمات الجديدة',
    rubyAlways: 'الكل',
    rubyNever: 'إيقاف',
    rubyHint: 'قراءات فوق الكانجي. اضغط R للتبديل أثناء المشاهدة.',
    pinyin: 'بينيين',
    pinyinHint: 'قراءات فوق الحروف. اضغط R للتبديل أثناء المشاهدة.',
    jyutping: 'Jyutping',
    jyutpingHint: 'قراءات فوق الحروف. اضغط R للتبديل أثناء المشاهدة.',
    blurPrimary: 'تمويه الترجمة',
    blurPrimaryHint: 'للتدرّب على الاستماع: تبقى الترجمة مموّهة حتى تمرّر المؤشر فوقها. اضغط H للتبديل.',
    subtitleSize: 'حجم النص',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: 'يتغيّر مع حجم المشغّل، فيبدو كما هو في وضع ملء الشاشة.',
    subtitleBottom: 'الموضع',
    subtitleBottomLowest: 'الأدنى',
    subtitleBottomLow: 'منخفض',
    subtitleBottomNormal: 'عادي',
    subtitleBottomRaised: 'مرتفع قليلًا',
    subtitleBottomHigh: 'مرتفع',
    subtitleBottomHighest: 'الأعلى',
    subtitleBottomHint: 'مدى ارتفاع الترجمة. أي إضافة ترجمة أخرى على المشغّل نفسه تبقى تحتها.',
    dualSubtitles: 'إظهار الترجمة بلغتك',
    dualSubtitlesHint:
      'يعرض الترجمة بلغتك تحت ترجمة اللغة التي تتعلمها. وهي من الموقع نفسه، لا ترجمة آلية، ' +
      'وتتطلب توفّر نص الفيديو كاملًا.',
    singleKeys: 'اختصارات بمفتاح واحد',
    singleKeysHint:
      'تعمل مفاتيح الحروف مثل A وR وحدها أثناء المشاهدة. إن أوقفته، اضغط مع الاستمرار على Alt وShift معها. ' +
      'أما مفاتيح الأسهم فتعمل في الحالتين.',

    // التسطير
    underlinesHeading: 'التسطير',
    underlinesAbout: 'يدل كل لون على مدى معرفتك بالكلمة. انقر على لون لتغييره.',
    colorUnknown: 'كلمات جديدة',
    colorUnknownHint: 'كلمات ليست لها بطاقة في Anki.',
    colorLearning: 'قيد التعلّم',
    colorLearningHint: 'كلمات لها بطاقة لم تنضج بعد.',
    colorTracking: 'قيد التتبّع',
    colorTrackingHint: 'كلمات تتتبّعها.',
    colorKnown: 'معروفة',
    colorKnownHint: 'كلمات لها بطاقة ناضجة، أو عليها علامة «معروفة».',
    underlines: 'تسطير الكلمات',
    underlinesHint: 'أوقفه لترجمة عادية بلا ألوان تحت الكلمات.',
    markKnown: 'تسطير الكلمات المعروفة',
    markKnownHint: 'متوقف افتراضيًا، فتهدأ الشاشة كلما تعلّمت أكثر.',
    defaultColours: 'الألوان الافتراضية',
    resetColours: 'إعادة الضبط',

    // النص
    transcriptHeading: 'النص',
    transcriptAbout: 'اللوحة بجانب الفيديو التي تعرض كل أسطر الترجمة.',
    sidebarFollow: 'التمرير مع الفيديو',
    sidebarFollowHint: 'يُبقي السطر الحالي ظاهرًا. إذا مرّرت بنفسك يتوقف ذلك، ويستأنفه زر.',
    headerBar: 'إظهار الشريط العلوي',
    headerBarHint: 'يظهر أعلى الفيديو عندما يقترب المؤشر منه.',
    languageBadge: 'شارة اللغة',
    languageBadgeFlag: 'علم',
    languageBadgeCode: 'رمز',
    badgeFlag: 'علم الشارة',
    badgeFlagDefault: 'الافتراضي',
    flagSearch: 'بحث…',
    flagSearchLabel: 'البحث عن بلد',
    flagSuggested: 'مقترحة',
    flagAll: 'كل البلدان',
    flagNone: (query: string): string => `لا يوجد بلد يطابق «${query}».`,
    badgeFlagHint: 'العلم الذي يمثّل اللغة التي تتعلمها. تحتفظ كل لغة بعلمها.',
    languageBadgeHint: 'كيف يعرض الشريط العلوي اللغة التي تتعلمها.',
    sidebarStats: 'عدّ الكلمات الجديدة',
    sidebarStatsHint: 'يعرض عدد الكلمات الجديدة في كل سطر، ونسبة الكلمات التي تعرفها، وعوامل التصفية التي تعتمد عليها.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'اربط Anki، واختر أين تذهب البطاقات الجديدة، وأي الرزم تحدد الكلمات التي تعرفها.',
    deck: 'رزمة البطاقات الجديدة',
    deckHint: 'الرزمة التي تُضاف إليها كل بطاقة جديدة.',
    statusScope: 'مصدر الكلمات المعروفة',
    statusScopeHint: 'تحدد البطاقات في هذه الرزم الكلمات المسطّرة. يشمل الرزم الفرعية.',
    marksInAnki: 'حفظ العلامات في Anki',
    marksInAnkiHint:
      'يحفظ علامات «معروفة» و«تتبّع» و«تجاهل» في Anki على هيئة ملحوظات مخفية (Libregaku::Marks) لتتزامن ' +
      'مع أجهزتك الأخرى. إن أوقفته، تبقى في هذا المتصفح.',

    // قوائم الرزم
    wholeCollection: 'كل المجموعة',
    chooseDeck: 'اختر رزمة…',
    deckNotInAnki: (deck: string): string => `${deck} — غير موجودة في Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (مع الرزم الفرعية)`,
    deckUnset: 'اختر رزمة. لا يمكن إضافة بطاقات قبل ذلك.',
    deckMissing: (deck: string): string => `لم تعد في Anki رزمة باسم «${deck}». اختر غيرها.`,
    statusScopeMissing: (deck: string): string =>
      `لم تعد في Anki رزمة باسم «${deck}»، لذا تظهر كل الكلمات جديدة. اختر غيرها.`,
    statusScopeOutside: (deck: string): string =>
      `تذهب البطاقات الجديدة إلى «${deck}»، وهي غير مشمولة هنا، لذا ستبقى الكلمات التي تضيفها مسطّرة ` +
      'على أنها جديدة. اختر رزمة تحتويها، أو «كل المجموعة».',

    // حالة Anki
    ankiChecking: 'جارٍ التحقق…',
    ankiConnected: 'متصل.',
    noteTypeInstalled: 'تم تثبيت نوع الملحوظة.',
    cardsMade: (n: number): string => `أُنشئت ${count(n, CARD)} باستخدام Libregaku.`,
    noCards: 'لا توجد بطاقات بعد.',
    cardsFlushed: (n: number): string => `أُضيفت ${count(n, CARD)} مما أُنشئ أثناء إغلاق Anki.`,
    cardsNotFlushed: (n: number, error: string): string => `تعذّرت إضافة ${count(n, CARD, true)}: ${error}`,
    cardsWaiting: (n: number): string => `${count(n, CARD)} في انتظار الإضافة.`,
    ankiOffline: (port: number): string =>
      `لا يستجيب Anki على المنفذ ${port}. هذا متوقع أثناء إغلاقه: ` +
      'تنتظر البطاقات الجديدة هنا وتُضاف عند فتحه.',
    ankiBlocked: 'يعمل Anki، لكن AnkiConnect لم يسمح لـ Libregaku بعد.',
    ankiOccupied: (detail: string): string => `${detail} أغلق البرنامج الذي يستخدمه ليتمكن Anki من استخدامه.`,

    // أزرار Anki
    checkAgain: 'إعادة التحقق',
    newDeck: 'رزمة جديدة',
    openCards: 'فتح البطاقات في Anki',
    openMarks: 'فتح العلامات في Anki',
    newDeckPrompt: 'سمِّ الرزمة الجديدة. استخدم :: لرزمة فرعية، مثل ياباني::Netflix',

    // ربط Anki
    installStep: 'ثبّت Anki على هذا الكمبيوتر وافتحه. {link}',
    getAnki: 'تنزيل Anki',
    addonStep: 'في Anki، انتقل إلى {menu}، والصق هذا الرمز، ثم أعد تشغيل Anki.',
    addonMenu: 'أدوات ← إضافات ← تنزيل إضافات…',
    aboutAnkiConnect: 'حول AnkiConnect',
    originStep: 'في Anki، انتقل إلى {menu}، وأضف هذا السطر إلى {setting}، ثم أعد تشغيل Anki.',
    originMenu: 'أدوات ← إضافات ← AnkiConnect ← إعداد',
    runningStep: 'أبقِ Anki مفتوحًا أثناء المشاهدة. تذهب البطاقات مباشرة إلى Anki على هذا الكمبيوتر.',
    copy: 'نسخ',
    copyValue: (value: string): string => `نسخ ${value}`,
    copied: 'تم النسخ',
    copyFailed: 'حدِّده',

    // بطاقات Anki
    ankiCardsHeading: 'بطاقات Anki',
    ankiCardsAbout: 'اختر ما يُضاف إلى كل بطاقة جديدة، إلى جانب الكلمة وقراءتها ومعناها والجملة.',
    cardAudio: 'صوت الكلمة',
    cardAudioHint: 'تسجيل للكلمة إن وُجد. ليس صوتًا اصطناعيًا أبدًا.',
    cardSentenceAudio: 'صوت الجملة',
    cardSentenceAudioHint: 'يسجّل الجملة بتشغيلها مرة أخرى. على Netflix، يتطلب ذلك الإذن أدناه.',
    cardScreenshot: 'لقطة شاشة',
    cardScreenshotHint: 'صورة ثابتة من المشهد. غير متاحة على Netflix لأنه يمنعها.',
    capture: 'صوت الجملة على Netflix',
    captureAllow: 'السماح',
    captureAllowInSettings: 'السماح في الإعدادات',
    captureRemove: 'إزالة',
    captureAllowed: 'تم السماح. في كل علامة تبويب لـ Netflix، انقر على رمز Libregaku واختر «تسجيل صوت الجملة هنا».',
    captureNeeded: 'يحمي Netflix الفيديو، لذا يُسجَّل صوت الجملة من علامة التبويب. ويتطلب ذلك إذنك.',

    // البيانات والتراخيص
    creditsHeading: 'البيانات والتراخيص',
    creditJmdict:
      'بيانات القاموس والكانجي © Electronic Dictionary Research and Development Group، مستخدمة بموجب ترخيص ' +
      'CC BY-SA 4.0. أعاد jmdict-simplified حزمها بتنسيق JSON.',
    creditLindera:
      'يقسّم اليابانية والكورية والصينية إلى كلمات. ترخيص MIT؛ ولكلٍّ من IPADIC وmecab-ko-dic وCC-CEDICT ' +
      'شروطه الخاصة.',
    creditCedict: 'القاموس الصيني © MDBG والمساهمون فيه، مستخدم بموجب ترخيص CC BY-SA 4.0.',
    creditWiktionary:
      'القاموسان الكوري والإسباني، وبعض القواميس بلغتك، من Wiktionary عبر kaikki.org وwiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'كلمات كورية مشروحة بلغتك. © National Institute of Korean Language، مستخدم بموجب ترخيص CC BY-SA 2.0 KR. ' +
      'الملفات من إعداد Lyroxide.',
    creditCfdict: 'الصينية مشروحة بالفرنسية. CFDICT © chine.in، ويُبقيه CxDICT محدّثًا. CC BY-SA 4.0.',
    creditCanto: 'القاموس الكانتوني وقراءات Jyutping لقاموس CC-CEDICT. © Pleco Inc.، مستخدم بموجب ترخيص CC BY-SA 3.0.',
    creditHandedict: 'الصينية مشروحة بالألمانية. © HanDeDict والمساهمون فيه، مستخدم بموجب ترخيص CC BY-SA 3.0.',
    creditUnihan: 'أي قراءة للحرف الصيني تظهر أولًا. © Unicode, Inc.، مستخدم بموجب Unicode License.',
    creditJotoba: 'يُستخدمان للبحث أثناء تنزيل القاموس. كلاهما يعتمد على JMdict.',
    creditLucide: 'الرموز. ترخيص ISC.',
    creditCommons: 'تسجيلات لكلمات إسبانية وصينية وكورية بأصوات متطوعين. لكل تسجيل ترخيصه، وهو CC BY-SA 4.0 في الغالب، ويُذكر مع اسم المتحدث عند تشغيله وعلى البطاقة.',
    creditAudioCmn: 'تسجيلات لكلمات صينية بصوت Yue Tan من جامعة كان. ترخيص CC BY-SA 3.0 US.',
    licence: 'Libregaku مرخّص بموجب MIT. تُنزَّل بيانات القواميس من مصادرها، ولا تأتي مضمّنة فيه.',
    built: (when: string): string => `أُنشئت هذه النسخة في ${when}.`,

    // اختصارات لوحة المفاتيح
    keyLine: 'السطر السابق أو التالي',
    keyReplay: 'إعادة تشغيل السطر',
    keyTranslation: 'إظهار الترجمة بلغتك أو إخفاؤها',
    keyShiftLookup: 'اضغط مع الاستمرار للبحث عن الكلمة تحت المؤشر',
    keyAdd: 'إضافة الكلمة المعروضة في النافذة إلى Anki',
    keyKnown: 'وضع علامة «معروفة» على الكلمة المعروضة في النافذة',
    keyFurigana: 'تبديل الفوريغانا: إيقاف، الكلمات الجديدة، الكل',
    keyPinyin: 'تبديل البينيين: إيقاف، الكلمات الجديدة، الكل',
    keyJyutping: 'تبديل Jyutping: إيقاف، الكلمات الجديدة، الكل',
    keyBlur: 'تمويه الترجمة أو إلغاء تمويهها',
    keySave: 'حفظ السطر الحالي',
    keyTranscript: 'إظهار لوحة النص أو إخفاؤها',
    keyClose: 'إغلاق النافذة',
  },

  options: {
    pageTitle: 'إعدادات Libregaku',
    help: 'مساعدة',
    searchSettings: 'بحث…',
    noSettingsFound: 'لا يوجد هنا ما يذكر «{q}».',
    contentsLabel: 'أقسام الإعدادات',
    settingsLabel: 'الإعدادات',
    setupHeading: 'البدء',
    setupAbout: 'خياران فقط، ولكل ما عداهما قيمة افتراضية مناسبة.',
    stepLanguages: 'اختر ما تتعلمه',
    stepAnki: 'اربط Anki واختر رزمة للبطاقات الجديدة',
    ankiOptional:
      'Anki اختياري: الترجمة والبحث عن الكلمات والفوريغانا تعمل كلها بدونه. ' +
      'لكنه هو ما يتذكّر الكلمات التي تعرفها.',
    nextSteps:
      'ثم افتح فيديو فيه ترجمة باللغة التي تتعلمها، ومرّر المؤشر فوق كلمة. ' +
      'يعرض زر لوحة المفاتيح في لوحة النص اختصارات لوحة المفاتيح.',
    stepDone: 'مكتملة',
    confirmLanguages: 'هذه اللغات صحيحة',
    keepDeck: (deck: string): string => `استخدام «${deck}» للبطاقات الجديدة`,
  },

  action: {
    help: 'مساعدة',
    settings: 'الإعدادات',
    settingsTip: 'كل الإعدادات',
    checkingPage: 'جارٍ التحقق من هذه الصفحة…',
    notActive:
      'غير نشط في هذه الصفحة. افتح فيديو على YouTube أو Netflix أو Disney+ أو Prime Video أو Max. إذا ثبّتَّ Libregaku أو أعدت تحميله للتو، ' +
      'فأعد تحميل علامة التبويب.',
    unsupported: 'يعمل Libregaku على YouTube وNetflix وDisney+ وPrime Video وMax.',
    waitingForSubtitles: (site: string): string => `في انتظار الترجمة على ${site}. تأكّد من تفعيلها.`,
    activeOn: (title: string): string => `نشط — ${title}`,
    active: 'نشط في هذا الفيديو.',
    subtitlesTrack: 'الترجمة',
    translationTrack: 'الترجمة بلغتك',
    noTranslation: 'لا شيء',
    generatedTrack: (track: string): string => `${track} (تلقائية)`,
    captureNeedsPermission: 'يتطلب تسجيل صوت الجملة هنا إذنًا لالتقاط صوت علامة التبويب هذه.',
    captureAllowInSettings: 'السماح في الإعدادات',
    captureReady: 'لا يمكن تسجيل صوت Netflix إلا بعد تفعيله لعلامة التبويب هذه.',
    captureStart: 'تسجيل صوت الجملة هنا',
    captureFailed: 'تعذّر على Chrome تسجيل علامة التبويب هذه.',
    toggleSidebar: 'إظهار/إخفاء الشريط الجانبي',
    ankiChecking: 'Anki: جارٍ التحقق…',
    ankiConnected: (n: number): string => `Anki متصل · ${count(n, CARD)} من Libregaku`,
    ankiOffline: 'Anki لا يعمل — تظهر الكلمات على أنها جديدة',
    ankiOccupied: (port: number): string => `برنامج آخر يستخدم المنفذ ${port}، لذا يتعذّر الوصول إلى Anki`,
    ankiBlocked: 'رفض Anki اتصال Libregaku — في الإعدادات السطر الذي يجب إضافته',
    ankiBusy: 'لم يستجب Anki — ربما هو مشغول بالمزامنة',
    ankiRefused: 'رفض Anki الطلب',
    cardsToAdd: (n: number): string => `${count(n, CARD)} قيد الإضافة`,
    cardsWaiting: (n: number): string => `${count(n, CARD)} في انتظار Anki`,
  },

  sidebar: {
    panelLabel: 'لوحة النص',
    resizeLabel: 'تغيير حجم اللوحة',

    // علامات التبويب والأزرار بجانبها
    tabsLabel: 'القوائم',
    transcriptTab: 'النص',
    savedTab: 'المحفوظة',
    settings: 'الإعدادات',
    shortcuts: 'اختصارات لوحة المفاتيح',
    close: 'إغلاق',
    closeLabel: 'إغلاق اللوحة',
    openTip: 'النص',
    openLabel: 'إظهار النص',
    help: 'مساعدة',

    // البحث في النص
    searchPlaceholder: 'البحث في النص…',
    searchLabel: 'البحث في النص',
    noMatches: 'لا نتائج',
    matchAt: (at: number, total: number): string => `${at} من ${total}`,
    matchesFound: (n: number): string => count(n, RESULT),

    // التصفية
    filterTip: 'تصفية',
    filterLabel: 'تصفية الأسطر',
    filterAll: 'كل الأسطر',
    filterAllAbout: 'جميع الأسطر دون تصفية',
    filterNew: 'فيها كلمات جديدة',
    filterNewAbout: 'أسطر فيها كلمة ليست لها بطاقة',
    filterReady: 'جاهزة للتعلّم',
    filterReadyAbout: 'أسطر فيها كلمة واحدة فقط جديدة عليك — الأسهل للتعلّم منها',
    filterSaved: 'المحفوظة',
    filterSavedAbout: 'أسطر احتفظت بها لوقت لاحق',

    // النص
    partial: 'يُبنى أثناء المشاهدة — هذا المشغّل لا يتيح إلا السطر الحالي.',
    partialEmpty: 'لا شيء بعد. تظهر الأسطر هنا عند نطقها.',
    empty: 'لم يُحمَّل أي نص.',
    currentLine: 'السطر الحالي',
    lineNew: (n: number): string => `${n} جديدة`,
    playFrom: (time: string): string => `تشغيل من ${time}`,
    saveLine: 'حفظ السطر',
    unsave: 'إلغاء الحفظ',
    addSentence: 'إضافة الجملة',
    addSentenceLabel: 'إضافة الجملة إلى Anki',

    // الملخص فوق النص: تسمية ثم رقمها، فيصلح لأي عدد
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: 'معروفة: {n}',
    summaryNew: 'جديدة: {n}',
    summaryReady: 'جاهزة للتعلّم: {n}',
    counting: (percent: number): string => `جارٍ عدّ الكلمات الجديدة… ${percent}%`,
    countFailed: 'تعذّر عدّ بعض الأسطر، لذا لا توجد مجاميع.',

    // التعريف السريع
    dictionaryLoading: (percent: number): string => `جارٍ تحميل القاموس — ${percent}%`,
    dictionaryUnavailable: 'القاموس غير متاح',
    noEntry: 'لا يوجد مدخل.',

    // المحفوظة
    savedEmpty:
      'لم تحفظ شيئًا بعد. استخدم الإشارة المرجعية في أي سطر من النص — أو اضغط B — لتحتفظ بجملة تريد العودة إليها.',
    thisVideo: 'هذا الفيديو',
    openAt: (time: string): string => `فتح الفيديو عند ${time}`,
    remove: 'إزالة',
    removeLabel: 'إزالة من المحفوظة',
    copySavedAbout: 'نسخ كل الأسطر المحفوظة كنص مفصول بعلامات الجدولة',
    exportSavedAbout: 'حفظ ملف مفصول بعلامات الجدولة يمكن لـ Anki استيراده',
    addSavedAbout: 'إنشاء بطاقة من كل سطر محفوظ',
    linesCopied: (n: number): string => `تم نسخ ${count(n, LINE, true)}.`,
    chooseDeck: 'اختر رزمة في الإعدادات أولًا — إليها تذهب البطاقات الجديدة.',
    checkingAnki: 'جارٍ التحقق من Anki…',
    ankiOffline: 'Anki لا يعمل. افتحه وأعد المحاولة — الخطوات في الإعدادات.',
    ankiBlocked: 'لم يسمح AnkiConnect لـ Libregaku بعد. في الإعدادات السطر الوحيد الذي يجب إضافته.',
    ankiUnreachable: 'تعذّر الوصول إلى Anki. الإعدادات توضّح السبب.',
    adding: (at: number, total: number): string => `جارٍ إضافة ${at} من ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `أُضيفت ${count(added, CARD)} إلى ${deck}${already ? `؛ الموجودة من قبل: ${already}` : ''}.`,

    // أزرار ورسائل المحفوظة والكلمات
    copy: 'نسخ',
    exportFile: 'تصدير ملف',
    addToAnki: 'إضافة إلى Anki',
    noClipboard: 'تعذّر الوصول إلى الحافظة.',
    downloaded: 'حُفظ في التنزيلات. في Anki: ملف ← استيراد.',
    downloadBlocked: 'حظرت هذه الصفحة التنزيل — استخدم «نسخ» بدلًا من ذلك.',

    // الكلمات
    listsLabel: 'أي قائمة',
    listLines: 'الأسطر',
    listTracked: 'قيد التتبّع',
    listKnown: 'معروفة',
    listIgnored: 'متجاهَلة',
    findPlaceholder: 'بحث…',
    findLabel: 'البحث في هذه القائمة',
    copyWordsAbout: 'نسخ هذه القائمة كنص مفصول بعلامات الجدولة',
    exportWordsAbout: 'حفظ هذه القائمة في ملف مفصول بعلامات الجدولة يمكن لـ Anki استيراده',
    wordsCopied: (n: number): string => `تم نسخ ${count(n, WORD, true)}.`,
    nothingToExport: 'لا يوجد في هذه القائمة ما يمكن تصديره.',
    lookingUp: 'جارٍ البحث عن القراءات والمعاني…',
    noWordMatches: (query: string): string => `لا توجد كلمة في هذه القائمة تطابق «${query}».`,
    noLineMatches: (query: string): string => `لا يوجد سطر محفوظ يطابق «${query}».`,
    wordsMatching: (shown: number, total: number): string => `${shown} من ${count(total, WORD, true)}.`,
    trackedEmpty:
      'لا شيء قيد التتبّع بعد. يضع «تتبّع» تسطيرًا تحت الكلمة لتنتبه إليها، دون إنشاء بطاقة. ' +
      'فعّل زرّه في الإعدادات، ضمن «نافذة الكلمة».',
    trackedIntro: (n: number): string => `الكلمات التي تتتبّعها: ${n}. تظهر مسطّرة أينما وردت.`,
    stopTracking: 'إيقاف التتبّع',
    knownEmpty:
      'لا توجد كلمات عليها علامة «معروفة». ضع هذه العلامة على كلمة من نافذتها، أو اضغط K، ' +
      'عندما تعرفها ولا تريد لها بطاقة.',
    knownIntro: (n: number): string =>
      `الكلمات التي عليها علامة «معروفة»: ${n}. إذا أزلت العلامة عن كلمة، عادت حالتها إلى ما تقوله بطاقاتك في Anki.`,
    unmarkKnown: 'إزالة علامة «معروفة»',
    ignoredEmpty: 'لا توجد كلمات متجاهَلة. تجاهل أسماء الأعلام والأصوات من نافذتها، فلا تُسطَّر ولا تُحتسب أبدًا.',
    ignoredIntro: (n: number): string => `الكلمات المتجاهَلة: ${n}. لا تُسطَّر ولا تُحتسب أبدًا.`,
    stopIgnoring: 'إلغاء التجاهل',
  },

  popup: {
    // النافذة والكلمة
    cardLabel: (word: string): string => `${word} — القاموس`,
    commonBadge: 'شائعة',
    characterNames: { kanji: 'كانجي', hanzi: 'الحروف' },
    partOfSpeech: {
      n: 'اسم', 'n-adv': 'اسم ظرفي', 'n-t': 'اسم زمني', 'n-suf': 'لاحقة اسمية',
      'n-pref': 'سابقة اسمية', pn: 'ضمير', 'adj-i': 'صفة -i', 'adj-na': 'صفة -na',
      'adj-no': 'صفة -no', 'adj-pn': 'صفة سابقة للاسم', adv: 'ظرف', 'adv-to': 'ظرف',
      aux: 'مساعد', 'aux-v': 'فعل مساعد', 'aux-adj': 'صفة مساعدة',
      conj: 'أداة ربط', cop: 'رابطة', ctr: 'عدّاد', exp: 'تعبير', int: 'تعجّب',
      num: 'عدد', prt: 'أداة', pref: 'سابقة', suf: 'لاحقة', unc: 'غير مصنّف',
      vs: 'فعل suru', 'vs-i': 'فعل suru', 'vs-s': 'فعل suru', vt: 'متعدٍّ', vi: 'لازم',
      v1: 'فعل ichidan', 'v1-s': 'فعل ichidan', vk: 'فعل kuru', vz: 'فعل zuru',
      v5b: 'فعل godan', v5g: 'فعل godan', v5k: 'فعل godan', 'v5k-s': 'فعل godan',
      v5m: 'فعل godan', v5n: 'فعل godan', v5r: 'فعل godan', 'v5r-i': 'فعل godan',
      v5s: 'فعل godan', v5t: 'فعل godan', v5u: 'فعل godan', 'v5u-s': 'فعل godan',
      v5aru: 'فعل godan',
      // رموز Wiktionary، للكلمات الكورية والإسبانية
      name: 'اسم علم', v: 'فعل', adj: 'صفة', pron: 'ضمير', det: 'محدِّد', artic: 'أداة تعريف',
      counter: 'عدّاد', prep: 'حرف جر', 'prep-phrase': 'شبه جملة جرّية', ptcl: 'أداة',
      intj: 'تعجّب', phrase: 'عبارة', prov: 'مَثَل', r: 'جذر', char: 'حرف', adn: 'صفة سابقة للاسم',
      ptcpl: 'اسم مفعول', contr: 'صيغة مختزلة',
      masc: 'مذكر', fem: 'مؤنث', neut: 'محايد', sg: 'مفرد', pl: 'جمع', 'pl-only': 'جمع فقط',
      count: 'معدود', uncount: 'غير معدود', vr: 'انعكاسي', vdt: 'متعدٍّ لمفعولين', impers: 'غير شخصي',
      irreg: 'غير قياسي', reltnl: 'نسبي', reltv: 'موصول', interr: 'استفهامي', poss: 'ملكية',
      dim: 'تصغير', aug: 'تكبير', onoma: 'محاكاة صوتية',
      idio: 'اصطلاحي', fig: 'مجازي', literal: 'حرفي', col: 'عامّي', inf: 'غير رسمي', fam: 'دارج',
      formal: 'رسمي', polite: 'مهذّب', lit: 'أدبي', poet: 'شعري', rhet: 'بلاغي', sl: 'لغة الشارع',
      vulg: 'بذيء', derog: 'تحقيري', offens: 'مسيء', humor: 'فكاهي', euph: 'تلطيفي',
      child: 'لغة أطفال', net: 'إنترنت', neol: 'مستحدث', cmn: 'شائع', uncmmn: 'غير شائع', rare: 'نادر',
      dated: 'قديم', arch: 'عتيق', obs: 'مهجور', hist: 'تاريخي', 'non-std': 'غير معياري',
      dialect: 'لهجي', regio: 'إقليمي',
    },

    // الأزرار تحت الكلمة
    pronounce: 'استماع',
    playedRecording: (word: string): string => `${word} · تسجيل`,
    playedSynthesised: (word: string): string => `${word} · صوت اصطناعي`,
    recordingBy: (speaker: string, licence: string): string => `تسجيل بصوت ${speaker} · ${licence}`,
    pronounceFailed: 'تعذّر تشغيل الصوت',
    addSentence: 'إضافة الجملة',
    sentenceAdded: 'تمت إضافة الجملة',
    undo: 'تراجع',
    copyWord: 'نسخ الكلمة',
    copyPhrase: 'نسخ العبارة',
    copySentence: 'نسخ الجملة',
    wordCopied: 'تم نسخ الكلمة',
    phraseCopied: 'تم نسخ العبارة',
    sentenceCopied: 'تم نسخ الجملة',
    copyFailed: 'تعذّر النسخ — حدِّد النص بدلًا من ذلك',

    // المعاني
    dictionaryLoading: (percent: number): string =>
      `لا يزال القاموس قيد التحميل — ${percent}%. أعد المحاولة بعد قليل.`,
    dictionaryUnavailable: (error: string): string => `القاموس غير متاح: ${error}`,
    noEntry: 'لا يوجد مدخل لهذه الكلمة في القاموس.',
    moreMeanings: (n: number): string => `+${count(n, MORE_MEANINGS)}`,

    // أسطر أخرى في الفيديو فيها الكلمة
    elsewhereCount: (n: number): string => `${count(n, MORE_TIMES)} في هذا الفيديو`,
    playLine: 'تشغيل',
    elsewhereMore: (n: number): string => `و${count(n, MORE_LINES)} — يجدها كلها البحث في النص`,
    showAllInTranscript: 'عرض الكل في النص',

    // الإضافة إلى Anki
    addToAnki: 'إضافة إلى Anki',
    addToDeck: (deck: string): string => `إضافة إلى ${deck}`,
    adding: 'جارٍ الإضافة…',
    undoing: 'جارٍ التراجع…',
    added: 'تمت الإضافة',
    addedUndo: 'تمت الإضافة — تراجع',
    inAnki: 'في Anki',
    showInAnki: 'عرض في Anki',
    waiting: 'في الانتظار',
    waitingForAnki: 'في انتظار Anki',
    goesInWhenAnkiOpens: 'ستُضاف إلى Anki عند فتحه',
    alreadyAdded: 'أُضيفت بالفعل',
    alreadyInAnki: 'موجودة في Anki بالفعل',
    waitingForAnkiToOpen: 'في انتظار فتح Anki',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // قائمة الرزم
    otherDecks: 'رزم أخرى',
    addToAnotherDeck: 'إضافة إلى رزمة أخرى',
    decksUnknown: 'Anki لا يستجيب، لذا رزمه غير معروفة بعد.',
    newDeck: 'رزمة جديدة…',
    newDeckPrompt: 'رزمة جديدة — استخدم :: لرزمة فرعية، مثل ياباني::Netflix',

    // العلامات
    knownButton: 'معروفة',
    trackButton: 'تتبّع',
    ignoreButton: 'تجاهل',
    markKnownTip: 'وضع علامة «معروفة»',
    trackTip: 'تتبّع',
    ignoreTip: 'تجاهل',
    unmarkKnownTip: 'إزالة علامة «معروفة»',
    stopTrackingTip: 'إيقاف التتبّع',
    stopIgnoringTip: 'إلغاء التجاهل',
  },

  header: {
    knownStat: 'معروفة: {percent}',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: 'الكلمات التي تعرفها',
    readyStat: 'جاهزة للتعلّم: {count}',
    readyTip: 'أسطر فيها كلمة جديدة واحدة',
    blurSubtitle: 'تمويه الترجمة',
    unblurSubtitle: 'إلغاء تمويه الترجمة',
    showTranslation: 'إظهار الترجمة بلغتك',
    hideTranslation: 'إخفاء الترجمة بلغتك',
    translation: 'الترجمة بلغتك',
    transcript: 'النص',
    pinHeader: 'تثبيت الشريط العلوي',
    unpinHeader: 'إلغاء تثبيت الشريط العلوي',
    settings: 'الإعدادات',
    showHeader: 'إظهار الشريط العلوي',
  },

  player: {
    // مفاتيح المشغّل
    lastLine: 'كان هذا آخر سطر',
    noLineBefore: 'لا يوجد سطر قبل هذا',
    translationOn: 'الترجمة بلغتك ظاهرة',
    translationOff: 'الترجمة بلغتك مخفية',
    blurOn: 'الترجمة مموّهة حتى تمرّر المؤشر فوقها',
    blurOff: 'الترجمة ظاهرة',
    lineSaved: 'تم حفظ السطر',
    lineUnsaved: 'لم يعد السطر محفوظًا',
    lookUpFirst: 'ابحث عن كلمة أولًا',
    alreadyKnown: (word: string): string => `${word} · معروفة في Anki بالفعل`,
    alreadyInAnki: (word: string): string => `${word} · موجودة في Anki بالفعل`,
    adding: (word: string): string => `جارٍ إضافة ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // العلامات
    markOff: (word: string): string => `${word} · أُزيلت العلامة`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'عُلِّمت كمعروفة', tracking: 'قيد التتبّع', ignored: 'متجاهَلة', unknown: 'عُلِّمت كجديدة',
      }[status];
      if (refused) return `${word} · ${done}، بلا بطاقة — رفضها Anki، وستُعاد المحاولة لاحقًا`;
      return `${word} · ${done}، بلا بطاقة${status === 'tracking' ? '. انظر تبويب «المحفوظة» في اللوحة' : ''}`;
    },

    // بطاقة الكلمة
    pickDeck: 'اختر رزمة في إعدادات Libregaku أولًا',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `أُضيفت إلى ${deck} — بدون ${without(missing)}` : `أُضيفت إلى ${deck}`,
    alreadyIn: (deck: string): string => `موجودة في ${deck} بالفعل`,
    queued: (deck: string): string => `Anki مغلق — ستُضاف إلى ${deck} عند فتحه`,
    alreadyQueued: 'في انتظار Anki بالفعل',
    notKept: 'Anki مغلق، ولم يحتفظ المتصفح بالبطاقة لوقت لاحق',
    takenBack: (deck: string): string => `أُزيلت من ${deck}`,
    unqueued: 'لم تعد في انتظار Anki',
    alreadySent: 'سبق أن أُضيفت إلى Anki',
    queueSent: (n: number): string => {
      const form = plural.select(n);
      const what = form === 'one' ? 'البطاقة التي كانت بانتظاره'
        : form === 'two' ? 'البطاقتان اللتان كانتا بانتظاره'
          : `${count(n, CARD)} كانت بانتظاره`;
      return `Anki مفتوح — أُضيفت ${what}`;
    },
    deckOutsideScope: (scope: string, deck: string): string =>
      `تُقرأ الكلمات التي تعرفها من ${scope}، لذا لن تُحتسب البطاقات في ${deck}`,

    // بطاقة الجملة
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `أُضيفت الجملة إلى ${deck} — بدون ${without(missing)}` : `أُضيفت الجملة إلى ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `الجملة موجودة في ${deck} بالفعل`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'صوتها', picture && 'صورتها'].filter(Boolean);
      return `Anki مغلق — ستُضاف الجملة إلى ${deck} عند فتحه` +
        `${lacking.length ? `، بدون ${lacking.join(' ولا ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'الجملة في انتظار Anki بالفعل',
    sentenceTakenBack: (deck: string): string => `أُزيلت الجملة من ${deck}`,

    // صوت الجملة
    recording: 'جارٍ تسجيل السطر…',

    // البحث
    noDictionary: 'لا يوجد قاموس لهذه اللغة بعد.',
  },

  notices: {
    // البطاقة
    unexpected: 'واجه Libregaku مشكلة غير متوقعة.',
    dismiss: 'إغلاق',

    // غيّر YouTube أو Netflix شيئًا
    youtubeTrackList: 'تعذّرت قراءة قائمة الترجمة في YouTube.',
    youtubeTrackShape: 'بيانات الترجمة في YouTube ليست بالشكل المتوقع.',
    youtubeCaptionText: 'تعذّر العثور على نص الترجمة في صفحة YouTube.',
    youtubePlayerTrackList: 'تعذّرت قراءة قائمة ترجمة هذا الفيديو من مشغّل YouTube.',
    netflixTrackList: 'تعذّرت قراءة قائمة الترجمة في Netflix.',
    netflixCaptionText: 'تعذّر العثور على نص الترجمة في صفحة Netflix.',
    disneyTrackList: 'تعذّرت قراءة قائمة الترجمة في Disney+.',
    disneyCaptionText: 'تعذّر العثور على نص الترجمة في صفحة Disney+.',
    primeTrackList: 'تعذّرت قراءة قائمة الترجمة في Prime Video.',
    primeCaptionText: 'تعذّر العثور على نص الترجمة في صفحة Prime Video.',
    maxTrackList: 'تعذّرت قراءة قائمة الترجمة في Max.',
    maxCaptionText: 'تعذّر العثور على نص الترجمة في صفحة Max.',
    netflixBlocked: 'حظر Netflix الجزء من Libregaku الذي يقرأ الترجمة.',

    // ترجمة هذا الفيديو
    subtitlesOff: 'فعّل الترجمة في المشغّل وسيلتقطها Libregaku.',
    trackNotSent: 'لم يحمّل المشغّل هذه الترجمة بعد.',
    noTargetTrack: 'لا توجد ترجمة هنا باللغة التي تتعلمها.',
    noSecondTrack: 'لا توجد ترجمة هنا بلغتك، لذا لا يوجد سطر ثانٍ.',
    onlyOneTrack: 'لهذا الفيديو مسار ترجمة واحد فقط، لذا لا يوجد سطر ثانٍ.',
    autoGenerated: 'هذه الترجمة مُنشأة تلقائيًا، لذا ستكون الصياغة وتقسيم الكلمات تقريبية.',
    noSubtitles: 'لا توجد ترجمة لهذا الفيديو.',
    secondTrackFailed: 'تعذّر تحميل السطر الثاني.',

    // أجزاء Libregaku
    analyserUnavailable:
      'القراءات وصيغ القاموس متوقفة: لم يُحمَّل المحلّل اللغوي. تطابق الكلمات بطاقاتك بالتهجئة نفسها فقط.',
    markNotSaved: 'تعذّر حفظ هذه العلامة. ستبقى سارية حتى تعيد التحميل، ثم تضيع.',
    marksNotSynced: 'تعذّر حفظ علاماتك في Anki. إنها محفوظة في هذا المتصفح وستُعاد المحاولة.',
    cardsNotAdded: 'لم يقبل Anki بعض البطاقات المحفوظة أثناء إغلاقه. لا تزال محفوظة، وستُعاد المحاولة.',

    // التفاصيل
    playerNeverLoaded: 'لم يكتمل تحميل المشغّل.',
    subtitlesMaybeOff: 'ربما تكون الترجمة متوقفة في المشغّل لا أكثر.',
    lookedFor: (selector: string): string => `تم البحث عن ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `ترجمات هذا الفيديو: ${languages.join('، ') || 'لا شيء'}. غيّر ما تتعلمه في الإعدادات، أو اختر فيديو آخر.`,
    onlyPictures: 'هذه الترجمة موجودة هنا كصور فقط، لا كنص، لذا لا يستطيع Libregaku قراءتها.',
    chooseInPlayer: (track: string): string => `اختر ${track} من قائمة الترجمة في المشغّل نفسه وسيلتقطها Libregaku.`,
    noHumanTrack: 'لا يوجد لهذا الفيديو مسار ترجمة كتبه إنسان.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `ترجمات هذا الفيديو: ${languages.join('، ')}.`,
    analyserDidNotLoad: 'لم يُحمَّل المحلّل',
  },

  anki: {
    // الاتصال بـ AnkiConnect
    offline: (port: number): string => `لا يوجد ما يستمع على المنفذ ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `لم يستجب شيء على المنفذ ${port} خلال ${count(seconds, SECOND, true)}. ` +
      'قد يكون Anki مشغولًا (بالمزامنة، أو بعرض نافذة حوار)، أو أن برنامجًا آخر يحجز المنفذ.',
    blocked: (origin: string): string =>
      `رفض AnkiConnect العنوان ${origin}. في Anki: أدوات ← إضافات ← AnkiConnect ← إعداد، ` +
      'ثم أضف هذا السطر إلى webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `استجاب شيء على المنفذ ${port} برمز HTTP ${status}. AnkiConnect لا يستجيب هكذا.`,
    notAnkiConnect: (port: number): string => `برنامج غير AnkiConnect يستخدم المنفذ ${port}.`,
    noBackground: 'لا يستجيب الجزء الخلفي من Libregaku.',
    unreachable: 'تعذّر الوصول إلى Anki.',
    callFailed: 'فشل طلب AnkiConnect.',

    // ما يرفض Libregaku إرساله
    notRelayed: (action: string): string => `لا يرسل Libregaku «${action}» إلى AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `لا يُرفق Libregaku من ${MEDIA_WHAT[media]} إلا ما جلبه بنفسه.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => MEDIA_EMPTY[media],
    mediaName: (prefix: string): string => `يسمّي Libregaku الملفات التي يضيفها ${prefix}…، وهذا الملف ليس كذلك.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `يحتاج ${action} إلى قائمة ${ids === 'notes' ? 'ملحوظات' : 'بطاقات'}.`,
    notMarks: (n: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `مرفوض: ${n} من ${ids === 'notes' ? 'الملحوظات' : 'البطاقات'} المرسلة لا تنتمي إلى أي علامة من علامات Libregaku. ` +
      (change === 'delete'
        ? 'لا يحذف Libregaku إلا علاماته، وبطاقةً أنشأها في الدقائق الأخيرة ولم تُدرَس بعد.'
        : change === 'suspend'
          ? 'لا يعلّق Libregaku إلا علاماته.'
          : 'لا يغيّر Libregaku الوسوم إلا على علاماته.'),

    // أنواع الملحوظات التي ينشئها Libregaku
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `نوع الملحوظة «${noteType}» في Anki ${fields.length === 1 ? 'ينقصه الحقل' : 'تنقصه الحقول'} ${fields.join('، ')}، ` +
      `لذا ستفقد ${loses === 'cards' ? 'البطاقات' : 'الملحوظات'} ${fields.length === 1 ? 'محتواه' : 'محتواها'}. ` +
      'لن يغيّر Libregaku نوع ملحوظة ربما عدّلته: ' +
      `في Anki، من أدوات ← إدارة أنواع الملحوظات، أعد تسمية «${noteType}» (أو أعد إضافة الحقول)، ثم انقر ` +
      '«إعادة التحقق» وسيُثبَّت نوع جديد.',

    // العلامات والبطاقات المنتظِرة
    marksNotAdded: (n: number): string =>
      `لم يُضِف Anki ${n} من العلامات. ستبقى في قائمة الانتظار وستُعاد المحاولة في المرة القادمة.`,
    marksNotStored: (cause: string): string => `رفض تخزين المتصفح العلامات المقروءة من Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `تعذّرت قراءة تخزين المتصفح: ${cause}`,
  },

  errors: {
    // تسجيل صوت علامة تبويب
    captureNotAllowed: 'اسمح أولًا بصوت الجملة على هذا الموقع من إعدادات Libregaku.',
    captureRefused: 'رفض Chrome التقاط علامة التبويب هذه',

    // مسار ترجمة لم يُحمَّل
    unknownTrack: (id: string): string => `مسار غير معروف ${id}`,
    trackNotSent: 'لم يحمّلها المشغّل بعد؛ اخترها مرة واحدة من قائمة الترجمة في المشغّل',
    noCaptionFormat: (attempts: readonly string[]): string => `لم تنجح أي صيغة للترجمة — ${attempts.join('، ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `لم ينجح أي عنوان URL للترجمة — ${attempts.join('؛ ') || 'لا يوجد أي عنوان'}`,
    emptyAnswer: 'فارغ',
    noCues: 'لا أسطر',
    noCuesParsed: 'لم يُستخرج أي سطر',
    noAnswerWithin: (seconds: number): string => `لا رد خلال ${count(seconds, SECOND, true)}`,

    // اسم المسار
    forcedTrack: (track: string): string => `${track} (إجبارية)`,

    // القاموس والمحلّل
    noAnswer: 'لا رد من الإضافة — أعد تحميل الصفحة لإعادة تشغيلها',
    analyserLoading: 'لا يزال المحلّل قيد التحميل',
    dictionaryLoading: 'لا يزال القاموس قيد التحميل',
    lookupFailed: 'فشل البحث',
  },

  grammar: {
    // الزمن والتهذيب
    past: 'ماضٍ',
    polite: 'مهذّب',

    // النفي
    negative: 'نفي',
    'negative intent': 'نفي إرادي',
    without: 'دون',

    // الشرط
    conditional: 'شرط',
    whenever: 'كلّما',

    // الفاعل والاستطاعة
    passive: 'مبني للمجهول',
    'passive or potential': 'مجهول أو استطاعة',
    potential: 'استطاعة',
    causative: 'سببية',

    // الرغبة
    'want to': 'رغبة',
    'seems to want to': 'يبدو راغبًا',
    'want someone to': 'يريد من غيره',

    // الظن والنقل
    seems: 'يبدو',
    'seems like': 'يبدو أن',
    hearsay: 'يُقال',
    apparently: 'على ما يبدو',
    probably: 'على الأرجح',
    might: 'ربما',

    // ما ينبغي أن يحدث
    'ought to': 'ينبغي',
    'supposed to': 'يُفترض',
    'intends to': 'ينوي',

    // الوجوب والجواز
    must: 'يجب',
    'must not': 'لا يجوز',
    "don't have to": 'لا يلزم',
    may: 'يجوز',

    // الأمر والطلب
    imperative: 'أمر',
    volitional: 'إرادة',
    'polite command': 'أمر مهذّب',
    please: 'طلب',

    // الربط بما يليه
    'te-form': 'صيغة て',
    listing: 'تعداد',
    while: 'أثناء',
    because: 'لأن',
    'even though': 'مع أن',
    'in order to': 'لكي',
    'so that': 'بحيث',

    // أفعال مساعدة بعد صيغة て
    ongoing: 'استمرار',
    'resulting state': 'حالة ناتجة',
    'completely, or regrettably': 'إتمام أو ندم',
    'in advance': 'مسبقًا',
    'try doing': 'تجربة',
    'going forward': 'مضيّ قدمًا',
    'coming to be': 'صيرورة',
    'receive the favour': 'تلقّي معروف',
    'someone does for me': 'يفعل لأجلي',
    'do for someone': 'فعل لأجل الغير',

    // أفعال مساعدة بعد جذر الفعل
    'too much': 'إفراط',
    'easy to': 'سهل',
    'hard to': 'صعب',
    'start to': 'بدء',
    'keep on': 'مواصلة',
    finish: 'إنهاء',
    again: 'إعادة',
    'each other': 'تبادل',
    completely: 'حتى النهاية',
    thoroughly: 'تعمّق',
    around: 'هنا وهناك',
    'non-stop': 'بلا توقف',

    // صيغ الكلمة الإسبانية
    or: 'أو',
    'first-person': 'متكلم',
    'second-person': 'مخاطَب',
    'third-person': 'غائب',
    singular: 'مفرد',
    plural: 'جمع',
    masculine: 'مذكر',
    feminine: 'مؤنث',
    present: 'مضارع',
    preterite: 'ماضٍ تام',
    imperfect: 'ماضٍ ناقص',
    'imperfect-se': 'ماضٍ ناقص (-se)',
    future: 'مستقبل',
    'conditional-mood': 'شرطي',
    indicative: 'إخباري',
    subjunctive: 'احتمالي',
    infinitive: 'مصدر',
    gerund: 'صيغة -ndo',
    participle: 'اسم مفعول',
    formal: 'رسمي',
    informal: 'غير رسمي',
    'with-tú': 'مع tú',
    'with-vos': 'مع vos',
    'vos-form': 'صيغة vos',
    voseo: 'voseo',
    'second-person-semantically': 'بمعنى المخاطَب',
    accusative: 'مع مفعول مباشر',
    dative: 'مع مفعول غير مباشر',
    'object-first-person': 'مفعول للمتكلم',
    'object-second-person': 'مفعول للمخاطَب',
    'object-third-person': 'مفعول للغائب',
    'object-singular': 'مفعول مفرد',
    'object-plural': 'مفعول جمع',
    diminutive: 'تصغير',
    augmentative: 'تكبير',
    superlative: 'تفضيل',
    alternative: 'صيغة بديلة',
    'alt-of': 'تهجئة أخرى',

    // لواحق الكلمة الكورية
    honorific: 'احترام',
    'future or guess': 'مستقبل أو تخمين',
    'formal polite': 'رسمي مهذّب',
    question: 'استفهام',
    but: 'لكن',
    "let's": 'هيّا',
    plain: 'إخبار عادي',
    'shall we, or I wonder': 'اقتراح أو تساؤل',
    'I will': 'وعد',
    'just noticed': 'إدراك مفاجئ',
    'as you know': 'كما تعلم',
    and: 'و',
    'because, or and then': 'لأن، أو ثم',
    'but, or given that': 'لكن، أو بما أن',
    'even if': 'حتى لو',
    whether: 'ما إذا',
    'adverb form': 'صيغة ظرفية',
    quoting: 'كلام منقول',
    'used to': 'كان يفعل',
    topic: 'موضوع',
    subject: 'فاعل',
    object: 'مفعول',
    possessive: 'ملكية',
    'come to': 'انتهى إلى',
    when: 'عندما',
    modifier: 'صيغة وصفية',
    'noun form': 'صيغة اسمية',
    becomes: 'يصبح',
    'have done before': 'سبق أن فعل',
  },
};
