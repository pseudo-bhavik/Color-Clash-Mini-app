import { useRef, useCallback, useState } from 'react';
import { GameSettings } from '../types/game';

interface PlayerBrush {
  x: number;
  y: number;
}

interface PlayerEffects {
  speedUp: boolean;
  enlarge: boolean;
}

export const usePaintCanvas = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  settings: GameSettings
) => {
  const imageDataRef = useRef<ImageData | null>(null);
  const lastPositionRef = useRef<{x: number, y: number} | null>(null);
  const [playerBrush, setPlayerBrush] = useState<PlayerBrush | null>(null);
  const [playerEffects, setPlayerEffects] = useState<PlayerEffects>({
    speedUp: false,
    enlarge: false
  });

  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with background color
    ctx.fillStyle = '#D8CFAF';
    ctx.fillRect(0, 0, settings.canvasWidth, settings.canvasHeight);
    
    imageDataRef.current = ctx.getImageData(0, 0, settings.canvasWidth, settings.canvasHeight);
  }, [settings.canvasWidth, settings.canvasHeight]);

  const paintPixel = useCallback((x: number, y: number, player: 'player' | 'bot', brushSize: number = settings.brushSize, smooth: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageDataRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = player === 'player' ? '#E86A5D' : '#3DB4D8';
    
    // Create clean, solid paint stroke with defined edges
    ctx.fillStyle = color;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    
    // For smooth painting, draw line from last position
    if (smooth && lastPositionRef.current && player === 'player') {
      const lastX = lastPositionRef.current.x;
      const lastY = lastPositionRef.current.y;
      
      // Calculate distance and steps for smooth line
      const distance = Math.sqrt(Math.pow(x - lastX, 2) + Math.pow(y - lastY, 2));
      const steps = Math.max(1, Math.floor(distance / (brushSize / 4)));
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const interpX = lastX + (x - lastX) * t;
        const interpY = lastY + (y - lastY) * t;
        
        ctx.beginPath();
        ctx.arc(interpX, interpY, brushSize / 2, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else {
      // Regular paint stroke
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Store last position for smooth painting
    if (player === 'player') {
      lastPositionRef.current = { x, y };
    }

    imageDataRef.current = ctx.getImageData(0, 0, settings.canvasWidth, settings.canvasHeight);
  }, [settings.brushSize, settings.canvasWidth, settings.canvasHeight]);

  const paintSplat = useCallback((x: number, y: number, player: 'player' | 'bot', radius: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageDataRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = player === 'player' ? '#E86A5D' : '#3DB4D8';
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Add splat effect with more irregular edges
    for (let i = 0; i < 12; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const splatX = x + Math.cos(angle) * (radius + Math.random() * 30);
      const splatY = y + Math.sin(angle) * (radius + Math.random() * 30);
      const splatSize = 8 + Math.random() * 15;
      
      ctx.beginPath();
      ctx.arc(splatX, splatY, splatSize, 0, 2 * Math.PI);
      ctx.fill();
    }

    imageDataRef.current = ctx.getImageData(0, 0, settings.canvasWidth, settings.canvasHeight);
  }, [settings.canvasWidth, settings.canvasHeight]);

  const calculateScores = useCallback(() => {
    if (!imageDataRef.current) return { playerPercentage: 0, botPercentage: 0 };

    const data = imageDataRef.current.data;
    let playerPixels = 0;
    let botPixels = 0;
    const totalPixels = settings.canvasWidth * settings.canvasHeight;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // More precise color detection for player (orange-red #E86A5D)
      if (r >= 220 && r <= 240 && g >= 100 && g <= 115 && b >= 85 && b <= 100) {
        playerPixels++;
      }
      // More precise color detection for bot (cyan-blue #3DB4D8)
      else if (r >= 55 && r <= 70 && g >= 175 && g <= 190 && b >= 210 && b <= 225) {
        botPixels++;
      }
    }

    const playerPercentage = Math.min(100, (playerPixels / totalPixels) * 100);
    const botPercentage = Math.min(100, (botPixels / totalPixels) * 100);

    return { playerPercentage, botPercentage };
  }, []);

  return {
    paintPixel,
    paintSplat,
    calculateScores,
    initializeCanvas,
    playerBrush,
    setPlayerBrush,
    playerEffects,
    setPlayerEffects
  };
};