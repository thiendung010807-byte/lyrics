"use client";

import { useEffect, useRef, useState } from "react";
import { browserSupabase, hasSupabase } from "@/lib/supabase";
import { DEMO_CHANNEL, DEMO_STORAGE_KEY, initialState, readDemoState } from "@/lib/demo-state";
import type { LiveState } from "@/types/live";
import { useServerClock } from "./use-server-clock";

export type ConnectionState = "connecting" | "live" | "demo" | "offline";

function newer(previous: LiveState, incoming: LiveState) {
  return incoming.version >= previous.version ? incoming : previous;
}

export function useLiveState() {
  const [state, setState] = useState<LiveState>(initialState);
  const [positionMs, setPositionMs] = useState(0);
  const [connection, setConnection] = useState<ConnectionState>(hasSupabase ? "connecting" : "demo");
  const stateRef = useRef(state);
  const { serverNow, offset } = useServerClock();

  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    if (!browserSupabase) {
      // localStorage là nguồn trạng thái ngoài React trong chế độ demo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(readDemoState());
      const channel = new BroadcastChannel(DEMO_CHANNEL);
      const apply = (next: LiveState) => setState((old) => newer(old, next));
      channel.onmessage = (event) => apply(event.data as LiveState);
      const storage = (event: StorageEvent) => {
        if (event.key === DEMO_STORAGE_KEY && event.newValue) apply(JSON.parse(event.newValue));
      };
      window.addEventListener("storage", storage);
      return () => { channel.close(); window.removeEventListener("storage", storage); };
    }

    const supabase = browserSupabase;
    let active = true;
    void supabase.from("live_state").select("*").eq("id", 1).single<LiveState>().then(({ data }) => {
      if (active && data) setState((old) => newer(old, data));
    });

    const channel = supabase
      .channel("hoa-am-hoa-y-live")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_state", filter: "id=eq.1" }, (payload) => {
        setState((old) => newer(old, payload.new as LiveState));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnection("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("offline");
      });

    const recover = window.setInterval(async () => {
      const { data } = await supabase.from("live_state").select("*").eq("id", 1).single<LiveState>();
      if (data) setState((old) => newer(old, data));
    }, 10_000);

    return () => {
      active = false;
      window.clearInterval(recover);
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const live = stateRef.current;
      const now = serverNow();
      const position =
        live.status === "playing" && live.started_at_ms && now >= live.effective_at_ms
          ? live.position_ms + now - live.started_at_ms
          : live.position_ms;
      const bounded = live.duration_ms && live.duration_ms > 0 ? Math.min(position, live.duration_ms) : position;
      setPositionMs(Math.max(0, bounded));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [serverNow]);

  return { state, positionMs, connection, serverNow, clockOffset: offset };
}
