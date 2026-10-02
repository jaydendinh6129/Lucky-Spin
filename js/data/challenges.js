/* ============================================================
 *  Challenge banks used by Battle, King, Cards and the mini games.
 *  scope: duel (two players head-to-head) · solo (one player) · all (whole table)
 *  drink: drinking content — every such challenge carries an `alt` non-drinking version
 *  and the UI always offers water / food / the alternative instead.
 *  Content takes its cues from the classics: Kings Cup, Truth or Dare,
 *  5 Second Rule, Heads Up!, Charades, Spyfall and Pass the Bomb.
 * ============================================================ */

const CHALLENGES = {
  en: [
    /* ---- duel ---- */
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
    { id: 'c31', scope: 'duel', text: 'Arm wrestle. One round, no mercy.' },
    { id: 'c32', scope: 'duel', text: 'Rap battle: 4 bars each about the other person. The table votes.' },
    { id: 'c33', scope: 'duel', text: 'Who can say “toy boat” 10 times fastest without slipping?' },
    { id: 'c34', scope: 'duel', text: 'Memory duel: look at the table for 10 seconds, then list what’s on it. Most items wins.' },
    { id: 'c35', scope: 'duel', text: 'Name capital cities back and forth. First to repeat or stall loses.' },
    { id: 'c36', scope: 'duel', text: 'Flip a bottle. First to land it upright wins.' },
    { id: 'c37', scope: 'duel', text: 'Hum a song — the other has 15 seconds to guess it. Then swap. Faster guess wins.' },
    { id: 'c38', scope: 'duel', text: 'Whisper challenge: lip-read a sentence from across the room. Closest wins.' },
    { id: 'c39', scope: 'duel', text: 'Keep a straight face while the other tells jokes for 30 seconds. Then swap.' },
    { id: 'c40', scope: 'duel', text: 'Hold your breath. Longest wins.' },
    { id: 'c41', scope: 'duel', text: 'Speed-draw an animal in 15 seconds — the table guesses whose is clearer.' },
    { id: 'c42', scope: 'duel', text: 'Air guitar solo, 15 seconds each. Crowd noise decides.' },
    { id: 'c43', scope: 'duel', text: 'Name brands of sneakers, alternating. First to stall loses.' },
    { id: 'c44', scope: 'duel', text: 'Slow-motion fight scene for 20 seconds. Most dramatic wins.' },
    { id: 'c45', scope: 'duel', text: 'Pose like a statue. First to move loses.' },
    { id: 'c46', scope: 'duel', text: 'Say “I love you” to the other in 5 different accents. Best accent wins.' },
    { id: 'c47', scope: 'duel', text: 'Both describe the same movie without naming it — table guesses which description is better.' },
    { id: 'c48', scope: 'duel', drink: true, text: 'Flip a coin: loser takes a sip.', alt: 'Flip a coin: loser does 5 squats.' },
    /* ---- solo ---- */
    { id: 'c17', scope: 'solo', text: 'Do 10 push-ups in 20 seconds.' },
    { id: 'c18', scope: 'solo', text: 'Sing the chorus of the last song you listened to.' },
    { id: 'c19', scope: 'solo', text: 'Speak in an accent until your next turn.' },
    { id: 'c20', scope: 'solo', text: 'Make the table laugh within 30 seconds.' },
    { id: 'c21', scope: 'solo', text: 'Name 7 car brands in 10 seconds.' },
    { id: 'c22', scope: 'solo', text: 'Improvise 4 lines of rap about the person on your right.' },
    { id: 'c23', scope: 'solo', text: 'Do your best runway walk across the room.' },
    { id: 'c24', scope: 'solo', text: 'Hold a wall-sit for 30 seconds.' },
    { id: 'c25', scope: 'solo', drink: true, text: 'Take a sip and tell the story of your worst hangover.', alt: 'Tell the story of your most embarrassing morning.' },
    { id: 'c49', scope: 'solo', text: 'Say the months of the year backwards in 15 seconds.' },
    { id: 'c50', scope: 'solo', text: 'Do a 20-second impression of the person on your left.' },
    { id: 'c51', scope: 'solo', text: 'Sell the table a random object within reach, infomercial style, 30 seconds.' },
    { id: 'c52', scope: 'solo', text: 'Tell a story using only questions for 30 seconds.' },
    { id: 'c53', scope: 'solo', text: 'Name 10 animals in 10 seconds.' },
    { id: 'c54', scope: 'solo', text: 'Do the robot dance for 15 seconds.' },
    { id: 'c55', scope: 'solo', text: 'Speak only in rhymes until your next turn.' },
    { id: 'c56', scope: 'solo', text: 'Give a dramatic reading of the last text message you received.' },
    { id: 'c57', scope: 'solo', text: 'Spell your full name backwards without writing it down.' },
    { id: 'c58', scope: 'solo', text: 'Make 3 people at the table high-five you within 10 seconds.' },
    { id: 'c59', scope: 'solo', text: 'Act out a sport until the table guesses it — in under 20 seconds.' },
    { id: 'c60', scope: 'solo', text: 'Say a tongue twister 3 times fast: “Red lorry, yellow lorry.”' },
    { id: 'c61', scope: 'solo', text: 'Do your best evil-villain laugh for 10 straight seconds.' },
    { id: 'c62', scope: 'solo', text: 'Compliment every person at the table in under 30 seconds.' },
    { id: 'c63', scope: 'solo', text: 'Balance a spoon on your nose for 10 seconds.' },
    { id: 'c64', scope: 'solo', drink: true, text: 'Make a cocktail-style toast and take a sip.', alt: 'Make a cocktail-style toast with water.' },
    /* ---- all ---- */
    { id: 'c26', scope: 'all', text: 'Everyone strikes a pose — the host picks the best one.' },
    { id: 'c27', scope: 'all', text: 'Quick vote: who is most likely to become famous? The winner gives a 20-second acceptance speech.' },
    { id: 'c28', scope: 'all', text: 'Everyone says a word that rhymes with “party”. Repeats are out.' },
    { id: 'c29', scope: 'all', text: 'Group selfie in 10 seconds — the host judges the pose.' },
    { id: 'c30', scope: 'all', drink: true, text: 'Everyone raises a glass and toasts the person on their left.', alt: 'Everyone gives a compliment to the person on their left.' },
    { id: 'c65', scope: 'all', text: 'Category race: fruits. Go around the table — the first to stall is out.' },
    { id: 'c66', scope: 'all', text: 'Everyone hums the same song at once. Last one to laugh wins.' },
    { id: 'c67', scope: 'all', text: 'Thumb master: when the host puts a thumb on the table, the last to copy loses.' },
    { id: 'c68', scope: 'all', text: 'Everyone points at who they think is the best dancer. Most fingers must dance 15 seconds.' },
    { id: 'c69', scope: 'all', text: 'Rhyme chain: “moon”. Go around — repeats and stalls are out.' },
    { id: 'c70', scope: 'all', text: 'Everyone freezes. First to move loses.' },
    { id: 'c71', scope: 'all', text: 'Count to 10 as a group with no order — two people speak at once and you restart.' },
    { id: 'c72', scope: 'all', text: 'Story chain: one word each. If the story stops making sense, the host picks the culprit.' },
    { id: 'c73', scope: 'all', text: 'Everyone shows their last emoji used. Funniest wins.' },
    { id: 'c74', scope: 'all', text: 'Wave: start a stadium wave around the table — 3 clean laps or everyone loses.' },
    { id: 'c75', scope: 'all', drink: true, text: 'Waterfall: start drinking together; nobody stops until the person on their right stops.', alt: 'Waterfall of claps: keep clapping until the person on your right stops.' },
  ],
  vi: [
    /* ---- duel ---- */
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
    { id: 'c31', scope: 'duel', text: 'Vật tay. Một ván, không nương tay.' },
    { id: 'c32', scope: 'duel', text: 'Rap battle: mỗi người 4 câu về đối phương. Cả bàn chấm.' },
    { id: 'c33', scope: 'duel', text: 'Ai nói “nồi đồng nấu ốc, nồi đất nấu ếch” 5 lần nhanh nhất không vấp?' },
    { id: 'c34', scope: 'duel', text: 'Đấu trí nhớ: nhìn bàn 10 giây rồi kể lại đồ trên bàn. Ai nhớ nhiều hơn thắng.' },
    { id: 'c35', scope: 'duel', text: 'Lần lượt kể tên thủ đô. Ai lặp lại hoặc bí trước thua.' },
    { id: 'c36', scope: 'duel', text: 'Lật chai. Ai dựng đứng được chai trước thắng.' },
    { id: 'c37', scope: 'duel', text: 'Ngân nga một bài — đối phương có 15 giây để đoán. Rồi đổi. Ai đoán nhanh hơn thắng.' },
    { id: 'c38', scope: 'duel', text: 'Đọc khẩu hình: đọc một câu từ bên kia phòng. Ai đoán gần đúng hơn thắng.' },
    { id: 'c39', scope: 'duel', text: 'Giữ mặt lạnh khi đối phương kể chuyện cười 30 giây. Rồi đổi.' },
    { id: 'c40', scope: 'duel', text: 'Nín thở. Ai lâu hơn thắng.' },
    { id: 'c41', scope: 'duel', text: 'Vẽ nhanh một con vật trong 15 giây — cả bàn đoán hình ai rõ hơn.' },
    { id: 'c42', scope: 'duel', text: 'Solo guitar tưởng tượng 15 giây mỗi người. Tiếng hò reo quyết định.' },
    { id: 'c43', scope: 'duel', text: 'Lần lượt kể hãng giày thể thao. Ai bí trước thua.' },
    { id: 'c44', scope: 'duel', text: 'Đánh nhau quay chậm 20 giây. Ai kịch tính hơn thắng.' },
    { id: 'c45', scope: 'duel', text: 'Đứng tượng. Ai nhúc nhích trước thua.' },
    { id: 'c46', scope: 'duel', text: 'Nói “anh yêu em/em yêu anh” bằng 5 giọng vùng miền. Giọng hay nhất thắng.' },
    { id: 'c47', scope: 'duel', text: 'Cùng tả một bộ phim mà không nói tên — cả bàn chọn ai tả hay hơn.' },
    { id: 'c48', scope: 'duel', drink: true, text: 'Tung đồng xu: người thua nhấp một ngụm.', alt: 'Tung đồng xu: người thua squat 5 cái.' },
    /* ---- solo ---- */
    { id: 'c17', scope: 'solo', text: 'Hít đất 10 cái trong 20 giây.' },
    { id: 'c18', scope: 'solo', text: 'Hát điệp khúc bài bạn vừa nghe gần nhất.' },
    { id: 'c19', scope: 'solo', text: 'Nói giọng vùng miền khác cho tới lượt sau.' },
    { id: 'c20', scope: 'solo', text: 'Làm cả bàn cười trong 30 giây.' },
    { id: 'c21', scope: 'solo', text: 'Kể 7 hãng xe trong 10 giây.' },
    { id: 'c22', scope: 'solo', text: 'Ứng khẩu 4 câu rap về người bên phải bạn.' },
    { id: 'c23', scope: 'solo', text: 'Catwalk một vòng quanh phòng thật thần thái.' },
    { id: 'c24', scope: 'solo', text: 'Ngồi tựa tường (wall-sit) 30 giây.' },
    { id: 'c25', scope: 'solo', drink: true, text: 'Nhấp một ngụm rồi kể về lần say tệ nhất của bạn.', alt: 'Kể về buổi sáng xấu hổ nhất của bạn.' },
    { id: 'c49', scope: 'solo', text: 'Đọc ngược 12 tháng trong năm trong 15 giây.' },
    { id: 'c50', scope: 'solo', text: 'Nhại người bên trái bạn trong 20 giây.' },
    { id: 'c51', scope: 'solo', text: 'Bán cho cả bàn một món đồ trong tầm tay, kiểu quảng cáo TV, 30 giây.' },
    { id: 'c52', scope: 'solo', text: 'Kể một câu chuyện chỉ bằng câu hỏi trong 30 giây.' },
    { id: 'c53', scope: 'solo', text: 'Kể 10 con vật trong 10 giây.' },
    { id: 'c54', scope: 'solo', text: 'Nhảy robot 15 giây.' },
    { id: 'c55', scope: 'solo', text: 'Chỉ nói có vần cho tới lượt sau.' },
    { id: 'c56', scope: 'solo', text: 'Đọc tin nhắn gần nhất bạn nhận được như đọc thơ bi tráng.' },
    { id: 'c57', scope: 'solo', text: 'Đánh vần ngược họ tên đầy đủ của bạn, không được viết ra.' },
    { id: 'c58', scope: 'solo', text: 'Lấy được 3 cái đập tay từ cả bàn trong 10 giây.' },
    { id: 'c59', scope: 'solo', text: 'Diễn một môn thể thao cho tới khi cả bàn đoán ra — dưới 20 giây.' },
    { id: 'c60', scope: 'solo', text: 'Nói nhanh 3 lần: “Buổi trưa ăn bưởi chua.”' },
    { id: 'c61', scope: 'solo', text: 'Cười như phản diện trong 10 giây liên tục.' },
    { id: 'c62', scope: 'solo', text: 'Khen từng người ở bàn trong vòng 30 giây.' },
    { id: 'c63', scope: 'solo', text: 'Giữ thăng bằng cái thìa trên mũi 10 giây.' },
    { id: 'c64', scope: 'solo', drink: true, text: 'Nói một lời chúc kiểu quán bar rồi nhấp một ngụm.', alt: 'Nói một lời chúc kiểu quán bar với ly nước.' },
    /* ---- all ---- */
    { id: 'c26', scope: 'all', text: 'Cả bàn tạo dáng — chủ trò chọn dáng đẹp nhất.' },
    { id: 'c27', scope: 'all', text: 'Bình chọn nhanh: ai dễ nổi tiếng nhất? Người thắng phát biểu nhận giải 20 giây.' },
    { id: 'c28', scope: 'all', text: 'Mỗi người nói một từ vần với “party”. Trùng là loại.' },
    { id: 'c29', scope: 'all', text: 'Selfie cả nhóm trong 10 giây — chủ trò chấm dáng.' },
    { id: 'c30', scope: 'all', drink: true, text: 'Cả bàn nâng ly chúc người bên trái mình.', alt: 'Cả bàn dành một lời khen cho người bên trái mình.' },
    { id: 'c65', scope: 'all', text: 'Đua chủ đề: trái cây. Đi vòng bàn — ai bí trước bị loại.' },
    { id: 'c66', scope: 'all', text: 'Cả bàn cùng ngân nga một bài. Ai cười cuối cùng thắng.' },
    { id: 'c67', scope: 'all', text: 'Ngón cái: khi chủ trò đặt ngón cái lên bàn, ai bắt chước cuối cùng thua.' },
    { id: 'c68', scope: 'all', text: 'Mỗi người chỉ vào người nhảy đẹp nhất. Ai nhiều ngón tay nhất phải nhảy 15 giây.' },
    { id: 'c69', scope: 'all', text: 'Chuỗi vần: “trăng”. Đi vòng bàn — lặp lại hoặc bí là loại.' },
    { id: 'c70', scope: 'all', text: 'Cả bàn đứng hình. Ai nhúc nhích trước thua.' },
    { id: 'c71', scope: 'all', text: 'Cả nhóm đếm tới 10 không theo thứ tự — hai người nói cùng lúc là đếm lại.' },
    { id: 'c72', scope: 'all', text: 'Kể chuyện nối: mỗi người một từ. Chuyện vô nghĩa thì chủ trò chọn thủ phạm.' },
    { id: 'c73', scope: 'all', text: 'Mỗi người cho xem emoji dùng gần nhất. Buồn cười nhất thắng.' },
    { id: 'c74', scope: 'all', text: 'Sóng sân vận động quanh bàn — 3 vòng sạch, không thì cả bàn thua.' },
    { id: 'c75', scope: 'all', drink: true, text: 'Thác nước: cùng uống; không ai được dừng cho tới khi người bên phải mình dừng.', alt: 'Thác vỗ tay: vỗ tay liên tục cho tới khi người bên phải mình dừng.' },
  ],
};

