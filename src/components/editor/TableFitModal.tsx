"use client";
import { useState, useMemo, useEffect } from "react";
import { Copy, Check, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Modal, Btn, Select } from "@/components/ui";
import { fitCurve } from "@/lib/curve/fit";
import { computeAt, type CurveType } from "@/lib/curve/generate";

const CURVE_TYPES: { value: CurveType; label: string }[] = [
  { value: "power", label: "power  (base × L^factor)" },
  { value: "exponential", label: "exponential  (base × factor^L)" },
  { value: "linear", label: "linear  (base + factor×L)" },
  { value: "quadratic", label: "quadratic  (base + factor×(L-1)²)" },
  { value: "logarithmic", label: "logarithmic  (base + factor×ln(L))" },
  { value: "s_curve", label: "s_curve  (로지스틱)" },
];
const MAX_PREVIEW = 10;

interface Row { id: string; data: Record<string, unknown>; }
interface Column { id?: string; name: string; type: string; }
interface TableMeta { id: string; name: string; }

interface BulkResult {
  groupVal: string;
  status: "ok" | "not_found" | "error";
  r2?: number;
  base?: number;
  factor?: number;
  message?: string;
}

interface TableFitModalProps {
  open: boolean;
  onClose: () => void;
  rows: Row[];
  columns: Column[];
  projectId: string;
}

