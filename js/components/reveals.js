/* ============================================================
 *  Cinematic reveals — a different little show for every theme
 * ============================================================ */

const REVEAL_CLASS = {
  dating: 'reveal-heart',
  drinking: 'reveal-splash',
  lucky: 'reveal-jackpot',
  truth_or_dare: 'reveal-ignite',
  office: 'reveal-stamp',
  hardcore: 'reveal-glitch',
};

/* setTimeout that is cancelled when the component unmounts */
const useTimeline = () => {
  const ids = useRef([]);
  useEffect(() => () => ids.current.forEach(clearTimeout), []);
  return useCallback((ms, fn) => { ids.current.push(setTimeout(fn, ms)); }, []);
};

const animate = (el, frames, opts = {}) => {
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(frames, { fill: 'forwards', easing: 'ease-out', ...opts });
  return a.finished.catch(() => {});
};

/* Scatter glyph particles from a point inside `layer` (coordinates relative to the layer) */
const burst = (layer, x, y, glyphs, count, { dist = 90, size = 22, dur = 800, color } = {}) => {
  if (!layer || REDUCED_MOTION) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'fx-burst';
    el.textContent = glyphs[randInt(glyphs.length)];
    const ang = rand() * Math.PI * 2;
    const d = dist * (0.5 + rand() * 0.7);
    el.style.cssText =
      `left:${x}px;top:${y}px;font-size:${(size * (0.7 + rand() * 0.7)).toFixed(0)}px;` +
      `--tx:${(Math.cos(ang) * d).toFixed(1)}px;--ty:${(Math.sin(ang) * d - 20).toFixed(1)}px;` +
      `--s:${(0.6 + rand()).toFixed(2)};--r:${((rand() - 0.5) * 240).toFixed(0)}deg;` +
      `animation-duration:${dur}ms;animation-delay:${(rand() * 80).toFixed(0)}ms;${color ? `color:${color};` : ''}`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), dur + 300);
  }
};

/* Fly a projectile from `from` to `to` inside `layer`; resolves with the element on arrival */
const shoot = (layer, from, to, html, { dur = 380, size = 40, easing = 'cubic-bezier(.3,0,.8,.4)', grow = 1, spin = 0 } = {}) => {
  const el = document.createElement('div');
  el.className = 'absolute pointer-events-none';
  el.style.cssText = `left:0;top:0;width:${size}px;height:${size}px;z-index:30`;
  el.innerHTML = html;
  layer.appendChild(el);
  const ang = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const half = size / 2;
  return animate(el, [
    { transform: `translate(${from.x - half}px, ${from.y - half}px) rotate(${ang}deg) scale(1)` },
    { transform: `translate(${to.x - half}px, ${to.y - half}px) rotate(${ang + spin}deg) scale(${grow})` },
  ], { duration: dur, easing }).then(() => el);
};

const rainDown = (glyphs, count) => {
  if (REDUCED_MOTION) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'rain-particle';
    el.textContent = glyphs[randInt(glyphs.length)];
    el.style.cssText = `left:${(rand() * 100).toFixed(1)}%;font-size:${(18 + rand() * 22).toFixed(0)}px;animation-duration:${(1.8 + rand() * 1.4).toFixed(2)}s;animation-delay:${(rand() * 0.9).toFixed(2)}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
};

const launchRocket = (xPct, color, explodeY, onBoom) => {
  const el = document.createElement('div');
  el.className = 'fx-rocket';
  el.style.left = `${xPct}%`;
  el.style.setProperty('--c', color);
  document.body.appendChild(el);
  const rise = window.innerHeight * (1 - explodeY) + 90;
  animate(el, [{ transform: 'translateY(0)' }, { transform: `translateY(-${rise}px)` }], { duration: 650, easing: 'cubic-bezier(.2,.6,.4,1)' }).then(() => {
    el.remove();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 70, spread: 360, startVelocity: 32, origin: { x: xPct / 100, y: explodeY }, colors: [color, '#ffffff'], gravity: 0.7, scalar: 0.9, ticks: 110, disableForReducedMotion: true });
    }
    onBoom?.();
  });
};

const ARROW_HTML = `<svg viewBox="0 0 60 16" width="100%" height="100%" style="overflow:visible">
  <line x1="3" y1="8" x2="48" y2="8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 2 3 l 7 5 l -7 5 Z M 9 3 l 7 5 l -7 5 Z" fill="#ff8fb3"/>
  <circle cx="50" cy="5" r="3.6" fill="#ff4d8d"/><circle cx="50" cy="11" r="3.6" fill="#ff4d8d"/>
  <path d="M 52.5 1.5 L 59.5 8 L 52.5 14.5 Z" fill="#ff4d8d"/>
</svg>`;
const FIREBALL_HTML = `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 40% 40%, #fff7b0 0%, #ffb01a 35%, #ff4d00 65%, rgba(255,60,0,0) 72%);box-shadow:0 0 18px 6px rgba(255,120,0,.65)"></div>`;

/* ---------- Actors ---------- */

function CupidSvg({ wink, drawn, arrow }) {
  const skin = '#ffd3b6';
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible" aria-hidden="true">
      <path className="cupid-wing back" d="M 78 70 C 86 40 118 36 112 68 C 102 62 90 66 78 70 Z" fill="#fff" opacity="0.8" />
      <path className="cupid-wing" d="M 80 78 C 92 54 122 56 112 84 C 102 78 90 80 80 78 Z" fill="#fff" />
      <ellipse cx="66" cy="86" rx="19" ry="21" fill={skin} />
      <path d="M 48 92 Q 66 114 84 92 Q 66 100 48 92 Z" fill="#fff" />
      <ellipse cx="58" cy="108" rx="7" ry="5" fill={skin} />
      <ellipse cx="76" cy="108" rx="7" ry="5" fill={skin} />
      <path d="M 30 38 Q 6 70 30 102" stroke="#8b4a2b" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d={drawn ? 'M 30 38 L 48 70 L 30 102' : 'M 30 38 L 30 102'} stroke="#fff" strokeWidth="1.6" fill="none" />
      {arrow && (
        <g transform={drawn ? 'translate(18 0)' : 'translate(4 0)'}>
          <line x1="30" y1="70" x2="6" y2="70" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="10" cy="66.5" r="3.4" fill="#ff4d8d" />
          <circle cx="10" cy="73.5" r="3.4" fill="#ff4d8d" />
          <path d="M 7.5 63.8 L 1 70 L 7.5 76.2 Z" fill="#ff4d8d" />
          <path d="M 26 66 l 6 -4 v 4 Z M 26 74 l 6 4 v -4 Z" fill="#ff8fb3" />
        </g>
      )}
      <path d="M 54 80 Q 42 76 32 70" stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d={drawn ? 'M 60 74 L 48 70' : 'M 60 74 Q 52 70 44 72'} stroke={skin} strokeWidth="8" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="46" r="24" fill={skin} />
      <circle cx="46" cy="28" r="8" fill="#f6c453" />
      <circle cx="60" cy="23" r="9" fill="#f6c453" />
      <circle cx="74" cy="28" r="8" fill="#f6c453" />
      <ellipse cx="60" cy="13" rx="15" ry="4" fill="none" stroke="#ffe066" strokeWidth="3" />
      <circle cx="50" cy="46" r="3" fill="#3a2a2a" />
      {wink
        ? <path d="M 64 46 q 4 4 8 0" stroke="#3a2a2a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        : <circle cx="68" cy="46" r="3" fill="#3a2a2a" />}
      <circle cx="51" cy="45" r="1" fill="#fff" />
      <circle cx="44" cy="54" r="4" fill="#ff8fb3" opacity="0.6" />
      <circle cx="76" cy="54" r="4" fill="#ff8fb3" opacity="0.6" />
      {drawn
        ? <ellipse cx="59" cy="58" rx="3" ry="4" fill="#c2415d" />
        : <path d="M 53 57 q 6 6 12 0" stroke="#c2415d" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
    </svg>
  );
}

function DevilSvg() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible" aria-hidden="true">
      <path className="devil-wing" d="M 30 58 L 4 42 L 14 60 L 2 68 L 18 74 L 10 90 L 32 74 Z" fill="#3b0a1a" />
      <g className="devil-tail">
        <path d="M 62 98 Q 90 114 98 92" stroke="#b91c1c" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 98 92 l 8 6 l -10 3 Z" fill="#b91c1c" />
      </g>
      <line x1="84" y1="106" x2="100" y2="30" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      <path d="M 92 34 L 108 30 M 100 32 L 100 14 M 92 34 L 88 20 M 108 30 L 112 16" stroke="#f59e0b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="56" cy="66" r="32" fill="#dc2626" />
      <ellipse cx="56" cy="82" rx="18" ry="12" fill="#b91c1c" opacity="0.5" />
      <path d="M 32 46 L 22 16 L 46 36 Z" fill="#7f1d1d" />
      <path d="M 80 46 L 90 16 L 66 36 Z" fill="#7f1d1d" />
      <ellipse cx="44" cy="60" rx="7" ry="8" fill="#fff" />
      <ellipse cx="68" cy="60" rx="7" ry="8" fill="#fff" />
      <circle cx="46" cy="62" r="3.5" fill="#1a0505" />
      <circle cx="70" cy="62" r="3.5" fill="#1a0505" />
      <path d="M 36 50 L 50 55 M 76 50 L 62 55" stroke="#1a0505" strokeWidth="3" strokeLinecap="round" />
      <path d="M 38 76 Q 56 98 74 76 Z" fill="#2a0a0a" />
      <path d="M 44 77 l 4 7 l 4 -7 Z M 64 77 l 4 7 l 4 -7 Z" fill="#fff" />
      <circle cx="90" cy="72" r="7" fill="#dc2626" />
    </svg>
  );
}

function StampSvg() {
  return (
    <svg viewBox="0 0 110 110" className="w-full h-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="stampWood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b3f23" />
          <stop offset="0.5" stopColor="#a86a3d" />
          <stop offset="1" stopColor="#6b3f23" />
        </linearGradient>
        <linearGradient id="stampSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
      </defs>
      <circle cx="55" cy="12" r="10" fill="url(#stampWood)" />
      <rect x="40" y="14" width="30" height="46" rx="8" fill="url(#stampWood)" />
      <rect x="8" y="58" width="94" height="22" rx="7" fill="url(#stampSteel)" />
      <rect x="16" y="80" width="78" height="12" rx="3" fill="#e11d48" />
      <rect x="16" y="88" width="78" height="4" rx="2" fill="#9f1239" />
    </svg>
  );
}

/* ---------- Reveals (all coordinates are relative to the stage) ---------- */

/* 💘 Cupid peeks in, draws the bow and shoots a heart arrow at the name */
function CupidReveal({ target, fxRef, onHit, play }) {
  const at = useTimeline();
  const ref = useRef(null);
  const [wink, setWink] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [arrow, setArrow] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    play('flutter');
    animate(el, [
      { transform: 'translate(80%, 30%) rotate(25deg)', opacity: 0 },
      { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
    ], { duration: 520, easing: 'cubic-bezier(.3,1.3,.5,1)' });
    at(650, () => { setDrawn(true); play('creak'); });
    at(1150, () => {
      setDrawn(false);
      setArrow(false);
      play('twang');
      const fx = fxRef.current;
      if (!fx) return;
      const from = { x: el.offsetLeft + el.offsetWidth * 0.2, y: el.offsetTop + el.offsetHeight * 0.58 };
      shoot(fx, from, target, ARROW_HTML, { dur: 300, size: 60 }).then((p) => {
        p.remove();
        play('heartHit');
        setWink(true);
        onHit();
        burst(fx, target.x, target.y, ['❤️', '💖', '💕', '💘', '✨'], 18, { dist: 120 });
      });
    });
  }, []);
  return (
    <div ref={ref} className="absolute" style={{ right: '14%', top: -4, width: 104, height: 104, opacity: 0 }}>
      <div className={`w-full h-full ${wink ? 'fx-bob' : ''}`}><CupidSvg wink={wink} drawn={drawn} arrow={arrow} /></div>
    </div>
  );
}

