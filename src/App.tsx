/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MiniPiecePreview } from './components/MiniPiecePreview';
import { RulesModal } from './components/RulesModal';
import { TetrisBoard } from './components/TetrisBoard';
import {
  GAME_MODES,
  getGravityIntervalMs,
} from './constants/tetrisConstants';
import {
  ActionCallout,
  ActivePiece,
  BoardMatrix,
  GameMode,
  GameState,
  GameStats,
  HighScoreRecord,
  TetrominoType,
} from './types/tetris';
import { soundEngine } from './utils/soundEngine';
import {
  createEmptyBoard,
  createSpawnPiece,
  detectTSpin,
  formatDuration,
  generateSevenBag,
  getBestRecordForMode,
  getGhostY,
  isValidPosition,
  loadHighScores,
  lockPieceAndEvaluate,
  saveHighScore,
  tryRotatePiece,
} from './utils/tetrisLogic';

const INITIAL_STATS: GameStats = {
  score: 0,
  lines: 0,
  level: 1,
  combo: -1,
  maxCombo: 0,
  backToBack: false,
  backToBackCount: 0,
  piecesPlaced: 0,
  singles: 0,
  doubles: 0,
  triples: 0,
  tetrises: 0,
  tSpins: 0,
  allClears: 0,
  elapsedMs: 0,
};

const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;

