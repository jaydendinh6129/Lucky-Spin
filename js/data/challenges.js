/* ============================================================
 *  Challenge banks used by Battle, King and Cards.
 *  scope: duel (two players head-to-head) · solo (one player) · all (whole table)
 *  drink: drinking content — every such challenge carries an `alt` non-drinking version
 *  and the UI always offers water / food / the alternative instead.
 * ============================================================ */

const CHALLENGES = {
  en: [
    { id: 'c01', scope: 'duel', text: 'Rock, paper, scissors — best of 3.' },
    { id: 'c02', scope: 'duel', text: 'Staring contest. First to blink or laugh loses.' },
    { id: 'c03', scope: 'duel', text: 'Name 5 countries in 5 seconds — the faster one wins.' },
    { id: 'c04', scope: 'duel', text: 'Thumb war. Best of 3.' },
    { id: 'c05', scope: 'duel', text: 'Who can hold a plank longer?' },
    { id: 'c06', scope: 'duel', text: 'Say the alphabet backwards. Fewest mistakes wins.' },
    { id: 'c07', scope: 'duel', text: 'Compliment battle: take turns complimenting each other — first to run dry loses.' },
    { id: 'c08', scope: 'duel', text: 'Impression duel: the table votes for the best impression of someone in the room.' },
    { id: 'c09', scope: 'duel', text: 'Count to 20 together, alternating numbers — a slip loses.' },
    { id: 'c10', scope: 'duel', text: 'Dance-off: 20 seconds each, the table decides.' },
    { id: 'c11', scope: 'duel', text: 'Alternate naming movie titles with a number in them. First to stall loses.' },
    { id: 'c12', scope: 'duel', text: 'Balance on one leg with eyes closed. Longest wins.' },
    { id: 'c13', scope: 'duel', text: 'Fastest to name 3 songs by the same artist.' },
    { id: 'c14', scope: 'duel', text: 'Tongue-twister showdown: “She sells seashells by the seashore” — three times, fast.' },
    { id: 'c15', scope: 'duel', text: 'Trivia sprint: the table asks one question — first correct answer wins.' },
    { id: 'c16', scope: 'duel', drink: true, text: 'Finish your drink first.', alt: 'Finish a glass of water first.' },
    { id: 'c17', scope: 'solo', text: 'Do 10 push-ups in 20 seconds.' },
    { id: 'c18', scope: 'solo', text: 'Sing the chorus of the last song you listened to.' },
    { id: 'c19', scope: 'solo', text: 'Speak in an accent until your next turn.' },
    { id: 'c20', scope: 'solo', text: 'Make the table laugh within 30 seconds.' },
    { id: 'c21', scope: 'solo', text: 'Name 7 car brands in 10 seconds.' },
    { id: 'c22', scope: 'solo', text: 'Improvise 4 lines of rap about the person on your right.' },
    { id: 'c23', scope: 'solo', text: 'Do your best runway walk across the room.' },
    { id: 'c24', scope: 'solo', text: 'Hold a wall-sit for 30 seconds.' },
    { id: 'c25', scope: 'solo', drink: true, text: 'Take a sip and tell the story of your worst hangover.', alt: 'Tell the story of your most embarrassing morning.' },
    { id: 'c26', scope: 'all', text: 'Everyone strikes a pose — the host picks the best one.' },
    { id: 'c27', scope: 'all', text: 'Quick vote: who is most likely to become famous? The winner gives a 20-second acceptance speech.' },
    { id: 'c28', scope: 'all', text: 'Everyone says a word that rhymes with “party”. Repeats are out.' },
    { id: 'c29', scope: 'all', text: 'Group selfie in 10 seconds — the host judges the pose.' },
    { id: 'c30', scope: 'all', drink: true, text: 'Everyone raises a glass and toasts the person on their left.', alt: 'Everyone gives a compliment to the person on their left.' },
  ],
  vi: [
    { id: 'c01', scope: 'duel', text: 'Oẳn tù tì — thắng 2 trên 3.' },
    { id: 'c02', scope: 'duel', text: 'Thi nhìn nhau. Ai chớp mắt hoặc cười trước là thua.' },
    { id: 'c03', scope: 'duel', text: 'Kể tên 5 quốc gia trong 5 giây — ai nhanh hơn thắng.' },
    { id: 'c04', scope: 'duel', text: 'Vật ngón cái. Thắng 2 trên 3.' },
    { id: 'c05', scope: 'duel', text: 'Ai plank lâu hơn?' },
    { id: 'c06', scope: 'duel', text: 'Đọc ngược bảng chữ cái. Ai ít sai hơn thắng.' },
    { id: 'c07', scope: 'duel', text: 'Đấu khen: lần lượt khen đối phương — ai bí trước thua.' },
    { id: 'c08', scope: 'duel', text: 'Đấu nhại: cả bàn bình chọn ai nhại người trong phòng giống nhất.' },
    { id: 'c09', scope: 'duel', text: 'Cùng đếm tới 20, mỗi người một số — ai vấp thua.' },
    { id: 'c10', scope: 'duel', text: 'Thi nhảy: mỗi người 20 giây, cả bàn quyết định.' },
    { id: 'c11', scope: 'duel', text: 'Lần lượt kể tên phim có con số trong tựa. Ai bí trước thua.' },
    { id: 'c12', scope: 'duel', text: 'Đứng một chân nhắm mắt. Ai lâu hơn thắng.' },
    { id: 'c13', scope: 'duel', text: 'Ai kể nhanh nhất 3 bài hát của cùng một ca sĩ.' },
    { id: 'c14', scope: 'duel', text: 'Đấu nói líu lưỡi: “Lúa nếp là lúa nếp làng, lúa lên lớp lớp lòng nàng lâng lâng” — 3 lần thật nhanh.' },
    { id: 'c15', scope: 'duel', text: 'Đố nhanh: cả bàn hỏi một câu — ai trả lời đúng trước thắng.' },
    { id: 'c16', scope: 'duel', drink: true, text: 'Ai cạn ly trước.', alt: 'Ai uống hết ly nước trước.' },
    { id: 'c17', scope: 'solo', text: 'Hít đất 10 cái trong 20 giây.' },
    { id: 'c18', scope: 'solo', text: 'Hát điệp khúc bài bạn vừa nghe gần nhất.' },
    { id: 'c19', scope: 'solo', text: 'Nói giọng vùng miền khác cho tới lượt sau.' },
    { id: 'c20', scope: 'solo', text: 'Làm cả bàn cười trong 30 giây.' },
    { id: 'c21', scope: 'solo', text: 'Kể 7 hãng xe trong 10 giây.' },
    { id: 'c22', scope: 'solo', text: 'Ứng khẩu 4 câu rap về người bên phải bạn.' },
    { id: 'c23', scope: 'solo', text: 'Catwalk một vòng quanh phòng thật thần thái.' },
    { id: 'c24', scope: 'solo', text: 'Ngồi tựa tường (wall-sit) 30 giây.' },
    { id: 'c25', scope: 'solo', drink: true, text: 'Nhấp một ngụm rồi kể về lần say tệ nhất của bạn.', alt: 'Kể về buổi sáng xấu hổ nhất của bạn.' },
    { id: 'c26', scope: 'all', text: 'Cả bàn tạo dáng — chủ trò chọn dáng đẹp nhất.' },
    { id: 'c27', scope: 'all', text: 'Bình chọn nhanh: ai dễ nổi tiếng nhất? Người thắng phát biểu nhận giải 20 giây.' },
    { id: 'c28', scope: 'all', text: 'Mỗi người nói một từ vần với “party”. Trùng là loại.' },
    { id: 'c29', scope: 'all', text: 'Selfie cả nhóm trong 10 giây — chủ trò chấm dáng.' },
    { id: 'c30', scope: 'all', drink: true, text: 'Cả bàn nâng ly chúc người bên trái mình.', alt: 'Cả bàn dành một lời khen cho người bên trái mình.' },
  ],
};

