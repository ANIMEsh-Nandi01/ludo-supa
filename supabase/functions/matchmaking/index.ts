import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, handleCors } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const randomBytes = new Uint8Array(6);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < 6; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return corsResponse({ error: "Missing Authorization header" }, 401);
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return corsResponse({ error: "Unauthorized" }, 401);
  }

  let body: { action?: "join" | "leave"; playerCount?: number; voiceOn?: boolean };
  try {
    body = await req.json();
  } catch {
    body = { action: "join", playerCount: 2 };
  }

  const action = body.action || "join";
  const playerCount = Math.min(4, Math.max(2, Number(body.playerCount) || 2));
  const voiceOn = body.voiceOn !== false;

  if (action === "leave") {
    await supabaseAdmin.from("matchmaking_queue").delete().eq("user_id", user.id);
    return corsResponse({ left: true });
  }

  try {
    // 1. Upsert user into queue
    await supabaseAdmin.from("matchmaking_queue").upsert({
      user_id: user.id,
      player_count: playerCount,
      voice_on: voiceOn,
      joined_at: new Date().toISOString(),
    });

    // 2. Query blocks to avoid pairing blocked players
    const { data: blocks } = await supabaseAdmin
      .from("blocks")
      .select("blocked_user_id")
      .eq("user_id", user.id);
    const blockedIds = new Set((blocks || []).map((b: any) => b.blocked_user_id));

    // 3. Look for waiting players with same player_count
    const { data: queueItems } = await supabaseAdmin
      .from("matchmaking_queue")
      .select("user_id, joined_at")
      .eq("player_count", playerCount)
      .order("joined_at", { ascending: true });

    const eligible = (queueItems || []).filter((q: any) => !blockedIds.has(q.user_id));

    if (eligible.length >= playerCount) {
      // Pick top N players
      const matched = eligible.slice(0, playerCount);
      const matchedIds = matched.map((m: any) => m.user_id);

      // Generate room code
      let code = generateCode();
      const colors = ["red", "green", "yellow", "blue"];

      // Create room
      const { data: room, error: roomErr } = await supabaseAdmin
        .from("rooms")
        .insert({
          code,
          host_id: matchedIds[0],
          max_players: playerCount,
          type: "public",
          status: "lobby",
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // Add all players to room_players
      const roomPlayersPayload = matchedIds.map((uid: string, idx: number) => ({
        room_id: room.id,
        user_id: uid,
        color: colors[idx],
        seat_order: idx + 1,
        is_ready: true, // auto-ready for quick play
      }));

      await supabaseAdmin.from("room_players").insert(roomPlayersPayload);

      // Remove from queue
      await supabaseAdmin.from("matchmaking_queue").delete().in("user_id", matchedIds);

      return corsResponse({
        matched: true,
        roomId: room.id,
        code: room.code,
      });
    }

    return corsResponse({
      matched: false,
      waiting: true,
      queueSize: eligible.length,
      targetCount: playerCount,
    });
  } catch (err: any) {
    return corsResponse({ error: err.message }, 500);
  }
});

