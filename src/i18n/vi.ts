import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'tắt', unknown: 'từ mới', always: 'tất cả' };

/** What a card went in without, joined with "hoặc". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'âm thanh của câu (nhấp vào biểu tượng Libregaku để ghi âm tại đây)'
      : 'âm thanh của câu'))
    .join(' hoặc ');

/** Each kind of media, inside a sentence and at the start of one. */
const MEDIA = { audio: 'âm thanh', video: 'video', picture: 'hình ảnh' } as const;
const MEDIA_FIRST = { audio: 'Âm thanh', video: 'Video', picture: 'Hình ảnh' } as const;

/** Notes or cards, as Anki's Vietnamese names them. */
const ITEMS = { notes: 'phiếu', cards: 'thẻ' } as const;

/** The interface in Vietnamese. Anything left out shows in English. */
export const vi: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Ngôn ngữ
    languagesHeading: 'Ngôn ngữ',
    languagesAbout: 'Chọn ngôn ngữ bạn đang học và ngôn ngữ của bạn.',
    target: 'Ngôn ngữ đang học',
    targetLimited: (language: string): string => `${language} (hạn chế)`,
    supportFull: 'Hỗ trợ đầy đủ, gồm cả cách đọc và furigana.',
    supportPinyin: 'Hỗ trợ đầy đủ, gồm cả pinyin. Nghĩa được viết bằng tiếng Anh.',
    supportWords: 'Hỗ trợ đầy đủ. Nghĩa được viết bằng tiếng Anh.',
    supportBasic: 'Hỗ trợ cơ bản: có tách từ, nhưng chưa có từ điển hay cách đọc.',
    native: 'Ngôn ngữ của bạn',
    nativeHint: 'Bản dịch và nghĩa của từ hiện bằng ngôn ngữ này, nếu video và từ điển có ngôn ngữ đó.',
    definitions: 'Hiện nghĩa bằng',
    definitionsHint: 'Từ điển không có nghĩa bằng ngôn ngữ của bạn, nên nghĩa sẽ hiện bằng ngôn ngữ này.',
    definitionsHintFor: (language: string): string =>
      `Từ điển không có nghĩa bằng ${language}, nên nghĩa sẽ hiện bằng ngôn ngữ này.`,

    // Tra từ
    lookupHeading: 'Tra từ',
    lookupAbout: 'Chọn cách và thời điểm tra từ.',
    interaction: 'Tra từ khi',
    interactionHover: 'Di chuột qua',
    interactionShift: 'Di chuột qua khi giữ Shift',
    interactionClick: 'Nhấp',
    interactionHint: 'Lúc nào bạn cũng có thể nhấp vào từ để tra.',
    hoverPause: 'Tạm dừng khi tra từ',
    hoverPauseHint: 'Tạm dừng video khi con trỏ nằm trên một từ.',
    sidebarHover: 'Xem nhanh nghĩa trong bản chép lời',
    sidebarHoverHint: 'Hiện nghĩa ngắn gọn khi bạn trỏ vào một từ trong bản chép lời.',

    // Cửa sổ tra từ
    popupHeading: 'Cửa sổ tra từ',
    popupAbout: 'Chọn những gì cửa sổ tra từ hiển thị khi bạn tra một từ.',
    cardMarks: 'Nút Đã biết và Bỏ qua',
    cardMarksHint: '“Đã biết” bỏ gạch dưới của từ; “Bỏ qua” loại từ khỏi số đếm. Cả hai đều không thêm thẻ.',
    cardTrack: 'Nút Theo dõi',
    cardTrackHint: 'Gạch dưới màu tím cho những từ bạn muốn để ý. Không thêm thẻ.',
    cardDeckMenu: 'Menu bộ thẻ',
    cardDeckMenuHint: 'Thêm nút ▾ cạnh “Thêm vào Anki” để chọn bộ thẻ khác. Thẻ mới sau đó sẽ vào bộ thẻ đó.',
    cardAddLine: 'Thẻ câu',
    cardAddLineHint: 'Thêm nút tạo thẻ từ cả câu, kèm âm thanh và ảnh chụp màn hình.',
    cardKanji: 'Phân tích kanji',
    cardKanjiHint: 'Hiện nghĩa và cách đọc của từng chữ kanji.',
    cardHanzi: 'Phân tích chữ Hán',
    cardHanziHint: 'Hiện nghĩa và cách đọc của từng chữ.',
    lookupElsewhere: 'Ví dụ trong video này',
    lookupElsewhereHint: 'Hiện các câu khác trong video này có dùng từ đó. Nhấp vào một câu để phát.',

    // Phụ đề
    subtitlesHeading: 'Phụ đề',
    subtitlesAbout: 'Điều chỉnh cách phụ đề hiển thị trên video.',
    ruby: 'Furigana',
    rubyUnknown: 'Từ mới',
    rubyAlways: 'Tất cả',
    rubyNever: 'Tắt',
    rubyHint: 'Cách đọc phía trên chữ kanji. Nhấn R để chuyển khi đang xem.',
    pinyin: 'Pinyin',
    pinyinHint: 'Cách đọc phía trên chữ Hán. Nhấn R để chuyển khi đang xem.',
    blurPrimary: 'Làm mờ phụ đề',
    blurPrimaryHint: 'Để luyện nghe: phụ đề bị làm mờ cho đến khi bạn trỏ vào. Nhấn H để chuyển.',
    subtitleSize: 'Cỡ chữ',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: 'Co giãn theo trình phát, nên ở chế độ toàn màn hình trông vẫn như vậy.',
    subtitleBottom: 'Vị trí',
    subtitleBottomLowest: 'Thấp nhất',
    subtitleBottomLow: 'Thấp',
    subtitleBottomNormal: 'Bình thường',
    subtitleBottomRaised: 'Hơi cao',
    subtitleBottomHigh: 'Cao',
    subtitleBottomHighest: 'Cao nhất',
    subtitleBottomHint: 'Độ cao của phụ đề. Tiện ích phụ đề khác trên cùng trình phát sẽ nằm bên dưới.',
    dualSubtitles: 'Hiện bản dịch',
    dualSubtitlesHint:
      'Hiện phụ đề bằng ngôn ngữ của bạn bên dưới phụ đề của ngôn ngữ bạn đang học. Phụ đề này lấy từ trang web, ' +
      'không phải dịch máy, và cần có bản chép lời đầy đủ của video.',

    // Gạch dưới
    underlinesHeading: 'Gạch dưới',
    underlinesAbout: 'Mỗi màu cho biết bạn biết một từ đến đâu. Nhấp vào một màu để đổi.',
    colorUnknown: 'Từ mới',
    colorUnknownHint: 'Từ chưa có thẻ trong Anki.',
    colorLearning: 'Đang học',
    colorLearningHint: 'Từ có thẻ nhưng thẻ chưa trưởng thành.',
    colorTracking: 'Đang theo dõi',
    colorTrackingHint: 'Từ bạn đang theo dõi.',
    colorKnown: 'Đã biết',
    colorKnownHint: 'Từ có thẻ đã trưởng thành, hoặc được đánh dấu đã biết.',
    markKnown: 'Gạch dưới từ đã biết',
    markKnownHint: 'Mặc định tắt, để màn hình gọn dần khi bạn học.',
    defaultColours: 'Màu mặc định',
    resetColours: 'Đặt lại',

    // Bản chép lời
    transcriptHeading: 'Bản chép lời',
    transcriptAbout: 'Bảng bên cạnh video, liệt kê mọi dòng phụ đề.',
    sidebarOpen: 'Hiện bảng chép lời',
    sidebarOpenHint: 'Nhấn S để hiện hoặc ẩn bảng khi đang xem.',
    sidebarFollow: 'Cuộn theo video',
    sidebarFollowHint: 'Luôn hiện dòng đang phát. Khi bạn tự cuộn, tính năng này tạm dừng; một nút sẽ cho tiếp tục.',
    headerBar: 'Hiện thanh tiêu đề',
    headerBarHint: 'Xuất hiện ở đầu video khi con trỏ đến gần.',
    languageBadge: 'Huy hiệu ngôn ngữ',
    languageBadgeFlag: 'Cờ',
    languageBadgeCode: 'Mã',
    languageBadgeHint: 'Cách thanh tiêu đề hiện ngôn ngữ bạn đang học.',
    sidebarStats: 'Đếm từ mới',
    sidebarStatsHint: 'Hiện số từ mới trên mỗi dòng, tỷ lệ từ bạn đã biết và các bộ lọc dùng những số này.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Kết nối Anki, chọn nơi thêm thẻ mới và những bộ thẻ dùng để xác định từ bạn đã biết.',
    deck: 'Thêm thẻ mới vào',
    deckHint: 'Bộ thẻ mà mọi thẻ mới được thêm vào.',
    statusScope: 'Nguồn từ đã biết',
    statusScopeHint: 'Thẻ trong các bộ thẻ này quyết định từ nào được gạch dưới. Bao gồm cả bộ thẻ con.',
    marksInAnki: 'Lưu đánh dấu trong Anki',
    marksInAnkiHint:
      'Lưu “Đã biết”, “Theo dõi” và “Bỏ qua” thành các phiếu ẩn trong Anki (Libregaku::Marks) để đồng bộ sang các thiết bị ' +
      'khác của bạn. Khi tắt: chúng chỉ ở trong trình duyệt này.',

    // Menu bộ thẻ
    wholeCollection: 'Cả bộ sưu tập',
    chooseDeck: 'Chọn bộ thẻ…',
    deckNotInAnki: (deck: string): string => `${deck} (không có trong Anki)`,
    deckAndSubdecks: (deck: string): string => `${deck} (và bộ thẻ con)`,
    deckUnset: 'Hãy chọn một bộ thẻ. Chưa chọn thì chưa thêm thẻ được.',
    deckMissing: (deck: string): string => `Anki không còn bộ thẻ nào tên “${deck}”. Hãy chọn bộ thẻ khác.`,
    statusScopeMissing: (deck: string): string =>
      `Anki không còn bộ thẻ nào tên “${deck}”, nên mọi từ đều hiện là từ mới. Hãy chọn bộ thẻ khác.`,
    statusScopeOutside: (deck: string): string =>
      `Thẻ mới được thêm vào “${deck}”, nhưng bộ thẻ này không nằm trong nguồn ở đây, nên các từ bạn thêm vẫn bị ` +
      'gạch dưới như từ mới. Hãy chọn một bộ thẻ có chứa nó, hoặc “Cả bộ sưu tập”.',

    // Trạng thái của Anki
    ankiChecking: 'Đang kiểm tra…',
    ankiConnected: 'Đã kết nối.',
    noteTypeInstalled: 'Đã cài kiểu phiếu.',
    cardsMade: (n: number): string => `Đã tạo ${n} thẻ bằng Libregaku.`,
    noCards: 'Chưa có thẻ nào.',
    cardsFlushed: (n: number): string => `Đã thêm ${n} thẻ được tạo trong lúc Anki đóng.`,
    cardsNotFlushed: (n: number, error: string): string => `Không thêm được ${n} thẻ: ${error}`,
    cardsWaiting: (n: number): string => `${n} thẻ đang chờ được thêm.`,
    ankiOffline: (port: number): string =>
      `Anki không phản hồi ở cổng ${port}. Điều này là bình thường khi Anki đang đóng: ` +
      'thẻ mới sẽ chờ ở đây và được thêm khi Anki mở.',
    ankiBlocked: 'Anki đang chạy, nhưng AnkiConnect chưa cho phép tiện ích này.',
    ankiOccupied: (detail: string): string => `${detail} Hãy đóng chương trình đang dùng cổng này để Anki dùng được.`,

    // Các nút Anki
    checkAgain: 'Kiểm tra lại',
    newDeck: 'Tạo bộ thẻ',
    openCards: 'Xem thẻ trong Anki',
    openMarks: 'Xem đánh dấu trong Anki',
    newDeckPrompt: 'Đặt tên cho bộ thẻ mới. Dùng :: cho bộ thẻ con, ví dụ: Tiếng Nhật::Netflix',

    // Kết nối Anki
    installStep: 'Cài Anki trên máy tính này rồi mở lên. {link}',
    getAnki: 'Tải Anki',
    addonStep: 'Trong Anki, vào {menu}, dán mã này, rồi khởi động lại Anki.',
    addonMenu: 'Công cụ → Tiện ích → Lấy Tiện ích…',
    aboutAnkiConnect: 'Giới thiệu về AnkiConnect',
    originStep: 'Trong Anki, vào {menu}, thêm dòng này vào {setting}, rồi khởi động lại Anki.',
    originMenu: 'Công cụ → Tiện ích → AnkiConnect → Cấu hình',
    runningStep: 'Để Anki mở trong lúc xem. Thẻ được thêm thẳng vào Anki trên máy tính này.',
    copy: 'Sao chép',
    copyValue: (value: string): string => `Sao chép ${value}`,
    copied: 'Đã sao chép',
    copyFailed: 'Hãy tự chọn',

    // Thẻ Anki
    ankiCardsHeading: 'Thẻ Anki',
    ankiCardsAbout: 'Chọn những gì được thêm vào mỗi thẻ mới, ngoài từ, cách đọc, nghĩa và câu.',
    cardAudio: 'Âm thanh của từ',
    cardAudioHint: 'Bản ghi âm của từ, nếu có. Không bao giờ dùng giọng máy.',
    cardSentenceAudio: 'Âm thanh của câu',
    cardSentenceAudioHint: 'Ghi âm câu bằng cách phát lại câu đó một lần nữa. Trên Netflix, cần có quyền bên dưới.',
    cardScreenshot: 'Ảnh chụp màn hình',
    cardScreenshotHint: 'Ảnh tĩnh của cảnh đó. Không có trên Netflix vì Netflix chặn.',
    capture: 'Âm thanh của câu trên Netflix',
    captureAllow: 'Cho phép',
    captureAllowInSettings: 'Cho phép trong Cài đặt',
    captureRemove: 'Thu hồi',
    captureAllowed: 'Đã cho phép. Trên mỗi tab Netflix, hãy nhấp vào biểu tượng Libregaku và chọn “Ghi âm câu tại đây”.',
    captureNeeded: 'Netflix bảo vệ video, nên âm thanh của câu được ghi từ tab. Việc này cần bạn cho phép.',

    // Dữ liệu và giấy phép
    creditsHeading: 'Dữ liệu và giấy phép',
    creditJmdict:
      'Dữ liệu từ điển và kanji © Electronic Dictionary Research and Development Group, dùng theo giấy phép ' +
      'CC BY-SA 4.0. Được jmdict-simplified đóng gói lại thành JSON.',
    creditLindera:
      'Tách tiếng Nhật, tiếng Hàn và tiếng Trung thành từ. Giấy phép MIT; IPADIC, mecab-ko-dic và CC-CEDICT ' +
      'có điều khoản riêng.',
    creditCedict: 'Từ điển tiếng Trung © MDBG và những người đóng góp, dùng theo giấy phép CC BY-SA 4.0.',
    creditWiktionary:
      'Từ điển tiếng Hàn và tiếng Tây Ban Nha, lấy từ Wiktionary qua kaikki.org và wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditUnihan: 'Cách đọc nào của chữ Hán được hiện trước. © Unicode, Inc., dùng theo Unicode License.',
    creditJotoba: 'Dùng để tra từ trong lúc từ điển đang tải. Cả hai đều dùng JMdict.',
    creditLucide: 'Biểu tượng. Giấy phép ISC.',
    licence: 'Libregaku dùng giấy phép MIT. Dữ liệu từ điển được tải từ nguồn của nó, không đi kèm sẵn.',
    built: (when: string): string => `Bản dựng này được tạo lúc ${when}.`,

    // Phím tắt
    keyLine: 'Dòng trước hoặc dòng sau',
    keyReplay: 'Phát lại dòng',
    keyTranslation: 'Hiện hoặc ẩn bản dịch',
    keyShiftLookup: 'Giữ để tra từ dưới con trỏ',
    keyAdd: 'Thêm từ trong cửa sổ tra từ vào Anki',
    keyKnown: 'Đánh dấu từ trong cửa sổ tra từ là đã biết',
    keyFurigana: 'Chuyển furigana: tắt, từ mới, tất cả',
    keyPinyin: 'Chuyển pinyin: tắt, từ mới, tất cả',
    keyBlur: 'Làm mờ hoặc bỏ làm mờ phụ đề',
    keySave: 'Lưu dòng hiện tại',
    keyTranscript: 'Hiện hoặc ẩn bảng chép lời',
    keyClose: 'Đóng cửa sổ tra từ',
  },

  options: {
    pageTitle: 'Cài đặt Libregaku',
    help: 'Trợ giúp',
    tagline: 'Thay đổi có hiệu lực ngay, cả ở đây và trong bảng chép lời khi bạn xem.',
    contentsLabel: 'Các mục cài đặt',
    settingsLabel: 'Cài đặt',
    setupHeading: 'Bắt đầu',
    setupAbout: 'Chỉ cần chọn hai thứ, mọi thứ khác đã có mặc định hợp lý.',
    stepLanguages: 'Chọn ngôn ngữ bạn đang học',
    stepAnki: 'Kết nối Anki và chọn bộ thẻ cho thẻ mới',
    ankiOptional:
      'Anki không bắt buộc — phụ đề, tra từ và furigana đều dùng được khi không có Anki. ' +
      'Anki là nơi ghi nhớ những từ bạn đã biết.',
    nextSteps:
      'Sau đó, mở một video có phụ đề bằng ngôn ngữ bạn đang học và di chuột qua một từ. ' +
      'Nút bàn phím trong bảng chép lời liệt kê các phím tắt.',
    confirmLanguages: 'Xác nhận ngôn ngữ',
    keepDeck: (deck: string): string => `Dùng ${deck} cho thẻ mới`,
  },

  action: {
    help: 'Trợ giúp',
    settings: 'Cài đặt',
    settingsTip: 'Tất cả cài đặt',
    checkingPage: 'Đang kiểm tra trang này…',
    notActive:
      'Không hoạt động trên trang này. Hãy mở một video YouTube hoặc Netflix. Nếu bạn vừa cài hoặc tải lại Libregaku, ' +
      'hãy tải lại tab.',
    unsupported: 'Libregaku hoạt động trên YouTube và Netflix.',
    waitingForSubtitles: (site: string): string => `Đang chờ phụ đề trên ${site}. Hãy kiểm tra xem phụ đề đã bật chưa.`,
    activeOn: (title: string): string => `Đang hoạt động — ${title}`,
    active: 'Đang hoạt động trên video này.',
    subtitlesTrack: 'Phụ đề',
    translationTrack: 'Bản dịch',
    noTranslation: 'Không có',
    generatedTrack: (track: string): string => `${track} (tự động tạo)`,
    captureNeedsPermission: 'Để ghi âm câu tại đây, cần có quyền thu âm thanh của tab này.',
    captureAllowInSettings: 'Cho phép trong Cài đặt',
    captureReady: 'Chỉ ghi được âm thanh của Netflix sau khi bạn bật tính năng này cho tab này.',
    captureStart: 'Ghi âm câu tại đây',
    captureFailed: 'Chrome không ghi được tab này.',
    toggleSidebar: 'Bật/tắt thanh bên',
    ankiChecking: 'Anki: đang kiểm tra…',
    ankiConnected: (n: number): string => `Đã kết nối Anki · ${n} thẻ từ Libregaku`,
    ankiOffline: 'Anki chưa chạy — các từ hiện là từ mới',
    ankiOccupied: (port: number): string => `Một chương trình khác đang dùng cổng ${port}, nên không kết nối được với Anki`,
    ankiBlocked: 'Anki đã từ chối tiện ích này — Cài đặt có dòng cần thêm',
    ankiBusy: 'Anki không phản hồi — có thể đang bận đồng bộ',
    ankiRefused: 'Anki đã từ chối yêu cầu',
    cardsToAdd: (n: number): string => `còn ${n} thẻ chưa thêm`,
    cardsWaiting: (n: number): string => `${n} thẻ đang chờ Anki`,
  },

  sidebar: {
    // Các tab, và các nút bên cạnh
    tabsLabel: 'Danh sách',
    transcriptTab: 'Bản chép lời',
    savedTab: 'Đã lưu',
    wordsTab: 'Từ',
    settings: 'Cài đặt',
    shortcuts: 'Phím tắt',
    close: 'Đóng',
    closeLabel: 'Thu gọn bảng',
    openTip: 'Bản chép lời',
    openLabel: 'Hiện bản chép lời',
    help: 'Trợ giúp',

    // Tìm trong bản chép lời
    searchPlaceholder: 'Tìm trong bản chép lời…',
    searchLabel: 'Tìm trong bản chép lời',
    noMatches: 'Không có kết quả',
    matchAt: (at: number, total: number): string => `${at}/${total}`,
    matchesFound: (n: number): string => `Tìm thấy ${n}`,

    // Bộ lọc
    filterTip: 'Bộ lọc',
    filterLabel: 'Lọc dòng',
    filterAll: 'Tất cả các dòng',
    filterAllAbout: 'Mọi dòng',
    filterNew: 'Có từ mới',
    filterNewAbout: 'Những dòng có từ bạn chưa có thẻ',
    filterReady: 'Sẵn sàng học',
    filterReadyAbout: 'Những dòng chỉ có một từ mới với bạn — dễ học nhất',
    filterSaved: 'Đã lưu',
    filterSavedAbout: 'Những dòng bạn đã lưu để xem sau',

    // Bản chép lời
    partial: 'Đang tạo dần khi bạn xem — trình phát này chỉ cho đọc dòng hiện tại.',
    partialEmpty: 'Chưa có gì. Các dòng sẽ hiện ở đây khi được nói.',
    empty: 'Chưa tải bản chép lời.',
    currentLine: 'Dòng hiện tại',
    lineNew: (n: number): string => `${n} mới`,
    saveLine: 'Lưu dòng',
    unsave: 'Bỏ lưu',
    addSentence: 'Thêm câu',
    addSentenceLabel: 'Thêm câu vào Anki',

    // Phần tóm tắt phía trên bản chép lời
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: '{n} đã biết',
    summaryNew: '{n} từ mới',
    summaryReady: '{n} dòng sẵn sàng học',
    counting: (percent: number): string => `Đang đếm từ mới… ${percent}%`,
    countFailed: 'Không đếm được một số dòng, nên không có tổng số.',

    // Nghĩa khi trỏ vào từ
    dictionaryLoading: (percent: number): string => `Đang tải từ điển — ${percent}%`,
    dictionaryUnavailable: 'Không dùng được từ điển',
    noEntry: 'Không có mục từ.',

    // Đã lưu
    savedEmpty:
      'Chưa lưu gì. Dùng dấu trang trên bất kỳ dòng nào của bản chép lời — hoặc nhấn B — để giữ lại câu bạn muốn ' +
      'xem lại.',
    thisVideo: 'video này',
    remove: 'Xóa',
    removeLabel: 'Xóa khỏi mục đã lưu',
    copySavedAbout: 'Sao chép mọi dòng đã lưu dưới dạng văn bản phân cách bằng tab',
    exportSavedAbout: 'Lưu tệp phân cách bằng tab mà Anki có thể nhập',
    addSavedAbout: 'Tạo thẻ từ mỗi dòng đã lưu',
    linesCopied: (n: number): string => `Đã sao chép ${n} dòng.`,
    chooseDeck: 'Hãy chọn bộ thẻ trong Cài đặt trước — thẻ mới sẽ được thêm vào đó.',
    checkingAnki: 'Đang kiểm tra Anki…',
    ankiOffline: 'Anki chưa chạy. Hãy mở Anki rồi thử lại — Cài đặt có hướng dẫn.',
    ankiBlocked: 'AnkiConnect chưa cho phép tiện ích này. Cài đặt có dòng cần thêm.',
    ankiUnreachable: 'Không kết nối được với Anki. Cài đặt có giải thích lý do.',
    adding: (at: number, total: number): string => `Đang thêm ${at}/${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `Đã thêm ${added} thẻ vào ${deck}${already ? `, ${already} thẻ đã có sẵn` : ''}.`,

    // Các nút và thông báo chung của Đã lưu và Từ
    copy: 'Sao chép',
    exportFile: 'Xuất tệp',
    addToAnki: 'Thêm vào Anki',
    noClipboard: 'Không truy cập được bảng nhớ tạm.',
    downloaded: 'Đã lưu vào thư mục tải xuống. Trong Anki: Tập tin → Nhập.',
    downloadBlocked: 'Trang này đã chặn tải xuống — hãy dùng “Sao chép”.',

    // Từ
    listsLabel: 'Nhóm từ',
    listTracked: 'Đang theo dõi',
    listKnown: 'Đã biết',
    listIgnored: 'Đã bỏ qua',
    findPlaceholder: 'Tìm từ',
    findLabel: 'Tìm từ trong danh sách này',
    copyWordsAbout: 'Sao chép danh sách này dưới dạng văn bản phân cách bằng tab',
    exportWordsAbout: 'Lưu danh sách này thành tệp phân cách bằng tab mà Anki có thể nhập',
    wordsCopied: (n: number): string => `Đã sao chép ${n} từ.`,
    nothingToExport: 'Danh sách này không có từ nào để xuất.',
    lookingUp: 'Đang tra cách đọc và nghĩa…',
    noWordMatches: (query: string): string => `Không có từ nào trong danh sách này khớp với “${query}”.`,
    wordsMatching: (shown: number, total: number): string => `${shown} trên ${total} từ.`,
    trackedEmpty:
      'Chưa theo dõi từ nào. “Theo dõi” sẽ gạch dưới một từ để bạn để ý, mà không tạo thẻ. ' +
      'Hãy bật nút này trong Cài đặt, ở mục “Cửa sổ tra từ”.',
    trackedIntro: (n: number): string => `${n} từ bạn đang theo dõi, được gạch dưới ở mọi chỗ chúng xuất hiện.`,
    stopTracking: 'Bỏ theo dõi',
    knownEmpty:
      'Chưa có từ nào được đánh dấu đã biết. Khi đã biết một từ và không cần thẻ, hãy đánh dấu đã biết trong cửa sổ tra từ, ' +
      'hoặc nhấn K.',
    knownIntro: (n: number): string =>
      `${n} từ được đánh dấu đã biết. Bỏ đánh dấu một từ thì trạng thái của nó sẽ lại theo thẻ Anki của bạn.`,
    unmarkKnown: 'Bỏ đánh dấu đã biết',
    ignoredEmpty:
      'Chưa bỏ qua từ nào. Hãy bỏ qua tên riêng và tiếng cảm thán trong cửa sổ tra từ, chúng sẽ không bao giờ bị ' +
      'gạch dưới hay được đếm.',
    ignoredIntro: (n: number): string => `${n} từ không bao giờ bị gạch dưới hay được đếm.`,
    stopIgnoring: 'Không bỏ qua nữa',
  },

  popup: {
    // Cửa sổ và từ ở đầu
    cardLabel: (word: string): string => `${word} — từ điển`,
    commonBadge: 'thông dụng',
    characterNames: { kanji: 'Kanji', hanzi: 'Chữ Hán' },
    partOfSpeech: {
      n: 'danh từ', 'n-adv': 'danh từ dùng như trạng từ', 'n-t': 'danh từ chỉ thời gian', 'n-suf': 'hậu tố danh từ',
      'n-pref': 'tiền tố danh từ', pn: 'đại từ', 'adj-i': 'tính từ đuôi i', 'adj-na': 'tính từ đuôi na',
      'adj-no': 'tính từ đuôi no', 'adj-pn': 'liên thể từ', adv: 'trạng từ', 'adv-to': 'trạng từ',
      aux: 'từ phụ trợ', 'aux-v': 'trợ động từ', 'aux-adj': 'tính từ phụ trợ',
      conj: 'liên từ', cop: 'hệ từ', ctr: 'từ đếm', exp: 'cụm từ', int: 'thán từ',
      num: 'số từ', prt: 'trợ từ', pref: 'tiền tố', suf: 'hậu tố', unc: 'chưa phân loại',
      vs: 'động từ suru', 'vs-i': 'động từ suru', 'vs-s': 'động từ suru', vt: 'tha động từ', vi: 'tự động từ',
      v1: 'động từ nhóm II', 'v1-s': 'động từ nhóm II', vk: 'động từ kuru', vz: 'động từ zuru',
      v5b: 'động từ nhóm I', v5g: 'động từ nhóm I', v5k: 'động từ nhóm I', 'v5k-s': 'động từ nhóm I',
      v5m: 'động từ nhóm I', v5n: 'động từ nhóm I', v5r: 'động từ nhóm I', 'v5r-i': 'động từ nhóm I',
      v5s: 'động từ nhóm I', v5t: 'động từ nhóm I', v5u: 'động từ nhóm I', 'v5u-s': 'động từ nhóm I',
      v5aru: 'động từ nhóm I',
      // Mã của Wiktionary, cho từ tiếng Hàn và tiếng Tây Ban Nha
      name: 'danh từ riêng', v: 'động từ', adj: 'tính từ', pron: 'đại từ', det: 'từ hạn định', artic: 'mạo từ',
      counter: 'từ đếm', prep: 'giới từ', 'prep-phrase': 'cụm giới từ', ptcl: 'trợ từ',
      intj: 'thán từ', phrase: 'cụm từ', prov: 'tục ngữ', r: 'gốc từ', char: 'ký tự', adn: 'định từ',
      ptcpl: 'phân từ', contr: 'dạng rút gọn',
      masc: 'giống đực', fem: 'giống cái', neut: 'giống trung', sg: 'số ít', pl: 'số nhiều', 'pl-only': 'chỉ có số nhiều',
      count: 'đếm được', uncount: 'không đếm được', vr: 'phản thân', vdt: 'hai tân ngữ', impers: 'vô nhân xưng',
      irreg: 'bất quy tắc', reltnl: 'tính từ quan hệ', reltv: 'quan hệ', interr: 'nghi vấn', poss: 'sở hữu',
      dim: 'giảm nhẹ', aug: 'tăng cường', onoma: 'tượng thanh',
      // Cách dùng
      idio: 'thành ngữ', fig: 'nghĩa bóng', literal: 'nghĩa đen', col: 'khẩu ngữ', inf: 'không trang trọng', fam: 'thân mật',
      formal: 'trang trọng', polite: 'lịch sự', lit: 'văn viết', poet: 'thơ ca', rhet: 'tu từ', sl: 'tiếng lóng',
      vulg: 'thô tục', derog: 'miệt thị', offens: 'xúc phạm', humor: 'hài hước', euph: 'uyển ngữ',
      child: 'ngôn ngữ trẻ em', net: 'Internet', neol: 'từ mới tạo', cmn: 'thông dụng', uncmmn: 'ít dùng', rare: 'hiếm',
      dated: 'cũ', arch: 'cổ', obs: 'không còn dùng', hist: 'lịch sử', 'non-std': 'không chuẩn',
      dialect: 'phương ngữ', regio: 'địa phương',
    },

    // Các nút dưới từ
    pronounce: 'Phát âm',
    playedRecording: (word: string): string => `${word} · bản ghi âm`,
    playedSynthesised: (word: string): string => `${word} · giọng máy`,
    pronounceFailed: 'không phát được âm thanh',
    addSentence: 'Thêm câu',
    sentenceAdded: 'Đã thêm câu',
    undo: 'Hoàn tác',
    copyWord: 'Sao chép từ',
    copyPhrase: 'Sao chép cụm từ',
    copySentence: 'Sao chép câu',
    wordCopied: 'đã sao chép từ',
    phraseCopied: 'đã sao chép cụm từ',
    sentenceCopied: 'đã sao chép câu',
    copyFailed: 'không sao chép được — hãy tự chọn văn bản',

    // Nghĩa
    dictionaryLoading: (percent: number): string => `Từ điển vẫn đang tải — ${percent}%. Hãy thử lại sau giây lát.`,
    dictionaryUnavailable: (error: string): string => `Không dùng được từ điển: ${error}`,
    noEntry: 'Từ điển không có mục cho từ này.',
    moreMeanings: (n: number): string => `+${n} nghĩa khác`,

    // Những dòng khác của từ trong video này
    elsewhereCount: (n: number): string => `Thêm ${n} lần trong video này`,
    playLine: 'Phát',
    elsewhereMore: (n: number): string => `và ${n} dòng nữa — tìm trong bản chép lời để thấy tất cả`,
    showAllInTranscript: 'Xem tất cả trong bản chép lời',

    // Thêm vào Anki
    addToAnki: 'Thêm vào Anki',
    addToDeck: (deck: string): string => `Thêm vào ${deck}`,
    adding: 'Đang thêm…',
    undoing: 'Đang hoàn tác…',
    added: 'Đã thêm',
    inAnki: 'Có trong Anki',
    showInAnki: 'Xem trong Anki',
    waiting: 'Đang chờ',
    waitingForAnki: 'Đang chờ Anki',
    goesInWhenAnkiOpens: 'Thẻ sẽ vào Anki khi Anki mở',
    alreadyAdded: 'Đã thêm rồi',
    alreadyInAnki: 'Đã có trong Anki',
    waitingForAnkiToOpen: 'Đang chờ Anki mở',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // Menu bộ thẻ
    otherDecks: 'Bộ thẻ khác',
    addToAnotherDeck: 'Thêm vào bộ thẻ khác',
    decksUnknown: 'Anki không phản hồi, nên chưa biết có những bộ thẻ nào.',
    newDeck: 'Tạo bộ thẻ…',
    newDeckPrompt: 'Bộ thẻ mới — dùng :: cho bộ thẻ con, ví dụ Tiếng Nhật::Netflix',

    // Đánh dấu
    knownButton: 'Đã biết',
    trackButton: 'Theo dõi',
    ignoreButton: 'Bỏ qua',
    markKnownTip: 'Đánh dấu đã biết',
    trackTip: 'Theo dõi',
    ignoreTip: 'Bỏ qua',
    unmarkKnownTip: 'Bỏ đánh dấu đã biết',
    stopTrackingTip: 'Bỏ theo dõi',
    stopIgnoringTip: 'Không bỏ qua nữa',
  },

  header: {
    knownStat: '{percent} đã biết',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: 'Từ bạn đã biết',
    readyStat: '{count} sẵn sàng học',
    readyTip: 'Dòng có một từ mới',
    blurSubtitle: 'Làm mờ phụ đề',
    unblurSubtitle: 'Bỏ làm mờ phụ đề',
    showTranslation: 'Hiện bản dịch',
    hideTranslation: 'Ẩn bản dịch',
    transcript: 'Bản chép lời',
    pinHeader: 'Ghim thanh tiêu đề',
    unpinHeader: 'Bỏ ghim thanh tiêu đề',
    settings: 'Cài đặt',
    showHeader: 'Hiện thanh tiêu đề',
    showHeaderLabel: 'Hiện thanh tiêu đề',
  },

  player: {
    // Các phím của trình phát
    lastLine: 'Đó là dòng cuối cùng',
    noLineBefore: 'Không có dòng nào trước dòng này',
    translationOn: 'Đã bật bản dịch',
    translationOff: 'Đã tắt bản dịch',
    blurOn: 'Phụ đề bị làm mờ cho đến khi bạn di chuột qua',
    blurOff: 'Đã hiện phụ đề',
    lineSaved: 'Đã lưu dòng',
    lineUnsaved: 'Đã bỏ lưu dòng',
    lookUpFirst: 'Hãy tra một từ trước',
    alreadyKnown: (word: string): string => `${word} · đã biết trong Anki`,
    alreadyInAnki: (word: string): string => `${word} · đã có trong Anki`,
    adding: (word: string): string => `Đang thêm ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Đánh dấu
    markOff: (word: string): string => `${word} · đã bỏ đánh dấu`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'đã đánh dấu đã biết', tracking: 'đã theo dõi', ignored: 'đã bỏ qua', unknown: 'đã đánh dấu là từ mới',
      }[status];
      if (refused) return `${word} · ${done}, không tạo thẻ — Anki đã từ chối; sẽ thử lại sau`;
      return `${word} · ${done}, không tạo thẻ${status === 'tracking' ? '. Xem trong tab “Từ” của bảng' : ''}`;
    },

    // Thẻ của một từ
    pickDeck: 'Hãy chọn bộ thẻ trong cài đặt Libregaku trước',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `đã thêm vào ${deck} — không có ${without(missing)}` : `đã thêm vào ${deck}`,
    alreadyIn: (deck: string): string => `đã có trong ${deck}`,
    queued: (deck: string): string => `Anki đang đóng — thẻ sẽ vào ${deck} khi Anki mở`,
    alreadyQueued: 'đang chờ Anki rồi',
    notKept: 'Anki đang đóng, và trình duyệt không giữ được thẻ để thêm sau',
    takenBack: (deck: string): string => `đã gỡ khỏi ${deck}`,
    unqueued: 'không còn chờ Anki nữa',
    alreadySent: 'Thẻ đã vào Anki rồi',
    queueSent: (count: number): string => `Anki đã mở — đã thêm ${count} thẻ đang chờ`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `từ đã biết được xác định theo ${scope}, nên thẻ trong ${deck} sẽ không được tính`,

    // Thẻ câu
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `đã thêm câu vào ${deck} — không có ${without(missing)}` : `đã thêm câu vào ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `câu này đã có trong ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'âm thanh', picture && 'hình ảnh'].filter(Boolean);
      return `Anki đang đóng — câu sẽ vào ${deck} khi Anki mở${lacking.length ? `, không kèm ${lacking.join(' hay ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'câu này đang chờ Anki rồi',
    sentenceTakenBack: (deck: string): string => `đã gỡ câu khỏi ${deck}`,

    // Âm thanh của câu
    recording: 'Đang ghi âm dòng…',

    // Tra từ
    noDictionary: 'Chưa có từ điển cho ngôn ngữ này.',
  },

  notices: {
    // Thông báo
    unexpected: 'Libregaku gặp sự cố ngoài dự kiến.',
    dismiss: 'Đóng',

    // YouTube hoặc Netflix đã thay đổi
    youtubeTrackList: 'Không đọc được danh sách phụ đề của YouTube.',
    youtubeTrackShape: 'Dữ liệu phụ đề của YouTube không có định dạng như dự kiến.',
    youtubeCaptionText: 'Không tìm thấy văn bản phụ đề của YouTube trên trang.',
    youtubePlayerTrackList: 'Không đọc được danh sách phụ đề của video này từ trình phát YouTube.',
    netflixTrackList: 'Không đọc được danh sách phụ đề của Netflix.',
    netflixCaptionText: 'Không tìm thấy văn bản phụ đề của Netflix trên trang.',
    netflixBlocked: 'Netflix đã chặn phần của Libregaku dùng để đọc phụ đề.',

    // Phụ đề của video này
    subtitlesOff: 'Hãy bật phụ đề trong trình phát, Libregaku sẽ tự nhận.',
    noTargetTrack: 'Ở đây không có phụ đề bằng ngôn ngữ bạn đang học.',
    noSecondTrack: 'Ở đây không có phụ đề bằng ngôn ngữ của bạn, nên không có dòng thứ hai.',
    onlyOneTrack: 'Video này chỉ có một bản phụ đề, nên không có dòng thứ hai.',
    autoGenerated: 'Phụ đề này được tạo tự động, nên câu chữ và cách tách từ sẽ không chính xác lắm.',
    noSubtitles: 'Video này không có phụ đề.',
    secondTrackFailed: 'Không tải được dòng thứ hai.',

    // Các phần của tiện ích
    analyserUnavailable:
      'Cách đọc và dạng từ điển đang tắt: bộ phân tích ngôn ngữ không tải được. ' +
      'Từ chỉ khớp với thẻ của bạn khi viết y hệt.',
    markNotSaved: 'Không lưu được đánh dấu đó. Nó có hiệu lực đến khi bạn tải lại trang, sau đó sẽ mất.',
    marksNotSynced: 'Không lưu được đánh dấu của bạn vào Anki. Chúng được giữ trong trình duyệt này và sẽ được thử lại.',
    cardsNotAdded:
      'Anki không nhận một số thẻ được giữ lại trong lúc Anki đóng. Các thẻ đó vẫn được giữ và sẽ được thử lại.',

    // Chi tiết
    playerNeverLoaded: 'Trình phát không tải xong.',
    subtitlesMaybeOff: 'Có thể phụ đề chỉ đang tắt trong trình phát.',
    lookedFor: (selector: string): string => `Đã tìm ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Video này có: ${languages.join(', ') || 'không có'}. Hãy đổi ngôn ngữ đang học trong cài đặt, hoặc chọn video khác.`,
    noHumanTrack: 'Video này không có bản phụ đề do người viết.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Video này có: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'bộ phân tích không tải được',
  },

  anki: {
    // Kết nối với AnkiConnect
    offline: (port: number): string => `Không có chương trình nào đang lắng nghe ở cổng ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Không có phản hồi ở cổng ${port} trong ${seconds} giây. ` +
      'Anki có thể đang bận (đang đồng bộ hoặc đang mở hộp thoại), hoặc một chương trình khác đang giữ cổng này.',
    blocked: (origin: string): string =>
      `AnkiConnect đã từ chối ${origin}. Trong Anki: Công cụ → Tiện ích → AnkiConnect → Cấu hình, ` +
      'rồi thêm dòng đó vào webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Một chương trình ở cổng ${port} đã trả lời bằng HTTP ${status}. AnkiConnect không trả lời như vậy.`,
    notAnkiConnect: (port: number): string => `Một chương trình không phải AnkiConnect đang dùng cổng ${port}.`,
    noBackground: 'Phần chạy nền của tiện ích không phản hồi.',
    unreachable: 'Không kết nối được với Anki.',
    callFailed: 'Lệnh gọi AnkiConnect thất bại.',

    // Những gì Libregaku không gửi
    notRelayed: (action: string): string => `Libregaku không gửi “${action}” đến AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku chỉ đính kèm ${MEDIA[media]} do chính nó tải về.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_FIRST[media]} của phiếu này không có dữ liệu.`,
    mediaName: (prefix: string): string => `Libregaku đặt tên các tệp nó thêm bắt đầu bằng ${prefix}…, còn tệp này thì không.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string => `${action} cần một danh sách ${ITEMS[ids]}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Đã từ chối: trong số các ${ITEMS[ids]} được gửi, có ${count} ${ITEMS[ids]} không thuộc đánh dấu nào của Libregaku. ` +
      `Libregaku chỉ ${change === 'delete' ? 'xóa' : change === 'suspend' ? 'dừng' : 'gắn lại nhãn cho'} ` +
      'các đánh dấu của chính nó' +
      (change === 'delete' ? ', và thẻ nó vừa tạo trong vài phút gần đây mà chưa được học.' : '.'),

    // Các kiểu phiếu Libregaku tạo trong Anki
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Kiểu phiếu “${noteType}” trong Anki của bạn thiếu ${fields.length === 1 ? 'trường' : 'các trường'} ` +
      `${fields.join(', ')}, nên ${ITEMS[loses]} sẽ mất ${fields.length === 1 ? 'trường đó' : 'các trường đó'}. ` +
      'Libregaku sẽ không sửa một kiểu phiếu mà có thể bạn đã chỉnh: ' +
      `trong Anki, vào Công cụ → Quản lý các Kiểu Phiếu, đổi tên “${noteType}” (hoặc thêm lại các trường), rồi nhấn ` +
      'Kiểm tra lại để cài một kiểu phiếu mới.',

    // Đánh dấu và thẻ đang chờ
    marksNotAdded: (count: number): string =>
      `Anki không thêm ${count} đánh dấu. Chúng vẫn nằm trong hàng chờ và sẽ được thử lại lần sau.`,
    marksNotStored: (cause: string): string => `Bộ nhớ của trình duyệt đã từ chối lưu các đánh dấu đọc từ Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Không đọc được bộ nhớ của trình duyệt: ${cause}`,
  },

  errors: {
    // Ghi âm thanh của một tab
    captureNotAllowed: 'Hãy cho phép âm thanh của câu trên trang này trong cài đặt Libregaku trước.',
    captureRefused: 'Chrome không cho thu tab này',

    // Một bản phụ đề không tải được
    unknownTrack: (id: string): string => `bản phụ đề không xác định ${id}`,
    noCaptionFormat: (attempts: readonly string[]): string =>
      `không định dạng phụ đề nào dùng được — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `không URL phụ đề nào dùng được — ${attempts.join('; ') || 'không có URL nào'}`,
    emptyAnswer: 'trống',
    noCues: '0 dòng',
    noCuesParsed: 'đọc ra 0 dòng',
    noAnswerWithin: (seconds: number): string => `không phản hồi trong ${seconds} giây`,

    // Tên của một bản phụ đề
    forcedTrack: (track: string): string => `${track} (bắt buộc)`,

    // Từ điển và bộ phân tích
    noAnswer: 'tiện ích không phản hồi — hãy tải lại trang để khởi động lại',
    analyserLoading: 'bộ phân tích vẫn đang tải',
    dictionaryLoading: 'từ điển vẫn đang tải',
    lookupFailed: 'tra từ thất bại',
  },

  grammar: {
    // Thì và mức lịch sự
    past: 'thể quá khứ',
    polite: 'thể lịch sự',

    // Phủ định
    negative: 'thể phủ định',
    'negative intent': 'ý chí phủ định',
    without: 'mà không',

    // Điều kiện
    conditional: 'thể điều kiện',
    whenever: 'hễ… là',

    // Bị động, khả năng, sai khiến
    passive: 'thể bị động',
    'passive or potential': 'bị động hoặc khả năng',
    potential: 'thể khả năng',
    causative: 'thể sai khiến',

    // Mong muốn
    'want to': 'muốn',
    'seems to want to': 'có vẻ muốn',
    'want someone to': 'muốn ai đó làm',

    // Phỏng đoán và nghe nói
    seems: 'có vẻ',
    'seems like': 'hình như',
    hearsay: 'nghe nói',
    apparently: 'dường như',
    probably: 'có lẽ',
    might: 'không chừng',

    // Điều nên làm, dự định
    'ought to': 'nên',
    'supposed to': 'chắc là',
    'intends to': 'định',

    // Bắt buộc và cho phép
    must: 'phải',
    'must not': 'không được',
    "don't have to": 'không cần',
    may: 'được phép',

    // Mệnh lệnh, nhờ vả, rủ rê
    imperative: 'thể mệnh lệnh',
    volitional: 'thể ý chí',
    'polite command': 'mệnh lệnh lịch sự',
    please: 'nhờ vả',

    // Nối với vế sau
    'te-form': 'thể て',
    listing: 'liệt kê',
    while: 'vừa… vừa',
    because: 'vì',
    'even though': 'mặc dù',
    'in order to': 'để',
    'so that': 'sao cho',

    // Trợ động từ sau thể て
    ongoing: 'đang',
    'resulting state': 'trạng thái kết quả',
    'completely, or regrettably': 'xong, hoặc lỡ',
    'in advance': 'làm sẵn',
    'try doing': 'thử',
    'going forward': 'tiếp diễn',
    'coming to be': 'dần trở nên',
    'receive the favour': 'được làm cho',
    'someone does for me': 'làm cho mình',
    'do for someone': 'làm cho người khác',

    // Trợ động từ sau thân động từ
    'too much': 'quá mức',
    'easy to': 'dễ',
    'hard to': 'khó',
    'start to': 'bắt đầu',
    'keep on': 'tiếp tục',
    finish: 'làm xong',
    again: 'làm lại',
    'each other': 'lẫn nhau',
    completely: 'đến hết',
    thoroughly: 'sâu',
    around: 'khắp nơi',
    'non-stop': 'không ngừng',

    // Dạng của một từ tiếng Tây Ban Nha
    or: 'hoặc',
    'first-person': 'ngôi thứ nhất',
    'second-person': 'ngôi thứ hai',
    'third-person': 'ngôi thứ ba',
    singular: 'số ít',
    plural: 'số nhiều',
    masculine: 'giống đực',
    feminine: 'giống cái',
    present: 'hiện tại',
    preterite: 'quá khứ đơn',
    imperfect: 'quá khứ chưa hoàn thành',
    'imperfect-se': 'quá khứ chưa hoàn thành (-se)',
    future: 'tương lai',
    'conditional-mood': 'thức điều kiện',
    indicative: 'thức trình bày',
    subjunctive: 'thức giả định',
    infinitive: 'nguyên mẫu',
    gerund: 'danh động từ',
    participle: 'phân từ',
    formal: 'trang trọng',
    informal: 'thân mật',
    'with-tú': 'với tú',
    'with-vos': 'với vos',
    'vos-form': 'dạng vos',
    voseo: 'voseo',
    'second-person-semantically': 'nghĩa là “bạn”',
    accusative: 'kèm tân ngữ trực tiếp',
    dative: 'kèm tân ngữ gián tiếp',
    'object-first-person': 'tân ngữ ngôi thứ nhất',
    'object-second-person': 'tân ngữ ngôi thứ hai',
    'object-third-person': 'tân ngữ ngôi thứ ba',
    'object-singular': 'tân ngữ số ít',
    'object-plural': 'tân ngữ số nhiều',
    diminutive: 'dạng giảm nhẹ',
    augmentative: 'dạng tăng cường',
    superlative: 'so sánh nhất',
    alternative: 'biến thể',
    'alt-of': 'cách viết khác',

    // Đuôi từ tiếng Hàn
    honorific: 'kính ngữ',
    'future or guess': 'tương lai hoặc phỏng đoán',
    'formal polite': 'lịch sự trang trọng',
    question: 'nghi vấn',
    but: 'nhưng',
    "let's": 'rủ rê',
    plain: 'thể trần thuật',
    'shall we, or I wonder': 'đề nghị hoặc tự hỏi',
    'I will': 'hứa hẹn',
    'just noticed': 'cảm thán',
    'as you know': 'như bạn biết',
    and: 'và',
    'because, or and then': 'nguyên nhân hoặc trình tự',
    'but, or given that': 'đối lập hoặc bối cảnh',
    'even if': 'dù… cũng',
    whether: 'có… hay không',
    'adverb form': 'dạng trạng từ',
    quoting: 'trích dẫn',
    'used to': 'hồi tưởng',
    topic: 'chủ đề',
    subject: 'chủ ngữ',
    object: 'tân ngữ',
    possessive: 'sở hữu',
    'come to': 'thành ra',
    when: 'khi',
    modifier: 'định ngữ',
    'noun form': 'danh từ hóa',
    becomes: 'trở nên',
    'have done before': 'đã từng',
  },
};
