/*
 * Cats & Hats game rules for the vertical slice (Animal Hoods only).
 * Pure functions over a plain state object, so the same rules can later run on a server.
 * Numbers follow the 2022 game: uniform draw over the pool, 0/1/2 bonus shards, milestones never re-awarded.
 */
const Game = (() => {
  const POOL = Array.from({ length: 18 }, (_, i) => `AC${String(i + 1).padStart(2, "0")}`);
  const MILESTONES = [
    { id: "animals-9", threshold: 9, hat: "AC19", shards: 50, label: "Halfway there" },
    { id: "animals-18", threshold: 18, hat: "AC20", shards: 200, label: "Set complete" },
  ];
  const SAVE_VERSION = 1;

  /** Local calendar day, shifted by the prototype's "skip a day" offset. */
  function dayKey(now, offsetDays = 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function newGame({ coat, name, line }, now) {
    const cat = { id: "cat-1", coat, name, line, hat: null, joined: dayKey(now) };
    return {
      v: SAVE_VERSION, created: now, dayOffset: 0,
      cats: [cat], activeCat: cat.id,
      hats: {}, unseen: [], shards: 0, claimed: [],
      lastOpenDay: null, log: [],
    };
  }

  const uniquePoolHats = (state) => POOL.filter((id) => (state.hats[id] || 0) > 0).length;
  const canOpen = (state, now) => state.lastOpenDay !== dayKey(now, state.dayOffset);

  /**
   * Open today's box. rng() returns [0, 1).
   * Returns { state, result } and never mutates the input.
   */
  function openBox(state, now, rng = Math.random) {
    if (!canOpen(state, now)) throw new Error("Today's box is already open.");
    const hat = POOL[Math.floor(rng() * POOL.length)];
    const shards = Math.floor(rng() * 3);
    const next = structuredClone(state);
    const isNew = !next.hats[hat];
    next.hats[hat] = (next.hats[hat] || 0) + 1;
    if (isNew) next.unseen.push(hat);
    next.shards += shards;
    next.lastOpenDay = dayKey(now, state.dayOffset);

    const milestones = [];
    const have = uniquePoolHats(next);
    for (const m of MILESTONES) {
      if (have >= m.threshold && !next.claimed.includes(m.id)) {
        next.claimed.push(m.id);
        next.hats[m.hat] = (next.hats[m.hat] || 0) + 1;
        next.unseen.push(m.hat);
        next.shards += m.shards;
        milestones.push(m);
      }
    }
    next.log.push({ day: next.lastOpenDay, hat, shards, milestones: milestones.map((m) => m.id) });
    return { state: next, result: { hat, shards, isNew, count: next.hats[hat], unique: have, milestones } };
  }

  function wear(state, catId, hat) {
    if (hat && !state.hats[hat]) throw new Error(`You don't have ${hat}.`);
    const next = structuredClone(state);
    const cat = next.cats.find((c) => c.id === catId);
    if (!cat) throw new Error(`No cat ${catId}.`);
    cat.hat = hat;
    next.activeCat = catId;
    return next;
  }

  function adoptCat(state, { coat, name, line }, now) {
    const next = structuredClone(state);
    const cat = { id: `cat-${next.cats.length + 1}`, coat, name, line, hat: null, joined: dayKey(now, state.dayOffset) };
    next.cats.push(cat);
    return { state: next, cat };
  }

  function renameCat(state, catId, name) {
    const next = structuredClone(state);
    next.cats.find((c) => c.id === catId).name = name.trim().slice(0, 20) || "Cat";
    return next;
  }

  function markSeen(state, hat) {
    if (!state.unseen.includes(hat)) return state;
    const next = structuredClone(state);
    next.unseen = next.unseen.filter((h) => h !== hat);
    return next;
  }

  function skipDay(state) {
    return { ...state, dayOffset: state.dayOffset + 1 };
  }

  return { POOL, MILESTONES, SAVE_VERSION, dayKey, newGame, uniquePoolHats, canOpen, openBox, wear, adoptCat, renameCat, markSeen, skipDay };
})();

if (typeof module !== "undefined") module.exports = Game;
