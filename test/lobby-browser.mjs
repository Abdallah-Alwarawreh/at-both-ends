import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(
    "http://localhost:5173" +
      (process.argv.includes("--production") ? "/dist/index.html" : ""),
  );
  await page.getByRole("button", { name: "PLAY ONLINE", exact: true }).click();
  await page.getByRole("button", { name: "PRIVATE ROOM" }).click();
  await page.getByRole("button", { name: "CREATE", exact: true }).click();
  const heading = page.locator("main h1");
  const code = await heading.textContent();
  assert.match(code, /^[A-Z]{4}$/);
  await page.waitForTimeout(9500);
  assert.equal(await heading.textContent(), code);
  assert.ok((await page.locator("#status").textContent()).includes("WAITING"));
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    const box = await heading.boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= width);
    assert.ok(
      await heading.evaluate(
        (e) => parseFloat(getComputedStyle(e).fontSize) >= 64,
      ),
    );
    await page.screenshot({ path: `artifacts/lobby-${width}.png` });
  }
  await page.getByRole("button", { name: "BACK", exact: true }).click();
  assert.equal(await heading.textContent(), "PLAY ONLINE");
  console.log(
    "PASS prominent room code survives waiting status and clears on Back",
  );
} finally {
  await browser.close();
}
