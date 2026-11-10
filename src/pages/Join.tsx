import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Hash, Plus, Zap, Users, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';

const CODE_LENGTH = 6;

type Mode = 'join' | 'create' | 'matchmaking';

export default function Join() {
  const { code: paramCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const { signOut } = useAuth();

  const [mode, setMode] = useState<Mode>(paramCode ? 'join' : 'join');
  const [code, setCode] = useState(paramCode?.toUpperCase() ?? '');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayName = profile?.displayName || session?.user?.user_metadata?.display_name || 'Player';

  // Auto-submit when code comes from route param
  useEffect(() => {
    if (paramCode && paramCode.length === CODE_LENGTH) {
      void handleJoin(paramCode.toUpperCase());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramCode]);

  const handleJoin = async (joinCode = code) => {
    const trimmed = joinCode.trim().toUpperCase();
    if (trimmed.length !== CODE_LENGTH) {
      setError(`Code must be ${CODE_LENGTH} characters.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: room, error: roomErr } = await supabase
        .from('rooms')
        .select('id, status, max_players')
        .eq('code', trimmed)
        .single();

      if (roomErr || !room) {
        setError('Room not found. Check the code and try again.');
        return;
      }

      if (room.status === 'in_game' || room.status === 'playing') {
        setError('That game has already started.');
        return;
      }

      if (room.status === 'finished') {
        setError('That game has already finished.');
        return;
      }

      if (!session) {
        navigate('/', { state: { joinCode: trimmed } });
        return;
      }

      // Check room players count
      const { data: players } = await supabase
        .from('room_players')
        .select('user_id')
        .eq('room_id', room.id);

      const alreadyIn = (players || []).some((p) => p.user_id === session.user.id);
      if (!alreadyIn && (players?.length || 0) >= room.max_players) {
        setError('Room is already full.');
        return;
      }

      if (!alreadyIn) {
        const colors = ['red', 'green', 'yellow', 'blue'];
        const nextSeat = (players?.length || 0) + 1;
        await supabase.from('room_players').insert({
          room_id: room.id,
          user_id: session.user.id,
          color: colors[nextSeat - 1] || 'blue',
          seat_order: nextSeat,
          is_ready: false,
        });
      }

      navigate(`/room/${room.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!session?.user?.id) {
      setError('You must be signed in to create a room.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Direct PostgreSQL room creation with valid 'waiting' status
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let roomCode = '';
      for (let i = 0; i < 6; i++) {
        roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const { data: newRoom, error: roomErr } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          host_id: session.user.id,
          max_players: playerCount,
          type: 'private',
          status: 'waiting',
        })
        .select()
        .single();

      if (roomErr) throw roomErr;

      // Join host as seat 1
      const { error: playerErr } = await supabase.from('room_players').insert({
        room_id: newRoom.id,
        user_id: session.user.id,
        color: 'red',
        seat_order: 1,
        is_ready: true,
      });

      if (playerErr) throw playerErr;

      navigate(`/room/${newRoom.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPlay = async () => {
    if (!session?.user?.id) {
      setError('You must be signed in to play.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMatchStatus('Searching for players...');

    try {
      // Look for open public rooms
      const { data: publicRooms } = await supabase
        .from('rooms')
        .select('id, max_players, room_players(user_id)')
        .eq('type', 'public')
        .in('status', ['waiting', 'lobby'])
        .eq('max_players', playerCount);

      const availableRoom = (publicRooms || []).find(
        (r: any) => (r.room_players?.length || 0) < r.max_players
      );

      if (availableRoom) {
        // Join existing public room
        const currentCount = availableRoom.room_players?.length || 0;
        const colors = ['red', 'green', 'yellow', 'blue'];
        await supabase.from('room_players').insert({
          room_id: availableRoom.id,
          user_id: session.user.id,
          color: colors[currentCount] || 'blue',
          seat_order: currentCount + 1,
          is_ready: true,
        });

        navigate(`/room/${availableRoom.id}`);
      } else {
        // Create a new public room
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let roomCode = '';
        for (let i = 0; i < 6; i++) {
          roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const { data: newRoom, error: roomErr } = await supabase
          .from('rooms')
          .insert({
            code: roomCode,
            host_id: session.user.id,
            max_players: playerCount,
            type: 'public',
            status: 'waiting',
          })
          .select()
          .single();

        if (roomErr) throw roomErr;

        await supabase.from('room_players').insert({
          room_id: newRoom.id,
          user_id: session.user.id,
          color: 'red',
          seat_order: 1,
          is_ready: true,
        });

        navigate(`/room/${newRoom.id}`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      }
      setMatchStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length <= CODE_LENGTH) {
      setCode(val);
      setError(null);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Top User Header Bar */}
        <div className="w-full flex items-center justify-between pb-5 mb-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </button>

          {session && (
            <div className="flex items-center gap-2 bg-gray-900/80 border border-white/5 py-1 px-2.5 rounded-full">
              <Avatar displayName={displayName} size="sm" color="blue" />
              <span className="text-xs text-gray-200 font-semibold truncate max-w-[120px]">
                {displayName}
              </span>
              <button
                onClick={() => void signOut().then(() => navigate('/'))}
                title="Sign Out"
                className="p-1 rounded-full text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex rounded-2xl bg-gray-900/90 p-1.5 border border-white/10 mb-6 shadow-lg">
          <button
            onClick={() => {
              setMode('join');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'join' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Join Code
          </button>
          <button
            onClick={() => {
              setMode('create');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'create' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Create Room
          </button>
          <button
            onClick={() => {
              setMode('matchmaking');
              setError(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mode === 'matchmaking' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Quick Play
          </button>
        </div>

        {/* Card Body */}
        <div className="rounded-3xl bg-gray-900 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {mode === 'join' && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Enter Invite Code</h2>
              <p className="text-xs text-gray-400 mb-6">Enter the 6-character room code shared by your friend.</p>

              <div className="relative mb-4">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="ABC123"
                  maxLength={CODE_LENGTH}
                  autoFocus
                  className="w-full rounded-xl bg-gray-800/90 py-3.5 pl-11 pr-4 text-center font-mono text-2xl font-black tracking-widest text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/5"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleJoin();
                  }}
                />
              </div>

              {error && (
                <p className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs font-medium text-red-400">
                  {error}
                </p>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full py-3 text-sm font-bold shadow-lg shadow-blue-500/20"
                isLoading={isLoading}
                disabled={code.length !== CODE_LENGTH}
                onClick={() => void handleJoin()}
              >
                Join Room
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Create Private Room</h2>
              <p className="text-xs text-gray-400 mb-6">Host a game and share the code with friends.</p>

              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Number of Players
              </label>
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                {([2, 3, 4] as const).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPlayerCount(num)}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl border text-sm font-bold transition-all ${
                      playerCount === num
                        ? 'border-blue-500 bg-blue-600/20 text-blue-300 shadow-md ring-1 ring-blue-500/50'
                        : 'border-white/10 bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4 mb-1" />
                    {num} Players
                  </button>
                ))}
              </div>

              {error && (
                <p className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs font-medium text-red-400">
                  {error}
                </p>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full py-3 text-sm font-bold shadow-lg shadow-blue-500/20"
                isLoading={isLoading}
                onClick={() => void handleCreateRoom()}
              >
                Create Room
              </Button>
            </div>
          )}

          {mode === 'matchmaking' && (
            <div>
              <h2 className="text-xl font-black text-white mb-1">Quick Play Matchmaking</h2>
              <p className="text-xs text-gray-400 mb-6">Jump into a game with random players right now.</p>

              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Target Players
              </label>
              <div className="grid grid-cols-3 gap-2.5 mb-6">
                {([2, 3, 4] as const).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPlayerCount(num)}
                    className={`flex flex-col items-center justify-center py-3 rounded-xl border text-sm font-bold transition-all ${
                      playerCount === num
                        ? 'border-blue-500 bg-blue-600/20 text-blue-300 shadow-md ring-1 ring-blue-500/50'
                        : 'border-white/10 bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4 mb-1" />
                    {num} Players
                  </button>
                ))}
              </div>

              {matchStatus && (
                <div className="mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 px-3.5 py-2.5 text-xs font-medium text-blue-300 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping" />
                  {matchStatus}
                </div>
              )}

              {error && (
                <p className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs font-medium text-red-400">
                  {error}
                </p>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full py-3 text-sm font-bold shadow-lg shadow-blue-500/20"
                isLoading={isLoading}
                onClick={() => void handleQuickPlay()}
              >
                Find Match
              </Button>
            </div>
          )}
        </div>

        <button
          className="mt-6 w-full text-center text-xs font-semibold text-gray-500 hover:text-gray-300 transition-colors"
          onClick={() => navigate('/')}
        >
          ← Back to Home
        </button>
      </div>
    </main>
  );
}
