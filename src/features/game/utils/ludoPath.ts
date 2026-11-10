import type { Color } from '@/types/game';

// ── Board geometry ──────────────────────────────────────────────────────────────

export const CELL_SIZE = 40;
export const BOARD_SIZE = 600;

export interface Position {
  row: number;
  col: number;
}

// ── Common 52-square path ───────────────────────────────────────────────────────
// The Ludo board is a 15×15 grid.
// Row/col are 0-indexed from top-left.
// The common path goes: start at red entry (row=6,col=1), moves clockwise.
//
// Square layout per standard Ludo 15×15:
//   0  = red start  (6,1)
//   13 = green start (1,8)
//   26 = yellow start (8,13)
//   39 = blue start (13,6)
export const COMMON_PATH: Position[] = [
  // Segment 0–5: going down the left column (red home column approach from bottom-left yard)
  { row: 6, col: 1 },  // 0  red entry
  { row: 6, col: 2 },  // 1
  { row: 6, col: 3 },  // 2
  { row: 6, col: 4 },  // 3
  { row: 6, col: 5 },  // 4
  { row: 5, col: 5 },  // 5
  // Segment 6–12: up the left-middle column
  { row: 4, col: 5 },  // 6
  { row: 3, col: 5 },  // 7
  { row: 2, col: 5 },  // 8  safe
  { row: 1, col: 5 },  // 9
  { row: 0, col: 5 },  // 10
  { row: 0, col: 6 },  // 11
  { row: 0, col: 7 },  // 12
  // Segment 13–19: across the top (green entry area)
  { row: 1, col: 8 },  // 13 green entry
  { row: 0, col: 8 },  // 14
  { row: 0, col: 9 },  // 15
  { row: 1, col: 9 },  // 16
  { row: 2, col: 9 },  // 17
  { row: 3, col: 9 },  // 18
  { row: 4, col: 9 },  // 19
  // Segment 20–25: going right, top-right corner
  { row: 5, col: 9 },  // 20
  { row: 5, col: 10 }, // 21 safe
  { row: 5, col: 11 }, // 22
  { row: 5, col: 12 }, // 23
  { row: 5, col: 13 }, // 24
  { row: 5, col: 14 }, // 25
  // Segment 26–32: yellow entry side (right column going down)
  { row: 6, col: 13 }, // 26 yellow entry
  { row: 6, col: 14 }, // 27
  { row: 7, col: 14 }, // 28
  { row: 8, col: 14 }, // 29
  { row: 9, col: 13 }, // 30
  { row: 9, col: 12 }, // 31
  { row: 9, col: 11 }, // 32
  // Segment 33–38: bottom-right area
  { row: 9, col: 10 }, // 33
  { row: 9, col: 9 },  // 34 safe
  { row: 10, col: 9 }, // 35
  { row: 11, col: 9 }, // 36
  { row: 12, col: 9 }, // 37
  { row: 13, col: 9 }, // 38
  // Segment 39–45: blue entry (bottom)
  { row: 13, col: 8 }, // 39 blue entry
  { row: 14, col: 8 }, // 40
  { row: 14, col: 7 }, // 41
  { row: 14, col: 6 }, // 42
  { row: 13, col: 6 }, // 43
  { row: 12, col: 6 }, // 44
  { row: 11, col: 6 }, // 45
  // Segment 46–51: left-bottom area back to start
  { row: 10, col: 6 }, // 46
  { row: 9, col: 5 },  // 47 safe
  { row: 9, col: 4 },  // 48
  { row: 9, col: 3 },  // 49
  { row: 9, col: 2 },  // 50
  { row: 9, col: 1 },  // 51
];

