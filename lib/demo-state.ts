import type { LiveState } from "@/types/live";

export const DEMO_STORAGE_KEY = "hoa-am-hoa-y-live-state";
export const DEMO_CHANNEL = "hoa-am-hoa-y-live";

export const initialState: LiveState = {
  id: 1,
  song_id: null,
  status: "idle",
  position_ms: 0,
  started_at_ms: null,
  effective_at_ms: 0,
  duration_ms: null,
  version: 0
};

export function readDemoState(): LiveState {
  if (typeof window === "undefined") return initialState;
  try {
    return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "null") || initialState;
  } catch {
    return initialState;
  }
}

export function writeDemoState(state: LiveState) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  const channel = new BroadcastChannel(DEMO_CHANNEL);
  channel.postMessage(state);
  channel.close();
}
