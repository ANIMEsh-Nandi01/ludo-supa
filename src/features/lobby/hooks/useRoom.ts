import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { Room, RoomPlayer, Profile, Color } from '@/types/game';

export interface PlayerWithProfile extends RoomPlayer {
  profile?: Profile;
}

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<PlayerWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = useAuthStore((s) => s.session?.user?.id);

  // Fetch room & players
  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;
    try {
      setIsLoading(true);
      setError(null);

      const [roomRes, playersRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('room_players').select('*, profiles(*)').eq('room_id', roomId),
      ]);

      if (roomRes.error) throw roomRes.error;
      if (playersRes.error) throw playersRes.error;

      // Transform raw DB room to Room model
      const rawRoom = roomRes.data;
      const parsedRoom: Room = {
        id: rawRoom.id,
        code: rawRoom.code,
        hostId: rawRoom.host_id,
        maxPlayers: rawRoom.max_players,
        type: rawRoom.type,
        status: rawRoom.status,
        createdAt: rawRoom.created_at,
      };
      setRoom(parsedRoom);

      // Transform players
      const parsedPlayers: PlayerWithProfile[] = (playersRes.data || []).map((p: any) => ({
        roomId: p.room_id,
        userId: p.user_id,
        color: p.color as Color,
        isReady: p.is_ready,
        seatOrder: p.seat_order,
        joinedAt: p.joined_at,
        profile: p.profiles
          ? {
              id: p.profiles.id,
              displayName: p.profiles.display_name,
              avatarUrl: p.profiles.avatar_url,
              gamesPlayed: p.profiles.games_played || 0,
              wins: p.profiles.wins || 0,
            }
          : undefined,
      }));

      setPlayers(parsedPlayers);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void fetchRoomData();

    // Subscribe to room table changes (e.g. status transition to 'playing')
    const roomChannel = supabase
      .channel(`room-state:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new) {
            const raw = payload.new as any;
            setRoom((prev) =>
              prev
                ? {
                    ...prev,
                    status: raw.status,
                    maxPlayers: raw.max_players,
                  }
                : null
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => {
          // Re-fetch players on any join/leave/ready toggle
          void fetchRoomData();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(roomChannel);
    };
  }, [roomId, fetchRoomData]);

  // Set ready status
  const setReady = useCallback(
    async (isReady: boolean) => {
      if (!currentUserId || !roomId) return;
      const { error: err } = await supabase
        .from('room_players')
        .update({ is_ready: isReady })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);

      if (err) throw err;
      setPlayers((prev) =>
        prev.map((p) => (p.userId === currentUserId ? { ...p, isReady } : p))
      );
    },
    [roomId, currentUserId]
  );

  // Choose color
  const setColor = useCallback(
    async (color: Color) => {
      if (!currentUserId || !roomId) return;
      const { error: err } = await supabase
        .from('room_players')
        .update({ color })
        .eq('room_id', roomId)
        .eq('user_id', currentUserId);

      if (err) throw err;
      setPlayers((prev) =>
        prev.map((p) => (p.userId === currentUserId ? { ...p, color } : p))
      );
    },
    [roomId, currentUserId]
  );

  // Host starts the game
  const startGame = useCallback(async () => {
    if (!roomId) return;

    // 1. Try Edge Function if deployed
    try {
      const { data, error: err } = await supabase.functions.invoke('start-game', {
        body: { roomId },
      });
      if (!err && data?.gameId) return data;
    } catch {
      // Fallback to direct DB initialization
    }

    // 2. Direct DB initialization fallback
    const { data: pList } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', roomId)
      .order('seat_order', { ascending: true });

    const colors: Color[] = ['red', 'green', 'yellow', 'blue'];
    const playersState = (pList || []).map((p: any, idx: number) => ({
      userId: p.user_id,
      color: (p.color || colors[idx % 4]) as Color,
      tokens: [-1, -1, -1, -1] as [number, number, number, number],
    }));

    const firstTurn = playersState[0]?.userId || currentUserId || '';

    const initialState = {
      players: playersState,
      currentTurn: firstTurn,
      lastRoll: null,
      consecutiveSixes: 0,
      turnDeadline: new Date(Date.now() + 20_000).toISOString(),
      status: 'active',
      winnerOrder: [],
    };

    const { data: gameRow, error: gameErr } = await supabase
      .from('games')
      .upsert({
        room_id: roomId,
        state: initialState,
        status: 'active',
        turn_deadline: initialState.turnDeadline,
        consecutive_sixes: 0,
      })
      .select()
      .single();

    if (gameErr) throw gameErr;

    // Update room status
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId);

    return { gameId: gameRow.id };
  }, [roomId, currentUserId]);

  // Host kicks a player
  const kickPlayer = useCallback(
    async (targetUserId: string) => {
      if (!roomId) return;
      const { error: err } = await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', targetUserId);

      if (err) throw err;
      setPlayers((prev) => prev.filter((p) => p.userId !== targetUserId));
    },
    [roomId]
  );

  const isHost = room?.hostId === currentUserId;
  const myPlayer = players.find((p) => p.userId === currentUserId);

  return {
    room,
    players,
    myPlayer,
    isHost,
    isLoading,
    error,
    setReady,
    setColor,
    startGame,
    kickPlayer,
    refetch: fetchRoomData,
  };
}