/* 🍻 Two mugs slide in and clink */
function CheersReveal({ t, target, fxRef, onHit, play, onShake }) {
  const left = useRef(null);
  const right = useRef(null);
  const [clinked, setClinked] = useState(false);
  useEffect(() => {
    play('slide');
    const ease = 'cubic-bezier(.45,0,.25,1)';
    animate(left.current, [
      { transform: 'translateX(-240px) rotate(-30deg)', opacity: 0 },
      { transform: 'translateX(0) rotate(0deg)', opacity: 1, offset: 0.72 },
      { transform: 'translateX(12px) rotate(20deg)', opacity: 1 },
    ], { duration: 720, easing: ease });
    animate(right.current, [
      { transform: 'scaleX(-1) translateX(-240px) rotate(-30deg)', opacity: 0 },
      { transform: 'scaleX(-1) translateX(0) rotate(0deg)', opacity: 1, offset: 0.72 },
      { transform: 'scaleX(-1) translateX(12px) rotate(20deg)', opacity: 1 },
    ], { duration: 720, easing: ease }).then(() => {
      play('clink');
      onShake();
      setClinked(true);
      onHit();
      burst(fxRef.current, target.sw / 2, 22, ['🫧', '○', '•', '✨'], 20, { dist: 100, size: 18, color: 'rgba(255,255,255,0.95)' });
    });
  }, []);
  const bob = clinked ? 'fx-bob' : '';
  return (
    <>
      <div ref={left} className="absolute text-6xl leading-none" style={{ left: 'calc(50% - 70px)', top: 14, opacity: 0 }}>
        <span className={`inline-block ${bob}`}>🍺</span>
      </div>
      <div ref={right} className="absolute text-6xl leading-none" style={{ left: 'calc(50% + 10px)', top: 14, opacity: 0 }}>
        <span className={`inline-block ${bob}`} style={{ animationDelay: '-0.85s' }}>🍺</span>
      </div>
      {clinked && (
        <div className="fx-bubble absolute left-1/2 top-0 bg-white text-amber-700 font-black text-sm px-3 py-1 rounded-full shadow-lg whitespace-nowrap">{t.cheers}</div>
      )}
    </>
  );
}

/* 🍀 Slot-machine shuffle through the other items, then JACKPOT */
function SlotReveal({ t, target, items, winner, setPreview, onHit, play }) {
  const at = useTimeline();
  const [won, setWon] = useState(false);
  useEffect(() => {
    const others = items.filter((x) => x !== winner);
    const pool = others.length ? others : [winner];
    let delay = 55;
    let when = 250;
    let last = null;
    while (delay < 270) {
      at(when, () => {
        let pick = pool[randInt(pool.length)];
        if (pool.length > 1 && pick === last) pick = pool[(pool.indexOf(pick) + 1) % pool.length];
        last = pick;
        setPreview(pick);
        play('slotTick');
      });
      when += delay;
      delay *= 1.14;
    }
    at(when, () => {
      setPreview(null);
      setWon(true);
      play('jackpot');
      onHit();
      rainDown(['🪙', '✨', '💛', '🍀', '⭐'], 28);
    });
    at(when + 250, () => play('coin'));
  }, []);
  if (!won) {
    return <div className="fx-jiggle absolute text-5xl" style={{ left: '50%', top: '50%' }} aria-hidden="true">🎰</div>;
  }
  const size = Math.max(300, target.w * 1.8);
  return (
    <>
      <div className="rays-spin absolute" style={{ left: target.x - size / 2, top: target.y - size / 2, width: size, height: size, mixBlendMode: 'screen' }} />
      <div className="clover-in absolute text-5xl" style={{ left: '50%', top: '50%' }} aria-hidden="true">🍀</div>
      <div className="ribbon-in absolute" style={{ left: '50%', top: target.y - target.h / 2 - 26 }}>
        <span className="inline-block px-4 py-1 rounded-md font-black text-lg tracking-widest text-yellow-900 shadow-lg whitespace-nowrap" style={{ background: 'linear-gradient(180deg,#fff3a0,#ffd700 50%,#f59e0b)' }}>{t.jackpot}</span>
      </div>
    </>
  );
}

