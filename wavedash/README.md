# Wavedash setup

Game code detects Wavedash's injected `Wavedash` global. Local and standalone builds remain playable when it is absent; no API key or token belongs in this repository.

1. Import [`portal-import.json`](./portal-import.json) in Developer Portal → your game → Achievements / In-Game Stats.
2. Create visible numeric leaderboard `score` with display name `Skybound Score`; sort higher scores first.
3. Publish a Wavedash-hosted build. The adapter initializes the SDK, records five cumulative/best stats, unlocks five stat-driven milestones, and uploads completed-run scores with `keepBest: true`. Rankings appear on the Wavedash game page.
4. Test an authenticated hosted run, a failed SDK request, a duplicate ending, and a disconnected co-op run.

Official references:

- [SDK setup](https://docs.wavedash.com/sdk/setup)
- [Achievements & stats](https://docs.wavedash.com/sdk/achievements)
- [Leaderboards](https://docs.wavedash.com/sdk/leaderboards)
- [Player identity](https://docs.wavedash.com/sdk/players)
