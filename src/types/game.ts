// ── Primitive types ────────────────────────────────────────────────────────────

export type Color = 'red' | 'green' | 'yellow' | 'blue';

/**
 * Position on the board.
 * -1  = home (not yet entered)
 *  0–56 = active squares (0 = start entry, 56 = finished)
 */
export type TokenStep = number; // -1 to 57

// ── Token / Game state ─────────────────────────────────────────────────────────

export interface TokenState {
  userId: string;
  color: Color;
  /** Four token positions, indexed 0–3. */
  tokens: [number, number, number, number];
}

export type GameStatus = 'waiting' | 'active' | 'finished';

export interface GameState {
  players: TokenState[];
  currentTurn: string; // userId of the player whose turn it is
  lastRoll: number | null;
  consecutiveSixes: number;
  turnDeadline: string; // ISO 8601
  status: GameStatus;
  winnerOrder: string[]; // userIds in finish order
}

// ── Room ──────────────────────────────────────────────────────────────────────

export type RoomType = 'public' | 'private';
export type RoomStatus = 'waiting' | 'in_game' | 'finished';

export interface Room {
  id: string;
  code: string; // 6-char join code
  hostId: string;
  maxPlayers: 2 | 3 | 4;
  type: RoomType;
  status: RoomStatus;
  createdAt: string; // ISO 8601
}

export interface RoomPlayer {
  roomId: string;
  userId: string;
  color: Color;
  isReady: boolean;
  seatOrder: number;
  joinedAt: string; // ISO 8601
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  gamesPlayed: number;
  wins: number;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  roomId: string;
  userId: string;
  body: string;
  createdAt: string; // ISO 8601
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

/** Human-readable label for each colour. */
export const PlayerColor: Record<Color, string> = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
};

/** Tailwind bg class per colour (safe-listed). */
export const COLOR_BG: Record<Color, string> = {
  red: 'bg-ludo-red',
  green: 'bg-ludo-green',
  yellow: 'bg-ludo-yellow',
  blue: 'bg-ludo-blue',
};

/** Tailwind text class per colour. */
export const COLOR_TEXT: Record<Color, string> = {
  red: 'text-ludo-red',
  green: 'text-ludo-green',
  yellow: 'text-ludo-yellow',
  blue: 'text-ludo-blue',
};

// ── Board constants ────────────────────────────────────────────────────────────

/**
 * Global board squares where tokens cannot be captured.
 */
export const SAFE_SQUARES: number[] = [0, 8, 13, 21, 26, 34, 39, 47];

/**
 * The global square index where each colour's token enters the board
 * after leaving the home zone.
 */
export const START_INDICES: Record<Color, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};
