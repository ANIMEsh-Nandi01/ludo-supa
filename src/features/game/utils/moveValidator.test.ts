import { describe, it, expect } from 'vitest';
import { getMovableTokens, getNewStep, getCaptureInfo } from './moveValidator';
import type { TokenState } from '@/types/game';

describe('moveValidator', () => {
  const mockPlayer: TokenState = {
    userId: 'user-1',
    color: 'red',
    tokens: [-1, 0, 55, 57],
  };

  it('allows moving out of yard only on a 6', () => {
    // With roll = 4
    const movableWith4 = getMovableTokens(mockPlayer, 4, [mockPlayer], 0);
    // Token 0 (-1) cannot move
    // Token 1 (0) -> 0+4 = 4 <= 57 -> can move
    // Token 2 (55) -> 55+4 = 59 > 57 -> overshoots, cannot move
    // Token 3 (57) -> already home, cannot move
    expect(movableWith4).toEqual([1]);

    // With roll = 6
    const movableWith6 = getMovableTokens(mockPlayer, 6, [mockPlayer], 0);
    // Token 0 can now enter
    // Token 1 can move
    expect(movableWith6).toEqual([0, 1]);
  });

  it('forfeits turn on 3 consecutive sixes', () => {
    const movable = getMovableTokens(mockPlayer, 6, [mockPlayer], 3);
    expect(movable).toEqual([]);
  });

  it('calculates new step correctly', () => {
    expect(getNewStep(-1, 6, 'red')).toBe(0);
    expect(getNewStep(10, 4, 'red')).toBe(14);
    expect(getNewStep(54, 3, 'red')).toBe(57);
  });

  it('detects captures on non-safe squares', () => {
    const opponent: TokenState = {
      userId: 'user-2',
      color: 'blue',
      tokens: [0, -1, -1, -1], // Blue token at step 0 (abs track 39)
    };

    // Red lands on absolute square 39 (not safe, 39 is blue start which is safe in Ludo! wait, let's check square 1)
    // Blue step 14 is abs (39 + 14) % 52 = 1. Square 1 is NOT safe.
    opponent.tokens[0] = 14;

    const captures = getCaptureInfo('red', 1, [mockPlayer, opponent]);
    expect(captures).toHaveLength(1);
    expect(captures[0]).toEqual({ userId: 'user-2', tokenIndex: 0 });
  });

  it('does NOT capture on safe squares', () => {
    const opponent: TokenState = {
      userId: 'user-2',
      color: 'blue',
      tokens: [13, -1, -1, -1], // abs (39+13)%52 = 0 (Red start square = safe)
    };

    const captures = getCaptureInfo('red', 0, [mockPlayer, opponent]);
    expect(captures).toHaveLength(0);
  });
});

