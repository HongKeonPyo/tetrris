import {
  ALL_TETROMINOES,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BUFFER_ROWS,
  I_WALL_KICKS,
  JLSTZ_WALL_KICKS,
  TETROMINO_SHAPES,
} from '../constants/tetrisConstants';
import {
  ActivePiece,
  BoardMatrix,
  GameMode,
  HighScoreRecord,
  RotationState,
  TetrominoType,
} from '../types/tetris';

export const TOTAL_ROWS = BOARD_HEIGHT + BUFFER_ROWS;

export function createEmptyBoard(): BoardMatrix {
  return Array.from({ length: TOTAL_ROWS }, () => Array(BOARD_WIDTH).fill(null));
}

export function generateSevenBag(): TetrominoType[] {
  const bag = [...ALL_TETROMINOES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

export function createSpawnPiece(type: TetrominoType): ActivePiece {
  const matrix = TETROMINO_SHAPES[type][0];
  const width = matrix[0].length;
  const startX = Math.floor((BOARD_WIDTH - width) / 2);
  // Spawn just above the visible playfield inside buffer rows
  const startY = BUFFER_ROWS - 2;

  return {
    type,
    rotation: 0,
    x: startX,
    y: startY,
    lastActionWasRotation: false,
    lastKickIndex: 0,
  };
}

export function isValidPosition(
  board: BoardMatrix,
  type: TetrominoType,
  rotation: RotationState,
  x: number,
  y: number
): boolean {
  const shape = TETROMINO_SHAPES[type][rotation];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const boardX = x + c;
      const boardY = y + r;

      if (boardX < 0 || boardX >= BOARD_WIDTH) return false;
      if (boardY >= TOTAL_ROWS) return false;
      if (boardY >= 0 && board[boardY][boardX] !== null) return false;
    }
  }
  return true;
}

export function getGhostY(board: BoardMatrix, piece: ActivePiece): number {
  let testY = piece.y;
  while (isValidPosition(board, piece.type, piece.rotation, piece.x, testY + 1)) {
    testY++;
  }
  return testY;
}

export function tryRotatePiece(
  board: BoardMatrix,
  piece: ActivePiece,
  delta: 1 | -1 | 2
): ActivePiece | null {
  const newRotation = (((piece.rotation + delta) % 4 + 4) % 4) as RotationState;
  if (piece.type === 'O') {
    return {
      ...piece,
      rotation: newRotation,
      lastActionWasRotation: true,
      lastKickIndex: 0,
    };
  }

  const key = `${piece.rotation}->${newRotation}`;
  const kickTable = piece.type === 'I' ? I_WALL_KICKS : JLSTZ_WALL_KICKS;
  const kicks = kickTable[key] || [[0, 0]];

  for (let i = 0; i < kicks.length; i++) {
    const [dx, dy] = kicks[i];
    const targetX = piece.x + dx;
    const targetY = piece.y + dy;
    if (isValidPosition(board, piece.type, newRotation, targetX, targetY)) {
      return {
        ...piece,
        rotation: newRotation,
        x: targetX,
        y: targetY,
        lastActionWasRotation: true,
        lastKickIndex: i,
      };
    }
  }

  return null;
}

// Official 3-Corner T-Spin detection (returns 'NONE' | 'MINI' | 'FULL')
export function detectTSpin(board: BoardMatrix, piece: ActivePiece): 'NONE' | 'MINI' | 'FULL' {
  if (piece.type !== 'T' || !piece.lastActionWasRotation) {
    return 'NONE';
  }

  // Center of the 3x3 T bounding box is at (piece.x + 1, piece.y + 1)
  const corners: [number, number][] = [
    [piece.x, piece.y],         // Top-Left (0)
    [piece.x + 2, piece.y],     // Top-Right (1)
    [piece.x + 2, piece.y + 2], // Bottom-Right (2)
    [piece.x, piece.y + 2],     // Bottom-Left (3)
  ];

  const isOccupied = (cx: number, cy: number): boolean => {
    if (cx < 0 || cx >= BOARD_WIDTH || cy >= TOTAL_ROWS) return true;
    if (cy < 0) return false;
    return board[cy][cx] !== null;
  };

  const occupiedFlags = corners.map(([cx, cy]) => isOccupied(cx, cy));
  const occupiedCount = occupiedFlags.filter(Boolean).length;

  if (occupiedCount < 3) return 'NONE';

  // Check the two front corners depending on rotation state
  const frontIndices: Record<RotationState, [number, number]> = {
    0: [0, 1], // North: Top-Left, Top-Right
    1: [1, 2], // East: Top-Right, Bottom-Right
    2: [2, 3], // South: Bottom-Right, Bottom-Left
    3: [3, 0], // West: Bottom-Left, Top-Left
  };

  const [f1, f2] = frontIndices[piece.rotation];
  const bothFrontOccupied = occupiedFlags[f1] && occupiedFlags[f2];

  // Final SRS kick (index 4, the famous "TST kick") always upgrades Mini to Full T-Spin
  if (bothFrontOccupied || piece.lastKickIndex === 4) {
    return 'FULL';
  }
  return 'MINI';
}

