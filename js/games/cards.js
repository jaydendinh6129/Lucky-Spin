/* ============================================================
 *  Cards — draw · reveal · resolve · apply effect · continue
 *  Wild and chaos cards are real state mutations: turn order, direction,
 *  multipliers, shields and targets all live in the engine settings.
 * ============================================================ */

function CardsGame({ ctx }) {
  const { t, lang, mode, item, meta, modeTitle, players: partyPlayers, setPlayers, sfx, celebrate, showToast, onExit, onChangeGame, onBackToParty, onFinish, publish } = ctx;
  const [minP, maxP] = item.players;
  const [selected, setSelected] = useState(() => defaultSelection(partyPlayers, item.players));
  const [count, setCount] = useState(12);
  useEffect(() => { setSelected((sel) => sel.filter((id) => partyPlayers.some((p) => p.id === id))); }, [partyPlayers]);
  const deck = useMemo(() => buildDeck(item.deck, lang), [item.deck, lang]);
  const bag = useBag(deck, `${item.deck}-${lang}`);

  const rules = useMemo(() => ({
    countdown: 0,
    buildRound: (s) => {
      const st = s.settings;
      const playerId = st.forcedTarget || st.order[st.idx];
      return { playerId, card: bag.next(), phase: 'draw', everyone: !!st.everyone, forced: !!st.forcedTarget };
    },
    resolveRound: (s, outcome) => {
      const st = { ...s.settings, forcedTarget: null, everyone: false };
      const cur = s.current;
      const me = cur.playerId;
      let players = s.players;
      const result = { playerId: me, type: cur.card.type, title: cur.card.title };
      const n = st.order.length;
      const advance = () => { st.idx = nextActiveIndex(st.order.map((id) => Score.byId(players, id)), st.idx, st.dir); };

      /* multiplier for this card: personal DOUBLE and/or a DOUBLE ROUND */
      let mult = 1;
      if (st.doubleFor === me) mult *= 2;
      if (st.roundMult > 0) mult *= 2;

      if (outcome.type === 'done' || outcome.type === 'shield') {
        if (outcome.type === 'shield') st.shields = { ...st.shields, [me]: Math.max(0, (st.shields[me] || 0) - 1) };
        const targets = cur.everyone ? players.map((p) => p.id) : [me];
        targets.forEach((id) => { players = Score.addPoints(Score.incrementStreak(players, id), id, mult); });
        if (st.doubleFor === me) st.doubleFor = null;
        result.points = mult;
        result.everyone = cur.everyone;
        advance();
      } else if (outcome.type === 'skip') {
        players = Score.resetStreak(players, me);
        result.skipped = true;
        advance();
      } else if (outcome.type === 'effect') {
        const eff = cur.card.effect;
        result.effect = eff;
        switch (eff) {
          case 'respin': break; // same player draws again — no advance
          case 'target': st.forcedTarget = outcome.targetId; result.targetId = outcome.targetId; advance(); break;
          case 'shield': st.shields = { ...st.shields, [me]: (st.shields[me] || 0) + 1 }; advance(); break;
          case 'switch': {
            const a = st.order.indexOf(me), b = st.order.indexOf(outcome.targetId);
            const order = [...st.order]; order[a] = outcome.targetId; order[b] = me; st.order = order; result.targetId = outcome.targetId;
            break; // the swapped-in player now sits at idx and takes the next card
          }
          case 'double': st.doubleFor = me; advance(); break;
          case 'everyone': st.everyone = true; advance(); break;
          case 'swap': st.order = shuffleArr(st.order); st.idx = 0; break;
          case 'reverse': st.dir = -st.dir; advance(); break;
          case 'doubleRound': st.roundMult = n + 1; advance(); break;
          case 'randomTarget': { const tgt = Random.player(players, { exclude: [me] }) || Score.byId(players, me); st.forcedTarget = tgt.id; result.targetId = tgt.id; advance(); break; }
          default: advance();
        }
      }
      if (st.roundMult > 0) st.roundMult -= 1;
      return { players, result, settings: st };
    },
    checkEnd: (s) => (s.round >= s.settings.count ? Score.leaders(s.players) : null),
  }), [item.deck, lang]);

  const engine = useGameEngine(rules);
  const { state } = engine;
  const ps = state.players;
  const st = state.settings;
  const byId = (id) => Score.byId(ps, id);
  const chosen = partyPlayers.filter((p) => selected.includes(p.id));
  const canStart = chosen.length >= minP && chosen.length <= maxP;
  const start = () => {
    if (!canStart) return;
    sfx('click');
    engine.startGame(chosen, { count, order: chosen.map((p) => p.id), idx: 0, dir: 1, shields: {}, doubleFor: null, roundMult: 0, forcedTarget: null, everyone: false });
  };
  const cur = state.current;
  const [picking, setPicking] = useState(false);

  const draw = () => { sfx('whoosh'); engine.patchCurrent({ phase: 'reveal' }); };
  const act = (type, extra = {}) => { sfx('click'); setPicking(false); engine.resolveRound({ type, ...extra }); };
  useEffect(() => {
    if (state.status !== 'result') return;
    const r = state.lastResult;
    if (r.effect) { sfx('win'); showToast(`✨ ${t.effectApplied}`); }
    else if (r.points) sfx('coin' in SFX ? 'coin' : 'land');
  }, [state.status]);

  const winners = state.winner ? state.winner.map((p) => byId(p.id) || p) : [];
  useRecordOnFinish(state.status, () => gameResultEntry(mode.id, item.id, ps, winners, `${winners.map((p) => p.name).join(', ')} · ${winners[0] ? winners[0].score : 0} ${t.pts}`), onFinish);
  useEffect(() => {
    if (!publish) return;
    publish({ icon: item.icon, title: meta.title, status: state.status, round: state.round, total: st.count, participants: cur ? [byId(cur.playerId)].filter(Boolean) : [], challenge: cur && state.status === 'challenge' && cur.phase === 'reveal' ? `${cur.card.title}: ${cur.card.content}` : null, scores: ps, winner: winners });
  }, [state.status, state.round, cur, state.players]);
  useEffect(() => () => publish && publish(null), []);

  const typeMeta = (type) => CARD_TYPE_META[type] || CARD_TYPE_META.challenge;
  const effectNote = (r) => {
    const name = r.targetId ? byId(r.targetId).name : '';
    return { respin: t.extraTurn, target: t.targetIs(name), shield: t.shieldGained, switch: t.targetIs(name), double: t.doubleOn, everyone: t.everyoneTurn, swap: t.swapped, reverse: t.reversed, doubleRound: t.doubleOn, randomTarget: t.targetIs(name) }[r.effect] || t.effectApplied;
  };

  let body;
  if (state.status === 'setup') {
    body = (
      <div className="space-y-5">
        <p className="text-sm text-white/70">{meta.howToPlay}</p>
        <PlayerSetup t={t} players={partyPlayers} onChange={setPlayers} min={minP} max={maxP} selected={selected} onSelected={setSelected} sfx={sfx} />
        <div className="border-t border-white/10 pt-4"><OptionPills label={t.cardsLabel} value={count} onChange={setCount} options={[8, 12, 20].map((n) => ({ value: n, label: String(n) }))} /></div>
        <button onClick={start} disabled={!canStart} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #f472b6)` }}>🃏 {t.startGame}</button>
        {!canStart && <div className="text-center text-xs text-white/55">{t.needPlayers(minP)}</div>}
      </div>
    );
  } else if (state.status === 'challenge') {
    const p = byId(cur.playerId);
    const card = cur.card;
    const tm = typeMeta(card.type);
    const isEffect = card.type === 'wild' || card.type === 'chaos';
    const needsTarget = isEffect && (card.effect === 'target' || card.effect === 'switch');
    const shields = st.shields[p.id] || 0;
    const mult = (st.doubleFor === p.id ? 2 : 1) * (st.roundMult > 0 ? 2 : 1);
    body = (
      <div className="space-y-4">
        {/* turn order */}
        <div className="flex items-center gap-1.5 overflow-x-auto sb-thin pb-1">
          <span className="text-[10px] uppercase tracking-wider text-white/50 shrink-0">{t.turnOrder} {st.dir < 0 ? '⟲' : '⟳'}</span>
          {st.order.map((id) => { const q = byId(id); return q ? <span key={id} className={`shrink-0 ${id === p.id ? 'ring-2 ring-white rounded-full' : 'opacity-70'}`}><Avatar player={q} size={30} /></span> : null; })}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <PlayerChip player={p} label={cur.everyone ? `· ${t.everyoneTurn}` : cur.forced ? '🎯' : ''} />
          <div className="flex gap-1.5 text-[11px] font-bold">
            {mult > 1 && <span className="px-2 py-1 rounded-full bg-yellow-300/20 border border-yellow-300/50 text-yellow-200">2× {t.doubleOn}</span>}
            {shields > 0 && <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">🛡️ {shields}</span>}
            <span className="px-2 py-1 rounded-full bg-white/10 border border-white/20">{t.cardsLeft(st.count - state.round + 1)}</span>
          </div>
        </div>

        {/* the card */}
        <div className="flip-scene mx-auto" style={{ width: 'min(100%, 320px)', height: 220 }}>
          <div className={`flip-card rounded-3xl ${cur.phase === 'reveal' ? 'flipped' : ''}`}>
            <button onClick={draw} disabled={cur.phase === 'reveal'} className="flip-face rounded-3xl w-full h-full grid place-items-center border-2 card-shine btn-press" style={{ background: `linear-gradient(135deg, ${tm.color}66, ${tm.color}22)`, borderColor: `${tm.color}aa` }}>
              <div className="text-center"><div className="text-6xl">🃏</div><div className="font-black tracking-widest mt-2">{t.drawCard}</div></div>
            </button>
            <div className="flip-face back rounded-3xl p-5 border-2 flex flex-col text-left" style={{ background: `linear-gradient(160deg, ${tm.color}55, rgba(0,0,0,0.5))`, borderColor: `${tm.color}cc` }}>
              <div className="flex items-center justify-between text-[11px] font-black tracking-widest uppercase" style={{ color: tm.color }}><span>{tm.icon} {card.type}</span>{card.difficulty && <span className="text-white/60">{t.difficultyLabels[card.difficulty]}</span>}</div>
              <div className="text-2xl font-black mt-2">{card.title}</div>
              <p className="text-sm text-white/85 mt-1.5 leading-snug flex-1">{card.drink && cur.alt ? card.alt : card.content}</p>
              {card.drink && <button onClick={() => engine.patchCurrent({ alt: !cur.alt })} className="self-start mt-2 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/15">{cur.alt ? `🍻 ${t.showOriginal}` : `🎭 ${t.nonDrinking}`}</button>}
            </div>
          </div>
        </div>

        {cur.phase === 'reveal' && (
          picking ? (
            <div className="space-y-2">
              <div className="text-center text-sm font-bold">{t.chooseTarget}</div>
              <div className="grid grid-cols-2 gap-2">
                {ps.filter((q) => q.id !== p.id).map((q) => (
                  <button key={q.id} onClick={() => act('effect', { targetId: q.id })} className="flex items-center gap-2 rounded-2xl px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/15 btn-press"><Avatar player={q} size={30} /><span className="font-bold truncate">{q.name}</span></button>
                ))}
              </div>
            </div>
          ) : isEffect ? (
            <Decision onPick={() => (needsTarget ? setPicking(true) : act('effect'))} options={[{ id: 'apply', label: `✨ ${card.title}`, color: tm.color }]} />
          ) : (
            <Decision onPick={(id) => act(id)} options={[
              { id: 'done', label: `${t.done} +${mult}`, icon: '✅', color: '#4ade80' },
              { id: 'skip', label: t.skip, icon: '⏭️' },
              ...(shields > 0 ? [{ id: 'shield', label: t.useShield, color: '#60a5fa' }] : []),
            ]} />
          )
        )}
      </div>
    );
  } else if (state.status === 'result') {
    const r = state.lastResult;
    const p = byId(r.playerId);
    body = (
      <div className="space-y-5 text-center">
        <div className="text-5xl">{r.effect ? '✨' : r.skipped ? '⏭️' : '✅'}</div>
        <div className="text-2xl font-black score-pop">{r.effect ? effectNote(r) : r.skipped ? `${p.name} — ${t.skip}` : r.everyone ? `${t.everyoneTurn} +${r.points}` : `+${r.points} ${p.name}`}</div>
        <div className="text-left"><ScoreBoard t={t} players={ps} highlight={[r.targetId || r.playerId]} metricLabel={t.pts} compact /></div>
        <button onClick={() => { sfx('click'); engine.nextRound(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${mode.accent}, #f472b6)` }}>{engine.pendingWinner ? `🏁 ${t.finish}` : `🃏 ${t.drawCard}`}</button>
      </div>
    );
  } else {
    const w = winners[0];
    body = <GameResult t={t} winners={winners} players={ps} metricLabel={t.pts} stats={w ? [`🏆 ${w.score} ${t.points}`, `🔥 ${w.bestStreak} ${t.bestStreakLabel}`] : []} onPlayAgain={start} onChangeGame={onChangeGame} onBackToParty={onBackToParty} celebrate={celebrate} />;
  }
  return <GameShell t={t} modeTitle={modeTitle} meta={meta} round={state.round} totalRounds={st.count} status={state.status} onExit={onExit}>{body}</GameShell>;
}
