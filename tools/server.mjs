import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { WebSocketServer } from "ws";
const root = resolve("."),
  rooms = new Map();
let id = 0;
const server = http.createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split("?")[0]);
  if (path === "/") path = "/index.html";
  let file = resolve(root, "." + path);
  if (!file.startsWith(root + "\\") && !file.startsWith(root + "/")) {
    res.writeHead(403).end();
    return;
  }
  try {
    let data = await readFile(file);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".json": "application/json",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});
const wss = new WebSocketServer({ server, maxPayload: 32768 });
wss.on("connection", (ws, req) => {
  let room = rooms.get(req.url);
  if (!room) {
    room = new Map();
    rooms.set(req.url, room);
  }
  let key = String(++id);
  ws.send("@" + key);
  for (let other of room.values()) other.send("+" + key);
  room.set(key, ws);
  ws.on("message", (data) => {
    let text = data.toString();
    if (text[0] === "@") {
      let sep = text.indexOf("|"),
        target = room.get(text.slice(1, sep));
      if (target?.readyState === 1) target.send(text.slice(sep + 1));
    } else
      for (let [pid, other] of room)
        if (pid !== key && other.readyState === 1) other.send(text);
  });
  ws.on("close", () => {
    room.delete(key);
    for (let other of room.values())
      if (other.readyState === 1) other.send("-" + key);
    if (!room.size) rooms.delete(req.url);
  });
});
server.listen(Number(process.env.PORT) || 5173, "0.0.0.0", () =>
  console.log("At Both Ends: http://localhost:" + (process.env.PORT || 5173)),
);
