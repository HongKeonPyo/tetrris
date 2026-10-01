import React from 'react';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BUFFER_ROWS,
  GAME_MODES,
  TETROMINO_SHAPES,
  TETROMINO_STYLES,
} from '../constants/tetrisConstants';
import {
  ActivePiece,
  BoardMatrix,
  GameMode,
  GameState,
  GameStats,
  TetrominoType,
} from '../types/tetris';
import { formatDuration } from '../utils/tetrisLogic';
import { Play, RotateCcw } from 'lucide-react';

interface TetrisBoardProps {
  board: BoardMatrix;
  activePiece: ActivePiece | null;
  ghostY: number | null;
  gameState: GameState;
  gameMode: GameMode;
  startLevel: number;
  stats: GameStats;
  isLocking: boolean;
  recoilType: 'NONE' | 'DROP' | 'CLEAR';
  flashingRows: number[];
  showGhost: boolean;
  showSymbols: boolean;
  isNewRecord: boolean;
  onSelectMode: (mode: GameMode) => void;
  onSelectStartLevel: (level: number) => void;
  onStartGame: () => void;
  onResumeGame: () => void;
  onRestartGame: () => void;
}

export const TetrisBoard: React.FC<TetrisBoardProps> = ({
  board,
  activePiece,
  ghostY,
  gameState,
  gameMode,
  startLevel,
  stats,
  isLocking,
  recoilType,
  flashingRows,
  showGhost,
  showSymbols,
  isNewRecord,
  onSelectMode,
  onSelectStartLevel,
  onStartGame,
  onResumeGame,
  onRestartGame,
}) => {
  // Build lookup maps for active piece cells and ghost piece cells in visible coordinates (0..19)
  const activeCells = new Map<string, TetrominoType>();
  const ghostCells = new Set<string>();

  if (activePiece && (gameState === 'PLAYING' || gameState === 'PAUSED')) {
    const shape = TETROMINO_SHAPES[activePiece.type][activePiece.rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const gx = activePiece.x + c;
        const gy = activePiece.y + r - BUFFER_ROWS;
        if (gy >= 0 && gy < BOARD_HEIGHT && gx >= 0 && gx < BOARD_WIDTH) {
          activeCells.set(`${gy},${gx}`, activePiece.type);
        }
        if (showGhost && ghostY !== null && ghostY !== activePiece.y) {
          const ghostVisY = ghostY + r - BUFFER_ROWS;
          if (ghostVisY >= 0 && ghostVisY < BOARD_HEIGHT && gx >= 0 && gx < BOARD_WIDTH) {
            ghostCells.add(`${ghostVisY},${gx}`);
          }
        }
      }
    }
  }

  // Check if stack is dangerously high (within top 4 visible rows)
  const isDangerStack = board
    .slice(BUFFER_ROWS, BUFFER_ROWS + 4)
    .some((row) => row.some((cell) => cell !== null));

  const recoilClass =
    recoilType === 'DROP'
      ? 'animate-drop-recoil'
      : recoilType === 'CLEAR'
      ? 'animate-clear-pulse'
      : '';

  const pps =
    stats.elapsedMs > 0
      ? (stats.piecesPlaced / (stats.elapsedMs / 1000)).toFixed(2)
      : '0.00';

  return (
    <div
      className={`relative select-none rounded-xl bg-[#090E1A] border ${
        isDangerStack && gameState === 'PLAYING'
          ? 'border-rose-500/60 shadow-[0_0_24px_rgba(244,63,94,0.15)]'
          : 'border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.55)]'
      } p-2 transition-colors duration-200 ${recoilClass}`}
    >
      {/* Top Danger Line Indicator */}
      <div className="flex items-center justify-between px-1.5 pb-1.5 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span>{GAME_MODES[gameMode].title}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums text-slate-300">Lv.{stats.level}</span>
        </div>
        {isDangerStack && gameState === 'PLAYING' ? (
          <span className="text-rose-400 font-semibold">상단 위험 구역 접근</span>
        ) : (
          <span className="font-mono tabular-nums text-slate-400">{pps} PPS</span>
        )}
      </div>

      {/* 10x20 Playfield Matrix */}
      <div
        className="relative grid bg-[#060A12] border border-white/10 rounded-lg overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
          width: 'min(76vw, 310px)',
          height: 'min(152vw, 620px)',
        }}
        role="grid"
        aria-label="테트리스 보드 10x20 행렬"
      >
        {/* Subtle danger zone threshold line at Row 2 */}
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 border-b border-dashed border-rose-500/25"
          style={{ top: '10%' }}
        />

        {Array.from({ length: BOARD_HEIGHT }).map((_, visRow) => {
          const boardRowIdx = visRow + BUFFER_ROWS;
          const isRowFlashing = flashingRows.includes(boardRowIdx);

          return Array.from({ length: BOARD_WIDTH }).map((__, col) => {
            const key = `${visRow},${col}`;
            const lockedCell = board[boardRowIdx]?.[col] ?? null;
            const activeType = activeCells.get(key) ?? null;
            const isGhost = !activeType && !lockedCell && ghostCells.has(key);

            const cellType = activeType || lockedCell?.type || null;
            const style = cellType ? TETROMINO_STYLES[cellType] : null;
            const ghostStyle =
              isGhost && activePiece ? TETROMINO_STYLES[activePiece.type] : null;

            return (
              <div
                key={key}
                className={`relative flex items-center justify-center border-[0.5px] border-white/[0.035] transition-opacity duration-100 ${
                  isRowFlashing ? 'bg-amber-200 opacity-95' : ''
                }`}
                style={
                  !isRowFlashing && style
                    ? {
                        backgroundColor: style.fill,
                        borderTop: `2.5px solid ${style.topBevel}`,
                        borderLeft: `2.5px solid ${style.topBevel}`,
                        borderRight: `2.5px solid ${style.bottomBevel}`,
                        borderBottom: `2.5px solid ${style.bottomBevel}`,
                        opacity: activeType && isLocking ? 0.82 : 1,
                      }
                    : !isRowFlashing && ghostStyle
                    ? {
                        backgroundColor: ghostStyle.ghostFill,
                        border: `1.5px dashed ${ghostStyle.ghostBorder}`,
                      }
                    : undefined
                }
              >
                {/* Subtle tactile inner highlight for locked/active blocks */}
                {style && !isRowFlashing && (
                  <div className="pointer-events-none absolute inset-[3px] rounded-[1px] bg-white/10" />
                )}
                {style && showSymbols && !isRowFlashing && (
                  <span className="relative z-10 text-[10px] font-bold text-slate-950/85 leading-none select-none">
                    {style.symbol}
                  </span>
                )}
              </div>
            );
          });
        })}

        {/* OVERLAY 1: TITLE MENU */}
        {gameState === 'TITLE_MENU' && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between bg-slate-950/92 backdrop-blur-md p-5">
            <div>
              <p className="text-xs font-medium text-amber-400">
                아케이드 퍼즐 스튜디오
              </p>
              <h1
                className="font-display text-2xl font-bold tracking-tight text-white mt-1"
                style={{ textWrap: 'balance' }}
              >
                TETRA STUDIO
              </h1>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {GAME_MODES[gameMode].subtitle}
              </p>

              {/* Mode Selector */}
              <div className="mt-5">
                <span className="block text-xs font-medium text-slate-400 mb-2">
                  플레이 모드 선택
                </span>
                <div className="flex flex-col gap-1.5">
                  {(['MARATHON', 'SPRINT_40', 'ULTRA_120'] as GameMode[]).map((m) => {
                    const selected = gameMode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => onSelectMode(m)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                          selected
                            ? 'bg-slate-800/95 border-amber-400/60 text-white'
                            : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{GAME_MODES[m].title}</span>
                          {selected && (
                            <span className="text-[11px] font-medium text-amber-300">
                              선택됨
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {GAME_MODES[m].targetDescription}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Starting Level Selector */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400 font-medium">시작 레벨 속도</span>
                  <span className="font-mono tabular-nums text-amber-300 font-semibold">
                    Lv.{startLevel}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 p-1 bg-slate-900 rounded-lg border border-white/5">
                  {[1, 3, 5, 8, 10].map((lv) => (
                    <button
                      key={lv}
                      onClick={() => onSelectStartLevel(lv)}
                      className={`py-1.5 text-xs font-mono tabular-nums font-medium rounded transition-colors ${
                        startLevel === lv
                          ? 'bg-amber-400 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Lv.{lv}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={onStartGame}
                className="w-full py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>게임 시작하기</span>
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-2">
                방향키 이동 · Space 하드 드롭 · C 홀드
              </p>
            </div>
          </div>
        )}

        {/* OVERLAY 2: PAUSED */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-6 text-center">
            <p className="text-xs font-medium text-amber-400">일시정지 상태</p>
            <h2 className="text-2xl font-bold text-white mt-1">PAUSED</h2>
            <p className="text-xs text-slate-400 mt-2">
              현재 점수 <span className="font-mono tabular-nums text-slate-200">{stats.score.toLocaleString()}</span> · 클리어 <span className="font-mono tabular-nums text-slate-200">{stats.lines}줄</span>
            </p>

            <div className="w-full mt-6 space-y-2.5">
              <button
                onClick={onResumeGame}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>이어서 플레이 (P / Esc)</span>
              </button>
              <button
                onClick={onRestartGame}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>처음부터 다시 시작 (R)</span>
              </button>
            </div>
          </div>
        )}

        {/* OVERLAY 3 & 4: ROUND SUMMARY (VICTORY) OR GAME OVER */}
        {(gameState === 'ROUND_SUMMARY' || gameState === 'GAME_OVER') && (
          <div className="absolute inset-0 z-20 flex flex-col justify-between bg-slate-950/94 backdrop-blur-md p-5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-semibold ${
                    gameState === 'ROUND_SUMMARY' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {gameState === 'ROUND_SUMMARY' ? '모드 목표 달성 완주!' : '게임 종료'}
                </span>
                {isNewRecord && (
                  <span className="text-amber-300 font-semibold">신기록 달성</span>
                )}
              </div>

              <h2 className="font-display text-2xl font-bold text-white mt-1">
                {gameState === 'ROUND_SUMMARY' ? 'STAGE CLEAR' : 'GAME OVER'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {GAME_MODES[gameMode].title} · 최종 레벨 Lv.{stats.level}
              </p>

              {/* Primary Final Metric */}
              <div className="mt-4 py-3 border-y border-white/10">
                <span className="text-xs text-slate-400">
                  {gameMode === 'SPRINT_40' ? '40라인 돌파 시간' : '최종 획득 점수'}
                </span>
                <div className="font-mono tabular-nums text-2xl font-bold text-amber-300 mt-0.5">
                  {gameMode === 'SPRINT_40'
                    ? formatDuration(stats.elapsedMs)
                    : stats.score.toLocaleString()}
                </div>
              </div>

              {/* Detailed Breakdown List */}
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">획득 점수</dt>
                  <dd className="font-mono tabular-nums text-slate-100 font-medium">
                    {stats.score.toLocaleString()}점
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">제거한 라인</dt>
                  <dd className="font-mono tabular-nums text-slate-100 font-medium">
                    {stats.lines}줄
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">플레이 시간 · 속도</dt>
                  <dd className="font-mono tabular-nums text-slate-200">
                    {formatDuration(stats.elapsedMs)} · {pps} PPS
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">최대 콤보 · 백투백</dt>
                  <dd className="font-mono tabular-nums text-slate-200">
                    {stats.maxCombo}콤보 · B2B {stats.backToBackCount}회
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-400">TETRIS · T-Spin 횟수</dt>
                  <dd className="font-mono tabular-nums text-slate-200">
                    테트리스 {stats.tetrises}회 · T-스핀 {stats.tSpins}회
                  </dd>
                </div>
              </dl>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={onRestartGame}
                className="w-full py-3 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>다시 플레이 (Space / Enter)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
