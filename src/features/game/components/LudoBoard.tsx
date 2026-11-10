import type { Color, TokenState } from '@/types/game';
import {
  CELL_SIZE,
  BOARD_SIZE,
  SAFE_SQUARES,
  COMMON_PATH,
  HOME_STRETCHES,
  getTokenPixelCoords,
} from '../utils/ludoPath';
import { Token } from './Token';
import { useGameStore } from '../store/useGameStore';
import { useMoveToken } from '../hooks/useMoveToken';

interface LudoBoardProps {
  gameId: string;
  players: TokenState[];
  currentTurnUserId: string;
  myUserId?: string;
}

const YARD_COLORS: Record<Color, { main: string; dark: string; light: string }> = {
  red: { main: '#ef4444', dark: '#b91c1c', light: '#fee2e2' },
  green: { main: '#22c55e', dark: '#15803d', light: '#dcfce7' },
  yellow: { main: '#eab308', dark: '#a16207', light: '#fef9c3' },
  blue: { main: '#3b82f6', dark: '#1d4ed8', light: '#dbeafe' },
};

export function LudoBoard({ gameId, players, currentTurnUserId, myUserId }: LudoBoardProps) {
  const { movableTokens, selectedTokenIndex, myColor } = useGameStore();
  const { moveToken } = useMoveToken(gameId);

  const isMyTurn = myUserId === currentTurnUserId;
  const myPlayer = players.find((p) => p.userId === myUserId);
  const effectiveMyColor = myPlayer?.color || myColor;

  // Star safe squares in COMMON_PATH
  const safePositions = SAFE_SQUARES.map((idx) => COMMON_PATH[idx]);

  return (
    <div className="relative aspect-square w-full max-w-[620px] mx-auto select-none rounded-3xl p-3 bg-gradient-to-br from-gray-800 to-gray-950 shadow-2xl border-4 border-gray-700/60">
      <svg
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        className="w-full h-full rounded-2xl bg-white shadow-inner overflow-hidden"
      >
        <defs>
          <filter id="tokenShadow" x="-20%" y="-20%" width="150%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ── 1. Corner Yards (6×6 cells each) ─────────────────────────────────── */}
        {/* Red Yard (Top Left: 0..6, 0..6) */}
        <rect x="0" y="0" width={6 * CELL_SIZE} height={6 * CELL_SIZE} fill={YARD_COLORS.red.main} />
        <rect
          x={1 * CELL_SIZE}
          y={1 * CELL_SIZE}
          width={4 * CELL_SIZE}
          height={4 * CELL_SIZE}
          rx="16"
          fill="white"
          stroke={YARD_COLORS.red.dark}
          strokeWidth="3"
        />

        {/* Green Yard (Top Right: 9..15, 0..6) */}
        <rect x={9 * CELL_SIZE} y="0" width={6 * CELL_SIZE} height={6 * CELL_SIZE} fill={YARD_COLORS.green.main} />
        <rect
          x={10 * CELL_SIZE}
          y={1 * CELL_SIZE}
          width={4 * CELL_SIZE}
          height={4 * CELL_SIZE}
          rx="16"
          fill="white"
          stroke={YARD_COLORS.green.dark}
          strokeWidth="3"
        />

        {/* Yellow Yard (Bottom Right: 9..15, 9..15) */}
        <rect
          x={9 * CELL_SIZE}
          y={9 * CELL_SIZE}
          width={6 * CELL_SIZE}
          height={6 * CELL_SIZE}
          fill={YARD_COLORS.yellow.main}
        />
        <rect
          x={10 * CELL_SIZE}
          y={10 * CELL_SIZE}
          width={4 * CELL_SIZE}
          height={4 * CELL_SIZE}
          rx="16"
          fill="white"
          stroke={YARD_COLORS.yellow.dark}
          strokeWidth="3"
        />

        {/* Blue Yard (Bottom Left: 0..6, 9..15) */}
        <rect
          x="0"
          y={9 * CELL_SIZE}
          width={6 * CELL_SIZE}
          height={6 * CELL_SIZE}
          fill={YARD_COLORS.blue.main}
        />
        <rect
          x={1 * CELL_SIZE}
          y={10 * CELL_SIZE}
          width={4 * CELL_SIZE}
          height={4 * CELL_SIZE}
          rx="16"
          fill="white"
          stroke={YARD_COLORS.blue.dark}
          strokeWidth="3"
        />

        {/* Yard circles (Token resting spots) */}
        {[
          { color: 'red', cx: [1.8, 3.8, 1.8, 3.8], cy: [1.8, 1.8, 3.8, 3.8] },
          { color: 'green', cx: [10.8, 12.8, 10.8, 12.8], cy: [1.8, 1.8, 3.8, 3.8] },
          { color: 'yellow', cx: [10.8, 12.8, 10.8, 12.8], cy: [10.8, 10.8, 12.8, 12.8] },
          { color: 'blue', cx: [1.8, 3.8, 1.8, 3.8], cy: [10.8, 10.8, 12.8, 12.8] },
        ].map((yard) =>
          yard.cx.map((xVal, i) => (
            <circle
              key={`${yard.color}-base-${i}`}
              cx={xVal * CELL_SIZE + CELL_SIZE / 2}
              cy={yard.cy[i] * CELL_SIZE + CELL_SIZE / 2}
              r={CELL_SIZE * 0.38}
              fill={YARD_COLORS[yard.color as Color].light}
              stroke={YARD_COLORS[yard.color as Color].main}
              strokeWidth="2.5"
            />
          ))
        )}

        {/* ── 2. Grid Cells for the Path Corridors ─────────────────────────────── */}
        {/* Draw outer grid lines for rows 6..8 and cols 6..8 */}
        {Array.from({ length: 15 }).map((_, r) =>
          Array.from({ length: 15 }).map((_, c) => {
            const isYard =
              (r < 6 && c < 6) ||
              (r < 6 && c > 8) ||
              (r > 8 && c > 8) ||
              (r > 8 && c < 6) ||
              (r >= 6 && r <= 8 && c >= 6 && c <= 8); // center home
            if (isYard) return null;

            return (
              <rect
                key={`grid-${r}-${c}`}
                x={c * CELL_SIZE}
                y={r * CELL_SIZE}
                width={CELL_SIZE}
                height={CELL_SIZE}
                fill="white"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })
        )}

        {/* ── 3. Home Run Columns (Stretches) ─────────────────────────────────── */}
        {HOME_STRETCHES.red.map((pos, i) => (
          <rect
            key={`red-stretch-${i}`}
            x={pos.col * CELL_SIZE}
            y={pos.row * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={YARD_COLORS.red.main}
            stroke="white"
            strokeWidth="1"
          />
        ))}
        {HOME_STRETCHES.green.map((pos, i) => (
          <rect
            key={`green-stretch-${i}`}
            x={pos.col * CELL_SIZE}
            y={pos.row * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={YARD_COLORS.green.main}
            stroke="white"
            strokeWidth="1"
          />
        ))}
        {HOME_STRETCHES.yellow.map((pos, i) => (
          <rect
            key={`yellow-stretch-${i}`}
            x={pos.col * CELL_SIZE}
            y={pos.row * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={YARD_COLORS.yellow.main}
            stroke="white"
            strokeWidth="1"
          />
        ))}
        {HOME_STRETCHES.blue.map((pos, i) => (
          <rect
            key={`blue-stretch-${i}`}
            x={pos.col * CELL_SIZE}
            y={pos.row * CELL_SIZE}
            width={CELL_SIZE}
            height={CELL_SIZE}
            fill={YARD_COLORS.blue.main}
            stroke="white"
            strokeWidth="1"
          />
        ))}

        {/* Start Entry Squares */}
        <rect
          x={1 * CELL_SIZE}
          y={6 * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={YARD_COLORS.red.main}
          stroke="white"
          strokeWidth="1"
        />
        <rect
          x={8 * CELL_SIZE}
          y={1 * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={YARD_COLORS.green.main}
          stroke="white"
          strokeWidth="1"
        />
        <rect
          x={13 * CELL_SIZE}
          y={8 * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={YARD_COLORS.yellow.main}
          stroke="white"
          strokeWidth="1"
        />
        <rect
          x={6 * CELL_SIZE}
          y={13 * CELL_SIZE}
          width={CELL_SIZE}
          height={CELL_SIZE}
          fill={YARD_COLORS.blue.main}
          stroke="white"
          strokeWidth="1"
        />

        {/* Safe Star Symbols (★) */}
        {safePositions.map((pos, i) => (
          <text
            key={`safe-star-${i}`}
            x={pos.col * CELL_SIZE + CELL_SIZE / 2}
            y={pos.row * CELL_SIZE + CELL_SIZE * 0.7}
            textAnchor="middle"
            fontSize="22"
            fill="#64748b"
            className="select-none font-bold"
          >
            ★
          </text>
        ))}

        {/* ── 4. Center Home Triangles ─────────────────────────────────────────── */}
        {/* Red Triangle (Left) */}
        <polygon
          points={`${6 * CELL_SIZE},${6 * CELL_SIZE} ${6 * CELL_SIZE},${9 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`}
          fill={YARD_COLORS.red.main}
        />
        {/* Green Triangle (Top) */}
        <polygon
          points={`${6 * CELL_SIZE},${6 * CELL_SIZE} ${9 * CELL_SIZE},${6 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`}
          fill={YARD_COLORS.green.main}
        />
        {/* Yellow Triangle (Right) */}
        <polygon
          points={`${9 * CELL_SIZE},${6 * CELL_SIZE} ${9 * CELL_SIZE},${9 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`}
          fill={YARD_COLORS.yellow.main}
        />
        {/* Blue Triangle (Bottom) */}
        <polygon
          points={`${6 * CELL_SIZE},${9 * CELL_SIZE} ${9 * CELL_SIZE},${9 * CELL_SIZE} ${7.5 * CELL_SIZE},${7.5 * CELL_SIZE}`}
          fill={YARD_COLORS.blue.main}
        />
        {/* Center trophy icon or circle */}
        <circle
          cx={7.5 * CELL_SIZE}
          cy={7.5 * CELL_SIZE}
          r={CELL_SIZE * 0.5}
          fill="#1e293b"
          stroke="white"
          strokeWidth="2"
        />
        <text
          x={7.5 * CELL_SIZE}
          y={7.5 * CELL_SIZE + 5}
          textAnchor="middle"
          fontSize="14"
          fill="#f8fafc"
          className="select-none font-black"
        >
          🏆
        </text>

        {/* ── 5. Render Player Tokens ─────────────────────────────────────────── */}
        {players.map((player) => {
          const isPlayerMine = player.userId === myUserId;
          return player.tokens.map((step, tokenIdx) => {
            const isMovable =
              isMyTurn &&
              isPlayerMine &&
              effectiveMyColor === player.color &&
              movableTokens.includes(tokenIdx);

            const isSelected = selectedTokenIndex === tokenIdx && isPlayerMine;

            // Get absolute or base pixel coords
            const coords = getTokenPixelCoords(player.color, step, tokenIdx, CELL_SIZE);

            // Add offset if multiple tokens share the exact cell
            const offset = (tokenIdx % 2 === 0 ? -3 : 3) * (step >= 0 && step <= 56 ? 1 : 0);

            return (
              <Token
                key={`${player.userId}-token-${tokenIdx}`}
                color={player.color}
                isMovable={isMovable}
                isSelected={isSelected}
                isMine={isPlayerMine}
                cx={coords.x + offset}
                cy={coords.y + offset}
                r={CELL_SIZE * 0.36}
                tokenIndex={tokenIdx}
                onMove={(idx) => void moveToken(idx)}
              />
            );
          });
        })}
      </svg>
    </div>
  );
}
