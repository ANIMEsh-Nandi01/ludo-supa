import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, User, Chrome } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/hooks/useAuth';

type Tab = 'guest' | 'google' | 'email';
type EmailMode = 'signin' | 'signup';

export function LoginPage() {
  const navigate = useNavigate();
  const { signInAsGuest, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('guest');
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');

  // Guest fields
  const [guestName, setGuestName] = useState('');

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = async (fn: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fn();
      navigate('/join', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'guest', label: 'Guest', icon: <User className="h-4 w-4" /> },
    { id: 'google', label: 'Google', icon: <Chrome className="h-4 w-4" /> },
    { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-bold text-gray-100">
          Sign In
        </h1>

        {/* Tab bar */}
        <div className="mb-6 flex rounded-xl bg-gray-900 p-1 ring-1 ring-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Guest tab */}
        {activeTab === 'guest' && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="guest-name"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Display Name
              </label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter a nickname…"
                maxLength={24}
                className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              disabled={guestName.trim().length < 2}
              onClick={() => wrap(() => signInAsGuest(guestName.trim()))}
            >
              Play as Guest
            </Button>
          </div>
        )}

        {/* Google tab */}
        {activeTab === 'google' && (
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            onClick={() => wrap(signInWithGoogle)}
          >
            Continue with Google
          </Button>
        )}

        {/* Email tab */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            {emailMode === 'signup' && (
              <div>
                <label
                  htmlFor="nickname"
                  className="mb-1.5 block text-sm font-medium text-gray-300"
                >
                  Display Name
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your nickname"
                  maxLength={24}
                  className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              disabled={!email || password.length < 6}
              onClick={() =>
                wrap(() =>
                  emailMode === 'signin'
                    ? signInWithEmail(email, password)
                    : signUpWithEmail(email, password, nickname.trim()),
                )
              }
            >
              {emailMode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>

            <button
              className="w-full text-center text-sm text-gray-500 hover:text-gray-300"
              onClick={() =>
                setEmailMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              }
            >
              {emailMode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
