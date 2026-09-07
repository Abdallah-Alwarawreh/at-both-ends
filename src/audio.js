let context,
  master,
  noise,
  muted = false,
  lastBeat = -1;
export function unlock() {
  try {
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      master.connect(context.destination);
      noise = context.createBuffer(1, 2205, 44100);
      let a = noise.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    master.gain.value = muted ? 0 : 0.12;
    context.resume();
  } catch {}
}
export function mute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.12;
  return muted;
}
export function note(
  color,
  length = 0.35,
  delay = 0,
  octave = 1,
  type = "sine",
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
  v.connect(master);
  o.start(now);
  o.stop(now + length + 0.01);
}
export function sound(event) {
  if (event.type === "restore") note(event.color);
  if (["double", "perfect", "won"].includes(event.type))
    for (let i = 0; i < 7; i++) note(i, 0.8, i * 0.09);
  if (event.type === "harmony") {
    note(0, 0.6);
    note(4, 0.6);
  }
  if (event.type === "hurt") note(0, 0.12, 0, 0.25, "sawtooth");
}
function drum() {
  if (!context || muted) return;
  let o = context.createBufferSource(),
    v = context.createGain(),
    t = context.currentTime;
  o.buffer = noise;
  v.gain.setValueAtTime(0.15, t);
  v.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
  o.connect(v);
  v.connect(master);
  o.start();
}
export function music(g) {
  let beat = Math.floor(g.tick / 30);
  if (beat === lastBeat) return;
  lastBeat = beat;
  let layers = g.spectrum.toString(2).replaceAll("0", "").length;
  if (g.double > g.tick) layers = 7;
  if (layers > 0 && beat % 2 === 0) note(0, 0.1, 0, 0.5, "triangle");
  if (layers > 1 && beat % 2 === 0)
    note([0, 4, 5, 3][(beat / 2) % 4], 0.4, 0, 0.25, "triangle");
  if (layers > 2) drum();
  if (layers > 3) note([0, 2, 4, 6][beat % 4], 0.2, 0, 1);
  if (layers > 4 && beat % 4 === 0) note(4, 1.5, 0, 0.5);
  if (layers > 5) note((beat * 2) % 7, 0.18, 0.2, 2);
  if (layers > 6 && beat % 4 === 0) {
    note(0, 1);
    note(2, 1);
    note(4, 1);
  }
}
