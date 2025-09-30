import React from 'react';
import { Play, RotateCcw, Trophy, Wallet, Shield } from 'lucide-react';
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
}) => {
  const handleConnectWallet = async () => {
    try {
      console.log('Step 1: User initiated authentication - starting wallet connection...');
      await onConnectWallet();
    } catch (error) {
      console.error('Wallet connection failed:', error);
      // More user-friendly error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('User rejected') || errorMessage.includes('user denied')) {
        // User cancelled - don't show error, just log it
        console.log('User cancelled wallet connection');
      } else {
        alert(`Failed to connect wallet: ${errorMessage}\n\nPlease try again or check your wallet extension.`);
      }
    }
  };

  const getConnectButtonText = () => {
    if (isAuthenticating) {
      return 'SIGNING MESSAGE...';
    }
    if (isConnected && !isAuthenticated) {
      return 'PLEASE SIGN MESSAGE';
    }
    return 'CONNECT WALLET';
  };

  const isConnectButtonDisabled = () => {
    return isAuthenticating || (isConnected && !isAuthenticated);
  };
  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 relative">
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
        {!isAuthenticated && (
          /* Step 1: User Initiates Authentication */
          <button
            onClick={handleConnectWallet}
            disabled={isConnectButtonDisabled()}
            className={`w-full text-white text-2xl py-4 px-8 rounded-2xl 
                       border-4 border-[#333333] shadow-lg hover:from-blue-700 hover:to-blue-800
                       active:transform active:scale-95 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center space-x-3 relative overflow-hidden
                       ${isConnectButtonDisabled() 
                         ? 'bg-gradient-to-r from-gray-500 to-gray-600' 
                         : 'bg-gradient-to-r from-blue-600 to-blue-700'
                       }`}
          >
            {isAuthenticating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
            {!isConnected && !isAuthenticating ? (
              <>
                <Wallet size={32} />
                <span>{getConnectButtonText()}</span>
              </>
            ) : (
              <>
                <Shield size={32} className={isAuthenticating ? 'animate-spin' : ''} />
                <span>{getConnectButtonText()}</span>
              </>
            )}
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
          {isAuthenticating 
            ? '🔐 Please check your wallet and sign the message to complete authentication...' 
            : '🎮 Connect your wallet to start playing and earning $CC tokens!'
          }
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
    </div>
  );
};

export default HomeScreen;