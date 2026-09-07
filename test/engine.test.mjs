import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  projection,
  move,
  step,
  restore,
  snapshot,
  recover,
  setupWave,
} from "../src/engine.js";
import { pack, unpack } from "../src/network.js";
test("seven longitudinal hit zones, endpoints, zero-length tether", () => {
  let a = { x: 0, y: 0 },
    b = { x: 700, y: 0 };
  for (let i = 0; i < 7; i++) {
    let p = projection(a, b, { x: i * 100 + 50, y: 8 });
    assert.equal(p.color, i);
    assert.equal(p.distance, 8);
  }
  assert.equal(projection(a, b, { x: 710, y: 0 }).color, 6);
  assert.equal(projection(a, a, a).distance, 0);
});
test("normalized diagonal speed; soft tether remains finite", () => {
  let a = { x: 400, y: 300, vx: 0, vy: 0 },
    b = { ...a };
  for (let i = 0; i < 20; i++) move(a, 10, b);
  assert.ok(Math.hypot(a.vx, a.vy) <= 205.001);
  assert.ok(a.x > 400 && a.y > 300);
});
test("correct contact requires dwell; wrong color never restores", () => {
  let g = createGame(1),
    p = g.targets[0];
  g.targets = [p];
  g.players = [
    { x: 245, y: 314, vx: 0, vy: 0 },
    { x: 715, y: 314, vx: 0, vy: 0 },
  ];
  p.color = 4;
  for (let i = 0; i < 30; i++) step(g, [0, 0]);
  assert.equal(p.done, 0);
  assert.equal(p.charge, 0);
  p.color = 0;
  for (let i = 0; i < 8; i++) step(g, [0, 0]);
  assert.equal(p.done, 0);
  for (let i = 0; i < 15; i++) step(g, [0, 0]);
  assert.equal(p.done, 1);
});
test("any-order spectrum and exact-order bonus", () => {
  let g = createGame(1);
  for (let c of [4, 1, 6, 2, 0, 5, 3]) restore(g, { color: c, x: 0, y: 0 });
  assert.equal(g.spectrums, 1);
  assert.equal(g.spectrum, 0);
  assert.ok(g.double > 0);
  g = createGame(1);
  for (let color = 0; color < 7; color++) restore(g, { color, x: 0, y: 0 });
  assert.ok(g.events.some((e) => e.type === "perfect"));
});
test("seeded simulation repeats exactly", () => {
  let a = createGame(42),
    b = createGame(42);
  for (let i = 0; i < 300; i++) {
    step(a, [null, null]);
    step(b, [null, null]);
  }
  assert.equal(snapshot(a), snapshot(b));
});
test("recovery preserves full simulation across host loss", () => {
  let a = createGame(88);
  a.wave = 4;
  setupWave(a);
  for (let i = 0; i < 240; i++) step(a, [0, null]);
  let b = recover(snapshot(a));
  for (let i = 0; i < 60; i++) {
    step(a, [0, null]);
    step(b, [0, null]);
  }
  assert.equal(snapshot(a), snapshot(b));
});
test("wire snapshot preserves spawn deadlines and progression", () => {
  let a = createGame(42);
  a.wave = 4;
  setupWave(a);
  for (let i = 0; i < 400; i++) step(a, [0, 0]);
  let b = unpack(pack(a));
  for (let key of [
    "tick",
    "waveTick",
    "score",
    "spectrum",
    "lastHit",
    "perfect",
  ])
    assert.equal(a[key], b[key]);
  assert.deepEqual(
    a.targets.map((p) => p.born),
    b.targets.map((p) => p.born),
  );
  assert.deepEqual(
    a.targets.map((p) => p.done),
    b.targets.map((p) => p.done),
  );
  assert.ok(Math.abs(a.players[0].x - b.players[0].x) < 0.1);
});
test("campaign reaches proper ending; endless continues", () => {
  let g = createGame(1);
  g.wave = 7;
  setupWave(g);
  for (let p of g.targets) restore(g, p);
  for (let i = 0; i < 110; i++) step(g, [0, 0]);
  assert.equal(g.status, "won");
  g = createGame(1, true);
  g.wave = 7;
  setupWave(g);
  for (let p of g.targets) restore(g, p);
  for (let i = 0; i < 110; i++) step(g, [0, 0]);
  assert.equal(g.wave, 8);
  assert.equal(g.status, "play");
});
