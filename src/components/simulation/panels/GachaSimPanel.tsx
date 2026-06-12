"use client";
import { useEffect, useState } from "react";
import { Dice5 } from "lucide-react";
import { Btn, SectionLabel, Input, Select } from "@/components/ui";
import { Histogram } from "@/components/chart/Histogram";
import { CHART_PALETTE, Column, GachaResult, RowWithData, Table, guessCol, num } from "./types";

// ════════════════════════════════════════════════════════════════════
// P2-4 가챠 시뮬 (gacha API)
// baseRate/pityStart/pityCap 직접 입력(또는 gacha 테이블 행에서 불러오기) → /api/simulation {action:"gacha"}
// 표시: avgPulls·maxPulls·pityHitRate + distribution(pulls별 count) 단일 막대.
// (distribution은 이미 집계됨 — 공유빈 로직은 DPS용이라 가챠는 pre-binned 단일 시리즈로 직접 막대)
// ════════════════════════════════════════════════════════════════════
export function GachaSimPanel({ tables }: { tables: Table[] }) {
  const [baseRate, setBaseRate] = useState(0.02);
  const [pityStart, setPityStart] = useState(70);
  const [pityCap, setPityCap] = useState(90);
  const [iterations, setIterations] = useState(10000);
  const [seed, setSeed] = useState(0);
  const [tableId, setTableId] = useState("");
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [cols, setCols] = useState<Column[]>([]);
  const [result, setResult] = useState<GachaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tableId) { setRows([]); setCols([]); return; }
    fetch(`/api/tables/${tableId}`).then((r) => r.json()).then((d) => setCols(d.columns ?? []));
    fetch(`/api/rows?table_id=${tableId}`).then((r) => r.json()).then((d: RowWithData[]) => setRows(Array.isArray(d) ? d : []));
  }, [tableId]);

  // gacha 테이블 행에서 base_rate / pity_start / pity_cap 추정해 프리필
  const prefill = (rid: string) => {
    const row = rows.find((r) => r.id === rid);
    if (!row) return;
    const br = num(row.data[guessCol(cols, ["base_rate", "baserate", "rate"])]);
    if (br > 0) setBaseRate(br > 1 ? br / 100 : br); // 퍼센트 입력(2 → 0.02) 허용
    const ps = num(row.data[guessCol(cols, ["pity_start", "pitystart", "soft_pity"])]);
    if (ps > 0) setPityStart(ps);
    const pc = num(row.data[guessCol(cols, ["pity_cap", "pitycap", "hard_pity", "ceiling"])]);
    if (pc > 0) setPityCap(pc);
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "gacha", baseRate, pityStart, pityCap, iterations, seed }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? `HTTP ${res.status}`);
      setResult(d as GachaResult);
    } catch (e) {
      console.error("[gacha]", e);
      setError(e instanceof Error ? e.message : "가챠 시뮬 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // distribution(이미 집계, pulls별 count)을 단일 시리즈 Histogram에 pre-binned 값으로 전개.
  // count만큼 pulls 값을 반복해 values 배열로 펼치면 Histogram이 빈으로 묶어준다.
  const distSeries = result && result.distribution.length > 0
    ? [{ name: "획득까지 뽑기 수", color: CHART_PALETTE[0], values: result.distribution.flatMap((d) => Array<number>(d.count).fill(d.pulls)) }]
    : null;

  return (
    <>
      <SectionLabel><Dice5 size={11} className="inline mr-1 -mt-0.5" />가챠 확률 (소프트 천장)</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">gacha 테이블에서 불러오기…</option>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select value="" onChange={(e) => prefill(e.target.value)} disabled={!tableId}>
            <option value="">— 행 선택 —</option>
            {rows.map((r) => <option key={r.id} value={r.id}>{String(r.data.name ?? r.data.id ?? r.id)}</option>)}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">기본 확률 (0~1)</div>
            <Input type="number" step={0.001} min={0} max={1} value={baseRate} onChange={(e) => setBaseRate(Math.max(0, Math.min(1, Number(e.target.value) || 0)))} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">소프트 천장 시작</div>
            <Input type="number" min={0} value={pityStart} onChange={(e) => setPityStart(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">하드 천장 (보장)</div>
            <Input type="number" min={1} value={pityCap} onChange={(e) => setPityCap(Math.max(1, Number(e.target.value) || 1))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">반복 횟수</div>
            <Input type="number" min={1} max={1000000} value={iterations} onChange={(e) => setIterations(Math.max(1, Math.min(1000000, Number(e.target.value) || 1)))} />
            <div className="flex gap-1.5 mt-2">
              {[10000, 100000, 1000000].map((n) => (
                <button key={n} onClick={() => setIterations(n)} className={`text-[11px] px-2.5 py-1 rounded-md border ${iterations === n ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#16161a] border-[#3a3a42] text-[#9a9aa3]"}`}>{n >= 1000 ? `${n / 1000}k` : n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">시드</div>
            <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
          </div>
        </div>
        <Btn variant="primary" onClick={run} disabled={loading}><Dice5 size={11} />{loading ? "시뮬 중..." : "가챠 시뮬 실행"}</Btn>
      </div>

      {error && <div className="bg-[#2d0a0a] border border-[#f87171]/20 rounded-xl px-4 py-3 text-[11px] text-[#f87171] mb-4">⚠ {error}</div>}

      {result && (
        <>
          <SectionLabel>결과 ({result.iterations.toLocaleString()}회)</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {([
              ["평균 뽑기 수", result.avgPulls.toFixed(1)],
              ["최대 뽑기 수", `${result.maxPulls} / ${pityCap}`],
              ["천장 적중률", `${(result.pityHitRate * 100).toFixed(1)}%`],
            ] as const).map(([label, val]) => (
              <div key={label} className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-3">
                <div className="text-[11px] text-[#6b6b77] mb-1">{label}</div>
                <div className="text-[22px] font-medium text-[#ededed] leading-tight">{val}</div>
              </div>
            ))}
          </div>
          {distSeries && (
            <>
              <SectionLabel>획득까지 뽑기 수 분포</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <Histogram series={distSeries} binCount={Math.min(40, pityCap)} xLabel="뽑기 수" yLabel="횟수" />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
