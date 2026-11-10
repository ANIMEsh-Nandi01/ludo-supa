import React, { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful guest sign-in. */
  onSuccess?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function GuestModal({ isOpen, onClose, onSuccess }: GuestModalProps) {
  const { signInAsGuest } = useAuth();
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickname.trim();
    if (name.length < 2) {
      setError('Nickname must be at least 2 characters.');
      return;
    }
    if (name.length > 24) {
      setError('Nickname must be 24 characters or fewer.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await signInAsGuest(name);
      setNickname('');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setNickname('');
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Play as Guest">
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label
            htmlFor="guest-nickname"
            className="mb-1.5 block text-sm font-medium text-gray-300"
          >
            Your Nickname
          </label>
          <input
            id="guest-nickname"
            type="text"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setError(null);
            }}
            placeholder="e.g. CoolPlayer42"
            maxLength={24}
            autoFocus
            className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && (
            <p className="mt-1.5 text-xs text-red-400">{error}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="flex-1"
            disabled={isLoading}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex-1"
            isLoading={isLoading}
            disabled={nickname.trim().length < 2}
          >
            Let's Play!
          </Button>
        </div>
      </form>
    </Modal>
  );
}
