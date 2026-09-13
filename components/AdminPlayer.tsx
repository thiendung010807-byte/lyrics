"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, KeyRound, Music2, Pause, Play, RotateCcw, Search, Square } from "lucide-react";
import { songs, getSong } from "@/data/songs";
import { hasSupabase } from "@/lib/supabase";
import { writeDemoState } from "@/lib/demo-state";
import { useLiveState } from "@/hooks/use-live-state";
import { useAudiencePresence } from "@/hooks/use-audience-presence";
import type { ControlAction, LiveState } from "@/types/live";

function formatTime(ms: number) {
  const value = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

export function AdminPlayer() {
  const { state, positionMs, connection, serverNow, clockOffset } = useLiveState();
  const audienceCount = useAudiencePresence(false);
  const [adminKey, setAdminKey] = useState("");
  const [keyReady, setKeyReady] = useState(!hasSupabase);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [draftPosition, setDraftPosition] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const timers = useRef<number[]>([]);
  const selected = getSong(state.song_id) ?? songs[0];
  const shownPosition = draftPosition ?? positionMs;
  const maxDuration = durationMs > 0 ? durationMs : 5 * 60 * 1000;

  useEffect(() => {
    const stored = sessionStorage.getItem("hoa-am-admin-key");
    if (stored) {
      // Khôi phục khóa từ phiên trình duyệt hiện tại sau lần render đầu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdminKey(stored);
      setKeyReady(true);
    }
    const scheduledTimers = timers.current;
    return () => scheduledTimers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    if (selected.audioSrc) {
      audio.src = selected.audioSrc;
      audio.load();
    } else {
      audio.removeAttribute("src");
      audio.load();
    }
    setDurationMs(0);
  }, [selected.audioSrc]);

  const createDemoState = (action: ControlAction, songId?: string | null, requestedPosition?: number, requestedDuration?: number | null): LiveState => {
    const now = serverNow();
    const lead = action === "stop" || action === "select" ? 300 : 1200;
    const effective = now + lead;
    const position = Math.max(0, Math.round(requestedPosition ?? state.position_ms));
    return {
      id: 1,
      song_id: songId === undefined ? state.song_id : songId,
      status: action === "play" || action === "seek" ? "playing" : action === "pause" || action === "select" ? "paused" : "idle",
      position_ms: action === "stop" || action === "select" ? 0 : position,
      started_at_ms: action === "play" || action === "seek" ? effective : null,
      effective_at_ms: effective,
      duration_ms: action === "select" ? null : requestedDuration ?? state.duration_ms ?? null,
      version: state.version + 1
    };
  };

  async function sendControl(action: ControlAction, songId?: string | null, requestedPosition?: number, requestedDuration?: number | null) {
    setBusy(true);
    setMessage("");
    try {
      if (!hasSupabase) {
        const next = createDemoState(action, songId, requestedPosition, requestedDuration);
        writeDemoState(next);
        return next;
      }
      const response = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ action, songId, positionMs: requestedPosition, durationMs: requestedDuration })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không gửi được lệnh");
      return result.state as LiveState;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Có lỗi xảy ra");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function runAt(effectiveAt: number, callback: () => void) {
    const timer = window.setTimeout(callback, Math.max(0, effectiveAt - serverNow()));
    timers.current.push(timer);
  }

  async function handlePlay() {
    if (selected.kind === "instrument") return;
    const audio = audioRef.current;
    const requested = Math.min(shownPosition, maxDuration);
    const knownDuration = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : durationMs || null;
    if (audio) {
      audio.currentTime = requested / 1000;
      audio.muted = true;
      try { await audio.play(); } catch { setMessage("Chưa tìm thấy/không phát được MP3; timeline lyric vẫn có thể chạy."); }
    }
    const next = await sendControl("play", selected.id, requested, knownDuration);
    if (next && audio) runAt(next.effective_at_ms, () => {
      audio.currentTime = next.position_ms / 1000;
      audio.muted = false;
      void audio.play().catch(() => setMessage("Trình duyệt đã chặn phát nhạc. Hãy bấm Play lại."));
    });
  }

  async function handlePause() {
    const requested = audioRef.current && !audioRef.current.paused ? audioRef.current.currentTime * 1000 : positionMs;
    const next = await sendControl("pause", selected.id, requested, durationMs || null);
    if (next) runAt(next.effective_at_ms, () => audioRef.current?.pause());
  }

  async function handleStop() {
    const next = await sendControl("stop", selected.id, 0, durationMs || null);
    if (next) runAt(next.effective_at_ms, () => {
      if (!audioRef.current) return;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    });
  }

  async function selectSong(id: string) {
    audioRef.current?.pause();
    setDraftPosition(null);
    await sendControl("select", id, 0, null);
  }

  async function commitSeek(position: number) {
    if (selected.kind === "instrument") return;
    const audio = audioRef.current;
    if (audio) audio.currentTime = position / 1000;
    const action: ControlAction = state.status === "playing" ? "seek" : "pause";
    const next = await sendControl(action, selected.id, position, durationMs || null);
    setDraftPosition(null);
    if (next && action === "seek" && audio) runAt(next.effective_at_ms, () => {
      audio.currentTime = next.position_ms / 1000;
      audio.muted = false;
      void audio.play().catch(() => setMessage("Hãy bấm Play để cấp quyền phát âm thanh."));
    });
  }

  const selectedIndex = songs.findIndex((song) => song.id === selected.id);
  const neighbour = (direction: -1 | 1) => songs[(selectedIndex + direction + songs.length) % songs.length].id;
  const syncLabel = useMemo(() => Math.abs(clockOffset) < 100 ? "Đồng hồ đã đồng bộ" : `Hiệu chỉnh ${Math.round(clockOffset)} ms`, [clockOffset]);
  const filteredSongs = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("vi");
    return keyword ? songs.filter((song) => `${song.title} ${song.composer} ${song.kind === "instrument" ? "đàn" : "nhạc"}`.toLocaleLowerCase("vi").includes(keyword)) : songs;
  }, [query]);

  if (!keyReady) {
    return (
      <main className="admin-page"><section className="key-box">
        <KeyRound size={20} />
        <p className="micro-label">KHU VỰC BAN TỔ CHỨC</p>
        <h1>Nhập mã điều khiển</h1>
        <form onSubmit={(event) => { event.preventDefault(); sessionStorage.setItem("hoa-am-admin-key", adminKey); setKeyReady(true); }}>
          <input className="key-input" type="password" value={adminKey} onChange={(event) => setAdminKey(event.target.value)} placeholder="Mã ADMIN_CONTROL_KEY" required />
          <button className="enter-button" type="submit">Mở bàn điều khiển</button>
        </form>
      </section></main>
    );
  }

  return (
    <main className="admin-page"><div className="admin-console">
      <header className="console-header"><Music2 size={19} /><span>ĐIỀU KHIỂN ÂM NHẠC</span><span className={`connection-light ${connection}`} /></header>
      <section className="song-browser">
        <label className="search-row"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm bài hát" /></label>
        <div className="simple-song-list">
          {filteredSongs.map((song) => (
            <button key={song.id} className={`simple-song ${song.id === selected.id ? "active" : ""}`} onClick={() => void selectSong(song.id)} disabled={busy}>
              <span>{song.id === selected.id ? "▶" : "▷"}</span><span>{song.title} <small>· {song.kind === "instrument" ? "ĐÀN" : "NHẠC"}</small></span>
            </button>
          ))}
          {!filteredSongs.length && <p className="no-result">Không tìm thấy bài hát.</p>}
        </div>
      </section>

      <section className="simple-player">
          <div className="now-playing-label">NOW PLAYING</div>
          <div className="simple-now-title">{selected.title}</div>
          <div className="simple-now-artist">Sáng tác: {selected.composer}</div>
          {selected.kind === "music" ? <div className="seek-wrap">
              <input className="seek" aria-label="Vị trí bài hát" type="range" min={0} max={maxDuration} step={100} value={Math.min(shownPosition, maxDuration)} onChange={(event) => setDraftPosition(Number(event.target.value))} onPointerUp={(event) => void commitSeek(Number(event.currentTarget.value))} />
              <div className="seek-labels"><span>{formatTime(shownPosition)}</span><span>{formatTime(maxDuration)}</span></div>
            </div> : <p className="instrument-notice">BÀI ĐÀN · HIỆN TOÀN BỘ LỜI · KHÔNG PHÁT MP3</p>}
          <div className="simple-controls">
              <button className="icon-button" aria-label="Bài trước" onClick={() => void selectSong(neighbour(-1))} disabled={busy}><ChevronLeft /></button>
              {selected.kind === "music" && (state.status === "playing" ?
                <button className="play-button" aria-label="Tạm dừng" onClick={() => void handlePause()} disabled={busy}><Pause size={19} fill="currentColor" /></button> :
                <button className="play-button" aria-label="Phát" onClick={() => void handlePlay()} disabled={busy}><Play size={19} fill="currentColor" /></button>)}
              <button className="icon-button" aria-label="Bài tiếp" onClick={() => void selectSong(neighbour(1))} disabled={busy}><ChevronRight /></button>
              <button className="icon-button subtle" aria-label="Dừng" onClick={() => void handleStop()} disabled={busy}><Square size={14} /></button>
              {selected.kind === "music" && <button className="icon-button subtle" aria-label="Về đầu" onClick={() => void commitSeek(0)} disabled={busy}><RotateCcw size={14} /></button>}
          </div>
            {message && <p className="admin-message">{message}</p>}
          <div className="console-status"><span>● {connection === "demo" ? "DEMO" : connection === "live" ? "LIVE" : "CONNECTING"}</span><span>{audienceCount} NGƯỜI XEM</span><span>{syncLabel.toLocaleUpperCase("vi")}</span></div>
          <audio ref={audioRef} preload="auto" onLoadedMetadata={(event) => setDurationMs(event.currentTarget.duration * 1000)} onEnded={() => void handleStop()} />
      </section>
    </div></main>
  );
}