const FIVE_SECOND_PROMPTS = {
  en: ['Name 3 beer brands', 'Name 3 pizza toppings', 'Name 3 countries in Asia', 'Name 3 superheroes', 'Name 3 things that are yellow', 'Name 3 dog breeds', 'Name 3 board games', 'Name 3 ice-cream flavours', 'Name 3 car brands', 'Name 3 things in a bathroom', 'Name 3 Disney movies', 'Name 3 fruits with seeds', 'Name 3 sports played with a ball', 'Name 3 famous singers', 'Name 3 things you take to the beach', 'Name 3 kitchen tools', 'Name 3 types of pasta', 'Name 3 cocktails', 'Name 3 capital cities', 'Name 3 things that fly', 'Name 3 video games', 'Name 3 reasons to be late', 'Name 3 things that are round', 'Name 3 social networks'],
  vi: ['Kể 3 hãng bia', 'Kể 3 loại topping pizza', 'Kể 3 nước ở châu Á', 'Kể 3 siêu anh hùng', 'Kể 3 thứ màu vàng', 'Kể 3 giống chó', 'Kể 3 trò chơi bàn cờ', 'Kể 3 vị kem', 'Kể 3 hãng xe', 'Kể 3 thứ trong nhà tắm', 'Kể 3 phim Disney', 'Kể 3 loại trái cây có hạt', 'Kể 3 môn thể thao dùng bóng', 'Kể 3 ca sĩ nổi tiếng', 'Kể 3 thứ mang đi biển', 'Kể 3 dụng cụ nhà bếp', 'Kể 3 món bún/phở', 'Kể 3 loại cocktail', 'Kể 3 thủ đô', 'Kể 3 thứ biết bay', 'Kể 3 trò chơi điện tử', 'Kể 3 lý do đi trễ', 'Kể 3 thứ hình tròn', 'Kể 3 mạng xã hội'],
};

const DONT_LAUGH_PROMPTS = {
  en: ['Make them laugh without touching them.', 'Tell your worst joke with a completely straight face.', 'Do an impression of a celebrity.', 'Describe your morning routine like a sports commentator.', 'Sing “Happy Birthday” in a baby voice.', 'Dance like nobody is watching (they are).', 'Explain how to boil water as a dramatic movie trailer.', 'Have a serious conversation with an invisible friend.'],
  vi: ['Làm họ cười mà không được chạm vào.', 'Kể câu đùa nhạt nhất của bạn với mặt nghiêm hết cỡ.', 'Nhại một người nổi tiếng.', 'Mô tả buổi sáng của bạn như bình luận viên bóng đá.', 'Hát “Chúc mừng sinh nhật” bằng giọng em bé.', 'Nhảy như không ai nhìn (nhưng mà có).', 'Giải thích cách đun nước như trailer phim bom tấn.', 'Nói chuyện nghiêm túc với một người bạn vô hình.'],
};

const WORD_CATEGORIES = {
  en: ['Beer brands', 'Animals', 'Countries', 'Fruits', 'Movie titles', 'Things in a kitchen', 'Celebrities', 'Car brands', 'Things at a party', 'Jobs', 'Cities', 'Snacks'],
  vi: ['Hãng bia', 'Động vật', 'Quốc gia', 'Trái cây', 'Tên phim', 'Đồ trong bếp', 'Người nổi tiếng', 'Hãng xe', 'Đồ trong tiệc', 'Nghề nghiệp', 'Thành phố', 'Đồ ăn vặt'],
};
const WORD_LETTERS = 'ABCDGHKLMNPST';
