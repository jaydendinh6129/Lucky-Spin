/* ============================================================
 *  App — global state and routing: spinner · games · party · pricing · venue
 * ============================================================ */

/* Which component plays each registry `component` key (defined in js/games/*) */
const gameComponents = () => ({
  battle: typeof BattleGame !== 'undefined' ? BattleGame : null,
  king: typeof KingGame !== 'undefined' ? KingGame : null,
  quiz: typeof QuizGame !== 'undefined' ? QuizGame : null,
  rps: typeof RpsGame !== 'undefined' ? RpsGame : null,
  fiveSecond: typeof FiveSecondGame !== 'undefined' ? FiveSecondGame : null,
  dontLaugh: typeof DontLaughGame !== 'undefined' ? DontLaughGame : null,
  reaction: typeof ReactionGame !== 'undefined' ? ReactionGame : null,
  memory: typeof MemoryGame !== 'undefined' ? MemoryGame : null,
  word: typeof WordGame !== 'undefined' ? WordGame : null,
  cards: typeof CardsGame !== 'undefined' ? CardsGame : null,
});

function App() {
  const stored = useMemo(() => loadState(), []);
  const initialLang = stored.lang || ((navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en');

  /* ---------- Persistent state ---------- */
  const [lang, setLang]           = useState(I18N[initialLang] ? initialLang : 'en');
  const [themeKey, setThemeKey]   = useState(THEMES[stored.themeKey] ? stored.themeKey : 'drinking');
  const [soundOn, setSoundOn]     = useState(stored.soundOn ?? true);
  const [haptics, setHaptics]     = useState(stored.haptics ?? true);
  const [eliminate, setEliminate] = useState(stored.eliminate ?? false);
  const [duration, setDuration]   = useState(clamp(stored.duration || 8, MIN_DURATION, MAX_DURATION));
  const [items, setItems]         = useState(() =>
    Array.isArray(stored.items) && stored.items.length ? stored.items.slice(0, MAX_ITEMS) : SAMPLE_ITEMS[initialLang === 'vi' ? 'vi' : 'en'].drinking
  );
  const [eliminated, setEliminated] = useState(Array.isArray(stored.eliminated) ? stored.eliminated : []);
  const [history, setHistory]     = useState(Array.isArray(stored.history) ? stored.history.slice(0, MAX_HISTORY) : []);
  const [lists, setLists]         = useState(Array.isArray(stored.lists) ? stored.lists : []);
  const [openModes, setOpenModes] = useState([]); // session-only: the accordion starts fully collapsed every time the sidebar opens
  const [activeGame, setActiveGame] = useState(() =>
    stored.activeGame && findGame(stored.activeGame.mode, stored.activeGame.id) ? stored.activeGame : { mode: 'spinner', id: themeKey }
  );
  const [session, setSession]     = useState(() => normalizeSession(stored.session));
  const [sub, setSub]             = useState(() => normalizeSubscription(stored.subscription));
  const [venue, setVenue]         = useState(() => normalizeVenue(stored.venue));

  /* ---------- UI state ---------- */
  const [menuOpen, setMenuOpen]   = useState(false);
  const [screen, setScreen]       = useState('play'); // play | party | pricing | venue
  const [upgrade, setUpgrade]     = useState(null);   // { plan, meta } → UpgradeModal
  const [bigScreen, setBigScreen] = useState(false);
  const [party, setParty]         = useState(false);  // full-screen party mode (spinner)
  const [toast, setToast]         = useState(null);
  const [stage, setStage]         = useState(null);   // what the current game shows on the big screen
  const [gameRun, setGameRun]     = useState(0);

  const t = I18N[lang];
  const theme = THEMES[themeKey];
  const skin = skinOf(theme);
  const themeText = THEME_TEXT[lang][themeKey];
  const activeDef = activeGame.mode !== 'spinner' ? findGame(activeGame.mode, activeGame.id) : null;
  const inGame = !!activeDef;
  const subtitle = activeDef ? `${MODE_TEXT[lang][activeDef.mode.id].title} · ${gameMeta(lang, activeDef.mode, activeDef.item).title}` : null;
  const brand = brandingActive(sub, venue) ? venue : null;

  const cfgRef = useRef({});
  cfgRef.current = { soundOn, haptics, theme };
  const sfx = useCallback((name) => { if (cfgRef.current.soundOn && SFX[name]) SFX[name](); }, []);
  const showToast = useCallback((msg, action) => setToast({ id: uid(), msg, action }), []);
  const setPlayers = useCallback((next) => setSession((s) => ({ ...s, players: typeof next === 'function' ? next(s.players) : next })), []);

  /* MAX: phones join over the network; the host (this device) stays authoritative */
  const host = typeof useHostSession === 'function' ? useHostSession({ venue, players: session.players, setPlayers, stage, sub }) : { room: null, remote: {}, status: 'offline', paused: false, setPaused: () => {}, onlineCount: 0, start: () => {}, end: () => {}, newCode: () => {}, clearRemote: () => {} };

  /* ---------- Effects ---------- */
  useEffect(() => {
    saveState({ lang, themeKey, soundOn, haptics, eliminate, duration, items, eliminated, history, lists, activeGame, session, subscription: sub, venue, hostRoom: host.room ? host.room.code : null });
  }, [lang, themeKey, soundOn, haptics, eliminate, duration, items, eliminated, history, lists, activeGame, session, sub, venue, host.room]);

  /* The game area behind the sidebar must not scroll while it is open; the accordion resets to collapsed */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (menuOpen) setOpenModes([]);
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    document.body.style.background = theme.bgGradient;
    document.body.style.backgroundAttachment = 'fixed';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.themeColor);
  }, [theme]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { applyBrandVars(venue, !!brand); }, [venue, brand]);
  /* development aid: inspect live state from the console */
  useEffect(() => { if (IS_DEV) window.__pgDebug = { stage, room: host.room, remote: host.remote, status: host.status, players: session.players.length, screen, activeGame }; });

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.action ? 5000 : 2600);
    return () => clearTimeout(id);
  }, [toast]);

  /* Swap to the matching sample list when theme/lang changes, but only if the user hasn't customised it */
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (isSampleList(itemsRef.current)) {
      setItems(SAMPLE_ITEMS[lang][themeKey] || SAMPLE_ITEMS[lang].drinking);
      setEliminated([]);
    }
  }, [themeKey, lang]);

  /* A plan change (e.g. the dev switcher) can leave a locked theme or game selected — fall back */
  useEffect(() => {
    if (!Entitlements.canPlay(sub, GAME_REGISTRY.spinner.games[themeKey])) setThemeKey('drinking');
    if (activeDef && !Entitlements.canPlay(sub, activeDef.item)) setActiveGame({ mode: 'spinner', id: 'drinking' });
    if (screen === 'venue' && !Entitlements.hasFeature(sub, 'venue-mode')) setScreen('play');
    if (bigScreen && !Entitlements.hasFeature(sub, 'big-screen')) setBigScreen(false);
  }, [sub]);

  /* A reloaded MAX host reopens its room with the same code, so connected phones simply reconnect.
   * The flag lives in sessionStorage: only the tab that hosted comes back as host, a second tab never does. */
  useEffect(() => {
    let prev = null;
    try { prev = sessionStorage.getItem('pg-host'); } catch (e) {}
    if (prev && Entitlements.hasFeature(sub, 'realtime-sync')) host.start(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Load a wheel shared via URL hash */
  useEffect(() => {
    const shared = readSharedWheel();
    if (!shared) return;
    const prevItems = itemsRef.current;
    const prevTheme = themeKey;
    setItems(shared.items);
    setEliminated([]);
    if (shared.theme) setThemeKey(shared.theme);
    setActiveGame({ mode: 'spinner', id: shared.theme || themeKey });
    window.history.replaceState(null, '', baseUrl());
    showToast(t.loadedShared, { label: t.undo, fn: () => { setItems(prevItems); setThemeKey(prevTheme); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- Spinner callbacks ---------- */
  const onSpun = useCallback((label, themeK) => {
    setHistory((prev) => [{ winner: label, theme: themeK, ts: Date.now() }, ...prev].slice(0, MAX_HISTORY));
  }, []);

  /* ---------- Games ---------- */
  const celebrateGame = useCallback(() => {
    const { theme: th, haptics: hp } = cfgRef.current;
    sfx('win');
    if (hp) vibrate([40, 60, 40, 60, 120]);
    fireConfetti(th.confettiColors);
  }, [sfx]);
  const finishGame = useCallback((entry) => setSession((s) => recordGame(s, entry)), []);
  const goPlay = () => { setScreen('play'); setMenuOpen(false); };
  const backToSpinner = () => { sfx('click'); setActiveGame({ mode: 'spinner', id: themeKey }); goPlay(); };

  /* ---------- Sidebar actions ---------- */
  const pickTheme = (k) => {
    sfx('click');
    setThemeKey(k);
    setActiveGame({ mode: 'spinner', id: k });
    setScreen('play');
  };
  /* Sidebar: mode → item. Locked items open the compact upgrade modal; themes drive the spinner; games open their screen. */
  const pickGame = (mode, item, locked) => {
    if (locked) {
      sfx('click');
      setUpgrade({ plan: Entitlements.requiredPlan(item), meta: gameMeta(lang, mode, item) });
      return;
    }
    if (mode.type === 'themes') { pickTheme(item.id); return; }
    sfx('click');
    setActiveGame({ mode: mode.id, id: item.id });
    setGameRun((n) => n + 1);
    goPlay();
  };
  const toggleMode = (id) => {
    sfx('click');
    setOpenModes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const openPricing = () => { sfx('click'); setUpgrade(null); setScreen('pricing'); setMenuOpen(false); };
  const openVenue = () => {
    sfx('click');
    if (!Entitlements.hasFeature(sub, 'venue-mode')) { setUpgrade({ plan: 'max', meta: null }); return; }
    setScreen('venue');
    setMenuOpen(false);
  };
  const openParty = () => { sfx('click'); setScreen('party'); setMenuOpen(false); };
  /* Upgrade: no payment provider yet — development builds switch the plan, production says so honestly */
  const doUpgrade = (plan) => {
    if (IS_DEV) {
      setSub(createSubscription(plan));
      setUpgrade(null);
      showToast(t.devSwitched(plan));
      return;
    }
    showToast(t.paymentsSoon);
  };
  const devSetPlan = (plan) => { setSub(createSubscription(plan)); showToast(t.devSwitched(plan)); };

  const saveList = (name) => {
    setLists((prev) => [{ id: uid(), name, items, theme: themeKey, ts: Date.now() }, ...prev.filter((l) => l.name !== name)].slice(0, MAX_SAVED));
    showToast(t.saved(name));
  };
  const loadList = (id) => {
    const l = lists.find((x) => x.id === id);
    if (!l) return;
    setItems(l.items.slice(0, MAX_ITEMS));
    setEliminated([]);
    const k = THEMES[l.theme] && Entitlements.canPlay(sub, GAME_REGISTRY.spinner.games[l.theme]) ? l.theme : themeKey;
    setThemeKey(k);
    setActiveGame({ mode: 'spinner', id: k });
    goPlay();
    showToast(t.loaded(l.name));
  };
  /* History in the sidebar follows the selected theme / game; clearing removes only that slice */
  const clearHistoryFor = (g) => {
    sfx('click');
    if (g.mode === 'spinner') setHistory((prev) => prev.filter((h) => h.theme !== g.id));
    else setSession((s) => ({ ...s, history: s.history.filter((h) => h.gameId !== g.id) }));
  };
  const deleteList = (id) => {
    const prev = lists;
    const l = lists.find((x) => x.id === id);
    setLists(lists.filter((x) => x.id !== id));
    showToast(t.deleted(l ? l.name : ''), { label: t.undo, fn: () => setLists(prev) });
  };

  /* ---------- Header actions ---------- */
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) SFX.click();
    showToast(next ? t.unmuted : t.muted);
  };
  const shareWheel = async () => {
    const url = `${baseUrl()}#w=${b64url.enc(JSON.stringify({ t: themeKey, i: items }))}`;
    if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try { await navigator.share({ title: 'Party Spinner', url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    if (await copyText(url)) showToast(t.linkCopied);
  };
  const toggleParty = () => {
    const next = !party;
    setParty(next);
    try {
      if (next && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
      if (!next && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (e) {}
  };
  const toggleBigScreen = () => {
    if (!Entitlements.hasFeature(sub, 'big-screen')) { setUpgrade({ plan: 'max', meta: null }); return; }
    setBigScreen((b) => !b);
  };

  /* ---------- Global keyboard: Esc, F, M (the spinner handles Space/Enter itself) ---------- */
  const keyCtx = useRef({});
  keyCtx.current = { upgrade, menuOpen, party, bigScreen, toggleParty, toggleSound };
  useEffect(() => {
    const onKey = (e) => {
      const k = keyCtx.current;
      const tag = e.target && e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape') {
        if (k.upgrade) setUpgrade(null);
        else if (k.menuOpen) setMenuOpen(false);
        else if (k.bigScreen) setBigScreen(false);
        else if (k.party) k.toggleParty();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === 'f' || e.key === 'F') && !k.menuOpen && !k.upgrade) k.toggleParty();
      else if (e.key === 'm' || e.key === 'M') k.toggleSound();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- Render ---------- */
  const comps = gameComponents();
  const GameComp = activeDef ? comps[activeDef.item.component] : null;
  const gameCtx = activeDef ? {
    t, lang, mode: activeDef.mode, item: activeDef.item, meta: gameMeta(lang, activeDef.mode, activeDef.item),
    modeTitle: MODE_TEXT[lang][activeDef.mode.id].title,
    players: session.players, setPlayers, sfx, haptics, theme, celebrate: celebrateGame, showToast, publish: setStage,
    onExit: backToSpinner, onChangeGame: () => setMenuOpen(true), onBackToParty: openParty, onFinish: finishGame,
  } : null;
  const keysBlocked = menuOpen || !!upgrade || screen !== 'play' || bigScreen;

  let main;
  if (screen === 'pricing') {
    main = <PricingView t={t} sub={sub} onUpgrade={doUpgrade} onBack={goPlay} />;
  } else if (screen === 'party') {
    main = <PartyView t={t} lang={lang} session={session} setSession={setSession} onBack={goPlay} sfx={sfx} />;
  } else if (screen === 'venue' && typeof VenueView !== 'undefined') {
    main = <VenueView t={t} lang={lang} venue={venue} setVenue={setVenue} sub={sub} session={session} setPlayers={setPlayers} stage={stage} host={host} sfx={sfx} showToast={showToast} onBack={goPlay} onBigScreen={toggleBigScreen} />;
  } else if (inGame) {
    main = GameComp
      ? <GameErrorBoundary key={`${activeGame.mode}/${activeGame.id}/${gameRun}`} t={t} onExit={backToSpinner}><GameComp ctx={gameCtx} /></GameErrorBoundary>
      : <GamePlaceholder t={t} lang={lang} mode={activeDef.mode} item={activeDef.item} theme={theme} onBack={backToSpinner} onBrowse={() => setMenuOpen(true)} />;
  } else {
    main = (
      <SpinnerView
        t={t} lang={lang} theme={theme} skin={skin} themeText={themeText}
        items={items} setItems={setItems} eliminated={eliminated} setEliminated={setEliminated}
        eliminate={eliminate} duration={duration} haptics={haptics} party={party}
        keysBlocked={keysBlocked} sfx={sfx} showToast={showToast} onSpun={onSpun} publish={setStage}
      />
    );
  }

  return (
    <div className="min-screen flex flex-col relative overflow-x-hidden">
      <div className="blob" style={{ background: brand ? venue.primary : theme.accent, width: '55vmax', height: '55vmax', top: '-20vmax', left: '-15vmax' }} aria-hidden="true" />
      <div className="blob b2" style={{ background: brand ? venue.secondary : theme.palette[2], width: '45vmax', height: '45vmax', bottom: '-18vmax', right: '-12vmax' }} aria-hidden="true" />

      <Header
        t={t} theme={theme} themeText={themeText} subtitle={subtitle} brand={brand}
        onMenu={() => setMenuOpen(true)} soundOn={soundOn} onToggleSound={toggleSound}
        onShareWheel={shareWheel} party={party} onToggleParty={toggleParty}
      />

      <main className={`relative z-10 flex-1 flex flex-col items-center px-4 gap-5 max-w-3xl w-full mx-auto ${party && !inGame ? 'justify-center py-4' : 'py-6'}`}>
        {main}
      </main>

      <SideMenu
        open={menuOpen} onClose={() => setMenuOpen(false)} t={t} lang={lang} setLang={setLang}
        openModes={openModes} onToggleMode={toggleMode} activeGame={screen === 'play' ? activeGame : { mode: screen, id: '' }} onPickGame={pickGame}
        sub={sub} onOpenPricing={openPricing} onDevSetPlan={devSetPlan} venue={brand} onOpenVenue={openVenue}
        session={session} onOpenParty={openParty}
        soundOn={soundOn} setSoundOn={setSoundOn} haptics={haptics} setHaptics={setHaptics}
        eliminate={eliminate} setEliminate={setEliminate} duration={duration} setDuration={setDuration}
        history={history} currentGame={activeGame} onClearHistory={clearHistoryFor}
        lists={lists} onSaveList={saveList} onLoadList={loadList} onDeleteList={deleteList} canSave={items.length > 0}
      />

      {upgrade && <UpgradeModal t={t} plan={upgrade.plan} meta={upgrade.meta} onUpgrade={doUpgrade} onClose={() => setUpgrade(null)} />}
      {bigScreen && typeof BigScreen !== 'undefined' && <BigScreen t={t} venue={brand} stage={stage} session={session} room={host.room} onClose={() => setBigScreen(false)} />}
      {host.room && screen !== 'venue' && !bigScreen && (
        <button onClick={openVenue} className="fixed z-20 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/80 border border-white/15 text-xs font-bold backdrop-blur btn-press" style={{ top: 'calc(max(0.75rem, env(safe-area-inset-top)) + 56px)' }} aria-label={t.venueMode}>
          <span className={`w-2 h-2 rounded-full ${host.status === 'online' ? 'bg-green-400' : 'bg-amber-300'}`} />📱 {host.onlineCount} · <span className="font-mono tracking-widest">{host.room.code}</span>
        </button>
      )}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

/* Phones that scanned a QR code open the lightweight player client; #bigscreen opens the TV window */
const JOIN_CODE = (location.hash.match(/[#&]join=([A-Za-z0-9]{4,8})/) || [])[1];
const IS_BIGSCREEN_WINDOW = /#bigscreen\b/.test(location.hash);
ReactDOM.createRoot(document.getElementById('root')).render(
  JOIN_CODE && typeof PlayerClient !== 'undefined' ? <PlayerClient code={JOIN_CODE.toUpperCase()} />
    : IS_BIGSCREEN_WINDOW && typeof BigScreenWindow !== 'undefined' ? <BigScreenWindow />
    : <App />
);
