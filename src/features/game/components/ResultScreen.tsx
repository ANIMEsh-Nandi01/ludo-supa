import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Color } from '@/types/game';
import { Avatar } from '@/components/Avatar';

interface RankedPlayer {
  userId: string;
  displayName: string;
  color: Color;
  rank: number; // 1, 2, 3, 4
}

interface ResultScreenProps {
  winnerOrder: string[]; // userIds in order
  participants: Array<{ userId: string; displayName: string; color: Color }>;
  onRematch?: () => void;
}

const RANK_BADGES: Record<number, { medal: string; text: string; bg: string }> = {
  1: { medal: '🥇', text: 'Winner', bg: 'from-amber-400/20 to-amber-600/20 border-amber-500/40' },
  2: { medal: '🥈', text: '2nd Place', bg: 'from-slate-300/20 to-slate-500/20 border-slate-400/40' },
  3: { medal: '🥉', text: '3rd Place', bg: 'from-amber-700/20 to-amber-900/20 border-amber-700/40' },
  4: { medal: '4th', text: '4th Place', bg: 'from-gray-700/20 to-gray-900/20 border-gray-700/40' },
};

export function ResultScreen({ winnerOrder, participants, onRematch }: ResultScreenProps) {
  const navigate = useNavigate();

  const participantMap = new Map(participants.map((p) => [p.userId, p]));

  // Build ranked list: first those in winnerOrder, then remaining participants
  const ranked: RankedPlayer[] = [];
  const processed = new Set<string>();

  winnerOrder.forEach((uid, idx) => {
    const p = participantMap.get(uid);
    if (p) {
      ranked.push({
        userId: uid,
        displayName: p.displayName,
        color: p.color,
        rank: idx + 1,
      });
      processed.add(uid);
    }
  });

  participants.forEach((p) => {
    if (!processed.has(p.userId)) {
      ranked.push({
        userId: p.userId,
        displayName: p.displayName,
        color: p.color,
        rank: ranked.length + 1,
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 260 }}
        className="w-full max-w-lg rounded-3xl bg-gray-900 border border-white/10 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Game Over!</h2>
        <p className="text-sm text-gray-400 mt-1 mb-6">Great game! Here are the final standings:</p>

        {/* Podium list */}
        <div className="w-full flex flex-col gap-3 mb-8">
          {ranked.map((player) => {
            const badge = RANK_BADGES[player.rank] || RANK_BADGES[4];
            return (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-3.5 rounded-2xl border bg-gradient-to-r ${badge.bg} backdrop-blur-sm`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{badge.medal}</span>
                  <Avatar displayName={player.displayName} color={player.color} size="sm" />
                  <span className="text-sm font-bold text-white">{player.displayName}</span>
                </div>
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  {badge.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full">
          <button
            onClick={() => navigate('/')}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-bold text-gray-200 transition-colors border border-white/5 active:scale-95"
          >
            <Home className="w-4 h-4" /> Home
          </button>
          {onRematch && (
            <button
              onClick={onRematch}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-sm font-bold text-white transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" /> Rematch
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
