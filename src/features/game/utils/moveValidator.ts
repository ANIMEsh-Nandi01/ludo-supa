import type { Color, TokenState } from '@/types/game';
import { getAbsoluteTrackIndex, isSafeSquare } from './ludoPath';

// ── Move validator (client-side, non-authoritative) ─────────────────────────────

/**
 * Returns the array of token indices (0–3) that the current player can legally move
 * given the dice roll. This is used only for UI highlighting — the server enforces
 * the actual rules.
 *
 * Rules:
 *  - step === -1  → token is in yard; can only move out with a 6
 *  - step 0–56    → can move if step + roll <= 57 (won't overshoot)
 *  - step === 57  → already home, cannot move
 *  - consecutiveSixes >= 3 → no tokens can move (penalty)
 */
export function getMovableTokens(
  playerState: TokenState,
  roll: number,
  _allPlayers: TokenState[],
  consecutiveSixes: number,
): number[] {
  if (consecutiveSixes >= 3) return [];

  const movable: number[] = [];
  for (let i = 0; i < 4; i++) {
    const step = playerState.tokens[i];

    if (step === 57) continue; // already home

    if (step === -1) {
      // Can only leave yard on a 6
      if (roll === 6) movable.push(i);
      continue;
    }

    // On common path or home stretch — won't overshoot
    if (step + roll <= 57) {
      movable.push(i);
    }
  }

  return movable;
}

/**
 * Computes the new step value for a token after applying a roll.
 * Does NOT validate legality — call getMovableTokens first.
 */
export function getNewStep(currentStep: number, roll: number, _color: Color): number {
  if (currentStep === -1) {
    // Rolling a 6 enters the token at step 0
    return 0;
  }
  return Math.min(currentStep + roll, 57);
}

/**
 * Returns the list of tokens (by userId + tokenIndex) that would be captured if the
 * moving token lands on the given absolute track index.
 *
 * A capture happens when:
 *   - The landing square is NOT a safe square
 *   - Another player has a token on that square
 *   - That player is not the same color as movingColor
 */
export function getCaptureInfo(
  movingColor: Color,
  newAbsoluteIndex: number,
  allPlayers: TokenState[],
): { userId: string; tokenIndex: number }[] {
  if (isSafeSquare(newAbsoluteIndex)) return [];

  const captures: { userId: string; tokenIndex: number }[] = [];

  for (const player of allPlayers) {
    if (player.color === movingColor) continue;

    for (let i = 0; i < 4; i++) {
      const step = player.tokens[i];
      if (step === -1 || step > 51) continue; // not on common path

      const absIdx = getAbsoluteTrackIndex(player.color, step);
      if (absIdx === newAbsoluteIndex) {
        captures.push({ userId: player.userId, tokenIndex: i });
      }
    }
  }

  return captures;
}
