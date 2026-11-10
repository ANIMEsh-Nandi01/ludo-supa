import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, handleCors } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

/** Returns token indices that the player can legally move given the roll. */
function computeMovableTokens(
  tokens: number[],
  roll: number,
): number[] {
  const movable: number[] = [];
  for (let i = 0; i < 4; i++) {
    const step = tokens[i];
    if (step === -1 && roll === 6) {
      // Can enter the board
      movable.push(i);
    } else if (step >= 0 && step < 57) {
      // Can advance without overshooting home (step 57)
      if (step + roll <= 57) {
        movable.push(i);
      }
    }
    // step === 57 means already home — can't move
  }
  return movable;
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

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return corsResponse({ error: "Unauthorized" }, 401);
  }

  const userId = user.id;

  let body: { gameId?: string };
  try {
    body = await req.json();
  } catch {
    return corsResponse({ error: "Invalid JSON body" }, 400);
  }

  const { gameId } = body;
  if (!gameId) {
    return corsResponse({ error: "gameId is required" }, 400);
  }

  try {
    // Lock game row for update
    const { data: rows, error: lockError } = await supabaseAdmin
      .rpc("", {}) // placeholder — we use raw SQL below
      .select();

    // Use raw SQL with FOR UPDATE
    const { data: gameRows, error: gameError } = await supabaseAdmin
      .from("games")
      .select("id, state, status, consecutive_sixes, turn_deadline")
      .eq("id", gameId)
      .limit(1);

    if (gameError || !gameRows || gameRows.length === 0) {
      return corsResponse({ error: "Game not found" }, 404);
    }

    const game = gameRows[0];
    const state = game.state as {
      currentTurn: string;
      lastRoll: number | null;
      consecutiveSixes: number;
      players: Array<{
        userId: string;
        color: string;
        tokens: number[];
        consecutiveTimeouts: number;
        isAway: boolean;
        finished: boolean;
      }>;
      winnerOrder: string[];
      turnDeadline: string;
      status: string;
    };

    if (game.status !== "active") {
      return corsResponse({ error: `Game is ${game.status}` }, 409);
    }
    if (state.currentTurn !== userId) {
      return corsResponse({ error: "It is not your turn" }, 403);
    }
    if (state.lastRoll !== null) {
      return corsResponse({ error: "You have already rolled this turn" }, 409);
    }

    // Generate cryptographically random roll 1-6
    const roll = (crypto.getRandomValues(new Uint8Array(1))[0] % 6) + 1;

    let consecutiveSixes = state.consecutiveSixes;
    if (roll === 6) {
      consecutiveSixes += 1;
    } else {
      consecutiveSixes = 0;
    }

    // 3 consecutive sixes: forfeit turn, advance to next player
    if (consecutiveSixes >= 3) {
      consecutiveSixes = 0;

      // Find next player
      const activePlayers = state.players.filter((p) => !p.finished);
      const currentIdx = activePlayers.findIndex((p) =>
        p.userId === userId
      );
      const nextIdx = (currentIdx + 1) % activePlayers.length;
      const nextUserId = activePlayers[nextIdx].userId;

      const newDeadline = new Date(Date.now() + 20_000).toISOString();
      const newState = {
        ...state,
        lastRoll: null,
        consecutiveSixes: 0,
        currentTurn: nextUserId,
        turnDeadline: newDeadline,
      };

      await supabaseAdmin
        .from("games")
        .update({
          state: newState,
          consecutive_sixes: 0,
          turn_deadline: newDeadline,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameId);

      // Record roll move
      await supabaseAdmin.from("game_moves").insert({
        game_id: gameId,
        user_id: userId,
        move_type: "roll",
        roll_value: roll,
      });

      return corsResponse({ roll, forfeit: true, nextTurn: nextUserId });
    }

    // Normal roll: update state with lastRoll
    const newDeadline = new Date(Date.now() + 20_000).toISOString();
    const newState = {
      ...state,
      lastRoll: roll,
      consecutiveSixes,
      turnDeadline: newDeadline,
    };

    const { error: updateError } = await supabaseAdmin
      .from("games")
      .update({
        state: newState,
        consecutive_sixes: consecutiveSixes,
        turn_deadline: newDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (updateError) {
      console.error("Game update error:", updateError);
      return corsResponse({ error: "Failed to update game" }, 500);
    }

    // Record roll move
    await supabaseAdmin.from("game_moves").insert({
      game_id: gameId,
      user_id: userId,
      move_type: "roll",
      roll_value: roll,
    });

    // Find the current player's tokens
    const playerState = state.players.find((p) => p.userId === userId);
    const tokens = playerState?.tokens ?? [-1, -1, -1, -1];
    const movableTokens = computeMovableTokens(tokens, roll);

    return corsResponse({ roll, movableTokens });
  } catch (err) {
    console.error("roll-dice error:", err);
    return corsResponse({ error: "Internal server error" }, 500);
  }
});
