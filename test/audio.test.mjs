import { test } from "node:test";
import assert from "node:assert/strict";
test("audio clock repeats the full melody without simulation ticks; pause, resume and reset", async () => {
  let clock,
    run,
    notes = [];
  const realTimer = globalThis.setInterval;
  globalThis.setInterval = (fn) => {
    run = fn;
    return 0;
  };
  const gain = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  });
  globalThis.AudioContext = class {
    constructor() {
      clock = this;
      this.currentTime = 0;
      this.state = "running";
    }
    createGain() {
      return { gain: gain(), connect() {} };
    }
    createBuffer() {
      return { getChannelData: () => new Float32Array(2205) };
    }
    createOscillator() {
      let o = {
        frequency: { value: 0 },
        connect() {},
        start(t) {
          notes.push({ time: t, f: o.frequency.value });
        },
        stop() {},
      };
      return o;
    }
    resume() {}
  };
  try {
    const { unlock, music } = await import("../src/audio.js");
    unlock();
    music({ tick: 0, spectrum: 0, double: 0 }, true, true);
    for (let i = 1; i <= 820; i++) {
      clock.currentTime = i * 0.025;
      run();
    }
    assert.ok(notes.length >= 32);
    assert.deepEqual(
      notes.slice(0, 16).map((n) => n.f),
      notes.slice(16, 32).map((n) => n.f),
    );
    for (let i = 1; i < 32; i++)
      assert.ok(Math.abs(notes[i].time - notes[i - 1].time - 0.625) < 1e-8);
    music(null, false);
    const count = notes.length;
    clock.currentTime += 10;
    run();
    assert.equal(notes.length, count);
    music(null, true);
    clock.currentTime += 0.7;
    run();
    assert.ok(notes.length > count);
    music(null, true, true);
    assert.equal(notes.at(-1).f, 261.63);
    assert.ok(Math.abs(notes.at(-1).time - clock.currentTime - 0.03) < 1e-8);
  } finally {
    globalThis.setInterval = realTimer;
    delete globalThis.AudioContext;
  }
});
