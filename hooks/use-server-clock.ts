"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Sample = { offset: number; rtt: number };

export function useServerClock() {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);

  const sync = useCallback(async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, async (): Promise<Sample> => {
        const sent = Date.now();
        const response = await fetch(`/api/time?t=${sent}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Clock sync failed");
        const { serverTime } = (await response.json()) as { serverTime: number };
        const received = Date.now();
        return { rtt: received - sent, offset: serverTime - (sent + received) / 2 };
      })
    );
    const good = attempts
      .filter((item): item is PromiseFulfilledResult<Sample> => item.status === "fulfilled")
      .map((item) => item.value)
      .sort((a, b) => a.rtt - b.rtt);
    if (good[0]) {
      offsetRef.current = good[0].offset;
      setOffset(good[0].offset);
    }
  }, []);

  useEffect(() => {
    // Đồng bộ với nguồn thời gian ngoài React ngay khi kết nối.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, [sync]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);
  return { offset, serverNow, sync };
}
