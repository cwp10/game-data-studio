"use client";
import { useEffect, useState } from "react";
import { Sparkles, Bot } from "lucide-react";
import { Btn, SectionLabel, Tooltip, Input, Select } from "@/components/ui";
import { LineChart } from "@/components/chart/LineChart";
import { RadarChart } from "@/components/chart/RadarChart";
import { pearson, type WinMatrix } from "@/lib/balance/correlate";
import { buildBalanceReportPrompt } from "@/lib/balance/promptBuilder";

const CHART_PALETTE = ["#7c3aed", "#4ade80", "#f59e0b", "#f87171", "#38bdf8", "#c4b5fd"];

interface Table { id: string; name: string; }
interface Column { id: string; name: string; type: "string" | "number" | "boolean" | "enum"; }
interface RowData { id: string; data: Record<string, unknown>; }
interface Anomaly { row_id: string; label: string; value: number; z_score: number; severity: "danger" | "warn"; }
interface BalanceResult { column: string; mean: number; stddev: number; min: number; max: number; anomalies: Anomaly[]; }
interface Unit { name: string; hp: number; atk: number; def: number; speed: number; critRate?: number; critMult?: number; }

// 컬럼명에서 스탯 후보 추정(SimulationView 미러 — surgical, export 유발 안 함).
function guessCol(cols: Column[], keys: string[]): string {
  const nums = cols.filter((c) => c.type === "number");
  for (const k of keys) { const e = nums.find((c) => c.name.toLowerCase() === k); if (e) return e.name; }
  for (const k of keys) { const p = nums.find((c) => c.name.toLowerCase().includes(k)); if (p) return p.name; }
  return "";
}
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

const RADAR_AXES = [
  { label: "HP" }, { label: "ATK" }, { label: "DEF" }, { label: "속도" }, { label: "치명" },
];
// 유닛 → 레이더 5축 값(crit 은 0~1 → 그대로, 축별 정규화가 처리).
const radarValues = (u: Unit) => [u.hp, u.atk, u.def, u.speed, u.critRate ?? 0];

