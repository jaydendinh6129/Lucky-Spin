/* ============================================================
 *  Party — players at the table, tonight's game history and the summary
 * ============================================================ */

function PartyView({ t, lang, session, setSession, onBack, sfx }) {
  const summary = sessionSummary(session);
  const [confirmNew, setConfirmNew] = useState(false);
  const setPlayers = (players) => setSession((s) => ({ ...s, players }));
  const clearHistory = () => { sfx('click'); setSession((s) => ({ ...s, history: [], stats: {} })); };
  const newParty = () => { sfx('click'); setSession((s) => createSession(s.players)); setConfirmNew(false); };
  const tile = (label, value, sub) => (
    <div className="rounded-2xl bg-black/20 border border-white/10 p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="font-black text-lg truncate mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-white/60 truncate">{sub}</div>}
    </div>
  );
  const who = (row, key, unit) => (row ? [`${row.player.avatar} ${row.player.name}`, `${row[key]} ${unit}`] : ['—', '']);

  return (
    <section className="w-full max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
        <h2 className="text-2xl font-black">🎉 {t.party}</h2>
      </div>

      <div className="glass rounded-3xl p-4 sm:p-6">
        <PlayerSetup t={t} players={session.players} onChange={setPlayers} min={1} max={MAX_PLAYERS} sfx={sfx} />
      </div>

      <div className="glass rounded-3xl p-4 sm:p-6">
        <h3 className="font-bold mb-3">📊 {t.partySummary}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tile(t.gamesPlayed, summary.gamesPlayed)}
          {tile(t.players, summary.playerCount)}
          {tile(t.mostWins, ...who(summary.mostWins, 'wins', t.winsLabel))}
          {tile(t.longestStreak, ...who(summary.longestStreak, 'bestStreak', t.streakLabel))}
          {tile(t.mostPlayed, ...who(summary.mostPlayed, 'games', t.games2))}
          {tile(t.mostPoints, ...who(summary.mostPoints, 'points', t.pts))}
        </div>
      </div>

      <div className="glass rounded-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">🕒 {t.gameHistory}</h3>
          {session.history.length > 0 && <button onClick={clearHistory} className="text-xs text-white/60 hover:text-white">{t.clearHistory}</button>}
        </div>
        {session.history.length === 0 ? (
          <div className="text-sm text-white/60 text-center py-6 border border-dashed border-white/20 rounded-2xl">{t.noGames}</div>
        ) : (
          <ul className="space-y-1.5 max-h-80 overflow-y-auto sb-thin pr-1">
            {session.history.map((h) => {
              const mode = GAME_REGISTRY[h.modeId];
              return (
                <li key={h.id} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2">
                  <span className="text-xl" aria-hidden="true">{mode ? mode.icon : '🎮'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{gameTitle(lang, h.modeId, h.gameId)}</div>
                    <div className="text-[11px] text-white/60 truncate">{h.summary}</div>
                  </div>
                  <span className="text-[10px] text-white/50 shrink-0">{fmtAgo(h.ts, lang)}</span>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4 border-t border-white/10 pt-4">
          {confirmNew ? (
            <div className="flex flex-col sm:flex-row items-center gap-2 text-sm">
              <span className="text-white/75 flex-1">{t.newPartyConfirm}</span>
              <button onClick={newParty} className="px-4 py-2 rounded-full bg-white text-slate-900 font-bold btn-press">{t.newParty}</button>
              <button onClick={() => setConfirmNew(false)} className="px-4 py-2 rounded-full bg-white/10 border border-white/15 font-bold btn-press">{t.maybeLater}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmNew(true)} className="w-full py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm">✨ {t.newParty}</button>
          )}
        </div>
      </div>
    </section>
  );
}