function r2Badge(r2: number) {
  if (r2 >= 0.99) return { label: "우수", cls: "bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30" };
  if (r2 >= 0.95) return { label: "양호", cls: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/30" };
  return { label: "불량", cls: "bg-[#f87171]/10 text-[#f87171] border-[#f87171]/30" };
}

function errColor(pct: number) {
  if (pct < 5) return "text-[#4ade80]";
  if (pct < 15) return "text-[#f59e0b]";
  return "text-[#f87171]";
}

function fmt(v: number) {
  if (!isFinite(v)) return "∞";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(2);
}

function computeFitForGroup(rows: Row[], levelCol: string, valueCol: string, curveType: CurveType) {
  const points = rows
    .map((r) => ({ level: Number(r.data[levelCol]), value: Number(r.data[valueCol]) }))
    .filter((p) => isFinite(p.level) && isFinite(p.value) && p.level > 0);
  if (points.length < 2) return null;
  return { fit: fitCurve(points, curveType), points };
}

export function TableFitModal({ open, onClose, rows, columns, projectId }: TableFitModalProps) {
  const numberCols = columns.filter((c) => c.type === "number").map((c) => c.name);
  const allCols = columns.map((c) => c.name);

  // ── 피팅 설정 ──
  const [levelCol, setLevelCol] = useState(numberCols[0] ?? "");
  const [valueCol, setValueCol] = useState(numberCols[1] ?? "");
  const [curveType, setCurveType] = useState<CurveType>("power");
  const [filterCol, setFilterCol] = useState("");
  const [filterVal, setFilterVal] = useState("");

  // ── 미리보기 복사 ──
  const [copied, setCopied] = useState(false);

  // ── 일괄 적용 ──
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [targetTableId, setTargetTableId] = useState("");
  const [targetCols, setTargetCols] = useState<Column[]>([]);
  const [targetRows, setTargetRows] = useState<Row[]>([]);
  const [matchCol, setMatchCol] = useState("");
  const [bulkStatus, setBulkStatus] = useState<"idle" | "running" | "done">("idle");
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);

  // 프로젝트 테이블 목록 로드
  useEffect(() => {
    if (!open || !projectId) return;
    fetch(`/api/tables?project_id=${projectId}`)
      .then((r) => r.json())
      .then((t: TableMeta[]) => setTables(t))
      .catch(() => {});
  }, [open, projectId]);

  // 대상 테이블 변경 시 컬럼·행 로드
  useEffect(() => {
    if (!targetTableId) { setTargetCols([]); setTargetRows([]); setMatchCol(""); return; }
    Promise.all([
      fetch(`/api/tables/${targetTableId}`).then((r) => r.json()).then((d: { columns: Column[] }) => { setTargetCols(d.columns); setMatchCol(d.columns[0]?.name ?? ""); }),
      fetch(`/api/rows?table_id=${targetTableId}&limit=2000`).then((r) => r.json()).then(setTargetRows),
    ]).catch(() => {});
  }, [targetTableId]);

  const uniqueGroups = useMemo(() => {
    if (!filterCol) return [];
    return [...new Set(rows.map((r) => String(r.data[filterCol] ?? "")).filter(Boolean))].sort();
  }, [rows, filterCol]);

  const previewPoints = useMemo(() => {
    const src = (filterCol && filterVal)
      ? rows.filter((r) => String(r.data[filterCol] ?? "") === filterVal)
      : rows;
    return src
      .map((r) => ({ level: Number(r.data[levelCol]), value: Number(r.data[valueCol]) }))
      .filter((p) => isFinite(p.level) && isFinite(p.value) && p.level > 0);
  }, [rows, levelCol, valueCol, filterCol, filterVal]);

  const fit = useMemo(() => {
    if (previewPoints.length < 2 || !levelCol || !valueCol) return null;
    return fitCurve(previewPoints, curveType);
  }, [previewPoints, curveType, levelCol, valueCol]);

  const { preview, maxErr, meanErr } = useMemo(() => {
    if (!fit || previewPoints.length === 0) return { preview: [], maxErr: 0, meanErr: 0 };
    const opts = { type: curveType, base: fit.base, factor: fit.factor, range: fit.range, rate: fit.rate, midpoint: fit.midpoint };
    const allErrors = previewPoints.map((p) => {
      const f = computeAt(opts, p.level);
      return p.value !== 0 ? Math.abs(f - p.value) / Math.abs(p.value) * 100 : 0;
    });
    const sorted = [...previewPoints].sort((a, b) => a.level - b.level);
    const step = Math.max(1, Math.floor(sorted.length / MAX_PREVIEW));
    const pv = sorted.filter((_, i) => i % step === 0).slice(0, MAX_PREVIEW).map((p) => {
      const fitted = computeAt(opts, p.level);
      const diffPct = p.value !== 0 ? Math.abs(fitted - p.value) / Math.abs(p.value) * 100 : 0;
      return { level: p.level, original: p.value, fitted, diffPct };
    });
    return {
      preview: pv,
      maxErr: Math.max(...allErrors),
      meanErr: allErrors.reduce((a, b) => a + b, 0) / allErrors.length,
    };
  }, [fit, previewPoints, curveType]);

  const paramsJson = fit
    ? JSON.stringify({ growth_type: curveType, growth_base: Math.round(fit.base * 1000) / 1000, growth_factor: Math.round(fit.factor * 1000) / 1000 }, null, 2)
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(paramsJson).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // 대상 테이블의 필수 컬럼 존재 여부
  const missingCols = useMemo(() => {
    const names = new Set(targetCols.map((c) => c.name));
    return ["growth_type", "growth_base", "growth_factor"].filter((c) => !names.has(c));
  }, [targetCols]);

  const handleBulkApply = async () => {
    if (!filterCol || !targetTableId || !matchCol) return;
    setBulkStatus("running");
    setBulkResults([]);

    const results: BulkResult[] = [];

    for (const groupVal of uniqueGroups) {
      const groupRows = rows.filter((r) => String(r.data[filterCol] ?? "") === groupVal);
      const result = computeFitForGroup(groupRows, levelCol, valueCol, curveType);

      if (!result || result.points.length < 2) {
        results.push({ groupVal, status: "error", message: "데이터 부족" });
        continue;
      }

      const { fit: groupFit } = result;
      const targetRow = targetRows.find((r) => String(r.data[matchCol] ?? "") === groupVal || r.id === groupVal);

      if (!targetRow) {
        results.push({ groupVal, status: "not_found", r2: groupFit.r2, message: `${matchCol}="${groupVal}" 행 없음` });
        continue;
      }

      try {
        const newData: Record<string, unknown> = { ...targetRow.data };
        newData["growth_type"] = curveType;
        newData["growth_base"] = Math.round(groupFit.base * 1000) / 1000;
        newData["growth_factor"] = Math.round(groupFit.factor * 1000) / 1000;
        if (groupFit.range !== undefined) {
          newData["growth_range"] = groupFit.range;
          newData["growth_rate"] = groupFit.rate;
          newData["growth_midpoint"] = groupFit.midpoint;
        }

        await fetch("/api/rows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table_id: targetTableId, id: targetRow.id, data: newData }),
        });

        results.push({ groupVal, status: "ok", r2: groupFit.r2, base: Math.round(groupFit.base * 1000) / 1000, factor: Math.round(groupFit.factor * 1000) / 1000 });
      } catch {
        results.push({ groupVal, status: "error", r2: groupFit.r2, message: "저장 실패" });
      }
    }

    setBulkResults(results);
    setBulkStatus("done");
  };

  const badge = fit ? r2Badge(fit.r2) : null;
  const bulkReady = filterCol && uniqueGroups.length > 0 && targetTableId && matchCol;

  return (
    <Modal open={open} onClose={onClose} title="테이블 → 공식 변환">
      <div className="space-y-4">

        {/* ── 컬럼 선택 ── */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-[#4a4a55] mb-1">레벨 컬럼</div>
            <Select value={levelCol} onChange={(e) => setLevelCol(e.target.value)}>
              {numberCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[10px] text-[#4a4a55] mb-1">수치 컬럼</div>
            <Select value={valueCol} onChange={(e) => setValueCol(e.target.value)}>
              {numberCols.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-[#4a4a55] mb-1">곡선 타입</div>
          <Select value={curveType} onChange={(e) => setCurveType(e.target.value as CurveType)}>
            {CURVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>

        {/* ── 그룹 필터 ── */}
        <div className="border border-[#2a2a2f] rounded-lg p-3 space-y-2">
          <div className="text-[10px] text-[#4a4a55]">그룹 컬럼 — 영웅 ID 등 엔티티별 개별 피팅</div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterCol} onChange={(e) => { setFilterCol(e.target.value); setFilterVal(""); }}>
              <option value="">전체 (그룹 없음)</option>
              {allCols.filter((c) => c !== levelCol && c !== valueCol).map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {filterCol && (
              <Select value={filterVal} onChange={(e) => setFilterVal(e.target.value)}>
                <option value="">미리보기 없음</option>
                {uniqueGroups.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            )}
          </div>
          <div className="text-[10px] text-[#3a3a42]">
            {filterCol
              ? `${uniqueGroups.length}개 그룹 감지 · 미리보기: ${filterVal ? `${previewPoints.length}행` : "그룹 선택 후 표시"}`
              : `전체 ${previewPoints.length}행`}
          </div>
        </div>

        {/* ── 피팅 결과 미리보기 ── */}
        {fit && (
          <>
            <div className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">
                  피팅 결과{filterVal ? ` — ${filterVal}` : ""}
                </div>
                <span className={`text-[10px] px-2 py-0.5 border rounded-full ${badge!.cls}`}>{badge!.label}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div><div className="text-[#4a4a55] text-[10px]">R²</div><div className={`font-mono font-semibold ${badge!.cls.split(" ")[1]}`}>{fit.r2.toFixed(4)}</div></div>
                <div><div className="text-[#4a4a55] text-[10px]">최대 오차</div><div className={`font-mono font-semibold ${errColor(maxErr)}`}>{maxErr.toFixed(1)}%</div></div>
                <div><div className="text-[#4a4a55] text-[10px]">평균 오차</div><div className={`font-mono font-semibold ${errColor(meanErr)}`}>{meanErr.toFixed(1)}%</div></div>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-[#0f0f10] border border-[#2a2a2f] rounded-lg p-3 text-[11px] text-[#c4b5fd] font-mono">{paramsJson}</pre>
              <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 rounded-md bg-[#1e1e24] hover:bg-[#2a2a2f] text-[#6b6b77] hover:text-[#ededed] transition-colors" title="복사">
                {copied ? <Check size={12} className="text-[#4ade80]" /> : <Copy size={12} />}
              </button>
            </div>

            {fit.r2 < 0.95 && (
              <div className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg px-3 py-2 flex gap-2">
                <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                R²={fit.r2.toFixed(3)} — 적합도가 낮습니다. 다른 곡선 타입을 시도해보세요.
              </div>
            )}

            {/* 비교 테이블 */}
            {preview.length > 0 && (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[#4a4a55] border-b border-[#2a2a2f]">
                    <th className="text-left py-1.5 font-medium">레벨</th>
                    <th className="text-right py-1.5 font-medium">원본</th>
                    <th className="text-right py-1.5 font-medium">공식</th>
                    <th className="text-right py-1.5 font-medium">오차</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map(({ level, original, fitted, diffPct }) => (
                    <tr key={level} className="border-b border-[#1e1e24]">
                      <td className="py-1 text-[#6b6b77]">Lv {level}</td>
                      <td className="py-1 text-right text-[#ededed] font-mono">{fmt(original)}</td>
                      <td className="py-1 text-right text-[#a78bfa] font-mono">{fmt(fitted)}</td>
                      <td className={`py-1 text-right font-mono ${errColor(diffPct)}`}>{diffPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ── 일괄 적용 (그룹 컬럼이 있을 때만 표시) ── */}
        {filterCol && uniqueGroups.length > 0 && (
          <div className="border border-[#7c3aed]/30 rounded-lg p-3 space-y-3 bg-[#7c3aed]/5">
            <div className="text-[11px] font-semibold text-[#a78bfa]">
              일괄 적용 — {uniqueGroups.length}개 그룹 전체 피팅 후 저장
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] text-[#4a4a55] mb-1">적용할 테이블</div>
                <Select value={targetTableId} onChange={(e) => setTargetTableId(e.target.value)}>
                  <option value="">선택...</option>
                  {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </div>
              {targetTableId && (
                <div>
                  <div className="text-[10px] text-[#4a4a55] mb-1">매칭 컬럼 (그룹값과 비교)</div>
                  <Select value={matchCol} onChange={(e) => setMatchCol(e.target.value)}>
                    {targetCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </Select>
                </div>
              )}
            </div>

            {missingCols.length > 0 && targetTableId && (
              <div className="text-[10px] text-[#f59e0b] flex gap-2">
                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                <span>대상 테이블에 컬럼 없음: {missingCols.join(", ")} — 저장은 되지만 DataEditor에서 보이지 않을 수 있습니다.</span>
              </div>
            )}

            {bulkStatus === "idle" && (
              <Btn disabled={!bulkReady || bulkStatus !== "idle"} onClick={handleBulkApply}>
                <ChevronRight size={11} />
                {uniqueGroups.length}개 그룹 일괄 적용
              </Btn>
            )}

            {bulkStatus === "running" && (
              <div className="flex items-center gap-2 text-[11px] text-[#6b6b77]">
                <Loader2 size={12} className="animate-spin" /> 피팅 및 저장 중...
              </div>
            )}

            {bulkStatus === "done" && (
              <>
                <div className="text-[10px] text-[#4a4a55] font-semibold">
                  완료: {bulkResults.filter((r) => r.status === "ok").length}/{bulkResults.length} 성공
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {bulkResults.map((r) => (
                    <div key={r.groupVal} className="flex items-center gap-2 text-[11px]">
                      {r.status === "ok"
                        ? <CheckCircle2 size={12} className="text-[#4ade80] flex-shrink-0" />
                        : r.status === "not_found"
                        ? <AlertTriangle size={12} className="text-[#f59e0b] flex-shrink-0" />
                        : <XCircle size={12} className="text-[#f87171] flex-shrink-0" />}
                      <span className="text-[#6b6b77] w-28 truncate">{r.groupVal}</span>
                      {r.status === "ok" && (
                        <span className="text-[#4a4a55] font-mono">
                          R²={r.r2?.toFixed(3)} · base={r.base} · factor={r.factor}
                        </span>
                      )}
                      {r.status !== "ok" && <span className="text-[#4a4a55]">{r.message}</span>}
                      {r.r2 !== undefined && r.r2 < 0.95 && r.status === "ok" && (
                        <span className="text-[#f59e0b] text-[10px]">⚠ R² 낮음</span>
                      )}
                    </div>
                  ))}
                </div>
                <Btn onClick={() => { setBulkStatus("idle"); setBulkResults([]); }}>다시 실행</Btn>
              </>
            )}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Btn onClick={onClose}>닫기</Btn>
        </div>
      </div>
    </Modal>
  );
}
