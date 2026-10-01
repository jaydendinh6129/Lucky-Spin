/* ============================================================
 *  Wheel — geometry + per-theme skins
 * ============================================================ */

const VB = 500;       // viewBox of the static layers
const HUB_R = 46;     // hub button radius (same units)

/* How the wheel looks in each theme: disk radius, rim, pointer and hub art */
const SKINS = {
  drinking:      { r: 194, rim: 'wood',     pointer: 'bottle',  hub: 'cap',    hubText: '#fff',    divider: 'rgba(255,248,220,0.9)' },
  lucky:         { r: 206, rim: 'gold',     pointer: 'arrow',   hub: 'coin',   hubText: '#5a3a00', divider: 'rgba(255,255,255,0.85)' },
  truth_or_dare: { r: 206, rim: 'obsidian', pointer: 'trident', hub: 'ember',  hubText: '#fff',    divider: 'rgba(255,200,230,0.75)' },
  dating:        { r: 206, rim: 'rosegold', pointer: 'cupid',   hub: 'heart',  hubText: '#fff',    divider: 'rgba(255,255,255,0.9)' },
  office:        { r: 206, rim: 'steel',    pointer: 'pin',     hub: 'button', hubText: '#fff',    divider: 'rgba(255,255,255,0.95)' },
  hardcore:      { r: 206, rim: 'neon',     pointer: 'bolt',    hub: 'core',   hubText: '#00FFFF', divider: 'rgba(255,255,255,0.9)' },
};
const skinOf = (theme) => SKINS[theme.skin || theme.key] || SKINS.lucky;

const DISHES = ['🍺', '🍗', '🍻', '🥜', '🍺', '🦐', '🍻', '🥒', '🍺', '🍢', '🍻', '🍋'];
const HEARTS = ['💗', '💕', '💗', '🌹'];
const NEON = ['#FF00FF', '#00FFFF', '#FFFF00'];

