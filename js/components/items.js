/* ============================================================
 *  Items panel
 * ============================================================ */

function ItemsPanel({ t, items, theme, disabled, eliminatedCount, actions }) {
  const [addValue, setAddValue] = useState('');
  const [bulk, setBulk] = useState(false);
  const [draft, setDraft] = useState('');
  const [numOpen, setNumOpen] = useState(false);
  const [numN, setNumN] = useState(10);

  const submitAdd = () => {
    const parts = addValue.split(/[\n,]/).map(clip).filter(Boolean);
    if (!parts.length) return;
    actions.add(parts);
    setAddValue('');
  };
  const toggleBulk = () => {
    if (!bulk) setDraft(items.join('\n'));
    setBulk(!bulk);
  };

  return (
    <section
      className={`glass w-full max-w-xl rounded-3xl p-4 sm:p-5 transition-opacity ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      aria-disabled={disabled}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
          <span aria-hidden="true">📝</span> {t.items}
          <span className={`text-xs font-medium ml-1 tabular-nums ${items.length >= MAX_ITEMS ? 'text-yellow-300' : 'text-white/60'}`}>
            {items.length}/{MAX_ITEMS}
          </span>
        </h2>
        <button
          onClick={toggleBulk}
          className={`px-3 py-1.5 rounded-full text-xs font-bold border btn-press ${bulk ? 'bg-white text-slate-900 border-white' : 'bg-white/10 border-white/15 hover:bg-white/20'}`}
        >
          {bulk ? `✓ ${t.done}` : `✏️ ${t.bulkEdit}`}
        </button>
      </div>

      {bulk ? (
        <textarea
          value={draft}
          autoFocus
          onChange={(e) => { setDraft(e.target.value); actions.setFromText(e.target.value); }}
          rows={8}
          placeholder={t.bulkPlaceholder}
          className="w-full rounded-2xl p-3 bg-black/20 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40 resize-y font-medium leading-relaxed"
        />
      ) : (
        <>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={addValue}
              maxLength={600}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAdd(); } }}
              onPaste={(e) => {
                const text = e.clipboardData.getData('text');
                if (text.includes('\n')) {
                  e.preventDefault();
                  actions.add(text.split('\n').map(clip).filter(Boolean));
                }
              }}
              placeholder={t.quickAdd}
              aria-label={t.quickAdd}
              className="flex-1 min-w-0 rounded-full px-4 py-2.5 bg-black/20 placeholder-white/45 border border-white/15 focus:outline-none focus:border-white/40"
            />
            <button
              onClick={submitAdd}
              disabled={!addValue.trim()}
              className="px-5 rounded-full bg-white text-slate-900 font-bold btn-press hover:bg-white/90 disabled:opacity-50"
            >
              {t.add}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-sm text-white/60 text-center py-6 border border-dashed border-white/20 rounded-2xl">{t.emptyList}</div>
          ) : (
            <ul className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1 -mr-1">
              {items.map((item, i) => (
                <li
                  key={`${i}-${item}`}
                  className="group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-black/20 border border-white/10 text-sm max-w-full"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: segColor(theme.palette, i, items.length) }} />
                  <span className="truncate max-w-[180px]" title={item}>{item}</span>
                  <button
                    onClick={() => actions.removeAt(i)}
                    aria-label={t.removeItem(item)}
                    className="w-6 h-6 shrink-0 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/15"
                  >
                    <Icon.X />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3">
        <ToolBtn onClick={actions.shuffle} disabled={items.length < 2}>🔀 {t.shuffle}</ToolBtn>
        <ToolBtn onClick={actions.sort} disabled={items.length < 2}>🔤 {t.sort}</ToolBtn>
        <ToolBtn onClick={actions.dedupe} disabled={items.length < 2}>🧹 {t.dedupe}</ToolBtn>
        <ToolBtn onClick={() => setNumOpen(!numOpen)}>🔢 {t.numbers}</ToolBtn>
        <ToolBtn onClick={() => { actions.sample(); setBulk(false); }}>✨ {t.sample}</ToolBtn>
        <ToolBtn onClick={() => { actions.clear(); setBulk(false); }} disabled={!items.length}>🗑️ {t.clear}</ToolBtn>
      </div>

      {numOpen && (
        <div className="mt-3 flex items-center gap-2 text-sm animate-fade">
          <span className="text-white/80">{t.fillNumbers}</span>
          <input
            type="number"
            min="2"
            max={MAX_ITEMS}
            value={numN}
            onChange={(e) => setNumN(e.target.value)}
            className="w-20 rounded-full px-3 py-1.5 bg-black/20 border border-white/15 focus:outline-none focus:border-white/40 tabular-nums"
          />
          <button
            onClick={() => { actions.numbers(clamp(parseInt(numN, 10) || 10, 2, MAX_ITEMS)); setNumOpen(false); setBulk(false); }}
            className="px-4 py-1.5 rounded-full bg-white text-slate-900 font-bold btn-press"
          >
            {t.fill}
          </button>
        </div>
      )}

      {eliminatedCount > 0 && (
        <button onClick={actions.restore} className="mt-3 w-full text-sm font-semibold py-2 rounded-2xl border border-dashed border-white/30 hover:bg-white/10 btn-press">
          {t.restoreRemoved(eliminatedCount)}
        </button>
      )}
    </section>
  );
}
