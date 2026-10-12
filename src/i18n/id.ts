import type { Translation } from '.';
import type { OverrideStatus } from '../anki/status';
import type { MissingMedia } from '../content/capture';
import type { Settings } from '../settings';

/** The furigana (or pinyin) setting's three choices, as the bar and the player announce them: the menu's words. */
const RUBY: Record<Settings['ruby'], string> = { never: 'nonaktif', unknown: 'kata baru', always: 'semua' };

/** What a card went in without, joined with "atau": "tanpa audio kalimat". */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted'
      ? 'audio kalimat (klik ikon Libregaku untuk merekam di sini)'
      : 'audio kalimat'))
    .join(' atau ');

const MEDIA = { audio: 'audio', video: 'video', picture: 'gambar' } as const;
const MEDIA_NAME = { audio: 'Audio', video: 'Video', picture: 'Gambar' } as const;

/** The interface in Indonesian. Anything left out shows in English. */
export const id: Translation = {
  common: {
    furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
    pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
    mandarin: 'Tionghoa (Mandarin)',
    jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
    sentenceGap: ' ',
  },

  settings: {
    // Languages
    languagesHeading: 'Bahasa',
    languagesAbout: 'Pilih bahasa yang Anda pelajari dan bahasa Anda sendiri.',
    target: 'Saya belajar',
    targetLimited: (language: string): string => `${language} — terbatas`,
    supportFull: 'Dukungan penuh, termasuk cara baca dan furigana.',
    supportPinyin: 'Dukungan penuh, termasuk pinyin. Definisi dalam bahasa Inggris.',
    supportJyutping: 'Dukungan penuh, termasuk Jyutping. Definisi dalam bahasa Inggris.',
    supportWords: 'Dukungan penuh. Definisi dalam bahasa Inggris.',
    script: 'Aksara',
    scriptHint: 'Yang dipakai saat video punya keduanya.',
    supportBasic: 'Dukungan dasar: kata-kata dipisahkan, tetapi belum ada kamus atau cara baca.',
    native: 'Bahasa Anda',
    nativeHint: 'Terjemahan dan definisi ditampilkan dalam bahasa ini, jika video dan kamus menyediakannya.',
    definitions: 'Definisi dalam',
    definitionsHint: 'Kamus tidak punya definisi dalam bahasa Anda, jadi definisi ditampilkan dalam bahasa ini.',
    definitionsHintFor: (language: string): string =>
      `Kamus tidak punya definisi dalam bahasa ${language}, jadi definisi ditampilkan dalam bahasa ini.`,

    // Looking words up
    lookupHeading: 'Pencarian kata',
    lookupAbout: 'Pilih bagaimana dan kapan arti kata muncul.',
    interaction: 'Mode pencarian',
    interactionHover: 'Arahkan kursor',
    interactionShift: 'Arahkan kursor sambil menahan Shift',
    interactionClick: 'Klik',
    interactionHint: 'Mengklik kata juga selalu bisa.',
    hoverPause: 'Jeda saat mencari',
    hoverPauseHint: 'Menjeda video selama kursor berada di atas kata.',
    sidebarHover: 'Definisi singkat di transkrip',
    sidebarHoverHint: 'Menampilkan definisi singkat saat Anda mengarahkan kursor ke kata di transkrip.',

    // Word popup
    popupHeading: 'Pop-up kata',
    popupAbout: 'Pilih apa yang ditampilkan pop-up saat Anda mencari kata.',
    cardDeckMenu: 'Menu dek',
    cardDeckMenuHint: 'Menambahkan ▾ di samping Tambahkan ke Anki untuk memilih dek lain. Kartu baru lalu masuk ke sana.',
    cardHideAdd: 'Sembunyikan Tambahkan ke Anki',
    cardHideAddHint: 'Menghilangkan tombol Tambahkan ke Anki dan menu dek di sebelahnya dari kartu.',
    cardKanji: 'Rincian kanji',
    cardKanjiHint: 'Menampilkan arti dan cara baca setiap kanji.',
    cardHanzi: 'Rincian karakter',
    cardHanziHint: 'Menampilkan arti dan cara baca setiap karakter.',
    lookupElsewhere: 'Contoh dari video ini',
    lookupElsewhereHint: 'Menampilkan kalimat lain di video ini yang memakai kata tersebut. Klik salah satunya untuk memutarnya.',

    // Subtitles
    subtitlesHeading: 'Subtitel',
    subtitlesAbout: 'Atur tampilan subtitel di video.',
    ruby: 'Furigana',
    rubyUnknown: 'Kata baru',
    rubyAlways: 'Semua',
    rubyNever: 'Nonaktif',
    rubyHint: 'Cara baca di atas kanji. Tekan R untuk beralih saat menonton.',
    pinyin: 'Pinyin',
    pinyinHint: 'Cara baca di atas karakter. Tekan R untuk beralih saat menonton.',
    jyutping: 'Jyutping',
    jyutpingHint: 'Cara baca di atas karakter. Tekan R untuk beralih saat menonton.',
    blurPrimary: 'Buramkan subtitel',
    blurPrimaryHint:
      'Untuk latihan mendengar: subtitel tetap buram sampai Anda mengarahkan kursor ke sana. Tekan H untuk beralih.',
    showSubtitles: 'Subtitle di video',
    showSubtitlesHint: 'Menggambar subtitle di atas video. Jika dimatikan, bilah atas, transkrip, dan panel tetap ada. Tombol di bilah bergantian: terjemahan mati, subtitle mati, lalu keduanya hidup; ↑ melakukan hal yang sama.',
    subtitleSize: 'Ukuran teks',
    subtitleSizeOption: (percent: number): string => `${percent}%`,
    subtitleSizeHint: 'Mengikuti ukuran pemutar, jadi tampak sama dalam layar penuh.',
    subtitleBottom: 'Posisi',
    subtitleBottomLowest: 'Paling rendah',
    subtitleBottomLow: 'Rendah',
    subtitleBottomNormal: 'Normal',
    subtitleBottomRaised: 'Agak tinggi',
    subtitleBottomHigh: 'Tinggi',
    subtitleBottomHighest: 'Paling tinggi',
    subtitleBottomHint: 'Seberapa tinggi posisi subtitel. Ekstensi subtitel lain di pemutar yang sama tetap berada di bawahnya.',
    dualSubtitles: 'Tampilkan terjemahan',
    dualSubtitlesHint:
      'Menampilkan subtitel dalam bahasa Anda di bawah subtitel yang Anda pelajari. Subtitel ini berasal dari situs, ' +
      'bukan terjemahan mesin, dan membutuhkan transkrip lengkap video.',
    singleKeys: 'Pintasan satu tombol',
    singleKeysHint:
      'Tombol huruf seperti A dan R berfungsi tanpa tombol lain saat menonton. Nonaktif: tahan Alt dan Shift bersama tombol itu. ' +
      'Tombol panah tetap berfungsi.',

    // Underlines
    underlinesHeading: 'Garis bawah',
    underlinesAbout: 'Setiap warna menunjukkan seberapa baik Anda mengenal sebuah kata. Klik warna untuk mengubahnya.',
    colorUnknown: 'Kata baru',
    colorUnknownHint: 'Kata tanpa kartu di Anki.',
    colorLearning: 'Sedang dipelajari',
    colorLearningHint: 'Kata dengan kartu yang belum matang.',
    colorTracking: 'Dipantau',
    colorTrackingHint: 'Kata yang Anda pantau.',
    colorKnown: 'Dikenal',
    colorKnownHint: 'Kata dengan kartu matang, atau yang ditandai dikenal.',
    underlines: 'Garis bawahi kata',
    underlinesHint: 'Matikan untuk subtitle polos, tanpa warna di bawah kata.',
    markKnown: 'Garis bawahi kata yang dikenal',
    markKnownHint: 'Nonaktif secara default, jadi layar makin bersih seiring Anda belajar.',
    underlineGrammar: 'Garis bawahi artikel dan kata ganti',
    underlineGrammarHint: 'Nonaktif secara bawaan: kata seperti “the”, “saya”, dan “dia” tetap bisa dicari, tetapi tidak dihitung sebagai kata yang dipelajari.',
    defaultColours: 'Warna default',
    resetColours: 'Setel ulang',

    // Transcript
    transcriptHeading: 'Transkrip',
    transcriptAbout: 'Panel di samping video yang mencantumkan setiap baris subtitel.',
    sidebarFollow: 'Gulir mengikuti video',
    sidebarFollowHint: 'Menjaga baris saat ini tetap terlihat. Menggulir sendiri menjeda fitur ini; sebuah tombol melanjutkannya.',
    headerBar: 'Tampilkan bilah atas',
    headerBarHint: 'Muncul di bagian atas video saat kursor Anda mendekat.',
    languageBadge: 'Lencana bahasa',
    languageBadgeFlag: 'Bendera',
    languageBadgeCode: 'Kode',
    badgeFlag: 'Bendera lencana',
    badgeFlagDefault: 'Default',
    flagSearch: 'Telusuri…',
    flagSearchLabel: 'Telusuri negara',
    flagSuggested: 'Disarankan',
    flagAll: 'Semua negara',
    flagNone: (query: string): string => `Tidak ada negara yang cocok dengan “${query}”.`,
    badgeFlagHint: 'Bendera yang ditampilkan untuk bahasa yang Anda pelajari. Setiap bahasa menyimpan benderanya sendiri.',
    languageBadgeHint: 'Cara bilah atas menampilkan bahasa yang Anda pelajari.',
    sidebarStats: 'Hitung kata baru',
    sidebarStatsHint:
      'Menampilkan jumlah kata baru di setiap baris, persentase kata yang Anda kenal, dan filter yang memakainya.',

    // Anki
    ankiHeading: 'Anki',
    ankiAbout: 'Hubungkan Anki, pilih tujuan kartu baru, dan dek mana yang dihitung sebagai kata yang Anda kenal.',
    deck: 'Kartu baru masuk ke',
    deckHint: 'Dek tempat setiap kartu baru ditambahkan.',
    statusScope: 'Baca kata dikenal dari',
    statusScopeHint: 'Kartu di dek ini menentukan kata mana yang digarisbawahi. Termasuk subdek.',
    marksInAnki: 'Simpan tanda di Anki',
    marksInAnkiHint:
      'Menyimpan Dikenal, Pantau, dan Abaikan sebagai catatan tersembunyi di Anki (Libregaku::Marks) agar tersinkron ke ' +
      'perangkat Anda yang lain. Nonaktif: tanda tetap di browser ini.',

    // The deck menus
    wholeCollection: 'Seluruh koleksi',
    chooseDeck: 'Pilih dek…',
    deckNotInAnki: (deck: string): string => `${deck} — tidak ada di Anki`,
    deckAndSubdecks: (deck: string): string => `${deck} (dan subdek)`,
    deckUnset: 'Pilih dek. Kartu tidak bisa ditambahkan sebelum Anda memilihnya.',
    deckMissing: (deck: string): string => `Anki tidak lagi punya dek bernama “${deck}”. Pilih dek lain.`,
    statusScopeMissing: (deck: string): string =>
      `Anki tidak lagi punya dek bernama “${deck}”, jadi semua kata tampil sebagai kata baru. Pilih dek lain.`,
    statusScopeOutside: (deck: string): string =>
      `Kartu baru masuk ke “${deck}”, yang tidak termasuk di sini, jadi kata yang Anda tambahkan akan tetap ` +
      'digarisbawahi sebagai kata baru. Pilih dek yang memuatnya, atau Seluruh koleksi.',

    // Where Anki stands
    ankiChecking: 'Memeriksa…',
    ankiConnected: 'Terhubung.',
    noteTypeInstalled: 'Jenis catatan terpasang.',
    cardsMade: (n: number): string => `${n} kartu dibuat dengan Libregaku.`,
    noCards: 'Belum ada kartu.',
    cardsFlushed: (n: number): string => `${n} kartu yang dibuat saat Anki tertutup telah ditambahkan.`,
    cardsNotFlushed: (n: number, error: string): string => `${n} kartu tidak bisa ditambahkan: ${error}`,
    cardsWaiting: (n: number): string => `${n} kartu menunggu untuk masuk.`,
    ankiOffline: (port: number): string =>
      `Anki tidak merespons di port ${port}. Itu wajar saat Anki tertutup: ` +
      'kartu baru menunggu di sini dan ditambahkan saat Anki dibuka.',
    ankiBlocked: 'Anki sedang berjalan, tetapi AnkiConnect belum mengizinkan ekstensi ini.',
    ankiOccupied: (detail: string): string => `${detail} Tutup program yang memakai port itu agar Anki bisa menggunakannya.`,

    // The Anki buttons
    checkAgain: 'Periksa lagi',
    newDeck: 'Dek baru',
    openCards: 'Buka kartu di Anki',
    openMarks: 'Buka tanda di Anki',
    newDeckPrompt: 'Beri nama dek baru. Gunakan :: untuk subdek, misalnya Jepang::Netflix',

    // Connecting Anki
    installStep: 'Instal Anki di komputer ini, lalu buka. {link}',
    getAnki: 'Dapatkan Anki',
    addonStep: 'Di Anki, buka {menu}, tempel kode ini, lalu mulai ulang Anki.',
    addonMenu: 'Alat → Add-on → Dapatkan add-on…',
    aboutAnkiConnect: 'Tentang AnkiConnect',
    originStep: 'Di Anki, buka {menu}, tambahkan baris ini ke {setting}, lalu mulai ulang Anki.',
    originMenu: 'Alat → Add-on → AnkiConnect → Konfigurasi',
    runningStep: 'Biarkan Anki tetap terbuka saat Anda menonton. Kartu langsung masuk ke Anki di komputer ini.',
    copy: 'Salin',
    copyValue: (value: string): string => `Salin ${value}`,
    copied: 'Disalin',
    copyFailed: 'Pilih teksnya',

    // Anki cards
    ankiCardsHeading: 'Kartu Anki',
    ankiCardsAbout: 'Pilih apa yang ditambahkan ke setiap kartu baru, selain kata, cara baca, arti, dan kalimat.',
    cardAudio: 'Audio kata',
    cardAudioHint: 'Rekaman kata, jika ada. Tidak pernah memakai suara sintetis.',
    cardSentenceAudio: 'Audio kalimat',
    cardSentenceAudioHint: 'Merekam kalimat dengan memutarnya sekali lagi. Di situs terproteksi, fitur ini memerlukan izin di bawah.',
    cardScreenshot: 'Screenshot',
    cardScreenshotHint: 'Cuplikan adegan. Tidak tersedia di situs terproteksi, yang memblokirnya.',
    capture: 'Audio kalimat di situs terproteksi',
    captureAllow: 'Izinkan',
    captureAllowInSettings: 'Izinkan di setelan',
    captureRemove: 'Hapus',
    captureAllowed: 'Diizinkan. Di setiap tab situs terproteksi, klik ikon Libregaku lalu pilih Rekam audio kalimat di sini.',
    captureNeeded: 'Situs terproteksi mengenkripsi videonya, jadi audio kalimat direkam dari tab. Ini memerlukan izin Anda.',

    // Data and licences
    creditsHeading: 'Data dan lisensi',
    creditJmdict:
      'Data kamus dan kanji © Electronic Dictionary Research and Development Group, digunakan dengan lisensi ' +
      'CC BY-SA 4.0. Dikemas ulang sebagai JSON oleh jmdict-simplified.',
    creditLindera:
      'Memisahkan bahasa Jepang, Korea, dan Tionghoa menjadi kata. Lisensi MIT; IPADIC, mecab-ko-dic, dan CC-CEDICT ' +
      'punya ketentuan sendiri.',
    creditCedict: 'Kamus bahasa Tionghoa © MDBG dan para kontributornya, digunakan dengan lisensi CC BY-SA 4.0.',
    creditWiktionary:
      'Kamus bahasa Korea dan Spanyol, serta beberapa dalam bahasa Anda sendiri, dari Wiktionary melalui kaikki.org dan ' +
      'wiktionary-to-yomitan. CC BY-SA 4.0.',
    creditKrdict:
      'Kata bahasa Korea dijelaskan dalam bahasa Anda sendiri. © National Institute of Korean Language, digunakan dengan ' +
      'lisensi CC BY-SA 2.0 KR. File dibuat oleh Lyroxide.',
    creditCfdict:
      'Bahasa Tionghoa dijelaskan dalam bahasa Prancis. CFDICT © chine.in, terus diperbarui oleh CxDICT. CC BY-SA 4.0.',
    creditCanto:
      'Kamus bahasa Kanton dan cara baca Jyutping untuk CC-CEDICT. © Pleco Inc., digunakan dengan lisensi CC BY-SA 3.0.',
    creditHandedict:
      'Bahasa Tionghoa dijelaskan dalam bahasa Jerman. © HanDeDict dan para kontributornya, digunakan dengan lisensi ' +
      'CC BY-SA 3.0.',
    creditUnihan: 'Cara baca karakter Tionghoa yang ditampilkan pertama. © Unicode, Inc., digunakan dengan Unicode License.',
    creditJotoba: 'Dipakai untuk pencarian selama kamus diunduh. Keduanya memakai JMdict.',
    creditLucide: 'Ikon. Lisensi ISC.',
    creditCommons: 'Rekaman kata bahasa Spanyol, Tionghoa, dan Korea yang diucapkan para sukarelawan. Setiap rekaman punya lisensinya sendiri, kebanyakan CC BY-SA 4.0, yang ditampilkan bersama nama penuturnya saat diputar dan di kartu.',
    creditAudioCmn: 'Rekaman kata bahasa Tionghoa oleh Yue Tan, Universitas Caen. CC BY-SA 3.0 US.',
    creditNaver: 'Rekaman kata Korea dari Naver Dictionary, hanya diputar di kartu pencarian. Lisensinya tidak mengizinkan pemakaian ulang, jadi tidak pernah dipasang di kartu.',
    creditSpanishdict: 'Suara buatan untuk kata Spanyol dari SpanishDict, diputar lewat tombol pelafalan saat tidak ada rekaman. Lisensinya tidak mengizinkan pemakaian ulang, jadi tidak pernah dipasang di kartu.',
    licence: 'Libregaku berlisensi MIT. Data kamus diunduh dari sumbernya, tidak disertakan.',
    built: (when: string): string => `Salinan ini dibuat pada ${when}.`,

    // The keyboard shortcuts view
    keyLine: 'Baris sebelumnya atau berikutnya',
    keyReplay: 'Putar ulang baris',
    keyTranslation: 'Tampilkan atau sembunyikan terjemahan',
    keyShiftLookup: 'Tahan untuk mencari kata di bawah kursor',
    keyAdd: 'Tambahkan kata di pop-up ke Anki',
    keyKnown: 'Tandai kata di pop-up sebagai dikenal',
    keyFurigana: 'Ganti furigana: nonaktif, kata baru, semua',
    keyPinyin: 'Ganti pinyin: nonaktif, kata baru, semua',
    keyJyutping: 'Ganti Jyutping: nonaktif, kata baru, semua',
    keyBlur: 'Buramkan atau perjelas subtitel',
    keySave: 'Simpan baris saat ini',
    keyTranscript: 'Tampilkan atau sembunyikan panel transkrip',
    keyClose: 'Tutup pop-up',
  },

  options: {
    pageTitle: 'Setelan Libregaku',
    help: 'Bantuan',
    searchSettings: 'Telusuri…',
    noSettingsFound: 'Tidak ada yang menyebut “{q}”.',
    contentsLabel: 'Bagian setelan',
    settingsLabel: 'Setelan',
    setupHeading: 'Memulai',
    setupAbout: 'Dua pilihan, dan semua yang lain sudah punya default yang masuk akal.',
    stepLanguages: 'Pilih bahasa yang Anda pelajari',
    stepAnki: 'Hubungkan Anki dan pilih dek untuk kartu baru',
    ankiOptional:
      'Anki bersifat opsional — subtitel, pencarian kata, dan furigana tetap berfungsi tanpanya. ' +
      'Anki-lah yang mengingat kata mana yang sudah Anda kenal.',
    nextSteps:
      'Lalu buka video dengan subtitel dalam bahasa yang Anda pelajari, dan arahkan kursor ke sebuah kata. ' +
      'Ikon keyboard di panel transkrip menampilkan daftar pintasan keyboard.',
    stepDone: 'Selesai',
    confirmLanguages: 'Bahasa ini sudah benar',
    keepDeck: (deck: string): string => `Gunakan ${deck} untuk kartu baru`,
  },

  action: {
    help: 'Bantuan',
    settings: 'Setelan',
    settingsTip: 'Semua setelan',
    checkingPage: 'Memeriksa halaman ini…',
    notActive:
      'Tidak aktif di halaman ini. Buka video di YouTube, Netflix, atau situs lain yang didukung. Jika Anda baru saja menginstal atau memuat ulang ' +
      'Libregaku, muat ulang tab.',
    unsupported: 'Libregaku berfungsi di YouTube, Netflix, Disney+, Prime Video, dan Max.',
    waitingForSubtitles: (site: string): string => `Menunggu subtitel di ${site}. Pastikan subtitel aktif.`,
    activeOn: (title: string): string => `Aktif — ${title}`,
    active: 'Aktif di video ini.',
    subtitlesTrack: 'Subtitel',
    translationTrack: 'Terjemahan',
    noTranslation: 'Tidak ada',
    generatedTrack: (track: string): string => `${track} (otomatis)`,
    captureNeedsPermission: 'Merekam audio kalimat di sini memerlukan izin untuk merekam suara tab ini.',
    captureAllowInSettings: 'Izinkan di setelan',
    captureReady: 'Suara dari situs terproteksi hanya bisa direkam setelah Anda mengaktifkan perekaman untuk tab ini.',
    captureStart: 'Rekam audio kalimat di sini',
    captureFailed: 'Chrome tidak bisa merekam tab ini.',
    toggleSidebar: 'Alihkan bilah samping',
    ankiChecking: 'Anki: memeriksa…',
    ankiConnected: (n: number): string => `Anki terhubung · ${n} kartu dari Libregaku`,
    ankiOffline: 'Anki tidak berjalan — kata tampil sebagai baru',
    ankiOccupied: (port: number): string => `Program lain memakai port ${port}, jadi Anki tidak bisa dijangkau`,
    ankiBlocked: 'Anki menolak ekstensi ini — baris yang perlu ditambahkan ada di Setelan',
    ankiBusy: 'Anki tidak menjawab — mungkin sedang sinkronisasi',
    ankiRefused: 'Anki menolak permintaan',
    cardsToAdd: (n: number): string => `${n} kartu lagi akan ditambahkan`,
    cardsWaiting: (n: number): string => `${n} kartu menunggu Anki`,
  },

  sidebar: {
    panelLabel: 'Panel transkrip',
    resizeLabel: 'Ubah ukuran panel',

    // The tabs, and the icon buttons beside them
    tabsLabel: 'Daftar',
    transcriptTab: 'Transkrip',
    savedTab: 'Tersimpan',
    settings: 'Setelan',
    shortcuts: 'Pintasan keyboard',
    close: 'Tutup',
    closeLabel: 'Tutup panel',
    openTip: 'Transkrip',
    openLabel: 'Tampilkan transkrip',
    help: 'Bantuan',

    // Searching the transcript
    searchPlaceholder: 'Telusuri transkrip…',
    searchLabel: 'Telusuri transkrip',
    noMatches: 'Tidak ada yang cocok',
    matchAt: (at: number, total: number): string => `${at} dari ${total}`,
    matchesFound: (n: number): string => `${n} ditemukan`,

    // The filter button and its menu
    filterTip: 'Filter',
    filterLabel: 'Filter baris',
    filterAll: 'Semua baris',
    filterAllAbout: 'Setiap baris',
    filterNew: 'Ada kata baru',
    filterNewAbout: 'Baris yang memuat kata yang belum punya kartu',
    filterReady: 'Siap dipelajari',
    filterReadyAbout: 'Baris yang hanya punya satu kata baru bagi Anda — paling mudah untuk dipelajari',
    filterSaved: 'Tersimpan',
    filterSavedAbout: 'Baris yang Anda simpan untuk nanti',

    // The transcript
    partial: 'Terisi sambil Anda menonton — pemutar ini hanya memberikan baris saat ini.',
    partialEmpty: 'Belum ada apa-apa. Baris muncul di sini saat diucapkan.',
    empty: 'Tidak ada transkrip yang dimuat.',
    currentLine: 'Baris saat ini',
    lineNew: (n: number): string => `${n} baru`,
    playFrom: (time: string): string => `Putar dari ${time}`,
    saveLine: 'Simpan baris',
    unsave: 'Batal simpan',
    addSentence: 'Tambahkan kalimat',
    addSentenceLabel: 'Tambahkan kalimat ke Anki',

    // The summary over the transcript
    knownPercent: (n: number): string => `${n}%`,
    summaryKnown: '{n} dikenal',
    summaryNew: '{n} baru',
    summaryReady: '{n} siap dipelajari',
    counting: (percent: number): string => `Menghitung kata baru… ${percent}%`,
    countFailed: 'Beberapa baris tidak bisa dihitung, jadi tidak ada total.',

    // The card that shows a word's meaning while the pointer is over it
    dictionaryLoading: (percent: number): string => `Memuat kamus — ${percent}%`,
    dictionaryUnavailable: 'Kamus tidak tersedia',
    noEntry: 'Tidak ada di kamus.',

    // The Saved tab
    savedEmpty:
      'Belum ada yang disimpan. Gunakan penanda di baris transkrip mana pun — atau tekan B — untuk menyimpan kalimat ' +
      'yang ingin Anda buka lagi.',
    thisVideo: 'video ini',
    openAt: (time: string): string => `Buka video di ${time}`,
    remove: 'Hapus',
    removeLabel: 'Hapus dari Tersimpan',
    copySavedAbout: 'Salin semua baris tersimpan sebagai teks yang dipisahkan tab',
    exportSavedAbout: 'Simpan file yang dipisahkan tab dan bisa diimpor Anki',
    addSavedAbout: 'Buat kartu dari setiap baris tersimpan',
    linesCopied: (n: number): string => `${n} baris disalin.`,
    chooseDeck: 'Pilih dek di Setelan terlebih dahulu — ke sanalah kartu baru masuk.',
    checkingAnki: 'Memeriksa Anki…',
    ankiOffline: 'Anki tidak berjalan. Buka Anki lalu coba lagi — langkah-langkahnya ada di Setelan.',
    ankiBlocked: 'AnkiConnect belum mengizinkan ekstensi ini. Baris yang perlu ditambahkan ada di Setelan.',
    ankiUnreachable: 'Anki tidak bisa dijangkau. Setelan menjelaskan alasannya.',
    adding: (at: number, total: number): string => `Menambahkan ${at} dari ${total}…`,
    savedAdded: (added: number, deck: string, already: number): string =>
      `${added} kartu ditambahkan ke ${deck}${already ? `, ${already} sudah ada` : ''}.`,

    // Buttons and messages the Saved and Words tabs share
    copy: 'Salin',
    exportFile: 'Ekspor file',
    addToAnki: 'Tambahkan ke Anki',
    noClipboard: 'Tidak dapat mengakses papan klip.',
    downloaded: 'Disimpan ke folder unduhan. Di Anki: File → Impor.',
    downloadBlocked: 'Halaman ini memblokir unduhan — gunakan Salin.',

    // The Words tab
    listsLabel: 'Daftar yang mana',
    listLines: 'Baris',
    listTracked: 'Dipantau',
    listKnown: 'Dikenal',
    listIgnored: 'Diabaikan',
    findPlaceholder: 'Telusuri…',
    findLabel: 'Telusuri daftar ini',
    copyWordsAbout: 'Salin daftar ini sebagai teks yang dipisahkan tab',
    exportWordsAbout: 'Simpan daftar ini sebagai file yang dipisahkan tab dan bisa diimpor Anki',
    wordsCopied: (n: number): string => `${n} kata disalin.`,
    nothingToExport: 'Tidak ada yang bisa diekspor dari daftar ini.',
    lookingUp: 'Mencari cara baca dan arti…',
    noWordMatches: (query: string): string => `Tidak ada kata di daftar ini yang cocok dengan “${query}”.`,
    noLineMatches: (query: string): string => `Tidak ada baris tersimpan yang cocok dengan “${query}”.`,
    wordsMatching: (shown: number, total: number): string => `${shown} dari ${total} kata.`,
    trackedEmpty:
      'Belum ada yang dipantau. Pantau memberi garis bawah pada kata agar Anda memperhatikannya, tanpa membuat kartu. ' +
      'Aktifkan tombolnya di Setelan, di bagian Pop-up kata.',
    trackedIntro: (n: number): string => `${n} kata yang Anda pantau, digarisbawahi di mana pun muncul.`,
    stopTracking: 'Berhenti memantau',
    knownEmpty:
      'Belum ada kata yang ditandai dikenal. Jika Anda sudah tahu sebuah kata dan tidak ingin membuat kartu, ' +
      'tandai dikenal dari pop-up, atau tekan K.',
    knownIntro: (n: number): string =>
      `${n} kata ditandai dikenal. Hapus tanda sebuah kata, dan statusnya kembali mengikuti kartu Anki Anda.`,
    unmarkKnown: 'Hapus tanda dikenal',
    ignoredEmpty:
      'Tidak ada kata yang diabaikan. Abaikan nama dan bunyi dari pop-up, dan kata itu tidak akan pernah digarisbawahi ' +
      'atau dihitung.',
    ignoredIntro: (n: number): string => `${n} kata tidak pernah digarisbawahi atau dihitung.`,
    stopIgnoring: 'Berhenti mengabaikan',
  },

  popup: {
    // The card, and the word at its head
    cardLabel: (word: string): string => `${word} — kamus`,
    commonBadge: 'umum',
    nameBadge: 'kemungkinan nama',
    characterNames: { kanji: 'Kanji', hanzi: 'Karakter' },
    partOfSpeech: {
      n: 'kata benda', 'n-adv': 'kata benda adverbial', 'n-t': 'kata benda waktu', 'n-suf': 'sufiks kata benda',
      'n-pref': 'prefiks kata benda', pn: 'kata ganti', 'adj-i': 'kata sifat -i', 'adj-na': 'kata sifat -na',
      'adj-no': 'kata sifat -no', 'adj-pn': 'pranomina', adv: 'kata keterangan', 'adv-to': 'kata keterangan',
      aux: 'kata bantu', 'aux-v': 'kata kerja bantu', 'aux-adj': 'kata sifat bantu',
      conj: 'kata sambung', cop: 'kopula', ctr: 'kata penggolong', exp: 'ungkapan', int: 'kata seru',
      num: 'kata bilangan', prt: 'partikel', pref: 'prefiks', suf: 'sufiks', unc: 'tak terklasifikasi',
      vs: 'kata kerja suru', 'vs-i': 'kata kerja suru', 'vs-s': 'kata kerja suru', vt: 'transitif', vi: 'intransitif',
      v1: 'kata kerja ichidan', 'v1-s': 'kata kerja ichidan', vk: 'kata kerja kuru', vz: 'kata kerja zuru',
      v5b: 'kata kerja godan', v5g: 'kata kerja godan', v5k: 'kata kerja godan', 'v5k-s': 'kata kerja godan',
      v5m: 'kata kerja godan', v5n: 'kata kerja godan', v5r: 'kata kerja godan', 'v5r-i': 'kata kerja godan',
      v5s: 'kata kerja godan', v5t: 'kata kerja godan', v5u: 'kata kerja godan', 'v5u-s': 'kata kerja godan',
      v5aru: 'kata kerja godan',
      // Wiktionary's codes, for Korean and Spanish words: what kind of word, then its grammar
      name: 'nama diri', v: 'kata kerja', adj: 'kata sifat', pron: 'kata ganti', det: 'penentu', artic: 'kata sandang',
      counter: 'kata penggolong', prep: 'kata depan', 'prep-phrase': 'frasa preposisional', ptcl: 'partikel',
      intj: 'kata seru', phrase: 'frasa', prov: 'peribahasa', r: 'akar kata', char: 'karakter', adn: 'adnominal',
      ptcpl: 'partisip', contr: 'kontraksi',
      masc: 'maskulin', fem: 'feminin', neut: 'netral', sg: 'tunggal', pl: 'jamak', 'pl-only': 'hanya jamak',
      count: 'terbilang', uncount: 'tak terbilang', vr: 'refleksif', vdt: 'dwitransitif', impers: 'impersonal',
      irreg: 'tak beraturan', reltnl: 'relasional', reltv: 'relatif', interr: 'interogatif', poss: 'posesif',
      dim: 'diminutif', aug: 'augmentatif', onoma: 'onomatope',
      // And how or when the word is used
      idio: 'idiomatis', fig: 'kiasan', literal: 'harfiah', col: 'percakapan', inf: 'informal', fam: 'akrab',
      formal: 'formal', polite: 'sopan', lit: 'sastra', poet: 'puitis', rhet: 'retoris', sl: 'slang',
      vulg: 'vulgar', derog: 'merendahkan', offens: 'kasar', humor: 'jenaka', euph: 'eufemisme',
      child: 'bahasa anak', net: 'internet', neol: 'neologisme', cmn: 'umum', uncmmn: 'kurang umum', rare: 'jarang',
      dated: 'agak kuno', arch: 'arkais', obs: 'usang', hist: 'historis', 'non-std': 'tidak baku',
      dialect: 'dialek', regio: 'regional',
    },

    // The row of icon buttons under the word
    pronounce: 'Dengarkan',
    playedRecording: (word: string): string => `${word} · rekaman`,
    playedSynthesised: (word: string): string => `${word} · suara sintetis`,
    recordingBy: (speaker: string, licence: string): string => `Rekaman oleh ${speaker} · ${licence}`,
    pronounceFailed: 'audio tidak dapat diputar',
    addSentence: 'Tambahkan kalimat',
    sentenceAdded: 'Kalimat ditambahkan',
    undo: 'Urungkan',
    copyWord: 'Salin kata',
    copyPhrase: 'Salin frasa',
    copySentence: 'Salin kalimat',
    wordCopied: 'kata disalin',
    phraseCopied: 'frasa disalin',
    sentenceCopied: 'kalimat disalin',
    copyFailed: 'tidak bisa menyalin — pilih teksnya saja',

    // The meanings
    dictionaryLoading: (percent: number): string => `Kamus masih dimuat — ${percent}%. Coba lagi sebentar lagi.`,
    dictionaryUnavailable: (error: string): string => `Kamus tidak tersedia: ${error}`,
    noEntry: 'Kata ini tidak ada di kamus.',
    moreMeanings: (n: number): string => `+${n} arti lainnya`,

    // The word's other lines in this video
    elsewhereCount: (n: number): string => (n === 1 ? 'Sekali lagi di video ini' : `${n} kali lagi di video ini`),
    playLine: 'Putar',
    elsewhereMore: (n: number): string => `dan ${n} lagi — penelusuran transkrip menemukan semuanya`,
    showAllInTranscript: 'Tampilkan semua di transkrip',

    // Add
    addToAnki: 'Tambahkan ke Anki',
    addToDeck: (deck: string): string => `Tambahkan ke ${deck}`,
    adding: 'Menambahkan…',
    undoing: 'Mengurungkan…',
    added: 'Ditambahkan',
    addedUndo: 'Ditambahkan — urungkan',
    inAnki: 'Ada di Anki',
    showInAnki: 'Tampilkan di Anki',
    waiting: 'Menunggu',
    waitingForAnki: 'Menunggu Anki',
    goesInWhenAnkiOpens: 'Kartu masuk ke Anki saat Anki dibuka',
    alreadyAdded: 'Sudah ditambahkan',
    alreadyInAnki: 'Sudah ada di Anki',
    waitingForAnkiToOpen: 'Menunggu Anki dibuka',
    addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

    // The deck menu
    otherDecks: 'Dek lain',
    addToAnotherDeck: 'Tambahkan ke dek lain',
    decksUnknown: 'Anki tidak menjawab, jadi daftar deknya belum diketahui.',
    newDeck: 'Dek baru…',
    newDeckPrompt: 'Dek baru — gunakan :: untuk subdek, seperti Jepang::Netflix',

    // The marks
    knownButton: 'Dikenal',
    trackButton: 'Pantau',
    ignoreButton: 'Abaikan',
    markKnownTip: 'Tandai dikenal',
    trackTip: 'Pantau',
    ignoreTip: 'Abaikan',
    unmarkKnownTip: 'Hapus tanda dikenal',
    stopTrackingTip: 'Berhenti memantau',
    stopIgnoringTip: 'Berhenti mengabaikan',
  },

  header: {
    knownStat: '{percent} dikenal',
    knownPercent: (percent: number): string => `${percent}%`,
    knownTip: 'Kata yang Anda kenal',
    readyStat: '{count} siap dipelajari',
    readyTip: 'Baris dengan satu kata baru',
    blurSubtitle: 'Buramkan subtitel',
    unblurSubtitle: 'Perjelas subtitel',
    showTranslation: 'Tampilkan terjemahan',
    hideTranslation: 'Sembunyikan terjemahan',
    hideSubtitles: 'Sembunyikan subtitle',
    showSubtitles: 'Tampilkan subtitle',
    subtitles: 'Subtitle',
    translation: 'Terjemahan',
    transcript: 'Transkrip',
    pinHeader: 'Sematkan bilah atas',
    unpinHeader: 'Lepas sematan bilah atas',
    settings: 'Setelan',
    showHeader: 'Tampilkan bilah atas',
  },

  player: {
    // The player's keys
    lastLine: 'Itu baris terakhir',
    noLineBefore: 'Tidak ada baris sebelumnya',
    translationOn: 'Terjemahan aktif',
    translationOff: 'Terjemahan nonaktif',
    subtitlesOff: 'Subtitle mati',
    subtitlesOn: 'Subtitle hidup',
    blurOn: 'Subtitel buram sampai Anda mengarahkan kursor',
    blurOff: 'Subtitel ditampilkan',
    lineSaved: 'Baris disimpan',
    lineUnsaved: 'Baris tidak lagi disimpan',
    lookUpFirst: 'Cari kata terlebih dahulu',
    alreadyKnown: (word: string): string => `${word} · sudah dikenal di Anki`,
    alreadyInAnki: (word: string): string => `${word} · sudah ada di Anki`,
    adding: (word: string): string => `Menambahkan ${word}…`,
    wordResult: (word: string, said: string): string => `${word} · ${said}`,

    // Marks
    markOff: (word: string): string => `${word} · tanda dihapus`,
    marked: (word: string, status: OverrideStatus, refused: boolean): string => {
      const done = { known: 'ditandai dikenal', tracking: 'dipantau', ignored: 'diabaikan', unknown: 'ditandai baru' }[status];
      if (refused) return `${word} · ${done}, tanpa kartu — Anki menolaknya; akan dicoba lagi nanti`;
      return `${word} · ${done}, tanpa kartu${status === 'tracking' ? '. Lihat tab Tersimpan di panel' : ''}`;
    },

    // A word's card
    pickDeck: 'Pilih dek di setelan Libregaku terlebih dahulu',
    added: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `ditambahkan ke ${deck} — tanpa ${without(missing)}` : `ditambahkan ke ${deck}`,
    alreadyIn: (deck: string): string => `sudah ada di ${deck}`,
    queued: (deck: string): string => `Anki tertutup — kartu ini masuk ke ${deck} saat Anki dibuka`,
    alreadyQueued: 'sudah menunggu Anki',
    notKept: 'Anki tertutup, dan browser tidak mau menyimpan kartu untuk nanti',
    takenBack: (deck: string): string => `dikeluarkan lagi dari ${deck}`,
    unqueued: 'tidak lagi menunggu Anki',
    alreadySent: 'Kartu sudah masuk ke Anki',
    queueSent: (count: number): string =>
      `Anki terbuka — ${count === 1 ? 'kartu yang menunggu' : `${count} kartu yang menunggu`} telah ditambahkan`,
    deckOutsideScope: (scope: string, deck: string): string =>
      `kata yang Anda kenal dibaca dari ${scope}, jadi kartu di ${deck} tidak akan dihitung`,

    // A sentence card
    sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
      missing.length ? `kalimat ditambahkan ke ${deck} — tanpa ${without(missing)}` : `kalimat ditambahkan ke ${deck}`,
    sentenceAlreadyIn: (deck: string): string => `kalimat ini sudah ada di ${deck}`,
    sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
      const lacking = [sound && 'suara', picture && 'gambar'].filter(Boolean);
      return `Anki tertutup — kalimat ini masuk ke ${deck} saat Anki dibuka` +
        `${lacking.length ? `, tanpa ${lacking.join(' dan ')}` : ''}`;
    },
    sentenceAlreadyQueued: 'kalimat ini sudah menunggu Anki',
    sentenceTakenBack: (deck: string): string => `kalimat dikeluarkan lagi dari ${deck}`,

    // Making a card's sentence audio
    recording: 'Merekam baris…',

    // Lookups
    noDictionary: 'belum ada kamus untuk bahasa ini.',
  },

  notices: {
    // The card itself
    unexpected: 'Libregaku mengalami masalah tak terduga.',
    dismiss: 'Tutup',

    // YouTube or Netflix changed something the extension reads
    youtubeTrackList: 'Tidak dapat membaca daftar subtitel YouTube.',
    youtubeTrackShape: 'Data subtitel YouTube tidak dalam bentuk yang diharapkan.',
    youtubeCaptionText: 'Tidak dapat menemukan teks subtitel YouTube di halaman.',
    youtubePlayerTrackList: 'Tidak dapat membaca daftar subtitel video ini dari pemutar YouTube.',
    netflixTrackList: 'Tidak dapat membaca daftar subtitel Netflix.',
    netflixCaptionText: 'Tidak dapat menemukan teks subtitel Netflix di halaman.',
    disneyTrackList: 'Tidak dapat membaca daftar subtitel Disney+.',
    disneyCaptionText: 'Tidak dapat menemukan teks subtitel Disney+ di halaman.',
    primeTrackList: 'Tidak dapat membaca daftar subtitel Prime Video.',
    primeCaptionText: 'Tidak dapat menemukan teks subtitel Prime Video di halaman.',
    maxTrackList: 'Tidak dapat membaca daftar subtitel Max.',
    maxCaptionText: 'Tidak dapat menemukan teks subtitel Max di halaman.',
    netflixBlocked: 'Netflix memblokir bagian Libregaku yang membaca subtitel.',

    // This video's subtitles
    subtitlesOff: 'Aktifkan subtitel di pemutar, dan Libregaku akan membacanya.',
    trackNotSent: 'Pemutar belum memuat subtitel ini.',
    noTargetTrack: 'Tidak ada subtitel di sini dalam bahasa yang Anda pelajari.',
    noSecondTrack: 'Tidak ada subtitel di sini dalam bahasa Anda, jadi tidak ada baris kedua.',
    onlyOneTrack: 'Video ini hanya punya satu trek subtitel, jadi tidak ada baris kedua.',
    autoGenerated: 'Subtitel ini dibuat otomatis, jadi teks dan pemisahan katanya akan kurang akurat.',
    noSubtitles: 'Video ini tidak punya subtitel.',
    secondTrackFailed: 'Baris kedua tidak dapat dimuat.',

    // The extension's own parts
    analyserUnavailable:
      'Cara baca dan bentuk kamus nonaktif: penganalisis bahasa tidak termuat. ' +
      'Kata dicocokkan dengan kartu Anda hanya berdasarkan ejaan yang persis sama.',
    markNotSaved: 'Tanda itu tidak dapat disimpan. Tanda berlaku sampai Anda memuat ulang, lalu hilang.',
    marksNotSynced: 'Tanda Anda tidak dapat disimpan ke Anki. Tanda tetap ada di browser ini dan akan dicoba lagi.',
    cardsNotAdded:
      'Anki tidak menerima sebagian kartu yang disimpan saat Anki tertutup. Kartu itu masih disimpan dan akan dicoba lagi.',

    // Details
    playerNeverLoaded: 'Pemutar tidak pernah selesai dimuat.',
    subtitlesMaybeOff: 'Mungkin subtitel hanya dinonaktifkan di pemutar.',
    lookedFor: (selector: string): string => `Mencari ${selector}`,
    noTargetTrackDetail: (languages: readonly string[]): string =>
      `Subtitel video ini: ${languages.join(', ') || 'tidak ada'}. ` +
      'Ubah bahasa yang Anda pelajari di setelan, atau pilih video lain.',
    onlyPictures: 'Video ini hanya menyediakannya sebagai gambar, bukan teks, jadi Libregaku tidak bisa membacanya.',
    chooseInPlayer: (track: string): string => `Pilih ${track} di menu subtitel pemutar, dan Libregaku akan membacanya.`,
    noHumanTrack: 'Tidak ada trek yang ditulis manusia untuk video ini.',
    secondTrackError: (track: string, error: string): string => `${track}: ${error}`,
    noSecondTrackDetail: (languages: readonly string[]): string => `Subtitel video ini: ${languages.join(', ')}.`,
    analyserDidNotLoad: 'penganalisis tidak termuat',
  },

  anki: {
    // Reaching AnkiConnect
    offline: (port: number): string => `Tidak ada yang mendengarkan di port ${port}.`,
    timeout: (port: number, seconds: number): string =>
      `Tidak ada jawaban di port ${port} dalam ${seconds} dtk. ` +
      'Anki mungkin sedang sibuk (sinkronisasi, atau menampilkan dialog), atau program lain sedang memakai port itu.',
    blocked: (origin: string): string =>
      `AnkiConnect menolak ${origin}. Di Anki: Alat → Add-on → AnkiConnect → Konfigurasi, ` +
      'lalu tambahkan baris itu ke webCorsOriginList.',
    httpAnswer: (port: number, status: number): string =>
      `Sesuatu di port ${port} menjawab dengan HTTP ${status}. AnkiConnect tidak menjawab seperti itu.`,
    notAnkiConnect: (port: number): string => `Sesuatu selain AnkiConnect sedang memakai port ${port}.`,
    noBackground: 'Proses latar belakang ekstensi tidak merespons.',
    unreachable: 'Anki tidak bisa dijangkau.',
    callFailed: 'Panggilan AnkiConnect gagal.',

    // Libregaku refusing to send Anki something it does not use
    notRelayed: (action: string): string => `Libregaku tidak mengirim “${action}” ke AnkiConnect.`,
    mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
      `Libregaku hanya melampirkan ${MEDIA[media]} yang diambilnya sendiri.`,
    mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `${MEDIA_NAME[media]} untuk catatan ini tidak berisi data.`,
    mediaName: (prefix: string): string => `Libregaku menamai file yang ditambahkannya ${prefix}…, dan file ini tidak.`,
    idsNeeded: (action: string, ids: 'notes' | 'cards'): string =>
      `${action} memerlukan daftar ${ids === 'notes' ? 'catatan' : 'kartu'}.`,
    notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
      `Ditolak: ${count} ${ids === 'notes' ? 'catatan' : 'kartu'} yang dikirim bukan bagian dari tanda Libregaku. ` +
      `Libregaku hanya ${change === 'delete' ? 'menghapus' : change === 'suspend' ? 'menangguhkan' : 'mengubah tag'} ` +
      'tandanya sendiri' +
      (change === 'delete' ? ', serta kartu yang dibuatnya beberapa menit terakhir dan belum dipelajari.' : '.'),

    // The note types Libregaku makes in Anki
    noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
      `Jenis catatan “${noteType}” di Anki Anda tidak memiliki bidang ${fields.join(', ')}, ` +
      `jadi ${loses === 'cards' ? 'kartu' : 'catatan'} akan kehilangan ` +
      `${fields.length === 1 ? 'bidang itu' : 'bidang-bidang itu'}. ` +
      'Libregaku tidak akan mengubah jenis catatan yang mungkin sudah Anda edit: ' +
      `di Anki, buka Alat → Kelola Jenis Catatan, ganti nama “${noteType}” (atau tambahkan kembali bidangnya), ` +
      'lalu klik Periksa lagi dan jenis catatan baru akan dipasang.',

    // Marks and waiting cards
    marksNotAdded: (count: number): string =>
      `Anki tidak menambahkan ${count} tanda. Tanda itu tetap dalam antrean dan akan dicoba lagi lain kali.`,
    marksNotStored: (cause: string): string => `Penyimpanan browser menolak tanda yang dibaca dari Anki: ${cause}`,
    storageUnreadable: (cause: string): string => `Penyimpanan browser tidak dapat dibaca: ${cause}`,
  },

  errors: {
    // Recording a tab's sound for sentence audio
    captureNotAllowed: 'Izinkan audio kalimat di situs ini di setelan Libregaku terlebih dahulu.',
    captureRefused: 'Chrome tidak mau merekam tab ini',

    // A subtitle track that would not load
    unknownTrack: (id: string): string => `trek tidak dikenal ${id}`,
    trackNotSent: 'belum dimuat oleh pemutar — pilih sekali di menu subtitel pemutar',
    noCaptionFormat: (attempts: readonly string[]): string =>
      `tidak ada format subtitel yang berhasil — ${attempts.join(', ')}`,
    noSubtitleUrl: (attempts: readonly string[]): string =>
      `tidak ada URL subtitel yang berhasil — ${attempts.join('; ') || 'tidak ada yang tercantum'}`,
    emptyAnswer: 'kosong',
    noCues: '0 baris',
    noCuesParsed: 'terbaca 0 baris',
    noAnswerWithin: (seconds: number): string => `tidak ada jawaban dalam ${seconds} dtk`,

    // A track's name
    forcedTrack: (track: string): string => `${track} (paksa)`,

    // The dictionary and the analyser
    noAnswer: 'ekstensi tidak menjawab — muat ulang halaman untuk memulainya lagi',
    analyserLoading: 'penganalisis masih dimuat',
    dictionaryLoading: 'kamus masih dimuat',
    lookupFailed: 'pencarian gagal',
  },

  grammar: {
    // Tense and politeness
    past: 'lampau',
    polite: 'sopan',

    // Not doing it
    negative: 'negatif',
    'negative intent': 'tidak akan',
    without: 'tanpa',

    // If and when
    conditional: 'kondisional',
    whenever: 'setiap kali',

    // Who does it, and whether it can be done
    passive: 'pasif',
    'passive or potential': 'pasif atau potensial',
    potential: 'potensial',
    causative: 'kausatif',

    // Wanting
    'want to': 'ingin',
    'seems to want to': 'tampak ingin',
    'want someone to': 'ingin orang lain melakukan',

    // How the speaker knows it, and how sure they are
    seems: 'tampaknya',
    'seems like': 'sepertinya',
    hearsay: 'katanya',
    apparently: 'rupanya',
    probably: 'kemungkinan besar',
    might: 'mungkin',

    // What should happen, or is meant to
    'ought to': 'sebaiknya',
    'supposed to': 'seharusnya',
    'intends to': 'berniat',

    // Having to, and being allowed to
    must: 'harus',
    'must not': 'tidak boleh',
    "don't have to": 'tidak perlu',
    may: 'boleh',

    // Commands, requests and "let's"
    imperative: 'perintah',
    volitional: 'ajakan',
    'polite command': 'perintah sopan',
    please: 'permintaan',

    // Joining to what comes next
    'te-form': 'bentuk -te',
    listing: 'bentuk -tari',
    while: 'sambil',
    because: 'karena',
    'even though': 'padahal',
    'in order to': 'untuk',
    'so that': 'agar',

    // Helper verbs after the te-form
    ongoing: 'sedang',
    'resulting state': 'keadaan hasil',
    'completely, or regrettably': 'tuntas, atau terlanjur',
    'in advance': 'lebih dulu',
    'try doing': 'mencoba',
    'going forward': 'berlanjut',
    'coming to be': 'mulai menjadi',
    'receive the favour': 'menerima kebaikan',
    'someone does for me': 'dilakukan untuk saya',
    'do for someone': 'melakukan untuk orang lain',

    // Helper verbs after the verb's stem
    'too much': 'terlalu',
    'easy to': 'mudah',
    'hard to': 'sulit',
    'start to': 'mulai',
    'keep on': 'terus',
    finish: 'selesai',
    again: 'ulang',
    'each other': 'saling',
    completely: 'sampai habis',
    thoroughly: 'mendalam',
    around: 'ke sana kemari',
    'non-stop': 'tanpa henti',

    // Forms of a Spanish word
    or: 'atau',
    'first-person': 'orang pertama',
    'second-person': 'orang kedua',
    'third-person': 'orang ketiga',
    singular: 'tunggal',
    plural: 'jamak',
    masculine: 'maskulin',
    feminine: 'feminin',
    present: 'kala kini',
    preterite: 'preterit',
    imperfect: 'imperfek',
    'imperfect-se': 'imperfek (-se)',
    future: 'kala depan',
    'conditional-mood': 'kondisional',
    indicative: 'indikatif',
    subjunctive: 'subjungtif',
    infinitive: 'infinitif',
    gerund: 'gerundium',
    participle: 'partisip',
    formal: 'formal',
    informal: 'informal',
    'with-tú': 'dengan tú',
    'with-vos': 'dengan vos',
    'vos-form': 'bentuk vos',
    voseo: 'voseo',
    'second-person-semantically': 'bermakna “Anda”',
    accusative: 'dengan objek langsung',
    dative: 'dengan objek tak langsung',
    'object-first-person': 'objek orang pertama',
    'object-second-person': 'objek orang kedua',
    'object-third-person': 'objek orang ketiga',
    'object-singular': 'objek tunggal',
    'object-plural': 'objek jamak',
    diminutive: 'diminutif',
    augmentative: 'augmentatif',
    superlative: 'superlatif',
    alternative: 'varian',
    'alt-of': 'ejaan lain',

    // Korean endings
    honorific: 'honorifik',
    'future or guess': 'akan atau dugaan',
    'formal polite': 'sopan formal',
    question: 'pertanyaan',
    but: 'tetapi',
    "let's": 'ajakan',
    plain: 'bentuk biasa',
    'shall we, or I wonder': 'bagaimana kalau, atau kira-kira',
    'I will': 'janji',
    'just noticed': 'baru sadar',
    'as you know': 'seperti kamu tahu',
    and: 'dan',
    'because, or and then': 'karena, atau lalu',
    'but, or given that': 'tetapi, atau mengingat',
    'even if': 'meskipun',
    whether: 'apakah',
    'adverb form': 'bentuk kata keterangan',
    quoting: 'kutipan',
    'used to': 'dulu biasa',
    topic: 'topik',
    subject: 'subjek',
    object: 'objek',
    possessive: 'posesif',
    'come to': 'akhirnya',
    when: 'ketika',
    modifier: 'penjelas kata benda',
    'noun form': 'bentuk kata benda',
    becomes: 'menjadi',
    'have done before': 'pernah',
    nominative: 'nominatif',
    genitive: 'genitif',
    'accusative-case': 'akusatif',
    'dative-case': 'dativ',
    neuter: 'netral',
    definite: 'tentu',
    indefinite: 'tak tentu',
    comparative: 'perbandingan',
    strong: 'kuat',
    weak: 'lemah',
    mixed: 'campuran',
    'without-article': 'tanpa artikel',
    reflexive: 'refleksif',
  },
  helpChat: {
    heading: 'Ajukan pertanyaan',
    placeholder: 'Tanyakan tentang pengaturan atau cara melakukan sesuatu',
    label: 'Pertanyaan Anda',
    send: 'Tanya',
    thinking: 'Berpikir…',
    note: 'Dijawab di perangkat Anda oleh Gemini Nano, berdasarkan bantuan ini. Jawabannya bisa keliru.',
    noMatch: 'Bantuan tidak menyebutkannya. Coba pencarian di atas.',
    failed: 'Gemini Nano tidak dapat menjawab. Coba lagi.',
    installHeading: 'Tanyakan pada bantuan',
    install: 'Gemini Nano adalah model AI kecil yang berjalan di dalam Chrome, di komputer Anda. Unduh sekali dan Anda bisa bertanya di sini. Tidak ada yang Anda ketik yang keluar dari perangkat.',
    download: 'Unduh Gemini Nano',
    downloading: (percent: number): string => `Mengunduh… ${percent}%`,
    update: 'Chrome memiliki model AI kecil bawaan, Gemini Nano, yang dapat menjawab pertanyaan di sini. Perbarui Chrome untuk menggunakannya.',
    unavailable: 'Chrome memiliki model AI kecil, Gemini Nano, yang dapat menjawab pertanyaan di sini, tetapi belum siap di komputer ini. Modelnya memerlukan ruang disk kosong dan mungkin perlu diaktifkan di chrome://flags.',
    learnMore: 'Tentang Gemini Nano',
  },
};
