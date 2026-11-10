import React, { useState, useRef, useEffect } from 'react';
import { Send, Flag } from 'lucide-react';
import type { Color } from '@/types/game';
import { Avatar } from '@/components/Avatar';
import { useChat } from './hooks/useChat';
import { EmojiBar } from './EmojiBar';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { supabase } from '@/lib/supabase';

interface Participant {
  userId: string;
  displayName: string;
  color: Color;
}

interface ChatPanelProps {
  roomId: string;
  participants: Participant[];
}

export function ChatPanel({ roomId, participants }: ChatPanelProps) {
  const { messages, sendMessage, isLoading } = useChat(roomId);
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [reportedMsgIds, setReportedMsgIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = useAuthStore((s) => s.session?.user?.id);

  const participantMap = new Map(participants.map((p) => [p.userId, p]));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend ?? inputText;
    if (!text.trim()) return;

    try {
      setSendError(null);
      await sendMessage(text);
      if (!textToSend) {
        setInputText('');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSendError(err.message);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleReport = async (msgId: string, reportedUserId: string) => {
    if (reportedMsgIds.has(msgId) || !currentUserId) return;
    try {
      await supabase.from('reports').insert({
        reporter_id: currentUserId,
        reported_id: reportedUserId,
        type: 'text',
        reason: `Reported message ID: ${msgId}`,
      });
      setReportedMsgIds((prev) => new Set(prev).add(msgId));
    } catch {
      // Ignored
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-gray-900/90 border border-white/10 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-gray-900/50 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Room Chat</h3>
        <span className="text-xs text-gray-500">{messages.length} messages</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[160px] max-h-[360px]">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-500">
            Loading chat...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-gray-500 italic py-6">
            Say hi to everyone! 👋
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            const p = participantMap.get(msg.userId);
            const displayName = p?.displayName || msg.profiles?.display_name || 'Player';
            const color = p?.color;
            const isReported = reportedMsgIds.has(msg.id);

            return (
              <div
                key={msg.id}
                className={`group flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <Avatar
                  displayName={displayName}
                  size="sm"
                  color={color}
                  src={msg.profiles?.avatar_url || undefined}
                />
                <div
                  className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <span
                      className={`text-[11px] font-medium ${
                        color === 'red'
                          ? 'text-red-400'
                          : color === 'green'
                          ? 'text-green-400'
                          : color === 'yellow'
                          ? 'text-yellow-400'
                          : color === 'blue'
                          ? 'text-blue-400'
                          : 'text-gray-300'
                      }`}
                    >
                      {isMe ? 'You' : displayName}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {!isMe && (
                      <button
                        onClick={() => handleReport(msg.id, msg.userId)}
                        disabled={isReported}
                        title={isReported ? 'Reported' : 'Report message'}
                        className={`opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-opacity ${
                          isReported ? 'text-red-400 opacity-100' : 'text-gray-500 hover:text-red-400'
                        }`}
                      >
                        <Flag className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm break-words shadow-sm ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-gray-800 text-gray-100 rounded-tl-none border border-white/5'
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji bar */}
      <div className="px-3 pt-2 bg-gray-950/40 border-t border-white/5">
        <EmojiBar onSelect={(emoji) => void handleSend(emoji)} />
      </div>

      {/* Input row */}
      <div className="p-3 bg-gray-950/60 flex flex-col gap-1.5">
        {sendError && (
          <div className="text-[11px] text-red-400 px-1 font-medium">{sendError}</div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={500}
            className="flex-1 bg-gray-800/90 text-sm text-white placeholder-gray-500 px-3.5 py-2 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors active:scale-95 shadow-md"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

