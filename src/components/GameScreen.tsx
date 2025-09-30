import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Zap, Bomb, Maximize2 } from 'lucide-react';
import { GameResult, PowerUp, GameSettings } from '../types/game';
import { GAME_SETTINGS } from '../config/gameConfig';
import { usePaintCanvas } from '../hooks/usePaintCanvas';
import { useBotAI } from '../hooks/useBotAI';
import { usePowerUps } from '../hooks/usePowerUps';
import { useGameTimer } from '../hooks/useGameTimer';

interface GameScreenProps {
  onGameEnd: (result: GameResult) => void;
  onExit: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onGameEnd, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const { timeLeft, startTimer, isRunning } = useGameTimer(GAME_SETTINGS.timer);
  
  const { 
    paintPixel, 
    paintSplat, 
    calculateScores, 
    initializeCanvas,
    playerBrush,
    setPlayerBrush,
    playerEffects,
    setPlayerEffects
  } = usePaintCanvas(canvasRef, GAME_SETTINGS);

  const { 
    powerUps, 
    checkPowerUpCollision, 
    updatePowerUps 
  } = usePowerUps(GAME_SETTINGS);

  const { 
    botPosition, 
    botEffects,
    updateBotAI 
  } = useBotAI(GAME_SETTINGS, powerUps, paintPixel, paintSplat, calculateScores);

