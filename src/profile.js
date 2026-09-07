export const COATS = ["#fff4df", "#c8dce9", "#e5c7d9"];
export function cleanProfile(p = {}) {
  return {
    name:
      String(p?.name || "You")
        .replace(/[<>\x00-\x1f]/g, "")
        .trim()
        .slice(0, 12) || "You",
    coat: Math.abs(p?.coat | 0) % 3,
    mane: Math.abs(p?.mane | 0) % 7,
    charm: Math.abs(p?.charm | 0) % 3,
  };
}
