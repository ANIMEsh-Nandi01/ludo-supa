import { create } from 'zustand';
import type { Color, GameState, RoomPlayer } from '@/types/game';

interface GameStore {
  gameState: GameState | null;
  roomPlayers: RoomPlayer[];
  myColor: Color | null;
  selectedTokenIndex: number | null;
  movableTokens: number[];
  isRolling: boolean;
  diceValue: number | null;
  animatingTokens: Set<number>;

  setGameState: (state: GameState) => void;
  setRoomPlayers: (players: RoomPlayer[]) => void;
  setMyColor: (color: Color) => void;
  setMovableTokens: (tokens: number[]) => void;
  setSelectedToken: (idx: number | null) => void;
  setIsRolling: (v: boolean) => void;
  setDiceValue: (v: number | null) => void;
  addAnimatingToken: (idx: number) => void;
  removeAnimatingToken: (idx: number) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  gameState: null,
  roomPlayers: [],
  myColor: null,
  selectedTokenIndex: null,
  movableTokens: [],
  isRolling: false,
  diceValue: null,
  animatingTokens: new Set<number>(),

  // ── Setters ────────────────────────────────────────────────────────────────
  setGameState: (state) => set({ gameState: state }),

  setRoomPlayers: (players) => set({ roomPlayers: players }),

  setMyColor: (color) => set({ myColor: color }),

  setMovableTokens: (tokens) => set({ movableTokens: tokens }),

  setSelectedToken: (idx) => set({ selectedTokenIndex: idx }),

  setIsRolling: (v) => set({ isRolling: v }),

  setDiceValue: (v) => set({ diceValue: v }),

  addAnimatingToken: (idx) =>
    set((s) => {
      const next = new Set(s.animatingTokens);
      next.add(idx);
      return { animatingTokens: next };
    }),

  removeAnimatingToken: (idx) =>
    set((s) => {
      const next = new Set(s.animatingTokens);
      next.delete(idx);
      return { animatingTokens: next };
    }),
}));
