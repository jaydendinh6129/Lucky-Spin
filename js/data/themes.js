/* ============================================================
 *  Themes
 * ============================================================ */

const THEMES = {
  drinking: {
    key: 'drinking', icon: '🍻', free: true,
    palette: ['#FF4757', '#FFA502', '#FF6348', '#E74C3C', '#F39C12', '#FF7F50'],
    bgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #b45309 55%, #ca8a04 100%)',
    themeColor: '#7f1d1d',
    accent: '#FFD93D', pointerColor: '#FFD93D',
    btnClass: 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white',
    resultEmoji: '🍺', effect: 'shake',
    floaters: ['🍺', '🍻', '🥂', '🍾'],
    confettiColors: ['#FF4757', '#FFA502', '#FFD93D'],
  },
  lucky: {
    key: 'lucky', icon: '🍀', free: true,
    palette: ['#FFD700', '#7B68EE', '#FF1493', '#00CED1', '#FF69B4', '#32CD32'],
    bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #9d174d 50%, #facc15 100%)',
    themeColor: '#4c1d95',
    accent: '#FFD700', pointerColor: '#FFD700',
    btnClass: 'bg-gradient-to-r from-yellow-400 to-pink-500 hover:from-yellow-500 hover:to-pink-600 text-purple-950',
    resultEmoji: '🎉', effect: 'confetti',
    floaters: ['🍀', '✨', '⭐', '💰'],
    confettiColors: ['#FFD700', '#FF1493', '#00CED1', '#32CD32'],
  },
  truth_or_dare: {
    key: 'truth_or_dare', icon: '😈', free: true,
    palette: ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#FF5722', '#C2185B'],
    bgGradient: 'linear-gradient(135deg, #831843 0%, #581c87 50%, #1e1b4b 100%)',
    themeColor: '#581c87',
    accent: '#FF4081', pointerColor: '#FF4081',
    btnClass: 'bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white',
    resultEmoji: '😈', effect: 'glow',
    floaters: ['😈', '🔥', '👀'],
    confettiColors: ['#E91E63', '#9C27B0', '#FF4081'],
  },
  dating: {
    key: 'dating', icon: '💘', free: false,
    palette: ['#FF6B9D', '#FF1744', '#FFB6C1', '#FF4081', '#F8BBD0', '#E91E63'],
    bgGradient: 'linear-gradient(135deg, #be185d 0%, #db2777 50%, #f43f5e 100%)',
    themeColor: '#be185d',
    accent: '#FFE0EC', pointerColor: '#FFFFFF',
    btnClass: 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white',
    resultEmoji: '💘', effect: 'hearts',
    floaters: ['❤️', '💖', '💕', '💘', '💗', '💓'],
    confettiColors: ['#FF6B9D', '#FF1744', '#FFB6C1', '#FF4081'],
  },
  office: {
    key: 'office', icon: '📌', free: false,
    palette: ['#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#455A64', '#0097A7'],
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
    themeColor: '#0f172a',
    accent: '#60A5FA', pointerColor: '#60A5FA',
    btnClass: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white',
    resultEmoji: '📌', effect: 'clean',
    floaters: [],
    confettiColors: ['#1976D2', '#388E3C', '#F57C00'],
  },
};

/* ============================================================
 *  i18n
 * ============================================================ */

const THEME_TEXT = {
  en: {
    drinking:      { name: 'Drinking',       tagline: 'Cheers, losers!',    kicker: 'Bottoms up! 🍻' },
    lucky:         { name: 'Lucky',          tagline: 'Test your fortune',  kicker: 'Fortune has spoken ✨' },
    truth_or_dare: { name: 'Truth or Dare',  tagline: 'No backing out',     kicker: 'No backing out now 😈' },
    dating:        { name: 'Dating',         tagline: 'Catch the feeling',  kicker: 'Destiny has decided 💘' },
    office:        { name: 'Office',         tagline: 'Pick the PIC',       kicker: 'Congrats, you’re the PIC 📌' },
  },
  vi: {
    drinking:      { name: 'Nhậu',           tagline: 'Dô! Trăm phần trăm!', kicker: 'Cạn ly đi chờ chi! 🍻' },
    lucky:         { name: 'May mắn',        tagline: 'Thử vận may',         kicker: 'Thần may mắn đã gọi tên ✨' },
    truth_or_dare: { name: 'Thật hay Thách', tagline: 'Không được chối',     kicker: 'Hết đường lui rồi nhé 😈' },
    dating:        { name: 'Hẹn hò',         tagline: 'Bắt trọn cảm xúc',    kicker: 'Định mệnh đã chọn 💘' },
    office:        { name: 'Công sở',        tagline: 'Chọn người phụ trách', kicker: 'Chúc mừng, bạn là PIC 📌' },
  },
};

