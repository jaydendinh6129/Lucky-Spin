/* ============================================================
 *  JParty Quiz engine — theme registry, question model, generators,
 *  rule sets and fair question selection.
 *
 *  Content lives in data packs (js/data/quiz/*.js, plain JS loaded before
 *  this file). A pack registers itself with:
 *
 *    (window.JPARTY_QUIZ_PACKS = window.JPARTY_QUIZ_PACKS || []).push({
 *      id, order, icon, accent, plan, difficulty,
 *      title: { en, vi }, description: { en, vi },
 *      questions: [ { type, difficulty, question_en, question_vi, options_en, options_vi,
 *                     answer, explanation_en, explanation_vi, tags, adult, media, options_media } ],
 *      tables: { anyName: [...] },                 // optional reference data
 *      generate: [{ use: 'flags', from: 'anyName' }] // optional generators that turn tables into questions
 *    })
 *
 *  This file never mentions a specific theme: adding a theme = add a pack + its <script> tag.
 * ============================================================ */

const L = (obj, lang) => (obj ? obj[lang] || obj.en || '' : '');

/* ---------- question types ---------- */
const QUESTION_TYPES = {
  mc:            { supported: true,  label: { en: 'Multiple choice', vi: 'Trắc nghiệm' } },
  tf:            { supported: true,  label: { en: 'True / False', vi: 'Đúng / Sai' } },
  /* extension points — data may already use these names; the UI skips them until implemented */
  guess_country: { supported: false, label: { en: 'Guess the country', vi: 'Đoán quốc gia' } },
  match:         { supported: false, label: { en: 'Match the pair', vi: 'Ghép cặp' } },
  fill_blank:    { supported: false, label: { en: 'Fill in the blank', vi: 'Điền vào chỗ trống' } },
  speed:         { supported: false, label: { en: 'Speed question', vi: 'Câu hỏi tốc độ' } },
  audio:         { supported: false, label: { en: 'Audio quiz', vi: 'Đố âm thanh' } },
  emoji:         { supported: false, label: { en: 'Emoji quiz', vi: 'Đố emoji' } },
};
/* Images are not a separate type: any mc/tf question may carry `media` (question image)
 * and mc questions may carry `options_media` (one image per option). */

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const TF_OPTIONS = [{ en: 'True', vi: 'Đúng' }, { en: 'False', vi: 'Sai' }];

/* ---------- rule sets: one engine, configurable rules ---------- */
const QUIZ_RULESETS = {
  party:     { id: 'party', icon: '🎉', time: 15000, points: 100, speedBonus: 50, includeAdult: true, explanation: 'when-present' },
  classroom: { id: 'classroom', icon: '🏫', time: 25000, points: 100, speedBonus: 0, includeAdult: false, explanation: 'when-present' },
};

/* ---------- normalisation ---------- */
const normalizeQuestion = (raw, themeId, index) => {
  const type = raw.type || 'mc';
  if (!QUESTION_TYPES[type] || !QUESTION_TYPES[type].supported) return null;
  let options;
  if (type === 'tf') {
    options = TF_OPTIONS.map((o) => ({ ...o }));
  } else {
    const en = raw.options_en || [];
    const vi = raw.options_vi || en;
    options = en.map((text, k) => ({ en: text, vi: vi[k] || text, media: raw.options_media ? raw.options_media[k] || null : null }));
  }
  const answer = Number(raw.answer);
  if (!raw.question_en || options.length < 2 || !(answer >= 0 && answer < options.length)) return null;
  return {
    id: raw.id || `${themeId}-${index}`,
    theme: themeId,
    type,
    /* per-question overrides (custom games); null = dùng cấu hình của game */
    timeMs: raw.timeMs == null ? null : raw.timeMs,
    points: raw.points == null ? null : raw.points,
    difficulty: DIFFICULTIES.includes(raw.difficulty) ? raw.difficulty : 'medium',
    audience: raw.adult ? 'adult' : 'all',
    tags: raw.tags || [],
    question: { en: raw.question_en, vi: raw.question_vi || raw.question_en },
    options,
    answer,
    explanation: raw.explanation_en ? { en: raw.explanation_en, vi: raw.explanation_vi || raw.explanation_en } : null,
    media: raw.media || null,
  };
};