/* 😈 A little devil pops up, giggles and hurls a fireball */
function DevilReveal({ t, target, fxRef, onHit, play }) {
  const at = useTimeline();
  const ref = useRef(null);
  const [talk, setTalk] = useState(false);
  const [laugh, setLaugh] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    animate(el, [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }], { duration: 480, easing: 'cubic-bezier(.3,1.3,.5,1)' });
    at(520, () => { setTalk(true); play('giggle'); });
    at(1200, () => {
      setTalk(false);
      const fx = fxRef.current;
      if (!fx) return;
      const tip = { x: el.offsetLeft + el.offsetWidth * (102 / 120), y: el.offsetTop + el.offsetHeight * (14 / 120) };
      const ball = document.createElement('div');
      ball.className = 'fx-charge absolute pointer-events-none';
      ball.style.cssText = `left:${tip.x}px;top:${tip.y}px;width:34px;height:34px;z-index:30`;
      ball.innerHTML = FIREBALL_HTML;
      fx.appendChild(ball);
      play('charge');
      at(430, () => {
        ball.remove();
        shoot(fx, tip, target, FIREBALL_HTML, { dur: 360, size: 40, grow: 1.8, easing: 'cubic-bezier(.4,0,.9,.5)' }).then((p) => {
          p.remove();
          play('fireHit');
          setLaugh(true);
          onHit();
          burst(fx, target.x, target.y, ['🔥', '💥', '✨'], 18, { dist: 120, size: 24 });
        });
      });
    });
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-t-[26px]">
      <div ref={ref} className="absolute" style={{ left: 8, bottom: -10, width: 100, height: 100, transform: 'translateY(115%)' }}>
        <div className={`w-full h-full ${laugh ? 'fx-bob' : ''}`}><DevilSvg /></div>
        {talk && (
          <div className="fx-bubble absolute bg-white text-slate-900 text-xs font-black px-2.5 py-1 rounded-xl whitespace-nowrap shadow" style={{ left: 'calc(100% + 26px)', top: '14%' }}>{t.devilSays}</div>
        )}
      </div>
    </div>
  );
}

/* 📌 A rubber stamp slams down on the name */
function StampReveal({ t, target, fxRef, onHit, play, onShake }) {
  const at = useTimeline();
  const ref = useRef(null);
  const [mark, setMark] = useState(false);
  const finalTop = target.y + target.h * 0.3 - 92;
  const restTop = Math.max(-30, finalTop - 140);
  const drop = finalTop - restTop;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    animate(el, [
      { transform: 'translateY(-40px) rotate(-10deg)', opacity: 0 },
      { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
    ], { duration: 380, easing: 'cubic-bezier(.3,1.3,.5,1)' });
    at(700, () => {
      animate(el, [
        { transform: 'translateY(0) scale(1)' },
        { transform: `translateY(${drop}px) scale(0.98)` },
      ], { duration: 150, easing: 'cubic-bezier(.55,0,1,.6)' }).then(() => {
        play('thud');
        onShake();
        setMark(true);
        onHit();
        burst(fxRef.current, target.x, target.y + target.h * 0.4, ['•', '○', '◦'], 14, { dist: 80, size: 16, dur: 650, color: 'rgba(255,255,255,0.7)' });
        at(380, () => play('bell'));
        at(320, () => animate(el, [
          { transform: `translateY(${drop}px)`, opacity: 1 },
          { transform: `translateY(${drop - 110}px)`, opacity: 0 },
        ], { duration: 450, easing: 'ease-out' }));
      });
    });
  }, []);
  return (
    <>
      <div ref={ref} className="absolute" style={{ left: target.x - 55, top: restTop, width: 110, height: 110, opacity: 0 }}>
        <StampSvg />
      </div>
      {mark && (
        <div className="absolute" style={{ left: target.x + target.w * 0.3, top: target.y - target.h * 0.2, transform: 'translate(-50%, -50%)' }}>
          <span
            className="stamp-mark inline-block px-2.5 py-0.5 rounded-md border-4 font-black tracking-[0.2em] text-base sm:text-lg whitespace-nowrap"
            style={{ color: '#f43f5e', borderColor: '#f43f5e', boxShadow: 'inset 0 0 0 2px rgba(15,23,42,0.6), 0 0 0 2px rgba(244,63,94,0.5)' }}
          >
            {t.stampText}
          </span>
        </div>
      )}
    </>
  );
}

