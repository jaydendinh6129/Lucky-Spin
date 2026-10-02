/* ============================================================
 *  JParty Quiz — one game for every quiz theme.
 *  Content, question types, rule sets (party / classroom) and the
 *  no-repeat dealing all come from js/quiz/quizEngine.js; this file is
 *  only the game loop and the UI. Hot-seat: each question goes to the next player.
 * ============================================================ */

/* Question / option image with an emoji fallback (offline or blocked image host) */
function QuizMedia({ media, lang, size = 'lg' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [media && media.src]);
  if (!media) return null;
  const h = size === 'lg' ? 'h-32 sm:h-40' : 'h-14 sm:h-16';
  if (failed || !media.src) {
    return <div className={`${h} grid place-items-center ${size === 'lg' ? 'text-7xl' : 'text-4xl'}`} aria-label={L(media.alt, lang)}>{media.emoji || '🖼️'}</div>;
  }
  return (
    <img src={media.src} alt={L(media.alt, lang) || ''} onError={() => setFailed(true)} loading="eager" draggable="false"
      className={`${h} w-auto max-w-full mx-auto rounded-xl object-contain shadow-lg ring-1 ring-white/20 bg-white/5`} />
  );
}

/* Theme picker shown on the setup screen; switching opens the other theme (same as the sidebar) */
function QuizThemeCards({ t, lang, currentId, prefs, sub, onPick }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {QUIZ_THEMES.map((th) => {
        const active = th.id === currentId;
        const n = quizPool(th.id, prefs).length;
        const mix = difficultyMix(quizPool(th.id, { ...prefs, difficulty: 'all' }));
        const total = mix.easy + mix.medium + mix.hard || 1;
        const locked = !planAtLeast(sub.plan, th.plan);
        return (
          <button key={th.id} onClick={() => onPick(th)} aria-pressed={active}
            className={`relative text-left rounded-2xl p-3 border btn-press overflow-hidden ${active ? 'border-white/80 ring-2 ring-white/40' : 'border-white/15 hover:border-white/40'}`}
            style={{ background: `linear-gradient(145deg, ${th.accent}55, ${th.accent}14 70%)` }}>
            <div className="flex items-start justify-between gap-2">
              <span className="text-3xl leading-none" aria-hidden="true">{th.icon}</span>
              <span className="flex items-center gap-1">
                <PlanBadge plan={th.plan} locked={locked} t={t} />
                {active && <span className="w-5 h-5 rounded-full bg-white text-slate-900 grid place-items-center text-[11px] font-black">✓</span>}
              </span>
            </div>
            <div className="font-extrabold mt-2 leading-tight">{L(th.title, lang)}</div>
            <div className="text-[11px] text-white/75 mt-0.5 leading-snug line-clamp-2">{L(th.description, lang)}</div>
            <div className="flex items-center justify-between mt-2 gap-2">
              <span className="text-[11px] font-bold text-white/85">{t.questionsAvailable(n)}</span>
              <span className="flex h-1.5 w-14 rounded-full overflow-hidden bg-white/10" title={`${t.difficultyLabels.easy} ${mix.easy} · ${t.difficultyLabels.medium} ${mix.medium} · ${t.difficultyLabels.hard} ${mix.hard}`}>
                <span style={{ width: `${(mix.easy / total) * 100}%` }} className="bg-green-400" />
                <span style={{ width: `${(mix.medium / total) * 100}%` }} className="bg-yellow-300" />
                <span style={{ width: `${(mix.hard / total) * 100}%` }} className="bg-red-400" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function QuizGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, players: partyPlayers, setPlayers, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish, publish, sub, openItem } = ctx;
  const [minP, maxP] = item.players;
  const theme = quizTheme(item.quizTheme);
  const [prefs, setPrefsState] = useState(loadQuizPrefs);
  const setPrefs = (patch) => setPrefsState((p) => { const next = { ...p, ...patch }; saveQuizPrefs(next); return next; });
  const rs = QUIZ_RULESETS[prefs.ruleset] || QUIZ_RULESETS.party;
  const available = useMemo(() => (theme ? quizPool(theme.id, prefs).length : 0), [theme, prefs.ruleset, prefs.difficulty]);
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);
  const timer = useTimer();

  const rules = useMemo(() => ({
    countdown: (round) => (round === 1 ? 3 : 0),
    buildRound: (s) => {
      const p = s.players[(s.round - 1) % s.players.length];
      return { playerId: p.id, q: s.settings.deck[s.round - 1], phase: s.players.length > 1 ? 'handoff' : 'question', startedAt: 0 };
    },
    resolveRound: (s, { answer, ms }) => {
      const { playerId, q } = s.current;
      const r = s.settings.rules;
      const correct = answer === q.answer;
      const bonus = correct ? Math.round(r.speedBonus * clamp(1 - ms / r.time, 0, 1)) : 0;
      const points = correct ? r.points + bonus : 0;
      const players = correct ? Score.addPoints(Score.incrementStreak(s.players, playerId), playerId, points) : Score.resetStreak(s.players, playerId);
      const prev = s.settings.stats[playerId] || { correct: 0, answered: 0, fastest: null };
      const stats = { ...s.settings.stats, [playerId]: { correct: prev.correct + (correct ? 1 : 0), answered: prev.answered + 1, fastest: correct ? Math.min(prev.fastest ?? Infinity, ms) : prev.fastest } };
      return { players, result: { playerId, correct, points, bonus, answer, ms }, settings: { ...s.settings, stats } };
    },
    checkEnd: (s) => (s.round >= s.settings.count ? Score.leaders(s.players) : null),
  }), []);

  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const count = Math.min(prefs.count, available);
  const canStart = !!theme && chosen.length >= minP && chosen.length <= maxP && count > 0;
  const start = () => {
    if (!canStart) return;
    sfx('click');
    const deck = dealQuiz(theme.id, prefs, count);
    rememberQuiz(theme.id, deck.map((q) => q.id));
    engine.startGame(chosen, { count: deck.length, deck, rules: rs, stats: {} });
  };

  /* the timer runs while a question is on screen */
  const cur = state.current;
  const showing = state.status === 'challenge' && cur && cur.phase === 'question';
  const time = (state.settings.rules || rs).time;
  useEffect(() => {
    if (!showing) { timer.stop(); return; }
    timer.start(time, () => { sfx('land'); engine.resolveRound({ answer: null, ms: time }); });
    return () => timer.stop();
  }, [showing, state.round]);
  const answer = (i) => {
    if (!showing) return;
    const ms = Math.min(time, performance.now() - cur.startedAt);
    timer.stop();
    engine.resolveRound({ answer: i, ms });
  };
  useEffect(() => {
    if (state.status !== 'result') return;
    sfx(state.lastResult.correct ? 'win' : 'land');
  }, [state.status]);

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  const statsOf = (id) => state.settings.stats[id] || { correct: 0, answered: 0, fastest: null };
  useRecordOnFinish(state.status, () => {
    const w = winners[0];
    return gameResultEntry(mode.id, item.id, ps, winners, w ? `${w.name} · ${w.score} ${t.points} · ${statsOf(w.id).correct}/${statsOf(w.id).answered}` : '');
  }, onFinish);

  useEffect(() => {
    if (!publish) return;
    publish({
      icon: item.icon, title: meta.title, status: state.status, round: state.round, total: state.settings.count,
      participants: cur ? [byId(cur.playerId)].filter(Boolean) : [],
      challenge: showing ? L(cur.q.question, lang) : null, image: showing && cur.q.media ? cur.q.media.src : null,
      timerMs: showing ? timer.ms : null, scores: ps, winner: winners,
    });
  }, [state.status, state.round, cur, state.players, Math.ceil(timer.ms / 1000)]);
  useEffect(() => () => publish && publish(null), []);

  const accentBtn = { background: `linear-gradient(90deg, ${theme ? theme.accent : mode.accent}, #a78bfa)` };
  const optionLabel = (o) => L(o, lang);

  let body;
  if (!theme) {
    body = <div className="text-center text-white/70 py-10">{t.noQuestions}</div>;
  } else if (state.status === 'setup') {
    body = (
      <div className="space-y-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.quizTitle}</div>
          <h3 className="text-lg font-black mt-0.5">{t.chooseTheme}</h3>
        </div>
        <QuizThemeCards t={t} lang={lang} currentId={theme.id} prefs={prefs} sub={sub}
          onPick={(th) => { if (th.id !== theme.id) { sfx('click'); openItem('quiz', `quiz-${th.id}`); } }} />
        <div className="space-y-3 border-t border-white/10 pt-4">
          <OptionPills label={t.quizMode} value={prefs.ruleset} onChange={(v) => setPrefs({ ruleset: v })}
            options={Object.values(QUIZ_RULESETS).map((r) => ({ value: r.id, label: `${r.icon} ${t.rulesets[r.id].name}` }))} />
          <div className="text-[11px] text-white/55 -mt-1">{t.rulesets[prefs.ruleset].desc}</div>
          <OptionPills label={t.difficulty} value={prefs.difficulty} onChange={(v) => setPrefs({ difficulty: v })}
            options={['all', ...DIFFICULTIES].map((d) => ({ value: d, label: d === 'all' ? t.allLevels : t.difficultyLabels[d] }))} />
          <OptionPills label={t.questions} value={prefs.count} onChange={(v) => setPrefs({ count: v })}
            options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))} />
          {available < prefs.count && <div className="text-[11px] text-amber-200 text-right">{t.onlyAvailable(available)}</div>}
        </div>
        <PlayerSetup t={t} players={partyPlayers} onChange={setPlayers} min={minP} max={maxP} selected={selected} onSelected={setSelected} sfx={sfx} />
        <button onClick={start} disabled={!canStart} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white" style={accentBtn}>{theme.icon} {t.startGame}</button>
        {!canStart && <div className="text-center text-xs text-white/55">{count === 0 ? t.noQuestions : t.needPlayers(minP)}</div>}
      </div>
    );
  } else if (state.status === 'countdown') {
    body = <Countdown seconds={3} onDone={engine.countdownDone} play={sfx} label={byId(cur.playerId).name} />;
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const q = cur.q;
    if (cur.phase === 'handoff') {
      body = (
        <div className="text-center space-y-5 py-4">
          <Avatar player={p} size={80} />
          <div className="text-2xl font-black">{t.passTo(p.name)}</div>
          <button onClick={() => { sfx('click'); engine.patchCurrent({ phase: 'question', startedAt: performance.now() }); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={accentBtn}>👋 {t.yourTurn(p.name)}</button>
        </div>
      );
    } else {
      const imageOptions = q.options.some((o) => o.media);
      body = (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <PlayerChip player={p} label={p.streak > 1 ? `🔥${p.streak}` : ''} />
            <TimerRing ms={timer.ms} total={time} size={72} color={theme.accent} />
          </div>
          <div className="rounded-3xl p-5 bg-black/25 border border-white/15 slide-up text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/55">
              <span>{t.question} {state.round}/{state.settings.count}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] tracking-wider ${q.difficulty === 'easy' ? 'bg-green-400/25 text-green-200' : q.difficulty === 'hard' ? 'bg-red-400/25 text-red-200' : 'bg-yellow-300/25 text-yellow-100'}`}>{t.difficultyLabels[q.difficulty]}</span>
            </div>
            {q.media && <div className="mt-3"><QuizMedia media={q.media} lang={lang} /></div>}
            <p className="text-xl sm:text-2xl font-black mt-3 leading-snug">{L(q.question, lang)}</p>
          </div>
          {q.type === 'tf' ? (
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((o, i) => (
                <button key={i} onClick={() => answer(i)} className={`min-h-[88px] rounded-3xl text-2xl font-black btn-press border-2 ${i === 0 ? 'bg-green-500/20 border-green-300/60 hover:bg-green-500/30' : 'bg-red-500/20 border-red-300/60 hover:bg-red-500/30'}`}>
                  {i === 0 ? '✓' : '✗'} {optionLabel(o)}
                </button>
              ))}
            </div>
          ) : imageOptions ? (
            <div className="grid grid-cols-2 gap-3">
              {q.options.map((o, i) => (
                <button key={i} onClick={() => answer(i)} aria-label={`${'ABCD'[i]}`} className="rounded-2xl p-3 bg-white/10 hover:bg-white/20 border border-white/15 btn-press flex flex-col items-center gap-2">
                  <QuizMedia media={o.media} lang={lang} size="sm" />
                  <span className="w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black">{'ABCD'[i]}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options.map((o, i) => (
                <button key={i} onClick={() => answer(i)} className="min-h-[60px] text-left rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press flex items-center gap-3 text-base sm:text-lg">
                  <span className="w-8 h-8 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0">{'ABCD'[i]}</span><span>{optionLabel(o)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const p = byId(r.playerId);
    const q = cur.q;
    const over = !!engine.pendingWinner;
    const imageOptions = q.options.some((o) => o.media);
    const cls = (i) => (i === q.answer ? 'bg-green-500/25 border-green-300/60' : i === r.answer ? 'bg-red-500/25 border-red-300/60' : 'bg-black/20 border-white/10 opacity-60');
    body = (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-5xl" aria-hidden="true">{r.correct ? '✅' : r.answer == null ? '⏰' : '❌'}</div>
          <div className="text-2xl font-black mt-2 score-pop">{r.correct ? t.correct : r.answer == null ? t.timeUp : t.wrong}</div>
          {r.correct && <div className="text-sm font-bold text-green-300 mt-1">+{r.points} {t.points}{r.bonus ? ` · +${r.bonus} ${t.speedBonus}` : ''} · {fmtSeconds(r.ms)}</div>}
          {p.streak > 1 && <div className="text-sm font-bold text-orange-300">🔥 {p.streak} {t.streakLabel}</div>}
        </div>
        {q.media && <QuizMedia media={q.media} lang={lang} size="sm" />}
        <div className={`grid gap-2 ${imageOptions || q.type === 'tf' ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
          {q.options.map((o, i) => (
            <div key={i} className={`rounded-2xl px-4 py-3 border font-bold flex items-center gap-3 ${imageOptions ? 'flex-col text-center' : ''} ${cls(i)}`}>
              {o.media && <QuizMedia media={o.media} lang={lang} size="sm" />}
              {!imageOptions && q.type !== 'tf' && <span className="w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0">{'ABCD'[i]}</span>}
              <span>{optionLabel(o)}</span>{i === q.answer && <span className={imageOptions ? '' : 'ml-auto'}>✓</span>}
            </div>
          ))}
        </div>
        {q.explanation && <div className="text-sm text-white/80 text-center rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5">💡 {L(q.explanation, lang)}</div>}
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.playerId]} metricLabel={t.pts} compact /></div>
        <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={accentBtn}>{over ? `🏁 ${t.finish}` : `▶ ${t.next}`}</button>
      </div>
    );
  } else {
    const w = winners[0];
    const st = w ? statsOf(w.id) : null;
    body = (
      <GameResult t={t} title={t.quizComplete} winners={winners} players={ps} metricLabel={t.pts}
        stats={w ? [`🏆 ${w.score} ${t.points}`, `✅ ${st.correct} / ${st.answered}`, `🔥 ${w.bestStreak} ${t.streakLabel}`, st.fastest != null ? `⚡ ${fmtSeconds(st.fastest)}` : null].filter(Boolean) : []}
        onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />
    );
  }

  return (
    <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.count} status={state.status} onExit={onExit}>
      {body}
    </GameShell>
  );
}
