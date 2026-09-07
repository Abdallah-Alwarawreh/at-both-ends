import { test } from "node:test";
import assert from "node:assert/strict";

test("optional Wavedash adapter initializes, reports stats, submits score", async () => {
  const calls = [];
  globalThis.Wavedash = {
    init: (config) => {
      calls.push(["init", config]);
      return true;
    },
    setAchievement: (...args) => calls.push(["achievement", ...args]),
    setStat: (...args) => calls.push(["stat", ...args]),
    storeStats: () => calls.push(["store"]),
    getLeaderboard: async (name) => {
      calls.push(["get", name]);
      return { success: true, data: { id: "leaderboard-id" } };
    },
    uploadLeaderboardScore: async (...args) => {
      calls.push(["upload", ...args]);
      return { success: true };
    },
  };
  const wd = await import(`../src/wavedash.js?test=${Date.now()}`);
  wd.recordStats({ score: 1234, combo: 4 });
  wd.submitRun(
    {
      seed: 7,
      tutorial: false,
      endless: false,
      score: 1234,
      wave: 7,
      spectrums: 1,
      bestCombo: 4,
    },
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(
    calls.map(([type]) => type),
    ["init", "stat", "stat", "store", "get", "upload"],
  );
  assert.equal(calls[5][1], "leaderboard-id");
  assert.equal(calls[5][2], 1234);
  assert.equal(calls[5][3], true);
  delete globalThis.Wavedash;
});
