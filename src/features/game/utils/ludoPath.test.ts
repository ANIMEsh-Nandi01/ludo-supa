import { describe, it, expect } from 'vitest';
import {
  COMMON_PATH,
  HOME_STRETCHES,
  BASE_COORDINATES,
  START_INDICES,
  SAFE_SQUARES,
  getAbsoluteTrackIndex,
  getTokenPixelCoords,
  isSafeSquare,
  CELL_SIZE,
} from './ludoPath';

describe('ludoPath utils', () => {
  it('should have correct start track indices for all 4 colors', () => {
    expect(START_INDICES.red).toBe(0);
    expect(START_INDICES.green).toBe(13);
    expect(START_INDICES.yellow).toBe(26);
    expect(START_INDICES.blue).toBe(39);
  });

  it('should have 52 common path coordinates', () => {
    expect(COMMON_PATH).toHaveLength(52);
  });

  it('should have 5 home stretch positions for each color', () => {
    expect(HOME_STRETCHES.red).toHaveLength(5);
    expect(HOME_STRETCHES.green).toHaveLength(5);
    expect(HOME_STRETCHES.yellow).toHaveLength(5);
    expect(HOME_STRETCHES.blue).toHaveLength(5);
  });

  it('should have 4 base positions for each color', () => {
    expect(BASE_COORDINATES.red).toHaveLength(4);
    expect(BASE_COORDINATES.green).toHaveLength(4);
    expect(BASE_COORDINATES.yellow).toHaveLength(4);
    expect(BASE_COORDINATES.blue).toHaveLength(4);
  });

  it('should correctly calculate absolute track index with offset', () => {
    // Red starts at 0
    expect(getAbsoluteTrackIndex('red', 0)).toBe(0);
    expect(getAbsoluteTrackIndex('red', 5)).toBe(5);

    // Green starts at 13
    expect(getAbsoluteTrackIndex('green', 0)).toBe(13);
    expect(getAbsoluteTrackIndex('green', 39)).toBe((13 + 39) % 52); // 0

    // Blue starts at 39
    expect(getAbsoluteTrackIndex('blue', 0)).toBe(39);
    expect(getAbsoluteTrackIndex('blue', 13)).toBe(0);
  });

  it('should identify safe squares accurately', () => {
    SAFE_SQUARES.forEach((sq) => {
      expect(isSafeSquare(sq)).toBe(true);
    });
    expect(isSafeSquare(1)).toBe(false);
    expect(isSafeSquare(7)).toBe(false);
  });

  it('should return pixel coordinates for yard, track, home stretch, and center home', () => {
    // Yard (step -1)
    const baseCoords = getTokenPixelCoords('red', -1, 0, CELL_SIZE);
    expect(baseCoords.x).toBeGreaterThan(0);
    expect(baseCoords.y).toBeGreaterThan(0);

    // Track (step 0)
    const trackCoords = getTokenPixelCoords('red', 0, 0, CELL_SIZE);
    expect(trackCoords.x).toBe(1 * CELL_SIZE + CELL_SIZE / 2);
    expect(trackCoords.y).toBe(6 * CELL_SIZE + CELL_SIZE / 2);

    // Home stretch (step 52)
    const homeStretchCoords = getTokenPixelCoords('red', 52, 0, CELL_SIZE);
    expect(homeStretchCoords.x).toBe(1 * CELL_SIZE + CELL_SIZE / 2);
    expect(homeStretchCoords.y).toBe(7 * CELL_SIZE + CELL_SIZE / 2);

    // Center home (step 57)
    const centerCoords = getTokenPixelCoords('red', 57, 0, CELL_SIZE);
    expect(centerCoords.x).toBe(7 * CELL_SIZE + CELL_SIZE / 2);
    expect(centerCoords.y).toBe(7 * CELL_SIZE + CELL_SIZE / 2);
  });
});