/* Static rim (does not rotate): wooden table edge, casino gold, obsidian, satin, steel or neon */
const Rim = memo(function Rim({ theme }) {
  const skin = skinOf(theme);
  const c = VB / 2;
  const R = skin.r;
  const mid = (R + 244) / 2;
  const ring = (n, fn) => Array.from({ length: n }, (_, i) => fn(polar(c, c, mid, (i * 360) / n), i, (i * 360) / n));

  let base = null;
  let decor = null;
  switch (skin.rim) {
    case 'wood':
      base = (
        <>
          <defs>
            <radialGradient id="rimWood" cx="50%" cy="50%" r="50%">
              <stop offset="76%" stopColor="#7a4a24" />
              <stop offset="84%" stopColor="#9a6432" />
              <stop offset="93%" stopColor="#6a3d1c" />
              <stop offset="100%" stopColor="#3f2410" />
            </radialGradient>
          </defs>
          <circle cx={c} cy={c} r={241} fill="url(#rimWood)" />
          {Array.from({ length: 9 }, (_, i) => (
            <circle
              key={i} cx={c} cy={c} r={R + 5 + i * 4.3} fill="none"
              stroke="rgba(40,18,6,0.35)" strokeWidth="0.9"
              strokeDasharray={`${90 + i * 23} ${18 + i * 7} ${140 - i * 9} 26`}
              transform={`rotate(${i * 37} ${c} ${c})`}
            />
          ))}
          <circle cx={c} cy={c} r={242} fill="none" stroke="rgba(255,220,160,0.35)" strokeWidth="2" />
          <circle cx={c} cy={c} r={R + 3} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="4" />
          <circle cx={c} cy={c} r={R + 6} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        </>
      );
      decor = ring(12, (p, i) => {
        const food = i % 2 === 1;
        return (
          <g key={i} className={`dish ${food ? '' : 'mug'}`} style={{ '--i': i }}>
            {food && <circle cx={p.x} cy={p.y} r={13} fill="#fff" />}
            {food && <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="#d6d3d1" strokeWidth="1" />}
            <text x={p.x} y={p.y + 1} fontSize={food ? 15 : 20} textAnchor="middle" dominantBaseline="central">{DISHES[i]}</text>
          </g>
        );
      });
      break;

    case 'obsidian':
      base = (
        <>
          <defs>
            <radialGradient id="rimObs" cx="50%" cy="50%" r="50%">
              <stop offset="80%" stopColor="#1a0b22" />
              <stop offset="100%" stopColor="#05020a" />
            </radialGradient>
          </defs>
          <circle cx={c} cy={c} r={241} fill="url(#rimObs)" />
          <circle cx={c} cy={c} r={241} fill="none" stroke="#9d174d" strokeOpacity="0.8" strokeWidth="2.5" />
          <circle cx={c} cy={c} r={R + 3} fill="none" stroke={theme.accent} strokeWidth="2" style={{ filter: `drop-shadow(0 0 6px ${theme.accent})` }} />
        </>
      );
      decor = ring(16, (p, i) => (
        <text key={i} x={p.x} y={p.y + 1} fontSize="19" textAnchor="middle" dominantBaseline="central" className={`flame ${i % 2 ? 'odd' : ''}`}>🔥</text>
      ));
      break;

    case 'rosegold':
      base = (
        <>
          <defs>
            <linearGradient id="rimRose" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe4ec" />
              <stop offset="40%" stopColor="#f9a8d4" />
              <stop offset="70%" stopColor="#e0718f" />
              <stop offset="100%" stopColor="#fbcfe8" />
            </linearGradient>
          </defs>
          <circle cx={c} cy={c} r={241} fill="url(#rimRose)" />
          <circle cx={c} cy={c} r={240} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
          <circle cx={c} cy={c} r={R + 3} fill="none" stroke="#fff" strokeOpacity="0.8" strokeWidth="3" />
        </>
      );
      decor = ring(16, (p, i) => (
        <text key={i} x={p.x} y={p.y + 1} fontSize={HEARTS[i % 4] === '🌹' ? 18 : 16} textAnchor="middle" dominantBaseline="central" className={`heart-decor ${i % 2 ? 'odd' : ''}`}>{HEARTS[i % 4]}</text>
      ));
      break;

    case 'steel':
      base = (
        <>
          <defs>
            <linearGradient id="rimSteel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <circle cx={c} cy={c} r={241} fill="url(#rimSteel)" />
          <circle cx={c} cy={c} r={241} fill="none" stroke={theme.accent} strokeOpacity="0.7" strokeWidth="1.5" />
          <circle cx={c} cy={c} r={R + 3} fill="none" stroke={theme.accent} strokeWidth="2" />
        </>
      );
      decor = Array.from({ length: 60 }, (_, i) => {
        const major = i % 5 === 0;
        const a = (i * 360) / 60;
        const p1 = polar(c, c, 236, a);
        const p2 = polar(c, c, major ? 222 : 229, a);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#fff" strokeOpacity={major ? 0.95 : 0.4} strokeWidth={major ? 2.5 : 1.2} strokeLinecap="round" />;
      });
      break;

    case 'neon':
      base = (
        <>
          <circle cx={c} cy={c} r={241} fill="#07070c" />
          <circle cx={c} cy={c} r={241} fill="none" stroke="#FF00FF" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px #FF00FF)' }} />
          <circle cx={c} cy={c} r={R + 3} fill="none" stroke="#00FFFF" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 6px #00FFFF)' }} />
        </>
      );
      decor = (
        <g style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }}>
          {ring(36, (p, i, a) => (
            <rect
              key={i} x={p.x - 5} y={p.y - 2.5} width={10} height={5} rx={2}
              fill={NEON[i % 3]} className="led"
              transform={`rotate(${a} ${p.x} ${p.y})`}
              style={{ animationDelay: `${-(i % 3) * 0.4}s` }}
            />
          ))}
        </g>
      );
      break;

    default: /* gold */
      base = (
        <>
          <defs>
            <linearGradient id="rimGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff2b0" />
              <stop offset="30%" stopColor="#e2b53a" />
              <stop offset="55%" stopColor="#9a6b12" />
              <stop offset="80%" stopColor="#f1cf5a" />
              <stop offset="100%" stopColor="#7a5410" />
            </linearGradient>
          </defs>
          <circle cx={c} cy={c} r={241} fill="url(#rimGold)" />
          <circle cx={c} cy={c} r={R + 7} fill="none" stroke="#7f1d1d" strokeWidth="9" />
          <circle cx={c} cy={c} r={R + 7} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="3 9" />
          <circle cx={c} cy={c} r={240} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <circle cx={c} cy={c} r={R + 2} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="3" />
        </>
      );
      decor = (
        <g style={{ filter: `drop-shadow(0 0 4px ${theme.accent})` }}>
          {ring(24, (p, i) => (
            <g key={i} className={`bulb ${i % 2 ? 'odd' : ''}`}>
              <circle cx={p.x} cy={p.y} r={6.5} fill={theme.accent} />
              <circle cx={p.x - 1.6} cy={p.y - 1.6} r={2.4} fill="white" opacity="0.9" />
            </g>
          ))}
        </g>
      );
      break;
  }

  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full" aria-hidden="true">
      <circle cx={c} cy={c} r={244} fill="rgba(0,0,0,0.35)" />
      {base}
      {decor}
    </svg>
  );
});

