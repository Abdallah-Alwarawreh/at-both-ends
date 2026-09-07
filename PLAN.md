# At Both Ends — implementation plan

Implemented and verified locally. Source is formatted and modular; production is one inline HTML file. Browser tests cover both disconnect directions, private/quick rooms, third-player handling, refresh, hidden tabs, silence timeout, campaign completion, touch input, and offline play. Physical-device and separate-network testing remain external. User confirmed the official relay URL is not available yet.

Second pass: icon sound controls; modal pause/results; quiet title and HUD; live-preview name/coat/mane/style customization with persistence and online handshake; four-stage interactive tutorial; improved procedural unicorns; foreground markers with offset pointers when endpoints occlude them. Preserve the original background. Initialize and push main to the user-specified GitHub repository after verification.

1. Shared fixed-step simulation: seven longitudinal hit zones, four-bit movement, AI, deterministic waves.
2. Complete offline campaign: guided opening, seven waves, boss, restoration scoring, spectrum, health, ending, endless.
3. Canvas presentation: procedural unicorns and clouds, persistent flowers, shape-coded targets, responsive HUD, synthesized music.
4. Host-authoritative co-op: relay-compatible matchmaking, private rooms, snapshots, prediction, disconnect takeover on either side.
5. Verification: simulation tests, desktop/mobile browser checks, two/three clients, disconnects, production ZIP measurement.

Decisions:

- Rainbow colors divide its length, matching collision. Parallel stripes are only decorative during the Double Rainbow reward.
- A complete recovery snapshot takes priority over a speculative 8–14-byte packet. Pack state only after correctness.
- Local development includes a relay implementing the documented js13k transport. Production relay URL must come from the competition account and is set at build time via RELAY_URL.
- Wavedash integration is deferred until platform credentials and challenge requirements are available; the standalone competition game comes first.

External verification:

- https://js13kgames.com/2026/online : system messages @id/+id/-id; direct messages @id|payload; offline play required.
