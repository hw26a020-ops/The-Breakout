import React, { useEffect, useRef, useState } from 'react';
import { GameStats, GameSettings, Ball, Paddle, Brick, PowerUp, Particle, Laser, FloatingText, PowerUpType, VisualTheme } from '../types';
import { LEVELS } from '../levels';
import { playSound } from '../utils/sound';
import { Volume2, VolumeX, Shield, Disc, ArrowLeft, RotateCcw, AlertTriangle, Play, Pause, Keyboard } from 'lucide-react';

interface GameBoardProps {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  stats: GameStats;
  setStats: React.Dispatch<React.SetStateAction<GameStats>>;
  gameState: 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVELCLEAR' | 'COMPLETED';
  setGameState: React.Dispatch<React.SetStateAction<'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'LEVELCLEAR' | 'COMPLETED'>>;
  onGoBack: () => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

const PADDLE_HEIGHT = 16;
const BALL_RADIUS = 8;
const INITIAL_BALL_SPEED = 7;

// Visual Theme Color palettes
const THEMES = {
  'neon-retro': {
    bg: '#0a0915',
    grid: '#181530',
    paddle: '#ff007f',
    paddleLaser: '#ff3b30',
    paddleInner: '#ffffff',
    ball: '#00ffff',
    ballTrail: 'rgba(0, 255, 255, 0.25)',
    shield: 'rgba(0, 255, 128, 0.4)',
    explosive: '#ff3b30',
    metal: '#4e5a65',
    normal: ['#ff007f', '#9e00ff', '#3d00ff', '#00e5ff', '#00ff66'],
    particleGlow: true,
  },
  'cyberpunk': {
    bg: '#030208',
    grid: '#120d24',
    paddle: '#e300ff',
    paddleLaser: '#ff003c',
    paddleInner: '#00ffcc',
    ball: '#f9ff00',
    ballTrail: 'rgba(249, 255, 0, 0.25)',
    shield: 'rgba(0, 255, 204, 0.4)',
    explosive: '#ff1493',
    metal: '#718096',
    normal: ['#00f0ff', '#ff0055', '#39ff14', '#fffb00', '#7b2cbf'],
    particleGlow: true,
  },
  'classic-slate': {
    bg: '#0f172a',
    grid: '#1e293b',
    paddle: '#38bdf8',
    paddleLaser: '#f43f5e',
    paddleInner: '#f8fafc',
    ball: '#e2e8f0',
    ballTrail: 'rgba(226, 232, 240, 0.2)',
    shield: 'rgba(56, 189, 248, 0.35)',
    explosive: '#ef4444',
    metal: '#64748b',
    normal: ['#0284c7', '#0f766e', '#15803d', '#b45309', '#6d28d9'],
    particleGlow: false,
  },
  'magma': {
    bg: '#0c0202',
    grid: '#260808',
    paddle: '#ff7700',
    paddleLaser: '#ff3000',
    paddleInner: '#ffe600',
    ball: '#ffbc00',
    ballTrail: 'rgba(255, 120, 0, 0.25)',
    shield: 'rgba(255, 60, 0, 0.4)',
    explosive: '#ff2a00',
    metal: '#3e2723',
    normal: ['#880d1e', '#dd2c44', '#f26419', '#f6ae2d', '#f7ebe8'],
    particleGlow: true,
  },
};

export const GameBoard: React.FC<GameBoardProps> = ({
  settings,
  setSettings,
  stats,
  setStats,
  gameState,
  setGameState,
  onGoBack,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isShortScreen, setIsShortScreen] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const isTestModeRef = useRef(false);
  const justToggledRef = useRef(false);

  useEffect(() => {
    isTestModeRef.current = isTestMode;
  }, [isTestMode]);

  useEffect(() => {
    const handleResize = () => {
      setIsShortScreen(window.innerHeight < 600);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Core Game Entities State Refs (to avoid latency & closure state bugs in the high-speed main loop)
  const ballsRef = useRef<Ball[]>([]);
  const paddleRef = useRef<Paddle>({
    x: CANVAS_WIDTH / 2 - 60,
    y: CANVAS_HEIGHT - 40,
    width: 120,
    height: PADDLE_HEIGHT,
    speed: 10,
    effect: 'normal',
    effectTimer: 0,
  });
  const bricksRef = useRef<Brick[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const statsRef = useRef<GameStats>(stats);
  const settingsRef = useRef<GameSettings>(settings);
  const ballSpeedEffectRef = useRef<'normal' | 'slow' | 'fast'>('normal');
  const ballSpeedEffectTimerRef = useRef<number>(0);
  const colorCacheRef = useRef<Map<string, string>>(new Map());

  // Touch & Key States
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const [controlsInfo, setControlsInfo] = useState<string>('矢印キー または A / D でパドル移動、スペースキーで発射');

  // Multiplier Combo Reset parameters
  const [comboPercent, setComboPercent] = useState<number>(100);

  // Sync references to current state/props
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Handle Level Loading
  const loadLevel = (lvlNum: number) => {
    const safeIdx = Math.min(Math.max(0, lvlNum - 1), LEVELS.length - 1);
    const lvlDef = LEVELS[safeIdx];
    const generatedBricks = lvlDef.generate();
    bricksRef.current = generatedBricks;

    // Reset paddle and balls
    paddleRef.current = {
      x: CANVAS_WIDTH / 2 - 60,
      y: CANVAS_HEIGHT - 40,
      width: 120,
      height: PADDLE_HEIGHT,
      speed: 10,
      effect: 'normal',
      effectTimer: 0,
    };

    ballSpeedEffectRef.current = 'normal';
    ballSpeedEffectTimerRef.current = 0;

    const initialBall: Ball = {
      id: Math.random().toString(),
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 40 - BALL_RADIUS - 2,
      dx: 0,
      dy: 0,
      radius: BALL_RADIUS,
      speed: INITIAL_BALL_SPEED * settings.ballSpeedFactor,
      stuck: true,
      stuckOffset: 0,
    };

    ballsRef.current = [initialBall];
    powerUpsRef.current = [];
    particlesRef.current = [];
    lasersRef.current = [];
    floatingTextsRef.current = [];

    setStats((prev) => ({
      ...prev,
      level: lvlNum,
      bricksCleared: 0,
      comboTimer: 0,
      multiplier: 1,
    }));
  };

  // Run on level change or mount
  useEffect(() => {
    if (gameState === 'PLAYING' && bricksRef.current.length === 0) {
      loadLevel(stats.level);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, stats.level]);

  // Restart / Reset completely
  const handleRestart = () => {
    playSound.vibrate(settings.vibration, 80);
    loadLevel(1);
    setStats({
      score: 0,
      highScore: stats.highScore,
      level: 1,
      lives: 3,
      bricksCleared: 0,
      hasShield: false,
      multiplier: 1,
      maxMultiplier: 1,
      comboTimer: 0,
    });
    setGameState('PLAYING');
  };

  const handleNextLevel = () => {
    playSound.vibrate(settings.vibration, 80);
    const nextLvl = stats.level + 1;
    if (nextLvl > LEVELS.length) {
      setGameState('COMPLETED');
    } else {
      loadLevel(nextLvl);
      setGameState('PLAYING');
    }
  };

  // Shoot lasers helper
  const shootLasers = () => {
    const pad = paddleRef.current;
    if (pad.effect !== 'laser') return;
    playSound.laser(settingsRef.current.muted);
    playSound.vibrate(settingsRef.current.vibration, 25);

    // Left laser and right laser
    const laserSpeed = -10;
    const l1: Laser = {
      id: Math.random().toString(),
      x: pad.x + 10,
      y: pad.y - 12,
      dy: laserSpeed,
      width: 4,
      height: 14,
    };
    const l2: Laser = {
      id: Math.random().toString(),
      x: pad.x + pad.width - 14,
      y: pad.y - 12,
      dy: laserSpeed,
      width: 4,
      height: 14,
    };
    lasersRef.current.push(l1, l2);
  };

  // Launch any stuck ball
  const launchBalls = () => {
    let playedSound = false;
    ballsRef.current = ballsRef.current.map((ball) => {
      if (ball.stuck) {
        if (!playedSound) {
          playSound.bounce(settingsRef.current.muted);
          playedSound = true;
        }
        // Give slight customizable random angle
        const angle = (Math.random() * 0.4 - 0.2); // slight tilt
        return {
          ...ball,
          stuck: false,
          dx: ball.speed * Math.sin(angle),
          dy: -ball.speed * Math.cos(angle),
        };
      }
      return ball;
    });
  };

  // Spawn visual floating texts
  const spawnFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      life: 0,
      maxLife: 45, // in frames
    });
  };

  // Spawns particles
  const spawnParticles = (x: number, y: number, color: string, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        alpha: 1,
      });
    }
  };

