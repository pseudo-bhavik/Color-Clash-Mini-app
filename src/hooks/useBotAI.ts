import { useState, useCallback, useRef } from 'react';
import { GameSettings, PowerUp } from '../types/game';

interface BotPosition {
  x: number;
  y: number;
}

interface BotEffects {
  speedUp: boolean;
  enlarge: boolean;
}

export const useBotAI = (
  settings: GameSettings,
  powerUps: PowerUp[],
  paintPixel: (x: number, y: number, player: 'player' | 'bot', brushSize?: number) => void,
  paintSplat: (x: number, y: number, player: 'player' | 'bot', radius: number) => void,
  getCurrentScores: () => { playerPercentage: number; botPercentage: number }
) => {
  const [botPosition, setBotPosition] = useState<BotPosition>({ 
    x: settings.canvasWidth / 2, 
    y: settings.canvasHeight - 50 
  });
  
  const [botEffects, setBotEffects] = useState<BotEffects>({
    speedUp: false,
    enlarge: false
  });
  
  const directionRef = useRef({ dx: 0, dy: 0 });
  const targetRef = useRef<{x: number, y: number} | null>(null);
  const lastDirectionChangeRef = useRef(0);
  const behaviorModeRef = useRef<'exploring' | 'targeting' | 'aggressive' | 'defensive'>('exploring');
  const lastBehaviorChangeRef = useRef(0);
  const movementPatternRef = useRef<'straight' | 'zigzag' | 'circular' | 'random'>('straight');
  const circularAngleRef = useRef(0);
  const zigzagPhaseRef = useRef(0);
  const targetScoreRef = useRef<number>(
    settings.botDifficulty.minScore + 
    Math.random() * (settings.botDifficulty.maxScore - settings.botDifficulty.minScore)
  );
  const performanceAdjustmentRef = useRef(1.0);

  const checkPowerUpCollision = useCallback((x: number, y: number) => {
    const collided = powerUps.find(p => {
      if (p.collected) return false;
      
      const distance = Math.sqrt(
        Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2)
      );
      
      return distance < (settings.brushSize + 20); // Power-up collision radius
    });

    if (collided) {
      // Handle power-up collection for bot
      switch (collided.type) {
        case 'speedUp':
          setBotEffects(prev => ({ ...prev, speedUp: true }));
          setTimeout(() => {
            setBotEffects(prev => ({ ...prev, speedUp: false }));
          }, 3000);
          break;
        case 'paintSplat':
          paintSplat(collided.x, collided.y, 'bot', 60);
          break;
        case 'enlarge':
          setBotEffects(prev => ({ ...prev, enlarge: true }));
          setTimeout(() => {
            setBotEffects(prev => ({ ...prev, enlarge: false }));
          }, 3000);
          break;
      }
    }

    return collided;
  }, [powerUps, paintSplat, settings.brushSize]);

  const updateBotAI = useCallback(() => {
    const now = Date.now();
    
    // Get current scores for adaptive behavior
    const currentScores = getCurrentScores();
    const currentBotScore = currentScores.botPercentage;
    const targetScore = targetScoreRef.current;
    
    // Adaptive performance adjustment
    if (settings.botDifficulty.adaptiveSpeed) {
      const scoreDifference = currentBotScore - targetScore;
      
      if (scoreDifference < -10) {
        // Bot is significantly behind target, increase effort
        performanceAdjustmentRef.current = Math.min(1.5, performanceAdjustmentRef.current + 0.02);
      } else if (scoreDifference > 10) {
        // Bot is significantly ahead of target, reduce effort
        performanceAdjustmentRef.current = Math.max(0.5, performanceAdjustmentRef.current - 0.02);
      } else {
        // Bot is near target, gradually return to normal
        performanceAdjustmentRef.current = performanceAdjustmentRef.current * 0.99 + 0.01;
      }
    }
    
    // Change behavior mode every 2-4 seconds for more human-like unpredictability
    if (now - lastBehaviorChangeRef.current > 2000 + Math.random() * 2000) {
      const behaviors: typeof behaviorModeRef.current[] = ['exploring', 'targeting', 'aggressive', 'defensive'];
      behaviorModeRef.current = behaviors[Math.floor(Math.random() * behaviors.length)];
      lastBehaviorChangeRef.current = now;
      
      // Also change movement pattern
      const patterns: typeof movementPatternRef.current[] = ['straight', 'zigzag', 'circular', 'random'];
      movementPatternRef.current = patterns[Math.floor(Math.random() * patterns.length)];
    }

    // Find nearest uncollected power-up
    const shouldSeekPowerUps = Math.random() < settings.botDifficulty.powerUpSeekChance;
    const nearestPowerUp = shouldSeekPowerUps ? powerUps
      .filter(p => !p.collected)
      .reduce((nearest, current) => {
        if (!nearest) return current;
        
        const currentDist = Math.sqrt(
          Math.pow(current.x - botPosition.x, 2) + 
          Math.pow(current.y - botPosition.y, 2)
        );
        const nearestDist = Math.sqrt(
          Math.pow(nearest.x - botPosition.x, 2) + 
          Math.pow(nearest.y - botPosition.y, 2)
        );
        
        return currentDist < nearestDist ? current : nearest;
      }, null as PowerUp | null) : null;

    // Determine target based on behavior mode
    let shouldChangeTarget = false;
    
    if (behaviorModeRef.current === 'targeting' && nearestPowerUp && shouldSeekPowerUps) {
      // Go for power-ups when in targeting mode and seeking is enabled
      targetRef.current = { x: nearestPowerUp.x, y: nearestPowerUp.y };
    } else if (behaviorModeRef.current === 'aggressive') {
      // Target areas with more coverage potential
      if (!targetRef.current || now - lastDirectionChangeRef.current > 800 + Math.random() * 400) {
        const aggressiveTargets = [
          // Target corners and edges aggressively
          { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 },
          { x: settings.canvasWidth - 150 + Math.random() * 100, y: 50 + Math.random() * 100 },
          { x: 50 + Math.random() * 100, y: settings.canvasHeight - 150 + Math.random() * 100 },
          { x: settings.canvasWidth - 150 + Math.random() * 100, y: settings.canvasHeight - 150 + Math.random() * 100 },
          // Center area
          { x: settings.canvasWidth / 2 + (Math.random() - 0.5) * 150, y: settings.canvasHeight / 2 + (Math.random() - 0.5) * 150 }
        ];
        targetRef.current = aggressiveTargets[Math.floor(Math.random() * aggressiveTargets.length)];
        shouldChangeTarget = true;
      }
    } else if (behaviorModeRef.current === 'defensive') {
      // Move more cautiously, avoid edges
      if (!targetRef.current || now - lastDirectionChangeRef.current > 1200 + Math.random() * 800) {
        targetRef.current = {
          x: 100 + Math.random() * (settings.canvasWidth - 200),
          y: 100 + Math.random() * (settings.canvasHeight - 200)
        };
        shouldChangeTarget = true;
      }
    } else { // exploring mode
      if (!targetRef.current || now - lastDirectionChangeRef.current > 600 + Math.random() * 600) {
        targetRef.current = {
          x: Math.random() * settings.canvasWidth,
          y: Math.random() * settings.canvasHeight
        };
        shouldChangeTarget = true;
      }
    }

    if (shouldChangeTarget) {
      lastDirectionChangeRef.current = now;
    }

    // Apply movement pattern modifications
    let finalTarget = targetRef.current;
    if (finalTarget) {
      switch (movementPatternRef.current) {
        case 'zigzag':
          zigzagPhaseRef.current += 0.1;
          finalTarget = {
            x: finalTarget.x + Math.sin(zigzagPhaseRef.current) * 30,
            y: finalTarget.y
          };
          break;
        case 'circular':
          circularAngleRef.current += 0.05;
          const radius = 40;
          finalTarget = {
            x: finalTarget.x + Math.cos(circularAngleRef.current) * radius,
            y: finalTarget.y + Math.sin(circularAngleRef.current) * radius
          };
          break;
        case 'random':
          // Add random jitter to movement
          finalTarget = {
            x: finalTarget.x + (Math.random() - 0.5) * 40,
            y: finalTarget.y + (Math.random() - 0.5) * 40
          };
          break;
      }
    }

    // Move towards target with human-like imperfection
    if (finalTarget) {
      const dx = finalTarget.x - botPosition.x;
      const dy = finalTarget.y - botPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 8) { // Slightly less precise than before
        // Calculate base speed
        let baseSpeed = settings.botSpeed;
        
        // Apply performance adjustment based on target score
        baseSpeed *= performanceAdjustmentRef.current;
        
        // Apply speed up effect
        if (botEffects.speedUp) {
          baseSpeed *= 2.5; // Significant speed boost
        }
        
        // Add human-like speed variation
        const speedVariation = 0.7 + Math.random() * 0.6; // 70% to 130% of base speed
        const actualSpeed = baseSpeed * speedVariation;
        
        // Add slight movement imperfection
        const imperfectionX = (Math.random() - 0.5) * 2;
        const imperfectionY = (Math.random() - 0.5) * 2;
        
        const moveX = (dx / distance) * actualSpeed + imperfectionX;
        const moveY = (dy / distance) * actualSpeed + imperfectionY;
        
        setBotPosition(prev => {
          const newX = Math.max(0, Math.min(settings.canvasWidth, prev.x + moveX));
          const newY = Math.max(0, Math.min(settings.canvasHeight, prev.y + moveY));
          
          // Check for power-up collision at new position
          checkPowerUpCollision(newX, newY);
          
          return { x: newX, y: newY };
        });
      } else {
        // Reached target, find new one with some delay (human-like pause)
        if (Math.random() > 0.7) { // 30% chance to pause briefly
          targetRef.current = null;
        }
      }
    }

    // Paint at current position with size variation based on enlarge effect
    const brushSize = botEffects.enlarge ? settings.brushSize * 1.8 : settings.brushSize;
    
    // Adjust painting frequency based on performance
    const paintChance = 0.95 * performanceAdjustmentRef.current;
    if (Math.random() < paintChance) {
      paintPixel(botPosition.x, botPosition.y, 'bot', brushSize);
    }
  }, [botPosition, powerUps, paintPixel, settings, botEffects, checkPowerUpCollision, getCurrentScores]);

  return {
    botPosition,
    botEffects,
    updateBotAI
  };
};