/* ============================================================
 *  Shared game UI — avatars, player setup, countdown, timers,
 *  scoreboard, challenge card, host decisions and the result screen
 * ============================================================ */

function Avatar({ player, size = 40, ring }) {
  return (
    <span
      className={`inline-grid place-items-center rounded-full shrink-0 ${player.eliminated ? 'eliminated' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.5, background: `${player.color}33`, border: `2px solid ${ring || player.color}`, boxShadow: ring ? `0 0 0 3px ${ring}55` : 'none' }}
      aria-hidden="true"
    >
      {player.avatar}
    </span>
  );
}

function PlayerChip({ player, size = 36, label, muted, ring }) {
  return (
    <span className={`inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-black/25 border border-white/10 max-w-full ${muted ? 'opacity-50' : ''}`}>
      <Avatar player={player} size={size - 8} ring={ring} />
      <span className="font-bold text-sm truncate max-w-[140px]">{player.name}</span>
      {label && <span className="text-xs text-white/60 shrink-0">{label}</span>}
    </span>
  );
}

/* MINH  vs  LINH */
function Versus({ a, b, t, labelA, labelB }) {
  const side = (p, label) => (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
      <Avatar player={p} size={64} />
      <div className="font-black text-lg truncate max-w-full">{p.name}</div>
      {label && <div className="text-[11px] uppercase tracking-wider text-white/60">{label}</div>}
    </div>
  );
  return (
    <div className="flex items-center gap-3">
      {side(a, labelA)}
      <div className="text-2xl font-black text-white/50 italic shrink-0">{t.vs}</div>
      {side(b, labelB)}
    </div>
  );
}

/* Pill selector for setup options */
function OptionPills({ label, options, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-sm font-semibold text-white/80">{label}</span>
      <div className="flex gap-1 p-1 rounded-full bg-black/30 border border-white/10">
        {options.map((o) => (
          <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
            className={`px-3 py-1.5 rounded-full text-sm font-bold btn-press ${value === o.value ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Manage the party's players and choose who plays this game.
 * selected: ids playing · teams: { id: 'red'|'blue' } when the game uses teams */
function PlayerSetup({ t, players, onChange, min, max, selected, onSelected, teams, onTeams, sfx }) {
  const [name, setName] = useState('');
  const selectable = !!onSelected;
  const add = () => {
    const v = name.trim();
    if (!v || players.length >= MAX_PLAYERS) return;
    const p = createPlayer(v, players);
    onChange([...players, p]);
    if (selectable && selected.length < max) onSelected([...selected, p.id]);
    setName('');
    sfx && sfx('click');
  };
  const toggle = (id) => {
    if (!selectable) return;
    if (selected.includes(id)) onSelected(selected.filter((x) => x !== id));
    else if (selected.length < max) onSelected([...selected, id]);
    else if (max === 1) onSelected([id]);
  };
  const cycleTeam = (id) => onTeams && onTeams({ ...teams, [id]: teams[id] === 'red' ? 'blue' : 'red' });
  const autoTeams = () => {
    const ids = shuffleArr(selected);
    const next = {};
    ids.forEach((id, i) => { next[id] = i % 2 === 0 ? 'red' : 'blue'; });
    onTeams(next);
  };
  const count = selectable ? selected.length : players.length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">👥 {t.players} <span className="text-xs font-medium text-white/60">{count}/{max >= 100 ? '∞' : max}</span></h3>
        <div className="flex gap-1.5">
          {players.length > 1 && <ToolBtn onClick={() => { onChange(shuffleArr(players)); sfx && sfx('click'); }}>🔀 {t.shuffleOrder}</ToolBtn>}
          {teams && selected.length > 1 && <ToolBtn onClick={autoTeams}>🎲 {t.autoTeams}</ToolBtn>}
        </div>
      </div>
      <div className="flex gap-2">
        <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t.playerName} aria-label={t.playerName}
          className="flex-1 min-w-0 rounded-full px-4 py-2.5 bg-black/25 placeholder-white/45 border border-white/15 focus:outline-none focus:border-white/40" />
        <button onClick={add} disabled={!name.trim() || players.length >= MAX_PLAYERS} className="px-5 rounded-full bg-white text-slate-900 font-bold btn-press disabled:opacity-50">{t.addPlayer}</button>
      </div>
      {players.length === 0 ? (
        <div className="text-sm text-white/60 text-center py-5 border border-dashed border-white/20 rounded-2xl">{t.needPlayers(min)}</div>
      ) : (
        <ul className="space-y-1.5">
          {players.map((p) => {
            const on = !selectable || selected.includes(p.id);
            return (
              <li key={p.id} className={`flex items-center gap-2 rounded-2xl px-2 py-1.5 border ${on ? 'bg-white/8 border-white/15' : 'bg-black/15 border-transparent opacity-60'}`} style={on ? { background: 'rgba(255,255,255,0.06)' } : undefined}>
                <button onClick={() => toggle(p.id)} aria-pressed={on} aria-label={`${p.name}: ${on ? t.playing : ''}`}
                  className={`flex items-center gap-2 flex-1 min-w-0 text-left ${selectable ? 'btn-press' : 'cursor-default'}`}>
                  <Avatar player={p} size={34} />
                  <input value={p.name} maxLength={24} onClick={(e) => e.stopPropagation()} onChange={(e) => onChange(renamePlayer(players, p.id, e.target.value))}
                    aria-label={t.playerName}
                    className="flex-1 min-w-0 bg-transparent font-semibold text-sm focus:outline-none border-b border-transparent focus:border-white/40 py-1" />
                </button>
                {teams && on && (
                  <button onClick={() => cycleTeam(p.id)} className="text-[10px] font-black tracking-wider px-2 py-1 rounded-full btn-press"
                    style={{ background: teams[p.id] === 'blue' ? 'rgba(96,165,250,0.35)' : 'rgba(248,113,113,0.35)', border: `1px solid ${teams[p.id] === 'blue' ? '#60a5fa' : '#f87171'}` }}>
                    {teams[p.id] === 'blue' ? t.teamBlue : t.teamRed}
                  </button>
                )}
                {selectable && <span className={`w-5 h-5 rounded-full grid place-items-center text-[11px] font-black shrink-0 ${on ? 'bg-white text-slate-900' : 'border border-white/30'}`} aria-hidden="true">{on ? '✓' : ''}</span>}
                <button onClick={() => { onChange(removePlayer(players, p.id)); if (selectable) onSelected(selected.filter((x) => x !== p.id)); }} aria-label={`${t.del} ${p.name}`}
                  className="w-8 h-8 grid place-items-center rounded-full text-white/45 hover:text-white hover:bg-white/10 shrink-0"><Icon.X /></button>
              </li>
            );
          })}
        </ul>
      )}
      {selectable && players.length > max && <div className="text-[11px] text-white/50 text-center">{t.includeHint}</div>}
    </div>
  );
}

/* 3 · 2 · 1 · GO! */
function Countdown({ seconds = 3, onDone, play, label }) {
  const [n, setN] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (n > 0) play && play('tick');
    else play && play('land');
    const id = setTimeout(() => (n > 0 ? setN(n - 1) : doneRef.current()), n > 0 ? 850 : 550);
    return () => clearTimeout(id);
  }, [n]);
  return (
    <div className="grid place-items-center min-h-[220px] text-center">
      {label && <div className="text-sm text-white/70 font-semibold mb-2">{label}</div>}
      <div key={n} className="count-pop text-8xl font-black drop-shadow-lg" aria-live="assertive">{n > 0 ? n : 'GO!'}</div>
    </div>
  );
}

