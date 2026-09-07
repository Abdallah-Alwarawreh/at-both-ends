import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
let errors = [];
async function page(options = {}) {
  let context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  let p = await context.newPage();
  await p.addInitScript(() =>
    localStorage.setItem("both-ends", JSON.stringify({ learned: true })),
  );
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:5173");
  return p;
}
async function pair() {
  let a = await page(),
    b = await page();
  for (let p of [a, b]) {
    await p.getByRole("button", { name: "PLAY ONLINE", exact: true }).click();
    await p.getByRole("button", { name: "QUICK MATCH", exact: true }).click();
  }
  await a.waitForFunction(() => document.body.classList.contains("playing"));
  await b.waitForFunction(() => document.body.classList.contains("playing"));
  await a.waitForTimeout(3300);
  return [a, b];
}
try {
  let p = await page();
  await p.screenshot({ path: "artifacts/title.png" });
  await p.getByRole("button", { name: "PLAY SOLO", exact: true }).click();
  let x = await p.evaluate(() => __game.state().players[0].x);
  await p.keyboard.down("ArrowRight");
  await p.waitForTimeout(350);
  await p.keyboard.up("ArrowRight");
  assert.ok((await p.evaluate(() => __game.state().players[0].x)) > x + 20);
  await p.keyboard.press("KeyP");
  let tick = await p.evaluate(() => __game.state().tick);
  await p.waitForTimeout(250);
  assert.equal(await p.evaluate(() => __game.state().tick), tick);
  await p.keyboard.press("KeyP");
  await p.getByRole("button", { name: "Mute sound" }).click();
  assert.equal(
    await p.locator("#mute").getAttribute("aria-label"),
    "Unmute sound",
  );
  await p.screenshot({ path: "artifacts/solo.png" });
  console.log("PASS desktop movement, pause, mute");
  await p.context().setOffline(true);
  await p.waitForTimeout(200);
  assert.ok((await p.evaluate(() => __game.state().tick)) > tick);
  await p.context().setOffline(false);
  console.log("PASS offline Solo");
  // Drive the real game through each wave; geometry itself is covered in engine tests.
  for (let wave = 0; wave < 8; wave++) {
    await p.evaluate(async () => {
      const { restore } = await import("/src/engine.js");
      let g = __game.state();
      g.health = 100;
      for (let t of g.targets) if (!t.done) restore(g, t);
    });
    await p.waitForTimeout(1900);
  }
  await p.waitForTimeout(2800);
  assert.equal(await p.evaluate(() => __game.state().status), "won");
  await p
    .getByRole("button", { name: "CHASE THE RAINBOW", exact: true })
    .click();
  assert.equal(await p.evaluate(() => __game.state().endless), true);
  await p.evaluate(() => {
    __game.state().health = 0;
  });
  await p.waitForTimeout(100);
  assert.equal(await p.evaluate(() => __game.state().status), "lost");
  await p.keyboard.press("Enter");
  assert.equal(await p.evaluate(() => __game.state().status), "play");
  console.log("PASS campaign ending, endless unlock, loss and restart");
  await p.close();
  let mobile = await page({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await mobile.getByRole("button", { name: "PLAY SOLO", exact: true }).tap();
  let before = await mobile.evaluate(() => __game.state().players[0].x);
  await mobile.dispatchEvent("canvas", "pointerdown", {
    pointerId: 1,
    clientX: 140,
    clientY: 460,
    pointerType: "touch",
  });
  await mobile.dispatchEvent("canvas", "pointermove", {
    pointerId: 1,
    clientX: 210,
    clientY: 460,
    pointerType: "touch",
  });
  await mobile.waitForTimeout(350);
  await mobile.dispatchEvent("canvas", "pointerup", {
    pointerId: 1,
    clientX: 210,
    clientY: 460,
    pointerType: "touch",
  });
  assert.ok(
    (await mobile.evaluate(() => __game.state().players[0].x)) > before + 20,
  );
  await mobile.screenshot({ path: "artifacts/mobile.png" });
  console.log("PASS mobile viewport and directional touch");
  await mobile.close();
  let [host, guest] = await pair();
  assert.equal(await host.evaluate(() => __game.local()), 0);
  assert.equal(await guest.evaluate(() => __game.local()), 1);
  let pos = await host.evaluate(() => __game.state().players[1].x);
  await guest.keyboard.down("ArrowLeft");
  await guest.waitForTimeout(450);
  await guest.keyboard.up("ArrowLeft");
  assert.ok(
    (await host.evaluate(() => __game.state().players[1].x)) < pos - 25,
  );
  console.log("PASS two-browser pairing and guest input");
  let third = await page();
  await third.getByRole("button", { name: "PLAY ONLINE", exact: true }).click();
  await third.getByRole("button", { name: "QUICK MATCH", exact: true }).click();
  await third.waitForTimeout(400);
  assert.equal(await third.evaluate(() => __game.network.room), "q1");
  assert.equal(await host.evaluate(() => __game.network.role), 0);
  await third.close();
  console.log("PASS third player skips full room");
  await guest.close();
  await host.waitForTimeout(450);
  assert.equal(await host.evaluate(() => __game.network.role), -1);
  tick = await host.evaluate(() => __game.state().tick);
  await host.waitForTimeout(200);
  assert.ok((await host.evaluate(() => __game.state().tick)) > tick);
  await host.close();
  console.log("PASS guest disconnect → host Solo");
  [host, guest] = await pair();
  tick = await guest.evaluate(() => __game.state().tick);
  await host.close();
  await guest.waitForTimeout(500);
  assert.equal(await guest.evaluate(() => __game.network.role), -1);
  assert.ok((await guest.evaluate(() => __game.state().tick)) > tick);
  await guest.screenshot({ path: "artifacts/disconnect.png" });
  await guest.close();
  console.log("PASS host disconnect → guest Solo");
  let a = await page(),
    b = await page();
  await a.getByRole("button", { name: "PLAY ONLINE", exact: true }).click();
  await a.getByRole("button", { name: "PRIVATE ROOM", exact: true }).click();
  await a.getByRole("button", { name: "CREATE", exact: true }).click();
  let room = await a.evaluate(() => __game.network.room.slice(1));
  await b.getByRole("button", { name: "PLAY ONLINE", exact: true }).click();
  await b.getByRole("button", { name: "PRIVATE ROOM", exact: true }).click();
  await b.getByRole("textbox").fill(room);
  await b.getByRole("button", { name: "JOIN", exact: true }).click();
  await b.waitForFunction(() => document.body.classList.contains("playing"));
  console.log("PASS private room");
  await a.close();
  await b.close();
  let built = await page();
  await built.goto("http://localhost:5173/dist/index.html");
  await built.getByRole("button", { name: "PLAY SOLO", exact: true }).click();
  await built.waitForTimeout(300);
  assert.equal(await built.evaluate(() => typeof __game), "undefined");
  await built.screenshot({ path: "artifacts/production.png" });
  await built.close();
  console.log("PASS production inline build");
  assert.deepEqual(errors, []);
  console.log("PASS no browser exceptions");
} finally {
  await browser.close();
}
