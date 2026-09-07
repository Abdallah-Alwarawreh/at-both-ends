import { createGame, setupWave, updateTargets } from "./engine.js";
import { cleanProfile } from "./profile.js";
const fields = [
  "seed",
  "tick",
  "wave",
  "waveTick",
  "health",
  "score",
  "combo",
  "bestCombo",
  "lastHit",
  "lastColor",
  "spectrum",
  "perfect",
  "spectrums",
  "double",
  "restored",
  "status",
  "endless",
  "nextWave",
  "damageUntil",
  "profiles",
];
export function pack(g) {
  return [
    fields.map((k) => g[k]),
    g.players.map((p) =>
      [p.x, p.y, p.vx, p.vy, p.face].map((x) => Math.round(x * 10) / 10),
    ),
    g.targets.map((p) => [
      p.done,
      Math.round(p.charge * 100),
      Math.round(p.x * 10) / 10,
      Math.round(p.y * 10) / 10,
      p.color,
    ]),
  ];
}
export function unpack(packet) {
  let g = createGame(packet[0][0], packet[0][16]);
  fields.forEach((k, i) => (g[k] = packet[0][i]));
  let saved = { ...g };
  g.tick = g.waveTick;
  setupWave(g);
  Object.assign(g, saved, { targets: g.targets, hazards: g.hazards });
  g.players = packet[1].map((p) => ({
    x: p[0],
    y: p[1],
    vx: p[2],
    vy: p[3],
    face: p[4],
  }));
  updateTargets(g);
  packet[2].forEach((p, i) =>
    Object.assign(g.targets[i], {
      done: p[0],
      charge: p[1] / 100,
      x: p[2],
      y: p[3],
      color: p[4],
    }),
  );
  g.events = [];
  return g;
}
// Native relay adapter: @id, +id, -id system messages and @id|payload addressing.
export class Network {
  constructor(callbacks) {
    this.cb = callbacks;
    this.role = -1;
    this.peer = "";
    this.id = "";
    this.socket = null;
    this.input = 0;
    this.timer = setInterval(() => this.poll(), 150);
  }
  connect(room = "q0", quick = true) {
    this.close();
    this.room = room;
    this.quick = quick;
    this.cb.status("CONNECTING…");
    let base =
      typeof __RELAY_URL__ !== "undefined"
        ? __RELAY_URL__
        : `ws://${location.host}/relay`;
    try {
      this.socket = new WebSocket(base.replace(/\/$/, "") + "/" + room);
      this.socket.onmessage = (e) => this.receive(e.data);
      this.socket.onclose = () => this.fallback();
      this.socket.onerror = () => this.cb.status("Offline. Solo is ready.");
      this.opened = performance.now();
    } catch {
      this.cb.status("Offline. Solo is ready.");
    }
  }
  send(type, payload, peer = this.peer) {
    if (this.socket?.readyState === 1 && peer)
      this.socket.send(
        "@" + peer + "|" + JSON.stringify([type, this.session, payload]),
      );
  }
  receive(raw) {
    if (typeof raw !== "string") return;
    let prefix = raw[0],
      id = raw.slice(1);
    if (prefix === "@") {
      this.id = id;
      this.cb.status("FINDING A PARTNER…");
      return;
    }
    if (prefix === "+") {
      if (this.peer) this.send("F", null, id);
      else this.send("O", this.id, id);
      return;
    }
    if (prefix === "-") {
      if (id === this.peer) this.fallback();
      return;
    }
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(msg)) return;
    let [type, session, data] = msg;
    if (type === "O" && !this.peer) {
      this.peer = data;
      this.role = 1;
      this.session = session;
      this.last = performance.now();
      this.send("J", [this.id, this.cb.profile?.()]);
      return;
    }
    if (type === "J" && !this.peer) {
      this.peer = data[0];
      this.remoteProfile = cleanProfile(data[1]);
      this.role = 0;
      this.session = Math.random().toString(36).slice(2, 8);
      this.last = performance.now();
      let seed = Date.now() >>> 0;
      this.send("S", [seed, this.cb.profile?.()]);
      this.cb.start(seed, 0);
      return;
    }
    if (type === "F" && !this.peer) {
      let n = +this.room.slice(1) + 1;
      if (this.quick && n < 8) this.connect("q" + n, true);
      else {
        this.close();
        this.cb.status("Room full. Try another.");
      }
      return;
    }
    if (type === "S" && this.role === 1) {
      this.session = session;
      this.last = performance.now();
      this.remoteProfile = cleanProfile(data[1]);
      this.cb.start(data[0], 1);
      this.send("A", 0);
      return;
    }
    if (session !== this.session || !this.peer) return;
    this.last = performance.now();
    if (type === "I") this.input = data & 15;
    if (type === "G" && this.role === 1) {
      try {
        this.cb.state(unpack(data));
      } catch {
        this.fallback();
      }
    }
    if (type === "B") this.fallback();
  }
  poll() {
    if (!this.socket) return;
    let now = performance.now();
    if (this.peer) {
      if (now - this.last > 1300) {
        this.fallback();
        return;
      }
      this.send("I", this.localInput || 0);
    } else if (now - this.opened > 8000)
      this.cb.status("WAITING · SOLO IS READY");
  }
  update(mask) {
    this.localInput = mask;
    if (this.peer) this.send("I", mask);
  }
  state(g) {
    if (this.role === 0 && this.peer) this.send("G", pack(g));
  }
  fallback() {
    let active = this.role >= 0 && this.peer;
    this.close();
    if (active) this.cb.disconnect();
    else this.cb.status("Offline. Solo is ready.");
  }
  close() {
    if (this.socket) {
      this.send("B", 0);
      this.socket.onclose = null;
      this.socket.close();
    }
    this.socket = null;
    this.peer = "";
    this.role = -1;
    this.input = 0;
    this.localInput = 0;
  }
}
