/* ============================================================
 *  Session engine — the party: who's at the table and what they've played tonight
 * ============================================================ */

const createSession = (players = []) => ({ id: uid(), createdAt: Date.now(), players, history: [], stats: {} });
const normalizeSession = (s) => {
  if (!s || !Array.isArray(s.players)) return createSession();
  return { ...createSession(), ...s, players: s.players.map(normalizePlayer), history: Array.isArray(s.history) ? s.history : [], stats: s.stats || {} };
};

/* entry: { modeId, gameId, winnerIds, winnerNames, summary, scores: [{ id, name, score, wins, bestStreak }] } */
const recordGame = (session, entry) => {
  const stats = { ...session.stats };
  entry.scores.forEach((row) => {
    const prev = stats[row.id] || { games: 0, wins: 0, points: 0, bestStreak: 0 };
    stats[row.id] = {
      games: prev.games + 1,
      wins: prev.wins + (entry.winnerIds.includes(row.id) ? 1 : 0),
      points: prev.points + (row.score || 0),
      bestStreak: Math.max(prev.bestStreak, row.bestStreak || 0),
    };
  });
  return { ...session, stats, history: [{ id: uid(), ts: Date.now(), ...entry }, ...session.history].slice(0, 100) };
};

const sessionSummary = (session) => {
  const rows = session.players.map((p) => ({ player: p, ...(session.stats[p.id] || { games: 0, wins: 0, points: 0, bestStreak: 0 }) }));
  const top = (key) => rows.filter((r) => r[key] > 0).sort((a, b) => b[key] - a[key])[0] || null;
  return { gamesPlayed: session.history.length, playerCount: session.players.length, mostWins: top('wins'), longestStreak: top('bestStreak'), mostPlayed: top('games'), mostPoints: top('points'), rows };
};