/* Rotating disk with the segments */
const Disk = memo(function Disk({ items, theme }) {
  const skin = skinOf(theme);
  const R = skin.r;
  const N = items.length;
  if (N === 0) {
    return (
      <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="w-full h-full block">
        <circle r={R - 2} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeDasharray="8 8" />
      </svg>
    );
  }
  const seg = 360 / N;
  const labelEnd = R - 18;
  const available = labelEnd - HUB_R - 10;
  const arcAtLabel = (2 * Math.PI * (R * 0.62)) / N;
  const longest = Math.max(...items.map((s) => s.length));
  // Shrink (down to 11) so the longest label fits before resorting to truncation
  const fontSize = clamp(Math.min(arcAtLabel * 0.42, Math.max(available / (longest * 0.55), 11)), 7, 20);
  const maxChars = Math.max(3, Math.floor(available / (fontSize * 0.55) + 0.01)); // epsilon: avoid 14.999 → 14

  return (
    <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="w-full h-full block select-none" aria-hidden="true">
      <defs>
        <radialGradient id="diskShade" cx="0" cy="0" r={R} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
        </radialGradient>
      </defs>

      {items.map((item, i) => {
        const start = i * seg;
        const mid = start + seg / 2;
        const color = segColor(theme.palette, i, N);
        const fg = textOn(color);
        const p = polar(0, 0, labelEnd, mid);
        const flip = mid > 180 && mid < 360; // keep labels on the left half readable
        return (
          <g key={i}>
            {N === 1 ? (
              <circle r={R} fill={color} />
            ) : (
              <path d={sectorPath(0, 0, R, start, start + seg)} fill={color} stroke={skin.divider} strokeWidth={N > 50 ? 0.6 : 1.4} />
            )}
            <text
              x={p.x}
              y={p.y}
              fontSize={fontSize}
              fill={fg}
              textAnchor={flip ? 'start' : 'end'}
              dominantBaseline="central"
              fontWeight="800"
              transform={`rotate(${flip ? mid + 90 : mid - 90} ${p.x} ${p.y})`}
              style={{
                paintOrder: 'stroke',
                stroke: fg === '#ffffff' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.35)',
                strokeWidth: Math.max(1.2, fontSize / 9),
                letterSpacing: N > 20 ? 0 : 0.3,
              }}
            >
              {truncate(item, maxChars)}
            </text>
          </g>
        );
      })}

      <circle r={R} fill="url(#diskShade)" pointerEvents="none" />

      {N > 1 && N <= 48 && Array.from({ length: N }, (_, i) => {
        const p = polar(0, 0, R - 6, i * seg);
        return <circle key={i} cx={p.x} cy={p.y} r={3.4} fill="white" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />;
      })}

      <circle r={HUB_R + 6} fill="rgba(0,0,0,0.25)" />
    </svg>
  );
});

