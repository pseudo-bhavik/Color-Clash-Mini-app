# Color Clash - Farcaster Mini-App

A competitive painting game where players battle against an AI bot to cover the most canvas area within 15 seconds. Built as a Farcaster Mini-App with blockchain integration and token rewards.
//hellooooo
## 🎮 Game Features

### Core Gameplay
- **Player vs Bot**: Competitive painting with intelligent AI opponent
- **15-Second Matches**: Fast-paced, intense gameplay sessions  
- **Power-ups**: Three unique power-ups that significantly impact gameplay:
  - ⚡ **Speed Up**: Massively increases brush movement speed
  - 💥 **Paint Splat**: Creates large circular explosion of paint
  - 🔍 **Enlarge**: Doubles brush size for wider coverage

### Reward System
- **Game Tokens**: Off-chain currency earned for wins/draws
- **$CC Tokens**: On-chain ERC20 rewards distributed via smart contracts
- **Roulette Wheel**: Spin with Game Tokens to win $CC rewards

### Blockchain Integration
- **Arbitrum Network**: All on-chain interactions on Arbitrum
- **Wallet Connection**: MetaMask and other Web3 wallet support
- **Score Recording**: Optional on-chain score storage
- **Farcaster Sharing**: Share wins and rewards on Farcaster

## 🎨 Design Specifications

### Color Palette
- Background: `#D8CFAF` (Beige)
- Player: `#E86A5D` (Orange-Red)
- Bot: `#3DB4D8` (Cyan-Blue)
- UI Elements: `#FFFFFF` (White)
- Outlines: `#333333` (Dark Gray)

### Visual Style
- Mobile portrait aspect ratio (9:16)
- Bold, rounded typography
- Textured paint strokes with defined edges
- Clean UI with consistent spacing and shadows

## 🚀 Getting Started

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Smart Contract Deployment

The project includes two Solidity contracts:

1. **RewardDistributor.sol**: Manages $CC token distribution
2. **ScoreRecorder.sol**: Records player scores on-chain

Deploy these contracts to Arbitrum before configuring the frontend.

## 🛠 Configuration

### Roulette Rewards
Edit the `ROULETTE_REWARDS` array in `src/components/RouletteScreen.tsx`:

```typescript
const ROULETTE_REWARDS: RouletteReward[] = [
  { type: 'onChainToken', amount: 1000, label: '1000 $CC', probability: 0.3 },
  { type: 'onChainToken', amount: 5000, label: '5000 $CC', probability: 0.2 },
  // ... customize amounts and probabilities
];
```

### Contract Addresses
Update contract addresses in your environment variables:
- `VITE_CC_TOKEN_ADDRESS`: Address of the $CC ERC20 token
- `VITE_REWARD_DISTRIBUTOR_ADDRESS`: Address of RewardDistributor contract
- `VITE_SCORE_RECORDER_ADDRESS`: Address of ScoreRecorder contract

## 🎯 Game Mechanics

### Scoring System
- Real-time percentage calculation of canvas coverage
- Player wins with ≥50% coverage
- Draws award Game Tokens (same as wins)

### Power-up Mechanics
- Random spawn locations and intervals
- 8-second duration before expiration
- Significant gameplay impact for competitive balance

### Bot AI Behavior
- Semi-random movement patterns
- Active power-up seeking
- Strategic area coverage
- Attempts to paint over player areas

## 📱 Farcaster Integration

### Sharing Features
- Automatic cast composition for reward wins
- Pre-populated sharing text
- Direct Warpcast integration
- Community engagement features

### Mini-App Standards
- Optimized for Farcaster frame display
- Mobile-first responsive design
- Fast loading and smooth performance

## 🔗 Blockchain Features

### Token Economics
- Game Tokens: Earned through gameplay, used for roulette
- $CC Tokens: ERC20 rewards distributed via smart contracts
- Configurable reward probabilities and amounts

### Smart Contract Security
- OpenZeppelin libraries for security
- ReentrancyGuard protection
- Owner-only administrative functions
- Emergency withdrawal capabilities

## 🎉 Production Ready

This implementation includes:
- ✅ Complete game mechanics with realistic physics
- ✅ Professional UI/UX design
- ✅ Blockchain integration ready
- ✅ Smart contracts with security best practices  
- ✅ Mobile-optimized responsive design
- ✅ Performance optimizations
- ✅ Error handling and edge cases
- ✅ TypeScript for type safety

## 📄 License

Built for Farcaster ecosystem - customize and deploy as needed for your community.