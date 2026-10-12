import type { HelpTranslation } from './content';

/** The help in Vietnamese. A chapter or topic left out shows in English. */
export const vi: HelpTranslation = {
  title: 'Trợ giúp',
  intro: 'Cách Libregaku hoạt động và giải đáp những câu hỏi thường gặp. Hãy tìm kiếm hoặc chọn một chương.',
  search: 'Tìm kiếm…',
  searchLabel: 'Tìm trong trợ giúp',
  none: 'Không có nội dung nào nhắc đến “{q}”.',
  settings: 'Cài đặt',
  contents: 'Mục lục',
  tipLabel: 'Mẹo:',
  then: 'rồi',
  link: 'Liên kết đến mục này',
  popular: { label: 'Phổ biến:' },
  chapters: [
    {
      id: 'start',
      title: 'Bắt đầu',
      about: 'Ba lựa chọn, rồi mở một video.',
      topics: [
        {
          id: 'get-started',
          title: 'Thiết lập',
          body: [
            [
              'Trong {Cài đặt → Ngôn ngữ}, chọn ngôn ngữ bạn đang học và ngôn ngữ của bạn.',
              'Tải Anki tại https://apps.ankiweb.net. Trong {Cài đặt → Anki}, làm theo các bước để kết nối Anki, rồi chọn bộ thẻ để thêm thẻ mới vào.',
              'Trên YouTube, Netflix hoặc một trang web được hỗ trợ khác, hãy mở một video có phụ đề bằng ngôn ngữ bạn đang học, rồi đặt con trỏ lên một từ.',
            ],
            { tip: 'Anki không bắt buộc. Phụ đề, tra từ và bản chép lời đều dùng được khi không có Anki; Anki là nơi ghi nhớ những từ bạn đã biết.' },
          ],
          keywords: ['thiết lập', 'cài đặt', 'bắt đầu', 'lần đầu', 'ngôn ngữ', 'hướng dẫn', 'setup', 'install'],
        },
        {
          id: 'anki',
          title: 'Anki là gì?',
          body: [
            'Anki là ứng dụng thẻ ghi nhớ miễn phí. Ứng dụng cho bạn xem lại từng thẻ đúng lúc bạn sắp quên (lặp lại ngắt quãng).',
            'Libregaku thêm thẻ vào Anki từ những từ và câu bạn chọn. Libregaku cũng đọc các thẻ Anki của bạn để xác định những từ bạn đã biết.',
            'Bạn cần có Anki trên máy tính, cùng tiện ích [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Tải Anki tại https://apps.ankiweb.net.',
          ],
          keywords: ['flashcard', 'tải về', 'cài đặt', 'ôn tập', 'add-on', 'srs', 'spaced repetition', 'download'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Khi xem video',
      about: 'Tra từ, bản chép lời và các phím tắt.',
      topics: [
        {
          id: 'look-up',
          title: 'Tra một từ',
          body: [
            'Đặt con trỏ lên một từ trong phụ đề hoặc bản chép lời, cửa sổ tra từ sẽ mở ra: cách đọc, ba nghĩa đầu tiên và “+N nghĩa khác” cho phần còn lại.',
            'Kanji và các ví dụ trong video, mỗi thứ chiếm một dòng trong cửa sổ tra từ. Nhấp vào một dòng để mở; lần sau dòng đó vẫn mở sẵn.',
            'Kéo chuột qua nhiều từ để tra một cụm từ. Nhấp vào cụm từ đó lần nữa, hoặc nhấn `Esc`, để bỏ chọn.',
            { tip: 'Theo mặc định, từ được tra khi bạn di chuột qua. {Cài đặt → Tra từ → Tra từ khi} cho phép đổi thành di chuột qua khi giữ `Shift`, hoặc nhấp chuột.' },
          ],
          keywords: ['từ điển', 'nghĩa', 'định nghĩa', 'di chuột', 'rê chuột', 'nhấp', 'cụm từ', 'kanji', 'hover', 'shift'],
        },
        {
          id: 'transcript',
          title: 'Dùng bảng chép lời',
          body: [
            '`S` để hiện hoặc ẩn bảng. Nhấp vào một dòng để phát từ chỗ đó; ô tìm kiếm giúp tìm bất kỳ dòng nào.',
            'Nút bộ lọc chỉ giữ lại các dòng có từ mới, các dòng có đúng một từ mới, hoặc các dòng bạn đã lưu. Dấu trang trên mỗi dòng, hoặc `B`, sẽ lưu dòng đó; các dòng đã lưu có thể thêm vào Anki cùng lúc, hoặc xuất ra tệp.',
          ],
          keywords: ['thanh bên', 'bảng', 'tìm kiếm', 'bộ lọc', 'lưu', 'dấu trang', 'xuất', 'transcript', 'sidebar'],
        },
        {
          id: 'colours',
          title: 'Đổi màu gạch dưới',
          body: [
            'Mỗi màu gạch dưới cho biết bạn biết một từ đến đâu: từ mới, đang học, đang theo dõi hoặc đã biết. {Cài đặt → Gạch dưới} có bộ chọn màu cho từng loại, và “Đặt lại” sẽ đưa về màu mặc định.',
            { tip: 'Từ đã biết không có gạch dưới, trừ khi bạn bật {Cài đặt → Gạch dưới → Gạch dưới từ đã biết}.' },
          ],
          keywords: ['màu', 'màu sắc', 'gạch chân', 'bảng màu', 'giao diện', 'color', 'underline'],
        },
        {
          id: 'keys',
          title: 'Phím tắt',
          body: [
            {
              head: ['Phím', 'Chức năng'],
              rows: [
                ['`←` `→`', 'Dòng trước hoặc dòng sau'],
                ['`↓`', 'Phát lại dòng'],
                ['`↑`', 'Hiện hoặc ẩn bản dịch'],
                ['`A`', 'Thêm từ trong cửa sổ tra từ vào Anki'],
                ['`K`', 'Đánh dấu từ trong cửa sổ tra từ là đã biết'],
                ['`B`', 'Lưu dòng hiện tại'],
                ['`S`', 'Hiện hoặc ẩn bảng chép lời'],
                ['`H`', 'Làm mờ hoặc bỏ làm mờ phụ đề'],
                ['`R`', 'Chuyển furigana, pinyin hoặc Jyutping: tắt, từ mới, tất cả (tiếng Nhật, tiếng Trung (Quan thoại), tiếng Quảng Đông)'],
                ['`Shift`', 'Giữ để tra từ dưới con trỏ, khi {Cài đặt → Tra từ → Tra từ khi} được đặt là “Di chuột qua khi giữ Shift”'],
                ['`Esc`', 'Đóng cửa sổ tra từ'],
              ],
            },
            'Nút bàn phím trong bảng chép lời liệt kê các phím này khi bạn đang xem.',
            'Tắt {Cài đặt → Phụ đề → Phím tắt một phím} để chỉ dùng các phím chữ cái khi giữ `Alt` và `Shift`.',
            'Không dùng chuột: nhấn `Tab` để đến một từ trong phụ đề và nhấn `Enter` để tra; `←` `→` di chuyển giữa các từ. Trong bản chép lời, `↑` `↓` di chuyển giữa các dòng.',
          ],
          keywords: ['phím tắt', 'bàn phím', 'tổ hợp phím', 'shortcut', 'hotkey', 'trợ năng', 'trình đọc màn hình', 'alt', 'tab'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Tạo thẻ',
      about: 'Đưa một từ, hoặc cả một dòng, vào Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Tạo một thẻ',
          body: [
            'Nhấn “Thêm vào Anki” ở cuối cửa sổ tra từ, hoặc nhấn `A`. Thẻ gồm từ, cách đọc và nghĩa, câu và bản dịch của câu, bản ghi âm của từ, âm thanh của chính dòng đó và một ảnh tĩnh từ cảnh đó.',
            { tip: 'Lỡ tạo nhầm? Nhấp vào “Đã thêm” trong vòng vài phút để hoàn tác.' },
            'Từ đã có trong Anki sẽ hiện “Có trong Anki”; nhấp vào để xem từ đó trong Anki. Nếu Anki đang đóng, thẻ mới sẽ chờ trong trình duyệt và được thêm vào khi Anki phản hồi lần tới.',
          ],
          keywords: ['thẻ ghi nhớ', 'flashcard', 'anki', 'thêm', 'hoàn tác', 'xóa', 'gỡ'],
        },
        {
          id: 'add-line',
          title: 'Tạo thẻ từ cả câu',
          body: [
            'Trong cửa sổ tra từ, nút bong bóng thoại có dấu + sẽ tạo thẻ cho cả câu thay vì một từ, kèm âm thanh và ảnh chụp màn hình. Mỗi dòng trong bản chép lời cũng có nút này khi bạn trỏ vào.',
          ],
          keywords: ['câu', 'dòng', 'thẻ câu', 'cả câu', 'cả dòng', 'sentence'],
        },
        {
          id: 'sentence-audio',
          title: 'Âm thanh của câu',
          body: [
            'Khi bạn thêm thẻ từ phụ đề hoặc bản chép lời, dù là một từ, một cụm từ hay cả câu, Libregaku sẽ ghi âm dòng đó từ video và gắn bản ghi âm vào thẻ. Khi ôn tập, bạn sẽ nghe câu đúng như lúc được nói.',
            'Chrome chỉ ghi âm được khi video đang phát, nên dòng đó sẽ phát lại một lần nữa, rồi video quay về chỗ bạn đang xem.',
            { tip: 'Lưu một dòng không ghi âm gì cả, và thêm thẻ từ các danh sách trong tab “Đã lưu” cũng vậy. {Cài đặt → Thẻ Anki → Âm thanh của câu} sẽ tắt việc ghi âm.' },
          ],
          keywords: ['âm thanh', 'ghi âm', 'audio', 'phát lại', 'giọng nói', 'nghe'],
        },
        {
          id: 'decks',
          title: 'Chọn bộ thẻ',
          body: [
            'Thẻ mới được thêm vào bộ thẻ trong {Cài đặt → Anki → Thêm thẻ mới vào}.',
            'Mỗi ngôn ngữ bạn học có bộ thẻ riêng. Cho đến khi bạn chọn một bộ thẻ, thẻ của ngôn ngữ đó được thêm vào bộ thẻ tạo riêng cho nó cùng với thẻ đầu tiên: Libregaku-JA cho tiếng Nhật, Libregaku-ES cho tiếng Tây Ban Nha. Đổi {Cài đặt → Ngôn ngữ → Ngôn ngữ đang học} thì bộ thẻ cũng đổi theo.',
            'Để đổi trong lúc xem, hãy bật {Cài đặt → Cửa sổ tra từ → Menu bộ thẻ}. Nút ▾ sẽ xuất hiện cạnh “Thêm vào Anki”; chọn “Thêm vào” một bộ thẻ sẽ thêm thẻ vào đó, và các thẻ tiếp theo cũng vào đó.',
            { tip: 'Trạng thái của từ được xác định theo {Cài đặt → Anki → Nguồn từ đã biết}. Nếu thẻ mới được thêm vào một bộ thẻ không nằm trong nguồn này, Cài đặt sẽ báo cho bạn.' },
          ],
          keywords: ['bộ thẻ', 'bộ thẻ con', 'tạo bộ thẻ', 'deck', 'subdeck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Đánh dấu từ',
      about: '“Đã biết”, “Theo dõi” và “Bỏ qua” — không cái nào tạo thẻ.',
      topics: [
        {
          id: 'marks',
          title: 'Đã biết, Theo dõi và Bỏ qua',
          body: [
            'Các nút nhỏ cạnh từ trong cửa sổ tra từ.',
            [
              'Đã biết (`K`): bạn đã biết từ này — không gạch dưới, và được tính là đã biết.',
              'Theo dõi: gạch dưới màu tím, để bạn để ý từ đó khi nó xuất hiện.',
              'Bỏ qua: dành cho tên riêng và tiếng cảm thán — không bao giờ gạch dưới, không bao giờ được đếm.',
            ],
            'Nhấp vào một dấu lần nữa để bỏ, hoặc tìm từ đó trong tab “Đã lưu” của bảng chép lời.',
          ],
          keywords: ['đánh dấu', 'đã biết', 'theo dõi', 'bỏ qua', 'gạch chân', 'màu tím', 'known', 'track', 'ignore'],
        },
        {
          id: 'tracked',
          title: 'Xem và đổi các từ đã đánh dấu',
          body: [
            'Trong bảng chép lời, tab “Đã lưu” liệt kê các dòng bạn lưu và các từ bạn theo dõi, đánh dấu đã biết hoặc bỏ qua, mỗi loại một danh sách. Mỗi từ có một nút để bỏ đánh dấu — “Không bỏ qua nữa”, với từ đã bỏ qua — và từ đang theo dõi có thể được tạo thẻ ngay tại đó.',
            'Mỗi ngôn ngữ có danh sách riêng. Tab “Đã lưu” hiển thị danh sách của ngôn ngữ bạn đang học, và một từ được đánh dấu ở ngôn ngữ này không được đánh dấu ở ngôn ngữ khác.',
            'Mỗi danh sách có ô tìm kiếm, cùng nút “Sao chép” và “Xuất tệp” để lấy danh sách dưới dạng tệp mà Anki và bảng tính mở được.',
          ],
          keywords: ['danh sách theo dõi', 'danh sách', 'đã bỏ qua', 'đã biết', 'bỏ đánh dấu', 'từ', 'excel', 'watchlist'],
        },
      ],
    },
    {
      id: 'supported-sites',
      title: 'Trang web được hỗ trợ',
      about: 'Các trang web Libregaku hoạt động và điểm khác nhau giữa chúng.',
      topics: [
        {
          id: 'supported-sites-list',
          title: 'Hoạt động trên những trang web nào?',
          body: [
            'Libregaku vẽ phụ đề tương tác lên video trên các trang web này. Nó dùng phụ đề do chính trang web cung cấp, bằng ngôn ngữ bạn đang học.',
            {
              head: ['Trang web', 'Âm thanh của câu và ảnh chụp màn hình'],
              rows: [
                ['YouTube', 'Lấy từ video.'],
                ['Netflix', 'Ghi từ tab; không có ảnh chụp màn hình.'],
                ['Disney+', 'Ghi từ tab; không có ảnh chụp màn hình.'],
                ['Prime Video', 'Ghi từ tab; không có ảnh chụp màn hình.'],
                ['HBO Max', 'Ghi từ tab; không có ảnh chụp màn hình.'],
                ['Apple TV', 'Ghi từ tab; không có ảnh chụp màn hình.'],
              ],
            },
            'Chương “Trang web được bảo vệ” giải thích cách ghi âm thanh từ tab. Video không có phụ đề bằng ngôn ngữ bạn đang học thì không có gì để hiển thị, và Libregaku sẽ báo như vậy.',
          ],
          keywords: ['youtube', 'netflix', 'disney', 'prime video', 'max', 'hbo', 'trang', 'được hỗ trợ', 'streaming'],
        },
      ],
    },
    {
      id: 'protected-sites',
      title: 'Trang web được bảo vệ',
      about: 'Các trang web mã hóa video: Netflix, Disney+, Prime Video, HBO Max và Apple TV. Những gì thay đổi do việc đó.',
      topics: [
        {
          id: 'protected-sites-audio',
          title: 'Âm thanh của câu trên các trang web được bảo vệ',
          body: [
            [
              'Mở {Cài đặt → Thẻ Anki → Âm thanh của câu trên các trang web được bảo vệ} và nhấn “Cho phép”.',
              'Trên tab đang phát video, nhấp vào biểu tượng Libregaku trên thanh công cụ rồi nhấn “Ghi âm câu tại đây”. Làm việc này một lần cho mỗi tab.',
            ],
            'Các trang web được bảo vệ đều mã hóa video, nên Libregaku không thể ghi âm thanh từ video như trên YouTube. Thay vào đó, Libregaku ghi âm cả tab, và Chrome chỉ cho phép việc này theo cách đó. Cũng vì lý do này, thẻ tạo trên các trang này không có ảnh chụp màn hình.',
          ],
          keywords: ['netflix', 'disney', 'prime video', 'max', 'hbo', 'âm thanh', 'ghi âm', 'quyền', 'cho phép', 'mã hóa', 'drm', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Cập nhật',
      topics: [
        {
          id: 'update',
          title: 'Tải phiên bản mới',
          body: [
            [
              'Mở trang tiện ích của trình duyệt.',
              'Nhấn mũi tên tải lại trên Libregaku.',
              'Tải lại tab video — tab đã mở trước khi tải lại vẫn dùng phiên bản cũ.',
            ],
            { tip: 'Cuối trang Cài đặt có ghi thời điểm tạo bản dựng bạn đang chạy.' },
          ],
          keywords: ['tải lại', 'làm mới', 'cập nhật', 'phiên bản cũ', 'bản dựng', 'brave', 'reload', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Câu hỏi thường gặp',
      topics: [
        {
          id: 'q-track',
          title: '“Theo dõi” có tác dụng gì?',
          body: [
            '“Theo dõi” gạch dưới một từ ở mọi chỗ từ đó xuất hiện — màu tím, trừ khi bạn đổi trong {Cài đặt → Gạch dưới} — để bạn để ý, mà không tạo thẻ. Từ đó cũng không còn được tính là từ mới. Các từ đang theo dõi được liệt kê trong bảng chép lời, ở tab “Đã lưu”.',
          ],
          keywords: ['theo dõi', 'màu tím', 'track', 'purple'],
        },
        {
          id: 'q-still-underlined',
          title: 'Sao từ tôi đã biết vẫn bị gạch dưới?',
          body: [
            'Trạng thái lấy từ thẻ Anki của bạn, trong các bộ thẻ ở {Cài đặt → Anki → Nguồn từ đã biết}. Từ có thẻ chưa trưởng thành được gạch dưới là đang học; từ không có thẻ ở đó được gạch dưới là từ mới. Từ bạn đã biết mà không có thẻ thì có thể đánh dấu “Đã biết”.',
          ],
          keywords: ['đã biết', 'trạng thái', 'gạch chân', 'trưởng thành', 'nguồn'],
        },
        {
          id: 'q-marks-deck',
          title: 'Sao trong Anki lại có bộ thẻ Libregaku::Marks?',
          body: [
            '“Đã biết”, “Theo dõi” và “Bỏ qua” được lưu ở đó dưới dạng phiếu ẩn, bị dừng để không bao giờ hiện ra khi ôn tập, nhờ vậy chúng đến được các thiết bị khác của bạn qua tính năng đồng bộ của Anki. Bên trong bộ thẻ này, mỗi ngôn ngữ có một bộ thẻ riêng, chẳng hạn Libregaku::Marks::JA. {Cài đặt → Anki → Xem đánh dấu trong Anki} sẽ hiện chúng.',
            { tip: 'Tắt {Cài đặt → Anki → Lưu đánh dấu trong Anki} để chỉ giữ đánh dấu trong trình duyệt này.' },
          ],
          keywords: ['đánh dấu', 'bộ thẻ', 'bị dừng', 'đồng bộ', 'marks', 'sync'],
        },
        {
          id: 'q-remove',
          title: 'Tôi có thể xóa thẻ không?',
          body: [
            'Ngay sau khi thêm, nhấp vào “Đã thêm” để hoàn tác. Với thẻ cũ hơn, nhấp vào “Có trong Anki” trong cửa sổ tra từ rồi xóa thẻ trong Anki. Libregaku không bao giờ xóa thẻ bạn đã học.',
          ],
          keywords: ['xóa', 'gỡ', 'hoàn tác', 'delete', 'remove', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Có dùng được với AnkiWeb không?',
          body: [
            'Không trực tiếp: Libregaku làm việc với Anki trên máy tính của bạn thông qua tiện ích [AnkiConnect](https://ankiweb.net/shared/info/2055492159). Sau đó Anki đồng bộ thẻ lên AnkiWeb và điện thoại của bạn như bình thường.',
          ],
          keywords: ['ankiweb', 'ankiconnect', 'điện thoại', 'di động', 'đồng bộ', 'sync', 'add-on'],
        },
        {
          id: 'q-picture',
          title: 'Ảnh chụp màn hình trên thẻ là gì?',
          body: [
            'Một ảnh tĩnh của cảnh đó, ở mặt sau của thẻ, để bạn thấy từ đó xuất hiện ở đâu. Trên YouTube, ảnh được chụp từ video; các trang web được bảo vệ che video của họ với các tiện ích, nên thẻ tạo ở đó không có ảnh. {Cài đặt → Thẻ Anki → Ảnh chụp màn hình} sẽ tắt tính năng này.',
          ],
          keywords: ['ảnh', 'hình ảnh', 'chụp màn hình', 'ảnh tĩnh', 'screenshot'],
        },
        {
          id: 'q-replay',
          title: 'Sao dòng lại phát lại khi tôi thêm thẻ?',
          body: [
            'Âm thanh được ghi trong lúc dòng đó phát, nên dòng phát thêm một lần nữa; sau đó video quay về chỗ cũ. {Cài đặt → Thẻ Anki → Âm thanh của câu} sẽ tắt tính năng này.',
          ],
          keywords: ['phát lại', 'ghi âm', 'tua lại', 'replay'],
        },
        {
          id: 'q-translation',
          title: 'Sao không có bản dịch dưới phụ đề?',
          body: [
            'Bản dịch là phụ đề của chính trang web, bằng ngôn ngữ trong {Cài đặt → Ngôn ngữ → Ngôn ngữ của bạn}. Nếu video không có phụ đề bằng ngôn ngữ đó thì không có gì để hiện, và Libregaku sẽ báo cho bạn. Libregaku không dịch máy.',
          ],
          keywords: ['bản dịch', 'dòng thứ hai', 'phụ đề kép', 'song ngữ', 'tiếng việt', 'dual', 'translation'],
        },
        {
          id: 'q-definitions',
          title: 'Sao nghĩa chỉ có ở một số ngôn ngữ?',
          body: [
            'Với tiếng Nhật, nghĩa lấy từ JMdict, vốn có nghĩa bằng chín ngôn ngữ. Nếu ngôn ngữ của bạn không nằm trong số đó, {Cài đặt → Ngôn ngữ} sẽ có thêm một hàng thứ hai, “Hiện nghĩa bằng”, để chọn ngôn ngữ dùng thay thế.',
            'Từ điển tiếng Trung (Quan thoại), tiếng Hàn, tiếng Tây Ban Nha, tiếng Pháp và tiếng Đức được viết bằng tiếng Anh. Nếu có từ điển bằng ngôn ngữ của bạn cho cặp ngôn ngữ đó, nó được dùng trước.',
          ],
          keywords: ['nghĩa', 'định nghĩa', 'ngôn ngữ', 'jmdict', 'tiếng hungary', 'tiếng slovenia', 'tiếng anh', 'cc-cedict', 'wiktionary'],
        },
        {
          id: 'q-languages',
          title: 'Tôi có thể học những ngôn ngữ nào?',
          body: [
            'Tiếng Nhật, tiếng Trung (Quan thoại), tiếng Quảng Đông, tiếng Hàn, tiếng Tây Ban Nha, tiếng Pháp và tiếng Đức có từ điển, và một từ được khớp với thẻ của nó dù được nói ở dạng nào: 갔어요 tìm thấy thẻ của 가다, còn hablábamos tìm thấy thẻ của hablar. Tiếng Nhật hiện furigana phía trên từ, tiếng Trung (Quan thoại) hiện pinyin, còn tiếng Quảng Đông hiện Jyutping.',
            'Các ngôn ngữ khác trong {Cài đặt → Ngôn ngữ → Ngôn ngữ đang học} được ghi là “hạn chế”. Từ của các ngôn ngữ này được tách ra, nhưng chưa có từ điển.',
            'Từ điển của một ngôn ngữ được tải về vào lần đầu bạn chọn ngôn ngữ đó. Dung lượng tải về từ 11 đến 27 MB; trên ổ đĩa, từ điển chiếm 100 MB cho tiếng Trung (Quan thoại), 140 MB cho tiếng Pháp, 200 MB cho tiếng Hàn và tiếng Đức, và 470 MB cho tiếng Tây Ban Nha. Từ điển bằng ngôn ngữ của bạn, nếu có, là lần tải thứ hai, tối đa 18 MB. Tiếng Nhật còn tải thêm một từ điển thứ hai, dùng để tách dòng thành từ: 46 MB, và 190 MB trên ổ đĩa.',
          ],
          keywords: ['ngôn ngữ', 'tiếng hàn', 'tiếng trung', 'tiếng quan thoại', 'tiếng quảng đông', 'jyutping', 'tiếng tây ban nha', 'tiếng nhật', 'pinyin', 'hạn chế', 'được hỗ trợ'],
        },
        {
          id: 'q-data',
          title: 'Libregaku có gửi dữ liệu của tôi đi đâu không?',
          body: [
            'Không có tài khoản và không có máy chủ. Từ điển được tải về một lần và lưu trong trình duyệt; thẻ được thêm thẳng vào Anki trên máy tính của bạn. Trong lúc từ điển tiếng Nhật vẫn đang tải, từ bạn tra sẽ được gửi đến Jotoba để lấy kết quả.',
          ],
          keywords: ['quyền riêng tư', 'dữ liệu', 'máy chủ', 'tài khoản', 'bảo mật', 'privacy'],
        },
      ],
    },
  ],
};
