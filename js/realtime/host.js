/* ============================================================
 *  Host session — the host device is authoritative. Phones send intents
 *  (JOIN / READY / LEAVE / ACTION); the host validates them, mutates the
 *  party and broadcasts a full STATE snapshot. A reconnecting phone simply
 *  receives the latest snapshot — nothing restarts.
 * ============================================================ */

function useHostSession({ venue, players, setPlayers, stage, sub }) {
  const [room, setRoom] = useState(null);          // { code, createdAt }
  const [remote, setRemote] = useState({});        // clientId → { playerId, name, ready, online, lastSeen }
  const [status, setStatus] = useState('offline'); // online | reconnecting | offline | taken  (PeerJS broker)
  const [paused, setPaused] = useState(false);
  /* Live answers for the current question: { [questionId]: { [clientId]: {index, ms, at} } }.
   * First answer wins — a student cannot change their mind after locking in. */
  const [answers, setAnswers] = useState({});
  const transportRef = useRef(null);
  const seqRef = useRef(0);
  const liveRef = useRef({});
  liveRef.current = { venue, players, setPlayers, stage, remote, paused, room, sub, answers };

  const snapshot = useCallback(() => {
    const { venue: v, players: ps, stage: st, remote: rm, paused: pz, room: r } = liveRef.current;
    const online = Object.values(rm).filter((x) => x.online).length;
    return {
      type: RT.STATE, seq: ++seqRef.current, ts: Date.now(),
      code: r ? r.code : null, paused: pz,
      venue: v && v.enabled ? { name: v.name, tagline: v.tagline, logo: v.logo, primary: v.primary, table: v.table } : null,
      players: ps.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, score: p.score, eliminated: p.eliminated, remote: !!p.clientId, ready: p.clientId ? !!(rm[p.clientId] && rm[p.clientId].ready) : true, online: p.clientId ? !!(rm[p.clientId] && rm[p.clientId].online) : true })),
      stage: st ? {
        icon: st.icon, title: st.title, status: st.status, round: st.round, total: st.total || null,
        questionId: st.questionId || null,
        options: st.options || null,                 // [{ text, image }] → nút bấm trên điện thoại
        reveal: st.reveal || null,                   // { answer } sau khi lộ đáp án
        answeredBy: st.questionId && answers[st.questionId] ? Object.keys(answers[st.questionId]) : [],
        participants: (st.participants || []).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color })),
        roles: st.roles || null, challenge: st.challenge || null, image: st.image || null, timerMs: st.timerMs == null ? null : st.timerMs,
        scores: (st.scores || []).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, score: p.score, eliminated: p.eliminated })),
        winner: (st.winner || []).map((p) => ({ id: p.id, name: p.name, avatar: p.avatar })), winnerLabel: st.winnerLabel || null,
      } : null,
      onlineCount: online,
    };
  }, []);

  const broadcast = useCallback(() => { if (transportRef.current) transportRef.current.broadcast(snapshot()); }, [snapshot]);
  /* Answers of one question, keyed by the party player id the game already knows */
  const answersFor = useCallback((questionId) => {
    const forQ = answers[questionId] || {};
    const out = {};
    Object.values(forQ).forEach((a) => { if (a.playerId) out[a.playerId] = a; });
    return out;
  }, [answers]);
  const clearAnswers = useCallback(() => setAnswers({}), []);

  const onMessage = useCallback((clientId, m, routeId) => {
    const { players: ps, setPlayers: setPs, venue: v, remote: rm } = liveRef.current;
    switch (m.type) {
      case RT.JOIN: {
        /* a Big Screen window only wants the snapshot — it never becomes a player */
        if (m.screen) { setTimeout(() => transportRef.current && transportRef.current.send(routeId, snapshot()), 50); return; }
        const name = clip(String(m.name || '')).slice(0, 24) || 'Player';
        const known = rm[clientId];
        const existing = !known && ps.find((p) => p.clientId === clientId); // same phone, host was reloaded: re-attach, don't duplicate
        if (!known && existing) {
          if (name !== existing.name) setPs(renamePlayer(ps, existing.id, name));
          setRemote((r) => ({ ...r, [clientId]: { playerId: existing.id, name, ready: false, online: true, lastSeen: Date.now(), routes: [routeId] } }));
        } else if (!known) {
          const limit = (v && v.maxPlayers) || 8;
          if (ps.length >= limit) { transportRef.current.send(routeId, { type: RT.FULL }); return; }
          const p = { ...createPlayer(name, ps), clientId };
          setPs([...ps, p]);
          setRemote((r) => ({ ...r, [clientId]: { playerId: p.id, name, ready: false, online: true, lastSeen: Date.now(), routes: [routeId] } }));
        } else {
          if (name !== known.name) setPs(renamePlayer(ps, known.playerId, name));
          setRemote((r) => ({ ...r, [clientId]: { ...known, name, online: true, lastSeen: Date.now(), routes: Array.from(new Set([...(known.routes || []), routeId])) } }));
        }
        setTimeout(() => transportRef.current && transportRef.current.send(routeId, snapshot()), 50);
        break;
      }
      case RT.READY:
        setRemote((r) => (r[clientId] ? { ...r, [clientId]: { ...r[clientId], ready: !!m.ready, lastSeen: Date.now() } } : r));
        break;
      case RT.LEAVE:
        setRemote((r) => (r[clientId] ? { ...r, [clientId]: { ...r[clientId], online: false } } : r));
        break;
      case RT.PING:
        /* a phone we don't know (the host reloaded) is asked to introduce itself again */
        if (!rm[clientId]) { transportRef.current.send(routeId, { type: RT.REJOIN }); break; }
        setRemote((r) => (r[clientId] ? { ...r, [clientId]: { ...r[clientId], online: true, lastSeen: Date.now() } } : r));
        transportRef.current.send(routeId, { type: RT.PONG, ts: Date.now() });
        break;
      case RT.ACTION: {
        const a = m.action || {};
        if (a.kind === 'answer' && a.questionId != null) {
          /* Only known players, only once per question, only while that question is live. */
          const known = rm[clientId];
          const stage = liveRef.current.stage;
          if (!known || !stage || stage.status !== 'challenge' || stage.questionId !== a.questionId) break;
          setAnswers((prev) => {
            const forQ = prev[a.questionId] || {};
            if (forQ[clientId]) return prev;                       // đã trả lời rồi
            return { ...prev, [a.questionId]: { ...forQ, [clientId]: { index: a.index, ms: a.ms || 0, at: Date.now(), playerId: known.playerId } } };
          });
        }
        setRemote((r) => (r[clientId] ? { ...r, [clientId]: { ...r[clientId], lastAction: { ...a, at: Date.now() } } } : r));
        break;
      }
      default:
        break;
    }
  }, [snapshot]);

  /* `reuseCode` lets a reloaded host reopen the same room so phones reconnect without rejoining */
  const start = useCallback((reuseCode) => {
    if (!Entitlements.hasFeature(liveRef.current.sub, 'realtime-sync')) return;
    if (transportRef.current) transportRef.current.close();
    const code = typeof reuseCode === 'string' && /^[A-Z0-9]{6}$/.test(reuseCode) ? reuseCode : genRoomCode();
    setStatus('offline');
    transportRef.current = createHostTransport(code, {
      onMessage,
      onStatus: setStatus,
      onRouteClosed: () => {},
    });
    setRoom({ code, createdAt: Date.now() });
    setPaused(false);
    try { sessionStorage.setItem('pg-host', code); } catch (e) {} // this tab is the host (survives a reload, not a second tab)
  }, [onMessage]);

  const end = useCallback(() => {
    if (transportRef.current) { transportRef.current.broadcast({ type: RT.END }); transportRef.current.close(); }
    transportRef.current = null;
    try { sessionStorage.removeItem('pg-host'); } catch (e) {}
    setRoom(null);
    setRemote({});
    setPaused(false);
    setStatus('offline');
  }, []);

  const newCode = useCallback(() => { end(); setTimeout(start, 50); }, [end, start]);
  const clearRemote = useCallback(() => {
    const { players: ps, setPlayers: setPs } = liveRef.current;
    setPs(ps.filter((p) => !p.clientId));
    setRemote({});
    broadcast();
  }, [broadcast]);

  /* every change of players / stage / pause is a new snapshot for everyone */
  useEffect(() => { if (room) broadcast(); }, [players, stage, paused, remote, venue, room, answers]);
  /* mark phones silent for 25 s as offline */
  useEffect(() => {
    if (!room) return;
    const id = setInterval(() => {
      const now = Date.now();
      setRemote((r) => {
        let changed = false;
        const next = {};
        Object.entries(r).forEach(([k, v]) => { const online = now - v.lastSeen < 25000; if (online !== v.online) changed = true; next[k] = { ...v, online }; });
        return changed ? next : r;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [room]);
  useEffect(() => () => { if (transportRef.current) transportRef.current.close(); }, []);

  const onlineCount = Object.values(remote).filter((x) => x.online).length;
  /* Players that joined from a phone and are currently connected */
  const livePlayerIds = Object.values(remote).filter((r) => r.online).map((r) => r.playerId);
  return { room, remote, status, paused, setPaused, onlineCount, start, end, newCode, clearRemote, snapshot,
           answers, answersFor, clearAnswers, livePlayerIds };
}
