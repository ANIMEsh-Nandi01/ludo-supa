import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { getMovableTokens } from '../utils/moveValidator';
import toast from 'react-hot-toast';

interface UseRollDiceReturn {
  rollDice: () => Promise<void>;
  isRolling: boolean;
}

export function useRollDice(gameId: string): UseRollDiceReturn {
  const { isRolling, gameState, myColor, setIsRolling, setDiceValue, setMovableTokens } =
    useGameStore();

  const rollDice = useCallback(async () => {
    if (isRolling || !gameId) return;

    setIsRolling(true);

    try {
      let roll: number | null = null;

      // 1. Try Edge Function if deployed
      try {
        const { data, error } = await supabase.functions.invoke('roll-dice', {
          body: { gameId },
        });

        if (!error && data) {
          roll = data?.roll ?? data?.value ?? data;
        }
      } catch {
        // Fallback to direct DB update
      }

      // 2. Direct DB fallback if Edge Function is not deployed
      if (roll === null) {
        const rand = crypto.getRandomValues(new Uint8Array(1))[0];
        roll = (rand % 6) + 1;

        const { data: gameRow, error: fetchErr } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (fetchErr) throw fetchErr;

        if (gameRow) {
          const currentState = gameRow.state as any;
          const currentConsecutive = gameRow.consecutive_sixes || 0;
          const nextConsecutive = roll === 6 ? currentConsecutive + 1 : 0;

          let nextTurn = currentState.currentTurn;
          let forfeit = false;
          if (nextConsecutive >= 3) {
            forfeit = true;
            toast('Three consecutive 6s! Turn forfeited.', { icon: '⚠️' });
            const pIdx = currentState.players.findIndex((p: any) => p.userId === nextTurn);
            const nextIdx = (pIdx + 1) % currentState.players.length;
            nextTurn = currentState.players[nextIdx].userId;
          }

          currentState.lastRoll = forfeit ? null : roll;
          currentState.consecutiveSixes = forfeit ? 0 : nextConsecutive;
          currentState.currentTurn = nextTurn;
          currentState.turnDeadline = new Date(Date.now() + 20_000).toISOString();

          await supabase
            .from('games')
            .update({
              state: currentState,
              last_roll: currentState.lastRoll,
              consecutive_sixes: currentState.consecutiveSixes,
              turn_deadline: currentState.turnDeadline,
            })
            .eq('id', gameId);
        }
      }

      setDiceValue(roll);

      // Compute movable tokens on the client for immediate highlighting
      if (gameState && myColor && roll !== null) {
        const myState = gameState.players.find((p) => p.color === myColor);
        if (myState) {
          const movable = getMovableTokens(
            myState,
            roll,
            gameState.players,
            gameState.consecutiveSixes,
          );
          setMovableTokens(movable);

          // If no tokens can move, auto advance turn after 1 second
          if (movable.length === 0 && roll !== 6) {
            toast('No valid moves with this roll.', { icon: 'ℹ️' });
            setTimeout(async () => {
              const { data: gRow } = await supabase
                .from('games')
                .select('*')
                .eq('id', gameId)
                .single();
              if (gRow) {
                const s = gRow.state as any;
                const pIdx = s.players.findIndex((p: any) => p.userId === s.currentTurn);
                const nextIdx = (pIdx + 1) % s.players.length;
                s.currentTurn = s.players[nextIdx].userId;
                s.lastRoll = null;
                s.consecutiveSixes = 0;
                s.turnDeadline = new Date(Date.now() + 20_000).toISOString();
                await supabase
                  .from('games')
                  .update({
                    state: s,
                    last_roll: null,
                    consecutive_sixes: 0,
                    turn_deadline: s.turnDeadline,
                  })
                  .eq('id', gameId);
              }
            }, 1000);
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to roll dice';
      toast.error(message);
      console.error('[useRollDice] error:', err);
    } finally {
      setIsRolling(false);
    }
  }, [isRolling, gameId, gameState, myColor, setIsRolling, setDiceValue, setMovableTokens]);

  return { rollDice, isRolling };
}
