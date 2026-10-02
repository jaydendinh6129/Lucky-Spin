/* ============================================================
 *  Game registry — every playable thing in the app, with its metadata and plan.
 *  Sidebar, ⓘ popovers, entitlements and the game host are all driven by this.
 *  Depth is always: mode → game/theme → play.
 * ============================================================ */

const GAME_REGISTRY = {
  spinner: {
    id: 'spinner', icon: '🎯', accent: '#FFD93D', type: 'themes',
    games: Object.fromEntries(Object.values(THEMES).map((th) => [th.key, {
      id: th.key, icon: th.icon, plan: th.plan || (th.free ? 'free' : 'pro'), component: 'spinner',
      players: [1, 100], duration: '∞', scoring: 'none', difficulty: 'easy',
    }])),
  },
  battle: {
    id: 'battle', icon: '⚔️', accent: '#f87171', type: 'games',
    games: {
      'quick-battle':       { id: 'quick-battle', icon: '⚡', plan: 'free', component: 'battle', variant: 'quick', players: [2, 2], duration: '1–3 min', scoring: 'points', difficulty: 'easy' },
      'best-of-3':          { id: 'best-of-3', icon: '🏆', plan: 'pro', component: 'battle', variant: 'bo3', players: [2, 2], duration: '3–5 min', scoring: 'points', difficulty: 'easy' },
      'streak-battle':      { id: 'streak-battle', icon: '🔥', plan: 'pro', component: 'battle', variant: 'streak', players: [2, 12], duration: '5–10 min', scoring: 'streak', difficulty: 'medium' },
      'team-battle':        { id: 'team-battle', icon: '👥', plan: 'pro', component: 'battle', variant: 'team', players: [4, 12], duration: '5–10 min', scoring: 'points', difficulty: 'medium' },
      'elimination-battle': { id: 'elimination-battle', icon: '💀', plan: 'pro', component: 'battle', variant: 'elimination', players: [3, 12], duration: '5–10 min', scoring: 'elimination', difficulty: 'medium' },
    },
  },
  king: {
    id: 'king', icon: '👑', accent: '#fbbf24', type: 'games',
    games: {
      'classic-king':   { id: 'classic-king', icon: '👑', plan: 'pro', component: 'king', variant: 'classic', players: [3, 12], duration: '5–10 min', scoring: 'points', difficulty: 'easy' },
      'king-challenge': { id: 'king-challenge', icon: '⚔️', plan: 'pro', component: 'king', variant: 'challenge', players: [3, 12], duration: '5–10 min', scoring: 'points', difficulty: 'medium' },
      'last-king':      { id: 'last-king', icon: '💀', plan: 'pro', component: 'king', variant: 'last', players: [3, 12], duration: '5–15 min', scoring: 'elimination', difficulty: 'hard' },
    },
  },
  /* Quiz items are generated from the quiz theme registry (js/quiz/quizEngine.js + js/data/quiz/*) */
  quiz: {
    id: 'quiz', icon: '🧠', accent: '#60a5fa', type: 'games',
    games: Object.fromEntries(QUIZ_THEMES.map((th) => [`quiz-${th.id}`, {
      id: `quiz-${th.id}`, icon: th.icon, plan: th.plan, component: 'quiz', quizTheme: th.id,
      players: [1, 12], duration: '5 min', scoring: 'points', difficulty: th.difficulty,
    }])),
  },
  minigames: {
    id: 'minigames', icon: '🎲', accent: '#34d399', type: 'games',
    games: {
      rps:           { id: 'rps', icon: '✋', plan: 'free', component: 'rps', players: [2, 2], duration: '2 min', scoring: 'points', difficulty: 'easy' },
      'five-second': { id: 'five-second', icon: '⏱️', plan: 'free', component: 'fiveSecond', players: [1, 12], duration: '3–5 min', scoring: 'streak', difficulty: 'medium' },
      'dont-laugh':  { id: 'dont-laugh', icon: '😂', plan: 'free', component: 'dontLaugh', players: [2, 2], duration: '3 min', scoring: 'points', difficulty: 'easy' },
      reaction:      { id: 'reaction', icon: '⚡', plan: 'pro', component: 'reaction', players: [1, 12], duration: '2 min', scoring: 'time', difficulty: 'easy' },
      memory:        { id: 'memory', icon: '🧠', plan: 'pro', component: 'memory', players: [1, 8], duration: '2–4 min', scoring: 'time', difficulty: 'medium' },
      word:          { id: 'word', icon: '🔤', plan: 'pro', component: 'word', players: [1, 12], duration: '3–5 min', scoring: 'streak', difficulty: 'medium' },
    },
  },
  cards: {
    id: 'cards', icon: '🃏', accent: '#c084fc', type: 'games',
    games: {
      'challenge-cards': { id: 'challenge-cards', icon: '🎯', plan: 'pro', component: 'cards', deck: 'challenge', players: [1, 12], duration: '5–10 min', scoring: 'points', difficulty: 'easy' },
      'truth-cards':     { id: 'truth-cards', icon: '❓', plan: 'pro', component: 'cards', deck: 'truth', players: [1, 12], duration: '5–10 min', scoring: 'points', difficulty: 'easy' },
      'dare-cards':      { id: 'dare-cards', icon: '😈', plan: 'pro', component: 'cards', deck: 'dare', players: [1, 12], duration: '5–10 min', scoring: 'points', difficulty: 'medium' },
      'wild-cards':      { id: 'wild-cards', icon: '🃏', plan: 'pro', component: 'cards', deck: 'wild', players: [2, 12], duration: '10 min', scoring: 'points', difficulty: 'medium' },
      'chaos-cards':     { id: 'chaos-cards', icon: '💣', plan: 'pro', component: 'cards', deck: 'chaos', players: [3, 12], duration: '10 min', scoring: 'points', difficulty: 'hard' },
    },
  },
};