export interface LockResult {
  newBoard: BoardMatrix;
  clearedRows: number[];
  isAllClear: boolean;
  tSpinType: 'NONE' | 'MINI' | 'FULL';
  toppedOut: boolean;
  pointsEarned: number;
  newBackToBack: boolean;
  actionTitle: string;
  actionSubtitle?: string;
  isSpecial: boolean;
}

export function lockPieceAndEvaluate(
  board: BoardMatrix,
  piece: ActivePiece,
  level: number,
  currentCombo: number,
  currentBackToBack: boolean,
  dropBonusPoints: number
): LockResult {
  const tSpinType = detectTSpin(board, piece);
  const nextBoard: BoardMatrix = board.map((row) => [...row]);
  const shape = TETROMINO_SHAPES[piece.type][piece.rotation];

  let allAboveVisible = true;
  const now = Date.now();

  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = piece.x + c;
      const by = piece.y + r;
      if (by >= BUFFER_ROWS) {
        allAboveVisible = false;
      }
      if (by >= 0 && by < TOTAL_ROWS && bx >= 0 && bx < BOARD_WIDTH) {
        nextBoard[by][bx] = { type: piece.type, lockedAt: now };
      }
    }
  }

  // Find completed lines
  const clearedRows: number[] = [];
  for (let r = 0; r < TOTAL_ROWS; r++) {
    if (nextBoard[r].every((cell) => cell !== null)) {
      clearedRows.push(r);
    }
  }

  const linesCleared = clearedRows.length;

  // Build board after removing cleared rows
  const filteredBoard = nextBoard.filter((_, rowIndex) => !clearedRows.includes(rowIndex));
  while (filteredBoard.length < TOTAL_ROWS) {
    filteredBoard.unshift(Array(BOARD_WIDTH).fill(null));
  }

  const isAllClear =
    linesCleared > 0 &&
    filteredBoard.every((row) => row.every((cell) => cell === null));

  // Calculate base score & action label
  let baseScore = 0;
  let actionTitle = '';
  let actionSubtitle: string | undefined = undefined;
  let qualifiesForB2B = false;
  let isSpecial = false;

  if (tSpinType === 'FULL') {
    isSpecial = true;
    if (linesCleared === 0) {
      baseScore = 400 * level;
      actionTitle = 'T-SPIN';
    } else if (linesCleared === 1) {
      baseScore = 800 * level;
      actionTitle = 'T-SPIN SINGLE';
      qualifiesForB2B = true;
    } else if (linesCleared === 2) {
      baseScore = 1200 * level;
      actionTitle = 'T-SPIN DOUBLE';
      qualifiesForB2B = true;
    } else if (linesCleared === 3) {
      baseScore = 1600 * level;
      actionTitle = 'T-SPIN TRIPLE';
      qualifiesForB2B = true;
    }
  } else if (tSpinType === 'MINI') {
    isSpecial = true;
    if (linesCleared === 0) {
      baseScore = 100 * level;
      actionTitle = 'T-SPIN MINI';
    } else if (linesCleared === 1) {
      baseScore = 200 * level;
      actionTitle = 'T-SPIN MINI SINGLE';
      qualifiesForB2B = true;
    } else if (linesCleared === 2) {
      baseScore = 400 * level;
      actionTitle = 'T-SPIN MINI DOUBLE';
      qualifiesForB2B = true;
    }
  } else {
    if (linesCleared === 1) {
      baseScore = 100 * level;
      actionTitle = 'SINGLE';
    } else if (linesCleared === 2) {
      baseScore = 300 * level;
      actionTitle = 'DOUBLE';
    } else if (linesCleared === 3) {
      baseScore = 500 * level;
      actionTitle = 'TRIPLE';
      isSpecial = true;
    } else if (linesCleared === 4) {
      baseScore = 800 * level;
      actionTitle = 'TETRIS!';
      qualifiesForB2B = true;
      isSpecial = true;
    }
  }

  let newBackToBack = currentBackToBack;
  let b2bTriggered = false;

  if (linesCleared > 0) {
    if (qualifiesForB2B) {
      if (currentBackToBack) {
        baseScore = Math.floor(baseScore * 1.5);
        b2bTriggered = true;
      }
      newBackToBack = true;
    } else {
      newBackToBack = false;
    }
  }

  // Combo bonus
  const nextCombo = linesCleared > 0 ? currentCombo + 1 : -1;
  const comboScore = nextCombo > 0 ? 50 * nextCombo * level : 0;

  // All Clear (Perfect Clear) bonus
  let allClearBonus = 0;
  if (isAllClear) {
    isSpecial = true;
    const pcMultipliers = [0, 800, 1200, 1800, 2000];
    allClearBonus = (pcMultipliers[linesCleared] || 2000) * level;
    actionSubtitle = 'PERFECT ALL CLEAR!';
  } else if (b2bTriggered) {
    actionSubtitle = 'BACK-TO-BACK ×1.5';
  }

  const totalActionPoints = baseScore + comboScore + allClearBonus + dropBonusPoints;

  return {
    newBoard: filteredBoard,
    clearedRows,
    isAllClear,
    tSpinType,
    toppedOut: allAboveVisible && linesCleared === 0,
    pointsEarned: totalActionPoints,
    newBackToBack,
    actionTitle,
    actionSubtitle,
    isSpecial,
  };
}

