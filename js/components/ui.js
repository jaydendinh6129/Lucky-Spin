/* ============================================================
 *  Icons
 * ============================================================ */

const Icon = {
  Menu: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
  Sound: ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {on ? (
        <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  ),
  Link: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  Expand: ({ on }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {on ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  ),
  Info: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 11v5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1.3" fill="currentColor" />
    </svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  ),
};

/* ============================================================
 *  Small UI pieces
 * ============================================================ */

function Switch({ checked, onChange, label }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="slider" />
    </label>
  );
}

function IconButton({ onClick, label, children, active }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-11 h-11 shrink-0 rounded-full grid place-items-center border btn-press
        ${active ? 'bg-white text-slate-900 border-white' : 'bg-white/10 hover:bg-white/20 border-white/15 text-white'}`}
    >
      {children}
    </button>
  );
}

function ToolBtn({ onClick, children, disabled, title }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 border border-white/15 btn-press disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
    >
      {children}
    </button>
  );
}

function Kbd({ children }) {
  return <kbd className="px-1.5 py-0.5 rounded-md bg-white/10 border border-white/20 text-[11px] font-mono">{children}</kbd>;
}

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className="fixed inset-x-0 z-[80] flex justify-center px-4 pointer-events-none" style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div key={toast.id} role="status" className="toast-in pointer-events-auto flex items-center gap-3 rounded-full bg-slate-950/90 border border-white/15 pl-4 pr-2 py-2 shadow-2xl text-sm backdrop-blur max-w-full">
        <span className="truncate">{toast.msg}</span>
        {toast.action ? (
          <button
            onClick={() => { toast.action.fn(); onDismiss(); }}
            className="shrink-0 font-bold text-yellow-300 hover:text-yellow-200 px-3 py-1 rounded-full hover:bg-white/10"
          >
            {toast.action.label}
          </button>
        ) : (
          <span className="w-2" />
        )}
      </div>
    </div>
  );
}

/* ============================================================
 *  Header
 * ============================================================ */

function Header({ t, theme, themeText, subtitle, brand, onMenu, soundOn, onToggleSound, onShareWheel, party, onToggleParty }) {
  return (
    <header
      className="sticky top-0 z-20 px-3 sm:px-4 pb-3 flex items-center gap-2 sm:gap-3 backdrop-blur-md bg-black/15 border-b border-white/10"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <span className="lg:hidden"><IconButton onClick={onMenu} label={t.openMenu}><Icon.Menu /></IconButton></span>
      <div className="flex-1 flex items-center gap-2 min-w-0">
        {brand && brand.logo ? <img src={brand.logo} alt="" className="w-9 h-9 rounded-xl object-cover border border-white/20 shrink-0" /> : <div className="text-2xl" aria-hidden="true">{theme.icon}</div>}
        <div className="min-w-0">
          <h1 className="font-extrabold tracking-wide leading-none truncate brand-accent">{brand ? brand.name : t.appName}</h1>
          <div className="text-[11px] text-white/70 truncate mt-0.5">{brand ? `${t.poweredByPG} · ${subtitle || themeText.name}` : (subtitle || `${themeText.name} · ${themeText.tagline}`)}</div>
        </div>
      </div>
      <IconButton onClick={onToggleSound} label={soundOn ? t.muted : t.unmuted}><Icon.Sound on={soundOn} /></IconButton>
      <IconButton onClick={onShareWheel} label={t.shareWheel}><Icon.Link /></IconButton>
      <IconButton onClick={onToggleParty} label={party ? t.exitParty : t.partyMode} active={party}><Icon.Expand on={party} /></IconButton>
    </header>
  );
}

/* ============================================================
 *  Side menu
 * ============================================================ */

function Section({ title, right, children }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-white/55">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}
