import { useState, useEffect } from 'react';
import type { Color } from '@/types/game';

interface TurnTimerProps {
  turnDeadline: string; // ISO timestamp
  isMyTurn: boolean;
  activePlayerName: string;
  activeColor: Color;
}

export function TurnTimer({
  turnDeadline,
  isMyTurn,
  activePlayerName,
  activeColor,
}: TurnTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20);

  useEffect(() => {
    if (!turnDeadline) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(turnDeadline).getTime() - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(sec);
    }, 100);

    return () => clearInterval(interval);
  }, [turnDeadline]);

  // Total turn duration standard is 20s
  const percent = Math.min(100, Math.max(0, (secondsRemaining / 20) * 100));

  const colorBar =
    secondsRemaining > 10
      ? 'bg-emerald-500 shadow-emerald-500/50'
      : secondsRemaining > 5
      ? 'bg-amber-500 shadow-amber-500/50'
      : 'bg-red-500 shadow-red-500/50 animate-pulse';

  return (
    <div className="w-full rounded-2xl bg-gray-900/80 border border-white/10 p-4 shadow-xl backdrop-blur-md flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              activeColor === 'red'
                ? 'bg-red-500'
                : activeColor === 'green'
                ? 'bg-green-500'
                : activeColor === 'yellow'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
          />
          <span className="text-sm font-bold text-white">
            {isMyTurn ? "It's your turn!" : `${activePlayerName}'s turn`}
          </span>
        </div>
        <span className="font-mono text-sm font-black text-gray-200">{secondsRemaining}s</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full transition-all duration-200 rounded-full ${colorBar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