/* ---------- generators: reference tables → questions ---------- */
/* small deterministic PRNG so generated distractors are stable between loads */
const seededRandom = (seed) => {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
};
const seededShuffle = (arr, seed) => {
  const r = seededRandom(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
/* place the correct option among the distractors at a seeded position */
const withCorrect = (correct, distractors, seed) => {
  const pos = Math.floor(seededRandom(seed + ':pos')() * (distractors.length + 1));
  const opts = [...distractors];
  opts.splice(pos, 0, correct);
  return { opts, answer: pos };
};

const flagImage = (code) => `https://flagcdn.com/w320/${code}.png`;
const flagEmoji = (code) => String.fromCodePoint(...code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));

const QUIZ_GENERATORS = {
  /* rows: { code, name_en, name_vi, continent, feature_en, feature_vi, lookalikes[], difficulty } */
  flags: (rows, themeId) => {
    const out = [];
    const byCode = Object.fromEntries(rows.map((c) => [c.code, c]));
    const distractorsFor = (c, seed) => {
      /* look-alike flags are never offered: two near-identical flags would make two answers defensible */
      const banned = new Set([c.code, ...(c.lookalikes || [])]);
      rows.forEach((o) => { if ((o.lookalikes || []).includes(c.code)) banned.add(o.code); });
      const same = seededShuffle(rows.filter((o) => !banned.has(o.code) && o.continent === c.continent), seed);
      const other = seededShuffle(rows.filter((o) => !banned.has(o.code) && o.continent !== c.continent), seed + 'x');
      return [...same, ...other].slice(0, 3);
    };
    rows.forEach((c) => {
      if (!c.code || !c.name_en) return;
      const media = { type: 'image', src: flagImage(c.code), emoji: flagEmoji(c.code), alt: { en: 'A national flag', vi: 'Một lá quốc kỳ' } };
      /* 1. flag → country */
      {
        const d = distractorsFor(c, c.code + 'a');
        const { opts, answer } = withCorrect(c, d, c.code + 'a');
        out.push({ id: `${themeId}-img-${c.code}`, type: 'mc', difficulty: c.difficulty, tags: ['flag', c.continent.toLowerCase()],
          question_en: 'Which country does this flag belong to?', question_vi: 'Lá cờ này là quốc kỳ của nước nào?',
          options_en: opts.map((o) => o.name_en), options_vi: opts.map((o) => o.name_vi), answer, media,
          explanation_en: `${c.name_en}: ${c.feature_en}.`, explanation_vi: `${c.name_vi}: ${c.feature_vi}.` });
      }
      /* 2. country → flag (image options) */
      {
        const d = distractorsFor(c, c.code + 'b');
        const { opts, answer } = withCorrect(c, d, c.code + 'b');
        out.push({ id: `${themeId}-pick-${c.code}`, type: 'mc', difficulty: c.difficulty, tags: ['flag', c.continent.toLowerCase()],
          question_en: `Which of these is the flag of ${c.name_en}?`, question_vi: `Đâu là quốc kỳ của ${c.name_vi}?`,
          options_en: opts.map((o) => o.name_en), options_vi: opts.map((o) => o.name_vi), answer,
          options_media: opts.map((o) => ({ type: 'image', src: flagImage(o.code), emoji: flagEmoji(o.code), hideLabel: true })),
          explanation_en: `${c.name_en}: ${c.feature_en}.`, explanation_vi: `${c.name_vi}: ${c.feature_vi}.` });
      }
      /* 3. design description → country (text only) */
      if (c.feature_en && c.feature_vi) {
        const d = distractorsFor(c, c.code + 'c');
        const { opts, answer } = withCorrect(c, d, c.code + 'c');
        out.push({ id: `${themeId}-desc-${c.code}`, type: 'mc', difficulty: c.difficulty === 'easy' ? 'medium' : c.difficulty, tags: ['flag', 'design'],
          question_en: `Whose flag shows ${c.feature_en}?`, question_vi: `Quốc kỳ nước nào có ${c.feature_vi}?`,
          options_en: opts.map((o) => o.name_en), options_vi: opts.map((o) => o.name_vi), answer,
          explanation_en: `This is the flag of ${c.name_en}.`, explanation_vi: `Đây là quốc kỳ của ${c.name_vi}.` });
      }
    });
    void byCode;
    return out;
  },

  /* rows: { animal_en, animal_vi, emoji, place_en, place_vi, region, official, status_en, status_vi, difficulty } */
  associations: (rows, themeId) => {
    const out = [];
    const animalsOfPlace = {};
    const placesOfAnimal = {};
    rows.forEach((r) => {
      (animalsOfPlace[r.place_en] = animalsOfPlace[r.place_en] || new Set()).add(r.animal_en);
      (placesOfAnimal[r.animal_en] = placesOfAnimal[r.animal_en] || new Set()).add(r.place_en);
    });
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const uniqBy = (arr, key) => { const seen = new Set(); return arr.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true))); };
    const why = (r) => ({
      explanation_en: `The ${r.animal_en} — ${r.status_en} (${r.place_en}).`,
      explanation_vi: `${r.animal_vi} — ${r.status_vi} (${r.place_vi}).`,
    });
    /* animal → place: distractor places come from other regions and never share this animal */
    rows.forEach((r) => {
      const seed = 'ap' + r.animal_en + r.place_en;
      const pool = uniqBy(seededShuffle(rows.filter((o) => o.region !== r.region && !placesOfAnimal[r.animal_en].has(o.place_en)), seed), (o) => o.place_en).slice(0, 3);
      if (pool.length < 3) return;
      const { opts, answer } = withCorrect(r, pool, seed);
      out.push({ id: `${themeId}-ap-${slug(r.animal_en)}-${slug(r.place_en)}`, type: 'mc', difficulty: r.difficulty, tags: ['animal', 'country', r.region.toLowerCase()],
        question_en: `${r.emoji} The ${r.animal_en} is commonly associated with which place?`,
        question_vi: `${r.emoji} ${r.animal_vi} thường gắn liền với nơi nào?`,
        options_en: opts.map((o) => o.place_en), options_vi: opts.map((o) => o.place_vi), answer, ...why(r) });
    });
    /* place → animal: once per place; distractor animals come from other regions and are not linked to the place */
    uniqBy(rows, (r) => r.place_en).forEach((r) => {
      const seed = 'pa' + r.place_en;
      const pool = uniqBy(seededShuffle(rows.filter((o) => o.region !== r.region && !animalsOfPlace[r.place_en].has(o.animal_en)), seed), (o) => o.animal_en).slice(0, 3);
      if (pool.length < 3) return;
      const { opts, answer } = withCorrect(r, pool, seed);
      out.push({ id: `${themeId}-pa-${slug(r.place_en)}`, type: 'mc', difficulty: r.difficulty, tags: ['animal', 'country', r.region.toLowerCase()],
        question_en: `Which animal is commonly associated with ${r.place_en}?`,
        question_vi: `Loài vật nào thường gắn liền với ${r.place_vi}?`,
        options_en: opts.map((o) => `${o.emoji} ${o.animal_en}`), options_vi: opts.map((o) => `${o.emoji} ${o.animal_vi}`), answer, ...why(r) });
    });
    return out;
  },
};

