import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsResponse, handleCors } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

// Safe squares on the common path (absolute square indices 0-51 on shared track)
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Each color's start index on the shared 52-square track
const START_INDICES: Record<string, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

/**
 * Convert a player's relative step (0-56) to an absolute square on the
 * shared 52-square outer track. Steps 0-50 map to the outer ring;
 * steps 51-56 are the home column (not shared, treated as safe).
 */
function relativeToAbsolute(step: number, color: string): number | null {
  if (step < 0 || step >= 51) return null; // not on shared track
  const start = START_INDICES[color] ?? 0;
  return (start + step) % 52;
}

type PlayerState = {
  userId: string;
  color: string;
  tokens: number[];
  consecutiveTimeouts: number;
  isAway: boolean;
  finished: boolean;
};

type GameState = {
  players: PlayerState[];
  currentTurn: string;
  lastRoll: number | null;
  consecutiveSixes: number;
  turnDeadline: string;
  status: string;
  winnerOrder: string[];
};

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

  let body: { gameId?: string; tokenIndex?: number };
  try {
    body = await req.json();
  } catch {
    return corsResponse({ error: "Invalid JSON body" }, 400);
  }

  const { gameId, tokenIndex } = body;
  if (!gameId) return corsResponse({ error: "gameId is required" }, 400);
  if (tokenIndex === undefined || tokenIndex < 0 || tokenIndex > 3) {
    return corsResponse({ error: "tokenIndex must be 0, 1, 2, or 3" }, 400);
  }

  try {
    // Load game
    const { data: gameRows, error: gameError } = await supabaseAdmin
      .from("games")
      .select("id, state, status, room_id")
      .eq("id", gameId)
      .limit(1);

    if (gameError || !gameRows || gameRows.length === 0) {
      return corsResponse({ error: "Game not found" }, 404);
    }

    const game = gameRows[0];
    const state = game.state as GameState;

    if (game.status !== "active") {
      return corsResponse({ error: `Game is ${game.status}` }, 409);
    }
    if (state.currentTurn !== userId) {
      return corsResponse({ error: "It is not your turn" }, 403);
    }
    if (state.lastRoll === null) {
      return corsResponse({ error: "You must roll before moving" }, 409);
    }

    const roll = state.lastRoll;

    // Find current player
    const playerIdx = state.players.findIndex((p) => p.userId === userId);
    if (playerIdx === -1) {
      return corsResponse({ error: "Player not found in game" }, 404);
    }

    const player = state.players[playerIdx];
    const token = player.tokens[tokenIndex];

    // Validate the move
    let newStep: number;
    const fromStep = token;

    if (token === -1) {
      if (roll !== 6) {
        return corsResponse(
          { error: "Need a 6 to enter the board" },
          400,
        );
      }
      newStep = 0; // enter at player's start
    } else if (token >= 0 && token < 57) {
      newStep = token + roll;
      if (newStep > 57) {
        return corsResponse(
          { error: "Overshoot: need exact roll to reach home" },
          400,
        );
      }
    } else {
      return corsResponse({ error: "Token is already home" }, 400);
    }

    // Check captures (only on shared track: steps 0–50)
    const capturedUsers: string[] = [];
    const newAbsPos = relativeToAbsolute(newStep, player.color);
    const isSafe = newAbsPos !== null && SAFE_SQUARES.has(newAbsPos);

    const newPlayers = state.players.map((p, pIdx): PlayerState => {
      if (pIdx === playerIdx) {
        // Update this player's token
        const newTokens = [...p.tokens];
        newTokens[tokenIndex] = newStep;
        return { ...p, tokens: newTokens };
      }
      // Check if any other player's token is on the same absolute square
      if (!isSafe && newAbsPos !== null) {
        const theirNewTokens = p.tokens.map((t) => {
          const absPos = relativeToAbsolute(t, p.color);
          if (absPos === newAbsPos) {
            capturedUsers.push(p.userId);
            return -1; // send back to base
          }
          return t;
        });
        return { ...p, tokens: theirNewTokens };
      }
      return p;
    });

    // Check if current player won (all tokens at step 57)
    const updatedPlayer = newPlayers[playerIdx];
    const playerWon = updatedPlayer.tokens.every((t) => t === 57);
    let newWinnerOrder = [...state.winnerOrder];
    if (playerWon && !newWinnerOrder.includes(userId)) {
      newWinnerOrder.push(userId);
      newPlayers[playerIdx] = { ...newPlayers[playerIdx], finished: true };
    }

    // Determine next turn
    // If roll was 6 AND player hasn't finished AND not forfeit: same player goes again
    // Otherwise: next non-finished player in seat_order
    const activePlayers = newPlayers.filter((p) => !p.finished);
    let nextTurn: string;

    if (roll === 6 && !playerWon && activePlayers.length > 1) {
      nextTurn = userId; // same player rolls again on 6
    } else {
      // Advance to next active player in original order
      const currentIdx = newPlayers.findIndex((p) => p.userId === userId);
      let nextIdx = (currentIdx + 1) % newPlayers.length;
      let safety = 0;
      while (newPlayers[nextIdx].finished && safety < newPlayers.length) {
        nextIdx = (nextIdx + 1) % newPlayers.length;
        safety++;
      }
      nextTurn = newPlayers[nextIdx].userId;
    }

    // Check if game is fully finished (all players done or only 1 unfinished)
    const unfinishedPlayers = newPlayers.filter((p) => !p.finished);
    let newGameStatus = game.status as string;
    if (unfinishedPlayers.length <= 1) {
      newGameStatus = "finished";
      // Add last player to winnerOrder if not already there
      if (unfinishedPlayers.length === 1) {
        const lastPlayer = unfinishedPlayers[0];
        if (!newWinnerOrder.includes(lastPlayer.userId)) {
          newWinnerOrder.push(lastPlayer.userId);
        }
      }
    }

    const newDeadline = new Date(Date.now() + 20_000).toISOString();
    const newState: GameState = {
      ...state,
      players: newPlayers,
      currentTurn: nextTurn,
      lastRoll: null,
      consecutiveSixes: roll === 6 ? state.consecutiveSixes : 0,
      turnDeadline: newDeadline,
      winnerOrder: newWinnerOrder,
      status: newGameStatus,
    };

    // Persist game update
    const { error: updateError } = await supabaseAdmin
      .from("games")
      .update({
        state: newState,
        status: newGameStatus,
        turn_deadline: newDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (updateError) {
      console.error("Game update error:", updateError);
      return corsResponse({ error: "Failed to update game" }, 500);
    }

    // Record move
    await supabaseAdmin.from("game_moves").insert({
      game_id: gameId,
      user_id: userId,
      move_type: capturedUsers.length > 0 ? "capture" : "move",
      roll_value: roll,
      token_index: tokenIndex,
      from_step: fromStep,
      to_step: newStep,
      captures: capturedUsers,
      state_snapshot: newState,
    });

    // If game finished: update profile stats
    if (newGameStatus === "finished") {
      // Increment games_played for all players in the room
      const { data: roomPlayers } = await supabaseAdmin
        .from("room_players")
        .select("user_id")
        .eq("room_id", game.room_id);

      if (roomPlayers) {
        for (const rp of roomPlayers) {
          await supabaseAdmin.rpc("", {});
          // Increment games_played
          await supabaseAdmin
            .from("profiles")
            .update({
              games_played: supabaseAdmin.rpc("increment_games_played", {
                profile_id: rp.user_id,
              }) as unknown as number,
            })
            .eq("id", rp.user_id);
        }

        // Increment wins for the first place winner
        if (newWinnerOrder.length > 0) {
          const winnerId = newWinnerOrder[0];
          await supabaseAdmin
            .from("profiles")
            .update({ wins: supabaseAdmin.rpc("increment_wins", {
              profile_id: winnerId,
            }) as unknown as number })
            .eq("id", winnerId);
        }
      }

      // Simpler approach using raw SQL increments
      if (roomPlayers) {
        for (const rp of roomPlayers) {
          await supabaseAdmin.rpc("increment_profile_stat", {
            p_user_id: rp.user_id,
            p_field: "games_played",
          });
        }
        if (newWinnerOrder.length > 0) {
          await supabaseAdmin.rpc("increment_profile_stat", {
            p_user_id: newWinnerOrder[0],
            p_field: "wins",
          });
        }
      }
    }

    return corsResponse({
      state: newState,
      nextTurn,
      captures: capturedUsers,
      winnerOrder: newWinnerOrder,
    });
  } catch (err) {
    console.error("move-token error:", err);
    return corsResponse({ error: "Internal server error" }, 500);
  }
});
