/* ============================================================
 *  Sidebar — game-mode accordion with ⓘ popovers, party, settings and plan
 * ============================================================ */

const CAN_HOVER = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)').matches : false;

/* ⓘ popover. Hover opens it on devices that support hover, a tap pins it everywhere.
 * Rendered through a portal so the sidebar's scroll/overflow can never clip it,
 * and it flips to whichever side of the button still fits in the viewport. */
function GameInfoPopover({ t, meta, locked, anchorRef, open, onClose, onHoverChange }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const a = anchorRef.current && anchorRef.current.getBoundingClientRect();
      const el = ref.current;
      if (!a || !el) return;
      const w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 10, pad = 8;
      let side = 'right';
      let x = a.right + gap;
      let y = a.top + a.height / 2 - h / 2;
      if (x + w > vw - pad) { side = 'left'; x = a.left - gap - w; }
      if (x < pad) {
        x = clamp(a.left + a.width / 2 - w / 2, pad, vw - w - pad);
        side = a.bottom + gap + h <= vh - pad ? 'bottom' : 'top';
        y = side === 'bottom' ? a.bottom + gap : a.top - gap - h;
      }
      y = clamp(y, pad, vh - h - pad);
      setPos({ x, y, side, ax: a.left + a.width / 2 - x, ay: a.top + a.height / 2 - y });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if ((ref.current && ref.current.contains(e.target)) || (anchorRef.current && anchorRef.current.contains(e.target))) return;
      onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  if (!open) return null;
  const arrow = pos && {
    right:  { left: -7, top: pos.ay - 6, transform: 'rotate(-45deg)' },
    left:   { right: -7, top: pos.ay - 6, transform: 'rotate(135deg)' },
    bottom: { top: -7, left: pos.ax - 6, transform: 'rotate(45deg)' },
    top:    { bottom: -7, left: pos.ax - 6, transform: 'rotate(225deg)' },
  }[pos.side];
  const [minP, maxP] = meta.players;
  return ReactDOM.createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="popover text-left"
      onMouseEnter={() => onHoverChange && onHoverChange(true)}
      onMouseLeave={() => onHoverChange && onHoverChange(false)}
      style={{ left: pos ? pos.x : -9999, top: pos ? pos.y : -9999, visibility: pos ? 'visible' : 'hidden' }}
    >
      {arrow && <span className="popover-arrow" style={arrow} aria-hidden="true" />}
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{meta.icon}</span>
        <div className="font-black text-sm tracking-wide uppercase flex-1 truncate">{meta.title}</div>
        <PlanBadge plan={meta.plan} locked={locked} t={t} />
      </div>
      <p className="text-sm text-white/85 mt-2 leading-snug">{meta.description}</p>
      {meta.howToPlay && <p className="text-xs text-white/60 mt-1.5 leading-snug">{meta.howToPlay}</p>}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 text-[11px] text-white/75">
        <span>👥 {t.playersRange(minP, maxP)}</span>
        <span>⏱️ {meta.duration}</span>
        <span>🏆 {t.scoringLabels[meta.scoring]}</span>
        <span>🎚️ {t.difficultyLabels[meta.difficulty]}</span>
      </div>
      {locked && <div className="mt-3 text-[11px] font-bold text-amber-200">🔒 {t.availableWith(meta.plan)}</div>}
    </div>,
    document.body
  );
}

