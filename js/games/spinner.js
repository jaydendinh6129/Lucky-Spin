/* ============================================================
 *  Spinner — the original wheel experience, behaviour unchanged.
 *  Owns the spin engine, drag-to-spin, the items editor and the result card.
 * ============================================================ */

function SpinnerView({ t, lang, theme, skin, themeText, items, setItems, eliminated, setEliminated, eliminate, duration, haptics, party, keysBlocked, sfx, showToast, onSpun, publish }) {
  const [phase, setPhase]           = useState('idle'); // idle | spinning | won
  const [dragging, setDragging]     = useState(false);
  const [winner, setWinner]         = useState(null);   // { label, index, id }
  const [showResult, setShowResult] = useState(false);
  const [shaking, setShaking]       = useState(false);
  const [announce, setAnnounce]     = useState('');

  /* ---------- Refs for the animation engine ---------- */
  const wheelBoxRef = useRef(null);
  const diskRef = useRef(null);
  const pointerRef = useRef(null);
  const liveRef = useRef(null);
  const rotRef = useRef(0);
  const rafRef = useRef(0);
  const spinSeq = useRef(0);
  const spinningRef = useRef(false);
  const lastIdxRef = useRef(-1);
  const lastTickRef = useRef(0);
  const dragRef = useRef(null);
  const timersRef = useRef([]);
  const removedForRef = useRef(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cfgRef = useRef({});
  cfgRef.current = { haptics, duration, theme, t, eliminate, showResult, keysBlocked };

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timersRef.current.push(id); return id; };

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    timersRef.current.forEach(clearTimeout);
  }, []);

  /* ---------- Wheel engine ---------- */
  const applyRotation = (deg) => {
    rotRef.current = deg;
    if (diskRef.current) diskRef.current.style.transform = `rotate(${deg}deg)`;
  };

  const flickPointer = (dir) => {
    const el = pointerRef.current;
    if (!el || !el.animate || REDUCED_MOTION) return;
    el.animate([{ transform: `rotate(${-dir * 22}deg)` }, { transform: 'rotate(0deg)' }], { duration: 160, easing: 'cubic-bezier(.2,.8,.3,1)' });
  };

  const trackAngle = (deg, dir) => {
    const list = itemsRef.current;
    const n = list.length;
    if (!n) return;
    const idx = indexAt(deg, n);
    if (idx === lastIdxRef.current) return;
    if (lastIdxRef.current !== -1 && n > 1) {
      const now = performance.now();
      if (now - lastTickRef.current > 32) {
        sfx('tick');
        lastTickRef.current = now;
      }
      flickPointer(dir);
    }
    lastIdxRef.current = idx;
    if (liveRef.current) liveRef.current.textContent = list[idx];
  };

  const finishSpin = () => {
    spinningRef.current = false;
    const list = itemsRef.current;
    const { theme: th, haptics: hp, t: tt } = cfgRef.current;
    const index = indexAt(rotRef.current, list.length);
    const label = list[index];
    setPhase('won');
    setWinner({ label, index, id: uid() });
    setAnnounce(`${tt.winnerIs}: ${label}`);
    sfx('land');
    if (hp) vibrate(30);
    onSpun(label, th.key);
    later(() => setShowResult(true), 320);
  };

  /* The big celebration — fired by the result card at the moment the winner is revealed */
  const celebrate = (withFanfare) => {
    const { theme: th, haptics: hp } = cfgRef.current;
    if (withFanfare) sfx('win');
    if (hp) vibrate([40, 60, 40, 60, 120]);
    triggerThemeEffect(th);
    if (th.effect === 'shake' && !REDUCED_MOTION) {
      setShaking(true);
      later(() => setShaking(false), 600);
    }
  };

  const spin = ({ dir = 1, strength = 1 } = {}) => {
    const list = itemsRef.current;
    const n = list.length;
    if (spinningRef.current || n < 2) return;
    getCtx(); // unlock audio on user gesture (iOS)

    spinningRef.current = true;
    setShowResult(false);
    setWinner(null);
    setPhase('spinning');
    sfx('whoosh');

    const seg = 360 / n;
    const winIdx = randInt(n);
    const jitter = (rand() - 0.5) * seg * 0.8;      // land anywhere inside the segment
    const targetMod = mod(-(winIdx * seg + seg / 2 + jitter), 360);
    const start = rotRef.current;
    const startMod = mod(start, 360);
    const { duration: dur } = cfgRef.current;
    const spins = Math.max(3, Math.round(dur * 0.7 * strength)) + randInt(2);
    const delta = dir > 0 ? mod(targetMod - startMod, 360) : -mod(startMod - targetMod, 360);
    const total = delta + dir * spins * 360;
    const T = dur * 1000;
    const t0 = performance.now();

    lastIdxRef.current = indexAt(start, n);
    if (liveRef.current) liveRef.current.textContent = list[lastIdxRef.current];

    const spinId = ++spinSeq.current;
    const frame = (now) => {
      if (spinSeq.current !== spinId || !spinningRef.current) return;
      const p = Math.min(1, (now - t0) / T);
      const deg = start + total * easeOut(p);
      applyRotation(deg);
      trackAngle(deg, dir);
      if (p < 1) rafRef.current = requestAnimationFrame(frame);
      else finishSpin();
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);
    // Safety net: rAF is paused in background tabs, so still land the wheel on time
    later(() => {
      if (spinSeq.current === spinId && spinningRef.current) {
        cancelAnimationFrame(rafRef.current);
        applyRotation(start + total);
        finishSpin();
      }
    }, T + 120);
  };
  const spinRef = useRef(spin);
  spinRef.current = spin;

  /* ---------- Drag / flick to spin ---------- */
  const wheelCenter = () => {
    const r = wheelBoxRef.current.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
  };
  const angleOf = (e, c) => Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI;

  const onPointerDown = (e) => {
    if (spinningRef.current || itemsRef.current.length < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const c = wheelCenter();
    if (Math.hypot(e.clientX - c.x, e.clientY - c.y) > c.r * 0.9) return;
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    lastIdxRef.current = indexAt(rotRef.current, itemsRef.current.length);
    if (liveRef.current) liveRef.current.textContent = itemsRef.current[lastIdxRef.current];
    dragRef.current = { c, last: angleOf(e, c), moved: 0, samples: [{ t: performance.now(), a: rotRef.current }] };
    setDragging(true);
    if (phase === 'won') setPhase('idle');
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const a = angleOf(e, d.c);
    let delta = a - d.last;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.last = a;
    d.moved += Math.abs(delta);
    applyRotation(rotRef.current + delta);
    trackAngle(rotRef.current, delta >= 0 ? 1 : -1);
    const now = performance.now();
    d.samples.push({ t: now, a: rotRef.current });
    while (d.samples.length > 2 && now - d.samples[0].t > 90) d.samples.shift();
  };
  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!d) return;
    const now = performance.now();
    const s0 = d.samples[0];
    const dt = now - s0.t;
    const v = dt > 0 && dt < 160 ? (rotRef.current - s0.a) / dt : 0; // deg per ms
    if (Math.abs(v) > 0.35 && d.moved > 12) {
      spin({ dir: v > 0 ? 1 : -1, strength: clamp(Math.abs(v) / 1.1, 0.7, 1.6) });
    }
  };

  /* ---------- Result actions ---------- */
  const removeWinner = () => {
    if (!winner || removedForRef.current === winner.id) return;
    removedForRef.current = winner.id;
    const list = itemsRef.current;
    if (list[winner.index] !== winner.label || list.length < 2) return;
    const next = list.filter((_, i) => i !== winner.index);
    setItems(next);
    setEliminated((prev) => [...prev, winner.label]);
    if (next.length === 1) {
      later(() => {
        showToast(t.lastStanding(next[0]));
        sfx('win');
        fireConfetti(theme.confettiColors, 1.2);
      }, 300);
    }
  };
  const closeResult = () => {
    setShowResult(false);
    setPhase('idle');
    if (eliminate) removeWinner();
  };
  const closeResultRef = useRef(closeResult);
  closeResultRef.current = closeResult;
  const spinAgain = (forceRemove) => {
    setShowResult(false);
    if (eliminate || forceRemove) removeWinner();
    later(() => spinRef.current(), 320);
  };
  const shareResult = async () => {
    const text = t.shareText(winner.label);
    if (navigator.share) {
      try { await navigator.share({ title: 'Party Spinner', text }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    if (await copyText(text)) showToast(t.copied);
  };

  /* ---------- Item actions ---------- */
  const replaceItems = (next) => {
    setItems(next.slice(0, MAX_ITEMS));
    setEliminated([]);
  };
  const itemActions = {
    add: (parts) => {
      const room = MAX_ITEMS - items.length;
      if (room <= 0) { showToast(t.maxReached); return; }
      sfx('click');
      setItems([...items, ...parts.slice(0, room)]);
      if (parts.length > room) showToast(t.maxReached);
    },
    removeAt: (i) => {
      const prev = items;
      setItems(items.filter((_, j) => j !== i));
      showToast(t.removed(prev[i]), { label: t.undo, fn: () => setItems(prev) });
    },
    setFromText: (text) => setItems(parseLines(text)),
    shuffle: () => { sfx('click'); setItems(shuffleArr(items)); showToast(t.shuffled); },
    sort: () => { sfx('click'); setItems([...items].sort((a, b) => a.localeCompare(b, lang, { numeric: true, sensitivity: 'base' }))); },
    dedupe: () => {
      const seen = new Set();
      const next = items.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      showToast(t.dupesRemoved(items.length - next.length));
      setItems(next);
    },
    numbers: (n) => { sfx('click'); replaceItems(Array.from({ length: n }, (_, i) => String(i + 1))); },
    sample: () => { sfx('click'); replaceItems(SAMPLE_ITEMS[lang][theme.key] || SAMPLE_ITEMS[lang].drinking); },
    clear: () => {
      const prev = items, prevElim = eliminated;
      replaceItems([]);
      showToast(t.cleared, { label: t.undo, fn: () => { setItems(prev); setEliminated(prevElim); } });
    },
    restore: () => {
      sfx('click');
      setItems([...items, ...eliminated].slice(0, MAX_ITEMS));
      setEliminated([]);
    },
  };

  /* ---------- Keyboard: Space / Enter spin, Escape closes the result ---------- */
  useEffect(() => {
    const onKey = (e) => {
      const cfg = cfgRef.current;
      const tag = e.target && e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
      if (e.key === 'Escape') {
        if (cfg.showResult) { e.stopImmediatePropagation(); closeResultRef.current(); }
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || cfg.keysBlocked || cfg.showResult) return;
      if ((e.key === ' ' || e.key === 'Enter') && tag !== 'BUTTON' && tag !== 'A') {
        e.preventDefault();
        spinRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Big screen / phones follow the wheel too */
  useEffect(() => {
    if (!publish) return;
    publish({
      icon: theme.icon, title: themeText.name, status: phase === 'spinning' ? 'challenge' : phase === 'won' ? 'finished' : 'setup', round: 0,
      participants: [], challenge: phase === 'spinning' ? t.spinning : null,
      winner: phase === 'won' && winner ? [{ id: winner.id, name: winner.label, avatar: theme.resultEmoji }] : [], scores: [],
    });
  }, [phase, winner, themeText.name]);
  useEffect(() => () => publish && publish(null), []);

  /* ---------- Render ---------- */
  const isSpinning = phase === 'spinning';
  const canSpin = items.length >= 2 && !isSpinning;
  const wheelSize = party ? 'min(92vw, calc(100dvh - 230px))' : 'min(86vw, 440px)';

  return (
    <div className={`w-full flex flex-col items-center gap-5 ${shaking ? 'animate-shake' : ''}`}>
      {/* Wheel */}
      <div
        ref={wheelBoxRef}
        data-state={isSpinning ? 'spinning' : phase === 'won' ? 'won' : 'idle'}
        className="wheel-box wheel-shadow relative aspect-square"
        style={{ width: wheelSize }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`${t.items}: ${items.join(', ')}`}
      >
        <Rim theme={theme} />
        <div ref={diskRef} className="wheel-disk absolute" style={{ inset: `${((VB / 2 - skin.r) / VB) * 100}%`, transform: `rotate(${rotRef.current}deg)` }}>
          <Disk items={items} theme={theme} />
        </div>
        <Gloss r={skin.r} />
        <Pointer theme={theme} pointerRef={pointerRef} />

        <button
          onClick={() => spin()}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={!canSpin}
          aria-label={t.spin}
          className="hub-btn absolute left-1/2 top-1/2 z-10 rounded-full grid place-items-center font-black tracking-wider disabled:cursor-not-allowed"
          style={{
            transform: 'translate(-50%, -50%)',
            width: `${((HUB_R * 2) / VB) * 100}%`,
            aspectRatio: '1 / 1',
            boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
            color: skin.hubText,
            fontSize: 'clamp(10px, 2.6vw, 15px)',
            textShadow: skin.hubText === '#fff' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          <HubFace theme={theme} />
          <span className="relative z-10">{isSpinning ? '•••' : t.spin}</span>
        </button>

        {items.length < 2 && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none z-10">
            <div className="bg-black/70 rounded-2xl px-4 py-2 text-sm font-semibold mt-[38%]">{t.needTwo}</div>
          </div>
        )}
      </div>

      {/* Live label / status */}
      <div className="text-center min-h-[2.25rem] flex items-center justify-center -mt-1 w-full">
        <div className={`px-4 py-1.5 rounded-full bg-black/30 border border-white/15 font-extrabold text-lg max-w-[90%] truncate transition-opacity ${isSpinning || dragging ? 'opacity-100' : 'hidden'}`} aria-hidden="true">
          <span ref={liveRef} />
        </div>
        {!isSpinning && !dragging && (
          phase === 'won' && winner ? (
            <div className="text-lg font-extrabold animate-pop truncate max-w-[90%]">🏆 {winner.label}</div>
          ) : (
            <div className="text-xs text-white/65">{t.itemsCount(items.length, duration)}</div>
          )
        )}
      </div>

      <button
        onClick={() => spin()}
        disabled={!canSpin}
        className={`btn-press relative w-full max-w-xs mx-auto font-extrabold text-xl py-4 rounded-full shadow-2xl ${canSpin ? `${theme.btnClass} btn-breathe` : 'bg-white/15 text-white/60 cursor-not-allowed'}`}
        style={{ '--glow': theme.accent }}
      >
        <span className="relative z-10 tracking-wider">{isSpinning ? t.spinning : `${t.spin} 🎯`}</span>
      </button>
      <div className="text-[11px] text-white/55 -mt-2 text-center">{t.spinHint}</div>

      {!party && (
        <>
          <ItemsPanel t={t} items={items} theme={theme} disabled={isSpinning} eliminatedCount={eliminated.length} actions={itemActions} />
          <div className="text-center text-[11px] text-white/50 pb-6 pt-1">{t.footer}</div>
        </>
      )}

      {showResult && winner && (
        <ResultModal
          key={winner.id}
          t={t}
          lang={lang}
          winner={winner}
          theme={theme}
          themeText={themeText}
          items={items}
          play={sfx}
          onCelebrate={celebrate}
          eliminate={eliminate}
          canRemove={items.length > 2}
          onClose={closeResult}
          onAgain={() => spinAgain(false)}
          onRemoveAndSpin={() => spinAgain(true)}
          onShare={shareResult}
        />
      )}
      <div aria-live="polite" className="sr-only">{announce}</div>
    </div>
  );
}
