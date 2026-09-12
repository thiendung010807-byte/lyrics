"use client";

import { useEffect, useState } from "react";
import { parseLyricsTxt } from "@/lib/parse-lyrics";
import type { LyricLine, Song } from "@/types/live";

type LyricsResult = { source: string; lyrics: LyricLine[]; error: string };

export function useSongLyrics(song: Song | undefined) {
  const [result, setResult] = useState<LyricsResult>({ source: "", lyrics: [], error: "" });
  const source = song?.lyricsSrc ?? "";

  useEffect(() => {
    if (!source) return;
    let active = true;
    void fetch(source, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const lyrics = parseLyricsTxt(await response.text());
        if (!lyrics.length) throw new Error("Không tìm thấy timestamp hợp lệ");
        if (active) setResult({ source, lyrics, error: "" });
      })
      .catch(() => {
        if (active) setResult({ source, lyrics: [], error: "Không đọc được lyrics.txt" });
      });
    return () => { active = false; };
  }, [source]);

  return {
    lyrics: result.source === source ? result.lyrics : [],
    error: result.source === source ? result.error : "",
    loading: Boolean(source && result.source !== source)
  };
}
