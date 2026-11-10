import { Check, Clock, UserX, Crown } from 'lucide-react';
import type { Color } from '@/types/game';
import { Avatar } from '@/components/Avatar';
import type { PlayerWithProfile } from '../hooks/useRoom';

interface PlayerSlotProps {
  player: PlayerWithProfile | null;
  seatNumber: number;
  isHost: boolean;
  isMe: boolean;
  isOnline: boolean;
  onKick?: () => void;
  onColorChange?: (color: Color) => void;
  availableColors?: Color[];
}

const COLOR_BORDER_MAP: Record<Color, string> = {
  red: 'border-red-500/50 bg-red-500/10',
  green: 'border-green-500/50 bg-green-500/10',
  yellow: 'border-yellow-500/50 bg-yellow-500/10',
  blue: 'border-blue-500/50 bg-blue-500/10',
};

const COLOR_DOT: Record<Color, string> = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  blue: 'bg-blue-500',
};

export function PlayerSlot({
  player,
  seatNumber,
  isHost,
  isMe,
  isOnline,
  onKick,
  onColorChange,
  availableColors = ['red', 'green', 'yellow', 'blue'],
}: PlayerSlotProps) {
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-white/10 bg-gray-900/40 text-center min-h-[160px]">
        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-gray-600 font-semibold text-sm mb-2">
          {seatNumber}
        </div>
        <span className="text-xs text-gray-500 font-medium">Waiting for player...</span>
      </div>
    );
  }

  const displayName = player.profile?.displayName || 'Player';
  const colorClass = player.color ? COLOR_BORDER_MAP[player.color] : 'border-white/10 bg-gray-900/60';

  return (
    <div
      className={`relative flex flex-col p-5 rounded-2xl border ${colorClass} shadow-lg backdrop-blur-sm min-h-[160px] justify-between transition-all`}
    >
      {/* Top badges: Host crown, online indicator, kick */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}
            title={isOnline ? 'Online' : 'Offline'}
          />
          <span className="text-[11px] text-gray-400 font-medium">Seat {seatNumber}</span>
          {seatNumber === 1 && (
            <span className="flex items-center gap-0.5 text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-md font-semibold">
              <Crown className="w-3 h-3" /> Host
            </span>
          )}
        </div>

        {isHost && !isMe && onKick && (
          <button
            onClick={onKick}
            title="Kick player"
            className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <UserX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Middle: Avatar + Name */}
      <div className="flex items-center gap-3 my-2">
        <Avatar
          displayName={displayName}
          src={player.profile?.avatarUrl || undefined}
          color={player.color}
          size="md"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {displayName} {isMe && <span className="text-xs text-gray-400 font-normal">(you)</span>}
          </span>
          <span className="text-xs text-gray-400">
            {player.profile?.wins || 0} wins · {player.profile?.gamesPlayed || 0} played
          </span>
        </div>
      </div>

      {/* Bottom: Ready status + Color swatch */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        {/* Color picker for self */}
        {isMe && onColorChange ? (
          <div className="flex items-center gap-1.5">
            {availableColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                className={`w-5 h-5 rounded-full ${COLOR_DOT[c]} transition-transform ${
                  player.color === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-60 hover:opacity-100'
                }`}
                title={`Choose ${c}`}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {player.color && (
              <span
                className={`w-3.5 h-3.5 rounded-full ${COLOR_DOT[player.color]} shadow-sm`}
                title={player.color}
              />
            )}
            <span className="text-xs text-gray-300 capitalize">{player.color}</span>
          </div>
        )}

        {/* Ready indicator */}
        <div className="flex items-center gap-1">
          {player.isReady ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Check className="w-3.5 h-3.5" /> Ready
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-400/80 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Clock className="w-3.5 h-3.5" /> Waiting
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
