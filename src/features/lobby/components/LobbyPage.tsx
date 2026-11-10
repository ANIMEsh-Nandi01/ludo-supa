import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, Check, Play, Share2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRoom } from '../hooks/useRoom';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { PlayerSlot } from './PlayerSlot';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { VoicePanel } from '@/features/voice/VoicePanel';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { Color } from '@/types/game';

export function LobbyPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.session?.user?.id);

  const {
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
  } = useRoom(roomId || '');

  const { onlineUserIds } = useRoomPresence(roomId || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Auto redirect to game when room moves to playing state
  useEffect(() => {
    if (room && (room.status === 'in_game' || (room.status as string) === 'playing')) {
      navigate(`/game/${roomId}`);
    }
  }, [room, roomId, navigate]);

  if (isLoading && !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
        <h2 className="text-xl font-bold text-white mb-1">Room Not Found</h2>
        <p className="text-sm text-gray-400 mb-6">{error || 'This room does not exist or has closed.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignored
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/join/${room.code}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignored
    }
  };

  const handleStartGame = async () => {
    try {
      setIsStarting(true);
      setActionError(null);
      await startGame();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      }
    } finally {
      setIsStarting(false);
    }
  };

  const readyPlayersCount = players.filter((p) => p.isReady).length;
  const canStart = isHost && players.length >= 2 && readyPlayersCount >= 2;

  const participants = players.map((p) => ({
    userId: p.userId,
    displayName: p.profile?.displayName || 'Player',
    color: p.color || ('red' as Color),
  }));

  // Find used colors to disable picking duplicate colors
  const usedColors = new Set(players.map((p) => p.color).filter(Boolean));
  const allColors: Color[] = ['red', 'green', 'yellow', 'blue'];
  const availableColors = allColors.filter(
    (c) => !usedColors.has(c) || myPlayer?.color === c
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col p-4 md:p-8">
      {/* Top Navigation / Room Code bar */}
      <header className="max-w-7xl mx-auto w-full flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/10 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/join')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 border border-white/10 hover:bg-gray-800 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Exit Lobby
          </button>

          <div>
            <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
              {room.type === 'private' ? 'Private Room' : 'Quick Match Lobby'}
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3 mt-0.5">
              Room Code: <span className="font-mono text-blue-400 tracking-widest">{room.code}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-900 border border-white/10 hover:bg-gray-800 text-sm font-medium transition-colors"
          >
            {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
            {copiedCode ? 'Code Copied!' : 'Copy Code'}
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 text-sm font-medium transition-colors"
          >
            {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
            {copiedLink ? 'Link Copied!' : 'Invite Link'}
          </button>
        </div>
      </header>

      {/* Main Grid: Left Slots + Right Chat/Voice */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
        {/* Left Column: Player Slots & Controls (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {actionError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {actionError}
            </div>
          )}

          {/* 2x2 Slots Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: room.maxPlayers }).map((_, index) => {
              const seatNum = index + 1;
              const player = players.find((p) => p.seatOrder === seatNum) || players[index] || null;
              const isMe = player?.userId === currentUserId;
              const isOnline = player ? onlineUserIds.includes(player.userId) : false;

              return (
                <PlayerSlot
                  key={seatNum}
                  player={player}
                  seatNumber={seatNum}
                  isHost={isHost}
                  isMe={isMe}
                  isOnline={isOnline}
                  onKick={player && !isMe ? () => kickPlayer(player.userId) : undefined}
                  onColorChange={isMe ? (c) => setColor(c) : undefined}
                  availableColors={availableColors}
                />
              );
            })}
          </div>

          {/* Ready & Start Action Bar */}
          <div className="p-5 rounded-2xl bg-gray-900/60 border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Players Ready</span>
              <span className="text-base font-bold text-white">
                {readyPlayersCount} / {players.length} ready ({room.maxPlayers} max)
              </span>
            </div>

            <div className="flex items-center gap-3">
              {myPlayer && (
                <button
                  onClick={() => setReady(!myPlayer.isReady)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 ${
                    myPlayer.isReady
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-500'
                  }`}
                >
                  {myPlayer.isReady ? 'Cancel Ready' : "I'm Ready!"}
                </button>
              )}

              {isHost && (
                <button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {isStarting ? 'Starting...' : 'Start Game'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Voice & Chat (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Voice Chat Component */}
          {roomId && currentUserId && (
            <VoicePanel
              roomId={roomId}
              userId={currentUserId}
              participants={participants}
            />
          )}

          {/* Text Chat Component */}
          {roomId && (
            <div className="h-[460px]">
              <ChatPanel roomId={roomId} participants={participants} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default LobbyPage;
