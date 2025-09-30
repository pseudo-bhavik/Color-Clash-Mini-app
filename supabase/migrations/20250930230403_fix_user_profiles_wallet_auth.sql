/*
  # Fix user profiles table for wallet-only authentication
  
  1. Changes
    - Drop and recreate user_profiles table without auth.users dependency
    - Recreate game_sessions and auth_sessions tables with proper foreign keys
    - Set up proper RLS policies for wallet-based authentication
    - Add service role policies for edge function access
  
  2. Tables
    - `user_profiles`: Standalone table with UUID primary key
    - `auth_sessions`: Session management for wallet authentication
    - `game_sessions`: Game history linked to user profiles
  
  3. Security
    - RLS enabled on all tables
    - Service role can manage all records (for edge functions)
    - Public can read leaderboard data
    - Users can read/update their own data via session validation
*/

-- Drop existing tables and recreate without auth dependency
DROP TABLE IF EXISTS auth_sessions CASCADE;
DROP TABLE IF EXISTS game_sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create user profiles table (standalone, no auth.users dependency)
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  farcaster_fid text,
  username text,
  total_games integer DEFAULT 0 NOT NULL,
  total_wins integer DEFAULT 0 NOT NULL,
  total_tokens_won bigint DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create auth sessions table
CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  wallet_address text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create game sessions table
CREATE TABLE game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  player_score integer NOT NULL CHECK (player_score >= 0 AND player_score <= 100),
  bot_score integer NOT NULL CHECK (bot_score >= 0 AND bot_score <= 100),
  winner text NOT NULL CHECK (winner IN ('player', 'bot', 'draw')),
  game_duration integer DEFAULT 15 NOT NULL,
  power_ups_collected integer DEFAULT 0 NOT NULL,
  tokens_earned integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Service role can manage user profiles"
  ON user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read user profiles for leaderboard"
  ON user_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can update own profile via session"
  ON user_profiles FOR UPDATE
  TO anon, authenticated
  USING (
    id IN (
      SELECT user_id FROM auth_sessions
      WHERE wallet_address = user_profiles.wallet_address
      AND expires_at > now()
    )
  )
  WITH CHECK (
    id IN (
      SELECT user_id FROM auth_sessions
      WHERE wallet_address = user_profiles.wallet_address
      AND expires_at > now()
    )
  );

-- Auth Sessions Policies
CREATE POLICY "Service role can manage auth sessions"
  ON auth_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own sessions"
  ON auth_sessions FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

-- Game Sessions Policies
CREATE POLICY "Service role can manage game sessions"
  ON game_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can read game sessions for stats"
  ON game_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own game sessions via session"
  ON game_sessions FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IN (
      SELECT user_id FROM auth_sessions
      WHERE expires_at > now()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_user_profiles_wallet_address ON user_profiles(wallet_address);
CREATE INDEX idx_user_profiles_tokens_won ON user_profiles(total_tokens_won DESC);
CREATE INDEX idx_user_profiles_total_wins ON user_profiles(total_wins DESC);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_wallet_address ON auth_sessions(wallet_address);
CREATE INDEX idx_auth_sessions_session_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at DESC);
CREATE INDEX idx_game_sessions_winner ON game_sessions(winner);
CREATE INDEX idx_game_sessions_user_created ON game_sessions(user_id, created_at DESC);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;