import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/game';

// ── State shape ────────────────────────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => {
  // Subscribe to Supabase auth changes immediately on store creation
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ session });

    if (!session) {
      set({ profile: null });
      return;
    }

    // Fetch the user's profile row
    void supabase
      .from('profiles')
      .select('id, display_name, avatar_url, games_played, wins')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          set({
            profile: {
              id: data.id as string,
              displayName: data.display_name as string,
              avatarUrl: data.avatar_url as string | null,
              gamesPlayed: data.games_played as number,
              wins: data.wins as number,
            },
          });
        }
      });
  });

  return {
    session: null,
    profile: null,

    setSession: (session) => set({ session }),

    setProfile: (profile) => set({ profile }),

    signOut: async () => {
      await supabase.auth.signOut();
      set({ session: null, profile: null });
    },
  };
});
