"use client";
import { type Dispatch, type SetStateAction } from "react";
import { Sparkles, Trash2, Plus, TrendingUp } from "lucide-react";
import { Btn, Modal, Input, Select } from "@/components/ui";
import { type CurveType } from "@/lib/curve/generate";

export interface CurveState {
  value_column: string;
  level_column: string;
  type: CurveType;
  base: string;
  factor: string;
  count: string;
  replace: boolean;
  range: string;
  rate: string;
  midpoint: string;
}

interface CurveModalProps {
  open: boolean;
  onClose: () => void;
  curve: CurveState;
  setCurve: Dispatch<SetStateAction<CurveState>>;
  curvePreview: number[];
  solveTargetLevel: string;
  setSolveTargetLevel: Dispatch<SetStateAction<string>>;
  solveTargetValue: string;
  setSolveTargetValue: Dispatch<SetStateAction<string>>;
  solveResult: { ok: boolean; achievedValue?: number } | null;
  setSolveResult: Dispatch<SetStateAction<{ ok: boolean; achievedValue?: number } | null>>;
  runSolve: () => void;
  fitPoints: { level: string; value: string }[];
  setFitPoints: Dispatch<SetStateAction<{ level: string; value: string }[]>>;
  fitResult: { ok: boolean; r2?: number } | null;
  setFitResult: Dispatch<SetStateAction<{ ok: boolean; r2?: number } | null>>;
  runFit: () => void;
  runCurve: () => void;
}

