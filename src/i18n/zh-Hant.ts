import type { Translation } from '.';
import type { Settings } from '../settings';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';

/** The three furigana and pinyin settings, as the bar, the player and the keys name them. */
const RUBY: Record<Settings['ruby'], string> = { unknown: '生詞', always: '全部', never: '關閉' };

/** What a card went in without, for player.added and player.sentenceAdded. */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted' ? '句子音訊（點選 Libregaku 圖示即可在此錄製）' : '句子音訊'))
    .join('或');

/** A card's media, as anki.mediaNotFetched and anki.mediaEmpty name it. */
const MEDIA: Record<'audio' | 'video' | 'picture', string> = { audio: '音訊', video: '影片', picture: '圖片' };

/** The interface in Chinese, Traditional. Anything left out shows in English. */
export const zhHant: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `振假名：${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `拼音：${RUBY[mode]}`,
    mandarin: '普通話',
    jyutping: (mode: Settings['ruby']): string => `Jyutping：${RUBY[mode]}`,
    sentenceGap: '',
  },

  settings: {
    // Languages
    languagesHeading: '語言',
    languagesAbout: '選擇學習語言和母語。',
    target: '學習語言',
    targetLimited: (language: string): string => `${language}（有限支援）`,
    supportFull: '完整支援，包括讀音和振假名。',
    supportPinyin: '完整支援，包括拼音。釋義為英文。',
    supportJyutping: '完整支援，包括 Jyutping。釋義為英文。',
    supportWords: '完整支援。釋義為英文。',
    script: '文字',
    scriptHint: '影片兩種都有時，使用這一種。',
    supportBasic: '基本支援：可以分詞，但還沒有字典和讀音。',
    native: '母語',
    nativeHint: '影片和字典有提供時，翻譯和釋義會以這個語言顯示。',
    definitions: '釋義語言',
    definitionsHint: '字典沒有你母語的釋義，因此改用這個語言顯示。',
    definitionsHintFor: (language: string): string => `字典沒有${language}的釋義，因此改用這個語言顯示。`,

    // Looking words up
    lookupHeading: '查詢單字',
    lookupAbout: '選擇查詢單字的方式和時機。',
    interaction: '查詢方式',
    interactionHover: '游標停留',
    interactionShift: '按住 Shift 並停留',
    interactionClick: '點選',
    interactionHint: '點選單字也隨時可以查詢。',
    hoverPause: '查詢時暫停',
    hoverPauseHint: '游標停在單字上時暫停影片。',
    sidebarHover: '轉錄稿快速釋義',
    sidebarHoverHint: '游標指向轉錄稿中的單字時，顯示簡短釋義。',

    // Word popup
    popupHeading: '單字視窗',
    popupAbout: '選擇查詢單字時，視窗要顯示哪些內容。',
    cardMarks: '已知和忽略按鈕',
    cardMarksHint: '「已知」會隱藏單字的底線；「忽略」會將單字排除在統計之外。兩者都不會新增卡片。',
    cardTrack: '追蹤按鈕',
    cardTrackHint: '為想留意的單字加上紫色底線，不會新增卡片。',
    cardDeckMenu: '牌組選單',
    cardDeckMenuHint: '在「新增至 Anki」旁加上 ▾，可選擇其他牌組。之後的新卡片會加入該牌組。',
    cardHideAdd: '隱藏「新增至 Anki」',
    cardHideAddHint: '從卡片上移除「新增至 Anki」按鈕及其旁邊的牌組選單。',
    cardAddLine: '句子卡片',
    cardAddLineHint: '加上一個按鈕，可將整句製成卡片，並附上音訊和螢幕截圖。',
    cardKanji: '漢字解析',
    cardKanjiHint: '顯示每個漢字的意思和讀音。',
    cardHanzi: '逐字解析',
    cardHanziHint: '顯示每個字的意思和讀音。',
    lookupElsewhere: '影片中的例句',
    lookupElsewhereHint: '顯示這部影片中其他用到這個單字的句子。點選即可播放。',

    // Subtitles
    subtitlesHeading: '字幕',
    subtitlesAbout: '調整字幕在影片上的外觀。',
    ruby: '振假名',
    rubyUnknown: RUBY.unknown,
    rubyAlways: RUBY.always,
    rubyNever: RUBY.never,
    rubyHint: '在漢字上方標示讀音。觀看時按 R 切換。',
    pinyin: '拼音',
    pinyinHint: '在漢字上方標示讀音。觀看時按 R 切換。',
    jyutping: 'Jyutping',
    jyutpingHint: '在漢字上方標示讀音。觀看時按 R 切換。',
    blurPrimary: '模糊字幕',
    blurPrimaryHint: '用於聽力練習：字幕會保持模糊，游標指向時才顯示。按 H 切換。',
    subtitleSize: '文字大小',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: '隨播放器縮放，全螢幕時看起來也一樣。',
    subtitleBottom: '位置',
    subtitleBottomLowest: '最低',
    subtitleBottomLow: '低',
    subtitleBottomNormal: '標準',
    subtitleBottomRaised: '稍高',
    subtitleBottomHigh: '高',
    subtitleBottomHighest: '最高',
    subtitleBottomHint: '字幕的高度。同一播放器上其他字幕擴充功能的字幕會顯示在下方。',
    dualSubtitles: '顯示翻譯',
    dualSubtitlesHint:
      '在學習語言的字幕下方，顯示母語字幕。這些字幕來自網站本身，不是機器翻譯，而且影片需要有完整的轉錄稿。',
    singleKeys: '單鍵快速鍵',
    singleKeysHint: 'A、R 等字母鍵在觀看時可單獨使用。關閉時，需同時按住 Alt 和 Shift。方向鍵一律可用。',

    // Underlines
    underlinesHeading: '底線',
    underlinesAbout: '每種顏色代表你對單字的熟悉程度。點選即可變更。',
    colorUnknown: '生詞',
    colorUnknownHint: '在 Anki 中沒有卡片的單字。',
    colorLearning: '學習中',
    colorLearningHint: '卡片尚未熟練的單字。',
    colorTracking: '追蹤中',
    colorTrackingHint: '正在追蹤的單字。',
    colorKnown: '已知',
    colorKnownHint: '卡片已熟練，或標為已知的單字。',
    underlines: '為單字加底線',
    underlinesHint: '關閉後顯示一般字幕，單字下方沒有顏色。',
    markKnown: '已知單字加底線',
    markKnownHint: '預設為關閉，學得越多，畫面就越清爽。',
    defaultColours: '預設顏色',
    resetColours: '重設',

    // Transcript
    transcriptHeading: '轉錄稿',
    transcriptAbout: '影片旁列出每一句字幕的面板。',
    sidebarFollow: '隨影片捲動',
    sidebarFollowHint: '讓目前的句子保持在畫面中。自行捲動時會暫停，按下按鈕即可恢復。',
    headerBar: '顯示頂端列',
    headerBarHint: '游標靠近影片頂端時顯示。',
    languageBadge: '語言徽章',
    languageBadgeFlag: '國旗',
    languageBadgeCode: '代碼',
    badgeFlag: '徽章國旗',
    badgeFlagDefault: '預設',
    flagSearch: '搜尋…',
    flagSearchLabel: '搜尋國家/地區',
    flagSuggested: '建議',
    flagAll: '所有國家/地區',
    flagNone: (query: string): string => `找不到符合「${query}」的國家/地區。`,
    badgeFlagHint: '代表學習語言的國旗。每種語言分別儲存。',
    languageBadgeHint: '頂端列顯示學習語言的方式。',
    sidebarStats: '統計生詞',
    sidebarStatsHint: '顯示每一句的生詞數、已知單字比例，以及使用這些數字的篩選器。',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: '連接 Anki，選擇新卡片要加入的牌組，以及哪些牌組算作已知單字。',
    deck: '新卡片牌組',
    deckHint: '每張新卡片都會加入這個牌組。',
    statusScope: '已知單字來源',
    statusScopeHint: '這些牌組中的卡片會決定哪些單字加底線。包括子牌組。',
    marksInAnki: '將標記存入 Anki',
    marksInAnkiHint:
      '將「已知」、「追蹤」和「忽略」以隱藏筆記的形式存入 Anki（Libregaku::Marks），同步到你的其他裝置。' +
      '關閉時，標記只會保留在這個瀏覽器中。',

    // The deck menus
    wholeCollection: '整個集合',
    chooseDeck: '選擇牌組…',
    deckNotInAnki: (deck: string): string => `${deck}（不在 Anki 中）`,
    deckAndSubdecks: (deck: string): string => `${deck}（含子牌組）`,
    deckUnset: '請選擇牌組。選擇之前無法新增卡片。',
    deckMissing: (deck: string): string => `Anki 中已經沒有名為「${deck}」的牌組。請選擇其他牌組。`,
    statusScopeMissing: (deck: string): string =>
      `Anki 中已經沒有名為「${deck}」的牌組，因此所有單字都會顯示為生詞。請選擇其他牌組。`,
    statusScopeOutside: (deck: string): string =>
      `新卡片會加入「${deck}」，但這裡沒有包含這個牌組，因此你新增的單字會一直以生詞加底線。` +
      '請選擇包含它的牌組，或選擇「整個集合」。',

    // Where Anki stands: whole sentences, one after another
    ankiChecking: '檢查中…',
    ankiConnected: '已連線。',
    noteTypeInstalled: '已安裝筆記類型。',
    cardsMade: (n: number): string => `已用 Libregaku 製作 ${n} 張卡片。`,
    noCards: '尚無卡片。',
    cardsFlushed: (n: number): string => `已新增 ${n} 張在 Anki 關閉時製作的卡片。`,
    // Sentences here follow one another with nothing between, so this one ends as a sentence whatever the error says.
    cardsNotFlushed: (n: number, error: string): string =>
      `${n} 張卡片無法新增：${error}${/[。．.!?！？]$/.test(error) ? '' : '。'}`,
    cardsWaiting: (n: number): string => `${n} 張卡片等待新增。`,
    ankiOffline: (port: number): string =>
      `Anki 沒有在連接埠 ${port} 上回應。Anki 關閉時這是正常的：新卡片會在這裡等待，Anki 開啟後就會新增。`,
    ankiBlocked: 'Anki 正在執行，但 AnkiConnect 尚未允許這個擴充功能。',
    ankiOccupied: (detail: string): string => `${detail}請關閉佔用這個連接埠的程式，讓 Anki 可以使用。`,

    // The Anki buttons
    checkAgain: '重新檢查',
    newDeck: '新增牌組',
    openCards: '在 Anki 中開啟卡片',
    openMarks: '在 Anki 中開啟標記',
    newDeckPrompt: '為新牌組命名。用 :: 表示子牌組，例如：日文::Netflix',

    // Connecting Anki
    installStep: '在這台電腦上安裝並開啟 Anki。{link}',
    getAnki: '取得 Anki',
    addonStep: '在 Anki 中前往 {menu}，貼上這個代碼，然後重新啟動 Anki。',
    addonMenu: '工具 → 附加元件 → 取得附加元件…',
    aboutAnkiConnect: '關於 AnkiConnect',
    originStep: '在 Anki 中前往 {menu}，將這一行加入 {setting}，然後重新啟動 Anki。',
    originMenu: '工具 → 附加元件 → AnkiConnect → 設定',
    runningStep: '觀看時請保持 Anki 開啟。卡片會直接加入這台電腦上的 Anki。',
    copy: '複製',
    copyValue: (value: string): string => `複製 ${value}`,
    copied: '已複製',
    copyFailed: '請手動選取',

    // Anki cards
    ankiCardsHeading: 'Anki 卡片',
    ankiCardsAbout: '除了單字、讀音、意思和句子之外，選擇每張新卡片還要加入哪些內容。',
    cardAudio: '單字音訊',
    cardAudioHint: '單字的錄音（如果有的話）。絕不使用合成語音。',
    cardSentenceAudio: '句子音訊',
    cardSentenceAudioHint: '將句子再播放一次來錄音。在受保護的網站上需要下方的權限。',
    cardScreenshot: '螢幕截圖',
    cardScreenshotHint: '場景的靜態畫面。受保護的網站會封鎖截圖，因此在這些網站上無法使用。',
    capture: '受保護的網站上的句子音訊',
    captureAllow: '允許',
    captureAllowInSettings: '在設定中允許',
    captureRemove: '移除',
    captureAllowed: '已允許。在受保護的網站的每個分頁中，點選 Libregaku 圖示，然後選擇「在此錄製句子音訊」。',
    captureNeeded: '受保護的網站會加密影片，因此句子音訊是從分頁錄製。這需要你的許可。',

    // Data and licences
    creditsHeading: '資料與授權',
    creditJmdict:
      '字典和漢字資料 © Electronic Dictionary Research and Development Group，依 CC BY-SA 4.0 授權使用。' +
      '由 jmdict-simplified 重新封裝為 JSON。',
    creditLindera: '將日文、韓文和中文切分成單字。MIT 授權；IPADIC、mecab-ko-dic 和 CC-CEDICT 各有其授權條款。',
    creditCedict: '中文字典 © MDBG 及其貢獻者，依 CC BY-SA 4.0 授權使用。',
    creditWiktionary:
      '韓文和西班牙文字典，以及部分以你母語釋義的字典，來自 Wiktionary，經由 kaikki.org 和 wiktionary-to-yomitan 轉換。CC BY-SA 4.0。',
    creditKrdict:
      '以你的母語解釋韓文詞語。© National Institute of Korean Language，依 CC BY-SA 2.0 KR 授權使用。檔案由 Lyroxide 製作。',
    creditCfdict: '以法文解釋中文。CFDICT © chine.in，由 CxDICT 持續更新。CC BY-SA 4.0。',
    creditCanto: '粵語字典，以及 CC-CEDICT 詞條的 Jyutping 讀音。© Pleco Inc.，依 CC BY-SA 3.0 授權使用。',
    creditHandedict: '以德文解釋中文。© HanDeDict 及其貢獻者，依 CC BY-SA 3.0 授權使用。',
    creditUnihan: '決定漢字優先顯示哪個讀音。© Unicode, Inc.，依 Unicode License 授權使用。',
    creditJotoba: '字典下載期間用於查詢。兩者都使用 JMdict。',
    creditLucide: '圖示。ISC 授權。',
    creditCommons: '西班牙語、中文和韓語單字的錄音，由志願者朗讀。每段錄音各有授權，多數為 CC BY-SA 4.0，播放時和卡片上會連同朗讀者姓名一併標示。',
    creditAudioCmn: '中文單字錄音，由 Yue Tan（卡昂大學）朗讀。CC BY-SA 3.0 US。',
    creditNaver: '韓語單詞錄音，來自 Naver 詞典，只在查詞卡片中播放。其授權不允許再利用，因此絕不會放進卡片。',
    creditSpanishdict: 'SpanishDict 為西班牙語單詞生成的語音，在沒有錄音時由發音按鈕播放。其授權不允許再利用，因此絕不會放進卡片。',
    licence: 'Libregaku 採用 MIT 授權。字典資料是從各自的來源下載，並未內建。',
    built: (when: string): string => `此版本建置於 ${when}。`,

    // The keyboard shortcuts view
    keyLine: '上一句或下一句',
    keyReplay: '重播這一句',
    keyTranslation: '顯示或隱藏翻譯',
    keyShiftLookup: '按住即可查詢游標所指的單字',
    keyAdd: '將視窗中的單字新增至 Anki',
    keyKnown: '將視窗中的單字標為已知',
    keyFurigana: `切換振假名：${RUBY.never}、${RUBY.unknown}、${RUBY.always}`,
    keyPinyin: `切換拼音：${RUBY.never}、${RUBY.unknown}、${RUBY.always}`,
    keyJyutping: `切換 Jyutping：${RUBY.never}、${RUBY.unknown}、${RUBY.always}`,
    keyBlur: '模糊或取消模糊字幕',
    keySave: '儲存目前的句子',
    keyTranscript: '顯示或隱藏轉錄稿面板',
    keyClose: '關閉單字視窗',
  },

  options: {
    pageTitle: 'Libregaku 設定',
    help: '說明',
    searchSettings: '搜尋…',
    noSettingsFound: '找不到提到「{q}」的內容。',
    contentsLabel: '設定區段',
    settingsLabel: '設定',

    // The first-run checklist
    setupHeading: '開始使用',
    setupAbout: '只要做兩個選擇，其他都有合適的預設值。',
    stepLanguages: '選擇學習語言',
    stepAnki: '連接 Anki，並為新卡片選擇牌組',
    ankiOptional: 'Anki 不是必要的：沒有 Anki，也能使用字幕、查詢和振假名。Anki 的作用是記住你已經會哪些單字。',
    nextSteps: '接著開啟有學習語言字幕的影片，將游標停在單字上。轉錄稿面板中的鍵盤按鈕會列出鍵盤快速鍵。',
    stepDone: '已完成',
    confirmLanguages: '語言設定正確',
    keepDeck: (deck: string): string => `新卡片使用 ${deck}`,
  },

  action: {
    help: '說明',
    settings: '設定',
    settingsTip: '所有設定',

    // What the extension is doing on this page
    checkingPage: '正在檢查這個網頁…',
    notActive: '未在這個網頁上啟用。請開啟 YouTube、Netflix、Disney+、Prime Video 或 Max 影片。如果剛安裝或重新載入 Libregaku，請重新載入分頁。',
    unsupported: 'Libregaku 適用於 YouTube、Netflix、Disney+、Prime Video 和 Max。',
    waitingForSubtitles: (site: string): string => `正在等待 ${site} 的字幕。請確認字幕已開啟。`,
    activeOn: (title: string): string => `已啟用：${title}`,
    active: '已在這部影片上啟用。',

    // The subtitle tracks
    subtitlesTrack: '字幕',
    translationTrack: '翻譯',
    noTranslation: '無',
    generatedTrack: (track: string): string => `${track}（自動產生）`,

    // Sentence audio on Netflix
    captureNeedsPermission: '要在這裡錄製句子音訊，需要擷取這個分頁聲音的權限。',
    captureAllowInSettings: '在設定中允許',
    captureReady: '必須先為這個分頁開啟錄製，才能錄下受保護的網站上的聲音。',
    captureStart: '在此錄製句子音訊',
    captureFailed: 'Chrome 無法錄製這個分頁。',

    toggleSidebar: '切換側邊欄',

    // Anki, in one line at the foot
    ankiChecking: 'Anki：檢查中…',
    ankiConnected: (n: number): string => `Anki 已連線 · ${n} 張卡片來自 Libregaku`,
    ankiOffline: 'Anki 未執行，單字都會顯示為生詞',
    ankiOccupied: (port: number): string => `其他程式正在使用連接埠 ${port}，因此無法連線至 Anki`,
    ankiBlocked: 'Anki 拒絕了這個擴充功能，「設定」中有需要加入的那一行',
    ankiBusy: 'Anki 沒有回應，可能正在同步',
    ankiRefused: 'Anki 拒絕了這項要求',
    cardsToAdd: (n: number): string => `還有 ${n} 張卡片待新增`,
    cardsWaiting: (n: number): string => `${n} 張卡片等待 Anki`,
  },

  sidebar: {
    panelLabel: '轉錄稿面板',
    resizeLabel: '調整面板大小',

    // The tabs, and the icon buttons beside them
    tabsLabel: '清單',
    transcriptTab: '轉錄稿',
    savedTab: '已儲存',
    settings: '設定',
    shortcuts: '鍵盤快速鍵',
    close: '關閉',
    closeLabel: '關閉面板',
    openTip: '轉錄稿',
    openLabel: '顯示轉錄稿',
    help: '說明',

    // Searching the transcript
    searchPlaceholder: '搜尋轉錄稿…',
    searchLabel: '搜尋轉錄稿',
    noMatches: '沒有相符結果',
    matchAt: (at: number, total: number): string => `${at}/${total}`,
    matchesFound: (n: number): string => `找到 ${n} 句`,

    // The filter button and its menu
    filterTip: '篩選',
    filterLabel: '篩選句子',
    filterAll: '所有句子',
    filterAllAbout: '每一句',
    filterNew: '含生詞',
    filterNewAbout: '有單字還沒有卡片的句子',
    filterReady: '適合學習',
    filterReadyAbout: '只有一個生詞的句子，最容易從中學習',
    filterSaved: '已儲存',
    filterSavedAbout: '留待之後再看的句子',

    // The transcript
    partial: '邊看邊建立：這個播放器只提供目前這一句。',
    partialEmpty: '還沒有內容。句子會在說出時出現在這裡。',
    empty: '未載入轉錄稿。',
    currentLine: '目前句子',
    lineNew: (n: number): string => `${n} 個生詞`,
    playFrom: (time: string): string => `從 ${time} 開始播放`,
    saveLine: '儲存句子',
    unsave: '取消儲存',
    addSentence: '新增句子',
    addSentenceLabel: '將句子新增至 Anki',

    // The summary over the transcript
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: '已知 {n}',
    summaryNew: '{n} 個生詞',
    summaryReady: '{n} 句適合學習',
    counting: (percent: number): string => `正在統計生詞… ${percent}%`,
    countFailed: '部分句子無法統計，因此沒有總數。',

    // A word's meaning while the pointer is over it
    dictionaryLoading: (percent: number): string => `字典載入中：${percent}%`,
    dictionaryUnavailable: '無法使用字典',
    noEntry: '查無詞條。',

    // The Saved tab
    savedEmpty: '還沒有儲存任何句子。點選轉錄稿中任一句的書籤（或按 B），就能保留想回頭再看的句子。',
    thisVideo: '這部影片',
    openAt: (time: string): string => `在 ${time} 處開啟影片`,
    remove: '移除',
    removeLabel: '從已儲存中移除',
    copySavedAbout: '將所有已儲存的句子複製為以 Tab 分隔的文字',
    exportSavedAbout: '儲存成 Anki 可匯入、以 Tab 分隔的檔案',
    addSavedAbout: '為每個已儲存的句子製作卡片',
    linesCopied: (n: number): string => `已複製 ${n} 句。`,
    chooseDeck: '請先在「設定」中選擇牌組，新卡片會加入那個牌組。',
    checkingAnki: '正在檢查 Anki…',
    ankiOffline: 'Anki 未執行。請開啟 Anki 後再試一次，步驟請見「設定」。',
    ankiBlocked: 'AnkiConnect 尚未允許這個擴充功能。「設定」中有需要加入的那一行。',
    ankiUnreachable: '無法連線至 Anki。原因請見「設定」。',
    adding: (at: number, total: number): string => `正在新增 ${at}/${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `已將 ${added} 張卡片新增至 ${deck}${already ? `，另有 ${already} 張原本就在` : ''}。`,

    // Buttons and messages the Saved and Words tabs share
    copy: '複製',
    exportFile: '匯出檔案',
    addToAnki: '新增至 Anki',
    noClipboard: '無法存取剪貼簿。',
    downloaded: '已儲存至「下載」資料夾。在 Anki 中選擇「檔案 → 匯入」。',
    downloadBlocked: '這個網頁封鎖了下載，請改用「複製」。',

    // The Words tab
    listsLabel: '選擇清單',
    listLines: '句子',
    listTracked: '追蹤中',
    listKnown: '已知',
    listIgnored: '已忽略',
    findPlaceholder: '搜尋…',
    findLabel: '在這份清單中搜尋',
    copyWordsAbout: '將這份清單複製為以 Tab 分隔的文字',
    exportWordsAbout: '將這份清單儲存成 Anki 可匯入、以 Tab 分隔的檔案',
    wordsCopied: (n: number): string => `已複製 ${n} 個單字。`,
    nothingToExport: '這份清單中沒有可匯出的內容。',
    lookingUp: '正在查詢讀音和意思…',
    noWordMatches: (query: string): string => `這份清單中沒有符合「${query}」的單字。`,
    noLineMatches: (query: string): string => `沒有符合「${query}」的已儲存句子。`,
    wordsMatching: (shown: number, total: number): string => `${total} 個單字中有 ${shown} 個符合。`,
    trackedEmpty: '還沒有追蹤任何單字。「追蹤」會為單字加上底線，讓你注意到它，但不會製作卡片。' +
      '請在「設定」的「單字視窗」中開啟這個按鈕。',
    trackedIntro: (n: number): string => `正在追蹤 ${n} 個單字，出現時都會加上底線。`,
    stopTracking: '取消追蹤',
    knownEmpty: '沒有標為已知的單字。已經會、又不想製作卡片的單字，可以在單字視窗中標為已知，或按 K。',
    knownIntro: (n: number): string => `已將 ${n} 個單字標為已知。取消標記後，單字會回到 Anki 卡片顯示的狀態。`,
    unmarkKnown: '取消已知',
    ignoredEmpty: '沒有已忽略的單字。在人名和語氣詞的單字視窗中點選「忽略」，它們就不會加底線，也不列入統計。',
    ignoredIntro: (n: number): string => `${n} 個單字不加底線，也不列入統計。`,
    stopIgnoring: '取消忽略',
  },

  popup: {
    // The card, and the word at its head
    cardLabel: (word: string): string => `${word}：字典`,
    commonBadge: '常用',
    characterNames: { kanji: '漢字', hanzi: '漢字' },
    partOfSpeech: {
      n: '名詞', 'n-adv': '副詞性名詞', 'n-t': '時間名詞', 'n-suf': '接尾名詞',
      'n-pref': '接頭名詞', pn: '代名詞', 'adj-i': 'い形容詞', 'adj-na': 'な形容詞',
      'adj-no': 'の形容詞', 'adj-pn': '連體詞', adv: '副詞', 'adv-to': '副詞',
      aux: '補助語', 'aux-v': '助動詞', 'aux-adj': '補助形容詞',
      conj: '接續詞', cop: '繫詞', ctr: '助數詞', exp: '慣用語', int: '感嘆詞',
      num: '數詞', prt: '助詞', pref: '接頭語', suf: '接尾語', unc: '未分類',
      vs: 'する動詞', 'vs-i': 'する動詞', 'vs-s': 'する動詞', vt: '他動詞', vi: '自動詞',
      v1: '一段動詞', 'v1-s': '一段動詞', vk: '来る動詞', vz: 'ずる動詞',
      v5b: '五段動詞', v5g: '五段動詞', v5k: '五段動詞', 'v5k-s': '五段動詞',
      v5m: '五段動詞', v5n: '五段動詞', v5r: '五段動詞', 'v5r-i': '五段動詞',
      v5s: '五段動詞', v5t: '五段動詞', v5u: '五段動詞', 'v5u-s': '五段動詞',
      v5aru: '五段動詞',
      // 維基詞典的詞類代碼，用於韓語和西班牙語單字。
      name: '專有名詞', v: '動詞', adj: '形容詞', pron: '代名詞', det: '限定詞', artic: '冠詞', counter: '量詞', prep: '介系詞',
      'prep-phrase': '介系詞片語', ptcl: '助詞', intj: '感嘆詞', phrase: '片語', prov: '諺語', r: '詞根', char: '字元', adn: '冠形詞',
      ptcpl: '分詞', contr: '縮合詞', masc: '陽性', fem: '陰性', neut: '中性', sg: '單數', pl: '複數', 'pl-only': '僅複數',
      count: '可數', uncount: '不可數', vr: '反身', vdt: '雙及物', impers: '無人稱', irreg: '不規則', reltnl: '關係形容詞', reltv: '關係詞',
      interr: '疑問', poss: '所有格', dim: '指小', aug: '指大', onoma: '擬聲', idio: '慣用', fig: '比喻', literal: '字面', col: '口語',
      inf: '非正式', fam: '親暱', formal: '正式', polite: '禮貌', lit: '書面', poet: '詩歌', rhet: '修辭', sl: '俚語', vulg: '粗俗',
      derog: '貶義', offens: '冒犯', humor: '詼諧', euph: '委婉', child: '兒語', net: '網路', neol: '新詞', cmn: '常用',
      uncmmn: '不常用', rare: '罕見', dated: '舊式', arch: '古語', obs: '廢語', hist: '歷史', 'non-std': '非標準', dialect: '方言',
      regio: '地區用語',
    },

    // The row of icon buttons under the word
    pronounce: '發音',
    playedRecording: (word: string): string => `${word} · 真人錄音`,
    playedSynthesised: (word: string): string => `${word} · 合成語音`,
    recordingBy: (speaker: string, licence: string): string => `錄音：${speaker} · ${licence}`,
    pronounceFailed: '無法播放音訊',
    addSentence: '新增句子',
    sentenceAdded: '已新增句子',
    undo: '復原',
    copyWord: '複製單字',
    copyPhrase: '複製片語',
    copySentence: '複製句子',
    wordCopied: '已複製單字',
    phraseCopied: '已複製片語',
    sentenceCopied: '已複製句子',
    copyFailed: '無法複製，請改為選取文字',

    // The meanings
    dictionaryLoading: (percent: number): string => `字典仍在載入（${percent}%），請稍後再試。`,
    dictionaryUnavailable: (error: string): string => `無法使用字典：${error}`,
    noEntry: '字典中沒有這個單字。',
    moreMeanings: (n: number): string => `還有 ${n} 個意思`,

    // The word's other lines in this video
    elsewhereCount: (n: number): string => `這部影片中還出現 ${n} 次`,
    playLine: '播放',
    elsewhereMore: (n: number): string => `還有 ${n} 句，用轉錄稿的搜尋就能全部找到`,
    showAllInTranscript: '在轉錄稿中顯示全部',

    // Add: the wide button at the foot of the card
    addToAnki: '新增至 Anki',
    addToDeck: (deck: string): string => `新增至 ${deck}`,
    adding: '新增中…',
    undoing: '復原中…',
    added: '已新增',
    addedUndo: '已新增——復原',
    inAnki: '已在 Anki 中',
    showInAnki: '在 Anki 中顯示',
    waiting: '等待中',
    waitingForAnki: '等待 Anki',
    goesInWhenAnkiOpens: 'Anki 開啟後就會新增',
    alreadyAdded: '已經新增了',
    alreadyInAnki: 'Anki 中已經有了',
    waitingForAnkiToOpen: '正在等待 Anki 開啟',
    addedWithWarning: (said: string, warning: string): string => `${said}——${warning}`,

    // The deck menu
    otherDecks: '其他牌組',
    addToAnotherDeck: '新增至其他牌組',
    decksUnknown: 'Anki 沒有回應，因此還無法取得牌組。',
    newDeck: '新增牌組…',
    newDeckPrompt: '新牌組：用 :: 表示子牌組，例如：日文::Netflix',

    // The marks
    knownButton: '已知',
    trackButton: '追蹤',
    ignoreButton: '忽略',
    markKnownTip: '標為已知',
    trackTip: '追蹤',
    ignoreTip: '忽略',
    unmarkKnownTip: '取消已知',
    stopTrackingTip: '取消追蹤',
    stopIgnoringTip: '取消忽略',
  },

  header: {
    knownStat: '已知 {percent}',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: '已知單字',
    readyStat: '{count} 句適合學習',
    readyTip: '只有一個生詞的句子',

    blurSubtitle: '模糊字幕',
    unblurSubtitle: '取消模糊字幕',
    showTranslation: '顯示翻譯',
    hideTranslation: '隱藏翻譯',
    translation: '翻譯',
    transcript: '轉錄稿',
    pinHeader: '固定頂端列',
    unpinHeader: '取消固定頂端列',
    settings: '設定',

    showHeader: '顯示頂端列',
  },

  player: {
    // The player's keys, said in a flash
    lastLine: '已經是最後一句',
    noLineBefore: '前面沒有句子',
    translationOn: '已顯示翻譯',
    translationOff: '已隱藏翻譯',
    blurOn: '字幕已模糊，游標移上去才會顯示',
    blurOff: '已顯示字幕',
    lineSaved: '已儲存句子',
    lineUnsaved: '已取消儲存句子',
    lookUpFirst: '請先查詢單字',
    alreadyKnown: (word: string): string => `${word} · 在 Anki 中已是已知單字`,
    alreadyInAnki: (word: string): string => `${word} · 已在 Anki 中`,
    adding: (word: string): string => `正在新增 ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Marks
    markOff: (word: string): string => `${word} · 已取消標記`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = { known: '已標為已知', tracking: '已追蹤', ignored: '已忽略', unknown: '已標為生詞' }[status];
      if (refused) return `${word} · ${done}，未製作卡片。Anki 拒絕了這個標記，稍後會再試一次`;
      return `${word} · ${done}，未製作卡片${status === 'tracking' ? '。請見面板的「已儲存」分頁' : ''}`;
    },

    // A word's card
    pickDeck: '請先在 Libregaku 設定中選擇牌組',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `已新增至 ${deck}，但沒有${without(missing)}` : `已新增至 ${deck}`,
    alreadyIn: (deck: string): string => `已在 ${deck} 中`,
    queued: (deck: string): string => `Anki 已關閉，開啟後會新增至 ${deck}`,
    alreadyQueued: '已在等待 Anki',
    notKept: 'Anki 已關閉，瀏覽器也無法暫存這張卡片',
    takenBack: (deck: string): string => `已從 ${deck} 撤回`,
    unqueued: '已不再等待 Anki',
    alreadySent: '已經新增至 Anki 了',
    queueSent: (count: number): string =>
      `Anki 已開啟，${count === 1 ? '已新增先前保留的卡片' : `已新增先前保留的 ${count} 張卡片`}`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `已知單字是從 ${scope} 讀取，因此 ${deck} 中的卡片不會列入計算`,

    // A sentence card
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `句子已新增至 ${deck}，但沒有${without(missing)}` : `句子已新增至 ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `這個句子已在 ${deck} 中`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && '音訊', picture && '螢幕截圖'].filter(Boolean);
      return `Anki 已關閉，開啟後句子會新增至 ${deck}${lacking.length ? `，但不含${lacking.join('和')}` : ''}`;
    },
    sentenceAlreadyQueued: '這個句子已在等待 Anki',
    sentenceTakenBack: (deck: string): string => `句子已從 ${deck} 撤回`,

    // Sentence audio
    recording: '正在錄製這一句…',

    // Lookups
    noDictionary: '這個語言目前還沒有字典。',
  },

  notices: {
    // The card itself
    unexpected: 'Libregaku 發生未預期的問題。',
    dismiss: '關閉',

    // YouTube or Netflix changed something the extension reads
    youtubeTrackList: '無法讀取 YouTube 的字幕清單。',
    youtubeTrackShape: 'YouTube 的字幕資料格式和預期不同。',
    youtubeCaptionText: '在網頁上找不到 YouTube 的字幕文字。',
    youtubePlayerTrackList: '無法從 YouTube 播放器讀取這部影片的字幕清單。',
    netflixTrackList: '無法讀取 Netflix 的字幕清單。',
    netflixCaptionText: '在網頁上找不到 Netflix 的字幕文字。',
    disneyTrackList: '無法讀取 Disney+ 的字幕清單。',
    disneyCaptionText: '在網頁上找不到 Disney+ 的字幕文字。',
    primeTrackList: '無法讀取 Prime Video 的字幕清單。',
    primeCaptionText: '在網頁上找不到 Prime Video 的字幕文字。',
    maxTrackList: '無法讀取 Max 的字幕清單。',
    maxCaptionText: '在網頁上找不到 Max 的字幕文字。',
    netflixBlocked: 'Netflix 封鎖了 Libregaku 讀取字幕的元件。',

    // This video's subtitles
    subtitlesOff: '請在播放器中開啟字幕，Libregaku 就會讀取。',
    trackNotSent: '播放器尚未載入這些字幕。',
    noTargetTrack: '這裡沒有你所學語言的字幕。',
    noSecondTrack: '這裡沒有母語字幕，因此無法顯示第二行。',
    onlyOneTrack: '這部影片只有一條字幕軌，因此無法顯示第二行。',
    autoGenerated: '這些字幕是自動產生的，用字和斷詞會比較粗糙。',
    noSubtitles: '這部影片沒有字幕。',
    secondTrackFailed: '無法載入第二行字幕。',

    // The extension's own parts
    analyserUnavailable: '讀音和辭書形已關閉：語言分析器未能載入。單字只會依完全相同的寫法對應你的卡片。',
    markNotSaved: '無法儲存這個標記。重新載入前仍會生效，之後就會消失。',
    marksNotSynced: '無法將標記儲存到 Anki。標記會保留在這個瀏覽器中，稍後會再試一次。',
    cardsNotAdded: 'Anki 關閉期間保留的卡片中，有些未被 Anki 接受。這些卡片仍會保留，稍後會再試一次。',

    // Details
    playerNeverLoaded: '播放器一直沒有載入完成。',
    subtitlesMaybeOff: '可能只是播放器中的字幕已關閉。',
    lookedFor: (selector: string): string => `已尋找：${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `這部影片有：${languages.join('、') || '無'}。請在設定中變更學習語言，或選擇其他影片。`,
    onlyPictures: '這部影片的字幕只有圖片形式，不是文字，Libregaku 無法讀取。',
    chooseInPlayer: (track: string): string => `請在播放器的字幕選單中選擇「${track}」，Libregaku 就會讀取。`,
    noHumanTrack: '這部影片沒有人工撰寫的字幕軌。',
    secondTrackError: (track: string, error: string): string => `${track}：${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `這部影片有：${languages.join('、')}。`,
    analyserDidNotLoad: '分析器未載入',
  },

  anki: {
    // Reaching AnkiConnect
    offline: (port: number): string => `連接埠 ${port} 上沒有程式在接聽。`,
    timeout: (port: number, seconds: number): string =>
      `連接埠 ${port} 在 ${seconds} 秒內沒有回應。` +
      'Anki 可能正忙（正在同步或顯示對話方塊），或是有其他程式佔用了這個連接埠。',
    blocked: (origin: string): string =>
      `AnkiConnect 拒絕了 ${origin}。請在 Anki 中前往「工具 → 附加元件 → AnkiConnect → 設定」，` +
      '將這個位址加入 webCorsOriginList。',
    httpAnswer: (port: number, status: number): string =>
      `連接埠 ${port} 上的程式回應了 HTTP ${status}，但 AnkiConnect 不會這樣回應。`,
    notAnkiConnect: (port: number): string => `有 AnkiConnect 以外的程式正在使用連接埠 ${port}。`,
    noBackground: '擴充功能的背景程式沒有回應。',
    unreachable: '無法連線至 Anki。',
    callFailed: 'AnkiConnect 呼叫失敗。',

    // Libregaku refusing to send Anki something it does not use
    notRelayed: (action: string): string => `Libregaku 不會將「${action}」傳送給 AnkiConnect。`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string => `Libregaku 只會附加自己取得的${MEDIA[media] ?? media}。`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `這則筆記的${MEDIA[media] ?? media}沒有資料。`,
    mediaName: (prefix: string): string => `Libregaku 新增的檔案都以 ${prefix} 開頭命名，但這個檔案不是。`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} 需要${ids === 'notes' ? '筆記' : '卡片'}清單。`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string => {
      const what = change === 'delete' ? '刪除自己的標記' : change === 'suspend' ? '擱置自己的標記' : '更改自己標記的標籤';
      return `已拒絕：送出的${ids === 'notes' ? '筆記' : '卡片'}中，有 ${count} ${ids === 'notes' ? '則' : '張'}不屬於任何 Libregaku 標記。` +
        `Libregaku 只會${what}` +
        (change === 'delete' ? '，以及最近幾分鐘內自己製作、還沒學習過的卡片。' : '。');
    },

    // The note types Libregaku makes in Anki
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Anki 中的「${noteType}」筆記類型缺少欄位 ${fields.join('、')}，` +
      `因此${loses === 'cards' ? '卡片' : '筆記'}會缺少這些內容。` +
      'Libregaku 不會更改你可能編輯過的筆記類型：' +
      `請在 Anki 中前往「工具 → 管理筆記類型」，將「${noteType}」重新命名（或把欄位加回去），` +
      '然後按「重新檢查」，就會安裝新的筆記類型。',

    // Marks and waiting cards
    marksNotAdded: (count: number): string => `Anki 有 ${count} 個標記沒有新增。這些標記會留在佇列中，下次再試。`,
    marksNotStored: (cause: string): string => `瀏覽器儲存空間拒絕儲存從 Anki 讀取的標記：${cause}`,
    storageUnreadable: (cause: string): string => `無法讀取瀏覽器儲存空間：${cause}`,
  },

  errors: {
    // Recording a tab's sound for sentence audio
    captureNotAllowed: '請先在 Libregaku 的設定中，允許這個網站的句子音訊。',
    captureRefused: 'Chrome 拒絕擷取這個分頁',

    // A subtitle track that would not load
    unknownTrack: (id: string): string => `未知的字幕軌 ${id}`,
    trackNotSent: '播放器尚未載入；請在播放器的字幕選單中選擇一次',
    noCaptionFormat: (attempts: readonly string[]): string => `所有字幕格式都無法使用：${attempts.join('、')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `所有字幕網址都無法使用：${attempts.join('；') || '未列出任何網址'}`,
    emptyAnswer: '回應為空',
    noCues: '0 句字幕',
    noCuesParsed: '解析後沒有字幕',
    noAnswerWithin: (seconds: number): string => `${seconds} 秒內沒有回應`,

    // A track's name
    forcedTrack: (track: string): string => `${track}（強制）`,

    // The dictionary and the analyser
    noAnswer: '擴充功能沒有回應，請重新載入網頁來重新啟動',
    analyserLoading: '分析器仍在載入',
    dictionaryLoading: '字典仍在載入',
    lookupFailed: '查詢失敗',
  },

  grammar: {
    // Tense and politeness
    past: '過去',
    polite: '敬體',

    // Not doing it
    negative: '否定',
    'negative intent': '否定意志',
    without: '不～而',

    // If and when
    conditional: '條件形',
    whenever: '一～就',

    // Who does it, and whether it can be done
    passive: '被動形',
    'passive or potential': '被動或可能',
    potential: '可能形',
    causative: '使役形',

    // Wanting
    'want to': '想要',
    'seems to want to': '似乎想要',
    'want someone to': '希望別人做',

    // How the speaker knows it, and how sure they are
    seems: '看起來',
    'seems like': '好像',
    hearsay: '傳聞',
    apparently: '似乎',
    probably: '大概',
    might: '也許',

    // What should happen, or is meant to
    'ought to': '應該',
    'supposed to': '理應',
    'intends to': '打算',

    // Having to, and being allowed to
    must: '必須',
    'must not': '不可以',
    "don't have to": '不必',
    may: '可以',

    // Commands, requests and "let's"
    imperative: '命令形',
    volitional: '意向形',
    'polite command': '禮貌命令',
    please: '請求',

    // Joining to what comes next
    'te-form': 'て形',
    listing: '列舉',
    while: '一邊',
    because: '因為',
    'even though': '儘管',
    'in order to': '為了',
    'so that': '以便',

    // Helper verbs after the te-form
    ongoing: '持續',
    'resulting state': '結果狀態',
    'completely, or regrettably': '完了或遺憾',
    'in advance': '事先',
    'try doing': '試著',
    'going forward': '～下去',
    'coming to be': '～起來',
    'receive the favour': '請別人做',
    'someone does for me': '別人為我做',
    'do for someone': '為別人做',

    // Helper verbs after the verb's stem
    'too much': '過度',
    'easy to': '容易',
    'hard to': '難以',
    'start to': '開始',
    'keep on': '繼續',
    finish: '做完',
    again: '重新',
    'each other': '互相',
    completely: '完全',
    thoroughly: '深入',
    around: '到處',
    'non-stop': '不停',

    // Forms of a Spanish word, shown in a row with spaces between
    or: '或',
    'first-person': '第一人稱',
    'second-person': '第二人稱',
    'third-person': '第三人稱',
    singular: '單數',
    plural: '複數',
    masculine: '陽性',
    feminine: '陰性',
    present: '現在式',
    preterite: '簡單過去式',
    imperfect: '未完成過去式',
    'imperfect-se': '未完成過去式（-se）',
    future: '未來式',
    'conditional-mood': '條件式',
    indicative: '陳述式',
    subjunctive: '虛擬式',
    infinitive: '原形',
    gerund: '現在分詞',
    participle: '分詞',
    formal: '尊稱',
    informal: '非尊稱',
    'with-tú': '用於 tú',
    'with-vos': '用於 vos',
    'vos-form': 'vos 形式',
    voseo: 'voseo',
    'second-person-semantically': '意指「你」',
    accusative: '附直接受詞',
    dative: '附間接受詞',
    'object-first-person': '第一人稱受詞',
    'object-second-person': '第二人稱受詞',
    'object-third-person': '第三人稱受詞',
    'object-singular': '單數受詞',
    'object-plural': '複數受詞',
    diminutive: '指小詞',
    augmentative: '指大詞',
    superlative: '最高級',
    alternative: '其他形式',
    'alt-of': '另一種寫法',

    // Korean endings
    honorific: '尊敬語',
    'future or guess': '未來或推測',
    'formal polite': '格式體',
    question: '疑問',
    but: '但是',
    "let's": '勸誘',
    plain: '平述',
    'shall we, or I wonder': '提議或猜想',
    'I will': '承諾',
    'just noticed': '感嘆',
    'as you know': '你也知道',
    and: '並列',
    'because, or and then': '因為或然後',
    'but, or given that': '轉折或背景',
    'even if': '即使',
    whether: '是否',
    'adverb form': '副詞形',
    quoting: '引用',
    'used to': '回想',
    topic: '主題',
    subject: '主格',
    object: '受格',
    possessive: '所有格',
    'come to': '變成',
    when: '當～時',
    modifier: '冠形詞形',
    'noun form': '名詞形',
    becomes: '變得',
    'have done before': '曾經',
  },
};
