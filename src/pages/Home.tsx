import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dices, Mail, User, Chrome, Hash, AlertTriangle, LogOut, ArrowRight } from 'lucide-react';
import { GuestModal } from '@/features/auth/components/GuestModal';
import { EmailAuthModal } from '@/features/auth/components/EmailAuthModal';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Avatar } from '@/components/Avatar';

export default function Home() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const { signInWithGoogle, signOut } = useAuth();

  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const displayName = profile?.displayName || session?.user?.user_metadata?.display_name || 'Player';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-8">
      {/* Container */}
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Logo / Header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/30 border border-white/10">
            <Dices className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mt-1">
            Ludo Supa
          </h1>
          <p className="text-sm font-medium text-gray-400">Real-time multiplayer with voice & text chat</p>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <div className="w-full mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{authError}</div>
          </div>
        )}

        {/* Action card: Logged-in state */}
        {session ? (
          <div className="w-full rounded-3xl bg-gray-900/90 border border-white/10 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-gray-800/60 border border-white/5">
              <Avatar displayName={displayName} size="md" color="blue" />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs text-gray-400 font-medium">Logged in as</span>
                <span className="text-base font-bold text-white truncate">{displayName}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/join')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-98"
            >
              Continue to Games
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => void signOut()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700/80 text-gray-300 hover:text-white font-semibold text-xs transition-all border border-white/5 active:scale-98"
            >
              <LogOut className="w-3.5 h-3.5 text-gray-400" />
              Sign Out / Switch Account
            </button>
          </div>
        ) : (
          /* Action card: Unauthenticated state */
          <div className="w-full rounded-3xl bg-gray-900/90 border border-white/10 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-3">
            <button
              onClick={() => {
                setAuthError(null);
                setShowGuestModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-500/25 active:scale-98"
            >
              <User className="w-4 h-4" />
              Play as Guest
            </button>

            <button
              onClick={() => {
                setAuthError(null);
                setShowEmailModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-800 hover:bg-gray-700/90 text-gray-200 font-semibold text-sm transition-all border border-white/5 active:scale-98"
            >
              <Mail className="w-4 h-4" />
              Sign In with Email
            </button>

            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gray-800/60 hover:bg-gray-800 text-gray-300 font-medium text-sm transition-all border border-white/5 active:scale-98 disabled:opacity-50"
            >
              <Chrome className="w-4 h-4" />
              {isGoogleLoading ? 'Connecting...' : 'Sign In with Google'}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-gray-900 px-2 text-gray-500 uppercase tracking-wider font-semibold text-[10px]">
                  or
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/join')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 text-gray-400 hover:text-white font-medium text-xs transition-colors"
            >
              <Hash className="w-3.5 h-3.5" />
              Enter Room Code Directly
            </button>
          </div>
        )}

        {/* Modals */}
        <GuestModal
          isOpen={showGuestModal}
          onClose={() => setShowGuestModal(false)}
          onSuccess={() => navigate('/join')}
        />

        <EmailAuthModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSuccess={() => navigate('/join')}
        />
      </div>
    </main>
  );
}
