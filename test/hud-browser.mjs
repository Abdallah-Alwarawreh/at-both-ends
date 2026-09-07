import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const p = await browser.newPage();
  await p.goto("http://localhost:5173" + (process.argv.includes("--production") ? "/dist/index.html" : ""));
  await p.getByRole("button", { name: "PLAY SOLO", exact: true }).click();
  await p.getByRole("button", { name: "SKIP TUTORIAL" }).click();
  for (const [width, height] of [
    [1920, 1080],
    [1000, 800],
    [844, 390],
    [390, 844],
  ]) {
    await p.setViewportSize({ width, height });
    const hud = await p.locator("header > div").boundingBox();
    const pause = await p.locator("#pause").boundingBox();
    const sound = await p.locator("#mute").boundingBox();
    assert.equal(pause.width, 48);
    assert.equal(pause.height, 48);
    assert.equal(sound.width, pause.width);
    assert.equal(sound.height, pause.height);
    assert.equal(sound.y, pause.y);
    assert.ok(sound.x + sound.width <= width);
    assert.equal(
      await p
        .locator("header > div > div:first-child")
        .evaluate((e) => getComputedStyle(e).borderLeftWidth),
      "0px",
    );
    if (width > 650) {
      assert.ok(Math.abs(pause.y + 24 - hud.y - hud.height / 2) < 1);
      assert.ok(pause.x >= hud.x + hud.width + 15);
    } else {
      assert.ok(pause.y >= hud.y + 12);
    }
    await p.screenshot({ path: `artifacts/hud-${width}.png` });
  }
  console.log(
    "PASS HUD accent removal and control sizing/alignment at four viewports",
  );
} finally {
  await browser.close();
}