/* ---------- registry ---------- */
const buildThemesFromPacks = () => {
  const packs = (typeof window !== 'undefined' && window.JPARTY_QUIZ_PACKS) || [];
  return packs
    .filter((p) => p && p.id && p.title)
    .map((p) => {
      const raw = [...(p.questions || [])];
      (p.generate || []).forEach((g) => {
        const fn = QUIZ_GENERATORS[g.use];
        const table = p.tables && p.tables[g.from];
        if (fn && Array.isArray(table)) raw.push(...fn(table, p.id));
      });
      const seen = new Set();
      const questions = raw
        .map((q, i) => normalizeQuestion(q, p.id, i))
        .filter((q) => q && !seen.has(q.id) && (seen.add(q.id), true));
      return { id: p.id, order: p.order ?? 100, icon: p.icon || '🧠', accent: p.accent || '#60a5fa', plan: p.plan || 'free', difficulty: p.difficulty || 'medium', title: p.title, description: p.description || { en: '', vi: '' }, questions };
    })
    .sort((a, b) => a.order - b.order);
};

/* Built-in themes are fixed at load; custom games are merged in when the
 * content store has loaded (and again after every edit). QUIZ_THEMES is the
 * single list everything else reads, so it is mutated in place rather than
 * reassigned — other modules hold a reference to it. */
