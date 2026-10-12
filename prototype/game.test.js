// Run with: node --test prototype/game.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Game = require("./game.js");

const NOW = new Date("2026-10-09T09:00:00").getTime();
const seq = (...values) => { let i = 0; return () => values[i++ % values.length]; };
const start = () => Game.newGame({ coat: "*A03", name: "Puff", line: "If I fits, I sits" }, NOW);

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
  assert.equal(dressed.activeCat, cat.id);
  assert.equal(dressed.cats[1].hat, "AC01");
});