const FIVE_SECOND_PROMPTS = {
  en: ['Name 3 beer brands', 'Name 3 pizza toppings', 'Name 3 countries in Asia', 'Name 3 superheroes', 'Name 3 things that are yellow', 'Name 3 dog breeds', 'Name 3 board games', 'Name 3 ice-cream flavours', 'Name 3 car brands', 'Name 3 things in a bathroom', 'Name 3 Disney movies', 'Name 3 fruits with seeds', 'Name 3 sports played with a ball', 'Name 3 famous singers', 'Name 3 things you take to the beach', 'Name 3 kitchen tools', 'Name 3 types of pasta', 'Name 3 cocktails', 'Name 3 capital cities', 'Name 3 things that fly', 'Name 3 video games', 'Name 3 reasons to be late', 'Name 3 things that are round', 'Name 3 social networks',
    'Name 3 things in a fridge', 'Name 3 Olympic sports', 'Name 3 things with wheels', 'Name 3 famous paintings', 'Name 3 things that are cold', 'Name 3 musical instruments', 'Name 3 planets', 'Name 3 things you wear on your feet', 'Name 3 K-pop groups', 'Name 3 things a cat does', 'Name 3 breakfast foods', 'Name 3 TV series', 'Name 3 things in a pencil case', 'Name 3 ways to say hello', 'Name 3 things that smell good', 'Name 3 jobs with uniforms', 'Name 3 things made of wood', 'Name 3 holidays', 'Name 3 things you do at a wedding', 'Name 3 airlines', 'Name 3 things in space', 'Name 3 ocean animals', 'Name 3 excuses for not texting back', 'Name 3 things that are sticky', 'Name 3 Marvel characters', 'Name 3 types of noodles', 'Name 3 things in a hotel room', 'Name 3 phone apps', 'Name 3 things that are loud', 'Name 3 desserts', 'Name 3 famous footballers', 'Name 3 things you can’t live without', 'Name 3 colours of the rainbow', 'Name 3 things at a birthday party', 'Name 3 words that rhyme with “cat”', 'Name 3 things you lose all the time'],
  vi: ['Kể 3 hãng bia', 'Kể 3 loại topping pizza', 'Kể 3 nước ở châu Á', 'Kể 3 siêu anh hùng', 'Kể 3 thứ màu vàng', 'Kể 3 giống chó', 'Kể 3 trò chơi bàn cờ', 'Kể 3 vị kem', 'Kể 3 hãng xe', 'Kể 3 thứ trong nhà tắm', 'Kể 3 phim Disney', 'Kể 3 loại trái cây có hạt', 'Kể 3 môn thể thao dùng bóng', 'Kể 3 ca sĩ nổi tiếng', 'Kể 3 thứ mang đi biển', 'Kể 3 dụng cụ nhà bếp', 'Kể 3 món bún/phở', 'Kể 3 loại cocktail', 'Kể 3 thủ đô', 'Kể 3 thứ biết bay', 'Kể 3 trò chơi điện tử', 'Kể 3 lý do đi trễ', 'Kể 3 thứ hình tròn', 'Kể 3 mạng xã hội',
    'Kể 3 thứ trong tủ lạnh', 'Kể 3 môn Olympic', 'Kể 3 thứ có bánh xe', 'Kể 3 bức tranh nổi tiếng', 'Kể 3 thứ lạnh', 'Kể 3 nhạc cụ', 'Kể 3 hành tinh', 'Kể 3 thứ mang ở chân', 'Kể 3 nhóm nhạc K-pop', 'Kể 3 việc con mèo hay làm', 'Kể 3 món ăn sáng', 'Kể 3 bộ phim truyền hình', 'Kể 3 thứ trong hộp bút', 'Kể 3 cách chào hỏi', 'Kể 3 thứ có mùi thơm', 'Kể 3 nghề mặc đồng phục', 'Kể 3 thứ làm bằng gỗ', 'Kể 3 ngày lễ', 'Kể 3 việc làm ở đám cưới', 'Kể 3 hãng hàng không', 'Kể 3 thứ ngoài vũ trụ', 'Kể 3 loài vật dưới biển', 'Kể 3 lý do không nhắn tin lại', 'Kể 3 thứ dính dính', 'Kể 3 nhân vật Marvel', 'Kể 3 loại mì', 'Kể 3 thứ trong phòng khách sạn', 'Kể 3 ứng dụng điện thoại', 'Kể 3 thứ gây ồn', 'Kể 3 món tráng miệng', 'Kể 3 cầu thủ nổi tiếng', 'Kể 3 thứ không thể sống thiếu', 'Kể 3 màu cầu vồng', 'Kể 3 thứ ở tiệc sinh nhật', 'Kể 3 từ vần với “mèo”', 'Kể 3 thứ bạn hay làm mất'],
};

