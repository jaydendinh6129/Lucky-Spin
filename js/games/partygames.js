/* ============================================================
 *  Party games — Charades (Heads Up! style) · Imposter (Spyfall style) ·
 *  Pass the Bomb. Hot-seat on one phone, riding the shared engine,
 *  timer and result screen from the mini games.
 *  Loads after minigames.js: reuses useMiniSetup / MiniSetup / NextButton / useMiniStage.
 * ============================================================ */

/* ---------- 🎭 Charades ---------- */
/* One player acts/describes, the others shout guesses. The phone shows the word
 * only to the actor; the big screen never does. */
function CharadesGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const decks = CHARADES_DECKS[lang];
  const [deckKey, setDeckKey] = useState('mix');
  const [seconds, setSeconds] = useState(60);
  const [perPlayer, setPerPlayer] = useState(1);
  const words = useMemo(() => (deckKey === 'mix' ? Object.values(decks).flatMap((d) => d.words) : decks[deckKey].words), [deckKey, lang]);
  const bag = useBag(words, `charades-${deckKey}-${lang}`);
  const timer = useTimer();

  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: (s) => ({ playerId: s.players[(s.round - 1) % s.players.length].id, phase: 'ready', word: null, got: 0, passed: 0, log: [] }),
    resolveRound: (s, { got, log }) => {
      const id = s.current.playerId;
      const players = got > 0 ? Score.addPoints(s.players, id, got) : s.players;
      return { players, result: { playerId: id, got, log } };
    },
    checkEnd: (s) => (s.round >= s.settings.total ? Score.leaders(s.players) : null),
  }), []);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const cur = state.current;

  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen, { total: setup.chosen.length * perPlayer }); };
  const begin = () => { sfx('whoosh'); engine.patchCurrent({ phase: 'acting', word: bag.next() }); };
  const acting = state.status === 'challenge' && cur && cur.phase === 'acting';
  const finishTurn = () => { timer.stop(); sfx('land'); engine.resolveRound({ got: cur.got, log: cur.log }); };
  const finishRef = useRef(finishTurn); finishRef.current = finishTurn;
  useEffect(() => {
    if (!acting) { timer.stop(); return; }
    timer.start(seconds * 1000, () => finishRef.current());
    return () => timer.stop();
  }, [acting, state.round]);
  const turnRef = useRef(cur);
  useEffect(() => { turnRef.current = cur; }, [cur]);
  const mark = (ok) => {
    const c = turnRef.current;                       // latest, even on a fast double-tap
    sfx(ok ? 'coin' in SFX ? 'coin' : 'win' : 'click');
    const next = { word: bag.next(), got: c.got + (ok ? 1 : 0), passed: c.passed + (ok ? 0 : 1), log: [...c.log, { word: c.word, ok }] };
    turnRef.current = { ...c, ...next };
    engine.patchCurrent(next);
  };

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map((p) => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  /* the word must never reach the big screen — the guessers are watching it */
  useMiniStage(ctx, state, { participants: cur ? [byId(cur.playerId)].filter(Boolean) : [], challenge: acting ? `🎭 ${t.guessing} · ${cur.got} ✓` : null, timerMs: acting ? timer.ms : null });

  let body;
  if (state.status === 'setup') {
    body = (
      <MiniSetup ctx={ctx} setup={setup} onStart={start} icon="🎭">
        <OptionPills label={t.deck} value={deckKey} onChange={setDeckKey} options={[{ value: 'mix', label: `🎲 ${t.mixDeck}` }, ...Object.entries(decks).map(([k, d]) => ({ value: k, label: `${d.icon} ${d.title}` }))]} />
        <OptionPills label={t.time} value={seconds} onChange={setSeconds} options={[45, 60, 90].map((n) => ({ value: n, label: `${n}s` }))} />
        <OptionPills label={t.roundsLabel} value={perPlayer} onChange={setPerPlayer} options={[1, 2, 3].map((n) => ({ value: n, label: `×${n}` }))} />
      </MiniSetup>
    );
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    body = cur.phase === 'ready' ? (
      <div className="text-center space-y-5 py-4">
        <Avatar player={p} size={80} />
        <div className="text-2xl font-black">{t.passTo(p.name)}</div>
        <p className="text-sm text-white/70 max-w-sm mx-auto">{t.charadesHint}</p>
        <StartButton t={t} onClick={begin} accent={mode.accent} icon="🎭" label={`${t.start} · ${seconds}s`} />
      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <PlayerChip player={p} label={`✓ ${cur.got}`} />
          <TimerRing ms={timer.ms} total={seconds * 1000} size={72} color={mode.accent} />
        </div>
        <div className="rounded-3xl p-6 sm:p-8 bg-black/25 border border-white/15 text-center slide-up" key={cur.word}>
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.yourWord}</div>
          <p className="text-3xl sm:text-4xl font-black mt-3 leading-tight">{cur.word}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => mark(false)} className="min-h-[80px] rounded-3xl text-xl font-black btn-press bg-white/10 border-2 border-white/20">⏭ {t.pass}</button>
          <button onClick={() => mark(true)} className="min-h-[80px] rounded-3xl text-xl font-black btn-press bg-green-500/25 border-2 border-green-300/60">✓ {t.gotWord}</button>
        </div>
        <button onClick={finishTurn} className="w-full text-xs font-bold text-white/60 hover:text-white py-1">⏹ {t.endTurn}</button>
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    body = (
      <div className="space-y-4 text-center">
        <div className="text-2xl font-black score-pop">{r.got > 0 ? `🎉 ${byId(r.playerId).name} · +${r.got}` : `😅 ${byId(r.playerId).name} · 0`}</div>
        <div className="flex flex-wrap justify-center gap-1.5">
          {r.log.map((e, i) => <span key={i} className={`text-xs font-bold px-2.5 py-1 rounded-full border ${e.ok ? 'bg-green-500/20 border-green-300/50' : 'bg-white/5 border-white/15 opacity-60 line-through'}`}>{e.word}</span>)}
        </div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.playerId]} metricLabel={t.pts} compact /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metricLabel={t.pts} stats={w ? [`🏆 ${w.score} ${t.points}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.total} status={state.status} onExit={onExit}>{body}</GameShell>;
}

/* ---------- 🕵️ Imposter ---------- */
/* Pass the phone: everyone peeks at the secret word, one person only sees the
 * category. Talk, then vote. Catch the imposter → everyone else scores;
 * miss → the imposter scores double. */
function ImposterGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const [rounds, setRounds] = useState(3);
  const [talkSec, setTalkSec] = useState(120);
  const groups = IMPOSTER_WORDS[lang];
  const bag = useBag(groups.flatMap((g) => g.words.map((w) => ({ id: `${g.category}-${w}`, category: g.category, word: w }))), `imposter-${lang}`);
  const timer = useTimer();

  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: (s) => {
      const pick = bag.next();
      const imposterId = Random.player(s.players).id;
      return { ...pick, imposterId, phase: 'pass', idx: 0, peeking: false, votedId: null };
    },
    resolveRound: (s, { votedId, guessed }) => {
      const { imposterId } = s.current;
      let players = s.players;
      const caught = votedId === imposterId;
      if (caught) {
        s.players.forEach((p) => { if (p.id !== imposterId) players = Score.addPoints(Score.incrementWin(players, p.id), p.id, 1); });
        if (guessed) players = Score.addPoints(players, imposterId, 1);        // caught but still guessed the word
        players = Score.incrementLoss(players, imposterId);
      } else {
        players = Score.addPoints(Score.incrementWin(players, imposterId), imposterId, 2);
        s.players.forEach((p) => { if (p.id !== imposterId) players = Score.incrementLoss(players, p.id); });
      }
      return { players, result: { imposterId, votedId, caught, guessed, word: s.current.word } };
    },
    checkEnd: (s) => (s.round >= s.settings.rounds ? Score.leaders(s.players) : null),
  }), [lang]);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const cur = state.current;
  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen, { rounds }); };

  const discussing = state.status === 'challenge' && cur && cur.phase === 'discuss';
  useEffect(() => {
    if (!discussing || !talkSec) { timer.stop(); return; }
    timer.start(talkSec * 1000, () => { sfx('land'); engine.patchCurrent({ phase: 'vote' }); });
    return () => timer.stop();
  }, [discussing, state.round]);

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map((p) => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  /* never leak the word or the imposter to the big screen */
  useMiniStage(ctx, state, { participants: [], challenge: cur && state.status === 'challenge' ? (cur.phase === 'pass' ? `📱 ${t.passingPhone}` : cur.phase === 'discuss' ? `🗣️ ${t.discuss} · ${cur.category}` : `🗳️ ${t.voteNow}`) : null, timerMs: discussing ? timer.ms : null });

  let body;
  if (state.status === 'setup') {
    body = (
      <MiniSetup ctx={ctx} setup={setup} onStart={start} icon="🕵️">
        <OptionPills label={t.roundsLabel} value={rounds} onChange={setRounds} options={[1, 3, 5].map((n) => ({ value: n, label: String(n) }))} />
        <OptionPills label={t.discussTime} value={talkSec} onChange={setTalkSec} options={[{ value: 0, label: '∞' }, { value: 60, label: '1m' }, { value: 120, label: '2m' }, { value: 180, label: '3m' }]} />
      </MiniSetup>
    );
  } else if (state.status === 'challenge') {
    if (cur.phase === 'pass') {
      const p = ps[cur.idx];
      const isImp = p.id === cur.imposterId;
      body = (
        <div className="text-center space-y-5 py-2">
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{cur.idx + 1} / {ps.length}</div>
          <Avatar player={p} size={80} />
          <div className="text-2xl font-black">{t.passTo(p.name)}</div>
          {!cur.peeking ? (
            <>
              <p className="text-sm text-white/70">{t.peekHint}</p>
              <button onClick={() => { sfx('click'); engine.patchCurrent({ peeking: true }); }} className="w-full py-4 rounded-3xl font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #a78bfa)` }}>👀 {t.showMyCard}</button>
            </>
          ) : (
            <>
              <div className={`rounded-3xl p-6 border-2 slide-up ${isImp ? 'bg-red-500/20 border-red-300/60' : 'bg-black/25 border-white/15'}`}>
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{cur.category}</div>
                {isImp ? (
                  <><div className="text-4xl mt-2">🕵️</div><p className="text-2xl font-black mt-1">{t.youAreImposter}</p><p className="text-sm text-white/75 mt-2">{t.imposterHint}</p></>
                ) : (
                  <><p className="text-3xl font-black mt-3">{cur.word}</p><p className="text-sm text-white/75 mt-2">{t.crewHint}</p></>
                )}
              </div>
              <button onClick={() => { sfx('whoosh'); const last = cur.idx + 1 >= ps.length; engine.patchCurrent(last ? { phase: 'discuss', peeking: false } : { idx: cur.idx + 1, peeking: false }); }}
                className="w-full py-3.5 rounded-full font-extrabold btn-press bg-white/10 border border-white/15">🙈 {t.hideAndPass}</button>
            </>
          )}
        </div>
      );
    } else if (cur.phase === 'discuss') {
      body = (
        <div className="space-y-5 text-center">
          <div className="flex items-center justify-between gap-3">
            <div className="text-left"><div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.category}</div><div className="text-xl font-black">{cur.category}</div></div>
            {talkSec > 0 ? <TimerRing ms={timer.ms} total={talkSec * 1000} size={72} color={mode.accent} /> : <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15">⏱ ∞</span>}
          </div>
          <div className="rounded-3xl p-6 bg-black/25 border border-white/15"><div className="text-5xl">🗣️</div><p className="text-lg font-black mt-2">{t.discuss}</p><p className="text-sm text-white/70 mt-1">{t.discussHint}</p></div>
          <div className="flex flex-wrap justify-center gap-1.5">{ps.map((p) => <PlayerChip key={p.id} player={p} size={30} />)}</div>
          <StartButton t={t} onClick={() => { timer.stop(); sfx('click'); engine.patchCurrent({ phase: 'vote' }); }} accent={mode.accent} icon="🗳️" label={t.voteNow} />
        </div>
      );
    } else {
      body = (
        <div className="space-y-4">
          <div className="text-center"><div className="text-4xl">🗳️</div><div className="text-xl font-black mt-1">{t.whoIsImposter}</div><div className="text-sm text-white/65">{t.voteHintImposter}</div></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ps.map((p) => (
              <button key={p.id} onClick={() => { sfx('click'); engine.patchCurrent({ votedId: p.id }); }} aria-pressed={cur.votedId === p.id}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 border-2 btn-press text-left ${cur.votedId === p.id ? 'bg-red-500/25 border-red-300' : 'bg-white/5 border-white/15'}`}>
                <Avatar player={p} size={32} /><span className="font-bold truncate">{p.name}</span>
              </button>
            ))}
          </div>
          {cur.votedId && (
            <Decision hint={t.imposterGuessQ} onPick={(id) => { sfx('win'); engine.resolveRound({ votedId: cur.votedId, guessed: id === 'yes' }); }}
              options={[{ id: 'no', label: `👁 ${t.revealAnswer}`, color: mode.accent }, { id: 'yes', label: `🎯 ${t.imposterGuessed}`, color: '#fbbf24' }]} />
          )}
        </div>
      );
    }
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const imp = byId(r.imposterId);
    body = (
      <div className="space-y-4 text-center">
        <div className="text-5xl">{r.caught ? '🚨' : '😎'}</div>
        <div className="text-2xl font-black score-pop">{r.caught ? t.imposterCaught(imp.name) : t.imposterEscaped(imp.name)}</div>
        <div className="text-sm text-white/75">{t.theWordWas} <span className="font-black text-white">{r.word}</span>{r.guessed ? ` · 🎯 ${t.imposterGuessed}` : ''}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.imposterId]} metricLabel={t.pts} compact /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metricLabel={t.pts} stats={w ? [`🏆 ${w.score} ${t.points}`, `🕵️ ${w.wins} ${t.winsLabel}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.rounds} status={state.status} onExit={onExit}>{body}</GameShell>;
}

/* ---------- 💣 Pass the Bomb ---------- */
/* A category, a hidden fuse. Say something, tap PASS, hand the phone on.
 * Whoever is holding it when it blows loses the round; everyone else scores. */
function BombGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, sfx, haptics, celebrate, onExit, onChangeGame, onBackToParty, onFinish } = ctx;
  const setup = useMiniSetup(ctx);
  const [rounds, setRounds] = useState(5);
  const bag = useBag(BOMB_CATEGORIES[lang], `bomb-${lang}`);
  const timer = useTimer();

  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: (s) => ({ category: bag.next(), holderIdx: randInt(s.players.length), phase: 'ready', fuse: 20000 + randInt(25000), passes: 0 }),
    resolveRound: (s, { holderId, passes }) => {
      let players = s.players;
      s.players.forEach((p) => { players = p.id === holderId ? Score.incrementLoss(players, p.id) : Score.addPoints(players, p.id, 1); });
      return { players, result: { holderId, passes } };
    },
    checkEnd: (s) => (s.round >= s.settings.rounds ? Score.leaders(s.players) : null),
  }), [lang]);
  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const cur = state.current;
  const start = () => { if (!setup.canStart) return; sfx('click'); engine.startGame(setup.chosen, { rounds }); };

  const ticking = state.status === 'challenge' && cur && cur.phase === 'ticking';
  const curRef = useRef(cur); curRef.current = cur;
  const explode = () => {
    const c = curRef.current;
    sfx('land'); if (haptics) vibrate([80, 40, 160]);
    engine.resolveRound({ holderId: ps[c.holderIdx].id, passes: c.passes });
  };
  const explodeRef = useRef(explode); explodeRef.current = explode;
  useEffect(() => {
    if (!ticking) { timer.stop(); return; }
    timer.start(cur.fuse, () => explodeRef.current());        // the fuse length is never shown
    return () => timer.stop();
  }, [ticking, state.round]);
  const pass = () => {
    const c = curRef.current;
    sfx('tick'); if (haptics) vibrate(15);
    const next = { holderIdx: (c.holderIdx + 1) % ps.length, passes: c.passes + 1 };
    curRef.current = { ...c, ...next };
    engine.patchCurrent(next);
  };
  const urgency = ticking ? clamp(1 - timer.ms / cur.fuse, 0, 1) : 0;    // only the host device knows how close it is

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map((p) => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useMiniStage(ctx, state, { participants: cur ? [ps[cur.holderIdx]].filter(Boolean) : [], challenge: cur && state.status === 'challenge' ? `💣 ${cur.category}` : null, timerMs: null });

  let body;
  if (state.status === 'setup') {
    body = <MiniSetup ctx={ctx} setup={setup} onStart={start} icon="💣"><OptionPills label={t.roundsLabel} value={rounds} onChange={setRounds} options={[3, 5, 8].map((n) => ({ value: n, label: String(n) }))} /></MiniSetup>;
  } else if (state.status === 'challenge') {
    const holder = ps[cur.holderIdx];
    body = cur.phase === 'ready' ? (
      <div className="text-center space-y-5 py-2">
        <div className="rounded-3xl p-5 bg-black/25 border border-white/15"><div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.category}</div><p className="text-2xl font-black mt-2">{cur.category}</p></div>
        <Avatar player={holder} size={72} />
        <div className="text-lg font-black">{t.bombStartsWith(holder.name)}</div>
        <p className="text-sm text-white/70">{t.bombHint}</p>
        <StartButton t={t} onClick={() => { sfx('whoosh'); engine.patchCurrent({ phase: 'ticking' }); }} accent={mode.accent} icon="🔥" label={t.lightFuse} />
      </div>
    ) : (
      <div className="space-y-4 text-center">
        <div className="rounded-3xl p-4 bg-black/25 border border-white/15"><div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{t.category}</div><p className="text-xl font-black mt-1">{cur.category}</p></div>
        <div className="flex items-center justify-center gap-3"><Avatar player={holder} size={44} /><div className="text-left"><div className="text-[11px] text-white/55">{t.holding}</div><div className="text-xl font-black">{holder.name}</div></div></div>
        <button onClick={pass} className="relative w-full min-h-[150px] rounded-[2rem] font-black text-3xl btn-press border-4 border-red-300/60 text-white overflow-hidden"
          style={{ background: `radial-gradient(circle at 50% 40%, rgba(248,113,113,${0.35 + urgency * 0.45}), rgba(0,0,0,0.5))`, animation: `pulse-soft ${Math.max(0.25, 1.1 - urgency)}s ease-in-out infinite` }}>
          <span className="block text-6xl mb-1" aria-hidden="true">💣</span>{t.passBomb}
          <span className="absolute bottom-2 right-3 text-xs font-bold text-white/60">{cur.passes} ↻</span>
        </button>
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const loser = byId(r.holderId);
    body = (
      <div className="space-y-4 text-center">
        <div className="text-6xl">💥</div>
        <div className="text-2xl font-black score-pop">{t.bombExploded(loser.name)}</div>
        <div className="text-sm text-white/70">{t.passesN(r.passes)} · {t.everyoneElsePlusOne}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.holderId]} metricLabel={t.pts} compact /></div>
        <NextButton t={t} engine={engine} accent={mode.accent} sfx={sfx} />
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metricLabel={t.pts} stats={w ? [`🏆 ${w.score} ${t.points}`, `💥 ${w.losses}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.rounds} status={state.status} onExit={onExit}>{body}</GameShell>;
}
