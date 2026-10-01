import React from 'react';
import { X } from 'lucide-react';
import { TETROMINO_STYLES } from '../constants/tetrisConstants';
import { TetrominoType } from '../types/tetris';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const pieceOrder: TetrominoType[] = ['I', 'T', 'O', 'S', 'Z', 'J', 'L'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
    >
      <div className="w-full max-w-3xl bg-[#111827] border border-white/10 rounded-xl p-6 md:p-8 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div>
            <h2 id="rules-modal-title" className="text-xl font-bold text-slate-50">
              게임 규칙 및 점수 체계
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              국제 표준 가이드라인(SRS 회전 · 7-Bag 생성기 · 3코너 T-스핀 판정)을 준수합니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
            aria-label="규칙 창 닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 space-y-8 text-sm text-slate-300 leading-relaxed">
          {/* Section 1: Keyboard Controls */}
          <section>
            <h3 className="text-base font-semibold text-white mb-3">
              01. 키보드 및 마우스 조작법
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">좌우 이동</span>
                <span className="font-mono text-xs text-slate-100">← / → 방향키 또는 A / D</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">소프트 드롭 (빠른 하강)</span>
                <span className="font-mono text-xs text-slate-100">↓ 방향키 또는 S (+1점/칸)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">하드 드롭 (즉시 착지)</span>
                <span className="font-mono text-xs text-amber-300">Space (+2점/칸)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">시계 방향 회전 (CW)</span>
                <span className="font-mono text-xs text-slate-100">↑ 방향키 또는 X</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">반시계 방향 회전 (CCW)</span>
                <span className="font-mono text-xs text-slate-100">Z 또는 Ctrl</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">180도 반전 회전</span>
                <span className="font-mono text-xs text-slate-100">Q 또는 E</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">블록 홀드 (교체 보관)</span>
                <span className="font-mono text-xs text-slate-100">C 또는 Shift</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-slate-400">일시정지 / 빠른 재시작</span>
                <span className="font-mono text-xs text-slate-100">P (Esc) · R 키</span>
              </div>
            </div>
          </section>

          {/* Section 2: Scoring Table */}
          <section>
            <h3 className="text-base font-semibold text-white mb-3">
              02. 라인 클리어 및 특수 기술 점수표
            </h3>
            <div className="overflow-x-auto border-t border-white/10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">기술 명칭</th>
                    <th className="py-2.5 px-4 font-medium">조건 설명</th>
                    <th className="py-2.5 pl-4 text-right font-medium">기본 점수 (× 현재 레벨)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-slate-200">Single / Double / Triple</td>
                    <td className="py-2.5 px-4 text-slate-400">한 번에 1줄 / 2줄 / 3줄 동시 제거</td>
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-slate-100">100 / 300 / 500</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-cyan-300">TETRIS!</td>
                    <td className="py-2.5 px-4 text-slate-400">I-블록으로 한 번에 4줄 동시 제거</td>
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-cyan-300 font-semibold">800</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-purple-300">T-Spin Single / Double / Triple</td>
                    <td className="py-2.5 px-4 text-slate-400">T-블록 회전 끼워넣기(3코너 점유)로 1~3줄 제거</td>
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-purple-300 font-semibold">800 / 1,200 / 1,600</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-amber-300">Back-to-Back (연속 고난도)</td>
                    <td className="py-2.5 px-4 text-slate-400">TETRIS 또는 T-Spin 라인 클리어를 연속 성공</td>
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-amber-300">기본 점수 × 1.5배</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-medium text-emerald-300">Combo (연속 콤보)</td>
                    <td className="py-2.5 px-4 text-slate-400">블록을 놓을 때마다 끊기지 않고 연속 줄 제거</td>
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-emerald-300">+50 × 콤보 수 × 레벨</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-semibold text-amber-200">Perfect All Clear</td>
                    <td className="py-2.5 px-4 text-slate-400">보드 위의 모든 블록을 남김없이 완벽히 제거</td>
                    <td className="py-2.5 pl-4 text-right font-mono tabular-nums text-amber-200">+800 ~ +2,000 × 레벨</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: 7-Bag Tetromino Reference */}
          <section>
            <h3 className="text-base font-semibold text-white mb-2">
              03. 7-Bag 공정 생성 시스템 및 색각 보정 기호
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              7종의 테트로미노가 한 세트(가방) 단위로 무작위 섞여 등장하므로 특정 블록이 오랫동안 나오지 않는 불공정한 가뭄 현상이 발생하지 않습니다.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-white/5">
              {pieceOrder.map((t) => {
                const st = TETROMINO_STYLES[t];
                return (
                  <div key={t} className="flex items-center gap-2 text-xs text-slate-300">
                    <span
                      className="w-4 h-4 rounded-[3px] flex items-center justify-center text-[9px] font-bold text-slate-950"
                      style={{ backgroundColor: st.fill }}
                    >
                      {st.symbol}
                    </span>
                    <span className="font-medium text-slate-200">{st.name}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="mt-8 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap"
          >
            확인 및 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};
