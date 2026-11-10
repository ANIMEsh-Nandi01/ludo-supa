export {};

declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      VITE_TURN_URL: string;
      VITE_TURN_USERNAME: string;
      VITE_TURN_CREDENTIAL: string;
    };
  }
}
