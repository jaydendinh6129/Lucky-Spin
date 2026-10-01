/* ============================================================
 *  Random engine — fair randomness shared by every game
 * ============================================================ */

const Random = {
  item: (arr) => arr[randInt(arr.length)],
  shuffle: shuffleArr,
  /* A random active player, optionally excluding some ids */
  player: (players, { exclude = [], includeEliminated = false } = {}) => {
    const pool = players.filter((p) => !exclude.includes(p.id) && (includeEliminated || !p.eliminated));
    return pool.length ? pool[randInt(pool.length)] : null;
  },
  players: (players, count, opts = {}) => {
    const picked = [];
    for (let i = 0; i < count; i++) {
      const p = Random.player(players, { ...opts, exclude: [...(opts.exclude || []), ...picked.map((x) => x.id)] });
      if (!p) break;
      picked.push(p);
    }
    return picked;
  },
  target: (players, excludeId) => Random.player(players, { exclude: [excludeId] }),
  /* Pair up the active players for a bracket round; an odd player gets a bye */
  pairs: (players) => {
    const pool = shuffleArr(players.filter((p) => !p.eliminated));
    const out = [];
    for (let i = 0; i + 1 < pool.length; i += 2) out.push([pool[i].id, pool[i + 1].id]);
    return { pairs: out, bye: pool.length % 2 ? pool[pool.length - 1].id : null };
  },
};

/* A bag hands out every item once, in random order, before anything repeats */
const createBag = (items) => {
  let pool = [];
  let last = null;
  return {
    next: () => {
      if (!pool.length) {
        pool = shuffleArr(items);
        if (pool.length > 1 && pool[pool.length - 1] === last) pool.unshift(pool.pop());
      }
      last = pool.pop();
      return last;
    },
    reset: () => { pool = []; },
  };
};
/* Bag that is rebuilt when `key` (e.g. the language) changes */
const useBag = (items, key) => {
  const ref = useRef({ key: null, bag: null });
  if (ref.current.key !== key) ref.current = { key, bag: createBag(items) };
  return ref.current.bag;
};

/* Next index in turn order that skips eliminated players */
const nextActiveIndex = (players, from, dir = 1) => {
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = mod(from + dir * k, n);
    if (!players[i].eliminated) return i;
  }
  return from;
};
