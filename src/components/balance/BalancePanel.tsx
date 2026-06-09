"use client";
import { useEffect, useState } from "react";
import { Btn, SectionLabel } from "@/components/ui";

interface Table { id: string; name: string; }
interface Anomaly { row_id: string; value: number; z_score: number; severity: "danger" | "warn"; }
interface BalanceResult { column: string; mean: number; stddev: number; min: number; max: number; anomalies: Anomaly[]; }

export function BalancePanel({ projectId, onNavigate }: { projectId: string; onNavigate?: (screen: "editor") => void }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [results, setResults] = useState<BalanceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);

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
    <div className="flex-1 overflow-auto p-4">
      <SectionLabel>전체 현황</SectionLabel>
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          { label: "전체 데이터", val: totalRows, cls: "" },
          { label: "이상값", val: dangers.length, cls: dangers.length > 0 ? "text-[#A32D2D]" : "" },
          { label: "경고", val: warns.length, cls: warns.length > 0 ? "text-[#854F0B]" : "" },
          { label: "밸런스 점수", val: score, cls: score >= 80 ? "text-[#27500A]" : score >= 60 ? "text-[#854F0B]" : "text-[#A32D2D]" },
        ].map((m) => (
          <div key={m.label} className="bg-[#f8f7f4] rounded-lg p-3">
            <div className="text-[11px] text-[#888] mb-1">{m.label}</div>
            <div className={`text-[22px] font-medium ${m.cls}`}>{m.val}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <SectionLabel className="mb-0 mt-0">이상값 목록</SectionLabel>
        <Btn variant="primary" onClick={runAll} disabled={loading}>{loading ? "분석 중..." : "✦ 전체 AI 분석"}</Btn>
      </div>
      <div className="border border-[#e8e6e0] rounded-lg overflow-hidden mb-4">
        <div className="px-3.5 py-2.5 border-b border-[#e8e6e0] bg-[#f8f7f4] flex items-center justify-between">
          <span className="text-sm font-medium">감지된 이상값 {dangers.length + warns.length}건</span>
        </div>
        {[...dangers.map((a) => ({ ...a, sev: "danger" as const })), ...warns.map((a) => ({ ...a, sev: "warn" as const }))].map((a, i) => (
          <div key={i} className="px-3.5 py-2.5 border-b border-[#f0ede8] last:border-0 flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.sev === "danger" ? "bg-[#E24B4A]" : "bg-[#EF9F27]"}`} />
            <div className="flex-1">
              <div className="text-xs font-medium">{a.column}</div>
              <div className="text-[11px] text-[#888]">평균({a.mean.toFixed(0)})의 {(a.value / a.mean).toFixed(1)}배</div>
            </div>
            <span className={`text-xs font-medium ${a.sev === "danger" ? "text-[#A32D2D]" : "text-[#854F0B]"}`}>{a.value}</span>
            <Btn className="text-[11px] py-0.5 px-2" onClick={() => onNavigate?.("editor")}>수정</Btn>
          </div>
        ))}
        {dangers.length + warns.length === 0 && (
          <div className="px-3.5 py-4 text-[11px] text-[#aaa] text-center">이상값이 없습니다. AI 분석을 실행하세요.</div>
        )}
      </div>

      {results.length > 0 && (
        <>
          <SectionLabel>등급별 분포</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            {results.slice(0, 4).map((r) => {
              const all = [...r.anomalies.map((a) => a.value)];
              const maxVal = Math.max(r.max, 1);
              return (
                <div key={r.column} className="bg-white border border-[#e0ded8] rounded-lg p-3.5">
                  <div className="text-xs font-medium mb-2.5 flex items-center justify-between">
                    <span>{r.column}</span>
                    <span className="text-[11px] text-[#aaa] font-normal">이상값 강조</span>
                  </div>
                  <div className="flex items-end gap-1.5 h-20">
                    {[r.min, r.mean - r.stddev, r.mean, r.mean + r.stddev, r.max].filter((v, i, a) => a.indexOf(v) === i).map((v, i) => {
                      const isAnomaly = r.anomalies.some((a) => Math.abs(a.value - v) < 1);
                      const isWarn = r.anomalies.some((a) => a.severity === "warn" && Math.abs(a.value - v) < r.stddev);
                      return (
                        <div
                          key={i}
                          className={`flex-1 rounded-t-sm min-w-0 ${isAnomaly ? "bg-[#f09595]" : isWarn ? "bg-[#fac775]" : "bg-[#85b7eb]"}`}
                          style={{ height: `${Math.max(10, (v / maxVal) * 100)}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {["min", "μ-σ", "μ", "μ+σ", "max"].map((l, i) => (
                      <div key={i} className="flex-1 text-[9px] text-[#888] text-center overflow-hidden text-ellipsis whitespace-nowrap">{l}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
