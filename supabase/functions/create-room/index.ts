import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, handleCors } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(len = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CHARS[b % CHARS.length]).join("");
}

async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateCode();
    const { data } = await supabaseAdmin
      .from("rooms")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("Failed to generate a unique room code after 20 attempts");
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const preflight = handleCors(req);
  if (preflight) return preflight;

  // Only allow POST
  if (req.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405);
  }

  // Validate JWT and get calling user
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

  // Parse and validate body
  let body: { maxPlayers?: number; type?: string };
  try {
    body = await req.json();
  } catch {
    return corsResponse({ error: "Invalid JSON body" }, 400);
  }

  const maxPlayers = body.maxPlayers ?? 4;
  const roomType = body.type ?? "public";

  if (![2, 3, 4].includes(maxPlayers)) {
    return corsResponse({ error: "maxPlayers must be 2, 3, or 4" }, 400);
  }
  if (!["private", "public"].includes(roomType)) {
    return corsResponse({ error: "type must be 'private' or 'public'" }, 400);
  }

  try {
    const code = await uniqueCode();

    // Insert room
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .insert({
        code,
        host_id: userId,
        max_players: maxPlayers,
        type: roomType,
        status: "waiting",
      })
      .select("id")
      .single();

    if (roomError || !room) {
      console.error("Room insert error:", roomError);
      return corsResponse({ error: "Failed to create room" }, 500);
    }

    const roomId = room.id;

    // Insert host into room_players
    const { error: playerError } = await supabaseAdmin
      .from("room_players")
      .insert({
        room_id: roomId,
        user_id: userId,
        seat_order: 1,
        is_ready: false,
      });

    if (playerError) {
      // Roll back room if player insert fails
      await supabaseAdmin.from("rooms").delete().eq("id", roomId);
      console.error("Room player insert error:", playerError);
      return corsResponse({ error: "Failed to add host to room" }, 500);
    }

    return corsResponse({ roomId, code }, 201);
  } catch (err) {
    console.error("create-room error:", err);
    return corsResponse({ error: "Internal server error" }, 500);
  }
});
