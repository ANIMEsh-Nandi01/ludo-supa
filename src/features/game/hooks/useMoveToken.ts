import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { getAbsoluteTrackIndex, isSafeSquare } from '../utils/ludoPath';
import toast from 'react-hot-toast';

interface UseMoveTokenReturn {
  moveToken: (tokenIndex: number) => Promise<void>;
  isMoving: boolean;
}

export function useMoveToken(gameId: string): UseMoveTokenReturn {
  const [isMoving, setIsMoving] = useState(false);
  const { setMovableTokens, setSelectedToken } = useGameStore();

  const moveToken = useCallback(
    async (tokenIndex: number) => {
      if (isMoving || !gameId) return;

      setIsMoving(true);

      try {
        let edgeSuccess = false;

        // 1. Try Edge Function if deployed
        try {
          const { error } = await supabase.functions.invoke('move-token', {
            body: { gameId, tokenIndex },
          });

          if (!error) {
            edgeSuccess = true;
          }
        } catch {
          // Edge function failed, fallback
        }

        // 2. Direct DB Fallback if Edge Function not deployed
        if (!edgeSuccess) {
          const { data: gameRow, error: fetchErr } = await supabase
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();

          if (fetchErr) throw fetchErr;

          const roll = gameRow.last_roll;
          if (roll === null) {
            throw new Error('Please roll the dice before moving a token.');
          }

          const state = gameRow.state as any;
          const currentTurnUserId = state.currentTurn;
          const playerIdx = state.players.findIndex((p: any) => p.userId === currentTurnUserId);
          const player = state.players[playerIdx];

          if (!player) throw new Error('Player not found in game state.');

          const currentStep = player.tokens[tokenIndex];
          let newStep = currentStep;

          if (currentStep === -1) {
            if (roll === 6) {
              newStep = 0; // enter track
            } else {
              throw new Error('Need a 6 to enter the board.');
            }
          } else if (currentStep >= 0 && currentStep < 57) {
            if (currentStep + roll <= 57) {
              newStep = currentStep + roll;
            } else {
              throw new Error('Exact roll needed to enter home.');
            }
          }

          player.tokens[tokenIndex] = newStep;

          // Check captures on common track
          if (newStep >= 0 && newStep <= 51) {
            const landingAbs = getAbsoluteTrackIndex(player.color, newStep);
            if (!isSafeSquare(landingAbs)) {
              state.players.forEach((otherP: any) => {
                if (otherP.userId !== currentTurnUserId) {
                  for (let i = 0; i < 4; i++) {
                    const oStep = otherP.tokens[i];
                    if (oStep >= 0 && oStep <= 51) {
                      const oAbs = getAbsoluteTrackIndex(otherP.color, oStep);
                      if (oAbs === landingAbs) {
                        otherP.tokens[i] = -1; // Send back to yard
                        toast(`Captured ${otherP.color}'s token! 💥`, { icon: '🎯' });
                      }
                    }
                  }
                }
              });
            }
          }

          // Check if player has finished (all 4 tokens at 57)
          const allHome = player.tokens.every((st: number) => st === 57);
          const winnerOrder: string[] = state.winnerOrder || [];
          if (allHome && !winnerOrder.includes(currentTurnUserId)) {
            winnerOrder.push(currentTurnUserId);
            state.winnerOrder = winnerOrder;
            toast.success(`${player.color.toUpperCase()} brought all tokens home! 🏆`);
          }

          // Determine next turn:
          // Rolling 6 grants an extra turn unless all tokens are home
          let nextTurnUserId = currentTurnUserId;
          if (roll !== 6 || allHome) {
            let nextIdx = (playerIdx + 1) % state.players.length;
            // Skip players who already finished
            let attempts = 0;
            while (
              attempts < state.players.length &&
              state.players[nextIdx].tokens.every((s: number) => s === 57)
            ) {
              nextIdx = (nextIdx + 1) % state.players.length;
              attempts++;
            }
            nextTurnUserId = state.players[nextIdx].userId;
          }

          // Check if game is completely finished
          const unfinishedPlayers = state.players.filter(
            (p: any) => !p.tokens.every((s: number) => s === 57)
          );
          if (unfinishedPlayers.length <= 1) {
            state.status = 'finished';
          }

          state.currentTurn = nextTurnUserId;
          state.lastRoll = null;
          state.turnDeadline = new Date(Date.now() + 20_000).toISOString();

          // Write updated state
          await supabase
            .from('games')
            .update({
              state,
              last_roll: null,
              turn_deadline: state.turnDeadline,
              status: state.status,
            })
            .eq('id', gameId);
        }

        // Clear local selection and movable highlights
        setMovableTokens([]);
        setSelectedToken(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to move token';
        toast.error(message);
        console.error('[useMoveToken] error:', err);
      } finally {
        setIsMoving(false);
      }
    },
    [isMoving, gameId, setMovableTokens, setSelectedToken],
  );

  return { moveToken, isMoving };
}
