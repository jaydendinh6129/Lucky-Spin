/* ============================================================
 *  Custom games → quiz engine bridge.
 *
 *  A user-created game is turned into exactly the same shape a built-in
 *  quiz theme has, so it plays through the SAME QuizGame component, the
 *  same state machine and the same result screen. There is one game
 *  engine in JParty, not a party one and a classroom one.
 *
 *  Built-in packs register at load time; custom games arrive async from
 *  IndexedDB, so they are merged in afterwards and the registry is
 *  re-synced (see syncCustomGames in js/data/registry.js).
 * ============================================================ */

/* Game config → quiz ruleset. Per-question overrides win over these. */
const customRuleset = (game) => ({
  id: `custom:${game.id}`,
  icon: game.icon || '🎓',
  time: (game.config.timerSec || 0) * 1000,   // 0 = không giới hạn
  points: game.config.pointsBase,
  speedBonus: game.config.speedBonus,
  includeAdult: true,
  explanation: 'when-present',
});

/* One stored question (bank shape) → one engine question (raw pack shape) */
const customQuestionToPack = async (q) => {
  const imageUrl = await ContentStore.imageUrl(q.imageId);
  const optionMedia = await Promise.all((q.options || []).map((o) => ContentStore.imageUrl(o.imageId)));
  const hasOptionMedia = optionMedia.some(Boolean);
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    question_en: q.text.en,
    question_vi: q.text.vi || q.text.en,
    options_en: (q.options || []).map((o) => o.text.en),
    options_vi: (q.options || []).map((o) => o.text.vi || o.text.en),
    answer: q.answer,
    explanation_en: q.explanation && q.explanation.en ? q.explanation.en : undefined,
    explanation_vi: q.explanation && q.explanation.vi ? q.explanation.vi : undefined,
    tags: q.tags && q.tags.length ? q.tags : [q.topic || 'custom'],
    adult: !!q.adult,
    media: imageUrl ? { type: 'image', src: imageUrl, alt: { en: '', vi: '' } } : null,
    options_media: hasOptionMedia ? optionMedia.map((src) => (src ? { type: 'image', src } : null)) : null,
    /* per-question overrides — read by the quiz game, ignored by built-in themes */
    timeMs: q.timeSec == null ? null : q.timeSec * 1000,
    points: q.points == null ? null : q.points,
  };
};

/* Build the theme objects for every custom game and hand them to the engine */
const buildCustomThemes = async (games) => {
  const all = await ContentStore.listQuestions();
  const byId = new Map(all.map((q) => [q.id, q]));
  const themes = [];
  for (const g of games) {
    const picked = g.questionIds.map((id) => byId.get(id)).filter(Boolean);
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
      title: { en: g.title.en || 'Untitled', vi: g.title.vi || g.title.en || 'Chưa đặt tên' },
      description: { en: g.description.en || '', vi: g.description.vi || g.description.en || '' },
      config: g.config,
      ruleset: customRuleset(g),
      questions: packed.map((q, i) => normalizeQuestion(q, `custom:${g.id}`, i)).filter(Boolean),
    });
  }
  return themes;
};

/* Media for custom questions is an object URL that dies on reload, so the
 * themes are rebuilt from the store whenever the content changes. */
const refreshCustomContent = async () => {
  const games = await ContentStore.listGames();
  const themes = await buildCustomThemes(games);
  registerCustomQuizThemes(themes);
  syncCustomGames(themes);
  return { games, themes };
};
