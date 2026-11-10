import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export function useRoomPresence(roomId: string) {
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const user = useAuthStore((s) => s.session?.user);

  useEffect(() => {
    if (!roomId || !user?.id) return;

    const channel = supabase.channel(`presence:${roomId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: user.id,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, user?.id]);

  return { onlineUserIds };
}

