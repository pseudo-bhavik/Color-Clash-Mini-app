/*
  # Create game sessions table for Color Clash

  1. New Tables
    - `game_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `player_score` (integer, not null)
      - `bot_score` (integer, not null)
      - `winner` (text, not null)
      - `game_duration` (integer, default 15)
      - `power_ups_collected` (integer, default 0)
      - `tokens_earned` (integer, default 0)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `game_sessions` table
    - Add policy for users to read their own sessions
    - Add policy for users to insert their own sessions
    - Add policy for public read access to aggregate stats

  3. Indexes
    - Index on user_id for user session queries
    - Index on created_at for recent games
    - Index on winner for win/loss stats
*/

-- Create game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  player_score integer NOT NULL CHECK (player_score >= 0 AND player_score <= 100),
  bot_score integer NOT NULL CHECK (bot_score >= 0 AND bot_score <= 100),
  winner text NOT NULL CHECK (winner IN ('player', 'bot', 'draw')),
  game_duration integer DEFAULT 15,
  power_ups_collected integer DEFAULT 0,
  tokens_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own game sessions"
  ON game_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own game sessions"
  ON game_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read access for aggregate stats"
  ON game_sessions
  FOR SELECT
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id 
  ON game_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at 
  ON game_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_sessions_winner 
  ON game_sessions(winner);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_created 
  ON game_sessions(user_id, created_at DESC);