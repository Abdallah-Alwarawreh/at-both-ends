export const W = 960,
  H = 640,
  DT = 1 / 60;
export const COLORS = [
  "#ff797e",
  "#ffa15e",
  "#ffe28b",
  "#93d9a4",
  "#75c9ef",
  "#9b9be9",
  "#dc9fdf",
];
export const NAMES = [
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "BLUE",
  "INDIGO",
  "VIOLET",
];
export const SYMBOLS = ["●", "■", "▲", "◆", "+", "☾", "✦"];
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function projection(a, b, p) {
  let x = b.x - a.x,
    y = b.y - a.y,
    d = x * x + y * y,
    t = d ? clamp(((p.x - a.x) * x + (p.y - a.y) * y) / d, 0, 1) : 0;
  return {
    t,
    color: Math.min(6, Math.floor(t * 7)),
    distance: Math.hypot(p.x - a.x - x * t, p.y - a.y - y * t),
  };
}
export function move(p, mask, other, dt = DT) {
  let x = !!(mask & 2) - !!(mask & 1),
    y = !!(mask & 8) - !!(mask & 4),
    n = Math.hypot(x, y) || 1;
  x /= n;
  y /= n;
  let dx = p.x - other.x,
    dy = p.y - other.y,
    d = Math.hypot(dx, dy);
  let speed = 205;
  if (d > 490 && x * dx + y * dy > 0)
    speed *= Math.max(0.12, 1 - (d - 490) / 260);
  const k = 1 - Math.exp(-dt * 15);
  p.vx += (x * speed - p.vx) * k;
  p.vy += (y * speed - p.vy) * k;
  p.x = clamp(p.x + p.vx * dt, 34, W - 34);
  p.y = clamp(p.y + p.vy * dt, 115, H - 65);
  if (Math.abs(p.vx) > 8) p.face = p.vx > 0 ? 1 : -1;
}
const player = (x, y) => ({ x, y, vx: 0, vy: 0, face: 1 });
export function createGame(seed = Date.now() >>> 0, endless = false) {
  let g = {
    seed,
    tick: 0,
    wave: 0,
    waveTick: 0,
    players: [player(245, 330), player(715, 330)],
    targets: [],
    hazards: [],
    health: 100,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lastHit: -1000,
    lastColor: -1,
    spectrum: 0,
    perfect: 0,
    spectrums: 0,
    double: 0,
    restored: 0,
    status: "play",
    endless,
    events: [],
    nextWave: 0,
    damageUntil: 0,
  };
  setupWave(g);
  return g;
}
export function setupWave(g) {
  let rng = random(g.seed + g.wave * 991),
    boss = g.wave === 7 && !g.endless;
  g.waveTick = g.tick;
  g.nextWave = 0;
  g.targets = [];
  g.hazards = [];
  let count = boss
    ? 7
    : g.wave === 0 && !g.endless
      ? 7
      : Math.min(23, 9 + g.wave * 2);
  for (let i = 0; i < count; i++) {
    let tutorial = g.wave === 0 && !g.endless;
    let color = boss ? i : tutorial ? [0, 4, 1, 2, 3, 5, 6][i] : i % 7;
    let type = boss
      ? 4
      : tutorial
        ? 0
        : Math.min(g.wave, 3, Math.floor(rng() * 4));
    let spawn = tutorial ? i * 95 : i * 75;
    g.targets.push({
      id: i,
      color,
      baseColor: color,
      type,
      x: 0,
      y: 0,
      x0: 140 + rng() * 680,
      y0: 210 + rng() * 270,
      phase: rng() * 6.28,
      speed: 0.35 + rng() * 0.35 + g.wave * 0.045,
      spawn,
      born: g.tick + spawn,
      life: tutorial ? 3600 : 1500,
      charge: 0,
      done: 0,
    });
  }
  if (g.wave === 0 && !g.endless) {
    g.targets[0].x0 = 279;
    g.targets[0].y0 = 300;
    g.targets[0].phase = 0;
    g.targets[1].x0 = 552;
    g.targets[1].y0 = 375;
  }
  for (let i = 0; i < (boss ? 3 : Math.min(5, Math.max(0, g.wave - 1))); i++)
    g.hazards.push({
      x: 0,
      y: 0,
      x0: 180 + rng() * 600,
      y0: 200 + rng() * 290,
      phase: rng() * 6.28,
    });
  updateTargets(g);
  g.events.push({ type: "wave", wave: g.wave });
}
export function updateTargets(g) {
  let t = g.tick / 60,
    bossDone = g.targets.filter((p) => p.done === 1).length;
  for (let p of g.targets) {
    if (p.done) continue;
    if (p.type === 4) {
      let a = (p.id * Math.PI * 2) / 7 + t * (0.11 + bossDone * 0.012);
      p.x = 480 + Math.cos(a) * 177;
      p.y = 350 + Math.sin(a) * 135;
      p.color = p.baseColor;
      continue;
    }
    if (p.type === 2) {
      if (!p.x) {
        p.x = p.x0;
        p.y = p.y0;
      }
      if (g.tick >= p.born) {
        let a = g.players.reduce((a, b) =>
          Math.hypot(p.x - a.x, p.y - a.y) < Math.hypot(p.x - b.x, p.y - b.y)
            ? a
            : b,
        );
        let d = Math.hypot(p.x - a.x, p.y - a.y);
        if (d < 125) {
          p.x = clamp(p.x + ((p.x - a.x) / (d || 1)) * 0.32, 85, 875);
          p.y = clamp(p.y + ((p.y - a.y) / (d || 1)) * 0.32, 160, 530);
        }
      }
    } else {
      p.x = p.x0 + Math.sin(t * p.speed + p.phase) * (p.type === 1 ? 85 : 15);
      p.y =
        p.y0 + Math.cos(t * p.speed * 0.7 + p.phase) * (p.type === 1 ? 25 : 14);
    }
    if (p.type === 3)
      p.color = (p.baseColor + Math.floor((g.tick - p.born) / 150)) % 7;
  }
  for (let p of g.hazards) {
    p.x = p.x0 + Math.sin(t * 0.4 + p.phase) * 75;
    p.y = p.y0 + Math.cos(t * 0.3 + p.phase) * 48;
  }
}
export function aiInput(g, index) {
  let p = g.players[index],
    a = g.players[1 - index],
    dx = a.x - p.x,
    dy = a.y - p.y;
  if (Math.hypot(dx, dy) > 610) return direction(dx, dy);
  let hazard = g.hazards.find((h) => Math.hypot(p.x - h.x, p.y - h.y) < 77);
  if (hazard) return direction(p.x - hazard.x, p.y - hazard.y);
  let best = null,
    cost = Infinity;
  for (let target of g.targets) {
    if (target.done || target.born > g.tick) continue;
    let t = (target.color + 0.5) / 7;
    if (index === 0) t = 1 - t;
    if (t < 0.18) continue;
    let x = a.x + (target.x - a.x) / t,
      y = a.y + (target.y - a.y) / t;
    if (x < 35 || x > 925 || y < 120 || y > 570) continue;
    let c = Math.hypot(x - p.x, y - p.y) + Math.hypot(x - a.x, y - a.y) * 0.12;
    if (c < cost) {
      cost = c;
      best = { x, y };
    }
  }
  if (best) return direction(best.x - p.x, best.y - p.y, 12);
  return direction(
    clamp(a.x + (index ? 280 : -280), 90, 870) - p.x,
    340 + Math.sin(g.tick / 230) * 90 - p.y,
    20,
  );
}
function direction(x, y, dead = 8) {
  return (
    (x < -dead ? 1 : x > dead ? 2 : 0) | (y < -dead ? 4 : y > dead ? 8 : 0)
  );
}
export function restore(g, p) {
  p.done = 1;
  p.charge = 1;
  g.combo = g.tick - g.lastHit < 114 ? Math.min(30, g.combo + 1) : 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.score += 100 * g.combo * (g.double > g.tick ? 2 : 1);
  g.spectrum |= 1 << p.color;
  g.perfect = p.color === g.perfect ? g.perfect + 1 : p.color === 0 ? 1 : 0;
  if (g.tick - g.lastHit <= 24 && g.lastColor !== p.color) {
    g.score += 250;
    g.events.push({ type: "harmony" });
  }
  g.lastHit = g.tick;
  g.lastColor = p.color;
  g.restored++;
  g.events.push({ type: "restore", x: p.x, y: p.y, color: p.color });
  if (g.spectrum === 127) {
    g.spectrum = 0;
    g.spectrums++;
    g.double = g.tick + 180;
    g.health = Math.min(100, g.health + 14);
    g.score += 1500;
    g.events.push({ type: "double" });
  }
  if (g.perfect === 7) {
    g.perfect = 0;
    g.score += 3000;
    g.events.push({ type: "perfect" });
  }
}
export function step(g, inputs) {
  if (g.status !== "play") return;
  g.tick++;
  g.events = [];
  for (let i = 0; i < 2; i++)
    move(g.players[i], inputs[i] ?? aiInput(g, i), g.players[1 - i]);
  updateTargets(g);
  for (let p of g.targets) {
    if (p.done || p.born > g.tick) continue;
    let hit = projection(...g.players, p);
    if (hit.color === p.color && hit.distance < (g.double > g.tick ? 24 : 15))
      p.charge += g.double > g.tick ? 1 / 8 : 1 / 15;
    else p.charge = Math.max(0, p.charge - 1 / 30);
    if (p.charge >= 0.999) restore(g, p);
    else if (p.type !== 4 && g.tick - p.born > p.life) {
      p.done = 2;
      g.health -= g.wave === 0 ? 0 : 7;
      g.events.push({ type: "escape" });
    }
  }
  if (
    g.tick > g.damageUntil &&
    g.hazards.some((h) =>
      g.players.some((p) => Math.hypot(h.x - p.x, h.y - p.y) < 43),
    )
  ) {
    g.health -= 11;
    g.damageUntil = g.tick + 75;
    g.events.push({ type: "hurt" });
  }
  if (g.health <= 0) {
    g.health = 0;
    g.status = "lost";
    g.events.push({ type: "lost" });
    return;
  }
  if (g.tick - g.lastHit > 114) g.combo = 0;
  if (!g.tutorial && g.targets.every((p) => p.done)) {
    if (!g.nextWave) {
      g.nextWave = g.tick + 105;
      g.score += Math.round(g.health) * 5;
      g.events.push({ type: "clear" });
    }
    if (g.tick >= g.nextWave) {
      if (g.wave === 7 && !g.endless) {
        g.status = "won";
        g.events.push({ type: "won" });
      } else {
        g.wave++;
        setupWave(g);
      }
    }
  }
}
// Complete recovery state, including non-deterministic clouds and combo timers.
export function snapshot(g) {
  return JSON.stringify(g, (key, value) =>
    key === "events" ? undefined : value,
  );
}
export function recover(data) {
  let g = JSON.parse(data);
  g.events = [];
  return g;
}
