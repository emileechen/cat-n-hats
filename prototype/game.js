/*
 * Cats & Hats game rules for the vertical slice (Animal Hoods only).
 * Pure functions over a plain state object, so the same rules can later run on a server.
 * Numbers follow the 2022 game: uniform draw over the pool, 0/1/2 bonus shards, milestones never re-awarded.
 */
const Game = (() => {
  const POOL = Array.from({ length: 18 }, (_, i) => `AC${String(i + 1).padStart(2, "0")}`);
  // One box per live set; the player picks which one to open each day. Only Animal Hoods exists in the slice.
  const BOXES = { animals: { id: "animals", name: "Animal Hoods", pool: POOL } };
  const MILESTONES = [
    { id: "animals-9", threshold: 9, hat: "AC19", shards: 50, label: "Halfway there" },
    { id: "animals-18", threshold: 18, hat: "AC20", shards: 200, label: "Set complete" },
  ];
  // Friendship: pet once a day (+1), open the day's box together (+2). Five hearts unlocks the cat's special hat.
  const FRIENDSHIP = { perHeart: 6, hearts: 5, pet: 1, box: 2 };
  const MAX_FRIENDSHIP = FRIENDSHIP.perHeart * FRIENDSHIP.hearts;
  const SAVE_VERSION = 1;

  /** Local calendar day, shifted by the prototype's "skip a day" offset. */
  function dayKey(now, offsetDays = 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const makeCat = (id, { coat, name, line, special }, day) =>
    ({ id, coat, name, line, special, hat: null, joined: day, friendship: 0, lastPet: null, specialUnlocked: false });

  function newGame({ coat, name, line, special }, now) {
    const cat = makeCat("cat-1", { coat, name, line, special }, dayKey(now));
    return {
      v: SAVE_VERSION, created: now, dayOffset: 0,
      cats: [cat], activeCat: cat.id,
      hats: {}, unseen: [], shards: 0, claimed: [],
      lastOpenDay: null, log: [],
    };
  }

  /** Fill in fields added after a save was made. specialFor(coat) names a cat's special hat. */
  function normalize(state, specialFor) {
    const next = structuredClone(state);
    for (const c of next.cats) {
      c.friendship ??= 0; c.lastPet ??= null; c.specialUnlocked ??= false;
      c.special ??= specialFor(c.coat);
    }
    return next;
  }

  const hearts = (cat) => Math.floor(cat.friendship / FRIENDSHIP.perHeart);

  /** Add friendship to a cat in a cloned state; unlocks their special hat at the top. Returns what happened. */
  function befriend(next, catId, points) {
    const cat = next.cats.find((c) => c.id === catId);
    const before = cat.friendship;
    cat.friendship = Math.min(MAX_FRIENDSHIP, before + points);
    let unlocked = null;
    if (cat.friendship >= MAX_FRIENDSHIP && !cat.specialUnlocked && cat.special) {
      cat.specialUnlocked = true;
      next.hats[cat.special] = (next.hats[cat.special] || 0) + 1;
      next.unseen.push(cat.special);
      unlocked = cat.special;
    }
    return { cat: catId, gained: cat.friendship - before, hearts: hearts(cat), unlocked };
  }

  function pet(state, catId, now) {
    const today = dayKey(now, state.dayOffset);
    const next = structuredClone(state);
    const cat = next.cats.find((c) => c.id === catId);
    if (!cat) throw new Error(`No cat ${catId}.`);
    if (cat.lastPet === today) return { state, result: { cat: catId, gained: 0, hearts: hearts(cat), unlocked: null } };
    cat.lastPet = today;
    return { state: next, result: befriend(next, catId, FRIENDSHIP.pet) };
  }

  const pettedToday = (state, cat, now) => cat.lastPet === dayKey(now, state.dayOffset);

  /** Prototype tool: add friendship directly. */
  function addFriendship(state, catId, points) {
    const next = structuredClone(state);
    return { state: next, result: befriend(next, catId, points) };
  }

  const uniquePoolHats = (state) => POOL.filter((id) => (state.hats[id] || 0) > 0).length;
  const canOpen = (state, now) => state.lastOpenDay !== dayKey(now, state.dayOffset);

  /**
   * Open today's box: one per day, from whichever set's box the player picked, checked by one of their cats.
   * rng() returns [0, 1). Returns { state, result } and never mutates the input.
   */
  function openBox(state, now, rng = Math.random, { box = "animals", cat = state.activeCat } = {}) {
    if (!canOpen(state, now)) throw new Error("Today's box is already open.");
    if (!BOXES[box]) throw new Error(`No box ${box}.`);
    if (!state.cats.some((c) => c.id === cat)) throw new Error(`No cat ${cat}.`);
    const pool = BOXES[box].pool;
    const hat = pool[Math.floor(rng() * pool.length)];
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
    const friendship = befriend(next, cat, FRIENDSHIP.box);
    next.log.push({ day: next.lastOpenDay, box, cat, hat, isNew, shards, milestones: milestones.map((m) => m.id) });
    return { state: next, result: { hat, shards, isNew, count: next.hats[hat], unique: have, milestones, friendship } };
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

  function adoptCat(state, { coat, name, line, special }, now) {
    const next = structuredClone(state);
    const cat = makeCat(`cat-${next.cats.length + 1}`, { coat, name, line, special }, dayKey(now, state.dayOffset));
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

  return { POOL, BOXES, MILESTONES, FRIENDSHIP, MAX_FRIENDSHIP, SAVE_VERSION, dayKey, newGame, normalize, hearts, pet, pettedToday, addFriendship,
    uniquePoolHats, canOpen, openBox, wear, adoptCat, renameCat, markSeen, skipDay };
})();

if (typeof module !== "undefined") module.exports = Game;
