/* ============================================================
 *  Quiz — one engine for every category; hot-seat, 15 s per question,
 *  +100 for a correct answer plus a speed bonus of up to +50
 * ============================================================ */

const QUIZ_TIME = 15000;

function QuizGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, players: partyPlayers, setPlayers, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish, publish } = ctx;
  const [minP, maxP] = item.players;
  const bank = useMemo(() => questionsFor(item.category), [item.category]);
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [count, setCount] = useState(Math.min(10, bank.length));
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);
  const bag = useBag(bank, item.category);
  const timer = useTimer();

  const rules = useMemo(() => ({
    countdown: (round) => (round === 1 ? 3 : 0),
    buildRound: (s) => {
      const p = s.players[(s.round - 1) % s.players.length];
      return { playerId: p.id, q: bag.next(), phase: s.players.length > 1 ? 'handoff' : 'question', startedAt: 0 };
    },
    resolveRound: (s, { answer, ms }) => {
      const { playerId, q } = s.current;
      const correct = answer === q.a;
      const bonus = correct ? Math.round(50 * clamp(1 - ms / QUIZ_TIME, 0, 1)) : 0;
      const points = correct ? 100 + bonus : 0;
      let players = correct ? Score.addPoints(Score.incrementStreak(s.players, playerId), playerId, points) : Score.resetStreak(s.players, playerId);
      const prev = s.settings.stats[playerId] || { correct: 0, answered: 0, fastest: null };
      const stats = { ...s.settings.stats, [playerId]: { correct: prev.correct + (correct ? 1 : 0), answered: prev.answered + 1, fastest: correct ? Math.min(prev.fastest ?? Infinity, ms) : prev.fastest } };
      return { players, result: { playerId, correct, points, bonus, answer, ms }, settings: { ...s.settings, stats } };
    },
    checkEnd: (s) => (s.round >= s.settings.count ? Score.leaders(s.players) : null),
  }), [item.category]);

  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  const start = () => { if (!canStart) return; sfx('click'); engine.startGame(chosen, { count, stats: {} }); };

  /* the timer runs while a question is on screen */
  const cur = state.current;
  const showing = state.status === 'challenge' && cur && cur.phase === 'question';
  useEffect(() => {
    if (!showing) { timer.stop(); return; }
    timer.start(QUIZ_TIME, () => { sfx('land'); engine.resolveRound({ answer: null, ms: QUIZ_TIME }); });
    return () => timer.stop();
  }, [showing, state.round]);
  const answer = (i) => {
    if (!showing) return;
    const ms = Math.min(QUIZ_TIME, performance.now() - cur.startedAt);
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
      challenge: showing ? cur.q.q[lang] : null, timerMs: showing ? timer.ms : null, scores: ps, winner: winners,
    });
  }, [state.status, state.round, cur, state.players, Math.ceil(timer.ms / 1000)]);
  useEffect(() => () => publish && publish(null), []);

  let body;
  if (state.status === 'setup') {
    body = (
      <div className="space-y-5">
        <p className="text-sm text-white/70">{meta.howToPlay}</p>
        <PlayerSetup t={t} players={partyPlayers} onChange={setPlayers} min={minP} max={maxP} selected={selected} onSelected={setSelected} sfx={sfx} />
        <div className="border-t border-white/10 pt-4">
          <OptionPills label={t.questions} value={count} onChange={setCount} options={[5, 10, 15].filter((n) => n <= Math.max(5, bank.length)).map((n) => ({ value: n, label: String(Math.min(n, bank.length)) }))} />
        </div>
        <button onClick={start} disabled={!canStart} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #a78bfa)` }}>🧠 {t.startGame}</button>
        {!canStart && <div className="text-center text-xs text-white/55">{t.needPlayers(minP)}</div>}
      </div>
    );
  } else if (state.status === 'countdown') {
    body = <Countdown seconds={3} onDone={engine.countdownDone} play={sfx} label={byId(cur.playerId).name} />;
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    if (cur.phase === 'handoff') {
      body = (
        <div className="text-center space-y-5 py-4">
          <Avatar player={p} size={80} />
          <div className="text-2xl font-black">{t.passTo(p.name)}</div>
          <button onClick={() => { sfx('click'); engine.patchCurrent({ phase: 'question', startedAt: performance.now() }); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #a78bfa)` }}>👋 {t.yourTurn(p.name)}</button>
        </div>
      );
    } else {
      body = (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <PlayerChip player={p} />
            <TimerRing ms={timer.ms} total={QUIZ_TIME} size={72} color={mode.accent} />
          </div>
          <div className="rounded-3xl p-5 bg-black/25 border border-white/15 slide-up">
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.question} {state.round}/{state.settings.count}</div>
            <p className="text-xl sm:text-2xl font-black mt-2 leading-snug">{cur.q.q[lang]}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {cur.q.options[lang].map((opt, i) => (
              <button key={i} onClick={() => answer(i)} className="min-h-[56px] text-left rounded-2xl px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0">{'ABCD'[i]}</span><span>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const p = byId(r.playerId);
    const q = cur.q;
    const over = !!engine.pendingWinner;
    body = (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-5xl" aria-hidden="true">{r.correct ? '✅' : r.answer == null ? '⏰' : '❌'}</div>
          <div className="text-2xl font-black mt-2 score-pop">{r.correct ? t.correct : r.answer == null ? t.timeUp : t.wrong}</div>
          {r.correct && <div className="text-sm font-bold text-green-300 mt-1">+{r.points} {t.points}{r.bonus ? ` · +${r.bonus} ${t.speedBonus}` : ''} · {fmtSeconds(r.ms)}</div>}
          {p.streak > 1 && <div className="text-sm font-bold text-orange-300">🔥 {p.streak} {t.streakLabel}</div>}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {q.options[lang].map((opt, i) => (
            <div key={i} className={`rounded-2xl px-4 py-3 border font-bold flex items-center gap-3 ${i === q.a ? 'bg-green-500/25 border-green-300/60' : i === r.answer ? 'bg-red-500/25 border-red-300/60' : 'bg-black/20 border-white/10 opacity-60'}`}>
              <span className="w-7 h-7 rounded-full bg-black/30 grid place-items-center text-xs font-black shrink-0">{'ABCD'[i]}</span><span>{opt}</span>{i === q.a && <span className="ml-auto">✓</span>}
            </div>
          ))}
        </div>
        {q.why && <div className="text-xs text-white/65 text-center">💡 {t.didYouKnow} {q.why[lang]}</div>}
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.playerId]} metricLabel={t.pts} compact /></div>
        <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #a78bfa)` }}>{over ? `🏁 ${t.finish}` : `▶ ${t.next}`}</button>
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
