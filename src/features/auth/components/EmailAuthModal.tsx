import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';

export interface EmailAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EmailAuthModal({ isOpen, onClose, onSuccess }: EmailAuthModalProps) {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        onSuccess?.();
        onClose();
      } else {
        await signUpWithEmail(email.trim(), password, nickname.trim() || 'Player');
        setSuccessMsg(
          'Account registered! If confirmation is required, check your email. Otherwise you are ready to play.'
        );
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setError(null);
    setSuccessMsg(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'signin' ? 'Sign In with Email' : 'Create an Account'}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-300">
              Display Name
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. CoolPlayer42"
              maxLength={24}
              className="w-full rounded-xl bg-gray-800/90 border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-300">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl bg-gray-800/90 border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full rounded-xl bg-gray-800/90 border border-white/10 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-400 font-medium">
            {error}
          </p>
        )}

        {successMsg && (
          <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 text-xs text-emerald-300 font-medium">
            {successMsg}
          </p>
        )}

        <div className="flex gap-3 pt-2">
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
            className="flex-1 font-bold shadow-lg shadow-blue-500/20"
            isLoading={isLoading}
          >
            {mode === 'signin' ? 'Sign In' : 'Register'}
          </Button>
        </div>

        <div className="pt-2 text-center text-xs text-gray-400">
          {mode === 'signin' ? (
            <span>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="font-semibold text-blue-400 hover:text-blue-300 underline"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="font-semibold text-blue-400 hover:text-blue-300 underline"
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </form>
    </Modal>
  );
}

