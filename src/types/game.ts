export type GameState = 'home' | 'playing' | 'postGame' | 'roulette';

export interface GameResult {
  playerScore: number;
  botScore: number;
  winner: 'player' | 'bot' | 'draw';
}

export interface PowerUp {
  id: string;
  type: 'speedUp' | 'paintSplat' | 'enlarge';
  x: number;
  y: number;
  collected: boolean;
  spawnTime: number;
}

export interface RouletteReward {
  type: 'onChainToken' | 'inGameCurrency' | 'noReward';
  amount: number;
  label: string;
  probability: number;
}

export interface BotDifficulty {
  minScore: number;      // Minimum target score percentage (0-100)
  maxScore: number;      // Maximum target score percentage (0-100)
  adaptiveSpeed: boolean; // Whether bot adjusts speed based on current performance
  powerUpSeekChance: number; // Probability (0-1) that bot will seek power-ups
}

export interface GameSettings {
  timer: number;
  canvasWidth: number;
  canvasHeight: number;
  brushSize: number;
  botSpeed: number;
  powerUpDuration: number;
  powerUpSpawnInterval: number;
  dailyGameLimit: number;
  botDifficulty: BotDifficulty;
}

export interface LeaderboardEntry {
  address: string;
  username?: string;
  farcasterFid?: string;
  totalTokensWon: number;
  gamesPlayed: number;
  lastPlayed: number;
}

export interface DailyGameData {
  date: string;
  gamesPlayed: number;
}