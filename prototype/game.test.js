// Run with: node --test prototype/game.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Game = require("./game.js");

const NOW = new Date("2026-10-09T09:00:00").getTime();
const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
const start = () => Game.newGame({ coat: "*A03", name: "Puff", line: "If I fits, I sits", special: "SP-hood" }, NOW);

test("one box per day; skipping a day brings the next one", () => {
  let s = start();
  assert.ok(Game.canOpen(s, NOW));
  s = Game.openBox(s, NOW, seq(0, 0)).state;
  assert.equal(Game.canOpen(s, NOW), false);
  assert.throws(() => Game.openBox(s, NOW, seq(0, 0)));
  s = Game.skipDay(s);
  assert.ok(Game.canOpen(s, NOW));
});

test("draw maps rng to the 18 pool hats and 0-2 shards", () => {
  const first = Game.openBox(start(), NOW, seq(0, 0)).result;
  assert.equal(first.hat, "AC01");
  assert.equal(first.shards, 0);
  const last = Game.openBox(start(), NOW, seq(0.9999, 0.9999)).result;
  assert.equal(last.hat, "AC18");
  assert.equal(last.shards, 2);
});

test("duplicates stack and are not new", () => {
  let s = start();
  s = Game.openBox(s, NOW, seq(0.1, 0)).state;
  const { state, result } = Game.openBox(Game.skipDay(s), NOW, seq(0.1, 0));
  assert.equal(result.isNew, false);
  assert.equal(result.count, 2);
  assert.equal(Game.uniquePoolHats(state), 1);
});

test("milestones fire once at 9 and 18 unique hats, with reward hats and shards", () => {
  let s = start();
  const fired = [];
  for (let i = 0; i < 18; i++) {
    const out = Game.openBox(s, NOW, seq((i + 0.5) / 18, 0));
    s = Game.skipDay(out.state);
    fired.push(...out.result.milestones.map((m) => m.id));
  }
  assert.deepEqual(fired, ["animals-9", "animals-18"]);
  assert.equal(s.hats.AC19, 1);
  assert.equal(s.hats.AC20, 1);
  assert.equal(s.shards, 250);
  // more boxes never re-award
  const again = Game.openBox(s, NOW, seq(0, 0));
  assert.deepEqual(again.result.milestones, []);
});

test("reward hats don't count toward set progress", () => {
  let s = start();
  s.hats.AC19 = 1;
  s.hats.AC20 = 1;
  assert.equal(Game.uniquePoolHats(s), 0);
});

test("wearing requires owning the hat; null takes it off", () => {
  let s = Game.openBox(start(), NOW, seq(0, 0)).state;
  assert.throws(() => Game.wear(s, "cat-1", "AC05"));
  s = Game.wear(s, "cat-1", "AC01");
  assert.equal(s.cats[0].hat, "AC01");
  s = Game.wear(s, "cat-1", null);
  assert.equal(s.cats[0].hat, null);
});

test("adopting adds a second cat that can wear the same hats", () => {
  let s = Game.openBox(start(), NOW, seq(0, 0)).state;
  const { state, cat } = Game.adoptCat(s, { coat: "*B05", name: "Mochi", line: "ZOOMIES." }, NOW);
  const dressed = Game.wear(state, cat.id, "AC01");
  assert.equal(dressed.cats.length, 2);
  assert.equal(dressed.activeCat, "cat-1"); // dressing a cat doesn't change who's featured
  assert.equal(Game.feature(dressed, cat.id).activeCat, cat.id);
  assert.throws(() => Game.feature(dressed, "cat-9"));
  assert.equal(dressed.cats[1].hat, "AC01");
});

test("the log records which box was opened and which cat checked it", () => {
  let s = Game.adoptCat(start(), { coat: "*B05", name: "Mochi", line: "ZOOMIES." }, NOW).state;
  s = Game.openBox(s, NOW, seq(0, 0.5), { box: "animals", cat: "cat-2" }).state;
  assert.deepEqual(s.log[0], { day: Game.dayKey(NOW), box: "animals", cat: "cat-2", hat: "AC01", isNew: true, shards: 1, milestones: [] });
  assert.equal(s.cats[1].friendship, Game.FRIENDSHIP.box);
  assert.equal(s.cats[0].friendship, 0);
});

test("unknown boxes and cats are rejected", () => {
  assert.throws(() => Game.openBox(start(), NOW, seq(0, 0), { box: "birds" }));
  assert.throws(() => Game.openBox(start(), NOW, seq(0, 0), { cat: "cat-9" }));
});