const DONT_LAUGH_PROMPTS = {
  en: ['Make them laugh without touching them.', 'Tell your worst joke with a completely straight face.', 'Do an impression of a celebrity.', 'Describe your morning routine like a sports commentator.', 'Sing “Happy Birthday” in a baby voice.', 'Dance like nobody is watching (they are).', 'Explain how to boil water as a dramatic movie trailer.', 'Have a serious conversation with an invisible friend.',
    'Order a pizza as an opera singer.', 'Read the room’s Wi-Fi password like a love poem.', 'Narrate the judge’s life like a nature documentary.', 'Do a weather report for the inside of this room.', 'Speak only in slow motion for 30 seconds.', 'Pretend you’re a cat who has just discovered the judge.', 'Give a TED talk about why socks disappear.', 'Make the sound of 5 different animals, blending them into one.', 'Propose to the judge in the most awkward way possible.', 'Act like you’re stuck in an invisible box — then the box starts shrinking.', 'Be a robot that is slowly running out of battery.', 'Describe a sandwich as if it were a crime scene.', 'Imitate a GPS that is very passive-aggressive.', 'Perform a cooking show with no ingredients.', 'Be a sports mascot at a funeral.', 'Whisper a motivational speech.'],
  vi: ['Làm họ cười mà không được chạm vào.', 'Kể câu đùa nhạt nhất của bạn với mặt nghiêm hết cỡ.', 'Nhại một người nổi tiếng.', 'Mô tả buổi sáng của bạn như bình luận viên bóng đá.', 'Hát “Chúc mừng sinh nhật” bằng giọng em bé.', 'Nhảy như không ai nhìn (nhưng mà có).', 'Giải thích cách đun nước như trailer phim bom tấn.', 'Nói chuyện nghiêm túc với một người bạn vô hình.',
    'Gọi pizza bằng giọng opera.', 'Đọc mật khẩu Wi-Fi như đọc thơ tình.', 'Thuyết minh cuộc đời giám khảo như phim tài liệu thiên nhiên.', 'Dự báo thời tiết cho bên trong căn phòng này.', 'Nói chuyện quay chậm trong 30 giây.', 'Giả làm con mèo vừa phát hiện ra giám khảo.', 'Diễn thuyết TED về lý do tất hay biến mất.', 'Kêu tiếng 5 con vật rồi trộn thành một.', 'Cầu hôn giám khảo theo cách ngượng nhất có thể.', 'Diễn bị kẹt trong hộp vô hình — rồi cái hộp co lại.', 'Làm robot sắp hết pin.', 'Tả cái bánh mì như hiện trường vụ án.', 'Nhại giọng chỉ đường GPS rất khó ở.', 'Dẫn chương trình nấu ăn không có nguyên liệu.', 'Làm linh vật thể thao ở đám tang.', 'Thì thầm một bài diễn văn truyền động lực.'],
};

