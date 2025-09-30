import { useState, useEffect } from 'react';
import { DailyGameData } from '../types/game';
import { GAME_SETTINGS } from '../config/gameConfig';

export const useRouletteKeys = () => {
  const [rouletteKeys, setRouletteKeys] = useState<number>(0);
  const [dailyGames, setDailyGames] = useState<number>(0);
  const [canPlayToday, setCanPlayToday] = useState<boolean>(true);

  // Load keys from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('colorClashRouletteKeys');
    if (saved) {
      setRouletteKeys(parseInt(saved, 10));
    }

    // Check daily game limit
    const today = new Date().toDateString();
    const dailyData = localStorage.getItem('colorClashDailyGames');
    
    if (dailyData) {
      const parsed: DailyGameData = JSON.parse(dailyData);
      if (parsed.date === today) {
        setDailyGames(parsed.gamesPlayed);
        setCanPlayToday(parsed.gamesPlayed < GAME_SETTINGS.dailyGameLimit);
      } else {
        // New day, reset games
        setDailyGames(0);
        setCanPlayToday(true);
        localStorage.setItem('colorClashDailyGames', JSON.stringify({
          date: today,
          gamesPlayed: 0
        }));
      }
    } else {
      // First time playing
      localStorage.setItem('colorClashDailyGames', JSON.stringify({
        date: today,
        gamesPlayed: 0
      }));
    }
  }, []);

  // Save keys to localStorage when they change
  useEffect(() => {
    localStorage.setItem('colorClashRouletteKeys', rouletteKeys.toString());
  }, [rouletteKeys]);

  const addRouletteKeys = (amount: number) => {
    setRouletteKeys(prev => prev + amount);
  };

  const spendRouletteKeys = (amount: number) => {
    setRouletteKeys(prev => Math.max(0, prev - amount));
  };

  const incrementDailyGames = () => {
    const today = new Date().toDateString();
    const newCount = dailyGames + 1;
    setDailyGames(newCount);
    setCanPlayToday(newCount < GAME_SETTINGS.dailyGameLimit);
    
    localStorage.setItem('colorClashDailyGames', JSON.stringify({
      date: today,
      gamesPlayed: newCount
    }));
  };
  return {
    rouletteKeys,
    addRouletteKeys,
    spendRouletteKeys,
    dailyGames,
    canPlayToday,
    incrementDailyGames
  };
};