const GAME_MODES = Object.values(GAME_REGISTRY).map((m) => ({ ...m, items: Object.values(m.games) }));
const findGame = (modeId, itemId) => {
  const mode = GAME_REGISTRY[modeId];
  const item = mode && mode.games[itemId];
  return mode && item ? { mode, item } : null;
};

const MODE_TEXT = {
  en: {
    spinner:   { title: 'Spinner',           desc: 'Spin the wheel' },
    battle:    { title: 'Battle',            desc: 'Challenge each other' },
    king:      { title: 'King of the Table', desc: 'Winner stays' },
    quiz:      { title: 'Quiz',              desc: 'Test your knowledge' },
    minigames: { title: 'Mini Games',        desc: 'Quick party games' },
    cards:     { title: 'Cards',             desc: 'Draw your fate' },
  },
  vi: {
    spinner:   { title: 'Vòng quay',    desc: 'Quay là trúng' },
    battle:    { title: 'Đấu tay đôi',  desc: 'Thách đấu nhau' },
    king:      { title: 'Vua bàn nhậu', desc: 'Thắng thì ở lại' },
    quiz:      { title: 'Đố vui',       desc: 'Thử kiến thức' },
    minigames: { title: 'Trò chơi nhỏ', desc: 'Chơi nhanh gọn' },
    cards:     { title: 'Bốc bài',      desc: 'Rút lá số phận' },
  },
};

