import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, Coins } from 'lucide-react';
import { ROULETTE_REWARDS, CONTRACT_ADDRESSES, CONTRACT_ABIS } from '../config/gameConfig';
import { RouletteReward } from '../types/game';
import { getClaimSignature, claimRewardOnChain } from '../services/blockchainService';
import { useWallet } from '../hooks/useWallet';

interface ToastFunctions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

interface RouletteScreenProps {
  rouletteKeys: number;
  onSpendKeys: (amount: number) => void;
  onResult: (reward: RouletteReward) => void;
  onBack: () => void;
  walletAddress?: string;
  onUpdateLeaderboard?: (address: string, tokensWon: number, username?: string, farcasterFid?: string) => void;
  username?: string;
  farcasterFid?: string;
  showToast: ToastFunctions;
}

const RouletteScreen: React.FC<RouletteScreenProps> = ({
  rouletteKeys,
  onSpendKeys,
  onResult,
  onBack,
  walletAddress,
  onUpdateLeaderboard,
  username,
  farcasterFid,
  showToast,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastWin, setLastWin] = useState<RouletteReward | null>(null);
  const { signer } = useWallet();

  const getRandomReward = (): RouletteReward => {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const reward of ROULETTE_REWARDS) {
      cumulativeProbability += reward.probability;
      if (random <= cumulativeProbability) {
        return reward;
      }
    }

    return ROULETTE_REWARDS[ROULETTE_REWARDS.length - 1];
  };

  const handleClaimReward = async (rewardAmount: number) => {
    if (!walletAddress) {
      showToast.error('Please connect your wallet first');
      return;
    }

    if (!signer) {
      showToast.error('Wallet connection error. Please reconnect your wallet.');
      return;
    }

    try {
      const playerName = username || walletAddress.slice(0, 8);
      showToast.info('Getting claim authorization...');

      // First, get the signature from the backend
      const signatureResponse = await getClaimSignature({
        walletAddress,
        rewardAmount,
        playerName
      });

      if (!signatureResponse.success) {
        throw new Error(signatureResponse.error || 'Failed to get claim authorization');
      }

      showToast.info('Please confirm the transaction in your wallet...');

      // Then, claim the reward on-chain with user's wallet
      const claimResponse = await claimRewardOnChain({
        signer,
        recipient: walletAddress,
        amount: rewardAmount,
        nonce: signatureResponse.nonce!,
        signature: signatureResponse.signature!,
        contractAddress: CONTRACT_ADDRESSES.REWARD_DISTRIBUTOR
      });

      if (claimResponse.success) {
        showToast.success(`Successfully claimed ${rewardAmount} $CC tokens!`);
        console.log('Reward claimed:', claimResponse);
      } else {
        throw new Error(claimResponse.error || 'Failed to claim reward');
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('user rejected')) {
        showToast.warning('Transaction was cancelled by user.');
      } else if (errorMessage.includes('insufficient funds')) {
        showToast.error('Insufficient funds for gas fees.');
      } else if (errorMessage.includes('Insufficient contract balance') || errorMessage.includes('Insufficient tokens in reward pool')) {
        showToast.error('Not enough tokens in the reward pool. Please try again later.');
      } else if (errorMessage.includes('already been claimed')) {
        showToast.error('This reward has already been claimed.');
      } else {
        showToast.error(`Failed to claim reward: ${errorMessage}`);
      }
    }
  };

  const handleSpin = () => {
    if (rouletteKeys === 0 || isSpinning) return;

    setIsSpinning(true);
    onSpendKeys(1);

    // Calculate winning segment
    const winningReward = getRandomReward();
    setLastWin(winningReward);
    const segmentIndex = ROULETTE_REWARDS.findIndex(r => r.label === winningReward.label);
    const segmentAngle = 360 / ROULETTE_REWARDS.length;
    const targetAngle = segmentIndex * segmentAngle + (segmentAngle / 2);
    
    // Add multiple full rotations for effect
    const totalRotation = rotation + 2160 + (360 - targetAngle); // Spin clockwise to land on segment
    setRotation(totalRotation);

    // Complete spin after animation
    setTimeout(async () => {
      setIsSpinning(false);

      if (winningReward.type === 'onChainToken' && winningReward.amount > 0) {
        if (walletAddress) {
          await handleClaimReward(winningReward.amount);
        }
        if (walletAddress && onUpdateLeaderboard) {
          onUpdateLeaderboard(walletAddress, winningReward.amount, username, farcasterFid);
        }
      }

      onResult(winningReward);
    }, 4000);
  };

  const canSpin = rouletteKeys > 0 && !isSpinning;
  const needsWallet = !walletAddress;

  const segmentAngle = 360 / ROULETTE_REWARDS.length;

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Header */}
      <div className="absolute top-6 left-6">
        <button
          onClick={onBack}
          disabled={isSpinning}
          className="w-12 h-12 bg-white rounded-full border-3 border-[#333333] 
                     flex items-center justify-center shadow-lg hover:bg-gray-100
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft size={24} color="#333333" />
        </button>
      </div>

      <div className="absolute top-6 right-6">
        <div className="bg-white rounded-xl px-4 py-2 border-3 border-[#333333] shadow-lg">
          <p className="text-[#333333] text-lg font-black">
            Keys 🔑: {rouletteKeys}
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-[#333333] mb-2">PRIZE WHEEL</h1>
        <div className="flex items-center justify-center space-x-2">
          <Coins size={24} color="#FFD700" />
          <span className="text-lg font-bold text-[#333333]">Win $CC Tokens!</span>
          <Coins size={24} color="#FFD700" />
        </div>
      </div>

      {/* Roulette Wheel */}
      <div className="relative mb-12">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 z-20">
          {/* 3D Flipper/Pointer */}
          <div className="relative">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-16 
                           border-l-transparent border-r-transparent border-t-[#333333] 
                           drop-shadow-2xl"></div>
            {/* 3D highlight */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1
                           w-0 h-0 border-l-6 border-r-6 border-t-12 
                           border-l-transparent border-r-transparent border-t-gray-600"></div>
            {/* Shine effect */}
            <div className="absolute top-0 left-1/4 transform -translate-y-1
                           w-0 h-0 border-l-2 border-r-2 border-t-8 
                           border-l-transparent border-r-transparent border-t-white/40"></div>
          </div>
        </div>

        {/* Wheel */}
        <div 
          className="w-80 h-80 rounded-full border-8 border-[#333333] relative overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
            background: 'radial-gradient(circle at 30% 30%, #FFD700, #FFA500, #FF8C00)',
            boxShadow: `
              0 0 0 4px rgba(255, 215, 0, 0.3),
              0 20px 40px rgba(0, 0, 0, 0.4),
              inset 0 0 20px rgba(255, 255, 255, 0.2),
              inset 0 0 40px rgba(0, 0, 0, 0.1)
            `
          }}
        >
          {ROULETTE_REWARDS.map((reward, index) => {
            const startAngle = index * segmentAngle;
            const colors = [
              '#E86A5D', '#3DB4D8', '#10B981', '#F59E0B', 
              '#EF4444', '#8B5CF6', '#FF6B9D', '#00D4AA'
            ];
            
            return (
              <div
                key={index}
                className="absolute w-full h-full origin-center"
                style={{
                  transform: `rotate(${startAngle}deg)`,
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((segmentAngle * Math.PI) / 180)}% ${50 - 50 * Math.sin((segmentAngle * Math.PI) / 180)}%)`
                }}
              >
                <div 
                  className="w-full h-full relative border-r border-[#333333]/30"
                  style={{ 
                    background: `linear-gradient(135deg, ${colors[index % colors.length]}, ${colors[index % colors.length]}cc)`,
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
                  }}
                >
                  {/* Reward text positioned correctly */}
                  <div
                    className="absolute text-white font-black text-center leading-none"
                    style={{
                      top: '20%',
                      left: '50%',
                      transform: `translateX(-50%) rotate(-${startAngle}deg)`,
                      transformOrigin: 'center',
                      width: 'auto',
                      fontSize: '14px',
                      textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9)'
                    }}
                  >
                    <div className="bg-black/60 rounded-md px-2 py-1 backdrop-blur-sm
                                   border border-white/40 shadow-lg whitespace-nowrap">
                      {reward.label}
                    </div>
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent 
                                 transform rotate-12"></div>
                </div>
              </div>
            );
          })}
          
          {/* Center hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 
                         rounded-full border-6 border-[#333333] z-10
                         flex items-center justify-center"
               style={{
                 boxShadow: `
                   0 0 20px rgba(255, 215, 0, 0.6),
                   inset 0 0 10px rgba(255, 255, 255, 0.3),
                   inset 0 0 20px rgba(0, 0, 0, 0.1)
                 `
               }}>
            <Coins size={32} color="#333333" />
          </div>
        </div>
        
        {/* Wheel base shadow */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 
                       w-72 h-12 bg-black/30 rounded-full blur-lg"></div>
      </div>

      {/* Spin Button */}
      <button
        onClick={handleSpin}
        disabled={!canSpin}
        className="bg-gradient-to-b from-yellow-400 to-yellow-600 text-[#333333] text-xl 
                   font-black py-4 px-12 rounded-2xl border-4 border-[#333333] 
                   shadow-lg hover:from-yellow-300 hover:to-yellow-500
                   disabled:from-gray-400 disabled:to-gray-600 disabled:cursor-not-allowed
                   active:transform active:scale-95 transition-all duration-200
                   flex items-center space-x-3 min-w-[200px] justify-center"
      >
        <RotateCcw size={32} />
        <span>{isSpinning ? 'SPINNING...' : 'SPIN (1 Key 🔑)'}</span>
      </button>

      {needsWallet && (
        <p className="text-[#333333] text-center mt-4 opacity-70">
          Connect your wallet to claim token rewards!
        </p>
      )}
      
      {!needsWallet && rouletteKeys === 0 && (
        <p className="text-[#333333] text-center mt-4 opacity-70">
          Win games to earn keys for spinning!
        </p>
      )}
      
      {/* Spinning effects */}
      {isSpinning && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-96 h-96 border-4 border-yellow-400 rounded-full animate-ping opacity-75"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouletteScreen;