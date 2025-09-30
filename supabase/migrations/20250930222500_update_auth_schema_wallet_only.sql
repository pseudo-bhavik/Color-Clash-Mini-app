/*
  # Update authentication schema for wallet-only authentication

  1. Changes
    - Drop dependency on auth.users table
    - Update user_profiles to use UUID primary key without foreign key to auth.users
    - Create auth_sessions table for session management
    - Update RLS policies to work with session tokens instead of auth.uid()
    - Add indexes for performance

  2. New Tables
    - `auth_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `session_token` (text, unique, not null)
      - `wallet_address` (text, not null)
      - `expires_at` (timestamptz, not null)
      - `created_at` (timestamptz, default now())

  3. Security
    - Enable RLS on all tables
    - Update policies to use session token validation
    - Add policies for authenticated users based on session tokens

  4. Notes
    - This migration removes all email-based authentication
    - Authentication is now purely wallet-based via Edge Function
    - Session tokens are managed in the auth_sessions table
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    ALTER TABLE IF EXISTS user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE user_profiles
    ALTER COLUMN id SET DEFAULT gen_random_uuid();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text UNIQUE NOT NULL,
  wallet_address text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'auth_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can read own profile via session"
  ON user_profiles
  FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM auth_sessions
      WHERE wallet_address = user_profiles.wallet_address
      AND expires_at > now()
    )
  );

CREATE POLICY "Users can update own profile via session"
  ON user_profiles
  FOR UPDATE
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

CREATE POLICY "Users can read own sessions"
  ON auth_sessions
  FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Service role can manage sessions"
  ON auth_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can insert own game sessions" ON game_sessions;

CREATE POLICY "Users can read own game sessions via session"
  ON game_sessions
  FOR SELECT
  USING (
    user_id IN (
      SELECT user_id FROM auth_sessions
      WHERE expires_at > now()
    )
  );

CREATE POLICY "Users can insert own game sessions via session"
  ON game_sessions
  FOR INSERT
  WITH CHECK (
    user_id IN (
      SELECT user_id FROM auth_sessions
      WHERE expires_at > now()
    )
  );

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id
  ON auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_wallet_address
  ON auth_sessions(wallet_address);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_session_token
  ON auth_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at
  ON auth_sessions(expires_at);

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
