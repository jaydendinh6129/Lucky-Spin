/* ============================================================
 *  Player client — what a phone shows after scanning the QR code.
 *  Thin by design: join, see the current challenge / your role / the timer /
 *  the result, tap "ready". The host owns the game.
 * ============================================================ */

const CLIENT_KEY = 'pg-client';
const loadClient = () => { try { return JSON.parse(sessionStorage.getItem(CLIENT_KEY)) || {}; } catch (e) { return {}; } };
const saveClient = (data) => { try { sessionStorage.setItem(CLIENT_KEY, JSON.stringify(data)); } catch (e) {} };

function ConnectionStatus({ t, status }) {
  const map = {
    online: { icon: '✓', label: t.connected, cls: 'bg-green-500/20 border-green-300/40 text-green-200' },
    reconnecting: { icon: '⚠️', label: t.reconnecting, cls: 'bg-amber-500/20 border-amber-300/40 text-amber-100' },
    offline: { icon: '⚠️', label: t.sameDeviceOnly, cls: 'bg-white/10 border-white/20 text-white/70' },
    taken: { icon: '⚠️', label: t.reconnecting, cls: 'bg-amber-500/20 border-amber-300/40 text-amber-100' },
  };
  const s = map[status] || map.offline;
  return <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.cls}`} role="status">{s.icon} {s.label}</span>;
}

/* The live stage, shared by phones and the big screen */
function StageView({ t, stage, meId, big }) {
  if (!stage) return null;
  const me = meId && stage.participants.some((p) => p.id === meId);
  const sz = big ? 'text-[clamp(28px,6vmin,72px)]' : 'text-2xl';
  return (
    <div className="text-center space-y-4">
      <div className={`font-black tracking-wide ${sz}`}>{stage.icon} {stage.title}</div>
      {stage.round > 0 && stage.status !== 'setup' && <div className={`uppercase tracking-[0.3em] text-white/60 ${big ? 'text-[clamp(14px,2.5vmin,28px)]' : 'text-xs'}`}>{t.round} {String(stage.round).padStart(2, '0')}{stage.total ? ` / ${stage.total}` : ''}</div>}
      {stage.participants.length > 0 && stage.status !== 'finished' && (
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {stage.participants.map((p, i) => (
            <React.Fragment key={p.id}>
              {i > 0 && stage.participants.length === 2 && <span className={`font-black italic text-white/40 ${big ? 'text-[clamp(20px,4vmin,48px)]' : 'text-xl'}`}>{t.vs}</span>}
              <div className="flex flex-col items-center gap-1">
                <Avatar player={p} size={big ? 96 : 56} ring={p.id === meId ? '#fff' : undefined} />
                <div className={`font-black ${big ? 'text-[clamp(20px,4vmin,48px)]' : 'text-base'}`}>{p.name}</div>
                {stage.roles && stage.roles[i] && <div className="text-[11px] uppercase tracking-wider text-white/60">{stage.roles[i]}</div>}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
      {me && stage.status === 'challenge' && <div className="inline-block px-4 py-1.5 rounded-full bg-yellow-300 text-yellow-900 font-black text-sm pulse-soft">⚡ {t.youAreUp}</div>}
      {stage.challenge && stage.status === 'challenge' && <p className={`font-black leading-snug ${big ? 'text-[clamp(22px,5vmin,64px)] max-w-5xl mx-auto' : 'text-lg'}`}>{stage.challenge}</p>}
      {stage.timerMs != null && stage.status === 'challenge' && <div className={`font-black tabular-nums ${big ? 'text-[clamp(60px,14vmin,180px)] leading-none' : 'text-5xl'} ${stage.timerMs < 3000 ? 'text-red-300' : ''}`}>{String(Math.ceil(stage.timerMs / 1000)).padStart(2, '0')}</div>}
      {stage.status === 'finished' && stage.winner.length > 0 && (
        <div className="space-y-2">
          <div className={big ? 'text-[clamp(40px,10vmin,120px)] crown-float' : 'text-5xl crown-float'}>👑</div>
          {stage.winnerLabel && <div className="uppercase tracking-[0.3em] text-white/70">{stage.winnerLabel}</div>}
          <div className={`font-black ${big ? 'text-[clamp(32px,8vmin,96px)]' : 'text-3xl'}`}>{stage.winner.map((p) => `${p.avatar} ${p.name}`).join(' · ')}</div>
        </div>
      )}
    </div>
  );
}

function PlayerClient({ code }) {
  const saved = loadClient();
  const lang = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const t = I18N[lang];
  const [clientId] = useState(() => saved.clientId || uid());
  const [name, setName] = useState(saved.code === code ? saved.name || '' : '');
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState('reconnecting'); // what the user sees: online while the host is talking to us
  const [snap, setSnap] = useState(null);
  const [full, setFull] = useState(false);
  const [ended, setEnded] = useState(false);
  const transport = useRef(null);
  const nameRef = useRef(name);
  nameRef.current = name;
  const lastSeen = useRef(0);
  const joinedRef = useRef(false);
  joinedRef.current = joined;

  useEffect(() => {
    document.body.style.background = 'linear-gradient(135deg, #0f172a 0%, #312e81 60%, #831843 100%)';
    const rejoin = () => { const c = loadClient(); if (joinedRef.current && c.code === code && c.name) transport.current.send({ type: RT.JOIN, name: c.name }); };
    transport.current = createPlayerTransport(code, clientId, {
      onMessage: (m) => {
        lastSeen.current = Date.now();
        setStatus('online');
        if (m.type === RT.STATE) { setSnap(m); setEnded(false); }
        else if (m.type === RT.FULL) setFull(true);
        else if (m.type === RT.END) { setEnded(true); setJoined(false); }
        else if (m.type === RT.REJOIN) rejoin();
      },
      onStatus: () => {},
      onReconnect: rejoin,
    });
    /* auto re-join after a reload — same client id, so the host keeps our player */
    if (saved.code === code && saved.name) { setJoined(true); joinedRef.current = true; transport.current.send({ type: RT.JOIN, name: saved.name }); }
    /* heartbeat + watchdog: silence from the host for 15 s means "reconnecting", and we introduce ourselves again */
    const ping = setInterval(() => {
      transport.current.send({ type: RT.PING });
      if (Date.now() - lastSeen.current > 15000) { setStatus('reconnecting'); rejoin(); }
    }, 6000);
    const bye = () => transport.current && transport.current.send({ type: RT.LEAVE });
    window.addEventListener('pagehide', bye);
    return () => { clearInterval(ping); window.removeEventListener('pagehide', bye); bye(); transport.current.close(); };
  }, []);

  const join = () => {
    const n = name.trim();
    if (!n) return;
    saveClient({ clientId, code, name: n });
    setJoined(true);
    setFull(false);
    transport.current.send({ type: RT.JOIN, name: n });
  };
  const mine = snap ? snap.players.find((p) => p.remote && p.name === name.trim()) : null;
  useEffect(() => { if (IS_DEV) window.__pgClient = { snap, status, joined, clientId }; });
  const toggleReady = () => { if (!mine) return; transport.current.send({ type: RT.READY, ready: !mine.ready }); };
  const venue = snap && snap.venue;
  const readyCount = snap ? snap.players.filter((p) => p.ready).length : 0;

  return (
    <div className="min-screen flex flex-col items-center px-4 py-6 gap-4 max-w-md mx-auto text-white">
      <header className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {venue && venue.logo ? <img src={venue.logo} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/20" /> : <span className="text-2xl">🎉</span>}
          <div className="min-w-0">
            <div className="font-extrabold truncate">{venue ? venue.name : 'Party Games'}</div>
            <div className="text-[11px] text-white/60 truncate">{venue ? t.poweredByPG : `${t.room} ${code}`}{venue && venue.table ? ` · ${t.tableLabel} ${venue.table}` : ''}</div>
          </div>
        </div>
        <ConnectionStatus t={t} status={status} />
      </header>

      {ended ? (
        <div className="glass rounded-3xl p-6 text-center w-full"><div className="text-5xl">👋</div><div className="font-black text-xl mt-3">{t.hostLeft}</div></div>
      ) : !joined ? (
        <div className="glass rounded-3xl p-6 w-full space-y-4">
          <div className="text-center"><div className="text-5xl">🎉</div><h1 className="text-2xl font-black mt-2">{t.joinParty}</h1><div className="text-xs text-white/60 mt-1">{t.room}: <span className="font-mono font-black tracking-[0.3em] text-white">{code}</span></div></div>
          <label className="block text-sm font-semibold">{t.yourName}
            <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') join(); }} placeholder="Minh" className="mt-1 w-full rounded-full px-4 py-3 bg-black/25 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40 text-lg" />
          </label>
          {full && <div className="text-sm text-amber-200 text-center">⚠️ {t.partyCode} — full</div>}
          <button onClick={join} disabled={!name.trim()} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg disabled:opacity-40 bg-gradient-to-r from-pink-500 to-violet-500">{t.join}</button>
        </div>
      ) : (
        <>
          {snap && snap.paused && <div className="w-full text-center text-sm font-bold px-3 py-2 rounded-2xl bg-amber-400/20 border border-amber-300/40">⏸ {t.paused}</div>}
          <div className="glass rounded-3xl p-5 w-full">
            {snap && snap.stage ? (
              <StageView t={t} stage={snap.stage} meId={mine ? mine.id : null} />
            ) : (
              <div className="text-center space-y-2"><div className="text-5xl">✓</div><div className="font-black text-xl">{t.joined}</div><div className="text-sm text-white/60">{t.waitingHost}</div></div>
            )}
          </div>
          <div className="glass rounded-3xl p-4 w-full">
            <div className="flex items-center justify-between mb-2 text-xs text-white/60"><span>👥 {t.players}</span><span>{t.readyCount(readyCount, snap ? snap.players.length : 0)}</span></div>
            <ul className="space-y-1">
              {(snap ? snap.players : []).map((p) => (
                <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${mine && p.id === mine.id ? 'bg-white/15' : 'bg-black/20'} ${p.online ? '' : 'opacity-50'}`}>
                  <Avatar player={p} size={28} /><span className="flex-1 font-semibold truncate">{p.name}</span>
                  {p.remote && <span className="text-[10px] text-white/50">📱</span>}
                  <span className="text-sm">{p.ready ? '✅' : '⏳'}</span>
                </li>
              ))}
            </ul>
            <button onClick={toggleReady} disabled={!mine} className={`mt-3 w-full py-3 rounded-full font-extrabold btn-press disabled:opacity-40 ${mine && mine.ready ? 'bg-white/15 border border-white/20' : 'bg-gradient-to-r from-green-500 to-emerald-400 text-slate-900'}`}>{mine && mine.ready ? `✅ ${t.ready}` : `👍 ${t.ready}`}</button>
          </div>
          <button onClick={() => { transport.current.send({ type: RT.LEAVE }); saveClient({}); setJoined(false); }} className="text-xs text-white/50 hover:text-white">{t.leave}</button>
        </>
      )}
      <div className="text-[10px] text-white/35 mt-auto">{t.poweredByPG}</div>
    </div>
  );
}