const WORD_CATEGORIES = {
  en: ['Beer brands', 'Animals', 'Countries', 'Fruits', 'Movie titles', 'Things in a kitchen', 'Celebrities', 'Car brands', 'Things at a party', 'Jobs', 'Cities', 'Snacks', 'Sports', 'Body parts', 'Song titles', 'Clothing', 'Things that are green', 'Cartoon characters', 'Vegetables', 'Drinks', 'Things in a school', 'Superpowers', 'Board games', 'Things in the sky'],
  vi: ['Hãng bia', 'Động vật', 'Quốc gia', 'Trái cây', 'Tên phim', 'Đồ trong bếp', 'Người nổi tiếng', 'Hãng xe', 'Đồ trong tiệc', 'Nghề nghiệp', 'Thành phố', 'Đồ ăn vặt', 'Môn thể thao', 'Bộ phận cơ thể', 'Tên bài hát', 'Quần áo', 'Thứ màu xanh lá', 'Nhân vật hoạt hình', 'Rau củ', 'Đồ uống', 'Đồ trong trường học', 'Siêu năng lực', 'Trò chơi bàn cờ', 'Thứ trên bầu trời'],
};
const WORD_LETTERS = 'ABCDGHKLMNPST';

/* ---------- Charades / Heads Up! ---------- */
/* Act it out or describe it — the team guesses before the clock runs out. */
const CHARADES_DECKS = {
  en: {
    animals:  { icon: '🦁', title: 'Animals',   words: ['Elephant', 'Penguin', 'Kangaroo', 'Octopus', 'Giraffe', 'Monkey', 'Snake', 'Flamingo', 'Crab', 'Sloth', 'Shark', 'Rooster', 'Butterfly', 'Gorilla', 'Mosquito', 'Hamster', 'Peacock', 'T-Rex', 'Owl', 'Frog'] },
    actions:  { icon: '🏃', title: 'Actions',   words: ['Brushing teeth', 'Fishing', 'Skateboarding', 'Taking a selfie', 'Milking a cow', 'Juggling', 'Proposing', 'Sneezing', 'Parallel parking', 'Surfing', 'Ironing', 'Changing a diaper', 'Playing drums', 'Bowling', 'Yoga', 'Arm wrestling', 'Making pizza', 'Karaoke', 'Texting while walking', 'Waking up late'] },
    movies:   { icon: '🎬', title: 'Movies',    words: ['Titanic', 'Frozen', 'Jaws', 'Spider-Man', 'The Lion King', 'Harry Potter', 'Jurassic Park', 'Toy Story', 'Rocky', 'Avatar', 'Finding Nemo', 'Star Wars', 'The Matrix', 'Minions', 'Pirates of the Caribbean', 'Ghostbusters', 'Shrek', 'Mission: Impossible', 'Up', 'Fast & Furious'] },
    jobs:     { icon: '👩‍🚒', title: 'Jobs',      words: ['Firefighter', 'Dentist', 'Chef', 'Pilot', 'Hairdresser', 'Magician', 'Lifeguard', 'DJ', 'Farmer', 'Surgeon', 'Barista', 'Taxi driver', 'Astronaut', 'Photographer', 'Teacher', 'Plumber', 'Referee', 'Waiter', 'Zookeeper', 'YouTuber'] },
    things:   { icon: '🪑', title: 'Things',    words: ['Umbrella', 'Toothbrush', 'Microwave', 'Trampoline', 'Vacuum cleaner', 'Guitar', 'Helmet', 'Hammock', 'Blender', 'Ladder', 'Scissors', 'Treadmill', 'Candle', 'Backpack', 'Mirror', 'Wheelbarrow', 'Telescope', 'Tent', 'Lipstick', 'Drone'] },
  },
  vi: {
    animals:  { icon: '🦁', title: 'Động vật',  words: ['Con voi', 'Chim cánh cụt', 'Kangaroo', 'Bạch tuộc', 'Hươu cao cổ', 'Con khỉ', 'Con rắn', 'Hồng hạc', 'Con cua', 'Con lười', 'Cá mập', 'Con gà trống', 'Con bướm', 'Khỉ đột', 'Con muỗi', 'Chuột hamster', 'Con công', 'Khủng long T-Rex', 'Con cú', 'Con ếch'] },
    actions:  { icon: '🏃', title: 'Hành động', words: ['Đánh răng', 'Câu cá', 'Trượt ván', 'Chụp selfie', 'Vắt sữa bò', 'Tung hứng', 'Cầu hôn', 'Hắt xì', 'Đỗ xe song song', 'Lướt sóng', 'Ủi đồ', 'Thay tã', 'Đánh trống', 'Chơi bowling', 'Tập yoga', 'Vật tay', 'Làm pizza', 'Hát karaoke', 'Vừa đi vừa nhắn tin', 'Ngủ dậy muộn'] },
    movies:   { icon: '🎬', title: 'Phim',      words: ['Titanic', 'Frozen', 'Hàm cá mập', 'Người Nhện', 'Vua Sư Tử', 'Harry Potter', 'Công viên kỷ Jura', 'Câu chuyện đồ chơi', 'Rocky', 'Avatar', 'Đi tìm Nemo', 'Star Wars', 'Ma trận', 'Minions', 'Cướp biển Caribbean', 'Biệt đội săn ma', 'Shrek', 'Nhiệm vụ bất khả thi', 'Vút bay', 'Quá nhanh quá nguy hiểm'] },
    jobs:     { icon: '👩‍🚒', title: 'Nghề',      words: ['Lính cứu hoả', 'Nha sĩ', 'Đầu bếp', 'Phi công', 'Thợ làm tóc', 'Ảo thuật gia', 'Cứu hộ bãi biển', 'DJ', 'Nông dân', 'Bác sĩ phẫu thuật', 'Pha chế cà phê', 'Tài xế taxi', 'Phi hành gia', 'Nhiếp ảnh gia', 'Giáo viên', 'Thợ sửa ống nước', 'Trọng tài', 'Phục vụ bàn', 'Nhân viên sở thú', 'YouTuber'] },
    things:   { icon: '🪑', title: 'Đồ vật',    words: ['Cái ô', 'Bàn chải đánh răng', 'Lò vi sóng', 'Bạt nhún', 'Máy hút bụi', 'Đàn guitar', 'Mũ bảo hiểm', 'Võng', 'Máy xay sinh tố', 'Cái thang', 'Cái kéo', 'Máy chạy bộ', 'Cây nến', 'Ba lô', 'Cái gương', 'Xe cút kít', 'Kính thiên văn', 'Lều', 'Son môi', 'Drone'] },
  },
};

