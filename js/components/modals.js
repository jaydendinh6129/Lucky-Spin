/* ============================================================
 *  Modals & placeholders
 * ============================================================ */

function ProModal({ t, onClose }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="pro-title" className="bg-slate-900 border border-white/15 rounded-3xl p-7 max-w-sm w-full text-center shadow-2xl animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="text-6xl mb-3" aria-hidden="true">🚀</div>
        <h3 id="pro-title" className="text-2xl font-extrabold mb-2">{t.proTitle}</h3>
        <p className="text-white/70 text-sm mb-5">{t.proBody}</p>
        <button ref={ref} onClick={onClose} className="w-full rounded-full py-3 font-bold bg-gradient-to-r from-yellow-400 to-pink-500 text-purple-950 btn-press shadow-lg">
          {t.gotIt}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
 *  Placeholder for game modes whose gameplay isn't built yet
 * ============================================================ */

function GamePlaceholder({ t, lang, mode, item, theme, onBack, onBrowse }) {
  const mt = MODE_TEXT[lang][mode.id];
  const title = gameMeta(lang, mode, item).title;
  return (
    <section className="glass w-full max-w-xl rounded-3xl p-6 sm:p-8 text-center animate-pop mt-2">
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">{mode.icon} {mt.title}</div>
      <div
        className="mx-auto mt-4 w-24 h-24 rounded-3xl grid place-items-center text-5xl border"
        style={{ background: `linear-gradient(135deg, ${mode.accent}55, ${mode.accent}12)`, borderColor: `${mode.accent}66`, boxShadow: `0 24px 60px -24px ${mode.accent}` }}
        aria-hidden="true"
      >
        {item.icon}
      </div>
      <h2 className="text-2xl sm:text-3xl font-black mt-4">{title}</h2>
      <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
        {t.comingSoon}{item.pro ? ` · ${t.pro}` : ''}
      </div>
      <p className="text-white/70 text-sm mt-4 max-w-sm mx-auto leading-relaxed">{t.comingSoonBody}</p>
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center mt-6">
        <button onClick={onBack} className={`${theme.btnClass} font-extrabold py-3 px-6 rounded-full shadow-lg btn-press`}>🎯 {t.backToSpinner}</button>
        <button onClick={onBrowse} className="font-bold py-3 px-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 btn-press">{t.pickAnother}</button>
      </div>
    </section>
  );
}