/* 🎆 Three rockets; the last one bursts right on the name */
function FireworksReveal({ nameRef, onHit, play }) {
  const at = useTimeline();
  const [count, setCount] = useState(null);
  useEffect(() => {
    const colors = ['#FF00FF', '#00FFFF', '#FFFF00'];
    [0, 1, 2].forEach((i) => at(300 + i * 430, () => {
      setCount(3 - i);
      play('whistle');
      const last = i === 2;
      let x = i === 0 ? 22 : 72;
      let y = 0.28;
      if (last && nameRef.current) {
        const r = nameRef.current.getBoundingClientRect();
        x = ((r.left + r.width / 2) / window.innerWidth) * 100;
        y = (r.top + r.height / 2) / window.innerHeight;
      }
      launchRocket(x, colors[i], y, () => {
        play('boom');
        if (last) { setCount(null); flashScreen(); onHit(); }
      });
    }));
  }, []);
  if (count == null) return null;
  return (
    <div key={count} className="stage-pop absolute inset-0 grid place-items-center font-black text-6xl" style={{ color: '#67e8f9', textShadow: '0 0 18px #f0f, 0 0 36px #f0f' }} aria-hidden="true">{count}</div>
  );
}

const REVEALS = {
  dating: CupidReveal,
  drinking: CheersReveal,
  lucky: SlotReveal,
  truth_or_dare: DevilReveal,
  office: StampReveal,
  hardcore: FireworksReveal,
};

/* ============================================================
 *  Modals
 * ============================================================ */

