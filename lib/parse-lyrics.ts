import type { LyricLine } from "@/types/live";

const plainTimestamp = /^(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?$/;
const lrcTimestamp = /^\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/;

function toSeconds(minutes: string, seconds: string, fraction = "0") {
  return Number(minutes) * 60 + Number(seconds) + Number(fraction) / 10 ** fraction.length;
}

export function parseLyricsTxt(source: string): LyricLine[] {
  const rows = source.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
  const result: LyricLine[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index].trim();
    if (!row) continue;

    const inline = row.match(lrcTimestamp);
    if (inline) {
      const text = inline[4].trim();
      if (text) result.push({ time: toSeconds(inline[1], inline[2], inline[3]), text });
      continue;
    }

    const standalone = row.match(plainTimestamp);
    if (!standalone) continue;
    let lyricIndex = index + 1;
    while (lyricIndex < rows.length && !rows[lyricIndex].trim()) lyricIndex += 1;
    const text = rows[lyricIndex]?.trim();
    if (text && !plainTimestamp.test(text) && !lrcTimestamp.test(text)) {
      result.push({ time: toSeconds(standalone[1], standalone[2], standalone[3]), text });
      index = lyricIndex;
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export function parseFullLyricsTxt(source: string): LyricLine[] {
  const timedLyrics = parseLyricsTxt(source);
  if (timedLyrics.length) return timedLyrics;

  return source
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((text, index) => ({ time: index, text: text.trim() }))
    .filter((line) => line.text && !line.text.startsWith("#"));
}
