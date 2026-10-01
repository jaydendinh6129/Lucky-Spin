/* ============================================================
 *  Score engine — pure helpers; every function returns a new players array
 * ============================================================ */

const Score = {
  update: (players, id, fn) => players.map((p) => (p.id === id ? { ...p, ...fn(p) } : p)),
  addPoints: (players, id, n = 1) => Score.update(players, id, (p) => ({ score: p.score + n })),
  removePoints: (players, id, n = 1) => Score.update(players, id, (p) => ({ score: Math.max(0, p.score - n) })),
  incrementWin: (players, id) => Score.update(players, id, (p) => ({ wins: p.wins + 1, streak: p.streak + 1, bestStreak: Math.max(p.bestStreak, p.streak + 1) })),
  incrementLoss: (players, id) => Score.update(players, id, (p) => ({ losses: p.losses + 1, streak: 0 })),
  incrementStreak: (players, id) => Score.update(players, id, (p) => ({ streak: p.streak + 1, bestStreak: Math.max(p.bestStreak, p.streak + 1) })),
  resetStreak: (players, id) => Score.update(players, id, () => ({ streak: 0 })),
  eliminatePlayer: (players, id) => Score.update(players, id, () => ({ eliminated: true })),
  /* Fresh per-game counters; identity, avatar and lifetime stats are untouched */
  resetForGame: (players) => players.map((p) => ({ ...p, score: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, eliminated: false })),
  leaderboard: (players) => [...players].sort((a, b) => b.score - a.score || b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name)),
  /* Everyone tied at the top */
  leaders: (players) => {
    const lb = Score.leaderboard(players);
    return lb.length ? lb.filter((p) => p.score === lb[0].score && p.wins === lb[0].wins) : [];
  },
  active: (players) => players.filter((p) => !p.eliminated),
  byId: (players, id) => players.find((p) => p.id === id) || null,
};
