/* JParty — built 2026-10-03T03:46:18.952Z from dev.html. Do not edit: run tools/build.sh */
"use strict";

/* ==== js/engine/util.js ==== */
const {
  useState,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useMemo,
  useCallback,
  memo
} = React;
const STORAGE_KEY = 'party_spinner_v1';
const APP_VERSION = '2.1';
const MAX_ITEMS = 100;
const MAX_ITEM_LEN = 60;
const MAX_HISTORY = 50;
const MAX_SAVED = 30;
const MIN_DURATION = 3;
const MAX_DURATION = 30;
const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const mod = (a, n) => (a % n + n) % n;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const useMediaQuery = query => {
  const get = () => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on);
  }, [query]);
  return matches;
};
const rand = () => {
  if (window.crypto?.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 4294967296;
  }
  return Math.random();
};
const randInt = n => Math.floor(rand() * n);
const shuffleArr = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const clip = s => s.trim().slice(0, MAX_ITEM_LEN);
const parseLines = text => text.split('\n').map(clip).filter(Boolean).slice(0, MAX_ITEMS);
const truncate = (s, n) => s.length > n ? s.slice(0, Math.max(1, n - 1)) + '…' : s;
const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const isSampleList = list => Object.values(SAMPLE_ITEMS).some(byTheme => Object.values(byTheme).some(s => sameList(s, list)));
const uid = () => Date.now().toString(36) + Math.floor(rand() * 1e6).toString(36);
const easeOut = p => 1 - Math.pow(1 - p, 3);
const polar = (cx, cy, r, deg) => {
  const rad = (deg - 90) * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
};
const sectorPath = (cx, cy, r, startDeg, endDeg) => {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${largeArc} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)} Z`;
};
const indexAt = (rotation, n) => Math.floor(mod(-rotation, 360) / (360 / n)) % n;
const luminance = hex => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const textOn = hex => luminance(hex) > 0.42 ? '#1b1b1f' : '#ffffff';
const segColor = (palette, i, n) => {
  const len = palette.length;
  if (n > 1 && i === n - 1 && i % len === 0) return palette[len > 2 ? 1 : 0];
  return palette[i % len];
};
const tdKind = label => {
  const s = label.toLowerCase();
  if (/dare|thách/.test(s)) return 'dare';
  if (/truth|thật/.test(s)) return 'truth';
  return null;
};
const fmtAgo = (ts, lang) => {
  if (!ts) return '';
  const s = Math.round((ts - Date.now()) / 1000);
  try {
    const rtf = new Intl.RelativeTimeFormat(lang, {
      numeric: 'auto'
    });
    if (Math.abs(s) < 45) return rtf.format(0, 'second');
    if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    return rtf.format(Math.round(s / 86400), 'day');
  } catch (e) {
    return new Date(ts).toLocaleTimeString();
  }
};
const b64url = {
  enc: str => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => {
      bin += String.fromCharCode(b);
    });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  dec: s => {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
  }
};
const readSharedWheel = () => {
  const m = location.hash.match(/[#&]w=([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    const data = JSON.parse(b64url.dec(m[1]));
    const items = Array.isArray(data.i) ? data.i.filter(x => typeof x === 'string').map(clip).filter(Boolean).slice(0, MAX_ITEMS) : [];
    if (items.length < 1) return null;
    return {
      items,
      theme: THEMES[data.t] ? data.t : null
    };
  } catch (e) {
    return null;
  }
};
const baseUrl = () => location.href.split('#')[0];
const copyText = async text => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {}
    ta.remove();
    return ok;
  }
};
const vibrate = pattern => {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate?.(pattern);
  } catch (e) {}
};
const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
};
const saveState = state => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
};

/* ==== js/data/themes.js ==== */
const THEMES = {
  drinking: {
    key: 'drinking',
    icon: '🍻',
    free: true,
    palette: ['#FF4757', '#FFA502', '#FF6348', '#E74C3C', '#F39C12', '#FF7F50'],
    bgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #b45309 55%, #ca8a04 100%)',
    themeColor: '#7f1d1d',
    accent: '#FFD93D',
    pointerColor: '#FFD93D',
    btnClass: 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white',
    resultEmoji: '🍺',
    effect: 'shake',
    floaters: ['🍺', '🍻', '🥂', '🍾'],
    confettiColors: ['#FF4757', '#FFA502', '#FFD93D']
  },
  lucky: {
    key: 'lucky',
    icon: '🍀',
    free: true,
    palette: ['#FFD700', '#7B68EE', '#FF1493', '#00CED1', '#FF69B4', '#32CD32'],
    bgGradient: 'linear-gradient(135deg, #4c1d95 0%, #9d174d 50%, #facc15 100%)',
    themeColor: '#4c1d95',
    accent: '#FFD700',
    pointerColor: '#FFD700',
    btnClass: 'bg-gradient-to-r from-yellow-400 to-pink-500 hover:from-yellow-500 hover:to-pink-600 text-purple-950',
    resultEmoji: '🎉',
    effect: 'confetti',
    floaters: ['🍀', '✨', '⭐', '💰'],
    confettiColors: ['#FFD700', '#FF1493', '#00CED1', '#32CD32']
  },
  truth_or_dare: {
    key: 'truth_or_dare',
    icon: '😈',
    free: true,
    palette: ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#FF5722', '#C2185B'],
    bgGradient: 'linear-gradient(135deg, #831843 0%, #581c87 50%, #1e1b4b 100%)',
    themeColor: '#581c87',
    accent: '#FF4081',
    pointerColor: '#FF4081',
    btnClass: 'bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white',
    resultEmoji: '😈',
    effect: 'glow',
    floaters: ['😈', '🔥', '👀'],
    confettiColors: ['#E91E63', '#9C27B0', '#FF4081']
  },
  dating: {
    key: 'dating',
    icon: '💘',
    free: false,
    palette: ['#FF6B9D', '#FF1744', '#FFB6C1', '#FF4081', '#F8BBD0', '#E91E63'],
    bgGradient: 'linear-gradient(135deg, #be185d 0%, #db2777 50%, #f43f5e 100%)',
    themeColor: '#be185d',
    accent: '#FFE0EC',
    pointerColor: '#FFFFFF',
    btnClass: 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white',
    resultEmoji: '💘',
    effect: 'hearts',
    floaters: ['❤️', '💖', '💕', '💘', '💗', '💓'],
    confettiColors: ['#FF6B9D', '#FF1744', '#FFB6C1', '#FF4081']
  },
  office: {
    key: 'office',
    icon: '📌',
    free: false,
    palette: ['#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#455A64', '#0097A7'],
    bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%)',
    themeColor: '#0f172a',
    accent: '#60A5FA',
    pointerColor: '#60A5FA',
    btnClass: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white',
    resultEmoji: '📌',
    effect: 'clean',
    floaters: [],
    confettiColors: ['#1976D2', '#388E3C', '#F57C00']
  }
};
const THEME_TEXT = {
  en: {
    drinking: {
      name: 'Drinking',
      tagline: 'Cheers, losers!',
      kicker: 'Bottoms up! 🍻'
    },
    lucky: {
      name: 'Lucky',
      tagline: 'Test your fortune',
      kicker: 'Fortune has spoken ✨'
    },
    truth_or_dare: {
      name: 'Truth or Dare',
      tagline: 'No backing out',
      kicker: 'No backing out now 😈'
    },
    dating: {
      name: 'Dating',
      tagline: 'Catch the feeling',
      kicker: 'Destiny has decided 💘'
    },
    office: {
      name: 'Office',
      tagline: 'Pick the PIC',
      kicker: 'Congrats, you’re the PIC 📌'
    }
  },
  vi: {
    drinking: {
      name: 'Nhậu',
      tagline: 'Dô! Trăm phần trăm!',
      kicker: 'Cạn ly đi chờ chi! 🍻'
    },
    lucky: {
      name: 'May mắn',
      tagline: 'Thử vận may',
      kicker: 'Thần may mắn đã gọi tên ✨'
    },
    truth_or_dare: {
      name: 'Thật hay Thách',
      tagline: 'Không được chối',
      kicker: 'Hết đường lui rồi nhé 😈'
    },
    dating: {
      name: 'Hẹn hò',
      tagline: 'Bắt trọn cảm xúc',
      kicker: 'Định mệnh đã chọn 💘'
    },
    office: {
      name: 'Công sở',
      tagline: 'Chọn người phụ trách',
      kicker: 'Chúc mừng, bạn là PIC 📌'
    }
  }
};
const SAMPLE_ITEMS = {
  en: {
    drinking: ['Take a shot', 'Skip turn', 'Drink with neighbor', 'Down your drink', 'Make a rule', 'Truth', 'Dare', 'Pass it on'],
    lucky: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    truth_or_dare: ['Truth', 'Dare', 'Skip (1 drink)', 'Double Dare', 'Reverse', 'Wild Card'],
    dating: ['Hold hands', 'Compliment them', 'Eye contact 30s', 'Share a secret', 'Slow dance', 'Take a selfie'],
    office: ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona']
  },
  vi: {
    drinking: ['Uống 1 ly', 'Qua lượt', 'Uống cùng người bên cạnh', 'Cạn ly', 'Đặt luật mới', 'Sự thật', 'Thử thách', 'Chỉ định người uống'],
    lucky: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
    truth_or_dare: ['Sự thật', 'Thử thách', 'Bỏ qua (uống 1 ly)', 'Thử thách x2', 'Đổi chiều', 'Tự chọn'],
    dating: ['Nắm tay', 'Khen đối phương', 'Nhìn mắt 30 giây', 'Kể một bí mật', 'Nhảy điệu chậm', 'Chụp selfie'],
    office: ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà']
  }
};
const TD_PROMPTS = {
  en: {
    truth: ['What’s the most embarrassing thing on your phone right now?', 'Who here would you call at 3am in an emergency?', 'What’s the biggest lie you’ve told this year?', 'What’s your most irrational fear?', 'Who was your first crush?', 'What’s the weirdest thing you’ve ever eaten?', 'What secret talent does nobody here know about?', 'What was the last thing you searched online?', 'Who here would survive longest in a zombie apocalypse?', 'What’s the most childish thing you still do?', 'What’s the worst date you’ve ever been on?', 'If you could swap lives with someone here for a day, who would it be?', 'What’s a habit you’d never admit to your parents?', 'What’s the pettiest reason you stopped talking to someone?'],
    dare: ['Do your best impression of someone in the room.', 'Speak in an accent for the next 3 rounds.', 'Show the last photo in your camera roll.', 'Do 15 squats right now.', 'Let the person on your left draw on your hand.', 'Dance with no music for 30 seconds.', 'Say the alphabet backwards.', 'Hold a plank for 30 seconds.', 'Swap a piece of clothing with the person on your right.', 'Talk like a news anchor until your next turn.', 'Let the group pick your profile picture for the next hour.', 'Do a dramatic slow-motion walk across the room.', 'Give a 30-second motivational speech about socks.', 'Try to make everyone laugh in under a minute.']
  },
  vi: {
    truth: ['Thứ đáng xấu hổ nhất trong điện thoại bạn lúc này là gì?', 'Nếu có chuyện lúc 3 giờ sáng, bạn sẽ gọi ai ở đây?', 'Lời nói dối lớn nhất của bạn trong năm nay là gì?', 'Nỗi sợ vô lý nhất của bạn là gì?', 'Mối tình đầu (hoặc crush đầu tiên) của bạn là ai?', 'Món kỳ lạ nhất bạn từng ăn là gì?', 'Bạn có tài lẻ bí mật nào mà chưa ai ở đây biết?', 'Thứ cuối cùng bạn tìm kiếm trên mạng là gì?', 'Ai ở đây sẽ sống sót lâu nhất trong ngày tận thế zombie?', 'Việc trẻ con nhất mà bạn vẫn còn làm là gì?', 'Buổi hẹn hò tệ nhất của bạn diễn ra thế nào?', 'Nếu được đổi cuộc sống với một người ở đây trong 1 ngày, bạn chọn ai?', 'Thói quen nào bạn không bao giờ dám kể với bố mẹ?', 'Lý do nhỏ nhen nhất khiến bạn nghỉ chơi với ai đó là gì?'],
    dare: ['Nhại lại một người trong phòng thật giống.', 'Nói giọng vùng miền khác trong 3 lượt tiếp theo.', 'Cho cả hội xem tấm ảnh gần nhất trong máy.', 'Squat 15 cái ngay bây giờ.', 'Để người bên trái vẽ lên tay bạn.', 'Nhảy không nhạc trong 30 giây.', 'Đọc ngược bảng chữ cái.', 'Plank 30 giây.', 'Đổi một món đồ đang mặc với người bên phải.', 'Nói chuyện như phát thanh viên thời sự đến lượt sau.', 'Để cả hội chọn ảnh đại diện cho bạn trong 1 tiếng.', 'Đi slow-motion thật kịch tính qua phòng.', 'Diễn thuyết truyền cảm hứng 30 giây về… đôi tất.', 'Làm cả hội bật cười trong vòng 1 phút.']
  }
};

/* ==== js/data/i18n.js ==== */
const I18N = {
  en: {
    appName: 'JParty',
    openMenu: 'Open menu',
    close: 'Close',
    spin: 'SPIN',
    spinning: 'SPINNING…',
    spinHint: 'Tap SPIN, press Space, or flick the wheel',
    needTwo: 'Add at least 2 items',
    itemsCount: (n, d) => `${n} item${n === 1 ? '' : 's'} · ${d}s spin`,
    items: 'Items',
    quickAdd: 'Add items… (use commas for many)',
    add: 'Add',
    shuffle: 'Shuffle',
    sort: 'Sort',
    dedupe: 'Dedupe',
    numbers: '1…N',
    sample: 'Sample',
    clear: 'Clear',
    bulkEdit: 'Bulk edit',
    done: 'Done',
    bulkPlaceholder: 'One item per line\nJohn\nSarah\nMike',
    emptyList: 'No items yet — add some above or load a sample.',
    fillNumbers: 'Fill 1 to',
    fill: 'Fill',
    restoreRemoved: n => `↩︎ Restore ${n} removed`,
    removeItem: x => `Remove ${x}`,
    themes: 'Themes',
    pro: 'PRO',
    settings: 'Settings',
    sound: 'Sound',
    soundDesc: 'Ticks + winner fanfare',
    haptics: 'Vibration',
    hapticsDesc: 'Buzz on result (mobile)',
    eliminate: 'Elimination mode',
    eliminateDesc: 'Remove the winner after each spin',
    duration: 'Spin duration',
    language: 'Language',
    myWheels: 'My wheels',
    saveCurrent: 'Save current wheel',
    namePlaceholder: 'Wheel name…',
    save: 'Save',
    load: 'Load',
    del: 'Delete',
    noWheels: 'Save your favourite lists here for next time.',
    itemsShort: n => `${n} items`,
    history: 'History',
    clearHistory: 'Clear',
    noHistory: 'No spins yet — go spin the wheel!',
    topPicks: 'Most picked',
    totalSpins: n => `${n} spin${n === 1 ? '' : 's'}`,
    shortcuts: 'Keyboard shortcuts',
    scSpin: 'Spin',
    scParty: 'Party mode',
    scMute: 'Mute / unmute',
    scClose: 'Close dialog / menu',
    account: 'Account',
    unlockPro: 'Unlock Pro 🚀',
    unlockProDesc: 'Dating, Office, Hardcore & more',
    loginSoon: 'Login coming soon — everything runs locally.',
    winnerIs: 'The wheel picked',
    modeLabel: n => `${n} mode`,
    spinAgain: 'Spin again 🔁',
    removeAndSpin: 'Remove & spin again',
    removeOnly: 'Remove from wheel',
    eliminatedNote: 'Elimination mode: this item leaves the wheel.',
    share: 'Share',
    copied: 'Copied to clipboard ✅',
    truth: 'Truth',
    dare: 'Dare',
    another: 'Another one',
    proTitle: 'JParty Pro',
    proBody: 'Dating, Office & Hardcore are free to preview while we build accounts and cloud sync. Enjoy the party!',
    gotIt: 'Let’s go',
    partyMode: 'Party mode',
    exitParty: 'Exit party mode',
    shareWheel: 'Share wheel link',
    linkCopied: 'Wheel link copied 🔗',
    loadedShared: 'Loaded a shared wheel',
    muted: 'Sound off',
    unmuted: 'Sound on',
    undo: 'Undo',
    cleared: 'List cleared',
    removed: x => `Removed “${x}”`,
    lastStanding: x => `🏁 Last one standing: ${x}`,
    saved: x => `Saved “${x}”`,
    loaded: x => `Loaded “${x}”`,
    deleted: x => `Deleted “${x}”`,
    maxReached: `Max ${MAX_ITEMS} items`,
    dupesRemoved: n => n ? `Removed ${n} duplicate${n === 1 ? '' : 's'}` : 'No duplicates found',
    shuffled: 'Shuffled 🔀',
    stampText: 'PICKED ✓',
    jackpot: 'JACKPOT!',
    cheers: 'Cheers!',
    devilSays: 'Hehe~ 😈',
    tapToSkip: 'Tap to skip',
    poweredBy: 'Powered by',
    panelTitle: 'JParty',
    gameModes: 'Game modes',
    themesLabel: 'Themes',
    gamesLabel: 'Games',
    comingSoon: 'Coming soon',
    comingSoonBody: 'We’re building this game. The Spinner is fully playable while you wait!',
    backToSpinner: 'Back to Spinner',
    pickAnother: 'Pick another game',
    noHistoryHere: 'Nothing played here yet.',
    imageErrors: {
      type: 'Use a PNG, JPG, WEBP or GIF image',
      size: 'Image is too large (max 5 MB)',
      small: 'Image is too small'
    },
    general: 'General',
    setupOnGameScreen: 'rules are chosen on the game setup screen',
    customSettingsHint: 'Timer, points, teams and randomisation belong to the game itself — edit them in the game.',
    liveClassroom: 'Live classroom',
    liveClassroomHint: n => `${n} phone${n === 1 ? '' : 's'} connected — everyone answers on their own device.`,
    answeredCount: (a, b) => `${a} / ${b} answered`,
    studentsAnswerOnPhones: 'students answer on their phones',
    revealAnswer: 'Reveal answer',
    nGotItRight: (a, b) => `${a} of ${b} got it right`,
    answerLocked: 'Answer locked in',
    pickAnAnswer: 'Pick an answer',
    votePrefix: {
      likely: 'Most likely to…',
      never: 'Never have I ever…'
    },
    voteHint: {
      likely: 'Tap whoever got the most fingers',
      never: 'Tap everyone who HAS done it',
      rather: 'Tap a name to set A / B'
    },
    or: 'or',
    notEveryone: 'not everyone picked',
    minorityDare: n => `${n} — minority! A quick dare from the table.`,
    nobodyHas: 'Nobody has. Angels.',
    noVotes: 'No votes — card skipped',
    nHave: n => `${n} have done it`,
    nextCard: 'Next card',
    deck: 'Deck',
    mixDeck: 'Mix',
    charadesHint: 'Only the actor looks at the phone. Act it out or describe it — no saying the word. Everyone else guesses.',
    yourWord: 'Your word',
    pass: 'Pass',
    gotWord: 'Got it',
    endTurn: 'End turn',
    guessing: 'Guess the word',
    discussTime: 'Discussion',
    passingPhone: 'Passing the phone…',
    discuss: 'Discuss',
    voteNow: 'Vote now',
    peekHint: 'Make sure nobody else can see the screen.',
    showMyCard: 'Show my card',
    youAreImposter: 'You are the IMPOSTER',
    imposterHint: 'You don’t know the word. Blend in, listen, and guess it.',
    crewHint: 'Drop hints without giving it away. Find the one who doesn’t know.',
    hideAndPass: 'Hide & pass on',
    discussHint: 'Everyone says one thing about the word. The imposter bluffs.',
    whoIsImposter: 'Who is the imposter?',
    voteHintImposter: 'Tap the player the table voted for',
    imposterGuessQ: 'Did the imposter guess the word?',
    imposterGuessed: 'Imposter guessed it',
    imposterCaught: n => `${n} was the imposter — caught!`,
    imposterEscaped: n => `${n} was the imposter — and got away!`,
    theWordWas: 'The word was',
    bombStartsWith: n => `${n} starts`,
    bombHint: 'Say something in the category, tap PASS, hand the phone on. Nobody knows how long the fuse is.',
    lightFuse: 'Light the fuse',
    holding: 'Holding the bomb',
    passBomb: 'PASS',
    bombExploded: n => `BOOM! ${n} was holding it`,
    passesN: n => `${n} passes`,
    everyoneElsePlusOne: 'everyone else +1',
    creator: 'Creator',
    myGames: 'My Games',
    questionBank: 'Question Bank',
    createGame: 'Create game',
    editGame: 'Edit game',
    gameTitle: 'Game title',
    gameTitlePlaceholder: 'Science Quiz – Grade 5',
    description: 'Description',
    descriptionPlaceholder: 'A short note for yourself',
    icon: 'Icon',
    questionText: 'Question',
    questionPlaceholder: 'Which animal is this?',
    optionalImage: 'Image (optional)',
    uploadImage: 'Upload image',
    replaceImage: 'Replace',
    removeImage: 'Remove image',
    questionType: 'Type',
    typeMC: 'Multiple choice',
    typeTF: 'True / False',
    answerOptions: 'Answers',
    option: 'Option',
    addOption: 'Add option',
    tapToMarkCorrect: 'tap the letter to mark the correct answer',
    markCorrect: 'Mark as correct',
    topic: 'Topic',
    explanation: 'Explanation',
    explanationPlaceholder: 'Shown after the answer',
    timeOverride: 'Time for this question',
    useGameDefault: 'Use game default',
    noTimeLimit: 'No limit',
    optional: 'optional',
    saveQuestion: 'Save question',
    saveAndAddAnother: 'Save + add another',
    cancel: 'Cancel',
    edit: 'Edit',
    duplicate: 'Duplicate',
    play: 'Play',
    select: 'Select',
    newQuestion: 'New question',
    editQuestion: 'Edit question',
    questionSaved: 'Question saved',
    questionDeleted: 'Question deleted',
    untitled: 'Untitled',
    searchQuestions: 'Search questions…',
    allTopics: 'All topics',
    nOfM: (a, b) => `${a} of ${b}`,
    noMatches: 'No questions match these filters.',
    bankEmpty: 'Your question bank is empty. Create a question, or start from a built-in theme.',
    import10: n => `Import 10 from ${n}`,
    importedN: n => `Imported ${n} questions`,
    gameSettings: 'Settings',
    preview: 'Preview',
    fromBank: 'From bank',
    pickFromBank: 'Pick questions from your bank',
    noQuestionsYet: 'No questions in this game yet.',
    dragToReorder: 'Drag ⠿ to reorder',
    timePerQuestion: 'Time per question',
    questionsCanOverride: 'questions can override this',
    pointsPerQuestion: 'Points',
    speedBonusLabel: 'Speed bonus',
    zeroToDisable: '0 to disable',
    randomQuestionOrder: 'Random question order',
    randomAnswerOrder: 'Random answer order',
    noRepeatQuestions: 'Avoid repeating questions',
    saveGame: 'Save game',
    saveAndPlay: 'Save & play',
    gameSaved: 'Game saved',
    gameDuplicated: 'Game duplicated',
    gameDeleted: 'Game deleted',
    copySuffix: '(copy)',
    confirmDeleteGame: 'Delete this game? Its questions stay in the bank.',
    noGamesYet: 'No games yet',
    noGamesBody: 'Create your own quiz for a party, a class or a revision session. Questions live in a shared bank, so you can reuse them across games.',
    questionsN: n => `${n} question${n === 1 ? '' : 's'}`,
    yourGame: 'Your game',
    teamsLabel: 'Teams',
    individual: 'Individual',
    assignTeams: 'Assign teams',
    nTeams: n => `${n} teams`,
    teamRanking: 'Team ranking',
    skipQuestion: 'Skip',
    restartQuestion: 'Restart question',
    vGameTitle: 'Give the game a title.',
    vQuestionText: 'Write the question.',
    vTwoOptions: 'At least 2 answers are needed.',
    vCorrectAnswer: 'Mark which answer is correct.',
    vNoQuestions: 'Add at least one question.',
    quizTitle: 'JParty Quiz',
    chooseTheme: 'Choose a theme',
    allLevels: 'All',
    questionsAvailable: n => `${n} question${n === 1 ? '' : 's'}`,
    onlyAvailable: n => `Only ${n} questions match — the quiz will be shorter.`,
    noQuestions: 'No questions match these settings.',
    gameInfo: 'Game information',
    availableWith: p => `Available with ${PLAN_LABEL[p] || p}`,
    games: 'Games',
    games2: 'games',
    game1: 'game',
    players: 'Players',
    addPlayer: 'Add',
    playerName: 'Player name…',
    needPlayers: n => `Add at least ${n} player${n === 1 ? '' : 's'} to start`,
    shuffleOrder: 'Shuffle',
    start: 'Start',
    startGame: 'Start game',
    round: 'Round',
    nextRound: 'Next round',
    finish: 'Finish',
    playAgain: 'Play again',
    changeGame: 'Change game',
    backToParty: 'Back to party',
    gameComplete: 'Game complete',
    winner: 'Winner',
    winners: 'Winners',
    tie: 'Tie — replay',
    challenge: 'Challenge',
    newChallenge: 'New challenge',
    whoWon: 'Who won?',
    success: 'Success',
    failed: 'Failed',
    points: 'points',
    pts: 'pts',
    winsLabel: 'wins',
    streakLabel: 'streak',
    bestStreakLabel: 'best streak',
    eliminatedLabel: 'Eliminated',
    isOut: n => `${n} is out ☠️`,
    lastPlayerStanding: 'Last player standing',
    bye: n => `${n} advances (bye)`,
    vs: 'VS',
    format: 'Format',
    bestOf: n => `Best of ${n}`,
    roundsLabel: 'Rounds',
    streakGoal: 'Streak goal',
    firstTo: n => `First to ${n}`,
    teamRed: 'Team Red',
    teamBlue: 'Team Blue',
    autoTeams: 'Auto split',
    wholeTeam: 'Whole team',
    milestone: n => `🔥 ${n} STREAK!`,
    pointTo: n => `+1 ${n}`,
    king: 'King',
    challenger: 'Challenger',
    kingStays: 'The King stays 👑',
    newKing: 'New King! 👑',
    defenses: 'defenses',
    longestReign: 'Longest reign',
    kingOfNight: 'King of the night',
    pickChallenge: 'Challenger, pick your challenge',
    reign: n => `${n}-round reign`,
    questions: 'Questions',
    question: 'Question',
    correct: 'Correct!',
    wrong: 'Wrong',
    timeUp: 'Time’s up',
    speedBonus: 'speed bonus',
    accuracy: 'accuracy',
    fastest: 'fastest answer',
    quizComplete: 'Quiz complete',
    passTo: n => `Pass the phone to ${n}`,
    yourTurn: n => `${n}, your turn`,
    next: 'Next',
    didYouKnow: 'Did you know?',
    correctAnswer: 'Correct answer',
    rock: 'Rock',
    paper: 'Paper',
    scissors: 'Scissors',
    chooseSecretly: n => `${n}, choose secretly`,
    lockedIn: 'Locked in — pass the phone',
    reveal: 'Reveal',
    category: 'Category',
    letter: 'Letter',
    performer: 'Performer',
    judge: 'Judge',
    laughed: '😂 They laughed!',
    survived: '😐 Straight face survived',
    rolesSwap: 'Roles swap next round',
    wait: 'WAIT…',
    go: 'GO!',
    tapWhenGreen: 'Tap anywhere the instant it turns green',
    tapToStart: 'Tap to start',
    falseStart: 'False start!',
    attempt: 'Attempt',
    reactionLabels: {
      incredible: '🔥 Incredible',
      fast: '⚡ Fast',
      good: '👍 Good',
      slow: '🐢 Slow'
    },
    best: 'best',
    attempts: 'attempts',
    pairs: 'pairs',
    time: 'time',
    difficulty: 'Difficulty',
    difficultyLabels: {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard'
    },
    memorize: 'Memorize…',
    allMatched: 'All pairs matched!',
    drawCard: 'Draw a card',
    skip: 'Skip',
    useShield: 'Use shield 🛡️',
    cardsLeft: n => `${n} cards left`,
    chooseTarget: 'Choose a target',
    shieldsLabel: 'shields',
    turnOrder: 'Turn order',
    effectApplied: 'Effect applied!',
    extraTurn: 'Extra turn!',
    doubleOn: '2× points active',
    everyoneTurn: 'Everyone plays this one!',
    reversed: 'Turn order reversed',
    swapped: 'Seats swapped — new order',
    targetIs: n => `Target: ${n}`,
    shieldGained: 'Shield gained 🛡️',
    turnOf: n => `${n}’s turn`,
    nonDrinking: 'Non-drinking version',
    showOriginal: 'Show original',
    drinkNote: 'Drinking is optional — water, food or a non-drinking challenge always counts.',
    party: 'Party',
    partySummary: 'Party summary',
    gamesPlayed: 'Games played',
    mostWins: 'Most wins',
    longestStreak: 'Longest streak',
    mostPlayed: 'Most games played',
    mostPoints: 'Most points',
    gameHistory: 'Game history',
    noGames: 'No games played yet tonight.',
    newParty: 'New party',
    newPartyConfirm: 'Start a new party? History and stats reset, players stay.',
    managePlayers: 'Players & summary',
    wonBy: n => `${n} won`,
    playersAtTable: n => `${n} player${n === 1 ? '' : 's'} at the table`,
    scoringLabels: {
      points: 'Points',
      streak: 'Streaks',
      elimination: 'Elimination',
      time: 'Fastest time',
      none: 'Just for fun'
    },
    playersRange: (a, b) => a === b ? `${a} players` : b >= 100 ? `${a}+ players` : `${a}–${b} players`,
    includeHint: 'Tap a player to include or exclude them',
    playing: 'Playing',
    plan: 'Plan',
    myPlan: 'My plan',
    currentPlan: 'Current plan',
    upgradeTo: p => `Upgrade to ${PLAN_LABEL[p] || p}`,
    maxActive: 'MAX active',
    choosePlan: 'Choose your plan',
    maybeLater: 'Maybe later',
    paymentsSoon: 'Payments aren’t live yet — upgrades will be available soon.',
    devSwitched: p => `Dev: plan set to ${PLAN_LABEL[p]}`,
    devSwitcher: 'Dev plan switcher',
    comparePlans: 'Compare plans',
    planTag: {
      free: 'Play.',
      pro: 'Play more.',
      max: 'Make it yours and play together.'
    },
    planCards: {
      free: ['Core party games', 'Basic themes', 'Basic Spinner', 'Custom items'],
      pro: ['≈80% of all content', 'More themes', 'More game modes', 'More mini games & cards'],
      max: ['Everything in PRO', 'Custom venue branding', 'Custom logo', 'Real-time multiplayer', 'Host & Big Screen mode', 'QR Join']
    },
    upgrade: {
      pro: {
        title: '⭐ Unlock PRO',
        body: 'Get access to most of the JParty library.',
        perks: ['More themes', 'More game modes', 'More challenges', 'More mini games']
      },
      max: {
        title: '👑 Unlock MAX',
        body: 'Turn JParty into your own venue experience.',
        perks: ['Everything in PRO', 'Your logo & venue name', 'QR Join', 'Real-time multiplayer', 'Host Mode', 'Big Screen Mode']
      }
    },
    compare: {
      basicSpinner: 'Basic Spinner',
      basicThemes: 'Basic themes',
      advancedThemes: 'Advanced themes',
      basicBattle: 'Basic Battle',
      advancedBattle: 'Advanced Battle',
      king: 'King mode',
      quiz: 'Quiz',
      advancedQuiz: 'Advanced Quiz',
      miniGames: 'Mini Games',
      advancedMini: 'Advanced Mini Games',
      cards: 'Cards',
      customItems: 'Custom items',
      customLogo: 'Custom logo',
      venueName: 'Custom venue name',
      venueMode: 'Venue mode',
      qrJoin: 'QR Join',
      realtime: 'Real-time sync',
      hostMode: 'Host mode',
      bigScreen: 'Big Screen mode',
      venueStats: 'Venue stats'
    },
    venue: 'Venue',
    venueMode: 'Venue mode',
    venueBranding: 'Venue branding',
    venueName: 'Venue name',
    venueLogo: 'Venue logo',
    uploadImage: 'Upload image',
    removeLogo: 'Remove logo',
    taglineLabel: 'Short tagline',
    brandColor: 'Brand color',
    secondaryColor: 'Secondary color',
    preview: 'Preview',
    poweredByPG: 'powered by JParty',
    enableBranding: 'Show venue branding',
    bigScreen: 'Big Screen mode',
    qrJoin: 'QR Join',
    maxPlayersLabel: 'Maximum players',
    tableLabel: 'Table',
    startParty: 'Start party',
    endParty: 'End party',
    generateQr: 'Generate QR',
    newCode: 'New code',
    room: 'Room',
    scanToJoin: 'Scan to join',
    joinParty: 'Join party',
    yourName: 'Your name',
    join: 'Join',
    joined: 'Joined! Wait for the host.',
    waitingHost: 'Waiting for the host…',
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
    hostControls: 'Host controls',
    pause: 'Pause',
    resume: 'Resume',
    restart: 'Restart',
    clearPlayers: 'Clear players',
    logoErrors: {
      type: 'Use a PNG, JPG or WEBP image',
      size: 'Image is too large (max 4 MB)',
      small: 'Image is too small (min 64×64)'
    },
    venueSaved: 'Venue saved',
    youAreUp: 'You’re up!',
    spectating: 'Watch the big screen',
    ready: 'I’m ready',
    readyCount: (a, b) => `${a}/${b} ready`,
    remotePlayers: 'Joined from phones',
    sameDeviceOnly: 'Offline — same-device sync only',
    openBigScreen: 'Open Big Screen',
    exitBigScreen: 'Exit Big Screen',
    venueStats: 'Venue stats',
    partyCode: 'Party code',
    orEnterCode: 'or enter the code',
    noParty: 'No active party',
    leave: 'Leave',
    hostLeft: 'The host ended the party',
    paused: 'Paused',
    livePlayers: 'live',
    footer: 'Made for parties · works offline · data stays on your device',
    shareText: w => `🎯 JParty picked: ${w}`
  },
  vi: {
    appName: 'JParty',
    openMenu: 'Mở menu',
    close: 'Đóng',
    spin: 'QUAY',
    spinning: 'ĐANG QUAY…',
    spinHint: 'Bấm QUAY, nhấn Space, hoặc vuốt vòng quay',
    needTwo: 'Thêm ít nhất 2 mục',
    itemsCount: (n, d) => `${n} mục · quay ${d} giây`,
    items: 'Danh sách',
    quickAdd: 'Thêm mục… (dùng dấu phẩy để thêm nhiều)',
    add: 'Thêm',
    shuffle: 'Xáo trộn',
    sort: 'Sắp xếp',
    dedupe: 'Bỏ trùng',
    numbers: '1…N',
    sample: 'Mẫu',
    clear: 'Xoá hết',
    bulkEdit: 'Sửa hàng loạt',
    done: 'Xong',
    bulkPlaceholder: 'Mỗi dòng một mục\nTuấn\nLan\nMinh',
    emptyList: 'Chưa có mục nào — thêm ở trên hoặc dùng danh sách mẫu.',
    fillNumbers: 'Điền từ 1 đến',
    fill: 'Điền',
    restoreRemoved: n => `↩︎ Khôi phục ${n} mục đã loại`,
    removeItem: x => `Xoá ${x}`,
    themes: 'Chủ đề',
    pro: 'PRO',
    settings: 'Cài đặt',
    sound: 'Âm thanh',
    soundDesc: 'Tiếng tick + nhạc chiến thắng',
    haptics: 'Rung',
    hapticsDesc: 'Rung khi có kết quả (điện thoại)',
    eliminate: 'Chế độ loại trừ',
    eliminateDesc: 'Loại người thắng sau mỗi lượt quay',
    duration: 'Thời gian quay',
    language: 'Ngôn ngữ',
    myWheels: 'Vòng quay đã lưu',
    saveCurrent: 'Lưu vòng quay hiện tại',
    namePlaceholder: 'Tên vòng quay…',
    save: 'Lưu',
    load: 'Mở',
    del: 'Xoá',
    noWheels: 'Lưu các danh sách yêu thích để dùng lần sau.',
    itemsShort: n => `${n} mục`,
    history: 'Lịch sử',
    clearHistory: 'Xoá',
    noHistory: 'Chưa quay lần nào — quay thử đi!',
    topPicks: 'Trúng nhiều nhất',
    totalSpins: n => `${n} lượt quay`,
    shortcuts: 'Phím tắt',
    scSpin: 'Quay',
    scParty: 'Chế độ party',
    scMute: 'Bật / tắt tiếng',
    scClose: 'Đóng hộp thoại / menu',
    account: 'Tài khoản',
    unlockPro: 'Mở khoá Pro 🚀',
    unlockProDesc: 'Hẹn hò, Công sở, Quẩy tới bến & hơn nữa',
    loginSoon: 'Đăng nhập sắp ra mắt — mọi thứ đang chạy trên máy bạn.',
    winnerIs: 'Vòng quay đã chọn',
    modeLabel: n => `Chế độ ${n}`,
    spinAgain: 'Quay tiếp 🔁',
    removeAndSpin: 'Loại & quay tiếp',
    removeOnly: 'Loại khỏi vòng quay',
    eliminatedNote: 'Chế độ loại trừ: mục này sẽ rời vòng quay.',
    share: 'Chia sẻ',
    copied: 'Đã sao chép ✅',
    truth: 'Sự thật',
    dare: 'Thử thách',
    another: 'Câu khác',
    proTitle: 'JParty Pro',
    proBody: 'Hẹn hò, Công sở & Quẩy tới bến đang mở miễn phí để trải nghiệm trong lúc tụi mình xây tính năng tài khoản và đồng bộ. Quẩy thôi!',
    gotIt: 'Quẩy thôi',
    partyMode: 'Chế độ party',
    exitParty: 'Thoát chế độ party',
    shareWheel: 'Chia sẻ link vòng quay',
    linkCopied: 'Đã sao chép link vòng quay 🔗',
    loadedShared: 'Đã mở vòng quay được chia sẻ',
    muted: 'Đã tắt tiếng',
    unmuted: 'Đã bật tiếng',
    undo: 'Hoàn tác',
    cleared: 'Đã xoá danh sách',
    removed: x => `Đã xoá “${x}”`,
    lastStanding: x => `🏁 Người cuối cùng: ${x}`,
    saved: x => `Đã lưu “${x}”`,
    loaded: x => `Đã mở “${x}”`,
    deleted: x => `Đã xoá “${x}”`,
    maxReached: `Tối đa ${MAX_ITEMS} mục`,
    dupesRemoved: n => n ? `Đã bỏ ${n} mục trùng` : 'Không có mục trùng',
    shuffled: 'Đã xáo trộn 🔀',
    stampText: 'ĐÃ CHỐT ✓',
    jackpot: 'TRÚNG RỒI!',
    cheers: 'Dô!!!',
    devilSays: 'Hê hê~ 😈',
    tapToSkip: 'Chạm để bỏ qua',
    poweredBy: 'Powered by',
    panelTitle: 'JParty',
    gameModes: 'Chế độ chơi',
    themesLabel: 'Chủ đề',
    gamesLabel: 'Trò chơi',
    comingSoon: 'Sắp ra mắt',
    comingSoonBody: 'Trò này đang được xây. Trong lúc chờ, Vòng quay vẫn chơi được đầy đủ!',
    backToSpinner: 'Về Vòng quay',
    pickAnother: 'Chọn trò khác',
    noHistoryHere: 'Chưa chơi mục này lần nào.',
    imageErrors: {
      type: 'Dùng ảnh PNG, JPG, WEBP hoặc GIF',
      size: 'Ảnh quá lớn (tối đa 5 MB)',
      small: 'Ảnh quá nhỏ'
    },
    general: 'Chung',
    setupOnGameScreen: 'luật chơi chọn ở màn hình bắt đầu của trò đó',
    customSettingsHint: 'Thời gian, điểm, chia đội và xáo trộn thuộc về chính game — sửa trong game.',
    liveClassroom: 'Lớp học trực tiếp',
    liveClassroomHint: n => `${n} điện thoại đã kết nối — mọi người trả lời trên máy của mình.`,
    answeredCount: (a, b) => `${a} / ${b} đã trả lời`,
    studentsAnswerOnPhones: 'học sinh bấm đáp án trên điện thoại',
    revealAnswer: 'Lộ đáp án',
    nGotItRight: (a, b) => `${a} / ${b} trả lời đúng`,
    answerLocked: 'Đã chốt đáp án',
    pickAnAnswer: 'Chọn một đáp án',
    votePrefix: {
      likely: 'Ai dễ…',
      never: 'Tôi chưa bao giờ…'
    },
    voteHint: {
      likely: 'Bấm người bị chỉ nhiều nhất',
      never: 'Bấm tất cả những ai ĐÃ TỪNG',
      rather: 'Bấm tên để chọn A / B'
    },
    or: 'hay',
    notEveryone: 'chưa đủ người chọn',
    minorityDare: n => `${n} — phe thiểu số! Một thử thách nhanh từ cả bàn.`,
    nobodyHas: 'Không ai cả. Thiên thần.',
    noVotes: 'Không ai bị chỉ — bỏ qua lá này',
    nHave: n => `${n} người đã từng`,
    nextCard: 'Lá tiếp',
    deck: 'Bộ từ',
    mixDeck: 'Trộn',
    charadesHint: 'Chỉ người diễn nhìn điện thoại. Diễn hoặc mô tả — không được nói từ đó. Cả bàn đoán.',
    yourWord: 'Từ của bạn',
    pass: 'Bỏ qua',
    gotWord: 'Đúng rồi',
    endTurn: 'Kết thúc lượt',
    guessing: 'Đoán từ',
    discussTime: 'Thời gian thảo luận',
    passingPhone: 'Đang chuyền điện thoại…',
    discuss: 'Thảo luận',
    voteNow: 'Bỏ phiếu',
    peekHint: 'Đảm bảo không ai khác nhìn thấy màn hình.',
    showMyCard: 'Xem lá của tôi',
    youAreImposter: 'Bạn là KẺ GIẢ MẠO',
    imposterHint: 'Bạn không biết từ bí mật. Hoà vào, lắng nghe và đoán.',
    crewHint: 'Gợi ý khéo, đừng lộ từ. Tìm người không biết.',
    hideAndPass: 'Ẩn & chuyền tiếp',
    discussHint: 'Mỗi người nói một điều về từ bí mật. Kẻ giả mạo phải bịa.',
    whoIsImposter: 'Ai là kẻ giả mạo?',
    voteHintImposter: 'Bấm người bị cả bàn bỏ phiếu',
    imposterGuessQ: 'Kẻ giả mạo có đoán ra từ không?',
    imposterGuessed: 'Kẻ giả mạo đoán trúng',
    imposterCaught: n => `${n} là kẻ giả mạo — bị bắt!`,
    imposterEscaped: n => `${n} là kẻ giả mạo — và thoát!`,
    theWordWas: 'Từ bí mật là',
    bombStartsWith: n => `${n} cầm trước`,
    bombHint: 'Nói một thứ thuộc chủ đề, bấm CHUYỀN, đưa điện thoại tiếp. Không ai biết ngòi dài bao lâu.',
    lightFuse: 'Châm ngòi',
    holding: 'Đang cầm bom',
    passBomb: 'CHUYỀN',
    bombExploded: n => `BÙM! ${n} đang cầm nó`,
    passesN: n => `${n} lượt chuyền`,
    everyoneElsePlusOne: 'những người khác +1',
    creator: 'Tạo game',
    myGames: 'Trò của tôi',
    questionBank: 'Kho câu hỏi',
    createGame: 'Tạo game',
    editGame: 'Sửa game',
    gameTitle: 'Tên game',
    gameTitlePlaceholder: 'Đố vui Khoa học – Lớp 5',
    description: 'Mô tả',
    descriptionPlaceholder: 'Ghi chú ngắn cho bạn',
    icon: 'Biểu tượng',
    questionText: 'Câu hỏi',
    questionPlaceholder: 'Đây là con vật gì?',
    optionalImage: 'Hình ảnh (tuỳ chọn)',
    uploadImage: 'Tải ảnh lên',
    replaceImage: 'Đổi ảnh',
    removeImage: 'Xoá ảnh',
    questionType: 'Loại câu',
    typeMC: 'Trắc nghiệm',
    typeTF: 'Đúng / Sai',
    answerOptions: 'Đáp án',
    option: 'Đáp án',
    addOption: 'Thêm đáp án',
    tapToMarkCorrect: 'chạm vào chữ cái để chọn đáp án đúng',
    markCorrect: 'Chọn làm đáp án đúng',
    topic: 'Chủ đề',
    explanation: 'Giải thích',
    explanationPlaceholder: 'Hiện sau khi trả lời',
    timeOverride: 'Thời gian riêng cho câu này',
    useGameDefault: 'Theo cài đặt game',
    noTimeLimit: 'Không giới hạn',
    optional: 'tuỳ chọn',
    saveQuestion: 'Lưu câu hỏi',
    saveAndAddAnother: 'Lưu + thêm câu nữa',
    cancel: 'Huỷ',
    edit: 'Sửa',
    duplicate: 'Nhân bản',
    play: 'Chơi',
    select: 'Chọn',
    newQuestion: 'Câu hỏi mới',
    editQuestion: 'Sửa câu hỏi',
    questionSaved: 'Đã lưu câu hỏi',
    questionDeleted: 'Đã xoá câu hỏi',
    untitled: 'Chưa đặt tên',
    searchQuestions: 'Tìm câu hỏi…',
    allTopics: 'Mọi chủ đề',
    nOfM: (a, b) => `${a} / ${b}`,
    noMatches: 'Không có câu hỏi nào khớp bộ lọc.',
    bankEmpty: 'Kho câu hỏi còn trống. Tạo câu hỏi mới, hoặc lấy sẵn từ một chủ đề có sẵn.',
    import10: n => `Lấy 10 câu từ ${n}`,
    importedN: n => `Đã nhập ${n} câu hỏi`,
    gameSettings: 'Cài đặt',
    preview: 'Xem trước',
    fromBank: 'Từ kho',
    pickFromBank: 'Chọn câu hỏi từ kho của bạn',
    noQuestionsYet: 'Game này chưa có câu hỏi nào.',
    dragToReorder: 'Kéo ⠿ để đổi thứ tự',
    timePerQuestion: 'Thời gian mỗi câu',
    questionsCanOverride: 'từng câu có thể đặt riêng',
    pointsPerQuestion: 'Điểm',
    speedBonusLabel: 'Thưởng tốc độ',
    zeroToDisable: '0 để tắt',
    randomQuestionOrder: 'Xáo thứ tự câu hỏi',
    randomAnswerOrder: 'Xáo thứ tự đáp án',
    noRepeatQuestions: 'Tránh lặp lại câu hỏi',
    saveGame: 'Lưu game',
    saveAndPlay: 'Lưu & chơi',
    gameSaved: 'Đã lưu game',
    gameDuplicated: 'Đã nhân bản game',
    gameDeleted: 'Đã xoá game',
    copySuffix: '(bản sao)',
    confirmDeleteGame: 'Xoá game này? Câu hỏi vẫn còn trong kho.',
    noGamesYet: 'Chưa có game nào',
    noGamesBody: 'Tạo bộ đố của riêng bạn cho bữa tiệc, lớp học hay buổi ôn tập. Câu hỏi nằm trong kho dùng chung nên tái sử dụng được cho nhiều game.',
    questionsN: n => `${n} câu hỏi`,
    yourGame: 'Game của bạn',
    teamsLabel: 'Chia đội',
    individual: 'Cá nhân',
    assignTeams: 'Xếp đội',
    nTeams: n => `${n} đội`,
    teamRanking: 'Xếp hạng đội',
    skipQuestion: 'Bỏ qua',
    restartQuestion: 'Chơi lại câu này',
    vGameTitle: 'Hãy đặt tên cho game.',
    vQuestionText: 'Hãy nhập nội dung câu hỏi.',
    vTwoOptions: 'Cần ít nhất 2 đáp án.',
    vCorrectAnswer: 'Hãy chọn đáp án đúng.',
    vNoQuestions: 'Thêm ít nhất một câu hỏi.',
    quizTitle: 'JParty Quiz',
    chooseTheme: 'Chọn chủ đề',
    allLevels: 'Tất cả',
    questionsAvailable: n => `${n} câu hỏi`,
    onlyAvailable: n => `Chỉ có ${n} câu phù hợp — ván đố sẽ ngắn hơn.`,
    noQuestions: 'Không có câu hỏi phù hợp với lựa chọn này.',
    gameInfo: 'Thông tin trò chơi',
    availableWith: p => `Có trong gói ${PLAN_LABEL[p] || p}`,
    games: 'Trò chơi',
    games2: 'ván',
    game1: 'ván',
    players: 'Người chơi',
    addPlayer: 'Thêm',
    playerName: 'Tên người chơi…',
    needPlayers: n => `Cần ít nhất ${n} người chơi để bắt đầu`,
    shuffleOrder: 'Xáo thứ tự',
    start: 'Bắt đầu',
    startGame: 'Bắt đầu chơi',
    round: 'Ván',
    nextRound: 'Ván tiếp',
    finish: 'Kết thúc',
    playAgain: 'Chơi lại',
    changeGame: 'Đổi trò',
    backToParty: 'Về bữa tiệc',
    gameComplete: 'Kết thúc trò chơi',
    winner: 'Người thắng',
    winners: 'Những người thắng',
    tie: 'Hoà — chơi lại',
    challenge: 'Thử thách',
    newChallenge: 'Thử thách khác',
    whoWon: 'Ai thắng?',
    success: 'Thành công',
    failed: 'Thất bại',
    points: 'điểm',
    pts: 'đ',
    winsLabel: 'thắng',
    streakLabel: 'chuỗi',
    bestStreakLabel: 'chuỗi tốt nhất',
    eliminatedLabel: 'Bị loại',
    isOut: n => `${n} bị loại ☠️`,
    lastPlayerStanding: 'Người cuối cùng trụ lại',
    bye: n => `${n} đi tiếp (không đấu)`,
    vs: 'VS',
    format: 'Thể thức',
    bestOf: n => `${n} ván`,
    roundsLabel: 'Số ván',
    streakGoal: 'Mốc chuỗi',
    firstTo: n => `Đạt ${n} trước`,
    teamRed: 'Đội Đỏ',
    teamBlue: 'Đội Xanh',
    autoTeams: 'Chia tự động',
    wholeTeam: 'Cả đội',
    milestone: n => `🔥 CHUỖI ${n}!`,
    pointTo: n => `+1 ${n}`,
    king: 'Vua',
    challenger: 'Người thách đấu',
    kingStays: 'Vua giữ ngai 👑',
    newKing: 'Vua mới! 👑',
    defenses: 'lần thủ ngai',
    longestReign: 'Triều đại dài nhất',
    kingOfNight: 'Vua của đêm nay',
    pickChallenge: 'Người thách đấu, chọn thử thách',
    reign: n => `triều đại ${n} ván`,
    questions: 'Câu hỏi',
    question: 'Câu',
    correct: 'Chính xác!',
    wrong: 'Sai rồi',
    timeUp: 'Hết giờ',
    speedBonus: 'thưởng tốc độ',
    accuracy: 'độ chính xác',
    fastest: 'trả lời nhanh nhất',
    quizComplete: 'Hoàn thành đố vui',
    passTo: n => `Chuyền điện thoại cho ${n}`,
    yourTurn: n => `${n}, tới lượt bạn`,
    next: 'Tiếp',
    didYouKnow: 'Bạn có biết?',
    correctAnswer: 'Đáp án đúng',
    rock: 'Búa',
    paper: 'Bao',
    scissors: 'Kéo',
    chooseSecretly: n => `${n}, chọn bí mật`,
    lockedIn: 'Đã chốt — chuyền điện thoại',
    reveal: 'Lật',
    category: 'Chủ đề',
    letter: 'Chữ cái',
    performer: 'Người diễn',
    judge: 'Giám khảo',
    laughed: '😂 Cười rồi!',
    survived: '😐 Giữ được mặt nghiêm',
    rolesSwap: 'Ván sau đổi vai',
    wait: 'CHỜ…',
    go: 'GO!',
    tapWhenGreen: 'Chạm bất kỳ đâu ngay khi màn hình xanh',
    tapToStart: 'Chạm để bắt đầu',
    falseStart: 'Phạm quy — chạm sớm!',
    attempt: 'Lượt',
    reactionLabels: {
      incredible: '🔥 Thần tốc',
      fast: '⚡ Nhanh',
      good: '👍 Ổn',
      slow: '🐢 Chậm'
    },
    best: 'tốt nhất',
    attempts: 'lượt lật',
    pairs: 'cặp',
    time: 'thời gian',
    difficulty: 'Độ khó',
    difficultyLabels: {
      easy: 'Dễ',
      medium: 'Vừa',
      hard: 'Khó'
    },
    memorize: 'Ghi nhớ…',
    allMatched: 'Đã ghép hết các cặp!',
    drawCard: 'Rút bài',
    skip: 'Bỏ qua',
    useShield: 'Dùng khiên 🛡️',
    cardsLeft: n => `còn ${n} lá`,
    chooseTarget: 'Chọn mục tiêu',
    shieldsLabel: 'khiên',
    turnOrder: 'Thứ tự lượt',
    effectApplied: 'Đã áp dụng hiệu ứng!',
    extraTurn: 'Thêm lượt!',
    doubleOn: 'Đang nhân đôi điểm',
    everyoneTurn: 'Cả bàn cùng chơi lá này!',
    reversed: 'Đã đảo chiều lượt',
    swapped: 'Đã đổi chỗ — thứ tự mới',
    targetIs: n => `Mục tiêu: ${n}`,
    shieldGained: 'Nhận khiên 🛡️',
    turnOf: n => `Lượt của ${n}`,
    nonDrinking: 'Phiên bản không rượu',
    showOriginal: 'Xem bản gốc',
    drinkNote: 'Uống là tuỳ chọn — nước, đồ ăn hoặc thử thách không rượu luôn được tính.',
    party: 'Bữa tiệc',
    partySummary: 'Tổng kết bữa tiệc',
    gamesPlayed: 'Số ván đã chơi',
    mostWins: 'Thắng nhiều nhất',
    longestStreak: 'Chuỗi dài nhất',
    mostPlayed: 'Chơi nhiều nhất',
    mostPoints: 'Nhiều điểm nhất',
    gameHistory: 'Lịch sử trò chơi',
    noGames: 'Tối nay chưa chơi ván nào.',
    newParty: 'Tiệc mới',
    newPartyConfirm: 'Bắt đầu tiệc mới? Lịch sử và thống kê về 0, người chơi giữ nguyên.',
    managePlayers: 'Người chơi & tổng kết',
    wonBy: n => `${n} thắng`,
    playersAtTable: n => `${n} người tại bàn`,
    scoringLabels: {
      points: 'Tính điểm',
      streak: 'Chuỗi',
      elimination: 'Loại trừ',
      time: 'Thời gian nhanh nhất',
      none: 'Cho vui'
    },
    playersRange: (a, b) => a === b ? `${a} người` : b >= 100 ? `${a}+ người` : `${a}–${b} người`,
    includeHint: 'Chạm vào người chơi để thêm hoặc bỏ',
    playing: 'Đang chơi',
    plan: 'Gói',
    myPlan: 'Gói của tôi',
    currentPlan: 'Gói hiện tại',
    upgradeTo: p => `Nâng cấp lên ${PLAN_LABEL[p] || p}`,
    maxActive: 'Đang dùng MAX',
    choosePlan: 'Chọn gói của bạn',
    maybeLater: 'Để sau',
    paymentsSoon: 'Thanh toán chưa mở — sẽ sớm có nâng cấp.',
    devSwitched: p => `Dev: đã đặt gói ${PLAN_LABEL[p]}`,
    devSwitcher: 'Đổi gói (dev)',
    comparePlans: 'So sánh các gói',
    planTag: {
      free: 'Chơi.',
      pro: 'Chơi nhiều hơn.',
      max: 'Mang thương hiệu của bạn và chơi cùng nhau.'
    },
    planCards: {
      free: ['Trò chơi tiệc cốt lõi', 'Chủ đề cơ bản', 'Vòng quay cơ bản', 'Tuỳ chỉnh danh sách'],
      pro: ['≈80% toàn bộ nội dung', 'Nhiều chủ đề hơn', 'Nhiều chế độ chơi hơn', 'Thêm trò chơi nhỏ & bài'],
      max: ['Tất cả của PRO', 'Thương hiệu quán riêng', 'Logo riêng', 'Chơi nhiều máy thời gian thực', 'Chế độ chủ trò & màn hình lớn', 'Quét QR tham gia']
    },
    upgrade: {
      pro: {
        title: '⭐ Mở khoá PRO',
        body: 'Truy cập phần lớn kho trò chơi của JParty.',
        perks: ['Nhiều chủ đề hơn', 'Nhiều chế độ chơi hơn', 'Nhiều thử thách hơn', 'Nhiều trò chơi nhỏ hơn']
      },
      max: {
        title: '👑 Mở khoá MAX',
        body: 'Biến JParty thành trải nghiệm mang thương hiệu quán của bạn.',
        perks: ['Tất cả của PRO', 'Logo & tên quán của bạn', 'Quét QR tham gia', 'Chơi nhiều máy thời gian thực', 'Chế độ chủ trò', 'Chế độ màn hình lớn']
      }
    },
    compare: {
      basicSpinner: 'Vòng quay cơ bản',
      basicThemes: 'Chủ đề cơ bản',
      advancedThemes: 'Chủ đề nâng cao',
      basicBattle: 'Đấu cơ bản',
      advancedBattle: 'Đấu nâng cao',
      king: 'Chế độ Vua',
      quiz: 'Đố vui',
      advancedQuiz: 'Đố vui nâng cao',
      miniGames: 'Trò chơi nhỏ',
      advancedMini: 'Trò chơi nhỏ nâng cao',
      cards: 'Bốc bài',
      customItems: 'Tuỳ chỉnh danh sách',
      customLogo: 'Logo riêng',
      venueName: 'Tên quán riêng',
      venueMode: 'Chế độ quán',
      qrJoin: 'Quét QR tham gia',
      realtime: 'Đồng bộ thời gian thực',
      hostMode: 'Chế độ chủ trò',
      bigScreen: 'Màn hình lớn',
      venueStats: 'Thống kê quán'
    },
    venue: 'Quán',
    venueMode: 'Chế độ quán',
    venueBranding: 'Thương hiệu quán',
    venueName: 'Tên quán',
    venueLogo: 'Logo quán',
    uploadImage: 'Tải ảnh lên',
    removeLogo: 'Xoá logo',
    taglineLabel: 'Khẩu hiệu ngắn',
    brandColor: 'Màu thương hiệu',
    secondaryColor: 'Màu phụ',
    preview: 'Xem trước',
    poweredByPG: 'powered by JParty',
    enableBranding: 'Hiện thương hiệu quán',
    bigScreen: 'Màn hình lớn',
    qrJoin: 'Quét QR tham gia',
    maxPlayersLabel: 'Số người tối đa',
    tableLabel: 'Bàn',
    startParty: 'Mở tiệc',
    endParty: 'Kết thúc tiệc',
    generateQr: 'Tạo mã QR',
    newCode: 'Mã mới',
    room: 'Phòng',
    scanToJoin: 'Quét để tham gia',
    joinParty: 'Tham gia tiệc',
    yourName: 'Tên của bạn',
    join: 'Tham gia',
    joined: 'Đã vào! Chờ chủ trò.',
    waitingHost: 'Đang chờ chủ trò…',
    connected: 'Đã kết nối',
    reconnecting: 'Đang kết nối lại…',
    disconnected: 'Mất kết nối',
    hostControls: 'Điều khiển chủ trò',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
    restart: 'Chơi lại',
    clearPlayers: 'Xoá người chơi',
    logoErrors: {
      type: 'Dùng ảnh PNG, JPG hoặc WEBP',
      size: 'Ảnh quá lớn (tối đa 4 MB)',
      small: 'Ảnh quá nhỏ (tối thiểu 64×64)'
    },
    venueSaved: 'Đã lưu quán',
    youAreUp: 'Tới lượt bạn!',
    spectating: 'Theo dõi màn hình lớn',
    ready: 'Sẵn sàng',
    readyCount: (a, b) => `${a}/${b} sẵn sàng`,
    remotePlayers: 'Tham gia từ điện thoại',
    sameDeviceOnly: 'Offline — chỉ đồng bộ cùng thiết bị',
    openBigScreen: 'Mở màn hình lớn',
    exitBigScreen: 'Thoát màn hình lớn',
    venueStats: 'Thống kê quán',
    partyCode: 'Mã tiệc',
    orEnterCode: 'hoặc nhập mã',
    noParty: 'Chưa có tiệc nào',
    leave: 'Rời đi',
    hostLeft: 'Chủ trò đã kết thúc tiệc',
    paused: 'Tạm dừng',
    livePlayers: 'trực tuyến',
    footer: 'Làm cho những cuộc vui · chạy offline · dữ liệu chỉ nằm trên máy bạn',
    shareText: w => `🎯 JParty đã chọn: ${w}`
  }
};
const LANGS = [{
  key: 'en',
  label: 'English'
}, {
  key: 'vi',
  label: 'Tiếng Việt'
}];

/* ==== js/data/challenges.js ==== */
const CHALLENGES = {
  en: [{
    id: 'c01',
    scope: 'duel',
    text: 'Rock, paper, scissors — best of 3.'
  }, {
    id: 'c02',
    scope: 'duel',
    text: 'Staring contest. First to blink or laugh loses.'
  }, {
    id: 'c03',
    scope: 'duel',
    text: 'Name 5 countries in 5 seconds — the faster one wins.'
  }, {
    id: 'c04',
    scope: 'duel',
    text: 'Thumb war. Best of 3.'
  }, {
    id: 'c05',
    scope: 'duel',
    text: 'Who can hold a plank longer?'
  }, {
    id: 'c06',
    scope: 'duel',
    text: 'Say the alphabet backwards. Fewest mistakes wins.'
  }, {
    id: 'c07',
    scope: 'duel',
    text: 'Compliment battle: take turns complimenting each other — first to run dry loses.'
  }, {
    id: 'c08',
    scope: 'duel',
    text: 'Impression duel: the table votes for the best impression of someone in the room.'
  }, {
    id: 'c09',
    scope: 'duel',
    text: 'Count to 20 together, alternating numbers — a slip loses.'
  }, {
    id: 'c10',
    scope: 'duel',
    text: 'Dance-off: 20 seconds each, the table decides.'
  }, {
    id: 'c11',
    scope: 'duel',
    text: 'Alternate naming movie titles with a number in them. First to stall loses.'
  }, {
    id: 'c12',
    scope: 'duel',
    text: 'Balance on one leg with eyes closed. Longest wins.'
  }, {
    id: 'c13',
    scope: 'duel',
    text: 'Fastest to name 3 songs by the same artist.'
  }, {
    id: 'c14',
    scope: 'duel',
    text: 'Tongue-twister showdown: “She sells seashells by the seashore” — three times, fast.'
  }, {
    id: 'c15',
    scope: 'duel',
    text: 'Trivia sprint: the table asks one question — first correct answer wins.'
  }, {
    id: 'c16',
    scope: 'duel',
    drink: true,
    text: 'Finish your drink first.',
    alt: 'Finish a glass of water first.'
  }, {
    id: 'c31',
    scope: 'duel',
    text: 'Arm wrestle. One round, no mercy.'
  }, {
    id: 'c32',
    scope: 'duel',
    text: 'Rap battle: 4 bars each about the other person. The table votes.'
  }, {
    id: 'c33',
    scope: 'duel',
    text: 'Who can say “toy boat” 10 times fastest without slipping?'
  }, {
    id: 'c34',
    scope: 'duel',
    text: 'Memory duel: look at the table for 10 seconds, then list what’s on it. Most items wins.'
  }, {
    id: 'c35',
    scope: 'duel',
    text: 'Name capital cities back and forth. First to repeat or stall loses.'
  }, {
    id: 'c36',
    scope: 'duel',
    text: 'Flip a bottle. First to land it upright wins.'
  }, {
    id: 'c37',
    scope: 'duel',
    text: 'Hum a song — the other has 15 seconds to guess it. Then swap. Faster guess wins.'
  }, {
    id: 'c38',
    scope: 'duel',
    text: 'Whisper challenge: lip-read a sentence from across the room. Closest wins.'
  }, {
    id: 'c39',
    scope: 'duel',
    text: 'Keep a straight face while the other tells jokes for 30 seconds. Then swap.'
  }, {
    id: 'c40',
    scope: 'duel',
    text: 'Hold your breath. Longest wins.'
  }, {
    id: 'c41',
    scope: 'duel',
    text: 'Speed-draw an animal in 15 seconds — the table guesses whose is clearer.'
  }, {
    id: 'c42',
    scope: 'duel',
    text: 'Air guitar solo, 15 seconds each. Crowd noise decides.'
  }, {
    id: 'c43',
    scope: 'duel',
    text: 'Name brands of sneakers, alternating. First to stall loses.'
  }, {
    id: 'c44',
    scope: 'duel',
    text: 'Slow-motion fight scene for 20 seconds. Most dramatic wins.'
  }, {
    id: 'c45',
    scope: 'duel',
    text: 'Pose like a statue. First to move loses.'
  }, {
    id: 'c46',
    scope: 'duel',
    text: 'Say “I love you” to the other in 5 different accents. Best accent wins.'
  }, {
    id: 'c47',
    scope: 'duel',
    text: 'Both describe the same movie without naming it — table guesses which description is better.'
  }, {
    id: 'c48',
    scope: 'duel',
    drink: true,
    text: 'Flip a coin: loser takes a sip.',
    alt: 'Flip a coin: loser does 5 squats.'
  }, {
    id: 'c17',
    scope: 'solo',
    text: 'Do 10 push-ups in 20 seconds.'
  }, {
    id: 'c18',
    scope: 'solo',
    text: 'Sing the chorus of the last song you listened to.'
  }, {
    id: 'c19',
    scope: 'solo',
    text: 'Speak in an accent until your next turn.'
  }, {
    id: 'c20',
    scope: 'solo',
    text: 'Make the table laugh within 30 seconds.'
  }, {
    id: 'c21',
    scope: 'solo',
    text: 'Name 7 car brands in 10 seconds.'
  }, {
    id: 'c22',
    scope: 'solo',
    text: 'Improvise 4 lines of rap about the person on your right.'
  }, {
    id: 'c23',
    scope: 'solo',
    text: 'Do your best runway walk across the room.'
  }, {
    id: 'c24',
    scope: 'solo',
    text: 'Hold a wall-sit for 30 seconds.'
  }, {
    id: 'c25',
    scope: 'solo',
    drink: true,
    text: 'Take a sip and tell the story of your worst hangover.',
    alt: 'Tell the story of your most embarrassing morning.'
  }, {
    id: 'c49',
    scope: 'solo',
    text: 'Say the months of the year backwards in 15 seconds.'
  }, {
    id: 'c50',
    scope: 'solo',
    text: 'Do a 20-second impression of the person on your left.'
  }, {
    id: 'c51',
    scope: 'solo',
    text: 'Sell the table a random object within reach, infomercial style, 30 seconds.'
  }, {
    id: 'c52',
    scope: 'solo',
    text: 'Tell a story using only questions for 30 seconds.'
  }, {
    id: 'c53',
    scope: 'solo',
    text: 'Name 10 animals in 10 seconds.'
  }, {
    id: 'c54',
    scope: 'solo',
    text: 'Do the robot dance for 15 seconds.'
  }, {
    id: 'c55',
    scope: 'solo',
    text: 'Speak only in rhymes until your next turn.'
  }, {
    id: 'c56',
    scope: 'solo',
    text: 'Give a dramatic reading of the last text message you received.'
  }, {
    id: 'c57',
    scope: 'solo',
    text: 'Spell your full name backwards without writing it down.'
  }, {
    id: 'c58',
    scope: 'solo',
    text: 'Make 3 people at the table high-five you within 10 seconds.'
  }, {
    id: 'c59',
    scope: 'solo',
    text: 'Act out a sport until the table guesses it — in under 20 seconds.'
  }, {
    id: 'c60',
    scope: 'solo',
    text: 'Say a tongue twister 3 times fast: “Red lorry, yellow lorry.”'
  }, {
    id: 'c61',
    scope: 'solo',
    text: 'Do your best evil-villain laugh for 10 straight seconds.'
  }, {
    id: 'c62',
    scope: 'solo',
    text: 'Compliment every person at the table in under 30 seconds.'
  }, {
    id: 'c63',
    scope: 'solo',
    text: 'Balance a spoon on your nose for 10 seconds.'
  }, {
    id: 'c64',
    scope: 'solo',
    drink: true,
    text: 'Make a cocktail-style toast and take a sip.',
    alt: 'Make a cocktail-style toast with water.'
  }, {
    id: 'c26',
    scope: 'all',
    text: 'Everyone strikes a pose — the host picks the best one.'
  }, {
    id: 'c27',
    scope: 'all',
    text: 'Quick vote: who is most likely to become famous? The winner gives a 20-second acceptance speech.'
  }, {
    id: 'c28',
    scope: 'all',
    text: 'Everyone says a word that rhymes with “party”. Repeats are out.'
  }, {
    id: 'c29',
    scope: 'all',
    text: 'Group selfie in 10 seconds — the host judges the pose.'
  }, {
    id: 'c30',
    scope: 'all',
    drink: true,
    text: 'Everyone raises a glass and toasts the person on their left.',
    alt: 'Everyone gives a compliment to the person on their left.'
  }, {
    id: 'c65',
    scope: 'all',
    text: 'Category race: fruits. Go around the table — the first to stall is out.'
  }, {
    id: 'c66',
    scope: 'all',
    text: 'Everyone hums the same song at once. Last one to laugh wins.'
  }, {
    id: 'c67',
    scope: 'all',
    text: 'Thumb master: when the host puts a thumb on the table, the last to copy loses.'
  }, {
    id: 'c68',
    scope: 'all',
    text: 'Everyone points at who they think is the best dancer. Most fingers must dance 15 seconds.'
  }, {
    id: 'c69',
    scope: 'all',
    text: 'Rhyme chain: “moon”. Go around — repeats and stalls are out.'
  }, {
    id: 'c70',
    scope: 'all',
    text: 'Everyone freezes. First to move loses.'
  }, {
    id: 'c71',
    scope: 'all',
    text: 'Count to 10 as a group with no order — two people speak at once and you restart.'
  }, {
    id: 'c72',
    scope: 'all',
    text: 'Story chain: one word each. If the story stops making sense, the host picks the culprit.'
  }, {
    id: 'c73',
    scope: 'all',
    text: 'Everyone shows their last emoji used. Funniest wins.'
  }, {
    id: 'c74',
    scope: 'all',
    text: 'Wave: start a stadium wave around the table — 3 clean laps or everyone loses.'
  }, {
    id: 'c75',
    scope: 'all',
    drink: true,
    text: 'Waterfall: start drinking together; nobody stops until the person on their right stops.',
    alt: 'Waterfall of claps: keep clapping until the person on your right stops.'
  }],
  vi: [{
    id: 'c01',
    scope: 'duel',
    text: 'Oẳn tù tì — thắng 2 trên 3.'
  }, {
    id: 'c02',
    scope: 'duel',
    text: 'Thi nhìn nhau. Ai chớp mắt hoặc cười trước là thua.'
  }, {
    id: 'c03',
    scope: 'duel',
    text: 'Kể tên 5 quốc gia trong 5 giây — ai nhanh hơn thắng.'
  }, {
    id: 'c04',
    scope: 'duel',
    text: 'Vật ngón cái. Thắng 2 trên 3.'
  }, {
    id: 'c05',
    scope: 'duel',
    text: 'Ai plank lâu hơn?'
  }, {
    id: 'c06',
    scope: 'duel',
    text: 'Đọc ngược bảng chữ cái. Ai ít sai hơn thắng.'
  }, {
    id: 'c07',
    scope: 'duel',
    text: 'Đấu khen: lần lượt khen đối phương — ai bí trước thua.'
  }, {
    id: 'c08',
    scope: 'duel',
    text: 'Đấu nhại: cả bàn bình chọn ai nhại người trong phòng giống nhất.'
  }, {
    id: 'c09',
    scope: 'duel',
    text: 'Cùng đếm tới 20, mỗi người một số — ai vấp thua.'
  }, {
    id: 'c10',
    scope: 'duel',
    text: 'Thi nhảy: mỗi người 20 giây, cả bàn quyết định.'
  }, {
    id: 'c11',
    scope: 'duel',
    text: 'Lần lượt kể tên phim có con số trong tựa. Ai bí trước thua.'
  }, {
    id: 'c12',
    scope: 'duel',
    text: 'Đứng một chân nhắm mắt. Ai lâu hơn thắng.'
  }, {
    id: 'c13',
    scope: 'duel',
    text: 'Ai kể nhanh nhất 3 bài hát của cùng một ca sĩ.'
  }, {
    id: 'c14',
    scope: 'duel',
    text: 'Đấu nói líu lưỡi: “Lúa nếp là lúa nếp làng, lúa lên lớp lớp lòng nàng lâng lâng” — 3 lần thật nhanh.'
  }, {
    id: 'c15',
    scope: 'duel',
    text: 'Đố nhanh: cả bàn hỏi một câu — ai trả lời đúng trước thắng.'
  }, {
    id: 'c16',
    scope: 'duel',
    drink: true,
    text: 'Ai cạn ly trước.',
    alt: 'Ai uống hết ly nước trước.'
  }, {
    id: 'c31',
    scope: 'duel',
    text: 'Vật tay. Một ván, không nương tay.'
  }, {
    id: 'c32',
    scope: 'duel',
    text: 'Rap battle: mỗi người 4 câu về đối phương. Cả bàn chấm.'
  }, {
    id: 'c33',
    scope: 'duel',
    text: 'Ai nói “nồi đồng nấu ốc, nồi đất nấu ếch” 5 lần nhanh nhất không vấp?'
  }, {
    id: 'c34',
    scope: 'duel',
    text: 'Đấu trí nhớ: nhìn bàn 10 giây rồi kể lại đồ trên bàn. Ai nhớ nhiều hơn thắng.'
  }, {
    id: 'c35',
    scope: 'duel',
    text: 'Lần lượt kể tên thủ đô. Ai lặp lại hoặc bí trước thua.'
  }, {
    id: 'c36',
    scope: 'duel',
    text: 'Lật chai. Ai dựng đứng được chai trước thắng.'
  }, {
    id: 'c37',
    scope: 'duel',
    text: 'Ngân nga một bài — đối phương có 15 giây để đoán. Rồi đổi. Ai đoán nhanh hơn thắng.'
  }, {
    id: 'c38',
    scope: 'duel',
    text: 'Đọc khẩu hình: đọc một câu từ bên kia phòng. Ai đoán gần đúng hơn thắng.'
  }, {
    id: 'c39',
    scope: 'duel',
    text: 'Giữ mặt lạnh khi đối phương kể chuyện cười 30 giây. Rồi đổi.'
  }, {
    id: 'c40',
    scope: 'duel',
    text: 'Nín thở. Ai lâu hơn thắng.'
  }, {
    id: 'c41',
    scope: 'duel',
    text: 'Vẽ nhanh một con vật trong 15 giây — cả bàn đoán hình ai rõ hơn.'
  }, {
    id: 'c42',
    scope: 'duel',
    text: 'Solo guitar tưởng tượng 15 giây mỗi người. Tiếng hò reo quyết định.'
  }, {
    id: 'c43',
    scope: 'duel',
    text: 'Lần lượt kể hãng giày thể thao. Ai bí trước thua.'
  }, {
    id: 'c44',
    scope: 'duel',
    text: 'Đánh nhau quay chậm 20 giây. Ai kịch tính hơn thắng.'
  }, {
    id: 'c45',
    scope: 'duel',
    text: 'Đứng tượng. Ai nhúc nhích trước thua.'
  }, {
    id: 'c46',
    scope: 'duel',
    text: 'Nói “anh yêu em/em yêu anh” bằng 5 giọng vùng miền. Giọng hay nhất thắng.'
  }, {
    id: 'c47',
    scope: 'duel',
    text: 'Cùng tả một bộ phim mà không nói tên — cả bàn chọn ai tả hay hơn.'
  }, {
    id: 'c48',
    scope: 'duel',
    drink: true,
    text: 'Tung đồng xu: người thua nhấp một ngụm.',
    alt: 'Tung đồng xu: người thua squat 5 cái.'
  }, {
    id: 'c17',
    scope: 'solo',
    text: 'Hít đất 10 cái trong 20 giây.'
  }, {
    id: 'c18',
    scope: 'solo',
    text: 'Hát điệp khúc bài bạn vừa nghe gần nhất.'
  }, {
    id: 'c19',
    scope: 'solo',
    text: 'Nói giọng vùng miền khác cho tới lượt sau.'
  }, {
    id: 'c20',
    scope: 'solo',
    text: 'Làm cả bàn cười trong 30 giây.'
  }, {
    id: 'c21',
    scope: 'solo',
    text: 'Kể 7 hãng xe trong 10 giây.'
  }, {
    id: 'c22',
    scope: 'solo',
    text: 'Ứng khẩu 4 câu rap về người bên phải bạn.'
  }, {
    id: 'c23',
    scope: 'solo',
    text: 'Catwalk một vòng quanh phòng thật thần thái.'
  }, {
    id: 'c24',
    scope: 'solo',
    text: 'Ngồi tựa tường (wall-sit) 30 giây.'
  }, {
    id: 'c25',
    scope: 'solo',
    drink: true,
    text: 'Nhấp một ngụm rồi kể về lần say tệ nhất của bạn.',
    alt: 'Kể về buổi sáng xấu hổ nhất của bạn.'
  }, {
    id: 'c49',
    scope: 'solo',
    text: 'Đọc ngược 12 tháng trong năm trong 15 giây.'
  }, {
    id: 'c50',
    scope: 'solo',
    text: 'Nhại người bên trái bạn trong 20 giây.'
  }, {
    id: 'c51',
    scope: 'solo',
    text: 'Bán cho cả bàn một món đồ trong tầm tay, kiểu quảng cáo TV, 30 giây.'
  }, {
    id: 'c52',
    scope: 'solo',
    text: 'Kể một câu chuyện chỉ bằng câu hỏi trong 30 giây.'
  }, {
    id: 'c53',
    scope: 'solo',
    text: 'Kể 10 con vật trong 10 giây.'
  }, {
    id: 'c54',
    scope: 'solo',
    text: 'Nhảy robot 15 giây.'
  }, {
    id: 'c55',
    scope: 'solo',
    text: 'Chỉ nói có vần cho tới lượt sau.'
  }, {
    id: 'c56',
    scope: 'solo',
    text: 'Đọc tin nhắn gần nhất bạn nhận được như đọc thơ bi tráng.'
  }, {
    id: 'c57',
    scope: 'solo',
    text: 'Đánh vần ngược họ tên đầy đủ của bạn, không được viết ra.'
  }, {
    id: 'c58',
    scope: 'solo',
    text: 'Lấy được 3 cái đập tay từ cả bàn trong 10 giây.'
  }, {
    id: 'c59',
    scope: 'solo',
    text: 'Diễn một môn thể thao cho tới khi cả bàn đoán ra — dưới 20 giây.'
  }, {
    id: 'c60',
    scope: 'solo',
    text: 'Nói nhanh 3 lần: “Buổi trưa ăn bưởi chua.”'
  }, {
    id: 'c61',
    scope: 'solo',
    text: 'Cười như phản diện trong 10 giây liên tục.'
  }, {
    id: 'c62',
    scope: 'solo',
    text: 'Khen từng người ở bàn trong vòng 30 giây.'
  }, {
    id: 'c63',
    scope: 'solo',
    text: 'Giữ thăng bằng cái thìa trên mũi 10 giây.'
  }, {
    id: 'c64',
    scope: 'solo',
    drink: true,
    text: 'Nói một lời chúc kiểu quán bar rồi nhấp một ngụm.',
    alt: 'Nói một lời chúc kiểu quán bar với ly nước.'
  }, {
    id: 'c26',
    scope: 'all',
    text: 'Cả bàn tạo dáng — chủ trò chọn dáng đẹp nhất.'
  }, {
    id: 'c27',
    scope: 'all',
    text: 'Bình chọn nhanh: ai dễ nổi tiếng nhất? Người thắng phát biểu nhận giải 20 giây.'
  }, {
    id: 'c28',
    scope: 'all',
    text: 'Mỗi người nói một từ vần với “party”. Trùng là loại.'
  }, {
    id: 'c29',
    scope: 'all',
    text: 'Selfie cả nhóm trong 10 giây — chủ trò chấm dáng.'
  }, {
    id: 'c30',
    scope: 'all',
    drink: true,
    text: 'Cả bàn nâng ly chúc người bên trái mình.',
    alt: 'Cả bàn dành một lời khen cho người bên trái mình.'
  }, {
    id: 'c65',
    scope: 'all',
    text: 'Đua chủ đề: trái cây. Đi vòng bàn — ai bí trước bị loại.'
  }, {
    id: 'c66',
    scope: 'all',
    text: 'Cả bàn cùng ngân nga một bài. Ai cười cuối cùng thắng.'
  }, {
    id: 'c67',
    scope: 'all',
    text: 'Ngón cái: khi chủ trò đặt ngón cái lên bàn, ai bắt chước cuối cùng thua.'
  }, {
    id: 'c68',
    scope: 'all',
    text: 'Mỗi người chỉ vào người nhảy đẹp nhất. Ai nhiều ngón tay nhất phải nhảy 15 giây.'
  }, {
    id: 'c69',
    scope: 'all',
    text: 'Chuỗi vần: “trăng”. Đi vòng bàn — lặp lại hoặc bí là loại.'
  }, {
    id: 'c70',
    scope: 'all',
    text: 'Cả bàn đứng hình. Ai nhúc nhích trước thua.'
  }, {
    id: 'c71',
    scope: 'all',
    text: 'Cả nhóm đếm tới 10 không theo thứ tự — hai người nói cùng lúc là đếm lại.'
  }, {
    id: 'c72',
    scope: 'all',
    text: 'Kể chuyện nối: mỗi người một từ. Chuyện vô nghĩa thì chủ trò chọn thủ phạm.'
  }, {
    id: 'c73',
    scope: 'all',
    text: 'Mỗi người cho xem emoji dùng gần nhất. Buồn cười nhất thắng.'
  }, {
    id: 'c74',
    scope: 'all',
    text: 'Sóng sân vận động quanh bàn — 3 vòng sạch, không thì cả bàn thua.'
  }, {
    id: 'c75',
    scope: 'all',
    drink: true,
    text: 'Thác nước: cùng uống; không ai được dừng cho tới khi người bên phải mình dừng.',
    alt: 'Thác vỗ tay: vỗ tay liên tục cho tới khi người bên phải mình dừng.'
  }]
};
const FIVE_SECOND_PROMPTS = {
  en: ['Name 3 beer brands', 'Name 3 pizza toppings', 'Name 3 countries in Asia', 'Name 3 superheroes', 'Name 3 things that are yellow', 'Name 3 dog breeds', 'Name 3 board games', 'Name 3 ice-cream flavours', 'Name 3 car brands', 'Name 3 things in a bathroom', 'Name 3 Disney movies', 'Name 3 fruits with seeds', 'Name 3 sports played with a ball', 'Name 3 famous singers', 'Name 3 things you take to the beach', 'Name 3 kitchen tools', 'Name 3 types of pasta', 'Name 3 cocktails', 'Name 3 capital cities', 'Name 3 things that fly', 'Name 3 video games', 'Name 3 reasons to be late', 'Name 3 things that are round', 'Name 3 social networks', 'Name 3 things in a fridge', 'Name 3 Olympic sports', 'Name 3 things with wheels', 'Name 3 famous paintings', 'Name 3 things that are cold', 'Name 3 musical instruments', 'Name 3 planets', 'Name 3 things you wear on your feet', 'Name 3 K-pop groups', 'Name 3 things a cat does', 'Name 3 breakfast foods', 'Name 3 TV series', 'Name 3 things in a pencil case', 'Name 3 ways to say hello', 'Name 3 things that smell good', 'Name 3 jobs with uniforms', 'Name 3 things made of wood', 'Name 3 holidays', 'Name 3 things you do at a wedding', 'Name 3 airlines', 'Name 3 things in space', 'Name 3 ocean animals', 'Name 3 excuses for not texting back', 'Name 3 things that are sticky', 'Name 3 Marvel characters', 'Name 3 types of noodles', 'Name 3 things in a hotel room', 'Name 3 phone apps', 'Name 3 things that are loud', 'Name 3 desserts', 'Name 3 famous footballers', 'Name 3 things you can’t live without', 'Name 3 colours of the rainbow', 'Name 3 things at a birthday party', 'Name 3 words that rhyme with “cat”', 'Name 3 things you lose all the time'],
  vi: ['Kể 3 hãng bia', 'Kể 3 loại topping pizza', 'Kể 3 nước ở châu Á', 'Kể 3 siêu anh hùng', 'Kể 3 thứ màu vàng', 'Kể 3 giống chó', 'Kể 3 trò chơi bàn cờ', 'Kể 3 vị kem', 'Kể 3 hãng xe', 'Kể 3 thứ trong nhà tắm', 'Kể 3 phim Disney', 'Kể 3 loại trái cây có hạt', 'Kể 3 môn thể thao dùng bóng', 'Kể 3 ca sĩ nổi tiếng', 'Kể 3 thứ mang đi biển', 'Kể 3 dụng cụ nhà bếp', 'Kể 3 món bún/phở', 'Kể 3 loại cocktail', 'Kể 3 thủ đô', 'Kể 3 thứ biết bay', 'Kể 3 trò chơi điện tử', 'Kể 3 lý do đi trễ', 'Kể 3 thứ hình tròn', 'Kể 3 mạng xã hội', 'Kể 3 thứ trong tủ lạnh', 'Kể 3 môn Olympic', 'Kể 3 thứ có bánh xe', 'Kể 3 bức tranh nổi tiếng', 'Kể 3 thứ lạnh', 'Kể 3 nhạc cụ', 'Kể 3 hành tinh', 'Kể 3 thứ mang ở chân', 'Kể 3 nhóm nhạc K-pop', 'Kể 3 việc con mèo hay làm', 'Kể 3 món ăn sáng', 'Kể 3 bộ phim truyền hình', 'Kể 3 thứ trong hộp bút', 'Kể 3 cách chào hỏi', 'Kể 3 thứ có mùi thơm', 'Kể 3 nghề mặc đồng phục', 'Kể 3 thứ làm bằng gỗ', 'Kể 3 ngày lễ', 'Kể 3 việc làm ở đám cưới', 'Kể 3 hãng hàng không', 'Kể 3 thứ ngoài vũ trụ', 'Kể 3 loài vật dưới biển', 'Kể 3 lý do không nhắn tin lại', 'Kể 3 thứ dính dính', 'Kể 3 nhân vật Marvel', 'Kể 3 loại mì', 'Kể 3 thứ trong phòng khách sạn', 'Kể 3 ứng dụng điện thoại', 'Kể 3 thứ gây ồn', 'Kể 3 món tráng miệng', 'Kể 3 cầu thủ nổi tiếng', 'Kể 3 thứ không thể sống thiếu', 'Kể 3 màu cầu vồng', 'Kể 3 thứ ở tiệc sinh nhật', 'Kể 3 từ vần với “mèo”', 'Kể 3 thứ bạn hay làm mất']
};
const DONT_LAUGH_PROMPTS = {
  en: ['Make them laugh without touching them.', 'Tell your worst joke with a completely straight face.', 'Do an impression of a celebrity.', 'Describe your morning routine like a sports commentator.', 'Sing “Happy Birthday” in a baby voice.', 'Dance like nobody is watching (they are).', 'Explain how to boil water as a dramatic movie trailer.', 'Have a serious conversation with an invisible friend.', 'Order a pizza as an opera singer.', 'Read the room’s Wi-Fi password like a love poem.', 'Narrate the judge’s life like a nature documentary.', 'Do a weather report for the inside of this room.', 'Speak only in slow motion for 30 seconds.', 'Pretend you’re a cat who has just discovered the judge.', 'Give a TED talk about why socks disappear.', 'Make the sound of 5 different animals, blending them into one.', 'Propose to the judge in the most awkward way possible.', 'Act like you’re stuck in an invisible box — then the box starts shrinking.', 'Be a robot that is slowly running out of battery.', 'Describe a sandwich as if it were a crime scene.', 'Imitate a GPS that is very passive-aggressive.', 'Perform a cooking show with no ingredients.', 'Be a sports mascot at a funeral.', 'Whisper a motivational speech.'],
  vi: ['Làm họ cười mà không được chạm vào.', 'Kể câu đùa nhạt nhất của bạn với mặt nghiêm hết cỡ.', 'Nhại một người nổi tiếng.', 'Mô tả buổi sáng của bạn như bình luận viên bóng đá.', 'Hát “Chúc mừng sinh nhật” bằng giọng em bé.', 'Nhảy như không ai nhìn (nhưng mà có).', 'Giải thích cách đun nước như trailer phim bom tấn.', 'Nói chuyện nghiêm túc với một người bạn vô hình.', 'Gọi pizza bằng giọng opera.', 'Đọc mật khẩu Wi-Fi như đọc thơ tình.', 'Thuyết minh cuộc đời giám khảo như phim tài liệu thiên nhiên.', 'Dự báo thời tiết cho bên trong căn phòng này.', 'Nói chuyện quay chậm trong 30 giây.', 'Giả làm con mèo vừa phát hiện ra giám khảo.', 'Diễn thuyết TED về lý do tất hay biến mất.', 'Kêu tiếng 5 con vật rồi trộn thành một.', 'Cầu hôn giám khảo theo cách ngượng nhất có thể.', 'Diễn bị kẹt trong hộp vô hình — rồi cái hộp co lại.', 'Làm robot sắp hết pin.', 'Tả cái bánh mì như hiện trường vụ án.', 'Nhại giọng chỉ đường GPS rất khó ở.', 'Dẫn chương trình nấu ăn không có nguyên liệu.', 'Làm linh vật thể thao ở đám tang.', 'Thì thầm một bài diễn văn truyền động lực.']
};
const WORD_CATEGORIES = {
  en: ['Beer brands', 'Animals', 'Countries', 'Fruits', 'Movie titles', 'Things in a kitchen', 'Celebrities', 'Car brands', 'Things at a party', 'Jobs', 'Cities', 'Snacks', 'Sports', 'Body parts', 'Song titles', 'Clothing', 'Things that are green', 'Cartoon characters', 'Vegetables', 'Drinks', 'Things in a school', 'Superpowers', 'Board games', 'Things in the sky'],
  vi: ['Hãng bia', 'Động vật', 'Quốc gia', 'Trái cây', 'Tên phim', 'Đồ trong bếp', 'Người nổi tiếng', 'Hãng xe', 'Đồ trong tiệc', 'Nghề nghiệp', 'Thành phố', 'Đồ ăn vặt', 'Môn thể thao', 'Bộ phận cơ thể', 'Tên bài hát', 'Quần áo', 'Thứ màu xanh lá', 'Nhân vật hoạt hình', 'Rau củ', 'Đồ uống', 'Đồ trong trường học', 'Siêu năng lực', 'Trò chơi bàn cờ', 'Thứ trên bầu trời']
};
const WORD_LETTERS = 'ABCDGHKLMNPST';
const CHARADES_DECKS = {
  en: {
    animals: {
      icon: '🦁',
      title: 'Animals',
      words: ['Elephant', 'Penguin', 'Kangaroo', 'Octopus', 'Giraffe', 'Monkey', 'Snake', 'Flamingo', 'Crab', 'Sloth', 'Shark', 'Rooster', 'Butterfly', 'Gorilla', 'Mosquito', 'Hamster', 'Peacock', 'T-Rex', 'Owl', 'Frog']
    },
    actions: {
      icon: '🏃',
      title: 'Actions',
      words: ['Brushing teeth', 'Fishing', 'Skateboarding', 'Taking a selfie', 'Milking a cow', 'Juggling', 'Proposing', 'Sneezing', 'Parallel parking', 'Surfing', 'Ironing', 'Changing a diaper', 'Playing drums', 'Bowling', 'Yoga', 'Arm wrestling', 'Making pizza', 'Karaoke', 'Texting while walking', 'Waking up late']
    },
    movies: {
      icon: '🎬',
      title: 'Movies',
      words: ['Titanic', 'Frozen', 'Jaws', 'Spider-Man', 'The Lion King', 'Harry Potter', 'Jurassic Park', 'Toy Story', 'Rocky', 'Avatar', 'Finding Nemo', 'Star Wars', 'The Matrix', 'Minions', 'Pirates of the Caribbean', 'Ghostbusters', 'Shrek', 'Mission: Impossible', 'Up', 'Fast & Furious']
    },
    jobs: {
      icon: '👩‍🚒',
      title: 'Jobs',
      words: ['Firefighter', 'Dentist', 'Chef', 'Pilot', 'Hairdresser', 'Magician', 'Lifeguard', 'DJ', 'Farmer', 'Surgeon', 'Barista', 'Taxi driver', 'Astronaut', 'Photographer', 'Teacher', 'Plumber', 'Referee', 'Waiter', 'Zookeeper', 'YouTuber']
    },
    things: {
      icon: '🪑',
      title: 'Things',
      words: ['Umbrella', 'Toothbrush', 'Microwave', 'Trampoline', 'Vacuum cleaner', 'Guitar', 'Helmet', 'Hammock', 'Blender', 'Ladder', 'Scissors', 'Treadmill', 'Candle', 'Backpack', 'Mirror', 'Wheelbarrow', 'Telescope', 'Tent', 'Lipstick', 'Drone']
    }
  },
  vi: {
    animals: {
      icon: '🦁',
      title: 'Động vật',
      words: ['Con voi', 'Chim cánh cụt', 'Kangaroo', 'Bạch tuộc', 'Hươu cao cổ', 'Con khỉ', 'Con rắn', 'Hồng hạc', 'Con cua', 'Con lười', 'Cá mập', 'Con gà trống', 'Con bướm', 'Khỉ đột', 'Con muỗi', 'Chuột hamster', 'Con công', 'Khủng long T-Rex', 'Con cú', 'Con ếch']
    },
    actions: {
      icon: '🏃',
      title: 'Hành động',
      words: ['Đánh răng', 'Câu cá', 'Trượt ván', 'Chụp selfie', 'Vắt sữa bò', 'Tung hứng', 'Cầu hôn', 'Hắt xì', 'Đỗ xe song song', 'Lướt sóng', 'Ủi đồ', 'Thay tã', 'Đánh trống', 'Chơi bowling', 'Tập yoga', 'Vật tay', 'Làm pizza', 'Hát karaoke', 'Vừa đi vừa nhắn tin', 'Ngủ dậy muộn']
    },
    movies: {
      icon: '🎬',
      title: 'Phim',
      words: ['Titanic', 'Frozen', 'Hàm cá mập', 'Người Nhện', 'Vua Sư Tử', 'Harry Potter', 'Công viên kỷ Jura', 'Câu chuyện đồ chơi', 'Rocky', 'Avatar', 'Đi tìm Nemo', 'Star Wars', 'Ma trận', 'Minions', 'Cướp biển Caribbean', 'Biệt đội săn ma', 'Shrek', 'Nhiệm vụ bất khả thi', 'Vút bay', 'Quá nhanh quá nguy hiểm']
    },
    jobs: {
      icon: '👩‍🚒',
      title: 'Nghề',
      words: ['Lính cứu hoả', 'Nha sĩ', 'Đầu bếp', 'Phi công', 'Thợ làm tóc', 'Ảo thuật gia', 'Cứu hộ bãi biển', 'DJ', 'Nông dân', 'Bác sĩ phẫu thuật', 'Pha chế cà phê', 'Tài xế taxi', 'Phi hành gia', 'Nhiếp ảnh gia', 'Giáo viên', 'Thợ sửa ống nước', 'Trọng tài', 'Phục vụ bàn', 'Nhân viên sở thú', 'YouTuber']
    },
    things: {
      icon: '🪑',
      title: 'Đồ vật',
      words: ['Cái ô', 'Bàn chải đánh răng', 'Lò vi sóng', 'Bạt nhún', 'Máy hút bụi', 'Đàn guitar', 'Mũ bảo hiểm', 'Võng', 'Máy xay sinh tố', 'Cái thang', 'Cái kéo', 'Máy chạy bộ', 'Cây nến', 'Ba lô', 'Cái gương', 'Xe cút kít', 'Kính thiên văn', 'Lều', 'Son môi', 'Drone']
    }
  }
};
const IMPOSTER_WORDS = {
  en: [{
    category: 'Place',
    words: ['Beach', 'Hospital', 'Casino', 'Airport', 'School', 'Cinema', 'Supermarket', 'Gym', 'Zoo', 'Space station', 'Wedding', 'Submarine', 'Prison', 'Night club', 'Library', 'Pirate ship']
  }, {
    category: 'Food',
    words: ['Pizza', 'Sushi', 'Phở', 'Burger', 'Ice cream', 'Spring roll', 'Pancake', 'Hotpot', 'Taco', 'Fried chicken', 'Salad', 'Chocolate']
  }, {
    category: 'Animal',
    words: ['Elephant', 'Cat', 'Shark', 'Penguin', 'Snake', 'Chicken', 'Dolphin', 'Tiger', 'Cockroach', 'Horse', 'Goldfish', 'Bee']
  }, {
    category: 'Job',
    words: ['Doctor', 'Chef', 'Pilot', 'Police officer', 'Singer', 'Teacher', 'Programmer', 'Farmer', 'Actor', 'Dentist', 'Lawyer', 'Barista']
  }, {
    category: 'Object',
    words: ['Phone', 'Umbrella', 'Toilet', 'Guitar', 'Fridge', 'Bicycle', 'Pillow', 'Mirror', 'Key', 'Candle', 'Hammer', 'Camera']
  }, {
    category: 'Celebrity type',
    words: ['Footballer', 'K-pop idol', 'Movie star', 'YouTuber', 'Rapper', 'Politician', 'Chef on TV', 'Model', 'Comedian', 'Astronaut']
  }],
  vi: [{
    category: 'Địa điểm',
    words: ['Bãi biển', 'Bệnh viện', 'Sòng bạc', 'Sân bay', 'Trường học', 'Rạp phim', 'Siêu thị', 'Phòng gym', 'Sở thú', 'Trạm vũ trụ', 'Đám cưới', 'Tàu ngầm', 'Nhà tù', 'Quán bar', 'Thư viện', 'Tàu cướp biển']
  }, {
    category: 'Món ăn',
    words: ['Pizza', 'Sushi', 'Phở', 'Bánh mì', 'Kem', 'Gỏi cuốn', 'Bánh xèo', 'Lẩu', 'Bún đậu mắm tôm', 'Gà rán', 'Bánh tráng trộn', 'Sô-cô-la']
  }, {
    category: 'Con vật',
    words: ['Con voi', 'Con mèo', 'Cá mập', 'Chim cánh cụt', 'Con rắn', 'Con gà', 'Cá heo', 'Con hổ', 'Con gián', 'Con ngựa', 'Cá vàng', 'Con ong']
  }, {
    category: 'Nghề nghiệp',
    words: ['Bác sĩ', 'Đầu bếp', 'Phi công', 'Công an', 'Ca sĩ', 'Giáo viên', 'Lập trình viên', 'Nông dân', 'Diễn viên', 'Nha sĩ', 'Luật sư', 'Pha chế']
  }, {
    category: 'Đồ vật',
    words: ['Điện thoại', 'Cái ô', 'Bồn cầu', 'Đàn guitar', 'Tủ lạnh', 'Xe đạp', 'Cái gối', 'Cái gương', 'Chìa khoá', 'Cây nến', 'Cái búa', 'Máy ảnh']
  }, {
    category: 'Kiểu người nổi tiếng',
    words: ['Cầu thủ', 'Idol K-pop', 'Ngôi sao điện ảnh', 'YouTuber', 'Rapper', 'Chính trị gia', 'Đầu bếp trên TV', 'Người mẫu', 'Danh hài', 'Phi hành gia']
  }]
};
const BOMB_CATEGORIES = {
  en: ['Pizza toppings', 'Countries in Europe', 'Things in a bathroom', 'Car brands', 'Cartoon characters', 'Fruits', 'Things that are red', 'Movie villains', 'Sports', 'Famous singers', 'Things you find at the beach', 'Dog breeds', 'Fast-food chains', 'Board games', 'Things in a classroom', 'Superheroes', 'Vegetables', 'Musical instruments', 'Things that fly', 'Capital cities', 'Phone apps', 'Breakfast foods', 'Jobs', 'Things that are cold', 'Famous brands', 'TV shows', 'Things in a hospital', 'Reasons to be late', 'Ice-cream flavours', 'Things you do on holiday', 'Words that rhyme with “night”', 'Things in a toolbox', 'Olympic sports', 'Kitchen appliances', 'Things that are soft', 'Candy and sweets', 'Zoo animals', 'Clothing brands', 'Things at a wedding', 'Video games'],
  vi: ['Topping pizza', 'Nước ở châu Âu', 'Đồ trong nhà tắm', 'Hãng xe', 'Nhân vật hoạt hình', 'Trái cây', 'Thứ màu đỏ', 'Phản diện trong phim', 'Môn thể thao', 'Ca sĩ nổi tiếng', 'Thứ ở bãi biển', 'Giống chó', 'Chuỗi đồ ăn nhanh', 'Trò chơi bàn cờ', 'Đồ trong lớp học', 'Siêu anh hùng', 'Rau củ', 'Nhạc cụ', 'Thứ biết bay', 'Thủ đô', 'Ứng dụng điện thoại', 'Món ăn sáng', 'Nghề nghiệp', 'Thứ lạnh', 'Thương hiệu nổi tiếng', 'Chương trình TV', 'Đồ trong bệnh viện', 'Lý do đi trễ', 'Vị kem', 'Việc làm khi đi du lịch', 'Từ vần với “đêm”', 'Đồ trong hộp dụng cụ', 'Môn Olympic', 'Đồ điện nhà bếp', 'Thứ mềm mềm', 'Kẹo bánh', 'Thú trong sở thú', 'Hãng thời trang', 'Thứ ở đám cưới', 'Trò chơi điện tử']
};

/* ==== js/quiz/quizEngine.js ==== */
const L = (obj, lang) => obj ? obj[lang] || obj.en || '' : '';
const QUESTION_TYPES = {
  mc: {
    supported: true,
    label: {
      en: 'Multiple choice',
      vi: 'Trắc nghiệm'
    }
  },
  tf: {
    supported: true,
    label: {
      en: 'True / False',
      vi: 'Đúng / Sai'
    }
  },
  guess_country: {
    supported: false,
    label: {
      en: 'Guess the country',
      vi: 'Đoán quốc gia'
    }
  },
  match: {
    supported: false,
    label: {
      en: 'Match the pair',
      vi: 'Ghép cặp'
    }
  },
  fill_blank: {
    supported: false,
    label: {
      en: 'Fill in the blank',
      vi: 'Điền vào chỗ trống'
    }
  },
  speed: {
    supported: false,
    label: {
      en: 'Speed question',
      vi: 'Câu hỏi tốc độ'
    }
  },
  audio: {
    supported: false,
    label: {
      en: 'Audio quiz',
      vi: 'Đố âm thanh'
    }
  },
  emoji: {
    supported: false,
    label: {
      en: 'Emoji quiz',
      vi: 'Đố emoji'
    }
  }
};
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const TF_OPTIONS = [{
  en: 'True',
  vi: 'Đúng'
}, {
  en: 'False',
  vi: 'Sai'
}];
const QUIZ_RULESETS = {
  party: {
    id: 'party',
    icon: '🎉',
    time: 15000,
    points: 100,
    speedBonus: 50,
    includeAdult: true,
    explanation: 'when-present'
  },
  classroom: {
    id: 'classroom',
    icon: '🏫',
    time: 25000,
    points: 100,
    speedBonus: 0,
    includeAdult: false,
    explanation: 'when-present'
  }
};
const normalizeQuestion = (raw, themeId, index) => {
  const type = raw.type || 'mc';
  if (!QUESTION_TYPES[type] || !QUESTION_TYPES[type].supported) return null;
  let options;
  if (type === 'tf') {
    options = TF_OPTIONS.map(o => ({
      ...o
    }));
  } else {
    const en = raw.options_en || [];
    const vi = raw.options_vi || en;
    options = en.map((text, k) => ({
      en: text,
      vi: vi[k] || text,
      media: raw.options_media ? raw.options_media[k] || null : null
    }));
  }
  const answer = Number(raw.answer);
  if (!raw.question_en || options.length < 2 || !(answer >= 0 && answer < options.length)) return null;
  return {
    id: raw.id || `${themeId}-${index}`,
    theme: themeId,
    type,
    timeMs: raw.timeMs == null ? null : raw.timeMs,
    points: raw.points == null ? null : raw.points,
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : 'medium',
    audience: raw.adult ? 'adult' : 'all',
    tags: raw.tags || [],
    question: {
      en: raw.question_en,
      vi: raw.question_vi || raw.question_en
    },
    options,
    answer,
    explanation: raw.explanation_en ? {
      en: raw.explanation_en,
      vi: raw.explanation_vi || raw.explanation_en
    } : null,
    media: raw.media || null
  };
};
const seededRandom = seed => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  return () => {
    h = Math.imul(h ^ h >>> 16, 2246822507);
    h = Math.imul(h ^ h >>> 13, 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};
const seededShuffle = (arr, seed) => {
  const r = seededRandom(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const withCorrect = (correct, distractors, seed) => {
  const pos = Math.floor(seededRandom(seed + ':pos')() * (distractors.length + 1));
  const opts = [...distractors];
  opts.splice(pos, 0, correct);
  return {
    opts,
    answer: pos
  };
};
const flagImage = code => `https://flagcdn.com/w320/${code}.png`;
const flagEmoji = code => String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
const QUIZ_GENERATORS = {
  flags: (rows, themeId) => {
    const out = [];
    const byCode = Object.fromEntries(rows.map(c => [c.code, c]));
    const distractorsFor = (c, seed) => {
      const banned = new Set([c.code, ...(c.lookalikes || [])]);
      rows.forEach(o => {
        if ((o.lookalikes || []).includes(c.code)) banned.add(o.code);
      });
      const same = seededShuffle(rows.filter(o => !banned.has(o.code) && o.continent === c.continent), seed);
      const other = seededShuffle(rows.filter(o => !banned.has(o.code) && o.continent !== c.continent), seed + 'x');
      return [...same, ...other].slice(0, 3);
    };
    rows.forEach(c => {
      if (!c.code || !c.name_en) return;
      const media = {
        type: 'image',
        src: flagImage(c.code),
        emoji: flagEmoji(c.code),
        alt: {
          en: 'A national flag',
          vi: 'Một lá quốc kỳ'
        }
      };
      {
        const d = distractorsFor(c, c.code + 'a');
        const {
          opts,
          answer
        } = withCorrect(c, d, c.code + 'a');
        out.push({
          id: `${themeId}-img-${c.code}`,
          type: 'mc',
          difficulty: c.difficulty,
          tags: ['flag', c.continent.toLowerCase()],
          question_en: 'Which country does this flag belong to?',
          question_vi: 'Lá cờ này là quốc kỳ của nước nào?',
          options_en: opts.map(o => o.name_en),
          options_vi: opts.map(o => o.name_vi),
          answer,
          media,
          explanation_en: `${c.name_en}: ${c.feature_en}.`,
          explanation_vi: `${c.name_vi}: ${c.feature_vi}.`
        });
      }
      {
        const d = distractorsFor(c, c.code + 'b');
        const {
          opts,
          answer
        } = withCorrect(c, d, c.code + 'b');
        out.push({
          id: `${themeId}-pick-${c.code}`,
          type: 'mc',
          difficulty: c.difficulty,
          tags: ['flag', c.continent.toLowerCase()],
          question_en: `Which of these is the flag of ${c.name_en}?`,
          question_vi: `Đâu là quốc kỳ của ${c.name_vi}?`,
          options_en: opts.map(o => o.name_en),
          options_vi: opts.map(o => o.name_vi),
          answer,
          options_media: opts.map(o => ({
            type: 'image',
            src: flagImage(o.code),
            emoji: flagEmoji(o.code),
            hideLabel: true
          })),
          explanation_en: `${c.name_en}: ${c.feature_en}.`,
          explanation_vi: `${c.name_vi}: ${c.feature_vi}.`
        });
      }
      if (c.feature_en && c.feature_vi) {
        const d = distractorsFor(c, c.code + 'c');
        const {
          opts,
          answer
        } = withCorrect(c, d, c.code + 'c');
        out.push({
          id: `${themeId}-desc-${c.code}`,
          type: 'mc',
          difficulty: c.difficulty === 'easy' ? 'medium' : c.difficulty,
          tags: ['flag', 'design'],
          question_en: `Whose flag shows ${c.feature_en}?`,
          question_vi: `Quốc kỳ nước nào có ${c.feature_vi}?`,
          options_en: opts.map(o => o.name_en),
          options_vi: opts.map(o => o.name_vi),
          answer,
          explanation_en: `This is the flag of ${c.name_en}.`,
          explanation_vi: `Đây là quốc kỳ của ${c.name_vi}.`
        });
      }
    });
    void byCode;
    return out;
  },
  associations: (rows, themeId) => {
    const out = [];
    const animalsOfPlace = {};
    const placesOfAnimal = {};
    rows.forEach(r => {
      (animalsOfPlace[r.place_en] = animalsOfPlace[r.place_en] || new Set()).add(r.animal_en);
      (placesOfAnimal[r.animal_en] = placesOfAnimal[r.animal_en] || new Set()).add(r.place_en);
    });
    const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const uniqBy = (arr, key) => {
      const seen = new Set();
      return arr.filter(x => seen.has(key(x)) ? false : (seen.add(key(x)), true));
    };
    const why = r => ({
      explanation_en: `The ${r.animal_en} — ${r.status_en} (${r.place_en}).`,
      explanation_vi: `${r.animal_vi} — ${r.status_vi} (${r.place_vi}).`
    });
    rows.forEach(r => {
      const seed = 'ap' + r.animal_en + r.place_en;
      const pool = uniqBy(seededShuffle(rows.filter(o => o.region !== r.region && !placesOfAnimal[r.animal_en].has(o.place_en)), seed), o => o.place_en).slice(0, 3);
      if (pool.length < 3) return;
      const {
        opts,
        answer
      } = withCorrect(r, pool, seed);
      out.push({
        id: `${themeId}-ap-${slug(r.animal_en)}-${slug(r.place_en)}`,
        type: 'mc',
        difficulty: r.difficulty,
        tags: ['animal', 'country', r.region.toLowerCase()],
        question_en: `${r.emoji} The ${r.animal_en} is commonly associated with which place?`,
        question_vi: `${r.emoji} ${r.animal_vi} thường gắn liền với nơi nào?`,
        options_en: opts.map(o => o.place_en),
        options_vi: opts.map(o => o.place_vi),
        answer,
        ...why(r)
      });
    });
    uniqBy(rows, r => r.place_en).forEach(r => {
      const seed = 'pa' + r.place_en;
      const pool = uniqBy(seededShuffle(rows.filter(o => o.region !== r.region && !animalsOfPlace[r.place_en].has(o.animal_en)), seed), o => o.animal_en).slice(0, 3);
      if (pool.length < 3) return;
      const {
        opts,
        answer
      } = withCorrect(r, pool, seed);
      out.push({
        id: `${themeId}-pa-${slug(r.place_en)}`,
        type: 'mc',
        difficulty: r.difficulty,
        tags: ['animal', 'country', r.region.toLowerCase()],
        question_en: `Which animal is commonly associated with ${r.place_en}?`,
        question_vi: `Loài vật nào thường gắn liền với ${r.place_vi}?`,
        options_en: opts.map(o => `${o.emoji} ${o.animal_en}`),
        options_vi: opts.map(o => `${o.emoji} ${o.animal_vi}`),
        answer,
        ...why(r)
      });
    });
    return out;
  }
};
const buildThemesFromPacks = () => {
  const packs = typeof window !== 'undefined' && window.JPARTY_QUIZ_PACKS || [];
  return packs.filter(p => p && p.id && p.title).map(p => {
    const raw = [...(p.questions || [])];
    (p.generate || []).forEach(g => {
      const fn = QUIZ_GENERATORS[g.use];
      const table = p.tables && p.tables[g.from];
      if (fn && Array.isArray(table)) raw.push(...fn(table, p.id));
    });
    const seen = new Set();
    const questions = raw.map((q, i) => normalizeQuestion(q, p.id, i)).filter(q => q && !seen.has(q.id) && (seen.add(q.id), true));
    return {
      id: p.id,
      order: p.order ?? 100,
      icon: p.icon || '🧠',
      accent: p.accent || '#60a5fa',
      plan: p.plan || 'free',
      difficulty: p.difficulty || 'medium',
      title: p.title,
      description: p.description || {
        en: '',
        vi: ''
      },
      questions
    };
  }).sort((a, b) => a.order - b.order);
};
const BUILTIN_QUIZ_THEMES = buildThemesFromPacks();
const QUIZ_THEMES = [...BUILTIN_QUIZ_THEMES];
const registerCustomQuizThemes = customThemes => {
  QUIZ_THEMES.length = 0;
  QUIZ_THEMES.push(...BUILTIN_QUIZ_THEMES, ...customThemes);
  return QUIZ_THEMES;
};
const quizTheme = id => QUIZ_THEMES.find(th => th.id === id) || null;
const rulesetFor = (themeId, rulesetId) => {
  const th = quizTheme(themeId);
  if (th && th.ruleset && rulesetId === 'custom') return th.ruleset;
  return QUIZ_RULESETS[rulesetId] || QUIZ_RULESETS.party;
};
const quizPool = (themeId, {
  ruleset = 'party',
  difficulty = 'all'
} = {}) => {
  const th = quizTheme(themeId);
  if (!th) return [];
  const rs = rulesetFor(themeId, ruleset);
  return th.questions.filter(q => (rs.includeAdult || q.audience !== 'adult') && (difficulty === 'all' || q.difficulty === difficulty));
};
const difficultyMix = questions => {
  const c = {
    easy: 0,
    medium: 0,
    hard: 0
  };
  questions.forEach(q => {
    c[q.difficulty] += 1;
  });
  return c;
};
const QUIZ_RECENT_KEY = 'jparty_quiz_recent';
const QUIZ_PREFS_KEY = 'jparty_quiz_prefs';
const readJSON = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (e) {
    return fallback;
  }
};
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
};
const loadQuizPrefs = () => ({
  difficulty: 'all',
  count: 10,
  ...readJSON(QUIZ_PREFS_KEY, {}),
  ruleset: 'party'
});
const saveQuizPrefs = prefs => writeJSON(QUIZ_PREFS_KEY, prefs);
const NO_SHUFFLE = /all of the above|none of the above|both|tất cả|không có đáp án/i;
const shuffleOptions = q => {
  if (q.type !== 'mc' || q.options.some(o => NO_SHUFFLE.test(o.en))) return q;
  const order = shuffleArr(q.options.map((_, i) => i));
  return {
    ...q,
    options: order.map(i => q.options[i]),
    answer: order.indexOf(q.answer)
  };
};
const spreadTags = list => {
  const out = [];
  const rest = [...list];
  while (rest.length) {
    const prevTag = out.length ? out[out.length - 1].tags[0] : null;
    const k = rest.findIndex(q => !prevTag || q.tags[0] !== prevTag);
    out.push(rest.splice(k < 0 ? 0 : k, 1)[0]);
  }
  return out;
};
const dealQuiz = (themeId, opts, count) => {
  const pool = quizPool(themeId, opts);
  const th = quizTheme(themeId);
  const cfg = th && th.config || null;
  if (cfg && cfg.randomizeQuestions === false) {
    const picked = pool.slice(0, count);
    return cfg.randomizeAnswers === false ? picked : picked.map(shuffleOptions);
  }
  const recent = cfg && cfg.noRepeat === false ? [] : readJSON(QUIZ_RECENT_KEY, {})[themeId] || [];
  const recentRank = new Map(recent.map((id, i) => [id, i]));
  const fresh = shuffleArr(pool.filter(q => !recentRank.has(q.id)));
  const stale = pool.filter(q => recentRank.has(q.id)).sort((a, b) => recentRank.get(a.id) - recentRank.get(b.id));
  const dealt = spreadTags([...fresh, ...stale].slice(0, count));
  return cfg && cfg.randomizeAnswers === false ? dealt : dealt.map(shuffleOptions);
};
const rememberQuiz = (themeId, ids) => {
  const all = readJSON(QUIZ_RECENT_KEY, {});
  const th = quizTheme(themeId);
  const keep = Math.max(10, Math.min(300, Math.floor((th ? th.questions.length : 50) * 0.6)));
  const list = [...(all[themeId] || []).filter(id => !ids.includes(id)), ...ids].slice(-keep);
  writeJSON(QUIZ_RECENT_KEY, {
    ...all,
    [themeId]: list
  });
};

/* ==== js/content/store.js ==== */
const DB_NAME = 'jparty-content';
const DB_VERSION = 1;
const S_QUESTIONS = 'questions';
const S_GAMES = 'games';
const S_IMAGES = 'images';
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const IMAGE_MAX_SIDE = 1280;
const IMAGE_TYPES = /^image\/(png|jpeg|webp|gif)$/;
let _dbPromise = null;
const openDB = () => {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(S_QUESTIONS)) {
        const s = db.createObjectStore(S_QUESTIONS, {
          keyPath: 'id'
        });
        s.createIndex('topic', 'topic');
        s.createIndex('difficulty', 'difficulty');
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(S_GAMES)) {
        const s = db.createObjectStore(S_GAMES, {
          keyPath: 'id'
        });
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(S_IMAGES)) db.createObjectStore(S_IMAGES, {
        keyPath: 'id'
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
};
const tx = async (store, mode, fn) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.onerror = () => reject(t.error);
    t.oncomplete = () => resolve(req && req.result);
    if (req && 'onerror' in req) req.onerror = () => reject(req.error);
  });
};
const getAll = store => tx(store, 'readonly', s => s.getAll());
const BI = (en = '', vi = '') => ({
  en,
  vi: vi || en
});
const now = () => Date.now();
const createQuestion = (patch = {}) => ({
  id: `q_${uid()}`,
  type: 'mc',
  text: BI(),
  options: [{
    text: BI(),
    imageId: null
  }, {
    text: BI(),
    imageId: null
  }],
  answer: 0,
  explanation: BI(),
  imageId: null,
  difficulty: 'easy',
  topic: 'general',
  tags: [],
  timeSec: null,
  points: null,
  adult: false,
  createdAt: now(),
  updatedAt: now(),
  ...patch
});
const createGame = (patch = {}) => ({
  id: `g_${uid()}`,
  title: BI(),
  description: BI(),
  icon: '🎓',
  accent: '#a78bfa',
  questionIds: [],
  config: {
    timerSec: 20,
    pointsBase: 100,
    speedBonus: 50,
    randomizeQuestions: true,
    randomizeAnswers: true,
    noRepeat: true,
    teams: 0
  },
  createdAt: now(),
  updatedAt: now(),
  ...patch
});
const putImage = (file, errors) => new Promise((resolve, reject) => {
  if (!IMAGE_TYPES.test(file.type)) return reject(new Error(errors.type));
  if (file.size > IMAGE_MAX_BYTES) return reject(new Error(errors.size));
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const finish = blob => {
      const id = `img_${uid()}`;
      tx(S_IMAGES, 'readwrite', s => s.put({
        id,
        blob,
        type: blob.type,
        createdAt: now()
      })).then(() => resolve(id)).catch(reject);
    };
    if (scale === 1 && file.size < 400 * 1024) return finish(file);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(b => b ? finish(b) : reject(new Error(errors.type)), 'image/webp', 0.88);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error(errors.type));
  };
  img.src = url;
});
const _imageUrls = new Map();
const imageUrl = async id => {
  if (!id) return null;
  if (_imageUrls.has(id)) return _imageUrls.get(id);
  const rec = await tx(S_IMAGES, 'readonly', s => s.get(id));
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  _imageUrls.set(id, url);
  return url;
};
const deleteImage = async id => {
  if (!id) return;
  const url = _imageUrls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    _imageUrls.delete(id);
  }
  await tx(S_IMAGES, 'readwrite', s => s.delete(id));
};
const ContentStore = {
  ready: () => openDB().then(() => true).catch(() => false),
  listQuestions: () => getAll(S_QUESTIONS),
  getQuestion: id => tx(S_QUESTIONS, 'readonly', s => s.get(id)),
  saveQuestion: async q => {
    const rec = {
      ...createQuestion(),
      ...q,
      updatedAt: now()
    };
    await tx(S_QUESTIONS, 'readwrite', s => s.put(rec));
    return rec;
  },
  deleteQuestion: async id => {
    const q = await ContentStore.getQuestion(id);
    if (q) {
      await deleteImage(q.imageId);
      await Promise.all((q.options || []).map(o => deleteImage(o.imageId)));
    }
    await tx(S_QUESTIONS, 'readwrite', s => s.delete(id));
    const games = await getAll(S_GAMES);
    await Promise.all(games.filter(g => g.questionIds.includes(id)).map(g => tx(S_GAMES, 'readwrite', s => s.put({
      ...g,
      questionIds: g.questionIds.filter(x => x !== id),
      updatedAt: now()
    }))));
  },
  listGames: () => getAll(S_GAMES),
  getGame: id => tx(S_GAMES, 'readonly', s => s.get(id)),
  saveGame: async g => {
    const rec = {
      ...createGame(),
      ...g,
      config: {
        ...createGame().config,
        ...(g.config || {})
      },
      updatedAt: now()
    };
    await tx(S_GAMES, 'readwrite', s => s.put(rec));
    return rec;
  },
  duplicateGame: async (id, titleSuffix) => {
    const g = await ContentStore.getGame(id);
    if (!g) return null;
    return ContentStore.saveGame({
      ...g,
      id: `g_${uid()}`,
      createdAt: now(),
      title: {
        en: `${g.title.en} ${titleSuffix}`.trim(),
        vi: `${g.title.vi} ${titleSuffix}`.trim()
      }
    });
  },
  deleteGame: id => tx(S_GAMES, 'readwrite', s => s.delete(id)),
  putImage,
  imageUrl,
  deleteImage,
  questionsOf: async game => {
    const all = await getAll(S_QUESTIONS);
    const byId = new Map(all.map(q => [q.id, q]));
    return game.questionIds.map(id => byId.get(id)).filter(Boolean);
  },
  importFromTheme: async (themeId, limit) => {
    const th = quizTheme(themeId);
    if (!th) return 0;
    const picked = shuffleArr(th.questions).slice(0, limit);
    await Promise.all(picked.map(q => ContentStore.saveQuestion({
      id: `q_${uid()}`,
      type: q.type,
      text: {
        ...q.question
      },
      options: q.options.map(o => ({
        text: {
          en: o.en,
          vi: o.vi
        },
        imageId: null
      })),
      answer: q.answer,
      explanation: q.explanation ? {
        ...q.explanation
      } : BI(),
      imageId: null,
      difficulty: q.difficulty,
      topic: themeId,
      tags: q.tags,
      adult: q.audience === 'adult',
      source: `builtin:${themeId}`
    })));
    return picked.length;
  }
};
const BUILTIN_TOPICS = ['general', 'animals', 'science', 'math', 'english', 'geography'];
const topicsOf = questions => {
  const set = new Set(BUILTIN_TOPICS);
  questions.forEach(q => q.topic && set.add(q.topic));
  return [...set];
};

/* ==== js/content/customGames.js ==== */
const customRuleset = game => ({
  id: `custom:${game.id}`,
  icon: game.icon || '🎓',
  time: (game.config.timerSec || 0) * 1000,
  points: game.config.pointsBase,
  speedBonus: game.config.speedBonus,
  includeAdult: true,
  explanation: 'when-present'
});
const customQuestionToPack = async q => {
  const imageUrl = await ContentStore.imageUrl(q.imageId);
  const optionMedia = await Promise.all((q.options || []).map(o => ContentStore.imageUrl(o.imageId)));
  const hasOptionMedia = optionMedia.some(Boolean);
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    question_en: q.text.en,
    question_vi: q.text.vi || q.text.en,
    options_en: (q.options || []).map(o => o.text.en),
    options_vi: (q.options || []).map(o => o.text.vi || o.text.en),
    answer: q.answer,
    explanation_en: q.explanation && q.explanation.en ? q.explanation.en : undefined,
    explanation_vi: q.explanation && q.explanation.vi ? q.explanation.vi : undefined,
    tags: q.tags && q.tags.length ? q.tags : [q.topic || 'custom'],
    adult: !!q.adult,
    media: imageUrl ? {
      type: 'image',
      src: imageUrl,
      alt: {
        en: '',
        vi: ''
      }
    } : null,
    options_media: hasOptionMedia ? optionMedia.map(src => src ? {
      type: 'image',
      src
    } : null) : null,
    timeMs: q.timeSec == null ? null : q.timeSec * 1000,
    points: q.points == null ? null : q.points
  };
};
const buildCustomThemes = async games => {
  const all = await ContentStore.listQuestions();
  const byId = new Map(all.map(q => [q.id, q]));
  const themes = [];
  for (const g of games) {
    const picked = g.questionIds.map(id => byId.get(id)).filter(Boolean);
    const packed = await Promise.all(picked.map(customQuestionToPack));
    themes.push({
      id: `custom:${g.id}`,
      gameId: g.id,
      custom: true,
      order: 1000,
      icon: g.icon || '🎓',
      accent: g.accent || '#a78bfa',
      plan: 'free',
      difficulty: 'medium',
      title: {
        en: g.title.en || 'Untitled',
        vi: g.title.vi || g.title.en || 'Chưa đặt tên'
      },
      description: {
        en: g.description.en || '',
        vi: g.description.vi || g.description.en || ''
      },
      config: g.config,
      ruleset: customRuleset(g),
      questions: packed.map((q, i) => normalizeQuestion(q, `custom:${g.id}`, i)).filter(Boolean)
    });
  }
  return themes;
};
const refreshCustomContent = async () => {
  const games = await ContentStore.listGames();
  const themes = await buildCustomThemes(games);
  registerCustomQuizThemes(themes);
  syncCustomGames(themes);
  return {
    games,
    themes
  };
};

/* ==== js/data/cards.js ==== */
const CARD_CONTENT = {
  challenge: {
    en: [{
      id: 'ch01',
      title: 'Speed round',
      content: 'Name 5 things you’d take to a desert island in 10 seconds.',
      difficulty: 'easy'
    }, {
      id: 'ch02',
      title: 'Statue',
      content: 'Freeze in a pose until your next turn.',
      difficulty: 'easy'
    }, {
      id: 'ch03',
      title: 'Hype man',
      content: 'Introduce the player on your left like a boxing announcer.',
      difficulty: 'easy'
    }, {
      id: 'ch04',
      title: 'Push it',
      content: 'Do 10 push-ups. The table counts out loud.',
      difficulty: 'medium'
    }, {
      id: 'ch05',
      title: 'Switch seats',
      content: 'Swap seats with any player of your choice.',
      difficulty: 'easy'
    }, {
      id: 'ch06',
      title: 'Phone roulette',
      content: 'Let the player on your right send a (friendly) text from your phone.',
      difficulty: 'hard'
    }, {
      id: 'ch07',
      title: 'Karaoke',
      content: 'Sing 20 seconds of any song. No mumbling.',
      difficulty: 'medium'
    }, {
      id: 'ch08',
      title: 'Cheers',
      content: 'Make a toast to the whole table.',
      difficulty: 'easy',
      drink: true,
      alt: 'Give the whole table one shared compliment.'
    }, {
      id: 'ch09',
      title: 'Mirror',
      content: 'Copy everything the player opposite you does until your next turn.',
      difficulty: 'medium'
    }, {
      id: 'ch10',
      title: 'Showtime',
      content: 'Perform a 15-second TikTok-style dance.',
      difficulty: 'medium'
    }, {
      id: 'ch11',
      title: 'Question master',
      content: 'Until your next turn, anyone who answers a question you ask loses a point.',
      difficulty: 'medium'
    }, {
      id: 'ch12',
      title: 'Rhyme time',
      content: 'Say a word. Go around the table rhyming it — whoever stalls loses a point.',
      difficulty: 'easy'
    }, {
      id: 'ch13',
      title: 'Never-ending story',
      content: 'Start a story with one sentence; each player adds one. You judge the best line.',
      difficulty: 'easy'
    }, {
      id: 'ch14',
      title: 'Make a rule',
      content: 'Invent a rule everyone must follow for the rest of the game.',
      difficulty: 'easy'
    }, {
      id: 'ch15',
      title: 'Heaven',
      content: 'Point to the sky whenever you like — the last player to copy you loses a point.',
      difficulty: 'easy'
    }, {
      id: 'ch16',
      title: 'Categories',
      content: 'Pick a category and go around the table. The first to stall loses a point.',
      difficulty: 'easy'
    }, {
      id: 'ch17',
      title: 'Snake eyes',
      content: 'Until your next turn, anyone who makes eye contact with you owes you a point.',
      difficulty: 'medium'
    }, {
      id: 'ch18',
      title: 'Vote',
      content: 'The table votes on who has the best laugh. The winner must laugh for 10 seconds.',
      difficulty: 'easy'
    }, {
      id: 'ch19',
      title: 'Tongue twister',
      content: 'Say “unique New York” five times fast.',
      difficulty: 'medium'
    }, {
      id: 'ch20',
      title: 'Pose off',
      content: 'Strike a pose; the player opposite must out-pose you. The table decides.',
      difficulty: 'easy'
    }, {
      id: 'ch21',
      title: 'Phone call',
      content: 'Call a contact and sing them “Happy Birthday” — speaker on.',
      difficulty: 'hard'
    }, {
      id: 'ch22',
      title: 'Blindfold taste',
      content: 'Close your eyes and identify a snack someone hands you.',
      difficulty: 'medium'
    }, {
      id: 'ch23',
      title: 'Human metronome',
      content: 'Clap a steady beat for 20 seconds while everyone tries to throw you off.',
      difficulty: 'medium'
    }, {
      id: 'ch24',
      title: 'Little mate',
      content: 'Pick a buddy. Whenever one of you scores, the other does too — until your next turn.',
      difficulty: 'easy'
    }],
    vi: [{
      id: 'ch01',
      title: 'Vòng tốc độ',
      content: 'Kể 5 thứ bạn mang ra đảo hoang trong 10 giây.',
      difficulty: 'easy'
    }, {
      id: 'ch02',
      title: 'Tượng',
      content: 'Đứng yên như tượng cho tới lượt sau.',
      difficulty: 'easy'
    }, {
      id: 'ch03',
      title: 'MC',
      content: 'Giới thiệu người bên trái như MC võ đài.',
      difficulty: 'easy'
    }, {
      id: 'ch04',
      title: 'Hít đất',
      content: 'Hít đất 10 cái, cả bàn đếm to.',
      difficulty: 'medium'
    }, {
      id: 'ch05',
      title: 'Đổi chỗ',
      content: 'Đổi chỗ với bất kỳ ai bạn chọn.',
      difficulty: 'easy'
    }, {
      id: 'ch06',
      title: 'Điện thoại định mệnh',
      content: 'Để người bên phải nhắn một tin (tử tế) từ điện thoại của bạn.',
      difficulty: 'hard'
    }, {
      id: 'ch07',
      title: 'Karaoke',
      content: 'Hát 20 giây bất kỳ bài nào. Không được lí nhí.',
      difficulty: 'medium'
    }, {
      id: 'ch08',
      title: 'Nâng ly',
      content: 'Nói một lời chúc cho cả bàn.',
      difficulty: 'easy',
      drink: true,
      alt: 'Dành một lời khen chung cho cả bàn.'
    }, {
      id: 'ch09',
      title: 'Gương',
      content: 'Bắt chước mọi cử chỉ của người đối diện cho tới lượt sau.',
      difficulty: 'medium'
    }, {
      id: 'ch10',
      title: 'Trình diễn',
      content: 'Nhảy một điệu kiểu TikTok trong 15 giây.',
      difficulty: 'medium'
    }, {
      id: 'ch11',
      title: 'Chúa tể câu hỏi',
      content: 'Tới lượt sau, ai trả lời câu hỏi của bạn là mất 1 điểm.',
      difficulty: 'medium'
    }, {
      id: 'ch12',
      title: 'Gieo vần',
      content: 'Nói một từ. Đi vòng bàn gieo vần — ai bí mất 1 điểm.',
      difficulty: 'easy'
    }, {
      id: 'ch13',
      title: 'Chuyện không hồi kết',
      content: 'Mở đầu câu chuyện bằng một câu; mỗi người thêm một câu. Bạn chấm câu hay nhất.',
      difficulty: 'easy'
    }, {
      id: 'ch14',
      title: 'Đặt luật',
      content: 'Đặt một luật cả bàn phải theo đến hết ván.',
      difficulty: 'easy'
    }, {
      id: 'ch15',
      title: 'Chỉ trời',
      content: 'Chỉ lên trời lúc nào tuỳ bạn — ai bắt chước cuối cùng mất 1 điểm.',
      difficulty: 'easy'
    }, {
      id: 'ch16',
      title: 'Chủ đề',
      content: 'Chọn một chủ đề và đi vòng bàn. Ai bí trước mất 1 điểm.',
      difficulty: 'easy'
    }, {
      id: 'ch17',
      title: 'Mắt rắn',
      content: 'Tới lượt sau, ai nhìn vào mắt bạn là nợ bạn 1 điểm.',
      difficulty: 'medium'
    }, {
      id: 'ch18',
      title: 'Bình chọn',
      content: 'Cả bàn bình chọn ai cười duyên nhất. Người thắng phải cười 10 giây.',
      difficulty: 'easy'
    }, {
      id: 'ch19',
      title: 'Líu lưỡi',
      content: 'Nói “con cá rô rơi rồi” năm lần thật nhanh.',
      difficulty: 'medium'
    }, {
      id: 'ch20',
      title: 'Đấu dáng',
      content: 'Tạo dáng; người đối diện phải tạo dáng đẹp hơn. Cả bàn chấm.',
      difficulty: 'easy'
    }, {
      id: 'ch21',
      title: 'Gọi điện',
      content: 'Gọi cho một người trong danh bạ và hát “Chúc mừng sinh nhật” — bật loa ngoài.',
      difficulty: 'hard'
    }, {
      id: 'ch22',
      title: 'Nếm mù',
      content: 'Nhắm mắt đoán món ăn vặt ai đó đưa cho bạn.',
      difficulty: 'medium'
    }, {
      id: 'ch23',
      title: 'Máy đếm nhịp',
      content: 'Vỗ tay đều 20 giây trong khi cả bàn tìm cách phá nhịp.',
      difficulty: 'medium'
    }, {
      id: 'ch24',
      title: 'Bạn nối khố',
      content: 'Chọn một người bạn. Một trong hai ghi điểm thì người kia cũng được — tới lượt sau.',
      difficulty: 'easy'
    }]
  },
  truth: {
    en: [{
      id: 'tr01',
      title: 'Confession',
      content: 'What’s the most embarrassing thing on your phone right now?',
      difficulty: 'medium'
    }, {
      id: 'tr02',
      title: 'First',
      content: 'Who was your first crush and what happened?',
      difficulty: 'easy'
    }, {
      id: 'tr03',
      title: 'Oops',
      content: 'What’s the biggest lie you told this year?',
      difficulty: 'hard'
    }, {
      id: 'tr04',
      title: 'Secret skill',
      content: 'What talent do you have that nobody here knows about?',
      difficulty: 'easy'
    }, {
      id: 'tr05',
      title: 'Guilty',
      content: 'What’s the most childish thing you still do?',
      difficulty: 'easy'
    }, {
      id: 'tr06',
      title: 'Swap',
      content: 'If you could swap lives with someone here for a day, who and why?',
      difficulty: 'easy'
    }, {
      id: 'tr07',
      title: 'Search history',
      content: 'What was the last thing you searched online?',
      difficulty: 'medium'
    }, {
      id: 'tr08',
      title: 'Fear',
      content: 'What’s your most irrational fear?',
      difficulty: 'easy'
    }, {
      id: 'tr09',
      title: 'Worst date',
      content: 'Describe your worst date in 20 seconds.',
      difficulty: 'medium'
    }, {
      id: 'tr10',
      title: 'Petty',
      content: 'What’s the pettiest reason you stopped talking to someone?',
      difficulty: 'hard'
    }, {
      id: 'tr11',
      title: 'Caught',
      content: 'What’s something you did as a kid that your parents still don’t know about?',
      difficulty: 'medium'
    }, {
      id: 'tr12',
      title: 'Fake it',
      content: 'What do you pretend to like just to fit in?',
      difficulty: 'medium'
    }, {
      id: 'tr13',
      title: 'Screen time',
      content: 'What app do you spend an embarrassing amount of time on?',
      difficulty: 'easy'
    }, {
      id: 'tr14',
      title: 'Regret',
      content: 'What’s a purchase you regret the most?',
      difficulty: 'easy'
    }, {
      id: 'tr15',
      title: 'Celebrity crush',
      content: 'Who’s your celebrity crush, and would you really say yes?',
      difficulty: 'easy'
    }, {
      id: 'tr16',
      title: 'Table talk',
      content: 'Who at this table would you call first if you were in trouble? Why?',
      difficulty: 'medium'
    }, {
      id: 'tr17',
      title: 'Ghosted',
      content: 'Have you ever ghosted someone? What happened?',
      difficulty: 'hard'
    }, {
      id: 'tr18',
      title: 'Weird habit',
      content: 'What’s the weirdest habit you have when nobody is watching?',
      difficulty: 'easy'
    }, {
      id: 'tr19',
      title: 'Rewind',
      content: 'If you could redo one day of your life, which one?',
      difficulty: 'medium'
    }, {
      id: 'tr20',
      title: 'Secret playlist',
      content: 'What song do you secretly love but would never admit to?',
      difficulty: 'easy'
    }, {
      id: 'tr21',
      title: 'Lazy',
      content: 'What’s the laziest thing you’ve ever done?',
      difficulty: 'easy'
    }, {
      id: 'tr22',
      title: 'Jealous',
      content: 'When was the last time you were jealous of someone here?',
      difficulty: 'hard'
    }, {
      id: 'tr23',
      title: 'Rating',
      content: 'Rate your cooking honestly from 1 to 10 and defend it.',
      difficulty: 'easy'
    }, {
      id: 'tr24',
      title: 'Big one',
      content: 'What’s something you’ve never told anyone at this table?',
      difficulty: 'hard'
    }],
    vi: [{
      id: 'tr01',
      title: 'Thú tội',
      content: 'Thứ xấu hổ nhất trong điện thoại bạn lúc này là gì?',
      difficulty: 'medium'
    }, {
      id: 'tr02',
      title: 'Đầu tiên',
      content: 'Crush đầu tiên của bạn là ai và chuyện ra sao?',
      difficulty: 'easy'
    }, {
      id: 'tr03',
      title: 'Lỡ rồi',
      content: 'Lời nói dối lớn nhất của bạn năm nay?',
      difficulty: 'hard'
    }, {
      id: 'tr04',
      title: 'Tài lẻ',
      content: 'Bạn có tài lẻ nào mà chưa ai ở đây biết?',
      difficulty: 'easy'
    }, {
      id: 'tr05',
      title: 'Trẻ con',
      content: 'Việc trẻ con nhất bạn vẫn còn làm?',
      difficulty: 'easy'
    }, {
      id: 'tr06',
      title: 'Hoán đổi',
      content: 'Nếu được đổi đời với một người ở đây trong 1 ngày, bạn chọn ai và vì sao?',
      difficulty: 'easy'
    }, {
      id: 'tr07',
      title: 'Lịch sử tìm kiếm',
      content: 'Thứ cuối cùng bạn tìm trên mạng là gì?',
      difficulty: 'medium'
    }, {
      id: 'tr08',
      title: 'Nỗi sợ',
      content: 'Nỗi sợ vô lý nhất của bạn?',
      difficulty: 'easy'
    }, {
      id: 'tr09',
      title: 'Buổi hẹn tệ nhất',
      content: 'Kể buổi hẹn hò tệ nhất trong 20 giây.',
      difficulty: 'medium'
    }, {
      id: 'tr10',
      title: 'Nhỏ nhen',
      content: 'Lý do nhỏ nhen nhất khiến bạn nghỉ chơi ai đó?',
      difficulty: 'hard'
    }, {
      id: 'tr11',
      title: 'Bị bắt quả tang',
      content: 'Chuyện hồi nhỏ bạn làm mà bố mẹ tới giờ vẫn chưa biết?',
      difficulty: 'medium'
    }, {
      id: 'tr12',
      title: 'Giả vờ',
      content: 'Bạn giả vờ thích thứ gì chỉ để hoà nhập?',
      difficulty: 'medium'
    }, {
      id: 'tr13',
      title: 'Thời gian màn hình',
      content: 'App nào bạn dành thời gian nhiều đến mức xấu hổ?',
      difficulty: 'easy'
    }, {
      id: 'tr14',
      title: 'Hối hận',
      content: 'Món đồ bạn mua mà hối hận nhất?',
      difficulty: 'easy'
    }, {
      id: 'tr15',
      title: 'Crush người nổi tiếng',
      content: 'Crush người nổi tiếng của bạn là ai, và bạn có dám đồng ý thật không?',
      difficulty: 'easy'
    }, {
      id: 'tr16',
      title: 'Người đầu tiên',
      content: 'Gặp chuyện, bạn gọi ai ở bàn này đầu tiên? Vì sao?',
      difficulty: 'medium'
    }, {
      id: 'tr17',
      title: 'Bơ đẹp',
      content: 'Bạn từng “bơ” ai chưa? Chuyện ra sao?',
      difficulty: 'hard'
    }, {
      id: 'tr18',
      title: 'Thói quen lạ',
      content: 'Thói quen kỳ lạ nhất của bạn khi không ai nhìn?',
      difficulty: 'easy'
    }, {
      id: 'tr19',
      title: 'Tua lại',
      content: 'Nếu được sống lại một ngày trong đời, bạn chọn ngày nào?',
      difficulty: 'medium'
    }, {
      id: 'tr20',
      title: 'Playlist bí mật',
      content: 'Bài hát bạn âm thầm mê nhưng không bao giờ thừa nhận?',
      difficulty: 'easy'
    }, {
      id: 'tr21',
      title: 'Lười',
      content: 'Việc lười nhất bạn từng làm?',
      difficulty: 'easy'
    }, {
      id: 'tr22',
      title: 'Ghen tị',
      content: 'Lần gần nhất bạn ghen tị với một người ở đây là khi nào?',
      difficulty: 'hard'
    }, {
      id: 'tr23',
      title: 'Chấm điểm',
      content: 'Tự chấm tài nấu ăn của bạn từ 1 đến 10 và bảo vệ con số đó.',
      difficulty: 'easy'
    }, {
      id: 'tr24',
      title: 'Câu lớn',
      content: 'Điều gì bạn chưa từng kể với bất kỳ ai ở bàn này?',
      difficulty: 'hard'
    }]
  },
  dare: {
    en: [{
      id: 'da01',
      title: 'Impression',
      content: 'Do your best impression of someone in the room until they guess who.',
      difficulty: 'easy'
    }, {
      id: 'da02',
      title: 'Accent',
      content: 'Speak in an accent for the next 3 rounds.',
      difficulty: 'easy'
    }, {
      id: 'da03',
      title: 'Camera roll',
      content: 'Show the last photo in your camera roll.',
      difficulty: 'medium'
    }, {
      id: 'da04',
      title: 'Squats',
      content: 'Do 15 squats right now.',
      difficulty: 'medium'
    }, {
      id: 'da05',
      title: 'Artist',
      content: 'Let the player on your left draw on your hand.',
      difficulty: 'easy'
    }, {
      id: 'da06',
      title: 'Silent disco',
      content: 'Dance with no music for 30 seconds.',
      difficulty: 'medium'
    }, {
      id: 'da07',
      title: 'Backwards',
      content: 'Say the alphabet backwards.',
      difficulty: 'hard'
    }, {
      id: 'da08',
      title: 'Plank',
      content: 'Hold a plank for 30 seconds.',
      difficulty: 'medium'
    }, {
      id: 'da09',
      title: 'Anchor',
      content: 'Talk like a news anchor until your next turn.',
      difficulty: 'easy'
    }, {
      id: 'da10',
      title: 'Motivation',
      content: 'Give a 30-second motivational speech about socks.',
      difficulty: 'medium'
    }, {
      id: 'da11',
      title: 'Serenade',
      content: 'Sing a love song to the player opposite you — eye contact required.',
      difficulty: 'medium'
    }, {
      id: 'da12',
      title: 'Hairstyle',
      content: 'Let the table restyle your hair. Keep it for 3 rounds.',
      difficulty: 'medium'
    }, {
      id: 'da13',
      title: 'Walk of fame',
      content: 'Walk to the nearest door and back like a supermodel.',
      difficulty: 'easy'
    }, {
      id: 'da14',
      title: 'Slow-mo',
      content: 'Do everything in slow motion until your next turn.',
      difficulty: 'easy'
    }, {
      id: 'da15',
      title: 'Food critic',
      content: 'Review the nearest snack like a Michelin inspector.',
      difficulty: 'easy'
    }, {
      id: 'da16',
      title: 'Yoga master',
      content: 'Hold a tree pose for 20 seconds.',
      difficulty: 'easy'
    }, {
      id: 'da17',
      title: 'Beatbox',
      content: 'Beatbox for 15 seconds while someone raps.',
      difficulty: 'medium'
    }, {
      id: 'da18',
      title: 'Phone swap',
      content: 'Let the player on your right post a story on your social media.',
      difficulty: 'hard'
    }, {
      id: 'da19',
      title: 'Opera',
      content: 'Sing everything you say until your next turn.',
      difficulty: 'medium'
    }, {
      id: 'da20',
      title: 'Fortune teller',
      content: 'Read the palm of the player on your left and predict their week.',
      difficulty: 'easy'
    }, {
      id: 'da21',
      title: 'Freeze',
      content: 'Whenever anyone says your name until your next turn, freeze for 5 seconds.',
      difficulty: 'easy'
    }, {
      id: 'da22',
      title: 'Chicken',
      content: 'Act like a chicken until someone laughs.',
      difficulty: 'medium'
    }, {
      id: 'da23',
      title: 'Confession booth',
      content: 'Confess your most embarrassing moment in a whisper to the whole table.',
      difficulty: 'hard'
    }, {
      id: 'da24',
      title: 'Wall sit',
      content: 'Hold a wall-sit for 45 seconds.',
      difficulty: 'hard'
    }],
    vi: [{
      id: 'da01',
      title: 'Nhại',
      content: 'Nhại một người trong phòng cho tới khi họ đoán ra.',
      difficulty: 'easy'
    }, {
      id: 'da02',
      title: 'Giọng lạ',
      content: 'Nói giọng vùng miền khác trong 3 lượt tới.',
      difficulty: 'easy'
    }, {
      id: 'da03',
      title: 'Ảnh gần nhất',
      content: 'Cho cả bàn xem tấm ảnh gần nhất trong máy.',
      difficulty: 'medium'
    }, {
      id: 'da04',
      title: 'Squat',
      content: 'Squat 15 cái ngay bây giờ.',
      difficulty: 'medium'
    }, {
      id: 'da05',
      title: 'Hoạ sĩ',
      content: 'Để người bên trái vẽ lên tay bạn.',
      difficulty: 'easy'
    }, {
      id: 'da06',
      title: 'Disco câm',
      content: 'Nhảy không nhạc trong 30 giây.',
      difficulty: 'medium'
    }, {
      id: 'da07',
      title: 'Đọc ngược',
      content: 'Đọc ngược bảng chữ cái.',
      difficulty: 'hard'
    }, {
      id: 'da08',
      title: 'Plank',
      content: 'Plank 30 giây.',
      difficulty: 'medium'
    }, {
      id: 'da09',
      title: 'Phát thanh viên',
      content: 'Nói như phát thanh viên thời sự tới lượt sau.',
      difficulty: 'easy'
    }, {
      id: 'da10',
      title: 'Truyền cảm hứng',
      content: 'Diễn thuyết truyền cảm hứng 30 giây về… đôi tất.',
      difficulty: 'medium'
    }, {
      id: 'da11',
      title: 'Hát tặng',
      content: 'Hát một bản tình ca cho người đối diện — phải nhìn vào mắt.',
      difficulty: 'medium'
    }, {
      id: 'da12',
      title: 'Kiểu tóc mới',
      content: 'Để cả bàn làm lại tóc cho bạn. Giữ nguyên 3 lượt.',
      difficulty: 'medium'
    }, {
      id: 'da13',
      title: 'Sàn diễn',
      content: 'Đi tới cửa gần nhất rồi quay lại như siêu mẫu.',
      difficulty: 'easy'
    }, {
      id: 'da14',
      title: 'Quay chậm',
      content: 'Làm mọi thứ quay chậm cho tới lượt sau.',
      difficulty: 'easy'
    }, {
      id: 'da15',
      title: 'Giám khảo ẩm thực',
      content: 'Review món ăn vặt gần nhất như thanh tra Michelin.',
      difficulty: 'easy'
    }, {
      id: 'da16',
      title: 'Yoga',
      content: 'Giữ tư thế cái cây 20 giây.',
      difficulty: 'easy'
    }, {
      id: 'da17',
      title: 'Beatbox',
      content: 'Beatbox 15 giây cho ai đó rap.',
      difficulty: 'medium'
    }, {
      id: 'da18',
      title: 'Đổi máy',
      content: 'Để người bên phải đăng một story lên mạng xã hội của bạn.',
      difficulty: 'hard'
    }, {
      id: 'da19',
      title: 'Opera',
      content: 'Hát mọi câu bạn nói cho tới lượt sau.',
      difficulty: 'medium'
    }, {
      id: 'da20',
      title: 'Thầy bói',
      content: 'Xem chỉ tay người bên trái và đoán tuần tới của họ.',
      difficulty: 'easy'
    }, {
      id: 'da21',
      title: 'Đứng hình',
      content: 'Tới lượt sau, ai gọi tên bạn thì đứng hình 5 giây.',
      difficulty: 'easy'
    }, {
      id: 'da22',
      title: 'Con gà',
      content: 'Làm con gà cho tới khi có người cười.',
      difficulty: 'medium'
    }, {
      id: 'da23',
      title: 'Phòng xưng tội',
      content: 'Thì thầm khoảnh khắc xấu hổ nhất của bạn cho cả bàn nghe.',
      difficulty: 'hard'
    }, {
      id: 'da24',
      title: 'Tựa tường',
      content: 'Ngồi tựa tường 45 giây.',
      difficulty: 'hard'
    }]
  },
  wild: {
    en: [{
      id: 'w-respin',
      effect: 'respin',
      title: 'RE-SPIN',
      content: 'Take another turn right away.'
    }, {
      id: 'w-target',
      effect: 'target',
      title: 'TARGET',
      content: 'Choose another player — they take the next card.'
    }, {
      id: 'w-shield',
      effect: 'shield',
      title: 'SHIELD',
      content: 'Keep it. Ignore one challenge whenever you like.'
    }, {
      id: 'w-switch',
      effect: 'switch',
      title: 'SWITCH',
      content: 'Swap the next turn with another player.'
    }, {
      id: 'w-double',
      effect: 'double',
      title: 'DOUBLE',
      content: 'Your next completed card is worth double.'
    }],
    vi: [{
      id: 'w-respin',
      effect: 'respin',
      title: 'QUAY LẠI',
      content: 'Được thêm một lượt ngay lập tức.'
    }, {
      id: 'w-target',
      effect: 'target',
      title: 'CHỈ ĐỊNH',
      content: 'Chọn một người khác — họ nhận lá bài kế tiếp.'
    }, {
      id: 'w-shield',
      effect: 'shield',
      title: 'KHIÊN',
      content: 'Giữ lá này. Bỏ qua một thử thách bất kỳ lúc nào.'
    }, {
      id: 'w-switch',
      effect: 'switch',
      title: 'HOÁN ĐỔI',
      content: 'Đổi lượt kế tiếp với một người khác.'
    }, {
      id: 'w-double',
      effect: 'double',
      title: 'NHÂN ĐÔI',
      content: 'Lá bài hoàn thành kế tiếp của bạn tính gấp đôi.'
    }]
  },
  chaos: {
    en: [{
      id: 'x-everyone',
      effect: 'everyone',
      title: 'EVERYONE',
      content: 'Everyone does the next challenge.'
    }, {
      id: 'x-swap',
      effect: 'swap',
      title: 'SWAP',
      content: 'Everyone changes seats — the turn order is reshuffled.'
    }, {
      id: 'x-reverse',
      effect: 'reverse',
      title: 'REVERSE',
      content: 'The turn order reverses.'
    }, {
      id: 'x-double',
      effect: 'doubleRound',
      title: 'DOUBLE ROUND',
      content: 'The next full round is worth double points.'
    }, {
      id: 'x-random',
      effect: 'randomTarget',
      title: 'RANDOM TARGET',
      content: 'A random player takes the next challenge.'
    }],
    vi: [{
      id: 'x-everyone',
      effect: 'everyone',
      title: 'TẤT CẢ',
      content: 'Cả bàn cùng làm thử thách kế tiếp.'
    }, {
      id: 'x-swap',
      effect: 'swap',
      title: 'ĐỔI CHỖ',
      content: 'Mọi người đổi chỗ — thứ tự lượt xáo lại.'
    }, {
      id: 'x-reverse',
      effect: 'reverse',
      title: 'ĐẢO CHIỀU',
      content: 'Thứ tự lượt đảo ngược.'
    }, {
      id: 'x-double',
      effect: 'doubleRound',
      title: 'VÁN NHÂN ĐÔI',
      content: 'Cả vòng kế tiếp tính điểm gấp đôi.'
    }, {
      id: 'x-random',
      effect: 'randomTarget',
      title: 'NGẪU NHIÊN',
      content: 'Một người ngẫu nhiên nhận thử thách kế tiếp.'
    }]
  }
};
const VOTE_CARDS = {
  likely: {
    en: ['become famous', 'forget their own birthday', 'survive a zombie apocalypse', 'cry at a movie', 'get lost in their own city', 'become a millionaire', 'fall asleep at a party', 'talk their way out of a ticket', 'move abroad', 'adopt five cats', 'start a cult', 'win a reality show', 'eat something off the floor', 'text an ex tonight', 'laugh at a funeral', 'become a politician', 'get a tattoo on a whim', 'forget where they parked', 'befriend a stranger in 5 minutes', 'win an argument with a wall', 'go viral by accident', 'marry for money', 'sing in public sober', 'cheat at a board game', 'spend a whole salary in a day', 'live to 100', 'become a teacher', 'get kicked out of a library', 'end up on the news', 'order the most expensive thing on the menu', 'be late to their own wedding', 'sleep through an earthquake', 'binge a series in one night', 'start a business next week', 'talk to animals like people', 'win a dance battle', 'say “I love you” first', 'forget a friend’s name mid-sentence', 'become a monk', 'have the messiest room'],
    vi: ['nổi tiếng', 'quên sinh nhật của chính mình', 'sống sót qua tận thế zombie', 'khóc khi xem phim', 'lạc đường trong thành phố của mình', 'thành triệu phú', 'ngủ gật trong tiệc', 'nói khéo để thoát vé phạt', 'ra nước ngoài sống', 'nuôi năm con mèo', 'lập giáo phái', 'thắng show truyền hình thực tế', 'ăn đồ rơi dưới sàn', 'nhắn tin cho người yêu cũ tối nay', 'cười trong đám tang', 'làm chính trị gia', 'xăm mình ngẫu hứng', 'quên chỗ đậu xe', 'kết bạn với người lạ trong 5 phút', 'cãi thắng cả bức tường', 'vô tình viral', 'cưới vì tiền', 'hát giữa đám đông khi tỉnh táo', 'ăn gian khi chơi cờ', 'tiêu hết lương trong một ngày', 'sống tới 100 tuổi', 'làm giáo viên', 'bị đuổi khỏi thư viện', 'lên bản tin thời sự', 'gọi món đắt nhất trong menu', 'đến trễ đám cưới của mình', 'ngủ xuyên động đất', 'cày hết một series trong một đêm', 'khởi nghiệp tuần sau', 'nói chuyện với thú cưng như người', 'thắng đấu nhảy', 'nói “yêu” trước', 'quên tên bạn giữa câu', 'đi tu', 'có phòng bừa bộn nhất']
  },
  never: {
    en: ['sent a text to the wrong person', 'pretended to be sick to skip work or school', 'fallen asleep in a cinema', 'stalked an ex online', 'lied about my age', 'eaten a whole pizza alone', 'cried in public', 'faked a phone call to escape a conversation', 're-gifted a present', 'sung karaoke in front of strangers', 'forgotten someone’s name while introducing them', 'been on TV', 'broken a bone', 'laughed so hard I cried', 'gone a whole day without my phone', 'stayed awake for 24 hours', 'walked into a glass door', 'pretended to know a song and lip-synced', 'kept a secret for over a year', 'had a crush on a teacher', 'been kicked out of somewhere', 'danced on a table', 'cheated on a test', 'lost my phone on a night out', 'eaten food that fell on the floor', 'googled myself', 'cooked something that set off the smoke alarm', 'gotten a tattoo', 'been in a food fight', 'waved back at someone who wasn’t waving at me', 'ridden a motorbike without a helmet', 'missed a flight', 'talked to myself in the mirror', 'binge-watched a show in one weekend', 'tripped in front of a crowd', 'had the same password for everything', 'screamed on a roller coaster', 'left a restaurant without paying by mistake', 'learned a TikTok dance', 'pretended to understand a movie I didn’t'],
    vi: ['nhắn tin nhầm người', 'giả ốm để nghỉ làm/nghỉ học', 'ngủ quên trong rạp phim', 'lén xem trang người yêu cũ', 'nói dối về tuổi', 'ăn hết một cái pizza một mình', 'khóc giữa chốn đông người', 'giả vờ nghe điện thoại để thoát khỏi cuộc trò chuyện', 'tặng lại quà người khác tặng mình', 'hát karaoke trước người lạ', 'quên tên ai đó ngay lúc đang giới thiệu họ', 'lên TV', 'gãy xương', 'cười đến chảy nước mắt', 'cả ngày không đụng điện thoại', 'thức trắng 24 tiếng', 'đâm vào cửa kính', 'giả vờ biết bài hát rồi nhép miệng', 'giữ bí mật hơn một năm', 'crush thầy cô giáo', 'bị đuổi khỏi đâu đó', 'nhảy trên bàn', 'quay cóp khi thi', 'làm mất điện thoại khi đi chơi đêm', 'ăn đồ rơi xuống sàn', 'tự google tên mình', 'nấu ăn tới mức báo cháy kêu', 'xăm mình', 'tham gia ném đồ ăn', 'vẫy tay lại với người không vẫy mình', 'chạy xe máy không đội mũ bảo hiểm', 'lỡ chuyến bay', 'tự nói chuyện với mình trong gương', 'cày hết một show trong một cuối tuần', 'vấp ngã trước đám đông', 'dùng một mật khẩu cho mọi thứ', 'hét trên tàu lượn', 'rời nhà hàng quên trả tiền', 'học nhảy TikTok', 'giả vờ hiểu bộ phim mình không hiểu']
  },
  rather: {
    en: [{
      a: 'Be able to fly',
      b: 'Be invisible'
    }, {
      a: 'Never use social media again',
      b: 'Never watch a movie again'
    }, {
      a: 'Always be 10 minutes late',
      b: 'Always be 20 minutes early'
    }, {
      a: 'Have no phone for a month',
      b: 'Have no friends for a month'
    }, {
      a: 'Speak every language',
      b: 'Play every instrument'
    }, {
      a: 'Live without music',
      b: 'Live without the internet'
    }, {
      a: 'Be famous but poor',
      b: 'Be rich but unknown'
    }, {
      a: 'Eat only sweet food',
      b: 'Eat only salty food'
    }, {
      a: 'Know how you will die',
      b: 'Know when you will die'
    }, {
      a: 'Have a rewind button',
      b: 'Have a pause button'
    }, {
      a: 'Always have to sing instead of speak',
      b: 'Always have to dance while walking'
    }, {
      a: 'Live in the mountains',
      b: 'Live by the sea'
    }, {
      a: 'Travel to the past',
      b: 'Travel to the future'
    }, {
      a: 'Be the funniest person in the room',
      b: 'Be the smartest person in the room'
    }, {
      a: 'Give up coffee forever',
      b: 'Give up dessert forever'
    }, {
      a: 'Read minds',
      b: 'See the future'
    }, {
      a: 'Have a personal chef',
      b: 'Have a personal driver'
    }, {
      a: 'Fight 100 duck-sized horses',
      b: 'Fight 1 horse-sized duck'
    }, {
      a: 'Always say what you think',
      b: 'Never speak again'
    }, {
      a: 'Be too hot forever',
      b: 'Be too cold forever'
    }, {
      a: 'Live in a video game',
      b: 'Live in a movie'
    }, {
      a: 'Have unlimited money',
      b: 'Have unlimited time'
    }, {
      a: 'Lose your sense of taste',
      b: 'Lose your sense of smell'
    }, {
      a: 'Be a famous singer',
      b: 'Be a famous athlete'
    }, {
      a: 'Work your dream job for low pay',
      b: 'Work a boring job for huge pay'
    }, {
      a: 'Have a pet dragon',
      b: 'Have a pet dinosaur'
    }, {
      a: 'Never age physically',
      b: 'Never age mentally'
    }, {
      a: 'Eat a bug',
      b: 'Lick the floor'
    }, {
      a: 'Wear the same outfit every day',
      b: 'Eat the same meal every day'
    }, {
      a: 'Have a free trip anywhere',
      b: 'Have a free meal anywhere for a year'
    }],
    vi: [{
      a: 'Biết bay',
      b: 'Tàng hình'
    }, {
      a: 'Không bao giờ dùng mạng xã hội nữa',
      b: 'Không bao giờ xem phim nữa'
    }, {
      a: 'Luôn trễ 10 phút',
      b: 'Luôn sớm 20 phút'
    }, {
      a: 'Không điện thoại một tháng',
      b: 'Không bạn bè một tháng'
    }, {
      a: 'Nói được mọi ngôn ngữ',
      b: 'Chơi được mọi nhạc cụ'
    }, {
      a: 'Sống không âm nhạc',
      b: 'Sống không internet'
    }, {
      a: 'Nổi tiếng nhưng nghèo',
      b: 'Giàu nhưng không ai biết'
    }, {
      a: 'Chỉ ăn đồ ngọt',
      b: 'Chỉ ăn đồ mặn'
    }, {
      a: 'Biết mình chết thế nào',
      b: 'Biết mình chết khi nào'
    }, {
      a: 'Có nút tua lại',
      b: 'Có nút tạm dừng'
    }, {
      a: 'Phải hát thay vì nói',
      b: 'Phải nhảy khi đi bộ'
    }, {
      a: 'Sống trên núi',
      b: 'Sống cạnh biển'
    }, {
      a: 'Về quá khứ',
      b: 'Tới tương lai'
    }, {
      a: 'Là người hài hước nhất phòng',
      b: 'Là người thông minh nhất phòng'
    }, {
      a: 'Bỏ cà phê mãi mãi',
      b: 'Bỏ đồ ngọt mãi mãi'
    }, {
      a: 'Đọc được suy nghĩ',
      b: 'Nhìn thấy tương lai'
    }, {
      a: 'Có đầu bếp riêng',
      b: 'Có tài xế riêng'
    }, {
      a: 'Đấu với 100 con ngựa cỡ con vịt',
      b: 'Đấu với 1 con vịt cỡ con ngựa'
    }, {
      a: 'Luôn nói thật lòng',
      b: 'Không bao giờ nói nữa'
    }, {
      a: 'Luôn thấy nóng',
      b: 'Luôn thấy lạnh'
    }, {
      a: 'Sống trong game',
      b: 'Sống trong phim'
    }, {
      a: 'Tiền vô hạn',
      b: 'Thời gian vô hạn'
    }, {
      a: 'Mất vị giác',
      b: 'Mất khứu giác'
    }, {
      a: 'Là ca sĩ nổi tiếng',
      b: 'Là vận động viên nổi tiếng'
    }, {
      a: 'Làm việc mơ ước lương thấp',
      b: 'Làm việc chán lương khủng'
    }, {
      a: 'Nuôi rồng',
      b: 'Nuôi khủng long'
    }, {
      a: 'Không già đi về thể xác',
      b: 'Không già đi về tâm hồn'
    }, {
      a: 'Ăn một con bọ',
      b: 'Liếm sàn nhà'
    }, {
      a: 'Mặc một bộ đồ mỗi ngày',
      b: 'Ăn một món mỗi ngày'
    }, {
      a: 'Một chuyến đi miễn phí bất kỳ đâu',
      b: 'Ăn miễn phí bất kỳ đâu trong một năm'
    }]
  }
};
const CARD_TYPE_META = {
  challenge: {
    icon: '🎯',
    color: '#f97316'
  },
  truth: {
    icon: '❓',
    color: '#38bdf8'
  },
  dare: {
    icon: '😈',
    color: '#e11d48'
  },
  wild: {
    icon: '🃏',
    color: '#a855f7'
  },
  chaos: {
    icon: '💣',
    color: '#facc15'
  },
  likely: {
    icon: '👉',
    color: '#34d399'
  },
  never: {
    icon: '🙋',
    color: '#f472b6'
  },
  rather: {
    icon: '⚖️',
    color: '#60a5fa'
  }
};
const buildDeck = (deckKey, lang) => {
  const of = type => CARD_CONTENT[type][lang].map(c => ({
    ...c,
    type
  }));
  switch (deckKey) {
    case 'wild':
      return [...of('challenge'), ...of('dare'), ...of('wild'), ...of('wild')];
    case 'chaos':
      return [...of('challenge'), ...of('dare'), ...of('chaos'), ...of('chaos')];
    default:
      return of(deckKey);
  }
};
const buildVoteDeck = (deckKey, lang) => (VOTE_CARDS[deckKey][lang] || []).map((c, i) => typeof c === 'string' ? {
  id: `${deckKey}-${i}`,
  text: c
} : {
  id: `${deckKey}-${i}`,
  ...c
});

/* ==== js/data/registry.js ==== */
const GAME_REGISTRY = {
  spinner: {
    id: 'spinner',
    icon: '🎯',
    accent: '#FFD93D',
    type: 'themes',
    games: Object.fromEntries(Object.values(THEMES).map(th => [th.key, {
      id: th.key,
      icon: th.icon,
      plan: th.plan || (th.free ? 'free' : 'pro'),
      component: 'spinner',
      players: [1, 100],
      duration: '∞',
      scoring: 'none',
      difficulty: 'easy'
    }]))
  },
  battle: {
    id: 'battle',
    icon: '⚔️',
    accent: '#f87171',
    type: 'games',
    games: {
      'quick-battle': {
        id: 'quick-battle',
        icon: '⚡',
        plan: 'free',
        component: 'battle',
        variant: 'quick',
        players: [2, 2],
        duration: '1–3 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'best-of-3': {
        id: 'best-of-3',
        icon: '🏆',
        plan: 'pro',
        component: 'battle',
        variant: 'bo3',
        players: [2, 2],
        duration: '3–5 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'streak-battle': {
        id: 'streak-battle',
        icon: '🔥',
        plan: 'pro',
        component: 'battle',
        variant: 'streak',
        players: [2, 12],
        duration: '5–10 min',
        scoring: 'streak',
        difficulty: 'medium'
      },
      'team-battle': {
        id: 'team-battle',
        icon: '👥',
        plan: 'pro',
        component: 'battle',
        variant: 'team',
        players: [4, 12],
        duration: '5–10 min',
        scoring: 'points',
        difficulty: 'medium'
      },
      'elimination-battle': {
        id: 'elimination-battle',
        icon: '💀',
        plan: 'pro',
        component: 'battle',
        variant: 'elimination',
        players: [3, 12],
        duration: '5–10 min',
        scoring: 'elimination',
        difficulty: 'medium'
      }
    }
  },
  king: {
    id: 'king',
    icon: '👑',
    accent: '#fbbf24',
    type: 'games',
    games: {
      'classic-king': {
        id: 'classic-king',
        icon: '👑',
        plan: 'pro',
        component: 'king',
        variant: 'classic',
        players: [3, 12],
        duration: '5–10 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'king-challenge': {
        id: 'king-challenge',
        icon: '⚔️',
        plan: 'pro',
        component: 'king',
        variant: 'challenge',
        players: [3, 12],
        duration: '5–10 min',
        scoring: 'points',
        difficulty: 'medium'
      },
      'last-king': {
        id: 'last-king',
        icon: '💀',
        plan: 'pro',
        component: 'king',
        variant: 'last',
        players: [3, 12],
        duration: '5–15 min',
        scoring: 'elimination',
        difficulty: 'hard'
      }
    }
  },
  quiz: {
    id: 'quiz',
    icon: '🧠',
    accent: '#60a5fa',
    type: 'games',
    games: Object.fromEntries(QUIZ_THEMES.map(th => [`quiz-${th.id}`, {
      id: `quiz-${th.id}`,
      icon: th.icon,
      plan: th.plan,
      component: 'quiz',
      quizTheme: th.id,
      players: [1, 12],
      duration: '5 min',
      scoring: 'points',
      difficulty: th.difficulty
    }]))
  },
  minigames: {
    id: 'minigames',
    icon: '🎲',
    accent: '#34d399',
    type: 'games',
    games: {
      rps: {
        id: 'rps',
        icon: '✋',
        plan: 'free',
        component: 'rps',
        players: [2, 2],
        duration: '2 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'five-second': {
        id: 'five-second',
        icon: '⏱️',
        plan: 'free',
        component: 'fiveSecond',
        players: [1, 12],
        duration: '3–5 min',
        scoring: 'streak',
        difficulty: 'medium'
      },
      'dont-laugh': {
        id: 'dont-laugh',
        icon: '😂',
        plan: 'free',
        component: 'dontLaugh',
        players: [2, 2],
        duration: '3 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      reaction: {
        id: 'reaction',
        icon: '⚡',
        plan: 'pro',
        component: 'reaction',
        players: [1, 12],
        duration: '2 min',
        scoring: 'time',
        difficulty: 'easy'
      },
      memory: {
        id: 'memory',
        icon: '🧠',
        plan: 'pro',
        component: 'memory',
        players: [1, 8],
        duration: '2–4 min',
        scoring: 'time',
        difficulty: 'medium'
      },
      word: {
        id: 'word',
        icon: '🔤',
        plan: 'pro',
        component: 'word',
        players: [1, 12],
        duration: '3–5 min',
        scoring: 'streak',
        difficulty: 'medium'
      },
      charades: {
        id: 'charades',
        icon: '🎭',
        plan: 'free',
        component: 'charades',
        players: [2, 12],
        duration: '5–10 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      bomb: {
        id: 'bomb',
        icon: '💣',
        plan: 'free',
        component: 'bomb',
        players: [2, 12],
        duration: '5 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      imposter: {
        id: 'imposter',
        icon: '🕵️',
        plan: 'pro',
        component: 'imposter',
        players: [3, 12],
        duration: '10 min',
        scoring: 'points',
        difficulty: 'medium'
      }
    }
  },
  cards: {
    id: 'cards',
    icon: '🃏',
    accent: '#c084fc',
    type: 'games',
    games: {
      'challenge-cards': {
        id: 'challenge-cards',
        icon: '🎯',
        plan: 'pro',
        component: 'cards',
        deck: 'challenge',
        players: [1, 12],
        duration: '5–10 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'truth-cards': {
        id: 'truth-cards',
        icon: '❓',
        plan: 'pro',
        component: 'cards',
        deck: 'truth',
        players: [1, 12],
        duration: '5–10 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'dare-cards': {
        id: 'dare-cards',
        icon: '😈',
        plan: 'pro',
        component: 'cards',
        deck: 'dare',
        players: [1, 12],
        duration: '5–10 min',
        scoring: 'points',
        difficulty: 'medium'
      },
      'wild-cards': {
        id: 'wild-cards',
        icon: '🃏',
        plan: 'pro',
        component: 'cards',
        deck: 'wild',
        players: [2, 12],
        duration: '10 min',
        scoring: 'points',
        difficulty: 'medium'
      },
      'chaos-cards': {
        id: 'chaos-cards',
        icon: '💣',
        plan: 'pro',
        component: 'cards',
        deck: 'chaos',
        players: [3, 12],
        duration: '10 min',
        scoring: 'points',
        difficulty: 'hard'
      },
      'likely-cards': {
        id: 'likely-cards',
        icon: '👉',
        plan: 'free',
        component: 'votecards',
        deck: 'likely',
        players: [3, 12],
        duration: '10 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'never-cards': {
        id: 'never-cards',
        icon: '🙋',
        plan: 'pro',
        component: 'votecards',
        deck: 'never',
        players: [2, 12],
        duration: '10 min',
        scoring: 'points',
        difficulty: 'easy'
      },
      'rather-cards': {
        id: 'rather-cards',
        icon: '⚖️',
        plan: 'pro',
        component: 'votecards',
        deck: 'rather',
        players: [2, 12],
        duration: '10 min',
        scoring: 'points',
        difficulty: 'easy'
      }
    }
  }
};
const GAME_MODES = Object.values(GAME_REGISTRY).map(m => ({
  ...m,
  items: Object.values(m.games)
}));
const BUILTIN_QUIZ_GAMES = {
  ...GAME_REGISTRY.quiz.games
};
const syncCustomGames = customThemes => {
  const games = {
    ...BUILTIN_QUIZ_GAMES
  };
  customThemes.forEach(th => {
    games[`quiz-${th.id}`] = {
      id: `quiz-${th.id}`,
      icon: th.icon,
      plan: 'free',
      component: 'quiz',
      quizTheme: th.id,
      customGameId: th.gameId,
      custom: true,
      players: [1, 12],
      duration: '5 min',
      scoring: 'points',
      difficulty: th.difficulty
    };
  });
  GAME_REGISTRY.quiz.games = games;
  const mode = GAME_MODES.find(m => m.id === 'quiz');
  if (mode) mode.items = Object.values(games);
  return games;
};
const findGame = (modeId, itemId) => {
  const mode = GAME_REGISTRY[modeId];
  const item = mode && mode.games[itemId];
  return mode && item ? {
    mode,
    item
  } : null;
};
const MODE_TEXT = {
  en: {
    spinner: {
      title: 'Spinner',
      desc: 'Spin the wheel'
    },
    battle: {
      title: 'Battle',
      desc: 'Challenge each other'
    },
    king: {
      title: 'King of the Table',
      desc: 'Winner stays'
    },
    quiz: {
      title: 'Quiz',
      desc: 'Test your knowledge'
    },
    minigames: {
      title: 'Mini Games',
      desc: 'Quick party games'
    },
    cards: {
      title: 'Cards',
      desc: 'Draw your fate'
    }
  },
  vi: {
    spinner: {
      title: 'Vòng quay',
      desc: 'Quay là trúng'
    },
    battle: {
      title: 'Đấu tay đôi',
      desc: 'Thách đấu nhau'
    },
    king: {
      title: 'Vua bàn nhậu',
      desc: 'Thắng thì ở lại'
    },
    quiz: {
      title: 'Đố vui',
      desc: 'Thử kiến thức'
    },
    minigames: {
      title: 'Trò chơi nhỏ',
      desc: 'Chơi nhanh gọn'
    },
    cards: {
      title: 'Bốc bài',
      desc: 'Rút lá số phận'
    }
  }
};
const QUIZ_HOWTO = {
  en: 'Pick a theme and a difficulty. Pass the phone around (or play as teams) — each question goes to the next player. 15 s per question, +100 for a correct answer and a speed bonus up to +50. With phones connected, everyone answers at once on their own device.',
  vi: 'Chọn chủ đề và độ khó. Chuyền điện thoại (hoặc chơi theo đội) — mỗi câu tới lượt người kế tiếp. 15 giây mỗi câu, +100 khi đúng và thưởng tốc độ tới +50. Khi có điện thoại kết nối, cả lớp cùng trả lời trên máy của mình.'
};
const GAME_META_TEXT = {
  en: {
    'quick-battle': {
      title: 'Quick Battle',
      description: 'Two players compete in one quick challenge.',
      howToPlay: 'Pick two players and a format (best of 1, 3 or 5). Every round shows a challenge — the host taps who won it. First to enough round wins takes the battle.'
    },
    'best-of-3': {
      title: 'Best of 3',
      description: 'Head-to-head. First to 2 round wins.',
      howToPlay: 'Two players, up to three rounds. Win two rounds and the battle ends instantly.'
    },
    'streak-battle': {
      title: 'Streak Battle',
      description: 'Take turns and keep your streak alive.',
      howToPlay: 'Players take turns completing challenges. Success adds +1 to your streak, a fail resets it to 0. Hit the streak goal for a special celebration.'
    },
    'team-battle': {
      title: 'Team Battle',
      description: 'Red vs Blue — teams score together.',
      howToPlay: 'Split into two teams. Each round a challenge calls on one player per team or the whole team; the host awards the point to the winning team.'
    },
    'elimination-battle': {
      title: 'Elimination Battle',
      description: 'Lose a duel and you’re out.',
      howToPlay: 'Players are paired up each round. The loser of a duel is eliminated; the last one standing wins.'
    },
    'classic-king': {
      title: 'Classic King',
      description: 'Winner stays on the throne.',
      howToPlay: 'A random player starts as King. Each round a challenger faces the King and the host taps the winner — the winner holds the throne. Defenses and the longest reign are tracked.'
    },
    'king-challenge': {
      title: 'King Challenge',
      description: 'The challenger picks the weapon.',
      howToPlay: 'Like Classic King, but the challenger chooses one of three challenges before facing the King.'
    },
    'last-king': {
      title: 'Last King Standing',
      description: 'Lose to the King and you’re out.',
      howToPlay: 'Challengers who lose are eliminated. The King who outlasts everyone rules the night.'
    },
    'quiz-general': {
      title: 'General Knowledge',
      description: 'A bit of everything.',
      howToPlay: QUIZ_HOWTO.en
    },
    'quiz-beer': {
      title: 'Beer & Drinks',
      description: 'Beer, cocktails and bar trivia.',
      howToPlay: QUIZ_HOWTO.en
    },
    'quiz-music': {
      title: 'Music',
      description: 'Artists, hits and instruments.',
      howToPlay: QUIZ_HOWTO.en
    },
    'quiz-movies': {
      title: 'Movies',
      description: 'Films, actors and famous lines.',
      howToPlay: QUIZ_HOWTO.en
    },
    'quiz-sports': {
      title: 'Sports',
      description: 'Rules, records and legends.',
      howToPlay: QUIZ_HOWTO.en
    },
    'quiz-random': {
      title: 'Random Quiz',
      description: 'Questions from every category.',
      howToPlay: QUIZ_HOWTO.en
    },
    rps: {
      title: 'Rock Paper Scissors',
      description: 'The classic — first to 3.',
      howToPlay: 'Both players secretly pick on the same phone, then reveal together. Rock beats scissors, scissors beat paper, paper beats rock. Ties replay the round.'
    },
    'five-second': {
      title: '5 Second Rule',
      description: 'Name 3 things before the buzzer.',
      howToPlay: 'Each turn shows a category. Name three things in 5 seconds; the host taps Success or Failed. Streaks are tracked.'
    },
    'dont-laugh': {
      title: 'Don’t Laugh',
      description: 'Make them laugh. Or don’t.',
      howToPlay: 'One player performs, the other judges with a straight face for 30 seconds. If the judge laughs the performer wins the round; survive and the judge wins. Roles swap every round.'
    },
    reaction: {
      title: 'Reaction Test',
      description: 'Tap the instant it turns green.',
      howToPlay: 'Wait for GO! and tap as fast as you can — tap early and it’s a false start. Three attempts each; the fastest time wins.'
    },
    memory: {
      title: 'Memory',
      description: 'Find all the pairs.',
      howToPlay: 'Cards show their symbols for a moment, then hide. Match every pair in as few attempts as possible. Easy, medium and hard grids.'
    },
    word: {
      title: 'Word Challenge',
      description: 'A category, a letter, 10 seconds.',
      howToPlay: 'Say something in the category that starts with the letter before time runs out. The host confirms. Streaks are tracked.'
    },
    'challenge-cards': {
      title: 'Challenge Cards',
      description: 'Draw a card, do the challenge.',
      howToPlay: 'Players take turns drawing. Complete the card for a point or skip it.'
    },
    'truth-cards': {
      title: 'Truth Cards',
      description: 'Honest answers only.',
      howToPlay: 'Draw a truth and answer it. Points for the brave.'
    },
    'dare-cards': {
      title: 'Dare Cards',
      description: 'Dares that keep the party moving.',
      howToPlay: 'Draw a dare and do it — or skip. Points for the brave.'
    },
    'wild-cards': {
      title: 'Wild Cards',
      description: 'Cards that bend the rules.',
      howToPlay: 'Challenges mixed with wild cards: extra turns, shields, targets, switches and double points. Effects really apply.'
    },
    'chaos-cards': {
      title: 'Chaos Cards',
      description: 'Everyone is affected.',
      howToPlay: 'Challenges mixed with chaos cards that hit the whole table: everyone plays, seats swap, order reverses, double rounds and random targets.'
    },
    charades: {
      title: 'Charades',
      description: 'Act it out, the table guesses.',
      howToPlay: 'One player holds the phone and acts out or describes the word while everyone else shouts guesses. Tap ✓ for every word guessed, ⏭ to pass. 45–90 seconds per turn, one point per word.'
    },
    bomb: {
      title: 'Pass the Bomb',
      description: 'Say one, pass it on — don’t be holding it.',
      howToPlay: 'A category appears and the fuse is lit. Say something in the category, tap PASS and hand the phone to the next player. Nobody knows how long the fuse is. Whoever holds the bomb when it blows loses the round; everyone else scores.'
    },
    imposter: {
      title: 'Imposter',
      description: 'One of you doesn’t know the word.',
      howToPlay: 'Pass the phone around: everyone peeks at the secret word — except the imposter, who only sees the category. Discuss, drop hints without giving it away, then vote. Catch the imposter and everyone else scores; miss and the imposter scores double.'
    },
    'likely-cards': {
      title: 'Most Likely To',
      description: 'Point at the person who fits.',
      howToPlay: 'Read the card out loud. On three, everyone points at the player it describes. The host taps whoever got the most fingers — they score the point.'
    },
    'never-cards': {
      title: 'Never Have I Ever',
      description: 'Hands up if you have.',
      howToPlay: 'Read the card. Everyone who HAS done it raises a hand, and the host taps them. Points for honesty — the most daring life wins.'
    },
    'rather-cards': {
      title: 'Would You Rather',
      description: 'A or B — the minority pays.',
      howToPlay: 'Two choices. Everyone picks a side (tap a name to cycle A / B). The bigger side scores a point; the smaller side owes the table a quick dare. A tie is a tie.'
    }
  },
  vi: {
    'quick-battle': {
      title: 'Đấu nhanh',
      description: 'Hai người, một thử thách chớp nhoáng.',
      howToPlay: 'Chọn 2 người chơi và thể thức (1, 3 hoặc 5 ván). Mỗi ván hiện một thử thách — chủ trò bấm ai thắng. Ai đủ số ván thắng trước là thắng.'
    },
    'best-of-3': {
      title: 'Thắng 2 trên 3',
      description: 'Đối đầu, ai thắng 2 ván trước.',
      howToPlay: 'Hai người, tối đa 3 ván. Thắng 2 ván là kết thúc ngay.'
    },
    'streak-battle': {
      title: 'Chuỗi thắng',
      description: 'Lần lượt chơi, giữ chuỗi càng dài càng tốt.',
      howToPlay: 'Người chơi lần lượt làm thử thách. Thành công +1 chuỗi, thất bại về 0. Đạt mốc chuỗi sẽ có màn ăn mừng đặc biệt.'
    },
    'team-battle': {
      title: 'Đấu đội',
      description: 'Đỏ đấu Xanh — ghi điểm theo đội.',
      howToPlay: 'Chia hai đội. Mỗi ván thử thách gọi một người mỗi đội hoặc cả đội; chủ trò trao điểm cho đội thắng.'
    },
    'elimination-battle': {
      title: 'Đấu loại trừ',
      description: 'Thua một trận là bị loại.',
      howToPlay: 'Mỗi ván ghép cặp người chơi. Người thua bị loại; người cuối cùng trụ lại thắng.'
    },
    'classic-king': {
      title: 'Vua cổ điển',
      description: 'Thắng thì giữ ngai.',
      howToPlay: 'Một người ngẫu nhiên làm Vua. Mỗi ván một người thách đấu Vua, chủ trò bấm ai thắng — người thắng giữ ngai. Có đếm số lần thủ ngai và triều đại dài nhất.'
    },
    'king-challenge': {
      title: 'Thách đấu vua',
      description: 'Người thách đấu chọn vũ khí.',
      howToPlay: 'Giống Vua cổ điển, nhưng người thách đấu được chọn 1 trong 3 thử thách trước khi đấu.'
    },
    'last-king': {
      title: 'Vua cuối cùng',
      description: 'Thua Vua là bị loại.',
      howToPlay: 'Người thách đấu thua sẽ bị loại. Vị Vua trụ đến cuối thống trị cả đêm.'
    },
    'quiz-general': {
      title: 'Kiến thức chung',
      description: 'Mỗi thứ một chút.',
      howToPlay: QUIZ_HOWTO.vi
    },
    'quiz-beer': {
      title: 'Bia & đồ uống',
      description: 'Bia, cocktail và chuyện quán xá.',
      howToPlay: QUIZ_HOWTO.vi
    },
    'quiz-music': {
      title: 'Âm nhạc',
      description: 'Nghệ sĩ, bản hit và nhạc cụ.',
      howToPlay: QUIZ_HOWTO.vi
    },
    'quiz-movies': {
      title: 'Phim ảnh',
      description: 'Phim, diễn viên và câu thoại nổi tiếng.',
      howToPlay: QUIZ_HOWTO.vi
    },
    'quiz-sports': {
      title: 'Thể thao',
      description: 'Luật, kỷ lục và huyền thoại.',
      howToPlay: QUIZ_HOWTO.vi
    },
    'quiz-random': {
      title: 'Đố ngẫu nhiên',
      description: 'Câu hỏi từ mọi chủ đề.',
      howToPlay: QUIZ_HOWTO.vi
    },
    rps: {
      title: 'Oẳn tù tì',
      description: 'Kinh điển — ai thắng 3 trước.',
      howToPlay: 'Hai người lần lượt chọn bí mật trên cùng một điện thoại rồi lật cùng lúc. Búa thắng kéo, kéo thắng bao, bao thắng búa. Hoà thì chơi lại.'
    },
    'five-second': {
      title: 'Luật 5 giây',
      description: 'Kể 3 thứ trước khi hết giờ.',
      howToPlay: 'Mỗi lượt hiện một chủ đề. Kể 3 thứ trong 5 giây; chủ trò bấm Thành công hoặc Thất bại. Có tính chuỗi.'
    },
    'dont-laugh': {
      title: 'Cấm cười',
      description: 'Làm họ cười. Hoặc đừng.',
      howToPlay: 'Một người diễn, người kia làm giám khảo giữ mặt nghiêm trong 30 giây. Giám khảo cười thì người diễn thắng; trụ được thì giám khảo thắng. Đổi vai mỗi ván.'
    },
    reaction: {
      title: 'Phản xạ nhanh',
      description: 'Chạm ngay khi màn hình xanh.',
      howToPlay: 'Chờ chữ GO! rồi chạm nhanh nhất có thể — chạm sớm là phạm quy. Mỗi người 3 lượt; thời gian nhanh nhất thắng.'
    },
    memory: {
      title: 'Trí nhớ',
      description: 'Tìm hết các cặp.',
      howToPlay: 'Các lá bài lật lên một lúc rồi úp xuống. Ghép đủ các cặp với ít lượt nhất. Có 3 mức dễ, vừa, khó.'
    },
    word: {
      title: 'Đố chữ',
      description: 'Một chủ đề, một chữ cái, 10 giây.',
      howToPlay: 'Nói một thứ thuộc chủ đề bắt đầu bằng chữ cái đó trước khi hết giờ. Chủ trò xác nhận. Có tính chuỗi.'
    },
    'challenge-cards': {
      title: 'Bài thử thách',
      description: 'Rút bài, làm thử thách.',
      howToPlay: 'Lần lượt rút bài. Hoàn thành được 1 điểm, hoặc bỏ qua.'
    },
    'truth-cards': {
      title: 'Bài sự thật',
      description: 'Chỉ nói thật.',
      howToPlay: 'Rút một câu hỏi thật và trả lời. Điểm cho người dũng cảm.'
    },
    'dare-cards': {
      title: 'Bài thách đố',
      description: 'Thách đố giữ nhiệt cho bữa tiệc.',
      howToPlay: 'Rút thách đố và thực hiện — hoặc bỏ qua. Điểm cho người dũng cảm.'
    },
    'wild-cards': {
      title: 'Bài tẩy',
      description: 'Những lá bài bẻ cong luật chơi.',
      howToPlay: 'Thử thách trộn với bài tẩy: thêm lượt, khiên, chỉ định, hoán đổi và nhân đôi điểm. Hiệu ứng áp dụng thật.'
    },
    'chaos-cards': {
      title: 'Bài hỗn loạn',
      description: 'Cả bàn đều bị ảnh hưởng.',
      howToPlay: 'Thử thách trộn với bài hỗn loạn tác động cả bàn: ai cũng chơi, đổi chỗ, đảo chiều, ván nhân đôi và chỉ định ngẫu nhiên.'
    },
    charades: {
      title: 'Đoán chữ',
      description: 'Diễn tả, cả bàn đoán.',
      howToPlay: 'Một người cầm điện thoại diễn hoặc mô tả từ trên màn hình, cả bàn hô đáp án. Bấm ✓ mỗi từ đoán trúng, ⏭ để bỏ qua. 45–90 giây mỗi lượt, mỗi từ một điểm.'
    },
    bomb: {
      title: 'Chuyền bom',
      description: 'Nói một thứ, chuyền tiếp — đừng cầm khi nổ.',
      howToPlay: 'Hiện chủ đề và châm ngòi. Nói một thứ thuộc chủ đề, bấm CHUYỀN rồi đưa điện thoại cho người kế. Không ai biết ngòi dài bao lâu. Ai cầm bom lúc nổ thua ván đó; những người còn lại ghi điểm.'
    },
    imposter: {
      title: 'Kẻ giả mạo',
      description: 'Một người không biết từ bí mật.',
      howToPlay: 'Chuyền điện thoại: mỗi người xem từ bí mật — trừ kẻ giả mạo chỉ thấy chủ đề. Thảo luận, gợi ý khéo đừng lộ từ, rồi bỏ phiếu. Bắt được kẻ giả mạo thì mọi người ghi điểm; bắt hụt thì kẻ giả mạo ăn gấp đôi.'
    },
    'likely-cards': {
      title: 'Ai dễ nhất',
      description: 'Chỉ vào người giống mô tả nhất.',
      howToPlay: 'Đọc to lá bài. Đếm ba, cả bàn chỉ vào người đúng mô tả. Chủ trò bấm người bị chỉ nhiều nhất — người đó ghi điểm.'
    },
    'never-cards': {
      title: 'Tôi chưa bao giờ',
      description: 'Giơ tay nếu bạn đã từng.',
      howToPlay: 'Đọc lá bài. Ai ĐÃ TỪNG làm thì giơ tay, chủ trò bấm tên họ. Điểm cho sự thành thật — ai sống “dữ” nhất thắng.'
    },
    'rather-cards': {
      title: 'Bạn chọn gì',
      description: 'A hay B — phe ít người chịu phạt.',
      howToPlay: 'Hai lựa chọn. Mỗi người chọn một phe (bấm tên để đổi A / B). Phe đông hơn ghi điểm; phe ít hơn nợ cả bàn một thử thách nhanh. Hoà thì thôi.'
    }
  }
};
const SPINNER_HOWTO = {
  en: 'Add names or dares, hit SPIN and let the pointer decide. Flick the wheel or press Space. Drinking is always optional — water or a non-drinking dare counts just the same.',
  vi: 'Thêm tên hoặc thử thách, bấm QUAY và để kim quyết định. Vuốt vòng quay hoặc nhấn Space. Uống luôn là tuỳ chọn — uống nước hay làm thử thách không rượu đều tính.'
};
const gameMeta = (lang, mode, item) => {
  const th = mode.type === 'themes' ? THEME_TEXT[lang][item.id] : null;
  const qt = item.quizTheme ? quizTheme(item.quizTheme) : null;
  if (qt && qt.custom) {
    const n = qt.questions.length;
    return {
      title: L(qt.title, lang),
      description: L(qt.description, lang) || (lang === 'vi' ? 'Game tự tạo' : 'Your custom game'),
      howToPlay: lang === 'vi' ? `Game do bạn tạo · ${n} câu hỏi. Chơi solo, cả lớp hoặc chia đội — cùng một engine với mọi game khác của JParty.` : `Your own game · ${n} questions. Play solo, as a class or in teams — the same engine as every other JParty game.`,
      id: item.id,
      icon: item.icon,
      plan: 'free',
      players: item.players,
      duration: item.duration,
      scoring: item.scoring,
      difficulty: item.difficulty
    };
  }
  const txt = th ? {
    title: th.name,
    description: th.tagline,
    howToPlay: SPINNER_HOWTO[lang]
  } : qt ? {
    title: L(qt.title, lang),
    description: `${L(qt.description, lang)} · ${qt.questions.length} ${lang === 'vi' ? 'câu hỏi' : 'questions'}`,
    howToPlay: QUIZ_HOWTO[lang]
  } : GAME_META_TEXT[lang][item.id] || {
    title: item.id,
    description: '',
    howToPlay: ''
  };
  return {
    ...txt,
    id: item.id,
    icon: item.icon,
    plan: item.plan || 'free',
    players: item.players,
    duration: item.duration,
    scoring: item.scoring,
    difficulty: item.difficulty
  };
};
const gameTitle = (lang, modeId, itemId) => {
  const def = findGame(modeId, itemId);
  return def ? gameMeta(lang, def.mode, def.item).title : itemId;
};

/* ==== js/engine/audio.js ==== */
let _ctx = null;
let _master = null;
const getCtx = () => {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      const comp = _ctx.createDynamicsCompressor();
      _master = _ctx.createGain();
      _master.gain.value = 0.9;
      _master.connect(comp).connect(_ctx.destination);
    } catch (e) {
      _ctx = null;
    }
  }
  if (_ctx && _ctx.state === 'suspended') _ctx.resume();
  return _ctx;
};
const tone = (freq, dur, type = 'sine', vol = 0.18, when = 0, glideTo = null) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(_master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};
const sweep = (f1, f2, dur, vol = 0.12) => {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, t);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f1, t);
  osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(filter).connect(gain).connect(_master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
};
let _noiseBuf = null;
const noise = ({
  dur = 0.3,
  vol = 0.2,
  type = 'lowpass',
  f1 = 800,
  f2 = f1,
  q = 0.8,
  when = 0
} = {}) => {
  const ctx = getCtx();
  if (!ctx) return;
  if (!_noiseBuf) {
    _noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = _noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource();
  src.buffer = _noiseBuf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(f1, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(_master);
  src.start(t);
  src.stop(t + dur + 0.05);
};
const SFX = {
  click: () => tone(660, 0.05, 'sine', 0.08),
  tick: () => tone(1500 + rand() * 250, 0.028, 'square', 0.045),
  whoosh: () => sweep(320, 70, 0.7, 0.1),
  land: () => tone(520, 0.14, 'sine', 0.12, 0, 440),
  win: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.24, 'triangle', 0.2, i * 0.09));
    tone(1046.5, 0.7, 'sine', 0.14, 0.38);
    tone(1318.5, 0.6, 'sine', 0.08, 0.44);
    tone(1568, 0.5, 'sine', 0.05, 0.5);
  },
  flutter: () => [0, 0.09, 0.18, 0.27].forEach(w => noise({
    dur: 0.07,
    vol: 0.05,
    type: 'bandpass',
    f1: 900,
    f2: 1400,
    q: 2,
    when: w
  })),
  creak: () => tone(140, 0.4, 'sawtooth', 0.035, 0, 215),
  twang: () => {
    tone(330, 0.16, 'triangle', 0.18, 0, 150);
    noise({
      dur: 0.28,
      vol: 0.12,
      type: 'bandpass',
      f1: 2200,
      f2: 500,
      q: 1.5,
      when: 0.03
    });
  },
  heartHit: () => {
    tone(160, 0.22, 'sine', 0.3, 0, 55);
    [1318.5, 1760, 2093, 2637].forEach((f, i) => tone(f, 0.3, 'sine', 0.1, 0.05 + i * 0.07));
  },
  slide: () => noise({
    dur: 0.4,
    vol: 0.08,
    type: 'bandpass',
    f1: 400,
    f2: 1600,
    q: 1
  }),
  clink: () => {
    [2637, 3951, 5274].forEach((f, i) => tone(f, 0.65 - i * 0.12, 'sine', 0.15 - i * 0.03));
    tone(1319, 0.08, 'square', 0.05);
    tone(3956, 0.5, 'triangle', 0.05, 0.08);
  },
  slotTick: () => tone(900 + rand() * 300, 0.035, 'square', 0.05),
  jackpot: () => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, i * 0.07));
    [1046.5, 1318.5, 1568].forEach(f => tone(f, 1.1, 'sine', 0.08, 0.55));
  },
  coin: () => {
    tone(2093, 0.08, 'square', 0.04);
    tone(2794, 0.25, 'square', 0.04, 0.06);
  },
  giggle: () => [640, 560, 620, 520, 450].forEach((f, i) => tone(f, 0.1, 'triangle', 0.1, i * 0.1, f * 0.82)),
  charge: () => {
    noise({
      dur: 0.45,
      vol: 0.1,
      type: 'lowpass',
      f1: 200,
      f2: 2600
    });
    tone(90, 0.45, 'sawtooth', 0.06, 0, 420);
  },
  fireHit: () => {
    noise({
      dur: 0.6,
      vol: 0.3,
      type: 'lowpass',
      f1: 900,
      f2: 120
    });
    tone(90, 0.45, 'sine', 0.3, 0, 40);
  },
  thud: () => {
    tone(130, 0.2, 'sine', 0.4, 0, 38);
    noise({
      dur: 0.08,
      vol: 0.2,
      type: 'highpass',
      f1: 1200
    });
  },
  bell: () => {
    tone(2093, 0.9, 'sine', 0.16);
    tone(4186, 0.5, 'sine', 0.05);
    tone(2793, 0.4, 'sine', 0.04, 0.01);
  },
  whistle: () => {
    tone(500, 0.65, 'sine', 0.07, 0, 1700);
    noise({
      dur: 0.6,
      vol: 0.05,
      type: 'highpass',
      f1: 2000,
      f2: 5000
    });
  },
  boom: () => {
    noise({
      dur: 0.8,
      vol: 0.38,
      type: 'lowpass',
      f1: 600,
      f2: 60
    });
    tone(70, 0.6, 'sine', 0.3, 0, 30);
  }
};

/* ==== js/engine/effects.js ==== */
const fireConfetti = (colors, power = 1) => {
  if (typeof confetti !== 'function') return;
  const base = {
    colors,
    disableForReducedMotion: true
  };
  confetti({
    ...base,
    particleCount: Math.round(140 * power),
    spread: 90,
    startVelocity: 45,
    origin: {
      y: 0.55
    },
    scalar: 1.1
  });
  setTimeout(() => confetti({
    ...base,
    particleCount: Math.round(70 * power),
    spread: 120,
    angle: 60,
    origin: {
      x: 0,
      y: 0.7
    }
  }), 180);
  setTimeout(() => confetti({
    ...base,
    particleCount: Math.round(70 * power),
    spread: 120,
    angle: 120,
    origin: {
      x: 1,
      y: 0.7
    }
  }), 360);
};
const spawnFloaters = (emojis, count) => {
  if (REDUCED_MOTION || !emojis.length) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'float-particle';
    el.textContent = emojis[randInt(emojis.length)];
    el.style.left = `${5 + rand() * 90}%`;
    el.style.fontSize = `${24 + rand() * 28}px`;
    el.style.animationDuration = `${2.6 + rand() * 1.2}s`;
    el.style.animationDelay = `${rand() * 0.6}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
};
const flashScreen = () => {
  if (REDUCED_MOTION) return;
  const el = document.createElement('div');
  el.className = 'flash-overlay';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
};
const triggerThemeEffect = theme => {
  switch (theme.effect) {
    case 'hearts':
      spawnFloaters(theme.floaters, 22);
      fireConfetti(theme.confettiColors);
      break;
    case 'flash':
      flashScreen();
      fireConfetti(theme.confettiColors, 1.4);
      spawnFloaters(theme.floaters, 10);
      break;
    case 'clean':
      fireConfetti(theme.confettiColors, 0.5);
      break;
    default:
      fireConfetti(theme.confettiColors);
      spawnFloaters(theme.floaters, 10);
      break;
  }
};

/* ==== js/engine/randomEngine.js ==== */
const Random = {
  item: arr => arr[randInt(arr.length)],
  shuffle: shuffleArr,
  player: (players, {
    exclude = [],
    includeEliminated = false
  } = {}) => {
    const pool = players.filter(p => !exclude.includes(p.id) && (includeEliminated || !p.eliminated));
    return pool.length ? pool[randInt(pool.length)] : null;
  },
  players: (players, count, opts = {}) => {
    const picked = [];
    for (let i = 0; i < count; i++) {
      const p = Random.player(players, {
        ...opts,
        exclude: [...(opts.exclude || []), ...picked.map(x => x.id)]
      });
      if (!p) break;
      picked.push(p);
    }
    return picked;
  },
  target: (players, excludeId) => Random.player(players, {
    exclude: [excludeId]
  }),
  pairs: players => {
    const pool = shuffleArr(players.filter(p => !p.eliminated));
    const out = [];
    for (let i = 0; i + 1 < pool.length; i += 2) out.push([pool[i].id, pool[i + 1].id]);
    return {
      pairs: out,
      bye: pool.length % 2 ? pool[pool.length - 1].id : null
    };
  }
};
const createBag = items => {
  let pool = [];
  let last = null;
  return {
    next: () => {
      if (!pool.length) {
        pool = shuffleArr(items);
        if (pool.length > 1 && pool[pool.length - 1] === last) pool.unshift(pool.pop());
      }
      last = pool.pop();
      return last;
    },
    reset: () => {
      pool = [];
    }
  };
};
const useBag = (items, key) => {
  const ref = useRef({
    key: null,
    bag: null
  });
  if (ref.current.key !== key) ref.current = {
    key,
    bag: createBag(items)
  };
  return ref.current.bag;
};
const nextActiveIndex = (players, from, dir = 1) => {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = mod(from + dir * k, n);
    if (!players[i].eliminated) return i;
  }
  return from;
};

/* ==== js/engine/scoreEngine.js ==== */
const Score = {
  update: (players, id, fn) => players.map(p => p.id === id ? {
    ...p,
    ...fn(p)
  } : p),
  addPoints: (players, id, n = 1) => Score.update(players, id, p => ({
    score: p.score + n
  })),
  removePoints: (players, id, n = 1) => Score.update(players, id, p => ({
    score: Math.max(0, p.score - n)
  })),
  incrementWin: (players, id) => Score.update(players, id, p => ({
    wins: p.wins + 1,
    streak: p.streak + 1,
    bestStreak: Math.max(p.bestStreak, p.streak + 1)
  })),
  incrementLoss: (players, id) => Score.update(players, id, p => ({
    losses: p.losses + 1,
    streak: 0
  })),
  incrementStreak: (players, id) => Score.update(players, id, p => ({
    streak: p.streak + 1,
    bestStreak: Math.max(p.bestStreak, p.streak + 1)
  })),
  resetStreak: (players, id) => Score.update(players, id, () => ({
    streak: 0
  })),
  eliminatePlayer: (players, id) => Score.update(players, id, () => ({
    eliminated: true
  })),
  resetForGame: players => players.map(p => ({
    ...p,
    score: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    eliminated: false
  })),
  leaderboard: players => [...players].sort((a, b) => b.score - a.score || b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name)),
  leaders: players => {
    const lb = Score.leaderboard(players);
    return lb.length ? lb.filter(p => p.score === lb[0].score && p.wins === lb[0].wins) : [];
  },
  active: players => players.filter(p => !p.eliminated),
  byId: (players, id) => players.find(p => p.id === id) || null
};

/* ==== js/engine/timerEngine.js ==== */
function useTimer() {
  const [snap, setSnap] = useState({
    ms: 0,
    total: 0,
    running: false
  });
  const ref = useRef({
    end: 0,
    remain: 0,
    total: 0,
    raf: 0,
    onDone: null,
    lastSet: 0
  });
  const clear = () => {
    cancelAnimationFrame(ref.current.raf);
    ref.current.raf = 0;
  };
  const TICK_MS = 40;
  const tick = useCallback(() => {
    const now = performance.now();
    const r = Math.max(0, ref.current.end - now);
    if (r <= 0) {
      clear();
      setSnap({
        ms: 0,
        total: ref.current.total,
        running: false
      });
      const cb = ref.current.onDone;
      ref.current.onDone = null;
      if (cb) cb();
      return;
    }
    if (now - ref.current.lastSet >= TICK_MS) {
      ref.current.lastSet = now;
      setSnap({
        ms: r,
        total: ref.current.total,
        running: true
      });
    }
    ref.current.raf = requestAnimationFrame(tick);
  }, []);
  const start = useCallback((ms, onDone) => {
    clear();
    ref.current = {
      end: performance.now() + ms,
      remain: 0,
      total: ms,
      raf: 0,
      onDone: onDone || null,
      lastSet: 0
    };
    setSnap({
      ms,
      total: ms,
      running: true
    });
    ref.current.raf = requestAnimationFrame(tick);
  }, [tick]);
  const pause = useCallback(() => {
    if (!ref.current.raf) return;
    ref.current.remain = Math.max(0, ref.current.end - performance.now());
    clear();
    setSnap(s => ({
      ...s,
      running: false
    }));
  }, []);
  const resume = useCallback(() => {
    if (ref.current.raf || !ref.current.remain) return;
    ref.current.end = performance.now() + ref.current.remain;
    ref.current.remain = 0;
    ref.current.raf = requestAnimationFrame(tick);
    setSnap(s => ({
      ...s,
      running: true
    }));
  }, [tick]);
  const stop = useCallback(() => {
    clear();
    ref.current.onDone = null;
    ref.current.remain = 0;
    setSnap(s => ({
      ...s,
      running: false
    }));
  }, []);
  const reset = useCallback(() => {
    clear();
    ref.current = {
      end: 0,
      remain: 0,
      total: 0,
      raf: 0,
      onDone: null,
      lastSet: 0
    };
    setSnap({
      ms: 0,
      total: 0,
      running: false
    });
  }, []);
  useEffect(() => () => clear(), []);
  return {
    ...snap,
    seconds: Math.ceil(snap.ms / 1000),
    progress: snap.total ? snap.ms / snap.total : 0,
    start,
    pause,
    resume,
    stop,
    reset
  };
}
function useStopwatch() {
  const [ms, setMs] = useState(0);
  const ref = useRef({
    start: 0,
    raf: 0,
    lastSet: 0
  });
  const tick = useCallback(() => {
    const now = performance.now();
    if (now - ref.current.lastSet >= 50) {
      ref.current.lastSet = now;
      setMs(now - ref.current.start);
    }
    ref.current.raf = requestAnimationFrame(tick);
  }, []);
  const start = useCallback(() => {
    cancelAnimationFrame(ref.current.raf);
    ref.current.start = performance.now();
    ref.current.raf = requestAnimationFrame(tick);
  }, [tick]);
  const stop = useCallback(() => cancelAnimationFrame(ref.current.raf), []);
  const reset = useCallback(() => {
    cancelAnimationFrame(ref.current.raf);
    setMs(0);
  }, []);
  useEffect(() => () => cancelAnimationFrame(ref.current.raf), []);
  return {
    ms,
    start,
    stop,
    reset
  };
}
const fmtSeconds = ms => `${(ms / 1000).toFixed(1)}s`;

/* ==== js/engine/playerEngine.js ==== */
const PLAYER_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#2dd4bf', '#fb7185', '#a3e635', '#c084fc'];
const PLAYER_AVATARS = ['😎', '🦊', '🐯', '🐸', '🦄', '🐼', '🐙', '🐧', '🦁', '🐨', '🐵', '🐰', '🐶', '🐱', '🦖', '🐻'];
const MAX_PLAYERS = 12;
const createPlayer = (name, existing = []) => {
  const usedColors = new Set(existing.map(p => p.color));
  const usedAvatars = new Set(existing.map(p => p.avatar));
  return {
    id: uid(),
    name: clip(name) || `Player ${existing.length + 1}`,
    avatar: PLAYER_AVATARS.find(a => !usedAvatars.has(a)) || PLAYER_AVATARS[existing.length % PLAYER_AVATARS.length],
    color: PLAYER_COLORS.find(c => !usedColors.has(c)) || PLAYER_COLORS[existing.length % PLAYER_COLORS.length],
    score: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    eliminated: false,
    team: null,
    stats: {
      games: 0,
      wins: 0,
      points: 0,
      bestStreak: 0
    }
  };
};
const normalizePlayer = (p, i, all) => ({
  ...createPlayer(p.name || `Player ${i + 1}`, all.slice(0, i)),
  ...p,
  id: p.id || uid()
});
const renamePlayer = (players, id, name) => players.map(p => p.id === id ? {
  ...p,
  name: clip(name) || p.name
} : p);
const removePlayer = (players, id) => players.filter(p => p.id !== id);
const playerById = (players, id) => players.find(p => p.id === id) || null;
const namesOf = (players, ids) => ids.map(id => playerById(players, id)?.name).filter(Boolean);
const defaultSelection = (players, [min, max]) => players.slice(0, Math.min(players.length, max)).map(p => p.id);

/* ==== js/engine/gameEngine.js ==== */
const GAME_STATUS = ['setup', 'countdown', 'challenge', 'result', 'finished'];
function gameReducer(state, action) {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        status: action.countdown ? 'countdown' : 'challenge',
        players: action.players,
        settings: action.settings,
        round: 1,
        current: action.round,
        lastResult: null,
        history: [],
        winner: null,
        startedAt: Date.now(),
        finishedAt: 0
      };
    case 'COUNTDOWN_DONE':
      return state.status === 'countdown' ? {
        ...state,
        status: 'challenge'
      } : state;
    case 'PATCH':
      return {
        ...state,
        ...action.patch
      };
    case 'PATCH_CURRENT':
      return {
        ...state,
        current: {
          ...state.current,
          ...action.patch
        }
      };
    case 'RESOLVE':
      return {
        ...state,
        status: 'result',
        players: action.players,
        settings: action.settings || state.settings,
        lastResult: action.result,
        history: [...state.history, {
          round: state.round,
          ...action.result
        }]
      };
    case 'NEXT_ROUND':
      return {
        ...state,
        status: action.countdown ? 'countdown' : 'challenge',
        round: state.round + 1,
        current: action.round,
        lastResult: null
      };
    case 'FINISH':
      return {
        ...state,
        status: 'finished',
        winner: action.winner,
        finishedAt: Date.now()
      };
    case 'RESET':
      return action.initial;
    default:
      return state;
  }
}
function useGameEngine(rules) {
  const initial = useMemo(() => ({
    status: 'setup',
    players: [],
    settings: {},
    round: 0,
    current: null,
    lastResult: null,
    history: [],
    winner: null,
    startedAt: 0,
    finishedAt: 0
  }), []);
  const [state, dispatch] = useReducer(gameReducer, initial);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const stateRef = useRef(state);
  stateRef.current = state;
  const countdownFor = round => {
    const c = rulesRef.current.countdown;
    return typeof c === 'function' ? c(round) : c ?? 3;
  };
  const startGame = useCallback((players, settings = {}) => {
    const r = rulesRef.current;
    const fresh = Score.resetForGame(players);
    const base = {
      ...stateRef.current,
      players: fresh,
      settings,
      round: 1,
      history: [],
      current: null
    };
    dispatch({
      type: 'START',
      players: fresh,
      settings,
      round: r.buildRound(base),
      countdown: countdownFor(1) > 0
    });
  }, []);
  const countdownDone = useCallback(() => dispatch({
    type: 'COUNTDOWN_DONE'
  }), []);
  const patch = useCallback(p => dispatch({
    type: 'PATCH',
    patch: p
  }), []);
  const patchCurrent = useCallback(p => dispatch({
    type: 'PATCH_CURRENT',
    patch: p
  }), []);
  const resolveRound = useCallback(outcome => {
    const s = stateRef.current;
    if (s.status !== 'challenge') return;
    const {
      players,
      result,
      settings
    } = rulesRef.current.resolveRound(s, outcome);
    dispatch({
      type: 'RESOLVE',
      players,
      result: {
        ...result,
        outcome
      },
      settings
    });
  }, []);
  const nextRound = useCallback(() => {
    const s = stateRef.current;
    const r = rulesRef.current;
    const winner = r.checkEnd(s);
    if (winner) {
      dispatch({
        type: 'FINISH',
        winner
      });
      return;
    }
    const round = s.round + 1;
    dispatch({
      type: 'NEXT_ROUND',
      round: r.buildRound({
        ...s,
        round
      }),
      countdown: countdownFor(round) > 0
    });
  }, []);
  const endGame = useCallback(() => {
    const s = stateRef.current;
    dispatch({
      type: 'FINISH',
      winner: rulesRef.current.checkEnd(s) || Score.leaders(s.players)
    });
  }, []);
  const resetGame = useCallback(() => dispatch({
    type: 'RESET',
    initial
  }), [initial]);
  const pendingWinner = state.status === 'result' ? rules.checkEnd(state) : null;
  return {
    state,
    pendingWinner,
    countdownSeconds: countdownFor(state.round || 1),
    startGame,
    countdownDone,
    patch,
    patchCurrent,
    resolveRound,
    nextRound,
    endGame,
    resetGame
  };
}
const gameResultEntry = (modeId, gameId, players, winners, summary) => ({
  modeId,
  gameId,
  winnerIds: (winners || []).map(p => p.id),
  winnerNames: (winners || []).map(p => p.name),
  summary,
  scores: players.map(p => ({
    id: p.id,
    name: p.name,
    score: p.score,
    wins: p.wins,
    bestStreak: p.bestStreak
  }))
});

/* ==== js/engine/sessionEngine.js ==== */
const createSession = (players = []) => ({
  id: uid(),
  createdAt: Date.now(),
  players,
  history: [],
  stats: {}
});
const normalizeSession = s => {
  if (!s || !Array.isArray(s.players)) return createSession();
  return {
    ...createSession(),
    ...s,
    players: s.players.map(normalizePlayer),
    history: Array.isArray(s.history) ? s.history : [],
    stats: s.stats || {}
  };
};
const recordGame = (session, entry) => {
  const stats = {
    ...session.stats
  };
  entry.scores.forEach(row => {
    const prev = stats[row.id] || {
      games: 0,
      wins: 0,
      points: 0,
      bestStreak: 0
    };
    stats[row.id] = {
      games: prev.games + 1,
      wins: prev.wins + (entry.winnerIds.includes(row.id) ? 1 : 0),
      points: prev.points + (row.score || 0),
      bestStreak: Math.max(prev.bestStreak, row.bestStreak || 0)
    };
  });
  return {
    ...session,
    stats,
    history: [{
      id: uid(),
      ts: Date.now(),
      ...entry
    }, ...session.history].slice(0, 100)
  };
};
const sessionSummary = session => {
  const rows = session.players.map(p => ({
    player: p,
    ...(session.stats[p.id] || {
      games: 0,
      wins: 0,
      points: 0,
      bestStreak: 0
    })
  }));
  const top = key => rows.filter(r => r[key] > 0).sort((a, b) => b[key] - a[key])[0] || null;
  return {
    gamesPlayed: session.history.length,
    playerCount: session.players.length,
    mostWins: top('wins'),
    longestStreak: top('bestStreak'),
    mostPlayed: top('games'),
    mostPoints: top('points'),
    rows
  };
};

/* ==== js/subscription/plans.js ==== */
const PLANS = ['free', 'pro', 'max'];
const PLAN_RANK = {
  free: 0,
  pro: 1,
  max: 2
};
const PLAN_LABEL = {
  free: 'FREE',
  pro: 'PRO',
  max: 'MAX'
};
const FEATURES = {
  'basic-spinner': 'free',
  'custom-items': 'free',
  'basic-themes': 'free',
  'advanced-themes': 'pro',
  battle: 'free',
  'advanced-battle': 'pro',
  king: 'pro',
  quiz: 'free',
  'advanced-quiz': 'pro',
  'mini-games': 'free',
  'advanced-mini-games': 'pro',
  cards: 'pro',
  'venue-branding': 'max',
  'venue-mode': 'max',
  'realtime-sync': 'max',
  'qr-join': 'max',
  'host-mode': 'max',
  'big-screen': 'max',
  'venue-stats': 'max',
  'saved-venue-config': 'max'
};
const planAtLeast = (plan, min) => (PLAN_RANK[plan] ?? 0) >= (PLAN_RANK[min] ?? 0);
const createSubscription = (plan = 'free') => ({
  plan,
  status: 'active',
  expiresAt: null
});
const normalizeSubscription = s => s && PLANS.includes(s.plan) ? {
  plan: s.plan,
  status: s.status || 'active',
  expiresAt: s.expiresAt || null
} : createSubscription();
const Entitlements = {
  isFree: sub => sub.plan === 'free',
  isPro: sub => sub.plan === 'pro',
  isMax: sub => sub.plan === 'max',
  hasFeature: (sub, feature) => planAtLeast(sub.plan, FEATURES[feature] || 'free'),
  canPlay: (sub, item) => planAtLeast(sub.plan, item.plan || 'free'),
  requiredPlan: item => item.plan || 'free',
  upgradeFor: (sub, minPlan) => planAtLeast(sub.plan, minPlan) ? null : minPlan,
  featurePlan: feature => FEATURES[feature] || 'free'
};
const IS_DEV = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || /[?&#]dev\b/.test(location.href);

/* ==== js/venue/venue.js ==== */
const LOGO_MAX_BYTES = 4 * 1024 * 1024;
const LOGO_MIN_SIDE = 64;
const LOGO_TARGET_SIDE = 512;
const createVenue = () => ({
  enabled: false,
  name: '',
  tagline: '',
  logo: null,
  primary: '#f472b6',
  secondary: '#22d3ee',
  maxPlayers: 8,
  table: '',
  bigScreen: false,
  qrJoin: true,
  defaultSound: true,
  defaultHaptics: true
});
const normalizeVenue = v => ({
  ...createVenue(),
  ...(v || {})
});
const brandingActive = (sub, venue) => Entitlements.hasFeature(sub, 'venue-branding') && venue.enabled && !!venue.name.trim();
const processLogoFile = (file, errors) => new Promise((resolve, reject) => {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return reject(new Error(errors.type));
  if (file.size > LOGO_MAX_BYTES) return reject(new Error(errors.size));
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    if (img.naturalWidth < LOGO_MIN_SIDE || img.naturalHeight < LOGO_MIN_SIDE) return reject(new Error(errors.small));
    const scale = Math.min(1, LOGO_TARGET_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/webp', 0.9));
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error(errors.type));
  };
  img.src = url;
});
const applyBrandVars = (venue, active) => {
  const root = document.documentElement.style;
  if (active) {
    root.setProperty('--brand-primary', venue.primary);
    root.setProperty('--brand-secondary', venue.secondary);
    root.setProperty('--brand-accent', venue.primary);
  } else {
    ['--brand-primary', '--brand-secondary', '--brand-accent'].forEach(v => root.removeProperty(v));
  }
};

/* ==== js/components/ui.js ==== */
const Icon = {
  Menu: () => React.createElement("svg", {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M4 6h16M4 12h16M4 18h16",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  })),
  Sound: ({
    on
  }) => React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M4 9v6h4l5 4V5L8 9H4z",
    fill: "currentColor"
  }), on ? React.createElement("path", {
    d: "M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }) : React.createElement("path", {
    d: "M17 9l5 6M22 9l-5 6",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  })),
  Link: () => React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  })),
  Expand: ({
    on
  }) => React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, on ? React.createElement("path", {
    d: "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }) : React.createElement("path", {
    d: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })),
  Info: () => React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9",
    stroke: "currentColor",
    strokeWidth: "2"
  }), React.createElement("path", {
    d: "M12 11v5",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round"
  }), React.createElement("circle", {
    cx: "12",
    cy: "7.8",
    r: "1.3",
    fill: "currentColor"
  })),
  X: () => React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M6 6l12 12M18 6L6 18",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }))
};
function Switch({
  checked,
  onChange,
  label
}) {
  return React.createElement("label", {
    className: "switch"
  }, React.createElement("input", {
    type: "checkbox",
    checked: checked,
    onChange: e => onChange(e.target.checked),
    "aria-label": label
  }), React.createElement("span", {
    className: "slider"
  }));
}
function IconButton({
  onClick,
  label,
  children,
  active
}) {
  return React.createElement("button", {
    onClick: onClick,
    "aria-label": label,
    title: label,
    className: `w-11 h-11 shrink-0 rounded-full grid place-items-center border btn-press
        ${active ? 'bg-white text-slate-900 border-white' : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'}`
  }, children);
}
function ToolBtn({
  onClick,
  children,
  disabled,
  title
}) {
  return React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    title: title,
    className: "px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 btn-press disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
  }, children);
}
function Kbd({
  children
}) {
  return React.createElement("kbd", {
    className: "px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-[11px] font-mono"
  }, children);
}
function Toast({
  toast,
  onDismiss
}) {
  if (!toast) return null;
  return React.createElement("div", {
    className: "fixed inset-x-0 z-[80] flex justify-center px-4 pointer-events-none",
    style: {
      bottom: 'max(1.25rem, env(safe-area-inset-bottom))'
    }
  }, React.createElement("div", {
    key: toast.id,
    role: "status",
    className: "toast-in pointer-events-auto flex items-center gap-3 rounded-full bg-slate-950/90 border border-white/15 pl-4 pr-2 py-2 shadow-2xl text-sm backdrop-blur max-w-full"
  }, React.createElement("span", {
    className: "truncate"
  }, toast.msg), toast.action ? React.createElement("button", {
    onClick: () => {
      toast.action.fn();
      onDismiss();
    },
    className: "shrink-0 font-bold text-yellow-300 hover:text-yellow-200 px-3 py-1 rounded-full hover:bg-white/10"
  }, toast.action.label) : React.createElement("span", {
    className: "w-2"
  })));
}
function Field({
  label,
  hint,
  error,
  children
}) {
  return React.createElement("label", {
    className: "block"
  }, React.createElement("span", {
    className: "flex items-baseline justify-between gap-2 mb-1"
  }, React.createElement("span", {
    className: "text-xs font-bold uppercase tracking-wider text-white/55"
  }, label), hint && React.createElement("span", {
    className: "text-[11px] text-white/40"
  }, hint)), children, error && React.createElement("span", {
    className: "block text-[11px] text-red-300 mt-1"
  }, "\u26A0 ", error));
}
const inputCls = 'w-full rounded-2xl px-4 py-2.5 bg-black/25 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40';
const errCls = 'border-red-400/70';
function Header({
  t,
  theme,
  themeText,
  subtitle,
  brand,
  onMenu,
  soundOn,
  onToggleSound,
  onShareWheel,
  party,
  onToggleParty
}) {
  return React.createElement("header", {
    className: "sticky top-0 z-20 px-3 sm:px-4 pb-3 flex items-center gap-2 sm:gap-3 backdrop-blur-md bg-black/15 border-b border-white/10",
    style: {
      paddingTop: 'max(0.75rem, env(safe-area-inset-top))'
    }
  }, React.createElement("span", {
    className: "lg:hidden"
  }, React.createElement(IconButton, {
    onClick: onMenu,
    label: t.openMenu
  }, React.createElement(Icon.Menu, null))), React.createElement("div", {
    className: "flex-1 flex items-center gap-2 min-w-0"
  }, brand && brand.logo ? React.createElement("img", {
    src: brand.logo,
    alt: "",
    className: "w-9 h-9 rounded-xl object-cover border border-white/20 shrink-0"
  }) : React.createElement("div", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, theme.icon), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("h1", {
    className: "font-extrabold tracking-wide leading-none truncate brand-accent"
  }, brand ? brand.name : t.appName), React.createElement("div", {
    className: "text-[11px] text-white/70 truncate mt-0.5"
  }, brand ? `${t.poweredByPG} · ${subtitle || themeText.name}` : subtitle || `${themeText.name} · ${themeText.tagline}`))), React.createElement(IconButton, {
    onClick: onToggleSound,
    label: soundOn ? t.muted : t.unmuted
  }, React.createElement(Icon.Sound, {
    on: soundOn
  })), React.createElement(IconButton, {
    onClick: onShareWheel,
    label: t.shareWheel
  }, React.createElement(Icon.Link, null)), React.createElement(IconButton, {
    onClick: onToggleParty,
    label: party ? t.exitParty : t.partyMode,
    active: party
  }, React.createElement(Icon.Expand, {
    on: party
  })));
}
function Section({
  title,
  right,
  children
}) {
  return React.createElement("section", null, React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, React.createElement("h3", {
    className: "text-xs font-bold uppercase tracking-[0.15em] text-white/55"
  }, title), right), children);
}

/* ==== js/components/premium.js ==== */
function PlanBadge({
  plan,
  locked,
  t
}) {
  if (!plan || plan === 'free') return null;
  const max = plan === 'max';
  return React.createElement("span", {
    className: `inline-flex items-center gap-0.5 text-[10px] font-extrabold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${max ? 'text-white' : 'bg-yellow-300 text-yellow-900'}`,
    style: max ? {
      background: 'linear-gradient(90deg, #f59e0b, #e11d48 55%, #a855f7)',
      boxShadow: '0 0 12px -3px #f59e0b'
    } : undefined,
    title: locked ? t.availableWith(plan) : undefined
  }, max ? '👑 ' : '', PLAN_LABEL[plan], locked ? ' 🔒' : '');
}
function UpgradeModal({
  t,
  plan,
  meta,
  onUpgrade,
  onClose
}) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const copy = t.upgrade[plan];
  const max = plan === 'max';
  return React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade",
    onClick: onClose
  }, React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "upgrade-title",
    className: "bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl animate-pop",
    onClick: e => e.stopPropagation()
  }, meta ? React.createElement(React.Fragment, null, React.createElement("div", {
    className: "flex items-center gap-3"
  }, React.createElement("span", {
    className: "text-4xl",
    "aria-hidden": "true"
  }, meta.icon), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("h3", {
    id: "upgrade-title",
    className: "text-xl font-extrabold truncate"
  }, meta.title), React.createElement("div", {
    className: "text-sm text-white/65 truncate"
  }, meta.description))), React.createElement("div", {
    className: "mt-4 text-xs font-bold uppercase tracking-wider text-white/55"
  }, t.availableWith(plan))) : React.createElement(React.Fragment, null, React.createElement("h3", {
    id: "upgrade-title",
    className: "text-2xl font-extrabold"
  }, copy.title), React.createElement("p", {
    className: "text-sm text-white/70 mt-1"
  }, copy.body)), React.createElement("ul", {
    className: "mt-3 space-y-1.5 text-sm"
  }, copy.perks.map(p => React.createElement("li", {
    key: p,
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-green-300"
  }, "\u2713"), " ", p))), max && React.createElement("div", {
    className: "mt-3 text-xs italic text-white/60"
  }, "\u201C", t.planTag.max, "\u201D"), React.createElement("button", {
    ref: ref,
    onClick: () => onUpgrade(plan),
    className: "mt-5 w-full rounded-full py-3 font-extrabold btn-press shadow-lg text-white",
    style: {
      background: max ? 'linear-gradient(90deg, #f59e0b, #e11d48 55%, #a855f7)' : 'linear-gradient(90deg, #facc15, #f472b6)',
      color: max ? '#fff' : '#3b0764'
    }
  }, t.upgradeTo(plan)), React.createElement("button", {
    onClick: onClose,
    className: "mt-2 w-full text-sm text-white/60 hover:text-white py-2"
  }, t.maybeLater)));
}
const COMPARE_ROWS = [['basicSpinner', 'free'], ['basicThemes', 'free'], ['advancedThemes', 'pro'], ['basicBattle', 'free'], ['advancedBattle', 'pro'], ['king', 'pro'], ['quiz', 'free'], ['advancedQuiz', 'pro'], ['miniGames', 'free'], ['advancedMini', 'pro'], ['cards', 'pro'], ['customItems', 'free'], ['customLogo', 'max'], ['venueName', 'max'], ['venueMode', 'max'], ['qrJoin', 'max'], ['realtime', 'max'], ['hostMode', 'max'], ['bigScreen', 'max'], ['venueStats', 'max']];
function PricingView({
  t,
  sub,
  onUpgrade,
  onBack
}) {
  const cards = [{
    plan: 'free',
    icon: '🎉',
    price: '$0',
    style: {
      background: 'rgba(255,255,255,0.06)'
    }
  }, {
    plan: 'pro',
    icon: '⭐',
    price: null,
    style: {
      background: 'linear-gradient(160deg, rgba(250,204,21,0.18), rgba(244,114,182,0.14))',
      borderColor: 'rgba(250,204,21,0.5)'
    }
  }, {
    plan: 'max',
    icon: '👑',
    price: null,
    style: {
      background: 'linear-gradient(160deg, rgba(245,158,11,0.22), rgba(225,29,72,0.18) 55%, rgba(168,85,247,0.2))',
      borderColor: 'rgba(245,158,11,0.6)',
      boxShadow: '0 30px 80px -40px #f59e0b'
    }
  }];
  return React.createElement("section", {
    className: "w-full max-w-3xl"
  }, React.createElement("div", {
    className: "flex items-center gap-2 mb-4"
  }, React.createElement("button", {
    onClick: onBack,
    className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\u2190"), React.createElement("h2", {
    className: "text-2xl font-black"
  }, t.choosePlan)), React.createElement("div", {
    className: "grid gap-3 sm:grid-cols-3"
  }, cards.map(({
    plan,
    icon,
    price,
    style
  }) => {
    const current = sub.plan === plan;
    const below = planAtLeast(sub.plan, plan) && !current;
    return React.createElement("div", {
      key: plan,
      className: "glass rounded-3xl p-5 flex flex-col border",
      style: style
    }, React.createElement("div", {
      className: "flex items-center justify-between"
    }, React.createElement("div", {
      className: "text-lg font-black tracking-wide"
    }, icon, " ", PLAN_LABEL[plan]), price && React.createElement("div", {
      className: "text-sm font-bold text-white/70"
    }, price)), React.createElement("div", {
      className: "text-xs italic text-white/65 mt-1"
    }, "\u201C", t.planTag[plan], "\u201D"), React.createElement("ul", {
      className: "mt-4 space-y-1.5 text-sm flex-1"
    }, t.planCards[plan].map(f => React.createElement("li", {
      key: f,
      className: "flex items-start gap-2"
    }, React.createElement("span", {
      className: "text-green-300"
    }, "\u2713"), React.createElement("span", null, f)))), current ? React.createElement("div", {
      className: "mt-5 text-center text-xs font-extrabold tracking-widest py-3 rounded-full bg-white/15 border border-white/20"
    }, "\u2713 ", t.currentPlan) : below ? React.createElement("div", {
      className: "mt-5 text-center text-xs font-bold tracking-widest py-3 text-white/40"
    }, "\u2014") : React.createElement("button", {
      onClick: () => onUpgrade(plan),
      className: "mt-5 py-3 rounded-full font-extrabold btn-press shadow-lg",
      style: plan === 'max' ? {
        background: 'linear-gradient(90deg, #f59e0b, #e11d48 55%, #a855f7)',
        color: '#fff'
      } : {
        background: 'linear-gradient(90deg, #facc15, #f472b6)',
        color: '#3b0764'
      }
    }, t.upgradeTo(plan)));
  })), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-5 mt-4 overflow-x-auto"
  }, React.createElement("h3", {
    className: "font-bold mb-3"
  }, t.comparePlans), React.createElement("table", {
    className: "w-full text-sm"
  }, React.createElement("thead", null, React.createElement("tr", {
    className: "text-[11px] uppercase tracking-wider text-white/55"
  }, React.createElement("th", {
    className: "text-left font-bold py-1.5"
  }, "\xA0"), PLANS.map(p => React.createElement("th", {
    key: p,
    className: `font-black py-1.5 w-16 ${sub.plan === p ? 'text-white' : ''}`
  }, PLAN_LABEL[p])))), React.createElement("tbody", null, COMPARE_ROWS.map(([key, min]) => React.createElement("tr", {
    key: key,
    className: "border-t border-white/10"
  }, React.createElement("td", {
    className: "py-2 pr-2 text-white/85"
  }, t.compare[key]), PLANS.map(p => React.createElement("td", {
    key: p,
    className: "text-center py-2",
    "aria-label": planAtLeast(p, min) ? 'yes' : 'no'
  }, planAtLeast(p, min) ? React.createElement("span", {
    className: "text-green-300 font-black"
  }, "\u2713") : React.createElement("span", {
    className: "text-white/25"
  }, "\u2013")))))))), React.createElement("div", {
    className: "text-center text-[11px] text-white/45 mt-3"
  }, t.paymentsSoon));
}
function PlanIndicator({
  t,
  sub,
  onOpenPricing
}) {
  const next = sub.plan === 'free' ? 'pro' : sub.plan === 'pro' ? 'max' : null;
  return React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("button", {
    onClick: () => onOpenPricing(next),
    className: "text-left min-w-0 flex-1 rounded-xl -mx-1 px-1 py-1 hover:bg-white/5 btn-press",
    "aria-label": t.comparePlans
  }, React.createElement("div", {
    className: "font-semibold flex items-center gap-2"
  }, "\uD83D\uDC8E ", t.myPlan, " ", React.createElement(PlanBadge, {
    plan: sub.plan,
    t: t
  }), sub.plan === 'free' && React.createElement("span", {
    className: "text-xs text-white/60"
  }, PLAN_LABEL.free)), React.createElement("div", {
    className: "text-xs text-white/60"
  }, t.planTag[sub.plan])), next ? React.createElement("button", {
    onClick: () => onOpenPricing(next),
    className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 btn-press whitespace-nowrap"
  }, t.upgradeTo(next)) : React.createElement("span", {
    className: "text-xs font-bold text-amber-300 whitespace-nowrap"
  }, "\u2713 ", t.maxActive));
}
function DevPlanSwitcher({
  t,
  sub,
  onSet
}) {
  if (!IS_DEV) return null;
  return React.createElement("div", {
    className: "rounded-2xl p-3 border border-dashed border-amber-300/40 bg-amber-300/5"
  }, React.createElement("div", {
    className: "text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-2"
  }, "\uD83D\uDEE0 ", t.devSwitcher), React.createElement("div", {
    className: "grid grid-cols-3 gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, PLANS.map(p => React.createElement("button", {
    key: p,
    onClick: () => onSet(p),
    "aria-pressed": sub.plan === p,
    className: `py-1.5 rounded-full text-xs font-black btn-press ${sub.plan === p ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`
  }, PLAN_LABEL[p]))));
}

/* ==== js/components/wheel.js ==== */
const VB = 500;
const HUB_R = 46;
const SKINS = {
  drinking: {
    r: 194,
    rim: 'wood',
    pointer: 'bottle',
    hub: 'cap',
    hubText: '#fff',
    divider: 'rgba(255,248,220,0.9)'
  },
  lucky: {
    r: 206,
    rim: 'gold',
    pointer: 'arrow',
    hub: 'coin',
    hubText: '#5a3a00',
    divider: 'rgba(255,255,255,0.85)'
  },
  truth_or_dare: {
    r: 206,
    rim: 'obsidian',
    pointer: 'trident',
    hub: 'ember',
    hubText: '#fff',
    divider: 'rgba(255,200,230,0.75)'
  },
  dating: {
    r: 206,
    rim: 'rosegold',
    pointer: 'cupid',
    hub: 'heart',
    hubText: '#fff',
    divider: 'rgba(255,255,255,0.9)'
  },
  office: {
    r: 206,
    rim: 'steel',
    pointer: 'pin',
    hub: 'button',
    hubText: '#fff',
    divider: 'rgba(255,255,255,0.95)'
  }
};
const skinOf = theme => SKINS[theme.skin || theme.key] || SKINS.lucky;
const DISHES = ['🍺', '🍗', '🍻', '🥜', '🍺', '🦐', '🍻', '🥒', '🍺', '🍢', '🍻', '🍋'];
const HEARTS = ['💗', '💕', '💗', '🌹'];
const NEON = ['#FF00FF', '#00FFFF', '#FFFF00'];
const Rim = memo(function Rim({
  theme
}) {
  const skin = skinOf(theme);
  const c = VB / 2;
  const R = skin.r;
  const mid = (R + 244) / 2;
  const ring = (n, fn) => Array.from({
    length: n
  }, (_, i) => fn(polar(c, c, mid, i * 360 / n), i, i * 360 / n));
  let base = null;
  let decor = null;
  switch (skin.rim) {
    case 'wood':
      base = React.createElement(React.Fragment, null, React.createElement("defs", null, React.createElement("radialGradient", {
        id: "rimWood",
        cx: "50%",
        cy: "50%",
        r: "50%"
      }, React.createElement("stop", {
        offset: "76%",
        stopColor: "#7a4a24"
      }), React.createElement("stop", {
        offset: "84%",
        stopColor: "#9a6432"
      }), React.createElement("stop", {
        offset: "93%",
        stopColor: "#6a3d1c"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#3f2410"
      }))), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "url(#rimWood)"
      }), Array.from({
        length: 9
      }, (_, i) => React.createElement("circle", {
        key: i,
        cx: c,
        cy: c,
        r: R + 5 + i * 4.3,
        fill: "none",
        stroke: "rgba(40,18,6,0.35)",
        strokeWidth: "0.9",
        strokeDasharray: `${90 + i * 23} ${18 + i * 7} ${140 - i * 9} 26`,
        transform: `rotate(${i * 37} ${c} ${c})`
      })), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 242,
        fill: "none",
        stroke: "rgba(255,220,160,0.35)",
        strokeWidth: "2"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 3,
        fill: "none",
        stroke: "rgba(0,0,0,0.5)",
        strokeWidth: "4"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 6,
        fill: "none",
        stroke: "rgba(255,255,255,0.12)",
        strokeWidth: "1.5"
      }));
      decor = ring(12, (p, i) => {
        const food = i % 2 === 1;
        return React.createElement("g", {
          key: i,
          className: `dish ${food ? '' : 'mug'}`,
          style: {
            '--i': i
          }
        }, food && React.createElement("circle", {
          cx: p.x,
          cy: p.y,
          r: 13,
          fill: "#fff"
        }), food && React.createElement("circle", {
          cx: p.x,
          cy: p.y,
          r: 10,
          fill: "none",
          stroke: "#d6d3d1",
          strokeWidth: "1"
        }), React.createElement("text", {
          x: p.x,
          y: p.y + 1,
          fontSize: food ? 15 : 20,
          textAnchor: "middle",
          dominantBaseline: "central"
        }, DISHES[i]));
      });
      break;
    case 'obsidian':
      base = React.createElement(React.Fragment, null, React.createElement("defs", null, React.createElement("radialGradient", {
        id: "rimObs",
        cx: "50%",
        cy: "50%",
        r: "50%"
      }, React.createElement("stop", {
        offset: "80%",
        stopColor: "#1a0b22"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#05020a"
      }))), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "url(#rimObs)"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "none",
        stroke: "#9d174d",
        strokeOpacity: "0.8",
        strokeWidth: "2.5"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 3,
        fill: "none",
        stroke: theme.accent,
        strokeWidth: "2",
        style: {
          filter: `drop-shadow(0 0 6px ${theme.accent})`
        }
      }));
      decor = ring(16, (p, i) => React.createElement("text", {
        key: i,
        x: p.x,
        y: p.y + 1,
        fontSize: "19",
        textAnchor: "middle",
        dominantBaseline: "central",
        className: `flame ${i % 2 ? 'odd' : ''}`
      }, "\uD83D\uDD25"));
      break;
    case 'rosegold':
      base = React.createElement(React.Fragment, null, React.createElement("defs", null, React.createElement("linearGradient", {
        id: "rimRose",
        x1: "0",
        y1: "0",
        x2: "1",
        y2: "1"
      }, React.createElement("stop", {
        offset: "0%",
        stopColor: "#ffe4ec"
      }), React.createElement("stop", {
        offset: "40%",
        stopColor: "#f9a8d4"
      }), React.createElement("stop", {
        offset: "70%",
        stopColor: "#e0718f"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#fbcfe8"
      }))), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "url(#rimRose)"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 240,
        fill: "none",
        stroke: "rgba(255,255,255,0.6)",
        strokeWidth: "1.5"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 3,
        fill: "none",
        stroke: "#fff",
        strokeOpacity: "0.8",
        strokeWidth: "3"
      }));
      decor = ring(16, (p, i) => React.createElement("text", {
        key: i,
        x: p.x,
        y: p.y + 1,
        fontSize: HEARTS[i % 4] === '🌹' ? 18 : 16,
        textAnchor: "middle",
        dominantBaseline: "central",
        className: `heart-decor ${i % 2 ? 'odd' : ''}`
      }, HEARTS[i % 4]));
      break;
    case 'steel':
      base = React.createElement(React.Fragment, null, React.createElement("defs", null, React.createElement("linearGradient", {
        id: "rimSteel",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, React.createElement("stop", {
        offset: "0%",
        stopColor: "#334155"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#0f172a"
      }))), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "url(#rimSteel)"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "none",
        stroke: theme.accent,
        strokeOpacity: "0.7",
        strokeWidth: "1.5"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 3,
        fill: "none",
        stroke: theme.accent,
        strokeWidth: "2"
      }));
      decor = Array.from({
        length: 60
      }, (_, i) => {
        const major = i % 5 === 0;
        const a = i * 360 / 60;
        const p1 = polar(c, c, 236, a);
        const p2 = polar(c, c, major ? 222 : 229, a);
        return React.createElement("line", {
          key: i,
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          stroke: "#fff",
          strokeOpacity: major ? 0.95 : 0.4,
          strokeWidth: major ? 2.5 : 1.2,
          strokeLinecap: "round"
        });
      });
      break;
    case 'neon':
      base = React.createElement(React.Fragment, null, React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "#07070c"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "none",
        stroke: "#FF00FF",
        strokeWidth: "2",
        style: {
          filter: 'drop-shadow(0 0 6px #FF00FF)'
        }
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 3,
        fill: "none",
        stroke: "#00FFFF",
        strokeWidth: "2",
        style: {
          filter: 'drop-shadow(0 0 6px #00FFFF)'
        }
      }));
      decor = React.createElement("g", {
        style: {
          filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))'
        }
      }, ring(36, (p, i, a) => React.createElement("rect", {
        key: i,
        x: p.x - 5,
        y: p.y - 2.5,
        width: 10,
        height: 5,
        rx: 2,
        fill: NEON[i % 3],
        className: "led",
        transform: `rotate(${a} ${p.x} ${p.y})`,
        style: {
          animationDelay: `${-(i % 3) * 0.4}s`
        }
      })));
      break;
    default:
      base = React.createElement(React.Fragment, null, React.createElement("defs", null, React.createElement("linearGradient", {
        id: "rimGold",
        x1: "0",
        y1: "0",
        x2: "1",
        y2: "1"
      }, React.createElement("stop", {
        offset: "0%",
        stopColor: "#fff2b0"
      }), React.createElement("stop", {
        offset: "30%",
        stopColor: "#e2b53a"
      }), React.createElement("stop", {
        offset: "55%",
        stopColor: "#9a6b12"
      }), React.createElement("stop", {
        offset: "80%",
        stopColor: "#f1cf5a"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#7a5410"
      }))), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 241,
        fill: "url(#rimGold)"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 7,
        fill: "none",
        stroke: "#7f1d1d",
        strokeWidth: "9"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 7,
        fill: "none",
        stroke: "rgba(255,255,255,0.18)",
        strokeWidth: "2",
        strokeDasharray: "3 9"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: 240,
        fill: "none",
        stroke: "rgba(255,255,255,0.5)",
        strokeWidth: "1.5"
      }), React.createElement("circle", {
        cx: c,
        cy: c,
        r: R + 2,
        fill: "none",
        stroke: "rgba(0,0,0,0.35)",
        strokeWidth: "3"
      }));
      decor = React.createElement("g", {
        style: {
          filter: `drop-shadow(0 0 4px ${theme.accent})`
        }
      }, ring(24, (p, i) => React.createElement("g", {
        key: i,
        className: `bulb ${i % 2 ? 'odd' : ''}`
      }, React.createElement("circle", {
        cx: p.x,
        cy: p.y,
        r: 6.5,
        fill: theme.accent
      }), React.createElement("circle", {
        cx: p.x - 1.6,
        cy: p.y - 1.6,
        r: 2.4,
        fill: "white",
        opacity: "0.9"
      }))));
      break;
  }
  return React.createElement("svg", {
    viewBox: `0 0 ${VB} ${VB}`,
    className: "absolute inset-0 w-full h-full",
    "aria-hidden": "true"
  }, React.createElement("circle", {
    cx: c,
    cy: c,
    r: 244,
    fill: "rgba(0,0,0,0.35)"
  }), base, decor);
});
const Disk = memo(function Disk({
  items,
  theme
}) {
  const skin = skinOf(theme);
  const R = skin.r;
  const N = items.length;
  if (N === 0) {
    return React.createElement("svg", {
      viewBox: `${-R} ${-R} ${2 * R} ${2 * R}`,
      className: "w-full h-full block"
    }, React.createElement("circle", {
      r: R - 2,
      fill: "rgba(255,255,255,0.08)",
      stroke: "rgba(255,255,255,0.5)",
      strokeWidth: "2",
      strokeDasharray: "8 8"
    }));
  }
  const seg = 360 / N;
  const labelEnd = R - 18;
  const available = labelEnd - HUB_R - 10;
  const arcAtLabel = 2 * Math.PI * (R * 0.62) / N;
  const longest = Math.max(...items.map(s => s.length));
  const fontSize = clamp(Math.min(arcAtLabel * 0.42, Math.max(available / (longest * 0.55), 11)), 7, 20);
  const maxChars = Math.max(3, Math.floor(available / (fontSize * 0.55) + 0.01));
  return React.createElement("svg", {
    viewBox: `${-R} ${-R} ${2 * R} ${2 * R}`,
    className: "w-full h-full block select-none",
    "aria-hidden": "true"
  }, React.createElement("defs", null, React.createElement("radialGradient", {
    id: "diskShade",
    cx: "0",
    cy: "0",
    r: R,
    gradientUnits: "userSpaceOnUse"
  }, React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(255,255,255,0)"
  }), React.createElement("stop", {
    offset: "60%",
    stopColor: "rgba(255,255,255,0.05)"
  }), React.createElement("stop", {
    offset: "100%",
    stopColor: "rgba(0,0,0,0.3)"
  }))), items.map((item, i) => {
    const start = i * seg;
    const mid = start + seg / 2;
    const color = segColor(theme.palette, i, N);
    const fg = textOn(color);
    const p = polar(0, 0, labelEnd, mid);
    const flip = mid > 180 && mid < 360;
    return React.createElement("g", {
      key: i
    }, N === 1 ? React.createElement("circle", {
      r: R,
      fill: color
    }) : React.createElement("path", {
      d: sectorPath(0, 0, R, start, start + seg),
      fill: color,
      stroke: skin.divider,
      strokeWidth: N > 50 ? 0.6 : 1.4
    }), React.createElement("text", {
      x: p.x,
      y: p.y,
      fontSize: fontSize,
      fill: fg,
      textAnchor: flip ? 'start' : 'end',
      dominantBaseline: "central",
      fontWeight: "800",
      transform: `rotate(${flip ? mid + 90 : mid - 90} ${p.x} ${p.y})`,
      style: {
        paintOrder: 'stroke',
        stroke: fg === '#ffffff' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)',
        strokeWidth: Math.max(1.2, fontSize / 9),
        letterSpacing: N > 20 ? 0 : 0.3
      }
    }, truncate(item, maxChars)));
  }), React.createElement("circle", {
    r: R,
    fill: "url(#diskShade)",
    pointerEvents: "none"
  }), N > 1 && N <= 48 && Array.from({
    length: N
  }, (_, i) => {
    const p = polar(0, 0, R - 6, i * seg);
    return React.createElement("circle", {
      key: i,
      cx: p.x,
      cy: p.y,
      r: 3.4,
      fill: "white",
      stroke: "rgba(0,0,0,0.35)",
      strokeWidth: "1"
    });
  }), React.createElement("circle", {
    r: HUB_R + 6,
    fill: "rgba(0,0,0,0.25)"
  }));
});
const Gloss = memo(function Gloss({
  r
}) {
  return React.createElement("svg", {
    viewBox: `0 0 ${VB} ${VB}`,
    className: "absolute inset-0 w-full h-full pointer-events-none",
    "aria-hidden": "true"
  }, React.createElement("defs", null, React.createElement("radialGradient", {
    id: "gloss",
    cx: "35%",
    cy: "25%",
    r: "60%"
  }, React.createElement("stop", {
    offset: "0%",
    stopColor: "rgba(255,255,255,0.22)"
  }), React.createElement("stop", {
    offset: "55%",
    stopColor: "rgba(255,255,255,0)"
  }))), React.createElement("circle", {
    cx: VB / 2,
    cy: VB / 2,
    r: r,
    fill: "url(#gloss)"
  }), React.createElement("circle", {
    cx: VB / 2,
    cy: VB / 2,
    r: r + 1,
    fill: "none",
    stroke: "rgba(255,255,255,0.85)",
    strokeWidth: "3"
  }));
});
function Pointer({
  theme,
  pointerRef
}) {
  const skin = skinOf(theme);
  const col = theme.pointerColor;
  let art;
  switch (skin.pointer) {
    case 'bottle':
      art = React.createElement(React.Fragment, null, React.createElement("rect", {
        x: "12",
        y: "2",
        width: "32",
        height: "42",
        rx: "9",
        fill: "#1f7a3c"
      }), React.createElement("path", {
        d: "M 12 40 Q 12 56 22 60 L 34 60 Q 44 56 44 40 Z",
        fill: "#1f7a3c"
      }), React.createElement("rect", {
        x: "22",
        y: "58",
        width: "12",
        height: "14",
        fill: "#1f7a3c"
      }), React.createElement("rect", {
        x: "19",
        y: "70",
        width: "18",
        height: "8",
        rx: "2",
        fill: "#f5c542",
        stroke: "#b45309",
        strokeWidth: "1"
      }), React.createElement("rect", {
        x: "15",
        y: "12",
        width: "26",
        height: "20",
        rx: "3",
        fill: "#fef3c7"
      }), React.createElement("rect", {
        x: "15",
        y: "19",
        width: "26",
        height: "6",
        fill: "#dc2626"
      }), React.createElement("text", {
        x: "28",
        y: "22.5",
        fontSize: "5",
        fontWeight: "900",
        textAnchor: "middle",
        dominantBaseline: "central",
        fill: "#fff"
      }, "BEER"), React.createElement("rect", {
        x: "16",
        y: "5",
        width: "4",
        height: "36",
        rx: "2",
        fill: "rgba(255,255,255,0.35)"
      }));
      break;
    case 'cupid':
      art = React.createElement(React.Fragment, null, React.createElement("path", {
        d: "M 28 12 L 17 2 L 17 18 Z M 28 12 L 39 2 L 39 18 Z",
        fill: "#ff8fb3",
        stroke: "#fff",
        strokeWidth: "1"
      }), React.createElement("line", {
        x1: "28",
        y1: "10",
        x2: "28",
        y2: "60",
        stroke: "#fff",
        strokeWidth: "4",
        strokeLinecap: "round"
      }), React.createElement("path", {
        d: "M 11 61 L 45 61 L 28 78 Z",
        fill: "#ff1744",
        stroke: "#fff",
        strokeWidth: "2",
        strokeLinejoin: "round"
      }), React.createElement("circle", {
        cx: "20",
        cy: "58",
        r: "9.5",
        fill: "#ff1744",
        stroke: "#fff",
        strokeWidth: "2"
      }), React.createElement("circle", {
        cx: "36",
        cy: "58",
        r: "9.5",
        fill: "#ff1744",
        stroke: "#fff",
        strokeWidth: "2"
      }), React.createElement("path", {
        d: "M 14 61 L 42 61 L 28 75 Z",
        fill: "#ff1744"
      }), React.createElement("circle", {
        cx: "23",
        cy: "55",
        r: "2.5",
        fill: "rgba(255,255,255,0.6)"
      }));
      break;
    case 'trident':
      art = React.createElement("g", {
        style: {
          filter: `drop-shadow(0 0 5px ${col})`
        }
      }, React.createElement("line", {
        x1: "28",
        y1: "0",
        x2: "28",
        y2: "50",
        stroke: "#3b0a1a",
        strokeWidth: "6",
        strokeLinecap: "round"
      }), React.createElement("path", {
        d: "M 13 48 L 43 48 M 13 48 L 13 66 L 19 74 M 43 48 L 43 66 L 37 74 M 28 48 L 28 78",
        stroke: col,
        strokeWidth: "5",
        fill: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }), React.createElement("path", {
        d: "M 19 74 l -5 -1 l 2 -6 Z M 37 74 l 5 -1 l -2 -6 Z M 28 78 l -4 -7 h 8 Z",
        fill: col
      }));
      break;
    case 'pin':
      art = React.createElement(React.Fragment, null, React.createElement("line", {
        x1: "28",
        y1: "44",
        x2: "28",
        y2: "78",
        stroke: "#cbd5e1",
        strokeWidth: "3",
        strokeLinecap: "round"
      }), React.createElement("line", {
        x1: "27",
        y1: "46",
        x2: "27",
        y2: "70",
        stroke: "#fff",
        strokeWidth: "1",
        opacity: "0.7"
      }), React.createElement("path", {
        d: "M 15 46 L 41 46 L 37 36 L 19 36 Z",
        fill: col,
        stroke: "rgba(0,0,0,0.25)",
        strokeWidth: "1"
      }), React.createElement("rect", {
        x: "22",
        y: "30",
        width: "12",
        height: "7",
        fill: col
      }), React.createElement("ellipse", {
        cx: "28",
        cy: "18",
        rx: "18",
        ry: "16",
        fill: col,
        stroke: "#fff",
        strokeWidth: "2.5"
      }), React.createElement("ellipse", {
        cx: "22",
        cy: "12",
        rx: "6",
        ry: "4",
        fill: "rgba(255,255,255,0.5)"
      }));
      break;
    case 'bolt':
      art = React.createElement("g", {
        style: {
          filter: 'drop-shadow(0 0 6px #00FFFF)'
        }
      }, React.createElement("path", {
        d: "M 36 0 L 8 44 L 26 44 L 28 78 L 50 30 L 34 30 L 42 0 Z",
        fill: "#FFFF00",
        stroke: "#fff",
        strokeWidth: "2",
        strokeLinejoin: "round"
      }));
      break;
    default:
      art = React.createElement(React.Fragment, null, React.createElement("path", {
        d: "M 28 78 L 9.2 37 A 20 20 0 1 1 46.8 37 Z",
        fill: col,
        stroke: "white",
        strokeWidth: "3",
        strokeLinejoin: "round"
      }), React.createElement("circle", {
        cx: "28",
        cy: "30",
        r: "6.5",
        fill: "white"
      }), React.createElement("circle", {
        cx: "28",
        cy: "30",
        r: "3",
        fill: "rgba(0,0,0,0.35)"
      }));
  }
  return React.createElement("div", {
    className: "wheel-pointer absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none",
    style: {
      top: '-2%',
      width: '12%'
    }
  }, React.createElement("svg", {
    ref: pointerRef,
    viewBox: "0 0 56 80",
    className: "w-full block overflow-visible",
    "aria-hidden": "true"
  }, art));
}
function HubFace({
  theme
}) {
  const skin = skinOf(theme);
  const acc = theme.accent;
  const cls = 'absolute inset-0 w-full h-full';
  switch (skin.hub) {
    case 'cap':
      {
        const pts = Array.from({
          length: 42
        }, (_, i) => {
          const a = i * Math.PI / 21;
          const r = i % 2 ? 44 : 49;
          return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
        }).join(' ');
        return React.createElement("svg", {
          viewBox: "0 0 100 100",
          className: cls,
          "aria-hidden": "true"
        }, React.createElement("polygon", {
          points: pts,
          fill: "#f5c542",
          stroke: "#b45309",
          strokeWidth: "1.5",
          strokeLinejoin: "round"
        }), React.createElement("circle", {
          cx: "50",
          cy: "50",
          r: "37",
          fill: "#dc2626",
          stroke: "#fff",
          strokeWidth: "2.5"
        }), React.createElement("circle", {
          cx: "50",
          cy: "50",
          r: "31",
          fill: "none",
          stroke: "rgba(255,255,255,0.35)",
          strokeWidth: "1"
        }), React.createElement("ellipse", {
          cx: "40",
          cy: "36",
          rx: "12",
          ry: "6",
          fill: "rgba(255,255,255,0.25)",
          transform: "rotate(-30 40 36)"
        }));
      }
    case 'coin':
      return React.createElement("svg", {
        viewBox: "0 0 100 100",
        className: cls,
        "aria-hidden": "true"
      }, React.createElement("defs", null, React.createElement("linearGradient", {
        id: "hubCoin",
        x1: "0",
        y1: "0",
        x2: "1",
        y2: "1"
      }, React.createElement("stop", {
        offset: "0%",
        stopColor: "#fff3b0"
      }), React.createElement("stop", {
        offset: "50%",
        stopColor: "#f1c232"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#b8860b"
      }))), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "49",
        fill: "url(#hubCoin)"
      }), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "46",
        fill: "none",
        stroke: "rgba(120,80,0,0.5)",
        strokeWidth: "1.5",
        strokeDasharray: "2 3"
      }), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "39",
        fill: "none",
        stroke: "rgba(120,80,0,0.6)",
        strokeWidth: "2"
      }), React.createElement("text", {
        x: "50",
        y: "29",
        fontSize: "15",
        textAnchor: "middle",
        dominantBaseline: "central",
        opacity: "0.85"
      }, "\uD83C\uDF40"));
    case 'ember':
      return React.createElement("svg", {
        viewBox: "0 0 100 100",
        className: cls,
        "aria-hidden": "true"
      }, React.createElement("defs", null, React.createElement("radialGradient", {
        id: "hubEmber",
        cx: "50%",
        cy: "50%",
        r: "50%"
      }, React.createElement("stop", {
        offset: "0%",
        stopColor: acc,
        stopOpacity: "0.9"
      }), React.createElement("stop", {
        offset: "55%",
        stopColor: "#3b0a2a"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#120514"
      }))), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "49",
        fill: "url(#hubEmber)"
      }), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "46",
        fill: "none",
        stroke: acc,
        strokeWidth: "2.5",
        className: "ember-ring",
        style: {
          filter: `drop-shadow(0 0 5px ${acc})`
        }
      }), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "38",
        fill: "none",
        stroke: acc,
        strokeOpacity: "0.4",
        strokeWidth: "1",
        strokeDasharray: "4 6"
      }));
    case 'heart':
      return React.createElement("svg", {
        viewBox: "0 0 100 100",
        className: cls,
        "aria-hidden": "true"
      }, React.createElement("defs", null, React.createElement("linearGradient", {
        id: "hubHeart",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, React.createElement("stop", {
        offset: "0%",
        stopColor: "#fda4af"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#be185d"
      }))), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "49",
        fill: "url(#hubHeart)",
        stroke: "#fff",
        strokeWidth: "3"
      }), React.createElement("path", {
        d: "M 50 78 C 20 58 14 40 26 30 C 36 22 46 28 50 36 C 54 28 64 22 74 30 C 86 40 80 58 50 78 Z",
        fill: "rgba(255,255,255,0.28)"
      }));
    case 'button':
      return React.createElement("svg", {
        viewBox: "0 0 100 100",
        className: cls,
        "aria-hidden": "true"
      }, React.createElement("defs", null, React.createElement("linearGradient", {
        id: "hubBtn",
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      }, React.createElement("stop", {
        offset: "0%",
        stopColor: "#3b82f6"
      }), React.createElement("stop", {
        offset: "100%",
        stopColor: "#1d4ed8"
      }))), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "49",
        fill: "url(#hubBtn)",
        stroke: "#bfdbfe",
        strokeWidth: "2.5"
      }), React.createElement("ellipse", {
        cx: "50",
        cy: "30",
        rx: "30",
        ry: "12",
        fill: "rgba(255,255,255,0.18)"
      }));
    case 'core':
      return React.createElement("svg", {
        viewBox: "0 0 100 100",
        className: cls,
        "aria-hidden": "true"
      }, React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "49",
        fill: "#0a0a12"
      }), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "45",
        fill: "none",
        stroke: "#FF00FF",
        strokeWidth: "2.5",
        className: "neon-ring",
        style: {
          filter: 'drop-shadow(0 0 5px #FF00FF)'
        }
      }), React.createElement("circle", {
        cx: "50",
        cy: "50",
        r: "36",
        fill: "none",
        stroke: "#00FFFF",
        strokeWidth: "2",
        className: "neon-ring alt",
        style: {
          filter: 'drop-shadow(0 0 5px #00FFFF)'
        }
      }));
    default:
      return null;
  }
}

/* ==== js/components/items.js ==== */
function ItemsPanel({
  t,
  items,
  theme,
  disabled,
  eliminatedCount,
  actions
}) {
  const [addValue, setAddValue] = useState('');
  const [bulk, setBulk] = useState(false);
  const [draft, setDraft] = useState('');
  const [numOpen, setNumOpen] = useState(false);
  const [numN, setNumN] = useState(10);
  const submitAdd = () => {
    const parts = addValue.split(/[\n,]/).map(clip).filter(Boolean);
    if (!parts.length) return;
    actions.add(parts);
    setAddValue('');
  };
  const toggleBulk = () => {
    if (!bulk) setDraft(items.join('\n'));
    setBulk(!bulk);
  };
  return React.createElement("section", {
    className: `glass w-full max-w-xl rounded-3xl p-4 sm:p-5 transition-opacity ${disabled ? 'opacity-60 pointer-events-none' : ''}`,
    "aria-disabled": disabled
  }, React.createElement("div", {
    className: "flex items-center justify-between mb-3 gap-2"
  }, React.createElement("h2", {
    className: "font-bold text-base sm:text-lg flex items-center gap-2"
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83D\uDCDD"), " ", t.items, React.createElement("span", {
    className: `text-xs font-medium ml-1 tabular-nums ${items.length >= MAX_ITEMS ? 'text-yellow-300' : 'text-white/60'}`
  }, items.length, "/", MAX_ITEMS)), React.createElement("button", {
    onClick: toggleBulk,
    className: `px-3 py-1.5 rounded-full text-xs font-bold border btn-press ${bulk ? 'bg-white text-slate-900 border-white' : 'bg-white/10 border-white/15 hover:bg-white/20'}`
  }, bulk ? `✓ ${t.done}` : `✏️ ${t.bulkEdit}`)), bulk ? React.createElement("textarea", {
    value: draft,
    autoFocus: true,
    onChange: e => {
      setDraft(e.target.value);
      actions.setFromText(e.target.value);
    },
    rows: 8,
    placeholder: t.bulkPlaceholder,
    className: "w-full rounded-2xl p-3 bg-black/20 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40 resize-y font-medium leading-relaxed"
  }) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "flex gap-2 mb-3"
  }, React.createElement("input", {
    type: "text",
    value: addValue,
    maxLength: 600,
    onChange: e => setAddValue(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitAdd();
      }
    },
    onPaste: e => {
      const text = e.clipboardData.getData('text');
      if (text.includes('\n')) {
        e.preventDefault();
        actions.add(text.split('\n').map(clip).filter(Boolean));
      }
    },
    placeholder: t.quickAdd,
    "aria-label": t.quickAdd,
    className: "flex-1 min-w-0 rounded-full px-4 py-2.5 bg-black/20 placeholder-white/45 border border-white/15 focus:outline-none focus:border-white/40"
  }), React.createElement("button", {
    onClick: submitAdd,
    disabled: !addValue.trim(),
    className: "px-5 rounded-full bg-white text-slate-900 font-bold btn-press hover:bg-white/90 disabled:opacity-50"
  }, t.add)), items.length === 0 ? React.createElement("div", {
    className: "text-sm text-white/60 text-center py-6 border border-dashed border-white/20 rounded-2xl"
  }, t.emptyList) : React.createElement("ul", {
    className: "flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1 -mr-1"
  }, items.map((item, i) => React.createElement("li", {
    key: `${i}-${item}`,
    className: "group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-black/20 border border-white/10 text-sm max-w-full"
  }, React.createElement("span", {
    className: "w-2.5 h-2.5 rounded-full shrink-0",
    style: {
      background: segColor(theme.palette, i, items.length)
    }
  }), React.createElement("span", {
    className: "truncate max-w-[180px]",
    title: item
  }, item), React.createElement("button", {
    onClick: () => actions.removeAt(i),
    "aria-label": t.removeItem(item),
    className: "w-6 h-6 shrink-0 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/15"
  }, React.createElement(Icon.X, null)))))), React.createElement("div", {
    className: "flex flex-wrap gap-1.5 mt-3"
  }, React.createElement(ToolBtn, {
    onClick: actions.shuffle,
    disabled: items.length < 2
  }, "\uD83D\uDD00 ", t.shuffle), React.createElement(ToolBtn, {
    onClick: actions.sort,
    disabled: items.length < 2
  }, "\uD83D\uDD24 ", t.sort), React.createElement(ToolBtn, {
    onClick: actions.dedupe,
    disabled: items.length < 2
  }, "\uD83E\uDDF9 ", t.dedupe), React.createElement(ToolBtn, {
    onClick: () => setNumOpen(!numOpen)
  }, "\uD83D\uDD22 ", t.numbers), React.createElement(ToolBtn, {
    onClick: () => {
      actions.sample();
      setBulk(false);
    }
  }, "\u2728 ", t.sample), React.createElement(ToolBtn, {
    onClick: () => {
      actions.clear();
      setBulk(false);
    },
    disabled: !items.length
  }, "\uD83D\uDDD1\uFE0F ", t.clear)), numOpen && React.createElement("div", {
    className: "mt-3 flex items-center gap-2 text-sm animate-fade"
  }, React.createElement("span", {
    className: "text-white/80"
  }, t.fillNumbers), React.createElement("input", {
    type: "number",
    min: "2",
    max: MAX_ITEMS,
    value: numN,
    onChange: e => setNumN(e.target.value),
    className: "w-20 rounded-full px-3 py-1.5 bg-black/20 border border-white/15 focus:outline-none focus:border-white/40 tabular-nums"
  }), React.createElement("button", {
    onClick: () => {
      actions.numbers(clamp(parseInt(numN, 10) || 10, 2, MAX_ITEMS));
      setNumOpen(false);
      setBulk(false);
    },
    className: "px-4 py-1.5 rounded-full bg-white text-slate-900 font-bold btn-press"
  }, t.fill)), eliminatedCount > 0 && React.createElement("button", {
    onClick: actions.restore,
    className: "mt-3 w-full text-sm font-semibold py-2 rounded-2xl border border-dashed border-white/30 hover:bg-white/10 btn-press"
  }, t.restoreRemoved(eliminatedCount)));
}

/* ==== js/components/reveals.js ==== */
const REVEAL_CLASS = {
  dating: 'reveal-heart',
  drinking: 'reveal-splash',
  lucky: 'reveal-jackpot',
  truth_or_dare: 'reveal-ignite',
  office: 'reveal-stamp'
};
const useTimeline = () => {
  const ids = useRef([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return useCallback((ms, fn) => {
    ids.current.push(setTimeout(fn, ms));
  }, []);
};
const animate = (el, frames, opts = {}) => {
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(frames, {
    fill: 'forwards',
    easing: 'ease-out',
    ...opts
  });
  return a.finished.catch(() => {});
};
const burst = (layer, x, y, glyphs, count, {
  dist = 90,
  size = 22,
  dur = 800,
  color
} = {}) => {
  if (!layer || REDUCED_MOTION) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'fx-burst';
    el.textContent = glyphs[randInt(glyphs.length)];
    const ang = rand() * Math.PI * 2;
    const d = dist * (0.5 + rand() * 0.7);
    el.style.cssText = `left:${x}px;top:${y}px;font-size:${(size * (0.7 + rand() * 0.7)).toFixed(0)}px;` + `--tx:${(Math.cos(ang) * d).toFixed(1)}px;--ty:${(Math.sin(ang) * d - 20).toFixed(1)}px;` + `--s:${(0.6 + rand()).toFixed(2)};--r:${((rand() - 0.5) * 240).toFixed(0)}deg;` + `animation-duration:${dur}ms;animation-delay:${(rand() * 80).toFixed(0)}ms;${color ? `color:${color};` : ''}`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), dur + 300);
  }
};
const shoot = (layer, from, to, html, {
  dur = 380,
  size = 40,
  easing = 'cubic-bezier(.3,0,.8,.4)',
  grow = 1,
  spin = 0
} = {}) => {
  const el = document.createElement('div');
  el.className = 'absolute pointer-events-none';
  el.style.cssText = `left:0;top:0;width:${size}px;height:${size}px;z-index:30`;
  el.innerHTML = html;
  layer.appendChild(el);
  const ang = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
  const half = size / 2;
  return animate(el, [{
    transform: `translate(${from.x - half}px, ${from.y - half}px) rotate(${ang}deg) scale(1)`
  }, {
    transform: `translate(${to.x - half}px, ${to.y - half}px) rotate(${ang + spin}deg) scale(${grow})`
  }], {
    duration: dur,
    easing
  }).then(() => el);
};
const rainDown = (glyphs, count) => {
  if (REDUCED_MOTION) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'rain-particle';
    el.textContent = glyphs[randInt(glyphs.length)];
    el.style.cssText = `left:${(rand() * 100).toFixed(1)}%;font-size:${(18 + rand() * 22).toFixed(0)}px;animation-duration:${(1.8 + rand() * 1.4).toFixed(2)}s;animation-delay:${(rand() * 0.9).toFixed(2)}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
};
const launchRocket = (xPct, color, explodeY, onBoom) => {
  const el = document.createElement('div');
  el.className = 'fx-rocket';
  el.style.left = `${xPct}%`;
  el.style.setProperty('--c', color);
  document.body.appendChild(el);
  const rise = window.innerHeight * (1 - explodeY) + 90;
  animate(el, [{
    transform: 'translateY(0)'
  }, {
    transform: `translateY(-${rise}px)`
  }], {
    duration: 650,
    easing: 'cubic-bezier(.2,.6,.4,1)'
  }).then(() => {
    el.remove();
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 70,
        spread: 360,
        startVelocity: 32,
        origin: {
          x: xPct / 100,
          y: explodeY
        },
        colors: [color, '#ffffff'],
        gravity: 0.7,
        scalar: 0.9,
        ticks: 110,
        disableForReducedMotion: true
      });
    }
    onBoom?.();
  });
};
const ARROW_HTML = `<svg viewBox="0 0 60 16" width="100%" height="100%" style="overflow:visible">
  <line x1="3" y1="8" x2="48" y2="8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 2 3 l 7 5 l -7 5 Z M 9 3 l 7 5 l -7 5 Z" fill="#ff8fb3"/>
  <circle cx="50" cy="5" r="3.6" fill="#ff4d8d"/><circle cx="50" cy="11" r="3.6" fill="#ff4d8d"/>
  <path d="M 52.5 1.5 L 59.5 8 L 52.5 14.5 Z" fill="#ff4d8d"/>
</svg>`;
const FIREBALL_HTML = `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 40% 40%, #fff7b0 0%, #ffb01a 35%, #ff4d00 65%, rgba(255,60,0,0) 72%);box-shadow:0 0 18px 6px rgba(255,120,0,.65)"></div>`;
function CupidSvg({
  wink,
  drawn,
  arrow
}) {
  const skin = '#ffd3b6';
  return React.createElement("svg", {
    viewBox: "0 0 120 120",
    className: "w-full h-full overflow-visible",
    "aria-hidden": "true"
  }, React.createElement("path", {
    className: "cupid-wing back",
    d: "M 78 70 C 86 40 118 36 112 68 C 102 62 90 66 78 70 Z",
    fill: "#fff",
    opacity: "0.8"
  }), React.createElement("path", {
    className: "cupid-wing",
    d: "M 80 78 C 92 54 122 56 112 84 C 102 78 90 80 80 78 Z",
    fill: "#fff"
  }), React.createElement("ellipse", {
    cx: "66",
    cy: "86",
    rx: "19",
    ry: "21",
    fill: skin
  }), React.createElement("path", {
    d: "M 48 92 Q 66 114 84 92 Q 66 100 48 92 Z",
    fill: "#fff"
  }), React.createElement("ellipse", {
    cx: "58",
    cy: "108",
    rx: "7",
    ry: "5",
    fill: skin
  }), React.createElement("ellipse", {
    cx: "76",
    cy: "108",
    rx: "7",
    ry: "5",
    fill: skin
  }), React.createElement("path", {
    d: "M 30 38 Q 6 70 30 102",
    stroke: "#8b4a2b",
    strokeWidth: "4.5",
    fill: "none",
    strokeLinecap: "round"
  }), React.createElement("path", {
    d: drawn ? 'M 30 38 L 48 70 L 30 102' : 'M 30 38 L 30 102',
    stroke: "#fff",
    strokeWidth: "1.6",
    fill: "none"
  }), arrow && React.createElement("g", {
    transform: drawn ? 'translate(18 0)' : 'translate(4 0)'
  }, React.createElement("line", {
    x1: "30",
    y1: "70",
    x2: "6",
    y2: "70",
    stroke: "#fff",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }), React.createElement("circle", {
    cx: "10",
    cy: "66.5",
    r: "3.4",
    fill: "#ff4d8d"
  }), React.createElement("circle", {
    cx: "10",
    cy: "73.5",
    r: "3.4",
    fill: "#ff4d8d"
  }), React.createElement("path", {
    d: "M 7.5 63.8 L 1 70 L 7.5 76.2 Z",
    fill: "#ff4d8d"
  }), React.createElement("path", {
    d: "M 26 66 l 6 -4 v 4 Z M 26 74 l 6 4 v -4 Z",
    fill: "#ff8fb3"
  })), React.createElement("path", {
    d: "M 54 80 Q 42 76 32 70",
    stroke: skin,
    strokeWidth: "8",
    strokeLinecap: "round",
    fill: "none"
  }), React.createElement("path", {
    d: drawn ? 'M 60 74 L 48 70' : 'M 60 74 Q 52 70 44 72',
    stroke: skin,
    strokeWidth: "8",
    strokeLinecap: "round",
    fill: "none"
  }), React.createElement("circle", {
    cx: "60",
    cy: "46",
    r: "24",
    fill: skin
  }), React.createElement("circle", {
    cx: "46",
    cy: "28",
    r: "8",
    fill: "#f6c453"
  }), React.createElement("circle", {
    cx: "60",
    cy: "23",
    r: "9",
    fill: "#f6c453"
  }), React.createElement("circle", {
    cx: "74",
    cy: "28",
    r: "8",
    fill: "#f6c453"
  }), React.createElement("ellipse", {
    cx: "60",
    cy: "13",
    rx: "15",
    ry: "4",
    fill: "none",
    stroke: "#ffe066",
    strokeWidth: "3"
  }), React.createElement("circle", {
    cx: "50",
    cy: "46",
    r: "3",
    fill: "#3a2a2a"
  }), wink ? React.createElement("path", {
    d: "M 64 46 q 4 4 8 0",
    stroke: "#3a2a2a",
    strokeWidth: "2.5",
    fill: "none",
    strokeLinecap: "round"
  }) : React.createElement("circle", {
    cx: "68",
    cy: "46",
    r: "3",
    fill: "#3a2a2a"
  }), React.createElement("circle", {
    cx: "51",
    cy: "45",
    r: "1",
    fill: "#fff"
  }), React.createElement("circle", {
    cx: "44",
    cy: "54",
    r: "4",
    fill: "#ff8fb3",
    opacity: "0.6"
  }), React.createElement("circle", {
    cx: "76",
    cy: "54",
    r: "4",
    fill: "#ff8fb3",
    opacity: "0.6"
  }), drawn ? React.createElement("ellipse", {
    cx: "59",
    cy: "58",
    rx: "3",
    ry: "4",
    fill: "#c2415d"
  }) : React.createElement("path", {
    d: "M 53 57 q 6 6 12 0",
    stroke: "#c2415d",
    strokeWidth: "2.2",
    fill: "none",
    strokeLinecap: "round"
  }));
}
function DevilSvg() {
  return React.createElement("svg", {
    viewBox: "0 0 120 120",
    className: "w-full h-full overflow-visible",
    "aria-hidden": "true"
  }, React.createElement("path", {
    className: "devil-wing",
    d: "M 30 58 L 4 42 L 14 60 L 2 68 L 18 74 L 10 90 L 32 74 Z",
    fill: "#3b0a1a"
  }), React.createElement("g", {
    className: "devil-tail"
  }, React.createElement("path", {
    d: "M 62 98 Q 90 114 98 92",
    stroke: "#b91c1c",
    strokeWidth: "4",
    fill: "none",
    strokeLinecap: "round"
  }), React.createElement("path", {
    d: "M 98 92 l 8 6 l -10 3 Z",
    fill: "#b91c1c"
  })), React.createElement("line", {
    x1: "84",
    y1: "106",
    x2: "100",
    y2: "30",
    stroke: "#f59e0b",
    strokeWidth: "4",
    strokeLinecap: "round"
  }), React.createElement("path", {
    d: "M 92 34 L 108 30 M 100 32 L 100 14 M 92 34 L 88 20 M 108 30 L 112 16",
    stroke: "#f59e0b",
    strokeWidth: "3.5",
    fill: "none",
    strokeLinecap: "round"
  }), React.createElement("circle", {
    cx: "56",
    cy: "66",
    r: "32",
    fill: "#dc2626"
  }), React.createElement("ellipse", {
    cx: "56",
    cy: "82",
    rx: "18",
    ry: "12",
    fill: "#b91c1c",
    opacity: "0.5"
  }), React.createElement("path", {
    d: "M 32 46 L 22 16 L 46 36 Z",
    fill: "#7f1d1d"
  }), React.createElement("path", {
    d: "M 80 46 L 90 16 L 66 36 Z",
    fill: "#7f1d1d"
  }), React.createElement("ellipse", {
    cx: "44",
    cy: "60",
    rx: "7",
    ry: "8",
    fill: "#fff"
  }), React.createElement("ellipse", {
    cx: "68",
    cy: "60",
    rx: "7",
    ry: "8",
    fill: "#fff"
  }), React.createElement("circle", {
    cx: "46",
    cy: "62",
    r: "3.5",
    fill: "#1a0505"
  }), React.createElement("circle", {
    cx: "70",
    cy: "62",
    r: "3.5",
    fill: "#1a0505"
  }), React.createElement("path", {
    d: "M 36 50 L 50 55 M 76 50 L 62 55",
    stroke: "#1a0505",
    strokeWidth: "3",
    strokeLinecap: "round"
  }), React.createElement("path", {
    d: "M 38 76 Q 56 98 74 76 Z",
    fill: "#2a0a0a"
  }), React.createElement("path", {
    d: "M 44 77 l 4 7 l 4 -7 Z M 64 77 l 4 7 l 4 -7 Z",
    fill: "#fff"
  }), React.createElement("circle", {
    cx: "90",
    cy: "72",
    r: "7",
    fill: "#dc2626"
  }));
}
function StampSvg() {
  return React.createElement("svg", {
    viewBox: "0 0 110 110",
    className: "w-full h-full overflow-visible",
    "aria-hidden": "true"
  }, React.createElement("defs", null, React.createElement("linearGradient", {
    id: "stampWood",
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, React.createElement("stop", {
    offset: "0",
    stopColor: "#6b3f23"
  }), React.createElement("stop", {
    offset: "0.5",
    stopColor: "#a86a3d"
  }), React.createElement("stop", {
    offset: "1",
    stopColor: "#6b3f23"
  })), React.createElement("linearGradient", {
    id: "stampSteel",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, React.createElement("stop", {
    offset: "0",
    stopColor: "#64748b"
  }), React.createElement("stop", {
    offset: "1",
    stopColor: "#1e293b"
  }))), React.createElement("circle", {
    cx: "55",
    cy: "12",
    r: "10",
    fill: "url(#stampWood)"
  }), React.createElement("rect", {
    x: "40",
    y: "14",
    width: "30",
    height: "46",
    rx: "8",
    fill: "url(#stampWood)"
  }), React.createElement("rect", {
    x: "8",
    y: "58",
    width: "94",
    height: "22",
    rx: "7",
    fill: "url(#stampSteel)"
  }), React.createElement("rect", {
    x: "16",
    y: "80",
    width: "78",
    height: "12",
    rx: "3",
    fill: "#e11d48"
  }), React.createElement("rect", {
    x: "16",
    y: "88",
    width: "78",
    height: "4",
    rx: "2",
    fill: "#9f1239"
  }));
}
function CupidReveal({
  target,
  fxRef,
  onHit,
  play
}) {
  const at = useTimeline();
  const ref = useRef(null);
  const [wink, setWink] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [arrow, setArrow] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    play('flutter');
    animate(el, [{
      transform: 'translate(80%, 30%) rotate(25deg)',
      opacity: 0
    }, {
      transform: 'translate(0, 0) rotate(0deg)',
      opacity: 1
    }], {
      duration: 520,
      easing: 'cubic-bezier(.3,1.3,.5,1)'
    });
    at(650, () => {
      setDrawn(true);
      play('creak');
    });
    at(1150, () => {
      setDrawn(false);
      setArrow(false);
      play('twang');
      const fx = fxRef.current;
      if (!fx) return;
      const from = {
        x: el.offsetLeft + el.offsetWidth * 0.2,
        y: el.offsetTop + el.offsetHeight * 0.58
      };
      shoot(fx, from, target, ARROW_HTML, {
        dur: 300,
        size: 60
      }).then(p => {
        p.remove();
        play('heartHit');
        setWink(true);
        onHit();
        burst(fx, target.x, target.y, ['❤️', '💖', '💕', '💘', '✨'], 18, {
          dist: 120
        });
      });
    });
  }, []);
  return React.createElement("div", {
    ref: ref,
    className: "absolute",
    style: {
      right: '14%',
      top: -4,
      width: 104,
      height: 104,
      opacity: 0
    }
  }, React.createElement("div", {
    className: `w-full h-full ${wink ? 'fx-bob' : ''}`
  }, React.createElement(CupidSvg, {
    wink: wink,
    drawn: drawn,
    arrow: arrow
  })));
}
function CheersReveal({
  t,
  target,
  fxRef,
  onHit,
  play,
  onShake
}) {
  const left = useRef(null);
  const right = useRef(null);
  const [clinked, setClinked] = useState(false);
  useEffect(() => {
    play('slide');
    const ease = 'cubic-bezier(.45,0,.25,1)';
    animate(left.current, [{
      transform: 'translateX(-240px) rotate(-30deg)',
      opacity: 0
    }, {
      transform: 'translateX(0) rotate(0deg)',
      opacity: 1,
      offset: 0.72
    }, {
      transform: 'translateX(12px) rotate(20deg)',
      opacity: 1
    }], {
      duration: 720,
      easing: ease
    });
    animate(right.current, [{
      transform: 'scaleX(-1) translateX(-240px) rotate(-30deg)',
      opacity: 0
    }, {
      transform: 'scaleX(-1) translateX(0) rotate(0deg)',
      opacity: 1,
      offset: 0.72
    }, {
      transform: 'scaleX(-1) translateX(12px) rotate(20deg)',
      opacity: 1
    }], {
      duration: 720,
      easing: ease
    }).then(() => {
      play('clink');
      onShake();
      setClinked(true);
      onHit();
      burst(fxRef.current, target.sw / 2, 22, ['🫧', '○', '•', '✨'], 20, {
        dist: 100,
        size: 18,
        color: 'rgba(255,255,255,0.95)'
      });
    });
  }, []);
  const bob = clinked ? 'fx-bob' : '';
  return React.createElement(React.Fragment, null, React.createElement("div", {
    ref: left,
    className: "absolute text-6xl leading-none",
    style: {
      left: 'calc(50% - 70px)',
      top: 14,
      opacity: 0
    }
  }, React.createElement("span", {
    className: `inline-block ${bob}`
  }, "\uD83C\uDF7A")), React.createElement("div", {
    ref: right,
    className: "absolute text-6xl leading-none",
    style: {
      left: 'calc(50% + 10px)',
      top: 14,
      opacity: 0
    }
  }, React.createElement("span", {
    className: `inline-block ${bob}`,
    style: {
      animationDelay: '-0.85s'
    }
  }, "\uD83C\uDF7A")), clinked && React.createElement("div", {
    className: "fx-bubble absolute left-1/2 top-0 bg-white text-amber-700 font-black text-sm px-3 py-1 rounded-full shadow-lg whitespace-nowrap"
  }, t.cheers));
}
function SlotReveal({
  t,
  target,
  items,
  winner,
  setPreview,
  onHit,
  play
}) {
  const at = useTimeline();
  const [won, setWon] = useState(false);
  useEffect(() => {
    const others = items.filter(x => x !== winner);
    const pool = others.length ? others : [winner];
    let delay = 55;
    let when = 250;
    let last = null;
    while (delay < 270) {
      at(when, () => {
        let pick = pool[randInt(pool.length)];
        if (pool.length > 1 && pick === last) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
        last = pick;
        setPreview(pick);
        play('slotTick');
      });
      when += delay;
      delay *= 1.14;
    }
    at(when, () => {
      setPreview(null);
      setWon(true);
      play('jackpot');
      onHit();
      rainDown(['🪙', '✨', '💛', '🍀', '⭐'], 28);
    });
    at(when + 250, () => play('coin'));
  }, []);
  if (!won) {
    return React.createElement("div", {
      className: "fx-jiggle absolute text-5xl",
      style: {
        left: '50%',
        top: '50%'
      },
      "aria-hidden": "true"
    }, "\uD83C\uDFB0");
  }
  const size = Math.max(300, target.w * 1.8);
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "rays-spin absolute",
    style: {
      left: target.x - size / 2,
      top: target.y - size / 2,
      width: size,
      height: size,
      mixBlendMode: 'screen'
    }
  }), React.createElement("div", {
    className: "clover-in absolute text-5xl",
    style: {
      left: '50%',
      top: '50%'
    },
    "aria-hidden": "true"
  }, "\uD83C\uDF40"), React.createElement("div", {
    className: "ribbon-in absolute",
    style: {
      left: '50%',
      top: target.y - target.h / 2 - 26
    }
  }, React.createElement("span", {
    className: "inline-block px-4 py-1 rounded-md font-black text-lg tracking-widest text-yellow-900 shadow-lg whitespace-nowrap",
    style: {
      background: 'linear-gradient(180deg,#fff3a0,#ffd700 50%,#f59e0b)'
    }
  }, t.jackpot)));
}
function DevilReveal({
  t,
  target,
  fxRef,
  onHit,
  play
}) {
  const at = useTimeline();
  const ref = useRef(null);
  const [talk, setTalk] = useState(false);
  const [laugh, setLaugh] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    animate(el, [{
      transform: 'translateY(115%)'
    }, {
      transform: 'translateY(0)'
    }], {
      duration: 480,
      easing: 'cubic-bezier(.3,1.3,.5,1)'
    });
    at(520, () => {
      setTalk(true);
      play('giggle');
    });
    at(1200, () => {
      setTalk(false);
      const fx = fxRef.current;
      if (!fx) return;
      const tip = {
        x: el.offsetLeft + el.offsetWidth * (102 / 120),
        y: el.offsetTop + el.offsetHeight * (14 / 120)
      };
      const ball = document.createElement('div');
      ball.className = 'fx-charge absolute pointer-events-none';
      ball.style.cssText = `left:${tip.x}px;top:${tip.y}px;width:34px;height:34px;z-index:30`;
      ball.innerHTML = FIREBALL_HTML;
      fx.appendChild(ball);
      play('charge');
      at(430, () => {
        ball.remove();
        shoot(fx, tip, target, FIREBALL_HTML, {
          dur: 360,
          size: 40,
          grow: 1.8,
          easing: 'cubic-bezier(.4,0,.9,.5)'
        }).then(p => {
          p.remove();
          play('fireHit');
          setLaugh(true);
          onHit();
          burst(fx, target.x, target.y, ['🔥', '💥', '✨'], 18, {
            dist: 120,
            size: 24
          });
        });
      });
    });
  }, []);
  return React.createElement("div", {
    className: "absolute inset-0 overflow-hidden rounded-t-[26px]"
  }, React.createElement("div", {
    ref: ref,
    className: "absolute",
    style: {
      left: 8,
      bottom: -10,
      width: 100,
      height: 100,
      transform: 'translateY(115%)'
    }
  }, React.createElement("div", {
    className: `w-full h-full ${laugh ? 'fx-bob' : ''}`
  }, React.createElement(DevilSvg, null)), talk && React.createElement("div", {
    className: "fx-bubble absolute bg-white text-slate-900 text-xs font-black px-2.5 py-1 rounded-xl whitespace-nowrap shadow",
    style: {
      left: 'calc(100% + 26px)',
      top: '14%'
    }
  }, t.devilSays)));
}
function StampReveal({
  t,
  target,
  fxRef,
  onHit,
  play,
  onShake
}) {
  const at = useTimeline();
  const ref = useRef(null);
  const [mark, setMark] = useState(false);
  const finalTop = target.y + target.h * 0.3 - 92;
  const restTop = Math.max(-30, finalTop - 140);
  const drop = finalTop - restTop;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    animate(el, [{
      transform: 'translateY(-40px) rotate(-10deg)',
      opacity: 0
    }, {
      transform: 'translateY(0) rotate(0deg)',
      opacity: 1
    }], {
      duration: 380,
      easing: 'cubic-bezier(.3,1.3,.5,1)'
    });
    at(700, () => {
      animate(el, [{
        transform: 'translateY(0) scale(1)'
      }, {
        transform: `translateY(${drop}px) scale(0.98)`
      }], {
        duration: 150,
        easing: 'cubic-bezier(.55,0,1,.6)'
      }).then(() => {
        play('thud');
        onShake();
        setMark(true);
        onHit();
        burst(fxRef.current, target.x, target.y + target.h * 0.4, ['•', '○', '◦'], 14, {
          dist: 80,
          size: 16,
          dur: 650,
          color: 'rgba(255,255,255,0.7)'
        });
        at(380, () => play('bell'));
        at(320, () => animate(el, [{
          transform: `translateY(${drop}px)`,
          opacity: 1
        }, {
          transform: `translateY(${drop - 110}px)`,
          opacity: 0
        }], {
          duration: 450,
          easing: 'ease-out'
        }));
      });
    });
  }, []);
  return React.createElement(React.Fragment, null, React.createElement("div", {
    ref: ref,
    className: "absolute",
    style: {
      left: target.x - 55,
      top: restTop,
      width: 110,
      height: 110,
      opacity: 0
    }
  }, React.createElement(StampSvg, null)), mark && React.createElement("div", {
    className: "absolute",
    style: {
      left: target.x + target.w * 0.3,
      top: target.y - target.h * 0.2,
      transform: 'translate(-50%, -50%)'
    }
  }, React.createElement("span", {
    className: "stamp-mark inline-block px-2.5 py-0.5 rounded-md border-4 font-black tracking-[0.2em] text-base sm:text-lg whitespace-nowrap",
    style: {
      color: '#f43f5e',
      borderColor: '#f43f5e',
      boxShadow: 'inset 0 0 0 2px rgba(15,23,42,0.6), 0 0 0 2px rgba(244,63,94,0.5)'
    }
  }, t.stampText)));
}
function FireworksReveal({
  nameRef,
  onHit,
  play
}) {
  const at = useTimeline();
  const [count, setCount] = useState(null);
  useEffect(() => {
    const colors = ['#FF00FF', '#00FFFF', '#FFFF00'];
    [0, 1, 2].forEach(i => at(300 + i * 430, () => {
      setCount(3 - i);
      play('whistle');
      const last = i === 2;
      let x = i === 0 ? 22 : 72;
      let y = 0.28;
      if (last && nameRef.current) {
        const r = nameRef.current.getBoundingClientRect();
        x = (r.left + r.width / 2) / window.innerWidth * 100;
        y = (r.top + r.height / 2) / window.innerHeight;
      }
      launchRocket(x, colors[i], y, () => {
        play('boom');
        if (last) {
          setCount(null);
          flashScreen();
          onHit();
        }
      });
    }));
  }, []);
  if (count == null) return null;
  return React.createElement("div", {
    key: count,
    className: "stage-pop absolute inset-0 grid place-items-center font-black text-6xl",
    style: {
      color: '#67e8f9',
      textShadow: '0 0 18px #f0f, 0 0 36px #f0f'
    },
    "aria-hidden": "true"
  }, count);
}
const REVEALS = {
  dating: CupidReveal,
  drinking: CheersReveal,
  lucky: SlotReveal,
  truth_or_dare: DevilReveal,
  office: StampReveal
};
function ResultModal({
  t,
  lang,
  winner,
  theme,
  themeText,
  items,
  eliminate,
  canRemove,
  play,
  onClose,
  onAgain,
  onRemoveAndSpin,
  onShare,
  onCelebrate
}) {
  const primaryRef = useRef(null);
  const cardRef = useRef(null);
  const nameRef = useRef(null);
  const labelRef = useRef(null);
  const stageRef = useRef(null);
  const fxRef = useRef(null);
  const hitRef = useRef(false);
  const mountedRef = useRef(true);
  const Reveal = REVEALS[theme.reveal || theme.key];
  const cinematic = !REDUCED_MOTION && !!Reveal;
  const [revealed, setRevealed] = useState(!cinematic);
  const [preview, setPreview] = useState(null);
  const [shakeNow, setShakeNow] = useState(false);
  const [target, setTarget] = useState(null);
  const kind = tdKind(winner.label);
  const bank = kind ? TD_PROMPTS[lang][kind] : null;
  const [promptIdx, setPromptIdx] = useState(() => bank ? randInt(bank.length) : 0);
  useEffect(() => {
    if (!cinematic) {
      primaryRef.current?.focus();
      onCelebrate(true);
    }
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (!cinematic) return;
    let tries = 0;
    let timer = 0;
    const measure = () => {
      const n = labelRef.current || nameRef.current;
      const s = stageRef.current;
      const card = cardRef.current;
      if (!n || !s || !card) return;
      if (s.offsetHeight < 40 && tries++ < 25) {
        timer = setTimeout(measure, 25);
        return;
      }
      const within = el => {
        let x = 0,
          y = 0;
        while (el && el !== card) {
          x += el.offsetLeft;
          y += el.offsetTop;
          el = el.offsetParent;
        }
        return {
          x,
          y
        };
      };
      const np = within(n);
      const sp = within(s);
      setTarget({
        x: np.x + n.offsetWidth / 2 - sp.x,
        y: np.y + n.offsetHeight / 2 - sp.y,
        w: n.offsetWidth,
        h: n.offsetHeight,
        sw: s.offsetWidth,
        sh: s.offsetHeight
      });
    };
    measure();
    return () => clearTimeout(timer);
  }, []);
  const shake = () => {
    if (!mountedRef.current) return;
    setShakeNow(true);
    setTimeout(() => mountedRef.current && setShakeNow(false), 600);
  };
  const hit = () => {
    if (hitRef.current || !mountedRef.current) return;
    hitRef.current = true;
    setPreview(null);
    setRevealed(true);
    onCelebrate(false);
    setTimeout(() => primaryRef.current?.focus(), 400);
  };
  const nextPrompt = () => {
    if (!bank) return;
    let n = randInt(bank.length);
    if (bank.length > 1 && n === promptIdx) n = (n + 1) % bank.length;
    setPromptIdx(n);
  };
  const nameClass = revealed ? REVEAL_CLASS[theme.reveal || theme.key] || 'winner-in' : preview != null ? 'opacity-90' : 'pre-reveal';
  return React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade",
    onClick: onClose
  }, React.createElement("div", {
    ref: cardRef,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "result-title",
    className: "relative rounded-[28px] p-7 sm:p-9 max-w-md w-full text-center shadow-2xl animate-pop",
    style: {
      background: theme.bgGradient,
      border: '2px solid rgba(255,255,255,0.25)',
      '--glow': theme.accent
    },
    onClick: e => {
      e.stopPropagation();
      if (!revealed) hit();
    }
  }, theme.effect === 'glow' && React.createElement("div", {
    className: "absolute inset-0 rounded-[28px] pointer-events-none pulse-glow",
    style: {
      '--glow': theme.accent
    }
  }), React.createElement("button", {
    onClick: onClose,
    "aria-label": t.close,
    className: "absolute top-3 right-3 z-30 w-9 h-9 grid place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/10"
  }, React.createElement(Icon.X, null)), React.createElement("div", {
    className: shakeNow ? 'animate-shake' : ''
  }, cinematic ? React.createElement("div", {
    ref: stageRef,
    className: "relative z-20 h-24 sm:h-28 -mx-7 sm:-mx-9 -mt-7 sm:-mt-9 mb-1 pointer-events-none"
  }, React.createElement("div", {
    ref: fxRef,
    className: "absolute inset-0"
  }), target && React.createElement(Reveal, {
    t: t,
    target: target,
    items: items,
    winner: winner.label,
    fxRef: fxRef,
    nameRef: nameRef,
    setPreview: setPreview,
    onHit: hit,
    onShake: shake,
    play: play
  })) : React.createElement("div", {
    className: "text-6xl sm:text-7xl mb-2",
    style: {
      filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))'
    },
    "aria-hidden": "true"
  }, theme.resultEmoji), React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.25em] text-white/70 mb-2"
  }, t.winnerIs), React.createElement("h2", {
    ref: nameRef,
    id: "result-title",
    className: `text-3xl sm:text-4xl font-black text-white break-words leading-tight min-h-[1.2em] ${nameClass}`
  }, React.createElement("span", {
    ref: labelRef,
    className: "inline-block max-w-full"
  }, revealed ? winner.label : preview ?? winner.label)), React.createElement("div", {
    className: `transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`
  }, React.createElement("div", {
    className: "text-white/85 text-sm mt-3 font-semibold"
  }, themeText.kicker), bank && revealed && React.createElement("div", {
    className: "mt-5 rounded-2xl bg-black/25 border border-white/15 p-4 text-left animate-fade"
  }, React.createElement("div", {
    className: "text-[11px] font-bold uppercase tracking-wider mb-1.5",
    style: {
      color: theme.accent
    }
  }, kind === 'truth' ? `🗣️ ${t.truth}` : `🔥 ${t.dare}`), React.createElement("p", {
    key: promptIdx,
    className: "font-semibold leading-snug animate-fade"
  }, bank[promptIdx]), React.createElement("button", {
    onClick: nextPrompt,
    className: "mt-2 text-xs font-bold text-white/70 hover:text-white"
  }, "\uD83D\uDD04 ", t.another)), eliminate && canRemove && React.createElement("div", {
    className: "mt-4 text-[11px] text-white/60"
  }, t.eliminatedNote)), React.createElement("div", {
    className: `flex flex-col gap-2.5 mt-6 transition-opacity duration-500 ${revealed ? '' : 'opacity-25 pointer-events-none'}`
  }, React.createElement("button", {
    ref: primaryRef,
    onClick: onAgain,
    className: `${theme.btnClass} font-extrabold py-3 rounded-full shadow-lg btn-press text-lg tracking-wide`
  }, t.spinAgain), !eliminate && canRemove && React.createElement("button", {
    onClick: onRemoveAndSpin,
    className: "font-bold py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 btn-press text-sm"
  }, "\u2702\uFE0F ", t.removeAndSpin), React.createElement("button", {
    onClick: onShare,
    className: "text-white/85 font-semibold py-2 hover:text-white text-sm"
  }, "\uD83D\uDCE4 ", t.share)), !revealed && React.createElement("div", {
    className: "text-[11px] text-white/50 mt-3"
  }, t.tapToSkip))));
}

/* ==== js/components/modals.js ==== */
function ProModal({
  t,
  onClose
}) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return React.createElement("div", {
    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade",
    onClick: onClose
  }, React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "pro-title",
    className: "bg-slate-900 border border-white/15 rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl animate-pop",
    onClick: e => e.stopPropagation()
  }, React.createElement("div", {
    className: "text-6xl mb-3",
    "aria-hidden": "true"
  }, "\uD83D\uDE80"), React.createElement("h3", {
    id: "pro-title",
    className: "text-2xl font-extrabold mb-2"
  }, t.proTitle), React.createElement("p", {
    className: "text-white/70 text-sm mb-5"
  }, t.proBody), React.createElement("button", {
    ref: ref,
    onClick: onClose,
    className: "w-full rounded-full py-3 font-bold bg-gradient-to-r from-yellow-400 to-pink-500 text-purple-950 btn-press shadow-lg"
  }, t.gotIt)));
}
function GamePlaceholder({
  t,
  lang,
  mode,
  item,
  theme,
  onBack,
  onBrowse
}) {
  const mt = MODE_TEXT[lang][mode.id];
  const title = gameMeta(lang, mode, item).title;
  return React.createElement("section", {
    className: "glass w-full max-w-xl rounded-3xl p-6 sm:p-8 text-center animate-pop mt-2"
  }, React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.25em] text-white/60"
  }, mode.icon, " ", mt.title), React.createElement("div", {
    className: "mx-auto mt-4 w-24 h-24 rounded-3xl grid place-items-center text-5xl border",
    style: {
      background: `linear-gradient(135deg, ${mode.accent}55, ${mode.accent}12)`,
      borderColor: `${mode.accent}66`,
      boxShadow: `0 24px 60px -24px ${mode.accent}`
    },
    "aria-hidden": "true"
  }, item.icon), React.createElement("h2", {
    className: "text-2xl sm:text-3xl font-black mt-4"
  }, title), React.createElement("div", {
    className: "inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15"
  }, React.createElement("span", {
    className: "w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse"
  }), t.comingSoon, item.pro ? ` · ${t.pro}` : ''), React.createElement("p", {
    className: "text-white/70 text-sm mt-4 max-w-sm mx-auto leading-relaxed"
  }, t.comingSoonBody), React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-2.5 justify-center mt-6"
  }, React.createElement("button", {
    onClick: onBack,
    className: `${theme.btnClass} font-extrabold py-3 px-6 rounded-full shadow-lg btn-press`
  }, "\uD83C\uDFAF ", t.backToSpinner), React.createElement("button", {
    onClick: onBrowse,
    className: "font-bold py-3 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 btn-press"
  }, t.pickAnother)));
}

/* ==== js/components/game.js ==== */
function Avatar({
  player,
  size = 40,
  ring
}) {
  return React.createElement("span", {
    className: `inline-grid place-items-center rounded-full shrink-0 ${player.eliminated ? 'eliminated' : ''}`,
    style: {
      width: size,
      height: size,
      fontSize: size * 0.5,
      background: `${player.color}33`,
      border: `2px solid ${ring || player.color}`,
      boxShadow: ring ? `0 0 0 3px ${ring}55` : 'none'
    },
    "aria-hidden": "true"
  }, player.avatar);
}
function PlayerChip({
  player,
  size = 36,
  label,
  muted,
  ring
}) {
  return React.createElement("span", {
    className: `inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-black/25 border border-white/10 max-w-full ${muted ? 'opacity-50' : ''}`
  }, React.createElement(Avatar, {
    player: player,
    size: size - 8,
    ring: ring
  }), React.createElement("span", {
    className: "font-bold text-sm truncate max-w-[140px]"
  }, player.name), label && React.createElement("span", {
    className: "text-xs text-white/60 shrink-0"
  }, label));
}
function Versus({
  a,
  b,
  t,
  labelA,
  labelB
}) {
  const side = (p, label) => React.createElement("div", {
    className: "flex-1 min-w-0 flex flex-col items-center gap-1.5"
  }, React.createElement(Avatar, {
    player: p,
    size: 64
  }), React.createElement("div", {
    className: "font-black text-lg truncate max-w-full"
  }, p.name), label && React.createElement("div", {
    className: "text-[11px] uppercase tracking-wider text-white/60"
  }, label));
  return React.createElement("div", {
    className: "flex items-center gap-3"
  }, side(a, labelA), React.createElement("div", {
    className: "text-2xl font-black text-white/50 italic shrink-0"
  }, t.vs), side(b, labelB));
}
function OptionPills({
  label,
  options,
  value,
  onChange
}) {
  return React.createElement("div", {
    className: "flex items-center justify-between gap-3 flex-wrap"
  }, React.createElement("span", {
    className: "text-sm font-semibold text-white/80"
  }, label), React.createElement("div", {
    className: "flex gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, options.map(o => React.createElement("button", {
    key: o.value,
    onClick: () => onChange(o.value),
    "aria-pressed": value === o.value,
    className: `px-3 py-1.5 rounded-full text-sm font-bold btn-press ${value === o.value ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`
  }, o.label))));
}
function PlayerSetup({
  t,
  players,
  onChange,
  min,
  max,
  selected,
  onSelected,
  teams,
  onTeams,
  sfx
}) {
  const [name, setName] = useState('');
  const selectable = !!onSelected;
  const add = () => {
    const v = name.trim();
    if (!v || players.length >= MAX_PLAYERS) return;
    const p = createPlayer(v, players);
    onChange([...players, p]);
    if (selectable && selected.length < max) onSelected([...selected, p.id]);
    setName('');
    sfx && sfx('click');
  };
  const toggle = id => {
    if (!selectable) return;
    if (selected.includes(id)) onSelected(selected.filter(x => x !== id));else if (selected.length < max) onSelected([...selected, id]);else if (max === 1) onSelected([id]);
  };
  const cycleTeam = id => onTeams && onTeams({
    ...teams,
    [id]: teams[id] === 'red' ? 'blue' : 'red'
  });
  const autoTeams = () => {
    const ids = shuffleArr(selected);
    const next = {};
    ids.forEach((id, i) => {
      next[id] = i % 2 === 0 ? 'red' : 'blue';
    });
    onTeams(next);
  };
  const count = selectable ? selected.length : players.length;
  return React.createElement("div", {
    className: "space-y-3"
  }, React.createElement("div", {
    className: "flex items-center justify-between"
  }, React.createElement("h3", {
    className: "font-bold flex items-center gap-2"
  }, "\uD83D\uDC65 ", t.players, " ", React.createElement("span", {
    className: "text-xs font-medium text-white/60"
  }, count, "/", max >= 100 ? '∞' : max)), React.createElement("div", {
    className: "flex gap-1.5"
  }, players.length > 1 && React.createElement(ToolBtn, {
    onClick: () => {
      onChange(shuffleArr(players));
      sfx && sfx('click');
    }
  }, "\uD83D\uDD00 ", t.shuffleOrder), teams && selected.length > 1 && React.createElement(ToolBtn, {
    onClick: autoTeams
  }, "\uD83C\uDFB2 ", t.autoTeams))), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("input", {
    value: name,
    maxLength: 24,
    onChange: e => setName(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        add();
      }
    },
    placeholder: t.playerName,
    "aria-label": t.playerName,
    className: "flex-1 min-w-0 rounded-full px-4 py-2.5 bg-black/25 placeholder-white/45 border border-white/15 focus:outline-none focus:border-white/40"
  }), React.createElement("button", {
    onClick: add,
    disabled: !name.trim() || players.length >= MAX_PLAYERS,
    className: "px-5 rounded-full bg-white text-slate-900 font-bold btn-press disabled:opacity-50"
  }, t.addPlayer)), players.length === 0 ? React.createElement("div", {
    className: "text-sm text-white/60 text-center py-5 border border-dashed border-white/20 rounded-2xl"
  }, t.needPlayers(min)) : React.createElement("ul", {
    className: "space-y-1.5"
  }, players.map(p => {
    const on = !selectable || selected.includes(p.id);
    return React.createElement("li", {
      key: p.id,
      className: `flex items-center gap-2 rounded-2xl px-2 py-1.5 border ${on ? 'bg-white/8 border-white/15' : 'bg-black/15 border-transparent opacity-60'}`,
      style: on ? {
        background: 'rgba(255,255,255,0.06)'
      } : undefined
    }, React.createElement("button", {
      onClick: () => toggle(p.id),
      "aria-pressed": on,
      "aria-label": `${p.name}: ${on ? t.playing : ''}`,
      className: `flex items-center gap-2 flex-1 min-w-0 text-left ${selectable ? 'btn-press' : 'cursor-default'}`
    }, React.createElement(Avatar, {
      player: p,
      size: 34
    }), React.createElement("input", {
      value: p.name,
      maxLength: 24,
      onClick: e => e.stopPropagation(),
      onChange: e => onChange(renamePlayer(players, p.id, e.target.value)),
      "aria-label": t.playerName,
      className: "flex-1 min-w-0 bg-transparent font-semibold text-sm focus:outline-none border-b border-transparent focus:border-white/40 py-1"
    })), teams && on && React.createElement("button", {
      onClick: () => cycleTeam(p.id),
      className: "text-[10px] font-black tracking-wider px-2 py-1 rounded-full btn-press",
      style: {
        background: teams[p.id] === 'blue' ? 'rgba(96,165,250,0.35)' : 'rgba(248,113,113,0.35)',
        border: `1px solid ${teams[p.id] === 'blue' ? '#60a5fa' : '#f87171'}`
      }
    }, teams[p.id] === 'blue' ? t.teamBlue : t.teamRed), selectable && React.createElement("span", {
      className: `w-5 h-5 rounded-full grid place-items-center text-[11px] font-black shrink-0 ${on ? 'bg-white text-slate-900' : 'border border-white/30'}`,
      "aria-hidden": "true"
    }, on ? '✓' : ''), React.createElement("button", {
      onClick: () => {
        onChange(removePlayer(players, p.id));
        if (selectable) onSelected(selected.filter(x => x !== p.id));
      },
      "aria-label": `${t.del} ${p.name}`,
      className: "w-8 h-8 grid place-items-center rounded-full text-white/45 hover:text-white hover:bg-white/10 shrink-0"
    }, React.createElement(Icon.X, null)));
  })), selectable && players.length > max && React.createElement("div", {
    className: "text-[11px] text-white/50 text-center"
  }, t.includeHint));
}
function Countdown({
  seconds = 3,
  onDone,
  play,
  label
}) {
  const [n, setN] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (n > 0) play && play('tick');else play && play('land');
    const id = setTimeout(() => n > 0 ? setN(n - 1) : doneRef.current(), n > 0 ? 850 : 550);
    return () => clearTimeout(id);
  }, [n]);
  return React.createElement("div", {
    className: "grid place-items-center min-h-[220px] text-center"
  }, label && React.createElement("div", {
    className: "text-sm text-white/70 font-semibold mb-2"
  }, label), React.createElement("div", {
    key: n,
    className: "count-pop text-8xl font-black drop-shadow-lg",
    "aria-live": "assertive"
  }, n > 0 ? n : 'GO!'));
}
function TimerRing({
  ms,
  total,
  size = 96,
  color = '#fff',
  urgent = 3000
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const p = total ? ms / total : 0;
  const col = ms <= urgent && ms > 0 ? '#f87171' : color;
  return React.createElement("div", {
    className: "relative inline-grid place-items-center",
    style: {
      width: size,
      height: size
    },
    role: "timer",
    "aria-label": `${Math.ceil(ms / 1000)}s`
  }, React.createElement("svg", {
    viewBox: "0 0 100 100",
    className: "timer-ring absolute inset-0 w-full h-full"
  }, React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    stroke: "rgba(255,255,255,0.15)",
    strokeWidth: "8",
    fill: "none"
  }), React.createElement("circle", {
    cx: "50",
    cy: "50",
    r: r,
    stroke: col,
    strokeWidth: "8",
    fill: "none",
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * (1 - p)
  })), React.createElement("span", {
    className: `relative font-black tabular-nums ${ms <= urgent && ms > 0 ? 'text-red-300 pulse-soft' : ''}`,
    style: {
      fontSize: size * 0.34
    }
  }, Math.ceil(ms / 1000)));
}
const TEAM_NAMES = ['A', 'B', 'C', 'D'];
const TEAM_COLORS = ['#f87171', '#60a5fa', '#4ade80', '#fbbf24'];
function TeamScores({
  t,
  teams,
  big
}) {
  if (!teams || !teams.length) return null;
  const top = teams[0] ? teams[0].score : 0;
  return React.createElement("div", {
    className: `space-y-1.5 ${big ? 'mt-4' : ''}`
  }, big && React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.25em] text-white/55 text-center"
  }, t.teamRanking), teams.map((tm, i) => React.createElement("div", {
    key: tm.index,
    className: "flex items-center gap-2.5 rounded-xl px-2.5 py-2 border",
    style: {
      background: `${tm.color}1f`,
      borderColor: `${tm.color}66`
    }
  }, React.createElement("span", {
    className: "w-6 text-center font-black text-white/60"
  }, i + 1), React.createElement("span", {
    className: "w-7 h-7 rounded-lg grid place-items-center font-black text-slate-900 shrink-0",
    style: {
      background: tm.color
    }
  }, tm.name), React.createElement("span", {
    className: "flex-1 min-w-0 text-sm truncate"
  }, tm.members.map(p => p.avatar).join(' '), " ", React.createElement("span", {
    className: "text-white/55"
  }, tm.members.length)), React.createElement("span", {
    className: `font-black tabular-nums ${big ? 'text-xl' : ''}`
  }, tm.score), top > 0 && React.createElement("span", {
    className: "hidden sm:block w-16 h-1.5 rounded-full bg-white/10 overflow-hidden"
  }, React.createElement("span", {
    className: "block h-full rounded-full",
    style: {
      width: `${tm.score / top * 100}%`,
      background: tm.color
    }
  })))));
}
function ScoreBoard({
  t,
  players,
  highlight = [],
  metric = 'score',
  metricLabel,
  compact
}) {
  const list = metric === 'time' ? [...players].sort((a, b) => (a.bestMs ?? Infinity) - (b.bestMs ?? Infinity)) : Score.leaderboard(players);
  const value = p => {
    if (metric === 'time') return p.bestMs != null ? fmtSeconds(p.bestMs) : '—';
    if (metric === 'streak') return `🔥 ${p.streak}`;
    if (metric === 'wins') return p.wins;
    return p.score;
  };
  return React.createElement("ul", {
    className: `space-y-1 ${compact ? 'text-sm' : ''}`
  }, list.map((p, i) => React.createElement("li", {
    key: p.id,
    className: `flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ${highlight.includes(p.id) ? 'bg-white/15 ring-1 ring-white/30' : 'bg-black/20'} ${p.eliminated ? 'opacity-60' : ''}`
  }, React.createElement("span", {
    className: "w-5 text-center text-xs font-bold text-white/50 tabular-nums"
  }, i + 1), React.createElement(Avatar, {
    player: p,
    size: compact ? 26 : 32
  }), React.createElement("span", {
    className: "flex-1 min-w-0 font-semibold truncate"
  }, p.name, " ", p.eliminated && React.createElement("span", {
    className: "text-[10px] text-white/50"
  }, "\u2620\uFE0F")), metric !== 'streak' && p.streak > 1 && React.createElement("span", {
    className: "text-[11px] text-orange-300 font-bold"
  }, "\uD83D\uDD25", p.streak), React.createElement("span", {
    className: "font-black tabular-nums"
  }, value(p), " ", React.createElement("span", {
    className: "text-[10px] font-semibold text-white/50"
  }, metricLabel || '')))));
}
function ChallengeCard({
  t,
  challenge,
  accent,
  kicker
}) {
  const [alt, setAlt] = useState(false);
  useEffect(() => setAlt(false), [challenge && challenge.id]);
  if (!challenge) return null;
  return React.createElement("div", {
    className: "rounded-3xl p-5 sm:p-6 bg-black/25 border border-white/15 text-center slide-up",
    style: {
      boxShadow: `0 20px 50px -30px ${accent || '#fff'}`
    }
  }, React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
  }, kicker || t.challenge), React.createElement("p", {
    className: "text-xl sm:text-2xl font-black mt-2 leading-snug"
  }, alt && challenge.alt ? challenge.alt : challenge.text), challenge.drink && React.createElement(React.Fragment, null, React.createElement("button", {
    onClick: () => setAlt(!alt),
    className: "mt-3 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press"
  }, alt ? `🍻 ${t.showOriginal}` : `🎭 ${t.nonDrinking}`), React.createElement("div", {
    className: "mt-2 text-[11px] text-white/50"
  }, "\uD83D\uDCA7 ", t.drinkNote)));
}
function Decision({
  options,
  onPick,
  hint
}) {
  return React.createElement("div", {
    className: "space-y-2"
  }, hint && React.createElement("div", {
    className: "text-center text-xs text-white/60 font-semibold"
  }, hint), React.createElement("div", {
    className: `grid gap-2 ${options.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`
  }, options.map(o => React.createElement("button", {
    key: o.id,
    onClick: () => onPick(o.id),
    className: "min-h-[56px] rounded-2xl px-4 py-3 font-extrabold text-base btn-press border border-white/20 flex items-center justify-center gap-2 truncate",
    style: {
      background: o.color ? `${o.color}33` : 'rgba(255,255,255,0.1)',
      borderColor: o.color ? `${o.color}99` : undefined
    }
  }, o.icon && React.createElement("span", {
    "aria-hidden": "true"
  }, o.icon), React.createElement("span", {
    className: "truncate"
  }, o.label)))));
}
function GameShell({
  t,
  modeTitle,
  meta,
  round,
  totalRounds,
  status,
  onExit,
  extra,
  children
}) {
  return React.createElement("section", {
    className: "w-full max-w-2xl"
  }, React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, React.createElement("button", {
    onClick: onExit,
    className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press shrink-0"
  }, "\u2190 ", t.games), React.createElement("div", {
    className: "flex-1 min-w-0 flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-2xl",
    "aria-hidden": "true"
  }, meta.icon), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("div", {
    className: "font-extrabold truncate leading-tight brand-accent"
  }, meta.title), React.createElement("div", {
    className: "text-[11px] text-white/60 truncate"
  }, modeTitle))), extra, round > 0 && status !== 'setup' && status !== 'finished' && React.createElement("span", {
    className: "text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 shrink-0"
  }, t.round, " ", round, totalRounds ? `/${totalRounds}` : '')), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-6"
  }, children));
}
function GameResult({
  t,
  title,
  winners,
  winnerLabel,
  players,
  stats = [],
  metric,
  metricLabel,
  extra,
  onPlayAgain,
  onChangeGame,
  onBackToParty,
  celebrate
}) {
  useEffect(() => {
    celebrate && celebrate();
  }, []);
  const list = winners || [];
  return React.createElement("div", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-[11px] uppercase tracking-[0.3em] text-white/60"
  }, "\uD83C\uDF89 ", title || t.gameComplete), React.createElement("div", {
    className: "text-6xl mt-3 crown-float",
    "aria-hidden": "true"
  }, "\uD83D\uDC51"), winnerLabel && React.createElement("div", {
    className: "text-xs uppercase tracking-[0.25em] text-white/70 mt-2"
  }, winnerLabel), React.createElement("div", {
    className: "flex flex-wrap justify-center gap-2 mt-3"
  }, list.map(p => React.createElement("div", {
    key: p.id,
    className: "flex flex-col items-center gap-1 score-pop"
  }, React.createElement(Avatar, {
    player: p,
    size: 64,
    ring: "#fff"
  }), React.createElement("div", {
    className: "text-2xl sm:text-3xl font-black"
  }, p.name)))), React.createElement("div", {
    className: "text-xs uppercase tracking-[0.25em] text-white/55 mt-1"
  }, list.length > 1 ? t.winners : t.winner), stats.length > 0 && React.createElement("div", {
    className: "flex flex-wrap justify-center gap-2 mt-4 border-t border-white/10 pt-4"
  }, stats.map((s, i) => React.createElement("span", {
    key: i,
    className: "px-3 py-1.5 rounded-full bg-black/25 border border-white/10 text-sm font-bold"
  }, s))), extra, players && players.length > 1 && React.createElement("div", {
    className: "mt-4 text-left"
  }, React.createElement(ScoreBoard, {
    t: t,
    players: players,
    highlight: list.map(p => p.id),
    metric: metric,
    metricLabel: metricLabel,
    compact: true
  })), React.createElement("div", {
    className: "flex flex-col gap-2.5 mt-6"
  }, React.createElement("button", {
    onClick: onPlayAgain,
    className: "font-extrabold py-3 rounded-full shadow-lg btn-press text-lg tracking-wide text-white",
    style: {
      background: 'linear-gradient(90deg, var(--brand-primary, #f472b6), var(--brand-secondary, #22d3ee))'
    }
  }, "\uD83D\uDD01 ", t.playAgain), React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, React.createElement("button", {
    onClick: onChangeGame,
    className: "font-bold py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 btn-press text-sm"
  }, "\uD83C\uDFAE ", t.changeGame), React.createElement("button", {
    onClick: onBackToParty,
    className: "font-bold py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 btn-press text-sm"
  }, "\uD83C\uDF89 ", t.backToParty))));
}
class GameErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error
    };
  }
  componentDidCatch(error) {
    console.error('[game]', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const {
      t,
      onExit
    } = this.props;
    return React.createElement("section", {
      className: "glass w-full max-w-xl rounded-3xl p-6 text-center"
    }, React.createElement("div", {
      className: "text-5xl",
      "aria-hidden": "true"
    }, "\uD83D\uDE48"), React.createElement("h2", {
      className: "text-xl font-black mt-3"
    }, "Oops"), React.createElement("p", {
      className: "text-sm text-white/70 mt-2"
    }, String(this.state.error && this.state.error.message || this.state.error)), React.createElement("button", {
      onClick: onExit,
      className: "mt-5 px-6 py-3 rounded-full bg-white text-slate-900 font-extrabold btn-press"
    }, "\uD83C\uDFAF ", t.backToSpinner));
  }
}
function useRecordOnFinish(status, buildEntry, onFinish) {
  const done = useRef(false);
  useEffect(() => {
    if (status === 'finished' && !done.current) {
      done.current = true;
      onFinish(buildEntry());
    }
    if (status !== 'finished') done.current = false;
  }, [status]);
}

/* ==== js/components/sidebar.js ==== */
const CAN_HOVER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;
function GameInfoPopover({
  t,
  meta,
  locked,
  anchorRef,
  open,
  onClose,
  onHoverChange
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const a = anchorRef.current && anchorRef.current.getBoundingClientRect();
      const el = ref.current;
      if (!a || !el) return;
      const w = el.offsetWidth,
        h = el.offsetHeight,
        vw = window.innerWidth,
        vh = window.innerHeight,
        gap = 10,
        pad = 8;
      let side = 'right';
      let x = a.right + gap;
      let y = a.top + a.height / 2 - h / 2;
      if (x + w > vw - pad) {
        side = 'left';
        x = a.left - gap - w;
      }
      if (x < pad) {
        x = clamp(a.left + a.width / 2 - w / 2, pad, vw - w - pad);
        side = a.bottom + gap + h <= vh - pad ? 'bottom' : 'top';
        y = side === 'bottom' ? a.bottom + gap : a.top - gap - h;
      }
      y = clamp(y, pad, vh - h - pad);
      setPos({
        x,
        y,
        side,
        ax: a.left + a.width / 2 - x,
        ay: a.top + a.height / 2 - y
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = e => {
      if (ref.current && ref.current.contains(e.target) || anchorRef.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    const onKey = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  if (!open) return null;
  const arrow = pos && {
    right: {
      left: -7,
      top: pos.ay - 6,
      transform: 'rotate(-45deg)'
    },
    left: {
      right: -7,
      top: pos.ay - 6,
      transform: 'rotate(135deg)'
    },
    bottom: {
      top: -7,
      left: pos.ax - 6,
      transform: 'rotate(45deg)'
    },
    top: {
      bottom: -7,
      left: pos.ax - 6,
      transform: 'rotate(225deg)'
    }
  }[pos.side];
  const [minP, maxP] = meta.players;
  return ReactDOM.createPortal(React.createElement("div", {
    ref: ref,
    role: "tooltip",
    className: "popover text-left",
    onMouseEnter: () => onHoverChange && onHoverChange(true),
    onMouseLeave: () => onHoverChange && onHoverChange(false),
    style: {
      left: pos ? pos.x : -9999,
      top: pos ? pos.y : -9999,
      visibility: pos ? 'visible' : 'hidden'
    }
  }, arrow && React.createElement("span", {
    className: "popover-arrow",
    style: arrow,
    "aria-hidden": "true"
  }), React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("span", {
    className: "text-xl",
    "aria-hidden": "true"
  }, meta.icon), React.createElement("div", {
    className: "font-black text-sm tracking-wide uppercase flex-1 truncate"
  }, meta.title), React.createElement(PlanBadge, {
    plan: meta.plan,
    locked: locked,
    t: t
  })), React.createElement("p", {
    className: "text-sm text-white/85 mt-2 leading-snug"
  }, meta.description), meta.howToPlay && React.createElement("p", {
    className: "text-xs text-white/60 mt-1.5 leading-snug"
  }, meta.howToPlay), React.createElement("div", {
    className: "grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-[11px] text-white/75"
  }, React.createElement("span", null, "\uD83D\uDC65 ", t.playersRange(minP, maxP)), React.createElement("span", null, "\u23F1\uFE0F ", meta.duration), React.createElement("span", null, "\uD83C\uDFC6 ", t.scoringLabels[meta.scoring]), React.createElement("span", null, "\uD83C\uDF9A\uFE0F ", t.difficultyLabels[meta.difficulty])), locked && React.createElement("div", {
    className: "mt-3 text-[11px] font-bold text-amber-200"
  }, "\uD83D\uDD12 ", t.availableWith(meta.plan))), document.body);
}
function GameItem({
  t,
  lang,
  mode,
  item,
  active,
  locked,
  onPick
}) {
  const meta = useMemo(() => gameMeta(lang, mode, item), [lang, mode, item]);
  const infoRef = useRef(null);
  const closeTimer = useRef(0);
  const [info, setInfo] = useState(false);
  const [pinned, setPinned] = useState(false);
  const th = mode.type === 'themes' ? THEMES[item.id] : null;
  const close = () => {
    clearTimeout(closeTimer.current);
    setInfo(false);
    setPinned(false);
  };
  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    if (pinned) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setInfo(false), 160);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  return React.createElement("li", {
    className: `game-item flex items-center rounded-xl border ${active ? 'active border-white/30' : 'border-transparent'}`
  }, React.createElement("button", {
    onClick: () => onPick(mode, item, locked),
    "aria-pressed": active,
    className: "flex-1 min-w-0 min-h-[44px] flex items-center gap-2.5 pl-2 pr-1 py-1.5 text-left rounded-xl"
  }, React.createElement("span", {
    className: "w-8 h-8 shrink-0 rounded-lg grid place-items-center text-base border border-white/15",
    style: {
      background: th ? th.bgGradient : 'rgba(255,255,255,0.06)'
    },
    "aria-hidden": "true"
  }, item.icon), React.createElement("span", {
    className: "flex-1 min-w-0"
  }, React.createElement("span", {
    className: `block text-sm leading-tight ${active ? 'font-bold text-white' : 'font-semibold text-white/85'}`
  }, meta.title), th && React.createElement("span", {
    className: "block text-[11px] text-white/50 truncate mt-0.5"
  }, meta.description)), React.createElement(PlanBadge, {
    plan: meta.plan,
    locked: locked,
    t: t
  }), active && React.createElement("span", {
    className: "w-5 h-5 rounded-full bg-white text-slate-900 grid place-items-center text-[11px] font-black shrink-0 ml-1",
    "aria-hidden": "true"
  }, "\u2713")), React.createElement("button", {
    ref: infoRef,
    "aria-label": t.gameInfo,
    "aria-expanded": info,
    onClick: e => {
      e.stopPropagation();
      if (info && pinned) close();else {
        cancelClose();
        setInfo(true);
        setPinned(true);
      }
    },
    onMouseEnter: () => {
      if (CAN_HOVER) {
        cancelClose();
        setInfo(true);
      }
    },
    onMouseLeave: () => {
      if (CAN_HOVER) scheduleClose();
    },
    className: "info-btn w-9 h-9 shrink-0 grid place-items-center rounded-full text-white/80 hover:bg-white/10 mr-0.5"
  }, React.createElement(Icon.Info, null)), React.createElement(GameInfoPopover, {
    t: t,
    meta: meta,
    locked: locked,
    anchorRef: infoRef,
    open: info,
    onClose: close,
    onHoverChange: inside => {
      if (!CAN_HOVER) return;
      if (inside) cancelClose();else scheduleClose();
    }
  }));
}
function GameModeAccordion({
  t,
  lang,
  mode,
  open,
  onToggle,
  activeGame,
  sub,
  onPickGame,
  footer
}) {
  const mt = MODE_TEXT[lang][mode.id];
  const hasActive = activeGame.mode === mode.id;
  return React.createElement("div", {
    className: `rounded-2xl border bg-white/5 overflow-hidden transition-colors ${hasActive ? 'border-white/25' : 'border-white/10'}`,
    style: {
      '--acc': mode.accent
    }
  }, React.createElement("button", {
    onClick: onToggle,
    "aria-expanded": open,
    className: "w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 btn-press"
  }, React.createElement("span", {
    className: "w-10 h-10 shrink-0 rounded-xl grid place-items-center text-xl border",
    style: {
      background: `linear-gradient(135deg, ${mode.accent}40, ${mode.accent}10)`,
      borderColor: `${mode.accent}55`
    },
    "aria-hidden": "true"
  }, mode.icon), React.createElement("span", {
    className: "flex-1 min-w-0"
  }, React.createElement("span", {
    className: "block font-bold leading-tight"
  }, mt.title), React.createElement("span", {
    className: "block text-xs text-white/55 truncate mt-0.5"
  }, mt.desc)), hasActive && !open && React.createElement("span", {
    className: "w-2 h-2 rounded-full shrink-0",
    style: {
      background: mode.accent
    },
    "aria-hidden": "true"
  }), React.createElement("svg", {
    className: `chev shrink-0 text-white/60 ${open ? 'open' : ''}`,
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": "true"
  }, React.createElement("path", {
    d: "M6 9l6 6 6-6",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), React.createElement("div", {
    className: `acc-body ${open ? 'open' : ''}`,
    inert: open ? undefined : ''
  }, React.createElement("div", null, React.createElement("div", {
    className: "px-2.5 pb-2.5 border-t border-white/10"
  }, React.createElement("div", {
    className: "text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 px-1.5 pt-2.5 pb-1.5"
  }, mode.type === 'themes' ? t.themesLabel : t.gamesLabel), React.createElement("ul", {
    className: "space-y-1"
  }, mode.items.map(item => React.createElement(GameItem, {
    key: item.id,
    t: t,
    lang: lang,
    mode: mode,
    item: item,
    active: hasActive && activeGame.id === item.id,
    locked: !Entitlements.canPlay(sub, item),
    onPick: onPickGame
  }))), footer))));
}
function SettingRow({
  title,
  desc,
  children
}) {
  return React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("div", {
    className: "font-semibold"
  }, title), desc && React.createElement("div", {
    className: "text-xs text-white/60"
  }, desc)), children);
}
function SideMenu({
  open,
  onClose,
  t,
  lang,
  setLang,
  openModes,
  onToggleMode,
  activeGame,
  onPickGame,
  sub,
  onOpenPricing,
  onDevSetPlan,
  venue,
  onOpenVenue,
  session,
  onOpenParty,
  onOpenCreator,
  quizPrefs,
  setQuizPrefs,
  activeDef,
  soundOn,
  setSoundOn,
  haptics,
  setHaptics,
  eliminate,
  setEliminate,
  duration,
  setDuration,
  history,
  currentGame,
  onClearHistory,
  lists,
  onSaveList,
  onLoadList,
  onDeleteList,
  canSave
}) {
  const [name, setName] = useState('');
  const closeRef = useRef(null);
  const docked = useMediaQuery('(min-width: 1024px)');
  const shown = open || docked;
  useEffect(() => {
    if (open && !docked) setTimeout(() => closeRef.current && closeRef.current.focus(), 50);
  }, [open, docked]);
  const hist = useMemo(() => {
    const isSpin = currentGame.mode === 'spinner';
    const def = isSpin ? null : findGame(currentGame.mode, currentGame.id);
    const th = isSpin ? THEMES[currentGame.id] : null;
    const label = isSpin ? `${th ? th.icon : '🎯'} ${THEME_TEXT[lang][currentGame.id] ? THEME_TEXT[lang][currentGame.id].name : ''}` : def ? `${def.item.icon} ${gameMeta(lang, def.mode, def.item).title}` : '';
    const spins = isSpin ? history.filter(h => h.theme === currentGame.id) : [];
    const games = isSpin ? [] : session.history.filter(h => h.gameId === currentGame.id);
    const counts = {};
    (isSpin ? spins.map(h => h.winner) : games.flatMap(h => h.winnerNames || [])).forEach(n => {
      counts[n] = (counts[n] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      isSpin,
      label,
      spins,
      games,
      top,
      maxCount: top.length ? top[0][1] : 1,
      count: isSpin ? spins.length : games.length,
      icon: def ? def.item.icon : th ? th.icon : '🎯'
    };
  }, [history, session.history, currentGame, lang]);
  const save = () => {
    if (!name.trim() || !canSave) return;
    onSaveList(name.trim().slice(0, 40));
    setName('');
  };
  const venueLocked = !Entitlements.hasFeature(sub, 'venue-mode');
  const modeId = activeGame.mode;
  const modeLabel = MODE_TEXT[lang][modeId] ? MODE_TEXT[lang][modeId].title : t.general;
  const activeCustomId = activeDef && activeDef.item ? activeDef.item.customGameId : null;
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: `fixed inset-0 z-30 menu-backdrop transition-opacity duration-300 lg:hidden ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`,
    onClick: onClose,
    "aria-hidden": "true"
  }), React.createElement("aside", {
    className: `fixed top-0 left-0 z-40 w-[88vw] max-w-sm bg-slate-950/95 text-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'} lg:sticky lg:translate-x-0 lg:w-80 lg:shrink-0 lg:shadow-none lg:border-r lg:border-white/10 lg:transition-none`,
    style: {
      height: '100dvh',
      maxHeight: '100dvh'
    },
    "aria-hidden": !shown,
    inert: shown ? undefined : '',
    role: "dialog",
    "aria-label": t.panelTitle
  }, React.createElement("header", {
    className: "flex items-center justify-between px-4 pb-4 border-b border-white/10 shrink-0",
    style: {
      paddingTop: 'max(1rem, env(safe-area-inset-top))'
    }
  }, React.createElement("h2", {
    className: "text-lg font-extrabold flex items-center gap-2 min-w-0"
  }, venue && venue.logo ? React.createElement("img", {
    src: venue.logo,
    alt: "",
    className: "w-7 h-7 rounded-lg object-cover border border-white/20"
  }) : React.createElement("span", {
    "aria-hidden": "true"
  }, "\uD83C\uDF89"), React.createElement("span", {
    className: "truncate"
  }, venue ? venue.name : t.panelTitle)), React.createElement("button", {
    ref: closeRef,
    onClick: onClose,
    "aria-label": t.close,
    className: "w-10 h-10 rounded-full hover:bg-white/10 grid place-items-center btn-press shrink-0 lg:hidden"
  }, React.createElement(Icon.X, null))), React.createElement("div", {
    className: "flex-1 min-h-0 overflow-y-auto overscroll-contain sb-thin p-4 space-y-7"
  }, React.createElement(Section, {
    title: t.gameModes
  }, React.createElement("div", {
    className: "space-y-2"
  }, GAME_MODES.map(mode => React.createElement(GameModeAccordion, {
    key: mode.id,
    t: t,
    lang: lang,
    mode: mode,
    open: openModes.includes(mode.id),
    onToggle: () => onToggleMode(mode.id),
    activeGame: activeGame,
    sub: sub,
    onPickGame: onPickGame,
    footer: mode.id === 'quiz' ? React.createElement("div", {
      className: "px-1.5 pt-2 space-y-1.5 border-t border-white/10 mt-2"
    }, React.createElement("div", {
      className: "text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 px-1 pt-1"
    }, "\uD83C\uDF93 ", t.myGames), React.createElement("button", {
      onClick: () => onOpenCreator('editor', null),
      className: "w-full min-h-[44px] rounded-xl font-bold text-sm btn-press text-white shadow",
      style: {
        background: 'linear-gradient(90deg, #a78bfa, #f472b6)'
      }
    }, "+ ", t.createGame), React.createElement("div", {
      className: "grid grid-cols-2 gap-1.5"
    }, React.createElement("button", {
      onClick: () => onOpenCreator('mygames'),
      className: "min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold btn-press"
    }, "\uD83C\uDF93 ", t.myGames), React.createElement("button", {
      onClick: () => onOpenCreator('bank'),
      className: "min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold btn-press"
    }, "\uD83D\uDCDA ", t.questionBank))) : null
  })))), React.createElement(Section, {
    title: t.party
  }, React.createElement("button", {
    onClick: onOpenParty,
    className: "w-full rounded-2xl p-3.5 text-left bg-white/5 border border-white/10 hover:border-white/30 btn-press"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("div", {
    className: "font-bold"
  }, "\uD83C\uDF89 ", t.managePlayers), React.createElement("div", {
    className: "text-xs text-white/60 truncate"
  }, t.playersAtTable(session.players.length), " \xB7 ", session.history.length, " ", t.games2)), React.createElement("span", {
    className: "text-white/50"
  }, "\u203A")), session.players.length > 0 && React.createElement("div", {
    className: "flex -space-x-2 mt-2.5"
  }, session.players.slice(0, 8).map(p => React.createElement(Avatar, {
    key: p.id,
    player: p,
    size: 28
  })), session.players.length > 8 && React.createElement("span", {
    className: "w-7 h-7 rounded-full bg-white/15 grid place-items-center text-[11px] font-bold"
  }, "+", session.players.length - 8)))), React.createElement(Section, {
    title: `${t.settings} · ${modeLabel}`
  }, React.createElement("div", {
    className: "space-y-4 bg-white/5 rounded-2xl p-4 border border-white/10"
  }, React.createElement(SettingRow, {
    title: `🔊 ${t.sound}`,
    desc: t.soundDesc
  }, React.createElement(Switch, {
    checked: soundOn,
    onChange: setSoundOn,
    label: t.sound
  })), 'vibrate' in navigator && React.createElement(SettingRow, {
    title: `📳 ${t.haptics}`,
    desc: t.hapticsDesc
  }, React.createElement(Switch, {
    checked: haptics,
    onChange: setHaptics,
    label: t.haptics
  })), modeId === 'spinner' && React.createElement("div", {
    className: "space-y-4 rounded-2xl bg-black/15 border border-white/10 p-3"
  }, React.createElement("div", {
    className: "text-[10px] font-bold uppercase tracking-[0.15em] text-white/45"
  }, "\uD83C\uDFAF ", MODE_TEXT[lang].spinner.title), React.createElement(SettingRow, {
    title: `☠️ ${t.eliminate}`,
    desc: t.eliminateDesc
  }, React.createElement(Switch, {
    checked: eliminate,
    onChange: setEliminate,
    label: t.eliminate
  })), React.createElement("div", null, React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, React.createElement("div", {
    className: "font-semibold"
  }, "\u23F1\uFE0F ", t.duration), React.createElement("div", {
    className: "text-xs text-white/80 tabular-nums font-bold"
  }, duration, "s")), React.createElement("input", {
    type: "range",
    min: MIN_DURATION,
    max: MAX_DURATION,
    step: "1",
    value: duration,
    onChange: e => setDuration(Number(e.target.value)),
    "aria-label": t.duration
  }), React.createElement("div", {
    className: "flex justify-between text-[10px] text-white/50 mt-1"
  }, React.createElement("span", null, MIN_DURATION, "s"), React.createElement("span", null, MAX_DURATION, "s")))), modeId === 'quiz' && quizPrefs && !activeCustomId && React.createElement("div", {
    className: "space-y-3 rounded-2xl bg-black/15 border border-white/10 p-3"
  }, React.createElement("div", {
    className: "text-[10px] font-bold uppercase tracking-[0.15em] text-white/45"
  }, "\uD83E\uDDE0 ", MODE_TEXT[lang].quiz.title), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold mb-1.5 text-sm"
  }, t.difficulty), React.createElement("div", {
    className: "grid grid-cols-4 gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, ['all', ...DIFFICULTIES].map(d => React.createElement("button", {
    key: d,
    onClick: () => setQuizPrefs({
      difficulty: d
    }),
    "aria-pressed": quizPrefs.difficulty === d,
    className: `py-1.5 rounded-full text-[11px] font-bold btn-press ${quizPrefs.difficulty === d ? 'bg-white text-slate-900' : 'text-white/70'}`
  }, d === 'all' ? t.allLevels : t.difficultyLabels[d])))), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold mb-1.5 text-sm"
  }, t.questions), React.createElement("div", {
    className: "grid grid-cols-4 gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, [5, 10, 15, 20].map(n => React.createElement("button", {
    key: n,
    onClick: () => setQuizPrefs({
      count: n
    }),
    "aria-pressed": quizPrefs.count === n,
    className: `py-1.5 rounded-full text-xs font-bold btn-press ${quizPrefs.count === n ? 'bg-white text-slate-900' : 'text-white/70'}`
  }, n))))), modeId === 'quiz' && activeCustomId && React.createElement("div", {
    className: "space-y-2 rounded-2xl bg-black/15 border border-white/10 p-3"
  }, React.createElement("div", {
    className: "text-[10px] font-bold uppercase tracking-[0.15em] text-white/45"
  }, "\uD83C\uDF93 ", t.myGames), React.createElement("div", {
    className: "text-[11px] text-white/60"
  }, t.customSettingsHint), React.createElement("div", {
    className: "grid grid-cols-2 gap-1.5"
  }, React.createElement("button", {
    onClick: () => onOpenCreator('editor', activeCustomId),
    className: "min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold btn-press"
  }, "\u270F\uFE0F ", t.editGame), React.createElement("button", {
    onClick: () => onOpenCreator('bank'),
    className: "min-h-[40px] rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold btn-press"
  }, "\uD83D\uDCDA ", t.questionBank))), ['battle', 'king', 'minigames', 'cards'].includes(modeId) && React.createElement("div", {
    className: "rounded-2xl bg-black/15 border border-white/10 p-3 text-[11px] text-white/55"
  }, MODE_TEXT[lang][modeId].title, " \xB7 ", t.setupOnGameScreen), React.createElement("div", null, React.createElement("div", {
    className: "font-semibold mb-2"
  }, "\uD83C\uDF10 ", t.language), React.createElement("div", {
    className: "grid grid-cols-2 gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, LANGS.map(l => React.createElement("button", {
    key: l.key,
    onClick: () => setLang(l.key),
    "aria-pressed": lang === l.key,
    className: `py-1.5 rounded-full text-sm font-semibold btn-press ${lang === l.key ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`
  }, l.label)))), React.createElement("div", {
    className: "border-t border-white/10 pt-4 space-y-3"
  }, React.createElement("button", {
    onClick: onOpenVenue,
    className: "w-full flex items-center justify-between gap-3 text-left btn-press rounded-xl -mx-1 px-1 py-1 hover:bg-white/5"
  }, React.createElement("div", null, React.createElement("div", {
    className: "font-semibold"
  }, "\uD83C\uDFEA ", t.venue), React.createElement("div", {
    className: "text-xs text-white/60"
  }, t.venueMode)), React.createElement("span", {
    className: "flex items-center gap-2"
  }, React.createElement(PlanBadge, {
    plan: "max",
    locked: venueLocked,
    t: t
  }), React.createElement("span", {
    className: "text-white/50"
  }, "\u203A"))), React.createElement(PlanIndicator, {
    t: t,
    sub: sub,
    onOpenPricing: onOpenPricing
  }), React.createElement(DevPlanSwitcher, {
    t: t,
    sub: sub,
    onSet: onDevSetPlan
  })))), React.createElement(Section, {
    title: t.myWheels
  }, React.createElement("div", {
    className: "bg-white/5 rounded-2xl p-3 border border-white/10 space-y-3"
  }, React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("input", {
    value: name,
    onChange: e => setName(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') save();
    },
    placeholder: t.namePlaceholder,
    "aria-label": t.saveCurrent,
    maxLength: 40,
    className: "flex-1 min-w-0 rounded-full px-3.5 py-2 text-sm bg-black/30 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40"
  }), React.createElement("button", {
    onClick: save,
    disabled: !name.trim() || !canSave,
    className: "px-4 rounded-full bg-white text-slate-900 text-sm font-bold btn-press disabled:opacity-40"
  }, t.save)), lists.length === 0 ? React.createElement("div", {
    className: "text-xs text-white/50 text-center py-1"
  }, t.noWheels) : React.createElement("ul", {
    className: "space-y-1.5"
  }, lists.map(l => React.createElement("li", {
    key: l.id,
    className: "flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2"
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, THEMES[l.theme] ? THEMES[l.theme].icon : '🎯'), React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("div", {
    className: "text-sm font-semibold truncate"
  }, l.name), React.createElement("div", {
    className: "text-[11px] text-white/50 truncate"
  }, t.itemsShort(l.items.length), " \xB7 ", l.items.slice(0, 3).join(', '))), React.createElement("button", {
    onClick: () => onLoadList(l.id),
    className: "text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 btn-press"
  }, t.load), React.createElement("button", {
    onClick: () => onDeleteList(l.id),
    "aria-label": `${t.del} ${l.name}`,
    className: "w-7 h-7 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10"
  }, React.createElement(Icon.X, null))))))), React.createElement(Section, {
    title: `${t.history} · ${hist.label}`,
    right: hist.count > 0 && React.createElement("button", {
      onClick: () => onClearHistory(currentGame),
      className: "text-xs text-white/60 hover:text-white"
    }, t.clearHistory)
  }, React.createElement("div", {
    className: "bg-white/5 rounded-2xl p-3 border border-white/10 space-y-3"
  }, hist.count === 0 ? React.createElement("div", {
    className: "text-xs text-white/50 text-center py-2"
  }, t.noHistoryHere) : React.createElement(React.Fragment, null, hist.top.length > 0 && React.createElement("div", null, React.createElement("div", {
    className: "flex items-center justify-between text-[11px] text-white/55 mb-2"
  }, React.createElement("span", null, hist.isSpin ? t.topPicks : t.mostWins), React.createElement("span", null, hist.isSpin ? t.totalSpins(hist.count) : `${hist.count} ${hist.count === 1 ? t.game1 : t.games2}`)), React.createElement("div", {
    className: "space-y-1.5"
  }, hist.top.map(([label, count]) => React.createElement("div", {
    key: label,
    className: "flex items-center gap-2 text-xs"
  }, React.createElement("span", {
    className: "w-24 truncate font-medium",
    title: label
  }, label), React.createElement("div", {
    className: "flex-1 h-2 rounded-full bg-white/10 overflow-hidden"
  }, React.createElement("div", {
    className: "h-full rounded-full bg-gradient-to-r from-yellow-300 to-pink-400",
    style: {
      width: `${count / hist.maxCount * 100}%`
    }
  })), React.createElement("span", {
    className: "w-5 text-right tabular-nums text-white/70"
  }, count))))), React.createElement("ul", {
    className: `space-y-1.5 pt-3 max-h-60 overflow-y-auto sb-thin ${hist.top.length ? 'border-t border-white/10' : ''}`
  }, hist.isSpin ? hist.spins.slice(0, 20).map((h, idx) => React.createElement("li", {
    key: idx,
    className: "flex items-center justify-between text-sm gap-2"
  }, React.createElement("span", {
    className: "flex items-center gap-2 min-w-0"
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, hist.icon), React.createElement("span", {
    className: "font-medium truncate"
  }, h.winner)), React.createElement("span", {
    className: "text-[10px] text-white/50 shrink-0"
  }, h.ts ? fmtAgo(h.ts, lang) : h.when))) : hist.games.slice(0, 20).map(h => React.createElement("li", {
    key: h.id,
    className: "flex items-center justify-between text-sm gap-2"
  }, React.createElement("span", {
    className: "flex items-center gap-2 min-w-0"
  }, React.createElement("span", {
    "aria-hidden": "true"
  }, hist.icon), React.createElement("span", {
    className: "font-medium truncate"
  }, h.summary || (h.winnerNames || []).join(', '))), React.createElement("span", {
    className: "text-[10px] text-white/50 shrink-0"
  }, fmtAgo(h.ts, lang)))))))), React.createElement(Section, {
    title: t.shortcuts
  }, React.createElement("div", {
    className: "bg-white/5 rounded-2xl p-3 border border-white/10 text-sm space-y-2"
  }, React.createElement("div", {
    className: "flex justify-between"
  }, React.createElement("span", {
    className: "text-white/75"
  }, t.scSpin), React.createElement("span", null, React.createElement(Kbd, null, "Space"), " / ", React.createElement(Kbd, null, "Enter"))), React.createElement("div", {
    className: "flex justify-between"
  }, React.createElement("span", {
    className: "text-white/75"
  }, t.scParty), React.createElement(Kbd, null, "F")), React.createElement("div", {
    className: "flex justify-between"
  }, React.createElement("span", {
    className: "text-white/75"
  }, t.scMute), React.createElement(Kbd, null, "M")), React.createElement("div", {
    className: "flex justify-between"
  }, React.createElement("span", {
    className: "text-white/75"
  }, t.scClose), React.createElement(Kbd, null, "Esc")))), React.createElement("footer", {
    className: "pt-4 text-center border-t border-white/10",
    style: {
      paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))'
    }
  }, React.createElement("div", {
    className: "inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5"
  }, React.createElement("span", {
    className: "text-[11px] text-white/50"
  }, t.poweredBy), React.createElement("span", {
    className: "jj-badge font-black text-base tracking-widest leading-none"
  }, "JJ"), React.createElement("span", {
    className: "text-sm leading-none",
    "aria-hidden": "true"
  }, "\u26A1")), React.createElement("div", {
    className: "text-[10px] text-white/35 mt-2"
  }, "v", APP_VERSION, " \u2014 made for parties \uD83C\uDF89")))));
}

/* ==== js/components/creator.js ==== */
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DIFF_COLORS = {
  easy: '#4ade80',
  medium: '#facc15',
  hard: '#f87171'
};
const TIMER_CHOICES = [0, 10, 20, 30, 60];
function BiInput({
  value,
  onChange,
  placeholder,
  lang,
  error,
  textarea
}) {
  const [showVi, setShowVi] = useState(!!(value && value.vi));
  const Tag = textarea ? 'textarea' : 'input';
  return React.createElement("div", {
    className: "space-y-1.5"
  }, React.createElement("div", {
    className: "relative"
  }, React.createElement(Tag, {
    value: value.en,
    rows: textarea ? 2 : undefined,
    onChange: e => onChange({
      ...value,
      en: e.target.value
    }),
    placeholder: placeholder,
    className: `${inputCls} ${error ? errCls : ''} pr-12`
  }), React.createElement("span", {
    className: "absolute right-3 top-2.5 text-[10px] font-black text-white/35"
  }, "EN")), showVi ? React.createElement("div", {
    className: "relative"
  }, React.createElement(Tag, {
    value: value.vi,
    rows: textarea ? 2 : undefined,
    onChange: e => onChange({
      ...value,
      vi: e.target.value
    }),
    placeholder: placeholder,
    className: `${inputCls} pr-12`
  }), React.createElement("span", {
    className: "absolute right-3 top-2.5 text-[10px] font-black text-white/35"
  }, "VI")) : React.createElement("button", {
    onClick: () => setShowVi(true),
    className: "text-[11px] font-bold text-white/50 hover:text-white"
  }, "+ Ti\u1EBFng Vi\u1EC7t"));
}
function ImagePicker({
  t,
  imageId,
  onChange,
  compact
}) {
  const fileRef = useRef(null);
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let on = true;
    ContentStore.imageUrl(imageId).then(u => on && setUrl(u));
    return () => {
      on = false;
    };
  }, [imageId]);
  const pick = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await ContentStore.putImage(file, t.imageErrors);
      if (imageId) await ContentStore.deleteImage(imageId);
      onChange(id);
    } catch (ex) {
      setErr(ex.message);
    }
    setBusy(false);
  };
  const clear = async () => {
    if (imageId) await ContentStore.deleteImage(imageId);
    onChange(null);
  };
  return React.createElement("div", {
    className: compact ? '' : 'space-y-2'
  }, React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/png,image/jpeg,image/webp,image/gif",
    onChange: pick,
    className: "hidden"
  }), url ? React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("img", {
    src: url,
    alt: "",
    className: `${compact ? 'h-10 w-10' : 'h-24'} rounded-xl object-cover border border-white/20`
  }), React.createElement("button", {
    onClick: () => fileRef.current.click(),
    className: "text-xs font-bold px-2.5 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press"
  }, t.replaceImage), React.createElement("button", {
    onClick: clear,
    "aria-label": t.removeImage,
    className: "w-8 h-8 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10"
  }, React.createElement(Icon.X, null))) : React.createElement("button", {
    onClick: () => fileRef.current.click(),
    disabled: busy,
    className: `${compact ? 'w-10 h-10 text-base' : 'w-full py-3'} grid place-items-center rounded-xl border border-dashed border-white/25 hover:border-white/50 hover:bg-white/5 btn-press text-sm font-bold disabled:opacity-50`
  }, busy ? '…' : compact ? '🖼️' : `🖼️ ${t.uploadImage}`), err && React.createElement("div", {
    className: "text-[11px] text-red-300"
  }, "\u26A0 ", err));
}
const validateQuestion = (q, t) => {
  const e = {};
  if (!q.text.en.trim()) e.text = t.vQuestionText;
  if (q.type === 'mc') {
    const filled = q.options.filter(o => o.text.en.trim() || o.imageId);
    if (filled.length < 2) e.options = t.vTwoOptions;
    if (!q.options[q.answer] || !(q.options[q.answer].text.en.trim() || q.options[q.answer].imageId)) e.answer = t.vCorrectAnswer;
  }
  return e;
};
const validateGame = (g, t) => {
  const e = {};
  if (!g.title.en.trim()) e.title = t.vGameTitle;
  if (!g.questionIds.length) e.questions = t.vNoQuestions;
  return e;
};
function QuestionEditor({
  t,
  lang,
  question,
  onSave,
  onCancel,
  onSaveAndNext
}) {
  const [q, setQ] = useState(() => question || createQuestion());
  const [errors, setErrors] = useState({});
  const set = patch => setQ(prev => ({
    ...prev,
    ...patch
  }));
  const setOption = (i, patch) => setQ(prev => ({
    ...prev,
    options: prev.options.map((o, k) => k === i ? {
      ...o,
      ...patch
    } : o)
  }));
  const setType = type => setQ(prev => ({
    ...prev,
    type,
    options: type === 'tf' ? [{
      text: {
        en: 'True',
        vi: 'Đúng'
      },
      imageId: null
    }, {
      text: {
        en: 'False',
        vi: 'Sai'
      },
      imageId: null
    }] : prev.options.length >= 2 ? prev.options : [{
      text: BI(),
      imageId: null
    }, {
      text: BI(),
      imageId: null
    }],
    answer: 0
  }));
  const submit = next => {
    const e = validateQuestion(q, t);
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = {
      ...q,
      options: q.type === 'tf' ? q.options.slice(0, 2) : q.options.filter(o => o.text.en.trim() || o.imageId)
    };
    if (clean.answer >= clean.options.length) clean.answer = 0;
    (next ? onSaveAndNext : onSave)(clean);
  };
  return React.createElement("div", {
    className: "space-y-4"
  }, React.createElement(Field, {
    label: t.questionText,
    error: errors.text
  }, React.createElement(BiInput, {
    value: q.text,
    onChange: text => set({
      text
    }),
    placeholder: t.questionPlaceholder,
    lang: lang,
    error: errors.text,
    textarea: true
  })), React.createElement(Field, {
    label: t.optionalImage
  }, React.createElement(ImagePicker, {
    t: t,
    imageId: q.imageId,
    onChange: imageId => set({
      imageId
    })
  })), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement(Field, {
    label: t.questionType
  }, React.createElement("div", {
    className: "grid grid-cols-2 gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, ['mc', 'tf'].map(ty => React.createElement("button", {
    key: ty,
    onClick: () => setType(ty),
    "aria-pressed": q.type === ty,
    className: `py-1.5 rounded-full text-xs font-bold btn-press ${q.type === ty ? 'bg-white text-slate-900' : 'text-white/70'}`
  }, ty === 'mc' ? t.typeMC : t.typeTF)))), React.createElement(Field, {
    label: t.difficulty
  }, React.createElement("div", {
    className: "grid grid-cols-3 gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, DIFFICULTIES.map(d => React.createElement("button", {
    key: d,
    onClick: () => set({
      difficulty: d
    }),
    "aria-pressed": q.difficulty === d,
    className: `py-1.5 rounded-full text-[11px] font-bold btn-press ${q.difficulty === d ? 'text-slate-900' : 'text-white/70'}`,
    style: q.difficulty === d ? {
      background: DIFF_COLORS[d]
    } : undefined
  }, t.difficultyLabels[d]))))), React.createElement(Field, {
    label: t.answerOptions,
    hint: q.type === 'mc' ? t.tapToMarkCorrect : '',
    error: errors.options || errors.answer
  }, React.createElement("div", {
    className: "space-y-2"
  }, q.options.map((o, i) => React.createElement("div", {
    key: i,
    className: `flex items-center gap-2 rounded-2xl p-2 border ${q.answer === i ? 'border-green-300/60 bg-green-500/10' : 'border-white/10 bg-black/15'}`
  }, React.createElement("button", {
    onClick: () => set({
      answer: i
    }),
    "aria-label": t.markCorrect,
    "aria-pressed": q.answer === i,
    className: `w-8 h-8 shrink-0 rounded-full grid place-items-center text-sm font-black btn-press ${q.answer === i ? 'bg-green-400 text-slate-900' : 'border border-white/25 text-white/50'}`
  }, q.answer === i ? '✓' : 'ABCDEF'[i]), q.type === 'tf' ? React.createElement("span", {
    className: "flex-1 font-bold px-2"
  }, L(o.text, lang)) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement(BiInput, {
    value: o.text,
    onChange: text => setOption(i, {
      text
    }),
    placeholder: `${t.option} ${'ABCDEF'[i]}`,
    lang: lang
  })), React.createElement(ImagePicker, {
    t: t,
    imageId: o.imageId,
    onChange: imageId => setOption(i, {
      imageId
    }),
    compact: true
  }), q.options.length > 2 && React.createElement("button", {
    onClick: () => setQ(p => ({
      ...p,
      options: p.options.filter((_, k) => k !== i),
      answer: p.answer > i ? p.answer - 1 : p.answer === i ? 0 : p.answer
    })),
    "aria-label": t.del,
    className: "w-8 h-8 shrink-0 grid place-items-center rounded-full text-white/40 hover:text-white hover:bg-white/10"
  }, React.createElement(Icon.X, null))))), q.type === 'mc' && q.options.length < 6 && React.createElement("button", {
    onClick: () => setQ(p => ({
      ...p,
      options: [...p.options, {
        text: BI(),
        imageId: null
      }]
    })),
    className: "w-full py-2 rounded-2xl border border-dashed border-white/25 hover:border-white/50 text-sm font-bold btn-press"
  }, "+ ", t.addOption))), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement(Field, {
    label: t.topic
  }, React.createElement("input", {
    list: "jp-topics",
    value: q.topic,
    onChange: e => set({
      topic: e.target.value
    }),
    className: inputCls,
    placeholder: "science"
  })), React.createElement(Field, {
    label: t.timeOverride,
    hint: t.optional
  }, React.createElement("select", {
    value: q.timeSec == null ? '' : q.timeSec,
    onChange: e => set({
      timeSec: e.target.value === '' ? null : Number(e.target.value)
    }),
    className: inputCls
  }, React.createElement("option", {
    value: ""
  }, t.useGameDefault), TIMER_CHOICES.map(n => React.createElement("option", {
    key: n,
    value: n
  }, n === 0 ? t.noTimeLimit : `${n}s`))))), React.createElement(Field, {
    label: t.explanation,
    hint: t.optional
  }, React.createElement(BiInput, {
    value: q.explanation,
    onChange: explanation => set({
      explanation
    }),
    placeholder: t.explanationPlaceholder,
    lang: lang,
    textarea: true
  })), React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-2 pt-1"
  }, React.createElement("button", {
    onClick: () => submit(false),
    className: "flex-1 py-3 rounded-full font-extrabold btn-press text-white shadow-lg",
    style: {
      background: 'linear-gradient(90deg, #a78bfa, #f472b6)'
    }
  }, "\uD83D\uDCBE ", t.saveQuestion), onSaveAndNext && React.createElement("button", {
    onClick: () => submit(true),
    className: "flex-1 py-3 rounded-full font-bold bg-white/10 hover:bg-white/20 border border-white/15 btn-press"
  }, t.saveAndAddAnother), React.createElement("button", {
    onClick: onCancel,
    className: "py-3 px-5 rounded-full text-white/60 hover:text-white text-sm"
  }, t.cancel)));
}
function QuestionRow({
  t,
  lang,
  q,
  selected,
  onToggle,
  onEdit,
  onDelete,
  dragHandlers,
  index
}) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let on = true;
    ContentStore.imageUrl(q.imageId).then(u => on && setUrl(u));
    return () => {
      on = false;
    };
  }, [q.imageId]);
  return React.createElement("li", _extends({}, dragHandlers || {}, {
    className: `flex items-center gap-2.5 rounded-2xl p-2.5 border transition-colors ${selected ? 'bg-white/12 border-white/35' : 'bg-black/20 border-white/10'}`
  }), index != null && React.createElement("span", {
    className: "w-6 shrink-0 text-center text-xs font-black text-white/40 cursor-grab"
  }, "\u283F"), onToggle && React.createElement("button", {
    onClick: () => onToggle(q),
    "aria-pressed": !!selected,
    "aria-label": t.select,
    className: `w-7 h-7 shrink-0 rounded-lg grid place-items-center text-xs font-black btn-press ${selected ? 'bg-white text-slate-900' : 'border border-white/25 text-white/40'}`
  }, selected ? '✓' : ''), url && React.createElement("img", {
    src: url,
    alt: "",
    className: "w-10 h-10 rounded-lg object-cover border border-white/15 shrink-0"
  }), React.createElement("div", {
    className: "flex-1 min-w-0"
  }, React.createElement("div", {
    className: "text-sm font-semibold truncate"
  }, L(q.text, lang) || t.untitled), React.createElement("div", {
    className: "flex items-center gap-1.5 mt-0.5 text-[10px] text-white/50"
  }, React.createElement("span", {
    className: "px-1.5 py-0.5 rounded font-bold",
    style: {
      background: `${DIFF_COLORS[q.difficulty]}33`,
      color: DIFF_COLORS[q.difficulty]
    }
  }, t.difficultyLabels[q.difficulty]), React.createElement("span", {
    className: "px-1.5 py-0.5 rounded bg-white/10"
  }, q.type === 'tf' ? t.typeTF : t.typeMC), q.topic && React.createElement("span", {
    className: "truncate"
  }, "#", q.topic), q.timeSec != null && React.createElement("span", null, "\u23F1", q.timeSec === 0 ? '∞' : `${q.timeSec}s`))), onEdit && React.createElement("button", {
    onClick: () => onEdit(q),
    "aria-label": t.edit,
    className: "w-8 h-8 shrink-0 grid place-items-center rounded-full hover:bg-white/10 text-white/60 hover:text-white"
  }, "\u270F\uFE0F"), onDelete && React.createElement("button", {
    onClick: () => onDelete(q),
    "aria-label": t.del,
    className: "w-8 h-8 shrink-0 grid place-items-center rounded-full hover:bg-white/10 text-white/40 hover:text-white"
  }, React.createElement(Icon.X, null)));
}
function QuestionBankView({
  t,
  lang,
  sfx,
  showToast,
  onBack,
  onChanged
}) {
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('all');
  const [diff, setDiff] = useState('all');
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setQuestions(await ContentStore.listQuestions());
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);
  const save = async q => {
    await ContentStore.saveQuestion(q);
    sfx('click');
    showToast(t.questionSaved);
    await reload();
    await onChanged();
    return true;
  };
  const remove = async q => {
    await ContentStore.deleteQuestion(q.id);
    showToast(t.questionDeleted);
    await reload();
    await onChanged();
  };
  const seed = async themeId => {
    const n = await ContentStore.importFromTheme(themeId, 10);
    showToast(t.importedN(n));
    await reload();
    await onChanged();
  };
  const topics = useMemo(() => topicsOf(questions), [questions]);
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions.filter(q => (topic === 'all' || q.topic === topic) && (diff === 'all' || q.difficulty === diff)).filter(q => !s || `${q.text.en} ${q.text.vi} ${q.topic} ${(q.tags || []).join(' ')}`.toLowerCase().includes(s)).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [questions, search, topic, diff]);
  if (editing) {
    return React.createElement("section", {
      className: "w-full max-w-2xl space-y-4"
    }, React.createElement("div", {
      className: "flex items-center gap-2"
    }, React.createElement("button", {
      onClick: () => setEditing(null),
      className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
    }, "\u2190"), React.createElement("h2", {
      className: "text-xl font-black"
    }, editing === 'new' ? t.newQuestion : t.editQuestion)), React.createElement("div", {
      className: "glass rounded-3xl p-4 sm:p-6"
    }, React.createElement(QuestionEditor, {
      t: t,
      lang: lang,
      question: editing === 'new' ? null : editing,
      onSave: async q => {
        if (await save(q)) setEditing(null);
      },
      onSaveAndNext: async q => {
        if (await save(q)) setEditing('new');
      },
      onCancel: () => setEditing(null)
    })));
  }
  return React.createElement("section", {
    className: "w-full max-w-2xl space-y-4"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: onBack,
    className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\u2190"), React.createElement("h2", {
    className: "text-2xl font-black flex-1"
  }, "\uD83D\uDCDA ", t.questionBank), React.createElement("button", {
    onClick: () => setEditing('new'),
    className: "px-4 py-2 rounded-full font-extrabold btn-press text-white shadow-lg text-sm",
    style: {
      background: 'linear-gradient(90deg, #a78bfa, #f472b6)'
    }
  }, "+ ", t.newQuestion)), React.createElement("div", {
    className: "glass rounded-3xl p-4 space-y-3"
  }, React.createElement("input", {
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: `🔍 ${t.searchQuestions}`,
    className: inputCls
  }), React.createElement("div", {
    className: "flex gap-2 overflow-x-auto sb-thin pb-1"
  }, React.createElement("select", {
    value: topic,
    onChange: e => setTopic(e.target.value),
    className: "rounded-full px-3 py-1.5 text-sm bg-black/25 border border-white/15 shrink-0"
  }, React.createElement("option", {
    value: "all"
  }, t.allTopics), topics.map(x => React.createElement("option", {
    key: x,
    value: x
  }, x))), React.createElement("select", {
    value: diff,
    onChange: e => setDiff(e.target.value),
    className: "rounded-full px-3 py-1.5 text-sm bg-black/25 border border-white/15 shrink-0"
  }, React.createElement("option", {
    value: "all"
  }, t.allLevels), DIFFICULTIES.map(d => React.createElement("option", {
    key: d,
    value: d
  }, t.difficultyLabels[d]))), React.createElement("span", {
    className: "text-xs text-white/50 self-center whitespace-nowrap ml-auto"
  }, t.nOfM(shown.length, questions.length)))), React.createElement("div", {
    className: "glass rounded-3xl p-4"
  }, loading ? React.createElement("div", {
    className: "text-center text-white/50 py-6"
  }, "\u2026") : questions.length === 0 ? React.createElement("div", {
    className: "text-center py-6 space-y-3"
  }, React.createElement("div", {
    className: "text-5xl"
  }, "\uD83D\uDCDA"), React.createElement("div", {
    className: "text-sm text-white/70"
  }, t.bankEmpty), React.createElement("div", {
    className: "flex flex-wrap justify-center gap-2"
  }, React.createElement("button", {
    onClick: () => setEditing('new'),
    className: "px-4 py-2 rounded-full bg-white text-slate-900 font-bold btn-press text-sm"
  }, "+ ", t.newQuestion), QUIZ_THEMES.filter(th => !th.custom).slice(0, 4).map(th => React.createElement("button", {
    key: th.id,
    onClick: () => seed(th.id),
    className: "px-3 py-2 rounded-full bg-white/10 border border-white/15 font-bold btn-press text-sm"
  }, th.icon, " ", t.import10(L(th.title, lang)))))) : shown.length === 0 ? React.createElement("div", {
    className: "text-center text-white/55 py-6 text-sm"
  }, t.noMatches) : React.createElement("ul", {
    className: "space-y-1.5 max-h-[55vh] overflow-y-auto sb-thin pr-1"
  }, shown.map(q => React.createElement(QuestionRow, {
    key: q.id,
    t: t,
    lang: lang,
    q: q,
    onEdit: setEditing,
    onDelete: remove
  })))), React.createElement("datalist", {
    id: "jp-topics"
  }, topics.map(x => React.createElement("option", {
    key: x,
    value: x
  }))));
}
function GameEditorView({
  t,
  lang,
  gameId,
  sfx,
  showToast,
  onBack,
  onChanged,
  onPlay
}) {
  const [game, setGame] = useState(null);
  const [bank, setBank] = useState([]);
  const [tab, setTab] = useState('questions');
  const [picker, setPicker] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [errors, setErrors] = useState({});
  const [dragFrom, setDragFrom] = useState(null);
  const reloadBank = async () => setBank(await ContentStore.listQuestions());
  useEffect(() => {
    (async () => {
      const g = gameId ? await ContentStore.getGame(gameId) : null;
      setGame(g || createGame());
      await reloadBank();
    })();
  }, [gameId]);
  if (!game) return React.createElement("div", {
    className: "text-white/50 py-10"
  }, "\u2026");
  const set = patch => setGame(g => ({
    ...g,
    ...patch
  }));
  const setCfg = patch => setGame(g => ({
    ...g,
    config: {
      ...g.config,
      ...patch
    }
  }));
  const byId = new Map(bank.map(q => [q.id, q]));
  const chosen = game.questionIds.map(id => byId.get(id)).filter(Boolean);
  const persist = async (extra = {}) => {
    const next = {
      ...game,
      ...extra
    };
    const e = validateGame(next, t);
    setErrors(e);
    if (Object.keys(e).length) {
      setTab(e.title ? 'settings' : 'questions');
      return null;
    }
    const saved = await ContentStore.saveGame(next);
    setGame(saved);
    await onChanged();
    sfx('click');
    showToast(t.gameSaved);
    return saved;
  };
  const toggleQ = q => set({
    questionIds: game.questionIds.includes(q.id) ? game.questionIds.filter(x => x !== q.id) : [...game.questionIds, q.id]
  });
  const move = (from, to) => {
    if (from === to || to < 0 || to >= game.questionIds.length) return;
    const ids = [...game.questionIds];
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    set({
      questionIds: ids
    });
  };
  if (editingQ) {
    return React.createElement("section", {
      className: "w-full max-w-2xl space-y-4"
    }, React.createElement("div", {
      className: "flex items-center gap-2"
    }, React.createElement("button", {
      onClick: () => setEditingQ(null),
      className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
    }, "\u2190"), React.createElement("h2", {
      className: "text-xl font-black"
    }, editingQ === 'new' ? t.newQuestion : t.editQuestion)), React.createElement("div", {
      className: "glass rounded-3xl p-4 sm:p-6"
    }, React.createElement(QuestionEditor, {
      t: t,
      lang: lang,
      question: editingQ === 'new' ? null : editingQ,
      onSave: async q => {
        const saved = await ContentStore.saveQuestion(q);
        await reloadBank();
        await onChanged();
        if (!game.questionIds.includes(saved.id)) set({
          questionIds: [...game.questionIds, saved.id]
        });
        setEditingQ(null);
        showToast(t.questionSaved);
      },
      onSaveAndNext: async q => {
        const saved = await ContentStore.saveQuestion(q);
        await reloadBank();
        await onChanged();
        if (!game.questionIds.includes(saved.id)) set({
          questionIds: [...game.questionIds, saved.id]
        });
        setEditingQ('new');
        showToast(t.questionSaved);
      },
      onCancel: () => setEditingQ(null)
    })));
  }
  const tabs = [['questions', `📝 ${t.questions} (${chosen.length})`], ['settings', `⚙️ ${t.gameSettings}`], ['preview', `👁 ${t.preview}`]];
  return React.createElement("section", {
    className: "w-full max-w-2xl space-y-4"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: onBack,
    className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\u2190"), React.createElement("h2", {
    className: "text-2xl font-black flex-1 truncate"
  }, gameId ? t.editGame : t.createGame)), React.createElement("div", {
    className: "glass rounded-3xl p-4 space-y-3"
  }, React.createElement(Field, {
    label: t.gameTitle,
    error: errors.title
  }, React.createElement(BiInput, {
    value: game.title,
    onChange: title => set({
      title
    }),
    placeholder: t.gameTitlePlaceholder,
    lang: lang,
    error: errors.title
  })), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("div", {
    className: "w-20"
  }, React.createElement(Field, {
    label: t.icon
  }, React.createElement("input", {
    value: game.icon,
    onChange: e => set({
      icon: [...e.target.value][0] || '🎓'
    }),
    className: `${inputCls} text-center text-xl`,
    maxLength: 4
  }))), React.createElement("div", {
    className: "flex-1"
  }, React.createElement(Field, {
    label: t.description,
    hint: t.optional
  }, React.createElement(BiInput, {
    value: game.description,
    onChange: description => set({
      description
    }),
    placeholder: t.descriptionPlaceholder,
    lang: lang
  }))))), React.createElement("div", {
    className: "flex gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, tabs.map(([k, label]) => React.createElement("button", {
    key: k,
    onClick: () => setTab(k),
    "aria-pressed": tab === k,
    className: `flex-1 py-2 rounded-full text-xs sm:text-sm font-bold btn-press truncate ${tab === k ? 'bg-white text-slate-900' : 'text-white/70'}`
  }, label))), tab === 'questions' && React.createElement("div", {
    className: "glass rounded-3xl p-4 space-y-3"
  }, React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("button", {
    onClick: () => setEditingQ('new'),
    className: "flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm"
  }, "+ ", t.newQuestion), React.createElement("button", {
    onClick: () => setPicker(!picker),
    className: `flex-1 py-2.5 rounded-2xl border font-bold btn-press text-sm ${picker ? 'bg-white text-slate-900 border-white' : 'bg-white/10 hover:bg-white/20 border-white/15'}`
  }, "\uD83D\uDCDA ", t.fromBank)), picker && React.createElement("div", {
    className: "rounded-2xl border border-white/15 bg-black/20 p-3 space-y-2"
  }, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wider text-white/55"
  }, t.pickFromBank), bank.length === 0 ? React.createElement("div", {
    className: "text-sm text-white/55 text-center py-3"
  }, t.bankEmpty) : React.createElement("ul", {
    className: "space-y-1.5 max-h-64 overflow-y-auto sb-thin pr-1"
  }, bank.map(q => React.createElement(QuestionRow, {
    key: q.id,
    t: t,
    lang: lang,
    q: q,
    selected: game.questionIds.includes(q.id),
    onToggle: toggleQ
  })))), errors.questions && React.createElement("div", {
    className: "text-[11px] text-red-300"
  }, "\u26A0 ", errors.questions), chosen.length === 0 ? React.createElement("div", {
    className: "text-center text-white/55 py-6 text-sm border border-dashed border-white/20 rounded-2xl"
  }, t.noQuestionsYet) : React.createElement("ul", {
    className: "space-y-1.5"
  }, chosen.map((q, i) => React.createElement(QuestionRow, {
    key: q.id,
    t: t,
    lang: lang,
    q: q,
    index: i,
    onEdit: setEditingQ,
    onDelete: () => set({
      questionIds: game.questionIds.filter(x => x !== q.id)
    }),
    dragHandlers: {
      draggable: true,
      onDragStart: () => setDragFrom(i),
      onDragOver: e => e.preventDefault(),
      onDrop: () => {
        move(dragFrom, i);
        setDragFrom(null);
      }
    }
  }))), chosen.length > 1 && React.createElement("div", {
    className: "text-[11px] text-white/40 text-center"
  }, t.dragToReorder)), tab === 'settings' && React.createElement("div", {
    className: "glass rounded-3xl p-4 space-y-4"
  }, React.createElement(Field, {
    label: t.timePerQuestion,
    hint: t.questionsCanOverride
  }, React.createElement("div", {
    className: "grid grid-cols-5 gap-1 p-1 rounded-full bg-black/30 border border-white/10"
  }, TIMER_CHOICES.map(n => React.createElement("button", {
    key: n,
    onClick: () => setCfg({
      timerSec: n
    }),
    "aria-pressed": game.config.timerSec === n,
    className: `py-2 rounded-full text-xs font-bold btn-press ${game.config.timerSec === n ? 'bg-white text-slate-900' : 'text-white/70'}`
  }, n === 0 ? '∞' : `${n}s`)))), React.createElement(OptionPills, {
    label: t.teamsLabel,
    value: game.config.teams,
    onChange: v => setCfg({
      teams: v
    }),
    options: [{
      value: 0,
      label: t.individual
    }, {
      value: 2,
      label: '2'
    }, {
      value: 3,
      label: '3'
    }, {
      value: 4,
      label: '4'
    }]
  }), React.createElement("div", {
    className: "space-y-3 border-t border-white/10 pt-4"
  }, [['randomizeQuestions', t.randomQuestionOrder], ['randomizeAnswers', t.randomAnswerOrder], ['noRepeat', t.noRepeatQuestions]].map(([k, label]) => React.createElement("div", {
    key: k,
    className: "flex items-center justify-between gap-3"
  }, React.createElement("span", {
    className: "text-sm font-semibold"
  }, label), React.createElement(Switch, {
    checked: game.config[k],
    onChange: v => setCfg({
      [k]: v
    }),
    label: label
  })))), React.createElement("div", {
    className: "grid grid-cols-2 gap-3 border-t border-white/10 pt-4"
  }, React.createElement(Field, {
    label: t.pointsPerQuestion
  }, React.createElement("input", {
    type: "number",
    min: "0",
    max: "1000",
    step: "10",
    value: game.config.pointsBase,
    onChange: e => setCfg({
      pointsBase: clamp(Number(e.target.value) || 0, 0, 1000)
    }),
    className: inputCls
  })), React.createElement(Field, {
    label: t.speedBonusLabel,
    hint: t.zeroToDisable
  }, React.createElement("input", {
    type: "number",
    min: "0",
    max: "500",
    step: "10",
    value: game.config.speedBonus,
    onChange: e => setCfg({
      speedBonus: clamp(Number(e.target.value) || 0, 0, 500)
    }),
    className: inputCls
  })))), tab === 'preview' && React.createElement("div", {
    className: "glass rounded-3xl p-4 space-y-3"
  }, chosen.length === 0 ? React.createElement("div", {
    className: "text-center text-white/55 py-6 text-sm"
  }, t.noQuestionsYet) : React.createElement("ol", {
    className: "space-y-3 max-h-[55vh] overflow-y-auto sb-thin pr-1"
  }, chosen.map((q, i) => React.createElement("li", {
    key: q.id,
    className: "rounded-2xl bg-black/25 border border-white/10 p-3"
  }, React.createElement("div", {
    className: "text-[11px] text-white/45 mb-1"
  }, t.question, " ", i + 1, " \xB7 ", t.difficultyLabels[q.difficulty], " \xB7 \u23F1 ", q.timeSec == null ? game.config.timerSec === 0 ? '∞' : `${game.config.timerSec}s` : q.timeSec === 0 ? '∞' : `${q.timeSec}s`), React.createElement("div", {
    className: "font-bold"
  }, L(q.text, lang)), React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-1.5 mt-2"
  }, q.options.map((o, k) => React.createElement("div", {
    key: k,
    className: `text-sm rounded-xl px-2.5 py-1.5 border ${k === q.answer ? 'bg-green-500/20 border-green-300/50' : 'bg-white/5 border-white/10'}`
  }, 'ABCDEF'[k], ". ", L(o.text, lang), " ", k === q.answer && '✓'))))))), React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-2"
  }, React.createElement("button", {
    onClick: () => persist(),
    className: "flex-1 py-3.5 rounded-full font-extrabold text-lg btn-press text-white shadow-lg",
    style: {
      background: 'linear-gradient(90deg, #a78bfa, #f472b6)'
    }
  }, "\uD83D\uDCBE ", t.saveGame), React.createElement("button", {
    onClick: async () => {
      const g = await persist();
      if (g) onPlay(g);
    },
    className: "flex-1 py-3.5 rounded-full font-bold bg-white/10 hover:bg-white/20 border border-white/15 btn-press"
  }, "\u25B6 ", t.saveAndPlay)));
}
function MyGamesView({
  t,
  lang,
  sfx,
  showToast,
  onBack,
  onCreate,
  onEdit,
  onPlay,
  onOpenBank,
  onChanged
}) {
  const [games, setGames] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);
  const reload = async () => {
    const gs = await ContentStore.listGames();
    const qs = await ContentStore.listQuestions();
    const ids = new Set(qs.map(q => q.id));
    setCounts(Object.fromEntries(gs.map(g => [g.id, g.questionIds.filter(x => ids.has(x)).length])));
    setGames(gs.sort((a, b) => b.updatedAt - a.updatedAt));
    setLoading(false);
  };
  useEffect(() => {
    reload();
  }, []);
  const duplicate = async g => {
    await ContentStore.duplicateGame(g.id, t.copySuffix);
    sfx('click');
    showToast(t.gameDuplicated);
    await reload();
    await onChanged();
  };
  const remove = async g => {
    await ContentStore.deleteGame(g.id);
    setConfirmDel(null);
    showToast(t.gameDeleted);
    await reload();
    await onChanged();
  };
  return React.createElement("section", {
    className: "w-full max-w-2xl space-y-4"
  }, React.createElement("div", {
    className: "flex items-center gap-2 flex-wrap"
  }, React.createElement("button", {
    onClick: onBack,
    className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\u2190"), React.createElement("h2", {
    className: "text-2xl font-black flex-1"
  }, "\uD83C\uDF93 ", t.myGames), React.createElement("button", {
    onClick: onOpenBank,
    className: "px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm"
  }, "\uD83D\uDCDA ", t.questionBank), React.createElement("button", {
    onClick: onCreate,
    className: "px-4 py-2 rounded-full font-extrabold btn-press text-white shadow-lg text-sm",
    style: {
      background: 'linear-gradient(90deg, #a78bfa, #f472b6)'
    }
  }, "+ ", t.createGame)), loading ? React.createElement("div", {
    className: "glass rounded-3xl p-6 text-center text-white/50"
  }, "\u2026") : games.length === 0 ? React.createElement("div", {
    className: "glass rounded-3xl p-8 text-center space-y-3"
  }, React.createElement("div", {
    className: "text-6xl"
  }, "\uD83C\uDF93"), React.createElement("h3", {
    className: "text-xl font-black"
  }, t.noGamesYet), React.createElement("p", {
    className: "text-sm text-white/70 max-w-sm mx-auto"
  }, t.noGamesBody), React.createElement("button", {
    onClick: onCreate,
    className: "px-6 py-3 rounded-full font-extrabold btn-press text-white shadow-lg",
    style: {
      background: 'linear-gradient(90deg, #a78bfa, #f472b6)'
    }
  }, "+ ", t.createGame)) : React.createElement("ul", {
    className: "space-y-2"
  }, games.map(g => {
    const n = counts[g.id] || 0;
    return React.createElement("li", {
      key: g.id,
      className: "glass rounded-2xl p-3"
    }, React.createElement("div", {
      className: "flex items-center gap-3"
    }, React.createElement("span", {
      className: "w-12 h-12 shrink-0 rounded-2xl grid place-items-center text-2xl border border-white/15",
      style: {
        background: `linear-gradient(135deg, ${g.accent}44, ${g.accent}11)`
      }
    }, g.icon), React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "font-extrabold truncate"
    }, L(g.title, lang) || t.untitled), React.createElement("div", {
      className: "text-[11px] text-white/55 truncate"
    }, t.questionsN(n), " \xB7 \u23F1 ", g.config.timerSec === 0 ? '∞' : `${g.config.timerSec}s`, g.config.teams > 0 && ` · ${t.nTeams(g.config.teams)}`, " \xB7 ", fmtAgo(g.updatedAt, lang)))), React.createElement("div", {
      className: "grid grid-cols-4 gap-1.5 mt-2.5"
    }, React.createElement("button", {
      onClick: () => onPlay(g),
      disabled: n === 0,
      title: n === 0 ? t.vNoQuestions : '',
      className: "py-2 rounded-xl font-bold btn-press text-sm text-white disabled:opacity-40",
      style: {
        background: 'linear-gradient(90deg, #a78bfa, #f472b6)'
      }
    }, "\u25B6 ", t.play), React.createElement("button", {
      onClick: () => onEdit(g),
      className: "py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm"
    }, "\u270F\uFE0F ", t.edit), React.createElement("button", {
      onClick: () => duplicate(g),
      className: "py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm"
    }, "\u29C9 ", t.duplicate), React.createElement("button", {
      onClick: () => setConfirmDel(confirmDel === g.id ? null : g.id),
      className: "py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm"
    }, "\uD83D\uDDD1 ", t.del)), confirmDel === g.id && React.createElement("div", {
      className: "flex items-center gap-2 mt-2 text-sm"
    }, React.createElement("span", {
      className: "flex-1 text-white/75"
    }, t.confirmDeleteGame), React.createElement("button", {
      onClick: () => remove(g),
      className: "px-3 py-1.5 rounded-full bg-red-500/80 font-bold btn-press"
    }, t.del), React.createElement("button", {
      onClick: () => setConfirmDel(null),
      className: "px-3 py-1.5 rounded-full bg-white/10 border border-white/15 font-bold btn-press"
    }, t.cancel)));
  })));
}

/* ==== js/realtime/transport.js ==== */
const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const QRCODE_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const _scriptPromises = {};
const loadScript = url => {
  if (!_scriptPromises[url]) {
    _scriptPromises[url] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => {
        delete _scriptPromises[url];
        reject(new Error('Could not load ' + url));
      };
      document.head.appendChild(s);
    });
  }
  return _scriptPromises[url];
};
const RT = {
  JOIN: 'PLAYER_JOIN',
  LEAVE: 'PLAYER_LEFT',
  READY: 'PLAYER_READY',
  ACTION: 'PLAYER_ACTION',
  PING: 'PING',
  STATE: 'STATE',
  PONG: 'PONG',
  FULL: 'PARTY_FULL',
  END: 'PARTY_ENDED',
  REJOIN: 'REJOIN'
};
const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genRoomCode = () => Array.from({
  length: 6
}, () => ROOM_ALPHABET[randInt(ROOM_ALPHABET.length)]).join('');
const hostPeerId = code => `pg-${code}-host`;
const joinUrl = code => `${baseUrl()}#join=${code}`;
function createHostTransport(code, handlers) {
  const routes = new Map();
  let closed = false;
  const deliver = (routeId, m) => {
    if (m && m.type && m.from) handlers.onMessage(m.from, m, routeId);
  };
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('pg-' + code) : null;
  if (bc) {
    bc.onmessage = e => {
      const m = e.data;
      if (!m || m.to !== 'host') return;
      const id = 'bc:' + m.from;
      if (!routes.has(id)) routes.set(id, msg => bc.postMessage({
        ...msg,
        from: 'host',
        to: m.from
      }));
      deliver(id, m);
    };
  }
  let peer = null;
  const startPeer = async () => {
    try {
      await loadScript(PEERJS_URL);
      if (closed) return;
      peer = new Peer(hostPeerId(code), {
        debug: 0
      });
      peer.on('open', () => handlers.onStatus('online'));
      peer.on('connection', c => {
        const id = 'p:' + c.peer;
        routes.set(id, msg => {
          if (c.open) c.send({
            ...msg,
            from: 'host',
            to: 'all'
          });
        });
        c.on('data', m => deliver(id, m));
        c.on('close', () => {
          routes.delete(id);
          handlers.onRouteClosed(id);
        });
      });
      peer.on('disconnected', () => {
        handlers.onStatus('reconnecting');
        if (!closed) setTimeout(() => {
          try {
            peer.reconnect();
          } catch (e) {}
        }, 1500);
      });
      peer.on('error', e => handlers.onStatus(e && e.type === 'unavailable-id' ? 'taken' : 'offline'));
    } catch (e) {
      handlers.onStatus('offline');
    }
  };
  startPeer();
  return {
    send: (routeId, msg) => {
      const r = routes.get(routeId);
      if (r) r(msg);
    },
    sendTo: (routeIds, msg) => routeIds.forEach(id => {
      const r = routes.get(id);
      if (r) r(msg);
    }),
    broadcast: msg => routes.forEach(send => send(msg)),
    close: () => {
      closed = true;
      if (bc) bc.close();
      if (peer) peer.destroy();
      routes.clear();
    }
  };
}
function createPlayerTransport(code, clientId, handlers) {
  let closed = false;
  let conn = null;
  let peer = null;
  const queue = [];
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('pg-' + code) : null;
  if (bc) bc.onmessage = e => {
    const m = e.data;
    if (m && m.from === 'host' && (m.to === clientId || m.to === 'all')) handlers.onMessage(m);
  };
  const flush = () => {
    while (queue.length && conn && conn.open) conn.send(queue.shift());
  };
  const connectPeer = async () => {
    try {
      await loadScript(PEERJS_URL);
      if (closed) return;
      if (peer) {
        try {
          peer.destroy();
        } catch (e) {}
      }
      peer = new Peer(undefined, {
        debug: 0
      });
      peer.on('open', () => {
        conn = peer.connect(hostPeerId(code), {
          reliable: true
        });
        conn.on('open', () => {
          handlers.onStatus('online');
          flush();
          handlers.onReconnect();
        });
        conn.on('data', m => handlers.onMessage(m));
        conn.on('close', () => {
          handlers.onStatus('reconnecting');
          if (!closed) setTimeout(connectPeer, 2500);
        });
      });
      peer.on('error', () => {
        handlers.onStatus('reconnecting');
        if (!closed) setTimeout(connectPeer, 4000);
      });
    } catch (e) {
      handlers.onStatus('offline');
    }
  };
  connectPeer();
  return {
    send: msg => {
      const m = {
        ...msg,
        from: clientId,
        to: 'host',
        ts: Date.now()
      };
      if (bc) bc.postMessage(m);
      if (conn && conn.open) conn.send(m);else queue.push(m);
    },
    close: () => {
      closed = true;
      if (bc) bc.close();
      if (peer) peer.destroy();
    }
  };
}

/* ==== js/realtime/host.js ==== */
function useHostSession({
  venue,
  players,
  setPlayers,
  stage,
  sub
}) {
  const [room, setRoom] = useState(null);
  const [remote, setRemote] = useState({});
  const [status, setStatus] = useState('offline');
  const [paused, setPaused] = useState(false);
  const [answers, setAnswers] = useState({});
  const transportRef = useRef(null);
  const seqRef = useRef(0);
  const liveRef = useRef({});
  liveRef.current = {
    venue,
    players,
    setPlayers,
    stage,
    remote,
    paused,
    room,
    sub,
    answers
  };
  const snapshot = useCallback(() => {
    const {
      venue: v,
      players: ps,
      stage: st,
      remote: rm,
      paused: pz,
      room: r
    } = liveRef.current;
    const online = Object.values(rm).filter(x => x.online).length;
    return {
      type: RT.STATE,
      seq: ++seqRef.current,
      ts: Date.now(),
      code: r ? r.code : null,
      paused: pz,
      venue: v && v.enabled ? {
        name: v.name,
        tagline: v.tagline,
        logo: v.logo,
        primary: v.primary,
        table: v.table
      } : null,
      players: ps.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        score: p.score,
        eliminated: p.eliminated,
        remote: !!p.clientId,
        ready: p.clientId ? !!(rm[p.clientId] && rm[p.clientId].ready) : true,
        online: p.clientId ? !!(rm[p.clientId] && rm[p.clientId].online) : true
      })),
      stage: st ? {
        icon: st.icon,
        title: st.title,
        status: st.status,
        round: st.round,
        total: st.total || null,
        questionId: st.questionId || null,
        options: st.options || null,
        reveal: st.reveal || null,
        answeredBy: st.questionId && answers[st.questionId] ? Object.keys(answers[st.questionId]) : [],
        participants: (st.participants || []).map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color
        })),
        roles: st.roles || null,
        challenge: st.challenge || null,
        image: st.image || null,
        timerMs: st.timerMs == null ? null : st.timerMs,
        scores: (st.scores || []).map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          eliminated: p.eliminated
        })),
        winner: (st.winner || []).map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar
        })),
        winnerLabel: st.winnerLabel || null
      } : null,
      onlineCount: online
    };
  }, []);
  const broadcast = useCallback(() => {
    if (transportRef.current) transportRef.current.broadcast(snapshot());
  }, [snapshot]);
  const answersFor = useCallback(questionId => {
    const forQ = answers[questionId] || {};
    const out = {};
    Object.values(forQ).forEach(a => {
      if (a.playerId) out[a.playerId] = a;
    });
    return out;
  }, [answers]);
  const clearAnswers = useCallback(() => setAnswers({}), []);
  const onMessage = useCallback((clientId, m, routeId) => {
    const {
      players: ps,
      setPlayers: setPs,
      venue: v,
      remote: rm
    } = liveRef.current;
    switch (m.type) {
      case RT.JOIN:
        {
          if (m.screen) {
            setTimeout(() => transportRef.current && transportRef.current.send(routeId, snapshot()), 50);
            return;
          }
          const name = clip(String(m.name || '')).slice(0, 24) || 'Player';
          const known = rm[clientId];
          const existing = !known && ps.find(p => p.clientId === clientId);
          if (!known && existing) {
            if (name !== existing.name) setPs(renamePlayer(ps, existing.id, name));
            setRemote(r => ({
              ...r,
              [clientId]: {
                playerId: existing.id,
                name,
                ready: false,
                online: true,
                lastSeen: Date.now(),
                routes: [routeId]
              }
            }));
          } else if (!known) {
            const limit = v && v.maxPlayers || 8;
            if (ps.length >= limit) {
              transportRef.current.send(routeId, {
                type: RT.FULL
              });
              return;
            }
            const p = {
              ...createPlayer(name, ps),
              clientId
            };
            setPs([...ps, p]);
            setRemote(r => ({
              ...r,
              [clientId]: {
                playerId: p.id,
                name,
                ready: false,
                online: true,
                lastSeen: Date.now(),
                routes: [routeId]
              }
            }));
          } else {
            if (name !== known.name) setPs(renamePlayer(ps, known.playerId, name));
            setRemote(r => ({
              ...r,
              [clientId]: {
                ...known,
                name,
                online: true,
                lastSeen: Date.now(),
                routes: Array.from(new Set([...(known.routes || []), routeId]))
              }
            }));
          }
          setTimeout(() => transportRef.current && transportRef.current.send(routeId, snapshot()), 50);
          break;
        }
      case RT.READY:
        setRemote(r => r[clientId] ? {
          ...r,
          [clientId]: {
            ...r[clientId],
            ready: !!m.ready,
            lastSeen: Date.now()
          }
        } : r);
        break;
      case RT.LEAVE:
        setRemote(r => r[clientId] ? {
          ...r,
          [clientId]: {
            ...r[clientId],
            online: false
          }
        } : r);
        break;
      case RT.PING:
        if (!rm[clientId]) {
          transportRef.current.send(routeId, {
            type: RT.REJOIN
          });
          break;
        }
        setRemote(r => r[clientId] ? {
          ...r,
          [clientId]: {
            ...r[clientId],
            online: true,
            lastSeen: Date.now()
          }
        } : r);
        transportRef.current.send(routeId, {
          type: RT.PONG,
          ts: Date.now()
        });
        break;
      case RT.ACTION:
        {
          const a = m.action || {};
          if (a.kind === 'answer' && a.questionId != null) {
            const known = rm[clientId];
            const stage = liveRef.current.stage;
            if (!known || !stage || stage.status !== 'challenge' || stage.questionId !== a.questionId) break;
            setAnswers(prev => {
              const forQ = prev[a.questionId] || {};
              if (forQ[clientId]) return prev;
              return {
                ...prev,
                [a.questionId]: {
                  ...forQ,
                  [clientId]: {
                    index: a.index,
                    ms: a.ms || 0,
                    at: Date.now(),
                    playerId: known.playerId
                  }
                }
              };
            });
          }
          setRemote(r => r[clientId] ? {
            ...r,
            [clientId]: {
              ...r[clientId],
              lastAction: {
                ...a,
                at: Date.now()
              }
            }
          } : r);
          break;
        }
      default:
        break;
    }
  }, [snapshot]);
  const start = useCallback(reuseCode => {
    if (!Entitlements.hasFeature(liveRef.current.sub, 'realtime-sync')) return;
    if (transportRef.current) transportRef.current.close();
    const code = typeof reuseCode === 'string' && /^[A-Z0-9]{6}$/.test(reuseCode) ? reuseCode : genRoomCode();
    setStatus('offline');
    transportRef.current = createHostTransport(code, {
      onMessage,
      onStatus: setStatus,
      onRouteClosed: () => {}
    });
    setRoom({
      code,
      createdAt: Date.now()
    });
    setPaused(false);
    try {
      sessionStorage.setItem('pg-host', code);
    } catch (e) {}
  }, [onMessage]);
  const end = useCallback(() => {
    if (transportRef.current) {
      transportRef.current.broadcast({
        type: RT.END
      });
      transportRef.current.close();
    }
    transportRef.current = null;
    try {
      sessionStorage.removeItem('pg-host');
    } catch (e) {}
    setRoom(null);
    setRemote({});
    setPaused(false);
    setStatus('offline');
  }, []);
  const newCode = useCallback(() => {
    end();
    setTimeout(start, 50);
  }, [end, start]);
  const clearRemote = useCallback(() => {
    const {
      players: ps,
      setPlayers: setPs
    } = liveRef.current;
    setPs(ps.filter(p => !p.clientId));
    setRemote({});
    broadcast();
  }, [broadcast]);
  useEffect(() => {
    if (room) broadcast();
  }, [players, stage, paused, remote, venue, room, answers]);
  useEffect(() => {
    if (!room) return;
    const id = setInterval(() => {
      const now = Date.now();
      setRemote(r => {
        let changed = false;
        const next = {};
        Object.entries(r).forEach(([k, v]) => {
          const online = now - v.lastSeen < 25000;
          if (online !== v.online) changed = true;
          next[k] = {
            ...v,
            online
          };
        });
        return changed ? next : r;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [room]);
  useEffect(() => () => {
    if (transportRef.current) transportRef.current.close();
  }, []);
  const onlineCount = Object.values(remote).filter(x => x.online).length;
  const livePlayerIds = Object.values(remote).filter(r => r.online).map(r => r.playerId);
  return {
    room,
    remote,
    status,
    paused,
    setPaused,
    onlineCount,
    start,
    end,
    newCode,
    clearRemote,
    snapshot,
    answers,
    answersFor,
    clearAnswers,
    livePlayerIds
  };
}

/* ==== js/realtime/player.js ==== */
const CLIENT_KEY = 'pg-client';
const loadClient = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CLIENT_KEY)) || {};
  } catch (e) {
    return {};
  }
};
const saveClient = data => {
  try {
    sessionStorage.setItem(CLIENT_KEY, JSON.stringify(data));
  } catch (e) {}
};
function ConnectionStatus({
  t,
  status
}) {
  const map = {
    online: {
      icon: '✓',
      label: t.connected,
      cls: 'bg-green-500/20 border-green-300/40 text-green-200'
    },
    reconnecting: {
      icon: '⚠️',
      label: t.reconnecting,
      cls: 'bg-amber-500/20 border-amber-300/40 text-amber-100'
    },
    offline: {
      icon: '⚠️',
      label: t.sameDeviceOnly,
      cls: 'bg-white/10 border-white/20 text-white/70'
    },
    taken: {
      icon: '⚠️',
      label: t.reconnecting,
      cls: 'bg-amber-500/20 border-amber-300/40 text-amber-100'
    }
  };
  const s = map[status] || map.offline;
  return React.createElement("span", {
    className: `inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`,
    role: "status"
  }, s.icon, " ", s.label);
}
function AnswerPad({
  t,
  stage,
  myAnswer,
  onAnswer
}) {
  const opts = stage.options || [];
  if (!opts.length) return null;
  const revealed = stage.reveal ? stage.reveal.answer : null;
  const locked = myAnswer != null;
  const tf = opts.length === 2 && /^(true|đúng)$/i.test(opts[0].text || '');
  return React.createElement("div", {
    className: "space-y-2"
  }, React.createElement("div", {
    className: `grid gap-2 ${tf || opts.some(o => o.image) ? 'grid-cols-2' : ''}`
  }, opts.map((o, i) => {
    const mine = myAnswer === i;
    const right = revealed === i;
    const wrong = revealed != null && mine && !right;
    const cls = right ? 'bg-green-500/35 border-green-300 ring-2 ring-green-300' : wrong ? 'bg-red-500/30 border-red-300' : mine ? 'bg-white/25 border-white ring-2 ring-white/70' : revealed != null ? 'bg-black/20 border-white/10 opacity-50' : 'bg-white/12 border-white/20 hover:bg-white/20';
    return React.createElement("button", {
      key: i,
      onClick: () => !locked && revealed == null && onAnswer(i),
      disabled: locked || revealed != null,
      className: `min-h-[72px] rounded-2xl px-4 py-3 border-2 font-bold text-left flex items-center gap-3 btn-press disabled:cursor-default ${cls}`
    }, React.createElement("span", {
      className: "w-8 h-8 shrink-0 rounded-full bg-black/35 grid place-items-center text-sm font-black"
    }, 'ABCDEF'[i]), o.image && React.createElement("img", {
      src: o.image,
      alt: "",
      className: "h-10 rounded-lg object-contain"
    }), React.createElement("span", {
      className: "flex-1 min-w-0"
    }, o.text), right && React.createElement("span", {
      className: "text-xl"
    }, "\u2713"), wrong && React.createElement("span", {
      className: "text-xl"
    }, "\u2715"));
  })), revealed == null && React.createElement("div", {
    className: "text-center text-sm font-bold"
  }, locked ? React.createElement("span", {
    className: "text-green-300"
  }, "\u2713 ", t.answerLocked) : React.createElement("span", {
    className: "text-white/60"
  }, t.pickAnAnswer)), revealed != null && locked && React.createElement("div", {
    className: `text-center text-lg font-black ${revealed === myAnswer ? 'text-green-300' : 'text-red-300'}`
  }, revealed === myAnswer ? `🎉 ${t.correct}` : `😅 ${t.wrong}`), revealed != null && !locked && React.createElement("div", {
    className: "text-center text-sm text-white/60"
  }, "\u23F0 ", t.timeUp));
}
function StageView({
  t,
  stage,
  meId,
  big,
  myAnswer,
  onAnswer
}) {
  if (!stage) return null;
  const me = meId && stage.participants.some(p => p.id === meId);
  const sz = big ? 'text-[clamp(28px,6vmin,72px)]' : 'text-2xl';
  return React.createElement("div", {
    className: "text-center space-y-4"
  }, React.createElement("div", {
    className: `font-black tracking-wide ${sz}`
  }, stage.icon, " ", stage.title), stage.round > 0 && stage.status !== 'setup' && React.createElement("div", {
    className: `uppercase tracking-[0.3em] text-white/60 ${big ? 'text-[clamp(14px,2.5vmin,28px)]' : 'text-xs'}`
  }, t.round, " ", String(stage.round).padStart(2, '0'), stage.total ? ` / ${stage.total}` : ''), stage.participants.length > 0 && stage.status !== 'finished' && React.createElement("div", {
    className: "flex items-center justify-center gap-3 flex-wrap"
  }, stage.participants.map((p, i) => React.createElement(React.Fragment, {
    key: p.id
  }, i > 0 && stage.participants.length === 2 && React.createElement("span", {
    className: `font-black italic text-white/40 ${big ? 'text-[clamp(20px,4vmin,48px)]' : 'text-xl'}`
  }, t.vs), React.createElement("div", {
    className: "flex flex-col items-center gap-1"
  }, React.createElement(Avatar, {
    player: p,
    size: big ? 96 : 56,
    ring: p.id === meId ? '#fff' : undefined
  }), React.createElement("div", {
    className: `font-black ${big ? 'text-[clamp(20px,4vmin,48px)]' : 'text-base'}`
  }, p.name), stage.roles && stage.roles[i] && React.createElement("div", {
    className: "text-[11px] uppercase tracking-wider text-white/60"
  }, stage.roles[i]))))), me && stage.status === 'challenge' && React.createElement("div", {
    className: "inline-block px-4 py-1.5 rounded-full bg-yellow-300 text-yellow-900 font-black text-sm pulse-soft"
  }, "\u26A1 ", t.youAreUp), stage.image && stage.status === 'challenge' && React.createElement("img", {
    src: stage.image,
    alt: "",
    className: `mx-auto rounded-xl ring-1 ring-white/20 shadow-xl ${big ? 'h-[22vmin]' : 'h-24'}`
  }), stage.challenge && stage.status === 'challenge' && React.createElement("p", {
    className: `font-black leading-snug ${big ? 'text-[clamp(22px,5vmin,64px)] max-w-5xl mx-auto' : 'text-lg'}`
  }, stage.challenge), stage.timerMs != null && stage.status === 'challenge' && React.createElement("div", {
    className: `font-black tabular-nums ${big ? 'text-[clamp(60px,14vmin,180px)] leading-none' : 'text-3xl'} ${stage.timerMs < 3000 ? 'text-red-300' : 'text-white/70'}`
  }, String(Math.ceil(stage.timerMs / 1000)).padStart(2, '0'), big ? '' : React.createElement("span", {
    className: "text-base font-bold"
  }, "s")), !big && onAnswer && (stage.status === 'challenge' || stage.reveal) && React.createElement(AnswerPad, {
    t: t,
    stage: stage,
    myAnswer: myAnswer,
    onAnswer: onAnswer
  }), big && stage.options && stage.status === 'challenge' && React.createElement("div", {
    className: "grid grid-cols-2 gap-3 max-w-4xl mx-auto w-full"
  }, stage.options.map((o, i) => React.createElement("div", {
    key: i,
    className: "rounded-2xl px-4 py-3 bg-white/10 border border-white/20 flex items-center gap-3",
    style: {
      fontSize: 'clamp(16px, 3vmin, 34px)'
    }
  }, React.createElement("span", {
    className: "shrink-0 font-black text-white/60"
  }, 'ABCDEF'[i]), o.image && React.createElement("img", {
    src: o.image,
    alt: "",
    className: "h-[7vmin] rounded-lg object-contain"
  }), React.createElement("span", {
    className: "font-bold"
  }, o.text)))), stage.status === 'finished' && stage.winner.length > 0 && React.createElement("div", {
    className: "space-y-2"
  }, React.createElement("div", {
    className: big ? 'text-[clamp(40px,10vmin,120px)] crown-float' : 'text-5xl crown-float'
  }, "\uD83D\uDC51"), stage.winnerLabel && React.createElement("div", {
    className: "uppercase tracking-[0.3em] text-white/70"
  }, stage.winnerLabel), React.createElement("div", {
    className: `font-black ${big ? 'text-[clamp(32px,8vmin,96px)]' : 'text-3xl'}`
  }, stage.winner.map(p => `${p.avatar} ${p.name}`).join(' · '))));
}
function PlayerClient({
  code
}) {
  const saved = loadClient();
  const lang = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const t = I18N[lang];
  const [clientId] = useState(() => saved.clientId || uid());
  const [name, setName] = useState(saved.code === code ? saved.name || '' : '');
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState('reconnecting');
  const [snap, setSnap] = useState(null);
  const [full, setFull] = useState(false);
  const [ended, setEnded] = useState(false);
  const transport = useRef(null);
  const nameRef = useRef(name);
  nameRef.current = name;
  const lastSeen = useRef(0);
  const joinedRef = useRef(false);
  joinedRef.current = joined;
  useEffect(() => {
    document.body.style.background = 'linear-gradient(135deg, #0f172a 0%, #312e81 60%, #831843 100%)';
    const rejoin = () => {
      const c = loadClient();
      if (joinedRef.current && c.code === code && c.name) transport.current.send({
        type: RT.JOIN,
        name: c.name
      });
    };
    transport.current = createPlayerTransport(code, clientId, {
      onMessage: m => {
        lastSeen.current = Date.now();
        setStatus('online');
        if (m.type === RT.STATE) {
          setSnap(m);
          setEnded(false);
        } else if (m.type === RT.FULL) setFull(true);else if (m.type === RT.END) {
          setEnded(true);
          setJoined(false);
        } else if (m.type === RT.REJOIN) rejoin();
      },
      onStatus: () => {},
      onReconnect: rejoin
    });
    if (saved.code === code && saved.name) {
      setJoined(true);
      joinedRef.current = true;
      transport.current.send({
        type: RT.JOIN,
        name: saved.name
      });
    }
    const ping = setInterval(() => {
      transport.current.send({
        type: RT.PING
      });
      if (Date.now() - lastSeen.current > 15000) {
        setStatus('reconnecting');
        rejoin();
      }
    }, 6000);
    const bye = () => transport.current && transport.current.send({
      type: RT.LEAVE
    });
    window.addEventListener('pagehide', bye);
    return () => {
      clearInterval(ping);
      window.removeEventListener('pagehide', bye);
      bye();
      transport.current.close();
    };
  }, []);
  const join = () => {
    const n = name.trim();
    if (!n) return;
    saveClient({
      clientId,
      code,
      name: n
    });
    setJoined(true);
    setFull(false);
    transport.current.send({
      type: RT.JOIN,
      name: n
    });
  };
  const mine = snap ? snap.players.find(p => p.remote && p.name === name.trim()) : null;
  const stage = snap && snap.stage;
  const qid = stage && stage.questionId;
  const [picked, setPicked] = useState({});
  useEffect(() => {
    if (stage && stage.status === 'setup') setPicked({});
  }, [stage && stage.status]);
  const sendAnswer = index => {
    if (!qid || picked[qid] != null) return;
    setPicked(p => ({
      ...p,
      [qid]: index
    }));
    vibrate(20);
    transport.current.send({
      type: RT.ACTION,
      action: {
        kind: 'answer',
        questionId: qid,
        index,
        ms: Date.now() - (stage.askedAt || Date.now())
      }
    });
  };
  useEffect(() => {
    if (IS_DEV) window.__pgClient = {
      snap,
      status,
      joined,
      clientId
    };
  });
  const toggleReady = () => {
    if (!mine) return;
    transport.current.send({
      type: RT.READY,
      ready: !mine.ready
    });
  };
  const venue = snap && snap.venue;
  const readyCount = snap ? snap.players.filter(p => p.ready).length : 0;
  return React.createElement("div", {
    className: "min-screen flex flex-col items-center px-4 py-6 gap-4 max-w-md mx-auto text-white"
  }, React.createElement("header", {
    className: "w-full flex items-center justify-between gap-3"
  }, React.createElement("div", {
    className: "flex items-center gap-2 min-w-0"
  }, venue && venue.logo ? React.createElement("img", {
    src: venue.logo,
    alt: "",
    className: "w-10 h-10 rounded-xl object-cover border border-white/20"
  }) : React.createElement("span", {
    className: "text-2xl"
  }, "\uD83C\uDF89"), React.createElement("div", {
    className: "min-w-0"
  }, React.createElement("div", {
    className: "font-extrabold truncate"
  }, venue ? venue.name : 'JParty'), React.createElement("div", {
    className: "text-[11px] text-white/60 truncate"
  }, venue ? t.poweredByPG : `${t.room} ${code}`, venue && venue.table ? ` · ${t.tableLabel} ${venue.table}` : ''))), React.createElement(ConnectionStatus, {
    t: t,
    status: status
  })), ended ? React.createElement("div", {
    className: "glass rounded-3xl p-6 text-center w-full"
  }, React.createElement("div", {
    className: "text-5xl"
  }, "\uD83D\uDC4B"), React.createElement("div", {
    className: "font-black text-xl mt-3"
  }, t.hostLeft)) : !joined ? React.createElement("div", {
    className: "glass rounded-3xl p-6 w-full space-y-4"
  }, React.createElement("div", {
    className: "text-center"
  }, React.createElement("div", {
    className: "text-5xl"
  }, "\uD83C\uDF89"), React.createElement("h1", {
    className: "text-2xl font-black mt-2"
  }, t.joinParty), React.createElement("div", {
    className: "text-xs text-white/60 mt-1"
  }, t.room, ": ", React.createElement("span", {
    className: "font-mono font-black tracking-[0.3em] text-white"
  }, code))), React.createElement("label", {
    className: "block text-sm font-semibold"
  }, t.yourName, React.createElement("input", {
    value: name,
    maxLength: 24,
    onChange: e => setName(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') join();
    },
    placeholder: "Minh",
    className: "mt-1 w-full rounded-full px-4 py-3 bg-black/25 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40 text-lg"
  })), full && React.createElement("div", {
    className: "text-sm text-amber-200 text-center"
  }, "\u26A0\uFE0F ", t.partyCode, " \u2014 full"), React.createElement("button", {
    onClick: join,
    disabled: !name.trim(),
    className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 bg-gradient-to-r from-pink-500 to-violet-500"
  }, t.join)) : React.createElement(React.Fragment, null, snap && snap.paused && React.createElement("div", {
    className: "w-full text-center text-sm font-bold px-3 py-2 rounded-2xl bg-amber-400/20 border border-amber-300/40"
  }, "\u23F8 ", t.paused), React.createElement("div", {
    className: "glass rounded-3xl p-5 w-full"
  }, snap && snap.stage ? React.createElement(StageView, {
    t: t,
    stage: snap.stage,
    meId: mine ? mine.id : null,
    myAnswer: qid != null ? picked[qid] : null,
    onAnswer: snap.stage.options && mine ? sendAnswer : null
  }) : React.createElement("div", {
    className: "text-center space-y-2"
  }, React.createElement("div", {
    className: "text-5xl"
  }, "\u2713"), React.createElement("div", {
    className: "font-black text-xl"
  }, t.joined), React.createElement("div", {
    className: "text-sm text-white/60"
  }, t.waitingHost))), React.createElement("div", {
    className: "glass rounded-3xl p-4 w-full"
  }, React.createElement("div", {
    className: "flex items-center justify-between mb-2 text-xs text-white/60"
  }, React.createElement("span", null, "\uD83D\uDC65 ", t.players), React.createElement("span", null, t.readyCount(readyCount, snap ? snap.players.length : 0))), React.createElement("ul", {
    className: "space-y-1"
  }, (snap ? snap.players : []).map(p => React.createElement("li", {
    key: p.id,
    className: `flex items-center gap-2 rounded-xl px-2 py-1.5 ${mine && p.id === mine.id ? 'bg-white/15' : 'bg-black/20'} ${p.online ? '' : 'opacity-50'}`
  }, React.createElement(Avatar, {
    player: p,
    size: 28
  }), React.createElement("span", {
    className: "flex-1 font-semibold truncate"
  }, p.name), p.remote && React.createElement("span", {
    className: "text-[10px] text-white/50"
  }, "\uD83D\uDCF1"), React.createElement("span", {
    className: "text-sm"
  }, p.ready ? '✅' : '⏳')))), React.createElement("button", {
    onClick: toggleReady,
    disabled: !mine,
    className: `mt-3 w-full py-3 rounded-full font-extrabold btn-press disabled:opacity-40 ${mine && mine.ready ? 'bg-white/15 border border-white/20' : 'bg-gradient-to-r from-green-500 to-emerald-400 text-slate-900'}`
  }, mine && mine.ready ? `✅ ${t.ready}` : `👍 ${t.ready}`)), React.createElement("button", {
    onClick: () => {
      transport.current.send({
        type: RT.LEAVE
      });
      saveClient({});
      setJoined(false);
    },
    className: "text-xs text-white/50 hover:text-white"
  }, t.leave)), React.createElement("div", {
    className: "text-[10px] text-white/35 mt-auto"
  }, t.poweredByPG));
}

/* ==== js/venue/venueView.js ==== */
function QrCode({
  text,
  size = 240
}) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    setSrc(null);
    loadScript(QRCODE_URL).then(() => {
      if (!alive || typeof qrcode !== 'function') return;
      try {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        const cell = Math.max(2, Math.floor(size / qr.getModuleCount()));
        setSrc(qr.createDataURL(cell, 0));
      } catch (e) {
        setFailed(true);
      }
    }).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [text, size]);
  return React.createElement("div", {
    className: "inline-flex flex-col items-center gap-2"
  }, React.createElement("div", {
    className: "rounded-2xl bg-white p-3 shadow-2xl"
  }, failed ? React.createElement("div", {
    className: "text-slate-900 text-xs font-mono break-all max-w-[240px]"
  }, text) : src ? React.createElement("img", {
    src: src,
    alt: text,
    width: size,
    height: size,
    className: "block rounded-lg",
    style: {
      imageRendering: 'pixelated'
    }
  }) : React.createElement("div", {
    style: {
      width: size,
      height: size
    },
    className: "grid place-items-center text-slate-400 text-2xl"
  }, "\u25A6")));
}
function VenueView({
  t,
  lang,
  venue,
  setVenue,
  sub,
  session,
  setPlayers,
  stage,
  host,
  sfx,
  showToast,
  onBack,
  onBigScreen
}) {
  const fileRef = useRef(null);
  const update = patch => setVenue(v => ({
    ...v,
    ...patch
  }));
  const canBrand = Entitlements.hasFeature(sub, 'venue-branding');
  const summary = sessionSummary(session);
  const onFile = async e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const logo = await processLogoFile(file, t.logoErrors);
      update({
        logo
      });
      showToast(t.venueSaved);
      sfx('coin');
    } catch (err) {
      showToast(err.message);
    }
  };
  const preview = {
    ...venue,
    enabled: true
  };
  const code = host.room ? host.room.code : null;
  return React.createElement("section", {
    className: "w-full max-w-2xl space-y-4"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: onBack,
    className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\u2190"), React.createElement("h2", {
    className: "text-2xl font-black flex-1"
  }, "\uD83C\uDFEA ", t.venue), React.createElement(PlanBadge, {
    plan: "max",
    t: t
  })), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-6 space-y-4"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3"
  }, React.createElement("h3", {
    className: "font-bold"
  }, "\uD83C\uDFF7\uFE0F ", t.venueBranding), React.createElement(Switch, {
    checked: venue.enabled,
    onChange: v => update({
      enabled: v
    }),
    label: t.enableBranding
  })), React.createElement("div", {
    className: "grid sm:grid-cols-2 gap-4"
  }, React.createElement("div", {
    className: "space-y-3"
  }, React.createElement(Field, {
    label: t.venueName
  }, React.createElement("input", {
    value: venue.name,
    maxLength: 40,
    onChange: e => update({
      name: e.target.value
    }),
    placeholder: "My Beer House",
    className: inputCls
  })), React.createElement(Field, {
    label: t.taglineLabel
  }, React.createElement("input", {
    value: venue.tagline,
    maxLength: 60,
    onChange: e => update({
      tagline: e.target.value
    }),
    placeholder: "Party starts here",
    className: inputCls
  })), React.createElement(Field, {
    label: t.venueLogo
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/png,image/jpeg,image/webp",
    onChange: onFile,
    className: "hidden"
  }), React.createElement("button", {
    onClick: () => fileRef.current && fileRef.current.click(),
    className: "px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\uD83D\uDDBC\uFE0F ", t.uploadImage), venue.logo && React.createElement("button", {
    onClick: () => update({
      logo: null
    }),
    className: "px-3 py-2.5 rounded-2xl text-sm text-white/60 hover:text-white"
  }, t.removeLogo)), React.createElement("div", {
    className: "text-[11px] text-white/45 mt-1"
  }, "PNG \xB7 JPG \xB7 WEBP \xB7 \u2264 4 MB")), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement(Field, {
    label: t.brandColor
  }, React.createElement("input", {
    type: "color",
    value: venue.primary,
    onChange: e => update({
      primary: e.target.value
    }),
    className: "w-full h-10 rounded-xl bg-transparent border border-white/15 cursor-pointer"
  })), React.createElement(Field, {
    label: t.secondaryColor
  }, React.createElement("input", {
    type: "color",
    value: venue.secondary,
    onChange: e => update({
      secondary: e.target.value
    }),
    className: "w-full h-10 rounded-xl bg-transparent border border-white/15 cursor-pointer"
  })))), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wider text-white/55 mb-1"
  }, t.preview), React.createElement("div", {
    className: "rounded-3xl p-6 text-center border border-white/15 min-h-[220px] flex flex-col items-center justify-center gap-2",
    style: {
      background: `radial-gradient(circle at 50% 0%, ${preview.primary}55, transparent 60%), rgba(0,0,0,0.3)`
    }
  }, preview.logo ? React.createElement("img", {
    src: preview.logo,
    alt: "",
    className: "w-24 h-24 rounded-2xl object-cover border border-white/20 shadow-xl"
  }) : React.createElement("div", {
    className: "w-24 h-24 rounded-2xl grid place-items-center text-4xl bg-white/10 border border-dashed border-white/25"
  }, "\uD83C\uDFEA"), React.createElement("div", {
    className: "text-2xl font-black tracking-wide mt-2",
    style: {
      color: preview.primary
    }
  }, (preview.name || 'MY BEER HOUSE').toUpperCase()), preview.tagline && React.createElement("div", {
    className: "text-sm text-white/75"
  }, preview.tagline), React.createElement("div", {
    className: "text-[10px] text-white/45 mt-1"
  }, t.poweredByPG))))), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-6 space-y-4"
  }, React.createElement("div", {
    className: "flex items-center justify-between gap-3 flex-wrap"
  }, React.createElement("h3", {
    className: "font-bold"
  }, "\uD83C\uDFEA ", t.venueMode), host.room && React.createElement(ConnectionStatus, {
    t: t,
    status: host.status
  })), React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, React.createElement(Field, {
    label: t.tableLabel
  }, React.createElement("input", {
    value: venue.table,
    maxLength: 12,
    onChange: e => update({
      table: e.target.value
    }),
    placeholder: "12",
    className: inputCls
  })), React.createElement(Field, {
    label: t.maxPlayersLabel
  }, React.createElement("input", {
    type: "number",
    min: "2",
    max: MAX_PLAYERS,
    value: venue.maxPlayers,
    onChange: e => update({
      maxPlayers: clamp(parseInt(e.target.value, 10) || 8, 2, MAX_PLAYERS)
    }),
    className: inputCls
  }))), !host.room ? React.createElement("button", {
    onClick: () => {
      sfx('click');
      host.start();
    },
    className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
    style: {
      background: `linear-gradient(90deg, ${venue.primary}, ${venue.secondary})`
    }
  }, "\u25B6 ", t.startParty) : React.createElement("div", {
    className: "space-y-4"
  }, React.createElement("div", {
    className: "flex flex-col sm:flex-row items-center gap-5"
  }, React.createElement(QrCode, {
    text: joinUrl(code),
    size: 200
  }), React.createElement("div", {
    className: "flex-1 text-center sm:text-left space-y-2"
  }, React.createElement("div", {
    className: "text-xs uppercase tracking-[0.3em] text-white/55"
  }, t.room), React.createElement("div", {
    className: "font-mono text-4xl font-black tracking-[0.3em]"
  }, code), React.createElement("div", {
    className: "text-xs text-white/60 break-all"
  }, joinUrl(code)), React.createElement("div", {
    className: "text-sm font-bold"
  }, "\uD83D\uDC65 ", session.players.length, " / ", venue.maxPlayers, " \xB7 ", host.onlineCount, " ", t.livePlayers), React.createElement("button", {
    onClick: async () => {
      if (await copyText(joinUrl(code))) showToast(t.linkCopied);
    },
    className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press"
  }, "\uD83D\uDD17 ", t.shareWheel.replace(/wheel/i, '').trim() || t.share))), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wider text-white/55 mb-2"
  }, "\uD83C\uDF9B\uFE0F ", t.hostControls), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2"
  }, React.createElement("button", {
    onClick: () => {
      sfx('click');
      host.setPaused(!host.paused);
    },
    className: "py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, host.paused ? `▶ ${t.resume}` : `⏸ ${t.pause}`), React.createElement("button", {
    onClick: () => {
      sfx('click');
      host.newCode();
    },
    className: "py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\uD83D\uDD04 ", t.newCode), React.createElement("button", {
    onClick: () => {
      sfx('click');
      host.clearRemote();
    },
    className: "py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\uD83E\uDDF9 ", t.clearPlayers), React.createElement("button", {
    onClick: () => {
      sfx('click');
      host.end();
    },
    className: "py-2.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-300/40 text-sm font-bold btn-press"
  }, "\u23F9 ", t.endParty))), React.createElement("div", null, React.createElement("div", {
    className: "text-xs font-bold uppercase tracking-wider text-white/55 mb-2"
  }, "\uD83D\uDCF1 ", t.remotePlayers), session.players.filter(p => p.clientId).length === 0 ? React.createElement("div", {
    className: "text-sm text-white/55 text-center py-3 border border-dashed border-white/20 rounded-2xl"
  }, t.scanToJoin, "\u2026") : React.createElement("ul", {
    className: "space-y-1"
  }, session.players.filter(p => p.clientId).map(p => {
    const r = host.remote[p.clientId] || {};
    return React.createElement("li", {
      key: p.id,
      className: `flex items-center gap-2 rounded-xl px-2 py-1.5 bg-black/20 ${r.online ? '' : 'opacity-50'}`
    }, React.createElement(Avatar, {
      player: p,
      size: 28
    }), React.createElement("span", {
      className: "flex-1 font-semibold truncate"
    }, p.name), React.createElement("span", {
      className: "text-xs"
    }, r.ready ? '✅' : '⏳'), React.createElement("span", {
      className: `w-2 h-2 rounded-full ${r.online ? 'bg-green-400' : 'bg-white/30'}`
    }));
  })))), React.createElement("div", {
    className: "flex gap-2"
  }, React.createElement("button", {
    onClick: onBigScreen,
    className: "flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\uD83D\uDCFA ", t.openBigScreen), React.createElement("button", {
    onClick: () => {
      const w = window.open(baseUrl() + '#bigscreen', '_blank');
      if (!w) showToast(t.openBigScreen);
    },
    className: "flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\uD83E\uDE9F ", t.openBigScreen, " \u2197"))), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-6"
  }, React.createElement("h3", {
    className: "font-bold mb-3"
  }, "\uD83D\uDCCA ", t.venueStats), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-center"
  }, [[t.gamesPlayed, summary.gamesPlayed], [t.players, summary.playerCount], [t.mostWins, summary.mostWins ? `${summary.mostWins.player.avatar} ${summary.mostWins.player.name}` : '—'], [t.mostPoints, summary.mostPoints ? `${summary.mostPoints.player.avatar} ${summary.mostPoints.player.name}` : '—']].map(([l, v]) => React.createElement("div", {
    key: l,
    className: "rounded-2xl bg-black/20 border border-white/10 p-3"
  }, React.createElement("div", {
    className: "text-[10px] uppercase tracking-wider text-white/50"
  }, l), React.createElement("div", {
    className: "font-black truncate mt-0.5"
  }, v))))));
}

/* ==== js/venue/bigscreen.js ==== */
function BigScreen({
  t,
  venue,
  stage,
  session,
  room,
  onClose
}) {
  const players = session ? session.players : [];
  return React.createElement("div", {
    className: "bigscreen text-white animate-fade"
  }, React.createElement("button", {
    onClick: onClose,
    "aria-label": t.exitBigScreen,
    className: "absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 grid place-items-center btn-press"
  }, React.createElement(Icon.X, null)), React.createElement("div", {
    className: "flex items-center gap-4 mb-[3vmin]"
  }, venue && venue.logo && React.createElement("img", {
    src: venue.logo,
    alt: "",
    className: "rounded-3xl object-cover border border-white/20 shadow-2xl",
    style: {
      width: '12vmin',
      height: '12vmin'
    }
  }), React.createElement("div", {
    className: "text-left"
  }, React.createElement("div", {
    className: "bs-title brand-accent"
  }, venue ? venue.name.toUpperCase() : 'JPARTY'), React.createElement("div", {
    className: "bs-sub"
  }, venue ? venue.tagline || t.poweredByPG : t.panelTitle, venue && venue.table ? ` · ${t.tableLabel} ${venue.table}` : ''))), stage ? React.createElement("div", {
    className: "w-full max-w-6xl"
  }, React.createElement(StageView, {
    t: t,
    stage: {
      ...stage,
      participants: (stage.participants || []).map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color
      })),
      winner: stage.winner || [],
      scores: stage.scores || []
    },
    big: true
  }), stage.scores && stage.scores.length > 1 && stage.status !== 'challenge' && React.createElement("div", {
    className: "flex flex-wrap justify-center gap-3 mt-[4vmin]"
  }, Score.leaderboard(stage.scores).slice(0, 8).map((p, i) => React.createElement("div", {
    key: p.id,
    className: "flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15",
    style: {
      fontSize: 'clamp(14px, 2.6vmin, 30px)'
    }
  }, React.createElement("span", {
    className: "font-black text-white/50"
  }, i + 1), React.createElement("span", null, p.avatar), React.createElement("span", {
    className: "font-bold"
  }, p.name), React.createElement("span", {
    className: "font-black tabular-nums"
  }, p.score))))) : React.createElement("div", {
    className: "flex flex-col items-center gap-[3vmin]"
  }, room && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "bs-sub uppercase tracking-[0.3em]"
  }, t.scanToJoin), React.createElement(QrCode, {
    text: joinUrl(room.code),
    size: Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.42)
  }), React.createElement("div", {
    className: "font-mono bs-huge tracking-[0.25em]",
    style: {
      fontSize: 'clamp(32px, 9vmin, 120px)'
    }
  }, room.code), React.createElement("div", {
    className: "bs-sub"
  }, t.orEnterCode, ": ", joinUrl(room.code))), React.createElement("div", {
    className: "bs-sub"
  }, "\uD83D\uDC65 ", players.length, venue && venue.maxPlayers ? ` / ${venue.maxPlayers}` : ''), players.length > 0 && React.createElement("div", {
    className: "flex flex-wrap justify-center gap-3 max-w-5xl"
  }, players.map(p => React.createElement("div", {
    key: p.id,
    className: "flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15",
    style: {
      fontSize: 'clamp(14px, 2.6vmin, 30px)'
    }
  }, React.createElement("span", null, p.avatar), React.createElement("span", {
    className: "font-bold"
  }, p.name))))), React.createElement("div", {
    className: "absolute bottom-4 text-white/35",
    style: {
      fontSize: 'clamp(10px, 1.6vmin, 16px)'
    }
  }, t.poweredByPG));
}
function BigScreenWindow() {
  const lang = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const t = I18N[lang];
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    document.body.style.background = '#06060c';
    const stored = loadState();
    const code = stored.hostRoom || null;
    if (!code || !('BroadcastChannel' in window)) return;
    const id = 'screen-' + uid();
    const bc = new BroadcastChannel('pg-' + code);
    bc.onmessage = e => {
      const m = e.data;
      if (m && m.from === 'host' && (m.to === id || m.to === 'all') && m.type === RT.STATE) setSnap(m);
    };
    bc.postMessage({
      type: RT.JOIN,
      name: '📺',
      from: id,
      to: 'host',
      screen: true
    });
    const ping = setInterval(() => bc.postMessage({
      type: RT.PING,
      from: id,
      to: 'host'
    }), 8000);
    return () => {
      clearInterval(ping);
      bc.close();
    };
  }, []);
  const session = snap ? {
    players: snap.players
  } : {
    players: []
  };
  return React.createElement(BigScreen, {
    t: t,
    venue: snap && snap.venue,
    stage: snap && snap.stage,
    session: session,
    room: snap && snap.code ? {
      code: snap.code
    } : null,
    onClose: () => window.close()
  });
}

/* ==== js/games/spinner.js ==== */
function SpinnerView({
  t,
  lang,
  theme,
  skin,
  themeText,
  items,
  setItems,
  eliminated,
  setEliminated,
  eliminate,
  duration,
  haptics,
  party,
  keysBlocked,
  sfx,
  showToast,
  onSpun,
  publish
}) {
  const [phase, setPhase] = useState('idle');
  const [dragging, setDragging] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [announce, setAnnounce] = useState('');
  const wheelBoxRef = useRef(null);
  const diskRef = useRef(null);
  const pointerRef = useRef(null);
  const liveRef = useRef(null);
  const rotRef = useRef(0);
  const rafRef = useRef(0);
  const spinSeq = useRef(0);
  const spinningRef = useRef(false);
  const lastIdxRef = useRef(-1);
  const lastTickRef = useRef(0);
  const dragRef = useRef(null);
  const timersRef = useRef([]);
  const removedForRef = useRef(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cfgRef = useRef({});
  cfgRef.current = {
    haptics,
    duration,
    theme,
    t,
    eliminate,
    showResult,
    keysBlocked
  };
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    timersRef.current.forEach(clearTimeout);
  }, []);
  const applyRotation = deg => {
    rotRef.current = deg;
    if (diskRef.current) diskRef.current.style.transform = `rotate(${deg}deg)`;
  };
  const flickPointer = dir => {
    const el = pointerRef.current;
    if (!el || !el.animate || REDUCED_MOTION) return;
    el.animate([{
      transform: `rotate(${-dir * 22}deg)`
    }, {
      transform: 'rotate(0deg)'
    }], {
      duration: 160,
      easing: 'cubic-bezier(.2,.8,.3,1)'
    });
  };
  const trackAngle = (deg, dir) => {
    const list = itemsRef.current;
    const n = list.length;
    if (!n) return;
    const idx = indexAt(deg, n);
    if (idx === lastIdxRef.current) return;
    if (lastIdxRef.current !== -1 && n > 1) {
      const now = performance.now();
      if (now - lastTickRef.current > 32) {
        sfx('tick');
        lastTickRef.current = now;
      }
      flickPointer(dir);
    }
    lastIdxRef.current = idx;
    if (liveRef.current) liveRef.current.textContent = list[idx];
  };
  const finishSpin = () => {
    spinningRef.current = false;
    const list = itemsRef.current;
    const {
      theme: th,
      haptics: hp,
      t: tt
    } = cfgRef.current;
    const index = indexAt(rotRef.current, list.length);
    const label = list[index];
    setPhase('won');
    setWinner({
      label,
      index,
      id: uid()
    });
    setAnnounce(`${tt.winnerIs}: ${label}`);
    sfx('land');
    if (hp) vibrate(30);
    onSpun(label, th.key);
    later(() => setShowResult(true), 320);
  };
  const celebrate = withFanfare => {
    const {
      theme: th,
      haptics: hp
    } = cfgRef.current;
    if (withFanfare) sfx('win');
    if (hp) vibrate([40, 60, 40, 60, 120]);
    triggerThemeEffect(th);
    if (th.effect === 'shake' && !REDUCED_MOTION) {
      setShaking(true);
      later(() => setShaking(false), 600);
    }
  };
  const spin = ({
    dir = 1,
    strength = 1
  } = {}) => {
    const list = itemsRef.current;
    const n = list.length;
    if (spinningRef.current || n < 2) return;
    getCtx();
    spinningRef.current = true;
    setShowResult(false);
    setWinner(null);
    setPhase('spinning');
    sfx('whoosh');
    const seg = 360 / n;
    const winIdx = randInt(n);
    const jitter = (rand() - 0.5) * seg * 0.8;
    const targetMod = mod(-(winIdx * seg + seg / 2 + jitter), 360);
    const start = rotRef.current;
    const startMod = mod(start, 360);
    const {
      duration: dur
    } = cfgRef.current;
    const spins = Math.max(3, Math.round(dur * 0.7 * strength)) + randInt(2);
    const delta = dir > 0 ? mod(targetMod - startMod, 360) : -mod(startMod - targetMod, 360);
    const total = delta + dir * spins * 360;
    const T = dur * 1000;
    const t0 = performance.now();
    lastIdxRef.current = indexAt(start, n);
    if (liveRef.current) liveRef.current.textContent = list[lastIdxRef.current];
    const spinId = ++spinSeq.current;
    const frame = now => {
      if (spinSeq.current !== spinId || !spinningRef.current) return;
      const p = Math.min(1, (now - t0) / T);
      const deg = start + total * easeOut(p);
      applyRotation(deg);
      trackAngle(deg, dir);
      if (p < 1) rafRef.current = requestAnimationFrame(frame);else finishSpin();
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
    later(() => {
      if (spinSeq.current === spinId && spinningRef.current) {
        cancelAnimationFrame(rafRef.current);
        applyRotation(start + total);
        finishSpin();
      }
    }, T + 120);
  };
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const wheelCenter = () => {
    const r = wheelBoxRef.current.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      r: r.width / 2
    };
  };
  const angleOf = (e, c) => Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI;
  const onPointerDown = e => {
    if (spinningRef.current || itemsRef.current.length < 2 || e.pointerType === 'mouse' && e.button !== 0) return;
    const c = wheelCenter();
    if (Math.hypot(e.clientX - c.x, e.clientY - c.y) > c.r * 0.9) return;
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    lastIdxRef.current = indexAt(rotRef.current, itemsRef.current.length);
    if (liveRef.current) liveRef.current.textContent = itemsRef.current[lastIdxRef.current];
    dragRef.current = {
      c,
      last: angleOf(e, c),
      moved: 0,
      samples: [{
        t: performance.now(),
        a: rotRef.current
      }]
    };
    setDragging(true);
    if (phase === 'won') setPhase('idle');
  };
  const onPointerMove = e => {
    const d = dragRef.current;
    if (!d) return;
    const a = angleOf(e, d.c);
    let delta = a - d.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.last = a;
    d.moved += Math.abs(delta);
    applyRotation(rotRef.current + delta);
    trackAngle(rotRef.current, delta >= 0 ? 1 : -1);
    const now = performance.now();
    d.samples.push({
      t: now,
      a: rotRef.current
    });
    while (d.samples.length > 2 && now - d.samples[0].t > 90) d.samples.shift();
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!d) return;
    const now = performance.now();
    const s0 = d.samples[0];
    const dt = now - s0.t;
    const v = dt > 0 && dt < 160 ? (rotRef.current - s0.a) / dt : 0;
    if (Math.abs(v) > 0.35 && d.moved > 12) {
      spin({
        dir: v > 0 ? 1 : -1,
        strength: clamp(Math.abs(v) / 1.1, 0.7, 1.6)
      });
    }
  };
  const removeWinner = () => {
    if (!winner || removedForRef.current === winner.id) return;
    removedForRef.current = winner.id;
    const list = itemsRef.current;
    if (list[winner.index] !== winner.label || list.length < 2) return;
    const next = list.filter((_, i) => i !== winner.index);
    setItems(next);
    setEliminated(prev => [...prev, winner.label]);
    if (next.length === 1) {
      later(() => {
        showToast(t.lastStanding(next[0]));
        sfx('win');
        fireConfetti(theme.confettiColors, 1.2);
      }, 300);
    }
  };
  const closeResult = () => {
    setShowResult(false);
    setPhase('idle');
    if (eliminate) removeWinner();
  };
  const closeResultRef = useRef(closeResult);
  closeResultRef.current = closeResult;
  const spinAgain = forceRemove => {
    setShowResult(false);
    if (eliminate || forceRemove) removeWinner();
    later(() => spinRef.current(), 320);
  };
  const shareResult = async () => {
    const text = t.shareText(winner.label);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'JParty',
          text
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (await copyText(text)) showToast(t.copied);
  };
  const replaceItems = next => {
    setItems(next.slice(0, MAX_ITEMS));
    setEliminated([]);
  };
  const itemActions = {
    add: parts => {
      const room = MAX_ITEMS - items.length;
      if (room <= 0) {
        showToast(t.maxReached);
        return;
      }
      sfx('click');
      setItems([...items, ...parts.slice(0, room)]);
      if (parts.length > room) showToast(t.maxReached);
    },
    removeAt: i => {
      const prev = items;
      setItems(items.filter((_, j) => j !== i));
      showToast(t.removed(prev[i]), {
        label: t.undo,
        fn: () => setItems(prev)
      });
    },
    setFromText: text => setItems(parseLines(text)),
    shuffle: () => {
      sfx('click');
      setItems(shuffleArr(items));
      showToast(t.shuffled);
    },
    sort: () => {
      sfx('click');
      setItems([...items].sort((a, b) => a.localeCompare(b, lang, {
        numeric: true,
        sensitivity: 'base'
      })));
    },
    dedupe: () => {
      const seen = new Set();
      const next = items.filter(x => {
        const k = x.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      showToast(t.dupesRemoved(items.length - next.length));
      setItems(next);
    },
    numbers: n => {
      sfx('click');
      replaceItems(Array.from({
        length: n
      }, (_, i) => String(i + 1)));
    },
    sample: () => {
      sfx('click');
      replaceItems(SAMPLE_ITEMS[lang][theme.key] || SAMPLE_ITEMS[lang].drinking);
    },
    clear: () => {
      const prev = items,
        prevElim = eliminated;
      replaceItems([]);
      showToast(t.cleared, {
        label: t.undo,
        fn: () => {
          setItems(prev);
          setEliminated(prevElim);
        }
      });
    },
    restore: () => {
      sfx('click');
      setItems([...items, ...eliminated].slice(0, MAX_ITEMS));
      setEliminated([]);
    }
  };
  useEffect(() => {
    const onKey = e => {
      const cfg = cfgRef.current;
      const tag = e.target && e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target && e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (cfg.showResult) {
          e.stopImmediatePropagation();
          closeResultRef.current();
        }
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || cfg.keysBlocked || cfg.showResult) return;
      if ((e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault();
        spinRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!publish) return;
    publish({
      icon: theme.icon,
      title: themeText.name,
      status: phase === 'spinning' ? 'challenge' : phase === 'won' ? 'finished' : 'setup',
      round: 0,
      participants: [],
      challenge: phase === 'spinning' ? t.spinning : null,
      winner: phase === 'won' && winner ? [{
        id: winner.id,
        name: winner.label,
        avatar: theme.resultEmoji
      }] : [],
      scores: []
    });
  }, [phase, winner, themeText.name]);
  useEffect(() => () => publish && publish(null), []);
  const isSpinning = phase === 'spinning';
  const canSpin = items.length >= 2 && !isSpinning;
  const wheelSize = party ? 'min(92vw, calc(100dvh - 230px))' : 'min(86vw, 440px)';
  return React.createElement("div", {
    className: `w-full flex flex-col items-center gap-5 ${shaking ? 'animate-shake' : ''}`
  }, React.createElement("div", {
    ref: wheelBoxRef,
    "data-state": isSpinning ? 'spinning' : phase === 'won' ? 'won' : 'idle',
    className: "wheel-box wheel-shadow relative aspect-square",
    style: {
      width: wheelSize
    },
    onPointerDown: onPointerDown,
    onPointerMove: onPointerMove,
    onPointerUp: onPointerUp,
    onPointerCancel: onPointerUp,
    role: "img",
    "aria-label": `${t.items}: ${items.join(', ')}`
  }, React.createElement(Rim, {
    theme: theme
  }), React.createElement("div", {
    ref: diskRef,
    className: "wheel-disk absolute",
    style: {
      inset: `${(VB / 2 - skin.r) / VB * 100}%`,
      transform: `rotate(${rotRef.current}deg)`
    }
  }, React.createElement(Disk, {
    items: items,
    theme: theme
  })), React.createElement(Gloss, {
    r: skin.r
  }), React.createElement(Pointer, {
    theme: theme,
    pointerRef: pointerRef
  }), React.createElement("button", {
    onClick: () => spin(),
    onPointerDown: e => e.stopPropagation(),
    disabled: !canSpin,
    "aria-label": t.spin,
    className: "hub-btn absolute left-1/2 top-1/2 z-10 rounded-full grid place-items-center font-black tracking-wider disabled:cursor-not-allowed",
    style: {
      transform: 'translate(-50%, -50%)',
      width: `${HUB_R * 2 / VB * 100}%`,
      aspectRatio: '1 / 1',
      boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
      color: skin.hubText,
      fontSize: 'clamp(10px, 2.6vw, 15px)',
      textShadow: skin.hubText === '#fff' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
    }
  }, React.createElement(HubFace, {
    theme: theme
  }), React.createElement("span", {
    className: "relative z-10"
  }, isSpinning ? '•••' : t.spin)), items.length < 2 && React.createElement("div", {
    className: "absolute inset-0 grid place-items-center pointer-events-none z-10"
  }, React.createElement("div", {
    className: "bg-black/70 rounded-2xl px-4 py-2 text-sm font-semibold mt-[38%]"
  }, t.needTwo))), React.createElement("div", {
    className: "text-center min-h-[2.25rem] flex items-center justify-center -mt-1 w-full"
  }, React.createElement("div", {
    className: `px-4 py-1.5 rounded-full bg-black/30 border border-white/15 font-extrabold text-lg max-w-[90%] truncate transition-opacity ${isSpinning || dragging ? 'opacity-100' : 'hidden'}`,
    "aria-hidden": "true"
  }, React.createElement("span", {
    ref: liveRef
  })), !isSpinning && !dragging && (phase === 'won' && winner ? React.createElement("div", {
    className: "text-lg font-extrabold animate-pop truncate max-w-[90%]"
  }, "\uD83C\uDFC6 ", winner.label) : React.createElement("div", {
    className: "text-xs text-white/65"
  }, t.itemsCount(items.length, duration)))), React.createElement("button", {
    onClick: () => spin(),
    disabled: !canSpin,
    className: `btn-press relative w-full max-w-xs mx-auto font-extrabold text-xl py-4 rounded-full shadow-2xl ${canSpin ? `${theme.btnClass} btn-breathe` : 'bg-white/15 text-white/60 cursor-not-allowed'}`,
    style: {
      '--glow': theme.accent
    }
  }, React.createElement("span", {
    className: "relative z-10 tracking-wider"
  }, isSpinning ? t.spinning : `${t.spin} 🎯`)), React.createElement("div", {
    className: "text-[11px] text-white/55 -mt-2 text-center"
  }, t.spinHint), !party && React.createElement(React.Fragment, null, React.createElement(ItemsPanel, {
    t: t,
    items: items,
    theme: theme,
    disabled: isSpinning,
    eliminatedCount: eliminated.length,
    actions: itemActions
  }), React.createElement("div", {
    className: "text-center text-[11px] text-white/50 pb-6 pt-1"
  }, t.footer)), showResult && winner && React.createElement(ResultModal, {
    key: winner.id,
    t: t,
    lang: lang,
    winner: winner,
    theme: theme,
    themeText: themeText,
    items: items,
    play: sfx,
    onCelebrate: celebrate,
    eliminate: eliminate,
    canRemove: items.length > 2,
    onClose: closeResult,
    onAgain: () => spinAgain(false),
    onRemoveAndSpin: () => spinAgain(true),
    onShare: shareResult
  }), React.createElement("div", {
    "aria-live": "polite",
    className: "sr-only"
  }, announce));
}

/* ==== js/games/party.js ==== */
function PartyView({
  t,
  lang,
  session,
  setSession,
  onBack,
  sfx
}) {
  const summary = sessionSummary(session);
  const [confirmNew, setConfirmNew] = useState(false);
  const setPlayers = players => setSession(s => ({
    ...s,
    players
  }));
  const clearHistory = () => {
    sfx('click');
    setSession(s => ({
      ...s,
      history: [],
      stats: {}
    }));
  };
  const newParty = () => {
    sfx('click');
    setSession(s => createSession(s.players));
    setConfirmNew(false);
  };
  const tile = (label, value, sub) => React.createElement("div", {
    className: "rounded-2xl bg-black/20 border border-white/10 p-3"
  }, React.createElement("div", {
    className: "text-[10px] uppercase tracking-wider text-white/50"
  }, label), React.createElement("div", {
    className: "font-black text-lg truncate mt-0.5"
  }, value), sub && React.createElement("div", {
    className: "text-[11px] text-white/60 truncate"
  }, sub));
  const who = (row, key, unit) => row ? [`${row.player.avatar} ${row.player.name}`, `${row[key]} ${unit}`] : ['—', ''];
  return React.createElement("section", {
    className: "w-full max-w-2xl space-y-4"
  }, React.createElement("div", {
    className: "flex items-center gap-2"
  }, React.createElement("button", {
    onClick: onBack,
    className: "h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press"
  }, "\u2190"), React.createElement("h2", {
    className: "text-2xl font-black"
  }, "\uD83C\uDF89 ", t.party)), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-6"
  }, React.createElement(PlayerSetup, {
    t: t,
    players: session.players,
    onChange: setPlayers,
    min: 1,
    max: MAX_PLAYERS,
    sfx: sfx
  })), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-6"
  }, React.createElement("h3", {
    className: "font-bold mb-3"
  }, "\uD83D\uDCCA ", t.partySummary), React.createElement("div", {
    className: "grid grid-cols-2 sm:grid-cols-3 gap-2"
  }, tile(t.gamesPlayed, summary.gamesPlayed), tile(t.players, summary.playerCount), tile(t.mostWins, ...who(summary.mostWins, 'wins', t.winsLabel)), tile(t.longestStreak, ...who(summary.longestStreak, 'bestStreak', t.streakLabel)), tile(t.mostPlayed, ...who(summary.mostPlayed, 'games', t.games2)), tile(t.mostPoints, ...who(summary.mostPoints, 'points', t.pts)))), React.createElement("div", {
    className: "glass rounded-3xl p-4 sm:p-6"
  }, React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, React.createElement("h3", {
    className: "font-bold"
  }, "\uD83D\uDD52 ", t.gameHistory), session.history.length > 0 && React.createElement("button", {
    onClick: clearHistory,
    className: "text-xs text-white/60 hover:text-white"
  }, t.clearHistory)), session.history.length === 0 ? React.createElement("div", {
    className: "text-sm text-white/60 text-center py-6 border border-dashed border-white/20 rounded-2xl"
  }, t.noGames) : React.createElement("ul", {
    className: "space-y-1.5 max-h-80 overflow-y-auto sb-thin pr-1"
  }, session.history.map(h => {
    const mode = GAME_REGISTRY[h.modeId];
    return React.createElement("li", {
      key: h.id,
      className: "flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2"
    }, React.createElement("span", {
      className: "text-xl",
      "aria-hidden": "true"
    }, mode ? mode.icon : '🎮'), React.createElement("div", {
      className: "flex-1 min-w-0"
    }, React.createElement("div", {
      className: "text-sm font-semibold truncate"
    }, gameTitle(lang, h.modeId, h.gameId)), React.createElement("div", {
      className: "text-[11px] text-white/60 truncate"
    }, h.summary)), React.createElement("span", {
      className: "text-[10px] text-white/50 shrink-0"
    }, fmtAgo(h.ts, lang)));
  })), React.createElement("div", {
    className: "mt-4 border-t border-white/10 pt-4"
  }, confirmNew ? React.createElement("div", {
    className: "flex flex-col sm:flex-row items-center gap-2 text-sm"
  }, React.createElement("span", {
    className: "text-white/75 flex-1"
  }, t.newPartyConfirm), React.createElement("button", {
    onClick: newParty,
    className: "px-4 py-2 rounded-full bg-white text-slate-900 font-bold btn-press"
  }, t.newParty), React.createElement("button", {
    onClick: () => setConfirmNew(false),
    className: "px-4 py-2 rounded-full bg-white/10 border border-white/15 font-bold btn-press"
  }, t.maybeLater)) : React.createElement("button", {
    onClick: () => setConfirmNew(true),
    className: "w-full py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm"
  }, "\u2728 ", t.newParty))));
}

/* ==== js/games/battle.js ==== */
const topBy = (players, key) => {
  const max = Math.max(...players.map(p => p[key]));
  return players.filter(p => p[key] === max);
};
function BattleGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    players: partyPlayers,
    setPlayers,
    sfx,
    celebrate,
    showToast,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish,
    publish
  } = ctx;
  const variant = item.variant;
  const [minP, maxP] = item.players;
  const isDuel = variant === 'quick' || variant === 'bo3' || variant === 'elimination';
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [teams, setTeams] = useState({});
  const [bestOf, setBestOf] = useState(3);
  const [rounds, setRounds] = useState(10);
  const [goal, setGoal] = useState(variant === 'streak' ? 5 : 3);
  useEffect(() => {
    setSelected(sel => sel.filter(id => partyPlayers.some(p => p.id === id)));
  }, [partyPlayers]);
  const all = CHALLENGES[lang];
  const bags = {
    duel: useBag(all.filter(c => c.scope === 'duel'), lang),
    solo: useBag(all.filter(c => c.scope === 'solo'), lang),
    all: useBag(all.filter(c => c.scope === 'all'), lang)
  };
  const rules = useMemo(() => ({
    countdown: 3,
    buildRound: s => {
      const ps = s.players;
      switch (variant) {
        case 'streak':
          {
            const p = ps[(s.round - 1) % ps.length];
            return {
              participants: [p.id],
              challenge: bags.solo.next()
            };
          }
        case 'team':
          {
            const scope = Random.item(['duel', 'solo', 'all']);
            const red = ps.filter(p => s.settings.teams[p.id] === 'red');
            const blue = ps.filter(p => s.settings.teams[p.id] === 'blue');
            const participants = scope === 'all' ? ps.map(p => p.id) : [Random.item(red).id, Random.item(blue).id];
            return {
              participants,
              challenge: bags[scope].next(),
              scope
            };
          }
        case 'elimination':
          {
            let queue = s.current && s.current.queue || [];
            let bye = null;
            if (!queue.length) {
              const r = Random.pairs(ps);
              queue = r.pairs;
              bye = r.bye;
            }
            return {
              participants: queue[0],
              challenge: bags.duel.next(),
              queue: queue.slice(1),
              bye
            };
          }
        default:
          return {
            participants: ps.map(p => p.id),
            challenge: bags.duel.next()
          };
      }
    },
    resolveRound: (s, outcome) => {
      let players = s.players;
      let settings = s.settings;
      const result = {};
      if (isDuel) {
        if (outcome.tie) {
          result.tie = true;
          return {
            players,
            result,
            settings
          };
        }
        const loserId = s.current.participants.find(id => id !== outcome.winnerId);
        players = Score.addPoints(Score.incrementWin(players, outcome.winnerId), outcome.winnerId, 1);
        players = Score.incrementLoss(players, loserId);
        if (variant === 'elimination') players = Score.eliminatePlayer(players, loserId);
        result.winnerId = outcome.winnerId;
        result.loserId = loserId;
      } else if (variant === 'streak') {
        const id = s.current.participants[0];
        if (outcome.success) {
          players = Score.addPoints(Score.incrementStreak(players, id), id, 1);
          const p = Score.byId(players, id);
          result.streak = p.streak;
          result.milestone = p.streak === settings.goal;
        } else {
          players = Score.incrementLoss(Score.resetStreak(players, id), id);
          result.streak = 0;
        }
        result.playerId = id;
        result.success = !!outcome.success;
      } else if (variant === 'team') {
        const team = outcome.team;
        const teamScores = {
          ...settings.teamScores,
          [team]: (settings.teamScores[team] || 0) + 1
        };
        settings = {
          ...settings,
          teamScores
        };
        players = players.map(p => settings.teams[p.id] === team ? {
          ...p,
          score: p.score + 1,
          wins: p.wins + 1
        } : {
          ...p,
          losses: p.losses + 1
        });
        result.team = team;
        result.teamScores = teamScores;
      }
      return {
        players,
        result,
        settings
      };
    },
    checkEnd: s => {
      const ps = s.players;
      switch (variant) {
        case 'quick':
          {
            const need = Math.ceil(s.settings.bestOf / 2);
            const w = ps.find(p => p.wins >= need);
            return w ? [w] : null;
          }
        case 'bo3':
          {
            const w = ps.find(p => p.wins >= 2);
            return w ? [w] : null;
          }
        case 'streak':
          return s.round >= s.settings.rounds ? topBy(ps, 'bestStreak') : null;
        case 'team':
          {
            const sc = s.settings.teamScores || {};
            const team = sc.red >= s.settings.goal ? 'red' : sc.blue >= s.settings.goal ? 'blue' : null;
            return team ? {
              team,
              players: ps.filter(p => s.settings.teams[p.id] === team)
            } : null;
          }
        case 'elimination':
          {
            const active = Score.active(ps);
            return active.length <= 1 ? active : null;
          }
        default:
          return null;
      }
    }
  }), [variant, lang]);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const chosen = partyPlayers.filter(p => selected.includes(p.id));
  const fullTeams = () => {
    const next = {
      ...teams
    };
    chosen.forEach((p, i) => {
      if (next[p.id] !== 'red' && next[p.id] !== 'blue') next[p.id] = i % 2 ? 'blue' : 'red';
    });
    return next;
  };
  const teamsOk = variant !== 'team' || (() => {
    const tm = fullTeams();
    return chosen.some(p => tm[p.id] === 'red') && chosen.some(p => tm[p.id] === 'blue');
  })();
  const canStart = chosen.length >= minP && chosen.length <= maxP && teamsOk;
  const start = () => {
    if (!canStart) return;
    sfx('click');
    engine.startGame(chosen, {
      bestOf: variant === 'bo3' ? 3 : bestOf,
      rounds,
      goal,
      teams: fullTeams(),
      teamScores: {
        red: 0,
        blue: 0
      }
    });
  };
  const decide = outcome => {
    sfx('click');
    engine.resolveRound(outcome);
  };
  const redraw = () => {
    sfx('click');
    const scope = state.current.scope || (variant === 'streak' ? 'solo' : 'duel');
    engine.patchCurrent({
      challenge: bags[scope].next()
    });
  };
  useEffect(() => {
    if (state.status !== 'result' || !state.lastResult) return;
    const r = state.lastResult;
    if (r.milestone) {
      celebrate();
      showToast(t.milestone(state.settings.goal));
    } else if (r.tie) sfx('click');else sfx('ding' in SFX ? 'ding' : 'land');
  }, [state.status]);
  const winnerInfo = useMemo(() => {
    const w = state.winner;
    if (!w) return {
      players: [],
      label: null
    };
    if (Array.isArray(w)) return {
      players: w.map(p => byId(p.id) || p),
      label: null
    };
    return {
      players: w.players.map(p => byId(p.id) || p),
      label: w.team === 'red' ? t.teamRed : t.teamBlue
    };
  }, [state.winner, state.players]);
  useRecordOnFinish(state.status, () => {
    const names = winnerInfo.label || winnerInfo.players.map(p => p.name).join(', ');
    const summary = variant === 'team' ? `${names} · ${state.settings.teamScores.red}–${state.settings.teamScores.blue}` : isDuel && ps.length === 2 ? `${t.wonBy(names)} ${ps[0].wins}–${ps[1].wins}` : t.wonBy(names);
    return gameResultEntry(mode.id, item.id, ps, winnerInfo.players, summary);
  }, onFinish);
  useEffect(() => {
    if (!publish) return;
    const cur = state.current;
    publish({
      icon: item.icon,
      title: meta.title,
      status: state.status,
      round: state.round,
      participants: cur ? cur.participants.map(id => byId(id)).filter(Boolean) : [],
      challenge: cur && state.status === 'challenge' ? cur.challenge.text : null,
      scores: ps,
      winner: winnerInfo.players,
      winnerLabel: winnerInfo.label
    });
  }, [state.status, state.round, state.current, state.players]);
  useEffect(() => () => publish && publish(null), []);
  const totalRounds = variant === 'streak' ? state.settings.rounds : null;
  const cur = state.current;
  let body;
  if (state.status === 'setup') {
    body = React.createElement("div", {
      className: "space-y-5"
    }, React.createElement("p", {
      className: "text-sm text-white/70"
    }, meta.howToPlay), React.createElement(PlayerSetup, {
      t: t,
      players: partyPlayers,
      onChange: setPlayers,
      min: minP,
      max: maxP,
      selected: selected,
      onSelected: setSelected,
      teams: variant === 'team' ? teams : null,
      onTeams: setTeams,
      sfx: sfx
    }), React.createElement("div", {
      className: "space-y-3 border-t border-white/10 pt-4"
    }, variant === 'quick' && React.createElement(OptionPills, {
      label: t.format,
      value: bestOf,
      onChange: setBestOf,
      options: [1, 3, 5].map(n => ({
        value: n,
        label: t.bestOf(n)
      }))
    }), variant === 'streak' && React.createElement(OptionPills, {
      label: t.roundsLabel,
      value: rounds,
      onChange: setRounds,
      options: [6, 10, 15].map(n => ({
        value: n,
        label: String(n)
      }))
    }), variant === 'streak' && React.createElement(OptionPills, {
      label: t.streakGoal,
      value: goal,
      onChange: setGoal,
      options: [3, 5, 10].map(n => ({
        value: n,
        label: `🔥 ${n}`
      }))
    }), variant === 'team' && React.createElement(OptionPills, {
      label: t.firstTo(goal).replace(String(goal), '').trim() || t.firstTo(goal),
      value: goal,
      onChange: setGoal,
      options: [3, 5, 7].map(n => ({
        value: n,
        label: String(n)
      }))
    })), React.createElement("button", {
      onClick: start,
      disabled: !canStart,
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white",
      style: {
        background: `linear-gradient(90deg, ${mode.accent}, #f472b6)`
      }
    }, "\u25B6 ", t.startGame), !canStart && React.createElement("div", {
      className: "text-center text-xs text-white/55"
    }, t.needPlayers(minP), variant === 'team' && !teamsOk ? ` · ${t.teamRed} / ${t.teamBlue}` : ''));
  } else if (state.status === 'countdown') {
    const names = cur.participants.map(id => byId(id)).filter(Boolean).map(p => p.name).join(' · ');
    body = React.createElement(Countdown, {
      seconds: 3,
      onDone: engine.countdownDone,
      play: sfx,
      label: names
    });
  } else if (state.status === 'challenge') {
    const parts = cur.participants.map(id => byId(id)).filter(Boolean);
    const teamOf = p => state.settings.teams[p.id];
    body = React.createElement("div", {
      className: "space-y-5"
    }, isDuel && parts.length === 2 && React.createElement(Versus, {
      a: parts[0],
      b: parts[1],
      t: t
    }), variant === 'streak' && React.createElement("div", {
      className: "flex flex-col items-center gap-2"
    }, React.createElement(Avatar, {
      player: parts[0],
      size: 72
    }), React.createElement("div", {
      className: "text-2xl font-black"
    }, parts[0].name), React.createElement("div", {
      className: "text-sm font-bold text-orange-300"
    }, "\uD83D\uDD25 \xD7", parts[0].streak, " \xB7 ", t.streakGoal, " ", state.settings.goal)), variant === 'team' && React.createElement("div", {
      className: "flex items-center gap-3"
    }, ['red', 'blue'].map(team => React.createElement("div", {
      key: team,
      className: "flex-1 rounded-2xl p-3 border",
      style: {
        borderColor: team === 'red' ? '#f87171' : '#60a5fa',
        background: team === 'red' ? 'rgba(248,113,113,0.12)' : 'rgba(96,165,250,0.12)'
      }
    }, React.createElement("div", {
      className: "text-[10px] font-black tracking-widest uppercase mb-2",
      style: {
        color: team === 'red' ? '#fca5a5' : '#93c5fd'
      }
    }, team === 'red' ? t.teamRed : t.teamBlue, " \xB7 ", state.settings.teamScores[team]), React.createElement("div", {
      className: "flex flex-wrap gap-1"
    }, parts.filter(p => teamOf(p) === team).map(p => React.createElement(PlayerChip, {
      key: p.id,
      player: p,
      size: 30
    })), cur.scope === 'all' && React.createElement("span", {
      className: "text-[11px] text-white/60 self-center"
    }, t.wholeTeam))))), variant === 'elimination' && cur.bye && React.createElement("div", {
      className: "text-center text-xs text-white/60"
    }, t.bye(byId(cur.bye) ? byId(cur.bye).name : '')), React.createElement(ChallengeCard, {
      t: t,
      challenge: cur.challenge,
      accent: mode.accent
    }), isDuel && parts.length === 2 && React.createElement(Decision, {
      hint: t.whoWon,
      onPick: id => id === 'tie' ? decide({
        tie: true
      }) : decide({
        winnerId: id
      }),
      options: [{
        id: parts[0].id,
        label: parts[0].name,
        icon: parts[0].avatar,
        color: parts[0].color
      }, {
        id: parts[1].id,
        label: parts[1].name,
        icon: parts[1].avatar,
        color: parts[1].color
      }, {
        id: 'tie',
        label: t.tie,
        icon: '🤝'
      }]
    }), variant === 'streak' && React.createElement(Decision, {
      onPick: id => decide({
        success: id === 'ok'
      }),
      options: [{
        id: 'ok',
        label: t.success,
        icon: '✅',
        color: '#4ade80'
      }, {
        id: 'fail',
        label: t.failed,
        icon: '❌',
        color: '#f87171'
      }]
    }), variant === 'team' && React.createElement(Decision, {
      hint: t.whoWon,
      onPick: team => decide({
        team
      }),
      options: [{
        id: 'red',
        label: t.teamRed,
        icon: '🔴',
        color: '#f87171'
      }, {
        id: 'blue',
        label: t.teamBlue,
        icon: '🔵',
        color: '#60a5fa'
      }]
    }), React.createElement("button", {
      onClick: redraw,
      className: "w-full text-xs font-bold text-white/60 hover:text-white py-1"
    }, "\uD83D\uDD01 ", t.newChallenge));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    let headline;
    if (r.tie) headline = `🤝 ${t.tie}`;else if (isDuel) headline = `${byId(r.winnerId).avatar} ${t.pointTo(byId(r.winnerId).name)}${variant === 'elimination' ? ` · ${t.isOut(byId(r.loserId).name)}` : ''}`;else if (variant === 'streak') headline = r.success ? `🔥 ${byId(r.playerId).name} ×${r.streak}` : `💔 ${byId(r.playerId).name} — ${t.failed}`;else headline = `${r.team === 'red' ? '🔴 ' + t.teamRed : '🔵 ' + t.teamBlue} +1 · ${r.teamScores.red}–${r.teamScores.blue}`;
    const over = !!engine.pendingWinner;
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, headline), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: r.winnerId ? [r.winnerId] : r.playerId ? [r.playerId] : [],
      metric: variant === 'streak' ? 'streak' : variant === 'quick' || variant === 'bo3' || variant === 'elimination' ? 'wins' : 'score',
      metricLabel: variant === 'streak' ? '' : variant === 'team' ? t.pts : t.winsLabel
    })), React.createElement("button", {
      onClick: () => {
        sfx('click');
        engine.nextRound();
      },
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
      style: {
        background: `linear-gradient(90deg, ${mode.accent}, #f472b6)`
      }
    }, over ? `🏁 ${t.finish}` : `▶ ${t.nextRound}`));
  } else {
    const w = winnerInfo.players;
    const stats = w.length === 1 ? [`🏆 ${w[0].score} ${t.points}`, `🔥 ${w[0].bestStreak} ${t.streakLabel}`, `⚡ ${w[0].wins} ${t.winsLabel}`] : variant === 'team' ? [`🔴 ${state.settings.teamScores.red}`, `🔵 ${state.settings.teamScores.blue}`] : [];
    body = React.createElement(GameResult, {
      t: t,
      winners: w,
      winnerLabel: winnerInfo.label,
      players: variant === 'team' ? null : ps,
      stats: stats,
      metric: variant === 'streak' ? 'score' : 'wins',
      metricLabel: variant === 'streak' ? t.pts : t.winsLabel,
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: totalRounds,
    status: state.status,
    onExit: onExit
  }, body);
}

/* ==== js/games/king.js ==== */
function KingGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    players: partyPlayers,
    setPlayers,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish,
    publish
  } = ctx;
  const variant = item.variant;
  const [minP, maxP] = item.players;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [rounds, setRounds] = useState(8);
  useEffect(() => {
    setSelected(sel => sel.filter(id => partyPlayers.some(p => p.id === id)));
  }, [partyPlayers]);
  const bag = useBag(CHALLENGES[lang].filter(c => c.scope === 'duel'), lang);
  const rules = useMemo(() => ({
    countdown: round => round === 1 ? 3 : 0,
    buildRound: s => {
      const prev = s.current;
      const kingId = s.lastResult ? s.lastResult.newKingId : prev ? prev.kingId : Random.player(s.players).id;
      const reign = s.lastResult ? s.lastResult.reign : 1;
      let queue = prev && prev.queue || [];
      queue = queue.filter(id => id !== kingId && !Score.byId(s.players, id).eliminated);
      if (!queue.length) queue = shuffleArr(Score.active(s.players).filter(p => p.id !== kingId).map(p => p.id));
      const challengerId = queue[0];
      const options = variant === 'challenge' ? [bag.next(), bag.next(), bag.next()] : null;
      return {
        kingId,
        challengerId,
        reign,
        queue: queue.slice(1),
        challenge: options ? null : bag.next(),
        options
      };
    },
    resolveRound: (s, {
      winnerId
    }) => {
      const {
        kingId,
        challengerId,
        reign
      } = s.current;
      let players = s.players;
      const defended = winnerId === kingId;
      const loserId = defended ? challengerId : kingId;
      players = Score.addPoints(Score.incrementWin(players, winnerId), winnerId, 1);
      players = Score.incrementLoss(players, loserId);
      if (variant === 'last' && defended) players = Score.eliminatePlayer(players, challengerId);
      return {
        players,
        result: {
          kingId,
          challengerId,
          defended,
          newKingId: winnerId,
          reign: defended ? reign + 1 : 1
        }
      };
    },
    checkEnd: s => {
      const kingId = s.lastResult ? s.lastResult.newKingId : null;
      if (!kingId) return null;
      if (variant === 'last') {
        const others = Score.active(s.players).filter(p => p.id !== kingId);
        return others.length === 0 ? [Score.byId(s.players, kingId)] : null;
      }
      return s.round >= s.settings.rounds ? [Score.byId(s.players, kingId)] : null;
    }
  }), [variant, lang]);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const chosen = partyPlayers.filter(p => selected.includes(p.id));
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  const start = () => {
    if (!canStart) return;
    sfx('click');
    engine.startGame(chosen, {
      rounds
    });
  };
  const kingStats = useMemo(() => {
    const stats = {};
    let run = {
      id: null,
      len: 0
    };
    state.history.forEach(h => {
      const st = stats[h.kingId] = stats[h.kingId] || {
        defenses: 0,
        longest: 0
      };
      if (h.defended) st.defenses += 1;
      if (run.id === h.newKingId) run.len += 1;else run = {
        id: h.newKingId,
        len: 1
      };
      const ns = stats[h.newKingId] = stats[h.newKingId] || {
        defenses: 0,
        longest: 0
      };
      ns.longest = Math.max(ns.longest, run.len);
    });
    return stats;
  }, [state.history]);
  useEffect(() => {
    if (state.status === 'result') sfx(state.lastResult.defended ? 'land' : 'win');
  }, [state.status]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => {
    const k = winners[0];
    const st = k ? kingStats[k.id] || {
      defenses: 0,
      longest: 0
    } : {
      defenses: 0,
      longest: 0
    };
    return gameResultEntry(mode.id, item.id, ps, winners, k ? `👑 ${k.name} · ${st.defenses} ${t.defenses}` : '');
  }, onFinish);
  useEffect(() => {
    if (!publish) return;
    const cur = state.current;
    publish({
      icon: item.icon,
      title: meta.title,
      status: state.status,
      round: state.round,
      participants: cur ? [byId(cur.kingId), byId(cur.challengerId)].filter(Boolean) : [],
      roles: [t.king, t.challenger],
      challenge: cur && state.status === 'challenge' && cur.challenge ? cur.challenge.text : null,
      scores: ps,
      winner: winners
    });
  }, [state.status, state.round, state.current, state.players]);
  useEffect(() => () => publish && publish(null), []);
  const cur = state.current;
  let body;
  if (state.status === 'setup') {
    body = React.createElement("div", {
      className: "space-y-5"
    }, React.createElement("p", {
      className: "text-sm text-white/70"
    }, meta.howToPlay), React.createElement(PlayerSetup, {
      t: t,
      players: partyPlayers,
      onChange: setPlayers,
      min: minP,
      max: maxP,
      selected: selected,
      onSelected: setSelected,
      sfx: sfx
    }), variant !== 'last' && React.createElement("div", {
      className: "border-t border-white/10 pt-4"
    }, React.createElement(OptionPills, {
      label: t.roundsLabel,
      value: rounds,
      onChange: setRounds,
      options: [5, 8, 12].map(n => ({
        value: n,
        label: String(n)
      }))
    })), React.createElement("button", {
      onClick: start,
      disabled: !canStart,
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-slate-900",
      style: {
        background: `linear-gradient(90deg, ${mode.accent}, #fde68a)`
      }
    }, "\uD83D\uDC51 ", t.startGame), !canStart && React.createElement("div", {
      className: "text-center text-xs text-white/55"
    }, t.needPlayers(minP)));
  } else if (state.status === 'countdown') {
    body = React.createElement(Countdown, {
      seconds: 3,
      onDone: engine.countdownDone,
      play: sfx,
      label: `👑 ${byId(cur.kingId).name}`
    });
  } else if (state.status === 'challenge') {
    const king = byId(cur.kingId);
    const ch = byId(cur.challengerId);
    body = React.createElement("div", {
      className: "space-y-5"
    }, React.createElement(Versus, {
      a: king,
      b: ch,
      t: t,
      labelA: `👑 ${t.king} · ${t.reign(cur.reign)}`,
      labelB: `⚔️ ${t.challenger}`
    }), !cur.challenge ? React.createElement("div", {
      className: "space-y-2"
    }, React.createElement("div", {
      className: "text-center text-sm font-bold text-white/80"
    }, t.pickChallenge), React.createElement("div", {
      className: "grid gap-2"
    }, cur.options.map(o => React.createElement("button", {
      key: o.id,
      onClick: () => {
        sfx('click');
        engine.patchCurrent({
          challenge: o
        });
      },
      className: "text-left rounded-2xl p-3.5 bg-black/25 border border-white/15 hover:border-white/40 btn-press font-semibold"
    }, "\u2694\uFE0F ", o.text)))) : React.createElement(React.Fragment, null, React.createElement(ChallengeCard, {
      t: t,
      challenge: cur.challenge,
      accent: mode.accent
    }), React.createElement(Decision, {
      hint: t.whoWon,
      onPick: id => {
        sfx('click');
        engine.resolveRound({
          winnerId: id
        });
      },
      options: [{
        id: king.id,
        label: `👑 ${king.name}`,
        color: king.color
      }, {
        id: ch.id,
        label: `⚔️ ${ch.name}`,
        color: ch.color
      }]
    }), variant !== 'challenge' && React.createElement("button", {
      onClick: () => {
        sfx('click');
        engine.patchCurrent({
          challenge: bag.next()
        });
      },
      className: "w-full text-xs font-bold text-white/60 hover:text-white py-1"
    }, "\uD83D\uDD01 ", t.newChallenge)));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const newKing = byId(r.newKingId);
    const over = !!engine.pendingWinner;
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "text-6xl crown-float",
      "aria-hidden": "true"
    }, "\uD83D\uDC51"), React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, r.defended ? `${t.kingStays} ${newKing.name} · ${t.reign(r.reign)}` : `${t.newKing} ${newKing.name}`), variant === 'last' && r.defended && React.createElement("div", {
      className: "text-sm text-white/70"
    }, t.isOut(byId(r.challengerId).name)), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.newKingId],
      metric: "wins",
      metricLabel: t.winsLabel
    })), React.createElement("button", {
      onClick: () => {
        sfx('click');
        engine.nextRound();
      },
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-slate-900",
      style: {
        background: `linear-gradient(90deg, ${mode.accent}, #fde68a)`
      }
    }, over ? `🏁 ${t.finish}` : `▶ ${t.nextRound}`));
  } else {
    const k = winners[0];
    const st = k ? kingStats[k.id] || {
      defenses: 0,
      longest: 0
    } : {
      defenses: 0,
      longest: 0
    };
    body = React.createElement(GameResult, {
      t: t,
      title: t.kingOfNight,
      winners: winners,
      players: ps,
      metric: "wins",
      metricLabel: t.winsLabel,
      stats: k ? [`🛡️ ${st.defenses} ${t.defenses}`, `👑 ${t.longestReign}: ${st.longest}`, `⚡ ${k.wins} ${t.winsLabel}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: variant === 'last' ? null : state.settings.rounds,
    status: state.status,
    onExit: onExit
  }, body);
}

/* ==== js/games/quiz.js ==== */
function QuizMedia({
  media,
  lang,
  size = 'lg'
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [media && media.src]);
  if (!media) return null;
  const h = size === 'lg' ? 'h-32 sm:h-40' : 'h-14 sm:h-16';
  if (failed || !media.src) {
    return React.createElement("div", {
      className: `${h} grid place-items-center ${size === 'lg' ? 'text-7xl' : 'text-4xl'}`,
      "aria-label": L(media.alt, lang)
    }, media.emoji || '🖼️');
  }
  return React.createElement("img", {
    src: media.src,
    alt: L(media.alt, lang) || '',
    onError: () => setFailed(true),
    loading: "eager",
    draggable: "false",
    className: `${h} w-auto max-w-full mx-auto rounded-xl object-contain shadow-lg ring-1 ring-white/20 bg-white/5`
  });
}
function QuizThemeCards({
  t,
  lang,
  currentId,
  prefs,
  sub,
  onPick,
  custom = false
}) {
  const list = QUIZ_THEMES.filter(th => !!th.custom === custom);
  if (!list.length) return null;
  return React.createElement("div", {
    className: "grid grid-cols-2 gap-2.5"
  }, list.map(th => {
    const active = th.id === currentId;
    const n = quizPool(th.id, prefs).length;
    const mix = difficultyMix(quizPool(th.id, {
      ...prefs,
      difficulty: 'all'
    }));
    const total = mix.easy + mix.medium + mix.hard || 1;
    const locked = !planAtLeast(sub.plan, th.plan);
    return React.createElement("button", {
      key: th.id,
      onClick: () => onPick(th),
      "aria-pressed": active,
      className: `relative text-left rounded-2xl p-3 border btn-press overflow-hidden ${active ? 'border-white/80 ring-2 ring-white/40' : 'border-white/15 hover:border-white/40'}`,
      style: {
        background: `linear-gradient(145deg, ${th.accent}55, ${th.accent}14 70%)`
      }
    }, React.createElement("div", {
      className: "flex items-start justify-between gap-2"
    }, React.createElement("span", {
      className: "text-3xl leading-none",
      "aria-hidden": "true"
    }, th.icon), React.createElement("span", {
      className: "flex items-center gap-1"
    }, React.createElement(PlanBadge, {
      plan: th.plan,
      locked: locked,
      t: t
    }), active && React.createElement("span", {
      className: "w-5 h-5 rounded-full bg-white text-slate-900 grid place-items-center text-[11px] font-black"
    }, "\u2713"))), React.createElement("div", {
      className: "font-extrabold mt-2 leading-tight"
    }, L(th.title, lang)), React.createElement("div", {
      className: "text-[11px] text-white/75 mt-0.5 leading-snug line-clamp-2"
    }, L(th.description, lang)), React.createElement("div", {
      className: "flex items-center justify-between mt-2 gap-2"
    }, React.createElement("span", {
      className: "text-[11px] font-bold text-white/85"
    }, t.questionsAvailable(n)), React.createElement("span", {
      className: "flex h-1.5 w-14 rounded-full overflow-hidden bg-white/10",
      title: `${t.difficultyLabels.easy} ${mix.easy} · ${t.difficultyLabels.medium} ${mix.medium} · ${t.difficultyLabels.hard} ${mix.hard}`
    }, React.createElement("span", {
      style: {
        width: `${mix.easy / total * 100}%`
      },
      className: "bg-green-400"
    }), React.createElement("span", {
      style: {
        width: `${mix.medium / total * 100}%`
      },
      className: "bg-yellow-300"
    }), React.createElement("span", {
      style: {
        width: `${mix.hard / total * 100}%`
      },
      className: "bg-red-400"
    }))));
  }));
}
function QuizGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    players: partyPlayers,
    setPlayers,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish,
    publish,
    sub,
    openItem,
    host,
    quizPrefs,
    setQuizPrefs
  } = ctx;
  const custom = item.customGameId ? quizTheme(item.quizTheme) : null;
  const [minP, maxP] = item.players;
  const theme = quizTheme(item.quizTheme);
  const [customPrefs, setCustomPrefs] = useState(() => ({
    ...quizPrefs,
    ruleset: 'custom',
    difficulty: 'all'
  }));
  const prefs = custom ? customPrefs : quizPrefs;
  const setPrefs = patch => custom ? setCustomPrefs(p => ({
    ...p,
    ...patch
  })) : setQuizPrefs(patch);
  const rs = rulesetFor(item.quizTheme, prefs.ruleset);
  const [teamCount, setTeamCount] = useState(() => custom && custom.config ? custom.config.teams : 0);
  const [teams, setTeams] = useState({});
  const liveIds = host && host.livePlayerIds || [];
  const liveOn = !!(host && host.room) && liveIds.length > 0;
  const available = useMemo(() => theme ? quizPool(theme.id, prefs).length : 0, [theme, prefs.ruleset, prefs.difficulty]);
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  useEffect(() => {
    setSelected(sel => sel.filter(id => partyPlayers.some(p => p.id === id)));
  }, [partyPlayers]);
  const timer = useTimer();
  const rules = useMemo(() => ({
    countdown: round => round === 1 ? 3 : 0,
    buildRound: s => {
      const q = s.settings.deck[s.round - 1];
      if (s.settings.live) return {
        playerId: null,
        q,
        phase: 'question',
        startedAt: 0,
        live: true
      };
      const p = s.players[(s.round - 1) % s.players.length];
      return {
        playerId: p.id,
        q,
        phase: s.players.length > 1 ? 'handoff' : 'question',
        startedAt: 0
      };
    },
    resolveRound: (s, outcome) => {
      const {
        playerId,
        q
      } = s.current;
      const r = s.settings.rules;
      if (s.current.live) {
        const given = outcome.answers || {};
        const qTime = q.timeMs != null ? q.timeMs : r.time;
        const base = q.points != null ? q.points : r.points;
        let players = s.players;
        const stats = {
          ...s.settings.stats
        };
        const perPlayer = {};
        s.players.forEach(p => {
          const a = given[p.id];
          if (!a) {
            players = Score.resetStreak(players, p.id);
            perPlayer[p.id] = {
              answered: false,
              correct: false,
              points: 0
            };
            return;
          }
          const correct = a.index === q.answer;
          const bonus = correct && qTime > 0 && r.speedBonus ? Math.round(r.speedBonus * clamp(1 - a.ms / qTime, 0, 1)) : 0;
          const points = correct ? base + bonus : 0;
          players = correct ? Score.addPoints(Score.incrementStreak(players, p.id), p.id, points) : Score.resetStreak(players, p.id);
          const prev = stats[p.id] || {
            correct: 0,
            answered: 0,
            fastest: null
          };
          stats[p.id] = {
            correct: prev.correct + (correct ? 1 : 0),
            answered: prev.answered + 1,
            fastest: correct ? Math.min(prev.fastest ?? Infinity, a.ms) : prev.fastest
          };
          perPlayer[p.id] = {
            answered: true,
            correct,
            points,
            index: a.index,
            ms: a.ms
          };
        });
        return {
          players,
          result: {
            live: true,
            perPlayer,
            answeredCount: Object.keys(given).length
          },
          settings: {
            ...s.settings,
            stats
          }
        };
      }
      const {
        answer,
        ms
      } = outcome;
      const correct = answer === q.answer;
      const qTime = q.timeMs != null ? q.timeMs : r.time;
      const base = q.points != null ? q.points : r.points;
      const bonus = correct && qTime > 0 ? Math.round(r.speedBonus * clamp(1 - ms / qTime, 0, 1)) : 0;
      const points = correct ? base + bonus : 0;
      const players = correct ? Score.addPoints(Score.incrementStreak(s.players, playerId), playerId, points) : Score.resetStreak(s.players, playerId);
      const prev = s.settings.stats[playerId] || {
        correct: 0,
        answered: 0,
        fastest: null
      };
      const stats = {
        ...s.settings.stats,
        [playerId]: {
          correct: prev.correct + (correct ? 1 : 0),
          answered: prev.answered + 1,
          fastest: correct ? Math.min(prev.fastest ?? Infinity, ms) : prev.fastest
        }
      };
      return {
        players,
        result: {
          playerId,
          correct,
          points,
          bonus,
          answer,
          ms
        },
        settings: {
          ...s.settings,
          stats
        }
      };
    },
    checkEnd: s => s.round >= s.settings.count ? Score.leaders(s.players) : null
  }), []);
  const teamScores = (players, settings) => {
    const n = settings.teamCount || 0;
    if (!n) return [];
    return Array.from({
      length: n
    }, (_, i) => {
      const members = players.filter(p => settings.teams[p.id] === i);
      return {
        index: i,
        name: TEAM_NAMES[i],
        color: TEAM_COLORS[i],
        members,
        score: members.reduce((a, p) => a + p.score, 0)
      };
    }).sort((a, b) => b.score - a.score);
  };
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const chosen = partyPlayers.filter(p => selected.includes(p.id));
  const livePlayers = chosen.filter(p => liveIds.includes(p.id));
  const live = liveOn && livePlayers.length > 0;
  useEffect(() => {
    if (liveOn) setSelected(sel => Array.from(new Set([...sel, ...liveIds])));
  }, [liveOn, liveIds.join()]);
  const count = custom ? available : Math.min(prefs.count, available);
  const teamsOk = teamCount === 0 || chosen.length >= teamCount;
  const canStart = !!theme && chosen.length >= minP && chosen.length <= maxP && count > 0 && teamsOk;
  const fullTeams = () => {
    if (!teamCount) return {};
    const next = {
      ...teams
    };
    const ids = chosen.map(p => p.id);
    ids.forEach((id, i) => {
      if (next[id] == null || next[id] >= teamCount) next[id] = i % teamCount;
    });
    return next;
  };
  const randomTeams = () => {
    const next = {};
    shuffleArr(chosen).forEach((p, i) => {
      next[p.id] = i % teamCount;
    });
    setTeams(next);
    sfx('click');
  };
  const start = () => {
    if (!canStart) return;
    sfx('click');
    const deck = dealQuiz(theme.id, prefs, count);
    rememberQuiz(theme.id, deck.map(q => q.id));
    if (live && host) host.clearAnswers();
    engine.startGame(live ? livePlayers : chosen, {
      count: deck.length,
      deck,
      rules: rs,
      stats: {},
      teamCount,
      teams: fullTeams(),
      live
    });
  };
  const cur = state.current;
  const showing = state.status === 'challenge' && cur && cur.phase === 'question';
  const baseTime = (state.settings.rules || rs).time;
  const time = cur && cur.q && cur.q.timeMs != null ? cur.q.timeMs : baseTime;
  const untimed = !time;
  const liveRound = !!(cur && cur.live);
  useEffect(() => {
    if (showing && cur && !cur.startedAt) engine.patchCurrent({
      startedAt: performance.now()
    });
  }, [showing, state.round]);
  const liveAnswers = liveRound && host ? host.answersFor(cur.q.id) : {};
  const liveCount = Object.keys(liveAnswers).length;
  const closeRound = () => {
    if (liveRound) engine.resolveRound({
      answers: host ? host.answersFor(cur.q.id) : {}
    });else engine.resolveRound({
      answer: null,
      ms: time
    });
  };
  const closeRef = useRef(closeRound);
  closeRef.current = closeRound;
  useEffect(() => {
    if (!showing || untimed) {
      timer.stop();
      return;
    }
    timer.start(time, () => {
      sfx('land');
      closeRef.current();
    });
    return () => timer.stop();
  }, [showing, state.round, untimed, time]);
  useEffect(() => {
    if (!showing || !liveRound || !ps.length || liveCount < ps.length) return;
    const id = setTimeout(() => {
      timer.stop();
      sfx('land');
      closeRef.current();
    }, 400);
    return () => clearTimeout(id);
  }, [showing, liveRound, liveCount, ps.length]);
  const answer = i => {
    if (!showing) return;
    const elapsed = performance.now() - cur.startedAt;
    timer.stop();
    engine.resolveRound({
      answer: i,
      ms: untimed ? elapsed : Math.min(time, elapsed)
    });
  };
  const skipQuestion = () => {
    timer.stop();
    sfx('click');
    closeRef.current();
  };
  const restartQuestion = () => {
    sfx('click');
    engine.patchCurrent({
      startedAt: performance.now()
    });
    if (!untimed) timer.start(time, () => {
      sfx('land');
      engine.resolveRound({
        answer: null,
        ms: time
      });
    });
  };
  useEffect(() => {
    if (state.status !== 'result') return;
    sfx(state.lastResult.correct ? 'win' : 'land');
  }, [state.status]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  const statsOf = id => state.settings.stats[id] || {
    correct: 0,
    answered: 0,
    fastest: null
  };
  useRecordOnFinish(state.status, () => {
    const w = winners[0];
    return gameResultEntry(mode.id, item.id, ps, winners, w ? `${w.name} · ${w.score} ${t.points} · ${statsOf(w.id).correct}/${statsOf(w.id).answered}` : '');
  }, onFinish);
  useEffect(() => {
    if (!publish) return;
    publish({
      icon: item.icon,
      title: meta.title,
      status: state.status,
      round: state.round,
      total: state.settings.count,
      participants: cur ? [byId(cur.playerId)].filter(Boolean) : [],
      challenge: showing ? L(cur.q.question, lang) : null,
      image: showing && cur.q.media ? cur.q.media.src : null,
      questionId: cur && cur.q ? cur.q.id : null,
      askedAt: cur ? cur.startedAt : null,
      options: cur && cur.live && (showing || state.status === 'result') ? cur.q.options.map(o => ({
        text: L(o, lang),
        image: o.media ? o.media.src : null
      })) : null,
      reveal: state.status === 'result' && cur && cur.live ? {
        answer: cur.q.answer
      } : null,
      timerMs: showing && !untimed ? timer.ms : null,
      scores: ps,
      winner: winners
    });
  }, [state.status, state.round, cur, state.players, Math.ceil(timer.ms / 1000), liveCount]);
  useEffect(() => () => publish && publish(null), []);
  const accentBtn = {
    background: `linear-gradient(90deg, ${theme ? theme.accent : mode.accent}, #a78bfa)`
  };
  const optionLabel = o => L(o, lang);
  let body;
  if (!theme) {
    body = React.createElement("div", {
      className: "text-center text-white/70 py-10"
    }, t.noQuestions);
  } else if (state.status === 'setup') {
    body = React.createElement("div", {
      className: "space-y-5"
    }, custom ? React.createElement("div", {
      className: "rounded-2xl p-4 border border-white/15",
      style: {
        background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accent}0d)`
      }
    }, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, t.yourGame), React.createElement("div", {
      className: "text-xl font-black mt-0.5"
    }, theme.icon, " ", L(theme.title, lang)), L(theme.description, lang) && React.createElement("div", {
      className: "text-sm text-white/70 mt-1"
    }, L(theme.description, lang)), React.createElement("div", {
      className: "text-[11px] text-white/60 mt-2"
    }, t.questionsN(available), " \xB7 \u23F1 ", custom.config.timerSec === 0 ? '∞' : `${custom.config.timerSec}s`)) : React.createElement(React.Fragment, null, React.createElement("div", null, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, t.quizTitle), React.createElement("h3", {
      className: "text-lg font-black mt-0.5"
    }, t.chooseTheme)), React.createElement(QuizThemeCards, {
      t: t,
      lang: lang,
      currentId: theme.id,
      prefs: prefs,
      sub: sub,
      onPick: th => {
        if (th.id !== theme.id) {
          sfx('click');
          openItem('quiz', `quiz-${th.id}`);
        }
      }
    }), QUIZ_THEMES.some(th => th.custom) && React.createElement(React.Fragment, null, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55 pt-1"
    }, "\uD83C\uDF93 ", t.myGames), React.createElement(QuizThemeCards, {
      t: t,
      lang: lang,
      currentId: theme.id,
      prefs: {
        ...prefs,
        ruleset: 'custom',
        difficulty: 'all'
      },
      sub: sub,
      custom: true,
      onPick: th => {
        if (th.id !== theme.id) {
          sfx('click');
          openItem('quiz', `quiz-${th.id}`);
        }
      }
    }))), React.createElement("div", {
      className: "space-y-3 border-t border-white/10 pt-4"
    }, !custom && React.createElement(React.Fragment, null, React.createElement(OptionPills, {
      label: t.difficulty,
      value: prefs.difficulty,
      onChange: v => setPrefs({
        difficulty: v
      }),
      options: ['all', ...DIFFICULTIES].map(d => ({
        value: d,
        label: d === 'all' ? t.allLevels : t.difficultyLabels[d]
      }))
    }), React.createElement(OptionPills, {
      label: t.questions,
      value: prefs.count,
      onChange: v => setPrefs({
        count: v
      }),
      options: [5, 10, 15, 20].map(n => ({
        value: n,
        label: String(n)
      }))
    }), available < prefs.count && React.createElement("div", {
      className: "text-[11px] text-amber-200 text-right"
    }, t.onlyAvailable(available))), React.createElement(OptionPills, {
      label: t.teamsLabel,
      value: teamCount,
      onChange: v => {
        setTeamCount(v);
        setTeams({});
      },
      options: [{
        value: 0,
        label: t.individual
      }, {
        value: 2,
        label: '2'
      }, {
        value: 3,
        label: '3'
      }, {
        value: 4,
        label: '4'
      }]
    }), teamCount > 0 && React.createElement("div", {
      className: "rounded-2xl bg-black/20 border border-white/10 p-3 space-y-2"
    }, React.createElement("div", {
      className: "flex items-center justify-between"
    }, React.createElement("span", {
      className: "text-xs font-bold uppercase tracking-wider text-white/55"
    }, t.assignTeams), React.createElement(ToolBtn, {
      onClick: randomTeams,
      disabled: chosen.length < teamCount
    }, "\uD83C\uDFB2 ", t.autoTeams)), chosen.length < teamCount ? React.createElement("div", {
      className: "text-[11px] text-amber-200"
    }, t.needPlayers(teamCount)) : React.createElement("ul", {
      className: "space-y-1"
    }, chosen.map(p => {
      const ti = fullTeams()[p.id] || 0;
      return React.createElement("li", {
        key: p.id,
        className: "flex items-center gap-2"
      }, React.createElement(Avatar, {
        player: p,
        size: 26
      }), React.createElement("span", {
        className: "flex-1 min-w-0 truncate text-sm font-semibold"
      }, p.name), React.createElement("div", {
        className: "flex gap-1"
      }, Array.from({
        length: teamCount
      }, (_, i) => React.createElement("button", {
        key: i,
        onClick: () => setTeams({
          ...fullTeams(),
          [p.id]: i
        }),
        "aria-pressed": ti === i,
        className: `w-7 h-7 rounded-lg text-[11px] font-black btn-press ${ti === i ? 'text-slate-900' : 'text-white/50 border border-white/20'}`,
        style: ti === i ? {
          background: TEAM_COLORS[i]
        } : undefined
      }, TEAM_NAMES[i]))));
    })))), liveOn && React.createElement("div", {
      className: "rounded-2xl p-3 border border-green-300/40 bg-green-500/10 flex items-center gap-3"
    }, React.createElement("span", {
      className: "w-2 h-2 rounded-full bg-green-400 pulse-soft shrink-0"
    }), React.createElement("div", {
      className: "flex-1 min-w-0 text-sm"
    }, React.createElement("div", {
      className: "font-bold"
    }, t.liveClassroom, " \xB7 ", t.room, " ", React.createElement("span", {
      className: "font-mono tracking-widest"
    }, host.room.code)), React.createElement("div", {
      className: "text-[11px] text-white/70"
    }, t.liveClassroomHint(liveIds.length)))), React.createElement(PlayerSetup, {
      t: t,
      players: partyPlayers,
      onChange: setPlayers,
      min: minP,
      max: maxP,
      selected: selected,
      onSelected: setSelected,
      sfx: sfx
    }), React.createElement("button", {
      onClick: start,
      disabled: !canStart,
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white",
      style: accentBtn
    }, theme.icon, " ", t.startGame), !canStart && React.createElement("div", {
      className: "text-center text-xs text-white/55"
    }, count === 0 ? t.noQuestions : t.needPlayers(minP)));
  } else if (state.status === 'countdown') {
    body = React.createElement(Countdown, {
      seconds: 3,
      onDone: engine.countdownDone,
      play: sfx,
      label: cur.playerId ? byId(cur.playerId).name : t.liveClassroom
    });
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const q = cur.q;
    if (cur.phase === 'handoff') {
      body = React.createElement("div", {
        className: "text-center space-y-5 py-4"
      }, React.createElement(Avatar, {
        player: p,
        size: 80
      }), React.createElement("div", {
        className: "text-2xl font-black"
      }, t.passTo(p.name)), React.createElement("button", {
        onClick: () => {
          sfx('click');
          engine.patchCurrent({
            phase: 'question',
            startedAt: performance.now()
          });
        },
        className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
        style: accentBtn
      }, "\uD83D\uDC4B ", t.yourTurn(p.name)));
    } else if (cur.live) {
      body = React.createElement("div", {
        className: "space-y-4"
      }, React.createElement("div", {
        className: "flex items-center justify-between gap-3"
      }, React.createElement("span", {
        className: "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-300/40 text-sm font-bold"
      }, React.createElement("span", {
        className: "w-2 h-2 rounded-full bg-green-400 pulse-soft"
      }), t.liveClassroom), untimed ? React.createElement("span", {
        className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15"
      }, "\u23F1 \u221E") : React.createElement(TimerRing, {
        ms: timer.ms,
        total: time,
        size: 72,
        color: theme.accent
      })), React.createElement("div", {
        className: "rounded-3xl p-5 bg-black/25 border border-white/15 slide-up text-center"
      }, React.createElement("div", {
        className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
      }, t.question, " ", state.round, "/", state.settings.count), q.media && React.createElement("div", {
        className: "mt-3"
      }, React.createElement(QuizMedia, {
        media: q.media,
        lang: lang
      })), React.createElement("p", {
        className: "text-2xl sm:text-3xl font-black mt-3 leading-snug"
      }, L(q.question, lang))), React.createElement("div", {
        className: "grid gap-2 sm:grid-cols-2"
      }, q.options.map((o, i) => React.createElement("div", {
        key: i,
        className: "min-h-[56px] rounded-2xl px-4 py-3 bg-white/10 border border-white/15 font-bold flex items-center gap-3"
      }, React.createElement("span", {
        className: "w-8 h-8 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0"
      }, 'ABCDEF'[i]), o.media && React.createElement(QuizMedia, {
        media: o.media,
        lang: lang,
        size: "sm"
      }), React.createElement("span", null, optionLabel(o))))), React.createElement("div", {
        className: "space-y-2"
      }, React.createElement("div", {
        className: "flex items-center justify-between text-sm font-bold"
      }, React.createElement("span", {
        className: "text-white/70"
      }, "\uD83D\uDCF1 ", t.answeredCount(liveCount, ps.length)), React.createElement("span", {
        className: "text-white/50 text-xs"
      }, t.studentsAnswerOnPhones)), React.createElement("div", {
        className: "h-2 rounded-full bg-white/10 overflow-hidden"
      }, React.createElement("div", {
        className: "h-full rounded-full transition-all duration-300",
        style: {
          width: `${ps.length ? liveCount / ps.length * 100 : 0}%`,
          background: theme.accent
        }
      })), React.createElement("div", {
        className: "flex flex-wrap gap-1.5"
      }, ps.map(pl => React.createElement("span", {
        key: pl.id,
        className: liveAnswers[pl.id] ? '' : 'opacity-30'
      }, React.createElement(Avatar, {
        player: pl,
        size: 28,
        ring: liveAnswers[pl.id] ? '#4ade80' : undefined
      }))))), React.createElement(Decision, {
        onPick: () => {
          timer.stop();
          sfx('click');
          closeRound();
        },
        options: [{
          id: 'reveal',
          label: `👁 ${t.revealAnswer}`,
          color: theme.accent
        }]
      }), React.createElement("div", {
        className: "flex items-center justify-center gap-2"
      }, React.createElement("button", {
        onClick: restartQuestion,
        className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press"
      }, "\u21BB ", t.restartQuestion), React.createElement("button", {
        onClick: skipQuestion,
        className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press"
      }, "\u23ED ", t.skipQuestion)));
    } else {
      const imageOptions = q.options.some(o => o.media);
      body = React.createElement("div", {
        className: "space-y-4"
      }, React.createElement("div", {
        className: "flex items-center justify-between gap-3"
      }, React.createElement(PlayerChip, {
        player: p,
        label: p.streak > 1 ? `🔥${p.streak}` : ''
      }), untimed ? React.createElement("span", {
        className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15"
      }, "\u23F1 \u221E") : React.createElement(TimerRing, {
        ms: timer.ms,
        total: time,
        size: 72,
        color: theme.accent
      })), React.createElement("div", {
        className: "rounded-3xl p-5 bg-black/25 border border-white/15 slide-up text-center"
      }, React.createElement("div", {
        className: "flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/55"
      }, React.createElement("span", null, t.question, " ", state.round, "/", state.settings.count), React.createElement("span", {
        className: `px-1.5 py-0.5 rounded text-[9px] tracking-wider ${q.difficulty === 'easy' ? 'bg-green-400/25 text-green-200' : q.difficulty === 'hard' ? 'bg-red-400/25 text-red-200' : 'bg-yellow-300/25 text-yellow-100'}`
      }, t.difficultyLabels[q.difficulty])), q.media && React.createElement("div", {
        className: "mt-3"
      }, React.createElement(QuizMedia, {
        media: q.media,
        lang: lang
      })), React.createElement("p", {
        className: "text-xl sm:text-2xl font-black mt-3 leading-snug"
      }, L(q.question, lang))), q.type === 'tf' ? React.createElement("div", {
        className: "grid grid-cols-2 gap-3"
      }, q.options.map((o, i) => React.createElement("button", {
        key: i,
        onClick: () => answer(i),
        className: `min-h-[88px] rounded-3xl text-2xl font-black btn-press border-2 ${i === 0 ? 'bg-green-500/20 border-green-300/60 hover:bg-green-500/30' : 'bg-red-500/20 border-red-300/60 hover:bg-red-500/30'}`
      }, i === 0 ? '✓' : '✗', " ", optionLabel(o)))) : imageOptions ? React.createElement("div", {
        className: "grid grid-cols-2 gap-3"
      }, q.options.map((o, i) => React.createElement("button", {
        key: i,
        onClick: () => answer(i),
        "aria-label": `${'ABCD'[i]}`,
        className: "rounded-2xl p-3 bg-white/10 hover:bg-white/20 border border-white/15 btn-press flex flex-col items-center gap-2"
      }, React.createElement(QuizMedia, {
        media: o.media,
        lang: lang,
        size: "sm"
      }), React.createElement("span", {
        className: "w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black"
      }, 'ABCD'[i])))) : React.createElement("div", {
        className: "grid gap-2 sm:grid-cols-2"
      }, q.options.map((o, i) => React.createElement("button", {
        key: i,
        onClick: () => answer(i),
        className: "min-h-[60px] text-left rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press flex items-center gap-3 text-base sm:text-lg"
      }, React.createElement("span", {
        className: "w-8 h-8 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0"
      }, 'ABCD'[i]), React.createElement("span", null, optionLabel(o))))), React.createElement("div", {
        className: "flex items-center justify-center gap-2 pt-1"
      }, React.createElement("button", {
        onClick: restartQuestion,
        className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press"
      }, "\u21BB ", t.restartQuestion), React.createElement("button", {
        onClick: skipQuestion,
        className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press"
      }, "\u23ED ", t.skipQuestion)));
    }
  } else if (state.status === 'result' && state.lastResult.live) {
    const r = state.lastResult;
    const q = cur.q;
    const over = !!engine.pendingWinner;
    const rows = ps.map(pl => ({
      p: pl,
      ...(r.perPlayer[pl.id] || {
        answered: false,
        correct: false,
        points: 0
      })
    })).sort((a, b) => Number(b.correct) - Number(a.correct) || (a.ms || 1e9) - (b.ms || 1e9));
    const nCorrect = rows.filter(x => x.correct).length;
    body = React.createElement("div", {
      className: "space-y-4"
    }, React.createElement("div", {
      className: "text-center"
    }, React.createElement("div", {
      className: "text-4xl",
      "aria-hidden": "true"
    }, nCorrect ? '✅' : '🤔'), React.createElement("div", {
      className: "text-xl font-black mt-2 score-pop"
    }, t.nGotItRight(nCorrect, ps.length))), React.createElement("div", {
      className: "grid gap-2 sm:grid-cols-2"
    }, q.options.map((o, i) => {
      const picked = rows.filter(x => x.index === i).length;
      return React.createElement("div", {
        key: i,
        className: `rounded-2xl px-4 py-3 border font-bold flex items-center gap-3 ${i === q.answer ? 'bg-green-500/25 border-green-300/60' : 'bg-black/20 border-white/10 opacity-70'}`
      }, React.createElement("span", {
        className: "w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0"
      }, 'ABCDEF'[i]), React.createElement("span", {
        className: "flex-1 min-w-0"
      }, optionLabel(o)), picked > 0 && React.createElement("span", {
        className: "text-xs text-white/60 shrink-0"
      }, picked, "\xD7"), i === q.answer && React.createElement("span", null, "\u2713"));
    })), q.explanation && React.createElement("div", {
      className: "text-sm text-white/80 text-center rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5"
    }, "\uD83D\uDCA1 ", L(q.explanation, lang)), React.createElement("ul", {
      className: "space-y-1"
    }, rows.map(({
      p: pl,
      answered,
      correct,
      points
    }) => React.createElement("li", {
      key: pl.id,
      className: `flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ${correct ? 'bg-green-500/15' : answered ? 'bg-red-500/10' : 'bg-black/20 opacity-60'}`
    }, React.createElement(Avatar, {
      player: pl,
      size: 28
    }), React.createElement("span", {
      className: "flex-1 min-w-0 font-semibold truncate"
    }, pl.name), React.createElement("span", {
      className: "text-sm"
    }, correct ? '✅' : answered ? '❌' : '—'), React.createElement("span", {
      className: "font-black tabular-nums w-14 text-right"
    }, points ? `+${points}` : ''), React.createElement("span", {
      className: "font-black tabular-nums w-12 text-right text-white/70"
    }, pl.score)))), state.settings.teamCount > 0 && React.createElement(TeamScores, {
      t: t,
      teams: teamScores(ps, state.settings)
    }), React.createElement("button", {
      onClick: () => {
        sfx('click');
        if (host) host.clearAnswers();
        engine.nextRound();
      },
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
      style: accentBtn
    }, over ? `🏁 ${t.finish}` : `▶ ${t.next}`));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const p = byId(r.playerId);
    const q = cur.q;
    const over = !!engine.pendingWinner;
    const imageOptions = q.options.some(o => o.media);
    const cls = i => i === q.answer ? 'bg-green-500/25 border-green-300/60' : i === r.answer ? 'bg-red-500/25 border-red-300/60' : 'bg-black/20 border-white/10 opacity-60';
    body = React.createElement("div", {
      className: "space-y-4"
    }, React.createElement("div", {
      className: "text-center"
    }, React.createElement("div", {
      className: "text-5xl",
      "aria-hidden": "true"
    }, r.correct ? '✅' : r.answer == null ? '⏰' : '❌'), React.createElement("div", {
      className: "text-2xl font-black mt-2 score-pop"
    }, r.correct ? t.correct : r.answer == null ? t.timeUp : t.wrong), r.correct && React.createElement("div", {
      className: "text-sm font-bold text-green-300 mt-1"
    }, "+", r.points, " ", t.points, r.bonus ? ` · +${r.bonus} ${t.speedBonus}` : '', " \xB7 ", fmtSeconds(r.ms)), p.streak > 1 && React.createElement("div", {
      className: "text-sm font-bold text-orange-300"
    }, "\uD83D\uDD25 ", p.streak, " ", t.streakLabel)), q.media && React.createElement(QuizMedia, {
      media: q.media,
      lang: lang,
      size: "sm"
    }), React.createElement("div", {
      className: `grid gap-2 ${imageOptions || q.type === 'tf' ? 'grid-cols-2' : 'sm:grid-cols-2'}`
    }, q.options.map((o, i) => React.createElement("div", {
      key: i,
      className: `rounded-2xl px-4 py-3 border font-bold flex items-center gap-3 ${imageOptions ? 'flex-col text-center' : ''} ${cls(i)}`
    }, o.media && React.createElement(QuizMedia, {
      media: o.media,
      lang: lang,
      size: "sm"
    }), !imageOptions && q.type !== 'tf' && React.createElement("span", {
      className: "w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0"
    }, 'ABCD'[i]), React.createElement("span", null, optionLabel(o)), i === q.answer && React.createElement("span", {
      className: imageOptions ? '' : 'ml-auto'
    }, "\u2713")))), q.explanation && React.createElement("div", {
      className: "text-sm text-white/80 text-center rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5"
    }, "\uD83D\uDCA1 ", L(q.explanation, lang)), state.settings.teamCount > 0 && React.createElement(TeamScores, {
      t: t,
      teams: teamScores(ps, state.settings)
    }), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.playerId],
      metricLabel: t.pts,
      compact: true
    })), React.createElement("button", {
      onClick: () => {
        sfx('click');
        engine.nextRound();
      },
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
      style: accentBtn
    }, over ? `🏁 ${t.finish}` : `▶ ${t.next}`));
  } else {
    const w = winners[0];
    const st = w ? statsOf(w.id) : null;
    const tScores = teamScores(ps, state.settings);
    body = React.createElement(GameResult, {
      t: t,
      title: t.quizComplete,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      extra: tScores.length ? React.createElement(TeamScores, {
        t: t,
        teams: tScores,
        big: true
      }) : null,
      stats: w ? [`🏆 ${w.score} ${t.points}`, `✅ ${st.correct} / ${st.answered}`, `🔥 ${w.bestStreak} ${t.streakLabel}`, st.fastest != null ? `⚡ ${fmtSeconds(st.fastest)}` : null].filter(Boolean) : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.count,
    status: state.status,
    onExit: onExit
  }, body);
}

/* ==== js/games/minigames.js ==== */
function useMiniSetup(ctx) {
  const {
    players: partyPlayers,
    item
  } = ctx;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  useEffect(() => {
    setSelected(sel => sel.filter(id => partyPlayers.some(p => p.id === id)));
  }, [partyPlayers]);
  const chosen = partyPlayers.filter(p => selected.includes(p.id));
  const [minP, maxP] = item.players;
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  return {
    selected,
    setSelected,
    chosen,
    canStart,
    minP,
    maxP
  };
}
function StartButton({
  t,
  onClick,
  disabled,
  accent,
  icon = '▶',
  label
}) {
  return React.createElement("button", {
    onClick: onClick,
    disabled: disabled,
    className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white",
    style: {
      background: `linear-gradient(90deg, ${accent}, #f472b6)`
    }
  }, icon, " ", label || t.startGame);
}
function NextButton({
  t,
  engine,
  accent,
  sfx
}) {
  const over = !!engine.pendingWinner;
  return React.createElement("button", {
    onClick: () => {
      sfx('click');
      engine.nextRound();
    },
    className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
    style: {
      background: `linear-gradient(90deg, ${accent}, #f472b6)`
    }
  }, over ? `🏁 ${t.finish}` : `▶ ${t.nextRound}`);
}
function MiniSetup({
  ctx,
  setup,
  children,
  onStart,
  icon
}) {
  const {
    t,
    meta,
    players,
    setPlayers,
    sfx,
    mode
  } = ctx;
  return React.createElement("div", {
    className: "space-y-5"
  }, React.createElement("p", {
    className: "text-sm text-white/70"
  }, meta.howToPlay), React.createElement(PlayerSetup, {
    t: t,
    players: players,
    onChange: setPlayers,
    min: setup.minP,
    max: setup.maxP,
    selected: setup.selected,
    onSelected: setup.setSelected,
    sfx: sfx
  }), children && React.createElement("div", {
    className: "space-y-3 border-t border-white/10 pt-4"
  }, children), React.createElement(StartButton, {
    t: t,
    onClick: onStart,
    disabled: !setup.canStart,
    accent: mode.accent,
    icon: icon
  }), !setup.canStart && React.createElement("div", {
    className: "text-center text-xs text-white/55"
  }, t.needPlayers(setup.minP)));
}
function useMiniStage(ctx, state, extra) {
  const {
    publish,
    item,
    meta
  } = ctx;
  useEffect(() => {
    if (!publish) return;
    publish({
      icon: item.icon,
      title: meta.title,
      status: state.status,
      round: state.round,
      scores: state.players,
      winner: state.winner ? Array.isArray(state.winner) ? state.winner : [] : [],
      ...extra
    });
  }, [state.status, state.round, state.current, state.players, extra && extra.challenge, extra && extra.timerMs]);
  useEffect(() => () => publish && publish(null), []);
}
const RPS = [{
  id: 'rock',
  icon: '✊'
}, {
  id: 'paper',
  icon: '✋'
}, {
  id: 'scissors',
  icon: '✌️'
}];
const RPS_BEATS = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock'
};
function RpsGame({
  ctx
}) {
  const {
    t,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const [goal, setGoal] = useState(3);
  const rules = useMemo(() => ({
    countdown: round => round === 1 ? 3 : 0,
    buildRound: s => ({
      a: s.players[0].id,
      b: s.players[1].id,
      picks: {},
      phase: 'a'
    }),
    resolveRound: (s, {
      a,
      b
    }) => {
      const {
        a: aId,
        b: bId
      } = s.current;
      let players = s.players;
      let winnerId = null;
      if (a !== b) {
        winnerId = RPS_BEATS[a] === b ? aId : bId;
        const loserId = winnerId === aId ? bId : aId;
        players = Score.addPoints(Score.incrementWin(players, winnerId), winnerId, 1);
        players = Score.incrementLoss(players, loserId);
      }
      return {
        players,
        result: {
          a,
          b,
          winnerId
        }
      };
    },
    checkEnd: s => {
      const w = s.players.find(p => p.wins >= s.settings.goal);
      return w ? [w] : null;
    }
  }), []);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen, {
      goal
    });
  };
  const cur = state.current;
  const pick = choice => {
    sfx('click');
    const picks = {
      ...cur.picks,
      [cur.phase === 'a' ? cur.a : cur.b]: choice
    };
    if (cur.phase === 'a') engine.patchCurrent({
      picks,
      phase: 'b'
    });else engine.patchCurrent({
      picks,
      phase: 'reveal'
    });
  };
  useEffect(() => {
    if (state.status !== 'challenge' || !cur || cur.phase !== 'reveal') return;
    sfx('whoosh');
    const id = setTimeout(() => engine.resolveRound({
      a: cur.picks[cur.a],
      b: cur.picks[cur.b]
    }), 1100);
    return () => clearTimeout(id);
  }, [cur && cur.phase, state.status]);
  useEffect(() => {
    if (state.status === 'result') sfx(state.lastResult.winnerId ? 'win' : 'land');
  }, [state.status]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, ps.length === 2 ? `${t.wonBy(winners.map(p => p.name).join(', '))} ${ps[0].wins}–${ps[1].wins}` : ''), onFinish);
  useMiniStage(ctx, state, {
    participants: ps,
    challenge: cur && state.status === 'challenge' ? t.chooseSecretly(byId(cur.phase === 'b' ? cur.b : cur.a)?.name || '') : null
  });
  const icon = id => (RPS.find(r => r.id === id) || {}).icon;
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: "\u270B"
    }, React.createElement(OptionPills, {
      label: t.firstTo(goal),
      value: goal,
      onChange: setGoal,
      options: [3, 5].map(n => ({
        value: n,
        label: String(n)
      }))
    }));
  } else if (state.status === 'countdown') {
    body = React.createElement(Countdown, {
      seconds: 3,
      onDone: engine.countdownDone,
      play: sfx
    });
  } else if (state.status === 'challenge') {
    const a = byId(cur.a),
      b = byId(cur.b);
    if (cur.phase === 'reveal') {
      body = React.createElement("div", {
        className: "flex items-center justify-around py-6"
      }, [a, b].map((p, i) => React.createElement("div", {
        key: p.id,
        className: "flex flex-col items-center gap-2"
      }, React.createElement("div", {
        className: "text-7xl rps-pick",
        style: {
          animationDelay: `${i * 0.15}s`
        }
      }, icon(cur.picks[p.id])), React.createElement(PlayerChip, {
        player: p
      }))));
    } else {
      const who = cur.phase === 'a' ? a : b;
      body = React.createElement("div", {
        className: "space-y-5 text-center"
      }, React.createElement("div", {
        className: "flex items-center justify-between text-sm font-bold"
      }, React.createElement(PlayerChip, {
        player: a,
        label: `${a.wins}`
      }), React.createElement("span", {
        className: "text-white/50"
      }, t.vs), React.createElement(PlayerChip, {
        player: b,
        label: `${b.wins}`
      })), cur.phase === 'b' && React.createElement("div", {
        className: "text-xs text-white/60"
      }, "\u2705 ", t.lockedIn), React.createElement("div", {
        className: "text-xl font-black"
      }, t.chooseSecretly(who.name)), React.createElement("div", {
        className: "grid grid-cols-3 gap-2"
      }, RPS.map(r => React.createElement("button", {
        key: r.id,
        onClick: () => pick(r.id),
        className: "aspect-square rounded-3xl bg-white/10 hover:bg-white/20 border border-white/15 btn-press flex flex-col items-center justify-center gap-1"
      }, React.createElement("span", {
        className: "text-5xl"
      }, r.icon), React.createElement("span", {
        className: "text-xs font-bold text-white/70"
      }, t[r.id])))));
    }
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "flex items-center justify-center gap-6 text-6xl"
    }, React.createElement("span", null, icon(r.a)), React.createElement("span", {
      className: "text-2xl text-white/40 italic"
    }, t.vs), React.createElement("span", null, icon(r.b))), React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, r.winnerId ? `${byId(r.winnerId).avatar} ${t.pointTo(byId(r.winnerId).name)}` : `🤝 ${t.tie}`), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: r.winnerId ? [r.winnerId] : [],
      metric: "wins",
      metricLabel: t.winsLabel
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metric: "wins",
      metricLabel: t.winsLabel,
      stats: w ? [`⚡ ${w.wins} ${t.winsLabel}`, `🔥 ${w.bestStreak} ${t.streakLabel}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    status: state.status,
    onExit: onExit
  }, body);
}
function TimedPromptGame({
  ctx,
  seconds,
  buildPrompt,
  renderPrompt,
  icon
}) {
  const {
    t,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    celebrate,
    showToast,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const [perPlayer, setPerPlayer] = useState(2);
  const timer = useTimer();
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: s => ({
      playerId: s.players[(s.round - 1) % s.players.length].id,
      prompt: buildPrompt(),
      phase: 'ready'
    }),
    resolveRound: (s, {
      success
    }) => {
      const id = s.current.playerId;
      const players = success ? Score.addPoints(Score.incrementStreak(s.players, id), id, 1) : Score.incrementLoss(Score.resetStreak(s.players, id), id);
      return {
        players,
        result: {
          playerId: id,
          success,
          streak: Score.byId(players, id).streak
        }
      };
    },
    checkEnd: s => s.round >= s.settings.total ? Score.leaders(s.players) : null
  }), []);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const cur = state.current;
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen, {
      total: setup.chosen.length * perPlayer
    });
  };
  const begin = () => {
    sfx('click');
    engine.patchCurrent({
      phase: 'timing'
    });
  };
  const timing = state.status === 'challenge' && cur && cur.phase === 'timing';
  useEffect(() => {
    if (!timing) {
      timer.stop();
      return;
    }
    timer.start(seconds * 1000, () => {
      sfx('land');
      engine.patchCurrent({
        phase: 'judge'
      });
    });
    return () => timer.stop();
  }, [timing, state.round]);
  const lastSec = useRef(0);
  useEffect(() => {
    if (timing && timer.seconds !== lastSec.current) {
      lastSec.current = timer.seconds;
      if (timer.seconds <= 3 && timer.seconds > 0) sfx('tick');
    }
  }, [timer.seconds, timing]);
  const verdict = success => {
    timer.stop();
    sfx(success ? 'win' : 'land');
    engine.resolveRound({
      success
    });
  };
  useEffect(() => {
    if (state.status === 'result' && state.lastResult.success && state.lastResult.streak >= 3) showToast(t.milestone(state.lastResult.streak));
  }, [state.status]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map(p => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useMiniStage(ctx, state, {
    participants: cur ? [byId(cur.playerId)].filter(Boolean) : [],
    challenge: cur && state.status === 'challenge' ? renderPrompt(cur.prompt, true) : null,
    timerMs: timing ? timer.ms : null
  });
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: icon
    }, React.createElement(OptionPills, {
      label: t.roundsLabel,
      value: perPlayer,
      onChange: setPerPlayer,
      options: [1, 2, 3].map(n => ({
        value: n,
        label: `×${n}`
      }))
    }));
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "flex items-center justify-between"
    }, React.createElement(PlayerChip, {
      player: p,
      label: p.streak > 0 ? `🔥${p.streak}` : ''
    }), timing && React.createElement(TimerRing, {
      ms: timer.ms,
      total: seconds * 1000,
      size: 80,
      color: mode.accent
    })), React.createElement("div", {
      className: "rounded-3xl p-5 bg-black/25 border border-white/15 slide-up"
    }, renderPrompt(cur.prompt, false)), cur.phase === 'ready' && React.createElement(StartButton, {
      t: t,
      onClick: begin,
      accent: mode.accent,
      icon: "\u23F1\uFE0F",
      label: `${t.start} · ${seconds}s`
    }), cur.phase !== 'ready' && React.createElement(Decision, {
      onPick: id => verdict(id === 'ok'),
      options: [{
        id: 'ok',
        label: t.success,
        icon: '✅',
        color: '#4ade80'
      }, {
        id: 'fail',
        label: t.failed,
        icon: '❌',
        color: '#f87171'
      }]
    }));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, r.success ? `✅ ${t.pointTo(byId(r.playerId).name)}${r.streak > 1 ? ` · 🔥 ${r.streak}` : ''}` : `❌ ${byId(r.playerId).name} — ${t.failed}`), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.playerId],
      metricLabel: t.pts
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      stats: w ? [`🏆 ${w.score} ${t.points}`, `🔥 ${w.bestStreak} ${t.bestStreakLabel}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.total,
    status: state.status,
    onExit: onExit
  }, body);
}
function FiveSecondGame({
  ctx
}) {
  const bag = useBag(FIVE_SECOND_PROMPTS[ctx.lang], ctx.lang);
  return React.createElement(TimedPromptGame, {
    ctx: ctx,
    seconds: 5,
    icon: "\u23F1\uFE0F",
    buildPrompt: () => bag.next(),
    renderPrompt: (p, plain) => plain ? p : React.createElement(React.Fragment, null, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, ctx.t.category), React.createElement("p", {
      className: "text-2xl font-black mt-2"
    }, p))
  });
}
function WordGame({
  ctx
}) {
  const bag = useBag(WORD_CATEGORIES[ctx.lang], ctx.lang);
  return React.createElement(TimedPromptGame, {
    ctx: ctx,
    seconds: 10,
    icon: "\uD83D\uDD24",
    buildPrompt: () => ({
      category: bag.next(),
      letter: WORD_LETTERS[randInt(WORD_LETTERS.length)]
    }),
    renderPrompt: (p, plain) => plain ? `${p.category} · ${p.letter}` : React.createElement("div", {
      className: "flex items-center justify-around gap-4"
    }, React.createElement("div", null, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, ctx.t.category), React.createElement("p", {
      className: "text-xl font-black mt-1"
    }, p.category)), React.createElement("div", null, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, ctx.t.letter), React.createElement("p", {
      className: "text-6xl font-black mt-1 leading-none"
    }, p.letter)))
  });
}
function DontLaughGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const [rounds, setRounds] = useState(4);
  const bag = useBag(DONT_LAUGH_PROMPTS[lang], lang);
  const timer = useTimer();
  const SEC = 30;
  const rules = useMemo(() => ({
    countdown: round => round === 1 ? 3 : 0,
    buildRound: s => {
      const i = (s.round - 1) % 2;
      return {
        performerId: s.players[i].id,
        judgeId: s.players[1 - i].id,
        prompt: bag.next(),
        phase: 'ready'
      };
    },
    resolveRound: (s, {
      laughed
    }) => {
      const {
        performerId,
        judgeId
      } = s.current;
      const winnerId = laughed ? performerId : judgeId;
      const loserId = laughed ? judgeId : performerId;
      const players = Score.incrementLoss(Score.addPoints(Score.incrementWin(s.players, winnerId), winnerId, 1), loserId);
      return {
        players,
        result: {
          laughed,
          winnerId,
          performerId,
          judgeId
        }
      };
    },
    checkEnd: s => s.round >= s.settings.rounds ? Score.leaders(s.players) : null
  }), [lang]);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const cur = state.current;
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen, {
      rounds
    });
  };
  const timing = state.status === 'challenge' && cur && cur.phase === 'timing';
  useEffect(() => {
    if (!timing) {
      timer.stop();
      return;
    }
    timer.start(SEC * 1000, () => {
      sfx('land');
      engine.resolveRound({
        laughed: false
      });
    });
    return () => timer.stop();
  }, [timing, state.round]);
  useEffect(() => {
    if (state.status === 'result') sfx(state.lastResult.laughed ? 'giggle' : 'land');
  }, [state.status]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, ps.length === 2 ? `${winners.map(p => p.name).join(', ')} ${ps[0].wins}–${ps[1].wins}` : ''), onFinish);
  useMiniStage(ctx, state, {
    participants: cur ? [byId(cur.performerId), byId(cur.judgeId)].filter(Boolean) : [],
    roles: [t.performer, t.judge],
    challenge: cur && state.status === 'challenge' ? cur.prompt : null,
    timerMs: timing ? timer.ms : null
  });
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: "\uD83D\uDE02"
    }, React.createElement(OptionPills, {
      label: t.roundsLabel,
      value: rounds,
      onChange: setRounds,
      options: [2, 4, 6].map(n => ({
        value: n,
        label: String(n)
      }))
    }));
  } else if (state.status === 'countdown') {
    body = React.createElement(Countdown, {
      seconds: 3,
      onDone: engine.countdownDone,
      play: sfx
    });
  } else if (state.status === 'challenge') {
    const perf = byId(cur.performerId),
      judge = byId(cur.judgeId);
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement(Versus, {
      a: perf,
      b: judge,
      t: t,
      labelA: `🎭 ${t.performer}`,
      labelB: `😐 ${t.judge}`
    }), timing && React.createElement(TimerRing, {
      ms: timer.ms,
      total: SEC * 1000,
      size: 96,
      color: mode.accent,
      urgent: 5000
    }), React.createElement("div", {
      className: "rounded-3xl p-5 bg-black/25 border border-white/15 slide-up"
    }, React.createElement("p", {
      className: "text-xl font-black"
    }, cur.prompt)), cur.phase === 'ready' ? React.createElement(StartButton, {
      t: t,
      onClick: () => {
        sfx('click');
        engine.patchCurrent({
          phase: 'timing'
        });
      },
      accent: mode.accent,
      icon: "\u23F1\uFE0F",
      label: `${t.start} · ${SEC}s`
    }) : React.createElement(Decision, {
      onPick: () => {
        timer.stop();
        engine.resolveRound({
          laughed: true
        });
      },
      options: [{
        id: 'laugh',
        label: t.laughed,
        icon: '😂',
        color: '#fbbf24'
      }]
    }));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "text-5xl"
    }, r.laughed ? '😂' : '😐'), React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, r.laughed ? t.laughed : t.survived, " \xB7 ", t.pointTo(byId(r.winnerId).name)), React.createElement("div", {
      className: "text-xs text-white/60"
    }, "\uD83D\uDD04 ", t.rolesSwap), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.winnerId],
      metric: "wins",
      metricLabel: t.winsLabel
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metric: "wins",
      metricLabel: t.winsLabel,
      stats: w ? [`⚡ ${w.wins} ${t.winsLabel}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.rounds,
    status: state.status,
    onExit: onExit
  }, body);
}
const reactionLabel = (t, ms) => ms < 250 ? t.reactionLabels.incredible : ms < 400 ? t.reactionLabels.fast : ms < 600 ? t.reactionLabels.good : t.reactionLabels.slow;
function ReactionGame({
  ctx
}) {
  const {
    t,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const ATTEMPTS = 3;
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: s => ({
      playerId: s.players[(s.round - 1) % s.players.length].id,
      attempt: Math.floor((s.round - 1) / s.players.length) + 1,
      phase: 'ready',
      goAt: 0
    }),
    resolveRound: (s, {
      ms,
      falseStart
    }) => {
      const id = s.current.playerId;
      const players = Score.update(s.players, id, p => ({
        bestMs: falseStart ? p.bestMs ?? null : Math.min(p.bestMs ?? Infinity, ms),
        attempts: [...(p.attempts || []), falseStart ? null : ms],
        score: falseStart ? p.score : p.score + Math.max(0, 1000 - Math.round(ms))
      }));
      return {
        players,
        result: {
          playerId: id,
          ms,
          falseStart
        }
      };
    },
    checkEnd: s => {
      if (s.round < s.settings.total) return null;
      const timed = s.players.filter(p => p.bestMs != null);
      if (!timed.length) return s.players;
      const best = Math.min(...timed.map(p => p.bestMs));
      return timed.filter(p => p.bestMs === best);
    }
  }), []);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const cur = state.current;
  const waitTimer = useRef(0);
  const [flash, setFlash] = useState(false);
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen.map(p => ({
      ...p,
      bestMs: null,
      attempts: []
    })), {
      total: setup.chosen.length * ATTEMPTS
    });
  };
  useEffect(() => () => clearTimeout(waitTimer.current), []);
  const tap = () => {
    if (state.status !== 'challenge') return;
    if (cur.phase === 'ready') {
      sfx('click');
      engine.patchCurrent({
        phase: 'wait'
      });
      const delay = 1500 + rand() * 2500;
      waitTimer.current = setTimeout(() => {
        setFlash(true);
        sfx('land');
        engine.patchCurrent({
          phase: 'go',
          goAt: performance.now()
        });
        setTimeout(() => setFlash(false), 500);
      }, delay);
    } else if (cur.phase === 'wait') {
      clearTimeout(waitTimer.current);
      sfx('tick');
      engine.resolveRound({
        ms: null,
        falseStart: true
      });
    } else if (cur.phase === 'go') {
      const ms = performance.now() - cur.goAt;
      sfx('win');
      engine.resolveRound({
        ms,
        falseStart: false
      });
    }
  };
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, winners[0] && winners[0].bestMs != null ? `${winners[0].name} · ${fmtSeconds(winners[0].bestMs)}` : ''), onFinish);
  useMiniStage(ctx, state, {
    participants: cur ? [byId(cur.playerId)].filter(Boolean) : [],
    challenge: cur && state.status === 'challenge' ? cur.phase === 'go' ? t.go : cur.phase === 'wait' ? t.wait : t.tapToStart : null
  });
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: "\u26A1"
    });
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const bg = cur.phase === 'go' ? 'rgba(74,222,128,0.85)' : cur.phase === 'wait' ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)';
    body = React.createElement("div", {
      className: "space-y-4"
    }, React.createElement("div", {
      className: "flex items-center justify-between"
    }, React.createElement(PlayerChip, {
      player: p
    }), React.createElement("span", {
      className: "text-xs font-bold text-white/60"
    }, t.attempt, " ", cur.attempt, "/", ATTEMPTS, p.bestMs != null ? ` · ${t.best} ${fmtSeconds(p.bestMs)}` : '')), React.createElement("button", {
      onPointerDown: tap,
      className: `w-full rounded-3xl border border-white/15 min-h-[280px] grid place-items-center text-center select-none btn-press ${flash ? 'go-flash' : ''}`,
      style: {
        background: bg,
        transition: 'background 0.15s'
      }
    }, React.createElement("div", null, React.createElement("div", {
      className: `font-black ${cur.phase === 'go' ? 'text-7xl text-slate-900' : 'text-5xl'}`
    }, cur.phase === 'go' ? t.go : cur.phase === 'wait' ? t.wait : `👆 ${t.tapToStart}`), React.createElement("div", {
      className: `text-sm mt-3 ${cur.phase === 'go' ? 'text-slate-900/70' : 'text-white/60'}`
    }, t.tapWhenGreen))));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "text-6xl"
    }, r.falseStart ? '🚫' : '⚡'), React.createElement("div", {
      className: "text-3xl font-black score-pop"
    }, r.falseStart ? t.falseStart : fmtSeconds(r.ms)), !r.falseStart && React.createElement("div", {
      className: "text-lg font-bold"
    }, reactionLabel(t, r.ms)), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.playerId],
      metric: "time"
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metric: "time",
      stats: w && w.bestMs != null ? [`⚡ ${fmtSeconds(w.bestMs)}`, reactionLabel(t, w.bestMs)] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.total,
    status: state.status,
    onExit: onExit
  }, body);
}
const MEMORY_SYMBOLS = ['🍺', '🍕', '🎉', '🎸', '🚀', '🌮', '🦄', '🎲', '🍀', '🔥', '🎧', '🏆', '🍩', '⚽', '🌈', '👑'];
const MEMORY_SIZES = {
  easy: {
    cols: 4,
    pairs: 6
  },
  medium: {
    cols: 4,
    pairs: 8
  },
  hard: {
    cols: 6,
    pairs: 12
  }
};
function MemoryGame({
  ctx
}) {
  const {
    t,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    celebrate,
    showToast,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const [difficulty, setDifficulty] = useState('medium');
  const watch = useStopwatch();
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: s => {
      const {
        pairs
      } = MEMORY_SIZES[s.settings.difficulty];
      const syms = shuffleArr(MEMORY_SYMBOLS).slice(0, pairs);
      const cards = shuffleArr([...syms, ...syms]).map((sym, i) => ({
        id: i,
        sym,
        matched: false
      }));
      return {
        playerId: s.players[(s.round - 1) % s.players.length].id,
        cards,
        open: [],
        attempts: 0,
        phase: 'memorize',
        lock: false
      };
    },
    resolveRound: (s, {
      attempts,
      ms
    }) => {
      const id = s.current.playerId;
      const {
        pairs
      } = MEMORY_SIZES[s.settings.difficulty];
      const points = Math.max(10, 100 - (attempts - pairs) * 5);
      const players = Score.update(s.players, id, p => ({
        score: p.score + points,
        bestMs: ms,
        attempts: attempts
      }));
      return {
        players,
        result: {
          playerId: id,
          attempts,
          ms,
          points
        }
      };
    },
    checkEnd: s => s.round >= s.players.length ? Score.leaders(s.players) : null
  }), []);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const cur = state.current;
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen.map(p => ({
      ...p,
      bestMs: null,
      attempts: 0
    })), {
      difficulty
    });
  };
  useEffect(() => {
    if (state.status !== 'challenge' || !cur || cur.phase !== 'memorize') return;
    const id = setTimeout(() => {
      engine.patchCurrent({
        phase: 'play'
      });
      watch.start();
      sfx('land');
    }, 2600);
    return () => clearTimeout(id);
  }, [state.status, state.round, cur && cur.phase]);
  const flip = i => {
    if (!cur || cur.phase !== 'play' || cur.lock) return;
    const card = cur.cards[i];
    if (card.matched || cur.open.includes(i)) return;
    sfx('tick');
    const open = [...cur.open, i];
    if (open.length < 2) {
      engine.patchCurrent({
        open
      });
      return;
    }
    const [a, b] = open;
    const attempts = cur.attempts + 1;
    if (cur.cards[a].sym === cur.cards[b].sym) {
      const cards = cur.cards.map((c, k) => k === a || k === b ? {
        ...c,
        matched: true
      } : c);
      engine.patchCurrent({
        cards,
        open: [],
        attempts
      });
      sfx('coin');
      if (cards.every(c => c.matched)) {
        watch.stop();
        setTimeout(() => engine.resolveRound({
          attempts,
          ms: watch.ms
        }), 600);
      }
    } else {
      engine.patchCurrent({
        open,
        attempts,
        lock: true
      });
      setTimeout(() => engine.patchCurrent({
        open: [],
        lock: false
      }), 750);
    }
  };
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, winners[0] ? `${winners[0].name} · ${winners[0].attempts} ${t.attempts} · ${fmtSeconds(winners[0].bestMs || 0)}` : ''), onFinish);
  useMiniStage(ctx, state, {
    participants: cur ? [byId(cur.playerId)].filter(Boolean) : [],
    challenge: cur && state.status === 'challenge' ? `${cur.attempts} ${t.attempts}` : null
  });
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: "\uD83E\uDDE0"
    }, React.createElement(OptionPills, {
      label: t.difficulty,
      value: difficulty,
      onChange: setDifficulty,
      options: ['easy', 'medium', 'hard'].map(d => ({
        value: d,
        label: t.difficultyLabels[d]
      }))
    }));
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const {
      cols
    } = MEMORY_SIZES[state.settings.difficulty];
    body = React.createElement("div", {
      className: "space-y-4"
    }, React.createElement("div", {
      className: "flex items-center justify-between text-sm font-bold"
    }, React.createElement(PlayerChip, {
      player: p
    }), React.createElement("span", {
      className: "text-white/70"
    }, cur.phase === 'memorize' ? `👀 ${t.memorize}` : `${cur.attempts} ${t.attempts} · ${fmtSeconds(watch.ms)}`)), React.createElement("div", {
      className: "grid gap-2",
      style: {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
      }
    }, cur.cards.map((c, i) => {
      const up = cur.phase === 'memorize' || c.matched || cur.open.includes(i);
      return React.createElement("button", {
        key: c.id,
        onClick: () => flip(i),
        "aria-label": up ? c.sym : '?',
        className: `flip-scene aspect-square rounded-2xl ${c.matched ? 'match-pop' : ''}`,
        disabled: cur.phase !== 'play'
      }, React.createElement("div", {
        className: `flip-card rounded-2xl ${up ? 'flipped' : ''}`
      }, React.createElement("div", {
        className: "flip-face rounded-2xl grid place-items-center text-xl font-black text-white/60 border border-white/15",
        style: {
          background: `linear-gradient(135deg, ${mode.accent}55, ${mode.accent}15)`
        }
      }, "?"), React.createElement("div", {
        className: `flip-face back rounded-2xl grid place-items-center text-3xl border ${c.matched ? 'border-green-300/60 bg-green-500/25' : 'border-white/20 bg-white/15'}`
      }, c.sym)));
    })));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "text-5xl"
    }, "\uD83E\uDDE0"), React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, t.allMatched), React.createElement("div", {
      className: "text-sm font-bold text-white/80"
    }, byId(r.playerId).name, " \xB7 ", r.attempts, " ", t.attempts, " \xB7 ", fmtSeconds(r.ms), " \xB7 +", r.points, " ", t.pts), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.playerId],
      metricLabel: t.pts
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      stats: w ? [`🧠 ${w.attempts} ${t.attempts}`, `⏱️ ${fmtSeconds(w.bestMs || 0)}`, `🏆 ${w.score} ${t.points}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: ps.length || null,
    status: state.status,
    onExit: onExit
  }, body);
}

/* ==== js/games/cards.js ==== */
function CardsGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    players: partyPlayers,
    setPlayers,
    sfx,
    celebrate,
    showToast,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish,
    publish
  } = ctx;
  const [minP, maxP] = item.players;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [count, setCount] = useState(12);
  useEffect(() => {
    setSelected(sel => sel.filter(id => partyPlayers.some(p => p.id === id)));
  }, [partyPlayers]);
  const deck = useMemo(() => buildDeck(item.deck, lang), [item.deck, lang]);
  const bag = useBag(deck, `${item.deck}-${lang}`);
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: s => {
      const st = s.settings;
      const playerId = st.forcedTarget || st.order[st.idx];
      return {
        playerId,
        card: bag.next(),
        phase: 'draw',
        everyone: !!st.everyone,
        forced: !!st.forcedTarget
      };
    },
    resolveRound: (s, outcome) => {
      const st = {
        ...s.settings,
        forcedTarget: null,
        everyone: false
      };
      const cur = s.current;
      const me = cur.playerId;
      let players = s.players;
      const result = {
        playerId: me,
        type: cur.card.type,
        title: cur.card.title
      };
      const n = st.order.length;
      const advance = () => {
        st.idx = nextActiveIndex(st.order.map(id => Score.byId(players, id)), st.idx, st.dir);
      };
      let mult = 1;
      if (st.doubleFor === me) mult *= 2;
      if (st.roundMult > 0) mult *= 2;
      if (outcome.type === 'done' || outcome.type === 'shield') {
        if (outcome.type === 'shield') st.shields = {
          ...st.shields,
          [me]: Math.max(0, (st.shields[me] || 0) - 1)
        };
        const targets = cur.everyone ? players.map(p => p.id) : [me];
        targets.forEach(id => {
          players = Score.addPoints(Score.incrementStreak(players, id), id, mult);
        });
        if (st.doubleFor === me) st.doubleFor = null;
        result.points = mult;
        result.everyone = cur.everyone;
        advance();
      } else if (outcome.type === 'skip') {
        players = Score.resetStreak(players, me);
        result.skipped = true;
        advance();
      } else if (outcome.type === 'effect') {
        const eff = cur.card.effect;
        result.effect = eff;
        switch (eff) {
          case 'respin':
            break;
          case 'target':
            st.forcedTarget = outcome.targetId;
            result.targetId = outcome.targetId;
            advance();
            break;
          case 'shield':
            st.shields = {
              ...st.shields,
              [me]: (st.shields[me] || 0) + 1
            };
            advance();
            break;
          case 'switch':
            {
              const a = st.order.indexOf(me),
                b = st.order.indexOf(outcome.targetId);
              const order = [...st.order];
              order[a] = outcome.targetId;
              order[b] = me;
              st.order = order;
              result.targetId = outcome.targetId;
              break;
            }
          case 'double':
            st.doubleFor = me;
            advance();
            break;
          case 'everyone':
            st.everyone = true;
            advance();
            break;
          case 'swap':
            st.order = shuffleArr(st.order);
            st.idx = 0;
            break;
          case 'reverse':
            st.dir = -st.dir;
            advance();
            break;
          case 'doubleRound':
            st.roundMult = n + 1;
            advance();
            break;
          case 'randomTarget':
            {
              const tgt = Random.player(players, {
                exclude: [me]
              }) || Score.byId(players, me);
              st.forcedTarget = tgt.id;
              result.targetId = tgt.id;
              advance();
              break;
            }
          default:
            advance();
        }
      }
      if (st.roundMult > 0) st.roundMult -= 1;
      return {
        players,
        result,
        settings: st
      };
    },
    checkEnd: s => s.round >= s.settings.count ? Score.leaders(s.players) : null
  }), [item.deck, lang]);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const st = state.settings;
  const byId = id => Score.byId(ps, id);
  const chosen = partyPlayers.filter(p => selected.includes(p.id));
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  const start = () => {
    if (!canStart) return;
    sfx('click');
    engine.startGame(chosen, {
      count,
      order: chosen.map(p => p.id),
      idx: 0,
      dir: 1,
      shields: {},
      doubleFor: null,
      roundMult: 0,
      forcedTarget: null,
      everyone: false
    });
  };
  const cur = state.current;
  const [picking, setPicking] = useState(false);
  const draw = () => {
    sfx('whoosh');
    engine.patchCurrent({
      phase: 'reveal'
    });
  };
  const act = (type, extra = {}) => {
    sfx('click');
    setPicking(false);
    engine.resolveRound({
      type,
      ...extra
    });
  };
  useEffect(() => {
    if (state.status !== 'result') return;
    const r = state.lastResult;
    if (r.effect) {
      sfx('win');
      showToast(`✨ ${t.effectApplied}`);
    } else if (r.points) sfx('coin' in SFX ? 'coin' : 'land');
  }, [state.status]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map(p => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useEffect(() => {
    if (!publish) return;
    publish({
      icon: item.icon,
      title: meta.title,
      status: state.status,
      round: state.round,
      total: st.count,
      participants: cur ? [byId(cur.playerId)].filter(Boolean) : [],
      challenge: cur && state.status === 'challenge' && cur.phase === 'reveal' ? `${cur.card.title}: ${cur.card.content}` : null,
      scores: ps,
      winner: winners
    });
  }, [state.status, state.round, cur, state.players]);
  useEffect(() => () => publish && publish(null), []);
  const typeMeta = type => CARD_TYPE_META[type] || CARD_TYPE_META.challenge;
  const effectNote = r => {
    const name = r.targetId ? byId(r.targetId).name : '';
    return {
      respin: t.extraTurn,
      target: t.targetIs(name),
      shield: t.shieldGained,
      switch: t.targetIs(name),
      double: t.doubleOn,
      everyone: t.everyoneTurn,
      swap: t.swapped,
      reverse: t.reversed,
      doubleRound: t.doubleOn,
      randomTarget: t.targetIs(name)
    }[r.effect] || t.effectApplied;
  };
  let body;
  if (state.status === 'setup') {
    body = React.createElement("div", {
      className: "space-y-5"
    }, React.createElement("p", {
      className: "text-sm text-white/70"
    }, meta.howToPlay), React.createElement(PlayerSetup, {
      t: t,
      players: partyPlayers,
      onChange: setPlayers,
      min: minP,
      max: maxP,
      selected: selected,
      onSelected: setSelected,
      sfx: sfx
    }), React.createElement("div", {
      className: "border-t border-white/10 pt-4"
    }, React.createElement(OptionPills, {
      label: t.cardsLabel,
      value: count,
      onChange: setCount,
      options: [8, 12, 20].map(n => ({
        value: n,
        label: String(n)
      }))
    })), React.createElement("button", {
      onClick: start,
      disabled: !canStart,
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white",
      style: {
        background: `linear-gradient(90deg, ${mode.accent}, #f472b6)`
      }
    }, "\uD83C\uDCCF ", t.startGame), !canStart && React.createElement("div", {
      className: "text-center text-xs text-white/55"
    }, t.needPlayers(minP)));
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const card = cur.card;
    const tm = typeMeta(card.type);
    const isEffect = card.type === 'wild' || card.type === 'chaos';
    const needsTarget = isEffect && (card.effect === 'target' || card.effect === 'switch');
    const shields = st.shields[p.id] || 0;
    const mult = (st.doubleFor === p.id ? 2 : 1) * (st.roundMult > 0 ? 2 : 1);
    body = React.createElement("div", {
      className: "space-y-4"
    }, React.createElement("div", {
      className: "flex items-center gap-1.5 overflow-x-auto sb-thin pb-1"
    }, React.createElement("span", {
      className: "text-[10px] uppercase tracking-wider text-white/50 shrink-0"
    }, t.turnOrder, " ", st.dir < 0 ? '⟲' : '⟳'), st.order.map(id => {
      const q = byId(id);
      return q ? React.createElement("span", {
        key: id,
        className: `shrink-0 ${id === p.id ? 'ring-2 ring-white rounded-full' : 'opacity-70'}`
      }, React.createElement(Avatar, {
        player: q,
        size: 30
      })) : null;
    })), React.createElement("div", {
      className: "flex items-center justify-between flex-wrap gap-2"
    }, React.createElement(PlayerChip, {
      player: p,
      label: cur.everyone ? `· ${t.everyoneTurn}` : cur.forced ? '🎯' : ''
    }), React.createElement("div", {
      className: "flex gap-1.5 text-[11px] font-bold"
    }, mult > 1 && React.createElement("span", {
      className: "px-2 py-1 rounded-full bg-yellow-300/20 border border-yellow-300/50 text-yellow-200"
    }, "2\xD7 ", t.doubleOn), shields > 0 && React.createElement("span", {
      className: "px-2 py-1 rounded-full bg-white/10 border border-white/20"
    }, "\uD83D\uDEE1\uFE0F ", shields), React.createElement("span", {
      className: "px-2 py-1 rounded-full bg-white/10 border border-white/20"
    }, t.cardsLeft(st.count - state.round + 1)))), React.createElement("div", {
      className: "flip-scene mx-auto",
      style: {
        width: 'min(100%, 320px)',
        height: 220
      }
    }, React.createElement("div", {
      className: `flip-card rounded-3xl ${cur.phase === 'reveal' ? 'flipped' : ''}`
    }, React.createElement("button", {
      onClick: draw,
      disabled: cur.phase === 'reveal',
      className: "flip-face rounded-3xl w-full h-full grid place-items-center border-2 card-shine btn-press",
      style: {
        background: `linear-gradient(135deg, ${tm.color}66, ${tm.color}22)`,
        borderColor: `${tm.color}aa`
      }
    }, React.createElement("div", {
      className: "text-center"
    }, React.createElement("div", {
      className: "text-6xl"
    }, "\uD83C\uDCCF"), React.createElement("div", {
      className: "font-black tracking-widest mt-2"
    }, t.drawCard))), React.createElement("div", {
      className: "flip-face back rounded-3xl p-5 border-2 flex flex-col text-left",
      style: {
        background: `linear-gradient(160deg, ${tm.color}55, rgba(0,0,0,0.5))`,
        borderColor: `${tm.color}cc`
      }
    }, React.createElement("div", {
      className: "flex items-center justify-between text-[11px] font-black tracking-widest uppercase",
      style: {
        color: tm.color
      }
    }, React.createElement("span", null, tm.icon, " ", card.type), card.difficulty && React.createElement("span", {
      className: "text-white/60"
    }, t.difficultyLabels[card.difficulty])), React.createElement("div", {
      className: "text-2xl font-black mt-2"
    }, card.title), React.createElement("p", {
      className: "text-sm text-white/85 mt-1.5 leading-snug flex-1"
    }, card.drink && cur.alt ? card.alt : card.content), card.drink && React.createElement("button", {
      onClick: () => engine.patchCurrent({
        alt: !cur.alt
      }),
      className: "self-start mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/15"
    }, cur.alt ? `🍻 ${t.showOriginal}` : `🎭 ${t.nonDrinking}`)))), cur.phase === 'reveal' && (picking ? React.createElement("div", {
      className: "space-y-2"
    }, React.createElement("div", {
      className: "text-center text-sm font-bold"
    }, t.chooseTarget), React.createElement("div", {
      className: "grid grid-cols-2 gap-2"
    }, ps.filter(q => q.id !== p.id).map(q => React.createElement("button", {
      key: q.id,
      onClick: () => act('effect', {
        targetId: q.id
      }),
      className: "flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/15 btn-press"
    }, React.createElement(Avatar, {
      player: q,
      size: 30
    }), React.createElement("span", {
      className: "font-bold truncate"
    }, q.name))))) : isEffect ? React.createElement(Decision, {
      onPick: () => needsTarget ? setPicking(true) : act('effect'),
      options: [{
        id: 'apply',
        label: `✨ ${card.title}`,
        color: tm.color
      }]
    }) : React.createElement(Decision, {
      onPick: id => act(id),
      options: [{
        id: 'done',
        label: `${t.done} +${mult}`,
        icon: '✅',
        color: '#4ade80'
      }, {
        id: 'skip',
        label: t.skip,
        icon: '⏭️'
      }, ...(shields > 0 ? [{
        id: 'shield',
        label: t.useShield,
        color: '#60a5fa'
      }] : [])]
    })));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const p = byId(r.playerId);
    body = React.createElement("div", {
      className: "space-y-5 text-center"
    }, React.createElement("div", {
      className: "text-5xl"
    }, r.effect ? '✨' : r.skipped ? '⏭️' : '✅'), React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, r.effect ? effectNote(r) : r.skipped ? `${p.name} — ${t.skip}` : r.everyone ? `${t.everyoneTurn} +${r.points}` : `+${r.points} ${p.name}`), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.targetId || r.playerId],
      metricLabel: t.pts,
      compact: true
    })), React.createElement("button", {
      onClick: () => {
        sfx('click');
        engine.nextRound();
      },
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
      style: {
        background: `linear-gradient(90deg, ${mode.accent}, #f472b6)`
      }
    }, engine.pendingWinner ? `🏁 ${t.finish}` : `🃏 ${t.drawCard}`));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      stats: w ? [`🏆 ${w.score} ${t.points}`, `🔥 ${w.bestStreak} ${t.bestStreakLabel}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: st.count,
    status: state.status,
    onExit: onExit
  }, body);
}

/* ==== js/games/votecards.js ==== */
function VoteCardsGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    players: partyPlayers,
    setPlayers,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish,
    publish
  } = ctx;
  const deckKey = item.deck;
  const [minP, maxP] = item.players;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [count, setCount] = useState(10);
  useEffect(() => {
    setSelected(sel => sel.filter(id => partyPlayers.some(p => p.id === id)));
  }, [partyPlayers]);
  const deck = useMemo(() => buildVoteDeck(deckKey, lang), [deckKey, lang]);
  const bag = useBag(deck, `vote-${deckKey}-${lang}`);
  const tm = CARD_TYPE_META[deckKey];
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: () => ({
      card: bag.next(),
      picks: {}
    }),
    resolveRound: (s, {
      picks
    }) => {
      let players = s.players;
      const result = {
        deck: deckKey,
        picks
      };
      if (deckKey === 'rather') {
        const a = s.players.filter(p => picks[p.id] === 'a').map(p => p.id);
        const b = s.players.filter(p => picks[p.id] === 'b').map(p => p.id);
        const minority = a.length === b.length ? [] : a.length < b.length ? a : b;
        const majority = a.length === b.length ? [] : a.length < b.length ? b : a;
        majority.forEach(id => {
          players = Score.addPoints(players, id, 1);
        });
        Object.assign(result, {
          a,
          b,
          minority,
          majority,
          tie: a.length === b.length
        });
      } else {
        const ids = s.players.filter(p => picks[p.id]).map(p => p.id);
        ids.forEach(id => {
          players = Score.addPoints(Score.incrementStreak(players, id), id, 1);
        });
        s.players.forEach(p => {
          if (!picks[p.id]) players = Score.resetStreak(players, p.id);
        });
        result.ids = ids;
      }
      return {
        players,
        result
      };
    },
    checkEnd: s => s.round >= s.settings.count ? Score.leaders(s.players) : null
  }), [deckKey, lang]);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const chosen = partyPlayers.filter(p => selected.includes(p.id));
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  const start = () => {
    if (!canStart) return;
    sfx('click');
    engine.startGame(chosen, {
      count
    });
  };
  const cur = state.current;
  const picks = cur && cur.picks || {};
  const picksRef = useRef(picks);
  useEffect(() => {
    picksRef.current = picks;
  }, [cur && cur.picks]);
  const toggle = id => {
    sfx('click');
    const next = {
      ...picksRef.current
    };
    if (deckKey === 'rather') next[id] = next[id] === 'a' ? 'b' : next[id] === 'b' ? null : 'a';else next[id] = !next[id];
    if (!next[id]) delete next[id];
    picksRef.current = next;
    engine.patchCurrent({
      picks: next
    });
  };
  const reveal = () => {
    sfx('win');
    engine.resolveRound({
      picks
    });
  };
  const redraw = () => {
    sfx('whoosh');
    engine.patchCurrent({
      card: bag.next(),
      picks: {}
    });
  };
  const everyoneVoted = deckKey !== 'rather' || ps.every(p => picks[p.id]);
  useEffect(() => {
    if (state.status !== 'result') return;
    const r = state.lastResult;
    if (r.deck === 'rather' && r.minority.length) sfx('land');else sfx('coin' in SFX ? 'coin' : 'win');
  }, [state.status]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map(p => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  const cardText = card => deckKey === 'rather' ? `${card.a} / ${card.b}` : `${t.votePrefix[deckKey]} ${card.text}`;
  useEffect(() => {
    if (!publish) return;
    publish({
      icon: item.icon,
      title: meta.title,
      status: state.status,
      round: state.round,
      total: state.settings.count,
      participants: [],
      challenge: cur && state.status === 'challenge' ? cardText(cur.card) : null,
      scores: ps,
      winner: winners
    });
  }, [state.status, state.round, cur && cur.card, state.players]);
  useEffect(() => () => publish && publish(null), []);
  const Card = ({
    card,
    children
  }) => React.createElement("div", {
    className: "rounded-3xl p-5 sm:p-6 border-2 text-center slide-up card-shine",
    style: {
      background: `linear-gradient(160deg, ${tm.color}55, rgba(0,0,0,0.45))`,
      borderColor: `${tm.color}cc`,
      boxShadow: `0 20px 50px -30px ${tm.color}`
    }
  }, React.createElement("div", {
    className: "text-[11px] font-black tracking-[0.25em] uppercase",
    style: {
      color: tm.color
    }
  }, tm.icon, " ", meta.title), deckKey === 'rather' ? React.createElement("div", {
    className: "mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"
  }, React.createElement("div", {
    className: "rounded-2xl p-3 bg-black/30 border border-white/15"
  }, React.createElement("div", {
    className: "text-[10px] font-black text-white/50"
  }, "A"), React.createElement("div", {
    className: "font-black text-base sm:text-lg leading-snug"
  }, card.a)), React.createElement("div", {
    className: "text-white/50 font-black text-sm"
  }, t.or), React.createElement("div", {
    className: "rounded-2xl p-3 bg-black/30 border border-white/15"
  }, React.createElement("div", {
    className: "text-[10px] font-black text-white/50"
  }, "B"), React.createElement("div", {
    className: "font-black text-base sm:text-lg leading-snug"
  }, card.b))) : React.createElement("p", {
    className: "text-xl sm:text-2xl font-black mt-2 leading-snug"
  }, React.createElement("span", {
    className: "text-white/60"
  }, t.votePrefix[deckKey]), " ", card.text), children);
  let body;
  if (state.status === 'setup') {
    body = React.createElement("div", {
      className: "space-y-5"
    }, React.createElement("p", {
      className: "text-sm text-white/70"
    }, meta.howToPlay), React.createElement(PlayerSetup, {
      t: t,
      players: partyPlayers,
      onChange: setPlayers,
      min: minP,
      max: maxP,
      selected: selected,
      onSelected: setSelected,
      sfx: sfx
    }), React.createElement("div", {
      className: "border-t border-white/10 pt-4"
    }, React.createElement(OptionPills, {
      label: t.cardsLabel,
      value: count,
      onChange: setCount,
      options: [8, 10, 15, 20].map(n => ({
        value: n,
        label: String(n)
      }))
    })), React.createElement("button", {
      onClick: start,
      disabled: !canStart,
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white",
      style: {
        background: `linear-gradient(90deg, ${tm.color}, #a78bfa)`
      }
    }, tm.icon, " ", t.startGame), !canStart && React.createElement("div", {
      className: "text-center text-xs text-white/55"
    }, t.needPlayers(minP)));
  } else if (state.status === 'challenge') {
    body = React.createElement("div", {
      className: "space-y-4"
    }, React.createElement(Card, {
      card: cur.card
    }), React.createElement("div", {
      className: "space-y-2"
    }, React.createElement("div", {
      className: "text-center text-sm font-bold text-white/80"
    }, t.voteHint[deckKey]), React.createElement("div", {
      className: "grid grid-cols-2 sm:grid-cols-3 gap-2"
    }, ps.map(p => {
      const v = picks[p.id];
      const on = !!v;
      const color = deckKey === 'rather' ? v === 'a' ? '#60a5fa' : v === 'b' ? '#f472b6' : null : on ? tm.color : null;
      return React.createElement("button", {
        key: p.id,
        onClick: () => toggle(p.id),
        "aria-pressed": on,
        className: `flex items-center gap-2 rounded-2xl px-3 py-2.5 border-2 btn-press text-left ${on ? '' : 'bg-white/5 border-white/15 opacity-80'}`,
        style: on ? {
          background: `${color}33`,
          borderColor: color
        } : undefined
      }, React.createElement(Avatar, {
        player: p,
        size: 32,
        ring: on ? color : undefined
      }), React.createElement("span", {
        className: "flex-1 min-w-0 font-bold truncate"
      }, p.name), React.createElement("span", {
        className: "w-7 h-7 rounded-full grid place-items-center text-sm font-black shrink-0",
        style: on ? {
          background: color,
          color: '#0f172a'
        } : {
          background: 'rgba(255,255,255,0.1)'
        }
      }, deckKey === 'rather' ? v ? v.toUpperCase() : '·' : on ? '✓' : ''));
    }))), React.createElement(Decision, {
      onPick: reveal,
      options: [{
        id: 'reveal',
        label: `👁 ${t.revealAnswer}${!everyoneVoted ? ` · ${t.notEveryone}` : ''}`,
        color: tm.color
      }]
    }), React.createElement("button", {
      onClick: redraw,
      className: "w-full text-xs font-bold text-white/60 hover:text-white py-1"
    }, "\uD83D\uDD01 ", t.newChallenge));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const over = !!engine.pendingWinner;
    let headline,
      detail = null;
    if (r.deck === 'rather') {
      headline = r.tie ? `🤝 ${t.tie} · ${r.a.length}–${r.b.length}` : `A ${r.a.length} – ${r.b.length} B`;
      detail = React.createElement("div", {
        className: "space-y-2"
      }, React.createElement("div", {
        className: "grid grid-cols-2 gap-2"
      }, [['a', r.a, '#60a5fa', cur.card.a], ['b', r.b, '#f472b6', cur.card.b]].map(([k, ids, color, label]) => React.createElement("div", {
        key: k,
        className: "rounded-2xl p-3 border",
        style: {
          background: `${color}1f`,
          borderColor: `${color}66`
        }
      }, React.createElement("div", {
        className: "text-[10px] font-black uppercase tracking-wider mb-1",
        style: {
          color
        }
      }, k.toUpperCase(), " \xB7 ", ids.length), React.createElement("div", {
        className: "text-xs text-white/80 mb-2 leading-snug"
      }, label), React.createElement("div", {
        className: "flex flex-wrap gap-1"
      }, ids.map(id => React.createElement(Avatar, {
        key: id,
        player: byId(id),
        size: 28
      })))))), r.minority.length > 0 && React.createElement("div", {
        className: "text-sm text-center rounded-2xl bg-amber-400/15 border border-amber-300/40 px-3 py-2"
      }, "\uD83D\uDE05 ", t.minorityDare(r.minority.map(id => byId(id).name).join(', '))));
    } else {
      const names = r.ids.map(id => byId(id).name);
      headline = r.ids.length === 0 ? r.deck === 'never' ? `😇 ${t.nobodyHas}` : `🤷 ${t.noVotes}` : r.deck === 'likely' ? `👉 ${names.join(', ')}` : `🙋 ${t.nHave(r.ids.length)}`;
      detail = r.ids.length > 0 && React.createElement("div", {
        className: "flex flex-wrap justify-center gap-1.5"
      }, r.ids.map(id => React.createElement(PlayerChip, {
        key: id,
        player: byId(id)
      })));
    }
    body = React.createElement("div", {
      className: "space-y-4 text-center"
    }, React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, headline), detail, React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: r.deck === 'rather' ? r.majority : r.ids,
      metricLabel: t.pts,
      compact: true
    })), React.createElement("button", {
      onClick: () => {
        sfx('click');
        engine.nextRound();
      },
      className: "w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white",
      style: {
        background: `linear-gradient(90deg, ${tm.color}, #a78bfa)`
      }
    }, over ? `🏁 ${t.finish}` : `${tm.icon} ${t.nextCard}`));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      stats: w ? [`🏆 ${w.score} ${t.points}`, `🔥 ${w.bestStreak} ${t.bestStreakLabel}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.count,
    status: state.status,
    onExit: onExit
  }, body);
}

/* ==== js/games/partygames.js ==== */
function CharadesGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const decks = CHARADES_DECKS[lang];
  const [deckKey, setDeckKey] = useState('mix');
  const [seconds, setSeconds] = useState(60);
  const [perPlayer, setPerPlayer] = useState(1);
  const words = useMemo(() => deckKey === 'mix' ? Object.values(decks).flatMap(d => d.words) : decks[deckKey].words, [deckKey, lang]);
  const bag = useBag(words, `charades-${deckKey}-${lang}`);
  const timer = useTimer();
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: s => ({
      playerId: s.players[(s.round - 1) % s.players.length].id,
      phase: 'ready',
      word: null,
      got: 0,
      passed: 0,
      log: []
    }),
    resolveRound: (s, {
      got,
      log
    }) => {
      const id = s.current.playerId;
      const players = got > 0 ? Score.addPoints(s.players, id, got) : s.players;
      return {
        players,
        result: {
          playerId: id,
          got,
          log
        }
      };
    },
    checkEnd: s => s.round >= s.settings.total ? Score.leaders(s.players) : null
  }), []);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const cur = state.current;
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen, {
      total: setup.chosen.length * perPlayer
    });
  };
  const begin = () => {
    sfx('whoosh');
    engine.patchCurrent({
      phase: 'acting',
      word: bag.next()
    });
  };
  const acting = state.status === 'challenge' && cur && cur.phase === 'acting';
  const finishTurn = () => {
    timer.stop();
    sfx('land');
    engine.resolveRound({
      got: cur.got,
      log: cur.log
    });
  };
  const finishRef = useRef(finishTurn);
  finishRef.current = finishTurn;
  useEffect(() => {
    if (!acting) {
      timer.stop();
      return;
    }
    timer.start(seconds * 1000, () => finishRef.current());
    return () => timer.stop();
  }, [acting, state.round]);
  const turnRef = useRef(cur);
  useEffect(() => {
    turnRef.current = cur;
  }, [cur]);
  const mark = ok => {
    const c = turnRef.current;
    sfx(ok ? 'coin' in SFX ? 'coin' : 'win' : 'click');
    const next = {
      word: bag.next(),
      got: c.got + (ok ? 1 : 0),
      passed: c.passed + (ok ? 0 : 1),
      log: [...c.log, {
        word: c.word,
        ok
      }]
    };
    turnRef.current = {
      ...c,
      ...next
    };
    engine.patchCurrent(next);
  };
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map(p => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useMiniStage(ctx, state, {
    participants: cur ? [byId(cur.playerId)].filter(Boolean) : [],
    challenge: acting ? `🎭 ${t.guessing} · ${cur.got} ✓` : null,
    timerMs: acting ? timer.ms : null
  });
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: "\uD83C\uDFAD"
    }, React.createElement(OptionPills, {
      label: t.deck,
      value: deckKey,
      onChange: setDeckKey,
      options: [{
        value: 'mix',
        label: `🎲 ${t.mixDeck}`
      }, ...Object.entries(decks).map(([k, d]) => ({
        value: k,
        label: `${d.icon} ${d.title}`
      }))]
    }), React.createElement(OptionPills, {
      label: t.time,
      value: seconds,
      onChange: setSeconds,
      options: [45, 60, 90].map(n => ({
        value: n,
        label: `${n}s`
      }))
    }), React.createElement(OptionPills, {
      label: t.roundsLabel,
      value: perPlayer,
      onChange: setPerPlayer,
      options: [1, 2, 3].map(n => ({
        value: n,
        label: `×${n}`
      }))
    }));
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    body = cur.phase === 'ready' ? React.createElement("div", {
      className: "text-center space-y-5 py-4"
    }, React.createElement(Avatar, {
      player: p,
      size: 80
    }), React.createElement("div", {
      className: "text-2xl font-black"
    }, t.passTo(p.name)), React.createElement("p", {
      className: "text-sm text-white/70 max-w-sm mx-auto"
    }, t.charadesHint), React.createElement(StartButton, {
      t: t,
      onClick: begin,
      accent: mode.accent,
      icon: "\uD83C\uDFAD",
      label: `${t.start} · ${seconds}s`
    })) : React.createElement("div", {
      className: "space-y-4"
    }, React.createElement("div", {
      className: "flex items-center justify-between gap-3"
    }, React.createElement(PlayerChip, {
      player: p,
      label: `✓ ${cur.got}`
    }), React.createElement(TimerRing, {
      ms: timer.ms,
      total: seconds * 1000,
      size: 72,
      color: mode.accent
    })), React.createElement("div", {
      className: "rounded-3xl p-6 sm:p-8 bg-black/25 border border-white/15 text-center slide-up",
      key: cur.word
    }, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, t.yourWord), React.createElement("p", {
      className: "text-3xl sm:text-4xl font-black mt-3 leading-tight"
    }, cur.word)), React.createElement("div", {
      className: "grid grid-cols-2 gap-3"
    }, React.createElement("button", {
      onClick: () => mark(false),
      className: "min-h-[80px] rounded-3xl text-xl font-black btn-press bg-white/10 border-2 border-white/20"
    }, "\u23ED ", t.pass), React.createElement("button", {
      onClick: () => mark(true),
      className: "min-h-[80px] rounded-3xl text-xl font-black btn-press bg-green-500/25 border-2 border-green-300/60"
    }, "\u2713 ", t.gotWord)), React.createElement("button", {
      onClick: finishTurn,
      className: "w-full text-xs font-bold text-white/60 hover:text-white py-1"
    }, "\u23F9 ", t.endTurn));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = React.createElement("div", {
      className: "space-y-4 text-center"
    }, React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, r.got > 0 ? `🎉 ${byId(r.playerId).name} · +${r.got}` : `😅 ${byId(r.playerId).name} · 0`), React.createElement("div", {
      className: "flex flex-wrap justify-center gap-1.5"
    }, r.log.map((e, i) => React.createElement("span", {
      key: i,
      className: `text-xs font-bold px-2.5 py-1 rounded-full border ${e.ok ? 'bg-green-500/20 border-green-300/50' : 'bg-white/5 border-white/15 opacity-60 line-through'}`
    }, e.word))), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.playerId],
      metricLabel: t.pts,
      compact: true
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      stats: w ? [`🏆 ${w.score} ${t.points}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.total,
    status: state.status,
    onExit: onExit
  }, body);
}
function ImposterGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const [rounds, setRounds] = useState(3);
  const [talkSec, setTalkSec] = useState(120);
  const groups = IMPOSTER_WORDS[lang];
  const bag = useBag(groups.flatMap(g => g.words.map(w => ({
    id: `${g.category}-${w}`,
    category: g.category,
    word: w
  }))), `imposter-${lang}`);
  const timer = useTimer();
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: s => {
      const pick = bag.next();
      const imposterId = Random.player(s.players).id;
      return {
        ...pick,
        imposterId,
        phase: 'pass',
        idx: 0,
        peeking: false,
        votedId: null
      };
    },
    resolveRound: (s, {
      votedId,
      guessed
    }) => {
      const {
        imposterId
      } = s.current;
      let players = s.players;
      const caught = votedId === imposterId;
      if (caught) {
        s.players.forEach(p => {
          if (p.id !== imposterId) players = Score.addPoints(Score.incrementWin(players, p.id), p.id, 1);
        });
        if (guessed) players = Score.addPoints(players, imposterId, 1);
        players = Score.incrementLoss(players, imposterId);
      } else {
        players = Score.addPoints(Score.incrementWin(players, imposterId), imposterId, 2);
        s.players.forEach(p => {
          if (p.id !== imposterId) players = Score.incrementLoss(players, p.id);
        });
      }
      return {
        players,
        result: {
          imposterId,
          votedId,
          caught,
          guessed,
          word: s.current.word
        }
      };
    },
    checkEnd: s => s.round >= s.settings.rounds ? Score.leaders(s.players) : null
  }), [lang]);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const cur = state.current;
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen, {
      rounds
    });
  };
  const discussing = state.status === 'challenge' && cur && cur.phase === 'discuss';
  useEffect(() => {
    if (!discussing || !talkSec) {
      timer.stop();
      return;
    }
    timer.start(talkSec * 1000, () => {
      sfx('land');
      engine.patchCurrent({
        phase: 'vote'
      });
    });
    return () => timer.stop();
  }, [discussing, state.round]);
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map(p => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useMiniStage(ctx, state, {
    participants: [],
    challenge: cur && state.status === 'challenge' ? cur.phase === 'pass' ? `📱 ${t.passingPhone}` : cur.phase === 'discuss' ? `🗣️ ${t.discuss} · ${cur.category}` : `🗳️ ${t.voteNow}` : null,
    timerMs: discussing ? timer.ms : null
  });
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: "\uD83D\uDD75\uFE0F"
    }, React.createElement(OptionPills, {
      label: t.roundsLabel,
      value: rounds,
      onChange: setRounds,
      options: [1, 3, 5].map(n => ({
        value: n,
        label: String(n)
      }))
    }), React.createElement(OptionPills, {
      label: t.discussTime,
      value: talkSec,
      onChange: setTalkSec,
      options: [{
        value: 0,
        label: '∞'
      }, {
        value: 60,
        label: '1m'
      }, {
        value: 120,
        label: '2m'
      }, {
        value: 180,
        label: '3m'
      }]
    }));
  } else if (state.status === 'challenge') {
    if (cur.phase === 'pass') {
      const p = ps[cur.idx];
      const isImp = p.id === cur.imposterId;
      body = React.createElement("div", {
        className: "text-center space-y-5 py-2"
      }, React.createElement("div", {
        className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
      }, cur.idx + 1, " / ", ps.length), React.createElement(Avatar, {
        player: p,
        size: 80
      }), React.createElement("div", {
        className: "text-2xl font-black"
      }, t.passTo(p.name)), !cur.peeking ? React.createElement(React.Fragment, null, React.createElement("p", {
        className: "text-sm text-white/70"
      }, t.peekHint), React.createElement("button", {
        onClick: () => {
          sfx('click');
          engine.patchCurrent({
            peeking: true
          });
        },
        className: "w-full py-4 rounded-3xl font-extrabold text-lg btn-press shadow-lg text-white",
        style: {
          background: `linear-gradient(90deg, ${mode.accent}, #a78bfa)`
        }
      }, "\uD83D\uDC40 ", t.showMyCard)) : React.createElement(React.Fragment, null, React.createElement("div", {
        className: `rounded-3xl p-6 border-2 slide-up ${isImp ? 'bg-red-500/20 border-red-300/60' : 'bg-black/25 border-white/15'}`
      }, React.createElement("div", {
        className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
      }, cur.category), isImp ? React.createElement(React.Fragment, null, React.createElement("div", {
        className: "text-4xl mt-2"
      }, "\uD83D\uDD75\uFE0F"), React.createElement("p", {
        className: "text-2xl font-black mt-1"
      }, t.youAreImposter), React.createElement("p", {
        className: "text-sm text-white/75 mt-2"
      }, t.imposterHint)) : React.createElement(React.Fragment, null, React.createElement("p", {
        className: "text-3xl font-black mt-3"
      }, cur.word), React.createElement("p", {
        className: "text-sm text-white/75 mt-2"
      }, t.crewHint))), React.createElement("button", {
        onClick: () => {
          sfx('whoosh');
          const last = cur.idx + 1 >= ps.length;
          engine.patchCurrent(last ? {
            phase: 'discuss',
            peeking: false
          } : {
            idx: cur.idx + 1,
            peeking: false
          });
        },
        className: "w-full py-3.5 rounded-full font-extrabold btn-press bg-white/10 border border-white/15"
      }, "\uD83D\uDE48 ", t.hideAndPass)));
    } else if (cur.phase === 'discuss') {
      body = React.createElement("div", {
        className: "space-y-5 text-center"
      }, React.createElement("div", {
        className: "flex items-center justify-between gap-3"
      }, React.createElement("div", {
        className: "text-left"
      }, React.createElement("div", {
        className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
      }, t.category), React.createElement("div", {
        className: "text-xl font-black"
      }, cur.category)), talkSec > 0 ? React.createElement(TimerRing, {
        ms: timer.ms,
        total: talkSec * 1000,
        size: 72,
        color: mode.accent
      }) : React.createElement("span", {
        className: "text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15"
      }, "\u23F1 \u221E")), React.createElement("div", {
        className: "rounded-3xl p-6 bg-black/25 border border-white/15"
      }, React.createElement("div", {
        className: "text-5xl"
      }, "\uD83D\uDDE3\uFE0F"), React.createElement("p", {
        className: "text-lg font-black mt-2"
      }, t.discuss), React.createElement("p", {
        className: "text-sm text-white/70 mt-1"
      }, t.discussHint)), React.createElement("div", {
        className: "flex flex-wrap justify-center gap-1.5"
      }, ps.map(p => React.createElement(PlayerChip, {
        key: p.id,
        player: p,
        size: 30
      }))), React.createElement(StartButton, {
        t: t,
        onClick: () => {
          timer.stop();
          sfx('click');
          engine.patchCurrent({
            phase: 'vote'
          });
        },
        accent: mode.accent,
        icon: "\uD83D\uDDF3\uFE0F",
        label: t.voteNow
      }));
    } else {
      body = React.createElement("div", {
        className: "space-y-4"
      }, React.createElement("div", {
        className: "text-center"
      }, React.createElement("div", {
        className: "text-4xl"
      }, "\uD83D\uDDF3\uFE0F"), React.createElement("div", {
        className: "text-xl font-black mt-1"
      }, t.whoIsImposter), React.createElement("div", {
        className: "text-sm text-white/65"
      }, t.voteHintImposter)), React.createElement("div", {
        className: "grid grid-cols-2 sm:grid-cols-3 gap-2"
      }, ps.map(p => React.createElement("button", {
        key: p.id,
        onClick: () => {
          sfx('click');
          engine.patchCurrent({
            votedId: p.id
          });
        },
        "aria-pressed": cur.votedId === p.id,
        className: `flex items-center gap-2 rounded-2xl px-3 py-2.5 border-2 btn-press text-left ${cur.votedId === p.id ? 'bg-red-500/25 border-red-300' : 'bg-white/5 border-white/15'}`
      }, React.createElement(Avatar, {
        player: p,
        size: 32
      }), React.createElement("span", {
        className: "font-bold truncate"
      }, p.name)))), cur.votedId && React.createElement(Decision, {
        hint: t.imposterGuessQ,
        onPick: id => {
          sfx('win');
          engine.resolveRound({
            votedId: cur.votedId,
            guessed: id === 'yes'
          });
        },
        options: [{
          id: 'no',
          label: `👁 ${t.revealAnswer}`,
          color: mode.accent
        }, {
          id: 'yes',
          label: `🎯 ${t.imposterGuessed}`,
          color: '#fbbf24'
        }]
      }));
    }
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const imp = byId(r.imposterId);
    body = React.createElement("div", {
      className: "space-y-4 text-center"
    }, React.createElement("div", {
      className: "text-5xl"
    }, r.caught ? '🚨' : '😎'), React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, r.caught ? t.imposterCaught(imp.name) : t.imposterEscaped(imp.name)), React.createElement("div", {
      className: "text-sm text-white/75"
    }, t.theWordWas, " ", React.createElement("span", {
      className: "font-black text-white"
    }, r.word), r.guessed ? ` · 🎯 ${t.imposterGuessed}` : ''), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.imposterId],
      metricLabel: t.pts,
      compact: true
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      stats: w ? [`🏆 ${w.score} ${t.points}`, `🕵️ ${w.wins} ${t.winsLabel}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.rounds,
    status: state.status,
    onExit: onExit
  }, body);
}
function BombGame({
  ctx
}) {
  const {
    t,
    lang,
    mode,
    item,
    meta,
    modeTitle,
    sfx,
    haptics,
    celebrate,
    onExit,
    onChangeGame,
    onBackToParty,
    onFinish
  } = ctx;
  const setup = useMiniSetup(ctx);
  const [rounds, setRounds] = useState(5);
  const bag = useBag(BOMB_CATEGORIES[lang], `bomb-${lang}`);
  const timer = useTimer();
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: s => ({
      category: bag.next(),
      holderIdx: randInt(s.players.length),
      phase: 'ready',
      fuse: 20000 + randInt(25000),
      passes: 0
    }),
    resolveRound: (s, {
      holderId,
      passes
    }) => {
      let players = s.players;
      s.players.forEach(p => {
        players = p.id === holderId ? Score.incrementLoss(players, p.id) : Score.addPoints(players, p.id, 1);
      });
      return {
        players,
        result: {
          holderId,
          passes
        }
      };
    },
    checkEnd: s => s.round >= s.settings.rounds ? Score.leaders(s.players) : null
  }), [lang]);
  const engine = useGameEngine(rules);
  const {
    state
  } = engine;
  const ps = state.players;
  const byId = id => Score.byId(ps, id);
  const cur = state.current;
  const start = () => {
    if (!setup.canStart) return;
    sfx('click');
    engine.startGame(setup.chosen, {
      rounds
    });
  };
  const ticking = state.status === 'challenge' && cur && cur.phase === 'ticking';
  const curRef = useRef(cur);
  curRef.current = cur;
  const explode = () => {
    const c = curRef.current;
    sfx('land');
    if (haptics) vibrate([80, 40, 160]);
    engine.resolveRound({
      holderId: ps[c.holderIdx].id,
      passes: c.passes
    });
  };
  const explodeRef = useRef(explode);
  explodeRef.current = explode;
  useEffect(() => {
    if (!ticking) {
      timer.stop();
      return;
    }
    timer.start(cur.fuse, () => explodeRef.current());
    return () => timer.stop();
  }, [ticking, state.round]);
  const pass = () => {
    const c = curRef.current;
    sfx('tick');
    if (haptics) vibrate(15);
    const next = {
      holderIdx: (c.holderIdx + 1) % ps.length,
      passes: c.passes + 1
    };
    curRef.current = {
      ...c,
      ...next
    };
    engine.patchCurrent(next);
  };
  const urgency = ticking ? clamp(1 - timer.ms / cur.fuse, 0, 1) : 0;
  const winners = state.winner ? state.winner.map(p => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map(p => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useMiniStage(ctx, state, {
    participants: cur ? [ps[cur.holderIdx]].filter(Boolean) : [],
    challenge: cur && state.status === 'challenge' ? `💣 ${cur.category}` : null,
    timerMs: null
  });
  let body;
  if (state.status === 'setup') {
    body = React.createElement(MiniSetup, {
      ctx: ctx,
      setup: setup,
      onStart: start,
      icon: "\uD83D\uDCA3"
    }, React.createElement(OptionPills, {
      label: t.roundsLabel,
      value: rounds,
      onChange: setRounds,
      options: [3, 5, 8].map(n => ({
        value: n,
        label: String(n)
      }))
    }));
  } else if (state.status === 'challenge') {
    const holder = ps[cur.holderIdx];
    body = cur.phase === 'ready' ? React.createElement("div", {
      className: "text-center space-y-5 py-2"
    }, React.createElement("div", {
      className: "rounded-3xl p-5 bg-black/25 border border-white/15"
    }, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, t.category), React.createElement("p", {
      className: "text-2xl font-black mt-2"
    }, cur.category)), React.createElement(Avatar, {
      player: holder,
      size: 72
    }), React.createElement("div", {
      className: "text-lg font-black"
    }, t.bombStartsWith(holder.name)), React.createElement("p", {
      className: "text-sm text-white/70"
    }, t.bombHint), React.createElement(StartButton, {
      t: t,
      onClick: () => {
        sfx('whoosh');
        engine.patchCurrent({
          phase: 'ticking'
        });
      },
      accent: mode.accent,
      icon: "\uD83D\uDD25",
      label: t.lightFuse
    })) : React.createElement("div", {
      className: "space-y-4 text-center"
    }, React.createElement("div", {
      className: "rounded-3xl p-4 bg-black/25 border border-white/15"
    }, React.createElement("div", {
      className: "text-[11px] uppercase tracking-[0.25em] text-white/55"
    }, t.category), React.createElement("p", {
      className: "text-xl font-black mt-1"
    }, cur.category)), React.createElement("div", {
      className: "flex items-center justify-center gap-3"
    }, React.createElement(Avatar, {
      player: holder,
      size: 44
    }), React.createElement("div", {
      className: "text-left"
    }, React.createElement("div", {
      className: "text-[11px] text-white/55"
    }, t.holding), React.createElement("div", {
      className: "text-xl font-black"
    }, holder.name))), React.createElement("button", {
      onClick: pass,
      className: "relative w-full min-h-[150px] rounded-[2rem] font-black text-3xl btn-press border-4 border-red-300/60 text-white overflow-hidden",
      style: {
        background: `radial-gradient(circle at 50% 40%, rgba(248,113,113,${0.35 + urgency * 0.45}), rgba(0,0,0,0.5))`,
        animation: `pulse-soft ${Math.max(0.25, 1.1 - urgency)}s ease-in-out infinite`
      }
    }, React.createElement("span", {
      className: "block text-6xl mb-1",
      "aria-hidden": "true"
    }, "\uD83D\uDCA3"), t.passBomb, React.createElement("span", {
      className: "absolute bottom-2 right-3 text-xs font-bold text-white/60"
    }, cur.passes, " \u21BB")));
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const loser = byId(r.holderId);
    body = React.createElement("div", {
      className: "space-y-4 text-center"
    }, React.createElement("div", {
      className: "text-6xl"
    }, "\uD83D\uDCA5"), React.createElement("div", {
      className: "text-2xl font-black score-pop"
    }, t.bombExploded(loser.name)), React.createElement("div", {
      className: "text-sm text-white/70"
    }, t.passesN(r.passes), " \xB7 ", t.everyoneElsePlusOne), React.createElement("div", {
      className: "text-left"
    }, React.createElement(ScoreBoard, {
      t: t,
      players: ps,
      highlight: [r.holderId],
      metricLabel: t.pts,
      compact: true
    })), React.createElement(NextButton, {
      t: t,
      engine: engine,
      accent: mode.accent,
      sfx: sfx
    }));
  } else {
    const w = winners[0];
    body = React.createElement(GameResult, {
      t: t,
      winners: winners,
      players: ps,
      metricLabel: t.pts,
      stats: w ? [`🏆 ${w.score} ${t.points}`, `💥 ${w.losses}`] : [],
      onPlayAgain: start,
      onChangeGame: onChangeGame,
      onBackToParty: onBackToParty,
      celebrate: celebrate
    });
  }
  return React.createElement(GameShell, {
    t: t,
    modeTitle: modeTitle,
    meta: meta,
    round: state.round,
    totalRounds: state.settings.rounds,
    status: state.status,
    onExit: onExit
  }, body);
}

/* ==== js/app.js ==== */
const gameComponents = () => ({
  battle: typeof BattleGame !== 'undefined' ? BattleGame : null,
  king: typeof KingGame !== 'undefined' ? KingGame : null,
  quiz: typeof QuizGame !== 'undefined' ? QuizGame : null,
  rps: typeof RpsGame !== 'undefined' ? RpsGame : null,
  fiveSecond: typeof FiveSecondGame !== 'undefined' ? FiveSecondGame : null,
  dontLaugh: typeof DontLaughGame !== 'undefined' ? DontLaughGame : null,
  reaction: typeof ReactionGame !== 'undefined' ? ReactionGame : null,
  memory: typeof MemoryGame !== 'undefined' ? MemoryGame : null,
  word: typeof WordGame !== 'undefined' ? WordGame : null,
  cards: typeof CardsGame !== 'undefined' ? CardsGame : null,
  votecards: typeof VoteCardsGame !== 'undefined' ? VoteCardsGame : null,
  charades: typeof CharadesGame !== 'undefined' ? CharadesGame : null,
  imposter: typeof ImposterGame !== 'undefined' ? ImposterGame : null,
  bomb: typeof BombGame !== 'undefined' ? BombGame : null
});
function App() {
  const stored = useMemo(() => loadState(), []);
  const initialLang = stored.lang || ((navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en');
  const [lang, setLang] = useState(I18N[initialLang] ? initialLang : 'en');
  const [themeKey, setThemeKey] = useState(THEMES[stored.themeKey] ? stored.themeKey : 'drinking');
  const [soundOn, setSoundOn] = useState(stored.soundOn ?? true);
  const [haptics, setHaptics] = useState(stored.haptics ?? true);
  const [eliminate, setEliminate] = useState(stored.eliminate ?? false);
  const [duration, setDuration] = useState(clamp(stored.duration || 8, MIN_DURATION, MAX_DURATION));
  const [items, setItems] = useState(() => Array.isArray(stored.items) && stored.items.length ? stored.items.slice(0, MAX_ITEMS) : SAMPLE_ITEMS[initialLang === 'vi' ? 'vi' : 'en'].drinking);
  const [eliminated, setEliminated] = useState(Array.isArray(stored.eliminated) ? stored.eliminated : []);
  const [history, setHistory] = useState(Array.isArray(stored.history) ? stored.history.slice(0, MAX_HISTORY) : []);
  const [lists, setLists] = useState(Array.isArray(stored.lists) ? stored.lists : []);
  const [openModes, setOpenModes] = useState([]);
  const [activeGame, setActiveGame] = useState(() => stored.activeGame && findGame(stored.activeGame.mode, stored.activeGame.id) ? stored.activeGame : {
    mode: 'spinner',
    id: themeKey
  });
  const [session, setSession] = useState(() => normalizeSession(stored.session));
  const [quizPrefs, setQuizPrefsState] = useState(loadQuizPrefs);
  const setQuizPrefs = useCallback(patch => setQuizPrefsState(p => {
    const next = {
      ...p,
      ...patch
    };
    saveQuizPrefs(next);
    return next;
  }), []);
  const [sub, setSub] = useState(() => normalizeSubscription(stored.subscription));
  const [venue, setVenue] = useState(() => normalizeVenue(stored.venue));
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState('play');
  const [editorGameId, setEditorGameId] = useState(null);
  const [contentRev, setContentRev] = useState(0);
  const [upgrade, setUpgrade] = useState(null);
  const [bigScreen, setBigScreen] = useState(false);
  const [party, setParty] = useState(false);
  const [toast, setToast] = useState(null);
  const [stage, setStage] = useState(null);
  const [gameRun, setGameRun] = useState(0);
  const t = I18N[lang];
  const theme = THEMES[themeKey];
  const skin = skinOf(theme);
  const themeText = THEME_TEXT[lang][themeKey];
  const activeDef = activeGame.mode !== 'spinner' ? findGame(activeGame.mode, activeGame.id) : null;
  const inGame = !!activeDef;
  const subtitle = activeDef ? `${MODE_TEXT[lang][activeDef.mode.id].title} · ${gameMeta(lang, activeDef.mode, activeDef.item).title}` : null;
  const brand = brandingActive(sub, venue) ? venue : null;
  const cfgRef = useRef({});
  cfgRef.current = {
    soundOn,
    haptics,
    theme
  };
  const sfx = useCallback(name => {
    if (cfgRef.current.soundOn && SFX[name]) SFX[name]();
  }, []);
  const showToast = useCallback((msg, action) => setToast({
    id: uid(),
    msg,
    action
  }), []);
  const setPlayers = useCallback(next => setSession(s => ({
    ...s,
    players: typeof next === 'function' ? next(s.players) : next
  })), []);
  const host = typeof useHostSession === 'function' ? useHostSession({
    venue,
    players: session.players,
    setPlayers,
    stage,
    sub
  }) : {
    room: null,
    remote: {},
    status: 'offline',
    paused: false,
    setPaused: () => {},
    onlineCount: 0,
    start: () => {},
    end: () => {},
    newCode: () => {},
    clearRemote: () => {}
  };
  useEffect(() => {
    saveState({
      lang,
      themeKey,
      soundOn,
      haptics,
      eliminate,
      duration,
      items,
      eliminated,
      history,
      lists,
      activeGame,
      session,
      subscription: sub,
      venue,
      hostRoom: host.room ? host.room.code : null
    });
  }, [lang, themeKey, soundOn, haptics, eliminate, duration, items, eliminated, history, lists, activeGame, session, sub, venue, host.room]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (menuOpen) setOpenModes([]);
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);
  useEffect(() => {
    document.body.style.background = theme.bgGradient;
    document.body.style.backgroundAttachment = 'fixed';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.themeColor);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    applyBrandVars(venue, !!brand);
  }, [venue, brand]);
  useEffect(() => {
    if (IS_DEV) window.__pgDebug = {
      stage,
      room: host.room,
      remote: host.remote,
      status: host.status,
      players: session.players.length,
      screen,
      activeGame
    };
  });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.action ? 5000 : 2600);
    return () => clearTimeout(id);
  }, [toast]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (isSampleList(itemsRef.current)) {
      setItems(SAMPLE_ITEMS[lang][themeKey] || SAMPLE_ITEMS[lang].drinking);
      setEliminated([]);
    }
  }, [themeKey, lang]);
  useEffect(() => {
    if (!Entitlements.canPlay(sub, GAME_REGISTRY.spinner.games[themeKey])) setThemeKey('drinking');
    if (activeDef && !Entitlements.canPlay(sub, activeDef.item)) setActiveGame({
      mode: 'spinner',
      id: 'drinking'
    });
    if (screen === 'venue' && !Entitlements.hasFeature(sub, 'venue-mode')) setScreen('play');
    if (bigScreen && !Entitlements.hasFeature(sub, 'big-screen')) setBigScreen(false);
  }, [sub]);
  const reloadContent = useCallback(async () => {
    try {
      await refreshCustomContent();
      setContentRev(n => n + 1);
    } catch (e) {
      console.warn('[content]', e);
    }
  }, []);
  useEffect(() => {
    reloadContent();
  }, [reloadContent]);
  useEffect(() => {
    let prev = null;
    try {
      prev = sessionStorage.getItem('pg-host');
    } catch (e) {}
    if (prev && Entitlements.hasFeature(sub, 'realtime-sync')) host.start(prev);
  }, []);
  useEffect(() => {
    const shared = readSharedWheel();
    if (!shared) return;
    const prevItems = itemsRef.current;
    const prevTheme = themeKey;
    setItems(shared.items);
    setEliminated([]);
    if (shared.theme) setThemeKey(shared.theme);
    setActiveGame({
      mode: 'spinner',
      id: shared.theme || themeKey
    });
    window.history.replaceState(null, '', baseUrl());
    showToast(t.loadedShared, {
      label: t.undo,
      fn: () => {
        setItems(prevItems);
        setThemeKey(prevTheme);
      }
    });
  }, []);
  const onSpun = useCallback((label, themeK) => {
    setHistory(prev => [{
      winner: label,
      theme: themeK,
      ts: Date.now()
    }, ...prev].slice(0, MAX_HISTORY));
  }, []);
  const celebrateGame = useCallback(() => {
    const {
      theme: th,
      haptics: hp
    } = cfgRef.current;
    sfx('win');
    if (hp) vibrate([40, 60, 40, 60, 120]);
    fireConfetti(th.confettiColors);
  }, [sfx]);
  const finishGame = useCallback(entry => setSession(s => recordGame(s, entry)), []);
  const goPlay = () => {
    setScreen('play');
    setMenuOpen(false);
  };
  const openCreator = (view, gameId) => {
    sfx('click');
    setEditorGameId(gameId || null);
    setScreen(view);
    setMenuOpen(false);
  };
  const playCustomGame = game => {
    const def = findGame('quiz', `quiz-custom:${game.id}`);
    if (!def) {
      showToast(t.vNoQuestions);
      return;
    }
    setActiveGame({
      mode: 'quiz',
      id: def.item.id
    });
    setGameRun(n => n + 1);
    goPlay();
  };
  const backToSpinner = () => {
    sfx('click');
    setActiveGame({
      mode: 'spinner',
      id: themeKey
    });
    goPlay();
  };
  const pickTheme = k => {
    sfx('click');
    setThemeKey(k);
    setActiveGame({
      mode: 'spinner',
      id: k
    });
    setScreen('play');
  };
  const pickGame = (mode, item, locked) => {
    if (locked) {
      sfx('click');
      setUpgrade({
        plan: Entitlements.requiredPlan(item),
        meta: gameMeta(lang, mode, item)
      });
      return;
    }
    if (mode.type === 'themes') {
      pickTheme(item.id);
      return;
    }
    sfx('click');
    setActiveGame({
      mode: mode.id,
      id: item.id
    });
    setGameRun(n => n + 1);
    goPlay();
  };
  const toggleMode = id => {
    sfx('click');
    setOpenModes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const openPricing = () => {
    sfx('click');
    setUpgrade(null);
    setScreen('pricing');
    setMenuOpen(false);
  };
  const openVenue = () => {
    sfx('click');
    if (!Entitlements.hasFeature(sub, 'venue-mode')) {
      setUpgrade({
        plan: 'max',
        meta: null
      });
      return;
    }
    setScreen('venue');
    setMenuOpen(false);
  };
  const openParty = () => {
    sfx('click');
    setScreen('party');
    setMenuOpen(false);
  };
  const doUpgrade = plan => {
    if (IS_DEV) {
      setSub(createSubscription(plan));
      setUpgrade(null);
      showToast(t.devSwitched(plan));
      return;
    }
    showToast(t.paymentsSoon);
  };
  const devSetPlan = plan => {
    setSub(createSubscription(plan));
    showToast(t.devSwitched(plan));
  };
  const saveList = name => {
    setLists(prev => [{
      id: uid(),
      name,
      items,
      theme: themeKey,
      ts: Date.now()
    }, ...prev.filter(l => l.name !== name)].slice(0, MAX_SAVED));
    showToast(t.saved(name));
  };
  const loadList = id => {
    const l = lists.find(x => x.id === id);
    if (!l) return;
    setItems(l.items.slice(0, MAX_ITEMS));
    setEliminated([]);
    const k = THEMES[l.theme] && Entitlements.canPlay(sub, GAME_REGISTRY.spinner.games[l.theme]) ? l.theme : themeKey;
    setThemeKey(k);
    setActiveGame({
      mode: 'spinner',
      id: k
    });
    goPlay();
    showToast(t.loaded(l.name));
  };
  const clearHistoryFor = g => {
    sfx('click');
    if (g.mode === 'spinner') setHistory(prev => prev.filter(h => h.theme !== g.id));else setSession(s => ({
      ...s,
      history: s.history.filter(h => h.gameId !== g.id)
    }));
  };
  const deleteList = id => {
    const prev = lists;
    const l = lists.find(x => x.id === id);
    setLists(lists.filter(x => x.id !== id));
    showToast(t.deleted(l ? l.name : ''), {
      label: t.undo,
      fn: () => setLists(prev)
    });
  };
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) SFX.click();
    showToast(next ? t.unmuted : t.muted);
  };
  const shareWheel = async () => {
    const url = `${baseUrl()}#w=${b64url.enc(JSON.stringify({
      t: themeKey,
      i: items
    }))}`;
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: 'JParty',
          url
        });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    if (await copyText(url)) showToast(t.linkCopied);
  };
  const toggleParty = () => {
    const next = !party;
    setParty(next);
    try {
      if (next && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!next && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) {}
  };
  const toggleBigScreen = () => {
    if (!Entitlements.hasFeature(sub, 'big-screen')) {
      setUpgrade({
        plan: 'max',
        meta: null
      });
      return;
    }
    setBigScreen(b => !b);
  };
  const keyCtx = useRef({});
  keyCtx.current = {
    upgrade,
    menuOpen,
    party,
    bigScreen,
    toggleParty,
    toggleSound
  };
  useEffect(() => {
    const onKey = e => {
      const k = keyCtx.current;
      const tag = e.target && e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target && e.target.isContentEditable;
      if (e.key === 'Escape') {
        if (k.upgrade) setUpgrade(null);else if (k.menuOpen) setMenuOpen(false);else if (k.bigScreen) setBigScreen(false);else if (k.party) k.toggleParty();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'f' || e.key === 'F') && !k.menuOpen && !k.upgrade) k.toggleParty();else if (e.key === 'm' || e.key === 'M') k.toggleSound();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const comps = gameComponents();
  const GameComp = activeDef ? comps[activeDef.item.component] : null;
  const gameCtx = activeDef ? {
    t,
    lang,
    mode: activeDef.mode,
    item: activeDef.item,
    meta: gameMeta(lang, activeDef.mode, activeDef.item),
    modeTitle: MODE_TEXT[lang][activeDef.mode.id].title,
    players: session.players,
    setPlayers,
    sfx,
    haptics,
    theme,
    celebrate: celebrateGame,
    showToast,
    publish: setStage,
    onExit: backToSpinner,
    onChangeGame: () => setMenuOpen(true),
    onBackToParty: openParty,
    onFinish: finishGame,
    host,
    sub,
    quizPrefs,
    setQuizPrefs,
    openItem: (modeId, itemId) => {
      const def = findGame(modeId, itemId);
      if (def) pickGame(def.mode, def.item, !Entitlements.canPlay(sub, def.item));
    }
  } : null;
  const keysBlocked = menuOpen || !!upgrade || screen !== 'play' || bigScreen;
  let main;
  if (screen === 'pricing') {
    main = React.createElement(PricingView, {
      t: t,
      sub: sub,
      onUpgrade: doUpgrade,
      onBack: goPlay
    });
  } else if (screen === 'party') {
    main = React.createElement(PartyView, {
      t: t,
      lang: lang,
      session: session,
      setSession: setSession,
      onBack: goPlay,
      sfx: sfx
    });
  } else if (screen === 'mygames') {
    main = React.createElement(MyGamesView, {
      key: contentRev,
      t: t,
      lang: lang,
      sfx: sfx,
      showToast: showToast,
      onBack: goPlay,
      onChanged: reloadContent,
      onCreate: () => openCreator('editor', null),
      onEdit: g => openCreator('editor', g.id),
      onPlay: playCustomGame,
      onOpenBank: () => openCreator('bank')
    });
  } else if (screen === 'bank') {
    main = React.createElement(QuestionBankView, {
      key: contentRev,
      t: t,
      lang: lang,
      sfx: sfx,
      showToast: showToast,
      onBack: () => setScreen('mygames'),
      onChanged: reloadContent
    });
  } else if (screen === 'editor') {
    main = React.createElement(GameEditorView, {
      key: `${editorGameId || 'new'}-${contentRev}`,
      t: t,
      lang: lang,
      gameId: editorGameId,
      sfx: sfx,
      showToast: showToast,
      onBack: () => setScreen('mygames'),
      onChanged: reloadContent,
      onPlay: playCustomGame
    });
  } else if (screen === 'venue' && typeof VenueView !== 'undefined') {
    main = React.createElement(VenueView, {
      t: t,
      lang: lang,
      venue: venue,
      setVenue: setVenue,
      sub: sub,
      session: session,
      setPlayers: setPlayers,
      stage: stage,
      host: host,
      sfx: sfx,
      showToast: showToast,
      onBack: goPlay,
      onBigScreen: toggleBigScreen
    });
  } else if (inGame) {
    main = GameComp ? React.createElement(GameErrorBoundary, {
      key: `${activeGame.mode}/${activeGame.id}/${gameRun}`,
      t: t,
      onExit: backToSpinner
    }, React.createElement(GameComp, {
      ctx: gameCtx
    })) : React.createElement(GamePlaceholder, {
      t: t,
      lang: lang,
      mode: activeDef.mode,
      item: activeDef.item,
      theme: theme,
      onBack: backToSpinner,
      onBrowse: () => setMenuOpen(true)
    });
  } else {
    main = React.createElement(SpinnerView, {
      t: t,
      lang: lang,
      theme: theme,
      skin: skin,
      themeText: themeText,
      items: items,
      setItems: setItems,
      eliminated: eliminated,
      setEliminated: setEliminated,
      eliminate: eliminate,
      duration: duration,
      haptics: haptics,
      party: party,
      keysBlocked: keysBlocked,
      sfx: sfx,
      showToast: showToast,
      onSpun: onSpun,
      publish: setStage
    });
  }
  return React.createElement("div", {
    className: "min-screen flex flex-col lg:flex-row lg:items-start relative overflow-x-hidden"
  }, React.createElement("div", {
    className: "blob",
    style: {
      background: brand ? venue.primary : theme.accent,
      width: '55vmax',
      height: '55vmax',
      top: '-20vmax',
      left: '-15vmax'
    },
    "aria-hidden": "true"
  }), React.createElement("div", {
    className: "blob b2",
    style: {
      background: brand ? venue.secondary : theme.palette[2],
      width: '45vmax',
      height: '45vmax',
      bottom: '-18vmax',
      right: '-12vmax'
    },
    "aria-hidden": "true"
  }), React.createElement(SideMenu, {
    open: menuOpen,
    onClose: () => setMenuOpen(false),
    t: t,
    lang: lang,
    setLang: setLang,
    openModes: openModes,
    onToggleMode: toggleMode,
    activeGame: screen === 'play' ? activeGame : {
      mode: ['editor', 'bank', 'mygames'].includes(screen) ? 'quiz' : screen,
      id: ''
    },
    onPickGame: pickGame,
    sub: sub,
    onOpenPricing: openPricing,
    onDevSetPlan: devSetPlan,
    venue: brand,
    onOpenVenue: openVenue,
    quizPrefs: quizPrefs,
    setQuizPrefs: setQuizPrefs,
    activeDef: activeDef,
    session: session,
    onOpenParty: openParty,
    onOpenCreator: openCreator,
    soundOn: soundOn,
    setSoundOn: setSoundOn,
    haptics: haptics,
    setHaptics: setHaptics,
    eliminate: eliminate,
    setEliminate: setEliminate,
    duration: duration,
    setDuration: setDuration,
    history: history,
    currentGame: activeGame,
    onClearHistory: clearHistoryFor,
    lists: lists,
    onSaveList: saveList,
    onLoadList: loadList,
    onDeleteList: deleteList,
    canSave: items.length > 0
  }), React.createElement("div", {
    className: "flex-1 min-w-0 flex flex-col min-screen"
  }, React.createElement(Header, {
    t: t,
    theme: theme,
    themeText: themeText,
    subtitle: subtitle,
    brand: brand,
    onMenu: () => setMenuOpen(true),
    soundOn: soundOn,
    onToggleSound: toggleSound,
    onShareWheel: shareWheel,
    party: party,
    onToggleParty: toggleParty
  }), React.createElement("main", {
    className: `relative z-10 flex-1 flex flex-col items-center px-4 gap-5 max-w-3xl w-full mx-auto ${party && !inGame ? 'justify-center py-4' : 'py-6'}`
  }, main)), upgrade && React.createElement(UpgradeModal, {
    t: t,
    plan: upgrade.plan,
    meta: upgrade.meta,
    onUpgrade: doUpgrade,
    onClose: () => setUpgrade(null)
  }), bigScreen && typeof BigScreen !== 'undefined' && React.createElement(BigScreen, {
    t: t,
    venue: brand,
    stage: stage,
    session: session,
    room: host.room,
    onClose: () => setBigScreen(false)
  }), host.room && screen !== 'venue' && !bigScreen && React.createElement("button", {
    onClick: openVenue,
    className: "fixed z-20 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-white/15 text-xs font-bold backdrop-blur btn-press",
    style: {
      top: 'calc(max(0.75rem, env(safe-area-inset-top)) + 56px)'
    },
    "aria-label": t.venueMode
  }, React.createElement("span", {
    className: `w-2 h-2 rounded-full ${host.status === 'online' ? 'bg-green-400' : 'bg-amber-300'}`
  }), "\uD83D\uDCF1 ", host.onlineCount, " \xB7 ", React.createElement("span", {
    className: "font-mono tracking-widest"
  }, host.room.code)), React.createElement(Toast, {
    toast: toast,
    onDismiss: () => setToast(null)
  }));
}
const JOIN_CODE = (location.hash.match(/[#&]join=([A-Za-z0-9]{4,8})/) || [])[1];
const IS_BIGSCREEN_WINDOW = /#bigscreen\b/.test(location.hash);
ReactDOM.createRoot(document.getElementById('root')).render(JOIN_CODE && typeof PlayerClient !== 'undefined' ? React.createElement(PlayerClient, {
  code: JOIN_CODE.toUpperCase()
}) : IS_BIGSCREEN_WINDOW && typeof BigScreenWindow !== 'undefined' ? React.createElement(BigScreenWindow, null) : React.createElement(App, null));
