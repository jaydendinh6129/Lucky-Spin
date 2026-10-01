/* ============================================================
 *  Mini games — rock paper scissors · 5 second rule · don't laugh ·
 *  reaction test · memory · word challenge. Each has its own rules
 *  object and rides the shared engine, timers and result screen.
 * ============================================================ */

/* Shared setup + chrome for the hot-seat mini games */
function useMiniSetup(ctx) {
  const { players: partyPlayers, item } = ctx;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const [minP, maxP] = item.players;
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  return { selected, setSelected, chosen, canStart, minP, maxP };
}

function StartButton({ t, onClick, disabled, accent, icon = '▶', label }) {
  return (
    <button onClick={onClick} disabled={disabled} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white" style={{ background: `linear-gradient(90deg, ${accent}, #f472b6)` }}>
      {icon} {label || t.startGame}
    </button>
  );
}
function NextButton({ t, engine, accent, sfx }) {
  const over = !!engine.pendingWinner;
  return (
    <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${accent}, #f472b6)` }}>
      {over ? `🏁 ${t.finish}` : `▶ ${t.nextRound}`}
    </button>
  );
}
function MiniSetup({ ctx, setup, children, onStart, icon }) {
  const { t, meta, players, setPlayers, sfx, mode } = ctx;
  return (
    <div className="space-y-5">
      <p className="text-sm text-white/70">{meta.howToPlay}</p>
      <PlayerSetup t={t} players={players} onChange={setPlayers} min={setup.minP} max={setup.maxP} selected={setup.selected} onSelected={setup.setSelected} sfx={sfx} />
      {children && <div className="space-y-3 border-t border-white/10 pt-4">{children}</div>}
      <StartButton t={t} onClick={onStart} disabled={!setup.canStart} accent={mode.accent} icon={icon} />
      {!setup.canStart && <div className="text-center text-xs text-white/55">{t.needPlayers(setup.minP)}</div>}
    </div>
  );
}
/* publishes the stage for the big screen */
function useMiniStage(ctx, state, extra) {
  const { publish, item, meta } = ctx;
  useEffect(() => {
    if (!publish) return;
    publish({ icon: item.icon, title: meta.title, status: state.status, round: state.round, scores: state.players, winner: state.winner ? (Array.isArray(state.winner) ? state.winner : []) : [], ...extra });
  }, [state.status, state.round, state.current, state.players, extra && extra.challenge, extra && extra.timerMs]);
  useEffect(() => () => publish && publish(null), []);
}

/* ---------- ✋ Rock Paper Scissors ---------- */
const RPS = [{ id: 'rock', icon: '✊' }, { id: 'paper', icon: '✋' }, { id: 'scissors', icon: '✌️' }];
const RPS_BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

