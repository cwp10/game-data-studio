"use client";
import { useMemo } from "react";
import { Modal } from "@/components/ui";
import { computeAt, type CurveType } from "@/lib/curve/generate";

const PREVIEW_LEVELS = [1, 10, 100, 1000, 10000, 100000];

interface FormulaPreviewModalProps {
  open: boolean;
  onClose: () => void;
  heroName: string;
  type: string;
  base: number;
  factor: number;
}

function formatValue(v: number): string {
  if (!isFinite(v)) return "∞";
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

const VALID_TYPES: CurveType[] = ["linear", "power", "exponential", "logarithmic", "quadratic", "s_curve"];

export function FormulaPreviewModal({ open, onClose, heroName, type, base, factor }: FormulaPreviewModalProps) {
  const curveType: CurveType = VALID_TYPES.includes(type as CurveType) ? (type as CurveType) : "power";

  const results = useMemo(() => {
    if (!open || base === 0 && factor === 0) return [];
    return PREVIEW_LEVELS.map((level) => ({
      level,
      value: computeAt({ type: curveType, base, factor }, level),
    }));
  }, [open, curveType, base, factor]);

  const maxValue = useMemo(() => {
    const finite = results.filter((r) => isFinite(r.value)).map((r) => r.value);
    return finite.length > 0 ? Math.max(...finite) : 1;
  }, [results]);

  return (
    <Modal open={open} onClose={onClose} title={`공식 미리보기 — ${heroName}`}>
      <div className="space-y-4">
        <div className="text-[11px] text-[#6b6b77] bg-[#0f0f10] border border-[#2a2a2f] rounded-lg px-3 py-2 font-mono">
          {curveType} · base={base} · factor={factor}
        </div>

        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-[#4a4a55] border-b border-[#2a2a2f]">
              <th className="text-left py-1.5 font-medium">레벨</th>
              <th className="text-right py-1.5 font-medium">수치</th>
            </tr>
          </thead>
          <tbody>
            {results.map(({ level, value }) => (
              <tr key={level} className="border-b border-[#1e1e24]">
                <td className="py-1.5 text-[#6b6b77]">Lv {level.toLocaleString()}</td>
                <td className={`py-1.5 text-right font-medium ${!isFinite(value) ? "text-[#f87171]" : "text-[#ededed]"}`}>
                  {formatValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 바 차트 */}
        {results.some((r) => isFinite(r.value) && r.value > 0) && (
          <div className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3">
            <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest mb-2">성장 분포</div>
            <div className="flex items-end gap-1 h-16">
              {results.map(({ level, value }) => {
                const pct = isFinite(value) && maxValue > 0 ? Math.max(2, (value / maxValue) * 100) : 2;
                return (
                  <div key={level} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-sm ${!isFinite(value) ? "bg-[#ef4444]/60" : "bg-[#7c3aed]"}`}
                      style={{ height: `${pct}%` }}
                      title={`Lv${level.toLocaleString()}: ${formatValue(value)}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-[#3a3a42]">
              {results.map(({ level }) => (
                <span key={level} className="flex-1 text-center">
                  {level >= 1000 ? `${level / 1000}K` : level}
                </span>
              ))}
            </div>
          </div>
        )}

        {results.some((r) => !isFinite(r.value)) && (
          <div className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg px-3 py-2">
            ∞ — exponential 공식은 극고레벨에서 오버플로우. power 또는 logarithmic 사용 권장.
          </div>
        )}
      </div>
    </Modal>
  );
}
