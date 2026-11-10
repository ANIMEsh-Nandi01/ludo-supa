import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { useRollDice } from '../hooks/useRollDice';

// ── Dot positions for each face (cx, cy relative to 60×60 viewBox) ─────────────
const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[30, 30]],
  2: [
    [18, 18],
    [42, 42],
  ],
  3: [
    [18, 18],
    [30, 30],
    [42, 42],
  ],
  4: [
    [18, 18],
    [42, 18],
    [18, 42],
    [42, 42],
  ],
  5: [
    [18, 18],
    [42, 18],
    [30, 30],
    [18, 42],
    [42, 42],
  ],
  6: [
    [18, 14],
    [42, 14],
    [18, 30],
    [42, 30],
    [18, 46],
    [42, 46],
  ],
};

interface DiceProps {
  gameId: string;
  isMyTurn: boolean;
}

export function Dice({ gameId, isMyTurn }: DiceProps) {
  const { diceValue, isRolling } = useGameStore();
  const { rollDice } = useRollDice(gameId);

  const canRoll = isMyTurn && diceValue === null && !isRolling;
  const displayValue = diceValue ?? 1;
  const dots = DOT_POSITIONS[displayValue] ?? DOT_POSITIONS[1];

  const handleClick = () => {
    if (canRoll) {
      void rollDice();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        onClick={handleClick}
        disabled={!canRoll}
        className={[
          'relative rounded-xl border-2 p-1 shadow-lg transition-shadow',
          canRoll
            ? 'cursor-pointer border-blue-400 bg-white hover:shadow-blue-300 active:scale-95'
            : 'cursor-not-allowed border-gray-300 bg-gray-100',
        ].join(' ')}
        whileTap={canRoll ? { scale: 0.9 } : {}}
        animate={
          isRolling
            ? {
                rotate: [0, 90, 180, 270, 360, 90, 180, 270, 360],
                scale: [1, 1.2, 0.9, 1.1, 1, 1.2, 0.9, 1.1, 1],
              }
            : { rotate: 0, scale: 1 }
        }
        transition={
          isRolling
            ? { duration: 0.8, ease: 'linear' }
            : { duration: 0.2, ease: 'easeOut' }
        }
        aria-label={canRoll ? 'Roll dice' : 'Dice'}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 60 60"
          xmlns="http://www.w3.org/2000/svg"
          className="select-none"
        >
          {/* Background */}
          <rect
            x="2"
            y="2"
            width="56"
            height="56"
            rx="8"
            ry="8"
            fill={canRoll ? '#fff' : '#e5e7eb'}
            stroke={canRoll ? '#3b82f6' : '#9ca3af'}
            strokeWidth="2"
          />

          {/* Dots */}
          <AnimatePresence mode="wait">
            <motion.g
              key={displayValue}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              {dots.map(([cx, cy], idx) => (
                <circle
                  key={idx}
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill={canRoll ? '#1e40af' : '#9ca3af'}
                />
              ))}
            </motion.g>
          </AnimatePresence>
        </svg>

        {/* Rolling spinner overlay */}
        {isRolling && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70">
            <span className="text-xs font-bold text-blue-600">…</span>
          </div>
        )}
      </motion.button>

      {/* Label */}
      <span
        className={[
          'text-sm font-semibold',
          canRoll ? 'text-blue-600' : 'text-gray-400',
        ].join(' ')}
      >
        {isRolling
          ? 'Rolling…'
          : diceValue !== null
            ? `Rolled ${diceValue}`
            : canRoll
              ? 'Roll!'
              : 'Waiting…'}
      </span>
    </div>
  );
}
