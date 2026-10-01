/* ============================================================
 *  Battle — quick · best of 3 · streak · team · elimination
 *  One component; the variant only changes the rules object.
 * ============================================================ */

const topBy = (players, key) => {
  const max = Math.max(...players.map((p) => p[key]));
  return players.filter((p) => p[key] === max);
};

function BattleGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, players: partyPlayers, setPlayers, sfx, celebrate, showToast, onExit, onChangeGame, onBackToParty, onFinish, publish } = ctx;
  const variant = item.variant;
  const [minP, maxP] = item.players;
  const isDuel = variant === 'quick' || variant === 'bo3' || variant === 'elimination';

  /* ---------- setup ---------- */
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [teams, setTeams] = useState({});
  const [bestOf, setBestOf] = useState(3);
  const [rounds, setRounds] = useState(10);
  const [goal, setGoal] = useState(variant === 'streak' ? 5 : 3);
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);

  const all = CHALLENGES[lang];
  const bags = {
    duel: useBag(all.filter((c) => c.scope === 'duel'), lang),
    solo: useBag(all.filter((c) => c.scope === 'solo'), lang),
    all: useBag(all.filter((c) => c.scope === 'all'), lang),
  };

  /* ---------- rules ---------- */
  const rules = useMemo(() => ({
    countdown: 3,
    buildRound: (s) => {
      const ps = s.players;
      switch (variant) {
        case 'streak': {
          const p = ps[(s.round - 1) % ps.length];
          return { participants: [p.id], challenge: bags.solo.next() };
        }
        case 'team': {
          const scope = Random.item(['duel', 'solo', 'all']);
          const red = ps.filter((p) => s.settings.teams[p.id] === 'red');
          const blue = ps.filter((p) => s.settings.teams[p.id] === 'blue');
          const participants = scope === 'all' ? ps.map((p) => p.id) : [Random.item(red).id, Random.item(blue).id];
          return { participants, challenge: bags[scope].next(), scope };
        }
        case 'elimination': {
          let queue = (s.current && s.current.queue) || [];
          let bye = null;
          if (!queue.length) { const r = Random.pairs(ps); queue = r.pairs; bye = r.bye; }
          return { participants: queue[0], challenge: bags.duel.next(), queue: queue.slice(1), bye };
        }
        default:
          return { participants: ps.map((p) => p.id), challenge: bags.duel.next() };
      }
    },
    resolveRound: (s, outcome) => {
      let players = s.players;
      let settings = s.settings;
      const result = {};
      if (isDuel) {
        if (outcome.tie) { result.tie = true; return { players, result, settings }; }
        const loserId = s.current.participants.find((id) => id !== outcome.winnerId);
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
        const teamScores = { ...settings.teamScores, [team]: (settings.teamScores[team] || 0) + 1 };
        settings = { ...settings, teamScores };
        players = players.map((p) => (settings.teams[p.id] === team ? { ...p, score: p.score + 1, wins: p.wins + 1 } : { ...p, losses: p.losses + 1 }));
        result.team = team;
        result.teamScores = teamScores;
      }
      return { players, result, settings };
    },
    checkEnd: (s) => {
      const ps = s.players;
      switch (variant) {
        case 'quick': { const need = Math.ceil(s.settings.bestOf / 2); const w = ps.find((p) => p.wins >= need); return w ? [w] : null; }
        case 'bo3': { const w = ps.find((p) => p.wins >= 2); return w ? [w] : null; }
        case 'streak': return s.round >= s.settings.rounds ? topBy(ps, 'bestStreak') : null;
        case 'team': {
          const sc = s.settings.teamScores || {};
          const team = sc.red >= s.settings.goal ? 'red' : sc.blue >= s.settings.goal ? 'blue' : null;
          return team ? { team, players: ps.filter((p) => s.settings.teams[p.id] === team) } : null;
        }
        case 'elimination': { const active = Score.active(ps); return active.length <= 1 ? active : null; }
        default: return null;
      }
    },
  }), [variant, lang]);

  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);

  /* ---------- start / restart ---------- */
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const fullTeams = () => {
    const next = { ...teams };
    chosen.forEach((p, i) => { if (next[p.id] !== 'red' && next[p.id] !== 'blue') next[p.id] = i % 2 ? 'blue' : 'red'; });
    return next;
  };
  const teamsOk = variant !== 'team' || (() => { const tm = fullTeams(); return chosen.some((p) => tm[p.id] === 'red') && chosen.some((p) => tm[p.id] === 'blue'); })();
  const canStart = chosen.length >= minP && chosen.length <= maxP && teamsOk;
  const start = () => {
    if (!canStart) return;
    sfx('click');
    engine.startGame(chosen, { bestOf: variant === 'bo3' ? 3 : bestOf, rounds, goal, teams: fullTeams(), teamScores: { red: 0, blue: 0 } });
  };
  const decide = (outcome) => { sfx('click'); engine.resolveRound(outcome); };
  const redraw = () => {
    sfx('click');
    const scope = state.current.scope || (variant === 'streak' ? 'solo' : 'duel');
    engine.patchCurrent({ challenge: bags[scope].next() });
  };

  /* milestone / result sounds */
  useEffect(() => {
    if (state.status !== 'result' || !state.lastResult) return;
    const r = state.lastResult;
    if (r.milestone) { celebrate(); showToast(t.milestone(state.settings.goal)); }
    else if (r.tie) sfx('click');
    else sfx('ding' in SFX ? 'ding' : 'land');
  }, [state.status]);

  /* winner(s) for the result screen / history */
  const winnerInfo = useMemo(() => {
    const w = state.winner;
    if (!w) return { players: [], label: null };
    if (Array.isArray(w)) return { players: w.map((p) => byId(p.id) || p), label: null };
    return { players: w.players.map((p) => byId(p.id) || p), label: w.team === 'red' ? t.teamRed : t.teamBlue };
  }, [state.winner, state.players]);

  useRecordOnFinish(state.status, () => {
    const names = winnerInfo.label || winnerInfo.players.map((p) => p.name).join(', ');
    const summary = variant === 'team'
      ? `${names} · ${state.settings.teamScores.red}–${state.settings.teamScores.blue}`
      : isDuel && ps.length === 2 ? `${t.wonBy(names)} ${ps[0].wins}–${ps[1].wins}` : t.wonBy(names);
    return gameResultEntry(mode.id, item.id, ps, winnerInfo.players, summary);
  }, onFinish);

  /* big-screen feed */
  useEffect(() => {
    if (!publish) return;
    const cur = state.current;
    publish({
      icon: item.icon, title: meta.title, status: state.status, round: state.round,
      participants: cur ? cur.participants.map((id) => byId(id)).filter(Boolean) : [],
      challenge: cur && state.status === 'challenge' ? (cur.challenge.text) : null,
      scores: ps, winner: winnerInfo.players, winnerLabel: winnerInfo.label,
    });
  }, [state.status, state.round, state.current, state.players]);
  useEffect(() => () => publish && publish(null), []);

  /* ---------- render ---------- */
  const totalRounds = variant === 'streak' ? state.settings.rounds : null;
  const cur = state.current;
  let body;
  if (state.status === 'setup') {
    body = (
      <div className="space-y-5">
        <p className="text-sm text-white/70">{meta.howToPlay}</p>
        <PlayerSetup t={t} players={partyPlayers} onChange={setPlayers} min={minP} max={maxP} selected={selected} onSelected={setSelected}
          teams={variant === 'team' ? teams : null} onTeams={setTeams} sfx={sfx} />
        <div className="space-y-3 border-t border-white/10 pt-4">
          {variant === 'quick' && <OptionPills label={t.format} value={bestOf} onChange={setBestOf} options={[1, 3, 5].map((n) => ({ value: n, label: t.bestOf(n) }))} />}
          {variant === 'streak' && <OptionPills label={t.roundsLabel} value={rounds} onChange={setRounds} options={[6, 10, 15].map((n) => ({ value: n, label: String(n) }))} />}
          {variant === 'streak' && <OptionPills label={t.streakGoal} value={goal} onChange={setGoal} options={[3, 5, 10].map((n) => ({ value: n, label: `🔥 ${n}` }))} />}
          {variant === 'team' && <OptionPills label={t.firstTo(goal).replace(String(goal), '').trim() || t.firstTo(goal)} value={goal} onChange={setGoal} options={[3, 5, 7].map((n) => ({ value: n, label: String(n) }))} />}
        </div>
        <button onClick={start} disabled={!canStart} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #f472b6)` }}>
          ▶ {t.startGame}
        </button>
        {!canStart && <div className="text-center text-xs text-white/55">{t.needPlayers(minP)}{variant === 'team' && !teamsOk ? ` · ${t.teamRed} / ${t.teamBlue}` : ''}</div>}
      </div>
    );
  } else if (state.status === 'countdown') {
    const names = cur.participants.map((id) => byId(id)).filter(Boolean).map((p) => p.name).join(' · ');
    body = <Countdown seconds={3} onDone={engine.countdownDone} play={sfx} label={names} />;
  } else if (state.status === 'challenge') {
    const parts = cur.participants.map((id) => byId(id)).filter(Boolean);
    const teamOf = (p) => state.settings.teams[p.id];
    body = (
      <div className="space-y-5">
        {isDuel && parts.length === 2 && <Versus a={parts[0]} b={parts[1]} t={t} />}
        {variant === 'streak' && (
          <div className="flex flex-col items-center gap-2">
            <Avatar player={parts[0]} size={72} />
            <div className="text-2xl font-black">{parts[0].name}</div>
            <div className="text-sm font-bold text-orange-300">🔥 ×{parts[0].streak} · {t.streakGoal} {state.settings.goal}</div>
          </div>
        )}
        {variant === 'team' && (
          <div className="flex items-center gap-3">
            {['red', 'blue'].map((team) => (
              <div key={team} className="flex-1 rounded-2xl p-3 border" style={{ borderColor: team === 'red' ? '#f87171' : '#60a5fa', background: team === 'red' ? 'rgba(248,113,113,0.12)' : 'rgba(96,165,250,0.12)' }}>
                <div className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: team === 'red' ? '#fca5a5' : '#93c5fd' }}>{team === 'red' ? t.teamRed : t.teamBlue} · {state.settings.teamScores[team]}</div>
                <div className="flex flex-wrap gap-1">
                  {parts.filter((p) => teamOf(p) === team).map((p) => <PlayerChip key={p.id} player={p} size={30} />)}
                  {cur.scope === 'all' && <span className="text-[11px] text-white/60 self-center">{t.wholeTeam}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        {variant === 'elimination' && cur.bye && <div className="text-center text-xs text-white/60">{t.bye(byId(cur.bye) ? byId(cur.bye).name : '')}</div>}
        <ChallengeCard t={t} challenge={cur.challenge} accent={mode.accent} />
        {isDuel && parts.length === 2 && (
          <Decision hint={t.whoWon} onPick={(id) => (id === 'tie' ? decide({ tie: true }) : decide({ winnerId: id }))}
            options={[{ id: parts[0].id, label: parts[0].name, icon: parts[0].avatar, color: parts[0].color }, { id: parts[1].id, label: parts[1].name, icon: parts[1].avatar, color: parts[1].color }, { id: 'tie', label: t.tie, icon: '🤝' }]} />
        )}
        {variant === 'streak' && <Decision onPick={(id) => decide({ success: id === 'ok' })} options={[{ id: 'ok', label: t.success, icon: '✅', color: '#4ade80' }, { id: 'fail', label: t.failed, icon: '❌', color: '#f87171' }]} />}
        {variant === 'team' && <Decision hint={t.whoWon} onPick={(team) => decide({ team })} options={[{ id: 'red', label: t.teamRed, icon: '🔴', color: '#f87171' }, { id: 'blue', label: t.teamBlue, icon: '🔵', color: '#60a5fa' }]} />}
        <button onClick={redraw} className="w-full text-xs font-bold text-white/60 hover:text-white py-1">🔁 {t.newChallenge}</button>
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    let headline;
    if (r.tie) headline = `🤝 ${t.tie}`;
    else if (isDuel) headline = `${byId(r.winnerId).avatar} ${t.pointTo(byId(r.winnerId).name)}${variant === 'elimination' ? ` · ${t.isOut(byId(r.loserId).name)}` : ''}`;
    else if (variant === 'streak') headline = r.success ? `🔥 ${byId(r.playerId).name} ×${r.streak}` : `💔 ${byId(r.playerId).name} — ${t.failed}`;
    else headline = `${r.team === 'red' ? '🔴 ' + t.teamRed : '🔵 ' + t.teamBlue} +1 · ${r.teamScores.red}–${r.teamScores.blue}`;
    const over = !!engine.pendingWinner;
    body = (
      <div className="space-y-5 text-center">
        <div className="text-2xl font-black score-pop">{headline}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={r.winnerId ? [r.winnerId] : r.playerId ? [r.playerId] : []} metric={variant === 'streak' ? 'streak' : variant === 'quick' || variant === 'bo3' || variant === 'elimination' ? 'wins' : 'score'} metricLabel={variant === 'streak' ? '' : variant === 'team' ? t.pts : t.winsLabel} /></div>
        <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #f472b6)` }}>
          {over ? `🏁 ${t.finish}` : `▶ ${t.nextRound}`}
        </button>
      </div>
    );
  } else {
    const w = winnerInfo.players;
    const stats = w.length === 1
      ? [`🏆 ${w[0].score} ${t.points}`, `🔥 ${w[0].bestStreak} ${t.streakLabel}`, `⚡ ${w[0].wins} ${t.winsLabel}`]
      : variant === 'team' ? [`🔴 ${state.settings.teamScores.red}`, `🔵 ${state.settings.teamScores.blue}`] : [];
    body = (
      <GameResult t={t} winners={w} winnerLabel={winnerInfo.label} players={variant === 'team' ? null : ps} stats={stats}
        metric={variant === 'streak' ? 'score' : 'wins'} metricLabel={variant === 'streak' ? t.pts : t.winsLabel}
        onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />
    );
  }

  return (
    <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={totalRounds} status={state.status} onExit={onExit}>
      {body}
    </GameShell>
  );
}
