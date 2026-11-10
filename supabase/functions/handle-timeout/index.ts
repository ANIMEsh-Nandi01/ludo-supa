import { corsResponse, handleCors } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";

interface TokenState {
  userId: string;
  color: string;
  tokens: [number, number, number, number];
}

interface GameState {
  players: TokenState[];
  currentTurn: string;
  lastRoll: number | null;
  consecutiveSixes: number;
  turnDeadline: string;
  status: string;
  winnerOrder: string[];
  consecutiveTimeouts?: Record<string, number>;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    // Find all games with timeout_pending status
    const { data: games, error: fetchErr } = await supabaseAdmin
      .from("games")
      .select("*")
      .eq("status", "timeout_pending");

    if (fetchErr) {
      return corsResponse({ error: fetchErr.message }, 500);
    }

    const processedGames = [];

    for (const game of games || []) {
      const state = game.state as GameState;
      const currentTurnUserId = state.currentTurn;

      // Track consecutive timeouts for this player
      const timeouts = state.consecutiveTimeouts || {};
      timeouts[currentTurnUserId] = (timeouts[currentTurnUserId] || 0) + 1;
      state.consecutiveTimeouts = timeouts;

      // Find player's tokens
      const playerIdx = state.players.findIndex((p) => p.userId === currentTurnUserId);
      const player = state.players[playerIdx];

      // If last_roll is null, generate a random roll for them
      let roll = game.last_roll;
      if (roll === null) {
        const rand = crypto.getRandomValues(new Uint8Array(1))[0];
        roll = (rand % 6) + 1;
      }

      // Auto-move: pick highest step token that can move
      let chosenTokenIdx: number | null = null;
      if (player) {
        let bestStep = -2;
        for (let i = 0; i < 4; i++) {
          const step = player.tokens[i];
          if (step === -1 && roll === 6) {
            if (step > bestStep) {
              bestStep = step;
              chosenTokenIdx = i;
            }
          } else if (step >= 0 && step < 57 && step + roll <= 57) {
            if (step > bestStep) {
              bestStep = step;
              chosenTokenIdx = i;
            }
          }
        }

        // Apply auto-move if any token is eligible
        if (chosenTokenIdx !== null) {
          const currentStep = player.tokens[chosenTokenIdx];
          const newStep = currentStep === -1 ? 0 : currentStep + roll;
          player.tokens[chosenTokenIdx] = newStep;

          // Log move
          await supabaseAdmin.from("game_moves").insert({
            game_id: game.id,
            user_id: currentTurnUserId,
            roll,
            token_idx: chosenTokenIdx,
            from_pos: currentStep,
            to_pos: newStep,
          });
        }
      }

      // Determine next turn
      const nextPlayerIdx = (playerIdx + 1) % state.players.length;
      state.currentTurn = state.players[nextPlayerIdx].userId;
      state.lastRoll = null;
      state.consecutiveSixes = 0;
      state.turnDeadline = new Date(Date.now() + 20_000).toISOString();
      state.status = "active";

      // Update game row
      await supabaseAdmin
        .from("games")
        .update({
          state,
          last_roll: null,
          consecutive_sixes: 0,
          turn_deadline: state.turnDeadline,
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", game.id);

      processedGames.push({ gameId: game.id, nextTurn: state.currentTurn });
    }

    return corsResponse({ processed: processedGames.length, games: processedGames });
  } catch (err: any) {
    return corsResponse({ error: err.message }, 500);
  }
});

