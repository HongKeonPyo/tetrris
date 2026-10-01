import { GameMode, RotationState, TetrominoType } from '../types/tetris';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BUFFER_ROWS = 4; // Hidden rows above the visible 20 rows for smooth spawning & rotation

export const ALL_TETROMINOES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export interface TetrominoStyle {
  name: string;
  fill: string;
  topBevel: string;
  bottomBevel: string;
  border: string;
  ghostBorder: string;
  ghostFill: string;
  symbol: string;
}

// High-contrast, tactile studio palette (no hyper-saturated neon slop)
export const TETROMINO_STYLES: Record<TetrominoType, TetrominoStyle> = {
  I: {
    name: 'I-시안',
    fill: '#06B6D4',
    topBevel: '#67E8F9',
    bottomBevel: '#0E7490',
    border: '#22D3EE',
    ghostBorder: 'rgba(34, 211, 238, 0.55)',
    ghostFill: 'rgba(6, 182, 212, 0.12)',
    symbol: '━',
  },
  O: {
    name: 'O-골드',
    fill: '#EAB308',
    topBevel: '#FDE047',
    bottomBevel: '#A16207',
    border: '#FACC15',
    ghostBorder: 'rgba(250, 204, 21, 0.55)',
    ghostFill: 'rgba(234, 179, 8, 0.12)',
    symbol: '■',
  },
  T: {
    name: 'T-바이올렛',
    fill: '#A855F7',
    topBevel: '#D8B4FE',
    bottomBevel: '#6B21A8',
    border: '#C084FC',
    ghostBorder: 'rgba(192, 132, 252, 0.55)',
    ghostFill: 'rgba(168, 85, 247, 0.12)',
    symbol: '▲',
  },
  S: {
    name: 'S-에메랄드',
    fill: '#10B981',
    topBevel: '#6EE7B7',
    bottomBevel: '#047857',
    border: '#34D399',
    ghostBorder: 'rgba(52, 211, 153, 0.55)',
    ghostFill: 'rgba(16, 185, 129, 0.12)',
    symbol: '◆',
  },
  Z: {
    name: 'Z-크림슨',
    fill: '#F43F5E',
    topBevel: '#FDA4AF',
    bottomBevel: '#BE123C',
    border: '#FB7185',
    ghostBorder: 'rgba(251, 113, 133, 0.55)',
    ghostFill: 'rgba(244, 63, 94, 0.12)',
    symbol: '✖',
  },
  J: {
    name: 'J-코발트',
    fill: '#3B82F6',
    topBevel: '#93C5FD',
    bottomBevel: '#1D4ED8',
    border: '#60A5FA',
    ghostBorder: 'rgba(96, 165, 250, 0.55)',
    ghostFill: 'rgba(59, 130, 246, 0.12)',
    symbol: '◀',
  },
  L: {
    name: 'L-앰버',
    fill: '#F97316',
    topBevel: '#FDBA74',
    bottomBevel: '#C2410C',
    border: '#FB923C',
    ghostBorder: 'rgba(251, 146, 60, 0.55)',
    ghostFill: 'rgba(249, 115, 22, 0.12)',
    symbol: '▶',
  },
};

// Official SRS 4x4 / 3x3 coordinate matrices for each rotation state (0, 1, 2, 3)
export const TETROMINO_SHAPES: Record<TetrominoType, Record<RotationState, number[][]>> = {
  I: {
    0: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    1: [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    2: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    3: [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  },
  O: {
    0: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    1: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    2: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    3: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ],
  },
  T: {
    0: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    3: [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  S: {
    0: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    2: [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    3: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  Z: {
    0: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    3: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
  J: {
    0: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    3: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  L: {
    0: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    3: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  },
};

// SRS Wall Kick Data: [dx, dy] where +x is right and +y is DOWN in board coordinates
// Note: Standard SRS wiki uses +y = UP, so we invert dy here so +y = DOWN on the matrix.
export const JLSTZ_WALL_KICKS: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  // 180-degree rotation kicks
  '0->2': [[0, 0], [0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0]],
  '2->0': [[0, 0], [0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]],
  '1->3': [[0, 0], [1, 0], [1, -2], [1, -1], [0, -2], [0, -1]],
  '3->1': [[0, 0], [-1, 0], [-1, -2], [-1, -1], [0, -2], [0, -1]],
};

export const I_WALL_KICKS: Record<string, [number, number][]> = {
  '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '0->2': [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]],
  '2->0': [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]],
  '1->3': [[0, 0], [1, 0], [-1, 0], [0, -1], [0, 1]],
  '3->1': [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
};

// Gravity interval in ms per row for Levels 1 to 20
export function getGravityIntervalMs(level: number): number {
  const speeds = [
    850, // Lv 1
    720, // Lv 2
    600, // Lv 3
    490, // Lv 4
    390, // Lv 5
    300, // Lv 6
    230, // Lv 7
    175, // Lv 8
    130, // Lv 9
    100, // Lv 10
    80,  // Lv 11
    65,  // Lv 12
    52,  // Lv 13
    42,  // Lv 14
    34,  // Lv 15+
  ];
  const idx = Math.max(0, Math.min(level - 1, speeds.length - 1));
  return speeds[idx];
}

export interface ModeMetadata {
  id: GameMode;
  title: string;
  shortLabel: string;
  subtitle: string;
  targetDescription: string;
  targetLines?: number;
  timeLimitMs?: number;
}

export const GAME_MODES: Record<GameMode, ModeMetadata> = {
  MARATHON: {
    id: 'MARATHON',
    title: '마라톤 모드',
    shortLabel: '마라톤 150줄',
    subtitle: '점진적으로 빨라지는 낙하 속도를 견디며 150라인 완주와 최고 점수를 달성하세요.',
    targetDescription: '목표 150라인 클리어 · 레벨 1~15 속도 상승',
    targetLines: 150,
  },
  SPRINT_40: {
    id: 'SPRINT_40',
    title: '40라인 스프린트',
    shortLabel: '40라인 스프린트',
    subtitle: '가장 빠른 시간 안에 정확히 40라인을 제거하는 타임어택 모드입니다.',
    targetDescription: '목표 40라인 최단 시간 돌파 · 초당 블록 속도(PPS) 측정',
    targetLines: 40,
  },
  ULTRA_120: {
    id: 'ULTRA_120',
    title: '울트라 2분',
    shortLabel: '울트라 2분',
    subtitle: '제한 시간 120초 동안 T-스핀, 백투백, 콤보를 활용해 최대 점수를 기록하세요.',
    targetDescription: '제한 시간 2분(120초) · 고득점 스코어 어택',
    timeLimitMs: 120_000,
  },
};