export default function App() {
  // Game State Machine
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [gameMode, setGameMode] = useState<GameMode>('MARATHON');
  const [startLevel, setStartLevel] = useState<number>(1);

  // Playfield & Pieces
  const [board, setBoard] = useState<BoardMatrix>(() => createEmptyBoard());
  const [activePiece, setActivePiece] = useState<ActivePiece | null>(null);
  const [holdPiece, setHoldPiece] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  const [nextQueue, setNextQueue] = useState<TetrominoType[]>(() => [
    ...generateSevenBag(),
    ...generateSevenBag(),
  ]);

  // Stats & Feedback
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [callout, setCallout] = useState<ActionCallout | null>(null);
  const [recoilType, setRecoilType] = useState<'NONE' | 'DROP' | 'CLEAR'>('NONE');
  const [flashingRows, setFlashingRows] = useState<number[]>([]);
  const [isLocking, setIsLocking] = useState<boolean>(false);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // Preferences & Modals
  const [showGhost, setShowGhost] = useState<boolean>(true);
  const [showSymbols, setShowSymbols] = useState<boolean>(false);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [bgmEnabled, setBgmEnabled] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [highScores, setHighScores] = useState<HighScoreRecord[]>(() => loadHighScores());

  // Refs for accurate real-time game loop access
  const boardRef = useRef<BoardMatrix>(board);
  const activePieceRef = useRef<ActivePiece | null>(activePiece);
  const nextQueueRef = useRef<TetrominoType[]>(nextQueue);
  const holdPieceRef = useRef<TetrominoType | null>(holdPiece);
  const canHoldRef = useRef<boolean>(canHold);
  const statsRef = useRef<GameStats>(stats);
  const gameStateRef = useRef<GameState>(gameState);
  const gameModeRef = useRef<GameMode>(gameMode);
  const startLevelRef = useRef<number>(startLevel);

  const lockTimerMsRef = useRef<number>(0);
  const lockResetCountRef = useRef<number>(0);
  const gravityAccumulatorRef = useRef<number>(0);
  const softDropBonusRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);
  useEffect(() => {
    activePieceRef.current = activePiece;
  }, [activePiece]);
  useEffect(() => {
    nextQueueRef.current = nextQueue;
  }, [nextQueue]);
  useEffect(() => {
    holdPieceRef.current = holdPiece;
  }, [holdPiece]);
  useEffect(() => {
    canHoldRef.current = canHold;
  }, [canHold]);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);
  useEffect(() => {
    startLevelRef.current = startLevel;
  }, [startLevel]);

  const triggerRecoil = useCallback((type: 'DROP' | 'CLEAR') => {
    setRecoilType(type);
    window.setTimeout(() => {
      setRecoilType((prev) => (prev === type ? 'NONE' : prev));
    }, 190);
  }, []);

  const finishGame = useCallback(
    (finalState: 'ROUND_SUMMARY' | 'GAME_OVER', finalStats: GameStats) => {
      setGameState(finalState);
      gameStateRef.current = finalState;
      soundEngine.stopBgm();

      if (finalState === 'ROUND_SUMMARY') {
        soundEngine.playVictory();
      } else {
        soundEngine.playGameOver();
      }

      const mode = gameModeRef.current;
      const prevBest = getBestRecordForMode(highScores, mode);
      const completed = finalState === 'ROUND_SUMMARY';

      const durationSec = Math.max(0.5, finalStats.elapsedMs / 1000);
      const pps = Number((finalStats.piecesPlaced / durationSec).toFixed(2));

      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
        now.getDate()
      ).padStart(2, '0')}`;

      const newEntry: HighScoreRecord = {
        id: `rec-${Date.now()}`,
        mode,
        score: finalStats.score,
        lines: finalStats.lines,
        level: finalStats.level,
        durationMs: finalStats.elapsedMs,
        pps,
        maxCombo: finalStats.maxCombo,
        tetrisCount: finalStats.tetrises,
        tSpinCount: finalStats.tSpins,
        completed,
        date: dateStr,
      };

      let beatBest = false;
      if (!prevBest) {
        beatBest = finalStats.score > 0;
      } else if (mode === 'SPRINT_40') {
        if (completed && (!prevBest.completed || finalStats.elapsedMs < prevBest.durationMs)) {
          beatBest = true;
        }
      } else if (finalStats.score > prevBest.score) {
        beatBest = true;
      }

      setIsNewRecord(beatBest);

      if (finalStats.score > 0 || finalStats.lines > 0) {
        const updatedList = saveHighScore(newEntry);
        setHighScores(updatedList);
      }
    },
    [highScores]
  );

  // Pull next piece from queue and replenish 7-Bag
  const spawnNextPieceFromQueue = useCallback(
    (currentBoard: BoardMatrix, queue: TetrominoType[], currentStats: GameStats) => {
      const nextType = queue[0];
      let remaining = queue.slice(1);
      if (remaining.length < 7) {
        remaining = [...remaining, ...generateSevenBag()];
      }

      const spawned = createSpawnPiece(nextType);
      setNextQueue(remaining);
      nextQueueRef.current = remaining;
      setCanHold(true);
      canHoldRef.current = true;
      lockTimerMsRef.current = 0;
      lockResetCountRef.current = 0;
      gravityAccumulatorRef.current = 0;
      softDropBonusRef.current = 0;
      setIsLocking(false);

      if (!isValidPosition(currentBoard, spawned.type, spawned.rotation, spawned.x, spawned.y)) {
        // Check if spawning 1 row higher works
        const lifted = { ...spawned, y: spawned.y - 1 };
        if (isValidPosition(currentBoard, lifted.type, lifted.rotation, lifted.x, lifted.y)) {
          setActivePiece(lifted);
          activePieceRef.current = lifted;
        } else {
          setActivePiece(null);
          activePieceRef.current = null;
          finishGame('GAME_OVER', currentStats);
        }
      } else {
        setActivePiece(spawned);
        activePieceRef.current = spawned;
      }
    },
    [finishGame]
  );

  // Start or restart a game session
  const startNewGame = useCallback(
    (overrideMode?: GameMode) => {
      const targetMode = overrideMode ?? gameModeRef.current;
      if (overrideMode) {
        setGameMode(overrideMode);
        gameModeRef.current = overrideMode;
      }

      const empty = createEmptyBoard();
      const initialQueue = [...generateSevenBag(), ...generateSevenBag()];
      const firstType = initialQueue[0];
      const restQueue = initialQueue.slice(1);
      const firstPiece = createSpawnPiece(firstType);

      const freshStats: GameStats = {
        ...INITIAL_STATS,
        level: startLevelRef.current,
      };

      setBoard(empty);
      boardRef.current = empty;
      setNextQueue(restQueue);
      nextQueueRef.current = restQueue;
      setHoldPiece(null);
      holdPieceRef.current = null;
      setCanHold(true);
      canHoldRef.current = true;
      setActivePiece(firstPiece);
      activePieceRef.current = firstPiece;
      setStats(freshStats);
      statsRef.current = freshStats;
      setCallout(null);
      setFlashingRows([]);
      setIsLocking(false);
      setIsNewRecord(false);

      lockTimerMsRef.current = 0;
      lockResetCountRef.current = 0;
      gravityAccumulatorRef.current = 0;
      softDropBonusRef.current = 0;
      lastFrameTimeRef.current = performance.now();

      setGameState('PLAYING');
      gameStateRef.current = 'PLAYING';

      if (bgmEnabled) {
        soundEngine.startBgm();
      }
    },
    [bgmEnabled]
  );

  // Lock current piece and evaluate lines, score, T-Spin, combos, and mode completion
  const commitPieceLock = useCallback(
    (pieceToLock: ActivePiece, dropPoints: number, isHardDropAction: boolean) => {
      const currentBoard = boardRef.current;
      const curStats = statsRef.current;

      const result = lockPieceAndEvaluate(
        currentBoard,
        pieceToLock,
        curStats.level,
        curStats.combo,
        curStats.backToBack,
        dropPoints + softDropBonusRef.current
      );

      if (result.toppedOut) {
        finishGame('GAME_OVER', curStats);
        return;
      }

      const linesCount = result.clearedRows.length;
      const newLines = curStats.lines + linesCount;
      const newCombo = linesCount > 0 ? curStats.combo + 1 : -1;
      const newMaxCombo = Math.max(curStats.maxCombo, newCombo > 0 ? newCombo : 0);
      const newLevel = Math.min(
        15,
        Math.max(startLevelRef.current, Math.floor(newLines / 10) + startLevelRef.current)
      );
      const leveledUp = newLevel > curStats.level;

      const b2bIncrement =
        linesCount > 0 && curStats.backToBack && result.newBackToBack ? 1 : 0;

      const nextStats: GameStats = {
        ...curStats,
        score: curStats.score + result.pointsEarned,
        lines: newLines,
        level: newLevel,
        combo: newCombo,
        maxCombo: newMaxCombo,
        backToBack: result.newBackToBack,
        backToBackCount: curStats.backToBackCount + b2bIncrement,
        piecesPlaced: curStats.piecesPlaced + 1,
        singles: curStats.singles + (linesCount === 1 ? 1 : 0),
        doubles: curStats.doubles + (linesCount === 2 ? 1 : 0),
        triples: curStats.triples + (linesCount === 3 ? 1 : 0),
        tetrises: curStats.tetrises + (linesCount === 4 ? 1 : 0),
        tSpins: curStats.tSpins + (result.tSpinType !== 'NONE' ? 1 : 0),
        allClears: curStats.allClears + (result.isAllClear ? 1 : 0),
      };

      setStats(nextStats);
      statsRef.current = nextStats;

      if (linesCount > 0 || result.tSpinType !== 'NONE') {
        soundEngine.playLineClear(
          linesCount,
          newCombo,
          result.tSpinType !== 'NONE',
          b2bIncrement > 0,
          result.isAllClear
        );
        if (leveledUp) {
          window.setTimeout(() => soundEngine.playLevelUp(), 180);
        }
        triggerRecoil('CLEAR');

        if (result.actionTitle) {
          setCallout({
            id: Date.now(),
            title: result.actionTitle,
            subtitle: result.actionSubtitle,
            points: result.pointsEarned,
            combo: newCombo > 0 ? newCombo : 0,
            isBackToBack: b2bIncrement > 0,
            isSpecial: result.isSpecial,
          });
        }
      } else {
        if (isHardDropAction) {
          soundEngine.playHardDrop();
          triggerRecoil('DROP');
        } else {
          soundEngine.playLock();
        }
      }

      // Brief row highlight when clearing lines
      if (linesCount > 0) {
        setFlashingRows(result.clearedRows);
        window.setTimeout(() => {
          setFlashingRows([]);
        }, 110);
      }

      setBoard(result.newBoard);
      boardRef.current = result.newBoard;

      // Check mode completion targets
      const modeConfig = GAME_MODES[gameModeRef.current];
      if (modeConfig.targetLines && newLines >= modeConfig.targetLines) {
        setActivePiece(null);
        activePieceRef.current = null;
        finishGame('ROUND_SUMMARY', nextStats);
        return;
      }

      spawnNextPieceFromQueue(result.newBoard, nextQueueRef.current, nextStats);
    },
    [finishGame, spawnNextPieceFromQueue, triggerRecoil]
  );

  // Move horizontal (-1 left, +1 right)
  const moveHorizontal = useCallback((dx: -1 | 1) => {
    if (gameStateRef.current !== 'PLAYING') return;
    const piece = activePieceRef.current;
    if (!piece) return;

    if (isValidPosition(boardRef.current, piece.type, piece.rotation, piece.x + dx, piece.y)) {
      const moved: ActivePiece = {
        ...piece,
        x: piece.x + dx,
        lastActionWasRotation: false,
      };
      setActivePiece(moved);
      activePieceRef.current = moved;
      soundEngine.playMove();

      if (lockResetCountRef.current < MAX_LOCK_RESETS) {
        lockTimerMsRef.current = 0;
        lockResetCountRef.current++;
      }
    }
  }, []);

  // Soft Drop 1 cell down
  const moveSoftDrop = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    const piece = activePieceRef.current;
    if (!piece) return;

    if (isValidPosition(boardRef.current, piece.type, piece.rotation, piece.x, piece.y + 1)) {
      const moved: ActivePiece = {
        ...piece,
        y: piece.y + 1,
        lastActionWasRotation: false,
      };
      setActivePiece(moved);
      activePieceRef.current = moved;
      softDropBonusRef.current += 1;
      gravityAccumulatorRef.current = 0;
      soundEngine.playSoftDrop();
    }
  }, []);

  // Instant Hard Drop
  const executeHardDrop = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    const piece = activePieceRef.current;
    if (!piece) return;

    const targetY = getGhostY(boardRef.current, piece);
    const cellsDropped = Math.max(0, targetY - piece.y);
    const droppedPiece: ActivePiece = {
      ...piece,
      y: targetY,
      lastActionWasRotation: cellsDropped === 0 ? piece.lastActionWasRotation : false,
    };

    commitPieceLock(droppedPiece, cellsDropped * 2, true);
  }, [commitPieceLock]);

  // Rotate piece (1 = CW, -1 = CCW, 2 = 180)
  const rotateActivePiece = useCallback((delta: 1 | -1 | 2) => {
    if (gameStateRef.current !== 'PLAYING') return;
    const piece = activePieceRef.current;
    if (!piece) return;

    const rotated = tryRotatePiece(boardRef.current, piece, delta);
    if (rotated) {
      setActivePiece(rotated);
      activePieceRef.current = rotated;

      const tSpinCheck = detectTSpin(boardRef.current, rotated);
      soundEngine.playRotate(tSpinCheck !== 'NONE');

      if (lockResetCountRef.current < MAX_LOCK_RESETS) {
        lockTimerMsRef.current = 0;
        lockResetCountRef.current++;
      }
    }
  }, []);

  // Hold Piece Swap
  const executeHold = useCallback(() => {
    if (gameStateRef.current !== 'PLAYING') return;
    const piece = activePieceRef.current;
    if (!piece || !canHoldRef.current) return;

    soundEngine.playHold();
    const currentHold = holdPieceRef.current;
    const currentType = piece.type;

    setHoldPiece(currentType);
    holdPieceRef.current = currentType;
    setCanHold(false);
    canHoldRef.current = false;
    lockTimerMsRef.current = 0;
    lockResetCountRef.current = 0;
    gravityAccumulatorRef.current = 0;
    softDropBonusRef.current = 0;
    setIsLocking(false);

    if (currentHold === null) {
      spawnNextPieceFromQueue(boardRef.current, nextQueueRef.current, statsRef.current);
      // Re-apply canHold = false since spawnNextPieceFromQueue resets it
      setCanHold(false);
      canHoldRef.current = false;
    } else {
      const swapped = createSpawnPiece(currentHold);
      setActivePiece(swapped);
      activePieceRef.current = swapped;
    }
  }, [spawnNextPieceFromQueue]);

  // Toggle Pause
  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'PLAYING') {
      setGameState('PAUSED');
      gameStateRef.current = 'PAUSED';
      soundEngine.stopBgm();
    } else if (gameStateRef.current === 'PAUSED') {
      lastFrameTimeRef.current = performance.now();
      setGameState('PLAYING');
      gameStateRef.current = 'PLAYING';
      if (bgmEnabled) {
        soundEngine.startBgm();
      }
    }
  }, [bgmEnabled]);

  // Main requestAnimationFrame Game Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let rafId: number;
    lastFrameTimeRef.current = performance.now();

    const step = (now: number) => {
      if (gameStateRef.current !== 'PLAYING') return;

      const dt = Math.min(100, now - (lastFrameTimeRef.current ?? now));
      lastFrameTimeRef.current = now;

      // Update elapsed time & check Ultra 120s countdown
      const curStats = statsRef.current;
      const newElapsed = curStats.elapsedMs + dt;
      const modeConfig = GAME_MODES[gameModeRef.current];

      if (modeConfig.timeLimitMs && newElapsed >= modeConfig.timeLimitMs) {
        const clampedStats = { ...curStats, elapsedMs: modeConfig.timeLimitMs };
        setStats(clampedStats);
        statsRef.current = clampedStats;
        finishGame('ROUND_SUMMARY', clampedStats);
        return;
      }

      setStats((prev) => {
        const updated = { ...prev, elapsedMs: newElapsed };
        statsRef.current = updated;
        return updated;
      });

      const piece = activePieceRef.current;
      if (piece) {
        const canFall = isValidPosition(
          boardRef.current,
          piece.type,
          piece.rotation,
          piece.x,
          piece.y + 1
        );

        if (canFall) {
          setIsLocking(false);
          lockTimerMsRef.current = 0;
          gravityAccumulatorRef.current += dt;
          const gravityInterval = getGravityIntervalMs(curStats.level);

          if (gravityAccumulatorRef.current >= gravityInterval) {
            gravityAccumulatorRef.current -= gravityInterval;
            const fallen: ActivePiece = {
              ...piece,
              y: piece.y + 1,
              lastActionWasRotation: false,
            };
            setActivePiece(fallen);
            activePieceRef.current = fallen;
          }
        } else {
          // Piece is resting on surface -> advance lock delay
          setIsLocking(true);
          lockTimerMsRef.current += dt;
          if (lockTimerMsRef.current >= LOCK_DELAY_MS) {
            commitPieceLock(piece, 0, false);
          }
        }
      }

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [gameState, commitPieceLock, finishGame]);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRulesOpen || isLeaderboardOpen) {
        if (e.key === 'Escape') {
          setIsRulesOpen(false);
          setIsLeaderboardOpen(false);
        }
        return;
      }

      // Prevent browser scrolling on game keys
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)
      ) {
        e.preventDefault();
      }

      if (
        gameStateRef.current === 'TITLE_MENU' ||
        gameStateRef.current === 'GAME_OVER' ||
        gameStateRef.current === 'ROUND_SUMMARY'
      ) {
        if (e.key === 'Enter' || e.key === ' ') {
          startNewGame();
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        startNewGame();
        return;
      }

      if (gameStateRef.current !== 'PLAYING') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveHorizontal(-1);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveHorizontal(1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          moveSoftDrop();
          break;
        case ' ':
          executeHardDrop();
          break;
        case 'ArrowUp':
        case 'x':
        case 'X':
          rotateActivePiece(1);
          break;
        case 'z':
        case 'Z':
        case 'Control':
          rotateActivePiece(-1);
          break;
        case 'q':
        case 'Q':
        case 'e':
        case 'E':
          rotateActivePiece(2);
          break;
        case 'c':
        case 'C':
        case 'Shift':
          executeHold();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    executeHardDrop,
    executeHold,
    isLeaderboardOpen,
    isRulesOpen,
    moveHorizontal,
    moveSoftDrop,
    rotateActivePiece,
    startNewGame,
    togglePause,
  ]);

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    soundEngine.setSfxEnabled(next);
  };

  const handleToggleBgm = () => {
    const next = !bgmEnabled;
    setBgmEnabled(next);
    soundEngine.setBgmEnabled(next, gameState === 'PLAYING');
  };

  const handleModeNavClick = (mode: GameMode) => {
    setGameMode(mode);
    gameModeRef.current = mode;
    if (gameState === 'PLAYING' || gameState === 'PAUSED') {
      startNewGame(mode);
    }
  };

  const ghostY =
    activePiece && gameState === 'PLAYING' ? getGhostY(board, activePiece) : null;

  const modeMeta = GAME_MODES[gameMode];
  const bestForCurrentMode = getBestRecordForMode(highScores, gameMode);

  const displayTimerMs =
    gameMode === 'ULTRA_120'
      ? Math.max(0, (modeMeta.timeLimitMs ?? 120000) - stats.elapsedMs)
      : stats.elapsedMs;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120] text-[#F8FAFC]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B1120]/90 backdrop-blur-md sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setGameState('TITLE_MENU');
            soundEngine.stopBgm();
          }}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap"
        >
          TETRA STUDIO
        </a>

        {/* Zone 2: 5 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          {(['MARATHON', 'SPRINT_40', 'ULTRA_120'] as GameMode[]).map((m) => {
            const isCurrent = gameMode === m;
            return (
              <button
                key={m}
                onClick={() => handleModeNavClick(m)}
                className={`whitespace-nowrap transition-colors cursor-pointer ${
                  isCurrent
                    ? 'text-amber-300 underline underline-offset-8 decoration-amber-400 decoration-2'
                    : 'text-slate-400 hover:text-white hover:underline hover:underline-offset-8'
                }`}
              >
                {GAME_MODES[m].shortLabel}
              </button>
            );
          })}
          <button
            onClick={() => setIsRulesOpen(true)}
            className="text-slate-400 hover:text-white hover:underline hover:underline-offset-8 transition-colors whitespace-nowrap cursor-pointer"
          >
            게임 규칙
          </button>
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="text-slate-400 hover:text-white hover:underline hover:underline-offset-8 transition-colors whitespace-nowrap cursor-pointer"
          >
            기록실
          </button>
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSfx}
            className="px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800/90 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            aria-label={sfxEnabled ? '효과음 끄기' : '효과음 켜기'}
          >
            {sfxEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{sfxEnabled ? '사운드 켜짐' : '음소거'}</span>
          </button>
          <button
            onClick={() => startNewGame()}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            새 게임 시작
          </button>
        </div>
      </header>

      {/* Main 1440px Desktop Arena Container */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 py-6 md:py-8 flex flex-col justify-center">
        {/* Mobile Mode Switcher & Utility Links */}
        <div className="flex md:hidden items-center justify-between gap-2 mb-4 pb-3 border-b border-white/10 overflow-x-auto">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg">
            {(['MARATHON', 'SPRINT_40', 'ULTRA_120'] as GameMode[]).map((m) => (
              <button
                key={m}
                onClick={() => handleModeNavClick(m)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  gameMode === m
                    ? 'bg-slate-800 text-amber-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {GAME_MODES[m].shortLabel}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300 shrink-0">
            <button onClick={() => setIsRulesOpen(true)} className="hover:text-white whitespace-nowrap">
              규칙
            </button>
            <span aria-hidden="true">·</span>
            <button onClick={() => setIsLeaderboardOpen(true)} className="hover:text-white whitespace-nowrap">
              기록실
            </button>
          </div>
        </div>

        {/* 3-Column Studio Game Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT PANEL: HOLD QUEUE & LIVE TELEMETRY (3 cols on desktop) */}
          <div className="lg:col-span-4 xl:col-span-3 order-2 lg:order-1 flex flex-col gap-6">
            {/* Hold Queue Container (Single-level elevation) */}
            <section className="bg-[#131C31] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-sm font-semibold text-white">홀드 보관함 (HOLD)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">단축키 C 또는 Shift</p>
                </div>
                <button
                  onClick={executeHold}
                  disabled={gameState !== 'PLAYING' || !canHold}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>교체</span>
                </button>
              </div>

              <div className="py-4">
                <MiniPiecePreview
                  type={holdPiece}
                  dimmed={!canHold}
                  size="md"
                  showSymbol={showSymbols}
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>교체 가능 상태</span>
                <span className={canHold ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                  {canHold ? '사용 가능' : '이번 턴 사용됨'}
                </span>
              </div>
            </section>

            {/* Score & Mode Telemetry Container (Single-level elevation, hairline dividers) */}
            <section className="bg-[#131C31] border border-white/10 rounded-xl p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>현재 점수 (SCORE)</span>
                  {bestForCurrentMode && (
                    <span>
                      최고 기록{' '}
                      <strong className="font-mono tabular-nums text-slate-200 font-semibold">
                        {gameMode === 'SPRINT_40'
                          ? formatDuration(bestForCurrentMode.durationMs)
                          : bestForCurrentMode.score.toLocaleString()}
                      </strong>
                    </span>
                  )}
                </div>
                <div className="font-mono tabular-nums text-3xl font-bold text-white mt-1 tracking-tight">
                  {stats.score.toLocaleString()}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">클리어 라인</span>
                  <span className="font-mono tabular-nums text-xl font-semibold text-slate-100 mt-0.5 block">
                    {stats.lines}
                    {modeMeta.targetLines ? (
                      <span className="text-sm text-slate-400 font-normal">
                        {' '}
                        / {modeMeta.targetLines}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400 font-normal">줄</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">
                    {gameMode === 'ULTRA_120' ? '남은 시간' : '경과 시간'}
                  </span>
                  <span className="font-mono tabular-nums text-xl font-semibold text-amber-300 mt-0.5 block">
                    {formatDuration(displayTimerMs)}
                  </span>
                </div>
              </div>

              {/* Unboxed Metadata Status Row */}
              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span>레벨 Lv.{stats.level}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {stats.combo > 0 ? `${stats.combo} 콤보 진행 중` : '콤보 대기'}
                </span>
                <span aria-hidden="true">·</span>
                <span className={stats.backToBack ? 'text-amber-300 font-semibold' : 'text-slate-400'}>
                  {stats.backToBack ? 'Back-to-Back 활성' : 'B2B 비활성'}
                </span>
              </div>

              {/* Live Action Callout Banner */}
              <div className="pt-4 border-t border-white/10 min-h-[68px] flex flex-col justify-center">
                {callout ? (
                  <div key={callout.id} className="transition-opacity duration-150">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`font-display text-base font-bold tracking-tight ${
                          callout.isSpecial ? 'text-amber-300' : 'text-cyan-300'
                        }`}
                      >
                        {callout.title}
                      </span>
                      <span className="font-mono tabular-nums text-xs font-semibold text-emerald-400">
                        +{callout.points.toLocaleString()}점
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      {callout.subtitle && (
                        <span className="text-amber-200 font-medium">{callout.subtitle}</span>
                      )}
                      {callout.subtitle && callout.combo > 0 && <span aria-hidden="true">·</span>}
                      {callout.combo > 0 && <span>연속 {callout.combo} COMBO</span>}
                      {!callout.subtitle && callout.combo === 0 && (
                        <span>정확한 라인 클리어 판정</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    줄을 제거하거나 T-스핀을 성공하면 기술 판정과 보너스 점수가 이곳에 표시됩니다.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* CENTER PANEL: 10x20 MATRIX & TACTILE TOUCH/MOUSE CONTROLS (6 cols on desktop) */}
          <div className="lg:col-span-4 xl:col-span-6 order-1 lg:order-2 flex flex-col items-center">
            <TetrisBoard
              board={board}
              activePiece={activePiece}
              ghostY={ghostY}
              gameState={gameState}
              gameMode={gameMode}
              startLevel={startLevel}
              stats={stats}
              isLocking={isLocking}
              recoilType={recoilType}
              flashingRows={flashingRows}
              showGhost={showGhost}
              showSymbols={showSymbols}
              isNewRecord={isNewRecord}
              onSelectMode={(m) => {
                setGameMode(m);
                gameModeRef.current = m;
              }}
              onSelectStartLevel={(lv) => {
                setStartLevel(lv);
                startLevelRef.current = lv;
              }}
              onStartGame={() => startNewGame()}
              onResumeGame={togglePause}
              onRestartGame={() => startNewGame()}
            />

            {/* Tactile On-Screen Control Deck (>= 44px touch targets) */}
            <div
              className="w-full max-w-[340px] mt-4 grid grid-cols-4 gap-2"
              aria-label="화면 터치 및 마우스 조작 패드"
            >
              <button
                type="button"
                onClick={() => moveHorizontal(-1)}
                disabled={gameState !== 'PLAYING'}
                className="min-h-[44px] rounded-lg bg-[#131C31] hover:bg-slate-800 active:scale-95 disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center text-slate-200 transition-transform cursor-pointer"
                aria-label="왼쪽 이동"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[10px] text-slate-400 mt-0.5">왼쪽</span>
              </button>

              <button
                type="button"
                onClick={moveSoftDrop}
                disabled={gameState !== 'PLAYING'}
                className="min-h-[44px] rounded-lg bg-[#131C31] hover:bg-slate-800 active:scale-95 disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center text-slate-200 transition-transform cursor-pointer"
                aria-label="소프트 드롭"
              >
                <ArrowDown className="w-4 h-4" />
                <span className="text-[10px] text-slate-400 mt-0.5">내리기</span>
              </button>

              <button
                type="button"
                onClick={() => moveHorizontal(1)}
                disabled={gameState !== 'PLAYING'}
                className="min-h-[44px] rounded-lg bg-[#131C31] hover:bg-slate-800 active:scale-95 disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center text-slate-200 transition-transform cursor-pointer"
                aria-label="오른쪽 이동"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="text-[10px] text-slate-400 mt-0.5">오른쪽</span>
              </button>

              <button
                type="button"
                onClick={executeHardDrop}
                disabled={gameState !== 'PLAYING'}
                className="min-h-[44px] rounded-lg bg-amber-400/15 hover:bg-amber-400/25 active:scale-95 disabled:opacity-40 border border-amber-400/40 flex flex-col items-center justify-center text-amber-300 transition-transform cursor-pointer"
                aria-label="하드 드롭 즉시 착지"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span className="text-[10px] font-semibold mt-0.5">하드드롭</span>
              </button>

              <button
                type="button"
                onClick={() => rotateActivePiece(-1)}
                disabled={gameState !== 'PLAYING'}
                className="min-h-[44px] rounded-lg bg-[#131C31] hover:bg-slate-800 active:scale-95 disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center text-slate-200 transition-transform cursor-pointer"
                aria-label="반시계 회전"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px] text-slate-400 mt-0.5">좌회전(Z)</span>
              </button>

              <button
                type="button"
                onClick={() => rotateActivePiece(1)}
                disabled={gameState !== 'PLAYING'}
                className="min-h-[44px] rounded-lg bg-[#131C31] hover:bg-slate-800 active:scale-95 disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center text-slate-200 transition-transform cursor-pointer"
                aria-label="시계 방향 회전"
              >
                <RotateCw className="w-4 h-4" />
                <span className="text-[10px] text-slate-400 mt-0.5">우회전(↑)</span>
              </button>

              <button
                type="button"
                onClick={executeHold}
                disabled={gameState !== 'PLAYING' || !canHold}
                className="min-h-[44px] rounded-lg bg-[#131C31] hover:bg-slate-800 active:scale-95 disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center text-slate-200 transition-transform cursor-pointer"
                aria-label="블록 홀드 교체"
              >
                <Repeat className="w-4 h-4" />
                <span className="text-[10px] text-slate-400 mt-0.5">홀드(C)</span>
              </button>

              <button
                type="button"
                onClick={togglePause}
                disabled={gameState !== 'PLAYING' && gameState !== 'PAUSED'}
                className="min-h-[44px] rounded-lg bg-[#131C31] hover:bg-slate-800 active:scale-95 disabled:opacity-40 border border-white/10 flex flex-col items-center justify-center text-slate-200 transition-transform cursor-pointer"
                aria-label={gameState === 'PAUSED' ? '게임 재개' : '일시정지'}
              >
                {gameState === 'PAUSED' ? (
                  <Play className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {gameState === 'PAUSED' ? '재개(P)' : '정지(P)'}
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: NEXT 4 QUEUE & STUDIO PREFERENCES (3 cols on desktop) */}
          <div className="lg:col-span-4 xl:col-span-3 order-3 flex flex-col gap-6">
            {/* Next 4 Tetrominoes Queue */}
            <section className="bg-[#131C31] border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white">다음 블록 (NEXT 4)</h2>
                <span className="text-xs text-slate-400">7-Bag 공정 생성</span>
              </div>

              <div className="divide-y divide-white/5">
                {nextQueue.slice(0, 4).map((pieceType, index) => (
                  <div
                    key={`${pieceType}-${index}`}
                    className="py-2.5 flex items-center justify-between"
                  >
                    <span className="font-mono tabular-nums text-xs text-slate-500">
                      0{index + 1}
                    </span>
                    <div className="flex-1">
                      <MiniPiecePreview
                        type={pieceType}
                        size={index === 0 ? 'md' : 'sm'}
                        showSymbol={showSymbols}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Studio Preferences & Technique Statistics */}
            <section className="bg-[#131C31] border border-white/10 rounded-xl p-5 space-y-4">
              <div className="pb-3 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white">시각 보조 및 사운드 설정</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  플레이 환경에 맞춰 즉시 전환됩니다.
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">착지 고스트 가이드 표시</span>
                  <button
                    type="button"
                    onClick={() => setShowGhost((v) => !v)}
                    className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      showGhost
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {showGhost ? '켜짐' : '꺼짐'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">색각 보정 기호 오버레이</span>
                  <button
                    type="button"
                    onClick={() => setShowSymbols((v) => !v)}
                    className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      showSymbols
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {showSymbols ? '켜짐' : '꺼짐'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">신디사이저 배경음 (BGM)</span>
                  <button
                    type="button"
                    onClick={handleToggleBgm}
                    className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      bgmEnabled
                        ? 'bg-amber-400 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {bgmEnabled ? '켜짐' : '꺼짐'}
                  </button>
                </div>
              </div>

              {/* Live Session Technique Breakdown */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-xs font-semibold text-slate-300 mb-2.5">
                  이번 게임 기술 통계
                </h3>
                <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">싱글 / 더블</dt>
                    <dd className="font-mono tabular-nums text-slate-200">
                      {stats.singles} / {stats.doubles}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">트리플</dt>
                    <dd className="font-mono tabular-nums text-slate-200">{stats.triples}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">TETRIS (4줄)</dt>
                    <dd className="font-mono tabular-nums text-cyan-300 font-semibold">
                      {stats.tetrises}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-slate-400">T-Spin</dt>
                    <dd className="font-mono tabular-nums text-purple-300 font-semibold">
                      {stats.tSpins}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        records={highScores}
        initialMode={gameMode}
      />
    </div>
  );
}
