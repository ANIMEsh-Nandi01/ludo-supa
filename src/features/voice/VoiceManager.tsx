import React, { createContext, useContext, useMemo } from 'react';
import type { Color } from '@/types/game';
import { useVoice, type UseVoiceOptions, type UseVoiceReturn } from './hooks/useVoice';

interface Participant {
  userId: string;
  displayName: string;
  color: Color;
}

interface VoiceManagerProps {
  children: React.ReactNode;
  roomId?: string;
  userId?: string;
  participants?: Participant[];
}

const VoiceContext = createContext<UseVoiceReturn | null>(null);

export function VoiceManager({
  children,
  roomId = '',
  userId = '',
  participants = [],
}: VoiceManagerProps) {
  const options: UseVoiceOptions = useMemo(
    () => ({
      roomId,
      userId,
      participants,
    }),
    [roomId, userId, participants]
  );

  const voice = useVoice(options);

  return <VoiceContext.Provider value={voice}>{children}</VoiceContext.Provider>;
}

export function useVoiceContext(): UseVoiceReturn {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error('useVoiceContext must be used within a VoiceManager');
  }
  return ctx;
}

