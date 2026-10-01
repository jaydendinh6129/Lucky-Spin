/* ============================================================
 *  Premium UI — plan badges, upgrade modal, pricing page, dev plan switcher
 * ============================================================ */

function PlanBadge({ plan, locked, t }) {
  if (!plan || plan === 'free') return null;
  const max = plan === 'max';
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold tracking-wider px-1.5 py-0.5 rounded shrink-0 ${max ? 'text-white' : 'bg-yellow-300 text-yellow-900'}`}
      style={max ? { background: 'linear-gradient(90deg, #f59e0b, #e11d48 55%, #a855f7)', boxShadow: '0 0 12px -3px #f59e0b' } : undefined}
      title={locked ? t.availableWith(plan) : undefined}
    >
      {max ? '👑 ' : ''}{PLAN_LABEL[plan]}{locked ? ' 🔒' : ''}
    </span>
  );
}

/* Compact modal shown when a locked item is tapped — never during gameplay */
function UpgradeModal({ t, plan, meta, onUpgrade, onClose }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const copy = t.upgrade[plan];
  const max = plan === 'max';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="upgrade-title" className="bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl animate-pop" onClick={(e) => e.stopPropagation()}>
        {meta ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden="true">{meta.icon}</span>
              <div className="min-w-0">
                <h3 id="upgrade-title" className="text-xl font-extrabold truncate">{meta.title}</h3>
                <div className="text-sm text-white/65 truncate">{meta.description}</div>
              </div>
            </div>
            <div className="mt-4 text-xs font-bold uppercase tracking-wider text-white/55">{t.availableWith(plan)}</div>
          </>
        ) : (
          <>
            <h3 id="upgrade-title" className="text-2xl font-extrabold">{copy.title}</h3>
            <p className="text-sm text-white/70 mt-1">{copy.body}</p>
          </>
        )}
        <ul className="mt-3 space-y-1.5 text-sm">
          {copy.perks.map((p) => <li key={p} className="flex items-center gap-2"><span className="text-green-300">✓</span> {p}</li>)}
        </ul>
        {max && <div className="mt-3 text-xs italic text-white/60">“{t.planTag.max}”</div>}
        <button ref={ref} onClick={() => onUpgrade(plan)}
          className="mt-5 w-full rounded-full py-3 font-extrabold btn-press shadow-lg text-white"
          style={{ background: max ? 'linear-gradient(90deg, #f59e0b, #e11d48 55%, #a855f7)' : 'linear-gradient(90deg, #facc15, #f472b6)', color: max ? '#fff' : '#3b0764' }}>
          {t.upgradeTo(plan)}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-sm text-white/60 hover:text-white py-2">{t.maybeLater}</button>
      </div>
    </div>
  );
}

const COMPARE_ROWS = [
  ['basicSpinner', 'free'], ['basicThemes', 'free'], ['advancedThemes', 'pro'], ['basicBattle', 'free'], ['advancedBattle', 'pro'],
  ['king', 'pro'], ['quiz', 'free'], ['advancedQuiz', 'pro'], ['miniGames', 'free'], ['advancedMini', 'pro'], ['cards', 'pro'], ['customItems', 'free'],
  ['customLogo', 'max'], ['venueName', 'max'], ['venueMode', 'max'], ['qrJoin', 'max'], ['realtime', 'max'], ['hostMode', 'max'], ['bigScreen', 'max'], ['venueStats', 'max'],
];

/* Choose your plan — three cards plus the comparison table */
function PricingView({ t, sub, onUpgrade, onBack }) {
  const cards = [
    { plan: 'free', icon: '🎉', price: '$0', style: { background: 'rgba(255,255,255,0.06)' } },
    { plan: 'pro', icon: '⭐', price: null, style: { background: 'linear-gradient(160deg, rgba(250,204,21,0.18), rgba(244,114,182,0.14))', borderColor: 'rgba(250,204,21,0.5)' } },
    { plan: 'max', icon: '👑', price: null, style: { background: 'linear-gradient(160deg, rgba(245,158,11,0.22), rgba(225,29,72,0.18) 55%, rgba(168,85,247,0.2))', borderColor: 'rgba(245,158,11,0.6)', boxShadow: '0 30px 80px -40px #f59e0b' } },
  ];
  return (
    <section className="w-full max-w-3xl">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
        <h2 className="text-2xl font-black">{t.choosePlan}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ plan, icon, price, style }) => {
          const current = sub.plan === plan;
          const below = planAtLeast(sub.plan, plan) && !current;
          return (
            <div key={plan} className="glass rounded-3xl p-5 flex flex-col border" style={style}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-black tracking-wide">{icon} {PLAN_LABEL[plan]}</div>
                {price && <div className="text-sm font-bold text-white/70">{price}</div>}
              </div>
              <div className="text-xs italic text-white/65 mt-1">“{t.planTag[plan]}”</div>
              <ul className="mt-4 space-y-1.5 text-sm flex-1">
                {t.planCards[plan].map((f) => <li key={f} className="flex items-start gap-2"><span className="text-green-300">✓</span><span>{f}</span></li>)}
              </ul>
              {current ? (
                <div className="mt-5 text-center text-xs font-extrabold tracking-widest py-3 rounded-full bg-white/15 border border-white/20">✓ {t.currentPlan}</div>
              ) : below ? (
                <div className="mt-5 text-center text-xs font-bold tracking-widest py-3 text-white/40">—</div>
              ) : (
                <button onClick={() => onUpgrade(plan)} className="mt-5 py-3 rounded-full font-extrabold btn-press shadow-lg"
                  style={plan === 'max' ? { background: 'linear-gradient(90deg, #f59e0b, #e11d48 55%, #a855f7)', color: '#fff' } : { background: 'linear-gradient(90deg, #facc15, #f472b6)', color: '#3b0764' }}>
                  {t.upgradeTo(plan)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="glass rounded-3xl p-4 sm:p-5 mt-4 overflow-x-auto">
        <h3 className="font-bold mb-3">{t.comparePlans}</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-white/55">
              <th className="text-left font-bold py-1.5">&nbsp;</th>
              {PLANS.map((p) => <th key={p} className={`font-black py-1.5 w-16 ${sub.plan === p ? 'text-white' : ''}`}>{PLAN_LABEL[p]}</th>)}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map(([key, min]) => (
              <tr key={key} className="border-t border-white/10">
                <td className="py-2 pr-2 text-white/85">{t.compare[key]}</td>
                {PLANS.map((p) => (
                  <td key={p} className="text-center py-2" aria-label={planAtLeast(p, min) ? 'yes' : 'no'}>
                    {planAtLeast(p, min) ? <span className="text-green-300 font-black">✓</span> : <span className="text-white/25">–</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-center text-[11px] text-white/45 mt-3">{t.paymentsSoon}</div>
    </section>
  );
}

/* Plan row for Settings: current plan + a single upgrade button */
function PlanIndicator({ t, sub, onOpenPricing }) {
  const next = sub.plan === 'free' ? 'pro' : sub.plan === 'pro' ? 'max' : null;
  return (
    <div className="flex items-center justify-between gap-3">
      <button onClick={() => onOpenPricing(next)} className="text-left min-w-0 flex-1 rounded-xl -mx-1 px-1 py-1 hover:bg-white/5 btn-press" aria-label={t.comparePlans}>
        <div className="font-semibold flex items-center gap-2">💎 {t.myPlan} <PlanBadge plan={sub.plan} t={t} />{sub.plan === 'free' && <span className="text-xs text-white/60">{PLAN_LABEL.free}</span>}</div>
        <div className="text-xs text-white/60">{t.planTag[sub.plan]}</div>
      </button>
      {next ? (
        <button onClick={() => onOpenPricing(next)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 btn-press whitespace-nowrap">{t.upgradeTo(next)}</button>
      ) : (
        <span className="text-xs font-bold text-amber-300 whitespace-nowrap">✓ {t.maxActive}</span>
      )}
    </div>
  );
}

/* Development only — never rendered in production (see IS_DEV) */
function DevPlanSwitcher({ t, sub, onSet }) {
  if (!IS_DEV) return null;
  return (
    <div className="rounded-2xl p-3 border border-dashed border-amber-300/40 bg-amber-300/5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80 mb-2">🛠 {t.devSwitcher}</div>
      <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-black/30 border border-white/10">
        {PLANS.map((p) => (
          <button key={p} onClick={() => onSet(p)} aria-pressed={sub.plan === p}
            className={`py-1.5 rounded-full text-xs font-black btn-press ${sub.plan === p ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'}`}>{PLAN_LABEL[p]}</button>
        ))}
      </div>
    </div>
  );
}