/* Glossy highlight on top of the disk (static) */
const Gloss = memo(function Gloss({ r }) {
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <defs>
        <radialGradient id="gloss" cx="35%" cy="25%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx={VB / 2} cy={VB / 2} r={r} fill="url(#gloss)" />
      <circle cx={VB / 2} cy={VB / 2} r={r + 1} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="3" />
    </svg>
  );
});

/* Themed pointer; every shape shares the same viewBox with the tip at (28, 78) */
function Pointer({ theme, pointerRef }) {
  const skin = skinOf(theme);
  const col = theme.pointerColor;
  let art;
  switch (skin.pointer) {
    case 'bottle':
      art = (
        <>
          <rect x="12" y="2" width="32" height="42" rx="9" fill="#1f7a3c" />
          <path d="M 12 40 Q 12 56 22 60 L 34 60 Q 44 56 44 40 Z" fill="#1f7a3c" />
          <rect x="22" y="58" width="12" height="14" fill="#1f7a3c" />
          <rect x="19" y="70" width="18" height="8" rx="2" fill="#f5c542" stroke="#b45309" strokeWidth="1" />
          <rect x="15" y="12" width="26" height="20" rx="3" fill="#fef3c7" />
          <rect x="15" y="19" width="26" height="6" fill="#dc2626" />
          <text x="28" y="22.5" fontSize="5" fontWeight="900" textAnchor="middle" dominantBaseline="central" fill="#fff">BEER</text>
          <rect x="16" y="5" width="4" height="36" rx="2" fill="rgba(255,255,255,0.35)" />
        </>
      );
      break;
    case 'cupid':
      art = (
        <>
          <path d="M 28 12 L 17 2 L 17 18 Z M 28 12 L 39 2 L 39 18 Z" fill="#ff8fb3" stroke="#fff" strokeWidth="1" />
          <line x1="28" y1="10" x2="28" y2="60" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <path d="M 11 61 L 45 61 L 28 78 Z" fill="#ff1744" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="20" cy="58" r="9.5" fill="#ff1744" stroke="#fff" strokeWidth="2" />
          <circle cx="36" cy="58" r="9.5" fill="#ff1744" stroke="#fff" strokeWidth="2" />
          <path d="M 14 61 L 42 61 L 28 75 Z" fill="#ff1744" />
          <circle cx="23" cy="55" r="2.5" fill="rgba(255,255,255,0.6)" />
        </>
      );
      break;
    case 'trident':
      art = (
        <g style={{ filter: `drop-shadow(0 0 5px ${col})` }}>
          <line x1="28" y1="0" x2="28" y2="50" stroke="#3b0a1a" strokeWidth="6" strokeLinecap="round" />
          <path d="M 13 48 L 43 48 M 13 48 L 13 66 L 19 74 M 43 48 L 43 66 L 37 74 M 28 48 L 28 78" stroke={col} strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 19 74 l -5 -1 l 2 -6 Z M 37 74 l 5 -1 l -2 -6 Z M 28 78 l -4 -7 h 8 Z" fill={col} />
        </g>
      );
      break;
    case 'pin':
      art = (
        <>
          <line x1="28" y1="44" x2="28" y2="78" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <line x1="27" y1="46" x2="27" y2="70" stroke="#fff" strokeWidth="1" opacity="0.7" />
          <path d="M 15 46 L 41 46 L 37 36 L 19 36 Z" fill={col} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
          <rect x="22" y="30" width="12" height="7" fill={col} />
          <ellipse cx="28" cy="18" rx="18" ry="16" fill={col} stroke="#fff" strokeWidth="2.5" />
          <ellipse cx="22" cy="12" rx="6" ry="4" fill="rgba(255,255,255,0.5)" />
        </>
      );
      break;
    case 'bolt':
      art = (
        <g style={{ filter: 'drop-shadow(0 0 6px #00FFFF)' }}>
          <path d="M 36 0 L 8 44 L 26 44 L 28 78 L 50 30 L 34 30 L 42 0 Z" fill="#FFFF00" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
        </g>
      );
      break;
    default:
      art = (
        <>
          <path d="M 28 78 L 9.2 37 A 20 20 0 1 1 46.8 37 Z" fill={col} stroke="white" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="28" cy="30" r="6.5" fill="white" />
          <circle cx="28" cy="30" r="3" fill="rgba(0,0,0,0.35)" />
        </>
      );
  }
  return (
    <div className="wheel-pointer absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ top: '-2%', width: '12%' }}>
      <svg ref={pointerRef} viewBox="0 0 56 80" className="w-full block overflow-visible" aria-hidden="true">{art}</svg>
    </div>
  );
}

