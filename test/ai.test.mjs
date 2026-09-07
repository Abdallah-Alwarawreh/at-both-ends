import { test } from "node:test";
import assert from "node:assert/strict";
import { aiInput, createGame } from "../src/engine.js";
function arena() {
  const g = createGame(1);
  g.players = [
    { x: 100, y: 300, vx: 0, vy: 0 },
    { x: 600, y: 300, vx: 0, vy: 0 },
  ];
  g.hazards = [];
  g.targets = [];
  return g;
}
const target = (x, y, color, charge = 0) => ({
  x,
  y,
  color,
  charge,
  born: 0,
  done: 0,
});
test("bot uses reachable color-band edge when its center is out of bounds", () => {
  const g = arena();
  g.targets = [target(300, 300, 1)];
  assert.equal(aiInput(g, 1), 2);
});
test("bot no longer skips colors near the human endpoint", () => {
  const g = arena();
  g.players[1].x = 400;
  g.targets = [target(150, 300, 0)];
  assert.equal(aiInput(g, 1), 2);
});
test("bot brakes momentum while holding a matching contact", () => {
  const g = arena();
  g.players[1].vx = 100;
  g.targets = [target(350, 300, 3)];
  assert.equal(aiInput(g, 1), 1);
});
test("bot anticipates collision before entering the danger radius", () => {
  const g = arena();
  g.players[1].vx = 200;
  g.hazards = [{ x: 710, y: 300 }];
  g.targets = [target(760, 300, 6)];
  assert.equal(aiInput(g, 1), 1);
});
test("bot prefers a safer target over a route through a dark cloud", () => {
  const g = arena();
  g.players[1].x = 500;
  g.hazards = [{ x: 610, y: 300 }];
  g.targets = [target(657, 300, 6), target(357, 396, 4)];
  assert.ok(aiInput(g, 1) & 8);
});
test("bot prioritizes finishing a partly restored target", () => {
  const g = arena();
  g.targets = [target(471, 300, 6), target(657, 300, 6, 0.8)];
  assert.equal(aiInput(g, 1), 2);
});
test("bot handles the mirrored endpoint after partner disconnect", () => {
  const g = arena();
  g.players = [{ x: 360, y: 300, vx: 0, vy: 0 }, { x: 860, y: 300, vx: 0, vy: 0 }];
  g.targets = [target(660, 300, 5)];
  assert.equal(aiInput(g, 0), 1);
});