test("petting gives friendship once per cat per day", () => {
  let s = start();
  let out = Game.pet(s, "cat-1", NOW);
  assert.equal(out.result.gained, 1);
  s = out.state;
  out = Game.pet(s, "cat-1", NOW);
  assert.equal(out.result.gained, 0);
  assert.equal(out.state.cats[0].friendship, 1);
  out = Game.pet(Game.skipDay(out.state), "cat-1", NOW);
  assert.equal(out.result.gained, 1);
});

test("five hearts unlocks the cat's special hat exactly once, and friendship caps", () => {
  let s = start();
  let unlocked = [];
  for (let day = 0; day < 12; day++) {
    const petted = Game.pet(s, "cat-1", NOW);
    s = petted.state; if (petted.result.unlocked) unlocked.push(petted.result.unlocked);
    const opened = Game.openBox(s, NOW, seq(0, 0));
    s = opened.state; if (opened.result.friendship.unlocked) unlocked.push(opened.result.friendship.unlocked);
    s = Game.skipDay(s);
  }
  assert.deepEqual(unlocked, ["SP-hood"]);
  assert.equal(s.hats["SP-hood"], 1);
  assert.equal(s.cats[0].friendship, Game.MAX_FRIENDSHIP);
  assert.equal(Game.hearts(s.cats[0]), Game.FRIENDSHIP.hearts);
});

test("normalize fills friendship fields on old saves", () => {
  const old = start();
  for (const k of ["friendship", "lastPet", "specialUnlocked", "special"]) delete old.cats[0][k];
  const s = Game.normalize(old, (coat) => `SP-${coat}`);
  assert.equal(s.cats[0].friendship, 0);
  assert.equal(s.cats[0].special, "SP-*A03");
  assert.equal(s.cats[0].specialUnlocked, false);
});

test("the Classics box draws only Classics hats, and its rewards are its own", () => {
  let s = start();
  const fired = [];
  for (let i = 0; i < 12; i++) {
    const out = Game.openBox(s, NOW, seq((i + 0.5) / 12, 0), { box: "basic" });
    assert.match(out.result.hat, /^AB/);
    fired.push(...out.result.milestones.map((m) => m.id));
    s = Game.skipDay(out.state);
  }
  assert.deepEqual(fired, ["basic-6", "basic-12"]);
  assert.equal(s.shards, 250);
  assert.equal(Game.uniquePoolHats(s, "basic"), 12);
  assert.equal(Game.uniquePoolHats(s, "animals"), 0);
  assert.ok(!s.claimed.includes("animals-9"));
});

const withHats = (hats, shards = 0) => ({ ...start(), hats, shards });

test("box hats are never for sale", () => {
  const s = withHats({}, 500);
  assert.throws(() => Game.buyHat(s, "AC01"));
  assert.throws(() => Game.buyHat(s, "AB01"));
  for (const box of Object.values(Game.BOXES)) assert.ok(box.pool.every((id) => !Game.SHOP.prices[id]));
});

test("selling duplicates keeps one copy of each", () => {
  const s = withHats({ AC01: 3, AC02: 1, AB05: 2 }, 0);
  const one = Game.sellDuplicates(s, "AB05");
  assert.equal(one.state.hats.AB05, 1);
  assert.equal(one.result.shards, 2);
  const all = Game.sellDuplicates(s);
  assert.deepEqual(all.state.hats, { AC01: 1, AC02: 1, AB05: 1 });
  assert.equal(all.result.sold, 3);
  assert.equal(all.state.shards, 6);
});

test("special cats cost 200 shards, once each, and arrive with their own friendship track", () => {
  const s = withHats({}, 250);
  assert.throws(() => Game.adoptFromShop(s, { coat: "*B05", name: "Mochi", line: "", special: "SP-x" }, NOW));
  assert.throws(() => Game.adoptFromShop({ ...s, shards: 199 }, { coat: "*C01", name: "Nova", line: "", special: "SP-x" }, NOW));
  const { state, cat } = Game.adoptFromShop(s, { coat: "*C01", name: "Nova", line: "Twinkles.", special: "SP-x" }, NOW);
  assert.equal(state.shards, 50);
  assert.equal(state.cats.length, 2);
  assert.equal(cat.friendship, 0);
  assert.equal(cat.special, "SP-x");
  assert.throws(() => Game.adoptFromShop({ ...state, shards: 500 }, { coat: "*C01", name: "Nova 2", line: "", special: "SP-x" }, NOW));
});
