import { useState, useCallback, useRef } from 'react';
import { PowerUp, GameSettings } from '../types/game';

export const usePowerUps = (settings: GameSettings) => {
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const lastSpawnRef = useRef(0);

  const spawnPowerUp = useCallback(() => {
    const types: PowerUp['type'][] = ['speedUp', 'paintSplat', 'enlarge'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const newPowerUp: PowerUp = {
      id: Date.now().toString(),
      type,
      x: Math.random() * (settings.canvasWidth - 50) + 25,
      y: Math.random() * (settings.canvasHeight - 50) + 25,
      collected: false,
      spawnTime: Date.now()
    };

    setPowerUps(prev => [...prev, newPowerUp]);
  }, [settings.canvasWidth, settings.canvasHeight]);

  const updatePowerUps = useCallback(() => {
    const now = Date.now();
    
    // Spawn new power-ups
    if (now - lastSpawnRef.current > settings.powerUpSpawnInterval) {
      if (powerUps.filter(p => !p.collected).length < 2) {
        spawnPowerUp();
        lastSpawnRef.current = now;
      }
    }

    // Remove expired power-ups
    setPowerUps(prev => prev.filter(p => 
      p.collected || (now - p.spawnTime) < settings.powerUpDuration
    ));
  }, [powerUps.length, spawnPowerUp, settings.powerUpDuration, settings.powerUpSpawnInterval]);

  const checkPowerUpCollision = useCallback((x: number, y: number, brushSize: number) => {
    const collided = powerUps.find(p => {
      if (p.collected) return false;
      
      const distance = Math.sqrt(
        Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2)
      );
      
      return distance < (brushSize + 20); // Power-up collision radius
    });

    if (collided) {
      setPowerUps(prev => prev.map(p => 
        p.id === collided.id ? { ...p, collected: true } : p
      ));
    }

    return collided;
  }, [powerUps]);

  return {
    powerUps,
    checkPowerUpCollision,
    updatePowerUps
  };
};