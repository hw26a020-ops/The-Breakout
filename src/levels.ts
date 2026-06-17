import { Brick } from './types';

export interface LevelDefinition {
  name: string;
  description: string;
  generate: () => Brick[];
}

const BRICK_WIDTH = 58;
const BRICK_HEIGHT = 22;
const GAP = 4;
const START_Y = 60;
const START_X = 40; // To center standard layouts (12 columns: 12 * (58 + 4) = 12 * 62 = 744, + margins)

export const LEVELS: LevelDefinition[] = [
  {
    name: 'ネオン・ゲート - Neon Gate',
    description: '基本操作をマスターするためのシンプルな配置。',
    generate: () => {
      const bricks: Brick[] = [];
      const colors: ('normal' | 'hard' | 'explosive')[] = ['explosive', 'hard', 'normal', 'normal', 'normal'];
      
      // Let's make an arch-like structure
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 12; col++) {
          // Gate pattern: omit center bricks in lower rows to create an arch/gate
          if (row >= 2 && col >= 4 && col <= 7) {
            continue;
          }
          
          let type: 'normal' | 'hard' | 'explosive' = 'normal';
          let hp = 1;
          if (row === 0) {
            type = 'hard';
            hp = 2;
          } else if (row === 1 && (col === 0 || col === 11)) {
            type = 'explosive';
            hp = 1;
          }
          
          bricks.push({
            id: `l1-${row}-${col}`,
            x: START_X + col * (BRICK_WIDTH + GAP),
            y: START_Y + row * (BRICK_HEIGHT + GAP),
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
            hp,
            maxHp: hp,
            type: type,
            points: hp * 100 + (type === 'explosive' ? 150 : 0),
          });
        }
      }
      return bricks;
    },
  },
  {
    name: 'インベーダー・襲来 - Invader Raid',
    description: 'ドット絵のエイリアン。爆発レンガを爆破して一気に巻き込め！',
    generate: () => {
      const bricks: Brick[] = [];
      // 11x8 space invader sprite grid
      const invader = [
        [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0], // antennae
        [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0], // head
        [0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0], // eyes (empty spaces)
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // body
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1], // mouth / sides
        [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1], // arms
        [0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0], // legs
      ];

      const invaderStartX = START_X + 30; // Shipped a bit right to center 11 columns
      const invaderStartY = START_Y + 10;

      for (let row = 0; row < invader.length; row++) {
        for (let col = 0; col < invader[row].length; col++) {
          if (invader[row][col] === 1) {
            let type: 'normal' | 'hard' | 'metal' | 'explosive' = 'normal';
            let hp = 1;
            
            // Customize eyes to be explosive! Let's make adjacent blocks explosive or hard
            if (row === 3 && (col === 0 || col === 10 || col === 5)) {
              type = 'explosive';
              hp = 1;
            } else if (row === 2 || row === 4) {
              type = 'hard';
              hp = 2;
            } else if (row === 7) {
              type = 'metal'; // Metal indestructible feet
              hp = 99;
            }
            
            bricks.push({
              id: `l2-${row}-${col}`,
              x: invaderStartX + col * (BRICK_WIDTH + GAP),
              y: invaderStartY + row * (BRICK_HEIGHT + GAP),
              width: BRICK_WIDTH,
              height: BRICK_HEIGHT,
              hp,
              maxHp: hp,
              type,
              points: type === 'metal' ? 0 : (hp === 99 ? 0 : hp * 120),
            });
          }
        }
      }
      return bricks;
    },
  },
  {
    name: 'シールド・フォート - Shield Fortress',
    description: '破壊不可能なメタルブロックがガードする要塞。隙間を狙え。',
    generate: () => {
      const bricks: Brick[] = [];
      
      // Let's create a fortress styled structure
      // Top row is hard.
      // Middle rows are protected by metal shields.
      // Explosive blocks in the core.
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 12; col++) {
          let type: 'normal' | 'hard' | 'metal' | 'explosive' = 'normal';
          let hp = 1;

          if (row === 1) {
            // A metal belt shielding the inner bricks, but with a few open gaps
            if (col === 2 || col === 3 || col === 8 || col === 9) {
              type = 'metal';
              hp = 99;
            }
          } else if (row === 3) {
            if (col === 0 || col === 5 || col === 6 || col === 11) {
              type = 'metal';
              hp = 99;
            } else if (col === 2 || col === 9) {
              type = 'explosive';
              hp = 1;
            }
          } else if (row === 0) {
            type = 'hard';
            hp = 3;
          } else if (row === 2) {
            type = 'hard';
            hp = 2;
          }
          
          bricks.push({
            id: `l3-${row}-${col}`,
            x: START_X + col * (BRICK_WIDTH + GAP),
            y: START_Y + row * (BRICK_HEIGHT + GAP),
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
            hp,
            maxHp: hp,
            type,
            points: type === 'metal' ? 0 : hp * 150,
          });
        }
      }
      return bricks;
    },
  },
  {
    name: 'スパイラル・カオス - Spiral Chaos',
    description: 'らせん状に配置された様々な種類のブロック。',
    generate: () => {
      const bricks: Brick[] = [];
      const cols = 12;
      const rows = 8;
      
      // We fill in a spiral design
      // A pixel coordinates spiral grid or mathematical check
      const centerCol = (cols - 1) / 2;
      const centerRow = (rows - 1) / 2;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Calculate distance metrics or draw a custom spiral pattern
          // Standard layout spiral:
          const blockActive = (
            (row === 0) || 
            (row === rows - 1 && col > 1 && col < cols - 2) ||
            (col === cols - 1 && row > 0) ||
            (col === 0 && row > 1 && row < rows - 1) ||
            (row === 2 && col > 1 && col < cols - 2) ||
            (col === cols - 3 && row > 2 && row < rows - 3) ||
            (row === rows - 3 && col > 3 && col < cols - 4)
          );

          if (!blockActive) continue;

          let type: 'normal' | 'hard' | 'metal' | 'explosive' = 'normal';
          let hp = 1;

          // Outermost layer of spiral is hard, innermost explosive, some are metal
          if (row === 0 || col === cols - 1) {
            type = 'hard';
            hp = 3;
          } else if (row === 2) {
            type = 'hard';
            hp = 2;
          } else if (col === 0 && row === 3) {
            type = 'metal';
            hp = 99;
          } else if (row === rows - 3) {
            type = 'explosive';
            hp = 1;
          }

          bricks.push({
            id: `l4-${row}-${col}`,
            x: START_X + col * (BRICK_WIDTH + GAP),
            y: START_Y + row * (BRICK_HEIGHT + GAP),
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
            hp,
            maxHp: hp,
            type,
            points: type === 'metal' ? 0 : hp * 200,
          });
        }
      }

      return bricks;
    },
  },
  {
    name: 'インフィニティ - Infinity Loop',
    description: '無限の形をしたブロックレイアウト。最後にして最大の挑戦！',
    generate: () => {
      const bricks: Brick[] = [];
      
      // Infinity loop pattern (figure 8 on its side)
      // Represented on an 12x8 grid
      const loop = [
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
        [1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1],
        [1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1],
        [1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1],
        [0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0],
      ];

      for (let row = 0; row < loop.length; row++) {
        for (let col = 0; col < loop[row].length; col++) {
          if (loop[row][col] === 1) {
            let type: 'normal' | 'hard' | 'metal' | 'explosive' = 'normal';
            let hp = 1;

            // Center crossing intersection
            if (col === 5 || col === 6) {
              if (row === 3) {
                type = 'explosive';
                hp = 1;
              } else {
                type = 'metal';
                hp = 99;
              }
            } else if (row === 0 || row === 6) {
              type = 'hard';
              hp = 3;
            } else if (col === 0 || col === 11) {
              type = 'hard';
              hp = 2;
            }

            bricks.push({
              id: `l5-${row}-${col}`,
              x: START_X + col * (BRICK_WIDTH + GAP),
              y: START_Y + row * (BRICK_HEIGHT + GAP),
              width: BRICK_WIDTH,
              height: BRICK_HEIGHT,
              hp,
              maxHp: hp,
              type,
              points: type === 'metal' ? 0 : hp * 250,
            });
          }
        }
      }
      return bricks;
    },
  },
];