export function BalancePanel({ projectId, onNavigate }: { projectId: string; onNavigate?: (screen: "editor") => void }) {
  const [tables, setTables] = useState<Table[]>([]);
  const [results, setResults] = useState<BalanceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // 크로스 테이블 비교
  const [crossTableA, setCrossTableA] = useState("");
  const [crossColA, setCrossColA] = useState("");
  const [crossTableB, setCrossTableB] = useState("");
  const [crossColB, setCrossColB] = useState("");
  const [crossColsA, setCrossColsA] = useState<string[]>([]);
  const [crossColsB, setCrossColsB] = useState<string[]>([]);
  const [crossSeriesA, setCrossSeriesA] = useState<number[]>([]);
  const [crossSeriesB, setCrossSeriesB] = useState<number[]>([]);

  // 승률 매트릭스 / 레이더 — 단일 유닛 셋(테이블 행 선택)을 둘 다 소비
  const [unitTable, setUnitTable] = useState("");
  const [unitRows, setUnitRows] = useState<RowData[]>([]);
  const [unitCols, setUnitCols] = useState<Column[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [mxIterations, setMxIterations] = useState(500);
  const [mxSeed, setMxSeed] = useState(0);
  const [winMatrix, setWinMatrix] = useState<WinMatrix | null>(null);
  const [matrixUnits, setMatrixUnits] = useState<Unit[]>([]);
  const [mxLoading, setMxLoading] = useState(false);
  const [mxError, setMxError] = useState<string | null>(null);

  // 선택 테이블의 행 + 컬럼 로드, 선택 초기화
  const loadUnitTable = async (tid: string) => {
    setUnitTable(tid); setSelectedRowIds([]); setWinMatrix(null); setMatrixUnits([]); setMxError(null);
    if (!tid) { setUnitRows([]); setUnitCols([]); return; }
    const [rows, meta] = await Promise.all([
      fetch(`/api/rows?table_id=${tid}`).then((r) => r.json()),
      fetch(`/api/tables/${tid}`).then((r) => r.json()),
    ]);
    setUnitRows(rows); setUnitCols(meta.columns ?? []);
  };

  // 선택 행 → Unit[] (스탯 컬럼 추정)
  const buildUnits = (): Unit[] => {
    const hpC = guessCol(unitCols, ["hp", "health", "life"]);
    const atkC = guessCol(unitCols, ["atk", "attack", "power"]);
    const defC = guessCol(unitCols, ["def", "defense", "armor"]);
    const spdC = guessCol(unitCols, ["spd", "speed"]);
    const critC = guessCol(unitCols, ["crit_rate", "critrate", "crit"]);
    const nameC = unitCols.find((c) => c.type === "string")?.name;
    return selectedRowIds.map((rid, i) => {
      const row = unitRows.find((r) => r.id === rid);
      const d = row?.data ?? {};
      const rawCrit = num(d[critC]);
      return {
        name: (nameC ? String(d[nameC] ?? "") : "") || `유닛${i + 1}`,
        hp: num(d[hpC]) || 1000, atk: num(d[atkC]) || 100, def: num(d[defC]) || 50,
        speed: num(d[spdC]) || 100,
        critRate: rawCrit > 1 ? rawCrit / 100 : rawCrit, // 0~100 입력도 0~1 로
        critMult: 1.5,
      };
    });
  };

  const runMatrix = async () => {
    const units = buildUnits();
    if (units.length < 2) { setMxError("유닛을 2개 이상 선택하세요."); return; }
    setMxLoading(true); setMxError(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "winmatrix", units, iterations: mxIterations, seed: mxSeed, maxUnits: 10 }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? "승률 매트릭스 계산 실패");
      setWinMatrix(d as WinMatrix);
      setMatrixUnits(units.slice(0, (d as WinMatrix).labels.length));
    } catch (err) {
      console.error("winmatrix fetch failed:", err);
      setMxError(err instanceof Error ? err.message : "승률 매트릭스 계산 실패");
      setWinMatrix(null); setMatrixUnits([]);
    } finally {
      setMxLoading(false);
    }
  };

  const toggleRow = (rid: string) =>
    setSelectedRowIds((prev) => prev.includes(rid) ? prev.filter((x) => x !== rid) : [...prev, rid]);

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

  // analyze 결과 → 프롬프트 → /api/chat(SSE 스트림) 으로 서술형 밸런싱 리포트 생성.
  // 주의: POST /api/chat 는 프롬프트/응답을 프로젝트 챗 transcript 에 영속한다(addMessage).
  const runAiReport = async () => {
    setAiLoading(true);
    setAiReport(null);
    try {
      // 분석 결과가 비어있으면 먼저 전체 테이블 분석
      let analysisResults = results;
      if (analysisResults.length === 0) {
        const allResults: BalanceResult[] = [];
        for (const t of tables) {
          const res = await fetch("/api/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table_id: t.id }) });
          const d = await res.json();
          allResults.push(...(d.results ?? []));
        }
        setResults(allResults);
        analysisResults = allResults;
      }

      // 프로젝트 정보 조회 (장르 맥락)
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const project = await projectRes.json();

      const prompt = buildBalanceReportPrompt({
        projectName: project.name ?? projectId,
        genre: project.genre ?? null,
        tables: tables.map((t) => ({ name: t.name })),
        analyzeResults: analysisResults,
      });

      // /api/chat 는 SSE 스트림 → assistant text 블록을 누적 (ChatPanel 패턴 미러)
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId, message: prompt }),
      });
      if (!chatRes.body) throw new Error("스트림을 받을 수 없습니다.");

      const reader = chatRes.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const lines = part.split("\n");
          const evLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          if (evLine?.includes("stderr")) continue;
          if (evLine?.includes("error")) { setAiReport((prev) => (prev ?? "") + "\n[실행 중 오류가 발생했습니다]"); continue; }
          const data = dataLine.slice(5).trim();
          if (data === "[DONE]") continue;
          let o: { type?: string; message?: { content?: { type: string; text?: string }[] } };
          try { o = JSON.parse(data); } catch { continue; }
          if (o.type === "assistant") {
            for (const b of o.message?.content ?? []) {
              if (b.type === "text" && b.text?.trim()) { acc += (acc ? "\n\n" : "") + b.text; setAiReport(acc); }
            }
          }
        }
      }
      if (!acc) setAiReport("리포트 응답이 비어 있습니다.");
    } catch (e) {
      console.error("AI 리포트 생성 실패:", e);
      setAiReport("리포트 생성 실패: " + String(e));
    } finally {
      setAiLoading(false);
    }
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
        <div className="flex items-center gap-1.5">
          <Tooltip label={loading ? "분석 중..." : "AI 밸런스 분석"}>
            <Btn variant="primary" onClick={runAll} disabled={loading}><Sparkles size={11} /></Btn>
          </Tooltip>
          <Btn variant="primary" onClick={runAiReport} disabled={aiLoading}>
            <Bot size={11} />{aiLoading ? "생성 중..." : "AI 리포트"}
          </Btn>
        </div>
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

      {aiReport && (
        <>
          <SectionLabel>AI 밸런싱 리포트</SectionLabel>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-[#6b6b77]">Claude AI 분석{aiLoading ? " · 생성 중..." : ""}</span>
              <Btn className="text-[10px] py-0.5 px-2" onClick={() => setAiReport(null)}>닫기</Btn>
            </div>
            <pre className="text-[12px] text-[#c4b5fd] whitespace-pre-wrap leading-relaxed font-sans">
              {aiReport}
            </pre>
          </div>
        </>
      )}

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
          <>
            <LineChart
              height={200}
              xLabels={Array.from({ length: Math.max(crossSeriesA.length, crossSeriesB.length) }, (_, i) => String(i + 1))}
              series={[
                ...(crossSeriesA.length > 0 ? [{ name: `${tables.find((t) => t.id === crossTableA)?.name}.${crossColA}`, color: "#7c3aed", values: crossSeriesA }] : []),
                ...(crossSeriesB.length > 0 ? [{ name: `${tables.find((t) => t.id === crossTableB)?.name}.${crossColB}`, color: "#4ade80", values: crossSeriesB }] : []),
              ]}
            />
            {crossSeriesA.length > 0 && crossSeriesB.length > 0 && (() => {
              const r = pearson(crossSeriesA, crossSeriesB);
              const absR = Math.abs(r);
              const strength = absR >= 0.7 ? "강한" : absR >= 0.4 ? "중간" : absR >= 0.1 ? "약한" : "거의 없는";
              const dir = r > 0 ? "양" : r < 0 ? "음" : "무";
              const cls = absR >= 0.7 ? "text-[#4ade80]" : absR >= 0.4 ? "text-[#f59e0b]" : "text-[#6b6b77]";
              return (
                <div className="mt-3 flex items-center gap-2 text-[12px]">
                  <span className="text-[#6b6b77]">피어슨 상관계수</span>
                  <span className={`font-semibold ${cls}`}>r = {r.toFixed(2)}</span>
                  <span className="text-[#6b6b77]">({strength} {dir}의 상관 · 행 순서 기준)</span>
                </div>
              );
            })()}
          </>
        ) : (
          <div className="text-[11px] text-[#3a3a42] text-center py-8">두 컬럼을 선택하면 비교 차트가 표시됩니다.</div>
        )}
      </div>

      {/* 승률 매트릭스 + 능력치 레이더 */}
      <SectionLabel>승률 매트릭스 · 능력치 비교</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-6">
        <div className="text-xs text-[#6b6b77] mb-3">유닛 테이블에서 행을 2개 이상 선택해 1:1 전투 승률 매트릭스와 능력치 레이더를 비교합니다.</div>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div>
            <div className="text-[10px] text-[#4a4a55] mb-1">유닛 테이블</div>
            <Select value={unitTable} onChange={(e) => loadUnitTable(e.target.value)}>
              <option value="">테이블 선택</option>
              {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <div className="text-[10px] text-[#4a4a55] mb-1">반복(1~5000)</div>
            <Input type="number" min={1} max={5000} value={mxIterations} onChange={(e) => setMxIterations(Math.max(1, Math.min(5000, Number(e.target.value) || 1)))} />
          </div>
          <div>
            <div className="text-[10px] text-[#4a4a55] mb-1">시드</div>
            <Input type="number" value={mxSeed} onChange={(e) => setMxSeed(Number(e.target.value) || 0)} />
          </div>
          <Btn variant="primary" onClick={runMatrix} disabled={mxLoading || selectedRowIds.length < 2}>
            {mxLoading ? "계산 중..." : "매트릭스 실행"}
          </Btn>
        </div>

        {unitTable && (
          <div className="border border-[#2a2a2f] rounded-md max-h-44 overflow-auto mb-3">
            {unitRows.length === 0 && <div className="text-[11px] text-[#3a3a42] text-center py-4">행이 없습니다.</div>}
            {unitRows.map((row) => {
              const nameC = unitCols.find((c) => c.type === "string")?.name;
              const label = (nameC ? String(row.data[nameC] ?? "") : "") || row.id;
              const checked = selectedRowIds.includes(row.id);
              return (
                <label key={row.id} className={`flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-pointer border-b border-[#1f1f24] last:border-0 ${checked ? "bg-[#1d1d22] text-[#ededed]" : "text-[#9a9aa3] hover:bg-[#1a1a1e]"}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleRow(row.id)} className="accent-[#7c3aed]" />
                  {label}
                </label>
              );
            })}
          </div>
        )}
        {selectedRowIds.length > 0 && <div className="text-[11px] text-[#6b6b77] mb-3">{selectedRowIds.length}개 유닛 선택됨 {selectedRowIds.length > 10 && "(상위 10개만 사용)"}</div>}
        {mxError && <div className="text-xs text-[#f87171] mb-3">{mxError}</div>}

        {winMatrix && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* N×N 승률 매트릭스 — 행=선공(attacker) */}
            <div>
              <div className="text-[11px] text-[#9a9aa3] mb-2">
                승률 매트릭스 — <span className="text-[#ededed] font-medium">행 = 선공(attacker)</span>, 열 = 후공. 셀 = 행 유닛 승률.
                {winMatrix.truncated && <span className="text-[#f59e0b]"> (상위 {winMatrix.labels.length}개만 표시)</span>}
              </div>
              <div className="overflow-auto">
                <table className="border-collapse text-[10px]">
                  <thead>
                    <tr>
                      <th className="p-1 text-[#4a4a55] font-normal text-left">선공＼후공</th>
                      {winMatrix.labels.map((l) => (
                        <th key={l} className="p-1 text-[#9a9aa3] font-normal max-w-[60px] truncate" title={l}>{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {winMatrix.matrix.map((rowVals, i) => (
                      <tr key={i}>
                        <td className="p-1 text-[#9a9aa3] max-w-[70px] truncate text-left" title={winMatrix.labels[i]}>{winMatrix.labels[i]}</td>
                        {rowVals.map((v, j) => (
                          <td
                            key={j}
                            className="p-1 text-center font-medium tabular-nums"
                            // 0(약·빨강) ~ 1(강·초록). 비대칭 그대로 — 대칭 보정 없음.
                            style={{ background: `rgba(${Math.round(255 * (1 - v))}, ${Math.round(200 * v)}, 70, ${0.18 + v * 0.5})`, color: "#ededed" }}
                            title={`선공 ${winMatrix.labels[i]} vs ${winMatrix.labels[j]}: 승률 ${(v * 100).toFixed(0)}%`}
                          >
                            {(v * 100).toFixed(0)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* 능력치 레이더 */}
            <div className="flex flex-col items-center">
              <div className="text-[11px] text-[#9a9aa3] mb-2 self-start">능력치 레이더 (축별 정규화 — HP/속도가 지배하지 않음)</div>
              <RadarChart
                axes={RADAR_AXES}
                series={matrixUnits.map((u, i) => ({ name: u.name, color: CHART_PALETTE[i % CHART_PALETTE.length], values: radarValues(u) }))}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