/* ---------- Imposter (Spyfall-style) ---------- */
/* Everyone sees the secret word except the imposter, who only sees the category. */
const IMPOSTER_WORDS = {
  en: [
    { category: 'Place', words: ['Beach', 'Hospital', 'Casino', 'Airport', 'School', 'Cinema', 'Supermarket', 'Gym', 'Zoo', 'Space station', 'Wedding', 'Submarine', 'Prison', 'Night club', 'Library', 'Pirate ship'] },
    { category: 'Food', words: ['Pizza', 'Sushi', 'Phở', 'Burger', 'Ice cream', 'Spring roll', 'Pancake', 'Hotpot', 'Taco', 'Fried chicken', 'Salad', 'Chocolate'] },
    { category: 'Animal', words: ['Elephant', 'Cat', 'Shark', 'Penguin', 'Snake', 'Chicken', 'Dolphin', 'Tiger', 'Cockroach', 'Horse', 'Goldfish', 'Bee'] },
    { category: 'Job', words: ['Doctor', 'Chef', 'Pilot', 'Police officer', 'Singer', 'Teacher', 'Programmer', 'Farmer', 'Actor', 'Dentist', 'Lawyer', 'Barista'] },
    { category: 'Object', words: ['Phone', 'Umbrella', 'Toilet', 'Guitar', 'Fridge', 'Bicycle', 'Pillow', 'Mirror', 'Key', 'Candle', 'Hammer', 'Camera'] },
    { category: 'Celebrity type', words: ['Footballer', 'K-pop idol', 'Movie star', 'YouTuber', 'Rapper', 'Politician', 'Chef on TV', 'Model', 'Comedian', 'Astronaut'] },
  ],
  vi: [
    { category: 'Địa điểm', words: ['Bãi biển', 'Bệnh viện', 'Sòng bạc', 'Sân bay', 'Trường học', 'Rạp phim', 'Siêu thị', 'Phòng gym', 'Sở thú', 'Trạm vũ trụ', 'Đám cưới', 'Tàu ngầm', 'Nhà tù', 'Quán bar', 'Thư viện', 'Tàu cướp biển'] },
    { category: 'Món ăn', words: ['Pizza', 'Sushi', 'Phở', 'Bánh mì', 'Kem', 'Gỏi cuốn', 'Bánh xèo', 'Lẩu', 'Bún đậu mắm tôm', 'Gà rán', 'Bánh tráng trộn', 'Sô-cô-la'] },
    { category: 'Con vật', words: ['Con voi', 'Con mèo', 'Cá mập', 'Chim cánh cụt', 'Con rắn', 'Con gà', 'Cá heo', 'Con hổ', 'Con gián', 'Con ngựa', 'Cá vàng', 'Con ong'] },
    { category: 'Nghề nghiệp', words: ['Bác sĩ', 'Đầu bếp', 'Phi công', 'Công an', 'Ca sĩ', 'Giáo viên', 'Lập trình viên', 'Nông dân', 'Diễn viên', 'Nha sĩ', 'Luật sư', 'Pha chế'] },
    { category: 'Đồ vật', words: ['Điện thoại', 'Cái ô', 'Bồn cầu', 'Đàn guitar', 'Tủ lạnh', 'Xe đạp', 'Cái gối', 'Cái gương', 'Chìa khoá', 'Cây nến', 'Cái búa', 'Máy ảnh'] },
    { category: 'Kiểu người nổi tiếng', words: ['Cầu thủ', 'Idol K-pop', 'Ngôi sao điện ảnh', 'YouTuber', 'Rapper', 'Chính trị gia', 'Đầu bếp trên TV', 'Người mẫu', 'Danh hài', 'Phi hành gia'] },
  ],
};

