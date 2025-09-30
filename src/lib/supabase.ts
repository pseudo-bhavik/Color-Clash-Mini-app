import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Types for our authentication
export interface UserProfile {
  id: string;
  wallet_address: string;
  farcaster_fid?: string;
  username?: string;
  total_games: number;
  total_wins: number;
  total_tokens_won: number;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: {
    id: string;
    wallet_address: string;
  };
  access_token: string;
  refresh_token: string;
}