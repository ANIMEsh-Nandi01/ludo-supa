import { useState, useEffect, useRef, useCallback } from 'react';
import Filter from 'bad-words';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { Message } from '@/types/game';

interface ChatMessage extends Message {
  profiles?: {
    display_name: string;
    avatar_url: string | null;
  };
}

const filter = new Filter();

export function useChat(roomId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const session = useAuthStore((s) => s.session);

  // Rate limiting: keep timestamps of last 5 sent messages
  const sendTimestampsRef = useRef<number[]>([]);

  // 1. Initial load
  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;

    async function fetchMessages() {
      setIsLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('messages')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (isMounted) {
        if (err) {
          setError(err.message);
        } else if (data) {
          setMessages(data as unknown as ChatMessage[]);
        }
        setIsLoading(false);
      }
    }

    void fetchMessages();

    // 2. Realtime subscription for incoming messages
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          // Fetch profile details for the author
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', newMsg.userId || (newMsg as unknown as { user_id: string }).user_id)
            .single();

          const fullMsg: ChatMessage = {
            id: newMsg.id,
            roomId: newMsg.roomId || (newMsg as unknown as { room_id: string }).room_id,
            userId: newMsg.userId || (newMsg as unknown as { user_id: string }).user_id,
            body: newMsg.body,
            createdAt: newMsg.createdAt || (newMsg as unknown as { created_at: string }).created_at,
            profiles: profileData || { display_name: 'Player', avatar_url: null },
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === fullMsg.id)) return prev;
            return [...prev, fullMsg];
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  // Send message handler with rate limit and profanity filter
  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !session?.user?.id || !roomId) return;

      const now = Date.now();
      // Remove timestamps older than 5 seconds
      sendTimestampsRef.current = sendTimestampsRef.current.filter((t) => now - t < 5000);
      if (sendTimestampsRef.current.length >= 5) {
        throw new Error('Rate limit exceeded: max 5 messages per 5 seconds.');
      }
      sendTimestampsRef.current.push(now);

      // Clean profanity
      let cleanBody = trimmed;
      try {
        cleanBody = filter.clean(trimmed);
      } catch {
        // Fallback if bad-words throws on special tokens
      }

      const { error: insertErr } = await supabase.from('messages').insert({
        room_id: roomId,
        user_id: session.user.id,
        body: cleanBody,
      });

      if (insertErr) {
        throw new Error(insertErr.message);
      }
    },
    [roomId, session?.user?.id]
  );

  return { messages, sendMessage, isLoading, error };
}