export function formatDuration(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((safeMs % 1000) / 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

const STORAGE_KEY = 'tetra_studio_highscores_v1';

const DEFAULT_RECORDS: HighScoreRecord[] = [
  {
    id: 'seed-marathon-1',
    mode: 'MARATHON',
    score: 248500,
    lines: 150,
    level: 15,
    durationMs: 384200,
    pps: 1.62,
    maxCombo: 8,
    tetrisCount: 22,
    tSpinCount: 6,
    completed: true,
    date: '2026.09.28',
  },
  {
    id: 'seed-marathon-2',
    mode: 'MARATHON',
    score: 142800,
    lines: 104,
    level: 11,
    durationMs: 275100,
    pps: 1.38,
    maxCombo: 6,
    tetrisCount: 14,
    tSpinCount: 3,
    completed: false,
    date: '2026.09.25',
  },
  {
    id: 'seed-sprint-1',
    mode: 'SPRINT_40',
    score: 48200,
    lines: 40,
    level: 5,
    durationMs: 58420,
    pps: 1.74,
    maxCombo: 7,
    tetrisCount: 8,
    tSpinCount: 2,
    completed: true,
    date: '2026.09.29',
  },
  {
    id: 'seed-sprint-2',
    mode: 'SPRINT_40',
    score: 41600,
    lines: 40,
    level: 5,
    durationMs: 74850,
    pps: 1.36,
    maxCombo: 5,
    tetrisCount: 6,
    tSpinCount: 1,
    completed: true,
    date: '2026.09.24',
  },
  {
    id: 'seed-ultra-1',
    mode: 'ULTRA_120',
    score: 86400,
    lines: 58,
    level: 6,
    durationMs: 120000,
    pps: 1.55,
    maxCombo: 9,
    tetrisCount: 9,
    tSpinCount: 5,
    completed: true,
    date: '2026.09.27',
  },
];

export function loadHighScores(): HighScoreRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECORDS));
      return DEFAULT_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_RECORDS;
  } catch {
    return DEFAULT_RECORDS;
  }
}

export function saveHighScore(record: HighScoreRecord): HighScoreRecord[] {
  const existing = loadHighScores();
  const updated = [record, ...existing];

  // Sort per mode: Sprint prioritizes completed + fastest time; Marathon/Ultra prioritize highest score
  const sorted = updated.sort((a, b) => {
    if (a.mode === 'SPRINT_40' && b.mode === 'SPRINT_40') {
      if (a.completed !== b.completed) return a.completed ? -1 : 1;
      if (a.completed && b.completed) return a.durationMs - b.durationMs;
      return b.lines - a.lines;
    }
    return b.score - a.score;
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted.slice(0, 30)));
  } catch {
    // ignore storage quota errors
  }
  return sorted.slice(0, 30);
}

export function getBestRecordForMode(
  records: HighScoreRecord[],
  mode: GameMode
): HighScoreRecord | null {
  const filtered = records.filter((r) => r.mode === mode);
  if (filtered.length === 0) return null;
  if (mode === 'SPRINT_40') {
    const completed = filtered.filter((r) => r.completed);
    if (completed.length > 0) {
      return completed.reduce((best, cur) => (cur.durationMs < best.durationMs ? cur : best));
    }
  }
  return filtered.reduce((best, cur) => (cur.score > best.score ? cur : best));
}
