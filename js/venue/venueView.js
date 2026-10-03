/* ============================================================
 *  Venue (MAX) — branding, venue mode with QR join and host controls, stats
 * ============================================================ */

/* QR rendered with the `qrcode-generator` library; falls back to the plain link when offline */
function QrCode({ text, size = 240 }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    setSrc(null);
    loadScript(QRCODE_URL).then(() => {
      if (!alive || typeof qrcode !== 'function') return;
      try {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        const cell = Math.max(2, Math.floor(size / qr.getModuleCount()));
        setSrc(qr.createDataURL(cell, 0));
      } catch (e) { setFailed(true); }
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [text, size]);
  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-3 shadow-2xl">
        {failed ? <div className="text-slate-900 text-xs font-mono break-all max-w-[240px]">{text}</div>
          : src ? <img src={src} alt={text} width={size} height={size} className="block rounded-lg" style={{ imageRendering: 'pixelated' }} />
          : <div style={{ width: size, height: size }} className="grid place-items-center text-slate-400 text-2xl">▦</div>}
      </div>
    </div>
  );
}

/* Field and inputCls are shared — see js/components/ui.js */

function VenueView({ t, lang, venue, setVenue, sub, session, setPlayers, stage, host, sfx, showToast, onBack, onBigScreen }) {
  const fileRef = useRef(null);
  const update = (patch) => setVenue((v) => ({ ...v, ...patch }));
  const canBrand = Entitlements.hasFeature(sub, 'venue-branding');
  const summary = sessionSummary(session);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const logo = await processLogoFile(file, t.logoErrors);
      update({ logo });
      showToast(t.venueSaved);
      sfx('coin');
    } catch (err) {
      showToast(err.message);
    }
  };
  const preview = { ...venue, enabled: true };
  const code = host.room ? host.room.code : null;

  return (
    <section className="w-full max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
        <h2 className="text-2xl font-black flex-1">🏪 {t.venue}</h2>
        <PlanBadge plan="max" t={t} />
      </div>

      {/* ---------- Branding ---------- */}
      <div className="glass rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold">🏷️ {t.venueBranding}</h3>
          <Switch checked={venue.enabled} onChange={(v) => update({ enabled: v })} label={t.enableBranding} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Field label={t.venueName}><input value={venue.name} maxLength={40} onChange={(e) => update({ name: e.target.value })} placeholder="My Beer House" className={inputCls} /></Field>
            <Field label={t.taglineLabel}><input value={venue.tagline} maxLength={60} onChange={(e) => update({ tagline: e.target.value })} placeholder="Party starts here" className={inputCls} /></Field>
            <Field label={t.venueLogo}>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} className="hidden" />
                <button onClick={() => fileRef.current && fileRef.current.click()} className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">🖼️ {t.uploadImage}</button>
                {venue.logo && <button onClick={() => update({ logo: null })} className="px-3 py-2.5 rounded-2xl text-sm text-white/60 hover:text-white">{t.removeLogo}</button>}
              </div>
              <div className="text-[11px] text-white/45 mt-1">PNG · JPG · WEBP · ≤ 4 MB</div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t.brandColor}><input type="color" value={venue.primary} onChange={(e) => update({ primary: e.target.value })} className="w-full h-10 rounded-xl bg-transparent border border-white/15 cursor-pointer" /></Field>
              <Field label={t.secondaryColor}><input type="color" value={venue.secondary} onChange={(e) => update({ secondary: e.target.value })} className="w-full h-10 rounded-xl bg-transparent border border-white/15 cursor-pointer" /></Field>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-white/55 mb-1">{t.preview}</div>
            <div className="rounded-3xl p-6 text-center border border-white/15 min-h-[220px] flex flex-col items-center justify-center gap-2" style={{ background: `radial-gradient(circle at 50% 0%, ${preview.primary}55, transparent 60%), rgba(0,0,0,0.3)` }}>
              {preview.logo ? <img src={preview.logo} alt="" className="w-24 h-24 rounded-2xl object-cover border border-white/20 shadow-xl" /> : <div className="w-24 h-24 rounded-2xl grid place-items-center text-4xl bg-white/10 border border-dashed border-white/25">🏪</div>}
              <div className="text-2xl font-black tracking-wide mt-2" style={{ color: preview.primary }}>{(preview.name || 'MY BEER HOUSE').toUpperCase()}</div>
              {preview.tagline && <div className="text-sm text-white/75">{preview.tagline}</div>}
              <div className="text-[10px] text-white/45 mt-1">{t.poweredByPG}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Venue mode ---------- */}
      <div className="glass rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold">🏪 {t.venueMode}</h3>
          {host.room && <ConnectionStatus t={t} status={host.status} />}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.tableLabel}><input value={venue.table} maxLength={12} onChange={(e) => update({ table: e.target.value })} placeholder="12" className={inputCls} /></Field>
          <Field label={t.maxPlayersLabel}><input type="number" min="2" max={MAX_PLAYERS} value={venue.maxPlayers} onChange={(e) => update({ maxPlayers: clamp(parseInt(e.target.value, 10) || 8, 2, MAX_PLAYERS) })} className={inputCls} /></Field>
        </div>

        {!host.room ? (
          <button onClick={() => { sfx('click'); host.start(); }} className="w-full py-3.5 rounded-full font-extrabold text-lg btn-press shadow-lg text-white" style={{ background: `linear-gradient(90deg, ${venue.primary}, ${venue.secondary})` }}>▶ {t.startParty}</button>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <QrCode text={joinUrl(code)} size={200} />
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="text-xs uppercase tracking-[0.3em] text-white/55">{t.room}</div>
                <div className="font-mono text-4xl font-black tracking-[0.3em]">{code}</div>
                <div className="text-xs text-white/60 break-all">{joinUrl(code)}</div>
                <div className="text-sm font-bold">👥 {session.players.length} / {venue.maxPlayers} · {host.onlineCount} {t.livePlayers}</div>
                <button onClick={async () => { if (await copyText(joinUrl(code))) showToast(t.linkCopied); }} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press">🔗 {t.shareWheel.replace(/wheel/i, '').trim() || t.share}</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/55 mb-2">🎛️ {t.hostControls}</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button onClick={() => { sfx('click'); host.setPaused(!host.paused); }} className="py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">{host.paused ? `▶ ${t.resume}` : `⏸ ${t.pause}`}</button>
                <button onClick={() => { sfx('click'); host.newCode(); }} className="py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">🔄 {t.newCode}</button>
                <button onClick={() => { sfx('click'); host.clearRemote(); }} className="py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">🧹 {t.clearPlayers}</button>
                <button onClick={() => { sfx('click'); host.end(); }} className="py-2.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border border-red-300/40 text-sm font-bold btn-press">⏹ {t.endParty}</button>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white/55 mb-2">📱 {t.remotePlayers}</div>
              {session.players.filter((p) => p.clientId).length === 0 ? (
                <div className="text-sm text-white/55 text-center py-3 border border-dashed border-white/20 rounded-2xl">{t.scanToJoin}…</div>
              ) : (
                <ul className="space-y-1">
                  {session.players.filter((p) => p.clientId).map((p) => {
                    const r = host.remote[p.clientId] || {};
                    return <li key={p.id} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 bg-black/20 ${r.online ? '' : 'opacity-50'}`}><Avatar player={p} size={28} /><span className="flex-1 font-semibold truncate">{p.name}</span><span className="text-xs">{r.ready ? '✅' : '⏳'}</span><span className={`w-2 h-2 rounded-full ${r.online ? 'bg-green-400' : 'bg-white/30'}`} /></li>;
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onBigScreen} className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">📺 {t.openBigScreen}</button>
          <button onClick={() => { const w = window.open(baseUrl() + '#bigscreen', '_blank'); if (!w) showToast(t.openBigScreen); }} className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">🪟 {t.openBigScreen} ↗</button>
        </div>
      </div>

      {/* ---------- Venue stats ---------- */}
      <div className="glass rounded-3xl p-4 sm:p-6">
        <h3 className="font-bold mb-3">📊 {t.venueStats}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[[t.gamesPlayed, summary.gamesPlayed], [t.players, summary.playerCount], [t.mostWins, summary.mostWins ? `${summary.mostWins.player.avatar} ${summary.mostWins.player.name}` : '—'], [t.mostPoints, summary.mostPoints ? `${summary.mostPoints.player.avatar} ${summary.mostPoints.player.name}` : '—']].map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-black/20 border border-white/10 p-3"><div className="text-[10px] uppercase tracking-wider text-white/50">{l}</div><div className="font-black truncate mt-0.5">{v}</div></div>
          ))}
        </div>
      </div>
    </section>
  );
}
