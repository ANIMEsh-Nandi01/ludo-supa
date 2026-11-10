import { motion } from 'framer-motion';
import type { Color } from '@/types/game';
import { useGameStore } from '../store/useGameStore';

// Tailwind fill colors (kept as inline SVG fill for SVG compatibility)
const COLOR_FILL: Record<Color, string> = {
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  blue: '#3b82f6',
};

const COLOR_STROKE: Record<Color, string> = {
  red: '#b91c1c',
  green: '#15803d',
  yellow: '#a16207',
  blue: '#1d4ed8',
};

interface TokenProps {
  color: Color;
  isMovable: boolean;
  isSelected: boolean;
  isMine: boolean;
  cx: number;
  cy: number;
  r?: number;
  tokenIndex: number;
  onMove: (tokenIndex: number) => void;
}

export function Token({
  color,
  isMovable,
  isSelected,
  isMine,
  cx,
  cy,
  r = 14,
  tokenIndex,
  onMove,
}: TokenProps) {
  const { setSelectedToken } = useGameStore();

  const handleClick = () => {
    if (!isMovable) return;
    setSelectedToken(tokenIndex);
    onMove(tokenIndex);
  };

  const fill = COLOR_FILL[color];
  const stroke = isSelected ? '#60a5fa' : COLOR_STROKE[color];
  const strokeWidth = isSelected ? 3.5 : 2;

  return (
    <g
      onClick={handleClick}
      style={{ cursor: isMovable ? 'pointer' : 'default' }}
      role="button"
      aria-label={`${color} token ${tokenIndex + 1}${isMovable ? ' (movable)' : ''}`}
    >
      {/* Green pulse ring when movable */}
      {isMovable && (
        <motion.circle
          cx={cx}
          cy={cy}
          r={r + 6}
          fill="none"
          stroke="#4ade80"
          strokeWidth="3"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: [0.8, 0.2, 0.8], scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      )}

      {/* Token body — animates position changes */}
      <motion.circle
        layoutId={`token-${color}-${tokenIndex}`}
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        initial={false}
        animate={{ cx, cy }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        filter={isMine ? 'url(#tokenShadow)' : undefined}
      />

      {/* White dot to distinguish tokens of same color */}
      <motion.circle
        layoutId={`token-dot-${color}-${tokenIndex}`}
        cx={cx}
        cy={cy}
        r={r * 0.35}
        fill="white"
        opacity={0.7}
        initial={false}
        animate={{ cx, cy }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{ pointerEvents: 'none' }}
      />

      {/* Token index number */}
      <motion.text
        layoutId={`token-label-${color}-${tokenIndex}`}
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={r * 0.65}
        fontWeight="bold"
        fill="white"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        initial={false}
        animate={{ x: cx, y: cy + 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {tokenIndex + 1}
      </motion.text>
    </g>
  );
}
