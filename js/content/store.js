/* ============================================================
 *  Content store — persistence for user-created content.
 *
 *  Three object stores in one IndexedDB database:
 *    questions  the reusable Question Bank
 *    games      custom games; they reference questions BY ID, never copy them
 *    images     real Blobs (localStorage is far too small for photos)
 *
 *  This is a local store on the device — nothing is uploaded anywhere.
 *  Every call is async and returns plain objects, so swapping the backing
 *  store for a real API later only means rewriting this file: no UI change.
 * ============================================================ */

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
    if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(S_QUESTIONS)) {
        const s = db.createObjectStore(S_QUESTIONS, { keyPath: 'id' });
        s.createIndex('topic', 'topic');
        s.createIndex('difficulty', 'difficulty');
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(S_GAMES)) {
        const s = db.createObjectStore(S_GAMES, { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains(S_IMAGES)) db.createObjectStore(S_IMAGES, { keyPath: 'id' });
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
const getAll = (store) => tx(store, 'readonly', (s) => s.getAll());

/* ---------- models ---------- */
const BI = (en = '', vi = '') => ({ en, vi: vi || en });
const now = () => Date.now();

const createQuestion = (patch = {}) => ({
  id: `q_${uid()}`,
  type: 'mc',
  text: BI(),
  options: [{ text: BI(), imageId: null }, { text: BI(), imageId: null }],
  answer: 0,
  explanation: BI(),
  imageId: null,
  difficulty: 'easy',
  topic: 'general',
  tags: [],
  timeSec: null,        // null = dùng thời gian của game
  points: null,         // null = dùng điểm của game
  adult: false,
  createdAt: now(),
  updatedAt: now(),
  ...patch,
});

const createGame = (patch = {}) => ({
  id: `g_${uid()}`,
  title: BI(),
  description: BI(),
  icon: '🎓',
  accent: '#a78bfa',
  questionIds: [],
  config: {
    timerSec: 20,              // 0 = không giới hạn
    pointsBase: 100,
    speedBonus: 50,
    randomizeQuestions: true,
    randomizeAnswers: true,
    noRepeat: true,
    teams: 0,                  // 0 = cá nhân, hoặc 2 | 3 | 4
  },
  createdAt: now(),
  updatedAt: now(),
  ...patch,
});

/* ---------- images ---------- */
/* Downscale to ≤1280px and store the Blob. Returns the image id. */
const putImage = (file, errors) => new Promise((resolve, reject) => {
  if (!IMAGE_TYPES.test(file.type)) return reject(new Error(errors.type));
  if (file.size > IMAGE_MAX_BYTES) return reject(new Error(errors.size));
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const finish = (blob) => {
      const id = `img_${uid()}`;
      tx(S_IMAGES, 'readwrite', (s) => s.put({ id, blob, type: blob.type, createdAt: now() }))
        .then(() => resolve(id)).catch(reject);
    };
    if (scale === 1 && file.size < 400 * 1024) return finish(file);   // đủ nhỏ, giữ nguyên
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => (b ? finish(b) : reject(new Error(errors.type))), 'image/webp', 0.88);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(errors.type)); };
  img.src = url;
});

/* Object URLs are cached and reused so re-rendering does not leak memory */
const _imageUrls = new Map();
const imageUrl = async (id) => {
  if (!id) return null;
  if (_imageUrls.has(id)) return _imageUrls.get(id);
  const rec = await tx(S_IMAGES, 'readonly', (s) => s.get(id));
  if (!rec) return null;
  const url = URL.createObjectURL(rec.blob);
  _imageUrls.set(id, url);
  return url;
};
const deleteImage = async (id) => {
  if (!id) return;
  const url = _imageUrls.get(id);
  if (url) { URL.revokeObjectURL(url); _imageUrls.delete(id); }
  await tx(S_IMAGES, 'readwrite', (s) => s.delete(id));
};

/* ---------- public API ---------- */
const ContentStore = {
  ready: () => openDB().then(() => true).catch(() => false),

  /* questions */
  listQuestions: () => getAll(S_QUESTIONS),
  getQuestion: (id) => tx(S_QUESTIONS, 'readonly', (s) => s.get(id)),
  saveQuestion: async (q) => {
    const rec = { ...createQuestion(), ...q, updatedAt: now() };
    await tx(S_QUESTIONS, 'readwrite', (s) => s.put(rec));
    return rec;
  },
  /* Deleting a question also removes it from every game that references it */
  deleteQuestion: async (id) => {
    const q = await ContentStore.getQuestion(id);
    if (q) {
      await deleteImage(q.imageId);
      await Promise.all((q.options || []).map((o) => deleteImage(o.imageId)));
    }
    await tx(S_QUESTIONS, 'readwrite', (s) => s.delete(id));
    const games = await getAll(S_GAMES);
    await Promise.all(games.filter((g) => g.questionIds.includes(id)).map((g) =>
      tx(S_GAMES, 'readwrite', (s) => s.put({ ...g, questionIds: g.questionIds.filter((x) => x !== id), updatedAt: now() }))));
  },

  /* games */
  listGames: () => getAll(S_GAMES),
  getGame: (id) => tx(S_GAMES, 'readonly', (s) => s.get(id)),
  saveGame: async (g) => {
    const rec = { ...createGame(), ...g, config: { ...createGame().config, ...(g.config || {}) }, updatedAt: now() };
    await tx(S_GAMES, 'readwrite', (s) => s.put(rec));
    return rec;
  },
  /* A copy is a new game that points at the SAME question records */
  duplicateGame: async (id, titleSuffix) => {
    const g = await ContentStore.getGame(id);
    if (!g) return null;
    return ContentStore.saveGame({
      ...g, id: `g_${uid()}`, createdAt: now(),
      title: { en: `${g.title.en} ${titleSuffix}`.trim(), vi: `${g.title.vi} ${titleSuffix}`.trim() },
    });
  },
  deleteGame: (id) => tx(S_GAMES, 'readwrite', (s) => s.delete(id)),

  /* images */
  putImage, imageUrl, deleteImage,

  /* questions of a game, in the game's own order */
  questionsOf: async (game) => {
    const all = await getAll(S_QUESTIONS);
    const byId = new Map(all.map((q) => [q.id, q]));
    return game.questionIds.map((id) => byId.get(id)).filter(Boolean);
  },

  /* Seed the bank from a built-in theme so a teacher can start from real content */
  importFromTheme: async (themeId, limit) => {
    const th = quizTheme(themeId);
    if (!th) return 0;
    const picked = shuffleArr(th.questions).slice(0, limit);
    await Promise.all(picked.map((q) => ContentStore.saveQuestion({
      id: `q_${uid()}`,
      type: q.type,
      text: { ...q.question },
      options: q.options.map((o) => ({ text: { en: o.en, vi: o.vi }, imageId: null })),
      answer: q.answer,
      explanation: q.explanation ? { ...q.explanation } : BI(),
      imageId: null,
      difficulty: q.difficulty,
      topic: themeId,
      tags: q.tags,
      adult: q.audience === 'adult',
      source: `builtin:${themeId}`,
    })));
    return picked.length;
  },
};

/* Topics are data, not an enum: whatever the user has typed, plus the built-in themes */
const BUILTIN_TOPICS = ['general', 'animals', 'science', 'math', 'english', 'geography'];
const topicsOf = (questions) => {
  const set = new Set(BUILTIN_TOPICS);
  questions.forEach((q) => q.topic && set.add(q.topic));
  return [...set];
};
