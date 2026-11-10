import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth() {
  const { setSession, setProfile, signOut: storeSignOut } = useAuthStore();

  /**
   * Sign in anonymously with a guest display name.
   * Uses Supabase anonymous auth and upserts a minimal profile row.
   */
  const signInAsGuest = async (nickname: string) => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      if (error.message.toLowerCase().includes('anonymous')) {
        throw new Error(
          'Anonymous sign-ins are disabled in your Supabase project. You can enable them in Supabase Dashboard -> Authentication -> Sign In / Up -> Enable Anonymous sign-ins, or sign in using Email below.'
        );
      }
      throw error;
    }

    const user = data.session?.user;
    if (!user) throw new Error('No user returned from anonymous sign-in.');

    // Upsert display name into profiles table
    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: nickname,
      avatar_url: null,
      games_played: 0,
      wins: 0,
    });

    setSession(data.session);
    setProfile({
      id: user.id,
      displayName: nickname,
      avatarUrl: null,
      gamesPlayed: 0,
      wins: 0,
    });
  };

  /**
   * OAuth sign-in via Google. Redirects the browser to the Google consent page.
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/join`,
      },
    });
    if (error) {
      throw new Error(
        'Google OAuth is not enabled in your Supabase project. To enable it, configure your Google Client ID and Secret in Supabase Dashboard -> Authentication -> Providers -> Google.'
      );
    }
  };

  /**
   * Sign in with email + password.
   */
  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.session) setSession(data.session);
  };

  /**
   * Create a new account with email + password, then set a display name.
   */
  const signUpWithEmail = async (
    email: string,
    password: string,
    nickname: string,
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const user = data.session?.user ?? data.user;
    if (!user) throw new Error('No user returned from sign-up.');

    await supabase.from('profiles').upsert({
      id: user.id,
      display_name: nickname,
      avatar_url: null,
      games_played: 0,
      wins: 0,
    });

    if (data.session) {
      setSession(data.session);
      setProfile({
        id: user.id,
        displayName: nickname,
        avatarUrl: null,
        gamesPlayed: 0,
        wins: 0,
      });
    }
  };

  /**
   * Sign out the current user.
   */
  const signOut = async () => {
    await storeSignOut();
  };

  return {
    signInAsGuest,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };
}
