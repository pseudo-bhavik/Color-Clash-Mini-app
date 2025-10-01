import React, { useState } from 'react';
import { Play, RotateCcw, Trophy, Wallet, Shield, Info, X } from 'lucide-react';
import { GAME_SETTINGS } from '../config/gameConfig';

interface HomeScreenProps {
  rouletteKeys: number;
  dailyGames: number;
  canPlayToday: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  onStartGame: () => void;
  onSpinRoulette: () => void;
  onShowLeaderboard: () => void;
  onConnectWallet: () => void;
  onAuthenticate: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({
  rouletteKeys,
  dailyGames,
  canPlayToday,
  isConnected,
  isAuthenticated,
  isAuthenticating,
  onStartGame,
  onSpinRoulette,
  onShowLeaderboard,
  onConnectWallet,
  onAuthenticate,
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const handleConnectWallet = async () => {
    try {
      await onConnectWallet();
    } catch (error) {
      console.error('Wallet connection failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('User rejected') || errorMessage.includes('user denied')) {
        console.log('User cancelled wallet connection');
      } else {
        alert(`Failed to connect wallet: ${errorMessage}\n\nPlease try again or check your wallet extension.`);
      }
    }
  };

  const handleAuthenticate = async () => {
    try {
      await onAuthenticate();
    } catch (error) {
      console.error('Authentication failed:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 relative">
      {/* Info Button */}
      <button
        onClick={() => setShowInfoModal(true)}
        className="absolute top-6 right-6 z-20 w-12 h-12 bg-white rounded-full border-3 border-[#333333]
                   flex items-center justify-center shadow-lg hover:bg-gray-100
                   active:transform active:scale-95 transition-all duration-200"
        aria-label="Game Information"
      >
        <Info size={24} color="#333333" />
      </button>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, #E86A5D 2px, transparent 2px),
                           radial-gradient(circle at 75px 75px, #3DB4D8 2px, transparent 2px)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>

      {/* Title */}
      <div className="text-center mb-12 z-10">
        <h1 className="text-6xl font-black text-[#333333] mb-2 drop-shadow-lg">
          COLOR
        </h1>
        <h1 className="text-6xl font-black text-[#333333] drop-shadow-lg">
          CLASH
        </h1>
        <div className="flex justify-center mt-4 space-x-2">
          <div className="w-8 h-8 bg-[#E86A5D] rounded-full border-4 border-[#333333]"></div>
          <div className="w-8 h-8 bg-[#3DB4D8] rounded-full border-4 border-[#333333]"></div>
        </div>
      </div>

      {/* Stats Display */}
      <div className="bg-white rounded-2xl px-6 py-4 mb-8 border-4 border-[#333333] shadow-lg z-10">
        <div className="text-center space-y-2">
          <p className="text-[#333333] text-xl">
            Roulette Keys 🔑: <span className="text-[#E86A5D] font-black">{rouletteKeys}</span>
          </p>
          <p className="text-[#333333] text-sm">
            Daily Games: <span className="text-[#3DB4D8] font-black">{dailyGames}/{GAME_SETTINGS.dailyGameLimit}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 w-full max-w-sm z-10">
        {!isConnected && (
          <button
            onClick={handleConnectWallet}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-2xl py-4 px-8 rounded-2xl
                       border-4 border-[#333333] shadow-lg hover:from-blue-700 hover:to-blue-800
                       active:transform active:scale-95 transition-all duration-200
                       flex items-center justify-center space-x-3"
          >
            <Wallet size={32} />
            <span>CONNECT WALLET</span>
          </button>
        )}

        {isConnected && !isAuthenticated && (
          <button
            onClick={handleAuthenticate}
            disabled={isAuthenticating}
            className={`w-full text-white text-2xl py-4 px-8 rounded-2xl
                       border-4 border-[#333333] shadow-lg
                       active:transform active:scale-95 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center space-x-3 relative overflow-hidden
                       ${isAuthenticating
                         ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                         : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                       }`}
          >
            {isAuthenticating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
            <Shield size={32} className={isAuthenticating ? 'animate-spin' : ''} />
            <span>{isAuthenticating ? 'SIGNING IN...' : 'SIGN IN'}</span>
          </button>
        )}

        <button
          onClick={onStartGame}
          disabled={!canPlayToday || !isAuthenticated}
          className="w-full bg-[#E86A5D] text-white text-2xl py-4 px-8 rounded-2xl 
                     border-4 border-[#333333] shadow-lg hover:bg-[#d85a4c] 
                     active:transform active:scale-95 transition-all duration-200
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     flex items-center justify-center space-x-3"
        >
          <Play size={32} fill="white" />
          <span>START GAME</span>
        </button>

        <button
          onClick={onSpinRoulette}
          disabled={rouletteKeys === 0}
          className="w-full bg-[#3DB4D8] text-white text-2xl py-4 px-8 rounded-2xl 
                     border-4 border-[#333333] shadow-lg hover:bg-[#35a5c4] 
                     active:transform active:scale-95 transition-all duration-200
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     flex items-center justify-center space-x-3"
        >
          <RotateCcw size={32} />
          <span>SPIN ROULETTE</span>
        </button>

        <button
          onClick={onShowLeaderboard}
          className="w-full bg-yellow-500 text-[#333333] text-2xl py-4 px-8 rounded-2xl 
                     border-4 border-[#333333] shadow-lg hover:bg-yellow-400 
                     active:transform active:scale-95 transition-all duration-200
                     flex items-center justify-center space-x-3"
        >
          <Trophy size={32} />
          <span>LEADERBOARD</span>
        </button>
      </div>

      {!isAuthenticated && (
        <p className="text-[#333333] text-sm mt-4 text-center opacity-70 z-10">
          {!isConnected && '🎮 Connect your wallet to start playing and earning $CC tokens!'}
          {isConnected && !isAuthenticating && '🔐 Click Sign In and approve the message in your wallet'}
          {isAuthenticating && '🔐 Please check your wallet and sign the message...'}
        </p>
      )}
      
      {/* Step 7: User Interface Updates - Show authentication status */}
      {!canPlayToday && (
        <p className="text-[#333333] text-sm mt-4 text-center opacity-70 z-10">
          Daily limit reached! Come back tomorrow for more games.
        </p>
      )}
      
      {isAuthenticated && canPlayToday && rouletteKeys === 0 && (
        <p className="text-[#333333] text-sm mt-4 text-center opacity-70 z-10">
          Win or draw a game to earn Roulette Keys!
        </p>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50"
             onClick={() => setShowInfoModal(false)}>
          <div className="bg-[#D8CFAF] rounded-3xl border-4 border-[#333333] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#D8CFAF] border-b-4 border-[#333333] p-6 flex items-center justify-between">
              <h2 className="text-3xl font-black text-[#333333]">HOW TO PLAY</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-10 h-10 bg-white rounded-full border-3 border-[#333333]
                           flex items-center justify-center hover:bg-gray-100
                           active:transform active:scale-95 transition-all"
              >
                <X size={20} color="#333333" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-white rounded-xl border-3 border-[#333333] p-5 shadow-lg">
                <h3 className="text-xl font-black text-[#E86A5D] mb-3">🎨 GAME OBJECTIVE</h3>
                <p className="text-[#333333] leading-relaxed">
                  Paint as much of the canvas as possible in 60 seconds! Compete against an AI bot to cover the most area with your color.
                </p>
              </div>

              <div className="bg-white rounded-xl border-3 border-[#333333] p-5 shadow-lg">
                <h3 className="text-xl font-black text-[#3DB4D8] mb-3">🎮 CONTROLS</h3>
                <ul className="space-y-2 text-[#333333]">
                  <li className="flex items-start">
                    <span className="font-black mr-2">•</span>
                    <span>Click and drag on the canvas to paint</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">•</span>
                    <span>Paint as much area as you can before time runs out</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">•</span>
                    <span>Collect power-ups for temporary boosts</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border-3 border-[#333333] p-5 shadow-lg">
                <h3 className="text-xl font-black text-green-600 mb-3">⚡ POWER-UPS</h3>
                <ul className="space-y-2 text-[#333333]">
                  <li className="flex items-start">
                    <span className="font-black mr-2">🚀</span>
                    <span><strong>Speed Boost:</strong> Move faster for 5 seconds</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">💥</span>
                    <span><strong>Paint Splat:</strong> Instantly paint a large area</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">📐</span>
                    <span><strong>Enlarge Brush:</strong> Bigger brush size for 5 seconds</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border-3 border-[#333333] p-5 shadow-lg">
                <h3 className="text-xl font-black text-yellow-600 mb-3">🔑 ROULETTE KEYS</h3>
                <p className="text-[#333333] leading-relaxed mb-2">
                  Earn Roulette Keys by winning or drawing games. Use keys to spin the roulette for rewards:
                </p>
                <ul className="space-y-2 text-[#333333]">
                  <li className="flex items-start">
                    <span className="font-black mr-2">💰</span>
                    <span><strong>$CC Tokens:</strong> Win 5-250 on-chain tokens</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">🎁</span>
                    <span><strong>Extra Keys:</strong> Get 1-3 additional keys</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">❌</span>
                    <span><strong>No Reward:</strong> Better luck next time!</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border-3 border-[#333333] p-5 shadow-lg">
                <h3 className="text-xl font-black text-purple-600 mb-3">🚀 BLOCKCHAIN FEATURES</h3>
                <ul className="space-y-2 text-[#333333]">
                  <li className="flex items-start">
                    <span className="font-black mr-2">•</span>
                    <span><strong>Immortalize Your Score:</strong> Record your best games on Arbitrum blockchain</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">•</span>
                    <span><strong>Token Rewards:</strong> Win real $CC tokens from the roulette</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-black mr-2">•</span>
                    <span><strong>Leaderboard:</strong> Compete with other players for the top spot</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl border-3 border-[#333333] p-5 shadow-lg">
                <h3 className="text-xl font-black text-red-600 mb-3">📊 DAILY LIMITS</h3>
                <p className="text-[#333333] leading-relaxed">
                  You can play up to <strong>{GAME_SETTINGS.dailyGameLimit} games per day</strong>. The limit resets at midnight UTC. Make every game count!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;