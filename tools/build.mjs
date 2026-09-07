import { build, transform } from "esbuild";
import { minify } from "terser";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import { Packer } from "roadroller";
const bundled = await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2020",
  define: {
    __RELAY_URL__: JSON.stringify(process.env.RELAY_URL || ""),
    __DEV__: "false",
  },
});
const js = (
  await minify(bundled.outputFiles[0].text, {
    compress: { passes: 3 },
    mangle: true,
    format: { comments: false },
  })
).code;
const css = (
  await transform(await readFile("src/style.css", "utf8"), {
    loader: "css",
    minify: true,
  })
).code;
const html = (await readFile("index.html", "utf8"))
  .replace(
    /<link\s+rel="stylesheet"\s+href="\/src\/style.css"\s*\/?>/,
    () => `<style>${css}</style>`,
  )
  .replace(
    /<script\s+type="module"\s+src="\/src\/main.js"\s*>\s*<\/script>/,
    () => `<script>${js}</script>`,
  )
  .replace(/>\s+</g, "><");
const markup = html.replace("<script>" + js + "</script>", "");
const packer = new Packer(
  [
    {
      data: "document.write(" + JSON.stringify(markup) + ");" + js,
      type: "js",
      action: "eval",
    },
  ],
  { maxMemoryMB: 48 },
);
await packer.optimize(Number(process.env.OPTIMIZE) || 1);
const { firstLine, secondLine } = packer.makeDecoder();
const packed =
  '<!doctype html><meta charset="utf-8"><script>' +
  firstLine +
  secondLine +
  "</script>";
const output =
  deflateRawSync(Buffer.from(packed), { level: 9 }).length <
  deflateRawSync(Buffer.from(html), { level: 9 }).length
    ? packed
    : html;
const data = Buffer.from(output),
  compressed = deflateRawSync(data, { level: 9 }),
  name = Buffer.from("index.html");
let crc = 0xffffffff;
for (let b of data) {
  crc ^= b;
  for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
}
crc = (crc ^ 0xffffffff) >>> 0;
let local = Buffer.alloc(30),
  central = Buffer.alloc(46),
  end = Buffer.alloc(22);
local.writeUInt32LE(0x04034b50);
local.writeUInt16LE(20, 4);
local.writeUInt16LE(8, 8);
local.writeUInt32LE(crc, 14);
local.writeUInt32LE(compressed.length, 18);
local.writeUInt32LE(data.length, 22);
local.writeUInt16LE(name.length, 26);
central.writeUInt32LE(0x02014b50);
central.writeUInt16LE(20, 4);
central.writeUInt16LE(20, 6);
central.writeUInt16LE(8, 10);
central.writeUInt32LE(crc, 16);
central.writeUInt32LE(compressed.length, 20);
central.writeUInt32LE(data.length, 24);
central.writeUInt16LE(name.length, 28);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(1, 8);
end.writeUInt16LE(1, 10);
end.writeUInt32LE(central.length + name.length, 12);
end.writeUInt32LE(local.length + name.length + compressed.length, 16);
const zip = Buffer.concat([local, name, compressed, central, name, end]);
await mkdir("dist", { recursive: true });
await writeFile("dist/index.html", output);
await writeFile("dist/at-both-ends.zip", zip);
console.log(
  `HTML ${data.length} bytes | ZIP ${zip.length} / 13,312 bytes | headroom ${13312 - zip.length} bytes`,
);
if (zip.length > 13312) process.exitCode = 1;
