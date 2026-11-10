import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import type { Color } from '@/types/game';
import { Avatar } from '@/components/Avatar';
import { useVoice } from './hooks/useVoice';
import { useSpeaking } from './hooks/useSpeaking';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Participant {
  userId: string;
  displayName: string;
  color: Color;
}

export interface VoicePanelProps {
  roomId: string;
  userId: string;
  participants: Participant[];
}

// ── Sub-component: remote participant row ─────────────────────────────────────

function RemoteRow({
  participant,
  stream,
  isMuted,
  onMute,
  onUnmute,
}: {
  participant: Participant;
  stream: MediaStream | undefined;
  isMuted: boolean;
  onMute: () => void;
  onUnmute: () => void;
}) {
  const isSpeaking = useSpeaking(stream ?? null);

  return (
    <div className="flex items-center gap-2 py-1">
      <Avatar
        displayName={participant.displayName}
        color={participant.color}
        size="sm"
        isSpeaking={isSpeaking}
      />
      <span className="flex-1 text-sm text-gray-200 truncate">{participant.displayName}</span>
      <button
        onClick={isMuted ? onUnmute : onMute}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? `Unmute ${participant.displayName}` : `Mute ${participant.displayName}`}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4 text-gray-400" />
        ) : (
          <Volume2 className="h-4 w-4 text-gray-300" />
        )}
      </button>
    </div>
  );
}

// ── Hidden audio element ───────────────────────────────────────────────────────

function AudioOutput({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio ref={audioRef} autoPlay playsInline className="hidden" />
  );
}

// ── VoicePanel ────────────────────────────────────────────────────────────────

export function VoicePanel({ roomId, userId, participants }: VoicePanelProps) {
  const {
    connect,
    disconnect,
    toggleMute,
    muteRemote,
    unmuteRemote,
    isMuted,
    localMutes,
    remoteStreams,
    isConnected,
  } = useVoice({ roomId, userId, participants });

  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    try {
      setError(null);
      await connect();
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          setError('Microphone permission denied. Please allow mic access and try again.');
        } else if (e.message.includes('getUserMedia not supported')) {
          setError('Your browser does not support voice chat. You can still use text chat.');
        } else {
          setError('Could not connect to voice chat. Please try again.');
        }
      }
    }
  };

  const remoteParticipants = participants.filter((p) => p.userId !== userId);
  const me = participants.find((p) => p.userId === userId);

  return (
    <div className="rounded-xl bg-gray-800/80 p-3 flex flex-col gap-2 shadow-lg border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Voice Chat
        </span>
        {isConnected && (
          <button
            onClick={disconnect}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Leave
          </button>
        )}
      </div>

      {/* Error / browser support notice */}
      {error && (
        <p className="text-xs text-amber-400 bg-amber-400/10 rounded p-2">{error}</p>
      )}

      {!isConnected ? (
        <button
          onClick={handleJoin}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition-colors"
        >
          Join Voice
        </button>
      ) : (
        <>
          {/* My own row */}
          {me && (
            <div className="flex items-center gap-2 py-1 border-b border-white/10 pb-2">
              <Avatar
                displayName={me.displayName}
                color={me.color}
                size="sm"
                isSpeaking={false}
              />
              <span className="flex-1 text-sm text-white truncate font-medium">
                {me.displayName} <span className="text-gray-400 font-normal">(you)</span>
              </span>
              <button
                onClick={toggleMute}
                className={`p-1.5 rounded-full transition-colors ${
                  isMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title={isMuted ? 'Unmute mic' : 'Mute mic'}
                aria-label={isMuted ? 'Unmute mic' : 'Mute mic'}
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4 text-white" />
                ) : (
                  <Mic className="h-4 w-4 text-white" />
                )}
              </button>
            </div>
          )}

          {/* Remote participant rows */}
          {remoteParticipants.map((p) => (
            <RemoteRow
              key={p.userId}
              participant={p}
              stream={remoteStreams.get(p.userId)}
              isMuted={localMutes.has(p.userId)}
              onMute={() => muteRemote(p.userId)}
              onUnmute={() => unmuteRemote(p.userId)}
            />
          ))}

          {remoteParticipants.length === 0 && (
            <p className="text-xs text-gray-500 italic">Waiting for others to join voice…</p>
          )}
        </>
      )}

      {/* Hidden audio outputs for remote streams */}
      {Array.from(remoteStreams.entries()).map(([peerId, stream]) => (
        <AudioOutput key={peerId} stream={stream} />
      ))}
    </div>
  );
}
