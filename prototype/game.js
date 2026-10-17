/*
 * Cats & Hats game rules for the vertical slice (Animal Hoods only).
 * Pure functions over a plain state object, so the same rules can later run on a server.
 * Numbers follow the 2022 game: uniform draw over the pool, 0/1/2 bonus shards, milestones never re-awarded.
 */
const Game = (() => {
  const ids = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
  const POOL = ids("AC", 18); // Animal Hoods
  // Every set comes from one place: a daily box, or the shop. Box hats can never be bought.
  // "Classics" is the 2022 Basic set under a new display name.
  const SETS = {
    animals: { id: "animals", name: "Animal Hoods", source: "box", pool: POOL },
    basic: { id: "basic", name: "Classics", source: "box", pool: ids("AB", 12) },
    // A shop-only set goes here with source: "shop", plus a price per hat in SHOP.prices. None right now.
  };
  // One box per box set; the player picks which one to open each day.
  const BOXES = Object.fromEntries(Object.entries(SETS).filter(([, set]) => set.source === "box"));
  // Set rewards, never re-awarded. Reward hats don't count toward their own set.
  const MILESTONES = [
    { id: "animals-9", box: "animals", threshold: 9, hat: "AC19", shards: 50, label: "Halfway there" },
    { id: "animals-18", box: "animals", threshold: 18, hat: "AC20", shards: 200, label: "Set complete" },
    { id: "basic-6", box: "basic", threshold: 6, hat: null, shards: 50, label: "Halfway there" },
    { id: "basic-12", box: "basic", threshold: 12, hat: null, shards: 200, label: "Set complete" },
  ];
  // Friendship: pet once a day (+1), open the day's box together (+2). Five hearts unlocks the cat's special hat.
  const FRIENDSHIP = { perHeart: 6, hearts: 5, pet: 1, box: 2 };
  const MAX_FRIENDSHIP = FRIENDSHIP.perHeart * FRIENDSHIP.hearts;
  // Shop: shop-only sets priced per hat, and special cats to adopt (one of each). Spare hats sell back.
  const SHOP = {
    sellPrice: 2,
    cats: { "*C01": 200, "*C02": 200, "*C03": 200, "*C04": 200 }, // Galaxy, Glass, Meadow, Magma
    prices: {},
  };
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

  const uniquePoolHats = (state, set = "animals") => SETS[set].pool.filter((id) => (state.hats[id] || 0) > 0).length;

  /** Award any milestones the player now qualifies for in a box (mutates a cloned state). */
  function claimMilestones(next, box) {
    const have = uniquePoolHats(next, box), won = [];
    for (const m of MILESTONES.filter((x) => x.box === box)) {
      if (have >= m.threshold && !next.claimed.includes(m.id)) {
        next.claimed.push(m.id);
        if (m.hat) {
          next.hats[m.hat] = (next.hats[m.hat] || 0) + 1;
          next.unseen.push(m.hat);
        }
        next.shards += m.shards;
        won.push(m);
      }
    }
    return won;
  }

  const setOf = (hat) => Object.values(SETS).find((set) => set.pool.includes(hat));

  /** Buy one hat from a shop set. Box hats are never for sale. */
  function buyHat(state, hat) {
    const price = SHOP.prices[hat];
    if (!price) throw new Error(`${hat} isn't sold in the shop.`);
    if (state.hats[hat]) throw new Error(`You already have ${hat}.`);
    if (state.shards < price) throw new Error("Not enough shards.");
    const next = structuredClone(state);
    next.shards -= price;
    next.hats[hat] = 1;
    next.unseen.push(hat);
    return { state: next, result: { hat, price, milestones: claimMilestones(next, setOf(hat).id) } };
  }

  /** Adopt a special cat from the shop. Each one can only be adopted once. */
  function adoptFromShop(state, { coat, name, line, special }, now) {
    const price = SHOP.cats[coat];
    if (!price) throw new Error(`${coat} isn't in the shop.`);
    if (state.cats.some((c) => c.coat === coat)) throw new Error("That cat already lives with you.");
    if (state.shards < price) throw new Error("Not enough shards.");
    const paid = { ...state, shards: state.shards - price };
    return adoptCat(paid, { coat, name, line, special }, now);
  }

  /** Sell spare copies, always keeping one. Omit hat to sell every duplicate. */
  function sellDuplicates(state, hat) {
    const next = structuredClone(state);
    let sold = 0;
    for (const id of hat ? [hat] : Object.keys(next.hats)) {
      const extra = (next.hats[id] || 0) - 1;
      if (extra > 0) { next.hats[id] = 1; sold += extra; }
    }
    next.shards += sold * SHOP.sellPrice;
    return { state: next, result: { sold, shards: sold * SHOP.sellPrice } };
  }
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
    const have = uniquePoolHats(next, box);
    milestones.push(...claimMilestones(next, box));
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
    return next;
  }

  /** Choose the featured cat: the one who comes to the box (and earns box friendship). */
  function feature(state, catId) {
    if (!state.cats.some((c) => c.id === catId)) throw new Error(`No cat ${catId}.`);
    return { ...state, activeCat: catId };
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

  return { POOL, SETS, BOXES, MILESTONES, FRIENDSHIP, MAX_FRIENDSHIP, SHOP, SAVE_VERSION, dayKey, newGame, normalize, hearts, pet, pettedToday, addFriendship,
    setOf, buyHat, adoptFromShop, sellDuplicates,
    uniquePoolHats, canOpen, openBox, wear, feature, adoptCat, renameCat, markSeen, skipDay };
})();

if (typeof module !== "undefined") module.exports = Game;
