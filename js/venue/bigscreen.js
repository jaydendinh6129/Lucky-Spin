/* ============================================================
 *  Big Screen (MAX) — presentation mode for a TV or projector.
 *  Overlay in the host window, or a standalone window (#bigscreen) that
 *  follows the host through BroadcastChannel like any other client.
 * ============================================================ */

function BigScreen({ t, venue, stage, session, room, onClose }) {
  const players = session ? session.players : [];
  return (
    <div className="bigscreen text-white animate-fade">
      <button onClick={onClose} aria-label={t.exitBigScreen} className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 grid place-items-center btn-press"><Icon.X /></button>
      <div className="flex items-center gap-4 mb-[3vmin]">
        {venue && venue.logo && <img src={venue.logo} alt="" className="rounded-3xl object-cover border border-white/20 shadow-2xl" style={{ width: '12vmin', height: '12vmin' }} />}
        <div className="text-left">
          <div className="bs-title brand-accent">{venue ? venue.name.toUpperCase() : 'JPARTY'}</div>
          <div className="bs-sub">{venue ? (venue.tagline || t.poweredByPG) : t.panelTitle}{venue && venue.table ? ` · ${t.tableLabel} ${venue.table}` : ''}</div>
        </div>
      </div>

      {stage ? (
        <div className="w-full max-w-6xl">
          <StageView t={t} stage={{ ...stage, participants: (stage.participants || []).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color })), winner: (stage.winner || []), scores: stage.scores || [] }} big />
          {stage.scores && stage.scores.length > 1 && stage.status !== 'challenge' && (
            <div className="flex flex-wrap justify-center gap-3 mt-[4vmin]">
              {Score.leaderboard(stage.scores).slice(0, 8).map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15" style={{ fontSize: 'clamp(14px, 2.6vmin, 30px)' }}>
                  <span className="font-black text-white/50">{i + 1}</span><span>{p.avatar}</span><span className="font-bold">{p.name}</span><span className="font-black tabular-nums">{p.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-[3vmin]">
          {room && (
            <>
              <div className="bs-sub uppercase tracking-[0.3em]">{t.scanToJoin}</div>
              <QrCode text={joinUrl(room.code)} size={Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.42)} />
              <div className="font-mono bs-huge tracking-[0.25em]" style={{ fontSize: 'clamp(32px, 9vmin, 120px)' }}>{room.code}</div>
              <div className="bs-sub">{t.orEnterCode}: {joinUrl(room.code)}</div>
            </>
          )}
          <div className="bs-sub">👥 {players.length}{venue && venue.maxPlayers ? ` / ${venue.maxPlayers}` : ''}</div>
          {players.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 max-w-5xl">
              {players.map((p) => <div key={p.id} className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15" style={{ fontSize: 'clamp(14px, 2.6vmin, 30px)' }}><span>{p.avatar}</span><span className="font-bold">{p.name}</span></div>)}
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-4 text-white/35" style={{ fontSize: 'clamp(10px, 1.6vmin, 16px)' }}>{t.poweredByPG}</div>
    </div>
  );
}

/* Standalone big-screen window: a read-only client that mirrors the host over BroadcastChannel */
function BigScreenWindow() {
  const lang = (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const t = I18N[lang];
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    document.body.style.background = '#06060c';
    const stored = loadState();
    const code = stored.hostRoom || null;
    if (!code || !('BroadcastChannel' in window)) return;
    const id = 'screen-' + uid();
    const bc = new BroadcastChannel('pg-' + code);
    bc.onmessage = (e) => { const m = e.data; if (m && m.from === 'host' && (m.to === id || m.to === 'all') && m.type === RT.STATE) setSnap(m); };
    bc.postMessage({ type: RT.JOIN, name: '📺', from: id, to: 'host', screen: true });
    const ping = setInterval(() => bc.postMessage({ type: RT.PING, from: id, to: 'host' }), 8000);
    return () => { clearInterval(ping); bc.close(); };
  }, []);
  const session = snap ? { players: snap.players } : { players: [] };
  return <BigScreen t={t} venue={snap && snap.venue} stage={snap && snap.stage} session={session} room={snap && snap.code ? { code: snap.code } : null} onClose={() => window.close()} />;
}
