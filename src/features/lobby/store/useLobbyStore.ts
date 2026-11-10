import { create } from 'zustand';

interface LobbyState {
  currentRoomId: string | null;
  copySuccess: boolean;
  setCurrentRoomId: (roomId: string | null) => void;
  setCopySuccess: (success: boolean) => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  currentRoomId: null,
  copySuccess: false,
  setCurrentRoomId: (roomId) => set({ currentRoomId: roomId }),
  setCopySuccess: (success) => set({ copySuccess: success }),
}));

