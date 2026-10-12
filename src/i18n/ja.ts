import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'オフ', unknown: '未知の単語', always: 'すべて' };

/**
 * A message from elsewhere, ended as a Japanese sentence: sentences here
 * follow one another with nothing between them, so each needs its 。.
 */
const ended = (s: string): string => (/[。.!！?？]$/.test(s) ? s : `${s}。`);

/** What a card went in without, as a sentence of its own after the result. */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? '文の音声はありません（Libregakuのアイコンをクリックすると、このタブで録音できます）'
      : '文の音声はありません'))
    .join('。');

/** Each kind of media, as Anki's Japanese names it. */
const MEDIA = { audio: '音声', video: '動画', picture: '画像' } as const;

/** The interface in Japanese. Anything left out shows in English. */
export const ja: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `ふりがな：${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `ピンイン：${RUBY[mode]}`,
    mandarin: '中国語（普通話）',
    jyutping: (mode: Settings['ruby']): string => `Jyutping：${RUBY[mode]}`,
    sentenceGap: '',
  },

  settings: {
    // 言語
    languagesHeading: '言語',
    languagesAbout: '学習する言語と母語を選びます。',
    target: '学習言語',
    targetLimited: (language: string): string => `${language}（一部対応）`,
    supportFull: 'すべての機能に対応しています。読みとふりがなも表示します。',
    supportPinyin: 'すべての機能に対応しています。ピンインも表示します。意味は英語です。',
    supportJyutping: 'すべての機能に対応しています。Jyutpingも表示します。意味は英語です。',
    supportWords: 'すべての機能に対応しています。意味は英語です。',
    script: '文字',
    scriptHint: '動画に両方ある場合は、こちらを使います。',
    supportBasic: '基本対応：単語には区切りますが、辞書と読みはまだありません。',
    native: '母語',
    nativeHint: '動画と辞書が対応していれば、翻訳と意味をこの言語で表示します。',
    definitions: '意味の言語',
    definitionsHint: '辞書に母語の意味がないため、この言語で表示します。',
    definitionsHintFor: (language: string): string =>
      `辞書に${language}の意味がないため、この言語で表示します。`,

    // 単語を調べる
    lookupHeading: '単語を調べる',
    lookupAbout: '単語を調べる方法とタイミングを選びます。',
    interaction: '調べ方',
    interactionHover: 'カーソルを合わせる',
    interactionShift: 'Shiftを押しながらカーソルを合わせる',
    interactionClick: 'クリック',
    interactionHint: '単語をクリックしても、いつでも調べられます。',
    hoverPause: '調べている間は一時停止',
    hoverPauseHint: 'カーソルが単語の上にある間、動画を一時停止します。',
    sidebarHover: '文字起こしで意味を表示',
    sidebarHoverHint: '文字起こしの単語にカーソルを合わせると、短い意味を表示します。',

    // 単語ポップアップ
    popupHeading: '単語ポップアップ',
    popupAbout: '単語を調べたときにポップアップに表示する内容を選びます。',
    cardDeckMenu: 'デッキメニュー',
    cardDeckMenuHint: '「Ankiに追加」の横に▾を表示し、別のデッキを選べるようにします。以降の新しいカードはそのデッキに入ります。',
    cardHideAdd: 'Ankiに追加を隠す',
    cardHideAddHint: 'カードから「Ankiに追加」ボタンと、その横のデッキメニューを外します。',
    cardKanji: '漢字の解説',
    cardKanjiHint: '各漢字の意味と読みを表示します。',
    cardHanzi: '漢字の解説',
    cardHanziHint: '各漢字の意味と読みを表示します。',
    lookupElsewhere: 'この動画の例文',
    lookupElsewhereHint: 'この動画でその単語が出てくる他の文を表示します。クリックすると再生します。',

    // 字幕
    subtitlesHeading: '字幕',
    subtitlesAbout: '動画に表示する字幕の見た目を調整します。',
    ruby: 'ふりがな',
    rubyUnknown: '未知の単語',
    rubyAlways: 'すべて',
    rubyNever: 'オフ',
    rubyHint: '漢字の上に読みを表示します。視聴中はRキーで切り替えられます。',
    pinyin: 'ピンイン',
    pinyinHint: '漢字の上に読みを表示します。視聴中はRキーで切り替えられます。',
    jyutping: 'Jyutping',
    jyutpingHint: '漢字の上に読みを表示します。視聴中はRキーで切り替えられます。',
    blurPrimary: '字幕をぼかす',
    blurPrimaryHint: 'リスニング練習用：カーソルを合わせるまで字幕をぼかします。Hキーで切り替えられます。',
    showSubtitles: '動画の字幕',
    showSubtitlesHint: '動画の上に字幕を表示します。オフにすると、ヘッダー、トランスクリプト、パネルだけが残ります。ヘッダーのボタンは「翻訳オフ」「字幕オフ」「両方オン」の順に切り替わり、↑キーも同じです。',
    subtitleSize: '文字サイズ',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: 'プレーヤーの大きさに合わせて変わるので、全画面でも同じように見えます。',
    subtitleBottom: '位置',
    subtitleBottomLowest: '一番下',
    subtitleBottomLow: '低め',
    subtitleBottomNormal: '標準',
    subtitleBottomRaised: 'やや高め',
    subtitleBottomHigh: '高め',
    subtitleBottomHighest: '一番上',
    subtitleBottomHint: '字幕を表示する高さです。同じプレーヤーで使う他の字幕拡張機能は、その下に表示されます。',
    dualSubtitles: '翻訳を表示',
    dualSubtitlesHint:
      '学習言語の字幕の下に、母語の字幕を表示します。機械翻訳ではなくサイトの字幕を使うため、' +
      '動画の文字起こし全体が必要です。',
    singleKeys: '単一キーのショートカット',
    singleKeysHint:
      'AやRなどの文字キーは、視聴中にそれだけで使えます。オフにすると、AltとShiftを押しながら使います。' +
      '矢印キーはどちらでも使えます。',

    // 下線
    underlinesHeading: '下線',
    underlinesAbout: '色で単語の習熟度を表します。クリックすると色を変更できます。',
    colorUnknown: '未知の単語',
    colorUnknownHint: 'Ankiにカードがない単語。',
    colorLearning: '学習中',
    colorLearningHint: 'カードがまだ定着していない単語。',
    colorTracking: '注目中',
    colorTrackingHint: '注目している単語。',
    colorKnown: '既知',
    colorKnownHint: '定着したカードがある単語、または既知にした単語。',
    underlines: '単語に下線を引く',
    underlinesHint: 'オフにすると、下線の色がない普通の字幕になります。',
    markKnown: '既知の単語にも下線を引く',
    markKnownHint: '初期設定ではオフです。覚えるほど画面がすっきりします。',
    underlineGrammar: '冠詞と代名詞にも下線を引く',
    underlineGrammarHint: '初期設定ではオフです。「the」「私」「彼」のような語は調べられますが、覚える単語には数えません。',
    defaultColours: '初期設定の色',
    resetColours: 'リセット',

    // 文字起こし
    transcriptHeading: '文字起こし',
    transcriptAbout: '動画の横に、字幕のすべての行を一覧表示するパネルです。',
    sidebarFollow: '動画に合わせてスクロール',
    sidebarFollowHint: '再生中の行を表示し続けます。自分でスクロールすると止まり、ボタンで再開できます。',
    headerBar: 'ヘッダーを表示',
    headerBarHint: 'カーソルを近づけると、動画の上部に表示されます。',
    languageBadge: '言語バッジ',
    languageBadgeFlag: '国旗',
    languageBadgeCode: 'コード',
    badgeFlag: 'バッジの国旗',
    badgeFlagDefault: '初期設定',
    flagSearch: '検索…',
    flagSearchLabel: '国を検索',
    flagSuggested: 'おすすめ',
    flagAll: 'すべての国',
    flagNone: (query: string): string => `「${query}」に一致する国はありません。`,
    badgeFlagHint: '学習言語として表示する国旗です。言語ごとに保存されます。',
    languageBadgeHint: 'ヘッダーでの学習言語の表示方法です。',
    sidebarStats: '未知の単語を数える',
    sidebarStatsHint: '各行の未知の単語の数、既知の単語の割合、それを使うフィルタを表示します。',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Ankiに接続し、新しいカードの追加先と、既知の単語の判定に使うデッキを選びます。',
    deck: '新しいカードの追加先',
    deckHint: '新しいカードを追加するデッキです。',
    statusScope: '既知の単語の参照先',
    statusScopeHint: 'このデッキのカードで、どの単語に下線を引くかが決まります。サブデッキも含みます。',
    marksInAnki: 'マークをAnkiに保存',
    marksInAnkiHint:
      '「既知」「注目」「無視」をAnkiの非表示ノート（Libregaku::Marks）として保存し、他のデバイスと同期します。' +
      'オフにすると、このブラウザにだけ保存します。',

    // デッキのメニュー
    wholeCollection: 'コレクション全体',
    chooseDeck: 'デッキを選択…',
    deckNotInAnki: (deck: string): string => `${deck}（Ankiにありません）`,
    deckAndSubdecks: (deck: string): string => `${deck}（サブデッキを含む）`,
    deckUnset: 'デッキを選んでください。選ぶまでカードは追加できません。',
    deckMissing: (deck: string): string => `Ankiに「${deck}」というデッキがなくなりました。別のデッキを選んでください。`,
    statusScopeMissing: (deck: string): string =>
      `Ankiに「${deck}」というデッキがなくなったため、すべての単語が未知として表示されます。別のデッキを選んでください。`,
    statusScopeOutside: (deck: string): string =>
      `新しいカードの追加先「${deck}」がここに含まれていないため、追加した単語も未知のまま下線が残ります。` +
      `「${deck}」を含むデッキか、「コレクション全体」を選んでください。`,

    // Ankiの状態
    ankiChecking: '確認中…',
    ankiConnected: '接続しました。',
    noteTypeInstalled: 'ノートタイプをインストールしました。',
    cardsMade: (n: number): string => `Libregakuで作ったカードは${n}枚です。`,
    noCards: 'カードはまだありません。',
    cardsFlushed: (n: number): string => `Ankiが閉じている間に作った${n}枚のカードを追加しました。`,
    cardsNotFlushed: (n: number, error: string): string => ended(`${n}枚のカードを追加できませんでした：${error}`),
    cardsWaiting: (n: number): string => `${n}枚のカードが追加待ちです。`,
    ankiOffline: (port: number): string =>
      `Ankiがポート${port}で応答していません。Ankiが閉じているときは正常です。` +
      '新しいカードはここで待機し、Ankiを開くと追加されます。',
    ankiBlocked: 'Ankiは起動していますが、AnkiConnectがまだこの拡張機能を許可していません。',
    ankiOccupied: (detail: string): string => `${ended(detail)}Ankiが使えるよう、そのポートを使っているプログラムを閉じてください。`,

    // Ankiのボタン
    checkAgain: '再確認',
    newDeck: 'デッキを作成',
    openCards: 'Ankiでカードを表示',
    openMarks: 'Ankiでマークを表示',
    newDeckPrompt: '新しいデッキの名前を入力してください。サブデッキは「::」で区切ります（例：韓国語::Netflix）',

    // Ankiの接続
    installStep: 'このパソコンにAnkiをインストールして開きます。{link}',
    getAnki: 'Ankiを入手',
    addonStep: 'Ankiで{menu}を開き、このコードを貼り付けて、Ankiを再起動します。',
    addonMenu: 'ツール → アドオン → アドオンを入手…',
    aboutAnkiConnect: 'AnkiConnectについて',
    originStep: 'Ankiで{menu}を開き、{setting}にこの行を追加して、Ankiを再起動します。',
    originMenu: 'ツール → アドオン → AnkiConnect → 設定',
    runningStep: '視聴中はAnkiを開いたままにします。カードはこのパソコンのAnkiに直接追加されます。',
    copy: 'コピー',
    copyValue: (value: string): string => `${value}をコピー`,
    copied: 'コピー済み',
    copyFailed: '選択してコピー',

    // Ankiカード
    ankiCardsHeading: 'Ankiカード',
    ankiCardsAbout: '単語、読み、意味、文のほかに、新しいカードに追加するものを選びます。',
    cardAudio: '単語の音声',
    cardAudioHint: '単語の録音があれば追加します。合成音声は使いません。',
    cardSentenceAudio: '文の音声',
    cardSentenceAudioHint: '文をもう一度再生して録音します。保護されたサイトでは下の許可が必要です。',
    cardScreenshot: 'スクリーンショット',
    cardScreenshotHint: 'その場面の静止画です。保護されたサイトではブロックされるため使えません。',
    capture: '保護されたサイトでの文の音声',
    captureAllow: '許可',
    captureAllowInSettings: '設定で許可',
    captureRemove: '取り消す',
    captureAllowed: '許可しました。保護されたサイトのタブごとに、Libregakuのアイコンをクリックして「このタブで文の音声を録音」を選んでください。',
    captureNeeded: '保護されたサイトは動画を暗号化しているため、文の音声はタブから録音します。そのための許可が必要です。',

    // データとライセンス
    creditsHeading: 'データとライセンス',
    creditJmdict:
      '辞書と漢字のデータ © Electronic Dictionary Research and Development Group。CC BY-SA 4.0のもとで使用しています。' +
      'jmdict-simplifiedがJSON形式に再パッケージしたものです。',
    creditLindera:
      '日本語、韓国語、中国語を単語に分割します。MITライセンス。IPADIC、UniDic、mecab-ko-dic、CC-CEDICTには、それぞれ独自の条件があります。',
    creditCedict: '中国語辞書 © MDBGとその貢献者。CC BY-SA 4.0のもとで使用しています。',
    creditWiktionary:
      '韓国語とスペイン語の辞書、および母語で書かれた一部の辞書。' +
      'Wiktionaryからkaikki.orgとwiktionary-to-yomitanを経て作成しています。CC BY-SA 4.0。',
    creditKrdict:
      '韓国語の単語を母語で説明します。© National Institute of Korean Language。CC BY-SA 2.0 KRのもとで使用しています。' +
      'ファイルはLyroxideが作成したものです。',
    creditCfdict: '中国語をフランス語で説明します。CFDICT © chine.in。CxDICTが更新を続けています。CC BY-SA 4.0。',
    creditCanto: '広東語辞書と、CC-CEDICT用のJyutpingの読み。© Pleco Inc.、CC BY-SA 3.0のもとで使用しています。',
    creditHandedict: '中国語をドイツ語で説明します。© HanDeDictとその貢献者。CC BY-SA 3.0のもとで使用しています。',
    creditUnihan: '中国語の漢字で、最初に表示する読みを決めます。© Unicode, Inc.、Unicode Licenseのもとで使用しています。',
    creditJotoba: '辞書のダウンロード中に単語を調べるために使います。どちらもJMdictを使用しています。',
    creditLucide: 'アイコン。ISCライセンス。',
    creditCommons: 'スペイン語・中国語・韓国語の単語の録音。ボランティアが読み上げたものです。ライセンスは録音ごとに異なり（多くはCC BY-SA 4.0）、再生時とカードに話者名とともに表示されます。',
    creditAudioCmn: '中国語の単語の録音。Yue Tan（カーン大学）による。CC BY-SA 3.0 US。',
    creditNaver: '韓国語の単語の録音（Naver辞書）。単語カードの表示でのみ再生されます。再利用のライセンスがないため、Ankiのカードには付けません。',
    creditSpanishdict: 'SpanishDictによるスペイン語の合成音声。録音がないとき、発音ボタンで再生されます。再利用のライセンスがないため、Ankiのカードには付けません。',
    licence: 'LibregakuはMITライセンスです。辞書データは同梱せず、各配布元からダウンロードします。',
    built: (when: string): string => `このコピーは${when}にビルドされました。`,

    // キーボードショートカット
    keyLine: '前の行・次の行',
    keyReplay: 'この行をもう一度再生',
    keyTranslation: '翻訳の表示・非表示',
    keyShiftLookup: '押している間、カーソル下の単語を調べる',
    keyAdd: 'ポップアップの単語をAnkiに追加',
    keyKnown: 'ポップアップの単語を既知にする',
    keyFurigana: 'ふりがなの切り替え：オフ、未知の単語、すべて',
    keyPinyin: 'ピンインの切り替え：オフ、未知の単語、すべて',
    keyJyutping: 'Jyutpingの切り替え：オフ、未知の単語、すべて',
    keyBlur: '字幕のぼかしのオン・オフ',
    keySave: '再生中の行を保存',
    keyTranscript: '文字起こしパネルの表示・非表示',
    keyClose: 'ポップアップを閉じる',
  },

  options: {
    pageTitle: 'Libregakuの設定',
    help: 'ヘルプ',
    searchSettings: '検索…',
    noSettingsFound: '「{q}」に一致する項目はありません。',
    contentsLabel: '設定の項目',
    settingsLabel: '設定',
    setupHeading: 'はじめに',
    setupAbout: '選ぶのは2つだけです。それ以外は適切な初期設定になっています。',
    stepLanguages: '学習する言語を選ぶ',
    stepAnki: 'Ankiに接続して、新しいカードのデッキを選ぶ',
    ankiOptional:
      'Ankiはなくても使えます。字幕も、単語を調べる機能も、ふりがなも、Ankiなしで動きます。' +
      'Ankiは、すでに知っている単語を覚えておく役割です。',
    nextSteps:
      '次に、学習言語の字幕がある動画を開いて、単語にカーソルを合わせてみましょう。' +
      '文字起こしパネルのキーボードボタンで、キーボードショートカットを確認できます。',
    stepDone: '完了',
    confirmLanguages: 'この言語で決定',
    keepDeck: (deck: string): string => `新しいカードを「${deck}」に追加`,
  },

  action: {
    help: 'ヘルプ',
    settings: '設定',
    settingsTip: 'すべての設定',
    checkingPage: 'このページを確認中…',
    notActive:
      'このページでは動作していません。YouTubeやNetflixなどの対応サイトで動画を開いてください。' +
      'Libregakuをインストールまたは再読み込みした直後なら、タブを再読み込みしてください。',
    unsupported: 'LibregakuはYouTube、Netflix、Disney+、Prime Video、Max、Apple TV+で使えます。',
    worksOn: (site: string): string => `Libregakuは${site}で使えます。`,
    waitingForSubtitles: (site: string): string => `${site}の字幕を待っています。字幕がオンになっているか確認してください。`,
    activeOn: (title: string): string => `動作中：${title}`,
    active: 'この動画で動作中です。',
    subtitlesTrack: '字幕',
    translationTrack: '翻訳',
    noTranslation: 'なし',
    generatedTrack: (track: string): string => `${track}（自動生成）`,
    captureNeedsPermission: 'ここで文の音声を録音するには、このタブの音声をキャプチャする許可が必要です。',
    captureAllowInSettings: '設定で許可',
    captureReady: '保護されたサイトの音声は、このタブで録音をオンにしてからでないと録音できません。',
    captureStart: 'このタブで文の音声を録音',
    captureFailed: 'Chromeでこのタブを録音できませんでした。',
    toggleSidebar: 'サイドバーの表示切り替え',
    ankiChecking: 'Anki：確認中…',
    ankiConnected: (n: number): string => `Anki接続済み · Libregakuのカード${n}枚`,
    ankiOffline: 'Ankiが起動していないため、単語は未知として表示されます',
    ankiOccupied: (port: number): string => `別のプログラムがポート${port}を使用しているため、Ankiに接続できません`,
    ankiBlocked: 'Ankiがこの拡張機能を拒否しました。追加する行は「設定」にあります',
    ankiBusy: 'Ankiが応答しません。同期中の可能性があります',
    ankiRefused: 'Ankiがリクエストを拒否しました',
    cardsToAdd: (n: number): string => `追加待ち${n}枚`,
    cardsWaiting: (n: number): string => `Ankiの起動待ち${n}枚`,
  },

  sidebar: {
    panelLabel: '文字起こしパネル',
    resizeLabel: 'パネルのサイズを変更',

    // タブと、横のアイコンボタン
    tabsLabel: 'リスト',
    transcriptTab: '文字起こし',
    savedTab: '保存済み',
    settings: '設定',
    shortcuts: 'キーボードショートカット',
    close: '閉じる',
    closeLabel: '閉じる（文字起こしパネル）',
    openTip: '文字起こし',
    openLabel: '文字起こしを表示',
    help: 'ヘルプ',

    // 文字起こしの検索
    searchPlaceholder: '文字起こしを検索…',
    searchLabel: '文字起こしを検索',
    noMatches: '該当なし',
    matchAt: (at: number, total: number): string => `${at}/${total}`,
    matchesFound: (n: number): string => `${n}件`,

    // フィルタ
    filterTip: 'フィルタ',
    filterLabel: '行を絞り込む',
    filterAll: 'すべての行',
    filterAllAbout: 'すべての行を表示',
    filterNew: '未知の単語あり',
    filterNewAbout: 'カードのない単語を含む行',
    filterReady: '学びやすい行',
    filterReadyAbout: '未知の単語が1つだけの行。いちばん学びやすい行です',
    filterSaved: '保存済み',
    filterSavedAbout: 'あとで見返すために保存した行',

    // 文字起こし
    partial: '再生中の行しか読み取れないプレーヤーのため、視聴しながら作成しています。',
    partialEmpty: 'まだ何もありません。話された行から順にここに表示されます。',
    empty: '文字起こしが読み込まれていません。',
    currentLine: '再生中の行',
    lineNew: (n: number): string => `未知 ${n}`,
    playFrom: (time: string): string => `${time}から再生`,
    saveLine: '行を保存',
    unsave: '保存を解除',
    addSentence: '文を追加',
    addSentenceLabel: '文をAnkiに追加',

    // 文字起こしの上の集計
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: '既知 {n}',
    summaryNew: '未知 {n}',
    summaryReady: '学びやすい行 {n}',
    counting: (percent: number): string => `未知の単語を数えています… ${percent}%`,
    countFailed: '一部の行を数えられなかったため、合計は表示できません。',

    // カーソルを合わせたときの意味
    dictionaryLoading: (percent: number): string => `辞書を読み込み中… ${percent}%`,
    dictionaryUnavailable: '辞書を利用できません',
    noEntry: '辞書に載っていません。',

    // 保存済み
    savedEmpty: 'まだ何も保存されていません。あとで見返したい文は、文字起こしの行のブックマークか、Bキーで保存できます。',
    thisVideo: 'この動画',
    openAt: (time: string): string => `動画を${time}から開く`,
    remove: '削除',
    removeLabel: '保存済みから削除',
    copySavedAbout: '保存したすべての行を、タブ区切りのテキストとしてコピー',
    exportSavedAbout: 'Ankiで読み込めるタブ区切りのファイルを保存',
    addSavedAbout: '保存した各行からカードを作成',
    linesCopied: (n: number): string => `${n}行をコピーしました。`,
    chooseDeck: '先に「設定」でデッキを選んでください。新しいカードはそこに追加されます。',
    checkingAnki: 'Ankiを確認中…',
    ankiOffline: 'Ankiが起動していません。Ankiを開いてからもう一度お試しください。手順は「設定」にあります。',
    ankiBlocked: 'AnkiConnectがまだこの拡張機能を許可していません。追加する1行は「設定」にあります。',
    ankiUnreachable: 'Ankiに接続できませんでした。理由は「設定」で確認できます。',
    adding: (at: number, total: number): string => `追加中… ${at}/${total}`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `「${deck}」に${added}枚追加しました${already ? `（${already}枚は追加済み）` : ''}。`,

    // 保存済みと単語のタブで共通のボタンとメッセージ
    copy: 'コピー',
    exportFile: 'エクスポート',
    addToAnki: 'Ankiに追加',
    noClipboard: 'クリップボードにアクセスできませんでした。',
    downloaded: 'ダウンロードに保存しました。Ankiでは「ファイル → 読み込む」から取り込めます。',
    downloadBlocked: 'このページがダウンロードをブロックしました。代わりに「コピー」を使ってください。',

    // 単語
    listsLabel: '表示するリスト',
    listLines: '行',
    listTracked: '注目中',
    listKnown: '既知',
    listIgnored: '無視',
    findPlaceholder: '検索…',
    findLabel: 'このリストを検索',
    copyWordsAbout: 'このリストを、タブ区切りのテキストとしてコピー',
    exportWordsAbout: 'このリストを、Ankiで読み込めるタブ区切りのファイルとして保存',
    wordsCopied: (n: number): string => `${n}語をコピーしました。`,
    nothingToExport: 'このリストにはエクスポートするものがありません。',
    lookingUp: '読みと意味を調べています…',
    noWordMatches: (query: string): string => `このリストに「${query}」に一致する単語はありません。`,
    noLineMatches: (query: string): string => `「${query}」に一致する保存済みの行はありません。`,
    wordsMatching: (shown: number, total: number): string => `${total}語中${shown}語。`,
    trackedEmpty:
      'まだ注目中の単語はありません。「注目」は、カードを作らずに単語に下線を引いて、気づけるようにする機能です。' +
      '「設定」の「単語ポップアップ」でボタンをオンにしてください。',
    trackedIntro: (n: number): string => `注目中の単語${n}語。出てくるたびに下線が引かれます。`,
    stopTracking: '注目を解除',
    knownEmpty: '既知にした単語はありません。知っていてカードが要らない単語は、ポップアップかKキーで既知にできます。',
    knownIntro: (n: number): string =>
      `既知にした単語${n}語。既知を解除すると、Ankiのカードに基づく状態に戻ります。`,
    unmarkKnown: '既知を解除',
    ignoredEmpty: '無視した単語はありません。名前や「あっ」などの声をポップアップで無視にすると、下線も集計もされなくなります。',
    ignoredIntro: (n: number): string => `下線も集計もされない単語${n}語。`,
    stopIgnoring: '無視を解除',
  },

  popup: {
    // ポップアップと見出しの単語
    cardLabel: (word: string): string => `${word}（辞書）`,
    commonBadge: 'よく使う',
    nameBadge: '名前かも',
    characterNames: { kanji: '漢字', hanzi: '漢字' },
    partOfSpeech: {
      n: '名詞', 'n-adv': '副詞的名詞', 'n-t': '時間名詞', 'n-suf': '名詞的接尾辞',
      'n-pref': '名詞的接頭辞', pn: '代名詞', 'adj-i': 'イ形容詞', 'adj-na': 'ナ形容詞',
      'adj-no': 'ノ形容詞', 'adj-pn': '連体詞', adv: '副詞', 'adv-to': '副詞',
      aux: '補助語', 'aux-v': '助動詞', 'aux-adj': '補助形容詞',
      conj: '接続詞', cop: 'コピュラ', ctr: '助数詞', exp: '表現', int: '感動詞',
      num: '数詞', prt: '助詞', pref: '接頭辞', suf: '接尾辞', unc: '未分類',
      vs: 'サ変動詞', 'vs-i': 'サ変動詞', 'vs-s': 'サ変動詞', vt: '他動詞', vi: '自動詞',
      v1: '一段動詞', 'v1-s': '一段動詞', vk: 'カ変動詞', vz: 'ザ変動詞',
      v5b: '五段動詞', v5g: '五段動詞', v5k: '五段動詞', 'v5k-s': '五段動詞',
      v5m: '五段動詞', v5n: '五段動詞', v5r: '五段動詞', 'v5r-i': '五段動詞',
      v5s: '五段動詞', v5t: '五段動詞', v5u: '五段動詞', 'v5u-s': '五段動詞',
      v5aru: '五段動詞',
      // Wiktionaryの品詞（韓国語とスペイン語の単語）
      name: '固有名詞', v: '動詞', adj: '形容詞', pron: '代名詞', det: '限定詞', artic: '冠詞',
      counter: '助数詞', prep: '前置詞', 'prep-phrase': '前置詞句', ptcl: '助詞',
      intj: '感動詞', phrase: '句', prov: 'ことわざ', r: '語根', char: '文字', adn: '連体詞',
      ptcpl: '分詞', contr: '縮約形',
      masc: '男性', fem: '女性', neut: '中性', sg: '単数', pl: '複数', 'pl-only': '複数形のみ',
      count: '可算', uncount: '不可算', vr: '再帰', vdt: '二重他動詞', impers: '非人称',
      irreg: '不規則', reltnl: '関係形容詞', reltv: '関係詞', interr: '疑問詞', poss: '所有',
      dim: '縮小辞', aug: '増大辞', onoma: 'オノマトペ',
      // 使われ方
      idio: '慣用的', fig: '比喩的', literal: '字義どおり', col: '口語', inf: 'くだけた表現', fam: '親しい間柄で',
      formal: '改まった表現', polite: '丁寧', lit: '文語', poet: '詩的', rhet: '修辞的', sl: '俗語',
      vulg: '卑語', derog: '軽蔑的', offens: '侮辱的', humor: 'おどけた表現', euph: '婉曲',
      child: '幼児語', net: 'ネット用語', neol: '新語', cmn: '一般的', uncmmn: 'あまり使わない', rare: 'まれ',
      dated: 'やや古い', arch: '古語', obs: '廃語', hist: '歴史的', 'non-std': '非標準',
      dialect: '方言', regio: '地域的',
    },

    // 単語の下のアイコンボタン
    pronounce: '発音を聞く',
    playedRecording: (word: string): string => `${word} · 録音`,
    playedSynthesised: (word: string): string => `${word} · 合成音声`,
    recordingBy: (speaker: string, licence: string): string => `録音：${speaker} · ${licence}`,
    pronounceFailed: '音声を再生できませんでした',
    addSentence: '文を追加',
    sentenceAdded: '文を追加済み',
    undo: '元に戻す',
    copyWord: '単語をコピー',
    copyPhrase: 'フレーズをコピー',
    copySentence: '文をコピー',
    wordCopied: '単語をコピーしました',
    phraseCopied: 'フレーズをコピーしました',
    sentenceCopied: '文をコピーしました',
    copyFailed: 'コピーできませんでした。テキストを選択してコピーしてください',

    // 意味
    dictionaryLoading: (percent: number): string => `辞書を読み込み中です（${percent}%）。少し待ってからもう一度お試しください。`,
    dictionaryUnavailable: (error: string): string => `辞書を利用できません：${error}`,
    noEntry: 'この単語は辞書にありません。',
    noEntryName: '固有名詞なので、辞書に項目はありません。',
    moreMeanings: (n: number): string => `他${n}件の意味`,

    // この動画のほかの行
    elsewhereCount: (n: number): string => `この動画で他に${n}回`,
    playLine: '再生',
    elsewhereMore: (n: number): string => `他${n}件（文字起こしの検索ですべて見つかります）`,
    showAllInTranscript: '文字起こしですべて表示',

    // Ankiに追加
    addToAnki: 'Ankiに追加',
    addToDeck: (deck: string): string => `「${deck}」に追加`,
    adding: '追加中…',
    undoing: '取り消し中…',
    added: '追加済み',
    addedUndo: '追加済み（元に戻す）',
    inAnki: 'Ankiにあり',
    showInAnki: 'Ankiで表示',
    waiting: '待機中',
    waitingForAnki: 'Ankiを待機中',
    goesInWhenAnkiOpens: 'Ankiを開くと追加されます',
    alreadyAdded: '追加済みです',
    alreadyInAnki: 'すでにAnkiにあります',
    waitingForAnkiToOpen: 'Ankiが開くのを待っています',
    addedWithWarning: (said: string, warning: string): string => `${said}。${warning}`,

    // デッキメニュー
    otherDecks: '他のデッキ',
    addToAnotherDeck: '別のデッキに追加',
    decksUnknown: 'Ankiが応答しないため、デッキをまだ取得できません。',
    newDeck: 'デッキを作成…',
    newDeckPrompt: '新しいデッキの名前（サブデッキは「::」で区切ります。例：韓国語::Netflix）',

    // マーク
    knownButton: '既知',
    trackButton: '注目',
    ignoreButton: '無視',
    markKnownTip: '既知にする',
    trackTip: '注目する',
    ignoreTip: '無視する',
    unmarkKnownTip: '既知を解除',
    stopTrackingTip: '注目を解除',
    stopIgnoringTip: '無視を解除',
  },

  header: {
    knownStat: '既知 {percent}',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: '知っている単語',
    readyStat: '学びやすい行 {count}',
    readyTip: '未知の単語が1つの行',
    blurSubtitle: '字幕をぼかす',
    unblurSubtitle: '字幕のぼかしを解除',
    showTranslation: '翻訳を表示',
    hideTranslation: '翻訳を非表示',
    hideSubtitles: '字幕を隠す',
    showSubtitles: '字幕を表示',
    subtitles: '字幕',
    translation: '翻訳',
    transcript: '文字起こし',
    pinHeader: 'ヘッダーを固定',
    unpinHeader: 'ヘッダーの固定を解除',
    settings: '設定',
    showHeader: 'ヘッダーを表示',
  },

  player: {
    // プレーヤーのキー
    lastLine: '最後の行です',
    noLineBefore: '前の行はありません',
    translationOn: '翻訳：オン',
    translationOff: '翻訳：オフ',
    subtitlesOff: '字幕オフ',
    subtitlesOn: '字幕オン',
    blurOn: 'カーソルを合わせるまで字幕をぼかします',
    blurOff: '字幕を表示',
    lineSaved: '行を保存しました',
    lineUnsaved: '行の保存を解除しました',
    lookUpFirst: '先に単語を調べてください',
    alreadyKnown: (word: string): string => `${word} · Ankiですでに既知です`,
    alreadyInAnki: (word: string): string => `${word} · すでにAnkiにあります`,
    adding: (word: string): string => `${word}を追加中…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // マーク
    markOff: (word: string): string => `${word} · マークを解除しました`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = { known: '既知にしました', tracking: '注目にしました', ignored: '無視にしました', unknown: '未知にしました' }[status];
      if (refused) return `${word} · ${done}（カードなし）。Ankiに拒否されたため、あとで再試行します`;
      return `${word} · ${done}（カードなし）${status === 'tracking' ? '。パネルの「保存済み」タブで確認できます' : ''}`;
    },

    // 単語のカード
    pickDeck: '先にLibregakuの設定でデッキを選んでください',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `「${deck}」に追加しました。${without(missing)}` : `「${deck}」に追加しました`,
    alreadyIn: (deck: string): string => `すでに「${deck}」にあります`,
    queued: (deck: string): string => `Ankiが閉じています。Ankiを開くと「${deck}」に追加されます`,
    alreadyQueued: 'すでにAnkiを待機中です',
    notKept: 'Ankiが閉じていて、ブラウザもカードを保存できませんでした',
    takenBack: (deck: string): string => `「${deck}」から取り消しました`,
    unqueued: 'Ankiへの追加待ちを取り消しました',
    alreadySent: 'すでにAnkiに追加されています',
    queueSent: (count: number): string =>
      `Ankiが開きました。待機していたカード${count === 1 ? '' : `${count}枚`}を追加しました`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `既知の単語は「${scope}」から判定するため、「${deck}」のカードは反映されません`,

    // 文カード
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `文を「${deck}」に追加しました。${without(missing)}` : `文を「${deck}」に追加しました`,
    sentenceAlreadyIn: (deck: string): string => `この文はすでに「${deck}」にあります`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && '音声', picture && '画像'].filter(Boolean);
      return `Ankiが閉じています。Ankiを開くと文が「${deck}」に追加されます` +
        `${lacking.length ? `（${lacking.join('と')}なし）` : ''}`;
    },
    sentenceAlreadyQueued: 'この文はすでにAnkiを待機中です',
    sentenceTakenBack: (deck: string): string => `文を「${deck}」から取り消しました`,

    // 文の音声
    recording: '行を録音中…',

    // 単語を調べる
    noDictionary: 'この言語の辞書はまだありません。',
  },

  notices: {
    // 通知
    unexpected: 'Libregakuで予期しない問題が発生しました。',
    dismiss: '閉じる',

    // YouTubeやNetflixの変更
    youtubeTrackList: 'YouTubeの字幕リストを読み取れませんでした。',
    youtubeTrackShape: 'YouTubeの字幕データが想定と異なる形式です。',
    youtubeCaptionText: 'ページ上でYouTubeの字幕テキストが見つかりませんでした。',
    youtubePlayerTrackList: 'YouTubeのプレーヤーから、この動画の字幕リストを読み取れませんでした。',
    netflixTrackList: 'Netflixの字幕リストを読み取れませんでした。',
    netflixCaptionText: 'ページ上でNetflixの字幕テキストが見つかりませんでした。',
    disneyTrackList: 'Disney+の字幕リストを読み取れませんでした。',
    appleTrackList: 'Apple TV+の字幕リストを読み取れませんでした。',
    appleTiming: 'Apple TV+の字幕を動画の時間に合わせられませんでした。',
    disneyCaptionText: 'ページ上でDisney+の字幕テキストが見つかりませんでした。',
    primeTrackList: 'Prime Videoの字幕リストを読み取れませんでした。',
    primeCaptionText: 'ページ上でPrime Videoの字幕テキストが見つかりませんでした。',
    maxTrackList: 'Maxの字幕リストを読み取れませんでした。',
    maxCaptionText: 'ページ上でMaxの字幕テキストが見つかりませんでした。',
    netflixBlocked: 'Netflixが、Libregakuの字幕を読み取る部分をブロックしました。',

    // この動画の字幕
    subtitlesOff: 'プレーヤーで字幕をオンにすると、Libregakuが読み取ります。',
    trackNotSent: 'プレーヤーがこの字幕をまだ読み込んでいません。',
    noTargetTrack: 'この動画には学習言語の字幕がありません。',
    noSecondTrack: 'この動画には母語の字幕がないため、2行目は表示できません。',
    onlyOneTrack: 'この動画の字幕は1種類だけなので、2行目は表示できません。',
    autoGenerated: 'この字幕は自動生成のため、文言や単語の区切りが不正確な場合があります。',
    noSubtitles: 'この動画には字幕がありません。',
    secondTrackFailed: '2行目を読み込めませんでした。',

    // 拡張機能の各部分
    analyserUnavailable:
      '言語解析エンジンを読み込めなかったため、読みと辞書形は使えません。単語とカードは、表記が完全に一致する場合にだけ照合されます。',
    markNotSaved: 'マークを保存できませんでした。再読み込みするまでは有効ですが、その後は失われます。',
    marksNotSynced: 'マークをAnkiに保存できませんでした。このブラウザに保持して、あとで再試行します。',
    cardsNotAdded:
      'Ankiが閉じている間に保持していたカードの一部を、Ankiが受け付けませんでした。カードは保持したまま、あとで再試行します。',

    // 詳細
    playerNeverLoaded: 'プレーヤーの読み込みが完了しませんでした。',
    subtitlesMaybeOff: 'プレーヤーで字幕がオフになっているだけかもしれません。',
    lookedFor: (selector: string): string => `検索したセレクタ：${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `この動画の字幕：${languages.join('、') || 'なし'}。設定で学習言語を変えるか、別の動画を選んでください。`,
    onlyPictures: 'この動画の字幕は画像だけで、テキストではないため、Libregaku では読み取れません。',
    chooseInPlayer: (track: string): string => `プレーヤーの字幕メニューで${track}を選ぶと、Libregakuが読み取ります。`,
    noHumanTrack: 'この動画には、人が作成した字幕がありません。',
    secondTrackError: (track: string, error: string): string => `${track}：${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `この動画の字幕：${languages.join('、')}。`,
    analyserDidNotLoad: '解析エンジンを読み込めませんでした',
  },

  anki: {
    // AnkiConnectへの接続
    offline: (port: number): string => `ポート${port}で待ち受けているプログラムがありません。`,
    timeout: (port: number, seconds: number): string =>
      `ポート${port}から${seconds}秒以内に応答がありませんでした。` +
      'Ankiが処理中（同期中やダイアログの表示中）か、別のプログラムがポートを使っている可能性があります。',
    blocked: (origin: string): string =>
      `AnkiConnectが${origin}を拒否しました。Ankiで「ツール → アドオン → AnkiConnect → 設定」を開き、` +
      'その行をwebCorsOriginListに追加してください。',
    httpAnswer: (port: number, status: number): string =>
      `ポート${port}のプログラムがHTTP ${status}を返しました。AnkiConnectはこのように応答しません。`,
    notAnkiConnect: (port: number): string => `AnkiConnect以外のプログラムがポート${port}を使用しています。`,
    noBackground: '拡張機能のバックグラウンドが応答していません。',
    unreachable: 'Ankiに接続できません。',
    callFailed: 'AnkiConnectの呼び出しに失敗しました。',

    // Libregakuが送らないもの
    notRelayed: (action: string): string => `Libregakuは「${action}」をAnkiConnectに送信しません。`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregakuが添付するのは、自分で取得した${MEDIA[media]}だけです。`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `このノートの${MEDIA[media]}にはデータがありません。`,
    mediaName: (prefix: string): string => `Libregakuが追加するファイルの名前は${prefix}…で始まりますが、このファイルは違います。`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action}には${ids === 'notes' ? 'ノート' : 'カード'}のリストが必要です。`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `拒否しました：送信された${ids === 'notes' ? 'ノート' : 'カード'}のうち${count}件は、Libregakuのマークではありません。` +
      `Libregakuが${change === 'delete' ? '削除' : change === 'suspend' ? '休止' : 'タグを変更'}するのは、自分のマーク` +
      `${change === 'delete' ? 'と、数分以内に作成してまだ学習していないカード' : ''}だけです。`,

    // Libregakuのノートタイプ
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Ankiのノートタイプ「${noteType}」に、次のフィールドがありません：${fields.join('、')}。` +
      `このままでは${loses === 'cards' ? 'カード' : 'ノート'}からその内容が失われます。` +
      'Libregakuは、編集されているかもしれないノートタイプを変更しません。' +
      `Ankiで「ツール → ノートタイプを管理」を開き、「${noteType}」の名前を変更して（またはフィールドを追加し直して）から` +
      '「再確認」を押すと、新しいノートタイプがインストールされます。',

    // マークと待機中のカード
    marksNotAdded: (count: number): string =>
      `Ankiはマーク${count}件を追加しませんでした。送信待ちのまま、次回また試します。`,
    marksNotStored: (cause: string): string => `Ankiから読み込んだマークを、ブラウザのストレージが保存できませんでした：${cause}`,
    storageUnreadable: (cause: string): string => `ブラウザのストレージを読み込めませんでした：${cause}`,
  },

  errors: {
    // タブの音声の録音
    captureNotAllowed: '先にLibregakuの設定で、このサイトでの文の音声を許可してください。',
    captureRefused: 'Chromeがこのタブのキャプチャを拒否しました',

    // 読み込めなかった字幕トラック
    unknownTrack: (id: string): string => `不明なトラック：${id}`,
    trackNotSent: 'プレーヤーがまだ読み込んでいません。プレーヤーの字幕メニューで一度選んでください',
    noCaptionFormat: (attempts: readonly string[]): string => `どの字幕形式も使えませんでした：${attempts.join('、')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `どの字幕URLも使えませんでした：${attempts.join('、') || 'URLがありません'}`,
    emptyAnswer: '空の応答',
    noCues: '字幕0件',
    noCuesParsed: '解析結果0件',
    noAnswerWithin: (seconds: number): string => `${seconds}秒以内に応答なし`,

    // トラック名
    forcedTrack: (track: string): string => `${track}（強制字幕）`,

    // 辞書と解析エンジン
    noAnswer: '拡張機能から応答がありません。ページを再読み込みして再起動してください',
    analyserLoading: '解析エンジンを読み込み中です',
    dictionaryLoading: '辞書を読み込み中です',
    lookupFailed: '調べられませんでした',
  },

  grammar: {
    // 時制と丁寧さ
    past: '過去',
    polite: '丁寧',

    // 否定
    negative: '否定',
    'negative intent': '否定の意志',
    without: '〜ずに',

    // 条件
    conditional: '条件',
    whenever: '〜と',

    // 受身・可能・使役
    passive: '受身',
    'passive or potential': '受身または可能',
    potential: '可能',
    causative: '使役',

    // 願望
    'want to': '願望',
    'seems to want to': '〜たがる',
    'want someone to': '〜てほしい',

    // 推量・伝聞
    seems: '様態',
    'seems like': '〜みたい',
    hearsay: '伝聞',
    apparently: '推定',
    probably: '推量',
    might: '可能性',

    // 当然・予定
    'ought to': '〜べき',
    'supposed to': '〜はず',
    'intends to': '〜つもり',

    // 義務・許可
    must: '義務',
    'must not': '禁止',
    "don't have to": '不必要',
    may: '許可',

    // 命令・依頼・意向
    imperative: '命令',
    volitional: '意向',
    'polite command': '〜なさい',
    please: '依頼',

    // 接続
    'te-form': 'て形',
    listing: '〜たり',
    while: '〜ながら',
    because: '理由',
    'even though': '逆接',
    'in order to': '目的',
    'so that': '〜ように',

    // て形に続く補助動詞
    ongoing: '〜ている',
    'resulting state': '〜てある',
    'completely, or regrettably': '〜てしまう',
    'in advance': '〜ておく',
    'try doing': '〜てみる',
    'going forward': '〜ていく',
    'coming to be': '〜てくる',
    'receive the favour': '〜てもらう',
    'someone does for me': '〜てくれる',
    'do for someone': '〜てあげる',

    // 連用形に続く補助動詞
    'too much': '〜すぎる',
    'easy to': '〜やすい',
    'hard to': '〜にくい',
    'start to': '〜始める',
    'keep on': '〜続ける',
    finish: '〜終わる',
    again: '〜直す',
    'each other': '〜合う',
    completely: '〜切る',
    thoroughly: '〜込む',
    around: '〜回る',
    'non-stop': '〜まくる',

    // スペイン語の語形
    or: 'または',
    'first-person': '1人称',
    'second-person': '2人称',
    'third-person': '3人称',
    singular: '単数',
    plural: '複数',
    masculine: '男性',
    feminine: '女性',
    present: '現在',
    preterite: '点過去',
    imperfect: '線過去',
    'imperfect-se': '線過去（-se形）',
    future: '未来',
    'conditional-mood': '過去未来',
    indicative: '直説法',
    subjunctive: '接続法',
    infinitive: '不定詞',
    gerund: '現在分詞',
    participle: '分詞',
    formal: '敬称',
    informal: '親称',
    'with-tú': 'tú形',
    'with-vos': 'vos形',
    'vos-form': 'vos形',
    voseo: 'ボセオ',
    'second-person-semantically': '意味上は2人称',
    accusative: '直接目的語付き',
    dative: '間接目的語付き',
    'object-first-person': '1人称目的語',
    'object-second-person': '2人称目的語',
    'object-third-person': '3人称目的語',
    'object-singular': '単数目的語',
    'object-plural': '複数目的語',
    diminutive: '縮小辞',
    augmentative: '増大辞',
    superlative: '最上級',
    alternative: '異形',
    'alt-of': '別表記',

    // 韓国語の語尾
    honorific: '尊敬',
    'future or guess': '意志・推量',
    'formal polite': 'ハムニダ体',
    question: '疑問',
    but: '逆接',
    "let's": '勧誘',
    plain: 'ハンダ体',
    'shall we, or I wonder': '提案・推測',
    'I will': '約束',
    'just noticed': '感嘆',
    'as you know': '〜じゃない',
    and: '並列',
    'because, or and then': '理由・先行動作',
    'but, or given that': '前置き・逆接',
    'even if': '〜ても',
    whether: '〜かどうか',
    'adverb form': '副詞形',
    quoting: '引用',
    'used to': '回想',
    topic: '〜は',
    subject: '〜が',
    object: '〜を',
    possessive: '〜の',
    'come to': '〜ようになる',
    when: '〜とき',
    modifier: '連体形',
    'noun form': '名詞形',
    becomes: '変化',
    'have done before': '経験',
    nominative: '主格',
    genitive: '属格',
    'accusative-case': '対格',
    'dative-case': '与格',
    neuter: '中性',
    definite: '定',
    indefinite: '不定',
    comparative: '比較級',
    strong: '強変化',
    weak: '弱変化',
    mixed: '混合変化',
    'without-article': '冠詞なし',
    reflexive: '再帰',
  },
  helpChat: {
    heading: '質問する',
    placeholder: '設定や操作の方法について質問できます',
    label: '質問',
    send: '質問する',
    thinking: '考え中…',
    note: 'このヘルプをもとに、お使いの端末上で Gemini Nano が答えています。間違うことがあります。',
    noMatch: 'ヘルプには載っていません。上の検索をお試しください。',
    failed: 'Gemini Nano が答えられませんでした。もう一度お試しください。',
    installHeading: 'ヘルプに質問する',
    install: 'Gemini Nano は、お使いのパソコンの Chrome 内で動く小さな AI モデルです。一度ダウンロードすると、ここで質問できます。入力した内容が端末の外に出ることはありません。',
    download: 'Gemini Nano をダウンロード',
    downloading: (percent: number): string => `ダウンロード中… ${percent}%`,
    update: 'Chrome には、ここで質問に答えられる小さな AI モデル、Gemini Nano が組み込まれています。使うには Chrome を更新してください。',
    unavailable: 'Chrome には、ここで質問に答えられる小さな AI モデル、Gemini Nano がありますが、このパソコンではまだ使えません。ディスクの空き容量が必要で、chrome://flags で有効にする必要がある場合があります。',
    learnMore: 'Gemini Nano について',
  },
};
