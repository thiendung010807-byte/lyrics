import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const songsDirectory = path.join(root, "public", "songs");
const outputFile = path.join(root, "data", "generated-songs.ts");

function normalizeKey(value) {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .replaceAll("đ", "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function titleFromFolder(folder) {
  const text = folder.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.charAt(0).toLocaleUpperCase("vi") + text.slice(1) : folder;
}

function parseInfo(content) {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.search(/[:=]/);
    if (separator < 0) continue;

    const key = normalizeKey(line.slice(0, separator));
    const value = line.slice(separator + 1).trim();
    if (!value) continue;

    if (["ten bai hat", "ten bai", "title", "song"].includes(key)) values.title = value;
    if (["nguoi sang tac", "sang tac", "composer", "artist", "tac gia"].includes(key)) values.composer = value;
    if (["thu tu", "order", "stt"].includes(key)) values.order = Number.parseFloat(value);
    if (["phan loai", "loai", "type", "kind"].includes(key)) {
      const kind = normalizeKey(value);
      values.kind = ["dan", "nhac cu", "instrument", "instrumental"].includes(kind) ? "instrument" : "music";
    }
  }

  return values;
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

const entries = await readdir(songsDirectory, { withFileTypes: true });
const folders = entries.filter((entry) => entry.isDirectory());
const songs = [];

for (const folder of folders) {
  const directory = path.join(songsDirectory, folder.name);
  const infoPath = path.join(directory, "info.txt");
  let info = {};

  if (await exists(infoPath)) {
    info = parseInfo(await readFile(infoPath, "utf8"));
  } else {
    console.warn(`[songs] ${folder.name}: thiếu info.txt, đang dùng tên folder.`);
  }

  const kind = info.kind ?? "music";
  const requiredFiles = kind === "instrument" ? ["lyrics.txt"] : ["audio.mp3", "lyrics.txt"];
  for (const requiredFile of requiredFiles) {
    if (!(await exists(path.join(directory, requiredFile)))) {
      console.warn(`[songs] ${folder.name}: thiếu ${requiredFile}.`);
    }
  }

  songs.push({
    id: folder.name,
    title: info.title ?? titleFromFolder(folder.name),
    composer: info.composer ?? "Đang cập nhật",
    kind,
    order: Number.isFinite(info.order) ? info.order : null,
    audioSrc: kind === "instrument" ? null : `/songs/${encodeURIComponent(folder.name)}/audio.mp3`,
    lyricsSrc: `/songs/${encodeURIComponent(folder.name)}/lyrics.txt`
  });
}

songs.sort((a, b) => {
  if (a.order !== null || b.order !== null) return (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
  return a.title.localeCompare(b.title, "vi");
});

const publicSongs = songs.map((song) => ({
  id: song.id,
  title: song.title,
  composer: song.composer,
  kind: song.kind,
  audioSrc: song.audioSrc,
  lyricsSrc: song.lyricsSrc
}));
const source = `// Tự động tạo bởi scripts/generate-song-catalog.mjs. Không sửa trực tiếp.\nimport type { Song } from "@/types/live";\n\nexport const generatedSongs: Song[] = ${JSON.stringify(publicSongs, null, 2)};\n`;

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, source, "utf8");
console.log(`[songs] Đã nhận diện ${songs.length} bài hát từ ${folders.length} folder.`);
