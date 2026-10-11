import type { HelpTranslation } from './content';

/** The help in Turkish. A chapter or topic left out shows in English. */
export const tr: HelpTranslation = {
  title: 'Yardım',
  intro: "Libregaku'nun nasıl çalıştığı ve sık sorulan soruların yanıtları. Arayın ya da bir bölüm seçin.",
  search: 'Ara…',
  searchLabel: 'Yardımda ara',
  none: 'Burada “{q}” geçmiyor.',
  settings: 'Ayarlar',
  contents: 'Bölümler',
  tipLabel: 'İpucu:',
  then: 'ardından',
  link: 'Bu konunun bağlantısı',
  popular: { label: 'Popüler:' },
  chapters: [
    {
      id: 'start',
      title: 'Başlarken',
      about: 'Üç seçim, ardından bir video.',
      topics: [
        {
          id: 'get-started',
          title: 'Kurulum',
          body: [
            [
              '{Ayarlar → Diller} bölümünde öğrendiğiniz dili ve kendi dilinizi seçin.',
              "{Ayarlar → Anki} bölümünde Anki'yi bağlamak için adımları izleyin, ardından yeni kartların gideceği desteyi seçin.",
              'Öğrendiğiniz dilde altyazısı olan bir YouTube veya Netflix videosu açın ve imleci bir kelimenin üzerinde tutun.',
            ],
            { tip: 'Anki isteğe bağlıdır. Altyazılar, aramalar ve transkript onsuz da çalışır; hangi kelimeleri bildiğinizi hatırlayan odur.' },
          ],
          keywords: ['kurulum', 'yükleme', 'kurma', 'başlangıç', 'ilk kez', 'dil seçimi', 'setup', 'install'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'İzlerken',
      about: 'Kelime arama, transkript ve tuşlar.',
      topics: [
        {
          id: 'look-up',
          title: 'Bir kelimeyi arama',
          body: [
            'İmleci altyazıdaki veya transkriptteki bir kelimenin üzerinde tutun, penceresi açılır: okunuş, ilk üç anlam ve geri kalanlar için “+N anlam daha”.',
            'Kanjiler ve videodan örnekler pencerede birer satırdır. Açmak için birine tıklayın; bir sonraki sefer de açık kalır.',
            'Bir ifadeyi aramak için birkaç kelimenin üzerinden sürükleyin. Seçimi temizlemek için ona yeniden tıklayın ya da `Esc` tuşuna basın.',
            { tip: 'Kelimeler varsayılan olarak üzerine gelince aranır. {Ayarlar → Kelime arama → Arama yöntemi} bunu `Shift` basılıyken üzerine gelmeye ya da tıklamaya çevirir.' },
          ],
          keywords: ['sözlük', 'tanım', 'anlam', 'çeviri', 'fare', 'tıklama', 'ifade', 'kanji', 'hover', 'shift'],
        },
        {
          id: 'transcript',
          title: 'Transkript panelini kullanma',
          body: [
            '`S` paneli gösterir veya gizler. Oradan oynatmak için bir satıra tıklayın; arama kutusu herhangi bir satırı bulur.',
            "Filtre düğmesi yalnızca yeni kelime içeren satırları, tam olarak bir yeni kelimesi olanları ya da kaydettiklerinizi bırakır. Bir satırdaki yer işareti veya `B` satırı kaydeder; kaydedilen satırlar Anki'ye birlikte gider ya da dosya olarak dışa aktarılır.",
          ],
          keywords: ['kenar çubuğu', 'panel', 'arama', 'filtre', 'kaydet', 'yer işareti', 'dışa aktar', 'sidebar', 'transcript'],
        },
        {
          id: 'colours',
          title: 'Alt çizgi renklerini değiştirme',
          body: [
            'Her alt çizgi rengi, bir kelimeyi ne kadar iyi bildiğinizi gösterir: yeni, öğreniliyor, takip edilen veya bilinen. {Ayarlar → Alt çizgiler} bölümünde her biri için bir renk seçici vardır; “Sıfırla” varsayılanları geri getirir.',
            { tip: '{Ayarlar → Alt çizgiler → Bilinen kelimelerin altını çiz} açık değilse bilinen kelimelerin altı çizilmez.' },
          ],
          keywords: ['renk', 'renkler', 'alt çizgi', 'görünüm', 'tema', 'palet', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Klavye kısayolları',
          body: [
            {
              head: ['Tuş', 'İşlevi'],
              rows: [
                ['`←` `→`', 'Önceki veya sonraki satır'],
                ['`↓`', 'Satırı tekrar oynat'],
                ['`↑`', 'Çeviriyi göster veya gizle'],
                ['`A`', "Penceredeki kelimeyi Anki'ye ekle"],
                ['`K`', 'Penceredeki kelimeyi bilinen olarak işaretle'],
                ['`B`', 'Geçerli satırı kaydet'],
                ['`S`', 'Transkript panelini göster veya gizle'],
                ['`H`', 'Altyazıları bulanıklaştır veya netleştir'],
                ['`R`', 'Furiganayı değiştir: kapalı, yeni kelimeler, tümü (Japonca)'],
                ['`Shift`', 'İmlecin altındaki kelimeyi aramak için basılı tutun; {Ayarlar → Kelime arama → Arama yöntemi} “Shift basılıyken üzerine gelme” olarak ayarlıysa'],
                ['`Esc`', 'Pencereyi kapat'],
              ],
            },
            'Transkript panelindeki klavye düğmesi, izlerken bunları listeler.',
          ],
          keywords: ['kısayol', 'kısayollar', 'klavye', 'tuşlar', 'shortcut', 'hotkey', 'keyboard'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Kart oluşturma',
      about: "Bir kelimeyi ya da bütün bir satırı Anki'ye.",
      topics: [
        {
          id: 'add-card',
          title: 'Kart ekleme',
          body: [
            "Bir kelimenin penceresinin altındaki “Anki'ye ekle” düğmesine ya da `A` tuşuna basın. Kartta kelime, okunuşu ve anlamı, cümle ve çevirisi, kelimenin ses kaydı, satırın kendi sesi ve satırdan bir kare bulunur.",
            { tip: 'Yanlışlıkla mı oluşturdunuz? Geri almak için birkaç dakika içinde “Eklendi” düğmesine tıklayın.' },
            "Anki'de zaten olan bir kelimede “Anki'de” yazar; kelimeyi Anki'de görmek için ona tıklayın. Anki kapalıysa yeni kart tarayıcıda bekler ve Anki bir dahaki sefere yanıt verdiğinde eklenir.",
          ],
          keywords: ['bilgi kartı', 'flashcard', 'anki', 'ekle', 'ekleme', 'geri al', 'sil', 'kaldır'],
        },
        {
          id: 'add-line',
          title: 'Bütün bir cümleden kart oluşturma',
          body: [
            'Bir kelimenin penceresinde, + işaretli konuşma balonu bunun yerine bütün cümleden, sesi ve bir ekran görüntüsüyle birlikte bir kart oluşturur. Transkriptteki her satırda, üzerine geldiğinizde aynı düğme bulunur.',
          ],
          keywords: ['cümle', 'satır', 'cümle kartı', 'bütün satır', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Cümle sesi',
          body: [
            'Altyazıdan veya transkriptten bir kelime, bir ifade ya da bütün cümle için kart eklediğinizde Libregaku o satırı videodan kaydeder ve kaydı karta koyar. Tekrar ederken cümleyi söylendiği gibi duyarsınız.',
            'Chrome yalnızca video oynarken kayıt yapabilir; bu yüzden satır bir kez daha oynatılır, ardından video kaldığınız yere döner.',
            { tip: 'Bir satırı kaydetmek ses kaydı yapmaz; Kaydedilenler veya Kelimeler listelerinden kart eklemek de yapmaz. {Ayarlar → Anki kartları → Cümle sesi} ses kaydını kapatır.' },
          ],
          keywords: ['ses', 'ses kaydı', 'kayıt', 'tekrar oynatma', 'dinleme', 'telaffuz', 'audio'],
        },
        {
          id: 'decks',
          title: 'Desteyi seçme',
          body: [
            'Yeni kartlar, {Ayarlar → Anki → Yeni kart destesi} ayarındaki desteye gider.',
            "İzlerken değiştirmek için {Ayarlar → Kelime penceresi → Deste menüsü} ayarını açın. “Anki'ye ekle” düğmesinin yanında bir ▾ belirir; menüden bir desteye eklemek kartı oraya ekler ve sonraki kartları da oraya gönderir.",
            { tip: 'Kelime durumu, {Ayarlar → Anki → Bilinen kelimelerin kaynağı} ayarındaki destelerden okunur. Yeni kartlar okunmayan bir desteye gidiyorsa Ayarlar bunu belirtir.' },
          ],
          keywords: ['deste', 'desteler', 'altdeste', 'yeni deste', 'deck', 'subdeck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Kelimeleri işaretleme',
      about: '“Bilinen”, “Takip et” ve “Yok say” — hiçbiri kart oluşturmaz.',
      topics: [
        {
          id: 'marks',
          title: '“Bilinen”, “Takip et” ve “Yok say”',
          body: [
            'Kelimenin penceresinde, kelimenin yanındaki küçük düğmeler.',
            [
              '“Bilinen” (`K`): kelimeyi biliyorsunuz — altı çizilmez ve bilinen sayılır.',
              '“Takip et”: mor bir alt çizgi; böylece kelime geçtiğinde onu fark edersiniz. {Ayarlar → Kelime penceresi → “Takip et” düğmesi} ayarından açın.',
              '“Yok say”: adlar ve sesler için — altı hiç çizilmez, hiç sayılmaz.',
            ],
            'Bir işareti kaldırmak için ona yeniden tıklayın ya da kelimeyi transkript panelinin Kelimeler sekmesinde bulun.',
          ],
          keywords: ['işaret', 'işaretleme', 'bilinen', 'takip', 'yok say', 'alt çizgi', 'mor', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'İşaretli kelimelerinizi görme ve değiştirme',
          body: [
            'Transkript panelindeki Kelimeler sekmesi, takip ettiğiniz, bilinen olarak işaretlediğiniz ve yok saydığınız kelimeleri ayrı listelerde gösterir. Her kelimenin işaretini kaldıran bir düğmesi vardır — yok sayılan bir kelime için “Yok saymayı bırak” — ve takip edilen bir kelime oradan karta dönüştürülebilir.',
            "Her listenin bir arama kutusu ve listeyi Anki'nin ve elektronik tabloların açabildiği bir dosya olarak veren “Kopyala” ile “Dışa aktar” düğmeleri vardır.",
          ],
          keywords: ['takip listesi', 'liste', 'yok sayılanlar', 'bilinenler', 'işareti kaldır', 'kelimeler', 'excel', 'watchlist'],
        },
      ],
    },
    {
      id: 'netflix',
      title: 'Netflix',
      about: 'Korumasının neleri değiştirdiği.',
      topics: [
        {
          id: 'netflix-audio',
          title: "Netflix'te cümle sesi",
          body: [
            [
              "{Ayarlar → Anki kartları → Netflix'te cümle sesi} ayarını açın ve “İzin ver” düğmesine basın.",
              'Netflix sekmesinde, araç çubuğundaki Libregaku simgesine tıklayın ve “Cümle sesini burada kaydet” düğmesine basın. Bunu her sekme için bir kez yapın.',
            ],
            "Netflix videosunu şifrelediği için Libregaku, YouTube'da yaptığı gibi sesi videodan kaydedemez. Bunun yerine sekmeyi kaydeder; Chrome buna yalnızca bu şekilde izin verir. Aynı nedenle Netflix kartlarında ekran görüntüsü olmaz.",
          ],
          keywords: ['netflix', 'ses', 'izin', 'şifreleme', 'sekme yakalama', 'tab capture', 'drm'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Güncel kalma',
      topics: [
        {
          id: 'update',
          title: 'Yeni sürümü yükleme',
          body: [
            [
              'Tarayıcınızın uzantılar sayfasını açın.',
              "Libregaku'daki yeniden yükleme okuna basın.",
              'Video sekmesini yeniden yükleyin — yeniden yüklemeden önce açılmış bir sekme eski sürümde kalır.',
            ],
            { tip: 'Ayarlar sayfasının en altında, kullandığınız kopyanın ne zaman derlendiği yazar.' },
          ],
          keywords: ['yeniden yükle', 'yenile', 'güncelle', 'güncelleme', 'eski sürüm', 'sürüm', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Sorular',
      topics: [
        {
          id: 'q-track',
          title: '“Takip et” ne işe yarar?',
          body: [
            'Bir kelimenin geçtiği her yerde altını çizer — {Ayarlar → Alt çizgiler} bölümünde değiştirmediğiniz sürece mor renkle — böylece kart oluşturmadan onu fark edersiniz. Artık yeni sayılmaz. Takip edilen kelimeler transkript panelinde, Kelimeler sekmesinde listelenir.',
          ],
          keywords: ['takip', 'mor', 'track', 'purple'],
        },
        {
          id: 'q-still-underlined',
          title: 'Bildiğim bir kelimenin altı neden hâlâ çizili?',
          body: [
            'Durum, {Ayarlar → Anki → Bilinen kelimelerin kaynağı} ayarındaki destelerde bulunan Anki kartlarınızdan gelir. Kartı henüz olgunlaşmamış bir kelimenin altı “öğreniliyor” olarak, orada kartı olmayan bir kelimeninki “yeni” olarak çizilir. Kartı olmadan bildiğiniz bir kelimeyi “Bilinen” olarak işaretleyebilirsiniz.',
          ],
          keywords: ['durum', 'olgun', 'alt çizgi', 'bilinen', 'scope'],
        },
        {
          id: 'q-marks-deck',
          title: "Anki'de neden Libregaku::Marks destesi var?",
          body: [
            "“Bilinen”, “Takip et” ve “Yok say” orada gizli notlar olarak saklanır; tekrara hiç gelmemeleri için askıya alınmışlardır ve Anki'nin senkronizasyonuyla diğer cihazlarınıza ulaşırlar. {Ayarlar → Anki → İşaretleri Anki'de aç} bunları gösterir.",
            { tip: "İşaretleri yalnızca bu tarayıcıda tutmak için {Ayarlar → Anki → İşaretleri Anki'de sakla} ayarını kapatın." },
          ],
          keywords: ['işaretler', 'deste', 'askıya alınmış', 'senkronizasyon', 'eşitleme', 'gizli not', 'sync', 'marks'],
        },
        {
          id: 'q-remove',
          title: 'Bir kartı kaldırabilir miyim?',
          body: [
            "Ekledikten hemen sonra geri almak için “Eklendi” düğmesine tıklayın. Daha eski bir kart için kelimenin penceresindeki “Anki'de” düğmesine tıklayın ve kartı Anki'de silin. Libregaku, çalıştığınız bir kartı asla silmez.",
          ],
          keywords: ['sil', 'silme', 'kaldır', 'geri al', 'delete', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'AnkiWeb ile çalışır mı?',
          body: [
            "Doğrudan değil: Libregaku, bilgisayarınızdaki Anki ile AnkiConnect eklentisi üzerinden konuşur. Anki de kartlarınızı her zamanki gibi AnkiWeb'e ve telefonunuza senkronize eder.",
          ],
          keywords: ['telefon', 'mobil', 'senkronizasyon', 'eklenti', 'ankiweb', 'ankiconnect', 'sync', 'add-on'],
        },
        {
          id: 'q-picture',
          title: 'Karttaki ekran görüntüsü nedir?',
          body: [
            "Kartın arka yüzünde, kelimenin nereden geldiğini görmeniz için sahneden bir kare. YouTube'da videodan alınır; Netflix videosunu uzantılara boş gösterdiği için orada oluşturulan kartlarda bulunmaz. {Ayarlar → Anki kartları → Ekran görüntüsü} bunu kapatır.",
          ],
          keywords: ['görsel', 'resim', 'kare', 'ekran görüntüsü', 'screenshot'],
        },
        {
          id: 'q-replay',
          title: 'Kart eklediğimde satır neden yeniden oynatılıyor?',
          body: [
            'Sesi oynarken kaydedilir; bu yüzden satır bir kez daha oynatılır, ardından oynatma kaldığı yere döner. {Ayarlar → Anki kartları → Cümle sesi} bunu kapatır.',
          ],
          keywords: ['tekrar oynatma', 'ses kaydı', 'cümle sesi', 'geri sarma', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Altyazının altında neden çeviri yok?',
          body: [
            'Çeviri, sitenin {Ayarlar → Diller → Diliniz} ayarındaki dilde kendi altyazılarıdır. Videoda o dilde altyazı yoksa gösterilecek bir şey yoktur ve Libregaku bunu söyler. Makine çevirisi yapmaz.',
          ],
          keywords: ['çeviri', 'ikinci satır', 'çift altyazı', 'türkçe', 'ingilizce', 'dual', 'translation'],
        },
        {
          id: 'q-definitions',
          title: 'Tanımlar neden yalnızca bazı dillerde?',
          body: [
            "Japonca için tanımlar, dokuz dilde tanım içeren JMdict'ten gelir. Diliniz bunlardan biri değilse {Ayarlar → Diller} bölümünde ikinci bir satır, “Tanım dili”, yerine kullanılacak dili seçmenizi sağlar.",
          ],
          keywords: ['tanımlar', 'diller', 'türkçe', 'ingilizce', 'macarca', 'jmdict', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-data',
          title: 'Libregaku verilerimi bir yere gönderir mi?',
          body: [
            "Hesap da sunucu da yoktur. Sözlükler bir kez indirilir ve tarayıcıda saklanır; kartlar doğrudan bilgisayarınızdaki Anki'ye gider. Japonca sözlük hâlâ inerken, aradığınız kelime yanıtlanması için Jotoba'ya gönderilir.",
          ],
          keywords: ['gizlilik', 'veri', 'sunucu', 'hesap', 'izleme', 'güvenlik', 'privacy'],
        },
      ],
    },
  ],
};
