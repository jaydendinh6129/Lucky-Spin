/* ============================================================
 *  JParty Creator — Question Bank, Game Editor, My Games.
 *
 *  Content (questions) is separate from configuration (games) is separate
 *  from the live session (handled by the existing game engine). A game
 *  holds question IDs, never copies, so one question is reusable across
 *  many games and duplicating a game is cheap.
 * ============================================================ */

const DIFF_COLORS = { easy: '#4ade80', medium: '#facc15', hard: '#f87171' };
const TIMER_CHOICES = [0, 10, 20, 30, 60];

/* ---------- shared bits ---------- */

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-bold uppercase tracking-wider text-white/55">{label}</span>
        {hint && <span className="text-[11px] text-white/40">{hint}</span>}
      </span>
      {children}
      {error && <span className="block text-[11px] text-red-300 mt-1">⚠ {error}</span>}
    </label>
  );
}
const inputCls = 'w-full rounded-2xl px-4 py-2.5 bg-black/25 placeholder-white/40 border border-white/15 focus:outline-none focus:border-white/40';
const errCls = 'border-red-400/70';

/* Bilingual text input: EN is required, VI optional and falls back to EN */
function BiInput({ value, onChange, placeholder, lang, error, textarea }) {
  const [showVi, setShowVi] = useState(!!(value && value.vi));
  const Tag = textarea ? 'textarea' : 'input';
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Tag value={value.en} rows={textarea ? 2 : undefined} onChange={(e) => onChange({ ...value, en: e.target.value })}
          placeholder={placeholder} className={`${inputCls} ${error ? errCls : ''} pr-12`} />
        <span className="absolute right-3 top-2.5 text-[10px] font-black text-white/35">EN</span>
      </div>
      {showVi ? (
        <div className="relative">
          <Tag value={value.vi} rows={textarea ? 2 : undefined} onChange={(e) => onChange({ ...value, vi: e.target.value })}
            placeholder={placeholder} className={`${inputCls} pr-12`} />
          <span className="absolute right-3 top-2.5 text-[10px] font-black text-white/35">VI</span>
        </div>
      ) : (
        <button onClick={() => setShowVi(true)} className="text-[11px] font-bold text-white/50 hover:text-white">+ Tiếng Việt</button>
      )}
    </div>
  );
}

/* Upload / preview / replace / remove one image, stored as a Blob in IndexedDB */
function ImagePicker({ t, imageId, onChange, compact }) {
  const fileRef = useRef(null);
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  useEffect(() => { let on = true; ContentStore.imageUrl(imageId).then((u) => on && setUrl(u)); return () => { on = false; }; }, [imageId]);

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const id = await ContentStore.putImage(file, t.imageErrors);
      if (imageId) await ContentStore.deleteImage(imageId);
      onChange(id);
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };
  const clear = async () => { if (imageId) await ContentStore.deleteImage(imageId); onChange(null); };

  return (
    <div className={compact ? '' : 'space-y-2'}>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pick} className="hidden" />
      {url ? (
        <div className="flex items-center gap-2">
          <img src={url} alt="" className={`${compact ? 'h-10 w-10' : 'h-24'} rounded-xl object-cover border border-white/20`} />
          <button onClick={() => fileRef.current.click()} className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-white/10 border border-white/15 btn-press">{t.replaceImage}</button>
          <button onClick={clear} aria-label={t.removeImage} className="w-8 h-8 grid place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10"><Icon.X /></button>
        </div>
      ) : (
        <button onClick={() => fileRef.current.click()} disabled={busy}
          className={`${compact ? 'w-10 h-10 text-base' : 'w-full py-3'} grid place-items-center rounded-xl border border-dashed border-white/25 hover:border-white/50 hover:bg-white/5 btn-press text-sm font-bold disabled:opacity-50`}>
          {busy ? '…' : compact ? '🖼️' : `🖼️ ${t.uploadImage}`}
        </button>
      )}
      {err && <div className="text-[11px] text-red-300">⚠ {err}</div>}
    </div>
  );
}

/* ---------- validation ---------- */
const validateQuestion = (q, t) => {
  const e = {};
  if (!q.text.en.trim()) e.text = t.vQuestionText;
  if (q.type === 'mc') {
    const filled = q.options.filter((o) => o.text.en.trim() || o.imageId);
    if (filled.length < 2) e.options = t.vTwoOptions;
    if (!q.options[q.answer] || !(q.options[q.answer].text.en.trim() || q.options[q.answer].imageId)) e.answer = t.vCorrectAnswer;
  }
  return e;
};
const validateGame = (g, t) => {
  const e = {};
  if (!g.title.en.trim()) e.title = t.vGameTitle;
  if (!g.questionIds.length) e.questions = t.vNoQuestions;
  return e;
};

/* ---------- Question editor ---------- */

function QuestionEditor({ t, lang, question, onSave, onCancel, onSaveAndNext }) {
  const [q, setQ] = useState(() => question || createQuestion());
  const [errors, setErrors] = useState({});
  const set = (patch) => setQ((prev) => ({ ...prev, ...patch }));
  const setOption = (i, patch) => setQ((prev) => ({ ...prev, options: prev.options.map((o, k) => (k === i ? { ...o, ...patch } : o)) }));

  const setType = (type) => setQ((prev) => ({
    ...prev, type,
    options: type === 'tf'
      ? [{ text: { en: 'True', vi: 'Đúng' }, imageId: null }, { text: { en: 'False', vi: 'Sai' }, imageId: null }]
      : prev.options.length >= 2 ? prev.options : [{ text: BI(), imageId: null }, { text: BI(), imageId: null }],
    answer: 0,
  }));

  const submit = (next) => {
    const e = validateQuestion(q, t);
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = { ...q, options: q.type === 'tf' ? q.options.slice(0, 2) : q.options.filter((o) => o.text.en.trim() || o.imageId) };
    if (clean.answer >= clean.options.length) clean.answer = 0;
    (next ? onSaveAndNext : onSave)(clean);
  };

  return (
    <div className="space-y-4">
      <Field label={t.questionText} error={errors.text}>
        <BiInput value={q.text} onChange={(text) => set({ text })} placeholder={t.questionPlaceholder} lang={lang} error={errors.text} textarea />
      </Field>

      <Field label={t.optionalImage}>
        <ImagePicker t={t} imageId={q.imageId} onChange={(imageId) => set({ imageId })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.questionType}>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-black/30 border border-white/10">
            {['mc', 'tf'].map((ty) => (
              <button key={ty} onClick={() => setType(ty)} aria-pressed={q.type === ty}
                className={`py-1.5 rounded-full text-xs font-bold btn-press ${q.type === ty ? 'bg-white text-slate-900' : 'text-white/70'}`}>
                {ty === 'mc' ? t.typeMC : t.typeTF}
              </button>
            ))}
          </div>
        </Field>
        <Field label={t.difficulty}>
          <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-black/30 border border-white/10">
            {DIFFICULTIES.map((d) => (
              <button key={d} onClick={() => set({ difficulty: d })} aria-pressed={q.difficulty === d}
                className={`py-1.5 rounded-full text-[11px] font-bold btn-press ${q.difficulty === d ? 'text-slate-900' : 'text-white/70'}`}
                style={q.difficulty === d ? { background: DIFF_COLORS[d] } : undefined}>
                {t.difficultyLabels[d]}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <Field label={t.answerOptions} hint={q.type === 'mc' ? t.tapToMarkCorrect : ''} error={errors.options || errors.answer}>
        <div className="space-y-2">
          {q.options.map((o, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-2xl p-2 border ${q.answer === i ? 'border-green-300/60 bg-green-500/10' : 'border-white/10 bg-black/15'}`}>
              <button onClick={() => set({ answer: i })} aria-label={t.markCorrect} aria-pressed={q.answer === i}
                className={`w-8 h-8 shrink-0 rounded-full grid place-items-center text-sm font-black btn-press ${q.answer === i ? 'bg-green-400 text-slate-900' : 'border border-white/25 text-white/50'}`}>
                {q.answer === i ? '✓' : 'ABCDEF'[i]}
              </button>
              {q.type === 'tf' ? (
                <span className="flex-1 font-bold px-2">{L(o.text, lang)}</span>
              ) : (
                <>
                  <div className="flex-1 min-w-0"><BiInput value={o.text} onChange={(text) => setOption(i, { text })} placeholder={`${t.option} ${'ABCDEF'[i]}`} lang={lang} /></div>
                  <ImagePicker t={t} imageId={o.imageId} onChange={(imageId) => setOption(i, { imageId })} compact />
                  {q.options.length > 2 && (
                    <button onClick={() => setQ((p) => ({ ...p, options: p.options.filter((_, k) => k !== i), answer: p.answer > i ? p.answer - 1 : p.answer === i ? 0 : p.answer }))}
                      aria-label={t.del} className="w-8 h-8 shrink-0 grid place-items-center rounded-full text-white/40 hover:text-white hover:bg-white/10"><Icon.X /></button>
                  )}
                </>
              )}
            </div>
          ))}
          {q.type === 'mc' && q.options.length < 6 && (
            <button onClick={() => setQ((p) => ({ ...p, options: [...p.options, { text: BI(), imageId: null }] }))}
              className="w-full py-2 rounded-2xl border border-dashed border-white/25 hover:border-white/50 text-sm font-bold btn-press">+ {t.addOption}</button>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.topic}>
          <input list="jp-topics" value={q.topic} onChange={(e) => set({ topic: e.target.value })} className={inputCls} placeholder="science" />
        </Field>
        <Field label={t.timeOverride} hint={t.optional}>
          <select value={q.timeSec == null ? '' : q.timeSec} onChange={(e) => set({ timeSec: e.target.value === '' ? null : Number(e.target.value) })} className={inputCls}>
            <option value="">{t.useGameDefault}</option>
            {TIMER_CHOICES.map((n) => <option key={n} value={n}>{n === 0 ? t.noTimeLimit : `${n}s`}</option>)}
          </select>
        </Field>
      </div>

      <Field label={t.explanation} hint={t.optional}>
        <BiInput value={q.explanation} onChange={(explanation) => set({ explanation })} placeholder={t.explanationPlaceholder} lang={lang} textarea />
      </Field>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button onClick={() => submit(false)} className="flex-1 py-3 rounded-full font-extrabold btn-press text-white shadow-lg" style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}>💾 {t.saveQuestion}</button>
        {onSaveAndNext && <button onClick={() => submit(true)} className="flex-1 py-3 rounded-full font-bold bg-white/10 hover:bg-white/20 border border-white/15 btn-press">{t.saveAndAddAnother}</button>}
        <button onClick={onCancel} className="py-3 px-5 rounded-full text-white/60 hover:text-white text-sm">{t.cancel}</button>
      </div>
    </div>
  );
}

/* ---------- Question card (bank list + game list) ---------- */

function QuestionRow({ t, lang, q, selected, onToggle, onEdit, onDelete, dragHandlers, index }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { let on = true; ContentStore.imageUrl(q.imageId).then((u) => on && setUrl(u)); return () => { on = false; }; }, [q.imageId]);
  return (
    <li {...(dragHandlers || {})} className={`flex items-center gap-2.5 rounded-2xl p-2.5 border transition-colors ${selected ? 'bg-white/12 border-white/35' : 'bg-black/20 border-white/10'}`}>
      {index != null && <span className="w-6 shrink-0 text-center text-xs font-black text-white/40 cursor-grab">⠿</span>}
      {onToggle && (
        <button onClick={() => onToggle(q)} aria-pressed={!!selected} aria-label={t.select}
          className={`w-7 h-7 shrink-0 rounded-lg grid place-items-center text-xs font-black btn-press ${selected ? 'bg-white text-slate-900' : 'border border-white/25 text-white/40'}`}>
          {selected ? '✓' : ''}
        </button>
      )}
      {url && <img src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/15 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{L(q.text, lang) || t.untitled}</div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-white/50">
          <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: `${DIFF_COLORS[q.difficulty]}33`, color: DIFF_COLORS[q.difficulty] }}>{t.difficultyLabels[q.difficulty]}</span>
          <span className="px-1.5 py-0.5 rounded bg-white/10">{q.type === 'tf' ? t.typeTF : t.typeMC}</span>
          {q.topic && <span className="truncate">#{q.topic}</span>}
          {q.timeSec != null && <span>⏱{q.timeSec === 0 ? '∞' : `${q.timeSec}s`}</span>}
        </div>
      </div>
      {onEdit && <button onClick={() => onEdit(q)} aria-label={t.edit} className="w-8 h-8 shrink-0 grid place-items-center rounded-full hover:bg-white/10 text-white/60 hover:text-white">✏️</button>}
      {onDelete && <button onClick={() => onDelete(q)} aria-label={t.del} className="w-8 h-8 shrink-0 grid place-items-center rounded-full hover:bg-white/10 text-white/40 hover:text-white"><Icon.X /></button>}
    </li>
  );
}

/* ---------- Question Bank ---------- */

function QuestionBankView({ t, lang, sfx, showToast, onBack, onChanged }) {
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(null);   // question | 'new' | null
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('all');
  const [diff, setDiff] = useState('all');
  const [loading, setLoading] = useState(true);

  const reload = async () => { setQuestions(await ContentStore.listQuestions()); setLoading(false); };
  useEffect(() => { reload(); }, []);

  const save = async (q) => {
    await ContentStore.saveQuestion(q);
    sfx('click'); showToast(t.questionSaved);
    await reload(); await onChanged();
    return true;
  };
  const remove = async (q) => {
    await ContentStore.deleteQuestion(q.id);
    showToast(t.questionDeleted);
    await reload(); await onChanged();
  };
  const seed = async (themeId) => {
    const n = await ContentStore.importFromTheme(themeId, 10);
    showToast(t.importedN(n));
    await reload(); await onChanged();
  };

  const topics = useMemo(() => topicsOf(questions), [questions]);
  const shown = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions
      .filter((q) => (topic === 'all' || q.topic === topic) && (diff === 'all' || q.difficulty === diff))
      .filter((q) => !s || `${q.text.en} ${q.text.vi} ${q.topic} ${(q.tags || []).join(' ')}`.toLowerCase().includes(s))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [questions, search, topic, diff]);

  if (editing) {
    return (
      <section className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(null)} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
          <h2 className="text-xl font-black">{editing === 'new' ? t.newQuestion : t.editQuestion}</h2>
        </div>
        <div className="glass rounded-3xl p-4 sm:p-6">
          <QuestionEditor t={t} lang={lang} question={editing === 'new' ? null : editing}
            onSave={async (q) => { if (await save(q)) setEditing(null); }}
            onSaveAndNext={async (q) => { if (await save(q)) setEditing('new'); }}
            onCancel={() => setEditing(null)} />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
        <h2 className="text-2xl font-black flex-1">📚 {t.questionBank}</h2>
        <button onClick={() => setEditing('new')} className="px-4 py-2 rounded-full font-extrabold btn-press text-white shadow-lg text-sm" style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}>+ {t.newQuestion}</button>
      </div>

      <div className="glass rounded-3xl p-4 space-y-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`🔍 ${t.searchQuestions}`} className={inputCls} />
        <div className="flex gap-2 overflow-x-auto sb-thin pb-1">
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="rounded-full px-3 py-1.5 text-sm bg-black/25 border border-white/15 shrink-0">
            <option value="all">{t.allTopics}</option>
            {topics.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={diff} onChange={(e) => setDiff(e.target.value)} className="rounded-full px-3 py-1.5 text-sm bg-black/25 border border-white/15 shrink-0">
            <option value="all">{t.allLevels}</option>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{t.difficultyLabels[d]}</option>)}
          </select>
          <span className="text-xs text-white/50 self-center whitespace-nowrap ml-auto">{t.nOfM(shown.length, questions.length)}</span>
        </div>
      </div>

      <div className="glass rounded-3xl p-4">
        {loading ? <div className="text-center text-white/50 py-6">…</div>
          : questions.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <div className="text-5xl">📚</div>
              <div className="text-sm text-white/70">{t.bankEmpty}</div>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => setEditing('new')} className="px-4 py-2 rounded-full bg-white text-slate-900 font-bold btn-press text-sm">+ {t.newQuestion}</button>
                {QUIZ_THEMES.filter((th) => !th.custom).slice(0, 4).map((th) => (
                  <button key={th.id} onClick={() => seed(th.id)} className="px-3 py-2 rounded-full bg-white/10 border border-white/15 font-bold btn-press text-sm">{th.icon} {t.import10(L(th.title, lang))}</button>
                ))}
              </div>
            </div>
          ) : shown.length === 0 ? <div className="text-center text-white/55 py-6 text-sm">{t.noMatches}</div>
          : <ul className="space-y-1.5 max-h-[55vh] overflow-y-auto sb-thin pr-1">
              {shown.map((q) => <QuestionRow key={q.id} t={t} lang={lang} q={q} onEdit={setEditing} onDelete={remove} />)}
            </ul>}
      </div>
      <datalist id="jp-topics">{topics.map((x) => <option key={x} value={x} />)}</datalist>
    </section>
  );
}

/* ---------- Game Editor ---------- */

function GameEditorView({ t, lang, gameId, sfx, showToast, onBack, onChanged, onPlay }) {
  const [game, setGame] = useState(null);
  const [bank, setBank] = useState([]);
  const [tab, setTab] = useState('questions');     // questions | settings | preview
  const [picker, setPicker] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [errors, setErrors] = useState({});
  const [dragFrom, setDragFrom] = useState(null);

  const reloadBank = async () => setBank(await ContentStore.listQuestions());
  useEffect(() => {
    (async () => {
      const g = gameId ? await ContentStore.getGame(gameId) : null;
      setGame(g || createGame());
      await reloadBank();
    })();
  }, [gameId]);

  if (!game) return <div className="text-white/50 py-10">…</div>;

  const set = (patch) => setGame((g) => ({ ...g, ...patch }));
  const setCfg = (patch) => setGame((g) => ({ ...g, config: { ...g.config, ...patch } }));
  const byId = new Map(bank.map((q) => [q.id, q]));
  const chosen = game.questionIds.map((id) => byId.get(id)).filter(Boolean);

  const persist = async (extra = {}) => {
    const next = { ...game, ...extra };
    const e = validateGame(next, t);
    setErrors(e);
    if (Object.keys(e).length) { setTab(e.title ? 'settings' : 'questions'); return null; }
    const saved = await ContentStore.saveGame(next);
    setGame(saved);
    await onChanged();
    sfx('click');
    showToast(t.gameSaved);
    return saved;
  };

  const toggleQ = (q) => set({ questionIds: game.questionIds.includes(q.id) ? game.questionIds.filter((x) => x !== q.id) : [...game.questionIds, q.id] });
  const move = (from, to) => {
    if (from === to || to < 0 || to >= game.questionIds.length) return;
    const ids = [...game.questionIds];
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    set({ questionIds: ids });
  };

  if (editingQ) {
    return (
      <section className="w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setEditingQ(null)} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
          <h2 className="text-xl font-black">{editingQ === 'new' ? t.newQuestion : t.editQuestion}</h2>
        </div>
        <div className="glass rounded-3xl p-4 sm:p-6">
          <QuestionEditor t={t} lang={lang} question={editingQ === 'new' ? null : editingQ}
            onSave={async (q) => {
              const saved = await ContentStore.saveQuestion(q);
              await reloadBank(); await onChanged();
              if (!game.questionIds.includes(saved.id)) set({ questionIds: [...game.questionIds, saved.id] });
              setEditingQ(null); showToast(t.questionSaved);
            }}
            onSaveAndNext={async (q) => {
              const saved = await ContentStore.saveQuestion(q);
              await reloadBank(); await onChanged();
              if (!game.questionIds.includes(saved.id)) set({ questionIds: [...game.questionIds, saved.id] });
              setEditingQ('new'); showToast(t.questionSaved);
            }}
            onCancel={() => setEditingQ(null)} />
        </div>
      </section>
    );
  }

  const tabs = [['questions', `📝 ${t.questions} (${chosen.length})`], ['settings', `⚙️ ${t.gameSettings}`], ['preview', `👁 ${t.preview}`]];

  return (
    <section className="w-full max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
        <h2 className="text-2xl font-black flex-1 truncate">{gameId ? t.editGame : t.createGame}</h2>
      </div>

      <div className="glass rounded-3xl p-4 space-y-3">
        <Field label={t.gameTitle} error={errors.title}>
          <BiInput value={game.title} onChange={(title) => set({ title })} placeholder={t.gameTitlePlaceholder} lang={lang} error={errors.title} />
        </Field>
        <div className="flex gap-2">
          <div className="w-20">
            <Field label={t.icon}>
              <input value={game.icon} onChange={(e) => set({ icon: [...e.target.value][0] || '🎓' })} className={`${inputCls} text-center text-xl`} maxLength={4} />
            </Field>
          </div>
          <div className="flex-1">
            <Field label={t.description} hint={t.optional}>
              <BiInput value={game.description} onChange={(description) => set({ description })} placeholder={t.descriptionPlaceholder} lang={lang} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-full bg-black/30 border border-white/10">
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-bold btn-press truncate ${tab === k ? 'bg-white text-slate-900' : 'text-white/70'}`}>{label}</button>
        ))}
      </div>

      {tab === 'questions' && (
        <div className="glass rounded-3xl p-4 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setEditingQ('new')} className="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm">+ {t.newQuestion}</button>
            <button onClick={() => setPicker(!picker)} className={`flex-1 py-2.5 rounded-2xl border font-bold btn-press text-sm ${picker ? 'bg-white text-slate-900 border-white' : 'bg-white/10 hover:bg-white/20 border-white/15'}`}>📚 {t.fromBank}</button>
          </div>

          {picker && (
            <div className="rounded-2xl border border-white/15 bg-black/20 p-3 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-white/55">{t.pickFromBank}</div>
              {bank.length === 0 ? <div className="text-sm text-white/55 text-center py-3">{t.bankEmpty}</div> : (
                <ul className="space-y-1.5 max-h-64 overflow-y-auto sb-thin pr-1">
                  {bank.map((q) => <QuestionRow key={q.id} t={t} lang={lang} q={q} selected={game.questionIds.includes(q.id)} onToggle={toggleQ} />)}
                </ul>
              )}
            </div>
          )}

          {errors.questions && <div className="text-[11px] text-red-300">⚠ {errors.questions}</div>}
          {chosen.length === 0 ? (
            <div className="text-center text-white/55 py-6 text-sm border border-dashed border-white/20 rounded-2xl">{t.noQuestionsYet}</div>
          ) : (
            <ul className="space-y-1.5">
              {chosen.map((q, i) => (
                <QuestionRow key={q.id} t={t} lang={lang} q={q} index={i} onEdit={setEditingQ}
                  onDelete={() => set({ questionIds: game.questionIds.filter((x) => x !== q.id) })}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: () => setDragFrom(i),
                    onDragOver: (e) => e.preventDefault(),
                    onDrop: () => { move(dragFrom, i); setDragFrom(null); },
                  }} />
              ))}
            </ul>
          )}
          {chosen.length > 1 && <div className="text-[11px] text-white/40 text-center">{t.dragToReorder}</div>}
        </div>
      )}

      {tab === 'settings' && (
        <div className="glass rounded-3xl p-4 space-y-4">
          <Field label={t.timePerQuestion} hint={t.questionsCanOverride}>
            <div className="grid grid-cols-5 gap-1 p-1 rounded-full bg-black/30 border border-white/10">
              {TIMER_CHOICES.map((n) => (
                <button key={n} onClick={() => setCfg({ timerSec: n })} aria-pressed={game.config.timerSec === n}
                  className={`py-2 rounded-full text-xs font-bold btn-press ${game.config.timerSec === n ? 'bg-white text-slate-900' : 'text-white/70'}`}>
                  {n === 0 ? '∞' : `${n}s`}
                </button>
              ))}
            </div>
          </Field>
          <OptionPills label={t.teamsLabel} value={game.config.teams} onChange={(v) => setCfg({ teams: v })}
            options={[{ value: 0, label: t.individual }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]} />
          <div className="space-y-3 border-t border-white/10 pt-4">
            {[['randomizeQuestions', t.randomQuestionOrder], ['randomizeAnswers', t.randomAnswerOrder], ['noRepeat', t.noRepeatQuestions]].map(([k, label]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{label}</span>
                <Switch checked={game.config[k]} onChange={(v) => setCfg({ [k]: v })} label={label} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <Field label={t.pointsPerQuestion}>
              <input type="number" min="0" max="1000" step="10" value={game.config.pointsBase} onChange={(e) => setCfg({ pointsBase: clamp(Number(e.target.value) || 0, 0, 1000) })} className={inputCls} />
            </Field>
            <Field label={t.speedBonusLabel} hint={t.zeroToDisable}>
              <input type="number" min="0" max="500" step="10" value={game.config.speedBonus} onChange={(e) => setCfg({ speedBonus: clamp(Number(e.target.value) || 0, 0, 500) })} className={inputCls} />
            </Field>
          </div>
        </div>
      )}

      {tab === 'preview' && (
        <div className="glass rounded-3xl p-4 space-y-3">
          {chosen.length === 0 ? <div className="text-center text-white/55 py-6 text-sm">{t.noQuestionsYet}</div> : (
            <ol className="space-y-3 max-h-[55vh] overflow-y-auto sb-thin pr-1">
              {chosen.map((q, i) => (
                <li key={q.id} className="rounded-2xl bg-black/25 border border-white/10 p-3">
                  <div className="text-[11px] text-white/45 mb-1">{t.question} {i + 1} · {t.difficultyLabels[q.difficulty]} · ⏱ {q.timeSec == null ? (game.config.timerSec === 0 ? '∞' : `${game.config.timerSec}s`) : q.timeSec === 0 ? '∞' : `${q.timeSec}s`}</div>
                  <div className="font-bold">{L(q.text, lang)}</div>
                  <div className="grid sm:grid-cols-2 gap-1.5 mt-2">
                    {q.options.map((o, k) => (
                      <div key={k} className={`text-sm rounded-xl px-2.5 py-1.5 border ${k === q.answer ? 'bg-green-500/20 border-green-300/50' : 'bg-white/5 border-white/10'}`}>
                        {'ABCDEF'[k]}. {L(o.text, lang)} {k === q.answer && '✓'}
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => persist()} className="flex-1 py-3.5 rounded-full font-extrabold text-lg btn-press text-white shadow-lg" style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}>💾 {t.saveGame}</button>
        <button onClick={async () => { const g = await persist(); if (g) onPlay(g); }} className="flex-1 py-3.5 rounded-full font-bold bg-white/10 hover:bg-white/20 border border-white/15 btn-press">▶ {t.saveAndPlay}</button>
      </div>
    </section>
  );
}

/* ---------- My Games ---------- */

function MyGamesView({ t, lang, sfx, showToast, onBack, onCreate, onEdit, onPlay, onOpenBank, onChanged }) {
  const [games, setGames] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState(null);

  const reload = async () => {
    const gs = await ContentStore.listGames();
    const qs = await ContentStore.listQuestions();
    const ids = new Set(qs.map((q) => q.id));
    setCounts(Object.fromEntries(gs.map((g) => [g.id, g.questionIds.filter((x) => ids.has(x)).length])));
    setGames(gs.sort((a, b) => b.updatedAt - a.updatedAt));
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const duplicate = async (g) => {
    await ContentStore.duplicateGame(g.id, t.copySuffix);
    sfx('click'); showToast(t.gameDuplicated);
    await reload(); await onChanged();
  };
  const remove = async (g) => {
    await ContentStore.deleteGame(g.id);
    setConfirmDel(null); showToast(t.gameDeleted);
    await reload(); await onChanged();
  };

  return (
    <section className="w-full max-w-2xl space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onBack} className="h-9 px-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-sm font-bold btn-press">←</button>
        <h2 className="text-2xl font-black flex-1">🎓 {t.myGames}</h2>
        <button onClick={onOpenBank} className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm">📚 {t.questionBank}</button>
        <button onClick={onCreate} className="px-4 py-2 rounded-full font-extrabold btn-press text-white shadow-lg text-sm" style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}>+ {t.createGame}</button>
      </div>

      {loading ? <div className="glass rounded-3xl p-6 text-center text-white/50">…</div>
        : games.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center space-y-3">
            <div className="text-6xl">🎓</div>
            <h3 className="text-xl font-black">{t.noGamesYet}</h3>
            <p className="text-sm text-white/70 max-w-sm mx-auto">{t.noGamesBody}</p>
            <button onClick={onCreate} className="px-6 py-3 rounded-full font-extrabold btn-press text-white shadow-lg" style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}>+ {t.createGame}</button>
          </div>
        ) : (
          <ul className="space-y-2">
            {games.map((g) => {
              const n = counts[g.id] || 0;
              return (
                <li key={g.id} className="glass rounded-2xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-12 h-12 shrink-0 rounded-2xl grid place-items-center text-2xl border border-white/15" style={{ background: `linear-gradient(135deg, ${g.accent}44, ${g.accent}11)` }}>{g.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold truncate">{L(g.title, lang) || t.untitled}</div>
                      <div className="text-[11px] text-white/55 truncate">
                        {t.questionsN(n)} · ⏱ {g.config.timerSec === 0 ? '∞' : `${g.config.timerSec}s`}
                        {g.config.teams > 0 && ` · ${t.nTeams(g.config.teams)}`} · {fmtAgo(g.updatedAt, lang)}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mt-2.5">
                    <button onClick={() => onPlay(g)} disabled={n === 0} title={n === 0 ? t.vNoQuestions : ''}
                      className="py-2 rounded-xl font-bold btn-press text-sm text-white disabled:opacity-40" style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)' }}>▶ {t.play}</button>
                    <button onClick={() => onEdit(g)} className="py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm">✏️ {t.edit}</button>
                    <button onClick={() => duplicate(g)} className="py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm">⧉ {t.duplicate}</button>
                    <button onClick={() => setConfirmDel(confirmDel === g.id ? null : g.id)} className="py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 font-bold btn-press text-sm">🗑 {t.del}</button>
                  </div>
                  {confirmDel === g.id && (
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      <span className="flex-1 text-white/75">{t.confirmDeleteGame}</span>
                      <button onClick={() => remove(g)} className="px-3 py-1.5 rounded-full bg-red-500/80 font-bold btn-press">{t.del}</button>
                      <button onClick={() => setConfirmDel(null)} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 font-bold btn-press">{t.cancel}</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
    </section>
  );
}
