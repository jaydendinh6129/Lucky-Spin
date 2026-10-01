/* ============================================================
 *  Game engine — the state machine every game drives:
 *     setup → countdown → challenge → result → (next round | finished)
 *  A game only supplies `rules`: how to build a round, how to resolve it
 *  and when it ends. Score/streak/elimination logic lives in Score.
 * ============================================================ */

const GAME_STATUS = ['setup', 'countdown', 'challenge', 'result', 'finished'];

function gameReducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...state, status: action.countdown ? 'countdown' : 'challenge', players: action.players, settings: action.settings, round: 1, current: action.round, lastResult: null, history: [], winner: null, startedAt: Date.now(), finishedAt: 0 };
    case 'COUNTDOWN_DONE':
      return state.status === 'countdown' ? { ...state, status: 'challenge' } : state;
    case 'PATCH':
      return { ...state, ...action.patch };
    case 'PATCH_CURRENT':
      return { ...state, current: { ...state.current, ...action.patch } };
    case 'RESOLVE':
      return {
        ...state, status: 'result', players: action.players, settings: action.settings || state.settings,
        lastResult: action.result, history: [...state.history, { round: state.round, ...action.result }],
      };
    case 'NEXT_ROUND':
      return { ...state, status: action.countdown ? 'countdown' : 'challenge', round: state.round + 1, current: action.round, lastResult: null };
    case 'FINISH':
      return { ...state, status: 'finished', winner: action.winner, finishedAt: Date.now() };
    case 'RESET':
      return action.initial;
    default:
      return state;
  }
}

/* rules = {
 *   countdown(round) → seconds (0 = none),
 *   buildRound(state) → the round payload (participants, challenge…),
 *   resolveRound(state, outcome) → { players, result, settings? },
 *   checkEnd(state) → winner (any truthy value: player, players or team) | null,
 * } */
function useGameEngine(rules) {
  const initial = useMemo(() => ({ status: 'setup', players: [], settings: {}, round: 0, current: null, lastResult: null, history: [], winner: null, startedAt: 0, finishedAt: 0 }), []);
  const [state, dispatch] = useReducer(gameReducer, initial);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const stateRef = useRef(state);
  stateRef.current = state;

  const countdownFor = (round) => {
    const c = rulesRef.current.countdown;
    return typeof c === 'function' ? c(round) : (c ?? 3);
  };

  const startGame = useCallback((players, settings = {}) => {
    const r = rulesRef.current;
    const fresh = Score.resetForGame(players);
    const base = { ...stateRef.current, players: fresh, settings, round: 1, history: [], current: null };
    dispatch({ type: 'START', players: fresh, settings, round: r.buildRound(base), countdown: countdownFor(1) > 0 });
  }, []);
  const countdownDone = useCallback(() => dispatch({ type: 'COUNTDOWN_DONE' }), []);
  const patch = useCallback((p) => dispatch({ type: 'PATCH', patch: p }), []);
  const patchCurrent = useCallback((p) => dispatch({ type: 'PATCH_CURRENT', patch: p }), []);
  const resolveRound = useCallback((outcome) => {
    const s = stateRef.current;
    if (s.status !== 'challenge') return;
    const { players, result, settings } = rulesRef.current.resolveRound(s, outcome);
    dispatch({ type: 'RESOLVE', players, result: { ...result, outcome }, settings });
  }, []);
  const nextRound = useCallback(() => {
    const s = stateRef.current;
    const r = rulesRef.current;
    const winner = r.checkEnd(s);
    if (winner) { dispatch({ type: 'FINISH', winner }); return; }
    const round = s.round + 1;
    dispatch({ type: 'NEXT_ROUND', round: r.buildRound({ ...s, round }), countdown: countdownFor(round) > 0 });
  }, []);
  const endGame = useCallback(() => {
    const s = stateRef.current;
    dispatch({ type: 'FINISH', winner: rulesRef.current.checkEnd(s) || Score.leaders(s.players) });
  }, []);
  const resetGame = useCallback(() => dispatch({ type: 'RESET', initial }), [initial]);

  const pendingWinner = state.status === 'result' ? rules.checkEnd(state) : null;
  return { state, pendingWinner, countdownSeconds: countdownFor(state.round || 1), startGame, countdownDone, patch, patchCurrent, resolveRound, nextRound, endGame, resetGame };
}

/* Builds the session-history entry every game records when it finishes */
const gameResultEntry = (modeId, gameId, players, winners, summary) => ({
  modeId, gameId,
  winnerIds: (winners || []).map((p) => p.id),
  winnerNames: (winners || []).map((p) => p.name),
  summary,
  scores: players.map((p) => ({ id: p.id, name: p.name, score: p.score, wins: p.wins, bestStreak: p.bestStreak })),
});
