"use client";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Btn, SectionLabel, Tooltip } from "@/components/ui";
import { LineChart } from "@/components/chart/LineChart";

interface Table { id: string; name: string; }
interface Anomaly { row_id: string; label: string; value: number; z_score: number; severity: "danger" | "warn"; }
interface BalanceResult { column: string; mean: number; stddev: number; min: number; max: number; anomalies: Anomaly[]; }

export function BalancePanel({ projectId, onNavigate }: { projectId: string; onNavigate?: (screen: "editor") => void }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [results, setResults] = useState<BalanceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

  // 크로스 테이블 비교
  const [crossTableA, setCrossTableA] = useState("");
  const [crossColA, setCrossColA] = useState("");
  const [crossTableB, setCrossTableB] = useState("");
  const [crossColB, setCrossColB] = useState("");
  const [crossColsA, setCrossColsA] = useState<string[]>([]);
  const [crossColsB, setCrossColsB] = useState<string[]>([]);
  const [crossSeriesA, setCrossSeriesA] = useState<number[]>([]);
  const [crossSeriesB, setCrossSeriesB] = useState<number[]>([]);

  const loadNumericCols = async (tid: string, setter: (v: string[]) => void) => {
    const d = await fetch(`/api/tables/${tid}`).then((r) => r.json());
    setter((d.columns ?? []).filter((c: { type: string }) => c.type === "number").map((c: { name: string }) => c.name));
  };

  const loadCrossSeries = async (tid: string, col: string, setter: (v: number[]) => void) => {
    if (!tid || !col) { setter([]); return; }
    const rows = await fetch(`/api/rows?table_id=${tid}`).then((r) => r.json());
    setter(rows.map((r: { data: Record<string, unknown> }) => Number(r.data[col])).filter(Number.isFinite));
  };

  useEffect(() => {
    fetch(`/api/tables?project_id=${projectId}`).then((r) => r.json()).then((ts: Table[]) => {
      setTables(ts);
      Promise.all(ts.map((t) => fetch(`/api/rows?table_id=${t.id}`).then((r) => r.json())))
        .then((allRows) => setTotalRows(allRows.reduce((sum, rows) => sum + rows.length, 0)));
    });
  }, [projectId]);

  const runAll = async () => {
    setLoading(true);
    const allResults: BalanceResult[] = [];
    for (const t of tables) {
      const res = await fetch("/api/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: t.id }) });
      const d = await res.json();
      allResults.push(...(d.results ?? []));
    }
    setResults(allResults);
    setLoading(false);
  };

  const dangers = results.flatMap((r) => r.anomalies.filter((a) => a.severity === "danger").map((a) => ({ ...a, column: r.column, mean: r.mean })));
  const warns = results.flatMap((r) => r.anomalies.filter((a) => a.severity === "warn").map((a) => ({ ...a, column: r.column, mean: r.mean })));
  const anomalyCount = results.reduce((a, r) => a + r.anomalies.length, 0);
  const score = anomalyCount === 0 ? 100 : Math.max(0, Math.round(100 - anomalyCount * 5));

  return (
    <div className="flex-1 overflow-auto p-6">
      <SectionLabel>전체 현황</SectionLabel>
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { label: "전체 데이터", val: totalRows, cls: "" },
          { label: "이상값", val: dangers.length, cls: dangers.length > 0 ? "text-[#f87171]" : "" },
          { label: "경고", val: warns.length, cls: warns.length > 0 ? "text-[#f59e0b]" : "" },
          { label: "밸런스 점수", val: score, cls: score >= 80 ? "text-[#4ade80]" : score >= 60 ? "text-[#f59e0b]" : "text-[#f87171]" },
        ].map((m) => (
          <div key={m.label} className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-3.5">
            <div className="text-[10px] font-medium text-[#4a4a55] uppercase tracking-wide mb-1.5">{m.label}</div>
            <div className={`text-[24px] font-semibold text-[#ededed] ${m.cls}`}>{m.val}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <SectionLabel className="mb-0 mt-0">이상값 목록</SectionLabel>
        <Tooltip label={loading ? "분석 중..." : "AI 밸런스 분석"}>
          <Btn variant="primary" onClick={runAll} disabled={loading}><Sparkles size={11} /></Btn>
        </Tooltip>
      </div>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[#2a2a2f] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#ededed]">이상값 목록</span>
          <span className="text-[11px] text-[#4a4a55]">{dangers.length + warns.length}건 감지</span>
        </div>
        {[...dangers.map((a) => ({ ...a, sev: "danger" as const })), ...warns.map((a) => ({ ...a, sev: "warn" as const }))].map((a, i) => (
          <div key={i} className="px-4 py-3 border-b border-[#2a2a2f] last:border-0 flex items-center gap-3">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.sev === "danger" ? "bg-[#ef4444]" : "bg-[#f59e0b]"}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#ededed]">{a.label} — {a.column}</div>
              <div className="text-[11px] text-[#6b6b77]">
                {a.value === 0 ? "누락값 의심 (0)" : `평균(${a.mean.toFixed(0)})의 ${(a.value / a.mean).toFixed(1)}배 ${a.sev === "danger" ? "초과" : "(경계값)"}`}
              </div>
            </div>
            <span className={`text-xs font-semibold ${a.sev === "danger" ? "text-[#f87171]" : "text-[#f59e0b]"}`}>{a.value.toLocaleString()}</span>
            <Btn className="text-[11px] py-0.5 px-2" onClick={() => onNavigate?.("editor")}>{a.sev === "danger" ? "수정" : "검토"}</Btn>
          </div>
        ))}
        {dangers.length + warns.length === 0 && (
          <div className="px-4 py-6 text-[11px] text-[#3a3a42] text-center">이상값이 없습니다 — AI 분석을 실행하세요.</div>
        )}
      </div>

      {results.length > 0 && (
        <>
          <SectionLabel>분포 차트</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {results.slice(0, 4).map((r) => {
              // 이상값 row_id 세트
              const dangerIds = new Set(r.anomalies.filter((a) => a.severity === "danger").map((a) => a.row_id));
              const warnIds = new Set(r.anomalies.filter((a) => a.severity === "warn").map((a) => a.row_id));
              // 모든 이상값 값(value) 목록으로 표시용 포인트 구성
              const points = r.anomalies.map((a) => ({ value: a.value, row_id: a.row_id, severity: a.severity }));
              // 통계 구간 + 이상값 포인트로 바 구성
              const bars = [
                { v: r.min, type: "normal" as const },
                { v: r.mean - r.stddev > 0 ? r.mean - r.stddev : 0, type: "normal" as const },
                { v: r.mean, type: "normal" as const },
                { v: r.mean + r.stddev, type: "normal" as const },
                ...r.anomalies.map((a) => ({ v: a.value, type: a.severity as "danger" | "warn" })),
              ].sort((a, b) => a.v - b.v);
              const maxVal = Math.max(...bars.map((b) => b.v), 1);
              return (
                <div key={r.column} className="bg-[#1a1a1c] border border-[#2a2a2f] rounded-lg p-3.5">
                  <div className="text-xs font-medium mb-2.5 flex items-center justify-between">
                    <span className="text-[#ededed]">{r.column}</span>
                    <span className="text-[11px] text-[#6b6b77] font-normal">μ={r.mean.toFixed(0)} ±{r.stddev.toFixed(0)}</span>
                  </div>
                  <div className="flex items-end gap-1 h-20">
                    {bars.map((b, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-sm min-w-0 ${b.type === "danger" ? "bg-[#ef4444]" : b.type === "warn" ? "bg-[#f59e0b]" : "bg-[#7c3aed]"}`}
                        style={{ height: `${Math.max(8, (b.v / maxVal) * 100)}%` }}
                        title={b.v.toLocaleString()}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {bars.map((b, i) => (
                      <div key={i} className={`flex-1 text-[9px] text-center overflow-hidden text-ellipsis whitespace-nowrap ${b.type === "danger" ? "text-[#f87171]" : b.type === "warn" ? "text-[#f59e0b]" : "text-[#4a4a55]"}`}>
                        {b.v >= 10000 ? (b.v / 1000).toFixed(0) + "k" : b.v.toFixed(0)}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 크로스 테이블 비교 */}
      <SectionLabel>크로스 테이블 비교</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-6">
        <div className="text-xs text-[#6b6b77] mb-3">두 테이블의 숫자 컬럼을 선택해 분포를 비교합니다.</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: "A (보라)", tid: crossTableA, col: crossColA, cols: crossColsA,
              onTid: async (v: string) => { setCrossTableA(v); setCrossColA(""); setCrossSeriesA([]); if (v) await loadNumericCols(v, setCrossColsA); },
              onCol: (v: string) => { setCrossColA(v); loadCrossSeries(crossTableA, v, setCrossSeriesA); },
            },
            { label: "B (초록)", tid: crossTableB, col: crossColB, cols: crossColsB,
              onTid: async (v: string) => { setCrossTableB(v); setCrossColB(""); setCrossSeriesB([]); if (v) await loadNumericCols(v, setCrossColsB); },
              onCol: (v: string) => { setCrossColB(v); loadCrossSeries(crossTableB, v, setCrossSeriesB); },
            },
          ].map(({ label, tid, col, cols, onTid, onCol }) => (
            <div key={label}>
              <div className="text-[10px] text-[#4a4a55] mb-1">{label}</div>
              <div className="space-y-1">
                <select value={tid} onChange={(e) => onTid(e.target.value)} className="w-full bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-[#ededed] outline-none">
                  <option value="">테이블 선택</option>
                  {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={col} onChange={(e) => onCol(e.target.value)} disabled={!tid} className="w-full bg-[#0f0f10] border border-[#2a2a2f] rounded-md px-2 py-1 text-[11px] text-[#ededed] outline-none disabled:opacity-40">
                  <option value="">컬럼 선택</option>
                  {cols.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
        {crossSeriesA.length > 0 || crossSeriesB.length > 0 ? (
          <LineChart
            height={200}
            xLabels={Array.from({ length: Math.max(crossSeriesA.length, crossSeriesB.length) }, (_, i) => String(i + 1))}
            series={[
              ...(crossSeriesA.length > 0 ? [{ name: `${tables.find((t) => t.id === crossTableA)?.name}.${crossColA}`, color: "#7c3aed", values: crossSeriesA }] : []),
              ...(crossSeriesB.length > 0 ? [{ name: `${tables.find((t) => t.id === crossTableB)?.name}.${crossColB}`, color: "#4ade80", values: crossSeriesB }] : []),
            ]}
          />
        ) : (
          <div className="text-[11px] text-[#3a3a42] text-center py-8">두 컬럼을 선택하면 비교 차트가 표시됩니다.</div>
        )}
      </div>
    </div>
  );
}
