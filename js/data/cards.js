/* ============================================================
 *  Card decks. Wild and chaos cards carry an `effect` that the cards
 *  game applies as a real state change (see js/games/cards.js).
 * ============================================================ */

const CARD_CONTENT = {
  challenge: {
    en: [
      { id: 'ch01', title: 'Speed round', content: 'Name 5 things you’d take to a desert island in 10 seconds.', difficulty: 'easy' },
      { id: 'ch02', title: 'Statue', content: 'Freeze in a pose until your next turn.', difficulty: 'easy' },
      { id: 'ch03', title: 'Hype man', content: 'Introduce the player on your left like a boxing announcer.', difficulty: 'easy' },
      { id: 'ch04', title: 'Push it', content: 'Do 10 push-ups. The table counts out loud.', difficulty: 'medium' },
      { id: 'ch05', title: 'Switch seats', content: 'Swap seats with any player of your choice.', difficulty: 'easy' },
      { id: 'ch06', title: 'Phone roulette', content: 'Let the player on your right send a (friendly) text from your phone.', difficulty: 'hard' },
      { id: 'ch07', title: 'Karaoke', content: 'Sing 20 seconds of any song. No mumbling.', difficulty: 'medium' },
      { id: 'ch08', title: 'Cheers', content: 'Make a toast to the whole table.', difficulty: 'easy', drink: true, alt: 'Give the whole table one shared compliment.' },
      { id: 'ch09', title: 'Mirror', content: 'Copy everything the player opposite you does until your next turn.', difficulty: 'medium' },
      { id: 'ch10', title: 'Showtime', content: 'Perform a 15-second TikTok-style dance.', difficulty: 'medium' },
    ],
    vi: [
      { id: 'ch01', title: 'Vòng tốc độ', content: 'Kể 5 thứ bạn mang ra đảo hoang trong 10 giây.', difficulty: 'easy' },
      { id: 'ch02', title: 'Tượng', content: 'Đứng yên như tượng cho tới lượt sau.', difficulty: 'easy' },
      { id: 'ch03', title: 'MC', content: 'Giới thiệu người bên trái như MC võ đài.', difficulty: 'easy' },
      { id: 'ch04', title: 'Hít đất', content: 'Hít đất 10 cái, cả bàn đếm to.', difficulty: 'medium' },
      { id: 'ch05', title: 'Đổi chỗ', content: 'Đổi chỗ với bất kỳ ai bạn chọn.', difficulty: 'easy' },
      { id: 'ch06', title: 'Điện thoại định mệnh', content: 'Để người bên phải nhắn một tin (tử tế) từ điện thoại của bạn.', difficulty: 'hard' },
      { id: 'ch07', title: 'Karaoke', content: 'Hát 20 giây bất kỳ bài nào. Không được lí nhí.', difficulty: 'medium' },
      { id: 'ch08', title: 'Nâng ly', content: 'Nói một lời chúc cho cả bàn.', difficulty: 'easy', drink: true, alt: 'Dành một lời khen chung cho cả bàn.' },
      { id: 'ch09', title: 'Gương', content: 'Bắt chước mọi cử chỉ của người đối diện cho tới lượt sau.', difficulty: 'medium' },
      { id: 'ch10', title: 'Trình diễn', content: 'Nhảy một điệu kiểu TikTok trong 15 giây.', difficulty: 'medium' },
    ],
  },
  truth: {
    en: [
      { id: 'tr01', title: 'Confession', content: 'What’s the most embarrassing thing on your phone right now?', difficulty: 'medium' },
      { id: 'tr02', title: 'First', content: 'Who was your first crush and what happened?', difficulty: 'easy' },
      { id: 'tr03', title: 'Oops', content: 'What’s the biggest lie you told this year?', difficulty: 'hard' },
      { id: 'tr04', title: 'Secret skill', content: 'What talent do you have that nobody here knows about?', difficulty: 'easy' },
      { id: 'tr05', title: 'Guilty', content: 'What’s the most childish thing you still do?', difficulty: 'easy' },
      { id: 'tr06', title: 'Swap', content: 'If you could swap lives with someone here for a day, who and why?', difficulty: 'easy' },
      { id: 'tr07', title: 'Search history', content: 'What was the last thing you searched online?', difficulty: 'medium' },
      { id: 'tr08', title: 'Fear', content: 'What’s your most irrational fear?', difficulty: 'easy' },
      { id: 'tr09', title: 'Worst date', content: 'Describe your worst date in 20 seconds.', difficulty: 'medium' },
      { id: 'tr10', title: 'Petty', content: 'What’s the pettiest reason you stopped talking to someone?', difficulty: 'hard' },
    ],
    vi: [
      { id: 'tr01', title: 'Thú tội', content: 'Thứ xấu hổ nhất trong điện thoại bạn lúc này là gì?', difficulty: 'medium' },
      { id: 'tr02', title: 'Đầu tiên', content: 'Crush đầu tiên của bạn là ai và chuyện ra sao?', difficulty: 'easy' },
      { id: 'tr03', title: 'Lỡ rồi', content: 'Lời nói dối lớn nhất của bạn năm nay?', difficulty: 'hard' },
      { id: 'tr04', title: 'Tài lẻ', content: 'Bạn có tài lẻ nào mà chưa ai ở đây biết?', difficulty: 'easy' },
      { id: 'tr05', title: 'Trẻ con', content: 'Việc trẻ con nhất bạn vẫn còn làm?', difficulty: 'easy' },
      { id: 'tr06', title: 'Hoán đổi', content: 'Nếu được đổi đời với một người ở đây trong 1 ngày, bạn chọn ai và vì sao?', difficulty: 'easy' },
      { id: 'tr07', title: 'Lịch sử tìm kiếm', content: 'Thứ cuối cùng bạn tìm trên mạng là gì?', difficulty: 'medium' },
      { id: 'tr08', title: 'Nỗi sợ', content: 'Nỗi sợ vô lý nhất của bạn?', difficulty: 'easy' },
      { id: 'tr09', title: 'Buổi hẹn tệ nhất', content: 'Kể buổi hẹn hò tệ nhất trong 20 giây.', difficulty: 'medium' },
      { id: 'tr10', title: 'Nhỏ nhen', content: 'Lý do nhỏ nhen nhất khiến bạn nghỉ chơi ai đó?', difficulty: 'hard' },
    ],
  },
  dare: {
    en: [
      { id: 'da01', title: 'Impression', content: 'Do your best impression of someone in the room until they guess who.', difficulty: 'easy' },
      { id: 'da02', title: 'Accent', content: 'Speak in an accent for the next 3 rounds.', difficulty: 'easy' },
      { id: 'da03', title: 'Camera roll', content: 'Show the last photo in your camera roll.', difficulty: 'medium' },
      { id: 'da04', title: 'Squats', content: 'Do 15 squats right now.', difficulty: 'medium' },
      { id: 'da05', title: 'Artist', content: 'Let the player on your left draw on your hand.', difficulty: 'easy' },
      { id: 'da06', title: 'Silent disco', content: 'Dance with no music for 30 seconds.', difficulty: 'medium' },
      { id: 'da07', title: 'Backwards', content: 'Say the alphabet backwards.', difficulty: 'hard' },
      { id: 'da08', title: 'Plank', content: 'Hold a plank for 30 seconds.', difficulty: 'medium' },
      { id: 'da09', title: 'Anchor', content: 'Talk like a news anchor until your next turn.', difficulty: 'easy' },
      { id: 'da10', title: 'Motivation', content: 'Give a 30-second motivational speech about socks.', difficulty: 'medium' },
    ],
    vi: [
      { id: 'da01', title: 'Nhại', content: 'Nhại một người trong phòng cho tới khi họ đoán ra.', difficulty: 'easy' },
      { id: 'da02', title: 'Giọng lạ', content: 'Nói giọng vùng miền khác trong 3 lượt tới.', difficulty: 'easy' },
      { id: 'da03', title: 'Ảnh gần nhất', content: 'Cho cả bàn xem tấm ảnh gần nhất trong máy.', difficulty: 'medium' },
      { id: 'da04', title: 'Squat', content: 'Squat 15 cái ngay bây giờ.', difficulty: 'medium' },
      { id: 'da05', title: 'Hoạ sĩ', content: 'Để người bên trái vẽ lên tay bạn.', difficulty: 'easy' },
      { id: 'da06', title: 'Disco câm', content: 'Nhảy không nhạc trong 30 giây.', difficulty: 'medium' },
      { id: 'da07', title: 'Đọc ngược', content: 'Đọc ngược bảng chữ cái.', difficulty: 'hard' },
      { id: 'da08', title: 'Plank', content: 'Plank 30 giây.', difficulty: 'medium' },
      { id: 'da09', title: 'Phát thanh viên', content: 'Nói như phát thanh viên thời sự tới lượt sau.', difficulty: 'easy' },
      { id: 'da10', title: 'Truyền cảm hứng', content: 'Diễn thuyết truyền cảm hứng 30 giây về… đôi tất.', difficulty: 'medium' },
    ],
  },
  wild: {
    en: [
      { id: 'w-respin', effect: 'respin', title: 'RE-SPIN', content: 'Take another turn right away.' },
      { id: 'w-target', effect: 'target', title: 'TARGET', content: 'Choose another player — they take the next card.' },
      { id: 'w-shield', effect: 'shield', title: 'SHIELD', content: 'Keep it. Ignore one challenge whenever you like.' },
      { id: 'w-switch', effect: 'switch', title: 'SWITCH', content: 'Swap the next turn with another player.' },
      { id: 'w-double', effect: 'double', title: 'DOUBLE', content: 'Your next completed card is worth double.' },
    ],
    vi: [
      { id: 'w-respin', effect: 'respin', title: 'QUAY LẠI', content: 'Được thêm một lượt ngay lập tức.' },
      { id: 'w-target', effect: 'target', title: 'CHỈ ĐỊNH', content: 'Chọn một người khác — họ nhận lá bài kế tiếp.' },
      { id: 'w-shield', effect: 'shield', title: 'KHIÊN', content: 'Giữ lá này. Bỏ qua một thử thách bất kỳ lúc nào.' },
      { id: 'w-switch', effect: 'switch', title: 'HOÁN ĐỔI', content: 'Đổi lượt kế tiếp với một người khác.' },
      { id: 'w-double', effect: 'double', title: 'NHÂN ĐÔI', content: 'Lá bài hoàn thành kế tiếp của bạn tính gấp đôi.' },
    ],
  },
  chaos: {
    en: [
      { id: 'x-everyone', effect: 'everyone', title: 'EVERYONE', content: 'Everyone does the next challenge.' },
      { id: 'x-swap', effect: 'swap', title: 'SWAP', content: 'Everyone changes seats — the turn order is reshuffled.' },
      { id: 'x-reverse', effect: 'reverse', title: 'REVERSE', content: 'The turn order reverses.' },
      { id: 'x-double', effect: 'doubleRound', title: 'DOUBLE ROUND', content: 'The next full round is worth double points.' },
      { id: 'x-random', effect: 'randomTarget', title: 'RANDOM TARGET', content: 'A random player takes the next challenge.' },
    ],
    vi: [
      { id: 'x-everyone', effect: 'everyone', title: 'TẤT CẢ', content: 'Cả bàn cùng làm thử thách kế tiếp.' },
      { id: 'x-swap', effect: 'swap', title: 'ĐỔI CHỖ', content: 'Mọi người đổi chỗ — thứ tự lượt xáo lại.' },
      { id: 'x-reverse', effect: 'reverse', title: 'ĐẢO CHIỀU', content: 'Thứ tự lượt đảo ngược.' },
      { id: 'x-double', effect: 'doubleRound', title: 'VÁN NHÂN ĐÔI', content: 'Cả vòng kế tiếp tính điểm gấp đôi.' },
      { id: 'x-random', effect: 'randomTarget', title: 'NGẪU NHIÊN', content: 'Một người ngẫu nhiên nhận thử thách kế tiếp.' },
    ],
  },
};

const CARD_TYPE_META = {
  challenge: { icon: '🎯', color: '#f97316' },
  truth:     { icon: '❓', color: '#38bdf8' },
  dare:      { icon: '😈', color: '#e11d48' },
  wild:      { icon: '🃏', color: '#a855f7' },
  chaos:     { icon: '💣', color: '#facc15' },
};

/* The cards a deck draws from. Wild/chaos decks mix effect cards into regular challenges. */
const buildDeck = (deckKey, lang) => {
  const of = (type) => CARD_CONTENT[type][lang].map((c) => ({ ...c, type }));
  switch (deckKey) {
    case 'wild':  return [...of('challenge'), ...of('dare'), ...of('wild'), ...of('wild')];
    case 'chaos': return [...of('challenge'), ...of('dare'), ...of('chaos'), ...of('chaos')];
    default:      return of(deckKey);
  }
};
