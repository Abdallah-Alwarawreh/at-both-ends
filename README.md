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

First Solo play opens a four-step interactive tutorial. Replay it with **How to play**, or skip it. **Your unicorn** sets a name, coat, mane color, and Plain/Star/Flower/Moon/Bolt/Heart style with live previews. Preferences persist locally and names/appearance are shared with online partners. Cosmetic colors never change the seven collision sections.

Speaker icons toggle sound. Ending panels show score, spectrum count, and time over a dedicated victory scene. Short or obscured rainbow markers lift onto pointers that connect back to their actual collision positions.

The HUD groups chapter progress, collected colors, score, and Harmony. Pause and audio controls sit together at the top-right and adapt to portrait screens. Menus use full-width play/resume actions. Music repeats a 32-step phrase on the audio clock, independent of gameplay frames, with adaptive layers and pause/resume handling.

The UI uses mint/lilac accents, raised arcade controls, Impact/Arial Black display type, and Verdana body text. System-font fallbacks preserve offline play and the ZIP budget. Unicorns retain a minimal rounded silhouette with a continuous neck and short mane.

Solo is fully offline. Seven campaign chapters lead to The Grey, an orbiting seven-core boss. Completing the campaign unlocks Endless. Best score, combo, spectrum count, and survival time are saved locally when storage is available.

Collect seven different colors in any order for Double Rainbow. ROYGBIV order earns Perfect Spectrum. Rapid restores build Flow, and closely timed different colors earn Harmony. Black clouds hurt unicorns; the tether passes safely through them.

## Build

```sh
npm run build
```

Outputs `dist/index.html` (self-contained, including CSS and JavaScript) and `dist/at-both-ends.zip`. Terser, build-only internal-name aliases, Roadroller, and Zopfli compress the game; the decoder uses a 128MB memory budget. The build compares packed and plain output, reports actual ZIP bytes, and fails over 13,312 bytes. Roadroller optimization level defaults to 2; `OPTIMIZE=1` speeds up development builds but may exceed the size limit. Readable source and development tools are not included in the ZIP. No runtime libraries, images, fonts, or audio files are fetched.

Production builds default to `wss://relay.js13kgames.com/at-both-ends`. Override the relay base URL if needed:

```powershell
$env:RELAY_URL = 'wss://YOUR-ASSIGNED-GAME-RELAY'
npm run build
```

The adapter appends `/q0`–`/q7` or `/pABCD` to the base URL. The optional deeply nested example suffix is not required; game-specific rooms remain under `/at-both-ends`. Two production clients were verified through a private subroom on the public relay, including disconnect recovery. Development still uses the local relay. No account credentials are included in source.

Protocol follows the [official 2026 relay documentation](https://js13kgames.com/2026/online): `@id`, `+id`, `-id` notifications, and `@id|payload` direct messages. The local relay is for development only; do not deploy it as an authenticated public service.

## Networking

Host owns simulation. Guest predicts its endpoint and converges toward snapshots. Input changes send four-bit masks; heartbeats repeat every 150ms. World snapshots run at 15Hz and contain compact arrays with complete recovery state.

Either disconnect becomes Solo, preserving endpoint color orientation and progression. Explicit closes take over immediately; silent connection loss uses a 1.3-second timeout. Hiding an online tab ends that connection, pauses that tab locally, and lets its partner continue with AI. Runs do not reconnect mid-game. Returning home or finishing ends the network session.

## Verification

```sh
npm test
npm run test:browser
npm run test:ui
node test/network-browser.mjs
node test/production-browser.mjs
```

Browser tests require installed Google Chrome and the development server. They cover keyboard and touch input, pause/mute, offline Solo, campaign/ending/endless/restart, two-player quick match, private rooms, third-player handling, both disconnect directions, refresh, hidden-tab handling, silence timeout, online completion, and the production build. Screenshots are saved under `artifacts/`.

The campaign test accelerates progression by restoring targets through a development-only test hook. It verifies transitions and endings; it is not a human playthrough. Geometry and recovery have independent simulation tests. The hook is removed from production.

## Remaining external validation

- Play on physical phones and between genuinely separate networks. Browser mobile emulation is not hardware testing.
- Tune campaign duration and difficulty from human playtesting (target: 5–7 minutes).
- Wavedash achievements and leaderboards are not integrated yet.

## Source map

`engine.js`: fixed-step gameplay, shared movement, AI, seeded targets and scoring.
`render.js`: procedural world, unicorns, tether, particles, portrait composition.
`audio.js`: synthesized notes and adaptive musical layers.
`network.js`: matchmaking, relay transport, authoritative snapshots and recovery.
`main.js`: menus, input, persistence and game loop.
`tools/`: development relay and minified ZIP build.
