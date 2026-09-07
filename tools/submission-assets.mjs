// Mechanical export only: preserve generated artwork, enforce submission PNG limits.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_PATH || "sharp");
await mkdir("submission", { recursive: true });
for (const [input, name, width, height, limit] of [
  [process.argv[2], "thumbnail", 320, 320, 64000],
  [process.argv[3], "cover", 800, 500, 256000],
]) {
  if (!input) throw new Error("Pass generated thumbnail and cover paths.");
  const output = `submission/${name}.png`;
  const info = await sharp(input)
    .resize(width, height, { fit: "cover" })
    .png({ palette: true, colours: 256, dither: 0, compressionLevel: 9 })
    .toFile(output);
  if (info.width !== width || info.height !== height || info.size > limit)
    throw new Error(
      `${output} does not meet submission limits: ${JSON.stringify(info)}`,
    );
  console.log(
    `${output}: ${info.width} x ${info.height}, ${info.size} bytes (limit ${limit})`,
  );
}
