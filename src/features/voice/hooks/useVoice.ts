import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UseVoiceOptions {
  roomId: string;
  userId: string;
  participants: { userId: string }[];
}

export interface UseVoiceReturn {
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  muteRemote: (peerId: string) => void;
  unmuteRemote: (peerId: string) => void;
  isMuted: boolean;
  localMutes: Set<string>;
  remoteStreams: Map<string, MediaStream>;
  isConnected: boolean;
  localStream: MediaStream | null;
}

// ── ICE configuration ──────────────────────────────────────────────────────────

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;

  if (turnUrl && turnUsername && turnCredential) {
    servers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
  }

  return servers;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useVoice({ roomId, userId, participants }: UseVoiceOptions): UseVoiceReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [, setPeers] = useState<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [localMutes, setLocalMutes] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  // Refs hold mutable state that event callbacks need without triggering re-renders.
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Map of peerId → <audio> element for volume control.
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      channelRef.current?.send({ type: 'broadcast', event, payload });
    },
    [],
  );

  const createPeerConnection = useCallback(
    (peerId: string, isInitiator: boolean): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

      // Add local tracks.
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Remote stream handling.
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;

        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerId, stream);
          return next;
        });

        // Attach to hidden <audio> element so we can control volume.
        let el = audioElementsRef.current.get(peerId);
        if (!el) {
          el = document.createElement('audio');
          el.autoplay = true;
          el.setAttribute('playsinline', 'true');
          document.body.appendChild(el);
          audioElementsRef.current.set(peerId, el);
        }
        el.srcObject = stream;
      };

      // ICE candidate forwarding.
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          broadcast('webrtc:ice', { peerId: userId, targetId: peerId, candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
        } else if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          // Clean up peer on failure.
          peersRef.current.delete(peerId);
          setPeers((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
          const el = audioElementsRef.current.get(peerId);
          if (el) {
            el.remove();
            audioElementsRef.current.delete(peerId);
          }
        }
      };

      // Initiator creates offer.
      if (isInitiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (pc.localDescription) {
              broadcast('webrtc:offer', {
                peerId: userId,
                targetId: peerId,
                sdp: pc.localDescription,
              });
            }
          })
          .catch(console.error);
      }

      peersRef.current.set(peerId, pc);
      setPeers((prev) => new Map(prev).set(peerId, pc));
      return pc;
    },
    [broadcast, userId],
  );

  // ── connect ──────────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    localStreamRef.current = stream;
    setLocalStream(stream);

    // Subscribe to signalling channel.
    const channel = supabase.channel(`voice:${roomId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'webrtc:offer' }, async ({ payload }) => {
        const { peerId, targetId, sdp } = payload as {
          peerId: string;
          targetId: string;
          sdp: RTCSessionDescriptionInit;
        };
        if (targetId !== userId) return;
        if (peersRef.current.has(peerId)) return;

        const pc = createPeerConnection(peerId, false);
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        broadcast('webrtc:answer', { peerId: userId, targetId: peerId, sdp: pc.localDescription });
      })
      .on('broadcast', { event: 'webrtc:answer' }, async ({ payload }) => {
        const { peerId, targetId, sdp } = payload as {
          peerId: string;
          targetId: string;
          sdp: RTCSessionDescriptionInit;
        };
        if (targetId !== userId) return;
        const pc = peersRef.current.get(peerId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      })
      .on('broadcast', { event: 'webrtc:ice' }, async ({ payload }) => {
        const { peerId, targetId, candidate } = payload as {
          peerId: string;
          targetId: string;
          candidate: RTCIceCandidateInit;
        };
        if (targetId !== userId) return;
        const pc = peersRef.current.get(peerId);
        if (pc) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      })
      .subscribe();

    // Initiate connections to peers with lexicographically smaller userIds.
    for (const participant of participants) {
      if (participant.userId !== userId && userId < participant.userId) {
        createPeerConnection(participant.userId, true);
      }
    }
  }, [roomId, userId, participants, createPeerConnection, broadcast]);

  // ── disconnect ───────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    // Stop local tracks.
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);

    // Close all peer connections.
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setPeers(new Map());
    setRemoteStreams(new Map());

    // Remove hidden audio elements.
    audioElementsRef.current.forEach((el) => el.remove());
    audioElementsRef.current.clear();

    // Unsubscribe from signalling channel.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // ── toggleMute ───────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  // ── muteRemote / unmuteRemote ─────────────────────────────────────────────────

  const muteRemote = useCallback((peerId: string) => {
    const el = audioElementsRef.current.get(peerId);
    if (el) el.volume = 0;
    setLocalMutes((prev) => new Set(prev).add(peerId));
  }, []);

  const unmuteRemote = useCallback((peerId: string) => {
    const el = audioElementsRef.current.get(peerId);
    if (el) el.volume = 1;
    setLocalMutes((prev) => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    connect,
    disconnect,
    toggleMute,
    muteRemote,
    unmuteRemote,
    isMuted,
    localMutes,
    remoteStreams,
    isConnected,
    localStream,
  };
}
