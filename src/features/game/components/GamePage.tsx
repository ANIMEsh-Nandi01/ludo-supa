import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, MessageSquare } from 'lucide-react';
import { useGameState } from '../hooks/useGameState';
import { LudoBoard } from './LudoBoard';
import { Dice } from './Dice';
import { TurnTimer } from './TurnTimer';
import { ResultScreen } from './ResultScreen';
import { VoicePanel } from '@/features/voice/VoicePanel';
import { ChatPanel } from '@/features/chat/ChatPanel';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useGameStore } from '../store/useGameStore';
import type { Color } from '@/types/game';

export function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const { setMyColor } = useGameStore();

  const { gameState, roomPlayers, isLoading, gameId } = useGameState(roomId || '');

  // Mobile sidebar tab toggles
  const [mobileTab, setMobileTab] = useState<'board' | 'chat' | 'voice'>('board');

  const participants = roomPlayers.map((p) => ({
    userId: p.userId,
    displayName: (p as any).profiles?.display_name || 'Player',
    color: p.color as Color,
  }));

  const myPlayer = roomPlayers.find((p) => p.userId === currentUserId);
  useEffect(() => {
    if (myPlayer?.color) {
      setMyColor(myPlayer.color);
    }
  }, [myPlayer?.color, setMyColor]);

  if (isLoading || !gameState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <span className="text-sm font-medium text-gray-400">Loading game board...</span>
        </div>
      </div>
    );
  }

  const isMyTurn = currentUserId === gameState.currentTurn;
  const activeParticipant = participants.find((p) => p.userId === gameState.currentTurn);
  const activePlayerName = activeParticipant?.displayName || 'Player';
  const activeColor = activeParticipant?.color || 'red';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top Header */}
      <header className="px-4 py-3 border-b border-white/10 bg-gray-900/60 backdrop-blur-md flex items-center justify-between">
        <button
          onClick={() => navigate(`/room/${roomId}`)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Exit to Lobby
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Live Game</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex items-center gap-1 sm:hidden">
          <button
            onClick={() => setMobileTab('board')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold ${
              mobileTab === 'board' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setMobileTab('chat')}
            className={`p-1.5 rounded-lg text-xs ${
              mobileTab === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMobileTab('voice')}
            className={`p-1.5 rounded-lg text-xs ${
              mobileTab === 'voice' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board and Dice Column (7 cols on lg) */}
        <div
          className={`lg:col-span-7 flex flex-col items-center gap-5 ${
            mobileTab !== 'board' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          {/* Turn timer bar */}
          <TurnTimer
            turnDeadline={gameState.turnDeadline}
            isMyTurn={isMyTurn}
            activePlayerName={activePlayerName}
            activeColor={activeColor}
          />

          {/* SVG Ludo Board */}
          <LudoBoard
            gameId={gameId || ''}
            players={gameState.players}
            currentTurnUserId={gameState.currentTurn}
            myUserId={currentUserId}
          />

          {/* Dice rolling area */}
          <div className="flex flex-col items-center py-2">
            <Dice gameId={gameId || ''} isMyTurn={isMyTurn} />
          </div>
        </div>

        {/* Sidebar: Voice & Chat Column (5 cols on lg) */}
        <div
          className={`lg:col-span-5 flex flex-col gap-4 ${
            mobileTab === 'board' ? 'hidden lg:flex' : 'flex w-full'
          }`}
        >
          {/* Voice Panel */}
          {roomId && currentUserId && (mobileTab === 'voice' || mobileTab === 'board') && (
            <VoicePanel
              roomId={roomId}
              userId={currentUserId}
              participants={participants}
            />
          )}

          {/* Chat Panel */}
          {roomId && (mobileTab === 'chat' || mobileTab === 'board') && (
            <div className="h-[480px]">
              <ChatPanel roomId={roomId} participants={participants} />
            </div>
          )}
        </div>
      </main>

      {/* Winner / Result Screen */}
      {gameState.status === 'finished' && (
        <ResultScreen
          winnerOrder={gameState.winnerOrder}
          participants={participants}
          onRematch={() => navigate(`/room/${roomId}`)}
        />
      )}
    </div>
  );
}
export default GamePage;
