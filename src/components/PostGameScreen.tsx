import React, { useState } from 'react';
import { Play, RotateCcw, Home, Rocket } from 'lucide-react';
import { GameResult } from '../types/game';
import { CONTRACT_ADDRESSES } from '../config/gameConfig';
import { recordScoreOnChain } from '../services/blockchainService';
import { useWallet } from '../hooks/useWallet';

interface ToastFunctions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

interface PostGameScreenProps {
  result: GameResult;
  onPlayAgain: () => void;
  onSpinRoulette: () => void;
  onBackToHome: () => void;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
  canPlayToday: boolean;
  walletAddress?: string;
  username?: string;
  showToast: ToastFunctions;
}

const PostGameScreen: React.FC<PostGameScreenProps> = ({
  result,
  onPlayAgain,
  onSpinRoulette,
  onBackToHome,
  isWalletConnected,
  onConnectWallet,
  canPlayToday,
  walletAddress,
  username,
  showToast,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const { signer } = useWallet();

  const getResultText = () => {
    switch (result.winner) {
      case 'player': return 'YOU WIN!';
      case 'bot': return 'YOU LOSE!';
      case 'draw': return 'DRAW!';
    }
  };

  const getResultColor = () => {
    switch (result.winner) {
      case 'player': return 'text-[#E86A5D]';
      case 'bot': return 'text-[#3DB4D8]';
      case 'draw': return 'text-[#333333]';
    }
  };

  const earnedToken = result.playerScore >= result.botScore;

  const handleRecordScore = async () => {
    if (!isWalletConnected) {
      showToast.error('Please connect your wallet first');
      return;
    }

    if (!walletAddress || !signer) {
      showToast.error('Wallet connection error. Please try reconnecting.');
      return;
    }

    setIsRecording(true);
    showToast.info('Preparing transaction...');

    try {
      const playerName = username || walletAddress.slice(0, 8);

      showToast.info('Please confirm the transaction in your wallet...');
      
      const response = await recordScoreOnChain({
        walletAddress,
        score: result.playerScore,
        contractAddress: CONTRACT_ADDRESSES.SCORE_RECORDER,
        playerName,
        signer
      });

      if (response.success) {
        showToast.success(`Score ${result.playerScore}% recorded on blockchain!`);
        console.log('Score recorded:', response);
      } else {
        throw new Error(response.error || 'Failed to record score');
      }

    } catch (error) {
      console.error('Failed to record score:', error);
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('user rejected')) {
        showToast.warning('Transaction was cancelled by user.');
      } else if (errorMessage.includes('insufficient funds')) {
        showToast.error('Insufficient funds to complete transaction.');
      } else {
        showToast.error(`Failed to record score: ${errorMessage}`);
      }
    } finally {
      setIsRecording(false);
    }
  };
  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#D8CFAF] to-[#C8BFAF]">
      {/* Result */}
      <div className="text-center mb-8">
        <h1 className={`text-6xl font-black mb-4 ${getResultColor()} drop-shadow-lg`}>
          {getResultText()}
        </h1>
        
        {/* Final Score */}
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#E86A5D] to-[#D75A4C] rounded-full 
                           border-4 border-[#333333] flex items-center justify-center mb-2 mx-auto
                           shadow-xl ring-2 ring-white/30">
              <span className="text-white text-2xl font-black drop-shadow-lg">{result.playerScore}%</span>
            </div>
            <p className="text-[#333333] text-lg font-bold">YOU</p>
          </div>
          
          <div className="text-5xl font-black text-[#333333] drop-shadow-sm">VS</div>
          
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#3DB4D8] to-[#2A9BC1] rounded-full 
                           border-4 border-[#333333] flex items-center justify-center mb-2 mx-auto
                           shadow-xl ring-2 ring-white/30">
              <span className="text-white text-2xl font-black drop-shadow-lg">{result.botScore}%</span>
            </div>
            <p className="text-[#333333] text-lg font-bold">BOT</p>
          </div>
        </div>

        {/* Token Reward */}
        {earnedToken && (
          <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-2xl px-8 py-4 
                         border-4 border-[#333333] shadow-xl animate-bounce ring-2 ring-green-300/50">
            <p className="text-white text-2xl font-black drop-shadow-lg">+1 Roulette Key! 🎉</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-4 w-full max-w-sm">
        {(result.winner === 'player' || result.winner === 'draw') && isWalletConnected && walletAddress && (
          <button
            onClick={handleRecordScore}
            disabled={isRecording}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white text-lg py-4 px-6 rounded-2xl
                       border-4 border-[#333333] shadow-xl hover:from-green-700 hover:to-green-800
                       active:transform active:scale-95 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center justify-center space-x-2 relative overflow-hidden"
          >
            {isRecording && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            )}
            <Rocket size={24} className={isRecording ? 'animate-pulse' : ''} />
            <span>{isRecording ? 'IMMORTALIZING...' : 'IMMORTALIZE'}</span>
          </button>
        )}

        {(result.winner === 'player' || result.winner === 'draw') && !isWalletConnected && (
          <button
            onClick={onConnectWallet}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white text-lg py-4 px-6 rounded-2xl
                       border-4 border-[#333333] shadow-xl hover:from-green-700 hover:to-green-800
                       active:transform active:scale-95 transition-all duration-200
                       flex items-center justify-center space-x-2"
          >
            <Rocket size={24} />
            <span>CONNECT TO IMMORTALIZE</span>
          </button>
        )}

        <button
          onClick={onPlayAgain}
          disabled={!canPlayToday}
          className="w-full bg-gradient-to-r from-[#E86A5D] to-[#D75A4C] text-white text-xl py-4 px-6 rounded-2xl
                     border-4 border-[#333333] shadow-xl hover:from-[#d85a4c] hover:to-[#c54a3d]
                     active:transform active:scale-95 transition-all duration-200
                     disabled:bg-gray-400 disabled:cursor-not-allowed
                     flex items-center justify-center space-x-2"
        >
          <Play size={24} fill="white" />
          <span>PLAY AGAIN</span>
        </button>

        <button
          onClick={onSpinRoulette}
          className="w-full bg-gradient-to-r from-[#3DB4D8] to-[#2A9BC1] text-white text-xl py-4 px-6 rounded-2xl
                     border-4 border-[#333333] shadow-xl hover:from-[#35a5c4] hover:to-[#2590b3]
                     active:transform active:scale-95 transition-all duration-200
                     flex items-center justify-center space-x-2"
        >
          <RotateCcw size={24} />
          <span>SPIN ROULETTE</span>
        </button>

        <button
          onClick={onBackToHome}
          className="w-full bg-gradient-to-r from-white to-gray-100 text-[#333333] text-xl py-4 px-6 rounded-2xl
                     border-4 border-[#333333] shadow-xl hover:from-gray-100 hover:to-gray-200
                     active:transform active:scale-95 transition-all duration-200
                     flex items-center justify-center space-x-2"
        >
          <Home size={24} />
          <span>MAIN MENU</span>
        </button>
      </div>

      {!canPlayToday && (
        <p className="text-[#333333] text-sm mt-4 text-center opacity-70">
          Daily limit reached! Come back tomorrow.
        </p>
      )}
    </div>
  );
};

export default PostGameScreen;