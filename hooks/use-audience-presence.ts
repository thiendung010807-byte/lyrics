"use client";

import { useEffect, useState } from "react";
import { browserSupabase } from "@/lib/supabase";

export function useAudiencePresence(joinAudience = false) {
  const [count, setCount] = useState(browserSupabase ? 0 : 1);

  useEffect(() => {
    const supabase = browserSupabase;
    if (!supabase) return;
    const channel = supabase.channel("hoa-am-hoa-y-audience", {
      config: { presence: { key: crypto.randomUUID() } }
    });

    const recount = () => {
      const total = Object.values(channel.presenceState()).reduce((sum, entries) => sum + entries.length, 0);
      setCount(total);
    };

    channel.on("presence", { event: "sync" }, recount).subscribe(async (status) => {
      if (status === "SUBSCRIBED" && joinAudience) {
        await channel.track({ role: "viewer", joinedAt: new Date().toISOString() });
      }
    });

    return () => { void supabase.removeChannel(channel); };
  }, [joinAudience]);

  return count;
}
