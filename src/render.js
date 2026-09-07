import { W, H, COLORS, SYMBOLS, random } from "./engine.js";
import { COATS } from "./profile.js";
let ctx,
  cw,
  ch,
  scale,
  ox,
  oy,
  particles = [],
  flowers = [],
  lastSeed,
  endTime = 0,
  portrait = false,
  reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mapY = (y) =>
  portrait ? (220 + ((y - 115) / 460) * (ch - 350)) / scale : y;
function actor(draw, x, y, size = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  draw();
  ctx.restore();
}
export function init(canvas) {
  ctx = canvas.getContext("2d");
  function resize() {
    let d = Math.min(devicePixelRatio || 1, 2);
    cw = innerWidth;
    ch = innerHeight;
    canvas.width = cw * d;
    canvas.height = ch * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    scale = Math.min(cw / W, ch / H);
    ox = (cw - W * scale) / 2;
    oy = (ch - H * scale) / 2;
  }
  addEventListener("resize", resize);
  resize();
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function line(x, y, a, b, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(a, b);
  ctx.stroke();
}
function text(s, x, y, size, color = "#edf8f5") {
  ctx.fillStyle = color;
  ctx.font = `${size}px Verdana,Arial`;
  ctx.textAlign = "center";
  ctx.fillText(s, x, y);
}
function cloud(x, y, r, color) {
  ellipse(x, y, r * 1.4, r * 0.52, color);
  ellipse(x - r * 0.6, y - r * 0.3, r * 0.65, r * 0.6, color);
  ellipse(x + r * 0.3, y - r * 0.5, r * 0.83, r * 0.7, color);
}
function symbol(i, x, y, size = 13) {
  text(SYMBOLS[i], x, y + size * 0.35, size, "#152b36");
}
function unicorn(p, color, t, label, look = { coat: 0, mane: 0, charm: 0 }) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (portrait) ctx.scale(1.5, 1.5);
  if (label) {
    text(label, 0, -68, 10, "#b5c7cb");
  }
  ctx.rotate(Math.max(-0.12, Math.min(0.12, p.vx / 1600)));
  ctx.scale(p.face || 1, 1);
  let walk = Math.hypot(p.vx, p.vy) / 205;
  let coat = COATS[look.coat] || COATS[0],
    mane = COLORS[look.mane] || color;
  ellipse(0, 25, 26, 5, "#08192566");
  ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    let x = -15 + i * 9,
      swing = Math.sin(t * 13 + i * 2) * walk * 7;
    line(x, 7, x + swing, 24, coat, 4);
    line(x + swing, 24, x + swing + 3, 24, mane, 4);
  }
  ctx.strokeStyle = mane;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-23, -3);
  ctx.bezierCurveTo(-48, -20, -37, 25 + Math.sin(t * 3) * 4, -54, 12);
  ctx.stroke();
  // One rounded body/neck silhouette: no intersecting neck ellipses.
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-27, 0);
  ctx.bezierCurveTo(-28, -13, -8, -17, 9, -11);
  ctx.bezierCurveTo(14, -17, 10, -30, 19, -34);
  ctx.bezierCurveTo(24, -38, 37, -34, 38, -29);
  ctx.bezierCurveTo(51, -27, 48, -17, 36, -18);
  ctx.bezierCurveTo(30, -17, 29, -21, 27, -19);
  ctx.bezierCurveTo(27, -8, 34, 0, 24, 9);
  ctx.bezierCurveTo(14, 19, -27, 17, -27, 0);
  ctx.fill();
  ctx.fillStyle = "#ffe5a4";
  ctx.beginPath();
  ctx.moveTo(25, -33);
  ctx.lineTo(29, -54);
  ctx.lineTo(33, -33);
  ctx.fill();
  line(27, -44, 31, -42, "#c89b59", 1);
  line(28, -49, 30, -48, "#c89b59", 1);
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(16, -31);
  ctx.lineTo(14, -44);
  ctx.lineTo(23, -34);
  ctx.fill();
  ctx.strokeStyle = mane;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(17, -33);
  ctx.bezierCurveTo(11, -31, 16, -24, 12, -20);
  ctx.bezierCurveTo(9, -17, 13, -13, 8, -9);
  ctx.stroke();
  ellipse(20, -33, 5, 3, mane);
  ellipse(34, -27, 1.8, 2.3, "#132b3b");
  ellipse(43, -21, 2.8, 1.8, "#efb4ab");
  if (look.charm && look.charm !== 2)
    text(["", "✦", "", "☾", "ϟ", "♥"][look.charm], -7, 5, 15, mane);
  if (look.charm === 2) {
    for (let i = 0; i < 5; i++)
      ellipse(
        15 + Math.cos(i * 1.256) * 4,
        -36 + Math.sin(i * 1.256) * 4,
        2.5,
        2.5,
        mane,
      );
    ellipse(15, -36, 2, 2, "#ffe28b");
  }
  ctx.restore();
}
export function preview(canvas, look) {
  let previous = ctx,
    oldPortrait = portrait;
  ctx = canvas.getContext("2d");
  portrait = false;
  ctx.clearRect(0, 0, 300, 170);
  actor(
    () =>
      unicorn({ x: 0, y: 0, vx: 0, vy: 0, face: 1 }, COLORS[0], 0, "", look),
    160,
    115,
    1.8,
  );
  ctx = previous;
  portrait = oldPortrait;
}
function markers(a, b) {
  let dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.hypot(dx, dy),
    size = portrait ? 13 : 10;
  for (let i = 0; i < 7; i++) {
    let t = (i + 0.5) / 7,
      x = a.x + dx * t,
      y = a.y + dy * t,
      mx = x,
      my = y;
    if (len < 180) {
      mx = Math.max(110, Math.min(850, (a.x + b.x) / 2)) + (i - 3) * 27;
      my = Math.min(a.y, b.y) + (Math.min(a.y, b.y) < 190 ? 85 : -85);
    } else if (
      Math.min(Math.hypot(x - a.x, y - a.y), Math.hypot(x - b.x, y - b.y)) <
      (portrait ? 90 : 65)
    )
      my += y > (portrait ? ch / scale - 220 : 520) ? -85 : 58;
    if (my !== y) {
      line(x, y, mx, my, COLORS[i], 1.3);
      ellipse(x, y, 3, 3, "#fff5df");
    }
    ellipse(mx, my, size + 2, size + 2, "#122735");
    ellipse(mx, my, size, size, COLORS[i]);
    symbol(i, mx, my, size + 3);
  }
}
function tether(a, b, time, doubled) {
  let dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.hypot(dx, dy) || 1,
    nx = -dy / len,
    ny = dx / len;
  ctx.lineCap = "butt";
  for (let i = 0; i < 7; i++) {
    let t = i / 7,
      u = (i + 1) / 7,
      x = a.x + dx * t,
      y = a.y + dy * t,
      ex = a.x + dx * u,
      ey = a.y + dy * u;
    ctx.globalAlpha = 0.05;
    line(x, y, ex, ey, COLORS[i], doubled ? 62 : 46);
    ctx.globalAlpha = 0.11;
    line(x, y, ex, ey, COLORS[i], doubled ? 44 : 28);
    ctx.globalAlpha = 0.85;
    line(x, y, ex, ey, COLORS[i], doubled ? 24 : 13);
    ctx.globalAlpha = 0.6;
    line(x, y - 3, ex, ey - 3, "#fff8e0", 2);
    ctx.globalAlpha = 1;
    if (doubled) {
      ctx.globalAlpha = 0.55;
      line(x + nx * 30, y + ny * 30, ex + nx * 30, ey + ny * 30, COLORS[i], 6);
      ctx.globalAlpha = 1;
    }
  }
  ctx.lineCap = "round";
}
export function effects(events) {
  for (let e of events) {
    if (e.type === "restore") {
      flowers.push({ x: e.x, y: e.y, color: e.color });
      for (let i = 0; i < (reduce ? 5 : 22); i++) {
        let a = Math.random() * 6.28,
          s = 20 + Math.random() * 95;
        particles.push({
          x: e.x,
          y: e.y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          color: COLORS[e.color],
        });
      }
    }
  }
  if (flowers.length > 100) flowers.splice(0, flowers.length - 100);
}
export function render(g, time, menu = false, local = 0, profile = {}) {
  portrait = !menu && ch > cw * 1.2;
  scale = Math.min(cw / W, ch / H);
  ox = (cw - W * scale) / 2;
  oy = portrait ? 0 : (ch - H * scale) / 2;
  if (portrait) {
    let map = (p) => ({ ...p, y: mapY(p.y) });
    g = {
      ...g,
      players: g.players.map(map),
      targets: g.targets.map(map),
      hazards: g.hazards.map(map),
    };
  }
  if (lastSeed !== g.seed) {
    lastSeed = g.seed;
    flowers = [];
    particles = [];
  }
  let sat = Math.min(1, g.restored / 45);
  let bg = ctx.createLinearGradient(0, 0, cw, ch);
  bg.addColorStop(0, "#0d1d2b");
  bg.addColorStop(
    0.55,
    `rgb(${18 + sat * 6},${39 + sat * 13},${53 + sat * 10})`,
  );
  bg.addColorStop(1, "#253e49");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  let rng = random(113);
  for (let i = 0; i < 90; i++) {
    let x = rng() * W,
      y = rng() * (portrait ? ch / scale : H),
      r = rng();
    ctx.globalAlpha = 0.1 + r * 0.3;
    ellipse(x, y, 0.5 + r, 0.5 + r, "#d5eadb");
  }
  ctx.globalAlpha = 1;
  // Hand-drawn horizon contours and drifting cloud banks frame the arena.
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = "#8fa8a012";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-100, mapY(535 + i * 17));
    ctx.bezierCurveTo(
      180,
      mapY(420 + i * 25),
      630,
      mapY(680 - i * 16),
      1100,
      mapY(475 + i * 17),
    );
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    let x = ((i * 183 + Math.sin(time * 0.03 + i) * 20) % 1100) - 60;
    cloud(
      x,
      mapY(610) + Math.sin(i * 2) * 21,
      70 + (i % 3) * 24,
      ["#1c3340", "#203945", "#28424b"][i % 3],
    );
  }
  for (let f of flowers) {
    let y = mapY(f.y);
    ctx.globalAlpha = 0.5;
    line(f.x, y + 8, f.x, y + 22, "#8ea893", 1);
    for (let i = 0; i < 5; i++)
      ellipse(
        f.x + Math.cos(i * 1.256) * 4,
        y + Math.sin(i * 1.256) * 4,
        2.8,
        2.8,
        COLORS[f.color],
      );
    ellipse(f.x, y, 1.5, 1.5, "#fff1cc");
  }
  ctx.globalAlpha = 1;
  if (!menu && g.status === "won") {
    const cy = portrait ? mapY(220) : 245;
    if (portrait) {
      ctx.translate(480, cy);
      ctx.scale(1.6, 1.6);
      ctx.translate(-480, -cy);
    }
    for (let i = 0; i < 7; i++) {
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = COLORS[i];
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(480, cy + 120, 155 + i * 7, Math.PI, 0);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    cloud(480, cy + 35, 95, "#7b9e9e");
    ellipse(460, cy + 30, 3, 4, "#203e47");
    ellipse(500, cy + 30, 3, 4, "#203e47");
    ctx.strokeStyle = "#203e47";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(480, cy + 37, 12, 0, Math.PI);
    ctx.stroke();
    unicorn(
      { x: 430, y: cy, vx: 0, vy: 0, face: 1 },
      COLORS[0],
      time,
      "",
      g.profiles?.[0],
    );
    unicorn(
      { x: 530, y: cy, vx: 0, vy: 0, face: -1 },
      COLORS[6],
      time,
      "",
      g.profiles?.[1],
    );
    ctx.restore();
    return;
  }
  if (menu) {
    let a = {
        x: 590 + Math.sin(time * 0.21) * 30,
        y: 270 + Math.sin(time * 0.4) * 20,
        vx: 10,
        vy: 0,
        face: 1,
      },
      b = {
        x: 850 + Math.cos(time * 0.17) * 35,
        y: 440 + Math.cos(time * 0.3) * 25,
        vx: -10,
        vy: 0,
        face: -1,
      };
    tether(a, b, time, false);
    unicorn(a, COLORS[0], time, "", profile);
    unicorn(b, COLORS[6], time, "", { coat: 1, mane: 6, charm: 0 });
    markers(a, b);
    for (let i = 0; i < 5; i++) {
      let x = 610 + i * 58 + Math.sin(time * 0.4 + i) * 12,
        y = 150 + (i % 3) * 175;
      cloud(x, y, 18, "#66808b");
      ellipse(x, y, 9, 9, COLORS[i]);
      symbol(i, x, y, 12);
    }
    ctx.restore();
    return;
  }
  if (g.wave === 7 && !g.endless) {
    let done = g.targets.filter((p) => p.done === 1).length;
    actor(
      () => {
        cloud(0, 10, 95, done ? "#637c81" : "#3f535f");
        for (let i = 0; i < done; i++) {
          ctx.globalAlpha = 0.25;
          ellipse(-52 + i * 17, Math.sin(i) * 20, 27, 34, COLORS[i]);
        }
        ctx.globalAlpha = 1;
        ellipse(-25, -12, 4, 6, "#172c37");
        ellipse(26, -12, 4, 6, "#172c37");
        ctx.strokeStyle = "#1b313c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 5, 15, 0, Math.PI, g.status !== "won");
        ctx.stroke();
      },
      480,
      mapY(350),
    );
  }
  for (let h of g.hazards) {
    cloud(h.x, h.y, 28, "#071720");
    line(h.x - 9, h.y - 5, h.x - 3, h.y + 1, "#b1a2c1", 2);
    line(h.x - 3, h.y - 5, h.x - 9, h.y + 1, "#b1a2c1", 2);
    line(h.x + 6, h.y - 5, h.x + 12, h.y + 1, "#b1a2c1", 2);
    line(h.x + 12, h.y - 5, h.x + 6, h.y + 1, "#b1a2c1", 2);
  }
  for (let p of g.targets) {
    if (p.done || p.born > g.tick) continue;
    let age = (g.tick - p.born) / 60;
    ctx.globalAlpha = Math.min(1, age * 3 + 0.2);
    actor(
      () => {
        cloud(0, 0, 20, "#627880");
        ellipse(0, 0, 12, 12, COLORS[p.color]);
        symbol(p.color, 0, 0, 16);
        ctx.strokeStyle = COLORS[p.color];
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 27, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.charge);
        ctx.stroke();
        if (p.type === 3) text("↻", 0, -31, 12, "#bcc8ca");
        if (p.type !== 4 && p.life - (g.tick - p.born) < 240)
          text("!", 0, -30, 17, "#ffe28b");
      },
      p.x,
      p.y,
      portrait ? 1.5 : 1,
    );
  }
  ctx.globalAlpha = 1;
  let a = { ...g.players[0] },
    b = { ...g.players[1] };
  if (g.status === "play") endTime = 0;
  else {
    endTime ||= time;
    let t = Math.min(1, (time - endTime) / 1.5);
    a.y += t * t * 450;
    b.y += t * t * 450;
  }
  if (g.status !== "lost") tether(a, b, time, g.double > g.tick);
  unicorn(
    a,
    COLORS[0],
    time,
    g.profiles?.[0]?.name || (local === 0 ? "YOU" : "PARTNER"),
    g.profiles?.[0],
  );
  unicorn(
    b,
    COLORS[6],
    time,
    g.profiles?.[1]?.name || (local === 1 ? "YOU" : "PARTNER"),
    g.profiles?.[1],
  );
  if (g.status === "play") markers(a, b);
  for (let p of particles) {
    p.x += p.vx / 60;
    p.y += p.vy / 60;
    p.vy += 0.5;
    p.life -= 0.018;
    ctx.globalAlpha = Math.max(0, p.life);
    ellipse(p.x, mapY(p.y), 2, 2, p.color);
  }
  particles = particles.filter((p) => p.life > 0);
  ctx.globalAlpha = 1;
  if (g.combo > 1)
    text(
      "×" + g.combo + " FLOW",
      (a.x + b.x) / 2,
      (a.y + b.y) / 2 + 43,
      13,
      "#ffedc5",
    );
  if (g.damageUntil > g.tick) {
    ctx.strokeStyle = "#ff82784d";
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 100, 940, 480);
  }
  ctx.restore();
}
