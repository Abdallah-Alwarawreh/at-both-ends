let context,
  master,
  musicBus,
  noise,
  muted = false,
  enabled = false,
  next = 0,
  beat = 0,
  layers = 1;
const voices = new Set(),
  tempo = 0.3125;
function stopMusic() {
  for (let source of voices) source.stop();
  voices.clear();
}
export function unlock() {
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.connect(context.destination);
      musicBus = context.createGain();
      musicBus.gain.value = 0.32;
      musicBus.connect(master);
      noise = context.createBuffer(1, 2205, 44100);
      let a = noise.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
      setInterval(schedule, 25);
    }
    master.gain.value = muted ? 0 : 0.12;
    context.resume();
  } catch {}
}
export function mute() {
  muted = !muted;
  if (master)
    master.gain.setTargetAtTime(muted ? 0 : 0.12, context.currentTime, 0.025);
  return muted;
}
export function note(
  color,
  length = 0.35,
  delay = 0,
  octave = 1,
  type = "sine",
  bus = master,
) {
  if (!context || muted) return;
  const now = context.currentTime + delay,
    o = context.createOscillator(),
    v = context.createGain();
  o.type = type;
  o.frequency.value =
    [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88][color % 7] * octave;
  v.gain.setValueAtTime(0, now);
  v.gain.linearRampToValueAtTime(0.36, now + 0.018);
  v.gain.exponentialRampToValueAtTime(0.001, now + length);
  o.connect(v);
  v.connect(bus);
  if (bus === musicBus) {
    voices.add(o);
    o.onended = () => voices.delete(o);
  }
  o.start(now);
  o.stop(now + length + 0.01);
}
export function sound(e) {
  if (e.type === "restore") note(e.color);
  if (["double", "perfect", "won"].includes(e.type))
    for (let i = 0; i < 7; i++) note(i, 0.8, i * 0.09);
  if (e.type === "harmony") {
    note(0, 0.6);
    note(4, 0.6);
  }
  if (e.type === "hurt") note(0, 0.12, 0, 0.25, "sawtooth");
}
function drum(delay) {
  if (muted) return;
  let o = context.createBufferSource(),
    v = context.createGain(),
    t = context.currentTime + delay;
  o.buffer = noise;
  v.gain.setValueAtTime(0.15, t);
  v.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  o.connect(v);
  v.connect(musicBus);
  voices.add(o);
  o.onended = () => voices.delete(o);
  o.start(t);
}
function schedule() {
  if (!context || !enabled || context.state !== "running") return;
  const now = context.currentTime;
  if (next < now - 0.15) next = now + 0.03;
  while (next < now + 0.12) {
    let delay = Math.max(0, next - now),
      root = [0, 5, 3, 4][beat >> 3];
    if (beat % 2 === 0)
      note(
        [0, 2, 4, 2, 5, 4, 2, 1, 3, 5, 4, 2, 1, 4, 2, 0][beat >> 1],
        0.48,
        delay,
        1,
        "sine",
        musicBus,
      );
    if (layers > 1 && beat % 4 === 0)
      note(root, 0.65, delay, 0.25, "triangle", musicBus);
    if (layers > 2 && beat % 2) drum(delay);
    if (layers > 4 && beat % 8 === 0)
      note(root, 1.8, delay, 0.5, "sine", musicBus);
    if (layers > 5 && beat % 4 === 3)
      note((root + 4) % 7, 0.2, delay, 2, "sine", musicBus);
    beat = (beat + 1) % 32;
    next += tempo;
  }
}
// Stable audio-clock phrase, independent of frame rate and network ticks.
export function music(g, active = true, reset = false) {
  layers = g
    ? Math.max(1, g.spectrum.toString(2).replaceAll("0", "").length)
    : 1;
  if (g?.double > g?.tick) layers = 7;
  if (reset) {
    stopMusic();
    beat = 0;
    next = context ? context.currentTime + 0.03 : 0;
  }
  if (active !== enabled) {
    stopMusic();
    enabled = active;
    next = context ? context.currentTime + 0.03 : 0;
  }
  schedule();
}
