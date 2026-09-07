import {
  createGame,
  step,
  move,
  DT,
  COLORS,
  SYMBOLS,
  NAMES,
} from "./engine.js";
import { init, render, effects } from "./render.js";
import { unlock, sound, music } from "./audio.js";
import { Network } from "./network.js";
import { cleanProfile } from "./profile.js";
import { recordStats, submitRun } from "./wavedash.js";
import {
  buttons,
  showPanel,
  closePanel,
  customize,
  updateSound,
} from "./ui.js";
const $ = (id) => document.getElementById(id),
  canvas = $("game");
init(canvas);
let g = createGame(13),
  screen = "title",
  paused = false,
  local = 0,
  input = 0,
  keys = new Set(),
  touch = null,
  acc = 0,
  last = performance.now(),
  netClock = 0,
  toastUntil = 0,
  confirmed = null,
  confirmedAt = 0,
  shownEnd = false,
  countdown = 0,
  lesson = -1,
  lessonStart = 0;
let saved = {};
try {
  saved = JSON.parse(localStorage.getItem("both-ends") || "{}");
} catch {}
saved ||= {};
let profile = cleanProfile(saved.profile);
function save() {
  saved.high = Math.max(saved.high || 0, g.score);
  saved.combo = Math.max(saved.combo || 0, g.bestCombo);
  if (g.status === "won") saved.won = true;
  try {
    localStorage.setItem("both-ends", JSON.stringify(saved));
  } catch {}
}
function completeRunStats() {
  if (g.tutorial) return;
  saved.colors = (saved.colors || 0) + g.restored;
  saved.runs = (saved.runs || 0) + 1;
  saved.totalSpectrums = (saved.totalSpectrums || 0) + g.spectrums;
}
const net = new Network({
  profile: () => profile,
  status: (s) => ($("status").textContent = s),
  start: (seed, role) => {
    start(false, seed, role, true);
    countdown = performance.now() + 3000;
  },
  state: (state) => {
    if (screen !== "play" || local !== 1) return;
    let old = confirmed || g;
    if (state.tick < old.tick) return;
    let ev = [];
    if (state.wave === old.wave)
      state.targets.forEach((p, i) => {
        if (p.done === 1 && old.targets[i]?.done !== 1)
          ev.push({ type: "restore", x: p.x, y: p.y, color: p.color });
      });
    if (state.spectrums > old.spectrums) ev.push({ type: "double" });
    if (state.wave !== old.wave) ev.push({ type: "wave", wave: state.wave });
    if (state.status !== old.status) ev.push({ type: state.status });
    processEvents(ev);
    confirmed = state;
    confirmedAt = performance.now();
    let own = g.players[1],
      remote = g.players[0];
    g = { ...state, players: state.players.map((p) => ({ ...p })) };
    g.players[1] = { ...own };
    g.players[0].x = remote.x;
    g.players[0].y = remote.y;
  },
  disconnect: () => {
    if (screen === "play") {
      if (confirmed && local === 1) {
        g = { ...confirmed, players: confirmed.players.map((p) => ({ ...p })) };
      }
      confirmed = null;
      countdown = 0;
      paused = false;
      toast("PARTNER LEFT\nAI TAKES OVER", 5);
    }
  },
});
function title() {
  if ($("panel").open) closePanel();
  if (screen === "play") save();
  net.close();
  lesson = -1;
  $("lesson").hidden = true;
  screen = "title";
  paused = false;
  document.body.classList.remove("playing");
  $("menu").style.display = "";
  $("actions").className = "homeActions";
  $("menu").querySelector("h1").innerHTML =
    'AT BOTH<br><em>ENDS</em><span class="star">✦</span>';
  $("menu").querySelector(".tagline").innerHTML = "Two unicorns. One rainbow.";
  $("status").textContent = saved.high
    ? "PERSONAL BEST " + saved.high.toLocaleString()
    : "";
  $("toast").textContent = "";
  buttons([
    ["PLAY SOLO", () => start(), true],
    ["PLAY ONLINE", online],
    ...(saved.won ? [["ENDLESS", () => start(true)]] : []),
    [
      "YOUR UNICORN",
      () =>
        customize(profile, () => {
          profile = cleanProfile(profile);
          saved.profile = profile;
          save();
        }),
    ],
    ["HOW TO PLAY", () => start(false, Date.now() >>> 0, 0, false, true)],
  ]);
}
function online() {
  $("menu").querySelector("h1").textContent = "PLAY ONLINE";
  $("menu").querySelector(".tagline").textContent = "Play together.";
  $("actions").className = "";
  screen = "lobby";
  $("status").textContent = "Play together.";
  buttons([
    [
      "QUICK MATCH",
      () => {
        net.connect();
        lobbyButtons();
      },
      true,
    ],
    ["PRIVATE ROOM", privateRoom],
    ["BACK", title],
  ]);
}
function lobbyButtons() {
  if (net.room[0] === "p") {
    $("menu").querySelector("h1").textContent = net.room.slice(1);
    $("menu").querySelector(".tagline").textContent =
      "ROOM CODE · SHARE WITH A FRIEND";
  }
  buttons([
    ["PLAY SOLO", () => start(), true],
    [
      "BACK",
      () => {
        net.close();
        online();
      },
    ],
  ]);
}
function privateRoom() {
  net.close();
  buttons([
    [
      "CREATE",
      () => {
        let code = "";
        for (let i = 0; i < 4; i++)
          code += "ABCDEFGHJKLMNPQRSTUVWXYZ"[(Math.random() * 24) | 0];
        net.connect("p" + code, false);
        lobbyButtons();
      },
      true,
    ],
    [
      "JOIN",
      () => {
        let code = document.querySelector("#actions input").value.toUpperCase();
        if (!/^[A-Z]{4}$/.test(code)) {
          $("status").textContent = "Enter four letters.";
          return;
        }
        net.connect("p" + code, false);
        lobbyButtons();
      },
    ],
    ["BACK", online],
  ]);
  let field = document.createElement("input");
  field.maxLength = 4;
  field.placeholder = "ABCD";
  field.setAttribute("aria-label", "Four-letter room code");
  $("actions").insertBefore(field, $("actions").children[1]);
  $("status").textContent = "Create or join a room.";
}
function start(
  endless = false,
  seed = Date.now() >>> 0,
  role = 0,
  connected = false,
  training = !saved.learned && !endless && !connected,
) {
  if ($("panel").open) closePanel();
  if (!connected) net.close();
  unlock();
  g = createGame(seed, endless);
  music(g, true, true);
  local = role;
  g.profiles = [
    { name: "Nimbus", coat: 1, mane: 6, charm: 0 },
    { name: "Nimbus", coat: 1, mane: 6, charm: 0 },
  ];
  g.profiles[local] = { ...profile };
  if (connected) g.profiles[1 - local] = net.remoteProfile;
  screen = "play";
  paused = false;
  confirmed = null;
  shownEnd = false;
  countdown = 0;
  acc = 0;
  input = 0;
  keys.clear();
  document.body.classList.add("playing");
  $("menu").style.display = "none";
  $("pause").disabled = connected;
  lesson = -1;
  $("lesson").hidden = true;
  if (training) {
    g.tutorial = true;
    g.targets = [];
    lessonStart = g.players[0].x;
    setLesson(0);
  } else toast("", 0);
}
function setLesson(stage) {
  lesson = stage;
  $("lesson").hidden = false;
  const copy = [
    ["Move your end", "WASD / arrows · touch & drag"],
    ["Red needs red", "Hold the red section on the red core."],
    ["Now find blue", "Rotate the rainbow. Match blue to blue."],
    ["Restore all three", "Seven colors unlock Double Rainbow."],
  ][stage];
  $("lessonStep").textContent = stage + 1 + " / 4";
  $("lessonTitle").textContent = copy[0];
  $("lessonText").textContent = copy[1];
  if (stage) {
    g.targets = [];
    for (let color of stage === 1 ? [0] : stage === 2 ? [4] : [1, 3, 6]) {
      let a = g.players[0],
        b = g.players[1],
        t = (color + 0.5) / 7;
      g.targets.push({
        id: g.targets.length,
        color,
        baseColor: color,
        type: 0,
        x: 0,
        y: 0,
        x0: a.x + (b.x - a.x) * t,
        y0: Math.max(
          180,
          Math.min(490, a.y + (b.y - a.y) * t + (stage === 2 ? 40 : -45)),
        ),
        phase: 0,
        speed: 0,
        born: g.tick,
        life: 1e9,
        charge: 0,
        done: 0,
      });
    }
  }
}
function endLesson() {
  saved.learned = true;
  save();
  start(false, Date.now() >>> 0, 0, false, false);
}
$("skipLesson").onclick = endLesson;
function toast(message, seconds = 2.5) {
  $("toast").textContent = message;
  toastUntil = performance.now() + seconds * 1000;
}
function processEvents(events) {
  effects(events);
  for (let e of events) {
    sound(e);
    if (e.type === "double") toast("DOUBLE RAINBOW", 3);
    if (e.type === "perfect") toast("PERFECT SPECTRUM", 3);
    if (e.type === "harmony") toast("HARMONY!", 1.2);
    if (e.type === "wave")
      toast(
        e.wave === 7 && !g.endless ? "THE GREY" : NAMES[e.wave % 7] + " SKY",
        2,
      );
    if (e.type === "clear") toast("WAVE CLEAR", 1.4);
  }
}
function togglePause() {
  if (screen !== "play" || net.peer || g.status !== "play") return;
  if (paused) {
    closePanel();
    return;
  }
  paused = true;
  music(g, false);
  input = 0;
  keys.clear();
  touch = null;
  net.update(0);
  showPanel(
    "Paused",
    "<p>WASD / arrows · touch & drag</p>",
    [
      ["RESUME", closePanel, true],
      ["RESTART", () => start(g.endless)],
      ["TITLE", title],
    ],
    () => {
      paused = false;
      input = 0;
      keys.clear();
    },
  );
  updateSound();
}
$("pause").onclick = togglePause;
updateSound();
const bits = {
  ArrowLeft: 1,
  KeyA: 1,
  ArrowRight: 2,
  KeyD: 2,
  ArrowUp: 4,
  KeyW: 4,
  ArrowDown: 8,
  KeyS: 8,
};
addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if ($("panel").open) {
    if (e.code === "Escape" || e.code === "KeyP") {
      e.preventDefault();
      closePanel();
    } else if (e.code === "KeyM")
      $("panel").querySelector("[data-sound]")?.click();
    return;
  }
  if (bits[e.code]) {
    e.preventDefault();
    keys.add(e.code);
    readInput();
  }
  if (e.repeat) return;
  if (e.code === "KeyM") $("mute").click();
  if (e.code === "KeyP" || e.code === "Escape") togglePause();
  if (
    (e.code === "Enter" || e.code === "Space") &&
    (e.target === document.body || (g.status === "lost" && screen === "play"))
  ) {
    e.preventDefault();
    if (g.status === "lost" && screen === "play") start(g.endless);
    else if (screen === "title") start();
  }
});
addEventListener("keyup", (e) => {
  keys.delete(e.code);
  readInput();
});
function readInput() {
  input = 0;
  for (let key of keys) input |= bits[key] || 0;
  if (touch) input |= touch.mask;
  net.update(input);
}
canvas.addEventListener("pointerdown", (e) => {
  if (screen !== "play" || paused) return;
  unlock();
  if (g.status === "lost") {
    start(g.endless);
    return;
  }
  if (touch) return;
  touch = { id: e.pointerId, x: e.clientX, y: e.clientY, mask: 0 };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!touch || touch.id !== e.pointerId) return;
  let x = e.clientX - touch.x,
    y = e.clientY - touch.y;
  touch.mask = (x < -12 ? 1 : x > 12 ? 2 : 0) | (y < -12 ? 4 : y > 12 ? 8 : 0);
  readInput();
});
function release(e) {
  if (touch?.id === e.pointerId) {
    touch = null;
    readInput();
  }
}
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
addEventListener("blur", () => {
  keys.clear();
  touch = null;
  readInput();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) music(null, false);
  keys.clear();
  touch = null;
  readInput();
  if (document.hidden && screen === "play") {
    if (net.peer) net.fallback();
    if (!paused && g.status === "play") togglePause();
  }
});
$("spectrum").innerHTML = COLORS.map(
  (color, i) =>
    `<span style="color:${color}" title="${NAMES[i]}">${SYMBOLS[i]}</span>`,
).join("");
function hud() {
  let count = g.targets.filter((p) => p.done === 1).length;
  $("chapter").textContent = g.endless
    ? "CHASE THE RAINBOW"
    : g.wave === 7
      ? "FINAL CHAPTER"
      : `CHAPTER ${String(g.wave + 1).padStart(2, "0")} / 07`;
  $("objective").textContent = g.tutorial
    ? "PRACTICE"
    : g.wave === 7 && !g.endless
      ? "THE GREY"
      : NAMES[g.wave % 7] + " SKY";
  $("score").textContent = String(g.score).padStart(6, "0");
  $("healthText").textContent = Math.ceil(g.health);
  $("healthBar").style.width = g.health + "%";
  $("progress").textContent = g.tutorial
    ? "TRAINING"
    : count + " / " + g.targets.length + " RESTORED";
  $("spectrumCount").textContent =
    g.spectrum.toString(2).replaceAll("0", "").length + " / 7";
  [...$("spectrum").children].forEach((e, i) =>
    e.classList.toggle("lit", !!(g.spectrum & (1 << i))),
  );
  $("pause").disabled = !!net.peer;
}
function finish() {
  if (shownEnd) return;
  shownEnd = true;
  completeRunStats();
  save();
  recordStats({
    score: saved.high,
    combo: saved.combo,
    colors: saved.colors || 0,
    runs: saved.runs || 0,
    spectrums: saved.totalSpectrums || 0,
  });
  submitRun(g);
  net.state(g);
  net.close();
  $("lesson").hidden = true;
  lesson = -1;
  toast("", 0);
  setTimeout(() => {
    if (g.status === "play" || screen !== "play") return;
    screen = "ending";
    document.body.classList.remove("playing");
    showPanel(
      g.status === "won" ? "The sky is yours." : "Rainbow lost.",
      `<div class="resultsStats"><div><strong>${g.score.toLocaleString()}</strong><small>SCORE</small></div><div><strong>${g.spectrums}</strong><small>SPECTRUMS</small></div><div><strong>${Math.floor(g.tick / 3600)}:${String(Math.floor(g.tick / 60) % 60).padStart(2, "0")}</strong><small>TIME</small></div></div>`,
      [
        ...(g.status === "won"
          ? [["CHASE THE RAINBOW", () => start(true), true]]
          : []),
        ["PLAY AGAIN", () => start(g.endless), g.status !== "won"],
        ["TITLE", title],
      ],
      title,
      "results",
    );
  }, 1600);
}
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  let waiting = countdown > now;
  if (screen === "play" && !paused && g.status === "play" && !waiting) {
    while (acc >= DT) {
      if (net.peer && local === 1) {
        move(g.players[1], input, g.players[0]);
        if (confirmed) {
          for (let i = 0; i < 2; i++) {
            let p = g.players[i],
              a = confirmed.players[i],
              k = i === 1 ? 0.055 : 0.22,
              age = i === 1 ? Math.min(0.12, (now - confirmedAt) / 1000) : 0;
            p.x += (a.x + a.vx * age - p.x) * k;
            p.y += (a.y + a.vy * age - p.y) * k;
          }
        }
      } else {
        step(
          g,
          local === 0
            ? [
                input,
                net.peer ? net.input : lesson >= 0 && lesson < 2 ? 0 : null,
              ]
            : [null, input],
        );
        if (
          lesson === 0 &&
          Math.hypot(g.players[0].x - lessonStart, g.players[0].y - 330) > 45
        )
          setLesson(1);
        else if (lesson > 0 && g.targets.every((p) => p.done)) {
          if (lesson === 3) endLesson();
          else setLesson(lesson + 1);
        }
        processEvents(g.events);
      }
      acc -= DT;
    }
    netClock += dt;
    if (netClock > 1 / 15) {
      netClock = 0;
      net.state(g);
    }
  } else acc = 0;
  music(screen === "play" ? g : null, !paused && !document.hidden);
  if (waiting) {
    $("toast").textContent =
      "UNICORN FOUND!\n" + Math.ceil((countdown - now) / 1000);
    toastUntil = countdown + 300;
  } else if (now > toastUntil) $("toast").textContent = "";
  render(
    g,
    now / 1000,
    screen === "title" || screen === "lobby",
    local,
    profile,
  );
  if (screen === "play") {
    hud();
    if (g.status !== "play") finish();
  }
}
title();
requestAnimationFrame(frame);
if (typeof __DEV__ === "undefined")
  globalThis.__game = {
    state: () => g,
    network: net,
    start,
    local: () => local,
  };
