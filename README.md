# At Both Ends

Two unicorns. One rainbow. Every color matters.

A procedural Canvas arcade game for js13kGames. Move one unicorn so the matching **section along the rainbow** touches a creature's colored core. Hold contact briefly to restore it. Symbols on the tether and cores supplement color.

## Run

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:5173. Development serves the game and a local WebSocket relay. Two browser windows can quick-match or join the same four-letter private room.

## Controls

- WASD / arrows: move your unicorn.
- Touch and drag anywhere in the arena: directional stick; release to stop.
- P / Escape, or pause button: open the Solo pause menu (resume, restart, sound, title).
- M / sound button: toggle audio.
- Enter or tap the arena after losing: restart immediately; the results panel also offers replay.

First Solo play opens a four-step interactive tutorial. Replay it with **How to play**, or skip it. **Your unicorn** sets a name, coat, mane color, and plain/star/flower style with a live preview. Preferences persist locally and names/appearance are shared with online partners. Cosmetic colors never change the seven collision sections.

Speaker icons toggle sound. Ending panels show score, spectrum count, and time over a dedicated victory scene. Short or obscured rainbow markers lift onto pointers that connect back to their actual collision positions.

Solo is fully offline. Seven campaign chapters lead to The Grey, an orbiting seven-core boss. Completing the campaign unlocks Endless. Best score, combo, spectrum count, and survival time are saved locally when storage is available.

Collect seven different colors in any order for Double Rainbow. ROYGBIV order earns Perfect Spectrum. Rapid restores build Flow, and closely timed different colors earn Harmony. Black clouds hurt unicorns; the tether passes safely through them.

## Build

```sh
npm run build
```

Outputs `dist/index.html` (self-contained, including CSS and JavaScript) and `dist/at-both-ends.zip`. Terser and Roadroller compress the game; the decoder uses a 48MB memory budget. The build chooses compressed output only when it beats plain ZIP compression, reports actual ZIP bytes, and fails over 13,312 bytes. Set `OPTIMIZE=2` for a slower compressor search. Readable source and development tools are not included in the ZIP. No runtime libraries, images, fonts, or audio files are fetched.

For competition online play, set the official game relay base URL before building:

```powershell
$env:RELAY_URL = 'wss://YOUR-ASSIGNED-GAME-RELAY'
npm run build
```

The adapter appends `/q0`–`/q7` or `/pABCD` to the base URL. Verify subroom routing against the assigned endpoint. An unconfigured production build offers Solo and explains online unavailability. No account credentials are included in source.

Protocol follows the [official 2026 relay documentation](https://js13kgames.com/2026/online): `@id`, `+id`, `-id` notifications, and `@id|payload` direct messages. The local relay is for development only; do not deploy it as an authenticated public service.

## Networking

Host owns simulation. Guest predicts its endpoint and converges toward snapshots. Input changes send four-bit masks; heartbeats repeat every 150ms. World snapshots run at 15Hz and contain compact arrays with complete recovery state. State correctness takes priority over the GDD's speculative 8–14-byte packet.

Either disconnect becomes Solo, preserving endpoint color orientation and progression. Explicit closes take over immediately; silent connection loss uses a 1.3-second timeout. Hiding an online tab ends that connection, pauses that tab locally, and lets its partner continue with AI. Runs do not reconnect mid-game. Returning home or finishing ends the network session.

## Verification

```sh
npm test
npm run test:browser
npm run test:ui
node test/network-browser.mjs
```

Browser tests require installed Google Chrome and the development server. They cover keyboard and touch input, pause/mute, offline Solo, campaign/ending/endless/restart, two-player quick match, private rooms, third-player handling, both disconnect directions, refresh, hidden-tab handling, silence timeout, online completion, and the production build. Screenshots are saved under `artifacts/`.

The campaign test accelerates progression by restoring targets through a development-only test hook. It verifies transitions and endings; it is not a human playthrough. Geometry and recovery have independent simulation tests. The hook is removed from production.

## Remaining external validation

- Assign and test the actual competition relay, including its subroom paths.
- Play on physical phones and between genuinely separate networks. Browser mobile emulation is not hardware testing.
- Tune campaign duration and difficulty from human playtesting (target: 5–7 minutes).
- Wavedash SDK, leaderboard, and achievement integration is deferred; no platform credentials or confirmed challenge requirements were supplied.

## Source map

`engine.js`: fixed-step gameplay, shared movement, AI, seeded targets and scoring.
`render.js`: procedural world, unicorns, tether, particles, portrait composition.
`audio.js`: synthesized notes and adaptive musical layers.
`network.js`: matchmaking, relay transport, authoritative snapshots and recovery.
`main.js`: menus, input, persistence and game loop.
`tools/`: development relay and minified ZIP build.