const SAMPLE_ITEMS = {
  en: {
    drinking: ['Take a shot', 'Skip turn', 'Drink with neighbor', 'Down your drink', 'Make a rule', 'Truth', 'Dare', 'Pass it on'],
    lucky: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    truth_or_dare: ['Truth', 'Dare', 'Skip (1 drink)', 'Double Dare', 'Reverse', 'Wild Card'],
    dating: ['Hold hands', 'Compliment them', 'Eye contact 30s', 'Share a secret', 'Slow dance', 'Take a selfie'],
    office: ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona'],
  },
  vi: {
    drinking: ['Uống 1 ly', 'Qua lượt', 'Uống cùng người bên cạnh', 'Cạn ly', 'Đặt luật mới', 'Sự thật', 'Thử thách', 'Chỉ định người uống'],
    lucky: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    truth_or_dare: ['Sự thật', 'Thử thách', 'Bỏ qua (uống 1 ly)', 'Thử thách x2', 'Đổi chiều', 'Tự chọn'],
    dating: ['Nắm tay', 'Khen đối phương', 'Nhìn mắt 30 giây', 'Kể một bí mật', 'Nhảy điệu chậm', 'Chụp selfie'],
    office: ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà'],
  },
};

const TD_PROMPTS = {
  en: {
    truth: [
      'What’s the most embarrassing thing on your phone right now?',
      'Who here would you call at 3am in an emergency?',
      'What’s the biggest lie you’ve told this year?',
      'What’s your most irrational fear?',
      'Who was your first crush?',
      'What’s the weirdest thing you’ve ever eaten?',
      'What secret talent does nobody here know about?',
      'What was the last thing you searched online?',
      'Who here would survive longest in a zombie apocalypse?',
      'What’s the most childish thing you still do?',
      'What’s the worst date you’ve ever been on?',
      'If you could swap lives with someone here for a day, who would it be?',
      'What’s a habit you’d never admit to your parents?',
      'What’s the pettiest reason you stopped talking to someone?',
    ],
    dare: [
      'Do your best impression of someone in the room.',
      'Speak in an accent for the next 3 rounds.',
      'Show the last photo in your camera roll.',
      'Do 15 squats right now.',
      'Let the person on your left draw on your hand.',
      'Dance with no music for 30 seconds.',
      'Say the alphabet backwards.',
      'Hold a plank for 30 seconds.',
      'Swap a piece of clothing with the person on your right.',
      'Talk like a news anchor until your next turn.',
      'Let the group pick your profile picture for the next hour.',
      'Do a dramatic slow-motion walk across the room.',
      'Give a 30-second motivational speech about socks.',
      'Try to make everyone laugh in under a minute.',
    ],
  },
  vi: {
    truth: [
      'Thứ đáng xấu hổ nhất trong điện thoại bạn lúc này là gì?',
      'Nếu có chuyện lúc 3 giờ sáng, bạn sẽ gọi ai ở đây?',
      'Lời nói dối lớn nhất của bạn trong năm nay là gì?',
      'Nỗi sợ vô lý nhất của bạn là gì?',
      'Mối tình đầu (hoặc crush đầu tiên) của bạn là ai?',
      'Món kỳ lạ nhất bạn từng ăn là gì?',
      'Bạn có tài lẻ bí mật nào mà chưa ai ở đây biết?',
      'Thứ cuối cùng bạn tìm kiếm trên mạng là gì?',
      'Ai ở đây sẽ sống sót lâu nhất trong ngày tận thế zombie?',
      'Việc trẻ con nhất mà bạn vẫn còn làm là gì?',
      'Buổi hẹn hò tệ nhất của bạn diễn ra thế nào?',
      'Nếu được đổi cuộc sống với một người ở đây trong 1 ngày, bạn chọn ai?',
      'Thói quen nào bạn không bao giờ dám kể với bố mẹ?',
      'Lý do nhỏ nhen nhất khiến bạn nghỉ chơi với ai đó là gì?',
    ],
    dare: [
      'Nhại lại một người trong phòng thật giống.',
      'Nói giọng vùng miền khác trong 3 lượt tiếp theo.',
      'Cho cả hội xem tấm ảnh gần nhất trong máy.',
      'Squat 15 cái ngay bây giờ.',
      'Để người bên trái vẽ lên tay bạn.',
      'Nhảy không nhạc trong 30 giây.',
      'Đọc ngược bảng chữ cái.',
      'Plank 30 giây.',
      'Đổi một món đồ đang mặc với người bên phải.',
      'Nói chuyện như phát thanh viên thời sự đến lượt sau.',
      'Để cả hội chọn ảnh đại diện cho bạn trong 1 tiếng.',
      'Đi slow-motion thật kịch tính qua phòng.',
      'Diễn thuyết truyền cảm hứng 30 giây về… đôi tất.',
      'Làm cả hội bật cười trong vòng 1 phút.',
    ],
  },
};
