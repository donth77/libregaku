import type { HelpTranslation } from './content';

/** The help in Indonesian. A chapter or topic left out shows in English. */
export const id: HelpTranslation = {
  title: 'Bantuan',
  intro: 'Cara kerja Libregaku, dan jawaban atas pertanyaan yang sering diajukan. Telusuri, atau pilih bab.',
  search: 'Telusuri…',
  searchLabel: 'Telusuri bantuan',
  none: 'Tidak ada yang menyebut “{q}”.',
  settings: 'Setelan',
  contents: 'Bab',
  tipLabel: 'Tips:',
  then: 'lalu',
  link: 'Tautan ke topik ini',
  popular: { label: 'Populer:' },
  chapters: [
    {
      id: 'start',
      title: 'Memulai',
      about: 'Tiga pilihan, lalu sebuah video.',
      topics: [
        {
          id: 'get-started',
          title: 'Menyiapkan',
          body: [
            [
              'Di {Setelan → Bahasa}, pilih bahasa yang Anda pelajari dan bahasa Anda sendiri.',
              'Di {Setelan → Anki}, ikuti langkah-langkah untuk menghubungkan Anki, lalu pilih dek tujuan kartu baru.',
              'Buka video YouTube atau Netflix dengan subtitel dalam bahasa yang Anda pelajari, lalu arahkan kursor ke sebuah kata.',
            ],
            { tip: 'Anki bersifat opsional. Subtitel, pencarian kata, dan transkrip tetap berfungsi tanpanya; Anki-lah yang mengingat kata mana yang Anda kenal.' },
          ],
          keywords: ['penyiapan', 'pengaturan', 'instal', 'pasang', 'mulai', 'pertama kali', 'setup'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Menonton',
      about: 'Mencari arti kata, transkrip, dan pintasan keyboard.',
      topics: [
        {
          id: 'look-up',
          title: 'Mencari arti kata',
          body: [
            'Arahkan kursor ke kata di subtitel atau transkrip, dan pop-up kata itu terbuka: cara baca, tiga arti pertama, dan “+N arti lainnya” untuk sisanya.',
            'Kanji dan contoh dari video masing-masing menempati satu baris di pop-up. Klik salah satunya untuk membukanya; bagian itu tetap terbuka lain kali.',
            'Seret melintasi beberapa kata untuk mencari frasa. Klik frasa itu lagi, atau tekan `Esc`, untuk menghapus pilihan.',
            { tip: 'Secara default, kata dicari saat kursor diarahkan. {Setelan → Pencarian kata → Mode pencarian} mengubahnya menjadi arahkan kursor sambil menahan `Shift`, atau klik.' },
          ],
          keywords: ['kamus', 'definisi', 'makna', 'terjemahan', 'terjemahkan', 'hover', 'mouse', 'shift', 'kanji'],
        },
        {
          id: 'transcript',
          title: 'Menggunakan panel transkrip',
          body: [
            '`S` menampilkan atau menyembunyikan panel. Klik sebuah baris untuk memutar dari sana; kotak penelusuran menemukan baris mana pun.',
            'Tombol filter hanya menyisakan baris dengan kata baru, baris dengan tepat satu kata baru, atau baris yang Anda simpan. Penanda di setiap baris, atau `B`, menyimpan baris; baris tersimpan bisa dikirim ke Anki sekaligus, atau diekspor sebagai file.',
          ],
          keywords: ['bilah samping', 'sidebar', 'cari', 'filter', 'simpan', 'bookmark', 'ekspor'],
        },
        {
          id: 'colours',
          title: 'Mengubah warna garis bawah',
          body: [
            'Setiap warna garis bawah menunjukkan seberapa baik Anda mengenal sebuah kata: baru, sedang dipelajari, dipantau, atau dikenal. {Setelan → Garis bawah} punya pemilih warna untuk masing-masing, dan Setel ulang mengembalikan warna default.',
            { tip: 'Kata yang dikenal tidak diberi garis bawah, kecuali {Setelan → Garis bawah → Garis bawahi kata yang dikenal} aktif.' },
          ],
          keywords: ['warna', 'palet', 'tema', 'tampilan', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Pintasan keyboard',
          body: [
            {
              head: ['Tombol', 'Fungsi'],
              rows: [
                ['`←` `→`', 'Baris sebelumnya atau berikutnya'],
                ['`↓`', 'Putar ulang baris'],
                ['`↑`', 'Tampilkan atau sembunyikan terjemahan'],
                ['`A`', 'Tambahkan kata di pop-up ke Anki'],
                ['`K`', 'Tandai kata di pop-up sebagai dikenal'],
                ['`B`', 'Simpan baris saat ini'],
                ['`S`', 'Tampilkan atau sembunyikan panel transkrip'],
                ['`H`', 'Buramkan atau perjelas subtitel'],
                ['`R`', 'Ganti furigana atau pinyin: nonaktif, kata baru, semua (Jepang, Tionghoa)'],
                ['`Shift`', 'Tahan untuk mencari kata di bawah kursor, jika {Setelan → Pencarian kata → Mode pencarian} diatur ke “Arahkan kursor sambil menahan Shift”'],
                ['`Esc`', 'Tutup pop-up'],
              ],
            },
            'Ikon keyboard di panel transkrip menampilkan daftar ini saat Anda menonton.',
          ],
          keywords: ['pintasan', 'papan ketik', 'tombol', 'shortcut', 'hotkey'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Membuat kartu',
      about: 'Sebuah kata, atau seluruh baris, ke Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Membuat kartu',
          body: [
            'Klik Tambahkan ke Anki di bagian bawah pop-up kata, atau tekan `A`. Kartu memuat kata, cara baca dan artinya, kalimat dan terjemahannya, rekaman kata, suara baris itu sendiri, dan cuplikan gambarnya.',
            { tip: 'Tidak sengaja membuat kartu? Klik Ditambahkan dalam beberapa menit untuk mengurungkannya.' },
            'Kata yang sudah ada di Anki menampilkan Ada di Anki; klik untuk melihat kata itu di Anki. Jika Anki tertutup, kartu baru menunggu di browser dan masuk saat Anki menjawab lagi.',
          ],
          keywords: ['flashcard', 'kartu', 'tambah', 'urungkan', 'hapus', 'card'],
        },
        {
          id: 'add-line',
          title: 'Membuat kartu dari seluruh kalimat',
          body: [
            'Di pop-up kata, gelembung percakapan dengan tanda + membuat kartu dari seluruh kalimat, lengkap dengan suara dan screenshot. Setiap baris transkrip punya tombol yang sama saat Anda mengarahkan kursor ke sana.',
          ],
          keywords: ['kartu kalimat', 'seluruh baris', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Audio kalimat',
          body: [
            'Saat Anda menambahkan kartu dari subtitel atau transkrip, untuk sebuah kata, frasa, atau seluruh kalimat, Libregaku merekam baris itu dari video dan menaruh rekamannya di kartu. Saat mengulas, Anda mendengar kalimat itu seperti saat diucapkan.',
            'Chrome hanya bisa merekam saat video diputar, jadi baris itu diputar sekali lagi, lalu video kembali ke posisi Anda tadi.',
            { tip: 'Menyimpan baris tidak merekam apa pun, begitu pula menambahkan kartu dari daftar Tersimpan atau Kata. {Setelan → Kartu Anki → Audio kalimat} menonaktifkan perekaman.' },
          ],
          keywords: ['suara', 'rekaman', 'rekam', 'putar ulang', 'dengar', 'audio'],
        },
        {
          id: 'decks',
          title: 'Memilih dek',
          body: [
            'Kartu baru masuk ke dek di {Setelan → Anki → Kartu baru masuk ke}.',
            'Setiap bahasa yang Anda pelajari punya deknya sendiri. Sebelum Anda memilih dek, kartunya masuk ke dek yang dibuat untuk bahasa itu bersama kartu pertamanya: Libregaku-JA untuk bahasa Jepang, Libregaku-ES untuk bahasa Spanyol. Ubah {Setelan → Bahasa → Saya belajar} dan deknya ikut berubah.',
            'Untuk mengganti dek saat menonton, aktifkan {Setelan → Pop-up kata → Menu dek}. Tanda ▾ muncul di samping Tambahkan ke Anki; “Tambahkan ke” sebuah dek menambahkan kartu ke sana dan mengirim kartu berikutnya ke sana juga.',
            { tip: 'Status kata dibaca dari {Setelan → Anki → Baca kata dikenal dari}. Jika kartu baru masuk ke dek yang tidak dibaca, Setelan akan memberi tahu.' },
          ],
          keywords: ['deck', 'subdek', 'dek baru', 'ganti dek'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Menandai kata',
      about: 'Dikenal, Pantau, dan Abaikan — tidak ada yang membuat kartu.',
      topics: [
        {
          id: 'marks',
          title: 'Dikenal, Pantau, dan Abaikan',
          body: [
            'Tombol-tombol kecil di samping kata di pop-up.',
            [
              'Dikenal (`K`): Anda sudah tahu kata itu — tanpa garis bawah, dan dihitung sebagai dikenal.',
              'Pantau: garis bawah ungu, agar Anda memperhatikan kata itu saat muncul. Aktifkan di {Setelan → Pop-up kata → Tombol Pantau}.',
              'Abaikan: nama dan bunyi — tidak pernah digarisbawahi, tidak pernah dihitung.',
            ],
            'Klik tanda sekali lagi untuk menghapusnya, atau temukan kata itu di tab Kata di panel transkrip.',
          ],
          keywords: ['tandai', 'tanda', 'dipantau', 'diabaikan', 'ungu', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Melihat dan mengubah kata yang ditandai',
          body: [
            'Di panel transkrip, tab Kata mencantumkan kata yang Anda pantau, tandai dikenal, atau abaikan, satu daftar untuk masing-masing. Setiap kata punya tombol untuk menghapus tandanya — Berhenti mengabaikan, untuk kata yang diabaikan — dan kata yang dipantau bisa dijadikan kartu dari sana.',
            'Setiap bahasa punya daftarnya sendiri. Tab Kata dan tab Tersimpan menampilkan daftar untuk bahasa yang sedang Anda pelajari, dan kata yang ditandai di satu bahasa tidak ikut ditandai di bahasa lain.',
            'Setiap daftar punya kotak pencarian, serta tombol Salin dan Ekspor file yang memberi Anda daftar itu sebagai file yang bisa dibuka Anki dan aplikasi spreadsheet.',
          ],
          keywords: ['pantau', 'dikenal', 'diabaikan', 'hapus tanda', 'excel', 'watchlist'],
        },
      ],
    },
    {
      id: 'netflix',
      title: 'Netflix',
      about: 'Apa yang berubah karena perlindungannya.',
      topics: [
        {
          id: 'netflix-audio',
          title: 'Audio kalimat di Netflix',
          body: [
            [
              'Buka {Setelan → Kartu Anki → Audio kalimat di Netflix} lalu klik Izinkan.',
              'Di tab Netflix, klik ikon Libregaku di toolbar, lalu klik Rekam audio kalimat di sini. Lakukan ini sekali per tab.',
            ],
            'Netflix mengenkripsi videonya, jadi Libregaku tidak bisa merekam suara dari video seperti di YouTube. Sebagai gantinya, Libregaku merekam tab, yang hanya diizinkan Chrome dengan cara ini. Karena alasan yang sama, kartu dari Netflix tidak punya screenshot.',
          ],
          keywords: ['suara', 'izin', 'enkripsi', 'drm', 'rekam tab', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Pembaruan',
      topics: [
        {
          id: 'update',
          title: 'Memuat versi baru',
          body: [
            [
              'Buka halaman ekstensi di browser Anda.',
              'Klik panah muat ulang pada Libregaku.',
              'Muat ulang tab video — tab yang dibuka sebelum dimuat ulang tetap memakai versi lama.',
            ],
            { tip: 'Bagian bawah Setelan menunjukkan kapan salinan yang Anda jalankan dibuat.' },
          ],
          keywords: ['perbarui', 'pembaruan', 'refresh', 'build', 'brave', 'update', 'reload'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Pertanyaan',
      topics: [
        {
          id: 'q-track',
          title: 'Apa fungsi Pantau?',
          body: [
            'Pantau memberi garis bawah pada kata di mana pun kata itu muncul — berwarna ungu, kecuali Anda mengubahnya di {Setelan → Garis bawah} — agar Anda memperhatikannya, tanpa membuat kartu. Kata itu tidak lagi dihitung sebagai kata baru. Kata yang dipantau tercantum di panel transkrip, di tab Kata.',
          ],
          keywords: ['dipantau', 'ungu', 'track'],
        },
        {
          id: 'q-still-underlined',
          title: 'Mengapa kata yang saya kenal masih bergaris bawah?',
          body: [
            'Status berasal dari kartu Anki Anda, di dek pada {Setelan → Anki → Baca kata dikenal dari}. Kata yang kartunya belum matang digarisbawahi sebagai sedang dipelajari; kata tanpa kartu di dek itu, sebagai kata baru. Kata yang Anda kenal tanpa kartu bisa ditandai Dikenal.',
          ],
          keywords: ['matang', 'garis bawah', 'cakupan', 'scope'],
        },
        {
          id: 'q-marks-deck',
          title: 'Mengapa ada dek Libregaku::Marks di Anki?',
          body: [
            'Dikenal, Pantau, dan Abaikan disimpan di sana sebagai catatan tersembunyi, ditangguhkan agar tidak pernah muncul untuk diulas, sehingga tanda itu sampai ke perangkat Anda yang lain melalui sinkronisasi Anki. {Setelan → Anki → Buka tanda di Anki} menampilkannya.',
            { tip: 'Nonaktifkan {Setelan → Anki → Simpan tanda di Anki} untuk menyimpan tanda hanya di browser ini.' },
          ],
          keywords: ['tanda', 'ditangguhkan', 'sinkron', 'sinkronisasi', 'sync', 'deck'],
        },
        {
          id: 'q-remove',
          title: 'Bisakah saya menghapus kartu?',
          body: [
            'Tepat setelah menambahkan, klik Ditambahkan untuk mengurungkannya. Untuk kartu yang lebih lama, klik Ada di Anki di pop-up kata, lalu hapus kartu itu di Anki. Libregaku tidak pernah menghapus kartu yang sudah Anda pelajari.',
          ],
          keywords: ['hapus', 'buang', 'urungkan', 'delete', 'remove', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Apakah ini berfungsi dengan AnkiWeb?',
          body: [
            'Tidak secara langsung: Libregaku berkomunikasi dengan Anki di komputer Anda melalui add-on AnkiConnect. Lalu Anki menyinkronkan kartu Anda ke AnkiWeb dan ponsel Anda seperti biasa.',
          ],
          keywords: ['ponsel', 'hp', 'android', 'iphone', 'sinkronisasi', 'sync', 'ekstensi'],
        },
        {
          id: 'q-picture',
          title: 'Apa screenshot di kartu itu?',
          body: [
            'Cuplikan gambar adegan, di bagian belakang kartu, agar Anda tahu asal kata itu. Di YouTube, gambar diambil dari video; Netflix mengosongkan videonya untuk ekstensi, jadi kartu yang dibuat di sana tidak punya gambar. {Setelan → Kartu Anki → Screenshot} menonaktifkannya.',
          ],
          keywords: ['gambar', 'foto', 'tangkapan layar', 'cuplikan', 'picture'],
        },
        {
          id: 'q-replay',
          title: 'Mengapa baris diputar lagi saat saya menambahkan kartu?',
          body: [
            'Suaranya direkam saat diputar, jadi baris itu diputar sekali lagi; setelah itu pemutaran kembali ke posisi semula. {Setelan → Kartu Anki → Audio kalimat} menonaktifkannya.',
          ],
          keywords: ['putar ulang', 'rekaman', 'mundur', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Mengapa tidak ada terjemahan di bawah subtitel?',
          body: [
            'Terjemahan adalah subtitel milik situs itu sendiri dalam bahasa di {Setelan → Bahasa → Bahasa Anda}. Jika video tidak punya subtitel dalam bahasa itu, tidak ada yang bisa ditampilkan, dan Libregaku akan memberi tahu. Libregaku tidak memakai terjemahan mesin.',
          ],
          keywords: ['baris kedua', 'subtitel ganda', 'dual', 'bahasa indonesia', 'bahasa inggris'],
        },
        {
          id: 'q-definitions',
          title: 'Mengapa definisi hanya tersedia dalam beberapa bahasa?',
          body: [
            'Untuk bahasa Jepang, definisi berasal dari JMdict, yang punya definisi dalam sembilan bahasa. Jika bahasa Anda tidak termasuk, {Setelan → Bahasa} menampilkan setelan kedua, Definisi dalam, untuk memilih bahasa penggantinya.',
            'Kamus bahasa Tionghoa, Korea, dan Spanyol hanya ditulis dalam bahasa Inggris.',
          ],
          keywords: ['arti', 'bahasa indonesia', 'hungaria', 'slovenia', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-languages',
          title: 'Bahasa apa saja yang bisa saya pelajari?',
          body: [
            'Bahasa Jepang, Tionghoa, Korea, dan Spanyol punya kamus, dan sebuah kata dicocokkan dengan kartunya dalam bentuk apa pun saat diucapkan: 갔어요 menemukan kartu untuk 가다, dan hablábamos kartu untuk hablar. Bahasa Jepang menampilkan furigana di atas kata, dan bahasa Tionghoa menampilkan pinyin.',
            'Bahasa lain di {Setelan → Bahasa → Saya belajar} ditandai terbatas. Kata-katanya dipisahkan, dan belum ada kamus.',
            'Kamus sebuah bahasa diunduh saat pertama kali Anda memilihnya. Unduhannya berukuran 11 hingga 27 MB; di disk, kamus itu memakan 100 MB untuk bahasa Tionghoa, 200 MB untuk bahasa Korea, dan 470 MB untuk bahasa Spanyol.',
          ],
          keywords: ['mandarin', 'cina', 'didukung', 'dukungan', 'ukuran', 'ruang penyimpanan'],
        },
        {
          id: 'q-data',
          title: 'Apakah Libregaku mengirim data saya ke mana pun?',
          body: [
            'Tidak ada akun dan tidak ada server. Kamus diunduh sekali dan disimpan di browser; kartu langsung masuk ke Anki di komputer Anda. Selama kamus bahasa Jepang masih diunduh, kata yang Anda cari dikirim ke Jotoba untuk dijawab.',
          ],
          keywords: ['privasi', 'pelacakan', 'telemetri', 'internet', 'keamanan', 'privacy'],
        },
      ],
    },
  ],
};