/* title / description / howToPlay for every game. Themes reuse THEME_TEXT plus the spinner how-to. */
const QUIZ_HOWTO = {
  en: 'Pick a theme, Party or Classroom rules and a difficulty. Pass the phone around (or play as teams) — each question goes to the next player. Party: 15 s and a speed bonus up to +50. Classroom: 25 s, no speed bonus, child-friendly questions only.',
  vi: 'Chọn chủ đề, luật Tiệc hoặc Lớp học và độ khó. Chuyền điện thoại (hoặc chơi theo đội) — mỗi câu tới lượt người kế tiếp. Tiệc: 15 giây, thưởng tốc độ tới +50. Lớp học: 25 giây, không thưởng tốc độ, chỉ câu hỏi phù hợp trẻ em.',
};
const GAME_META_TEXT = {
  en: {
    'quick-battle':       { title: 'Quick Battle', description: 'Two players compete in one quick challenge.', howToPlay: 'Pick two players and a format (best of 1, 3 or 5). Every round shows a challenge — the host taps who won it. First to enough round wins takes the battle.' },
    'best-of-3':          { title: 'Best of 3', description: 'Head-to-head. First to 2 round wins.', howToPlay: 'Two players, up to three rounds. Win two rounds and the battle ends instantly.' },
    'streak-battle':      { title: 'Streak Battle', description: 'Take turns and keep your streak alive.', howToPlay: 'Players take turns completing challenges. Success adds +1 to your streak, a fail resets it to 0. Hit the streak goal for a special celebration.' },
    'team-battle':        { title: 'Team Battle', description: 'Red vs Blue — teams score together.', howToPlay: 'Split into two teams. Each round a challenge calls on one player per team or the whole team; the host awards the point to the winning team.' },
    'elimination-battle': { title: 'Elimination Battle', description: 'Lose a duel and you’re out.', howToPlay: 'Players are paired up each round. The loser of a duel is eliminated; the last one standing wins.' },
    'classic-king':       { title: 'Classic King', description: 'Winner stays on the throne.', howToPlay: 'A random player starts as King. Each round a challenger faces the King and the host taps the winner — the winner holds the throne. Defenses and the longest reign are tracked.' },
    'king-challenge':     { title: 'King Challenge', description: 'The challenger picks the weapon.', howToPlay: 'Like Classic King, but the challenger chooses one of three challenges before facing the King.' },
    'last-king':          { title: 'Last King Standing', description: 'Lose to the King and you’re out.', howToPlay: 'Challengers who lose are eliminated. The King who outlasts everyone rules the night.' },
    'quiz-general':       { title: 'General Knowledge', description: 'A bit of everything.', howToPlay: QUIZ_HOWTO.en },
    'quiz-beer':          { title: 'Beer & Drinks', description: 'Beer, cocktails and bar trivia.', howToPlay: QUIZ_HOWTO.en },
    'quiz-music':         { title: 'Music', description: 'Artists, hits and instruments.', howToPlay: QUIZ_HOWTO.en },
    'quiz-movies':        { title: 'Movies', description: 'Films, actors and famous lines.', howToPlay: QUIZ_HOWTO.en },
    'quiz-sports':        { title: 'Sports', description: 'Rules, records and legends.', howToPlay: QUIZ_HOWTO.en },
    'quiz-random':        { title: 'Random Quiz', description: 'Questions from every category.', howToPlay: QUIZ_HOWTO.en },
    rps:                  { title: 'Rock Paper Scissors', description: 'The classic — first to 3.', howToPlay: 'Both players secretly pick on the same phone, then reveal together. Rock beats scissors, scissors beat paper, paper beats rock. Ties replay the round.' },
    'five-second':        { title: '5 Second Rule', description: 'Name 3 things before the buzzer.', howToPlay: 'Each turn shows a category. Name three things in 5 seconds; the host taps Success or Failed. Streaks are tracked.' },
    'dont-laugh':         { title: 'Don’t Laugh', description: 'Make them laugh. Or don’t.', howToPlay: 'One player performs, the other judges with a straight face for 30 seconds. If the judge laughs the performer wins the round; survive and the judge wins. Roles swap every round.' },
    reaction:             { title: 'Reaction Test', description: 'Tap the instant it turns green.', howToPlay: 'Wait for GO! and tap as fast as you can — tap early and it’s a false start. Three attempts each; the fastest time wins.' },
    memory:               { title: 'Memory', description: 'Find all the pairs.', howToPlay: 'Cards show their symbols for a moment, then hide. Match every pair in as few attempts as possible. Easy, medium and hard grids.' },
    word:                 { title: 'Word Challenge', description: 'A category, a letter, 10 seconds.', howToPlay: 'Say something in the category that starts with the letter before time runs out. The host confirms. Streaks are tracked.' },
    'challenge-cards':    { title: 'Challenge Cards', description: 'Draw a card, do the challenge.', howToPlay: 'Players take turns drawing. Complete the card for a point or skip it.' },
    'truth-cards':        { title: 'Truth Cards', description: 'Honest answers only.', howToPlay: 'Draw a truth and answer it. Points for the brave.' },
    'dare-cards':         { title: 'Dare Cards', description: 'Dares that keep the party moving.', howToPlay: 'Draw a dare and do it — or skip. Points for the brave.' },
    'wild-cards':         { title: 'Wild Cards', description: 'Cards that bend the rules.', howToPlay: 'Challenges mixed with wild cards: extra turns, shields, targets, switches and double points. Effects really apply.' },
    'chaos-cards':        { title: 'Chaos Cards', description: 'Everyone is affected.', howToPlay: 'Challenges mixed with chaos cards that hit the whole table: everyone plays, seats swap, order reverses, double rounds and random targets.' },
  },
  vi: {
    'quick-battle':       { title: 'Đấu nhanh', description: 'Hai người, một thử thách chớp nhoáng.', howToPlay: 'Chọn 2 người chơi và thể thức (1, 3 hoặc 5 ván). Mỗi ván hiện một thử thách — chủ trò bấm ai thắng. Ai đủ số ván thắng trước là thắng.' },
    'best-of-3':          { title: 'Thắng 2 trên 3', description: 'Đối đầu, ai thắng 2 ván trước.', howToPlay: 'Hai người, tối đa 3 ván. Thắng 2 ván là kết thúc ngay.' },
    'streak-battle':      { title: 'Chuỗi thắng', description: 'Lần lượt chơi, giữ chuỗi càng dài càng tốt.', howToPlay: 'Người chơi lần lượt làm thử thách. Thành công +1 chuỗi, thất bại về 0. Đạt mốc chuỗi sẽ có màn ăn mừng đặc biệt.' },
    'team-battle':        { title: 'Đấu đội', description: 'Đỏ đấu Xanh — ghi điểm theo đội.', howToPlay: 'Chia hai đội. Mỗi ván thử thách gọi một người mỗi đội hoặc cả đội; chủ trò trao điểm cho đội thắng.' },
    'elimination-battle': { title: 'Đấu loại trừ', description: 'Thua một trận là bị loại.', howToPlay: 'Mỗi ván ghép cặp người chơi. Người thua bị loại; người cuối cùng trụ lại thắng.' },
    'classic-king':       { title: 'Vua cổ điển', description: 'Thắng thì giữ ngai.', howToPlay: 'Một người ngẫu nhiên làm Vua. Mỗi ván một người thách đấu Vua, chủ trò bấm ai thắng — người thắng giữ ngai. Có đếm số lần thủ ngai và triều đại dài nhất.' },
    'king-challenge':     { title: 'Thách đấu vua', description: 'Người thách đấu chọn vũ khí.', howToPlay: 'Giống Vua cổ điển, nhưng người thách đấu được chọn 1 trong 3 thử thách trước khi đấu.' },
    'last-king':          { title: 'Vua cuối cùng', description: 'Thua Vua là bị loại.', howToPlay: 'Người thách đấu thua sẽ bị loại. Vị Vua trụ đến cuối thống trị cả đêm.' },
    'quiz-general':       { title: 'Kiến thức chung', description: 'Mỗi thứ một chút.', howToPlay: QUIZ_HOWTO.vi },
    'quiz-beer':          { title: 'Bia & đồ uống', description: 'Bia, cocktail và chuyện quán xá.', howToPlay: QUIZ_HOWTO.vi },
    'quiz-music':         { title: 'Âm nhạc', description: 'Nghệ sĩ, bản hit và nhạc cụ.', howToPlay: QUIZ_HOWTO.vi },
    'quiz-movies':        { title: 'Phim ảnh', description: 'Phim, diễn viên và câu thoại nổi tiếng.', howToPlay: QUIZ_HOWTO.vi },
    'quiz-sports':        { title: 'Thể thao', description: 'Luật, kỷ lục và huyền thoại.', howToPlay: QUIZ_HOWTO.vi },
    'quiz-random':        { title: 'Đố ngẫu nhiên', description: 'Câu hỏi từ mọi chủ đề.', howToPlay: QUIZ_HOWTO.vi },
    rps:                  { title: 'Oẳn tù tì', description: 'Kinh điển — ai thắng 3 trước.', howToPlay: 'Hai người lần lượt chọn bí mật trên cùng một điện thoại rồi lật cùng lúc. Búa thắng kéo, kéo thắng bao, bao thắng búa. Hoà thì chơi lại.' },
    'five-second':        { title: 'Luật 5 giây', description: 'Kể 3 thứ trước khi hết giờ.', howToPlay: 'Mỗi lượt hiện một chủ đề. Kể 3 thứ trong 5 giây; chủ trò bấm Thành công hoặc Thất bại. Có tính chuỗi.' },
    'dont-laugh':         { title: 'Cấm cười', description: 'Làm họ cười. Hoặc đừng.', howToPlay: 'Một người diễn, người kia làm giám khảo giữ mặt nghiêm trong 30 giây. Giám khảo cười thì người diễn thắng; trụ được thì giám khảo thắng. Đổi vai mỗi ván.' },
    reaction:             { title: 'Phản xạ nhanh', description: 'Chạm ngay khi màn hình xanh.', howToPlay: 'Chờ chữ GO! rồi chạm nhanh nhất có thể — chạm sớm là phạm quy. Mỗi người 3 lượt; thời gian nhanh nhất thắng.' },
    memory:               { title: 'Trí nhớ', description: 'Tìm hết các cặp.', howToPlay: 'Các lá bài lật lên một lúc rồi úp xuống. Ghép đủ các cặp với ít lượt nhất. Có 3 mức dễ, vừa, khó.' },
    word:                 { title: 'Đố chữ', description: 'Một chủ đề, một chữ cái, 10 giây.', howToPlay: 'Nói một thứ thuộc chủ đề bắt đầu bằng chữ cái đó trước khi hết giờ. Chủ trò xác nhận. Có tính chuỗi.' },
    'challenge-cards':    { title: 'Bài thử thách', description: 'Rút bài, làm thử thách.', howToPlay: 'Lần lượt rút bài. Hoàn thành được 1 điểm, hoặc bỏ qua.' },
    'truth-cards':        { title: 'Bài sự thật', description: 'Chỉ nói thật.', howToPlay: 'Rút một câu hỏi thật và trả lời. Điểm cho người dũng cảm.' },
    'dare-cards':         { title: 'Bài thách đố', description: 'Thách đố giữ nhiệt cho bữa tiệc.', howToPlay: 'Rút thách đố và thực hiện — hoặc bỏ qua. Điểm cho người dũng cảm.' },
    'wild-cards':         { title: 'Bài tẩy', description: 'Những lá bài bẻ cong luật chơi.', howToPlay: 'Thử thách trộn với bài tẩy: thêm lượt, khiên, chỉ định, hoán đổi và nhân đôi điểm. Hiệu ứng áp dụng thật.' },
    'chaos-cards':        { title: 'Bài hỗn loạn', description: 'Cả bàn đều bị ảnh hưởng.', howToPlay: 'Thử thách trộn với bài hỗn loạn tác động cả bàn: ai cũng chơi, đổi chỗ, đảo chiều, ván nhân đôi và chỉ định ngẫu nhiên.' },
  },
};
const SPINNER_HOWTO = {
  en: 'Add names or dares, hit SPIN and let the pointer decide. Flick the wheel or press Space. Drinking is always optional — water or a non-drinking dare counts just the same.',
  vi: 'Thêm tên hoặc thử thách, bấm QUAY và để kim quyết định. Vuốt vòng quay hoặc nhấn Space. Uống luôn là tuỳ chọn — uống nước hay làm thử thách không rượu đều tính.',
};

/* Everything the UI needs to describe a game or theme, in the current language */
const gameMeta = (lang, mode, item) => {
  const th = mode.type === 'themes' ? THEME_TEXT[lang][item.id] : null;
  const qt = item.quizTheme ? quizTheme(item.quizTheme) : null;
  const txt = th
    ? { title: th.name, description: th.tagline, howToPlay: SPINNER_HOWTO[lang] }
    : qt ? { title: L(qt.title, lang), description: `${L(qt.description, lang)} · ${qt.questions.length} ${lang === 'vi' ? 'câu hỏi' : 'questions'}`, howToPlay: QUIZ_HOWTO[lang] }
    : (GAME_META_TEXT[lang][item.id] || { title: item.id, description: '', howToPlay: '' });
  return { ...txt, id: item.id, icon: item.icon, plan: item.plan || 'free', players: item.players, duration: item.duration, scoring: item.scoring, difficulty: item.difficulty };
};
const gameTitle = (lang, modeId, itemId) => {
  const def = findGame(modeId, itemId);
  return def ? gameMeta(lang, def.mode, def.item).title : itemId;
};
