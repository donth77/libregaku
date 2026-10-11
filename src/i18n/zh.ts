import type { Translation } from '.';
import type { Settings } from '../settings';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';

/** The three furigana and pinyin settings, named as the Subtitles menu and the R key name them. */
const rubyMode = (mode: Settings['ruby']): string => ({ unknown: '仅生词', always: '全部', never: '关闭' })[mode];

/** What a card went in without, for `added` and `sentenceAdded`. */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted' ? '句子音频（点击 Libregaku 图标即可在此录制）' : '句子音频'))
    .join('或');

/** A message from elsewhere, ended as a Chinese sentence, since sentences here follow one another with no space. */
const ended = (s: string): string => (/[。.!！?？]$/.test(s) ? s : `${s}。`);

/** Anki's own word for each kind of media. */
const MEDIA = { audio: '音频', video: '视频', picture: '图片' } as const;

/** The interface in Chinese, Simplified. Anything left out shows in English. */
export const zh: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `假名注音：${rubyMode(mode)}`,
    pinyin: (mode: Settings['ruby']): string => `拼音：${rubyMode(mode)}`,
    sentenceGap: '',
  },

  settings: {
    // Languages
    languagesHeading: '语言',
    languagesAbout: '选择学习语言和母语。',
    target: '学习语言',
    targetLimited: (language: string): string => `${language}（有限支持）`,
    supportFull: '完整支持，包括读音和假名注音。',
    supportPinyin: '完整支持，包括拼音。释义为英文。',
    supportWords: '完整支持。释义为英文。',
    supportBasic: '基础支持：可以分词，但暂时没有词典和读音。',
    native: '母语',
    nativeHint: '视频和词典提供这种语言时，翻译和释义就用它显示。',
    definitions: '释义语言',
    definitionsHint: '词典没有你母语的释义，因此改用这种语言显示。',
    definitionsHintFor: (language: string): string => `词典没有${language}释义，因此改用这种语言显示。`,

    // Looking words up
    lookupHeading: '查词',
    lookupAbout: '选择查词弹窗出现的方式和时机。',
    interaction: '查词方式',
    interactionHover: '悬停',
    interactionShift: '按住 Shift 悬停',
    interactionClick: '点击',
    interactionHint: '点击单词也总能查词。',
    hoverPause: '查词时暂停',
    hoverPauseHint: '指针停在单词上时暂停视频。',
    sidebarHover: '侧边栏快速释义',
    sidebarHoverHint: '指向侧边栏中的单词时，显示简短释义。',

    // Word popup
    popupHeading: '单词弹窗',
    popupAbout: '选择查词时弹窗显示哪些内容。',
    cardMarks: '“已掌握”和“忽略”按钮',
    cardMarksHint: '“已掌握”会去掉单词的下划线；“忽略”会让单词不计入统计。两者都不会添加卡片。',
    cardTrack: '“关注”按钮',
    cardTrackHint: '为想留意的单词加上紫色下划线。不会添加卡片。',
    cardDeckMenu: '牌组菜单',
    cardDeckMenuHint: '在“添加到 Anki”旁加一个 ▾，用来选择其他牌组。之后的新卡片都会添加到那里。',
    cardAddLine: '句子卡片',
    cardAddLineHint: '添加一个按钮，用整句制作卡片，并附带句子音频和截图。',
    cardKanji: '汉字解析',
    cardKanjiHint: '显示每个汉字的释义和读音。',
    cardHanzi: '汉字解析',
    cardHanziHint: '显示每个汉字的释义和读音。',
    lookupElsewhere: '本视频中的例句',
    lookupElsewhereHint: '显示本视频中用到这个单词的其他句子。点击即可播放。',

    // Subtitles
    subtitlesHeading: '字幕',
    subtitlesAbout: '调整字幕在视频上的显示效果。',
    ruby: '假名注音',
    rubyUnknown: '仅生词',
    rubyAlways: '全部',
    rubyNever: '关闭',
    rubyHint: '在汉字上方标注读音。观看时按 R 切换。',
    pinyin: '拼音',
    pinyinHint: '在汉字上方标注读音。观看时按 R 切换。',
    blurPrimary: '模糊字幕',
    blurPrimaryHint: '用于听力练习：字幕保持模糊，指针移上去才显示。按 H 切换。',
    subtitleSize: '字号',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: '随播放器缩放，全屏时看起来也一样。',
    subtitleBottom: '位置',
    subtitleBottomLowest: '最低',
    subtitleBottomLow: '较低',
    subtitleBottomNormal: '正常',
    subtitleBottomRaised: '略高',
    subtitleBottomHigh: '较高',
    subtitleBottomHighest: '最高',
    subtitleBottomHint: '字幕的高度。同一播放器上的其他字幕扩展会显示在它下方。',
    dualSubtitles: '显示翻译',
    dualSubtitlesHint: '在学习语言的字幕下方显示母语字幕。字幕来自网站本身，不是机器翻译，并且需要能获取视频的完整字幕。',

    // Underlines
    underlinesHeading: '下划线',
    underlinesAbout: '每种颜色代表你对单词的掌握程度。点击颜色即可更改。',
    colorUnknown: '生词',
    colorUnknownHint: '在 Anki 中没有卡片的单词。',
    colorLearning: '学习中',
    colorLearningHint: '卡片尚未熟练的单词。',
    colorTracking: '已关注',
    colorTrackingHint: '你关注的单词。',
    colorKnown: '已掌握',
    colorKnownHint: '卡片已熟练或标为已掌握的单词。',
    underlines: '为单词加下划线',
    underlinesHint: '关闭后显示普通字幕，单词下方没有颜色。',
    markKnown: '为已掌握的单词加下划线',
    markKnownHint: '默认关闭，这样学得越多，画面越清爽。',
    defaultColours: '默认颜色',
    resetColours: '重置',

    // Transcript: the panel beside the video
    transcriptHeading: '侧边栏',
    transcriptAbout: '视频旁边列出全部字幕的面板。',
    sidebarFollow: '随视频滚动',
    sidebarFollowHint: '让当前这句始终可见。手动滚动时会暂停跟随，点击按钮即可恢复。',
    headerBar: '显示顶栏',
    headerBarHint: '指针靠近视频顶部时显示。',
    languageBadge: '语言标识',
    languageBadgeFlag: '国旗',
    languageBadgeCode: '代码',
    badgeFlag: '标识国旗',
    badgeFlagDefault: '默认',
    badgeFlagHint: '为学习语言显示的国旗。每种语言分别保存。',
    languageBadgeHint: '顶栏如何显示学习语言。',
    sidebarStats: '统计生词',
    sidebarStatsHint: '显示每句的生词数、已掌握单词的比例，以及依赖这些数据的筛选。',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: '连接 Anki，选择新卡片添加到哪里，以及根据哪些牌组判断已掌握的单词。',
    deck: '新卡片添加到',
    deckHint: '所有新卡片都会添加到这个牌组。',
    statusScope: '已掌握单词来自',
    statusScopeHint: '由这些牌组中的卡片决定哪些单词加下划线。包括子牌组。',
    marksInAnki: '在 Anki 中保存标记',
    marksInAnkiHint:
      '将“已掌握”“关注”和“忽略”保存为 Anki 中的隐藏笔记（Libregaku::Marks），以便同步到你的其他设备。' +
      '关闭时，标记只保存在此浏览器中。',

    // The deck menus
    wholeCollection: '全部集合',
    chooseDeck: '选择牌组…',
    deckNotInAnki: (deck: string): string => `${deck}（已不在 Anki 中）`,
    deckAndSubdecks: (deck: string): string => `${deck}（含子牌组）`,
    deckUnset: '请选择牌组。选择之前无法添加卡片。',
    deckMissing: (deck: string): string => `Anki 中已没有名为“${deck}”的牌组。请另选一个。`,
    statusScopeMissing: (deck: string): string =>
      `Anki 中已没有名为“${deck}”的牌组，因此所有单词都显示为生词。请另选一个。`,
    statusScopeOutside: (deck: string): string =>
      `新卡片会添加到“${deck}”，但它不在这里选择的范围内，因此添加的单词会一直按生词加下划线。` +
      '请选择包含它的牌组，或“全部集合”。',

    // Where Anki stands
    ankiChecking: '正在检查…',
    ankiConnected: '已连接。',
    noteTypeInstalled: '已安装笔记模板。',
    cardsMade: (n: number): string => `已用 Libregaku 制作 ${n} 张卡片。`,
    noCards: '还没有卡片。',
    cardsFlushed: (n: number): string => `已添加 Anki 关闭期间制作的 ${n} 张卡片。`,
    cardsNotFlushed: (n: number, error: string): string => `${n} 张卡片无法添加：${ended(error)}`,
    cardsWaiting: (n: number): string => `${n} 张卡片等待添加。`,
    ankiOffline: (port: number): string =>
      `Anki 没有在端口 ${port} 上响应。Anki 关闭时这很正常：新卡片会在这里等待，Anki 打开后再添加。`,
    ankiBlocked: 'Anki 正在运行，但 AnkiConnect 尚未允许此扩展。',
    ankiOccupied: (detail: string): string => `${ended(detail)}请关闭占用该端口的程序，以便 Anki 使用。`,

    // The Anki buttons
    checkAgain: '重新检查',
    newDeck: '新建牌组',
    openCards: '在 Anki 中查看卡片',
    openMarks: '在 Anki 中查看标记',
    newDeckPrompt: '输入新牌组的名称。用 :: 表示子牌组，例如：日语::Netflix',

    // Connecting Anki
    installStep: '在这台电脑上安装并打开 Anki。{link}',
    getAnki: '获取 Anki',
    addonStep: '在 Anki 中打开{menu}，粘贴此代码，然后重启 Anki。',
    addonMenu: '工具 → 插件 → 获取插件…',
    aboutAnkiConnect: '关于 AnkiConnect',
    originStep: '在 Anki 中打开{menu}，将下面这行添加到 {setting}，然后重启 Anki。',
    originMenu: '工具 → 插件 → AnkiConnect → 插件设置',
    runningStep: '观看时请保持 Anki 打开。卡片会直接添加到这台电脑上的 Anki。',
    copy: '复制',
    copyValue: (value: string): string => `复制 ${value}`,
    copied: '已复制',
    copyFailed: '请手动选择',

    // Anki cards
    ankiCardsHeading: 'Anki 卡片',
    ankiCardsAbout: '除了单词、读音、释义和句子，选择每张新卡片还附带哪些内容。',
    cardAudio: '单词发音',
    cardAudioHint: '单词的真人录音（如果有）。绝不使用合成语音。',
    cardSentenceAudio: '句子音频',
    cardSentenceAudioHint: '通过再播放一遍来录制句子。在 Netflix 上需要下方的权限。',
    cardScreenshot: '截图',
    cardScreenshotHint: '当时场景的画面。Netflix 会阻止截图，因此在 Netflix 上不可用。',
    capture: 'Netflix 上的句子音频',
    captureAllow: '允许',
    captureAllowInSettings: '在设置中允许',
    captureRemove: '移除',
    captureAllowed: '已允许。在每个 Netflix 标签页中，点击 Libregaku 图标，然后选择“在此录制句子音频”。',
    captureNeeded: 'Netflix 会保护视频，因此句子音频要从标签页录制。这需要你的授权。',

    // Data and licences
    creditsHeading: '数据与许可',
    creditJmdict:
      '词典和汉字数据 © Electronic Dictionary Research and Development Group，依据 CC BY-SA 4.0 使用。' +
      '由 jmdict-simplified 重新打包为 JSON。',
    creditLindera: '将日语、韩语和中文切分为单词。MIT 许可；IPADIC、mecab-ko-dic 和 CC-CEDICT 各有其条款。',
    creditCedict: '中文词典 © MDBG 及其贡献者，依据 CC BY-SA 4.0 使用。',
    creditWiktionary: '韩语和西班牙语词典，来自 Wiktionary，经 kaikki.org 和 wiktionary-to-yomitan 转换。CC BY-SA 4.0。',
    creditUnihan: '决定汉字优先显示哪个读音。© Unicode, Inc.，依据 Unicode License 使用。',
    creditJotoba: '词典下载期间用于查词。两者都使用 JMdict。',
    creditLucide: '图标。ISC 许可。',
    licence: 'Libregaku 采用 MIT 许可。词典数据从各自的来源下载，不随扩展打包。',
    built: (when: string): string => `此版本构建于 ${when}。`,

    // The keyboard shortcuts view
    keyLine: '上一句或下一句',
    keyReplay: '重播本句',
    keyTranslation: '显示或隐藏翻译',
    keyShiftLookup: '按住以查询指针下的单词',
    keyAdd: '将弹窗中的单词添加到 Anki',
    keyKnown: '将弹窗中的单词标为已掌握',
    keyFurigana: '切换假名注音：关闭、仅生词、全部',
    keyPinyin: '切换拼音：关闭、仅生词、全部',
    keyBlur: '模糊或取消模糊字幕',
    keySave: '收藏当前句',
    keyTranscript: '显示或隐藏侧边栏',
    keyClose: '关闭弹窗',
  },

  options: {
    pageTitle: 'Libregaku 设置',
    help: '帮助',
    searchSettings: '搜索…',
    noSettingsFound: '没有找到与“{q}”相关的内容。',
    contentsLabel: '设置目录',
    settingsLabel: '设置',
    setupHeading: '开始使用',
    setupAbout: '只需两项选择，其余都有合理的默认设置。',
    stepLanguages: '选择学习语言',
    stepAnki: '连接 Anki，并为新卡片选择牌组',
    ankiOptional: 'Anki 不是必需的——没有它，字幕、查词和假名注音都能正常使用。它的作用是记住你已掌握哪些单词。',
    nextSteps: '然后打开一个带有学习语言字幕的视频，将指针悬停在单词上。侧边栏中的键盘按钮会列出键盘快捷键。',
    confirmLanguages: '确认语言',
    keepDeck: (deck: string): string => `新卡片添加到“${deck}”`,
  },

  action: {
    help: '帮助',
    settings: '设置',
    settingsTip: '所有设置',
    checkingPage: '正在检查此页面…',
    notActive: '未在此页面上启用。请打开 YouTube、Netflix、Disney+、Prime Video 或 Max 视频。如果刚安装或重新加载了 Libregaku，请刷新此标签页。',
    unsupported: 'Libregaku 支持 YouTube、Netflix、Disney+、Prime Video 和 Max。',
    waitingForSubtitles: (site: string): string => `正在等待 ${site} 的字幕。请确认字幕已打开。`,
    activeOn: (title: string): string => `已启用——${title}`,
    active: '已在此视频上启用。',
    subtitlesTrack: '字幕',
    translationTrack: '翻译',
    noTranslation: '无',
    generatedTrack: (track: string): string => `${track}（自动生成）`,
    captureNeedsPermission: '要在此录制句子音频，需要录制此标签页声音的权限。',
    captureAllowInSettings: '在设置中允许',
    captureReady: '需要先为此标签页开启录制，才能录制 Netflix 的声音。',
    captureStart: '在此录制句子音频',
    captureFailed: 'Chrome 无法录制此标签页。',
    toggleSidebar: '显示/隐藏侧边栏',
    ankiChecking: 'Anki：正在检查…',
    ankiConnected: (n: number): string => `Anki 已连接 · ${n} 张卡片来自 Libregaku`,
    ankiOffline: 'Anki 未运行——单词都显示为生词',
    ankiOccupied: (port: number): string => `另一个程序正在使用端口 ${port}，因此无法连接 Anki`,
    ankiBlocked: 'Anki 拒绝了此扩展——需要添加的那一行见设置',
    ankiBusy: 'Anki 没有响应——可能正在同步',
    ankiRefused: 'Anki 拒绝了请求',
    cardsToAdd: (n: number): string => `还有 ${n} 张卡片待添加`,
    cardsWaiting: (n: number): string => `${n} 张卡片等待 Anki`,
  },

  sidebar: {
    // The tabs, and the icon buttons beside them
    tabsLabel: '列表',
    transcriptTab: '字幕',
    savedTab: '收藏',
    wordsTab: '单词',
    settings: '设置',
    shortcuts: '键盘快捷键',
    close: '关闭',
    closeLabel: '收起侧边栏',
    openTip: '侧边栏',
    openLabel: '显示侧边栏',
    help: '帮助',

    // Searching the transcript
    searchPlaceholder: '搜索字幕…',
    searchLabel: '搜索字幕',
    noMatches: '无结果',
    matchAt: (at: number, total: number): string => `${at}/${total}`,
    matchesFound: (n: number): string => `找到 ${n} 句`,

    // The filter button and its menu
    filterTip: '筛选',
    filterLabel: '筛选句子',
    filterAll: '全部句子',
    filterAllAbout: '显示所有句子',
    filterNew: '含生词',
    filterNewAbout: '至少有一个单词还没有卡片的句子',
    filterReady: '适合学习',
    filterReadyAbout: '只有一个生词的句子——最容易学',
    filterSaved: '已收藏',
    filterSavedAbout: '收藏下来以后再看的句子',

    // The transcript
    partial: '边看边生成——此播放器只提供当前这一句。',
    partialEmpty: '暂无内容。播放到的字幕会逐句出现在这里。',
    empty: '未加载字幕。',
    currentLine: '回到当前句',
    lineNew: (n: number): string => `${n} 个生词`,
    saveLine: '收藏此句',
    unsave: '取消收藏',
    addSentence: '添加句子',
    addSentenceLabel: '将句子添加到 Anki',

    // The summary over the transcript
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: '{n} 已掌握',
    summaryNew: '{n} 个生词',
    summaryReady: '{n} 句适合学习',
    counting: (percent: number): string => `正在统计生词… ${percent}%`,
    countFailed: '部分句子无法统计，因此没有总数。',

    // The card that shows a word's meaning while the pointer is over it
    dictionaryLoading: (percent: number): string => `正在加载词典… ${percent}%`,
    dictionaryUnavailable: '词典不可用',
    noEntry: '未找到词条。',

    // The Saved tab
    savedEmpty: '还没有收藏。点击任意一句字幕上的书签（或按 B），即可收藏想回头再看的句子。',
    thisVideo: '当前视频',
    remove: '移除',
    removeLabel: '从收藏中移除',
    copySavedAbout: '将所有收藏的句子复制为制表符分隔的文本',
    exportSavedAbout: '保存为 Anki 可导入的制表符分隔文件',
    addSavedAbout: '为每个收藏的句子制作一张卡片',
    linesCopied: (n: number): string => `已复制 ${n} 句。`,
    chooseDeck: '请先在设置中选择牌组——新卡片会添加到那里。',
    checkingAnki: '正在检查 Anki…',
    ankiOffline: 'Anki 未运行。请打开 Anki 后重试，具体步骤见设置。',
    ankiBlocked: 'AnkiConnect 尚未允许此扩展。需要添加的那一行见设置。',
    ankiUnreachable: '无法连接 Anki，原因见设置。',
    adding: (at: number, total: number): string => `正在添加 ${at}/${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `已将 ${added} 张卡片添加到“${deck}”${already ? `，另有 ${already} 张已存在` : ''}。`,

    // Buttons and messages the Saved and Words tabs share
    copy: '复制',
    exportFile: '导出文件',
    addToAnki: '添加到 Anki',
    noClipboard: '无法访问剪贴板。',
    downloaded: '已保存到下载文件夹。在 Anki 中选择“文件 → 导入”。',
    downloadBlocked: '此网页阻止了下载，请改用“复制”。',

    // The Words tab
    listsLabel: '单词类别',
    listTracked: '已关注',
    listKnown: '已掌握',
    listIgnored: '已忽略',
    findPlaceholder: '查找单词',
    findLabel: '在此列表中查找单词',
    copyWordsAbout: '将此列表复制为制表符分隔的文本',
    exportWordsAbout: '将此列表保存为 Anki 可导入的制表符分隔文件',
    wordsCopied: (n: number): string => `已复制 ${n} 个单词。`,
    nothingToExport: '此列表中没有可导出的单词。',
    lookingUp: '正在查询读音和释义…',
    noWordMatches: (query: string): string => `此列表中没有与“${query}”匹配的单词。`,
    wordsMatching: (shown: number, total: number): string => `找到 ${shown} 个（共 ${total} 个单词）。`,
    trackedEmpty: '还没有关注的单词。“关注”会给单词加下划线，让你注意到它，但不会制作卡片。' +
      '可在设置的“单词弹窗”中打开这个按钮。',
    trackedIntro: (n: number): string => `已关注 ${n} 个单词，无论出现在哪里都会加下划线。`,
    stopTracking: '取消关注',
    knownEmpty: '还没有标为已掌握的单词。认识某个单词又不想做卡片时，可在它的弹窗中标为已掌握，或按 K。',
    knownIntro: (n: number): string => `已将 ${n} 个单词标为已掌握。取消标记后，单词状态将以 Anki 卡片为准。`,
    unmarkKnown: '取消已掌握',
    ignoredEmpty: '没有已忽略的单词。在人名和感叹词的弹窗中选择忽略，它们就不会加下划线，也不计入统计。',
    ignoredIntro: (n: number): string => `${n} 个单词不加下划线，也不计入统计。`,
    stopIgnoring: '取消忽略',
  },

  popup: {
    // The card, and the word at its head
    cardLabel: (word: string): string => `词典：${word}`,
    commonBadge: '常用',
    characterNames: { kanji: '汉字', hanzi: '汉字' },
    partOfSpeech: {
      n: '名词', 'n-adv': '副词性名词', 'n-t': '时间名词', 'n-suf': '接尾名词',
      'n-pref': '接头名词', pn: '代词', 'adj-i': 'い形容词', 'adj-na': 'な形容词',
      'adj-no': 'の形容词', 'adj-pn': '连体词', adv: '副词', 'adv-to': '副词',
      aux: '助动词', 'aux-v': '助动词', 'aux-adj': '补助形容词',
      conj: '接续词', cop: '判断词', ctr: '量词', exp: '惯用语', int: '感叹词',
      num: '数词', prt: '助词', pref: '接头词', suf: '接尾词', unc: '未分类',
      vs: 'サ变动词', 'vs-i': 'サ变动词', 'vs-s': 'サ变动词', vt: '他动词', vi: '自动词',
      v1: '一段动词', 'v1-s': '一段动词', vk: 'カ变动词', vz: 'ザ变动词',
      v5b: '五段动词', v5g: '五段动词', v5k: '五段动词', 'v5k-s': '五段动词',
      v5m: '五段动词', v5n: '五段动词', v5r: '五段动词', 'v5r-i': '五段动词',
      v5s: '五段动词', v5t: '五段动词', v5u: '五段动词', 'v5u-s': '五段动词',
      v5aru: '五段动词',
      // 维基词典的词类代码，用于韩语和西班牙语单词。
      name: '专有名词', v: '动词', adj: '形容词', pron: '代词', det: '限定词', artic: '冠词', counter: '量词', prep: '介词',
      'prep-phrase': '介词短语', ptcl: '助词', intj: '叹词', phrase: '短语', prov: '谚语', r: '词根', char: '字符', adn: '冠形词',
      ptcpl: '分词', contr: '缩合词', masc: '阳性', fem: '阴性', neut: '中性', sg: '单数', pl: '复数', 'pl-only': '仅复数',
      count: '可数', uncount: '不可数', vr: '反身', vdt: '双及物', impers: '无人称', irreg: '不规则', reltnl: '关系形容词', reltv: '关系词',
      interr: '疑问', poss: '物主', dim: '指小', aug: '指大', onoma: '拟声', idio: '惯用', fig: '比喻', literal: '字面', col: '口语',
      inf: '非正式', fam: '亲昵', formal: '正式', polite: '礼貌', lit: '书面', poet: '诗歌', rhet: '修辞', sl: '俚语', vulg: '粗俗',
      derog: '贬义', offens: '冒犯', humor: '诙谐', euph: '委婉', child: '儿语', net: '网络', neol: '新词', cmn: '常用',
      uncmmn: '不常用', rare: '罕见', dated: '旧式', arch: '古语', obs: '废语', hist: '历史', 'non-std': '非标准', dialect: '方言',
      regio: '地区用语',
    },

    // The row of icon buttons under the word
    pronounce: '发音',
    playedRecording: (word: string): string => `${word} · 录音`,
    playedSynthesised: (word: string): string => `${word} · 合成语音`,
    pronounceFailed: '无法播放音频',
    addSentence: '添加句子',
    sentenceAdded: '句子已添加',
    undo: '撤销',
    copyWord: '复制单词',
    copyPhrase: '复制短语',
    copySentence: '复制句子',
    wordCopied: '已复制单词',
    phraseCopied: '已复制短语',
    sentenceCopied: '已复制句子',
    copyFailed: '无法复制，请手动选择文本',

    // The meanings
    dictionaryLoading: (percent: number): string => `词典仍在加载（${percent}%），请稍后再试。`,
    dictionaryUnavailable: (error: string): string => `词典不可用：${error}`,
    noEntry: '词典中没有这个单词。',
    moreMeanings: (n: number): string => `+${n} 条释义`,

    // The word's other lines in this video
    elsewhereCount: (n: number): string => `本视频中还出现 ${n} 次`,
    playLine: '播放',
    elsewhereMore: (n: number): string => `还有 ${n} 处——在侧边栏中搜索可全部找到`,
    showAllInTranscript: '在侧边栏中查看全部',

    // Add
    addToAnki: '添加到 Anki',
    addToDeck: (deck: string): string => `添加到“${deck}”`,
    adding: '正在添加…',
    undoing: '正在撤销…',
    added: '已添加',
    inAnki: '已在 Anki 中',
    showInAnki: '在 Anki 中查看',
    waiting: '等待中',
    waitingForAnki: '等待 Anki',
    goesInWhenAnkiOpens: 'Anki 打开后会自动添加',
    alreadyAdded: '已经添加过了',
    alreadyInAnki: '已在 Anki 中',
    waitingForAnkiToOpen: '正在等待 Anki 打开',
    addedWithWarning: (said: string, warning: string): string => `${said}——${warning}`,

    // The deck menu
    otherDecks: '其他牌组',
    addToAnotherDeck: '添加到其他牌组',
    decksUnknown: 'Anki 没有响应，暂时无法获取牌组。',
    newDeck: '新建牌组…',
    newDeckPrompt: '新建牌组——用 :: 表示子牌组，例如：日语::Netflix',

    // The marks
    knownButton: '已掌握',
    trackButton: '关注',
    ignoreButton: '忽略',
    markKnownTip: '标为已掌握',
    trackTip: '关注',
    ignoreTip: '忽略',
    unmarkKnownTip: '取消已掌握',
    stopTrackingTip: '取消关注',
    stopIgnoringTip: '取消忽略',
  },

  header: {
    knownStat: '{percent} 已掌握',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: '已掌握的单词',
    readyStat: '{count} 句适合学习',
    readyTip: '只有一个生词的句子',
    blurSubtitle: '模糊字幕',
    unblurSubtitle: '取消模糊字幕',
    showTranslation: '显示翻译',
    hideTranslation: '隐藏翻译',
    transcript: '侧边栏',
    pinHeader: '固定顶栏',
    unpinHeader: '取消固定顶栏',
    settings: '设置',
    showHeader: '显示顶栏',
    showHeaderLabel: '显示顶栏',
  },

  player: {
    // The player's keys, said in a flash
    lastLine: '已经是最后一句了',
    noLineBefore: '前面没有字幕了',
    translationOn: '已显示翻译',
    translationOff: '已隐藏翻译',
    blurOn: '字幕已模糊，指针移上去才显示',
    blurOff: '字幕已取消模糊',
    lineSaved: '已收藏此句',
    lineUnsaved: '已取消收藏',
    lookUpFirst: '请先查一个单词',
    alreadyKnown: (word: string): string => `${word} · 在 Anki 中已掌握`,
    alreadyInAnki: (word: string): string => `${word} · 已在 Anki 中`,
    adding: (word: string): string => `正在添加 ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Marks
    markOff: (word: string): string => `${word} · 已取消标记`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = { known: '已标为已掌握', tracking: '已关注', ignored: '已忽略', unknown: '已标为生词' }[status];
      if (refused) return `${word} · ${done}，未制作卡片——Anki 拒绝了此标记，稍后会重试`;
      return `${word} · ${done}，未制作卡片${status === 'tracking' ? '。可在侧边栏的“已关注”列表中查看' : ''}`;
    },

    // A word's card
    pickDeck: '请先在 Libregaku 设置中选择牌组',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `已添加到“${deck}”，但没有${without(missing)}` : `已添加到“${deck}”`,
    alreadyIn: (deck: string): string => `已在“${deck}”中`,
    queued: (deck: string): string => `Anki 未打开——打开后会添加到“${deck}”`,
    alreadyQueued: '已在等待 Anki',
    notKept: 'Anki 未打开，浏览器也无法暂存这张卡片',
    takenBack: (deck: string): string => `已从“${deck}”中撤回`,
    unqueued: '已撤销，不再等待 Anki',
    alreadySent: '已经添加到 Anki 了',
    queueSent: (count: number): string =>
      `Anki 已打开——已添加${count === 1 ? '暂存的卡片' : `暂存的 ${count} 张卡片`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `已掌握单词来自“${scope}”，所以“${deck}”中的卡片不会计入`,

    // A sentence card
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `句子已添加到“${deck}”，但没有${without(missing)}` : `句子已添加到“${deck}”`,
    sentenceAlreadyIn: (deck: string): string => `这个句子已在“${deck}”中`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && '音频', picture && '截图'].filter(Boolean);
      return `Anki 未打开——打开后句子会添加到“${deck}”${lacking.length ? `，但不含${lacking.join('和')}` : ''}`;
    },
    sentenceAlreadyQueued: '这个句子已在等待 Anki',
    sentenceTakenBack: (deck: string): string => `句子已从“${deck}”中撤回`,

    // Making a card's sentence audio
    recording: '正在录制本句…',

    // Lookups
    noDictionary: '暂时还没有这种语言的词典。',
  },

  notices: {
    // The card itself
    unexpected: 'Libregaku 遇到了意外问题。',
    dismiss: '关闭',

    // Titles: YouTube or Netflix changed something the extension reads
    youtubeTrackList: '无法读取 YouTube 的字幕列表。',
    youtubeTrackShape: 'YouTube 的字幕数据格式与预期不符。',
    youtubeCaptionText: '在页面上找不到 YouTube 的字幕文本。',
    youtubePlayerTrackList: '无法从 YouTube 播放器读取此视频的字幕列表。',
    netflixTrackList: '无法读取 Netflix 的字幕列表。',
    netflixCaptionText: '在页面上找不到 Netflix 的字幕文本。',
    disneyTrackList: '无法读取 Disney+ 的字幕列表。',
    disneyCaptionText: '在页面上找不到 Disney+ 的字幕文本。',
    primeTrackList: '无法读取 Prime Video 的字幕列表。',
    primeCaptionText: '在页面上找不到 Prime Video 的字幕文本。',
    maxTrackList: '无法读取 Max 的字幕列表。',
    maxCaptionText: '在页面上找不到 Max 的字幕文本。',
    netflixBlocked: 'Netflix 阻止了 Libregaku 中读取字幕的部分。',

    // Titles: this video's subtitles
    subtitlesOff: '在播放器中打开字幕，Libregaku 就能读取。',
    noTargetTrack: '此视频没有你正在学习的语言的字幕。',
    noSecondTrack: '此视频没有你母语的字幕，因此无法显示翻译。',
    onlyOneTrack: '此视频只有一种字幕，因此无法显示翻译。',
    autoGenerated: '这些字幕是自动生成的，措辞和分词会比较粗糙。',
    noSubtitles: '此视频没有字幕。',
    secondTrackFailed: '无法加载翻译字幕。',

    // Titles: the extension's own parts
    analyserUnavailable: '读音和原形识别已关闭：语言分析器未能加载。单词只能按完全相同的写法与卡片匹配。',
    markNotSaved: '无法保存该标记。它在重新加载页面前有效，之后会丢失。',
    marksNotSynced: '无法将标记保存到 Anki。标记已保存在此浏览器中，稍后会重试。',
    cardsNotAdded: 'Anki 没有接受部分在关闭期间暂存的卡片。这些卡片仍会保留，稍后重试。',

    // Details
    playerNeverLoaded: '播放器一直没有加载完成。',
    subtitlesMaybeOff: '可能只是播放器中的字幕没有打开。',
    lookedFor: (selector: string): string => `已查找：${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `此视频的字幕语言：${languages.join('、') || '无'}。请在设置中更改学习语言，或换一个视频。`,
    onlyPictures: '此视频的字幕只有图片形式，不是文字，Libregaku 无法读取。',
    noHumanTrack: '此视频没有人工制作的字幕。',
    secondTrackError: (track: string, error: string): string => `${track}：${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `此视频的字幕语言：${languages.join('、')}。`,
    analyserDidNotLoad: '分析器未加载',
  },

  anki: {
    // Reaching AnkiConnect
    offline: (port: number): string => `端口 ${port} 上没有程序在监听。`,
    timeout: (port: number, seconds: number): string =>
      `端口 ${port} 在 ${seconds} 秒内没有响应。Anki 可能正忙（正在同步或显示对话框），或者有其他程序占用了该端口。`,
    blocked: (origin: string): string =>
      `AnkiConnect 拒绝了 ${origin}。请在 Anki 中打开“工具 → 插件 → AnkiConnect → 插件设置”，` +
      '将这个地址添加到 webCorsOriginList。',
    httpAnswer: (port: number, status: number): string =>
      `端口 ${port} 上的程序返回了 HTTP ${status}。AnkiConnect 不会这样响应。`,
    notAnkiConnect: (port: number): string => `端口 ${port} 正被 AnkiConnect 以外的程序占用。`,
    noBackground: '扩展的后台没有响应。',
    unreachable: '无法连接 Anki。',
    callFailed: 'AnkiConnect 调用失败。',

    // Libregaku refusing to send Anki something it does not use
    notRelayed: (action: string): string => `Libregaku 不会向 AnkiConnect 发送“${action}”。`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku 只附加自己获取的${MEDIA[media]}。`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `此笔记的${MEDIA[media]}没有数据。`,
    mediaName: (prefix: string): string => `Libregaku 添加的文件名都以 ${prefix} 开头，而这个文件不是。`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} 需要${ids === 'notes' ? '笔记' : '卡片'}列表。`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string => {
      const what = ids === 'notes' ? `笔记中有 ${count} 条` : `卡片中有 ${count} 张`;
      const only = change === 'delete'
        ? '只删除自己的标记，以及最近几分钟内制作、尚未学习过的卡片。'
        : change === 'suspend' ? '只暂停自己的标记。' : '只更改自己标记的标签。';
      return `已拒绝：发送的${what}不属于任何 Libregaku 标记。Libregaku ${only}`;
    },

    // The note types Libregaku makes in Anki
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `你在 Anki 中的“${noteType}”笔记模板缺少字段 ${fields.join('、')}，` +
      `因此${loses === 'cards' ? '卡片' : '笔记'}会丢失这些字段的内容。` +
      'Libregaku 不会改动你可能编辑过的笔记模板：' +
      `请在 Anki 中打开“工具 → 管理笔记模板”，重命名“${noteType}”（或把这些字段加回去），` +
      '然后点击“重新检查”，就会安装一个新的笔记模板。',

    // Marks and waiting cards
    marksNotAdded: (count: number): string => `Anki 有 ${count} 个标记没有添加。它们会留在队列中，下次再试。`,
    marksNotStored: (cause: string): string => `浏览器存储拒绝保存从 Anki 读取的标记：${cause}`,
    storageUnreadable: (cause: string): string => `无法读取浏览器存储：${cause}`,
  },

  errors: {
    // Recording a tab's sound for sentence audio
    captureNotAllowed: '请先在 Libregaku 设置中允许在此网站录制句子音频。',
    captureRefused: 'Chrome 拒绝录制此标签页',

    // A subtitle track that would not load
    unknownTrack: (id: string): string => `未知的字幕轨道 ${id}`,
    noCaptionFormat: (attempts: readonly string[]): string => `所有字幕格式都无法使用——${attempts.join('，')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `所有字幕地址都无法使用——${attempts.join('；') || '未列出地址'}`,
    emptyAnswer: '空响应',
    noCues: '0 条字幕',
    noCuesParsed: '解析出 0 条字幕',
    noAnswerWithin: (seconds: number): string => `${seconds} 秒内无响应`,

    // A track's name in the toolbar popup's subtitle menus, and in notices
    forcedTrack: (track: string): string => `${track}（强制）`,

    // The dictionary and the analyser
    noAnswer: '扩展没有响应——刷新页面即可重启',
    analyserLoading: '分析器仍在加载',
    dictionaryLoading: '词典仍在加载',
    lookupFailed: '查询失败',
  },

  grammar: {
    // Tense and politeness
    past: '过去',
    polite: '敬体',

    // Not doing it
    negative: '否定',
    'negative intent': '否定意志',
    without: '不…就',

    // If and when
    conditional: '假定',
    whenever: '一…就',

    // Who does it, and whether it can be done
    passive: '被动态',
    'passive or potential': '被动/可能',
    potential: '可能态',
    causative: '使役态',

    // Wanting
    'want to': '愿望',
    'seems to want to': '他人愿望',
    'want someone to': '希望他人做',

    // How the speaker knows it, and how sure they are
    seems: '样态',
    'seems like': '好像',
    hearsay: '传闻',
    apparently: '推断',
    probably: '推测',
    might: '也许',

    // What should happen, or is meant to
    'ought to': '应当',
    'supposed to': '理应',
    'intends to': '打算',

    // Having to, and being allowed to
    must: '必须',
    'must not': '禁止',
    "don't have to": '不必',
    may: '许可',

    // Commands, requests and "let's"
    imperative: '命令形',
    volitional: '意志形',
    'polite command': '礼貌命令',
    please: '请求',

    // Joining to what comes next
    'te-form': 'て形',
    listing: '列举',
    while: '一边',
    because: '因为',
    'even though': '尽管',
    'in order to': '为了',
    'so that': '以便',

    // Helper verbs after the te-form
    ongoing: '持续',
    'resulting state': '结果状态',
    'completely, or regrettably': '完成/遗憾',
    'in advance': '事先',
    'try doing': '尝试',
    'going forward': '…下去',
    'coming to be': '…起来',
    'receive the favour': '请人做',
    'someone does for me': '为我做',
    'do for someone': '为人做',

    // Helper verbs after the verb's stem
    'too much': '过于',
    'easy to': '容易',
    'hard to': '难以',
    'start to': '开始',
    'keep on': '继续',
    finish: '做完',
    again: '重新',
    'each other': '互相',
    completely: '彻底',
    thoroughly: '深入',
    around: '到处',
    'non-stop': '不停',

    // Forms of a Spanish word
    or: '或',
    'first-person': '第一人称',
    'second-person': '第二人称',
    'third-person': '第三人称',
    singular: '单数',
    plural: '复数',
    masculine: '阳性',
    feminine: '阴性',
    present: '现在时',
    preterite: '简单过去时',
    imperfect: '过去未完成时',
    'imperfect-se': '过去未完成时（-se）',
    future: '将来时',
    'conditional-mood': '条件式',
    indicative: '陈述式',
    subjunctive: '虚拟式',
    infinitive: '原形动词',
    gerund: '副动词',
    participle: '分词',
    formal: '正式',
    informal: '非正式',
    'with-tú': '用于 tú',
    'with-vos': '用于 vos',
    'vos-form': 'vos 形式',
    voseo: 'voseo',
    'second-person-semantically': '意指“您”',
    accusative: '带直接宾语',
    dative: '带间接宾语',
    'object-first-person': '第一人称宾语',
    'object-second-person': '第二人称宾语',
    'object-third-person': '第三人称宾语',
    'object-singular': '单数宾语',
    'object-plural': '复数宾语',
    diminutive: '指小词',
    augmentative: '指大词',
    superlative: '最高级',
    alternative: '变体',
    'alt-of': '另一种拼写',

    // Korean endings
    honorific: '尊敬',
    'future or guess': '意志/推测',
    'formal polite': '格式体敬语',
    question: '疑问',
    but: '转折',
    "let's": '共动',
    plain: '简体',
    'shall we, or I wonder': '提议/自问',
    'I will': '承诺',
    'just noticed': '感叹',
    'as you know': '不是…嘛',
    and: '并列',
    'because, or and then': '原因/先后',
    'but, or given that': '转折/背景',
    'even if': '即使',
    whether: '是否',
    'adverb form': '副词形',
    quoting: '引用',
    'used to': '回想',
    topic: '主题',
    subject: '主语',
    object: '宾语',
    possessive: '属格',
    'come to': '变成',
    when: '…时',
    modifier: '定语',
    'noun form': '名词形',
    becomes: '变得',
    'have done before': '经历',
  },
};
