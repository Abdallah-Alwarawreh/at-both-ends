import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
let errors = [];
try {
  const c = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    }),
    p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:5173");
  await p.getByRole("button", { name: "YOUR UNICORN" }).click();
  await p.getByLabel("Name", { exact: true }).fill("Luna");
  await p.getByLabel("Coat 2", { exact: true }).click();
  await p.getByLabel("Mane 5", { exact: true }).click();
  for (const name of ["Star", "Flower", "Moon", "Bolt", "Heart"]) {
    const option = p.getByRole("button", { name, exact: true });
    await option.click();
    assert.equal(await option.getAttribute("aria-pressed"), "true");
  }
  await p.screenshot({ path: "artifacts/customization.png" });
  await p.getByRole("button", { name: "DONE" }).click();
  await p.reload();
  await p.getByRole("button", { name: "PLAY SOLO", exact: true }).click();
  assert.equal(await p.locator("#lessonTitle").textContent(), "Move your end");
  assert.deepEqual(await p.evaluate(() => __game.state().profiles[0]), {
    name: "Luna",
    coat: 1,
    mane: 4,
    charm: 5,
  });
  await p.keyboard.down("ArrowRight");
  await p.waitForTimeout(450);
  await p.keyboard.up("ArrowRight");
  assert.equal(await p.locator("#lessonTitle").textContent(), "Red needs red");
  await p.screenshot({ path: "artifacts/tutorial.png" });
  for (let i = 0; i < 3; i++) {
    await p.evaluate(async () => {
      let { restore } = await import("/src/engine.js");
      for (let t of __game.state().targets) restore(__game.state(), t);
    });
    await p.waitForTimeout(100);
  }
  assert.equal(await p.locator("#lesson").isVisible(), false);
  assert.equal(
    await p.evaluate(
      () => JSON.parse(localStorage.getItem("both-ends")).learned,
    ),
    true,
  );
  console.log("PASS tutorial progression and persisted name/customization");
  await p.keyboard.press("KeyP");
  await p.getByRole("heading", { name: "Paused", exact: true }).waitFor();
  let tick = await p.evaluate(() => __game.state().tick);
  await p.keyboard.down("ArrowRight");
  await p.waitForTimeout(200);
  await p.keyboard.up("ArrowRight");
  assert.equal(await p.evaluate(() => __game.state().tick), tick);
  await p.screenshot({ path: "artifacts/pause.png" });
  await p
    .getByRole("dialog")
    .getByRole("button", { name: "Mute sound" })
    .click();
  assert.equal(
    await p.locator("#mute").getAttribute("aria-label"),
    "Unmute sound",
  );
  await p.getByRole("button", { name: "RESUME", exact: true }).click();
  await p.waitForTimeout(100);
  assert.ok((await p.evaluate(() => __game.state().tick)) > tick);
  console.log("PASS pause modal freezes gameplay and shares icon state");
  await p.evaluate(() => {
    let g = __game.state();
    g.players[0].x = 460;
    g.players[1].x = 500;
  });
  await p.screenshot({ path: "artifacts/short-tether.png" });
  await p.evaluate(async () => {
    let { setupWave, restore } = await import("/src/engine.js"),
      g = __game.state();
    g.wave = 7;
    setupWave(g);
    for (let t of g.targets) restore(g, t);
  });
  await p.getByRole("heading", { name: "The sky is yours." }).waitFor();
  await p.screenshot({ path: "artifacts/ending.png" });
  let box = await p.locator("#panel").boundingBox();
  assert.ok(
    box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= 1440 &&
      box.y + box.height <= 900,
  );
  await p.setViewportSize({ width: 390, height: 844 });
  await p.screenshot({ path: "artifacts/ending-mobile.png" });
  box = await p.locator("#panel").boundingBox();
  assert.ok(
    box.x >= 0 && box.x + box.width <= 391 && box.y + box.height <= 845,
  );
  console.log("PASS ending layout desktop and portrait");
  await p.getByRole("button", { name: "TITLE", exact: true }).click();
  await p.getByRole("button", { name: "YOUR UNICORN" }).click();
  await p.screenshot({ path: "artifacts/customization-mobile.png" });
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "HOW TO PLAY" }).click();
  assert.equal(await p.locator("#lessonTitle").textContent(), "Move your end");
  await p.getByRole("button", { name: "SKIP TUTORIAL" }).click();
  assert.equal(await p.evaluate(() => __game.state().tutorial), undefined);
  console.log("PASS tutorial replay/skip and modal escape");
  const a = await browser.newPage(),
    b = await browser.newPage();
  for (let [page, name] of [
    [a, "Sol"],
    [b, "Rain"],
  ]) {
    await page.goto("http://localhost:5173");
    await page.getByRole("button", { name: "YOUR UNICORN" }).click();
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Coat 3", { exact: true }).click();
    await page.getByRole("button", { name: "DONE" }).click();
    await page
      .getByRole("button", { name: "PLAY ONLINE", exact: true })
      .click();
    await page.getByRole("button", { name: "QUICK MATCH" }).click();
  }
  await b.waitForFunction(() => __game.state().profiles?.[0]?.name === "Sol");
  await a.waitForFunction(() => __game.state().profiles?.[1]?.name === "Rain");
  assert.equal(await b.evaluate(() => __game.state().profiles[0].coat), 2);
  console.log("PASS online name and appearance handshake");
  await a.close();
  await b.close();
  await p.goto("http://localhost:5173/dist/index.html");
  await p.getByRole("button", { name: "YOUR UNICORN" }).click();
  await p.getByRole("button", { name: "Heart", exact: true }).click();
  await p.getByRole("button", { name: "DONE" }).click();
  const solo = await p
    .getByRole("button", { name: "PLAY SOLO", exact: true })
    .boundingBox();
  const online = await p
    .getByRole("button", { name: "PLAY ONLINE", exact: true })
    .boundingBox();
  assert.equal(solo.width, online.width);
  await p.screenshot({ path: "artifacts/menu-final.png" });
  await p.getByRole("button", { name: "PLAY SOLO", exact: true }).click();
  await p.waitForTimeout(300);
  const pause = await p
    .getByRole("button", { name: "Pause game", exact: true })
    .boundingBox();
  const audio = await p.locator("footer [data-sound]").boundingBox();
  assert.equal(pause.width, audio.width);
  assert.equal(pause.height, audio.height);
  await p.getByRole("button", { name: "Pause game", exact: true }).click();
  await p.getByRole("heading", { name: "Paused", exact: true }).waitFor();
  await p.getByRole("button", { name: "RESUME", exact: true }).click();
  assert.equal(await p.evaluate(() => typeof __game), "undefined");
  await p.screenshot({ path: "artifacts/packed.png" });
  assert.deepEqual(errors, []);
  console.log("PASS packed build and no runtime exceptions");
} finally {
  await browser.close();
}
