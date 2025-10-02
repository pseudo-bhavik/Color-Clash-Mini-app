import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, Coins } from 'lucide-react';

interface RouletteReward {
    label: string;
    probability: number;
    type: 'onChainToken' | 'inGame' | 'nothing';
    amount: number;
}


interface ToastFunctions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

interface RouletteScreenProps {
  rouletteRewards: RouletteReward[]; // Rewards are now passed as a prop
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

// Add mock rewards to be used as a fallback
const mockRewards: RouletteReward[] = [
    { label: '1K $CC', probability: 0.20, type: 'onChainToken', amount: 1000 },
    { label: '5K $CC', probability: 0.10, type: 'onChainToken', amount: 5000 },
    { label: '10K $CC', probability: 0.04, type: 'onChainToken', amount: 10000 },
    { label: '50K $CC', probability: 0.01, type: 'onChainToken', amount: 50000 },
    { label: '+2 Keys', probability: 0.25, type: 'inGame', amount: 2 },
    { label: 'Try Again', probability: 0.40, type: 'nothing', amount: 0 },
];

const RouletteScreen: React.FC<RouletteScreenProps> = ({
  rouletteRewards: rewardsFromProps,
  rouletteKeys,
  onSpendKeys,
  onResult,
  onBack,
  walletAddress,
  onUpdateLeaderboard,
  username,
  farcasterFid,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Use rewards from props if available, otherwise use mock data.
  // This prevents the component from getting stuck on a loading screen.
  const rouletteRewards = (rewardsFromProps && rewardsFromProps.length > 0) 
    ? rewardsFromProps 
    : mockRewards;
  
  // Add a console warning for developers when the fallback data is used.
  React.useEffect(() => {
      if (!rewardsFromProps || rewardsFromProps.length === 0) {
        console.warn("RouletteScreen: `rouletteRewards` prop is empty or not provided. Using mock data for display.");
      }
  }, [rewardsFromProps]);


  const getRandomReward = (): RouletteReward => {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const reward of rouletteRewards) {
      cumulativeProbability += reward.probability;
      if (random <= cumulativeProbability) {
        return reward;
      }
    }
    // Fallback to the last reward, should be rare
    return rouletteRewards[rouletteRewards.length - 1];
  };


  const handleSpin = () => {
    if (rouletteKeys === 0 || isSpinning) return;

    setIsSpinning(true);
    onSpendKeys(1);

    const winningReward = getRandomReward();
    const segmentIndex = rouletteRewards.findIndex(r => r.label === winningReward.label);
    const segmentAngle = 360 / rouletteRewards.length;
    const targetAngle = segmentIndex * segmentAngle + (segmentAngle / 2);
    
    const totalRotation = rotation + 2160 + (360 - targetAngle);
    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      if (winningReward.type === 'onChainToken' && winningReward.amount > 0) {
        if (walletAddress && onUpdateLeaderboard) {
          onUpdateLeaderboard(walletAddress, winningReward.amount, username, farcasterFid);
        }
      }
      onResult(winningReward);
    }, 4000);
  };

  const canSpin = rouletteKeys > 0 && !isSpinning;
  const needsWallet = !walletAddress;

  const segmentAngle = 360 / rouletteRewards.length;

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 relative bg-[#FDF6E3]">
      {/* Header */}
      <div className="absolute top-6 left-6">
        <button
          onClick={onBack}
          disabled={isSpinning}
          className="w-12 h-12 bg-white rounded-full border-2 border-[#333333] 
                       flex items-center justify-center shadow-lg hover:bg-gray-100
                       disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          <ArrowLeft size={24} color="#333333" />
        </button>
      </div>

      <div className="absolute top-6 right-6">
        <div className="bg-white rounded-xl px-4 py-2 border-2 border-[#333333] shadow-lg">
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
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 z-20 drop-shadow-lg">
           <div className="w-0 h-0 
             border-l-[15px] border-l-transparent
             border-r-[15px] border-r-transparent
             border-t-[30px] border-t-red-600"></div>
           <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-500" style={{top: '8px'}}></div>
        </div>

        {/* Wheel */}
        <div 
          className="w-80 h-80 rounded-full border-8 border-[#333333] relative overflow-hidden shadow-2xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
          }}
        >
          {rouletteRewards.map((reward, index) => {
            const startAngle = index * segmentAngle;
            const colors = [
              '#E86A5D', '#3DB4D8', '#10B981', '#F59E0B',
              '#EF4444', '#8B5CF6'
            ];

            const words = reward.label.split(' ');
            const fontSize = reward.label.length > 8 ? '12px' : reward.label.length > 5 ? '14px' : '16px';

            const segmentAngleRad = (segmentAngle * Math.PI) / 180;
            const clipPathX = 50 + 50 * Math.sin(segmentAngleRad);
            const clipPathY = 50 - 50 * Math.cos(segmentAngleRad);
            const clipPathValue = `polygon(50% 50%, 50% 0, ${clipPathX}% ${clipPathY}%)`;

            return (
              <div
                key={index}
                className="absolute w-full h-full origin-center"
                style={{
                  transform: `rotate(${startAngle}deg)`,
                  clipPath: clipPathValue,
                }}
              >
                <div
                  className="w-full h-full relative border-r border-black/10"
                  style={{ background: colors[index % colors.length] }}
                >
                  <div
                    className="absolute w-full h-1/2 top-0 left-0 flex items-start justify-center pointer-events-none"
                    style={{
                      transformOrigin: '50% 100%',
                      transform: `rotate(${segmentAngle / 2}deg)`,
                    }}
                  >
                    <div
                      className="text-center"
                      style={{
                        transform: 'translateY(20px)',
                        fontSize,
                        fontWeight: '900',
                        color: '#FFFFFF',
                        textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)',
                        WebkitTextStroke: '1px #333333',
                        letterSpacing: '0.5px',
                        lineHeight: '1.1',
                      }}
                    >
                      {words.map((word, wordIndex) => (
                        <span key={wordIndex} className="block">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Center hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                           w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 
                           rounded-full border-4 border-[#333333] z-10
                           flex items-center justify-center shadow-inner"
          >
            <Coins size={32} color="#333333" />
          </div>
        </div>
        
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-72 h-12 bg-black/20 rounded-full blur-lg"></div>
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
      
      {isSpinning && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-96 h-96 border-4 border-yellow-400 rounded-full animate-ping opacity-50"></div>
        </div>
      )}
    </div>
  );
};

export default RouletteScreen;


