import React, { useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './lib/wagmi';
import HomeScreen from './components/HomeScreen';
import GameScreen from './components/GameScreen';
import PostGameScreen from './components/PostGameScreen';
import RouletteScreen from './components/RouletteScreen';
import RewardClaimedModal from './components/RewardClaimedModal';
import LeaderboardScreen from './components/LeaderboardScreen';
import { GameState, GameResult, RouletteReward } from './types/game';
import { useRouletteKeys } from './hooks/useGameTokens';
import { useWallet } from './hooks/useWallet';
import { useLeaderboard } from './hooks/useLeaderboard';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/ToastContainer';

// Create a client for React Query with proper error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Declare global farcaster type
declare global {
  interface Window {
    farcaster?: {
      sdk?: {
        ready: () => void;
      };
    };
  }
}

function AppContent() {
  const [gameState, setGameState] = useState<GameState | 'leaderboard'>('home');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [claimedReward, setClaimedReward] = useState<RouletteReward | null>(null);
  const { rouletteKeys, addRouletteKeys, spendRouletteKeys, dailyGames, canPlayToday, incrementDailyGames } = useRouletteKeys();
  const { connectWallet, isConnected, isAuthenticated, walletAddress, signer } = useWallet();
  const { user, updateUserStats } = useAuth();
  const { leaderboard, updateLeaderboard } = useLeaderboard();
  const { toasts, removeToast, success, error, info, warning } = useToast();

  // Initialize Farcaster SDK
  useEffect(() => {
    // Signal to Farcaster that the MiniApp is ready
    if (window.farcaster?.sdk?.ready) {
      window.farcaster.sdk.ready();
    }
  }, []);

  const handleStartGame = () => {
    if (!canPlayToday) return;
    setGameState('playing');
  };

  const handleGameEnd = (result: GameResult) => {
    setGameResult(result);
    
    // Increment daily game count
    incrementDailyGames();
    
    // Award roulette key for win or draw
    if (result.playerScore >= result.botScore) {
      addRouletteKeys(1);
      
      // Update user stats if authenticated
      if (isAuthenticated && user) {
        const wins = result.winner === 'player' ? 1 : 0;
        updateUserStats(1, wins, 0);
      }
    }
    
    setGameState('postGame');
  };

  const handlePlayAgain = () => {
    if (!canPlayToday) return;
    setGameResult(null);
    setGameState('playing');
  };

  const handleBackToHome = () => {
    setGameResult(null);
    setGameState('home');
  };

  const handleSpinRoulette = () => {
    setGameState('roulette');
  };

  const handleShowLeaderboard = () => {
    setGameState('leaderboard');
  };

  const handleRouletteResult = (reward: RouletteReward) => {
    if (reward.type === 'inGameCurrency') {
      addRouletteKeys(reward.amount);
      setClaimedReward(reward);
    } else if (reward.type === 'onChainToken') {
      setClaimedReward(reward);

      if (isAuthenticated && user) {
        updateUserStats(0, 0, reward.amount);
      }
    }

    setGameState(gameResult ? 'postGame' : 'home');
  };

  const handleCloseRewardModal = () => {
    setClaimedReward(null);
  };

  return (
    <div className="min-h-screen bg-[#D8CFAF] font-bold">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {gameState === 'home' && (
            <HomeScreen 
              rouletteKeys={rouletteKeys}
              dailyGames={dailyGames}
              canPlayToday={canPlayToday}
              onStartGame={handleStartGame}
              onSpinRoulette={handleSpinRoulette}
              onShowLeaderboard={handleShowLeaderboard}
            />
          )}
          
          {gameState === 'playing' && (
            <GameScreen 
              onGameEnd={handleGameEnd}
              onExit={handleBackToHome}
            />
          )}
          
          {gameState === 'postGame' && gameResult && (
            <PostGameScreen
              result={gameResult}
              onPlayAgain={handlePlayAgain}
              onSpinRoulette={handleSpinRoulette}
              onBackToHome={handleBackToHome}
              isWalletConnected={isConnected && isAuthenticated}
              onConnectWallet={connectWallet}
              canPlayToday={canPlayToday}
              walletAddress={walletAddress}
              username={user?.username}
              showToast={{ success, error, info, warning }}
            />
          )}
          
          {gameState === 'roulette' && (
            <RouletteScreen
              rouletteKeys={rouletteKeys}
              onSpendKeys={spendRouletteKeys}
              onResult={handleRouletteResult}
              onBack={gameResult ? () => setGameState('postGame') : handleBackToHome}
              walletAddress={walletAddress}
              onUpdateLeaderboard={updateLeaderboard}
              username={user?.username}
              farcasterFid={user?.farcaster_fid}
              showToast={{ success, error, info, warning }}
            />
          )}
          
          {gameState === 'leaderboard' && (
            <LeaderboardScreen 
              leaderboard={leaderboard}
              onBack={handleBackToHome}
              currentUserAddress={walletAddress}
            />
          )}
          
          {claimedReward && (
            <RewardClaimedModal
              reward={claimedReward}
              onClose={handleCloseRewardModal}
              walletAddress={walletAddress}
            />
          )}
        </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AppContent />
      </WagmiProvider>
    </QueryClientProvider>
  );
}

export default App;