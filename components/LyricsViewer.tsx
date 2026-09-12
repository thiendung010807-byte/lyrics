"use client";

import { useEffect, useMemo, useRef } from "react";
import { getSong } from "@/data/songs";
import { useLiveState } from "@/hooks/use-live-state";
import { useAudiencePresence } from "@/hooks/use-audience-presence";
import { useSongLyrics } from "@/hooks/use-song-lyrics";

function formatTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function LyricsViewer() {
  const currentLineRef = useRef<HTMLParagraphElement>(null);
  const { state, positionMs, connection } = useLiveState();
  useAudiencePresence(true);
  const song = getSong(state.song_id);
  const { lyrics, error: lyricsError, loading: lyricsLoading } = useSongLyrics(song);

  const activeIndex = useMemo(() => {
    if (!song || !lyrics.length) return -1;
    let found = -1;
    for (let index = 0; index < lyrics.length; index += 1) {
      if (lyrics[index].time * 1000 <= positionMs) found = index;
      else break;
    }
    return found;
  }, [lyrics, positionMs, song]);

  useEffect(() => {
    const current = currentLineRef.current;
    if (!current) return;
    const frame = window.requestAnimationFrame(() => {
      current.scrollIntoView({ behavior: activeIndex <= 0 ? "auto" : "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, song?.id]);

  return (
    <main className="lyrics-page">
      <div className="lyrics-layout">
        <header className="lyrics-note">♪</header>
        <section className="lyrics-stage" aria-live="polite">
          {!song || state.status === "idle" ? (
            <div className="simple-waiting"><p>ĐANG CHỜ BÀI HÁT...</p><span>Hãy giữ trang này mở</span></div>
          ) : lyricsLoading ? (
            <p className="simple-message">ĐANG TẢI LỜI BÀI HÁT...</p>
          ) : lyricsError ? (
            <p className="simple-message">{lyricsError.toLocaleUpperCase("vi")}</p>
          ) : (
            <>
              <h1 className="simple-song-title">{song.title}</h1>
              <div className="spotify-lyrics">
                {lyrics.map((line, index) => {
                  const distance = Math.abs(index - activeIndex);
                  const isCurrent = index === activeIndex;
                  return (
                    <p ref={isCurrent ? currentLineRef : undefined} aria-current={isCurrent ? "true" : undefined} key={`${line.time}-${index}`} className={`spotify-line ${isCurrent ? "current" : ""} distance-${Math.min(distance, 3)}`}>
                      <span className="line-arrow">{isCurrent ? "→" : ""}</span>
                      <span>{line.text}</span>
                    </p>
                  );
                })}
              </div>
            </>
          )}
        </section>
        <footer className="lyrics-footer">
          <span>HÒA ÂM HỎA Ý</span>
          <small>{formatTime(positionMs)} · {connection === "live" ? "LIVE" : connection === "demo" ? "DEMO" : "..."}</small>
        </footer>
      </div>
    </main>
  );
}
