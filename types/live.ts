export type PlaybackStatus = "idle" | "playing" | "paused";

export type LiveState = {
  id: number;
  song_id: string | null;
  status: PlaybackStatus;
  position_ms: number;
  started_at_ms: number | null;
  effective_at_ms: number;
  duration_ms: number | null;
  version: number;
  updated_at?: string;
};

export type LyricLine = { time: number; text: string };

export type Song = {
  id: string;
  title: string;
  composer: string;
  audioSrc: string;
  lyricsSrc: string;
};

export type ControlAction = "play" | "pause" | "seek" | "stop" | "select";
