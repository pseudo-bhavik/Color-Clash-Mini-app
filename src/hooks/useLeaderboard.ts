import { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types/game';

export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('colorClashLeaderboard');
    if (saved) {
      const parsed = JSON.parse(saved);
      setLeaderboard(parsed.sort((a: LeaderboardEntry, b: LeaderboardEntry) => 
        b.totalTokensWon - a.totalTokensWon
      ));
    }
  }, []);

  const updateLeaderboard = (address: string, tokensWon: number, username?: string, farcasterFid?: string) => {
    setLeaderboard(prev => {
      const existing = prev.find(entry => entry.address === address);
      let updated;
      
      if (existing) {
        updated = prev.map(entry => 
          entry.address === address 
            ? { 
                ...entry, 
                username: username || entry.username,
                farcasterFid: farcasterFid || entry.farcasterFid,
                totalTokensWon: entry.totalTokensWon + tokensWon,
                gamesPlayed: entry.gamesPlayed + 1,
                lastPlayed: Date.now()
              }
            : entry
        );
      } else {
        updated = [...prev, {
          address,
          username,
          farcasterFid,
          totalTokensWon: tokensWon,
          gamesPlayed: 1,
          lastPlayed: Date.now()
        }];
      }
      
      const sorted = updated.sort((a, b) => b.totalTokensWon - a.totalTokensWon);
      localStorage.setItem('colorClashLeaderboard', JSON.stringify(sorted));
      return sorted;
    });
  };

  return {
    leaderboard,
    updateLeaderboard
  };
};