/* ============================================================
 *  Timer engine — one countdown per component, cleaned up on unmount
 * ============================================================ */

function useTimer() {
  const [snap, setSnap] = useState({ ms: 0, total: 0, running: false });
  const ref = useRef({ end: 0, remain: 0, total: 0, raf: 0, onDone: null });
  const clear = () => { cancelAnimationFrame(ref.current.raf); ref.current.raf = 0; };

  const tick = useCallback(() => {
    const r = Math.max(0, ref.current.end - performance.now());
    if (r <= 0) {
      clear();
      setSnap({ ms: 0, total: ref.current.total, running: false });
      const cb = ref.current.onDone;
      ref.current.onDone = null;
      if (cb) cb();
      return;
    }
    setSnap({ ms: r, total: ref.current.total, running: true });
    ref.current.raf = requestAnimationFrame(tick);
  }, []);

  const start = useCallback((ms, onDone) => {
    clear();
    ref.current = { end: performance.now() + ms, remain: 0, total: ms, raf: 0, onDone: onDone || null };
    setSnap({ ms, total: ms, running: true });
    ref.current.raf = requestAnimationFrame(tick);
  }, [tick]);
  const pause = useCallback(() => {
    if (!ref.current.raf) return;
    ref.current.remain = Math.max(0, ref.current.end - performance.now());
    clear();
    setSnap((s) => ({ ...s, running: false }));
  }, []);
  const resume = useCallback(() => {
    if (ref.current.raf || !ref.current.remain) return;
    ref.current.end = performance.now() + ref.current.remain;
    ref.current.remain = 0;
    ref.current.raf = requestAnimationFrame(tick);
    setSnap((s) => ({ ...s, running: true }));
  }, [tick]);
  const stop = useCallback(() => {
    clear();
    ref.current.onDone = null;
    ref.current.remain = 0;
    setSnap((s) => ({ ...s, running: false }));
  }, []);
  const reset = useCallback(() => {
    clear();
    ref.current = { end: 0, remain: 0, total: 0, raf: 0, onDone: null };
    setSnap({ ms: 0, total: 0, running: false });
  }, []);

  useEffect(() => () => clear(), []);
  return { ...snap, seconds: Math.ceil(snap.ms / 1000), progress: snap.total ? snap.ms / snap.total : 0, start, pause, resume, stop, reset };
}

/* Count-up stopwatch (memory game) */
function useStopwatch() {
  const [ms, setMs] = useState(0);
  const ref = useRef({ start: 0, raf: 0 });
  const tick = useCallback(() => {
    setMs(performance.now() - ref.current.start);
    ref.current.raf = requestAnimationFrame(tick);
  }, []);
  const start = useCallback(() => {
    cancelAnimationFrame(ref.current.raf);
    ref.current.start = performance.now();
    ref.current.raf = requestAnimationFrame(tick);
  }, [tick]);
  const stop = useCallback(() => cancelAnimationFrame(ref.current.raf), []);
  const reset = useCallback(() => { cancelAnimationFrame(ref.current.raf); setMs(0); }, []);
  useEffect(() => () => cancelAnimationFrame(ref.current.raf), []);
  return { ms, start, stop, reset };
}

const fmtSeconds = (ms) => `${(ms / 1000).toFixed(1)}s`;
