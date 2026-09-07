import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const room = Array.from({ length: 4 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");
try {
  const pages = [await browser.newPage(), await browser.newPage()];
  for (const page of pages) {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:5173/dist/index.html");
    await page.getByRole("button", { name: "YOUR UNICORN" }).click();
    await page.getByRole("button", { name: "Heart", exact: true }).click();
    await page.getByRole("button", { name: "DONE" }).click();
    await page.getByRole("button", { name: "PLAY ONLINE", exact: true }).click();
    await page.getByRole("button", { name: "PRIVATE ROOM" }).click();
    await page.getByRole("textbox").fill(room);
    await page.getByRole("button", { name: "JOIN", exact: true }).click();
  }
  for (const page of pages) {
    await page.waitForFunction(() => document.body.classList.contains("playing"));
    assert.equal(await page.getByRole("button", { name: "Pause game" }).isDisabled(), true);
  }
  await pages[0].close();
  await pages[1].waitForFunction(() => !document.querySelector("#pause").disabled);
  await pages[1].getByRole("button", { name: "Pause game" }).click();
  await pages[1].getByRole("heading", { name: "Paused", exact: true }).waitFor();
  await pages[1].getByRole("button", { name: "RESUME", exact: true }).click();
  assert.deepEqual(errors, []);
  console.log("PASS packed multiplayer, disconnect recovery, and pause/resume");
} finally {
  await browser.close();
}
