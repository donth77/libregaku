import type { Translation } from '.';
import type { Settings } from '../settings';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';

/** The furigana or pinyin setting, as the bar and the player announce it. */
const RUBY: Record<Settings['ruby'], string> = { unknown: '새 단어', always: '항상', never: '끔' };

/**
 * What a card went in without, for `added` and `sentenceAdded`. On a video
 * that can be recorded only once the Libregaku icon has been clicked, it
 * says so after.
 */
const without = (missing: readonly MissingMedia[]): string => {
  const name: Record<MissingMedia, string> = { audio: '문장 오디오', 'audio-encrypted': '문장 오디오' };
  const what = [...new Set(missing.map((m) => name[m]))].join(', ');
  return missing.includes('audio-encrypted')
    ? `${what} 없음. 여기서 녹음하려면 Libregaku 아이콘을 클릭하세요`
    : `${what} 없음`;
};

/** Media on a new card, for the anki messages. */
const MEDIA: Record<'audio' | 'video' | 'picture', string> = { audio: '오디오', video: '동영상', picture: '이미지' };

/** The interface in Korean. Anything left out shows in English. */
export const ko: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `후리가나: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `병음: ${RUBY[mode]}`,
    mandarin: '중국어(표준어)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Languages
    languagesHeading: '언어',
    languagesAbout: '학습 언어와 내 언어를 선택합니다.',
    target: '학습 언어',
    targetLimited: (language: string): string => `${language} — 제한적`,
    supportFull: '읽는 법과 후리가나까지 모두 지원합니다.',
    supportPinyin: '병음까지 모두 지원합니다. 뜻은 영어로 나옵니다.',
    supportJyutping: 'Jyutping까지 모두 지원합니다. 뜻은 영어로 나옵니다.',
    supportWords: '모두 지원합니다. 뜻은 영어로 나옵니다.',
    script: '문자',
    scriptHint: '영상에 둘 다 있으면 이쪽을 사용합니다.',
    supportBasic: '기본 지원: 단어를 나누기만 하며, 사전과 읽는 법은 아직 없습니다.',
    native: '내 언어',
    nativeHint: '동영상과 사전에 이 언어가 있으면 번역과 뜻을 이 언어로 보여 줍니다.',
    definitions: '뜻 표시 언어',
    definitionsHint: '사전에 내 언어로 된 뜻이 없어서 이 언어로 보여 줍니다.',
    definitionsHintFor: (language: string): string => `사전에 ${language} 뜻이 없어서 이 언어로 보여 줍니다.`,

    // Looking words up
    lookupHeading: '단어 찾기',
    lookupAbout: '단어 뜻을 언제, 어떻게 보여 줄지 선택합니다.',
    interaction: '찾기 방식',
    interactionHover: '마우스 오버',
    interactionShift: 'Shift 누른 채 마우스 오버',
    interactionClick: '클릭',
    interactionHint: '단어를 클릭해도 언제나 찾을 수 있습니다.',
    hoverPause: '찾는 동안 일시정지',
    hoverPauseHint: '단어에 마우스를 올려 두는 동안 동영상을 일시정지합니다.',
    sidebarHover: '스크립트에서 뜻 미리보기',
    sidebarHoverHint: '스크립트의 단어를 가리키면 짧은 뜻을 보여 줍니다.',

    // Word popup
    popupHeading: '단어 팝업',
    popupAbout: '단어를 찾을 때 팝업에 무엇을 보여 줄지 선택합니다.',
    cardDeckMenu: '덱 메뉴',
    cardDeckMenuHint: '‘Anki에 추가’ 옆에 다른 덱을 고르는 ▾가 생깁니다. 이후 새 카드는 그 덱에 추가됩니다.',
    cardHideAdd: 'Anki에 추가 숨기기',
    cardHideAddHint: '카드에서 ‘Anki에 추가’ 버튼과 그 옆의 덱 메뉴를 없앱니다.',
    cardKanji: '한자 풀이',
    cardKanjiHint: '한자마다 뜻과 읽는 법을 보여 줍니다.',
    cardHanzi: '한자 풀이',
    cardHanziHint: '한자마다 뜻과 읽는 법을 보여 줍니다.',
    lookupElsewhere: '이 동영상의 예문',
    lookupElsewhereHint: '이 동영상에서 같은 단어가 나오는 다른 문장을 보여 줍니다. 클릭하면 재생됩니다.',

    // Subtitles
    subtitlesHeading: '자막',
    subtitlesAbout: '동영상 위 자막의 모양을 조정합니다.',
    ruby: '후리가나',
    rubyUnknown: '새 단어에만',
    rubyAlways: '항상',
    rubyNever: '끔',
    rubyHint: '한자 위에 읽는 법을 표시합니다. 시청 중에 R을 눌러 바꿀 수 있습니다.',
    pinyin: '병음',
    pinyinHint: '한자 위에 병음을 표시합니다. 시청 중에 R을 눌러 바꿀 수 있습니다.',
    jyutping: 'Jyutping',
    jyutpingHint: '한자 위에 Jyutping을 표시합니다. 시청 중에 R을 눌러 바꿀 수 있습니다.',
    blurPrimary: '자막 흐리게',
    blurPrimaryHint: '듣기 연습용: 마우스를 올리기 전까지 자막을 흐리게 보여 줍니다. H를 눌러 바꿀 수 있습니다.',
    showSubtitles: '영상 자막',
    showSubtitlesHint: '영상 위에 자막을 표시합니다. 끄면 상단 바, 대본, 패널만 남습니다. 상단 바의 버튼은 번역 끔, 자막 끔, 둘 다 켬 순서로 바뀌며, ↑ 키도 같습니다.',
    subtitleSize: '글자 크기',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: '플레이어 크기에 맞춰 바뀌므로 전체 화면에서도 똑같이 보입니다.',
    subtitleBottom: '위치',
    subtitleBottomLowest: '가장 낮게',
    subtitleBottomLow: '낮게',
    subtitleBottomNormal: '보통',
    subtitleBottomRaised: '조금 높게',
    subtitleBottomHigh: '높게',
    subtitleBottomHighest: '가장 높게',
    subtitleBottomHint: '자막을 표시할 높이입니다. 같은 플레이어의 다른 자막 확장 프로그램은 그 아래에 표시됩니다.',
    dualSubtitles: '번역 표시',
    dualSubtitlesHint:
      '학습 언어 자막 아래에 내 언어 자막을 보여 줍니다. 기계 번역이 아니라 사이트의 자막이며, ' +
      '동영상 전체 스크립트가 있어야 합니다.',
    singleKeys: '단일 키 단축키',
    singleKeysHint:
      'A, R 같은 문자 키는 시청 중에 단독으로 작동합니다. 끄면 Alt와 Shift를 함께 누른 채로 사용합니다. ' +
      '화살표 키는 설정과 상관없이 작동합니다.',

    // Underlines
    underlinesHeading: '밑줄',
    underlinesAbout: '색마다 단어를 얼마나 아는지 나타냅니다. 클릭해서 색을 바꾸세요.',
    colorUnknown: '새 단어',
    colorUnknownHint: 'Anki에 카드가 없는 단어입니다.',
    colorLearning: '학습 중',
    colorLearningHint: '카드가 아직 성숙하지 않은 단어입니다.',
    colorTracking: '관심 단어',
    colorTrackingHint: '관심 단어로 표시한 단어입니다.',
    colorKnown: '아는 단어',
    colorKnownHint: '성숙 카드가 있거나 아는 단어로 표시한 단어입니다.',
    underlines: '단어에 밑줄',
    underlinesHint: '끄면 단어 아래 색이 없는 일반 자막으로 표시됩니다.',
    markKnown: '아는 단어에도 밑줄',
    markKnownHint: '기본적으로 꺼져 있어서, 배울수록 화면이 깔끔해집니다.',
    underlineGrammar: '관사와 대명사에도 밑줄 표시',
    underlineGrammarHint: '기본값은 꺼짐입니다. “the”, “나”, “그” 같은 단어는 찾아볼 수 있지만 배울 단어로 세지 않습니다.',
    defaultColours: '기본 색상',
    resetColours: '초기화',

    // Transcript
    transcriptHeading: '스크립트',
    transcriptAbout: '동영상 옆에서 모든 자막 줄을 보여 주는 패널입니다.',
    sidebarFollow: '동영상 따라 스크롤',
    sidebarFollowHint: '현재 줄이 계속 보이게 합니다. 직접 스크롤하면 멈추고, 버튼을 누르면 다시 따라갑니다.',
    headerBar: '헤더 표시',
    headerBarHint: '마우스를 동영상 위쪽에 가까이 가져가면 나타납니다.',
    languageBadge: '언어 배지',
    languageBadgeFlag: '국기',
    languageBadgeCode: '코드',
    badgeFlag: '배지 국기',
    badgeFlagDefault: '기본값',
    flagSearch: '검색…',
    flagSearchLabel: '국가 검색',
    flagSuggested: '추천',
    flagAll: '모든 국가',
    flagNone: (query: string): string => `“${query}”에 맞는 국가가 없습니다.`,
    badgeFlagHint: '학습 언어에 표시할 국기입니다. 언어마다 따로 저장됩니다.',
    languageBadgeHint: '헤더에 학습 언어를 표시하는 방식입니다.',
    sidebarStats: '새 단어 세기',
    sidebarStatsHint: '줄마다 새 단어 수, 아는 단어 비율, 그리고 이를 이용한 필터를 보여 줍니다.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Anki를 연결하고, 새 카드를 추가할 덱과 아는 단어의 기준이 될 덱을 선택합니다.',
    deck: '새 카드를 추가할 덱',
    deckHint: '새 카드는 모두 이 덱에 추가됩니다.',
    statusScope: '아는 단어 기준 덱',
    statusScopeHint: '이 덱의 카드에 따라 밑줄을 그을 단어가 정해집니다. 하위 덱도 포함합니다.',
    marksInAnki: 'Anki에 표시 저장',
    marksInAnkiHint:
      '아는 단어, 관심 단어, 무시 표시를 Anki에 숨겨진 노트(Libregaku::Marks)로 저장해 다른 기기와 ' +
      '동기화합니다. 끄면 이 브라우저에만 남습니다.',

    // The deck menus
    wholeCollection: '전체 컬렉션',
    chooseDeck: '덱 선택…',
    deckNotInAnki: (deck: string): string => `${deck} — Anki에 없음`,
    deckAndSubdecks: (deck: string): string => `${deck} (하위 덱 포함)`,
    deckUnset: '덱을 선택하세요. 선택하기 전에는 카드를 추가할 수 없습니다.',
    deckMissing: (deck: string): string => `Anki에 “${deck}” 덱이 더 이상 없습니다. 다른 덱을 선택하세요.`,
    statusScopeMissing: (deck: string): string =>
      `Anki에 “${deck}” 덱이 더 이상 없어서 모든 단어가 새 단어로 표시됩니다. 다른 덱을 선택하세요.`,
    statusScopeOutside: (deck: string): string =>
      `새 카드는 “${deck}” 덱에 추가되는데 이 덱이 여기에 포함되지 않아, 추가한 단어가 계속 새 단어로 밑줄이 그어집니다. ` +
      '이 덱을 포함하는 덱이나 전체 컬렉션을 선택하세요.',

    // Where Anki stands
    ankiChecking: '확인 중…',
    ankiConnected: '연결되었습니다.',
    noteTypeInstalled: '노트 유형을 설치했습니다.',
    cardsMade: (n: number): string => `Libregaku로 만든 카드가 ${n}장 있습니다.`,
    noCards: '아직 카드가 없습니다.',
    cardsFlushed: (n: number): string => `Anki가 닫혀 있는 동안 만든 카드 ${n}장을 추가했습니다.`,
    cardsNotFlushed: (n: number, error: string): string => `카드 ${n}장을 추가하지 못했습니다: ${error}`,
    cardsWaiting: (n: number): string => `카드 ${n}장이 추가를 기다리고 있습니다.`,
    ankiOffline: (port: number): string =>
      `Anki가 포트 ${port}에서 응답하지 않습니다. Anki가 닫혀 있으면 정상입니다. ` +
      '새 카드는 여기서 기다렸다가 Anki가 열리면 추가됩니다.',
    ankiBlocked: 'Anki는 실행 중이지만 AnkiConnect가 아직 이 확장 프로그램을 허용하지 않습니다.',
    ankiOccupied: (detail: string): string => `${detail} Anki가 포트를 쓸 수 있도록 그 프로그램을 닫으세요.`,

    // The Anki buttons
    checkAgain: '다시 확인',
    newDeck: '새 덱',
    openCards: 'Anki에서 카드 보기',
    openMarks: 'Anki에서 표시 보기',
    newDeckPrompt: '새 덱 이름을 입력하세요. 하위 덱은 ::로 구분합니다(예: 일본어::Netflix).',

    // Connecting Anki
    installStep: '이 컴퓨터에 Anki를 설치하고 실행하세요. {link}',
    getAnki: 'Anki 다운로드',
    addonStep: 'Anki에서 {menu}를 열고 이 코드를 붙여넣은 다음, Anki를 다시 시작하세요.',
    addonMenu: '도구 → 확장 프로그램 → 확장 프로그램 가져오기…',
    aboutAnkiConnect: 'AnkiConnect 정보',
    originStep: 'Anki에서 {menu}을 열고 {setting}에 이 줄을 추가한 다음, Anki를 다시 시작하세요.',
    originMenu: '도구 → 확장 프로그램 → AnkiConnect → 설정',
    runningStep: '시청하는 동안 Anki를 열어 두세요. 카드는 이 컴퓨터의 Anki로 바로 들어갑니다.',
    copy: '복사',
    copyValue: (value: string): string => `${value} 복사`,
    copied: '복사됨',
    copyFailed: '직접 선택하세요',

    // Anki cards
    ankiCardsHeading: 'Anki 카드',
    ankiCardsAbout: '단어, 읽는 법, 뜻, 문장 외에 새 카드에 넣을 항목을 선택합니다.',
    cardAudio: '단어 오디오',
    cardAudioHint: '단어를 녹음한 발음이 있으면 넣습니다. 합성 음성은 넣지 않습니다.',
    cardSentenceAudio: '문장 오디오',
    cardSentenceAudioHint: '문장을 한 번 더 재생해서 녹음합니다. 보호된 사이트에서는 아래 권한이 필요합니다.',
    cardScreenshot: '스크린샷',
    cardScreenshotHint: '장면을 캡처한 이미지입니다. 보호된 사이트는 캡처를 막기 때문에 거기서는 쓸 수 없습니다.',
    capture: '보호된 사이트의 문장 오디오',
    captureAllow: '허용',
    captureAllowInSettings: '설정에서 허용',
    captureRemove: '허용 취소',
    captureAllowed: '허용되었습니다. 보호된 사이트의 탭마다 Libregaku 아이콘을 클릭하고 ‘여기서 문장 오디오 녹음’을 선택하세요.',
    captureNeeded: '보호된 사이트는 동영상을 암호화하기 때문에 문장 오디오를 탭에서 녹음합니다. 이를 위해 권한이 필요합니다.',

    // Data and licences
    creditsHeading: '데이터 및 라이선스',
    creditJmdict:
      '사전 및 한자 데이터 © Electronic Dictionary Research and Development Group. CC BY-SA 4.0에 따라 ' +
      '사용합니다. jmdict-simplified가 JSON으로 변환했습니다.',
    creditLindera:
      '일본어, 한국어, 중국어를 단어로 나눕니다. MIT 라이선스이며, IPADIC, UniDic, mecab-ko-dic, CC-CEDICT에는 각각 별도의 약관이 있습니다.',
    creditCedict: '중국어 사전 © MDBG 및 기여자. CC BY-SA 4.0에 따라 사용합니다.',
    creditWiktionary:
      '한국어·스페인어 사전과 내 언어로 된 일부 사전. Wiktionary에서 kaikki.org와 wiktionary-to-yomitan을 거쳐 가져왔습니다. ' +
      'CC BY-SA 4.0.',
    creditKrdict: '한국어 단어를 내 언어로 설명합니다. © 국립국어원. CC BY-SA 2.0 KR에 따라 사용합니다. 파일은 Lyroxide가 만들었습니다.',
    creditCfdict: '중국어를 프랑스어로 설명합니다. CFDICT © chine.in. CxDICT가 최신 상태로 유지합니다. CC BY-SA 4.0.',
    creditCanto: '광둥어 사전과 CC-CEDICT용 Jyutping 표기. © Pleco Inc., CC BY-SA 3.0에 따라 사용합니다.',
    creditHandedict: '중국어를 독일어로 설명합니다. © HanDeDict 및 기여자. CC BY-SA 3.0에 따라 사용합니다.',
    creditUnihan: '한자의 여러 읽는 법 중 먼저 보여 줄 것을 정합니다. © Unicode, Inc., Unicode License에 따라 사용합니다.',
    creditJotoba: '사전을 다운로드하는 동안 단어 찾기에 사용합니다. 둘 다 JMdict를 씁니다.',
    creditLucide: '아이콘. ISC 라이선스.',
    creditCommons: '자원봉사자들이 읽은 스페인어, 중국어, 한국어 단어 녹음입니다. 녹음마다 라이선스가 다르며(대부분 CC BY-SA 4.0), 재생할 때와 카드에 화자 이름과 함께 표시됩니다.',
    creditAudioCmn: 'Yue Tan(캉 대학교)이 읽은 중국어 단어 녹음입니다. CC BY-SA 3.0 US.',
    creditNaver: '네이버 사전의 한국어 단어 녹음으로, 단어 검색 카드에서만 재생됩니다. 재사용이 허락되지 않아 카드에는 절대 넣지 않습니다.',
    creditSpanishdict: 'SpanishDict의 스페인어 단어 합성 음성으로, 녹음이 없을 때 발음 버튼으로 재생됩니다. 재사용이 허락되지 않아 카드에는 절대 넣지 않습니다.',
    licence: 'Libregaku는 MIT 라이선스입니다. 사전 데이터는 포함되어 있지 않고, 원래 출처에서 다운로드합니다.',
    built: (when: string): string => `이 버전은 ${when}에 빌드되었습니다.`,

    // The keyboard shortcuts view
    keyLine: '이전/다음 줄',
    keyReplay: '현재 줄 다시 재생',
    keyTranslation: '번역 표시/숨기기',
    keyShiftLookup: '누른 채로 마우스 아래 단어 찾기',
    keyAdd: '팝업의 단어를 Anki에 추가',
    keyKnown: '팝업의 단어를 아는 단어로 표시',
    keyFurigana: '후리가나 전환: 끔, 새 단어, 항상',
    keyPinyin: '병음 전환: 끔, 새 단어, 항상',
    keyJyutping: 'Jyutping 전환: 끔, 새 단어, 항상',
    keyBlur: '자막 흐리게/선명하게',
    keySave: '현재 줄 저장',
    keyTranscript: '스크립트 패널 표시/숨기기',
    keyClose: '팝업 닫기',
  },

  options: {
    pageTitle: 'Libregaku 설정',
    help: '도움말',
    searchSettings: '검색…',
    noSettingsFound: '“{q}”에 관한 내용이 없습니다.',
    contentsLabel: '설정 항목',
    settingsLabel: '설정',
    setupHeading: '시작하기',
    setupAbout: '두 가지만 정하면 됩니다. 나머지는 알맞은 기본값이 있습니다.',
    stepLanguages: '학습 언어 선택',
    stepAnki: 'Anki 연결 후 새 카드를 추가할 덱 선택',
    ankiOptional:
      'Anki는 없어도 됩니다. 자막, 단어 찾기, 후리가나는 모두 Anki 없이 작동합니다. ' +
      'Anki는 이미 아는 단어를 기억하는 역할을 합니다.',
    nextSteps:
      '그다음 학습 언어 자막이 있는 동영상을 열고 단어에 마우스를 올려 보세요. ' +
      '스크립트 패널의 키보드 버튼을 누르면 단축키 목록이 나옵니다.',
    stepDone: '완료',
    confirmLanguages: '이 언어가 맞습니다',
    keepDeck: (deck: string): string => `새 카드에 ${deck} 덱 사용`,
  },

  action: {
    help: '도움말',
    settings: '설정',
    settingsTip: '모든 설정',
    checkingPage: '이 페이지 확인 중…',
    notActive:
      '이 페이지에서는 작동하지 않습니다. YouTube, Netflix 또는 다른 지원 사이트의 동영상을 여세요. ' +
      'Libregaku를 방금 설치했거나 새로고침했다면 탭을 새로고침하세요.',
    unsupported: 'Libregaku는 YouTube, Netflix, Disney+, Prime Video, Max에서 작동합니다.',
    worksOn: (site: string): string => `Libregaku는 ${site}에서 작동합니다.`,
    waitingForSubtitles: (site: string): string => `${site} 자막을 기다리는 중입니다. 자막이 켜져 있는지 확인하세요.`,
    activeOn: (title: string): string => `작동 중 — ${title}`,
    active: '이 동영상에서 작동 중입니다.',
    subtitlesTrack: '자막',
    translationTrack: '번역',
    noTranslation: '없음',
    generatedTrack: (track: string): string => `${track} (자동 생성됨)`,
    captureNeedsPermission: '여기서 문장 오디오를 녹음하려면 이 탭의 소리를 캡처할 권한이 필요합니다.',
    captureAllowInSettings: '설정에서 허용',
    captureReady: '보호된 사이트의 소리는 이 탭에서 녹음을 켠 뒤에만 녹음할 수 있습니다.',
    captureStart: '여기서 문장 오디오 녹음',
    captureFailed: 'Chrome에서 이 탭을 녹음할 수 없습니다.',
    toggleSidebar: '사이드바 전환',
    ankiChecking: 'Anki: 확인 중…',
    ankiConnected: (n: number): string => `Anki 연결됨 · Libregaku 카드 ${n}장`,
    ankiOffline: 'Anki가 실행되지 않음 — 모든 단어가 새 단어로 표시됨',
    ankiOccupied: (port: number): string => `다른 프로그램이 포트 ${port} 사용 중 — Anki에 연결할 수 없음`,
    ankiBlocked: 'Anki가 이 확장 프로그램을 거부함 — 추가할 줄은 설정에 있음',
    ankiBusy: 'Anki가 응답하지 않음 — 동기화 중일 수 있음',
    ankiRefused: 'Anki가 요청을 거부함',
    cardsToAdd: (n: number): string => `추가할 카드 ${n}장 남음`,
    cardsWaiting: (n: number): string => `카드 ${n}장 Anki 대기 중`,
  },

  sidebar: {
    panelLabel: '스크립트 패널',
    resizeLabel: '패널 크기 조절',

    // The tabs, and the icon buttons beside them
    tabsLabel: '목록',
    transcriptTab: '스크립트',
    savedTab: '저장됨',
    settings: '설정',
    shortcuts: '단축키',
    close: '닫기',
    closeLabel: '닫기 — 스크립트 패널',
    openTip: '스크립트',
    openLabel: '스크립트 표시',
    help: '도움말',

    // Searching the transcript
    searchPlaceholder: '스크립트 검색…',
    searchLabel: '스크립트 검색',
    noMatches: '결과 없음',
    matchAt: (at: number, total: number): string => `${at}/${total}`,
    matchesFound: (n: number): string => `${n}줄 찾음`,

    // The filter button and its menu
    filterTip: '필터',
    filterLabel: '줄 필터',
    filterAll: '모든 줄',
    filterAllAbout: '모든 줄 보기',
    filterNew: '새 단어 있음',
    filterNewAbout: '카드가 없는 단어가 있는 줄',
    filterReady: '배우기 좋은 줄',
    filterReadyAbout: '새 단어가 딱 하나뿐인 줄. 가장 배우기 쉽습니다',
    filterSaved: '저장한 줄',
    filterSavedAbout: '나중에 보려고 저장한 줄',

    // The transcript
    partial: '보는 동안 채워집니다. 이 플레이어는 현재 줄만 제공합니다.',
    partialEmpty: '아직 아무것도 없습니다. 대사가 나오면 여기에 줄이 표시됩니다.',
    empty: '불러온 스크립트가 없습니다.',
    currentLine: '현재 줄',
    lineNew: (n: number): string => `새 단어 ${n}개`,
    playFrom: (time: string): string => `${time}부터 재생`,
    saveLine: '줄 저장',
    unsave: '저장 취소',
    addSentence: '문장 추가',
    addSentenceLabel: '문장을 Anki에 추가',

    // The summary over the transcript
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: '아는 단어 {n}',
    summaryNew: '새 단어 {n}개',
    summaryReady: '배우기 좋은 줄 {n}개',
    counting: (percent: number): string => `새 단어 세는 중… ${percent}%`,
    countFailed: '일부 줄을 세지 못해서 합계를 낼 수 없습니다.',

    // The card that shows a word's meaning while the pointer is over it
    dictionaryLoading: (percent: number): string => `사전 불러오는 중… ${percent}%`,
    dictionaryUnavailable: '사전을 사용할 수 없음',
    noEntry: '사전에 없는 단어입니다.',

    // The Saved tab
    savedEmpty: '아직 저장한 줄이 없습니다. 다시 볼 문장은 스크립트 줄의 북마크를 누르거나 B를 눌러 저장하세요.',
    thisVideo: '이 동영상',
    openAt: (time: string): string => `${time} 위치에서 동영상 열기`,
    remove: '삭제',
    removeLabel: '저장한 줄에서 삭제',
    copySavedAbout: '저장한 줄을 모두 탭으로 구분된 텍스트로 복사',
    exportSavedAbout: 'Anki에서 가져올 수 있는 탭 구분 파일로 저장',
    addSavedAbout: '저장한 줄마다 카드 만들기',
    linesCopied: (n: number): string => `${n}줄을 복사했습니다.`,
    chooseDeck: '먼저 설정에서 덱을 선택하세요. 새 카드는 그 덱에 추가됩니다.',
    checkingAnki: 'Anki 확인 중…',
    ankiOffline: 'Anki가 실행되고 있지 않습니다. Anki를 연 다음 다시 시도하세요. 방법은 설정에 있습니다.',
    ankiBlocked: 'AnkiConnect가 아직 이 확장 프로그램을 허용하지 않았습니다. 추가할 한 줄은 설정에 있습니다.',
    ankiUnreachable: 'Anki에 연결할 수 없습니다. 이유는 설정에서 확인하세요.',
    adding: (at: number, total: number): string => `추가 중… ${at}/${total}`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${deck}에 카드 ${added}장을 추가했습니다${already ? ` (${already}장은 이미 있음)` : ''}.`,

    // Buttons and messages the Saved and Words tabs share
    copy: '복사',
    exportFile: '파일 내보내기',
    addToAnki: 'Anki에 추가',
    noClipboard: '클립보드에 접근할 수 없습니다.',
    downloaded: '다운로드 폴더에 저장했습니다. Anki에서 파일 → 가져오기를 이용하세요.',
    downloadBlocked: '이 페이지에서 다운로드가 차단되었습니다. 대신 복사를 이용하세요.',

    // The Words tab
    listsLabel: '목록 선택',
    listLines: '저장한 줄',
    listTracked: '관심 단어',
    listKnown: '아는 단어',
    listIgnored: '무시한 단어',
    findPlaceholder: '검색…',
    findLabel: '이 목록에서 검색',
    copyWordsAbout: '이 목록을 탭으로 구분된 텍스트로 복사',
    exportWordsAbout: '이 목록을 Anki에서 가져올 수 있는 탭 구분 파일로 저장',
    wordsCopied: (n: number): string => `단어 ${n}개를 복사했습니다.`,
    nothingToExport: '이 목록에는 내보낼 항목이 없습니다.',
    lookingUp: '읽는 법과 뜻을 찾는 중…',
    noWordMatches: (query: string): string => `“${query}”에 맞는 단어가 이 목록에 없습니다.`,
    noLineMatches: (query: string): string => `“${query}”에 맞는 저장한 줄이 없습니다.`,
    wordsMatching: (shown: number, total: number): string => `단어 ${total}개 중 ${shown}개`,
    trackedEmpty:
      '아직 관심 단어가 없습니다. 관심 단어로 표시하면 카드를 만들지 않고도 단어에 밑줄이 생겨 눈에 잘 띕니다. ' +
      '설정의 ‘단어 팝업’에서 버튼을 켜세요.',
    trackedIntro: (n: number): string => `관심 단어 ${n}개: 나올 때마다 밑줄로 표시됩니다.`,
    stopTracking: '관심 단어 해제',
    knownEmpty: '아는 단어로 표시한 단어가 없습니다. 아는 단어인데 카드가 필요 없다면 팝업에서 아는 단어로 표시하거나 K를 누르세요.',
    knownIntro: (n: number): string =>
      `아는 단어로 표시한 단어 ${n}개. 표시를 해제하면 Anki 카드에 따른 상태로 돌아갑니다.`,
    unmarkKnown: '아는 단어 해제',
    ignoredEmpty: '무시한 단어가 없습니다. 이름이나 감탄사를 팝업에서 무시하면 밑줄도 긋지 않고 세지도 않습니다.',
    ignoredIntro: (n: number): string => `무시한 단어 ${n}개: 밑줄을 긋지 않고 세지도 않습니다.`,
    stopIgnoring: '무시 해제',
  },

  popup: {
    // The card, and the word at its head
    cardLabel: (word: string): string => `${word} — 사전`,
    commonBadge: '자주 쓰임',
    nameBadge: '이름일 수 있음',
    characterNames: { kanji: '한자', hanzi: '한자' },
    partOfSpeech: {
      n: '명사', 'n-adv': '부사적 명사', 'n-t': '시간 명사', 'n-suf': '명사 접미사',
      'n-pref': '명사 접두사', pn: '대명사', 'adj-i': 'い형용사', 'adj-na': 'な형용사',
      'adj-no': 'の형용사', 'adj-pn': '연체사', adv: '부사', 'adv-to': '부사',
      aux: '보조어', 'aux-v': '조동사', 'aux-adj': '보조 형용사',
      conj: '접속사', cop: '계사', ctr: '조수사', exp: '표현', int: '감탄사',
      num: '수사', prt: '조사', pref: '접두사', suf: '접미사', unc: '미분류',
      vs: 'する동사', 'vs-i': 'する동사', 'vs-s': 'する동사', vt: '타동사', vi: '자동사',
      v1: '1단동사', 'v1-s': '1단동사', vk: 'くる동사', vz: 'ずる동사',
      v5b: '5단동사', v5g: '5단동사', v5k: '5단동사', 'v5k-s': '5단동사',
      v5m: '5단동사', v5n: '5단동사', v5r: '5단동사', 'v5r-i': '5단동사',
      v5s: '5단동사', v5t: '5단동사', v5u: '5단동사', 'v5u-s': '5단동사',
      v5aru: '5단동사',
      // 한국어·스페인어 단어에 쓰이는 Wiktionary의 품사 코드.
      name: '고유 명사', v: '동사', adj: '형용사', pron: '대명사', det: '한정사', artic: '관사', counter: '분류사', prep: '전치사',
      'prep-phrase': '전치사구', ptcl: '조사', intj: '감탄사', phrase: '구', prov: '속담', r: '어근', char: '문자', adn: '관형사',
      ptcpl: '분사', contr: '축약형', masc: '남성', fem: '여성', neut: '중성', sg: '단수', pl: '복수', 'pl-only': '복수형만',
      count: '가산', uncount: '불가산', vr: '재귀', vdt: '이중 타동사', impers: '비인칭', irreg: '불규칙', reltnl: '관계 형용사',
      reltv: '관계사', interr: '의문', poss: '소유', dim: '지소형', aug: '지대형', onoma: '의성어', idio: '관용적', fig: '비유적',
      literal: '문자 그대로', col: '구어', inf: '비격식', fam: '친근한 말', formal: '격식', polite: '공손한 말', lit: '문어', poet: '시적',
      rhet: '수사적', sl: '속어', vulg: '비속어', derog: '경멸적', offens: '모욕적', humor: '익살', euph: '완곡어', child: '유아어',
      net: '인터넷', neol: '신조어', cmn: '흔함', uncmmn: '드묾', rare: '희귀', dated: '구식', arch: '고어', obs: '폐어', hist: '역사적',
      'non-std': '비표준', dialect: '방언', regio: '지역어',
    },

    // The row of icon buttons under the word
    pronounce: '발음 듣기',
    playedRecording: (word: string): string => `${word} · 녹음`,
    playedSynthesised: (word: string): string => `${word} · 합성 음성`,
    recordingBy: (speaker: string, licence: string): string => `녹음: ${speaker} · ${licence}`,
    pronounceFailed: '오디오를 재생할 수 없음',
    addSentence: '문장 추가',
    sentenceAdded: '문장 추가됨',
    undo: '실행취소',
    copyWord: '단어 복사',
    copyPhrase: '구절 복사',
    copySentence: '문장 복사',
    wordCopied: '단어 복사됨',
    phraseCopied: '구절 복사됨',
    sentenceCopied: '문장 복사됨',
    copyFailed: '복사할 수 없음 — 텍스트를 직접 선택하세요',

    // The meanings
    dictionaryLoading: (percent: number): string => `사전을 아직 불러오는 중입니다(${percent}%). 잠시 후 다시 시도하세요.`,
    dictionaryUnavailable: (error: string): string => `사전을 사용할 수 없음: ${error}`,
    noEntry: '사전에 없는 단어입니다.',
    noEntryName: '이름이라서 사전에 항목이 없습니다.',
    moreMeanings: (n: number): string => `+${n}개 더 보기`,

    // The word's other lines in this video
    elsewhereCount: (n: number): string => (n === 1 ? '이 동영상에 한 번 더 나옴' : `이 동영상에 ${n}번 더 나옴`),
    playLine: '재생',
    elsewhereMore: (n: number): string => `외 ${n}개 — 스크립트 검색으로 모두 찾을 수 있습니다`,
    showAllInTranscript: '스크립트에서 모두 보기',

    // Add
    addToAnki: 'Anki에 추가',
    addToDeck: (deck: string): string => `${deck}에 추가`,
    adding: '추가 중…',
    undoing: '실행취소 중…',
    added: '추가됨',
    addedUndo: '추가됨 — 실행취소',
    inAnki: 'Anki에 있음',
    showInAnki: 'Anki에서 보기',
    waiting: '대기 중',
    waitingForAnki: 'Anki 대기 중',
    goesInWhenAnkiOpens: 'Anki가 열리면 추가됩니다',
    alreadyAdded: '이미 추가됨',
    alreadyInAnki: '이미 Anki에 있음',
    waitingForAnkiToOpen: 'Anki가 열리기를 기다리는 중',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // The deck menu
    otherDecks: '다른 덱',
    addToAnotherDeck: '다른 덱에 추가',
    decksUnknown: 'Anki가 응답하지 않아 아직 덱 목록을 알 수 없습니다.',
    newDeck: '새 덱…',
    newDeckPrompt: '새 덱 — 하위 덱은 ::로 구분합니다(예: 일본어::Netflix)',

    // The marks
    knownButton: '아는 단어',
    trackButton: '관심 단어',
    ignoreButton: '무시',
    markKnownTip: '아는 단어로 표시',
    trackTip: '관심 단어로 표시',
    ignoreTip: '무시',
    unmarkKnownTip: '아는 단어 해제',
    stopTrackingTip: '관심 단어 해제',
    stopIgnoringTip: '무시 해제',
  },

  header: {
    knownStat: '아는 단어 {percent}',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: '아는 단어 비율',
    readyStat: '배우기 좋은 줄 {count}개',
    readyTip: '새 단어가 하나뿐인 줄',
    blurSubtitle: '자막 흐리게',
    unblurSubtitle: '자막 선명하게',
    showTranslation: '번역 표시',
    hideTranslation: '번역 숨기기',
    hideSubtitles: '자막 숨기기',
    showSubtitles: '자막 표시',
    subtitles: '자막',
    translation: '번역',
    transcript: '스크립트',
    pinHeader: '헤더 고정',
    unpinHeader: '헤더 고정 해제',
    settings: '설정',
    showHeader: '헤더 표시',
  },

  player: {
    // The player's keys
    lastLine: '마지막 줄입니다',
    noLineBefore: '이전 줄이 없습니다',
    translationOn: '번역 켜짐',
    translationOff: '번역 꺼짐',
    subtitlesOff: '자막 끔',
    subtitlesOn: '자막 켬',
    blurOn: '자막 흐리게: 마우스를 올리면 보입니다',
    blurOff: '자막 표시됨',
    lineSaved: '줄 저장됨',
    lineUnsaved: '줄 저장 취소됨',
    lookUpFirst: '먼저 단어를 찾아보세요',
    alreadyKnown: (word: string): string => `${word} · 이미 Anki에서 아는 단어`,
    alreadyInAnki: (word: string): string => `${word} · 이미 Anki에 있음`,
    adding: (word: string): string => `${word} 추가 중…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Marks
    markOff: (word: string): string => `${word} · 표시 해제됨`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = { known: '아는 단어로 표시됨', tracking: '관심 단어로 표시됨', ignored: '무시됨', unknown: '새 단어로 표시됨' }[status];
      if (refused) return `${word} · ${done} (카드 없음) — Anki가 거부해서 나중에 다시 시도합니다`;
      return `${word} · ${done} (카드 없음)${status === 'tracking' ? '. 패널의 저장됨 탭에서 볼 수 있습니다' : ''}`;
    },

    // A word's card
    pickDeck: '먼저 Libregaku 설정에서 덱을 선택하세요',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `${deck}에 추가됨 — ${without(missing)}` : `${deck}에 추가됨`,
    alreadyIn: (deck: string): string => `이미 ${deck}에 있음`,
    queued: (deck: string): string => `Anki가 닫혀 있음 — Anki가 열리면 ${deck}에 추가됩니다`,
    alreadyQueued: '이미 Anki 대기 중',
    notKept: 'Anki가 닫혀 있고, 브라우저가 카드를 나중을 위해 보관하지 못했습니다',
    takenBack: (deck: string): string => `${deck}에서 제거됨`,
    unqueued: 'Anki 대기 취소됨',
    alreadySent: '이미 Anki에 추가되었습니다',
    queueSent: (count: number): string =>
      `Anki 열림 — 보관해 둔 ${count === 1 ? '카드를' : `카드 ${count}장을`} 추가했습니다`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `아는 단어는 ${scope}에서 읽으므로 ${deck}의 카드는 반영되지 않습니다`,

    // A sentence card
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `${deck}에 문장 추가됨 — ${without(missing)}` : `${deck}에 문장 추가됨`,
    sentenceAlreadyIn: (deck: string): string => `문장이 이미 ${deck}에 있음`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && '오디오', picture && '스크린샷'].filter(Boolean);
      return `Anki가 닫혀 있음 — Anki가 열리면 문장이 ${deck}에 추가됩니다${lacking.length ? ` (${lacking.join('와 ')} 제외)` : ''}`;
    },
    sentenceAlreadyQueued: '문장이 이미 Anki 대기 중',
    sentenceTakenBack: (deck: string): string => `${deck}에서 문장 제거됨`,

    // Making a card's sentence audio
    recording: '줄 녹음 중…',

    // Lookups
    noDictionary: '이 언어의 사전은 아직 없습니다.',
  },

  notices: {
    // The card itself
    unexpected: 'Libregaku에 예기치 않은 문제가 생겼습니다.',
    dismiss: '닫기',

    // Titles: YouTube or Netflix changed something the extension reads
    youtubeTrackList: 'YouTube 자막 목록을 읽을 수 없습니다.',
    youtubeTrackShape: 'YouTube 자막 데이터가 예상한 형식이 아닙니다.',
    youtubeCaptionText: '페이지에서 YouTube 자막 텍스트를 찾을 수 없습니다.',
    youtubePlayerTrackList: 'YouTube 플레이어에서 이 동영상의 자막 목록을 읽을 수 없습니다.',
    netflixTrackList: 'Netflix 자막 목록을 읽을 수 없습니다.',
    netflixCaptionText: '페이지에서 Netflix 자막 텍스트를 찾을 수 없습니다.',
    disneyTrackList: 'Disney+ 자막 목록을 읽을 수 없습니다.',
    appleTrackList: 'Apple TV+ 자막 목록을 읽을 수 없습니다.',
    appleTiming: 'Apple TV+ 자막을 동영상에 맞출 수 없습니다.',
    disneyCaptionText: '페이지에서 Disney+ 자막 텍스트를 찾을 수 없습니다.',
    primeTrackList: 'Prime Video 자막 목록을 읽을 수 없습니다.',
    primeCaptionText: '페이지에서 Prime Video 자막 텍스트를 찾을 수 없습니다.',
    maxTrackList: 'Max 자막 목록을 읽을 수 없습니다.',
    maxCaptionText: '페이지에서 Max 자막 텍스트를 찾을 수 없습니다.',
    netflixBlocked: 'Netflix가 Libregaku의 자막 읽기 기능을 차단했습니다.',

    // Titles: this video's subtitles
    subtitlesOff: '플레이어에서 자막을 켜면 Libregaku가 자막을 읽어 옵니다.',
    trackNotSent: '플레이어가 이 자막을 아직 불러오지 않았습니다.',
    noTargetTrack: '학습 언어로 된 자막이 없습니다.',
    noSecondTrack: '내 언어로 된 자막이 없어서 번역 줄을 표시할 수 없습니다.',
    onlyOneTrack: '이 동영상은 자막 트랙이 하나뿐이라 번역 줄을 표시할 수 없습니다.',
    autoGenerated: '자동 생성된 자막이라 문장과 단어 구분이 정확하지 않을 수 있습니다.',
    noSubtitles: '이 동영상에는 자막이 없습니다.',
    secondTrackFailed: '번역 줄을 불러오지 못했습니다.',

    // Titles: the extension's own parts
    analyserUnavailable:
      '언어 분석기를 불러오지 못해 읽는 법과 사전형을 쓸 수 없습니다. 단어는 표기가 정확히 같을 때만 카드와 연결됩니다.',
    markNotSaved: '표시를 저장하지 못했습니다. 새로고침하기 전까지만 적용되고, 그 뒤에는 사라집니다.',
    marksNotSynced: '표시를 Anki에 저장하지 못했습니다. 이 브라우저에 보관해 두고 다시 시도합니다.',
    cardsNotAdded: 'Anki가 닫혀 있는 동안 보관한 카드 중 일부를 Anki가 받지 않았습니다. 계속 보관하며 다시 시도합니다.',

    // Details
    playerNeverLoaded: '플레이어 로딩이 끝나지 않았습니다.',
    subtitlesMaybeOff: '플레이어에서 자막이 꺼져 있는 것일 수도 있습니다.',
    lookedFor: (selector: string): string => `검색한 선택자: ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `이 동영상의 자막: ${languages.join(', ') || '없음'}. 설정에서 학습 언어를 바꾸거나 다른 동영상을 고르세요.`,
    onlyPictures: '이 동영상의 자막은 텍스트가 아닌 이미지로만 되어 있어 Libregaku가 읽을 수 없습니다.',
    chooseInPlayer: (track: string): string => `플레이어의 자막 메뉴에서 ${track}을(를) 선택하면 Libregaku가 자막을 읽어 옵니다.`,
    noHumanTrack: '이 동영상에는 사람이 작성한 자막이 없습니다.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `이 동영상의 자막: ${languages.join(', ')}.`,
    analyserDidNotLoad: '분석기를 불러오지 못함',
  },

  anki: {
    // Reaching AnkiConnect
    offline: (port: number): string => `포트 ${port}에서 응답하는 프로그램이 없습니다.`,
    timeout: (port: number, seconds: number): string =>
      `${seconds}초 안에 포트 ${port}에서 응답이 없었습니다. ` +
      'Anki가 바쁘거나(동기화 중이거나 대화 상자를 띄운 상태) 다른 프로그램이 포트를 쓰고 있을 수 있습니다.',
    blocked: (origin: string): string =>
      `AnkiConnect가 거부했습니다: ${origin}. Anki에서 도구 → 확장 프로그램 → AnkiConnect → 설정을 열고 ` +
      'webCorsOriginList에 그 줄을 추가하세요.',
    httpAnswer: (port: number, status: number): string =>
      `포트 ${port}에서 HTTP ${status} 응답이 왔습니다. AnkiConnect의 응답이 아닙니다.`,
    notAnkiConnect: (port: number): string => `포트 ${port}에서 AnkiConnect가 아닌 다른 프로그램이 실행 중입니다.`,
    noBackground: '확장 프로그램의 백그라운드가 응답하지 않습니다.',
    unreachable: 'Anki에 연결할 수 없습니다.',
    callFailed: 'AnkiConnect 호출에 실패했습니다.',

    // Libregaku refusing, itself, to send Anki something it does not use
    notRelayed: (action: string): string => `Libregaku는 “${action}” 요청을 AnkiConnect에 보내지 않습니다.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku는 직접 가져온 ${MEDIA[media]}만 첨부합니다.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `이 노트의 ${MEDIA[media]}에 데이터가 없습니다.`,
    mediaName: (prefix: string): string =>
      `Libregaku가 추가하는 파일 이름은 ${prefix}… 형식이지만, 이 파일은 그렇지 않습니다.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action}에는 ${ids === 'notes' ? '노트' : '카드'} 목록이 필요합니다.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string => {
      const sent = ids === 'notes' ? `노트 가운데 Libregaku 표시가 아닌 것이 ${count}개` : `카드 가운데 Libregaku 표시가 아닌 것이 ${count}장`;
      const only = change === 'delete'
        ? 'Libregaku는 자신의 표시와, 최근 몇 분 안에 만들어 아직 학습하지 않은 카드만 삭제합니다.'
        : change === 'suspend'
          ? 'Libregaku는 자신의 표시만 일시중단합니다.'
          : 'Libregaku는 자신의 표시에만 태그를 다시 붙입니다.';
      return `거부됨: 보낸 ${sent} 있습니다. ${only}`;
    },

    // The note types Libregaku makes in Anki
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Anki의 “${noteType}” 노트 유형에 ${fields.join(', ')} 필드가 없어서 ${loses === 'cards' ? '카드' : '노트'}에서 ` +
      '그 내용이 빠지게 됩니다. Libregaku는 직접 수정했을 수도 있는 노트 유형을 바꾸지 않습니다. ' +
      `Anki에서 도구 → 노트 타입 관리로 가서 “${noteType}”의 이름을 바꾸거나 필드를 다시 추가한 다음, ` +
      '‘다시 확인’을 누르면 새 노트 유형이 설치됩니다.',

    // Marks and waiting cards
    marksNotAdded: (count: number): string =>
      `Anki가 표시 ${count}개를 추가하지 않았습니다. 대기열에 남아 있다가 다음에 다시 시도합니다.`,
    marksNotStored: (cause: string): string => `브라우저 저장소가 Anki에서 읽어 온 표시의 저장을 거부했습니다: ${cause}`,
    storageUnreadable: (cause: string): string => `브라우저 저장소를 읽을 수 없습니다: ${cause}`,
  },

  errors: {
    // Recording a tab's sound for sentence audio
    captureNotAllowed: '먼저 Libregaku 설정에서 이 사이트의 문장 오디오를 허용하세요.',
    captureRefused: 'Chrome이 이 탭을 캡처하지 않았습니다',

    // A subtitle track that would not load
    unknownTrack: (id: string): string => `알 수 없는 트랙 ${id}`,
    trackNotSent: '플레이어가 아직 불러오지 않았습니다. 플레이어의 자막 메뉴에서 한 번 선택해 주세요',
    noCaptionFormat: (attempts: readonly string[]): string => `작동하는 자막 형식이 없음 — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `작동하는 자막 URL이 없음 — ${attempts.join('; ') || '목록 없음'}`,
    emptyAnswer: '비어 있음',
    noCues: '자막 0줄',
    noCuesParsed: '분석 결과 자막 0줄',
    noAnswerWithin: (seconds: number): string => `${seconds}초 동안 응답 없음`,

    // A track's name in the toolbar popup's subtitle menus, and in notices
    forcedTrack: (track: string): string => `${track} (강제 자막)`,

    // The dictionary and the analyser
    noAnswer: '확장 프로그램이 응답하지 않음 — 페이지를 새로고침하면 다시 시작됩니다',
    analyserLoading: '분석기를 아직 불러오는 중',
    dictionaryLoading: '사전을 아직 불러오는 중',
    lookupFailed: '단어 찾기 실패',
  },

  grammar: {
    // Tense and politeness
    past: '과거',
    polite: '정중',

    // Not doing it
    negative: '부정',
    'negative intent': '부정 의지',
    without: '~하지 않고',

    // If and when
    conditional: '조건',
    whenever: '~하면 항상',

    // Who does it, and whether it can be done
    passive: '수동',
    'passive or potential': '수동 또는 가능',
    potential: '가능',
    causative: '사역',

    // Wanting
    'want to': '~하고 싶다',
    'seems to want to': '~하고 싶어하다',
    'want someone to': '~해 주길 바라다',

    // How the speaker knows it, and how sure they are
    seems: '~할 것 같다',
    'seems like': '~인 것 같다',
    hearsay: '~라고 한다',
    apparently: '~인 듯하다',
    probably: '~일 것이다',
    might: '~일지도 모른다',

    // What should happen, or is meant to
    'ought to': '~해야 마땅하다',
    'supposed to': '~할 터이다',
    'intends to': '~할 생각이다',

    // Having to, and being allowed to
    must: '~해야 한다',
    'must not': '~하면 안 된다',
    "don't have to": '~하지 않아도 된다',
    may: '~해도 된다',

    // Commands, requests and "let's"
    imperative: '명령',
    volitional: '의지',
    'polite command': '정중한 명령',
    please: '~해 주세요',

    // Joining to what comes next
    'te-form': 'て형',
    listing: '나열',
    while: '~하면서',
    because: '~라서',
    'even though': '~인데도',
    'in order to': '~하기 위해',
    'so that': '~하도록',

    // Helper verbs after the te-form
    ongoing: '~하고 있다',
    'resulting state': '~되어 있다',
    'completely, or regrettably': '~해 버리다',
    'in advance': '~해 두다',
    'try doing': '~해 보다',
    'going forward': '~해 가다',
    'coming to be': '~해 오다',
    'receive the favour': '~해 받다',
    'someone does for me': '(나에게) ~해 주다',
    'do for someone': '(남에게) ~해 주다',

    // Helper verbs after the verb's stem
    'too much': '너무 ~하다',
    'easy to': '~하기 쉽다',
    'hard to': '~하기 어렵다',
    'start to': '~하기 시작하다',
    'keep on': '계속 ~하다',
    finish: '다 ~하다',
    again: '다시 ~하다',
    'each other': '서로 ~하다',
    completely: '완전히 ~하다',
    thoroughly: '깊이 ~하다',
    around: '~하고 다니다',
    'non-stop': '마구 ~하다',

    // Forms of a Spanish word
    or: '또는',
    'first-person': '1인칭',
    'second-person': '2인칭',
    'third-person': '3인칭',
    singular: '단수',
    plural: '복수',
    masculine: '남성',
    feminine: '여성',
    present: '현재',
    preterite: '단순과거',
    imperfect: '불완료과거',
    'imperfect-se': '불완료과거(-se)',
    future: '미래',
    'conditional-mood': '가능법',
    indicative: '직설법',
    subjunctive: '접속법',
    infinitive: '부정사',
    gerund: '현재분사',
    participle: '분사',
    formal: '존칭',
    informal: '친칭',
    'with-tú': 'tú형',
    'with-vos': 'vos형',
    'vos-form': 'vos형',
    voseo: 'voseo',
    'second-person-semantically': '의미상 2인칭',
    accusative: '직접목적어 결합',
    dative: '간접목적어 결합',
    'object-first-person': '1인칭 목적어',
    'object-second-person': '2인칭 목적어',
    'object-third-person': '3인칭 목적어',
    'object-singular': '단수 목적어',
    'object-plural': '복수 목적어',
    diminutive: '축소사',
    augmentative: '증대사',
    superlative: '최상급',
    alternative: '다른 형태',
    'alt-of': '다른 표기',

    // Korean endings, by the names Korean grammar gives them
    honorific: '존댓말(시)',
    'future or guess': '추측·미래(겠)',
    'formal polite': '하십시오체',
    question: '의문',
    but: '대조',
    "let's": '청유',
    plain: '해라체',
    'shall we, or I wonder': '제안·추측',
    'I will': '약속',
    'just noticed': '감탄',
    'as you know': '알다시피',
    and: '나열',
    'because, or and then': '이유·순서',
    'but, or given that': '배경·대조',
    'even if': '양보',
    whether: '간접 의문',
    'adverb form': '부사형',
    quoting: '인용',
    'used to': '회상',
    topic: '주제(은/는)',
    subject: '주격(이/가)',
    object: '목적격(을/를)',
    possessive: '관형격(의)',
    'come to': '~게 되다',
    when: '~ㄹ 때',
    modifier: '관형형',
    'noun form': '명사형',
    becomes: '~아/어지다',
    'have done before': '경험',
    nominative: '주격',
    genitive: '속격',
    'accusative-case': '대격',
    'dative-case': '여격',
    neuter: '중성',
    definite: '정',
    indefinite: '부정',
    comparative: '비교급',
    strong: '강변화',
    weak: '약변화',
    mixed: '혼합변화',
    'without-article': '관사 없음',
    reflexive: '재귀',
  },
  helpChat: {
    heading: '질문하기',
    placeholder: '설정이나 방법에 대해 물어보세요',
    label: '질문',
    send: '묻기',
    thinking: '생각 중…',
    note: '이 도움말을 바탕으로 Gemini Nano가 기기에서 답했습니다. 틀릴 수 있습니다.',
    noMatch: '도움말에 나오지 않습니다. 위의 검색을 사용해 보세요.',
    failed: 'Gemini Nano가 답하지 못했습니다. 다시 시도해 주세요.',
    installHeading: '도움말에 질문하기',
    install: 'Gemini Nano는 컴퓨터의 Chrome 안에서 실행되는 작은 AI 모델입니다. 한 번 다운로드하면 여기서 질문할 수 있습니다. 입력한 내용은 기기 밖으로 나가지 않습니다.',
    download: 'Gemini Nano 다운로드',
    downloading: (percent: number): string => `다운로드 중… ${percent}%`,
    update: 'Chrome에는 여기서 질문에 답할 수 있는 작은 AI 모델 Gemini Nano가 내장되어 있습니다. 사용하려면 Chrome을 업데이트하세요.',
    unavailable: 'Chrome에는 여기서 질문에 답할 수 있는 작은 AI 모델 Gemini Nano가 있지만, 이 컴퓨터에서는 아직 준비되지 않았습니다. 디스크 여유 공간이 필요하며 chrome://flags에서 켜야 할 수 있습니다.',
    learnMore: 'Gemini Nano 정보',
  },
};
