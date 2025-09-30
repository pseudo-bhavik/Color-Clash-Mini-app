import { RouletteReward, GameSettings } from '../types/game';

export const GAME_SETTINGS: GameSettings = {
  timer: 10,
  canvasWidth: 360,
  canvasHeight: 640,
  brushSize: 52,
  botSpeed: 8,
  powerUpDuration: 5000,
  powerUpSpawnInterval: 3000,
  dailyGameLimit: 50,
  botDifficulty: {
    minScore: 40,
    maxScore: 60,
    adaptiveSpeed: true,
    powerUpSeekChance: 0.6
  }
};

export const ROULETTE_REWARDS: RouletteReward[] = [
  { type: 'onChainToken', amount: 1000, label: '1K $CC', probability: 0.30 },
  { type: 'onChainToken', amount: 5000, label: '5K $CC', probability: 0.20 },
  { type: 'onChainToken', amount: 10000, label: '10K $CC', probability: 0.15 },
  { type: 'onChainToken', amount: 50000, label: '50K $CC', probability: 0.05 },
  { type: 'inGameCurrency', amount: 2, label: '+2 Keys', probability: 0.25 },
  { type: 'noReward', amount: 0, label: 'Try Again', probability: 0.05 },
];

// Contract addresses - update these with your deployed contract addresses
export const CONTRACT_ADDRESSES = {
  CC_TOKEN: import.meta.env.VITE_CC_TOKEN_ADDRESS || '0x1234567890123456789012345678901234567890',
  REWARD_DISTRIBUTOR: import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS || '0x2345678901234567890123456789012345678901',
  SCORE_RECORDER: import.meta.env.VITE_SCORE_RECORDER_ADDRESS || '0x3456789012345678901234567890123456789012',
};

// Validate critical environment variables
if (!import.meta.env.VITE_CC_TOKEN_ADDRESS) {
  console.warn('⚠️  VITE_CC_TOKEN_ADDRESS not set - using placeholder address');
}
if (!import.meta.env.VITE_REWARD_DISTRIBUTOR_ADDRESS) {
  console.warn('⚠️  VITE_REWARD_DISTRIBUTOR_ADDRESS not set - using placeholder address');
}
if (!import.meta.env.VITE_SCORE_RECORDER_ADDRESS) {
  console.warn('⚠️  VITE_SCORE_RECORDER_ADDRESS not set - using placeholder address');
}
// Bot Difficulty Presets - Easy to configure different difficulty levels
export const BOT_DIFFICULTY_PRESETS = {
  EASY: {
    minScore: 20,
    maxScore: 40,
    adaptiveSpeed: true,
    powerUpSeekChance: 0.3
  },
  MEDIUM: {
    minScore: 40,
    maxScore: 60,
    adaptiveSpeed: true,
    powerUpSeekChance: 0.6
  },
  HARD: {
    minScore: 60,
    maxScore: 80,
    adaptiveSpeed: true,
    powerUpSeekChance: 0.8
  },
  EXPERT: {
    minScore: 70,
    maxScore: 90,
    adaptiveSpeed: true,
    powerUpSeekChance: 0.9
  }
};

// Contract ABIs - these would be generated from your compiled contracts
export const CONTRACT_ABIS = {
  REWARD_DISTRIBUTOR: [
    "function distributeReward(address recipient, string memory playerName, uint256 amount) external",
    "function getContractBalance() external view returns (uint256)",
    "event RewardDistributed(address indexed recipient, string playerName, uint256 amount)"
  ],
  SCORE_RECORDER: [
    "function recordScore(uint256 score, string memory playerName) external",
    "event ScoreRecorded(address indexed player, string playerName, uint256 score, uint256 timestamp, uint256 gameNumber)"
  ],
  ERC20: [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
  ],
};