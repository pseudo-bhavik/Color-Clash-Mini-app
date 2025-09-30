/*
  # Create user profiles table for Color Clash

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `wallet_address` (text, unique, not null)
      - `farcaster_fid` (text, optional)
      - `username` (text, optional)
      - `total_games` (integer, default 0)
      - `total_wins` (integer, default 0)
      - `total_tokens_won` (bigint, default 0)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `user_profiles` table
    - Add policy for users to read/update their own profile
    - Add policy for public read access to leaderboard data

  3. Indexes
    - Index on wallet_address for fast lookups
    - Index on total_tokens_won for leaderboard queries
*/

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text UNIQUE NOT NULL,
  farcaster_fid text,
  username text,
  total_games integer DEFAULT 0,
  total_wins integer DEFAULT 0,
  total_tokens_won bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public read access for leaderboard"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_wallet_address 
  ON user_profiles(wallet_address);

CREATE INDEX IF NOT EXISTS idx_user_profiles_tokens_won 
  ON user_profiles(total_tokens_won DESC);

CREATE INDEX IF NOT EXISTS idx_user_profiles_total_wins 
  ON user_profiles(total_wins DESC);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();