function ResultModal({ t, lang, winner, theme, themeText, items, eliminate, canRemove, play, onClose, onAgain, onRemoveAndSpin, onShare, onCelebrate }) {
  const primaryRef = useRef(null);
  const cardRef = useRef(null);
  const nameRef = useRef(null);
  const labelRef = useRef(null);
  const stageRef = useRef(null);
  const fxRef = useRef(null);
  const hitRef = useRef(false);
  const mountedRef = useRef(true);
  const Reveal = REVEALS[theme.reveal || theme.key];
  const cinematic = !REDUCED_MOTION && !!Reveal;
  const [revealed, setRevealed] = useState(!cinematic);
  const [preview, setPreview] = useState(null);
  const [shakeNow, setShakeNow] = useState(false);
  const [target, setTarget] = useState(null);
  const kind = tdKind(winner.label);
  const bank = kind ? TD_PROMPTS[lang][kind] : null;
  const [promptIdx, setPromptIdx] = useState(() => (bank ? randInt(bank.length) : 0));

  useEffect(() => {
    if (!cinematic) {
      primaryRef.current?.focus();
      onCelebrate(true);
    }
    return () => { mountedRef.current = false; };
  }, []);

  /* Where the name sits, in stage coordinates (offset* ignore the pop-in transform).
   * The Tailwind CDN generates CSS for first-seen classes asynchronously, so on the very first
   * open the card may still be unstyled for a tick — wait until the stage has its height. */
  useEffect(() => {
    if (!cinematic) return;
    let tries = 0;
    let timer = 0;
    const measure = () => {
      const n = labelRef.current || nameRef.current; // the inline label, so width = the text itself
      const s = stageRef.current;
      const card = cardRef.current;
      if (!n || !s || !card) return;
      if (s.offsetHeight < 40 && tries++ < 25) { timer = setTimeout(measure, 25); return; }
      // Walk the offsetParent chain so transformed ancestors (which become offsetParents) don't skew the result
      const within = (el) => {
        let x = 0, y = 0;
        while (el && el !== card) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
        return { x, y };
      };
      const np = within(n);
      const sp = within(s);
      setTarget({
        x: np.x + n.offsetWidth / 2 - sp.x,
        y: np.y + n.offsetHeight / 2 - sp.y,
        w: n.offsetWidth,
        h: n.offsetHeight,
        sw: s.offsetWidth,
        sh: s.offsetHeight,
      });
    };
    measure();
    return () => clearTimeout(timer);
  }, []);

  const shake = () => {
    if (!mountedRef.current) return;
    setShakeNow(true);
    setTimeout(() => mountedRef.current && setShakeNow(false), 600);
  };
  const hit = () => {
    if (hitRef.current || !mountedRef.current) return;
    hitRef.current = true;
    setPreview(null);
    setRevealed(true);
    onCelebrate(false);
    setTimeout(() => primaryRef.current?.focus(), 400);
  };

  const nextPrompt = () => {
    if (!bank) return;
    let n = randInt(bank.length);
    if (bank.length > 1 && n === promptIdx) n = (n + 1) % bank.length;
    setPromptIdx(n);
  };

  const nameClass = revealed
    ? (REVEAL_CLASS[theme.reveal || theme.key] || 'winner-in')
    : preview != null ? 'opacity-90' : 'pre-reveal';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade" onClick={onClose}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="relative rounded-[28px] p-7 sm:p-9 max-w-md w-full text-center shadow-2xl animate-pop"
        style={{ background: theme.bgGradient, border: '2px solid rgba(255,255,255,0.25)', '--glow': theme.accent }}
        onClick={(e) => { e.stopPropagation(); if (!revealed) hit(); }}
      >
        {theme.effect === 'glow' && <div className="absolute inset-0 rounded-[28px] pointer-events-none pulse-glow" style={{ '--glow': theme.accent }} />}
        <button onClick={onClose} aria-label={t.close} className="absolute top-3 right-3 z-30 w-9 h-9 grid place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/10">
          <Icon.X />
        </button>

        <div className={shakeNow ? 'animate-shake' : ''}>
          {cinematic ? (
            <div ref={stageRef} className="relative z-20 h-24 sm:h-28 -mx-7 sm:-mx-9 -mt-7 sm:-mt-9 mb-1 pointer-events-none">
              <div ref={fxRef} className="absolute inset-0" />
              {target && (
                <Reveal
                  t={t}
                  target={target}
                  items={items}
                  winner={winner.label}
                  fxRef={fxRef}
                  nameRef={nameRef}
                  setPreview={setPreview}
                  onHit={hit}
                  onShake={shake}
                  play={play}
                />
              )}
            </div>
          ) : (
            <div className="text-6xl sm:text-7xl mb-2" style={{ filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.35))' }} aria-hidden="true">{theme.resultEmoji}</div>
          )}

          <div className="text-[11px] uppercase tracking-[0.25em] text-white/70 mb-2">{t.winnerIs}</div>
          <h2 ref={nameRef} id="result-title" className={`text-3xl sm:text-4xl font-black text-white break-words leading-tight min-h-[1.2em] ${nameClass}`}>
            <span ref={labelRef} className="inline-block max-w-full">{revealed ? winner.label : (preview ?? winner.label)}</span>
          </h2>

          <div className={`transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-white/85 text-sm mt-3 font-semibold">{themeText.kicker}</div>

            {bank && revealed && (
              <div className="mt-5 rounded-2xl bg-black/25 border border-white/15 p-4 text-left animate-fade">
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: theme.accent }}>
                  {kind === 'truth' ? `🗣️ ${t.truth}` : `🔥 ${t.dare}`}
                </div>
                <p key={promptIdx} className="font-semibold leading-snug animate-fade">{bank[promptIdx]}</p>
                <button onClick={nextPrompt} className="mt-2 text-xs font-bold text-white/70 hover:text-white">🔄 {t.another}</button>
              </div>
            )}

            {eliminate && canRemove && <div className="mt-4 text-[11px] text-white/60">{t.eliminatedNote}</div>}
          </div>

          <div className={`flex flex-col gap-2.5 mt-6 transition-opacity duration-500 ${revealed ? '' : 'opacity-25 pointer-events-none'}`}>
            <button ref={primaryRef} onClick={onAgain} className={`${theme.btnClass} font-extrabold py-3 rounded-full shadow-lg btn-press text-lg tracking-wide`}>
              {t.spinAgain}
            </button>
            {!eliminate && canRemove && (
              <button onClick={onRemoveAndSpin} className="font-bold py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 btn-press text-sm">
                ✂️ {t.removeAndSpin}
              </button>
            )}
            <button onClick={onShare} className="text-white/85 font-semibold py-2 hover:text-white text-sm">📤 {t.share}</button>
          </div>

          {!revealed && <div className="text-[11px] text-white/50 mt-3">{t.tapToSkip}</div>}
        </div>
      </div>
    </div>
  );
}