/* ---------- Pass the Bomb ---------- */
/* Say something in the category, pass the phone. Whoever holds it when it blows… */
const BOMB_CATEGORIES = {
  en: ['Pizza toppings', 'Countries in Europe', 'Things in a bathroom', 'Car brands', 'Cartoon characters', 'Fruits', 'Things that are red', 'Movie villains', 'Sports', 'Famous singers', 'Things you find at the beach', 'Dog breeds', 'Fast-food chains', 'Board games', 'Things in a classroom', 'Superheroes', 'Vegetables', 'Musical instruments', 'Things that fly', 'Capital cities', 'Phone apps', 'Breakfast foods', 'Jobs', 'Things that are cold', 'Famous brands', 'TV shows', 'Things in a hospital', 'Reasons to be late', 'Ice-cream flavours', 'Things you do on holiday', 'Words that rhyme with “night”', 'Things in a toolbox', 'Olympic sports', 'Kitchen appliances', 'Things that are soft', 'Candy and sweets', 'Zoo animals', 'Clothing brands', 'Things at a wedding', 'Video games'],
  vi: ['Topping pizza', 'Nước ở châu Âu', 'Đồ trong nhà tắm', 'Hãng xe', 'Nhân vật hoạt hình', 'Trái cây', 'Thứ màu đỏ', 'Phản diện trong phim', 'Môn thể thao', 'Ca sĩ nổi tiếng', 'Thứ ở bãi biển', 'Giống chó', 'Chuỗi đồ ăn nhanh', 'Trò chơi bàn cờ', 'Đồ trong lớp học', 'Siêu anh hùng', 'Rau củ', 'Nhạc cụ', 'Thứ biết bay', 'Thủ đô', 'Ứng dụng điện thoại', 'Món ăn sáng', 'Nghề nghiệp', 'Thứ lạnh', 'Thương hiệu nổi tiếng', 'Chương trình TV', 'Đồ trong bệnh viện', 'Lý do đi trễ', 'Vị kem', 'Việc làm khi đi du lịch', 'Từ vần với “đêm”', 'Đồ trong hộp dụng cụ', 'Môn Olympic', 'Đồ điện nhà bếp', 'Thứ mềm mềm', 'Kẹo bánh', 'Thú trong sở thú', 'Hãng thời trang', 'Thứ ở đám cưới', 'Trò chơi điện tử'],
};
