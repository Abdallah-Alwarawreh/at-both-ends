import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
async function pair() {
  let pages = [];
  for (let i = 0; i < 2; i++) {
    let c = await browser.newContext();
    let p = await c.newPage();
    await p.goto("http://localhost:5173");
    await p.getByRole("button", { name: "PLAY ONLINE", exact: true }).click();
    await p.getByRole("button", { name: "QUICK MATCH", exact: true }).click();
    pages.push(p);
  }
  for (let p of pages)
    await p.waitForFunction(() => document.body.classList.contains("playing"));
  await pages[0].waitForTimeout(3250);
  return pages;
}
try {
  let [a, b] = await pair();
  await a.evaluate(async () => {
    let { setupWave } = await import("/src/engine.js"),
      g = __game.state();
    g.wave = 4;
    setupWave(g);
  });
  await b.waitForFunction(() => __game.state().wave === 4);
  let born = await b.evaluate(() => __game.state().targets.map((t) => t.born));
  await a.reload();
  await b.waitForTimeout(300);
  assert.equal(await b.evaluate(() => __game.network.role), -1);
  assert.equal(await b.evaluate(() => __game.state().wave), 4);
  assert.deepEqual(
    await b.evaluate(() => __game.state().targets.map((t) => t.born)),
    born,
  );
  console.log("PASS host refresh preserves mid-campaign target deadlines");
  await a.close();
  await b.close();
  [a, b] = await pair();
  await a.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await b.waitForTimeout(300);
  assert.equal(await b.evaluate(() => __game.network.role), -1);
  let tick = await b.evaluate(() => __game.state().tick);
  await b.waitForTimeout(200);
  assert.ok((await b.evaluate(() => __game.state().tick)) > tick);
  console.log("PASS hidden host hands partner to AI");
  await a.close();
  await b.close();
  [a, b] = await pair();
  await a.context().setOffline(true);
  await b.waitForTimeout(1800);
  assert.equal(await b.evaluate(() => __game.network.role), -1);
  console.log("PASS network silence timeout takes over");
  await a.close();
  await b.close();
  [a, b] = await pair();
  await a.evaluate(async () => {
    let { setupWave, restore } = await import("/src/engine.js"),
      g = __game.state();
    g.wave = 7;
    setupWave(g);
    for (let t of g.targets) restore(g, t);
  });
  await b.waitForFunction(() => __game.state().status === "won", {
    timeout: 6000,
  });
  assert.equal(await a.evaluate(() => __game.state().status), "won");
  console.log("PASS online boss completion on both clients");
  await a.close();
  await b.close();
} finally {
  await browser.close();
}
