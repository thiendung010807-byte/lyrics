import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { ControlAction, LiveState } from "@/types/live";

type ControlBody = {
  action: ControlAction;
  songId?: string | null;
  positionMs?: number;
  durationMs?: number | null;
};

const allowedActions = new Set<ControlAction>(["play", "pause", "seek", "stop", "select"]);

export async function POST(request: NextRequest) {
  const controlKey = process.env.ADMIN_CONTROL_KEY;
  if (!controlKey || request.headers.get("x-admin-key") !== controlKey) {
    return NextResponse.json({ error: "Sai mã điều khiển" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase chưa được cấu hình" }, { status: 503 });
  }

  let body: ControlBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  if (!allowedActions.has(body.action)) {
    return NextResponse.json({ error: "Lệnh không hợp lệ" }, { status: 400 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: current, error: readError } = await supabase
    .from("live_state")
    .select("*")
    .eq("id", 1)
    .single<LiveState>();

  if (readError || !current) {
    return NextResponse.json({ error: "Không đọc được trạng thái live" }, { status: 500 });
  }

  const now = Date.now();
  const leadMs = body.action === "stop" || body.action === "select" ? 300 : 1200;
  const effectiveAt = now + leadMs;
  const position = Math.max(0, Math.round(body.positionMs ?? current.position_ms));
  const songId = body.songId === undefined ? current.song_id : body.songId;
  const durationMs = body.action === "select"
    ? null
    : typeof body.durationMs === "number" && Number.isFinite(body.durationMs) && body.durationMs > 0
      ? Math.round(body.durationMs)
      : current.duration_ms;

  const next: Omit<LiveState, "updated_at"> = {
    id: 1,
    song_id: songId,
    status:
      body.action === "play" || body.action === "seek"
        ? "playing"
        : body.action === "pause" || body.action === "select"
          ? "paused"
          : "idle",
    position_ms: body.action === "stop" || body.action === "select" ? 0 : position,
    started_at_ms: body.action === "play" || body.action === "seek" ? effectiveAt : null,
    effective_at_ms: effectiveAt,
    duration_ms: durationMs,
    version: current.version + 1
  };

  const { data, error } = await supabase
    .from("live_state")
    .update(next)
    .eq("id", 1)
    .eq("version", current.version)
    .select("*")
    .single<LiveState>();

  if (error || !data) {
    return NextResponse.json({ error: "Trạng thái vừa thay đổi, hãy thử lại" }, { status: 409 });
  }

  return NextResponse.json({ state: data, serverTime: Date.now() });
}
