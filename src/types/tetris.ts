export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'ROUND_SUMMARY' | 'GAME_OVER';

export type GameMode = 'MARATHON' | 'SPRINT_40' | 'ULTRA_120';

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type RotationState = 0 | 1 | 2 | 3;

export interface CellData {
  type: TetrominoType;
  lockedAt?: number;
}

export type BoardMatrix = (CellData | null)[][];

export interface ActivePiece {
  type: TetrominoType;
  rotation: RotationState;
  x: number;
  y: number;
  lastActionWasRotation: boolean;
  lastKickIndex: number;
}

export interface ActionCallout {
  id: number;
  title: string;
  subtitle?: string;
  points: number;
  combo: number;
  isBackToBack: boolean;
  isSpecial: boolean;
}

export interface ClearRowAnimation {
  rows: number[];
  timestamp: number;
}

export interface HighScoreRecord {
  id: string;
  mode: GameMode;
  score: number;
  lines: number;
  level: number;
  durationMs: number;
  pps: number;
  maxCombo: number;
  tetrisCount: number;
  tSpinCount: number;
  completed: boolean;
  date: string;
}

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  combo: number;
  maxCombo: number;
  backToBack: boolean;
  backToBackCount: number;
  piecesPlaced: number;
  singles: number;
  doubles: number;
  triples: number;
  tetrises: number;
  tSpins: number;
  allClears: number;
  elapsedMs: number;
}
