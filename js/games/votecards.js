/* ============================================================
 *  Vote cards — Most Likely To · Never Have I Ever · Would You Rather
 *  One card for the whole table at a time. The host records what the
 *  table did (who got pointed at, who raised a hand, who picked A or B)
 *  and the engine scores it. No single "current player": it is the
 *  party answering together, the way these games are really played.
 * ============================================================ */

function VoteCardsGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, players: partyPlayers, setPlayers, sfx, celebrate, onExit, onChangeGame, onBackToParty, onFinish, publish } = ctx;
  const deckKey = item.deck;                      // likely | never | rather
  const [minP, maxP] = item.players;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [count, setCount] = useState(10);
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);
  const deck = useMemo(() => buildVoteDeck(deckKey, lang), [deckKey, lang]);
  const bag = useBag(deck, `vote-${deckKey}-${lang}`);
  const tm = CARD_TYPE_META[deckKey];

  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: () => ({ card: bag.next(), picks: {} }),
    resolveRound: (s, { picks }) => {
      let players = s.players;
      const result = { deck: deckKey, picks };
      if (deckKey === 'rather') {
        /* everyone picks a side; the smaller side owes a quick dare, the bigger side scores */
        const a = s.players.filter((p) => picks[p.id] === 'a').map((p) => p.id);
        const b = s.players.filter((p) => picks[p.id] === 'b').map((p) => p.id);
        const minority = a.length === b.length ? [] : a.length < b.length ? a : b;
        const majority = a.length === b.length ? [] : a.length < b.length ? b : a;
        majority.forEach((id) => { players = Score.addPoints(players, id, 1); });
        Object.assign(result, { a, b, minority, majority, tie: a.length === b.length });
      } else {
        /* likely: the player(s) with the most fingers · never: everyone who HAS done it */
        const ids = s.players.filter((p) => picks[p.id]).map((p) => p.id);
        ids.forEach((id) => { players = Score.addPoints(Score.incrementStreak(players, id), id, 1); });
        s.players.forEach((p) => { if (!picks[p.id]) players = Score.resetStreak(players, p.id); });
        result.ids = ids;
      }
      return { players, result };
    },
    checkEnd: (s) => (s.round >= s.settings.count ? Score.leaders(s.players) : null),
  }), [deckKey, lang]);

  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const byId = (id) => Score.byId(ps, id);
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  const start = () => { if (!canStart) return; sfx('click'); engine.startGame(chosen, { count }); };
  const cur = state.current;

  /* the host taps players on the card screen. A ref mirrors the latest picks so two
   * quick taps in the same render do not overwrite each other. */
  const picks = (cur && cur.picks) || {};
  const picksRef = useRef(picks);
  useEffect(() => { picksRef.current = picks; }, [cur && cur.picks]);
  const toggle = (id) => {
    sfx('click');
    const next = { ...picksRef.current };
    if (deckKey === 'rather') next[id] = next[id] === 'a' ? 'b' : next[id] === 'b' ? null : 'a';
    else next[id] = !next[id];
    if (!next[id]) delete next[id];
    picksRef.current = next;
    engine.patchCurrent({ picks: next });
  };
  const reveal = () => { sfx('win'); engine.resolveRound({ picks }); };
  const redraw = () => { sfx('whoosh'); engine.patchCurrent({ card: bag.next(), picks: {} }); };
  const everyoneVoted = deckKey !== 'rather' || ps.every((p) => picks[p.id]);

  useEffect(() => {
    if (state.status !== 'result') return;
    const r = state.lastResult;
    if (r.deck === 'rather' && r.minority.length) sfx('land'); else sfx('coin' in SFX ? 'coin' : 'win');
  }, [state.status]);

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map((p) => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);

  const cardText = (card) => (deckKey === 'rather' ? `${card.a} / ${card.b}` : `${t.votePrefix[deckKey]} ${card.text}`);
  useEffect(() => {
    if (!publish) return;
    publish({ icon: item.icon, title: meta.title, status: state.status, round: state.round, total: state.settings.count,
      participants: [], challenge: cur && state.status === 'challenge' ? cardText(cur.card) : null, scores: ps, winner: winners });
  }, [state.status, state.round, cur && cur.card, state.players]);
  useEffect(() => () => publish && publish(null), []);

  const Card = ({ card, children }) => (
    <div className="rounded-3xl p-5 sm:p-6 border-2 text-center slide-up card-shine" style={{ background: `linear-gradient(160deg, ${tm.color}55, rgba(0,0,0,0.45))`, borderColor: `${tm.color}cc`, boxShadow: `0 20px 50px -30px ${tm.color}` }}>
      <div className="text-[11px] font-black tracking-[0.25em] uppercase" style={{ color: tm.color }}>{tm.icon} {meta.title}</div>
      {deckKey === 'rather' ? (
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="rounded-2xl p-3 bg-black/30 border border-white/15"><div className="text-[10px] font-black text-white/50">A</div><div className="font-black text-base sm:text-lg leading-snug">{card.a}</div></div>
          <div className="text-white/50 font-black text-sm">{t.or}</div>
          <div className="rounded-2xl p-3 bg-black/30 border border-white/15"><div className="text-[10px] font-black text-white/50">B</div><div className="font-black text-base sm:text-lg leading-snug">{card.b}</div></div>
        </div>
      ) : (
        <p className="text-xl sm:text-2xl font-black mt-2 leading-snug"><span className="text-white/60">{t.votePrefix[deckKey]}</span> {card.text}</p>
      )}
      {children}
    </div>
  );

  let body;
  if (state.status === 'setup') {
    body = (
      <div className="space-y-5">
        <p className="text-sm text-white/70">{meta.howToPlay}</p>
        <PlayerSetup t={t} players={partyPlayers} onChange={setPlayers} min={minP} max={maxP} selected={selected} onSelected={setSelected} sfx={sfx} />
        <div className="border-t border-white/10 pt-4"><OptionPills label={t.cardsLabel} value={count} onChange={setCount} options={[8, 10, 15, 20].map((n) => ({ value: n, label: String(n) }))} /></div>
        <button onClick={start} disabled={!canStart} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white" style={{ background: `linear-gradient(90deg, ${tm.color}, #a78bfa)` }}>{tm.icon} {t.startGame}</button>
        {!canStart && <div className="text-center text-xs text-white/55">{t.needPlayers(minP)}</div>}
      </div>
    );
  } else if (state.status === 'challenge') {
    body = (
      <div className="space-y-4">
        <Card card={cur.card} />
        <div className="space-y-2">
          <div className="text-center text-sm font-bold text-white/80">{t.voteHint[deckKey]}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ps.map((p) => {
              const v = picks[p.id];
              const on = !!v;
              const color = deckKey === 'rather' ? (v === 'a' ? '#60a5fa' : v === 'b' ? '#f472b6' : null) : (on ? tm.color : null);
              return (
                <button key={p.id} onClick={() => toggle(p.id)} aria-pressed={on}
                  className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 border-2 btn-press text-left ${on ? '' : 'bg-white/5 border-white/15 opacity-80'}`}
                  style={on ? { background: `${color}33`, borderColor: color } : undefined}>
                  <Avatar player={p} size={32} ring={on ? color : undefined} />
                  <span className="flex-1 min-w-0 font-bold truncate">{p.name}</span>
                  <span className="w-7 h-7 rounded-full grid place-items-center text-sm font-black shrink-0" style={on ? { background: color, color: '#0f172a' } : { background: 'rgba(255,255,255,0.1)' }}>
                    {deckKey === 'rather' ? (v ? v.toUpperCase() : '·') : on ? '✓' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <Decision onPick={reveal} options={[{ id: 'reveal', label: `👁 ${t.revealAnswer}${!everyoneVoted ? ` · ${t.notEveryone}` : ''}`, color: tm.color }]} />
        <button onClick={redraw} className="w-full text-xs font-bold text-white/60 hover:text-white py-1">🔁 {t.newChallenge}</button>
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const over = !!engine.pendingWinner;
    let headline, detail = null;
    if (r.deck === 'rather') {
      headline = r.tie ? `🤝 ${t.tie} · ${r.a.length}–${r.b.length}` : `A ${r.a.length} – ${r.b.length} B`;
      detail = (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[['a', r.a, '#60a5fa', cur.card.a], ['b', r.b, '#f472b6', cur.card.b]].map(([k, ids, color, label]) => (
              <div key={k} className="rounded-2xl p-3 border" style={{ background: `${color}1f`, borderColor: `${color}66` }}>
                <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color }}>{k.toUpperCase()} · {ids.length}</div>
                <div className="text-xs text-white/80 mb-2 leading-snug">{label}</div>
                <div className="flex flex-wrap gap-1">{ids.map((id) => <Avatar key={id} player={byId(id)} size={28} />)}</div>
              </div>
            ))}
          </div>
          {r.minority.length > 0 && <div className="text-sm text-center rounded-2xl bg-amber-400/15 border border-amber-300/40 px-3 py-2">😅 {t.minorityDare(r.minority.map((id) => byId(id).name).join(', '))}</div>}
        </div>
      );
    } else {
      const names = r.ids.map((id) => byId(id).name);
      headline = r.ids.length === 0 ? (r.deck === 'never' ? `😇 ${t.nobodyHas}` : `🤷 ${t.noVotes}`) : r.deck === 'likely' ? `👉 ${names.join(', ')}` : `🙋 ${t.nHave(r.ids.length)}`;
      detail = r.ids.length > 0 && <div className="flex flex-wrap justify-center gap-1.5">{r.ids.map((id) => <PlayerChip key={id} player={byId(id)} />)}</div>;
    }
    body = (
      <div className="space-y-4 text-center">
        <div className="text-2xl font-black score-pop">{headline}</div>
        {detail}
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={r.deck === 'rather' ? r.majority : r.ids} metricLabel={t.pts} compact /></div>
        <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${tm.color}, #a78bfa)` }}>{over ? `🏁 ${t.finish}` : `${tm.icon} ${t.nextCard}`}</button>
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metricLabel={t.pts} stats={w ? [`🏆 ${w.score} ${t.points}`, `🔥 ${w.bestStreak} ${t.bestStreakLabel}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={state.settings.count} status={state.status} onExit={onExit}>{body}</GameShell>;
}