const BUILTIN_QUIZ_THEMES = buildThemesFromPacks();
const QUIZ_THEMES = [...BUILTIN_QUIZ_THEMES];
const registerCustomQuizThemes = (customThemes) => {
  QUIZ_THEMES.length = 0;
  QUIZ_THEMES.push(...BUILTIN_QUIZ_THEMES, ...customThemes);
  return QUIZ_THEMES;
};
const quizTheme = (id) => QUIZ_THEMES.find((th) => th.id === id) || null;

/* questions of a theme that match the rule set and difficulty filter */
const rulesetFor = (themeId, rulesetId) => {
  const th = quizTheme(themeId);
  if (th && th.ruleset && rulesetId === 'custom') return th.ruleset;
  return QUIZ_RULESETS[rulesetId] || QUIZ_RULESETS.party;
};
const quizPool = (themeId, { ruleset = 'party', difficulty = 'all' } = {}) => {
  const th = quizTheme(themeId);
  if (!th) return [];
  const rs = rulesetFor(themeId, ruleset);
  return th.questions.filter((q) => (rs.includeAdult || q.audience !== 'adult') && (difficulty === 'all' || q.difficulty === difficulty));
};
const difficultyMix = (questions) => {
  const c = { easy: 0, medium: 0, hard: 0 };
  questions.forEach((q) => { c[q.difficulty] += 1; });
  return c;
};

/* ---------- fair selection: no repeats in a game, recently-seen questions last ---------- */
const QUIZ_RECENT_KEY = 'jparty_quiz_recent';
const QUIZ_PREFS_KEY = 'jparty_quiz_prefs';
const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } };
const writeJSON = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} };
const loadQuizPrefs = () => ({ ruleset: 'party', difficulty: 'all', count: 10, ...readJSON(QUIZ_PREFS_KEY, {}) });
const saveQuizPrefs = (prefs) => writeJSON(QUIZ_PREFS_KEY, prefs);

/* shuffle answer positions at deal time (true/false keeps its order) */
const NO_SHUFFLE = /all of the above|none of the above|both|tất cả|không có đáp án/i;
const shuffleOptions = (q) => {
  if (q.type !== 'mc' || q.options.some((o) => NO_SHUFFLE.test(o.en))) return q;
  const order = shuffleArr(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
};

/* avoid two consecutive questions from the same first tag (keeps Mix unpredictable) */
const spreadTags = (list) => {
  const out = [];
  const rest = [...list];
  while (rest.length) {
    const prevTag = out.length ? out[out.length - 1].tags[0] : null;
    const k = rest.findIndex((q) => !prevTag || q.tags[0] !== prevTag);
    out.push(rest.splice(k < 0 ? 0 : k, 1)[0]);
  }
  return out;
};

const dealQuiz = (themeId, opts, count) => {
  const pool = quizPool(themeId, opts);
  const th = quizTheme(themeId);
  const cfg = (th && th.config) || null;
  /* A custom game may ask for its questions in the authored order, and may
   * turn off answer shuffling or the recently-played memory. */
  if (cfg && cfg.randomizeQuestions === false) {
    const picked = pool.slice(0, count);
    return cfg.randomizeAnswers === false ? picked : picked.map(shuffleOptions);
  }
  const recent = cfg && cfg.noRepeat === false ? [] : readJSON(QUIZ_RECENT_KEY, {})[themeId] || [];
  const recentRank = new Map(recent.map((id, i) => [id, i])); // lower index = seen longer ago
  const fresh = shuffleArr(pool.filter((q) => !recentRank.has(q.id)));
  const stale = pool.filter((q) => recentRank.has(q.id)).sort((a, b) => recentRank.get(a.id) - recentRank.get(b.id));
  const dealt = spreadTags([...fresh, ...stale].slice(0, count));
  return cfg && cfg.randomizeAnswers === false ? dealt : dealt.map(shuffleOptions);
};

/* remember what was just played; memory size scales with the pool so small pools still rotate */
const rememberQuiz = (themeId, ids) => {
  const all = readJSON(QUIZ_RECENT_KEY, {});
  const th = quizTheme(themeId);
  const keep = Math.max(10, Math.min(300, Math.floor((th ? th.questions.length : 50) * 0.6)));
  const list = [...(all[themeId] || []).filter((id) => !ids.includes(id)), ...ids].slice(-keep);
  writeJSON(QUIZ_RECENT_KEY, { ...all, [themeId]: list });
};
