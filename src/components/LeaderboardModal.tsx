import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GAME_MODES } from '../constants/tetrisConstants';
import { GameMode, HighScoreRecord } from '../types/tetris';
import { formatDuration } from '../utils/tetrisLogic';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: HighScoreRecord[];
  initialMode: GameMode;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  records,
  initialMode,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>(initialMode);

  if (!isOpen) return null;

  const filtered = records
    .filter((r) => r.mode === selectedMode)
    .slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-modal-title"
    >
      <div className="w-full max-w-3xl bg-[#111827] border border-white/10 rounded-xl p-6 md:p-8 max-h-[88vh] overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <h2 id="leaderboard-modal-title" className="text-xl font-bold text-slate-50">
              스튜디오 기록실
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              모드별 최고 점수, 최단 주파 시간 및 초당 블록 속도(PPS) 기록입니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="self-end sm:self-auto w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="기록실 창 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Filter Segmented Control */}
        <div className="mt-5 flex items-center gap-1 p-1 bg-slate-900 rounded-lg w-fit border border-white/5">
          {(['MARATHON', 'SPRINT_40', 'ULTRA_120'] as GameMode[]).map((mode) => {
            const active = selectedMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-slate-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {GAME_MODES[mode].title}
              </button>
            );
          })}
        </div>

        {/* Records Table */}
        <div className="mt-5 overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              아직 이 모드에 저장된 플레이 기록이 없습니다. 첫 게임을 완주해 보세요!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">순위</th>
                  <th className="py-2.5 px-3 font-medium">점수</th>
                  <th className="py-2.5 px-3 font-medium">클리어 라인</th>
                  <th className="py-2.5 px-3 font-medium">소요 시간</th>
                  <th className="py-2.5 px-3 font-medium">속도 · 기술</th>
                  <th className="py-2.5 pl-3 text-right font-medium">기록일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filtered.map((rec, idx) => {
                  const isTop = idx === 0;
                  return (
                    <tr key={rec.id} className={isTop ? 'bg-amber-500/5' : ''}>
                      <td className="py-3 pr-3 font-mono tabular-nums font-semibold text-slate-300">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums font-semibold text-slate-100">
                        {rec.score.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-slate-300">
                        {rec.lines}줄 · Lv.{rec.level}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-amber-300">
                        {formatDuration(rec.durationMs)}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono tabular-nums">
                        <span>{rec.pps.toFixed(2)} PPS</span>
                        <span aria-hidden="true"> · </span>
                        <span>최대 {rec.maxCombo}콤보</span>
                        {rec.tSpinCount > 0 && (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>T-스핀 {rec.tSpinCount}</span>
                          </>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-500">
                        {rec.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