  // Handle touch/mouse events for player painting
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!isRunning || !canvasRef.current) return;
    
    setIsPointerDown(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * GAME_SETTINGS.canvasWidth;
    const y = ((e.clientY - rect.top) / rect.height) * GAME_SETTINGS.canvasHeight;

    setPlayerBrush({ x, y });
    
    const brushSize = playerEffects.enlarge ? GAME_SETTINGS.brushSize * 1.8 : GAME_SETTINGS.brushSize;
    paintPixel(x, y, 'player', brushSize, false);

    // Check power-up collisions
    const collectedPowerUp = checkPowerUpCollision(x, y, GAME_SETTINGS.brushSize);
    if (collectedPowerUp) {
      handlePowerUpCollection(collectedPowerUp);
    }
  }, [isRunning, checkPowerUpCollision, paintPixel, setPlayerBrush, playerEffects.enlarge]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isRunning || !canvasRef.current || !isPointerDown) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * GAME_SETTINGS.canvasWidth;
    const y = ((e.clientY - rect.top) / rect.height) * GAME_SETTINGS.canvasHeight;

    setPlayerBrush({ x, y });
    
    const brushSize = playerEffects.enlarge ? GAME_SETTINGS.brushSize * 1.8 : GAME_SETTINGS.brushSize;
    paintPixel(x, y, 'player', brushSize, true);

    // Check power-up collisions
    const collectedPowerUp = checkPowerUpCollision(x, y, GAME_SETTINGS.brushSize);
    if (collectedPowerUp) {
      handlePowerUpCollection(collectedPowerUp);
    }
  }, [isRunning, isPointerDown, checkPowerUpCollision, paintPixel, setPlayerBrush, playerEffects.enlarge]);

  const handlePointerUp = useCallback(() => {
    setIsPointerDown(false);
  }, []);

  const handlePowerUpCollection = (powerUp: PowerUp) => {
    switch (powerUp.type) {
      case 'speedUp':
        setPlayerEffects(prev => ({ ...prev, speedUp: true }));
        setTimeout(() => {
          setPlayerEffects(prev => ({ ...prev, speedUp: false }));
        }, 3000);
        break;
      case 'paintSplat':
        paintSplat(powerUp.x, powerUp.y, 'player', 60);
        break;
      case 'enlarge':
        setPlayerEffects(prev => ({ ...prev, enlarge: true }));
        setTimeout(() => {
          setPlayerEffects(prev => ({ ...prev, enlarge: false }));
        }, 3000);
        break;
    }
  };

  // Game loop
  useEffect(() => {
    if (!isRunning) return;

    const gameLoop = setInterval(() => {
      updateBotAI();
      updatePowerUps();
      
      const scores = calculateScores();
      setPlayerScore(Math.round(scores.playerPercentage));
      setBotScore(Math.round(scores.botPercentage));
    }, 16); // ~60fps

    return () => clearInterval(gameLoop);
  }, [isRunning, updateBotAI, updatePowerUps, calculateScores]);

  // Start game
  useEffect(() => {
    if (!gameStarted) {
      initializeCanvas();
      // Set initial player position at bottom center (same as bot)
      setPlayerBrush({ 
        x: GAME_SETTINGS.canvasWidth / 2, 
        y: GAME_SETTINGS.canvasHeight - 50 
      });
      setGameStarted(true);
      setTimeout(() => startTimer(), 1000); // 1 second delay for countdown
    }
  }, [gameStarted, initializeCanvas, startTimer]);

  // End game when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && gameStarted) {
      const winner = playerScore > botScore ? 'player' : 
                    botScore > playerScore ? 'bot' : 'draw';
      
      onGameEnd({
        playerScore,
        botScore,
        winner
      });
    }
  }, [timeLeft, gameStarted, playerScore, botScore, onGameEnd]);

  return (
    <div className="h-screen flex flex-col relative bg-gradient-to-br from-[#D8CFAF] to-[#C8BFAF]">
      {/* Header with scores and exit */}
      <div className="flex justify-between items-center p-4 z-20 bg-gradient-to-r from-black/10 to-black/5">
        {/* Bot Score */}
        <div className="flex items-center space-x-2">
          <div className="w-16 h-16 bg-gradient-to-br from-[#3DB4D8] to-[#2A9BC1] rounded-full 
                         border-4 border-[#333333] flex items-center justify-center shadow-xl
                         ring-2 ring-white/30">
            <span className="text-white text-xl font-black drop-shadow-lg">{botScore}%</span>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-gradient-to-br from-white to-gray-100 px-6 py-3 rounded-2xl 
                       border-4 border-[#333333] shadow-xl ring-2 ring-yellow-400/50">
          <span className="text-[#333333] text-3xl font-black drop-shadow-sm">{timeLeft}</span>
        </div>

        {/* Exit Button */}
        <button
          onClick={onExit}
          className="w-16 h-16 bg-gradient-to-br from-white to-gray-100 rounded-full 
                     border-4 border-[#333333] flex items-center justify-center shadow-xl
                     hover:from-gray-100 hover:to-gray-200 active:transform active:scale-95 
                     transition-all duration-200 ring-2 ring-red-400/30"
        >
          <X size={28} color="#333333" />
        </button>
      </div>

      {/* Player Score */}
      <div className="absolute left-4 top-20 z-20">
        <div className="w-16 h-16 bg-gradient-to-br from-[#E86A5D] to-[#D75A4C] rounded-full 
                       border-4 border-[#333333] flex items-center justify-center shadow-xl
                       ring-2 ring-white/30">
          <span className="text-white text-xl font-black drop-shadow-lg">{playerScore}%</span>
        </div>
      </div>

      {/* Active Power-up Indicators */}
      <div className="absolute right-4 top-20 z-20 space-y-2">
        {playerEffects.speedUp && (
          <div className="w-12 h-12 bg-yellow-400 rounded-full border-3 border-[#333333] 
                         flex items-center justify-center shadow-lg animate-pulse">
            <Zap size={20} color="#333333" />
          </div>
        )}
        {playerEffects.enlarge && (
          <div className="w-12 h-12 bg-purple-500 rounded-full border-3 border-[#333333] 
                         flex items-center justify-center shadow-lg animate-pulse">
            <Maximize2 size={20} color="white" />
          </div>
        )}
        {/* Bot Power-up Indicators */}
        {botEffects.speedUp && (
          <div className="w-12 h-12 bg-blue-400 rounded-full border-3 border-[#333333] 
                         flex items-center justify-center shadow-lg animate-pulse">
            <Zap size={20} color="white" />
            <span className="absolute -bottom-1 -right-1 text-xs bg-[#3DB4D8] text-white px-1 rounded">BOT</span>
          </div>
        )}
        {botEffects.enlarge && (
          <div className="w-12 h-12 bg-cyan-500 rounded-full border-3 border-[#333333] 
                         flex items-center justify-center shadow-lg animate-pulse">
            <Maximize2 size={20} color="white" />
            <span className="absolute -bottom-1 -right-1 text-xs bg-[#3DB4D8] text-white px-1 rounded">BOT</span>
          </div>
        )}
      </div>

      {/* Game Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={GAME_SETTINGS.canvasWidth}
          height={GAME_SETTINGS.canvasHeight}
          className="w-full h-full cursor-none touch-none border-4 border-[#333333] 
                     shadow-2xl rounded-lg"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Power-ups overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {powerUps.filter(p => !p.collected).map(powerUp => (
            <div
              key={powerUp.id}
              className="absolute w-12 h-12 bg-gradient-to-br from-white to-gray-100 
                         rounded-full border-3 border-[#333333] flex items-center justify-center 
                         animate-bounce shadow-xl ring-2 ring-yellow-400/50"
              style={{
                left: `${(powerUp.x / GAME_SETTINGS.canvasWidth) * 100}%`,
                top: `${(powerUp.y / GAME_SETTINGS.canvasHeight) * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {powerUp.type === 'speedUp' && <Zap size={24} color="#FFD700" />}
              {powerUp.type === 'paintSplat' && <Bomb size={24} color="#FF4444" />}
              {powerUp.type === 'enlarge' && <Maximize2 size={24} color="#8B5CF6" />}
            </div>
          ))}
        </div>

        {/* Player brush indicator */}
        {playerBrush && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              left: `${(playerBrush.x / GAME_SETTINGS.canvasWidth) * 100}%`,
              top: `${(playerBrush.y / GAME_SETTINGS.canvasHeight) * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Paint Brush Icon for Player */}
            <div className={`transition-all duration-300 ${playerEffects.enlarge ? 'scale-125' : 'scale-100'}`}>
              <div className="relative">
                {/* Brush Handle */}
                <div className="w-4 h-12 bg-gradient-to-b from-[#8B4513] to-[#654321] 
                               border-3 border-[#333333] rounded-lg shadow-lg"></div>
                {/* Brush Head */}
                <div className="w-8 h-6 bg-gradient-to-b from-[#E86A5D] to-[#D75A4C] 
                               border-3 border-[#333333] rounded-lg absolute -top-3 -left-2 shadow-lg">
                  {/* Brush Bristles */}
                  <div className="absolute -bottom-2 left-1 right-1 h-3 bg-gradient-to-b 
                                 from-[#E86A5D] to-[#C54A3D] border-l-2 border-r-2 border-[#333333] 
                                 rounded-b-sm"></div>
                </div>
                {/* Metal Ferrule */}
                <div className="absolute top-6 left-0.5 w-3 h-2 bg-gradient-to-b from-gray-300 to-gray-500 
                               border border-[#333333] rounded-sm"></div>
              </div>
              {playerEffects.speedUp && (
                <>
                  <div className="absolute -inset-3 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
                  <div className="absolute -inset-1 bg-yellow-300 rounded-full animate-pulse opacity-40"></div>
                  {/* White star particles trail effect */}
                  <div className="absolute -inset-4">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-white rounded-full animate-ping"
                        style={{
                          left: `${20 + Math.cos((i * Math.PI) / 4) * 25}px`,
                          top: `${20 + Math.sin((i * Math.PI) / 4) * 25}px`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '0.8s',
                        }}
                      >
                        <div className="absolute inset-0 bg-white rounded-full opacity-80"></div>
                        {/* Star shape */}
                        <div className="absolute inset-0 transform rotate-45">
                          <div className="w-full h-0.5 bg-white absolute top-1/2 transform -translate-y-1/2"></div>
                          <div className="h-full w-0.5 bg-white absolute left-1/2 transform -translate-x-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bot brush indicator */}
        <div
          className="absolute pointer-events-none z-10"
          style={{
            left: `${(botPosition.x / GAME_SETTINGS.canvasWidth) * 100}%`,
            top: `${(botPosition.y / GAME_SETTINGS.canvasHeight) * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Paint Brush Icon for Bot */}
          <div className={`relative transition-all duration-300 ${botEffects.enlarge ? 'scale-125' : 'scale-100'}`}>
            {/* Brush Handle */}
            <div className="w-4 h-12 bg-gradient-to-b from-[#8B4513] to-[#654321] 
                           border-3 border-[#333333] rounded-lg shadow-lg"></div>
            {/* Brush Head */}
            <div className="w-8 h-6 bg-gradient-to-b from-[#3DB4D8] to-[#2A9BC1] 
                           border-3 border-[#333333] rounded-lg absolute -top-3 -left-2 shadow-lg">
              {/* Brush Bristles */}
              <div className="absolute -bottom-2 left-1 right-1 h-3 bg-gradient-to-b 
                             from-[#3DB4D8] to-[#2A8BB0] border-l-2 border-r-2 border-[#333333] 
                             rounded-b-sm"></div>
            </div>
            {/* Metal Ferrule */}
            <div className="absolute top-6 left-0.5 w-3 h-2 bg-gradient-to-b from-gray-300 to-gray-500 
                           border border-[#333333] rounded-sm"></div>
            {/* Speed Up Effect for Bot */}
            {botEffects.speedUp && (
              <>
                <div className="absolute -inset-3 bg-blue-400 rounded-full animate-ping opacity-60"></div>
                <div className="absolute -inset-1 bg-blue-300 rounded-full animate-pulse opacity-40"></div>
                {/* Blue star particles trail effect for bot */}
                <div className="absolute -inset-4">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-blue-300 rounded-full animate-ping"
                      style={{
                        left: `${20 + Math.cos((i * Math.PI) / 4) * 25}px`,
                        top: `${20 + Math.sin((i * Math.PI) / 4) * 25}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s',
                      }}
                    >
                      <div className="absolute inset-0 bg-blue-300 rounded-full opacity-80"></div>
                      {/* Star shape */}
                      <div className="absolute inset-0 transform rotate-45">
                        <div className="w-full h-0.5 bg-blue-300 absolute top-1/2 transform -translate-y-1/2"></div>
                        <div className="h-full w-0.5 bg-blue-300 absolute left-1/2 transform -translate-x-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Countdown overlay */}
      {!isRunning && timeLeft === GAME_SETTINGS.timer && gameStarted && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="text-center">
            <div className="text-white text-9xl font-black animate-pulse drop-shadow-2xl mb-4">3</div>
            <div className="text-white text-2xl font-bold animate-bounce">GET READY!</div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GameScreen;