/* Art behind the SPIN label in the hub button */
function HubFace({ theme }) {
  const skin = skinOf(theme);
  const acc = theme.accent;
  const cls = 'absolute inset-0 w-full h-full';
  switch (skin.hub) {
    case 'cap': {
      const pts = Array.from({ length: 42 }, (_, i) => {
        const a = (i * Math.PI) / 21;
        const r = i % 2 ? 44 : 49;
        return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
      }).join(' ');
      return (
        <svg viewBox="0 0 100 100" className={cls} aria-hidden="true">
          <polygon points={pts} fill="#f5c542" stroke="#b45309" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="50" cy="50" r="37" fill="#dc2626" stroke="#fff" strokeWidth="2.5" />
          <circle cx="50" cy="50" r="31" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          <ellipse cx="40" cy="36" rx="12" ry="6" fill="rgba(255,255,255,0.25)" transform="rotate(-30 40 36)" />
        </svg>
      );
    }
    case 'coin':
      return (
        <svg viewBox="0 0 100 100" className={cls} aria-hidden="true">
          <defs>
            <linearGradient id="hubCoin" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff3b0" />
              <stop offset="50%" stopColor="#f1c232" />
              <stop offset="100%" stopColor="#b8860b" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#hubCoin)" />
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(120,80,0,0.5)" strokeWidth="1.5" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="39" fill="none" stroke="rgba(120,80,0,0.6)" strokeWidth="2" />
          <text x="50" y="29" fontSize="15" textAnchor="middle" dominantBaseline="central" opacity="0.85">🍀</text>
        </svg>
      );
    case 'ember':
      return (
        <svg viewBox="0 0 100 100" className={cls} aria-hidden="true">
          <defs>
            <radialGradient id="hubEmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={acc} stopOpacity="0.9" />
              <stop offset="55%" stopColor="#3b0a2a" />
              <stop offset="100%" stopColor="#120514" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#hubEmber)" />
          <circle cx="50" cy="50" r="46" fill="none" stroke={acc} strokeWidth="2.5" className="ember-ring" style={{ filter: `drop-shadow(0 0 5px ${acc})` }} />
          <circle cx="50" cy="50" r="38" fill="none" stroke={acc} strokeOpacity="0.4" strokeWidth="1" strokeDasharray="4 6" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 100 100" className={cls} aria-hidden="true">
          <defs>
            <linearGradient id="hubHeart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#be185d" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#hubHeart)" stroke="#fff" strokeWidth="3" />
          <path d="M 50 78 C 20 58 14 40 26 30 C 36 22 46 28 50 36 C 54 28 64 22 74 30 C 86 40 80 58 50 78 Z" fill="rgba(255,255,255,0.28)" />
        </svg>
      );
    case 'button':
      return (
        <svg viewBox="0 0 100 100" className={cls} aria-hidden="true">
          <defs>
            <linearGradient id="hubBtn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill="url(#hubBtn)" stroke="#bfdbfe" strokeWidth="2.5" />
          <ellipse cx="50" cy="30" rx="30" ry="12" fill="rgba(255,255,255,0.18)" />
        </svg>
      );
    case 'core':
      return (
        <svg viewBox="0 0 100 100" className={cls} aria-hidden="true">
          <circle cx="50" cy="50" r="49" fill="#0a0a12" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#FF00FF" strokeWidth="2.5" className="neon-ring" style={{ filter: 'drop-shadow(0 0 5px #FF00FF)' }} />
          <circle cx="50" cy="50" r="36" fill="none" stroke="#00FFFF" strokeWidth="2" className="neon-ring alt" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }} />
        </svg>
      );
    default:
      return null;
  }
}
