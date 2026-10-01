/* ============================================================
 *  Player engine — the shared Player model
 * ============================================================ */

const PLAYER_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6', '#2dd4bf', '#fb7185', '#a3e635', '#c084fc'];
const PLAYER_AVATARS = ['😎', '🦊', '🐯', '🐸', '🦄', '🐼', '🐙', '🐧', '🦁', '🐨', '🐵', '🐰', '🐶', '🐱', '🦖', '🐻'];
const MAX_PLAYERS = 12;

const createPlayer = (name, existing = []) => {
  const usedColors = new Set(existing.map((p) => p.color));
  const usedAvatars = new Set(existing.map((p) => p.avatar));
  return {
    id: uid(),
    name: clip(name) || `Player ${existing.length + 1}`,
    avatar: PLAYER_AVATARS.find((a) => !usedAvatars.has(a)) || PLAYER_AVATARS[existing.length % PLAYER_AVATARS.length],
    color: PLAYER_COLORS.find((c) => !usedColors.has(c)) || PLAYER_COLORS[existing.length % PLAYER_COLORS.length],
    score: 0, wins: 0, losses: 0, streak: 0, bestStreak: 0, eliminated: false, team: null,
    stats: { games: 0, wins: 0, points: 0, bestStreak: 0 },
  };
};
const normalizePlayer = (p, i, all) => ({ ...createPlayer(p.name || `Player ${i + 1}`, all.slice(0, i)), ...p, id: p.id || uid() });
const renamePlayer = (players, id, name) => players.map((p) => (p.id === id ? { ...p, name: clip(name) || p.name } : p));
const removePlayer = (players, id) => players.filter((p) => p.id !== id);
const playerById = (players, id) => players.find((p) => p.id === id) || null;
const namesOf = (players, ids) => ids.map((id) => playerById(players, id)?.name).filter(Boolean);
/* Default selection for a game: the first `max` players (or everyone when the game allows it) */
const defaultSelection = (players, [min, max]) => players.slice(0, Math.min(players.length, max)).map((p) => p.id);