/* One playable row: select on the left, ⓘ on the right (two separate buttons) */
function GameItem({ t, lang, mode, item, active, locked, onPick }) {
  const meta = useMemo(() => gameMeta(lang, mode, item), [lang, mode, item]);
  const infoRef = useRef(null);
  const closeTimer = useRef(0);
  const [info, setInfo] = useState(false);
  const [pinned, setPinned] = useState(false);
  const th = mode.type === 'themes' ? THEMES[item.id] : null;

  const close = () => { clearTimeout(closeTimer.current); setInfo(false); setPinned(false); };
  const cancelClose = () => clearTimeout(closeTimer.current);
  const scheduleClose = () => {
    if (pinned) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setInfo(false), 160);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  return (
    <li className={`game-item flex items-center rounded-xl border ${active ? 'active border-white/30' : 'border-transparent'}`}>
      <button
        onClick={() => onPick(mode, item, locked)}
        aria-pressed={active}
        className="flex-1 min-w-0 min-h-[44px] flex items-center gap-2.5 pl-2 pr-1 py-1.5 text-left rounded-xl"
      >
        <span className="w-8 h-8 shrink-0 rounded-lg grid place-items-center text-base border border-white/15" style={{ background: th ? th.bgGradient : 'rgba(255,255,255,0.06)' }} aria-hidden="true">{item.icon}</span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm leading-tight ${active ? 'font-bold text-white' : 'font-semibold text-white/85'}`}>{meta.title}</span>
          {th && <span className="block text-[11px] text-white/50 truncate mt-0.5">{meta.description}</span>}
        </span>
        <PlanBadge plan={meta.plan} locked={locked} t={t} />
        {active && <span className="w-5 h-5 rounded-full bg-white text-slate-900 grid place-items-center text-[11px] font-black shrink-0 ml-1" aria-hidden="true">✓</span>}
      </button>
      <button
        ref={infoRef}
        aria-label={t.gameInfo}
        aria-expanded={info}
        onClick={(e) => { e.stopPropagation(); if (info && pinned) close(); else { cancelClose(); setInfo(true); setPinned(true); } }}
        onMouseEnter={() => { if (CAN_HOVER) { cancelClose(); setInfo(true); } }}
        onMouseLeave={() => { if (CAN_HOVER) scheduleClose(); }}
        className="info-btn w-9 h-9 shrink-0 grid place-items-center rounded-full text-white/80 hover:bg-white/10 mr-0.5"
      >
        <Icon.Info />
      </button>
      <GameInfoPopover
        t={t} meta={meta} locked={locked} anchorRef={infoRef} open={info} onClose={close}
        onHoverChange={(inside) => { if (!CAN_HOVER) return; if (inside) cancelClose(); else scheduleClose(); }}
      />
    </li>
  );
}

function GameModeAccordion({ t, lang, mode, open, onToggle, activeGame, sub, onPickGame }) {
  const mt = MODE_TEXT[lang][mode.id];
  const hasActive = activeGame.mode === mode.id;
  return (
    <div className={`rounded-2xl border bg-white/5 overflow-hidden transition-colors ${hasActive ? 'border-white/25' : 'border-white/10'}`} style={{ '--acc': mode.accent }}>
      <button onClick={onToggle} aria-expanded={open} className="w-full min-h-[56px] flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 btn-press">
        <span className="w-10 h-10 shrink-0 rounded-xl grid place-items-center text-xl border" style={{ background: `linear-gradient(135deg, ${mode.accent}40, ${mode.accent}10)`, borderColor: `${mode.accent}55` }} aria-hidden="true">{mode.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-bold leading-tight">{mt.title}</span>
          <span className="block text-xs text-white/55 truncate mt-0.5">{mt.desc}</span>
        </span>
        {hasActive && !open && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: mode.accent }} aria-hidden="true" />}
        <svg className={`chev shrink-0 text-white/60 ${open ? 'open' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={`acc-body ${open ? 'open' : ''}`} inert={open ? undefined : ''}>
        <div>
          <div className="px-2.5 pb-2.5 border-t border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 px-1.5 pt-2.5 pb-1.5">{mode.type === 'themes' ? t.themesLabel : t.gamesLabel}</div>
            <ul className="space-y-1">
              {mode.items.map((item) => (
                <GameItem key={item.id} t={t} lang={lang} mode={mode} item={item} active={hasActive && activeGame.id === item.id} locked={!Entitlements.canPlay(sub, item)} onPick={onPickGame} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0"><div className="font-semibold">{title}</div>{desc && <div className="text-xs text-white/60">{desc}</div>}</div>
      {children}
    </div>
  );
}

function SideMenu({
  open, onClose, t, lang, setLang, openModes, onToggleMode, activeGame, onPickGame,
  sub, onOpenPricing, onDevSetPlan, venue, onOpenVenue, session, onOpenParty,
  soundOn, setSoundOn, haptics, setHaptics, eliminate, setEliminate, duration, setDuration,
  history, onClearHistory, lists, onSaveList, onLoadList, onDeleteList, canSave,
}) {
  const [name, setName] = useState('');
  const closeRef = useRef(null);
  useEffect(() => { if (open) setTimeout(() => closeRef.current && closeRef.current.focus(), 50); }, [open]);

  const stats = useMemo(() => {
    const counts = {};
    history.forEach((h) => { counts[h.winner] = (counts[h.winner] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [history]);
  const maxCount = stats.length ? stats[0][1] : 1;
  const save = () => {
    if (!name.trim() || !canSave) return;
    onSaveList(name.trim().slice(0, 40));
    setName('');
  };
  const venueLocked = !Entitlements.hasFeature(sub, 'venue-mode');

  return (
    <>
      <div className={`fixed inset-0 z-30 menu-backdrop transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} aria-hidden="true" />
      <aside
        className={`fixed top-0 left-0 z-40 w-[88vw] max-w-sm bg-slate-950/95 text-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ height: '100dvh', maxHeight: '100dvh' }}
        aria-hidden={!open}
        inert={open ? undefined : ''}
        role="dialog"
        aria-label={t.panelTitle}
      >
        <header className="flex items-center justify-between px-4 pb-4 border-b border-white/10 shrink-0" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <h2 className="text-lg font-extrabold flex items-center gap-2 min-w-0">
            {venue && venue.logo ? <img src={venue.logo} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/20" /> : <span aria-hidden="true">🎉</span>}
            <span className="truncate">{venue ? venue.name : t.panelTitle}</span>
          </h2>
          <button ref={closeRef} onClick={onClose} aria-label={t.close} className="w-10 h-10 rounded-full hover:bg-white/10 grid place-items-center btn-press shrink-0"><Icon.X /></button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain sb-thin p-4 space-y-7">
          {/* Game modes — rendered from the registry */}
          <Section title={t.gameModes}>
            <div className="space-y-2">
              {GAME_MODES.map((mode) => (
                <GameModeAccordion key={mode.id} t={t} lang={lang} mode={mode} open={openModes.includes(mode.id)} onToggle={() => onToggleMode(mode.id)} activeGame={activeGame} sub={sub} onPickGame={onPickGame} />
              ))}
            </div>
          </Section>

          {/* Party */}
          <Section title={t.party}>
            <button onClick={onOpenParty} className="w-full rounded-2xl p-3.5 text-left bg-white/5 border border-white/10 hover:border-white/30 btn-press">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold">🎉 {t.managePlayers}</div>
                  <div className="text-xs text-white/60 truncate">{t.playersAtTable(session.players.length)} · {session.history.length} {t.games2}</div>
                </div>
                <span className="text-white/50">›</span>
              </div>
              {session.players.length > 0 && (
                <div className="flex -space-x-2 mt-2.5">
                  {session.players.slice(0, 8).map((p) => <Avatar key={p.id} player={p} size={28} />)}
                  {session.players.length > 8 && <span className="w-7 h-7 rounded-full bg-white/15 grid place-items-center text-[11px] font-bold">+{session.players.length - 8}</span>}
                </div>
              )}
            </button>
          </Section>

          {/* Settings */}
          <Section title={t.settings}>
            <div className="space-y-4 bg-white/5 rounded-2xl p-4 border border-white/10">
              <SettingRow title={`🔊 ${t.sound}`} desc={t.soundDesc}><Switch checked={soundOn} onChange={setSoundOn} label={t.sound} /></SettingRow>
              {'vibrate' in navigator && <SettingRow title={`📳 ${t.haptics}`} desc={t.hapticsDesc}><Switch checked={haptics} onChange={setHaptics} label={t.haptics} /></SettingRow>}
              <SettingRow title={`☠️ ${t.eliminate}`} desc={t.eliminateDesc}><Switch checked={eliminate} onChange={setEliminate} label={t.eliminate} /></SettingRow>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold">⏱️ {t.duration}</div>
                  <div className="text-xs text-white/80 tabular-nums font-bold">{duration}s</div>
                </div>
                <input type="range" min={MIN_DURATION} max={MAX_DURATION} step="1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} aria-label={t.duration} />
                <div className="flex justify-between text-[10px] text-white/50 mt-1"><span>{MIN_DURATION}s</span><span>{MAX_DURATION}s</span></div>
              </div>
              <div>
                <div className="font-semibold mb-2">🌐 {t.language}</div>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-black/30 border border-white/10">
                  {LANGS.map((l) => (
                    <button key={l.key} onClick={() => setLang(l.key)} aria-pressed={lang === l.key} className={`py-1.5 rounded-full text-sm font-semibold btn-press ${lang === l.key ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}>{l.label}</button>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 space-y-3">
                <button onClick={onOpenVenue} className="w-full flex items-center justify-between gap-3 text-left btn-press rounded-xl -mx-1 px-1 py-1 hover:bg-white/5">
                  <div><div className="font-semibold">🏪 {t.venue}</div><div className="text-xs text-white/60">{t.venueMode}</div></div>
                  <span className="flex items-center gap-2"><PlanBadge plan="max" locked={venueLocked} t={t} /><span className="text-white/50">›</span></span>
                </button>
                <PlanIndicator t={t} sub={sub} onOpenPricing={onOpenPricing} />
                <DevPlanSwitcher t={t} sub={sub} onSet={onDevSetPlan} />
              </div>
            </div>
          </Section>

          {/* Saved wheels */}
          <Section title={t.myWheels}>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-3">
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} placeholder={t.namePlaceholder} aria-label={t.saveCurrent} maxLength={40}
                  className="flex-1 min-w-0 rounded-full px-3.5 py-2 text-sm bg-black/30 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40" />
                <button onClick={save} disabled={!name.trim() || !canSave} className="px-4 rounded-full bg-white text-slate-900 text-sm font-bold btn-press disabled:opacity-40">{t.save}</button>
              </div>
              {lists.length === 0 ? (
                <div className="text-xs text-white/50 text-center py-1">{t.noWheels}</div>
              ) : (
                <ul className="space-y-1.5">
                  {lists.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2">
                      <span aria-hidden="true">{THEMES[l.theme] ? THEMES[l.theme].icon : '🎯'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{l.name}</div>
                        <div className="text-[11px] text-white/50 truncate">{t.itemsShort(l.items.length)} · {l.items.slice(0, 3).join(', ')}</div>
                      </div>
                      <button onClick={() => onLoadList(l.id)} className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 btn-press">{t.load}</button>
                      <button onClick={() => onDeleteList(l.id)} aria-label={`${t.del} ${l.name}`} className="w-7 h-7 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10"><Icon.X /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Section>

          {/* Spin history & stats */}
          <Section title={t.history} right={history.length > 0 && <button onClick={onClearHistory} className="text-xs text-white/60 hover:text-white">{t.clearHistory}</button>}>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-3">
              {history.length === 0 ? (
                <div className="text-xs text-white/50 text-center py-2">{t.noHistory}</div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-white/55 mb-2"><span>{t.topPicks}</span><span>{t.totalSpins(history.length)}</span></div>
                    <div className="space-y-1.5">
                      {stats.map(([label, count]) => (
                        <div key={label} className="flex items-center gap-2 text-xs">
                          <span className="w-24 truncate font-medium" title={label}>{label}</span>
                          <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-pink-400" style={{ width: `${(count / maxCount) * 100}%` }} /></div>
                          <span className="w-5 text-right tabular-nums text-white/70">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <ul className="space-y-1.5 border-t border-white/10 pt-3 max-h-60 overflow-y-auto sb-thin">
                    {history.slice(0, 20).map((h, idx) => (
                      <li key={idx} className="flex items-center justify-between text-sm gap-2">
                        <span className="flex items-center gap-2 min-w-0"><span aria-hidden="true">{THEMES[h.theme] ? THEMES[h.theme].icon : '🎯'}</span><span className="font-medium truncate">{h.winner}</span></span>
                        <span className="text-[10px] text-white/50 shrink-0">{h.ts ? fmtAgo(h.ts, lang) : h.when}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </Section>

          {/* Shortcuts */}
          <Section title={t.shortcuts}>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-white/75">{t.scSpin}</span><span><Kbd>Space</Kbd> / <Kbd>Enter</Kbd></span></div>
              <div className="flex justify-between"><span className="text-white/75">{t.scParty}</span><Kbd>F</Kbd></div>
              <div className="flex justify-between"><span className="text-white/75">{t.scMute}</span><Kbd>M</Kbd></div>
              <div className="flex justify-between"><span className="text-white/75">{t.scClose}</span><Kbd>Esc</Kbd></div>
            </div>
          </Section>

          <footer className="pt-4 text-center border-t border-white/10" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5">
              <span className="text-[11px] text-white/50">{t.poweredBy}</span>
              <span className="jj-badge font-black text-base tracking-widest leading-none">JJ</span>
              <span className="text-sm leading-none" aria-hidden="true">⚡</span>
            </div>
            <div className="text-[10px] text-white/35 mt-2">v{APP_VERSION} — made for parties 🎉</div>
          </footer>
        </div>
      </aside>
    </>
  );
}