// ── Home stretches (steps 52–56, reaching center at 57) ────────────────────────
// 5 squares leading into the center for each color
export const HOME_STRETCHES: Record<Color, Position[]> = {
  red: [
    { row: 7, col: 1 },  // step 52
    { row: 7, col: 2 },  // step 53
    { row: 7, col: 3 },  // step 54
    { row: 7, col: 4 },  // step 55
    { row: 7, col: 5 },  // step 56
  ],
  green: [
    { row: 1, col: 7 },
    { row: 2, col: 7 },
    { row: 3, col: 7 },
    { row: 4, col: 7 },
    { row: 5, col: 7 },
  ],
  yellow: [
    { row: 7, col: 13 },
    { row: 7, col: 12 },
    { row: 7, col: 11 },
    { row: 7, col: 10 },
    { row: 7, col: 9 },
  ],
  blue: [
    { row: 13, col: 7 },
    { row: 12, col: 7 },
    { row: 11, col: 7 },
    { row: 10, col: 7 },
    { row: 9, col: 7 },
  ],
};

// ── Base (yard) coordinates — where tokens sit when at step -1 ─────────────────
export const BASE_COORDINATES: Record<Color, Position[]> = {
  red: [
    { row: 1, col: 1 },
    { row: 1, col: 3 },
    { row: 3, col: 1 },
    { row: 3, col: 3 },
  ],
  green: [
    { row: 1, col: 11 },
    { row: 1, col: 13 },
    { row: 3, col: 11 },
    { row: 3, col: 13 },
  ],
  yellow: [
    { row: 11, col: 11 },
    { row: 11, col: 13 },
    { row: 13, col: 11 },
    { row: 13, col: 13 },
  ],
  blue: [
    { row: 11, col: 1 },
    { row: 11, col: 3 },
    { row: 13, col: 1 },
    { row: 13, col: 3 },
  ],
};

// ── Start indices (global track index where each color enters the board) ────────
export const START_INDICES: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// ── Safe squares (global track indices) ────────────────────────────────────────
export const SAFE_SQUARES: number[] = [0, 8, 13, 21, 26, 34, 39, 47];

// ── Helper: maps player-local step to global (absolute) common-path index ──────
/**
 * Returns the index into COMMON_PATH for a given color and step.
 * Step 0 is the token's first square on the common path.
 * Steps 52–56 are the home stretch (not in COMMON_PATH).
 */
export function getAbsoluteTrackIndex(color: Color, step: number): number {
  const start = START_INDICES[color];
  return (start + step) % 52;
}

// ── Pixel coordinate resolver ───────────────────────────────────────────────────
/**
 * Returns the pixel {x, y} center of a token given its step.
 *   step = -1  → yard (base) position
 *   step 0–51  → COMMON_PATH
 *   step 52–56 → HOME_STRETCHES
 *   step 57    → center home (7, 7)
 */
export function getTokenPixelCoords(
  color: Color,
  step: number,
  tokenIndex: number,
  cellSize: number,
): { x: number; y: number } {
  const half = cellSize / 2;

  if (step === -1) {
    const base = BASE_COORDINATES[color][tokenIndex];
    return {
      x: base.col * cellSize + half,
      y: base.row * cellSize + half,
    };
  }

  if (step === 57) {
    // Center of the board
    return { x: 7 * cellSize + half, y: 7 * cellSize + half };
  }

  if (step >= 52 && step <= 56) {
    const stretch = HOME_STRETCHES[color][step - 52];
    return {
      x: stretch.col * cellSize + half,
      y: stretch.row * cellSize + half,
    };
  }

  // step 0–51: common path
  const absIdx = getAbsoluteTrackIndex(color, step);
  const pos = COMMON_PATH[absIdx];
  return {
    x: pos.col * cellSize + half,
    y: pos.row * cellSize + half,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

export function isSafeSquare(absoluteIndex: number): boolean {
  return SAFE_SQUARES.includes(absoluteIndex);
}

/** Maps seatOrder (0-indexed) to a color in fixed assignment order. */
const SEAT_COLORS: Color[] = ['red', 'green', 'yellow', 'blue'];
export function getPlayerColor(seatOrder: number): Color {
  return SEAT_COLORS[seatOrder % 4];
}
