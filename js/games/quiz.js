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
function QuizThemeCards({ t, lang, currentId, prefs, sub, onPick, custom = false }) {
  const list = QUIZ_THEMES.filter((th) => !!th.custom === custom);
  if (!list.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {list.map((th) => {
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
  const { t, lang, mode, item, meta, modeTitle, players: partyPlayers, setPlayers, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish, publish, sub, openItem, host, quizPrefs, setQuizPrefs } = ctx;
  const custom = item.customGameId ? quizTheme(item.quizTheme) : null;
  const [minP, maxP] = item.players;
  const theme = quizTheme(item.quizTheme);
  /* Built-in themes share the app-wide prefs (also editable from Settings);
   * a custom game carries its own rules, so it keeps them local. */
  const [customPrefs, setCustomPrefs] = useState(() => ({ ...quizPrefs, ruleset: 'custom', difficulty: 'all' }));
  const prefs = custom ? customPrefs : quizPrefs;
  const setPrefs = (patch) => (custom ? setCustomPrefs((p) => ({ ...p, ...patch })) : setQuizPrefs(patch));
  const rs = rulesetFor(item.quizTheme, prefs.ruleset);
  /* 0 = cá nhân; 2|3|4 = chia đội. Custom game mặc định theo cấu hình của nó. */
  const [teamCount, setTeamCount] = useState(() => (custom && custom.config ? custom.config.teams : 0));
  const [teams, setTeams] = useState({});
  /* Live classroom: phones are connected, so everyone answers the same question
   * on their own device instead of passing one phone around. */
  const liveIds = (host && host.livePlayerIds) || [];
  const liveOn = !!(host && host.room) && liveIds.length > 0;
  const available = useMemo(() => (theme ? quizPool(theme.id, prefs).length : 0), [theme, prefs.ruleset, prefs.difficulty]);
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);
  const timer = useTimer();

  const rules = useMemo(() => ({
    countdown: (round) => (round === 1 ? 3 : 0),
    buildRound: (s) => {
      const q = s.settings.deck[s.round - 1];
      /* Live: nobody holds the phone, so the question goes straight up on the screen. */
      if (s.settings.live) return { playerId: null, q, phase: 'question', startedAt: 0, live: true };
      const p = s.players[(s.round - 1) % s.players.length];
      return { playerId: p.id, q, phase: s.players.length > 1 ? 'handoff' : 'question', startedAt: 0 };
    },
    resolveRound: (s, outcome) => {
      const { playerId, q } = s.current;
      const r = s.settings.rules;
      if (s.current.live) {
        /* outcome.answers: { [playerId]: { index, ms } } — chấm cho mọi học sinh đã trả lời */
        const given = outcome.answers || {};
        const qTime = q.timeMs != null ? q.timeMs : r.time;
        const base = q.points != null ? q.points : r.points;
        let players = s.players;
        const stats = { ...s.settings.stats };
        const perPlayer = {};
        s.players.forEach((p) => {
          const a = given[p.id];
          if (!a) { players = Score.resetStreak(players, p.id); perPlayer[p.id] = { answered: false, correct: false, points: 0 }; return; }
          const correct = a.index === q.answer;
          const bonus = correct && qTime > 0 && r.speedBonus ? Math.round(r.speedBonus * clamp(1 - a.ms / qTime, 0, 1)) : 0;
          const points = correct ? base + bonus : 0;
          players = correct ? Score.addPoints(Score.incrementStreak(players, p.id), p.id, points) : Score.resetStreak(players, p.id);
          const prev = stats[p.id] || { correct: 0, answered: 0, fastest: null };
          stats[p.id] = { correct: prev.correct + (correct ? 1 : 0), answered: prev.answered + 1, fastest: correct ? Math.min(prev.fastest ?? Infinity, a.ms) : prev.fastest };
          perPlayer[p.id] = { answered: true, correct, points, index: a.index, ms: a.ms };
        });
        return { players, result: { live: true, perPlayer, answeredCount: Object.keys(given).length }, settings: { ...s.settings, stats } };
      }
      const { answer, ms } = outcome;
      const correct = answer === q.answer;
      const qTime = q.timeMs != null ? q.timeMs : r.time;
      const base = q.points != null ? q.points : r.points;
      const bonus = correct && qTime > 0 ? Math.round(r.speedBonus * clamp(1 - ms / qTime, 0, 1)) : 0;
      const points = correct ? base + bonus : 0;
      const players = correct ? Score.addPoints(Score.incrementStreak(s.players, playerId), playerId, points) : Score.resetStreak(s.players, playerId);
      const prev = s.settings.stats[playerId] || { correct: 0, answered: 0, fastest: null };
      const stats = { ...s.settings.stats, [playerId]: { correct: prev.correct + (correct ? 1 : 0), answered: prev.answered + 1, fastest: correct ? Math.min(prev.fastest ?? Infinity, ms) : prev.fastest } };
      return { players, result: { playerId, correct, points, bonus, answer, ms }, settings: { ...s.settings, stats } };
    },
    checkEnd: (s) => (s.round >= s.settings.count ? Score.leaders(s.players) : null),
  }), []);

  /* Điểm đội = tổng điểm thành viên. Dùng chung Score engine, không có hệ điểm thứ hai. */
  const teamScores = (players, settings) => {
    const n = settings.teamCount || 0;
    if (!n) return [];
    return Array.from({ length: n }, (_, i) => {
      const members = players.filter((p) => settings.teams[p.id] === i);
      return { index: i, name: TEAM_NAMES[i], color: TEAM_COLORS[i], members, score: members.reduce((a, p) => a + p.score, 0) };
    }).sort((a, b) => b.score - a.score);
  };

  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const livePlayers = chosen.filter((p) => liveIds.includes(p.id));
  const live = liveOn && livePlayers.length > 0;
  useEffect(() => { if (liveOn) setSelected((sel) => Array.from(new Set([...sel, ...liveIds]))); }, [liveOn, liveIds.join()]);
  const count = custom ? available : Math.min(prefs.count, available);
  const teamsOk = teamCount === 0 || chosen.length >= teamCount;
  const canStart = !!theme && chosen.length >= minP && chosen.length <= maxP && count > 0 && teamsOk;
  /* Mọi người chơi phải thuộc một đội trước khi bắt đầu */
  const fullTeams = () => {
    if (!teamCount) return {};
    const next = { ...teams };
    const ids = chosen.map((p) => p.id);
    /* `== null` chứ không phải `!next[id]`: đội A là index 0, vốn là giá trị falsy */
    ids.forEach((id, i) => { if (next[id] == null || next[id] >= teamCount) next[id] = i % teamCount; });
    return next;
  };
  const randomTeams = () => {
    const next = {};
    shuffleArr(chosen).forEach((p, i) => { next[p.id] = i % teamCount; });
    setTeams(next);
    sfx('click');
  };
  const start = () => {
    if (!canStart) return;
    sfx('click');
    const deck = dealQuiz(theme.id, prefs, count);
    rememberQuiz(theme.id, deck.map((q) => q.id));
    if (live && host) host.clearAnswers();
    engine.startGame(live ? livePlayers : chosen, { count: deck.length, deck, rules: rs, stats: {}, teamCount, teams: fullTeams(), live });
  };

  /* the timer runs while a question is on screen */
  const cur = state.current;
  const showing = state.status === 'challenge' && cur && cur.phase === 'question';
  const baseTime = (state.settings.rules || rs).time;
  const time = cur && cur.q && cur.q.timeMs != null ? cur.q.timeMs : baseTime;
  const untimed = !time;                       // 0 = không giới hạn thời gian
  const liveRound = !!(cur && cur.live);
  /* The clock starts when the question appears on screen, not when the round was built */
  useEffect(() => {
    if (showing && cur && !cur.startedAt) engine.patchCurrent({ startedAt: performance.now() });
  }, [showing, state.round]);
  const liveAnswers = liveRound && host ? host.answersFor(cur.q.id) : {};
  const liveCount = Object.keys(liveAnswers).length;
  const closeRound = () => {
    if (liveRound) engine.resolveRound({ answers: host ? host.answersFor(cur.q.id) : {} });
    else engine.resolveRound({ answer: null, ms: time });
  };
  const closeRef = useRef(closeRound);
  closeRef.current = closeRound;
  useEffect(() => {
    if (!showing || untimed) { timer.stop(); return; }
    timer.start(time, () => { sfx('land'); closeRef.current(); });
    return () => timer.stop();
  }, [showing, state.round, untimed, time]);
  /* Everyone has answered → no reason to keep the class waiting out the clock */
  useEffect(() => {
    if (!showing || !liveRound || !ps.length || liveCount < ps.length) return;
    const id = setTimeout(() => { timer.stop(); sfx('land'); closeRef.current(); }, 400);
    return () => clearTimeout(id);
  }, [showing, liveRound, liveCount, ps.length]);
  const answer = (i) => {
    if (!showing) return;
    const elapsed = performance.now() - cur.startedAt;
    timer.stop();
    engine.resolveRound({ answer: i, ms: untimed ? elapsed : Math.min(time, elapsed) });
  };
  /* Host controls: bỏ qua câu hiện tại / chơi lại câu này */
  const skipQuestion = () => { timer.stop(); sfx('click'); closeRef.current(); };
  const restartQuestion = () => { sfx('click'); engine.patchCurrent({ startedAt: performance.now() }); if (!untimed) timer.start(time, () => { sfx('land'); engine.resolveRound({ answer: null, ms: time }); }); };
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
      questionId: cur && cur.q ? cur.q.id : null,
      askedAt: cur ? cur.startedAt : null,
      /* Phones render these as answer buttons. Kept during the reveal too, so a
       * student sees their own pick marked right or wrong. */
      options: cur && cur.live && (showing || state.status === 'result')
        ? cur.q.options.map((o) => ({ text: L(o, lang), image: o.media ? o.media.src : null })) : null,
      reveal: state.status === 'result' && cur && cur.live ? { answer: cur.q.answer } : null,
      timerMs: showing && !untimed ? timer.ms : null, scores: ps, winner: winners,
    });
  }, [state.status, state.round, cur, state.players, Math.ceil(timer.ms / 1000), liveCount]);
  useEffect(() => () => publish && publish(null), []);

  const accentBtn = { background: `linear-gradient(90deg, ${theme ? theme.accent : mode.accent}, #a78bfa)` };
  const optionLabel = (o) => L(o, lang);

  let body;
  if (!theme) {
    body = <div className="text-center text-white/70 py-10">{t.noQuestions}</div>;
  } else if (state.status === 'setup') {
    body = (
      <div className="space-y-5">
        {custom ? (
          <div className="rounded-2xl p-4 border border-white/15" style={{ background: `linear-gradient(135deg, ${theme.accent}33, ${theme.accent}0d)` }}>
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.yourGame}</div>
            <div className="text-xl font-black mt-0.5">{theme.icon} {L(theme.title, lang)}</div>
            {L(theme.description, lang) && <div className="text-sm text-white/70 mt-1">{L(theme.description, lang)}</div>}
            <div className="text-[11px] text-white/60 mt-2">{t.questionsN(available)} · ⏱ {custom.config.timerSec === 0 ? '∞' : `${custom.config.timerSec}s`}</div>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.quizTitle}</div>
              <h3 className="text-lg font-black mt-0.5">{t.chooseTheme}</h3>
            </div>
            <QuizThemeCards t={t} lang={lang} currentId={theme.id} prefs={prefs} sub={sub}
              onPick={(th) => { if (th.id !== theme.id) { sfx('click'); openItem('quiz', `quiz-${th.id}`); } }} />
            {QUIZ_THEMES.some((th) => th.custom) && (
              <>
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/55 pt-1">🎓 {t.myGames}</div>
                <QuizThemeCards t={t} lang={lang} currentId={theme.id} prefs={{ ...prefs, ruleset: 'custom', difficulty: 'all' }} sub={sub} custom
                  onPick={(th) => { if (th.id !== theme.id) { sfx('click'); openItem('quiz', `quiz-${th.id}`); } }} />
              </>
            )}
          </>
        )}
        <div className="space-y-3 border-t border-white/10 pt-4">
          {!custom && (
            <>
              <OptionPills label={t.quizMode} value={prefs.ruleset} onChange={(v) => setPrefs({ ruleset: v })}
                options={Object.values(QUIZ_RULESETS).map((r) => ({ value: r.id, label: `${r.icon} ${t.rulesets[r.id].name}` }))} />
              <div className="text-[11px] text-white/55 -mt-1">{t.rulesets[prefs.ruleset].desc}</div>
              <OptionPills label={t.difficulty} value={prefs.difficulty} onChange={(v) => setPrefs({ difficulty: v })}
                options={['all', ...DIFFICULTIES].map((d) => ({ value: d, label: d === 'all' ? t.allLevels : t.difficultyLabels[d] }))} />
              <OptionPills label={t.questions} value={prefs.count} onChange={(v) => setPrefs({ count: v })}
                options={[5, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))} />
              {available < prefs.count && <div className="text-[11px] text-amber-200 text-right">{t.onlyAvailable(available)}</div>}
            </>
          )}
          <OptionPills label={t.teamsLabel} value={teamCount} onChange={(v) => { setTeamCount(v); setTeams({}); }}
            options={[{ value: 0, label: t.individual }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]} />
          {teamCount > 0 && (
            <div className="rounded-2xl bg-black/20 border border-white/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white/55">{t.assignTeams}</span>
                <ToolBtn onClick={randomTeams} disabled={chosen.length < teamCount}>🎲 {t.autoTeams}</ToolBtn>
              </div>
              {chosen.length < teamCount ? <div className="text-[11px] text-amber-200">{t.needPlayers(teamCount)}</div> : (
                <ul className="space-y-1">
                  {chosen.map((p) => {
                    const ti = fullTeams()[p.id] || 0;
                    return (
                      <li key={p.id} className="flex items-center gap-2">
                        <Avatar player={p} size={26} />
                        <span className="flex-1 min-w-0 truncate text-sm font-semibold">{p.name}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: teamCount }, (_, i) => (
                            <button key={i} onClick={() => setTeams({ ...fullTeams(), [p.id]: i })} aria-pressed={ti === i}
                              className={`w-7 h-7 rounded-lg text-[11px] font-black btn-press ${ti === i ? 'text-slate-900' : 'text-white/50 border border-white/20'}`}
                              style={ti === i ? { background: TEAM_COLORS[i] } : undefined}>{TEAM_NAMES[i]}</button>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
        {liveOn && (
          <div className="rounded-2xl p-3 border border-green-300/40 bg-green-500/10 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-400 pulse-soft shrink-0" />
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-bold">{t.liveClassroom} · {t.room} <span className="font-mono tracking-widest">{host.room.code}</span></div>
              <div className="text-[11px] text-white/70">{t.liveClassroomHint(liveIds.length)}</div>
            </div>
          </div>
        )}
        <PlayerSetup t={t} players={partyPlayers} onChange={setPlayers} min={minP} max={maxP} selected={selected} onSelected={setSelected} sfx={sfx} />
        <button onClick={start} disabled={!canStart} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white" style={accentBtn}>{theme.icon} {t.startGame}</button>
        {!canStart && <div className="text-center text-xs text-white/55">{count === 0 ? t.noQuestions : t.needPlayers(minP)}</div>}
      </div>
    );
  } else if (state.status === 'countdown') {
    /* Live rounds belong to the whole class, so there is no single player to name */
    body = <Countdown seconds={3} onDone={engine.countdownDone} play={sfx} label={cur.playerId ? byId(cur.playerId).name : t.liveClassroom} />;
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
    } else if (cur.live) {
      /* Classroom: this screen is the projector. Students answer on their phones. */
      body = (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-300/40 text-sm font-bold">
              <span className="w-2 h-2 rounded-full bg-green-400 pulse-soft" />{t.liveClassroom}
            </span>
            {untimed
              ? <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15">⏱ ∞</span>
              : <TimerRing ms={timer.ms} total={time} size={72} color={theme.accent} />}
          </div>
          <div className="rounded-3xl p-5 bg-black/25 border border-white/15 slide-up text-center">
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.question} {state.round}/{state.settings.count}</div>
            {q.media && <div className="mt-3"><QuizMedia media={q.media} lang={lang} /></div>}
            <p className="text-2xl sm:text-3xl font-black mt-3 leading-snug">{L(q.question, lang)}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {q.options.map((o, i) => (
              <div key={i} className="min-h-[56px] rounded-2xl px-4 py-3 bg-white/10 border border-white/15 font-bold flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0">{'ABCDEF'[i]}</span>
                {o.media && <QuizMedia media={o.media} lang={lang} size="sm" />}
                <span>{optionLabel(o)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-white/70">📱 {t.answeredCount(liveCount, ps.length)}</span>
              <span className="text-white/50 text-xs">{t.studentsAnswerOnPhones}</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${ps.length ? (liveCount / ps.length) * 100 : 0}%`, background: theme.accent }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ps.map((pl) => <span key={pl.id} className={liveAnswers[pl.id] ? '' : 'opacity-30'}><Avatar player={pl} size={28} ring={liveAnswers[pl.id] ? '#4ade80' : undefined} /></span>)}
            </div>
          </div>
          <Decision onPick={() => { timer.stop(); sfx('click'); closeRound(); }} options={[{ id: 'reveal', label: `👁 ${t.revealAnswer}`, color: theme.accent }]} />
          <div className="flex items-center justify-center gap-2">
            <button onClick={restartQuestion} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press">↻ {t.restartQuestion}</button>
            <button onClick={skipQuestion} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press">⏭ {t.skipQuestion}</button>
          </div>
        </div>
      );
    } else {
      const imageOptions = q.options.some((o) => o.media);
      body = (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <PlayerChip player={p} label={p.streak > 1 ? `🔥${p.streak}` : ''} />
            {untimed
              ? <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15">⏱ ∞</span>
              : <TimerRing ms={timer.ms} total={time} size={72} color={theme.accent} />}
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
          <div className="flex items-center justify-center gap-2 pt-1">
            <button onClick={restartQuestion} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press">↻ {t.restartQuestion}</button>
            <button onClick={skipQuestion} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press">⏭ {t.skipQuestion}</button>
          </div>
        </div>
      );
    }
  } else if (state.status === 'result' && state.lastResult.live) {
    const r = state.lastResult;
    const q = cur.q;
    const over = !!engine.pendingWinner;
    const rows = ps.map((pl) => ({ p: pl, ...(r.perPlayer[pl.id] || { answered: false, correct: false, points: 0 }) }))
      .sort((a, b) => Number(b.correct) - Number(a.correct) || (a.ms || 1e9) - (b.ms || 1e9));
    const nCorrect = rows.filter((x) => x.correct).length;
    body = (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-4xl" aria-hidden="true">{nCorrect ? '✅' : '🤔'}</div>
          <div className="text-xl font-black mt-2 score-pop">{t.nGotItRight(nCorrect, ps.length)}</div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options.map((o, i) => {
            const picked = rows.filter((x) => x.index === i).length;
            return (
              <div key={i} className={`rounded-2xl px-4 py-3 border font-bold flex items-center gap-3 ${i === q.answer ? 'bg-green-500/25 border-green-300/60' : 'bg-black/20 border-white/10 opacity-70'}`}>
                <span className="w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0">{'ABCDEF'[i]}</span>
                <span className="flex-1 min-w-0">{optionLabel(o)}</span>
                {picked > 0 && <span className="text-xs text-white/60 shrink-0">{picked}×</span>}
                {i === q.answer && <span>✓</span>}
              </div>
            );
          })}
        </div>
        {q.explanation && <div className="text-sm text-white/80 text-center rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5">💡 {L(q.explanation, lang)}</div>}
        <ul className="space-y-1">
          {rows.map(({ p: pl, answered, correct, points }) => (
            <li key={pl.id} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ${correct ? 'bg-green-500/15' : answered ? 'bg-red-500/10' : 'bg-black/20 opacity-60'}`}>
              <Avatar player={pl} size={28} />
              <span className="flex-1 min-w-0 font-semibold truncate">{pl.name}</span>
              <span className="text-sm">{correct ? '✅' : answered ? '❌' : '—'}</span>
              <span className="font-black tabular-nums w-14 text-right">{points ? `+${points}` : ''}</span>
              <span className="font-black tabular-nums w-12 text-right text-white/70">{pl.score}</span>
            </li>
          ))}
        </ul>
        {state.settings.teamCount > 0 && <TeamScores t={t} teams={teamScores(ps, state.settings)} />}
        <button onClick={() => { sfx('click'); if (host) host.clearAnswers(); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={accentBtn}>{over ? `🏁 ${t.finish}` : `▶ ${t.next}`}</button>
      </div>
    );
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
        {state.settings.teamCount > 0 && <TeamScores t={t} teams={teamScores(ps, state.settings)} />}
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.playerId]} metricLabel={t.pts} compact /></div>
        <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={accentBtn}>{over ? `🏁 ${t.finish}` : `▶ ${t.next}`}</button>
      </div>
    );
  } else {
    const w = winners[0];
    const st = w ? statsOf(w.id) : null;
    const tScores = teamScores(ps, state.settings);
    body = (
      <GameResult t={t} title={t.quizComplete} winners={winners} players={ps} metricLabel={t.pts}
        extra={tScores.length ? <TeamScores t={t} teams={tScores} big /> : null}
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