function RpsGame({ ctx }) {
  const { t, mode, item, meta, modeTitle, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const [goal, setGoal] = useState(3);
  const rules = useMemo(() => ({
    countdown: (round) => (round === 1 ? 3 : 0),
    buildRound: (s) => ({ a: s.players[0].id, b: s.players[1].id, picks: {}, phase: 'a' }),
    resolveRound: (s, { a, b }) => {
      const { a: aId, b: bId } = s.current;
      let players = s.players;
      let winnerId = null;
      if (a !== b) {
        winnerId = RPS_BEATS[a] === b ? aId : bId;
        const loserId = winnerId === aId ? bId : aId;
        players = Score.addPoints(Score.incrementWin(players, winnerId), winnerId, 1);
        players = Score.incrementLoss(players, loserId);
      }
      return { players, result: { a, b, winnerId } };
    },
    checkEnd: (s) => { const w = s.players.find((p) => p.wins >= s.settings.goal); return w ? [w] : null; },
  }), []);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen, { goal }); };
  const cur = state.current;

  const pick = (choice) => {
    sfx('click');
    const picks = { ...cur.picks, [cur.phase === 'a' ? cur.a : cur.b]: choice };
    if (cur.phase === 'a') engine.patchCurrent({ picks, phase: 'b' });
    else engine.patchCurrent({ picks, phase: 'reveal' });
  };
  useEffect(() => {
    if (state.status !== 'challenge' || !cur || cur.phase !== 'reveal') return;
    sfx('whoosh');
    const id = setTimeout(() => engine.resolveRound({ a: cur.picks[cur.a], b: cur.picks[cur.b] }), 1100);
    return () => clearTimeout(id);
  }, [cur && cur.phase, state.status]);
  useEffect(() => { if (state.status === 'result') sfx(state.lastResult.winnerId ? 'win' : 'land'); }, [state.status]);

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, ps.length === 2 ? `${t.wonBy(winners.map((p) => p.name).join(', '))} ${ps[0].wins}–${ps[1].wins}` : ''), onFinish);
  useMiniStage(ctx, state, { participants: ps, challenge: cur && state.status === 'challenge' ? t.chooseSecretly(byId(cur.phase === 'b' ? cur.b : cur.a)?.name || '') : null });

  const icon = (id) => (RPS.find((r) => r.id === id) || {}).icon;
  let body;
  if (state.status === 'setup') {
    body = <MiniSetup ctx={ctx} setup={setup} onStart={start} icon="✋"><OptionPills label={t.firstTo(goal)} value={goal} onChange={setGoal} options={[3, 5].map((n) => ({ value: n, label: String(n) }))} /></MiniSetup>;
  } else if (state.status === 'countdown') {
    body = <Countdown seconds={3} onDone={engine.countdownDone} play={sfx} />;
  } else if (state.status === 'challenge') {
    const a = byId(cur.a), b = byId(cur.b);
    if (cur.phase === 'reveal') {
      body = (
        <div className="flex items-center justify-around py-6">
          {[a, b].map((p, i) => (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <div className="text-7xl rps-pick" style={{ animationDelay: `${i * 0.15}s` }}>{icon(cur.picks[p.id])}</div>
              <PlayerChip player={p} />
            </div>
          ))}
        </div>
      );
    } else {
      const who = cur.phase === 'a' ? a : b;
      body = (
        <div className="space-y-5 text-center">
          <div className="flex items-center justify-between text-sm font-bold"><PlayerChip player={a} label={`${a.wins}`} /><span className="text-white/50">{t.vs}</span><PlayerChip player={b} label={`${b.wins}`} /></div>
          {cur.phase === 'b' && <div className="text-xs text-white/60">✅ {t.lockedIn}</div>}
          <div className="text-xl font-black">{t.chooseSecretly(who.name)}</div>
          <div className="grid grid-cols-3 gap-2">
            {RPS.map((r) => (
              <button key={r.id} onClick={() => pick(r.id)} className="aspect-square rounded-3xl bg-white/10 hover:bg-white/20 border border-white/15 btn-press flex flex-col items-center justify-center gap-1">
                <span className="text-5xl">{r.icon}</span><span className="text-xs font-bold text-white/70">{t[r.id]}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = (
      <div className="space-y-5 text-center">
        <div className="flex items-center justify-center gap-6 text-6xl"><span>{icon(r.a)}</span><span className="text-2xl text-white/40 italic">{t.vs}</span><span>{icon(r.b)}</span></div>
        <div className="text-2xl font-black score-pop">{r.winnerId ? `${byId(r.winnerId).avatar} ${t.pointTo(byId(r.winnerId).name)}` : `🤝 ${t.tie}`}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={r.winnerId ? [r.winnerId] : []} metric="wins" metricLabel={t.winsLabel} /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metric="wins" metricLabel={t.winsLabel} stats={w ? [`⚡ ${w.wins} ${t.winsLabel}`, `🔥 ${w.bestStreak} ${t.streakLabel}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} status={state.status} onExit={onExit}>{body}</GameShell>;
}

/* ---------- Shared "prompt + timer + host verdict" game (5 Second Rule, Word Challenge) ---------- */
function TimedPromptGame({ ctx, seconds, buildPrompt, renderPrompt, icon }) {
  const { t, mode, item, meta, modeTitle, sfx, celebrate, showToast, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const [perPlayer, setPerPlayer] = useState(2);
  const timer = useTimer();
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: (s) => ({ playerId: s.players[(s.round - 1) % s.players.length].id, prompt: buildPrompt(), phase: 'ready' }),
    resolveRound: (s, { success }) => {
      const id = s.current.playerId;
      const players = success ? Score.addPoints(Score.incrementStreak(s.players, id), id, 1) : Score.incrementLoss(Score.resetStreak(s.players, id), id);
      return { players, result: { playerId: id, success, streak: Score.byId(players, id).streak } };
    },
    checkEnd: (s) => (s.round >= s.settings.total ? Score.leaders(s.players) : null),
  }), []);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const cur = state.current;
  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen, { total: setup.chosen.length * perPlayer }); };
  const begin = () => { sfx('click'); engine.patchCurrent({ phase: 'timing' }); };
  const timing = state.status === 'challenge' && cur && cur.phase === 'timing';
  useEffect(() => {
    if (!timing) { timer.stop(); return; }
    timer.start(seconds * 1000, () => { sfx('land'); engine.patchCurrent({ phase: 'judge' }); });
    return () => timer.stop();
  }, [timing, state.round]);
  const lastSec = useRef(0);
  useEffect(() => { if (timing && timer.seconds !== lastSec.current) { lastSec.current = timer.seconds; if (timer.seconds <= 3 && timer.seconds > 0) sfx('tick'); } }, [timer.seconds, timing]);
  const verdict = (success) => { timer.stop(); sfx(success ? 'win' : 'land'); engine.resolveRound({ success }); };
  useEffect(() => { if (state.status === 'result' && state.lastResult.success && state.lastResult.streak >= 3) showToast(t.milestone(state.lastResult.streak)); }, [state.status]);

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map((p) => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useMiniStage(ctx, state, { participants: cur ? [byId(cur.playerId)].filter(Boolean) : [], challenge: cur && state.status === 'challenge' ? renderPrompt(cur.prompt, true) : null, timerMs: timing ? timer.ms : null });

  let body;
  if (state.status === 'setup') {
    body = <MiniSetup ctx={ctx} setup={setup} onStart={start} icon={icon}><OptionPills label={t.roundsLabel} value={perPlayer} onChange={setPerPlayer} options={[1, 2, 3].map((n) => ({ value: n, label: `×${n}` }))} /></MiniSetup>;
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    body = (
      <div className="space-y-5 text-center">
        <div className="flex items-center justify-between"><PlayerChip player={p} label={p.streak > 0 ? `🔥${p.streak}` : ''} />{timing && <TimerRing ms={timer.ms} total={seconds * 1000} size={80} color={mode.accent} />}</div>
        <div className="rounded-3xl p-5 bg-black/25 border border-white/15 slide-up">{renderPrompt(cur.prompt, false)}</div>
        {cur.phase === 'ready' && <StartButton t={t} onClick={begin} accent={mode.accent} icon="⏱️" label={`${t.start} · ${seconds}s`} />}
        {cur.phase !== 'ready' && <Decision onPick={(id) => verdict(id === 'ok')} options={[{ id: 'ok', label: t.success, icon: '✅', color: '#4ade80' }, { id: 'fail', label: t.failed, icon: '❌', color: '#f87171' }]} />}
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = (
      <div className="space-y-5 text-center">
        <div className="text-2xl font-black score-pop">{r.success ? `✅ ${t.pointTo(byId(r.playerId).name)}${r.streak > 1 ? ` · 🔥 ${r.streak}` : ''}` : `❌ ${byId(r.playerId).name} — ${t.failed}`}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.playerId]} metricLabel={t.pts} /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metricLabel={t.pts} stats={w ? [`🏆 ${w.score} ${t.points}`, `🔥 ${w.bestStreak} ${t.bestStreakLabel}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.total} status={state.status} onExit={onExit}>{body}</GameShell>;
}

/* ---------- ⏱️ 5 Second Rule ---------- */
function FiveSecondGame({ ctx }) {
  const bag = useBag(FIVE_SECOND_PROMPTS[ctx.lang], ctx.lang);
  return (
    <TimedPromptGame ctx={ctx} seconds={5} icon="⏱️" buildPrompt={() => bag.next()}
      renderPrompt={(p, plain) => (plain ? p : <><div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{ctx.t.category}</div><p className="text-2xl font-black mt-2">{p}</p></>)} />
  );
}

/* ---------- 🔤 Word Challenge ---------- */
function WordGame({ ctx }) {
  const bag = useBag(WORD_CATEGORIES[ctx.lang], ctx.lang);
  return (
    <TimedPromptGame ctx={ctx} seconds={10} icon="🔤" buildPrompt={() => ({ category: bag.next(), letter: WORD_LETTERS[randInt(WORD_LETTERS.length)] })}
      renderPrompt={(p, plain) => (plain ? `${p.category} · ${p.letter}` : (
        <div className="flex items-center justify-around gap-4">
          <div><div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{ctx.t.category}</div><p className="text-xl font-black mt-1">{p.category}</p></div>
          <div><div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{ctx.t.letter}</div><p className="text-6xl font-black mt-1 leading-none">{p.letter}</p></div>
        </div>
      ))} />
  );
}

/* ---------- 😂 Don't Laugh ---------- */
function DontLaughGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const [rounds, setRounds] = useState(4);
  const bag = useBag(DONT_LAUGH_PROMPTS[lang], lang);
  const timer = useTimer();
  const SEC = 30;
  const rules = useMemo(() => ({
    countdown: (round) => (round === 1 ? 3 : 0),
    buildRound: (s) => { const i = (s.round - 1) % 2; return { performerId: s.players[i].id, judgeId: s.players[1 - i].id, prompt: bag.next(), phase: 'ready' }; },
    resolveRound: (s, { laughed }) => {
      const { performerId, judgeId } = s.current;
      const winnerId = laughed ? performerId : judgeId;
      const loserId = laughed ? judgeId : performerId;
      const players = Score.incrementLoss(Score.addPoints(Score.incrementWin(s.players, winnerId), winnerId, 1), loserId);
      return { players, result: { laughed, winnerId, performerId, judgeId } };
    },
    checkEnd: (s) => (s.round >= s.settings.rounds ? Score.leaders(s.players) : null),
  }), [lang]);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const cur = state.current;
  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen, { rounds }); };
  const timing = state.status === 'challenge' && cur && cur.phase === 'timing';
  useEffect(() => {
    if (!timing) { timer.stop(); return; }
    timer.start(SEC * 1000, () => { sfx('land'); engine.resolveRound({ laughed: false }); });
    return () => timer.stop();
  }, [timing, state.round]);
  useEffect(() => { if (state.status === 'result') sfx(state.lastResult.laughed ? 'giggle' : 'land'); }, [state.status]);
  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, ps.length === 2 ? `${winners.map((p) => p.name).join(', ')} ${ps[0].wins}–${ps[1].wins}` : ''), onFinish);
  useMiniStage(ctx, state, { participants: cur ? [byId(cur.performerId), byId(cur.judgeId)].filter(Boolean) : [], roles: [t.performer, t.judge], challenge: cur && state.status === 'challenge' ? cur.prompt : null, timerMs: timing ? timer.ms : null });

  let body;
  if (state.status === 'setup') {
    body = <MiniSetup ctx={ctx} setup={setup} onStart={start} icon="😂"><OptionPills label={t.roundsLabel} value={rounds} onChange={setRounds} options={[2, 4, 6].map((n) => ({ value: n, label: String(n) }))} /></MiniSetup>;
  } else if (state.status === 'countdown') {
    body = <Countdown seconds={3} onDone={engine.countdownDone} play={sfx} />;
  } else if (state.status === 'challenge') {
    const perf = byId(cur.performerId), judge = byId(cur.judgeId);
    body = (
      <div className="space-y-5 text-center">
        <Versus a={perf} b={judge} t={t} labelA={`🎭 ${t.performer}`} labelB={`😐 ${t.judge}`} />
        {timing && <TimerRing ms={timer.ms} total={SEC * 1000} size={96} color={mode.accent} urgent={5000} />}
        <div className="rounded-3xl p-5 bg-black/25 border border-white/15 slide-up"><p className="text-xl font-black">{cur.prompt}</p></div>
        {cur.phase === 'ready'
          ? <StartButton t={t} onClick={() => { sfx('click'); engine.patchCurrent({ phase: 'timing' }); }} accent={mode.accent} icon="⏱️" label={`${t.start} · ${SEC}s`} />
          : <Decision onPick={() => { timer.stop(); engine.resolveRound({ laughed: true }); }} options={[{ id: 'laugh', label: t.laughed, icon: '😂', color: '#fbbf24' }]} />}
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = (
      <div className="space-y-5 text-center">
        <div className="text-5xl">{r.laughed ? '😂' : '😐'}</div>
        <div className="text-2xl font-black score-pop">{r.laughed ? t.laughed : t.survived} · {t.pointTo(byId(r.winnerId).name)}</div>
        <div className="text-xs text-white/60">🔄 {t.rolesSwap}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.winnerId]} metric="wins" metricLabel={t.winsLabel} /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metric="wins" metricLabel={t.winsLabel} stats={w ? [`⚡ ${w.wins} ${t.winsLabel}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.rounds} status={state.status} onExit={onExit}>{body}</GameShell>;
}

/* ---------- ⚡ Reaction Test ---------- */
const reactionLabel = (t, ms) => (ms < 250 ? t.reactionLabels.incredible : ms < 400 ? t.reactionLabels.fast : ms < 600 ? t.reactionLabels.good : t.reactionLabels.slow);

function ReactionGame({ ctx }) {
  const { t, mode, item, meta, modeTitle, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const ATTEMPTS = 3;
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: (s) => ({ playerId: s.players[(s.round - 1) % s.players.length].id, attempt: Math.floor((s.round - 1) / s.players.length) + 1, phase: 'ready', goAt: 0 }),
    resolveRound: (s, { ms, falseStart }) => {
      const id = s.current.playerId;
      const players = Score.update(s.players, id, (p) => ({
        bestMs: falseStart ? (p.bestMs ?? null) : Math.min(p.bestMs ?? Infinity, ms),
        attempts: [...(p.attempts || []), falseStart ? null : ms],
        score: falseStart ? p.score : p.score + Math.max(0, 1000 - Math.round(ms)),
      }));
      return { players, result: { playerId: id, ms, falseStart } };
    },
    checkEnd: (s) => {
      if (s.round < s.settings.total) return null;
      const timed = s.players.filter((p) => p.bestMs != null);
      if (!timed.length) return s.players;
      const best = Math.min(...timed.map((p) => p.bestMs));
      return timed.filter((p) => p.bestMs === best);
    },
  }), []);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const cur = state.current;
  const waitTimer = useRef(0);
  const [flash, setFlash] = useState(false);
  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen.map((p) => ({ ...p, bestMs: null, attempts: [] })), { total: setup.chosen.length * ATTEMPTS }); };
  useEffect(() => () => clearTimeout(waitTimer.current), []);

  const tap = () => {
    if (state.status !== 'challenge') return;
    if (cur.phase === 'ready') {
      sfx('click');
      engine.patchCurrent({ phase: 'wait' });
      const delay = 1500 + rand() * 2500;
      waitTimer.current = setTimeout(() => { setFlash(true); sfx('land'); engine.patchCurrent({ phase: 'go', goAt: performance.now() }); setTimeout(() => setFlash(false), 500); }, delay);
    } else if (cur.phase === 'wait') {
      clearTimeout(waitTimer.current);
      sfx('tick');
      engine.resolveRound({ ms: null, falseStart: true });
    } else if (cur.phase === 'go') {
      const ms = performance.now() - cur.goAt;
      sfx('win');
      engine.resolveRound({ ms, falseStart: false });
    }
  };
  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, winners[0] && winners[0].bestMs != null ? `${winners[0].name} · ${fmtSeconds(winners[0].bestMs)}` : ''), onFinish);
  useMiniStage(ctx, state, { participants: cur ? [byId(cur.playerId)].filter(Boolean) : [], challenge: cur && state.status === 'challenge' ? (cur.phase === 'go' ? t.go : cur.phase === 'wait' ? t.wait : t.tapToStart) : null });

  let body;
  if (state.status === 'setup') {
    body = <MiniSetup ctx={ctx} setup={setup} onStart={start} icon="⚡" />;
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const bg = cur.phase === 'go' ? 'rgba(74,222,128,0.85)' : cur.phase === 'wait' ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)';
    body = (
      <div className="space-y-4">
        <div className="flex items-center justify-between"><PlayerChip player={p} /><span className="text-xs font-bold text-white/60">{t.attempt} {cur.attempt}/{ATTEMPTS}{p.bestMs != null ? ` · ${t.best} ${fmtSeconds(p.bestMs)}` : ''}</span></div>
        <button onPointerDown={tap} className={`w-full rounded-3xl border border-white/15 min-h-[280px] grid place-items-center text-center select-none btn-press ${flash ? 'go-flash' : ''}`} style={{ background: bg, transition: 'background 0.15s' }}>
          <div>
            <div className={`font-black ${cur.phase === 'go' ? 'text-7xl text-slate-900' : 'text-5xl'}`}>{cur.phase === 'go' ? t.go : cur.phase === 'wait' ? t.wait : `👆 ${t.tapToStart}`}</div>
            <div className={`text-sm mt-3 ${cur.phase === 'go' ? 'text-slate-900/70' : 'text-white/60'}`}>{t.tapWhenGreen}</div>
          </div>
        </button>
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = (
      <div className="space-y-5 text-center">
        <div className="text-6xl">{r.falseStart ? '🚫' : '⚡'}</div>
        <div className="text-3xl font-black score-pop">{r.falseStart ? t.falseStart : fmtSeconds(r.ms)}</div>
        {!r.falseStart && <div className="text-lg font-bold">{reactionLabel(t, r.ms)}</div>}
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.playerId]} metric="time" /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metric="time" stats={w && w.bestMs != null ? [`⚡ ${fmtSeconds(w.bestMs)}`, reactionLabel(t, w.bestMs)] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.total} status={state.status} onExit={onExit}>{body}</GameShell>;
}

/* ---------- 🧠 Memory ---------- */
const MEMORY_SYMBOLS = ['🍺', '🍕', '🎉', '🎸', '🚀', '🌮', '🦄', '🎲', '🍀', '🔥', '🎧', '🏆', '🍩', '⚽', '🌈', '👑'];
const MEMORY_SIZES = { easy: { cols: 4, pairs: 6 }, medium: { cols: 4, pairs: 8 }, hard: { cols: 6, pairs: 12 } };

function MemoryGame({ ctx }) {
  const { t, mode, item, meta, modeTitle, sfx, celebrate, showToast, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const [difficulty, setDifficulty] = useState('medium');
  const watch = useStopwatch();
  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: (s) => {
      const { pairs } = MEMORY_SIZES[s.settings.difficulty];
      const syms = shuffleArr(MEMORY_SYMBOLS).slice(0, pairs);
      const cards = shuffleArr([...syms, ...syms]).map((sym, i) => ({ id: i, sym, matched: false }));
      return { playerId: s.players[(s.round - 1) % s.players.length].id, cards, open: [], attempts: 0, phase: 'memorize', lock: false };
    },
    resolveRound: (s, { attempts, ms }) => {
      const id = s.current.playerId;
      const { pairs } = MEMORY_SIZES[s.settings.difficulty];
      const points = Math.max(10, 100 - (attempts - pairs) * 5);
      const players = Score.update(s.players, id, (p) => ({ score: p.score + points, bestMs: ms, attempts: attempts }));
      return { players, result: { playerId: id, attempts, ms, points } };
    },
    checkEnd: (s) => (s.round >= s.players.length ? Score.leaders(s.players) : null),
  }), []);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const cur = state.current;
  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen.map((p) => ({ ...p, bestMs: null, attempts: 0 })), { difficulty }); };

  /* memorize → play */
  useEffect(() => {
    if (state.status !== 'challenge' || !cur || cur.phase !== 'memorize') return;
    const id = setTimeout(() => { engine.patchCurrent({ phase: 'play' }); watch.start(); sfx('land'); }, 2600);
    return () => clearTimeout(id);
  }, [state.status, state.round, cur && cur.phase]);

  const flip = (i) => {
    if (!cur || cur.phase !== 'play' || cur.lock) return;
    const card = cur.cards[i];
    if (card.matched || cur.open.includes(i)) return;
    sfx('tick');
    const open = [...cur.open, i];
    if (open.length < 2) { engine.patchCurrent({ open }); return; }
    const [a, b] = open;
    const attempts = cur.attempts + 1;
    if (cur.cards[a].sym === cur.cards[b].sym) {
      const cards = cur.cards.map((c, k) => (k === a || k === b ? { ...c, matched: true } : c));
      engine.patchCurrent({ cards, open: [], attempts });
      sfx('coin');
      if (cards.every((c) => c.matched)) { watch.stop(); setTimeout(() => engine.resolveRound({ attempts, ms: watch.ms }), 600); }
    } else {
      engine.patchCurrent({ open, attempts, lock: true });
      setTimeout(() => engine.patchCurrent({ open: [], lock: false }), 750);
    }
  };
  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, winners[0] ? `${winners[0].name} · ${winners[0].attempts} ${t.attempts} · ${fmtSeconds(winners[0].bestMs || 0)}` : ''), onFinish);
  useMiniStage(ctx, state, { participants: cur ? [byId(cur.playerId)].filter(Boolean) : [], challenge: cur && state.status === 'challenge' ? `${cur.attempts} ${t.attempts}` : null });

  let body;
  if (state.status === 'setup') {
    body = <MiniSetup ctx={ctx} setup={setup} onStart={start} icon="🧠"><OptionPills label={t.difficulty} value={difficulty} onChange={setDifficulty} options={['easy', 'medium', 'hard'].map((d) => ({ value: d, label: t.difficultyLabels[d] }))} /></MiniSetup>;
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const { cols } = MEMORY_SIZES[state.settings.difficulty];
    body = (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <PlayerChip player={p} />
          <span className="text-white/70">{cur.phase === 'memorize' ? `👀 ${t.memorize}` : `${cur.attempts} ${t.attempts} · ${fmtSeconds(watch.ms)}`}</span>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {cur.cards.map((c, i) => {
            const up = cur.phase === 'memorize' || c.matched || cur.open.includes(i);
            return (
              <button key={c.id} onClick={() => flip(i)} aria-label={up ? c.sym : '?'} className={`flip-scene aspect-square rounded-2xl ${c.matched ? 'match-pop' : ''}`} disabled={cur.phase !== 'play'}>
                <div className={`flip-card rounded-2xl ${up ? 'flipped' : ''}`}>
                  <div className="flip-face rounded-2xl grid place-items-center text-xl font-black text-white/60 border border-white/15" style={{ background: `linear-gradient(135deg, ${mode.accent}55, ${mode.accent}15)` }}>?</div>
                  <div className={`flip-face back rounded-2xl grid place-items-center text-3xl border ${c.matched ? 'border-green-300/60 bg-green-500/25' : 'border-white/20 bg-white/15'}`}>{c.sym}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = (
      <div className="space-y-5 text-center">
        <div className="text-5xl">🧠</div>
        <div className="text-2xl font-black score-pop">{t.allMatched}</div>
        <div className="text-sm font-bold text-white/80">{byId(r.playerId).name} · {r.attempts} {t.attempts} · {fmtSeconds(r.ms)} · +{r.points} {t.pts}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.playerId]} metricLabel={t.pts} /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metricLabel={t.pts} stats={w ? [`🧠 ${w.attempts} ${t.attempts}`, `⏱️ ${fmtSeconds(w.bestMs || 0)}`, `🏆 ${w.score} ${t.points}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={ps.length || null} status={state.status} onExit={onExit}>{body}</GameShell>;
}
