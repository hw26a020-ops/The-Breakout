export type PowerUpType =
  | 'extra-ball'
  | 'expand-paddle'
  | 'shrink-paddle'
  | 'sticky-paddle'
  | 'laser-paddle'
  | 'slow-ball'
  | 'fast-ball'
  | 'shield';

export interface Ball {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  speed: number;
  stuck: boolean; // Is it currently stuck to the paddle?
  stuckOffset: number; // Offset from paddle center
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  effect: 'normal' | 'sticky' | 'laser';
  effectTimer: number; // in frames or milliseconds
  laserCooldown?: number;
}

export interface Brick {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number; // 0 means destroyed
  maxHp: number; // For rendering gradient/shading
  type: 'normal' | 'hard' | 'metal' | 'explosive'; // types on color & behavior
  points: number;
}

export interface PowerUp {
  id: string;
  x: number;
  y: number;
  dy: number;
  type: PowerUpType;
  radius: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
}

export interface Laser {
  id: string;
  x: number;
  y: number;
  dy: number;
  width: number;
  height: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  level: number;
  lives: number;
  bricksCleared: number;
  hasShield: boolean;
  multiplier: number;
  maxMultiplier: number;
  comboTimer: number; // state to track time between combo hits
}

export type VisualTheme = 'neon-retro' | 'cyberpunk' | 'classic-slate' | 'magma';

export interface GameSettings {
  muted: boolean;
  vibration: boolean;
  theme: VisualTheme;
  ballSpeedFactor: number; // Multiplier
}