export function CurveModal({
  open,
  onClose,
  curve,
  setCurve,
  curvePreview,
  solveTargetLevel,
  setSolveTargetLevel,
  solveTargetValue,
  setSolveTargetValue,
  solveResult,
  setSolveResult,
  runSolve,
  fitPoints,
  setFitPoints,
  fitResult,
  setFitResult,
  runFit,
  runCurve,
}: CurveModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="성장 곡선 생성">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">레벨 컬럼</div>
            <Input value={curve.level_column} onChange={(e) => setCurve({ ...curve, level_column: e.target.value })} />
          </div>
          <div>
            <div className="text-[11px] text-[#9a9aa3] mb-1">값 컬럼 *</div>
            <Input placeholder="예: exp" value={curve.value_column} onChange={(e) => setCurve({ ...curve, value_column: e.target.value })} />
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#9a9aa3] mb-1">곡선 타입</div>
          <Select value={curve.type} onChange={(e) => setCurve({ ...curve, type: e.target.value as CurveType })}>
            <option value="linear">선형 — base + factor×(L-1)</option>
            <option value="power">거듭제곱 — base × L^factor</option>
            <option value="exponential">지수 — base × factor^(L-1)</option>
            <option value="logarithmic">로그 — base + factor×ln(L)</option>
            <option value="quadratic">2차 — base + factor×(L-1)²</option>
            <option value="s_curve">S-Curve — base + range/(1+exp(-rate×(L-mid)))</option>
          </Select>
        </div>
        {curve.type === "s_curve" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[11px] text-[#9a9aa3] mb-1">base (하한)</div>
                <Input value={curve.base} onChange={(e) => setCurve({ ...curve, base: e.target.value })} />
              </div>
              <div>
                <div className="text-[11px] text-[#9a9aa3] mb-1">개수(레벨)</div>
                <Input value={curve.count} onChange={(e) => setCurve({ ...curve, count: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[11px] text-[#9a9aa3] mb-1">range (증가폭)</div>
                <Input value={curve.range} onChange={(e) => setCurve({ ...curve, range: e.target.value })} />
              </div>
              <div>
                <div className="text-[11px] text-[#9a9aa3] mb-1">rate (가파름)</div>
                <Input value={curve.rate} onChange={(e) => setCurve({ ...curve, rate: e.target.value })} />
              </div>
              <div>
                <div className="text-[11px] text-[#9a9aa3] mb-1">midpoint (변곡 레벨)</div>
                <Input value={curve.midpoint} onChange={(e) => setCurve({ ...curve, midpoint: e.target.value })} />
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">base</div>
              <Input value={curve.base} onChange={(e) => setCurve({ ...curve, base: e.target.value })} />
            </div>
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">factor</div>
              <Input value={curve.factor} onChange={(e) => setCurve({ ...curve, factor: e.target.value })} />
            </div>
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">개수(레벨)</div>
              <Input value={curve.count} onChange={(e) => setCurve({ ...curve, count: e.target.value })} />
            </div>
          </div>
        )}

        {/* 목표값으로 역산 */}
        {curve.type === "s_curve" ? (
          <div className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3">
            <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">목표값으로 역산</div>
            <div className="text-[10px] text-[#6b6b77] mt-1">S-Curve는 단일 factor가 없어 역산이 지원되지 않습니다.</div>
          </div>
        ) : (
        <div className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3 space-y-2">
          <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">목표값으로 역산</div>
          <div className="text-[10px] text-[#6b6b77]">현재 타입·base 기준으로 목표 레벨에서 목표값이 되는 factor 를 계산합니다.</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">목표 레벨</div>
              <Input placeholder="예: 30" value={solveTargetLevel} onChange={(e) => { setSolveTargetLevel(e.target.value); setSolveResult(null); }} />
            </div>
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-1">목표값</div>
              <Input placeholder="예: 100000" value={solveTargetValue} onChange={(e) => { setSolveTargetValue(e.target.value); setSolveResult(null); }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Btn onClick={runSolve} disabled={!solveTargetLevel.trim() || !solveTargetValue.trim()}><Sparkles size={11} />factor 역산</Btn>
            {solveResult && (solveResult.ok
              ? <div className="text-[10px] text-[#4ade80]">factor 적용됨 · 도달값 {solveResult.achievedValue?.toLocaleString()}</div>
              : <div className="text-[10px] text-[#f87171]">해 없음 (목표 도달 불가 / 레벨 1)</div>
            )}
          </div>
        </div>
        )}

        {/* 점에서 곡선 맞추기 (피팅) */}
        <div className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3 space-y-2">
          <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">점에서 곡선 맞추기</div>
          <div className="text-[10px] text-[#6b6b77]">{curve.type === "s_curve" ? "(레벨, 값) 점들을 입력하면 S-Curve로 base·range·rate·midpoint 를 역산합니다." : "(레벨, 값) 점들을 입력하면 현재 타입으로 base·factor 를 역산합니다."}</div>
          <div className="space-y-1">
            <div className="flex gap-2 text-[10px] text-[#4a4a55] px-0.5">
              <div className="flex-1">레벨</div>
              <div className="flex-1">값</div>
              <div className="w-6" />
            </div>
            {fitPoints.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input placeholder="예: 1" value={p.level} onChange={(e) => { setFitPoints((prev) => prev.map((q, j) => j === i ? { ...q, level: e.target.value } : q)); setFitResult(null); }} />
                </div>
                <div className="flex-1">
                  <Input placeholder="예: 100" value={p.value} onChange={(e) => { setFitPoints((prev) => prev.map((q, j) => j === i ? { ...q, value: e.target.value } : q)); setFitResult(null); }} />
                </div>
                <button
                  type="button"
                  onClick={() => { setFitPoints((prev) => prev.length > 1 ? prev.filter((_, j) => j !== i) : prev); setFitResult(null); }}
                  disabled={fitPoints.length <= 1}
                  className="w-6 h-6 flex items-center justify-center rounded text-[#6b6b77] hover:text-[#f87171] hover:bg-[#2a2a2f] disabled:opacity-30 disabled:hover:text-[#6b6b77] disabled:hover:bg-transparent"
                  title="점 삭제"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
          <Btn onClick={() => { setFitPoints((prev) => [...prev, { level: "", value: "" }]); setFitResult(null); }}><Plus size={11} />점 추가</Btn>
          <div className="flex items-center justify-between gap-2 pt-1">
            <Btn onClick={runFit}><Sparkles size={11} />맞추기</Btn>
            {fitResult && (fitResult.ok
              ? <div className="text-[10px] text-[#4ade80]">파라미터 적용됨 · 적합도 R²={fitResult.r2?.toFixed(2)}</div>
              : <div className="text-[10px] text-[#f87171]">점 2개 이상을 입력하세요</div>
            )}
          </div>
        </div>

        {/* 미리보기 */}
        {curvePreview.length > 0 && (
          <div className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">미리보기</div>
              <div className="text-[10px] text-[#6b6b77]">Lv1 {curvePreview[0].toLocaleString()} → Lv{curvePreview.length} {curvePreview[curvePreview.length - 1].toLocaleString()}</div>
            </div>
            <div className="flex items-end gap-px h-16">
              {(() => {
                const max = Math.max(...curvePreview, 1);
                const step = Math.max(1, Math.ceil(curvePreview.length / 40));
                return curvePreview.filter((_, i) => i % step === 0).map((v, i) => (
                  <div key={i} className="flex-1 bg-[#7c3aed] rounded-t-sm min-w-0" style={{ height: `${Math.max(2, (v / max) * 100)}%` }} title={v.toLocaleString()} />
                ));
              })()}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-[11px] text-[#9a9aa3] cursor-pointer">
          <input type="checkbox" checked={curve.replace} onChange={(e) => setCurve({ ...curve, replace: e.target.checked })} className="accent-[#7c3aed]" />
          기존 행을 모두 지우고 새로 생성 (체크 해제 시 추가)
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Btn onClick={onClose}>취소</Btn>
          <Btn variant="primary" onClick={runCurve} disabled={!curve.value_column.trim() || curvePreview.length === 0}><TrendingUp size={11} />생성</Btn>
        </div>
      </div>
    </Modal>
  );
}
