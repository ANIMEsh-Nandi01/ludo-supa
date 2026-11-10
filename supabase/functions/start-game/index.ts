import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, handleCors } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const COLORS = ["red", "green", "yellow", "blue"] as const;
type Color = typeof COLORS[number];

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

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return corsResponse({ error: "Unauthorized" }, 401);
  }

  const userId = user.id;

  let body: { roomId?: string };
  try {
    body = await req.json();
  } catch {
    return corsResponse({ error: "Invalid JSON body" }, 400);
  }

  const { roomId } = body;
  if (!roomId) {
    return corsResponse({ error: "roomId is required" }, 400);
  }

  try {
    // Load room and verify caller is host
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, host_id, status, max_players")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return corsResponse({ error: "Room not found" }, 404);
    }
    if (room.host_id !== userId) {
      return corsResponse({ error: "Only the host can start the game" }, 403);
    }
    if (room.status !== "waiting") {
      return corsResponse({ error: `Room is already ${room.status}` }, 409);
    }

    // Load room players sorted by seat_order
    const { data: players, error: playersError } = await supabaseAdmin
      .from("room_players")
      .select("user_id, seat_order, color, is_ready")
      .eq("room_id", roomId)
      .order("seat_order", { ascending: true });

    if (playersError || !players) {
      return corsResponse({ error: "Failed to load players" }, 500);
    }

    // Check at least 2 ready players
    const readyPlayers = players.filter((p) => p.is_ready);
    if (readyPlayers.length < 2) {
      return corsResponse(
        { error: "Need at least 2 ready players to start" },
        400,
      );
    }

    // Assign colors by seat_order if not already set
    const assignedPlayers = players.map((p, idx) => ({
      ...p,
      color: (p.color ?? COLORS[idx % COLORS.length]) as Color,
    }));

    // Update colors in room_players
    for (const p of assignedPlayers) {
      await supabaseAdmin
        .from("room_players")
        .update({ color: p.color })
        .eq("room_id", roomId)
        .eq("user_id", p.user_id);
    }

    // Build initial GameState
    const turnDeadline = new Date(Date.now() + 20_000).toISOString();

    const gameState = {
      players: assignedPlayers.map((p) => ({
        userId: p.user_id,
        color: p.color,
        tokens: [-1, -1, -1, -1] as [number, number, number, number],
        consecutiveTimeouts: 0,
        isAway: false,
        finished: false,
      })),
      currentTurn: assignedPlayers[0].user_id, // red player goes first
      lastRoll: null,
      consecutiveSixes: 0,
      turnDeadline,
      status: "active",
      winnerOrder: [] as string[],
    };

    // Insert game row
    const { data: game, error: gameError } = await supabaseAdmin
      .from("games")
      .insert({
        room_id: roomId,
        state: gameState,
        status: "active",
        consecutive_sixes: 0,
        turn_deadline: turnDeadline,
      })
      .select("id")
      .single();

    if (gameError || !game) {
      console.error("Game insert error:", gameError);
      return corsResponse({ error: "Failed to create game" }, 500);
    }

    // Update room status to playing
    const { error: roomUpdateError } = await supabaseAdmin
      .from("rooms")
      .update({ status: "playing" })
      .eq("id", roomId);

    if (roomUpdateError) {
      console.error("Room update error:", roomUpdateError);
      // Don't fail the whole request — game is created
    }

    return corsResponse({ gameId: game.id }, 201);
  } catch (err) {
    console.error("start-game error:", err);
    return corsResponse({ error: "Internal server error" }, 500);
  }
});
