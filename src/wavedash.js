const sdk = globalThis.Wavedash;
if (sdk) sdk.init({ debug: false });
export const recordStats = (stats) => {
  if (sdk) {
    for (let id in stats) sdk.setStat(id, stats[id], false);
    sdk.storeStats();
  }
};
export const submitRun = (g) => {
  if (sdk && !g.tutorial)
    sdk.getLeaderboard("score")
      .then(
        (r) =>
          r.success && sdk.uploadLeaderboardScore(r.data.id, g.score, true),
      )
      .catch(() => {});
};
