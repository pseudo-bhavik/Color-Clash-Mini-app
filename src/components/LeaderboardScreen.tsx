import React from 'react';
import { ArrowLeft, Trophy, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '../types/game';

interface LeaderboardScreenProps {
  leaderboard: LeaderboardEntry[];
  onBack: () => void;
  currentUserAddress?: string;
}

const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  leaderboard,
  onBack,
  currentUserAddress
}) => {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getDisplayName = (entry: LeaderboardEntry) => {
    if (entry.username) {
      return entry.username;
    }
    if (entry.farcasterFid) {
      return `@fid:${entry.farcasterFid}`;
    }
    return formatAddress(entry.address);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy size={24} color="#FFD700" />;
      case 2: return <Medal size={24} color="#C0C0C0" />;
      case 3: return <Award size={24} color="#CD7F32" />;
      default: return <span className="text-lg font-black text-[#333333]">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 3: return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default: return 'bg-white';
    }
  };

  return (
    <div className="h-screen flex flex-col p-6 bg-[#D8CFAF]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="w-12 h-12 bg-white rounded-full border-3 border-[#333333] 
                     flex items-center justify-center shadow-lg hover:bg-gray-100"
        >
          <ArrowLeft size={24} color="#333333" />
        </button>
        
        <h1 className="text-3xl font-black text-[#333333]">LEADERBOARD</h1>
        
        <div className="w-12 h-12"></div> {/* Spacer */}
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <Trophy size={64} color="#333333" className="mx-auto mb-4 opacity-50" />
            <p className="text-[#333333] text-xl font-bold opacity-70">
              No winners yet!
            </p>
            <p className="text-[#333333] text-sm opacity-50 mt-2">
              Be the first to win tokens from the roulette
            </p>
          </div>
        ) : (
          leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.address === currentUserAddress;
            
            return (
              <div
                key={entry.address}
                className={`${getRankBg(rank)} rounded-xl border-3 border-[#333333] 
                           shadow-lg p-4 flex items-center justify-between
                           ${isCurrentUser ? 'ring-4 ring-[#E86A5D] ring-opacity-50' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-12 h-12">
                    {getRankIcon(rank)}
                  </div>
                  
                  <div>
                    <p className={`font-black text-lg ${rank <= 3 ? 'text-white' : 'text-[#333333]'}`}>
                      {getDisplayName(entry)}
                      {isCurrentUser && (
                        <span className={`ml-2 text-sm ${rank <= 3 ? 'text-white/80' : 'text-[#E86A5D]'}`}>
                          (You)
                        </span>
                      )}
                    </p>
                    <p className={`text-sm ${rank <= 3 ? 'text-white/80' : 'text-[#333333]/70'}`}>
                      {entry.gamesPlayed} games • {formatAddress(entry.address)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`text-xl font-black ${rank <= 3 ? 'text-white' : 'text-[#E86A5D]'}`}>
                    {entry.totalTokensWon.toLocaleString()} $CC
                  </p>
                  <p className={`text-xs ${rank <= 3 ? 'text-white/60' : 'text-[#333333]/50'}`}>
                    {new Date(entry.lastPlayed).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      {leaderboard.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border-3 border-[#333333] p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-black text-[#E86A5D]">
                {leaderboard.length}
              </p>
              <p className="text-sm text-[#333333] opacity-70">Total Players</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#3DB4D8]">
                {leaderboard.reduce((sum, entry) => sum + entry.totalTokensWon, 0).toLocaleString()}
              </p>
              <p className="text-sm text-[#333333] opacity-70">Total $CC Won</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderboardScreen;