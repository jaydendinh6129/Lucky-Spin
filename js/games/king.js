/* ============================================================
 *  King of the Table — classic · challenge · last king standing
 *  Winner stays. The king and the challenger rotation live in the round payload.
 * ============================================================ */

function KingGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, players: partyPlayers, setPlayers, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish, publish } = ctx;
  const variant = item.variant; // classic | challenge | last
  const [minP, maxP] = item.players;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [rounds, setRounds] = useState(8);
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);
  const bag = useBag(CHALLENGES[lang].filter((c) => c.scope === 'duel'), lang);

  const rules = useMemo(() => ({
    countdown: (round) => (round === 1 ? 3 : 0),
    buildRound: (s) => {
      const prev = s.current;
      const kingId = s.lastResult ? s.lastResult.newKingId : (prev ? prev.kingId : Random.player(s.players).id);
      const reign = s.lastResult ? s.lastResult.reign : 1;
      let queue = (prev && prev.queue) || [];
      queue = queue.filter((id) => id !== kingId && !Score.byId(s.players, id).eliminated);
      if (!queue.length) queue = shuffleArr(Score.active(s.players).filter((p) => p.id !== kingId).map((p) => p.id));
      const challengerId = queue[0];
      const options = variant === 'challenge' ? [bag.next(), bag.next(), bag.next()] : null;
      return { kingId, challengerId, reign, queue: queue.slice(1), challenge: options ? null : bag.next(), options };
    },
    resolveRound: (s, { winnerId }) => {
      const { kingId, challengerId, reign } = s.current;
      let players = s.players;
      const defended = winnerId === kingId;
      const loserId = defended ? challengerId : kingId;
      players = Score.addPoints(Score.incrementWin(players, winnerId), winnerId, 1);
      players = Score.incrementLoss(players, loserId);
      if (variant === 'last' && defended) players = Score.eliminatePlayer(players, challengerId);
      return { players, result: { kingId, challengerId, defended, newKingId: winnerId, reign: defended ? reign + 1 : 1 } };
    },
    checkEnd: (s) => {
      const kingId = s.lastResult ? s.lastResult.newKingId : null;
      if (!kingId) return null;
      if (variant === 'last') {
        const others = Score.active(s.players).filter((p) => p.id !== kingId);
        return others.length === 0 ? [Score.byId(s.players, kingId)] : null;
      }
      return s.round >= s.settings.rounds ? [Score.byId(s.players, kingId)] : null;
    },
  }), [variant, lang]);

  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  const start = () => { if (!canStart) return; sfx('click'); engine.startGame(chosen, { rounds }); };

  /* reign statistics from the round history */
  const kingStats = useMemo(() => {
    const stats = {};
    let run = { id: null, len: 0 };
    state.history.forEach((h) => {
      const st = (stats[h.kingId] = stats[h.kingId] || { defenses: 0, longest: 0 });
      if (h.defended) st.defenses += 1;
      if (run.id === h.newKingId) run.len += 1; else run = { id: h.newKingId, len: 1 };
      const ns = (stats[h.newKingId] = stats[h.newKingId] || { defenses: 0, longest: 0 });
      ns.longest = Math.max(ns.longest, run.len);
    });
    return stats;
  }, [state.history]);

  useEffect(() => { if (state.status === 'result') sfx(state.lastResult.defended ? 'land' : 'win'); }, [state.status]);

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => {
    const k = winners[0];
    const st = k ? kingStats[k.id] || { defenses: 0, longest: 0 } : { defenses: 0, longest: 0 };
    return gameResultEntry(mode.id, item.id, ps, winners, k ? `👑 ${k.name} · ${st.defenses} ${t.defenses}` : '');
  }, onFinish);

  useEffect(() => {
    if (!publish) return;
    const cur = state.current;
    publish({
      icon: item.icon, title: meta.title, status: state.status, round: state.round,
      participants: cur ? [byId(cur.kingId), byId(cur.challengerId)].filter(Boolean) : [],
      roles: [t.king, t.challenger],
      challenge: cur && state.status === 'challenge' && cur.challenge ? cur.challenge.text : null,
      scores: ps, winner: winners,
    });
  }, [state.status, state.round, state.current, state.players]);
  useEffect(() => () => publish && publish(null), []);

  const cur = state.current;
  let body;
  if (state.status === 'setup') {
    body = (
      <div className="space-y-5">
        <p className="text-sm text-white/70">{meta.howToPlay}</p>
        <PlayerSetup t={t} players={partyPlayers} onChange={setPlayers} min={minP} max={maxP} selected={selected} onSelected={setSelected} sfx={sfx} />
        {variant !== 'last' && <div className="border-t border-white/10 pt-4"><OptionPills label={t.roundsLabel} value={rounds} onChange={setRounds} options={[5, 8, 12].map((n) => ({ value: n, label: String(n) }))} /></div>}
        <button onClick={start} disabled={!canStart} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-slate-900" style={{ background: `linear-gradient(90deg, ${mode.accent}, #fde68a)` }}>👑 {t.startGame}</button>
        {!canStart && <div className="text-center text-xs text-white/55">{t.needPlayers(minP)}</div>}
      </div>
    );
  } else if (state.status === 'countdown') {
    body = <Countdown seconds={3} onDone={engine.countdownDone} play={sfx} label={`👑 ${byId(cur.kingId).name}`} />;
  } else if (state.status === 'challenge') {
    const king = byId(cur.kingId);
    const ch = byId(cur.challengerId);
    body = (
      <div className="space-y-5">
        <Versus a={king} b={ch} t={t} labelA={`👑 ${t.king} · ${t.reign(cur.reign)}`} labelB={`⚔️ ${t.challenger}`} />
        {!cur.challenge ? (
          <div className="space-y-2">
            <div className="text-center text-sm font-bold text-white/80">{t.pickChallenge}</div>
            <div className="grid gap-2">
              {cur.options.map((o) => (
                <button key={o.id} onClick={() => { sfx('click'); engine.patchCurrent({ challenge: o }); }} className="text-left rounded-2xl p-3.5 bg-black/25 border border-white/15 hover:border-white/40 btn-press font-semibold">⚔️ {o.text}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <ChallengeCard t={t} challenge={cur.challenge} accent={mode.accent} />
            <Decision hint={t.whoWon} onPick={(id) => { sfx('click'); engine.resolveRound({ winnerId: id }); }}
              options={[{ id: king.id, label: `👑 ${king.name}`, color: king.color }, { id: ch.id, label: `⚔️ ${ch.name}`, color: ch.color }]} />
            {variant !== 'challenge' && <button onClick={() => { sfx('click'); engine.patchCurrent({ challenge: bag.next() }); }} className="w-full text-xs font-bold text-white/60 hover:text-white py-1">🔁 {t.newChallenge}</button>}
          </>
        )}
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const newKing = byId(r.newKingId);
    const over = !!engine.pendingWinner;
    body = (
      <div className="space-y-5 text-center">
        <div className="text-6xl crown-float" aria-hidden="true">👑</div>
        <div className="text-2xl font-black score-pop">{r.defended ? `${t.kingStays} ${newKing.name} · ${t.reign(r.reign)}` : `${t.newKing} ${newKing.name}`}</div>
        {variant === 'last' && r.defended && <div className="text-sm text-white/70">{t.isOut(byId(r.challengerId).name)}</div>}
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.newKingId]} metric="wins" metricLabel={t.winsLabel} /></div>
        <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-slate-900" style={{ background: `linear-gradient(90deg, ${mode.accent}, #fde68a)` }}>{over ? `🏁 ${t.finish}` : `▶ ${t.nextRound}`}</button>
      </div>
    );
  } else {
    const k = winners[0];
    const st = k ? kingStats[k.id] || { defenses: 0, longest: 0 } : { defenses: 0, longest: 0 };
    body = (
      <GameResult t={t} title={t.kingOfNight} winners={winners} players={ps} metric="wins" metricLabel={t.winsLabel}
        stats={k ? [`🛡️ ${st.defenses} ${t.defenses}`, `👑 ${t.longestReign}: ${st.longest}`, `⚡ ${k.wins} ${t.winsLabel}`] : []}
        onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />
    );
  }

  return (
    <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={variant === 'last' ? null : state.settings.rounds} status={state.status} onExit={onExit}>
      {body}
    </GameShell>
  );
}