  // Keyboard and Control setups
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Check for P + Q simultaneously for Developer Test Mode toggling
      if (keysPressed.current['p'] && keysPressed.current['q']) {
        if (!justToggledRef.current) {
          setIsTestMode((prev) => {
            const next = !prev;
            // Spawn float text feedback overlay
            spawnFloatingText(
              CANVAS_WIDTH / 2,
              CANVAS_HEIGHT / 2 - 30,
              next ? "🔧 TEST MODE ACTIVE" : "🔧 TEST MODE OFF",
              next ? "#00ff3c" : "#ff3b30"
            );
            return next;
          });
          // Auto-resume if it mistakenly paused due to sequential key registrations
          setGameState((current) => current === 'PAUSED' ? 'PLAYING' : current);
          justToggledRef.current = true;
        }
        return;
      }

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (gameState === 'PLAYING') {
          launchBalls();
          if (paddleRef.current.effect === 'laser') {
            shootLasers();
          }
        }
      }

      if (key === 'p') {
        // Only pause if Q is not currently pressed to avoid collision with Dev test mode trigger
        if (!keysPressed.current['q']) {
          if (gameState === 'PLAYING') setGameState('PAUSED');
          else if (gameState === 'PAUSED') setGameState('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      if (key === 'p' || key === 'q') {
        justToggledRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Touch and Mouse sliding control
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    // Scale pointer coordinate mathematically
    const scaleX = CANVAS_WIDTH / rect.width;
    const pointerX = (e.clientX - rect.left) * scaleX;
    
    // Position center of paddle to pointerX
    const pad = paddleRef.current;
    let targetX = pointerX - pad.width / 2;
    // Bound checking
    targetX = Math.max(0, Math.min(CANVAS_WIDTH - pad.width, targetX));
    pad.x = targetX;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING') return;
    // Clicking launches/shoots
    launchBalls();
    if (paddleRef.current.effect === 'laser') {
      shootLasers();
    }
  };

  // Main Loop logic inside requestAnimationFrame
  useEffect(() => {
    let animationId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Core physics & render loop
    const update = () => {
      if (gameState !== 'PLAYING') return;

      const pad = paddleRef.current;
      const theme = THEMES[settingsRef.current.theme];

      // 1. Move Paddle with Keyboard
      let speedFactor = statsRef.current.multiplier > 3 ? 1.2 : 1.0;
      if (keysPressed.current['arrowleft'] || keysPressed.current['a']) {
        pad.x = Math.max(0, pad.x - pad.speed * speedFactor);
      }
      if (keysPressed.current['arrowright'] || keysPressed.current['d']) {
        pad.x = Math.min(CANVAS_WIDTH - pad.width, pad.x + pad.speed * speedFactor);
      }

      // Decrement paddle effects
      if (pad.effectTimer > 0) {
        pad.effectTimer--;
        if (pad.effectTimer <= 0) {
          pad.effect = 'normal';
          pad.width = 120; // reset size
        }
      }

      // Decrement ball speed effects
      if (ballSpeedEffectTimerRef.current > 0) {
        ballSpeedEffectTimerRef.current--;
        if (ballSpeedEffectTimerRef.current <= 0) {
          ballSpeedEffectRef.current = 'normal';
          ballsRef.current.forEach((b) => {
            b.speed = INITIAL_BALL_SPEED * settingsRef.current.ballSpeedFactor;
            // recalibrate displacement
            const angle = Math.atan2(b.dx, b.dy);
            b.dx = b.speed * Math.sin(angle);
            b.dy = b.speed * Math.cos(angle);
          });
          spawnFloatingText(pad.x + pad.width / 2, pad.y - 15, 'スピード通常化 - Normal Speed', '#ffffff');
        }
      }

      // Auto-shoot lasers if equipped with Laser Cannon (saves effort & fixes mobile shooting issues)
      if (pad.effect === 'laser') {
        if (pad.laserCooldown === undefined) {
          pad.laserCooldown = 0;
        }
        pad.laserCooldown--;
        if (pad.laserCooldown <= 0) {
          shootLasers();
          pad.laserCooldown = 24; // Shoot automatically every 24 frames (~0.4 seconds)
        }
      }

      // 2. Update Lasers
      lasersRef.current = lasersRef.current.filter((laser) => {
        laser.y += laser.dy;

        // Laser-Brick collision check
        let hit = false;
        const remainingBricks = bricksRef.current;
        for (let i = 0; i < remainingBricks.length; i++) {
          const b = remainingBricks[i];
          if (b.hp > 0 && b.type !== 'metal') {
            // AABB checks
            if (
              laser.x + laser.width > b.x &&
              laser.x < b.x + b.width &&
              laser.y < b.y + b.height &&
              laser.y + laser.height > b.y
            ) {
              hit = true;
              damageBrick(b);
              break; // exit loop
            }
          }
        }

        // keep laser if it hasn't hit something or gone out of screen
        return !hit && laser.y > 0;
      });

      // 3. Update Balls
      let activeBalls = ballsRef.current;
      const pointsAccumulated = { sum: 0 };
      const triggers = { lifeLost: false, brickBrokeCount: 0 };

      activeBalls = activeBalls.filter((ball) => {
        if (ball.stuck) {
          // Keep stuck coordinate relative to paddle
          ball.x = pad.x + pad.width / 2 + ball.stuckOffset;
          ball.y = pad.y - ball.radius - 2;
          return true;
        }

        // Apply movement vector
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Collision: Left/Right Walls
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.dx = -ball.dx;
          playSound.bounce(settingsRef.current.muted);
        } else if (ball.x + ball.radius > CANVAS_WIDTH) {
          ball.x = CANVAS_WIDTH - ball.radius;
          ball.dx = -ball.dx;
          playSound.bounce(settingsRef.current.muted);
        }

        // Collision: Top Wall
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.dy = -ball.dy;
          playSound.bounce(settingsRef.current.muted);
        }

        // Collision: Bottom boundary (Draining)
        if (ball.y + ball.radius > CANVAS_HEIGHT) {
          // If shield is active, block it!
          if (statsRef.current.hasShield) {
            playSound.shieldBreak(settingsRef.current.muted);
            playSound.vibrate(settingsRef.current.vibration, 100);
            ball.y = CANVAS_HEIGHT - ball.radius - 12;
            ball.dy = -Math.abs(ball.dy); // Bounce upwards safely

            setStats((prev) => ({
              ...prev,
              hasShield: false,
            }));
            spawnFloatingText(ball.x, CANVAS_HEIGHT - 30, 'SHIELD BROKEN', '#ff3b30');
            return true;
          }

          // Otherwise let it die
          return false;
        }

        // Collision: Paddle
        if (
          ball.x + ball.radius > pad.x &&
          ball.x - ball.radius < pad.x + pad.width &&
          ball.y + ball.radius > pad.y &&
          ball.y - ball.radius < pad.y + pad.height
        ) {
          // Reposition ball to prevent paddle penetration
          ball.y = pad.y - ball.radius;

          playSound.bounce(settingsRef.current.muted);
          playSound.vibrate(settingsRef.current.vibration, 30);

          // Handle Sticky Paddle powerup
          if (pad.effect === 'sticky') {
            ball.stuck = true;
            ball.stuckOffset = ball.x - (pad.x + pad.width / 2);
            ball.dx = 0;
            ball.dy = 0;
            return true;
          }

          // Custom bounce angle based on pad intersection position
          const hitPos = (ball.x - (pad.x + pad.width / 2)) / (pad.width / 2);
          const maxAngle = Math.PI / 3.2; // roughly 56 degrees maximum deflection
          const angle = hitPos * maxAngle;

          ball.dy = -Math.abs(ball.speed * Math.cos(angle));
          ball.dx = ball.speed * Math.sin(angle);

          // Correct safety limits to ensure y-speed is not excessively flat/horizontal
          if (Math.abs(ball.dy) < 1.5) {
            ball.dy = -1.5;
            ball.dx = (ball.dx > 0 ? 1 : -1) * Math.sqrt(Math.pow(ball.speed, 2) - 2.25);
          }
        }

        // Collision: Bricks
        const originalBricks = bricksRef.current;
        for (let i = 0; i < originalBricks.length; i++) {
          const b = originalBricks[i];
          if (b.hp <= 0) continue;

          // AABB check with ball
          if (
            ball.x + ball.radius > b.x &&
            ball.x - ball.radius < b.x + b.width &&
            ball.y + ball.radius > b.y &&
            ball.y - ball.radius < b.y + b.height
          ) {
            // Perform collision reflection
            // Find which side was hit by backtracking the displacement overlapping
            const overlapX = Math.min(ball.x + ball.radius - b.x, b.x + b.width - (ball.x - ball.radius));
            const overlapY = Math.min(ball.y + ball.radius - b.y, b.y + b.height - (ball.y - ball.radius));

            if (overlapX < overlapY) {
              // Hit left or right side
              ball.dx = ball.x < b.x + b.width / 2 ? -Math.abs(ball.dx) : Math.abs(ball.dx);
              // Reposition to prevent penetration
              ball.x = ball.dx < 0 ? b.x - ball.radius : b.x + b.width + ball.radius;
            } else {
              // Hit top or bottom side
              ball.dy = ball.y < b.y + b.height / 2 ? -Math.abs(ball.dy) : Math.abs(ball.dy);
              // Reposition to prevent penetration
              ball.y = ball.dy < 0 ? b.y - ball.radius : b.y + b.height + ball.radius;
            }

            // Deal damage
            damageBrick(b);
            break; // only hit one brick per frame per ball
          }
        }

        return true;
      });

      // Handle lost balls
      if (activeBalls.length === 0) {
        triggers.lifeLost = true;
      }
      ballsRef.current = activeBalls;

      // Update Combo multiplier timer (decrements frame-rate) safely inside Ref to prevent cascading React re-render bottleneck
      if (statsRef.current.comboTimer > 0) {
        statsRef.current.comboTimer--;
        if (statsRef.current.comboTimer <= 0) {
          statsRef.current.multiplier = 1;
          setStats((prev) => ({
            ...prev,
            comboTimer: 0,
            multiplier: 1,
          }));
        } else if (statsRef.current.comboTimer % 10 === 0) {
          // Throttled UI state update: Sync with React State only every 10 frames (approx 160ms)
          setStats((prev) => ({
            ...prev,
            comboTimer: statsRef.current.comboTimer,
            multiplier: statsRef.current.multiplier,
          }));
        }
      }

      // Check if life was lost completely
      if (triggers.lifeLost) {
        handleLifeLoss();
      }

      // Check level clear
      const hasDestructibleBricks = bricksRef.current.some((b) => b.hp > 0 && b.type !== 'metal');
      if (!hasDestructibleBricks && bricksRef.current.length > 0) {
        playSound.levelClear(settingsRef.current.muted);
        playSound.vibrate(settingsRef.current.vibration, 150);
        setGameState('LEVELCLEAR');
      }

      // 4. Update Powerups
      powerUpsRef.current = powerUpsRef.current.filter((pu) => {
        pu.y += pu.dy;

        // Paddle collision check
        if (
          pu.x + pu.radius > pad.x &&
          pu.x - pu.radius < pad.x + pad.width &&
          pu.y + pu.radius > pad.y &&
          pu.y - pu.radius < pad.y + pad.height
        ) {
          applyPowerUp(pu.type, pu.x, pu.y);
          return false;
        }

        // Out of screen bottom boundary
        return pu.y - pu.radius < CANVAS_HEIGHT;
      });

      // 5. Update Particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.life++;
        p.alpha = 1 - p.life / p.maxLife;
        return p.life < p.maxLife;
      });

      // 6. Update Floating Texts
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => {
        ft.y -= 0.6; // rise upwards slowly
        ft.life++;
        return ft.life < ft.maxLife;
      });

      // 7. Render frame
      render(ctx);

      // Recursive request
      animationId = requestAnimationFrame(update);
    };

    // Helper functions inside effect scope to easily access states
    const damageBrick = (brick: Brick) => {
      if (brick.type === 'metal') {
        playSound.hardHit(settingsRef.current.muted);
        return;
      }

      // If test mode is active, hard bricks break in one hit
      if (isTestModeRef.current && brick.type === 'hard') {
        brick.hp = 1;
      }

      brick.hp--;
      const curStats = statsRef.current;
      const basePoints = brick.points;

      // Combo management
      let bonusMult = curStats.multiplier;
      if (curStats.comboTimer > 0) {
        bonusMult = Math.min(10, curStats.multiplier + 1);
      }

      const pointAward = basePoints * bonusMult;
      const maxMultRecorded = Math.max(curStats.maxMultiplier, bonusMult);

      playSound.shatter(settingsRef.current.muted, brick.hp);
      playSound.vibrate(settingsRef.current.vibration, 15);

      if (brick.hp <= 0) {
        // Destroyed! Spawn particles
        const theme = THEMES[settingsRef.current.theme];
        const particleColor = brick.type === 'explosive' 
          ? theme.explosive 
          : theme.normal[Math.floor(Math.random() * theme.normal.length)];
        
        spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, particleColor, 12);
        
        // Spawn Floating Point Text with multiplier status
        spawnFloatingText(
          brick.x + brick.width / 2,
          brick.y,
          `+${pointAward} ${bonusMult > 1 ? `x${bonusMult}` : ''}`,
          particleColor
        );

        // Check explosive splash
        if (brick.type === 'explosive') {
          triggerExplosiveSplash(brick);
        }

        // Roll for potential power-up reward spawning (17% chance, 100% if test mode active)
        if (isTestModeRef.current || Math.random() < 0.17) {
          spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
        }
      } else {
        // Still standing. Flash impact sparks
        spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, '#ffffff', 4);
        spawnFloatingText(brick.x + brick.width / 2, brick.y, 'HIT!', '#ffffff');
      }

      setStats((prev) => {
        const nextScore = prev.score + pointAward;
        return {
          ...prev,
          score: nextScore,
          highScore: Math.max(prev.highScore, nextScore),
          bricksCleared: brick.hp <= 0 ? prev.bricksCleared + 1 : prev.bricksCleared,
          multiplier: bonusMult,
          maxMultiplier: maxMultRecorded,
          comboTimer: 180, // reset timer (approx 3 seconds at 60fps)
        };
      });
    };

    // Splash damage radius
    const triggerExplosiveSplash = (expBrick: Brick) => {
      playSound.explosion(settingsRef.current.muted);
      playSound.vibrate(settingsRef.current.vibration, 180);
      spawnParticles(expBrick.x + expBrick.width / 2, expBrick.y + expBrick.height / 2, '#ff3b30', 30);

      // Find adjacent brick elements within 100px radius
      const explosionCenter = {
        x: expBrick.x + expBrick.width / 2,
        y: expBrick.y + expBrick.height / 2,
      };

      const others = bricksRef.current;
      others.forEach((b) => {
        if (b.hp <= 0 || b.id === expBrick.id) return;
        const bCenter = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        const dist = Math.hypot(explosionCenter.x - bCenter.x, explosionCenter.y - bCenter.y);

        if (dist <= 110) {
          // splash damage
          setTimeout(() => {
            damageBrick(b);
          }, 80); // slight sequential delay for lovely chaining visualization effects
        }
      });
    };

    // Spawn a power-up dropping down
    const spawnPowerUp = (x: number, y: number) => {
      const types: PowerUpType[] = [
        'extra-ball',
        'expand-paddle',
        'shrink-paddle',
        'sticky-paddle',
        'laser-paddle',
        'slow-ball',
        'fast-ball',
        'shield',
      ];
      
      // Select random powerup type
      // Let's weights: positive powerups are 80%, minor visual hazards 20%
      const weights = [0.22, 0.18, 0.08, 0.15, 0.12, 0.10, 0.05, 0.10]; // Matches indexes
      let randomVal = Math.random();
      let selectedType: PowerUpType = 'extra-ball';
      let cumulativeSum = 0;

      for (let i = 0; i < types.length; i++) {
        cumulativeSum += weights[i];
        if (randomVal <= cumulativeSum) {
          selectedType = types[i];
          break;
        }
      }

      powerUpsRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        dy: 2.2, // falling speed
        type: selectedType,
        radius: 12,
      });
    };

    const applyPowerUp = (type: PowerUpType, x: number, y: number) => {
      playSound.powerup(settingsRef.current.muted);
      playSound.vibrate(settingsRef.current.vibration, 70);

      const pad = paddleRef.current;
      let label = '';
      let color = '#ffffff';

      switch (type) {
        case 'extra-ball':
          label = 'マルチボール - Multiball';
          color = '#00ffff';
          // Spawn 2 new fast balls originating from existing ball positions
          const existing = ballsRef.current[0] || { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, speed: INITIAL_BALL_SPEED };
          const b1: Ball = {
            id: Math.random().toString(),
            x: existing.x,
            y: existing.y,
            dx: -Math.random() * 3 - 1,
            dy: -Math.abs(existing.speed),
            radius: BALL_RADIUS,
            speed: existing.speed,
            stuck: false,
            stuckOffset: 0,
          };
          const b2: Ball = {
            id: Math.random().toString(),
            x: existing.x,
            y: existing.y,
            dx: Math.random() * 3 + 1,
            dy: -Math.abs(existing.speed),
            radius: BALL_RADIUS,
            speed: existing.speed,
            stuck: false,
            stuckOffset: 0,
          };
          ballsRef.current.push(b1, b2);
          break;

        case 'expand-paddle':
          label = 'パドル拡大 - Expanded';
          color = '#39ff14';
          pad.effect = 'normal';
          pad.width = 170; // expand size
          pad.effectTimer = 480; // 8 seconds
          break;

        case 'shrink-paddle':
          label = 'パドル縮小 - Small Paddle';
          color = '#ff003c';
          pad.effect = 'normal';
          pad.width = 80; // shrink size
          pad.effectTimer = 480; // 8 seconds
          break;

        case 'sticky-paddle':
          label = 'スタッキー - Sticky';
          color = '#fffb00';
          pad.effect = 'sticky';
          pad.effectTimer = 600; // 10 seconds
          break;

        case 'laser-paddle':
          label = 'レーザー装備 - Laser Cannon';
          color = '#ff3b30';
          pad.effect = 'laser';
          pad.effectTimer = 480; // 8 seconds
          break;

        case 'slow-ball':
          label = 'スローボール - Slow Ball';
          color = '#7b2cbf';
          ballSpeedEffectRef.current = 'slow';
          ballSpeedEffectTimerRef.current = 480; // 8 seconds
          ballsRef.current.forEach((b) => {
            b.speed = Math.max(3.0, (INITIAL_BALL_SPEED * settingsRef.current.ballSpeedFactor) - 1.5);
            // recalibrate displacement
            const angle = Math.atan2(b.dx, b.dy);
            b.dx = b.speed * Math.sin(angle);
            b.dy = b.speed * Math.cos(angle);
          });
          break;

        case 'fast-ball':
          label = 'スピードアップ - Super Fast';
          color = '#e300ff';
          ballSpeedEffectRef.current = 'fast';
          ballSpeedEffectTimerRef.current = 480; // 8 seconds
          ballsRef.current.forEach((b) => {
            b.speed = Math.min(8.5, (INITIAL_BALL_SPEED * settingsRef.current.ballSpeedFactor) + 1.5);
            // recalibrate displacement
            const angle = Math.atan2(b.dx, b.dy);
            b.dx = b.speed * Math.sin(angle);
            b.dy = b.speed * Math.cos(angle);
          });
          break;

        case 'shield':
          label = 'シールド発動 - Shield Barrier';
          color = '#00ffcc';
          setStats((prev) => ({ ...prev, hasShield: true }));
          break;
      }

      spawnFloatingText(x, y - 10, label, color);
      spawnParticles(x, y, color, 15);
    };

    const handleLifeLoss = () => {
      playSound.vibrate(settingsRef.current.vibration, 120);
      playSound.bounce(settingsRef.current.muted);

      // Reset speed effect state on life loss
      ballSpeedEffectRef.current = 'normal';
      ballSpeedEffectTimerRef.current = 0;

      setStats((prev) => {
        const nextLives = isTestModeRef.current ? prev.lives : prev.lives - 1;
        if (nextLives <= 0) {
          playSound.gameOver(settingsRef.current.muted);
          setGameState('GAMEOVER');
        } else {
          // Recreate fresh default stuck ball
          const nextBall: Ball = {
            id: Math.random().toString(),
            x: paddleRef.current.x + paddleRef.current.width / 2,
            y: paddleRef.current.y - BALL_RADIUS - 2,
            dx: 0,
            dy: 0,
            radius: BALL_RADIUS,
            speed: INITIAL_BALL_SPEED * settingsRef.current.ballSpeedFactor,
            stuck: true,
            stuckOffset: 0,
          };
          ballsRef.current = [nextBall];
          // Remove active paddle hazards
          paddleRef.current.width = 120;
          paddleRef.current.effect = 'normal';
          paddleRef.current.effectTimer = 0;
        }

        return {
          ...prev,
          lives: Math.max(0, nextLives),
          multiplier: 1, // Reset combos on death
        };
      });
    };

    // Render engine
    const render = (c: CanvasRenderingContext2D) => {
      const activeTheme = THEMES[settingsRef.current.theme];

      // Draw Screen Background
      c.fillStyle = activeTheme.bg;
      c.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw elegant grid lines for cyber feel
      c.strokeStyle = activeTheme.grid;
      c.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, CANVAS_HEIGHT);
        c.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(CANVAS_WIDTH, y);
        c.stroke();
      }

      // Draw bottom shield line if active
      if (statsRef.current.hasShield) {
        c.shadowColor = activeTheme.shield;
        c.shadowBlur = 15;
        c.strokeStyle = activeTheme.shield;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(0, CANVAS_HEIGHT - 6);
        c.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 6);
        c.stroke();
        c.shadowBlur = 0; // reset
      }

      // Draw Bricks
      const bricks = bricksRef.current;
      bricks.forEach((b) => {
        if (b.hp <= 0) return;

        c.save();
        // Glow effect: restricted only to explosive bricks for major performance gains and cleaner design
        if (activeTheme.particleGlow) {
          if (b.type === 'explosive') {
            c.shadowBlur = 12;
            c.shadowColor = activeTheme.explosive;
          } else {
            // Normal, metal, and hard bricks do not compute shadowBlur, boosting performance and keeping design clean
            c.shadowBlur = 0;
          }
        }

        // Draw individual Brick styled with gradient
        const grad = c.createLinearGradient(b.x, b.y, b.x, b.y + b.height);
        if (b.type === 'metal') {
          grad.addColorStop(0, '#7f8c8d');
          grad.addColorStop(0.5, '#bdc3c7');
          grad.addColorStop(1, '#6c7a89');
        } else if (b.type === 'explosive') {
          // pulsing glow rate
          const alphaPulse = 0.6 + Math.sin(Date.now() / 100) * 0.4;
          grad.addColorStop(0, '#ff3b30');
          grad.addColorStop(0.4, '#ff9500');
          grad.addColorStop(1, '#ff3000');
          c.fillStyle = grad;
        } else if (b.type === 'hard') {
          // Clean, simple flat amber/gold gradient for hard bricks
          grad.addColorStop(0, '#f3b312');
          grad.addColorStop(1, '#b77903');
        } else {
          // Normal brick, gradient colored by column index
          const baseColor = activeTheme.normal[Math.floor(b.x / 80) % activeTheme.normal.length];
          grad.addColorStop(0, lightenColor(baseColor, 40));
          grad.addColorStop(1, darkenColor(baseColor, 20));
        }

        c.fillStyle = grad;
        // Rounded brick path
        drawRoundedRect(c, b.x, b.y, b.width, b.height, 4);
        c.fill();

        // Stroke border
        if (b.type === 'metal') {
          c.strokeStyle = '#4e5d6c';
          c.lineWidth = 1.5;
          c.stroke();
          // Draw bolts
          c.fillStyle = '#4e5d6c';
          c.fillRect(b.x + 3, b.y + 3, 2, 2);
          c.fillRect(b.x + b.width - 5, b.y + 3, 2, 2);
          c.fillRect(b.x + 3, b.y + b.height - 5, 2, 2);
          c.fillRect(b.x + b.width - 5, b.y + b.height - 5, 2, 2);
        } else if (b.type === 'explosive') {
          c.strokeStyle = '#ffffff';
          c.lineWidth = 1.5;
          c.stroke();
          // Inner core star
          c.fillStyle = '#ffffff';
          c.beginPath();
          c.arc(b.x + b.width / 2, b.y + b.height / 2, 4, 0, Math.PI * 2);
          c.fill();
        } else if (b.type === 'hard') {
          // Simple clean 1px gold border
          c.strokeStyle = '#ffe600';
          c.lineWidth = 1;
          c.stroke();

          // Crack lines inside Hard brick depending on missing HP (rendered simple and clean)
          if (b.hp < b.maxHp) {
            c.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            c.lineWidth = 1;
            c.beginPath();
            if (b.hp === 2) {
              c.moveTo(b.x + 10, b.y + 6);
              c.lineTo(b.x + b.width - 10, b.y + b.height - 6);
              c.stroke();
            } else if (b.hp === 1) {
              c.moveTo(b.x + 10, b.y + 6);
              c.lineTo(b.x + b.width - 10, b.y + b.height - 6);
              c.moveTo(b.x + b.width - 10, b.y + 6);
              c.lineTo(b.x + 10, b.y + b.height - 6);
              c.stroke();
            }
          }
        } else {
          c.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          c.lineWidth = 1;
          c.stroke();
        }
        c.restore();
      });

      // Draw Powerups
      powerUpsRef.current.forEach((pu) => {
        c.save();
        if (activeTheme.particleGlow) {
          c.shadowBlur = 10;
          c.shadowColor = pu.type === 'extra-ball' ? '#00ffff' : pu.type === 'shield' ? '#00ffcc' : '#ffea00';
        }

        // Draw outer ring
        c.strokeStyle = '#ffffff';
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(pu.x, pu.y, pu.radius, 0, Math.PI * 2);
        c.stroke();

        // Inner solid core color
        c.fillStyle = getPowerUpColor(pu.type);
        c.beginPath();
        c.arc(pu.x, pu.y, pu.radius - 2, 0, Math.PI * 2);
        c.fill();

        // Draw short letter representations inside
        c.fillStyle = '#000000';
        c.font = 'bold 10px Inter, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        let symbol = getPowerUpSymbol(pu.type);
        c.fillText(symbol, pu.x, pu.y + 0.5);

        c.restore();
      });

      // Draw Lasers
      lasersRef.current.forEach((laser) => {
        c.fillStyle = activeTheme.paddleLaser;
        if (activeTheme.particleGlow) {
          c.shadowBlur = 8;
          c.shadowColor = activeTheme.paddleLaser;
        }
        c.fillRect(laser.x, laser.y, laser.width, laser.height);
        c.shadowBlur = 0; // reset
      });

      // Draw Paddle
      const pad = paddleRef.current;
      c.save();
      if (activeTheme.particleGlow) {
        c.shadowBlur = 12;
        c.shadowColor = pad.effect === 'laser' ? activeTheme.paddleLaser : activeTheme.paddle;
      }

      // Rounded neon paddle
      const paddleColor = pad.effect === 'laser' 
        ? activeTheme.paddleLaser 
        : pad.effect === 'sticky' 
          ? '#fffb00' 
          : activeTheme.paddle;

      c.fillStyle = paddleColor;
      drawRoundedRect(c, pad.x, pad.y, pad.width, pad.height, 8);
      c.fill();

      // Shiny center capsule
      c.fillStyle = activeTheme.paddleInner;
      drawRoundedRect(c, pad.x + 6, pad.y + 3, pad.width - 12, pad.height - 6, 4);
      c.fill();

      // If in laser effect, render small gun sights
      if (pad.effect === 'laser') {
        c.fillStyle = '#ff003c';
        c.fillRect(pad.x + 8, pad.y - 4, 6, 4);
        c.fillRect(pad.x + pad.width - 14, pad.y - 4, 6, 4);
      }
      c.restore();

      // Draw active powerup duration gauge right under the paddle
      if (pad.effectTimer > 0 && (pad.effect !== 'normal' || pad.width !== 120)) {
        c.save();
        const maxTimer = pad.effect === 'sticky' ? 600 : 480;
        const progress = Math.max(0, Math.min(1, pad.effectTimer / maxTimer));
        const barWidth = Math.max(40, pad.width * 0.8);
        const barHeight = 4;
        const barX = pad.x + (pad.width - barWidth) / 2;
        const barY = pad.y + pad.height + 6;

        // Draw timer background tracker bar
        c.fillStyle = 'rgba(255, 255, 255, 0.15)';
        drawRoundedRect(c, barX, barY, barWidth, barHeight, 2);
        c.fill();

        // Draw remaining active timer fill
        const gaugeColor = pad.effect === 'laser' 
          ? activeTheme.paddleLaser 
          : pad.effect === 'sticky' 
            ? '#fffb00' 
            : pad.width > 120 
              ? '#39ff14' 
              : '#ff003c';
        
        c.fillStyle = gaugeColor;
        if (activeTheme.particleGlow) {
          c.shadowBlur = 6;
          c.shadowColor = gaugeColor;
        }
        drawRoundedRect(c, barX, barY, barWidth * progress, barHeight, 2);
        c.fill();
        c.restore();
      }

      // Draw Balls with historical trail
      ballsRef.current.forEach((b) => {
        c.save();
        if (activeTheme.particleGlow) {
          c.shadowBlur = 10;
          c.shadowColor = activeTheme.ball;
        }

        // Draw dynamic orb
        c.fillStyle = activeTheme.ball;
        c.beginPath();
        c.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        c.fill();

        // Shiny reflections
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(b.x - 2, b.y - 2, b.radius / 3, 0, Math.PI * 2);
        c.fill();
        c.restore();
      });

      // Draw Particles (Optimized: single context state save/restore, bypassed heavy shadowBlur on multiple particles)
      c.save();
      particlesRef.current.forEach((p) => {
        c.globalAlpha = p.alpha;
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        c.fill();
      });
      c.restore();

      // Draw Floating Pont Texts
      c.save();
      floatingTextsRef.current.forEach((ft) => {
        const opacity = 1 - ft.life / ft.maxLife;
        c.globalAlpha = opacity;
        c.fillStyle = ft.color;
        c.font = 'bold 13px Inter, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(ft.text, ft.x, ft.y);
      });
      c.restore();
    };

    // Color utility modifiers (using Map cache to prevent critical per-frame parsing overhead)
    const lightenColor = (col: string, amt: number) => {
      const cacheKey = `${col}_${amt}`;
      const cached = colorCacheRef.current.get(cacheKey);
      if (cached) return cached;

      let usePound = false;
      if (col[0] === "#") {
        col = col.slice(1);
        usePound = true;
      }
      const num = parseInt(col, 16);
      let r = (num >> 16) + amt;
      if (r > 255) r = 255; else if (r < 0) r = 0;
      let b = ((num >> 8) & 0x00FF) + amt;
      if (b > 255) b = 255; else if (b < 0) b = 0;
      let g = (num & 0x0000FF) + amt;
      if (g > 255) g = 255; else if (g < 0) g = 0;
      const result = (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
      
      colorCacheRef.current.set(cacheKey, result);
      return result;
    };

    const darkenColor = (col: string, amt: number) => {
      return lightenColor(col, -amt);
    };

    const getPowerUpColor = (type: PowerUpType) => {
      switch (type) {
        case 'extra-ball': return '#00f0ff';
        case 'expand-paddle': return '#39ff14';
        case 'shrink-paddle': return '#ff003c';
        case 'sticky-paddle': return '#fffb00';
        case 'laser-paddle': return '#ff3b30';
        case 'slow-ball': return '#7b2cbf';
        case 'fast-ball': return '#e300ff';
        case 'shield': return '#00ffcc';
      }
    };

    const getPowerUpSymbol = (type: PowerUpType) => {
      switch (type) {
        case 'extra-ball': return '×3';
        case 'expand-paddle': return '＋';
        case 'shrink-paddle': return '－';
        case 'sticky-paddle': return '★';
        case 'laser-paddle': return '▲';
        case 'slow-ball': return '▼';
        case 'fast-ball': return '▲';
        case 'shield': return '🛡';
      }
    };

    const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    };

    // Begin Animation Loop Recursively
    animationId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, settings.theme]);

  // Handle Multiplier Combo timer updating local UI feedback
  useEffect(() => {
    if (stats.comboTimer <= 0) {
      setComboPercent(0);
      return;
    }
    const currentPercent = (stats.comboTimer / 180) * 100;
    setComboPercent(currentPercent);
  }, [stats.comboTimer]);

  return (
    <div className={`flex flex-col items-center justify-center ${isShortScreen ? 'p-1' : 'p-2 sm:p-4'} max-w-full w-full select-none`} ref={containerRef} id="game_layout_wrapper">
      {/* Top Action & Setting Panels */}
      <div className={`w-full max-w-[800px] flex items-center justify-between ${isShortScreen ? 'mb-1' : 'mb-1.5 sm:mb-3'} text-slate-200`}>
        <button
          onClick={onGoBack}
          className="flex items-center gap-1 px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition duration-200"
          id="btn_goback"
        >
          <ArrowLeft size={12} className="sm:size-[14px]" />
          タイトルへ戻る
        </button>

        <div className="flex items-center gap-1.5">
          {/* Theme selector */}
          <select
            value={settings.theme}
            onChange={(e) => setSettings((p) => ({ ...p, theme: e.target.value as VisualTheme }))}
            className="px-1.5 py-0.5 text-[10px] sm:text-xs bg-slate-900 border border-slate-700 text-slate-300 rounded-md outline-none"
            id="theme_dropdown"
          >
            <option value="neon-retro">ネオン (Neon Retro)</option>
            <option value="cyberpunk">サイバー (Cyberpunk)</option>
            <option value="classic-slate">スレート (Slate)</option>
            <option value="magma">マグマ (Magma)</option>
          </select>

          {/* Mute button */}
          <button
            onClick={() => setSettings((p) => ({ ...p, muted: !p.muted }))}
            className="p-1 bg-slate-900 border border-slate-700 text-slate-400 hover:text-white rounded-md transition"
            id="btn_mute_toggle"
          >
            {settings.muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
        </div>
      </div>

      {/* Test Mode Active Indicator Bar */}
      {isTestMode && (
        <div className="w-full max-w-[800px] mb-1.5 px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-lg text-rose-400 text-[10px] sm:text-xs flex items-center justify-between font-mono animate-pulse" id="test_mode_indicator">
          <span className="flex items-center gap-1">🔧 <b>TEST MODE ACTIVE:</b> 無限ライフ / アイテム100%ドロップ / 強固一撃破壊</span>
          <span className="bg-rose-500 text-black font-extrabold px-1 rounded text-[9px] scale-90">DEBUG</span>
        </div>
      )}

      {/* Core Score HUD Row */}
      <div className={`w-full max-w-[800px] grid grid-cols-4 gap-1 sm:gap-3 ${isShortScreen ? 'mb-1' : 'mb-1.5 sm:mb-3'} text-slate-100`} id="stats_hud_row">
        {/* Score & HighScore */}
        <div className={`bg-slate-900/90 border border-slate-800 rounded-lg ${isShortScreen ? 'p-0.5' : 'p-1 sm:p-2'} flex flex-col items-center justify-center`}>
          <div className="text-[8px] sm:text-[10px] text-slate-400 tracking-wider leading-none mb-0.5">SCORE</div>
          <div className="text-xs sm:text-lg font-bold font-mono text-cyan-400 leading-none">{stats.score}</div>
          <div className="text-[6px] sm:text-[9px] text-slate-500 font-mono mt-0.5 leading-none">HIGH: {stats.highScore}</div>
        </div>

        {/* Level indicator */}
        <div className={`bg-slate-900/90 border border-slate-800 rounded-lg ${isShortScreen ? 'p-0.5' : 'p-1 sm:p-2'} flex flex-col items-center justify-center`}>
          <div className="text-[8px] sm:text-[10px] text-slate-400 tracking-wider leading-none mb-0.5">STAGE</div>
          <div className="text-xs sm:text-lg font-bold font-mono text-pink-400 leading-none">{stats.level} / {LEVELS.length}</div>
          <div className="text-[6px] sm:text-[9px] text-slate-400 font-mono text-center truncate w-full mt-0.5 leading-none">
            {LEVELS[stats.level - 1]?.name.split(' - ')[1]}
          </div>
        </div>

        {/* Multiplier / Combo */}
        <div className={`bg-slate-900/90 border border-slate-800 rounded-lg ${isShortScreen ? 'p-0.5' : 'p-1 sm:p-2'} flex flex-col items-center justify-center relative overflow-hidden`}>
          <div className="text-[8px] sm:text-[10px] text-slate-400 tracking-wider leading-none mb-0.5">COMBO x</div>
          <div className="text-xs sm:text-xl font-bold font-mono text-yellow-400 leading-none">
            {stats.multiplier}x
          </div>
          {/* Combo countdown progress line */}
          {stats.multiplier > 1 && (
            <div className="absolute bottom-0 left-0 h-0.5 bg-yellow-400 transition-all duration-75" style={{ width: `${comboPercent}%` }} />
          )}
        </div>

        {/* Lives left representation */}
        <div className={`bg-slate-900/90 border border-slate-800 rounded-lg ${isShortScreen ? 'p-0.5' : 'p-1 sm:p-2'} flex flex-col items-center justify-center`}>
          <div className="text-[8px] sm:text-[10px] text-slate-400 tracking-wider mb-1 leading-none">LIVES</div>
          <div className="flex gap-0.5 sm:gap-1.5">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 sm:w-4 sm:h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                  idx < stats.lives 
                    ? 'bg-gradient-to-tr from-pink-500 to-rose-400 border border-pink-300 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                    : 'bg-slate-800 border border-slate-700 opacity-30'
                }`}
              />
            ))}
          </div>
          {stats.hasShield && (
            <div className="flex items-center gap-0.5 mt-0.5 text-[7px] sm:text-[9px] text-teal-400 font-mono leading-none">
              <Shield size={7} /> Shield
            </div>
          )}
        </div>
      </div>

      {/* Main Game Stage Frame Area */}
      <div
        className="relative bg-slate-950 border-2 border-slate-800 rounded-xl overflow-hidden shadow-2xl w-full select-none cursor-crosshair touch-none"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        style={{ maxWidth: '800px', aspectRatio: '16/9', maxHeight: isShortScreen ? '45vh' : '55vh' }}
        id="board_container"
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block"
          id="main_canvas"
        />

        {/* Modals & Overlays overlaying inside */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4">
            <Pause size={48} className="text-yellow-400 animate-pulse mb-3" />
            <h2 className="text-2xl font-black text-slate-100 tracking-wider mb-1 font-sans">一時停止中</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs leading-relaxed">
              画面をタップ/クイックするか、[P]キーを押してゲームを再開します。
            </p>
            <button
              onClick={() => setGameState('PLAYING')}
              className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 font-bold text-slate-950 rounded-lg shadow-lg font-mono transition duration-150 transform active:scale-95"
              id="pause_resume_btn"
            >
              RESUME GAME
            </button>
          </div>
        )}

        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
            <AlertTriangle size={54} className="text-rose-500 mb-2 animate-bounce" />
            <h2 className="text-3xl font-black text-white tracking-widest uppercase mb-1">GAME OVER</h2>
            <p className="text-rose-300 text-xs mb-6 font-mono">FINAL SCORE: {stats.score}</p>
            
            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 font-bold text-white rounded-lg shadow-[0_0_12px_rgba(244,63,94,0.5)] transition duration-200 text-sm flex items-center gap-1.5"
                id="btn_retry"
              >
                <RotateCcw size={16} /> もう一度プレイ
              </button>
              <button
                onClick={onGoBack}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 rounded-lg border border-slate-700 transition duration-200 text-sm"
                id="btn_die_fallback"
              >
                終了する
              </button>
            </div>
          </div>
        )}

        {gameState === 'LEVELCLEAR' && (
          <div className="absolute inset-0 bg-teal-950/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6">
            <Disc size={54} className="text-teal-400 mb-2 animate-spin" />
            <h2 className="text-3xl font-black text-teal-300 tracking-wider">STAGE CLEAR!</h2>
            <p className="text-slate-300 text-sm mt-1 mb-6 font-mono">
              ボーナススコア獲得！次のステージがアンロックされました。
            </p>
            
            <button
              onClick={handleNextLevel}
              className="px-6 py-3 bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 font-bold text-slate-950 rounded-lg shadow-[0_0_15px_rgba(45,212,191,0.5)] transition duration-200 transform hover:scale-105 active:scale-95 text-sm"
              id="btn_gonext"
            >
              NEXT STAGE
            </button>
          </div>
        )}

        {gameState === 'COMPLETED' && (
          <div className="absolute inset-0 bg-yellow-950/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
            <div className="text-5xl mb-3">🏆</div>
            <h2 className="text-3xl font-extrabold text-yellow-400 tracking-widest uppercase">ALL STAGES CLEARED</h2>
            <p className="text-slate-300 text-sm my-2 max-w-sm leading-relaxed">
              おめでとうございます！すべてのステージをクリアしました。君こそが真のブロック崩しマスターだ！
            </p>
            <div className="bg-yellow-900/30 border border-yellow-800/60 p-3 rounded-lg mb-6 font-mono text-xs w-full max-w-xs text-yellow-300 grid grid-cols-2 gap-2 text-left">
              <div>最終スコア:</div>
              <div className="text-right font-bold text-white">{stats.score}</div>
              <div>最大コンボ:</div>
              <div className="text-right font-bold text-white">{stats.maxMultiplier}x</div>
              <div>破壊ブロック:</div>
              <div className="text-right font-bold text-white">{stats.bricksCleared}</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.5)] transition duration-200"
                id="btn_restart_game"
              >
                最初からプレイ
              </button>
              <button
                onClick={onGoBack}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 transition"
                id="btn_fallback_complete"
              >
                タイトルに戻る
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Guides Panel */}
      {!isShortScreen && (
        <div className="w-full max-w-[800px] mt-4 p-3 bg-slate-900/55 border border-slate-800/80 rounded-lg text-slate-400 text-xs flex items-start gap-2.5">
          <Keyboard size={16} className="text-slate-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-semibold text-slate-300">{controlsInfo}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-850 text-slate-500">
              <div><span className="text-cyan-400 font-semibold font-mono">M</span> / <span className="text-cyan-400 font-semibold font-mono">★</span>: マルチボール</div>
              <div><span className="text-green-400 font-semibold font-mono">＋</span> / <span className="text-green-400 font-semibold font-mono">－</span>: パドルサイズ変化</div>
              <div><span className="text-rose-400 font-semibold font-mono">▲</span>: レーザー (スペース発射)</div>
              <div><span className="text-teal-400 font-semibold font-mono">🛡</span>: 下部落下防止シールド</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