/* Ring timer with the seconds in the middle */
function TimerRing({ ms, total, size = 96, color = '#fff', urgent = 3000 }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const p = total ? ms / total : 0;
  const col = ms <= urgent && ms > 0 ? '#f87171' : color;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }} role="timer" aria-label={`${Math.ceil(ms / 1000)}s`}>
      <svg viewBox="0 0 100 100" className="timer-ring absolute inset-0 w-full h-full">
        <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.15)" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r={r} stroke={col} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
      </svg>
      <span className={`relative font-black tabular-nums ${ms <= urgent && ms > 0 ? 'text-red-300 pulse-soft' : ''}`} style={{ fontSize: size * 0.34 }}>{Math.ceil(ms / 1000)}</span>
    </div>
  );
}

function ScoreBoard({ t, players, highlight = [], metric = 'score', metricLabel, compact }) {
  const list = metric === 'time'
    ? [...players].sort((a, b) => (a.bestMs ?? Infinity) - (b.bestMs ?? Infinity))
    : Score.leaderboard(players);
  const value = (p) => {
    if (metric === 'time') return p.bestMs != null ? fmtSeconds(p.bestMs) : '—';
    if (metric === 'streak') return `🔥 ${p.streak}`;
    if (metric === 'wins') return p.wins;
    return p.score;
  };
  return (
    <ul className={`space-y-1 ${compact ? 'text-sm' : ''}`}>
      {list.map((p, i) => (
        <li key={p.id} className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 ${highlight.includes(p.id) ? 'bg-white/15 ring-1 ring-white/30' : 'bg-black/20'} ${p.eliminated ? 'opacity-60' : ''}`}>
          <span className="w-5 text-center text-xs font-bold text-white/50 tabular-nums">{i + 1}</span>
          <Avatar player={p} size={compact ? 26 : 32} />
          <span className="flex-1 min-w-0 font-semibold truncate">{p.name} {p.eliminated && <span className="text-[10px] text-white/50">☠️</span>}</span>
          {metric !== 'streak' && p.streak > 1 && <span className="text-[11px] text-orange-300 font-bold">🔥{p.streak}</span>}
          <span className="font-black tabular-nums">{value(p)} <span className="text-[10px] font-semibold text-white/50">{metricLabel || ''}</span></span>
        </li>
      ))}
    </ul>
  );
}

/* The challenge text, with the non-drinking alternative always one tap away */
function ChallengeCard({ t, challenge, accent, kicker }) {
  const [alt, setAlt] = useState(false);
  useEffect(() => setAlt(false), [challenge && challenge.id]);
  if (!challenge) return null;
  return (
    <div className="rounded-3xl p-5 sm:p-6 bg-black/25 border border-white/15 text-center slide-up" style={{ boxShadow: `0 20px 50px -30px ${accent || '#fff'}` }}>
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{kicker || t.challenge}</div>
      <p className="text-xl sm:text-2xl font-black mt-2 leading-snug">{alt && challenge.alt ? challenge.alt : challenge.text}</p>
      {challenge.drink && (
        <>
          <button onClick={() => setAlt(!alt)} className="mt-3 text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press">
            {alt ? `🍻 ${t.showOriginal}` : `🎭 ${t.nonDrinking}`}
          </button>
          <div className="mt-2 text-[11px] text-white/50">💧 {t.drinkNote}</div>
        </>
      )}
    </div>
  );
}

/* Big buttons for the host's decision */
function Decision({ options, onPick, hint }) {
  return (
    <div className="space-y-2">
      {hint && <div className="text-center text-xs text-white/60 font-semibold">{hint}</div>}
      <div className={`grid gap-2 ${options.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {options.map((o) => (
          <button key={o.id} onClick={() => onPick(o.id)}
            className="min-h-[56px] rounded-2xl px-4 py-3 font-extrabold text-base btn-press border border-white/20 flex items-center justify-center gap-2 truncate"
            style={{ background: o.color ? `${o.color}33` : 'rgba(255,255,255,0.1)', borderColor: o.color ? `${o.color}99` : undefined }}>
            {o.icon && <span aria-hidden="true">{o.icon}</span>}<span className="truncate">{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Frame around every game: back button, title, round pill */
function GameShell({ t, modeTitle, meta, round, totalRounds, status, onExit, extra, children }) {
  return (
    <section className="w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={onExit} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press shrink-0">← {t.games}</button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
          <div className="min-w-0">
            <div className="font-extrabold truncate leading-tight brand-accent">{meta.title}</div>
            <div className="text-[11px] text-white/60 truncate">{modeTitle}</div>
          </div>
        </div>
        {extra}
        {round > 0 && status !== 'setup' && status !== 'finished' && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 shrink-0">{t.round} {round}{totalRounds ? `/${totalRounds}` : ''}</span>
        )}
      </div>
      <div className="glass rounded-3xl p-4 sm:p-6">{children}</div>
    </section>
  );
}

/* Consistent end-of-game screen */
function GameResult({ t, title, winners, winnerLabel, players, stats = [], metric, metricLabel, onPlayAgain, onChangeGame, onBackToParty, celebrate }) {
  useEffect(() => { celebrate && celebrate(); }, []);
  const list = winners || [];
  return (
    <div className="text-center">
      <div className="text-[11px] uppercase tracking-[0.3em] text-white/60">🎉 {title || t.gameComplete}</div>
      <div className="text-6xl mt-3 crown-float" aria-hidden="true">👑</div>
      {winnerLabel && <div className="text-xs uppercase tracking-[0.25em] text-white/70 mt-2">{winnerLabel}</div>}
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {list.map((p) => (
          <div key={p.id} className="flex flex-col items-center gap-1 score-pop">
            <Avatar player={p} size={64} ring="#fff" />
            <div className="text-2xl sm:text-3xl font-black">{p.name}</div>
          </div>
        ))}
      </div>
      <div className="text-xs uppercase tracking-[0.25em] text-white/55 mt-1">{list.length > 1 ? t.winners : t.winner}</div>
      {stats.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mt-4 border-t border-white/10 pt-4">
          {stats.map((s, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-black/25 border border-white/10 text-sm font-bold">{s}</span>
          ))}
        </div>
      )}
      {players && players.length > 1 && (
        <div className="mt-4 text-left"><ScoreBoard t={t} players={players} highlight={list.map((p) => p.id)} metric={metric} metricLabel={metricLabel} compact /></div>
      )}
      <div className="flex flex-col gap-2.5 mt-6">
        <button onClick={onPlayAgain} className="font-extrabold py-3 rounded-full shadow-lg btn-press text-lg tracking-wide text-white" style={{ background: 'linear-gradient(90deg, var(--brand-primary, #f472b6), var(--brand-secondary, #22d3ee))' }}>🔁 {t.playAgain}</button>
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={onChangeGame} className="font-bold py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 btn-press text-sm">🎮 {t.changeGame}</button>
          <button onClick={onBackToParty} className="font-bold py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 btn-press text-sm">🎉 {t.backToParty}</button>
        </div>
      </div>
    </div>
  );
}

/* A crash inside one game must never take the whole party down */
class GameErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('[game]', error); }
  render() {
    if (!this.state.error) return this.props.children;
    const { t, onExit } = this.props;
    return (
      <section className="glass w-full max-w-xl rounded-3xl p-6 text-center">
        <div className="text-5xl" aria-hidden="true">🙈</div>
        <h2 className="text-xl font-black mt-3">Oops</h2>
        <p className="text-sm text-white/70 mt-2">{String(this.state.error && this.state.error.message || this.state.error)}</p>
        <button onClick={onExit} className="mt-5 px-6 py-3 rounded-full bg-white text-slate-900 font-extrabold btn-press">🎯 {t.backToSpinner}</button>
      </section>
    );
  }
}

/* Record the game in the party session exactly once when it finishes */
function useRecordOnFinish(status, buildEntry, onFinish) {
  const done = useRef(false);
  useEffect(() => {
    if (status === 'finished' && !done.current) { done.current = true; onFinish(buildEntry()); }
    if (status !== 'finished') done.current = false;
  }, [status]);
}
