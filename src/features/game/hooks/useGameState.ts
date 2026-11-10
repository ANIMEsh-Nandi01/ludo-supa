import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useGameStore } from '../store/useGameStore';
import type { GameState, RoomPlayer } from '@/types/game';

interface UseGameStateReturn {
  gameState: GameState | null;
  roomPlayers: RoomPlayer[];
  isLoading: boolean;
  gameId: string | null;
}

/**
 * Subscribes to real-time game state updates and fetches initial data.
 * @param roomId The UUID of the room from route params
 */
export function useGameState(roomId: string): UseGameStateReturn {
  const { gameState, roomPlayers, setGameState, setRoomPlayers, setDiceValue } =
    useGameStore();
  const [isLoading, setIsLoading] = useState(true);
  const [gameId, setGameId] = useState<string | null>(null);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        // 1. Fetch game row by room_id
        const { data: gameRow, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('room_id', roomId)
          .single();

        if (gameError) throw gameError;

        if (!cancelled && gameRow) {
          setGameId(gameRow.id);
          setGameState(gameRow.state as GameState);
          setDiceValue(gameRow.last_roll ?? null);
        }

        // 2. Fetch room players with profiles
        const { data: players, error: playersError } = await supabase
          .from('room_players')
          .select('*, profiles(display_name, avatar_url)')
          .eq('room_id', roomId)
          .order('seat_order', { ascending: true });

        if (playersError) throw playersError;

        if (!cancelled && players) {
          const mapped: any[] = players.map((p: any) => ({
            roomId: p.room_id,
            userId: p.user_id,
            color: p.color,
            isReady: p.is_ready,
            seatOrder: p.seat_order,
            joinedAt: p.joined_at,
            profiles: p.profiles,
          }));
          setRoomPlayers(mapped);
        }
      } catch (err) {
        console.error('[useGameState] fetch error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [roomId, setGameState, setRoomPlayers, setDiceValue]);

  // ── Realtime subscription on games ──────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (newRow?.state) {
            useGameStore.getState().setGameState(newRow.state as GameState);
          }
          if ('last_roll' in newRow) {
            useGameStore.getState().setDiceValue(newRow.last_roll ?? null);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { gameState, roomPlayers, isLoading, gameId };
}
