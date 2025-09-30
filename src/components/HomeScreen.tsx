import React from 'react';
import { Play, RotateCcw, Trophy } from 'lucide-react';
import { GAME_SETTINGS } from '../config/gameConfig';

interface HomeScreenProps {
  rouletteKeys: number;
  dailyGames: number;
  canPlayToday: boolean;
  onStartGame: () => void;
  onSpinRoulette: () => void;
  onShowLeaderboard: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  rouletteKeys, 
  dailyGames, 
  canPlayToday, 
  onStartGame, 
  onSpinRoulette, 
  onShowLeaderboard 
}) => {
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
        <button
          onClick={onStartGame}
          disabled={!canPlayToday}
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

      {!canPlayToday && (
        <p className="text-[#333333] text-sm mt-4 text-center opacity-70 z-10">
          Daily limit reached! Come back tomorrow for more games.
        </p>
      )}
      
      {canPlayToday && rouletteKeys === 0 && (
        <p className="text-[#333333] text-sm mt-4 text-center opacity-70 z-10">
          Win or draw a game to earn Roulette Keys!
        </p>
      )}
    </div>
  );
};

export default HomeScreen;