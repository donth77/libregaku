import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/*
 * A Turkish suffix follows the sound of the word it ends, so it cannot go on a
 * value not known in advance (a deck's name, a word, a number). Those go
 * before a word that takes the suffix instead: "“{deck}” destesine", "{port}
 * portunda", or after a colon.
 */

/** A share, as Turkish writes it: the % first. */
const percent = (n: number): string => `%${n}`;

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'kapalı', unknown: 'yeni kelimeler', always: 'tümü' };

/** What a card went in without, joined with "veya": "cümle sesi olmadan". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'cümle sesi olmadan (burada kaydetmek için Libregaku simgesine tıklayın)'
      : 'cümle sesi olmadan'))
    .join(' veya ');

const MEDIA_WHAT = { audio: 'sesleri', video: 'videoları', picture: 'görselleri' } as const;
const MEDIA_EMPTY = {
  audio: 'Bu notun sesinde veri yok.',
  video: 'Bu notun videosunda veri yok.',
  picture: 'Bu notun görselinde veri yok.',
} as const;

/** The interface in Turkish. Anything left out shows in English. */
export const tr: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    mandarin: 'Çince (Mandarin)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Diller
    languagesHeading: 'Diller',
    languagesAbout: 'Öğrendiğiniz dili ve kendi dilinizi seçin.',
    target: 'Öğrendiğim dil',
    targetLimited: (language: string): string => `${language} — sınırlı`,
    supportFull: 'Tam destek; okunuşlar ve furigana dahil.',
    supportPinyin: 'Tam destek; pinyin dahil. Tanımlar İngilizcedir.',
    supportJyutping: 'Tam destek; Jyutping dahil. Tanımlar İngilizcedir.',
    supportWords: 'Tam destek. Tanımlar İngilizcedir.',
    script: 'Yazı',
    scriptHint: 'Videoda ikisi de varsa bu kullanılır.',
    supportBasic: 'Temel destek: kelimeler ayrılır ama henüz sözlük ya da okunuş yok.',
    native: 'Diliniz',
    nativeHint: 'Çeviriler ve tanımlar, videoda ve sözlükte bulunduğu sürece bu dilde gösterilir.',
    definitions: 'Tanım dili',
    definitionsHint: 'Sözlükte sizin dilinizde tanım yok, bu yüzden tanımlar bu dilde gösterilir.',
    definitionsHintFor: (language: string): string =>
      `Sözlükte ${language} tanım yok, bu yüzden tanımlar bu dilde gösterilir.`,

    // Kelime arama
    lookupHeading: 'Kelime arama',
    lookupAbout: 'Kelimelerin nasıl ve ne zaman aranacağını seçin.',
    interaction: 'Arama yöntemi',
    interactionHover: 'Üzerine gelme',
    interactionShift: 'Shift basılıyken üzerine gelme',
    interactionClick: 'Tıklama',
    interactionHint: 'Bir kelimeye tıklamak her zaman da işe yarar.',
    hoverPause: 'Ararken duraklat',
    hoverPauseHint: 'İmleç bir kelimenin üzerindeyken videoyu duraklatır.',
    sidebarHover: 'Transkriptte hızlı tanımlar',
    sidebarHoverHint: 'Transkriptteki bir kelimenin üzerine geldiğinizde kısa bir tanım gösterir.',

    // Kelime penceresi
    popupHeading: 'Kelime penceresi',
    popupAbout: 'Bir kelimeyi aradığınızda pencerenin neleri göstereceğini seçin.',
    cardDeckMenu: 'Deste menüsü',
    cardDeckMenuHint: "Başka bir deste seçmek için “Anki'ye ekle” düğmesinin yanına bir ▾ ekler. Yeni kartlar artık oraya gider.",
    cardHideAdd: "Anki'ye ekle'yi gizle",
    cardHideAddHint: "“Anki'ye ekle” düğmesini ve yanındaki deste menüsünü karttan kaldırır.",
    cardKanji: 'Kanji ayrıntıları',
    cardKanjiHint: 'Her kanjinin anlamlarını ve okunuşlarını gösterir.',
    cardHanzi: 'Karakter ayrıntıları',
    cardHanziHint: 'Her karakterin anlamlarını ve okunuşlarını gösterir.',
    lookupElsewhere: 'Bu videodan örnekler',
    lookupElsewhereHint: 'Bu videoda kelimenin geçtiği diğer cümleleri gösterir. Oynatmak için birine tıklayın.',

    // Altyazılar
    subtitlesHeading: 'Altyazılar',
    subtitlesAbout: 'Altyazıların videoda nasıl görüneceğini ayarlayın.',
    ruby: 'Furigana',
    rubyUnknown: 'Yeni kelimeler',
    rubyAlways: 'Tümü',
    rubyNever: 'Kapalı',
    rubyHint: 'Kanjilerin üstünde okunuşlar. İzlerken değiştirmek için R tuşuna basın.',
    pinyin: 'Pinyin',
    pinyinHint: 'Karakterlerin üstünde okunuşlar. İzlerken değiştirmek için R tuşuna basın.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Karakterlerin üstünde okunuşlar. İzlerken değiştirmek için R tuşuna basın.',
    blurPrimary: 'Altyazıları bulanıklaştır',
    blurPrimaryHint: 'Dinleme pratiği için: altyazılar, üzerine gelene kadar bulanık kalır. Değiştirmek için H tuşuna basın.',
    showSubtitles: 'Videoda altyazılar',
    showSubtitlesHint: 'Altyazıları videonun üzerine çizer. Kapalıyken üst çubuk, döküm ve panel kalır. Çubuktaki düğme sırayla geçer: çeviri kapalı, altyazılar kapalı, sonra ikisi açık; ↑ aynısını yapar.',
    subtitleSize: 'Metin boyutu',
    subtitleSizeOption: (n: number): string => percent(n),
    subtitleSizeHint: 'Oynatıcıyla birlikte ölçeklenir, böylece tam ekranda da aynı görünür.',
    subtitleBottom: 'Konum',
    subtitleBottomLowest: 'En alçak',
    subtitleBottomLow: 'Alçak',
    subtitleBottomNormal: 'Normal',
    subtitleBottomRaised: 'Biraz yüksek',
    subtitleBottomHigh: 'Yüksek',
    subtitleBottomHighest: 'En yüksek',
    subtitleBottomHint: 'Altyazıların ne kadar yukarıda duracağı. Aynı oynatıcıdaki başka bir altyazı uzantısı bunların altında kalır.',
    dualSubtitles: 'Çeviriyi göster',
    dualSubtitlesHint:
      'Öğrendiğiniz dildeki altyazıların altında kendi dilinizdeki altyazıları gösterir. Bunlar makine çevirisi değil, ' +
      'sitenin kendi altyazılarıdır ve videonun tam transkriptini gerektirir.',
    singleKeys: 'Tek tuşlu kısayollar',
    singleKeysHint:
      'A ve R gibi harf tuşları izlerken tek başına çalışır. Kapalıyken bunlarla birlikte Alt ve Shift tuşlarını basılı tutun. ' +
      'Ok tuşları her iki durumda da çalışır.',

    // Alt çizgiler
    underlinesHeading: 'Alt çizgiler',
    underlinesAbout: 'Her renk, bir kelimeyi ne kadar iyi bildiğinizi gösterir. Değiştirmek için birine tıklayın.',
    colorUnknown: 'Yeni kelimeler',
    colorUnknownHint: "Anki'de kartı olmayan kelimeler.",
    colorLearning: 'Öğreniliyor',
    colorLearningHint: 'Kartı henüz olgunlaşmamış kelimeler.',
    colorTracking: 'Takip edilen',
    colorTrackingHint: 'Takip ettiğiniz kelimeler.',
    colorKnown: 'Bilinen',
    colorKnownHint: 'Olgun kartı olan ya da bilinen olarak işaretlenmiş kelimeler.',
    underlines: 'Kelimelerin altını çiz',
    underlinesHint: 'Kelimelerin altında renk olmayan sade altyazılar için kapatın.',
    markKnown: 'Bilinen kelimelerin altını çiz',
    markKnownHint: 'Varsayılan olarak kapalıdır; böylece öğrendikçe ekran sadeleşir.',
    underlineGrammar: 'Artikelleri ve zamirleri altı çizili göster',
    underlineGrammarHint: 'Varsayılan olarak kapalı: “the”, “ben” ve “o” gibi sözcüklere yine bakılabilir, ama öğrenilecek sözcük sayılmaz.',
    defaultColours: 'Varsayılan renkler',
    resetColours: 'Sıfırla',

    // Transkript
    transcriptHeading: 'Transkript',
    transcriptAbout: 'Videonun yanında, tüm altyazı satırlarını listeleyen panel.',
    sidebarFollow: 'Videoyla birlikte kaydır',
    sidebarFollowHint: 'Geçerli satırı görünür tutar. Kendiniz kaydırırsanız durur; bir düğme yeniden başlatır.',
    headerBar: 'Üst çubuğu göster',
    headerBarHint: 'İmleç videonun üst kısmına yaklaştığında orada belirir.',
    languageBadge: 'Dil rozeti',
    languageBadgeFlag: 'Bayrak',
    languageBadgeCode: 'Kod',
    badgeFlag: 'Rozet bayrağı',
    badgeFlagDefault: 'Varsayılan',
    flagSearch: 'Ara…',
    flagSearchLabel: 'Ülke ara',
    flagSuggested: 'Önerilenler',
    flagAll: 'Tüm ülkeler',
    flagNone: (query: string): string => `“${query}” ile eşleşen ülke yok.`,
    badgeFlagHint: 'Öğrendiğiniz dil için gösterilecek bayrak. Her dil kendi bayrağını saklar.',
    languageBadgeHint: 'Üst çubuğun, öğrendiğiniz dili nasıl göstereceği.',
    sidebarStats: 'Yeni kelimeleri say',
    sidebarStatsHint: 'Her satırdaki yeni kelime sayısını, bilinen kelime yüzdenizi ve bunları kullanan filtreleri gösterir.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: "Anki'yi bağlayın; yeni kartların nereye gideceğini ve hangi destelerin bildiğiniz kelimeleri belirleyeceğini seçin.",
    deck: 'Yeni kart destesi',
    deckHint: 'Her yeni kartın eklendiği deste.',
    statusScope: 'Bilinen kelimelerin kaynağı',
    statusScopeHint: 'Bu destelerdeki kartlar hangi kelimelerin altının çizileceğini belirler. Altdesteler dahildir.',
    marksInAnki: "İşaretleri Anki'de sakla",
    marksInAnkiHint:
      "“Bilinen”, “Takip et” ve “Yok say” işaretlerini Anki'de gizli notlar olarak (Libregaku::Marks) saklar; böylece " +
      'diğer cihazlarınızla senkronize edilirler. Kapalıyken bu tarayıcıda kalırlar.',

    // Deste menüleri
    wholeCollection: 'Tüm koleksiyon',
    chooseDeck: 'Bir deste seçin…',
    deckNotInAnki: (deck: string): string => `${deck} — Anki'de yok`,
    deckAndSubdecks: (deck: string): string => `${deck} (altdesteleriyle)`,
    deckUnset: 'Bir deste seçin. Seçene kadar kart eklenemez.',
    deckMissing: (deck: string): string => `Anki'de artık “${deck}” adlı bir deste yok. Başka bir deste seçin.`,
    statusScopeMissing: (deck: string): string =>
      `Anki'de artık “${deck}” adlı bir deste yok, bu yüzden tüm kelimeler yeni görünüyor. Başka bir deste seçin.`,
    statusScopeOutside: (deck: string): string =>
      `Yeni kartlar “${deck}” destesine gidiyor ve bu deste burada dahil değil; bu yüzden eklediğiniz kelimelerin altı ` +
      'yeni olarak çizili kalır. Bu desteyi içeren bir deste ya da “Tüm koleksiyon” seçeneğini seçin.',

    // Anki'nin durumu
    ankiChecking: 'Kontrol ediliyor…',
    ankiConnected: 'Bağlandı.',
    noteTypeInstalled: 'Not türü yüklendi.',
    cardsMade: (n: number): string => `Libregaku ile ${n} kart oluşturuldu.`,
    noCards: 'Henüz kart yok.',
    cardsFlushed: (n: number): string => `Anki kapalıyken oluşturulan ${n} kart eklendi.`,
    cardsNotFlushed: (n: number, error: string): string => `${n} kart eklenemedi: ${error}`,
    cardsWaiting: (n: number): string => `${n} kart eklenmeyi bekliyor.`,
    ankiOffline: (port: number): string =>
      `Anki, ${port} portunda yanıt vermiyor. Kapalıyken bu beklenen bir durumdur: ` +
      'yeni kartlar burada bekler ve Anki açılınca eklenir.',
    ankiBlocked: 'Anki çalışıyor ama AnkiConnect henüz bu uzantıya izin vermiyor.',
    ankiOccupied: (detail: string): string => `${detail} Anki'nin kullanabilmesi için onu kullanan programı kapatın.`,

    // Anki düğmeleri
    checkAgain: 'Tekrar kontrol et',
    newDeck: 'Yeni deste',
    openCards: "Kartları Anki'de aç",
    openMarks: "İşaretleri Anki'de aç",
    newDeckPrompt: 'Yeni desteye bir ad verin. Altdeste için :: kullanın, ör. Japonca::Netflix',

    // Anki'yi bağlama
    installStep: "Anki'yi bu bilgisayara yükleyip açın. {link}",
    getAnki: "Anki'yi indir",
    addonStep: "Anki'de şuraya gidin: {menu}. Bu kodu yapıştırın, ardından Anki'yi yeniden başlatın.",
    addonMenu: 'Araçlar → Eklentiler → Eklenti Alın…',
    aboutAnkiConnect: 'AnkiConnect hakkında',
    originStep: "Anki'de şuraya gidin: {menu}. Bu satırı {setting} ayarına ekleyin, ardından Anki'yi yeniden başlatın.",
    originMenu: 'Araçlar → Eklentiler → AnkiConnect → Yapılandırma',
    runningStep: "İzlerken Anki'yi açık tutun. Kartlar doğrudan bu bilgisayardaki Anki'ye gider.",
    copy: 'Kopyala',
    copyValue: (value: string): string => `Kopyala: ${value}`,
    copied: 'Kopyalandı',
    copyFailed: 'Elle seçin',

    // Anki kartları
    ankiCardsHeading: 'Anki kartları',
    ankiCardsAbout: 'Kelime, okunuş, anlam ve cümle dışında her yeni karta nelerin ekleneceğini seçin.',
    cardAudio: 'Kelime sesi',
    cardAudioHint: 'Varsa kelimenin bir ses kaydı. Asla yapay ses değil.',
    cardSentenceAudio: 'Cümle sesi',
    cardSentenceAudioHint: 'Cümleyi bir kez daha oynatarak kaydeder. Korumalı sitelerde bunun için aşağıdaki izin gerekir.',
    cardScreenshot: 'Ekran görüntüsü',
    cardScreenshotHint: 'Sahneden bir kare. Korumalı siteler engellediği için bu sitelerde kullanılamaz.',
    capture: 'Korumalı sitelerde cümle sesi',
    captureAllow: 'İzin ver',
    captureAllowInSettings: 'Ayarlarda izin ver',
    captureRemove: 'Kaldır',
    captureAllowed:
      'İzin verildi. Korumalı bir sitenin açık olduğu her sekmede Libregaku simgesine tıklayın ve “Cümle sesini burada kaydet” seçeneğini seçin.',
    captureNeeded: 'Korumalı siteler videolarını şifrelediği için cümle sesi sekmeden kaydedilir. Bunun için izniniz gerekir.',

    // Veriler ve lisanslar
    creditsHeading: 'Veriler ve lisanslar',
    creditJmdict:
      'Sözlük ve kanji verileri © Electronic Dictionary Research and Development Group; CC BY-SA 4.0 kapsamında ' +
      'kullanılmaktadır. jmdict-simplified tarafından JSON olarak yeniden paketlenmiştir.',
    creditLindera:
      'Japoncayı, Koreceyi ve Çinceyi kelimelere ayırır. MIT lisansı; IPADIC, UniDic, mecab-ko-dic ve CC-CEDICT kendi ' +
      'koşullarına tabidir.',
    creditCedict: 'Çince sözlük © MDBG ve katkıda bulunanlar; CC BY-SA 4.0 kapsamında kullanılmaktadır.',
    creditWiktionary:
      "Korece ve İspanyolca sözlükler ile kendi dilinizdeki bazı sözlükler; Wiktionary'den kaikki.org ve " +
      'wiktionary-to-yomitan aracılığıyla. CC BY-SA 4.0.',
    creditKrdict:
      'Korece kelimeler, kendi dilinizde açıklamalarla. © National Institute of Korean Language; CC BY-SA 2.0 KR ' +
      'kapsamında kullanılmaktadır. Dosyalar Lyroxide tarafından hazırlanmıştır.',
    creditCfdict:
      'Çince, Fransızca açıklamalarla. CFDICT © chine.in; CxDICT tarafından güncel tutulmaktadır. CC BY-SA 4.0.',
    creditCanto:
      'Kantonca sözlük ve CC-CEDICT için Jyutping okunuşları. © Pleco Inc.; CC BY-SA 3.0 kapsamında kullanılmaktadır.',
    creditHandedict:
      'Çince, Almanca açıklamalarla. © HanDeDict ve katkıda bulunanlar; CC BY-SA 3.0 kapsamında kullanılmaktadır.',
    creditUnihan: 'Bir Çince karakterin önce hangi okunuşunun gösterileceği. © Unicode, Inc.; Unicode License kapsamında kullanılmaktadır.',
    creditJotoba: 'Sözlük inerken aramalar için kullanılır. İkisi de JMdict kullanır.',
    creditLucide: 'Simgeler. ISC lisansı.',
    creditCommons: 'Gönüllülerin seslendirdiği İspanyolca, Çince ve Korece sözcük kayıtları. Her kaydın kendi lisansı vardır, çoğunda CC BY-SA 4.0; çalınırken ve kartta konuşanın adıyla birlikte gösterilir.',
    creditAudioCmn: 'Çince sözcük kayıtları: Yue Tan, Caen Üniversitesi. CC BY-SA 3.0 US.',
    creditNaver: 'Naver Dictionary’den Korece sözcük kayıtları, yalnızca arama kartında çalınır. Yeniden kullanım lisansı olmadığından hiçbir zaman karta eklenmez.',
    creditSpanishdict: 'SpanishDict’ten İspanyolca sözcükler için üretilmiş ses, kayıt olmadığında telaffuz düğmesiyle çalınır. Yeniden kullanım lisansı olmadığından hiçbir zaman karta eklenmez.',
    licence: 'Libregaku MIT lisanslıdır. Sözlük verileri pakete dahil değildir; kaynaklarından indirilir.',
    built: (when: string): string => `Bu kopyanın derlenme tarihi: ${when}.`,

    // Klavye kısayolları
    keyLine: 'Önceki veya sonraki satır',
    keyReplay: 'Satırı tekrar oynat',
    keyTranslation: 'Çeviriyi göster veya gizle',
    keyShiftLookup: 'İmlecin altındaki kelimeyi aramak için basılı tutun',
    keyAdd: "Penceredeki kelimeyi Anki'ye ekle",
    keyKnown: 'Penceredeki kelimeyi bilinen olarak işaretle',
    keyFurigana: 'Furiganayı değiştir: kapalı, yeni kelimeler, tümü',
    keyPinyin: 'Pinyini değiştir: kapalı, yeni kelimeler, tümü',
    keyJyutping: "Jyutping'i değiştir: kapalı, yeni kelimeler, tümü",
    keyBlur: 'Altyazıları bulanıklaştır veya netleştir',
    keySave: 'Geçerli satırı kaydet',
    keyTranscript: 'Transkript panelini göster veya gizle',
    keyClose: 'Pencereyi kapat',
  },

  options: {
    pageTitle: 'Libregaku ayarları',
    help: 'Yardım',
    searchSettings: 'Ara…',
    noSettingsFound: 'Burada “{q}” geçmiyor.',
    contentsLabel: 'Ayar bölümleri',
    settingsLabel: 'Ayarlar',
    setupHeading: 'Başlayın',
    setupAbout: 'İki seçim yeterli; geri kalan her şeyin makul bir varsayılanı var.',
    stepLanguages: 'Ne öğrendiğinizi seçin',
    stepAnki: "Anki'yi bağlayın ve yeni kartlar için bir deste seçin",
    ankiOptional:
      'Anki isteğe bağlıdır; altyazılar, aramalar ve furigana onsuz da çalışır. ' +
      'Hangi kelimeleri zaten bildiğinizi hatırlayan odur.',
    nextSteps:
      'Ardından öğrendiğiniz dilde altyazısı olan bir video açın ve bir kelimenin üzerine gelin. ' +
      'Transkript panelindeki klavye düğmesi, klavye kısayollarını listeler.',
    stepDone: 'Tamamlandı',
    confirmLanguages: 'Bu diller doğru',
    keepDeck: (deck: string): string => `Yeni kartlar için “${deck}” destesini kullan`,
  },

  action: {
    help: 'Yardım',
    settings: 'Ayarlar',
    settingsTip: 'Tüm ayarlar',
    checkingPage: 'Bu sayfa kontrol ediliyor…',
    notActive:
      "Bu sayfada etkin değil. YouTube, Netflix veya desteklenen başka bir sitede bir video açın. Libregaku'yu yeni yüklediyseniz ya da " +
      'yeniden yüklediyseniz sekmeyi yeniden yükleyin.',
    unsupported: "Libregaku, YouTube, Netflix, Disney+, Prime Video ve Max'te çalışır.",
    worksOn: (site: string): string => `Libregaku şu sitede çalışır: ${site}.`,
    waitingForSubtitles: (site: string): string =>
      `${site} üzerinde altyazılar bekleniyor. Altyazıların açık olduğundan emin olun.`,
    activeOn: (title: string): string => `Etkin — ${title}`,
    active: 'Bu videoda etkin.',
    subtitlesTrack: 'Altyazılar',
    translationTrack: 'Çeviri',
    noTranslation: 'Yok',
    generatedTrack: (track: string): string => `${track} (otomatik)`,
    captureNeedsPermission: 'Cümle sesini burada kaydetmek için bu sekmenin sesini yakalama izni gerekir.',
    captureAllowInSettings: 'Ayarlarda izin ver',
    captureReady: 'Korumalı sitelerin sesi ancak bu sekme için açtıktan sonra kaydedilebilir.',
    captureStart: 'Cümle sesini burada kaydet',
    captureFailed: 'Chrome bu sekmeyi kaydedemedi.',
    toggleSidebar: 'Kenar çubuğunu aç/kapat',
    ankiChecking: 'Anki: kontrol ediliyor…',
    ankiConnected: (n: number): string => `Anki bağlı · Libregaku ile ${n} kart`,
    ankiOffline: 'Anki çalışmıyor — kelimeler yeni görünüyor',
    ankiOccupied: (port: number): string => `Başka bir program ${port} portunu kullanıyor, bu yüzden Anki'ye ulaşılamıyor`,
    ankiBlocked: "Anki bu uzantıyı reddetti — eklenecek satır Ayarlar'da",
    ankiBusy: 'Anki yanıt vermedi — senkronizasyonla meşgul olabilir',
    ankiRefused: 'Anki isteği reddetti',
    cardsToAdd: (n: number): string => `${n} kart eklenecek`,
    cardsWaiting: (n: number): string => `${n} kart Anki'yi bekliyor`,
  },

  sidebar: {
    panelLabel: 'Transkript paneli',
    resizeLabel: 'Paneli yeniden boyutlandır',

    // Sekmeler ve yanlarındaki düğmeler
    tabsLabel: 'Listeler',
    transcriptTab: 'Transkript',
    savedTab: 'Kaydedilenler',
    settings: 'Ayarlar',
    shortcuts: 'Klavye kısayolları',
    close: 'Kapat',
    closeLabel: 'Kapat — transkript paneli',
    openTip: 'Transkript',
    openLabel: 'Transkripti göster',
    help: 'Yardım',

    // Transkriptte arama
    searchPlaceholder: 'Transkriptte ara…',
    searchLabel: 'Transkriptte ara',
    noMatches: 'Eşleşme yok',
    matchAt: (at: number, total: number): string => `${at}/${total}`,
    matchesFound: (n: number): string => `${n} sonuç`,

    // Filtre
    filterTip: 'Filtrele',
    filterLabel: 'Satırları filtrele',
    filterAll: 'Tüm satırlar',
    filterAllAbout: 'Filtresiz, her satır',
    filterNew: 'Yeni kelime içerenler',
    filterNewAbout: 'Kartınız olmayan bir kelime içeren satırlar',
    filterReady: 'Öğrenmeye hazır',
    filterReadyAbout: 'Yalnızca bir kelimesi sizin için yeni olan satırlar — öğrenmesi en kolay olanlar',
    filterSaved: 'Kaydedilenler',
    filterSavedAbout: 'Sonrası için sakladığınız satırlar',

    // Transkript
    partial: 'İzledikçe oluşuyor — bu oynatıcı yalnızca geçerli satırı veriyor.',
    partialEmpty: 'Henüz bir şey yok. Satırlar söylendikçe burada görünür.',
    empty: 'Yüklü transkript yok.',
    currentLine: 'Geçerli satır',
    lineNew: (n: number): string => `${n} yeni`,
    playFrom: (time: string): string => `${time} noktasından oynat`,
    saveLine: 'Satırı kaydet',
    unsave: 'Kaydedilenlerden çıkar',
    addSentence: 'Cümle ekle',
    addSentenceLabel: "Cümleyi Anki'ye ekle",

    // Transkriptin üstündeki özet
    knownPercent: (n: number): string => percent(n),
    summaryKnown: '{n} bilinen',
    summaryNew: '{n} yeni',
    summaryReady: '{n} öğrenmeye hazır',
    counting: (n: number): string => `Yeni kelimeler sayılıyor… ${percent(n)}`,
    countFailed: 'Bazı satırlar sayılamadı, bu yüzden toplam yok.',

    // Hızlı tanım
    dictionaryLoading: (n: number): string => `Sözlük yükleniyor — ${percent(n)}`,
    dictionaryUnavailable: 'Sözlük kullanılamıyor',
    noEntry: 'Sözlükte yok.',

    // Kaydedilenler
    savedEmpty:
      'Henüz kaydedilen bir şey yok. Dönmek istediğiniz bir cümleyi saklamak için transkriptteki herhangi bir satırın ' +
      'yer işaretini kullanın ya da B tuşuna basın.',
    thisVideo: 'bu video',
    openAt: (time: string): string => `Videoyu ${time} noktasında aç`,
    remove: 'Kaldır',
    removeLabel: 'Kaydedilenlerden kaldır',
    copySavedAbout: 'Kaydedilen tüm satırları sekmeyle ayrılmış metin olarak kopyalar',
    exportSavedAbout: "Anki'nin içe aktarabileceği, sekmeyle ayrılmış bir dosya kaydeder",
    addSavedAbout: 'Kaydedilen her satırdan bir kart oluşturur',
    linesCopied: (n: number): string => `${n} satır kopyalandı.`,
    chooseDeck: "Önce Ayarlar'da bir deste seçin — yeni kartlar oraya gider.",
    checkingAnki: 'Anki kontrol ediliyor…',
    ankiOffline: "Anki çalışmıyor. Açıp yeniden deneyin — adımlar Ayarlar'da.",
    ankiBlocked: "AnkiConnect henüz bu uzantıya izin vermedi. Eklenecek tek satır Ayarlar'da.",
    ankiUnreachable: "Anki'ye ulaşılamadı. Nedeni Ayarlar'da yazıyor.",
    adding: (at: number, total: number): string => `Ekleniyor: ${at}/${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${added} kart “${deck}” destesine eklendi${already ? `; ${already} kart zaten oradaydı` : ''}.`,

    // Kaydedilenler ve Kelimeler sekmelerinin ortak düğmeleri
    copy: 'Kopyala',
    exportFile: 'Dışa aktar',
    addToAnki: "Anki'ye ekle",
    noClipboard: 'Panoya erişilemedi.',
    downloaded: "İndirilenler klasörüne kaydedildi. Anki'de: Dosya → İçe Aktar.",
    downloadBlocked: 'Bu sayfa indirmeyi engelledi — bunun yerine “Kopyala” düğmesini kullanın.',

    // Kelimeler sekmesi
    listsLabel: 'Hangi liste',
    listLines: 'Satırlar',
    listTracked: 'Takip edilenler',
    listKnown: 'Bilinenler',
    listIgnored: 'Yok sayılanlar',
    findPlaceholder: 'Ara…',
    findLabel: 'Bu listede ara',
    copyWordsAbout: 'Bu listeyi sekmeyle ayrılmış metin olarak kopyalar',
    exportWordsAbout: "Bu listeyi, Anki'nin içe aktarabileceği sekmeyle ayrılmış bir dosya olarak kaydeder",
    wordsCopied: (n: number): string => `${n} kelime kopyalandı.`,
    nothingToExport: 'Bu listede dışa aktarılacak bir şey yok.',
    lookingUp: 'Okunuşlar ve anlamlar aranıyor…',
    noWordMatches: (query: string): string => `Bu listede “${query}” ile eşleşen kelime yok.`,
    noLineMatches: (query: string): string => `“${query}” ile eşleşen kaydedilmiş satır yok.`,
    wordsMatching: (shown: number, total: number): string => `${shown}/${total} kelime.`,
    trackedEmpty:
      'Henüz takip edilen bir şey yok. “Takip et”, kart oluşturmadan bir kelimenin altını çizer; böylece onu fark edersiniz. ' +
      "Düğmesini Ayarlar'da, “Kelime penceresi” bölümünde açın.",
    trackedIntro: (n: number): string => `Takip ettiğiniz ${n} kelime; geçtiği her yerde altı çizili.`,
    stopTracking: 'Takibi bırak',
    knownEmpty:
      'Bilinen olarak işaretlenmiş kelime yok. Bir kelimeyi bildiğinizde ve kart istemediğinizde onu penceresinden ' +
      'bilinen olarak işaretleyin ya da K tuşuna basın.',
    knownIntro: (n: number): string =>
      `Bilinen olarak işaretlenmiş ${n} kelime. Bir kelimenin işaretini kaldırırsanız durumu yeniden Anki kartlarınıza göre belirlenir.`,
    unmarkKnown: 'Bilinen işaretini kaldır',
    ignoredEmpty: 'Yok sayılan kelime yok. Adları ve sesleri penceresinden yok sayın; altları hiç çizilmez ve hiç sayılmazlar.',
    ignoredIntro: (n: number): string => `Yok sayılan ${n} kelime; altı hiç çizilmez, hiç sayılmaz.`,
    stopIgnoring: 'Yok saymayı bırak',
  },

  popup: {
    // Pencere ve baştaki kelime
    cardLabel: (word: string): string => `${word} — sözlük`,
    commonBadge: 'yaygın',
    nameBadge: 'muhtemelen bir isim',
    characterNames: { kanji: 'Kanji', hanzi: 'Karakterler' },
    partOfSpeech: {
      n: 'isim', 'n-adv': 'zarf olarak isim', 'n-t': 'zaman ismi', 'n-suf': 'isim soneki',
      'n-pref': 'isim öneki', pn: 'zamir', 'adj-i': 'i-sıfatı', 'adj-na': 'na-sıfatı',
      'adj-no': 'no-sıfatı', 'adj-pn': 'ad önü sıfat', adv: 'zarf', 'adv-to': 'zarf',
      aux: 'yardımcı', 'aux-v': 'yardımcı fiil', 'aux-adj': 'yardımcı sıfat',
      conj: 'bağlaç', cop: 'koşaç', ctr: 'sayma sözcüğü', exp: 'ifade', int: 'ünlem',
      num: 'sayı', prt: 'edat', pref: 'önek', suf: 'sonek', unc: 'sınıflandırılmamış',
      vs: 'suru fiili', 'vs-i': 'suru fiili', 'vs-s': 'suru fiili', vt: 'geçişli', vi: 'geçişsiz',
      v1: 'ichidan fiili', 'v1-s': 'ichidan fiili', vk: 'kuru fiili', vz: 'zuru fiili',
      v5b: 'godan fiili', v5g: 'godan fiili', v5k: 'godan fiili', 'v5k-s': 'godan fiili',
      v5m: 'godan fiili', v5n: 'godan fiili', v5r: 'godan fiili', 'v5r-i': 'godan fiili',
      v5s: 'godan fiili', v5t: 'godan fiili', v5u: 'godan fiili', 'v5u-s': 'godan fiili',
      v5aru: 'godan fiili',
      // Wiktionary kodları, Korece ve İspanyolca kelimeler için
      name: 'özel isim', v: 'fiil', adj: 'sıfat', pron: 'zamir', det: 'belirleyici', artic: 'tanımlık',
      counter: 'sayma sözcüğü', prep: 'ön edat', 'prep-phrase': 'ön edat öbeği', ptcl: 'edat',
      intj: 'ünlem', phrase: 'söz öbeği', prov: 'atasözü', r: 'kök', char: 'karakter', adn: 'ad önü sıfat',
      ptcpl: 'ortaç', contr: 'kaynaşmış biçim',
      masc: 'eril', fem: 'dişil', neut: 'yansız', sg: 'tekil', pl: 'çoğul', 'pl-only': 'yalnızca çoğul',
      count: 'sayılabilir', uncount: 'sayılamaz', vr: 'dönüşlü', vdt: 'çift nesneli', impers: 'kişisiz',
      irreg: 'düzensiz', reltnl: 'ilişkisel', reltv: 'ilgi', interr: 'soru', poss: 'iyelik',
      dim: 'küçültme', aug: 'büyütme', onoma: 'yansıma',
      idio: 'deyimsel', fig: 'mecaz', literal: 'gerçek anlam', col: 'konuşma dili', inf: 'gayriresmî', fam: 'samimi',
      formal: 'resmî', polite: 'kibar', lit: 'edebî', poet: 'şiirsel', rhet: 'retorik', sl: 'argo',
      vulg: 'kaba', derog: 'aşağılayıcı', offens: 'saldırgan', humor: 'mizahi', euph: 'örtmece',
      child: 'çocuk dili', net: 'internet', neol: 'yeni sözcük', cmn: 'yaygın', uncmmn: 'az yaygın', rare: 'nadir',
      dated: 'eskimiş', arch: 'arkaik', obs: 'kullanılmıyor', hist: 'tarihî', 'non-std': 'standart dışı',
      dialect: 'ağız', regio: 'bölgesel',
    },

    // Kelimenin altındaki düğmeler
    pronounce: 'Dinle',
    playedRecording: (word: string): string => `${word} · kayıt`,
    playedSynthesised: (word: string): string => `${word} · yapay ses`,
    recordingBy: (speaker: string, licence: string): string => `Kayıt: ${speaker} · ${licence}`,
    pronounceFailed: 'ses çalınamadı',
    addSentence: 'Cümle ekle',
    sentenceAdded: 'Cümle eklendi',
    undo: 'Geri al',
    copyWord: 'Kelimeyi kopyala',
    copyPhrase: 'İfadeyi kopyala',
    copySentence: 'Cümleyi kopyala',
    wordCopied: 'kelime kopyalandı',
    phraseCopied: 'ifade kopyalandı',
    sentenceCopied: 'cümle kopyalandı',
    copyFailed: 'kopyalanamadı — bunun yerine metni seçin',

    // Anlamlar
    dictionaryLoading: (n: number): string => `Sözlük hâlâ yükleniyor — ${percent(n)}. Biraz sonra tekrar deneyin.`,
    dictionaryUnavailable: (error: string): string => `Sözlük kullanılamıyor: ${error}`,
    noEntry: 'Bu kelime sözlükte yok.',
    noEntryName: 'Bir özel ad, bu yüzden sözlükte maddesi yok.',
    moreMeanings: (n: number): string => `+${n} anlam daha`,

    // Kelimenin bu videodaki diğer satırları
    elsewhereCount: (n: number): string => (n === 1 ? 'Bu videoda bir kez daha' : `Bu videoda ${n} kez daha`),
    playLine: 'Oynat',
    elsewhereMore: (n: number): string => `ve ${n} satır daha — transkript araması hepsini bulur`,
    showAllInTranscript: 'Tümünü transkriptte göster',

    // Anki'ye ekleme
    addToAnki: "Anki'ye ekle",
    addToDeck: (deck: string): string => `“${deck}” destesine ekle`,
    adding: 'Ekleniyor…',
    undoing: 'Geri alınıyor…',
    added: 'Eklendi',
    addedUndo: 'Eklendi — geri al',
    inAnki: "Anki'de",
    showInAnki: "Anki'de göster",
    waiting: 'Bekliyor',
    waitingForAnki: 'Anki bekleniyor',
    goesInWhenAnkiOpens: "Anki açılınca Anki'ye eklenecek",
    alreadyAdded: 'Zaten eklendi',
    alreadyInAnki: "Zaten Anki'de",
    waitingForAnkiToOpen: "Anki'nin açılması bekleniyor",
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // Deste menüsü
    otherDecks: 'Diğer desteler',
    addToAnotherDeck: 'Başka bir desteye ekle',
    decksUnknown: 'Anki yanıt vermiyor, bu yüzden desteleri henüz bilinmiyor.',
    newDeck: 'Yeni deste…',
    newDeckPrompt: 'Yeni deste — altdeste için :: kullanın, ör. Japonca::Netflix',

    // İşaretler
    knownButton: 'Bilinen',
    trackButton: 'Takip et',
    ignoreButton: 'Yok say',
    markKnownTip: 'Bilinen olarak işaretle',
    trackTip: 'Takip et',
    ignoreTip: 'Yok say',
    unmarkKnownTip: 'Bilinen işaretini kaldır',
    stopTrackingTip: 'Takibi bırak',
    stopIgnoringTip: 'Yok saymayı bırak',
  },

  header: {
    knownStat: '{percent} bilinen',
    knownPercent: (n: number): string => percent(n),
    knownTip: 'Bildiğiniz kelimeler',
    readyStat: '{count} öğrenmeye hazır',
    readyTip: 'Tek bir yeni kelimesi olan satırlar',
    blurSubtitle: 'Altyazıyı bulanıklaştır',
    unblurSubtitle: 'Altyazıyı netleştir',
    showTranslation: 'Çeviriyi göster',
    hideTranslation: 'Çeviriyi gizle',
    hideSubtitles: 'Altyazıları gizle',
    showSubtitles: 'Altyazıları göster',
    subtitles: 'Altyazılar',
    translation: 'Çeviri',
    transcript: 'Transkript',
    pinHeader: 'Üst çubuğu sabitle',
    unpinHeader: 'Üst çubuğun sabitlemesini kaldır',
    settings: 'Ayarlar',
    showHeader: 'Üst çubuğu göster',
  },

  player: {
    // Oynatıcı tuşları
    lastLine: 'Bu son satırdı',
    noLineBefore: 'Bundan önce satır yok',
    translationOn: 'Çeviri açık',
    translationOff: 'Çeviri kapalı',
    subtitlesOff: 'Altyazılar kapalı',
    subtitlesOn: 'Altyazılar açık',
    blurOn: 'Altyazı, üzerine gelene kadar bulanık',
    blurOff: 'Altyazı görünüyor',
    lineSaved: 'Satır kaydedildi',
    lineUnsaved: 'Satır artık kayıtlı değil',
    lookUpFirst: 'Önce bir kelime arayın',
    alreadyKnown: (word: string): string => `${word} · Anki'de zaten biliniyor`,
    alreadyInAnki: (word: string): string => `${word} · zaten Anki'de`,
    adding: (word: string): string => `Ekleniyor: ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // İşaretler
    markOff: (word: string): string => `${word} · işaret kaldırıldı`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = {
        known: 'bilinen olarak işaretlendi', tracking: 'takip ediliyor', ignored: 'yok sayıldı', unknown: 'yeni olarak işaretlendi',
      }[status];
      if (refused) return `${word} · ${done}, kart yok — Anki reddetti; daha sonra yeniden denenecek`;
      return `${word} · ${done}, kart yok${status === 'tracking' ? '. Paneldeki Kaydedilenler sekmesine bakın' : ''}`;
    },

    // Kelime kartı
    pickDeck: 'Önce Libregaku ayarlarında bir deste seçin',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `“${deck}” destesine eklendi — ${without(missing)}` : `“${deck}” destesine eklendi`,
    alreadyIn: (deck: string): string => `zaten “${deck}” destesinde`,
    queued: (deck: string): string => `Anki kapalı — açılınca “${deck}” destesine eklenecek`,
    alreadyQueued: "zaten Anki'yi bekliyor",
    notKept: 'Anki kapalı ve tarayıcı kartı sonrası için saklamadı',
    takenBack: (deck: string): string => `“${deck}” destesinden geri alındı`,
    unqueued: "artık Anki'yi beklemiyor",
    alreadySent: "Zaten Anki'ye eklendi",
    queueSent: (count: number): string =>
      `Anki açık — onun için saklanan ${count === 1 ? 'kart' : `${count} kart`} eklendi`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `bildiğiniz kelimeler “${scope}” destesinden okunuyor, bu yüzden “${deck}” destesindeki kartlar sayılmayacak`,

    // Cümle kartı
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `cümle “${deck}” destesine eklendi — ${without(missing)}` : `cümle “${deck}” destesine eklendi`,
    sentenceAlreadyIn: (deck: string): string => `cümle zaten “${deck}” destesinde`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'sesi', picture && 'görüntüsü'].filter(Boolean);
      return `Anki kapalı — cümle, Anki açılınca “${deck}” destesine eklenecek` +
        `${lacking.length ? `; ${lacking.join(' ve ')} olmadan` : ''}`;
    },
    sentenceAlreadyQueued: "cümle zaten Anki'yi bekliyor",
    sentenceTakenBack: (deck: string): string => `cümle “${deck}” destesinden geri alındı`,

    // Cümle sesi
    recording: 'Satırın sesi kaydediliyor…',

    // Aramalar
    noDictionary: 'Bu dil için henüz sözlük yok.',
  },

  notices: {
    // Bildirim kartı
    unexpected: 'Libregaku beklenmedik bir sorunla karşılaştı.',
    dismiss: 'Kapat',

    // YouTube veya Netflix bir şeyi değiştirdi
    youtubeTrackList: "YouTube'un altyazı listesi okunamadı.",
    youtubeTrackShape: "YouTube'un altyazı verileri beklenen biçimde değil.",
    youtubeCaptionText: "Sayfada YouTube'un altyazı metni bulunamadı.",
    youtubePlayerTrackList: 'Bu videonun altyazı listesi YouTube oynatıcısından okunamadı.',
    netflixTrackList: "Netflix'in altyazı listesi okunamadı.",
    netflixCaptionText: "Sayfada Netflix'in altyazı metni bulunamadı.",
    disneyTrackList: "Disney+'ın altyazı listesi okunamadı.",
    appleTrackList: "Apple TV+'ın altyazı listesi okunamadı.",
    appleTiming: 'Apple TV+ altyazıları videoyla eşleştirilemedi.',
    disneyCaptionText: "Sayfada Disney+'ın altyazı metni bulunamadı.",
    primeTrackList: "Prime Video'nun altyazı listesi okunamadı.",
    primeCaptionText: "Sayfada Prime Video'nun altyazı metni bulunamadı.",
    maxTrackList: "Max'in altyazı listesi okunamadı.",
    maxCaptionText: "Sayfada Max'in altyazı metni bulunamadı.",
    netflixBlocked: "Netflix, Libregaku'nun altyazıları okuyan kısmını engelledi.",

    // Bu videonun altyazıları
    subtitlesOff: 'Oynatıcıda altyazıları açın; Libregaku onları algılayacaktır.',
    trackNotSent: 'Oynatıcı bu altyazıları henüz yüklemedi.',
    noTargetTrack: 'Burada öğrendiğiniz dilde altyazı yok.',
    noSecondTrack: 'Burada kendi dilinizde altyazı yok, bu yüzden ikinci satır yok.',
    onlyOneTrack: 'Bu videoda yalnızca bir altyazı var, bu yüzden ikinci satır yok.',
    autoGenerated: 'Bu altyazılar otomatik oluşturulmuş, bu yüzden ifadeler ve kelime ayrımları kusurlu olacaktır.',
    noSubtitles: 'Bu videonun altyazısı yok.',
    secondTrackFailed: 'İkinci satır yüklenemedi.',

    // Uzantının kendi parçaları
    analyserUnavailable:
      'Okunuşlar ve sözlük biçimleri kapalı: dil çözümleyici yüklenmedi. Kelimeler kartlarınızla yalnızca birebir aynı ' +
      'yazılışla eşleşir.',
    markNotSaved: 'Bu işaret kaydedilemedi. Sayfayı yeniden yükleyene kadar geçerli, sonra kaybolacak.',
    marksNotSynced: "İşaretleriniz Anki'ye kaydedilemedi. Bu tarayıcıda saklanıyorlar ve yeniden denenecek.",
    cardsNotAdded: 'Anki, kapalıyken saklanan kartların bazılarını kabul etmedi. Hâlâ saklanıyorlar ve yeniden denenecek.',

    // Ayrıntılar
    playerNeverLoaded: 'Oynatıcının yüklenmesi hiç tamamlanmadı.',
    subtitlesMaybeOff: 'Altyazılar oynatıcıda kapalı olabilir.',
    lookedFor: (selector: string): string => `Aranan: ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Bu videodaki altyazılar: ${languages.join(', ') || 'yok'}. Ayarlarda öğrendiğiniz dili değiştirin ya da başka bir video seçin.`,
    onlyPictures: 'Bu videoda altyazılar yalnızca resim olarak var, metin olarak değil; bu yüzden Libregaku onları okuyamaz.',
    chooseInPlayer: (track: string): string => `Oynatıcının kendi altyazı menüsünden ${track} seçeneğini seçin; Libregaku onları algılayacaktır.`,
    noHumanTrack: 'Bu video için insan tarafından yazılmış altyazı yok.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Bu videodaki altyazılar: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'çözümleyici yüklenmedi',
  },

  anki: {
    // AnkiConnect'e ulaşma
    offline: (port: number): string => `${port} portunda dinleyen bir şey yok.`,
    timeout: (port: number, seconds: number): string =>
      `${port} portunda ${seconds} sn içinde yanıt gelmedi. ` +
      'Anki meşgul olabilir (senkronizasyon yapıyor ya da bir iletişim kutusu gösteriyor) veya portu başka bir program tutuyor.',
    blocked: (origin: string): string =>
      `AnkiConnect, ${origin} adresini reddetti. Anki'de: Araçlar → Eklentiler → AnkiConnect → Yapılandırma; ` +
      'ardından o satırı webCorsOriginList listesine ekleyin.',
    httpAnswer: (port: number, status: number): string =>
      `${port} portundaki bir şey HTTP ${status} ile yanıt verdi. AnkiConnect böyle yanıt vermez.`,
    notAnkiConnect: (port: number): string => `${port} portunu AnkiConnect dışında bir şey kullanıyor.`,
    noBackground: 'Uzantının arka plan kısmı yanıt vermiyor.',
    unreachable: "Anki'ye ulaşılamıyor.",
    callFailed: 'AnkiConnect çağrısı başarısız oldu.',

    // Libregaku'nun göndermeyi reddettikleri
    notRelayed: (action: string): string => `Libregaku, “${action}” işlemini AnkiConnect'e göndermez.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku yalnızca kendi indirdiği ${MEDIA_WHAT[media]} ekler.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => MEDIA_EMPTY[media],
    mediaName: (prefix: string): string => `Libregaku eklediği dosyaları ${prefix}… diye adlandırır; bu dosya öyle adlandırılmamış.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} için bir ${ids === 'notes' ? 'not' : 'kart'} listesi gerekir.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Reddedildi: gönderilen ${ids === 'notes' ? 'notlardan' : 'kartlardan'} ${count} tanesi hiçbir Libregaku işaretine ait değil. ` +
      (change === 'delete'
        ? 'Libregaku yalnızca kendi işaretlerini ve son birkaç dakikada oluşturduğu, henüz çalışılmamış bir kartı siler.'
        : change === 'suspend'
          ? 'Libregaku yalnızca kendi işaretlerini askıya alır.'
          : 'Libregaku yalnızca kendi işaretlerinin etiketlerini değiştirir.'),

    // Libregaku'nun Anki'de oluşturduğu not türleri
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Anki'deki “${noteType}” not türünüzde ${fields.join(', ')} ${fields.length === 1 ? 'alanı' : 'alanları'} eksik; ` +
      `bu yüzden ${loses === 'cards' ? 'kartlar' : 'notlar'} ${fields.length === 1 ? 'bu alanı' : 'bu alanları'} kaybeder. ` +
      'Libregaku, düzenlemiş olabileceğiniz bir not türünü değiştirmez: ' +
      `Anki'de Araçlar → Not Türlerini Yönet bölümünde “${noteType}” not türünün adını değiştirin (ya da alanları geri ` +
      'ekleyin), ardından “Tekrar kontrol et” düğmesine basın; yenisi yüklenir.',

    // İşaretler ve bekleyen kartlar
    marksNotAdded: (count: number): string =>
      `Anki, işaretlerden ${count} tanesini eklemedi. Kuyrukta kalıyorlar ve bir dahaki sefere yeniden denenecek.`,
    marksNotStored: (cause: string): string => `Tarayıcı depolaması, Anki'den okunan işaretleri reddetti: ${cause}`,
    storageUnreadable: (cause: string): string => `Tarayıcı depolaması okunamadı: ${cause}`,
  },

  errors: {
    // Bir sekmenin sesini kaydetme
    captureNotAllowed: 'Önce Libregaku ayarlarında bu sitede cümle sesine izin verin.',
    captureRefused: 'Chrome bu sekmeyi yakalamadı',

    // Yüklenmeyen bir altyazı
    unknownTrack: (id: string): string => `bilinmeyen altyazı: ${id}`,
    trackNotSent: 'oynatıcı henüz yüklemedi; oynatıcının altyazı menüsünden bir kez seçin',
    noCaptionFormat: (attempts: readonly string[]): string => `hiçbir altyazı biçimi çalışmadı — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `hiçbir altyazı URL'si çalışmadı — ${attempts.join('; ') || 'listelenen yok'}`,
    emptyAnswer: 'boş',
    noCues: '0 satır',
    noCuesParsed: 'ayrıştırınca 0 satır',
    noAnswerWithin: (seconds: number): string => `${seconds} sn içinde yanıt yok`,

    // Bir altyazının adı
    forcedTrack: (track: string): string => `${track} (zorunlu)`,

    // Sözlük ve çözümleyici
    noAnswer: 'uzantıdan yanıt yok — yeniden başlatmak için sayfayı yeniden yükleyin',
    analyserLoading: 'çözümleyici hâlâ yükleniyor',
    dictionaryLoading: 'sözlük hâlâ yükleniyor',
    lookupFailed: 'arama başarısız oldu',
  },

  grammar: {
    // Zaman ve kibarlık
    past: 'geçmiş',
    polite: 'kibar',

    // Olumsuzluk
    negative: 'olumsuz',
    'negative intent': 'olumsuz niyet',
    without: '-madan',

    // Koşul
    conditional: 'koşul',
    whenever: '-ınca',

    // Kim yapıyor, yapılabilir mi
    passive: 'edilgen',
    'passive or potential': 'edilgen veya yeterlilik',
    potential: 'yeterlilik',
    causative: 'ettirgen',

    // İstek
    'want to': 'istemek',
    'seems to want to': 'istiyor gibi',
    'want someone to': 'başkasından istemek',

    // Görünüş ve olasılık
    seems: 'gibi görünmek',
    'seems like': 'gibi',
    hearsay: 'duyum',
    apparently: 'anlaşılan',
    probably: 'muhtemelen',
    might: 'belki',

    // Olması gereken
    'ought to': '-malı',
    'supposed to': 'beklenti',
    'intends to': 'niyet',

    // Zorunluluk ve izin
    must: 'zorunluluk',
    'must not': 'yasak',
    "don't have to": 'gerekmez',
    may: 'izin',

    // Emir ve rica
    imperative: 'emir',
    volitional: 'istek kipi',
    'polite command': 'kibar emir',
    please: 'rica',

    // Sonrakine bağlama
    'te-form': 'te formu',
    listing: 'sıralama',
    while: '-ken',
    because: 'sebep',
    'even though': 'rağmen',
    'in order to': 'için',
    'so that': 'diye',

    // te formundan sonra yardımcı fiiller
    ongoing: 'süreklilik',
    'resulting state': 'sonuç durumu',
    'completely, or regrettably': 'tamamen ya da pişmanlıkla',
    'in advance': 'önceden',
    'try doing': 'deneme',
    'going forward': 'ileriye doğru',
    'coming to be': 'giderek',
    'receive the favour': 'iyilik alma',
    'someone does for me': 'benim için yapılan',
    'do for someone': 'başkası için yapma',

    // Fiil kökünden sonra yardımcı fiiller
    'too much': 'aşırı',
    'easy to': 'kolay',
    'hard to': 'zor',
    'start to': 'başlama',
    'keep on': 'sürdürme',
    finish: 'bitirme',
    again: 'yeniden',
    'each other': 'karşılıklı',
    completely: 'sonuna kadar',
    thoroughly: 'derinlemesine',
    around: 'etrafta',
    'non-stop': 'durmadan',

    // İspanyolca bir kelimenin biçimleri
    or: 'veya',
    'first-person': 'birinci şahıs',
    'second-person': 'ikinci şahıs',
    'third-person': 'üçüncü şahıs',
    singular: 'tekil',
    plural: 'çoğul',
    masculine: 'eril',
    feminine: 'dişil',
    present: 'şimdiki zaman',
    preterite: 'basit geçmiş',
    imperfect: 'süreğen geçmiş',
    'imperfect-se': 'süreğen geçmiş (-se)',
    future: 'gelecek zaman',
    'conditional-mood': 'koşul kipi',
    indicative: 'bildirme kipi',
    subjunctive: 'dilek kipi',
    infinitive: 'mastar',
    gerund: 'ulaç',
    participle: 'ortaç',
    formal: 'resmî',
    informal: 'samimi',
    'with-tú': 'tú ile',
    'with-vos': 'vos ile',
    'vos-form': 'vos biçimi',
    voseo: 'voseo',
    'second-person-semantically': '“siz” anlamında',
    accusative: 'doğrudan nesneli',
    dative: 'dolaylı nesneli',
    'object-first-person': 'birinci şahıs nesne',
    'object-second-person': 'ikinci şahıs nesne',
    'object-third-person': 'üçüncü şahıs nesne',
    'object-singular': 'tekil nesne',
    'object-plural': 'çoğul nesne',
    diminutive: 'küçültme',
    augmentative: 'büyütme',
    superlative: 'üstünlük',
    alternative: 'farklı biçim',
    'alt-of': 'farklı yazım',

    // Korece ekler
    honorific: 'saygı',
    'future or guess': 'gelecek veya tahmin',
    'formal polite': 'resmî kibar',
    question: 'soru',
    but: 'ama',
    "let's": '-elim',
    plain: 'düz anlatım',
    'shall we, or I wonder': '-elim mi ya da acaba',
    'I will': 'söz verme',
    'just noticed': 'yeni fark etme',
    'as you know': 'bildiğin gibi',
    and: 've',
    'because, or and then': 'çünkü ya da ardından',
    'but, or given that': 'ama ya da madem',
    'even if': '-se bile',
    whether: 'olup olmadığı',
    'adverb form': 'zarf biçimi',
    quoting: 'dolaylı anlatım',
    'used to': 'eskiden',
    topic: 'konu',
    subject: 'özne',
    object: 'nesne',
    possessive: 'iyelik',
    'come to': 'hâle gelme',
    when: '-dığında',
    modifier: 'sıfat-fiil',
    'noun form': 'isim-fiil',
    becomes: '-laşma',
    'have done before': 'daha önce yapmış',
    nominative: 'yalın',
    genitive: 'tamlayan',
    'accusative-case': 'belirtme',
    'dative-case': 'yönelme',
    neuter: 'nötr',
    definite: 'belirli',
    indefinite: 'belirsiz',
    comparative: 'karşılaştırma',
    strong: 'güçlü',
    weak: 'zayıf',
    mixed: 'karışık',
    'without-article': 'artikelsiz',
    reflexive: 'dönüşlü',
  },
  helpChat: {
    heading: 'Soru sor',
    placeholder: 'Bir ayarı ya da bir şeyin nasıl yapıldığını sorun',
    label: 'Sorunuz',
    send: 'Sor',
    thinking: 'Düşünüyor…',
    note: 'Bu yardıma dayanarak, cihazınızda Gemini Nano yanıtladı. Yanlış olabilir.',
    noMatch: 'Yardım bunu söylemiyor. Yukarıdaki aramayı deneyin.',
    failed: 'Gemini Nano yanıtlayamadı. Yeniden deneyin.',
    installHeading: 'Yardıma soru sorun',
    install: 'Gemini Nano, Chrome içinde, bilgisayarınızda çalışan küçük bir yapay zekâ modelidir. Bir kez indirin, burada soru sorabilirsiniz. Yazdığınız hiçbir şey cihazınızdan çıkmaz.',
    download: 'Gemini Nano’yu indir',
    downloading: (percent: number): string => `İndiriliyor… %${percent}`,
    update: 'Chrome’da, burada soruları yanıtlayabilen küçük bir yapay zekâ modeli, Gemini Nano, yerleşik olarak bulunur. Kullanmak için Chrome’u güncelleyin.',
    unavailable: 'Chrome’da, burada soruları yanıtlayabilen küçük bir yapay zekâ modeli, Gemini Nano, bulunur ama bu bilgisayarda hazır değil. Boş disk alanı gerekir ve chrome://flags adresinden açılması gerekebilir.',
    learnMore: 'Gemini Nano hakkında',
  },
};
