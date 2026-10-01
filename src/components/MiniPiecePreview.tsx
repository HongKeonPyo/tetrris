import React from 'react';
import { TETROMINO_SHAPES, TETROMINO_STYLES } from '../constants/tetrisConstants';
import { TetrominoType } from '../types/tetris';

interface MiniPiecePreviewProps {
  type: TetrominoType | null;
  dimmed?: boolean;
  size?: 'md' | 'sm';
  showSymbol?: boolean;
}

export const MiniPiecePreview: React.FC<MiniPiecePreviewProps> = ({
  type,
  dimmed = false,
  size = 'md',
  showSymbol = false,
}) => {
  const cellPx = size === 'md' ? 20 : 16;

  if (!type) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-600 select-none"
        style={{ height: cellPx * 2.8 }}
      >
        비어 있음
      </div>
    );
  }

  const shape = TETROMINO_SHAPES[type][0];
  const style = TETROMINO_STYLES[type];

  // Trim empty rows for tight vertical centering
  const activeRows = shape.filter((row) => row.some((cell) => cell === 1));
  const cols = shape[0].length;

  return (
    <div
      className={`flex items-center justify-center transition-opacity duration-150 ${
        dimmed ? 'opacity-40 grayscale' : 'opacity-100'
      }`}
      style={{ height: cellPx * 2.8 }}
      aria-label={`${style.name} 블록 미리보기`}
    >
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
        }}
      >
        {activeRows.map((row, rIdx) =>
          row.map((cell, cIdx) => {
            if (!cell) {
              return <div key={`${rIdx}-${cIdx}`} style={{ width: cellPx, height: cellPx }} />;
            }
            return (
              <div
                key={`${rIdx}-${cIdx}`}
                className="relative flex items-center justify-center rounded-[3px]"
                style={{
                  width: cellPx,
                  height: cellPx,
                  backgroundColor: style.fill,
                  borderTop: `2px solid ${style.topBevel}`,
                  borderLeft: `2px solid ${style.topBevel}`,
                  borderRight: `2px solid ${style.bottomBevel}`,
                  borderBottom: `2px solid ${style.bottomBevel}`,
                }}
              >
                {showSymbol && (
                  <span className="text-[9px] font-bold text-slate-950/80 select-none leading-none">
                    {style.symbol}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
