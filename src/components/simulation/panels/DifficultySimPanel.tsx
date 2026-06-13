"use client";
import { useEffect, useMemo, useState } from "react";
import { Mountain } from "lucide-react";
import { Btn, SectionLabel, Input, Select } from "@/components/ui";
import { LineChart } from "@/components/chart/LineChart";
import { CHART_PALETTE, Column, EMPTY_UNIT, RowWithData, StageDifficulty, StageInput, Table, Unit, guessCol, num } from "./types";
import { UnitForm } from "./UnitForm";

// ════════════════════════════════════════════════════════════════════
// P2-8 난이도 곡선 (difficulty API)
// 플레이어 1유닛 + stages 테이블 행 → StageInput[] → /api/simulation {action:"difficulty"}
// 각 행: label=stage/chapter/name 컬럼(문자 추정+id 폴백), enemy=hp/atk 컬럼(guessCol+오버라이드).
//        def/speed는 stages에 보통 없으므로 기본값 def=0·speed=100.
// 표시: 스테이지별 표(난이도=powerRatio / 승률 / 평균 턴 / 플레이타임 mm:ss) + LineChart 2개(powerRatio·playtime 추이).
// ════════════════════════════════════════════════════════════════════

// label 후보(문자 컬럼) 추정 — guessCol은 number 전용이라 별도 필요
function guessLabelCol(cols: Column[], keys: string[]): string {
  const strs = cols.filter((c) => c.type === "string");
  for (const k of keys) {
    const exact = strs.find((c) => c.name.toLowerCase() === k);
    if (exact) return exact.name;
  }
  for (const k of keys) {
    const part = strs.find((c) => c.name.toLowerCase().includes(k));
    if (part) return part.name;
  }
  return "";
}

function fmtPlaytime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function DifficultySimPanel({ tables }: { tables: Table[] }) {
  const [player, setPlayer] = useState<Unit>({ ...EMPTY_UNIT, name: "플레이어" });
  const [tableId, setTableId] = useState("");
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [cols, setCols] = useState<Column[]>([]);
  const [labelCol, setLabelCol] = useState("");
  const [hpCol, setHpCol] = useState("");
  const [atkCol, setAtkCol] = useState("");
  const [defCol, setDefCol] = useState("");
  const [spdCol, setSpdCol] = useState("");
  const [secondsPerTurn, setSecondsPerTurn] = useState(1);
  const [iterations, setIterations] = useState(500);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<StageDifficulty[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // stages 테이블 선택 → 컬럼/행 로드 + label/hp/atk/def 컬럼 추정
  useEffect(() => {
    if (!tableId) { setRows([]); setCols([]); setLabelCol(""); setHpCol(""); setAtkCol(""); setDefCol(""); setSpdCol(""); return; }
    fetch(`/api/tables/${tableId}`).then((r) => r.json()).then((d) => {
      const c: Column[] = d.columns ?? [];
      setCols(c);
      setLabelCol(guessLabelCol(c, ["stage", "chapter", "name", "label", "title"]));
      setHpCol(guessCol(c, ["enemy_hp", "boss_hp", "hp", "health"]));
      setAtkCol(guessCol(c, ["enemy_atk", "boss_atk", "atk", "attack", "power"]));
      setDefCol(guessCol(c, ["enemy_def", "boss_def", "def", "defense", "armor"]));
      setSpdCol(guessCol(c, ["enemy_spd", "boss_spd", "spd", "speed"]));
    });
    fetch(`/api/rows?table_id=${tableId}`).then((r) => r.json()).then((d: RowWithData[]) => setRows(Array.isArray(d) ? d : []));
  }, [tableId]);

  // 각 행 → StageInput. 핵심 4 컬럼 외 number 컬럼은 extra로 자동 수집
  const stages: StageInput[] = useMemo(() => {
    const coreSet = new Set([hpCol, atkCol, defCol, spdCol].filter(Boolean));
    const extraNumCols = cols.filter((c) => c.type === "number" && !coreSet.has(c.name)).map((c) => c.name);
    return rows.map((r, i) => {
      const extra: Record<string, number> = {};
      for (const col of extraNumCols) extra[col] = num(r.data[col]);
      return {
        label: String((labelCol ? r.data[labelCol] : null) ?? r.data.name ?? r.data.id ?? `스테이지 ${i + 1}`),
        enemy: {
          name: String((labelCol ? r.data[labelCol] : null) ?? r.data.name ?? "적"),
          hp: num(r.data[hpCol]),
          atk: num(r.data[atkCol]),
          def: defCol ? num(r.data[defCol]) : 0,
          speed: spdCol ? (num(r.data[spdCol]) || 100) : 100,
          ...(extraNumCols.length > 0 ? { extra } : {}),
        },
      };
    });
  }, [rows, cols, labelCol, hpCol, atkCol, defCol, spdCol]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "difficulty", player, stages, secondsPerTurn, iterations, seed }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? `HTTP ${res.status}`);
      setResult(d as StageDifficulty[]);
    } catch (e) {
      console.error("[difficulty]", e);
      setError(e instanceof Error ? e.message : "난이도 시뮬 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 추이 차트: powerRatio·playtime은 스케일이 달라(LineChart는 단일 y축) 2개 차트로 분리
  const xLabels = result?.map((s) => s.label);
  const powerSeries = result ? [{ name: "전투력 비 (적/플레이어)", color: CHART_PALETTE[3], values: result.map((s) => s.powerRatio) }] : null;
  const timeSeries = result ? [{ name: "예상 플레이타임 (초)", color: CHART_PALETTE[4], values: result.map((s) => s.playtimeSec) }] : null;

  return (
    <>
      <SectionLabel><Mountain size={11} className="inline mr-1 -mt-0.5" />플레이어 유닛</SectionLabel>
      <div className="mb-4">
        <UnitForm title="플레이어" unit={player} onChange={setPlayer} tables={tables} />
      </div>

      <SectionLabel>스테이지 소스 (적 1유닛 / 행)</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4 space-y-3">
        <div>
          <div className="text-[11px] text-[#6b6b77] mb-1.5">stages 테이블</div>
          <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">— 선택 —</option>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
        {cols.length > 0 && (
          <div className="grid grid-cols-5 gap-3">
            <div>
              <div className="text-[11px] text-[#6b6b77] mb-1.5">라벨 컬럼</div>
              <Select value={labelCol} onChange={(e) => setLabelCol(e.target.value)}>
                <option value="">id 사용</option>
                {cols.filter((c) => c.type === "string").map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </Select>
            </div>
            {([
              ["적 HP", hpCol, setHpCol, ""],
              ["적 ATK", atkCol, setAtkCol, ""],
              ["적 DEF", defCol, setDefCol, " (없으면 0)"],
              ["적 속도", spdCol, setSpdCol, " (없으면 100)"],
            ] as const).map(([label, val, setter, hint]) => (
              <div key={label}>
                <div className="text-[11px] text-[#6b6b77] mb-1.5">{label}{hint && <span className="text-[#4a4a55]">{hint}</span>}</div>
                <Select value={val} onChange={(e) => setter(e.target.value)}>
                  <option value="">—</option>
                  {cols.filter((c) => c.type === "number").map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
              </div>
            ))}
          </div>
        )}
        {tableId && <div className="text-[11px] text-[#6b6b77]">{rows.length}개 스테이지 · 적 속도는 기본 100 적용</div>}
      </div>

      <SectionLabel>실행 조건</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">1턴 = N초</div>
            <Input type="number" step={0.1} min={0} value={secondsPerTurn} onChange={(e) => setSecondsPerTurn(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">반복 횟수 (상한 20k)</div>
            <Input type="number" min={1} max={20000} value={iterations} onChange={(e) => setIterations(Math.max(1, Math.min(20000, Number(e.target.value) || 1)))} />
            <div className="flex gap-1.5 mt-2">
              {[200, 500, 1000].map((n) => (
                <button key={n} onClick={() => setIterations(n)} className={`text-[11px] px-2.5 py-1 rounded-md border ${iterations === n ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#16161a] border-[#3a3a42] text-[#9a9aa3]"}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">시드</div>
            <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
          </div>
        </div>
        <Btn variant="primary" onClick={run} disabled={loading || stages.length === 0}><Mountain size={11} />{loading ? "시뮬 중..." : "난이도 곡선 실행"}</Btn>
      </div>

      {error && <div className="bg-[#2d0a0a] border border-[#f87171]/20 rounded-xl px-4 py-3 text-[11px] text-[#f87171] mb-4">⚠ {error}</div>}

      {result && result.length > 0 && (
        <>
          <SectionLabel>스테이지별 난이도 ({iterations.toLocaleString()}회 / 스테이지)</SectionLabel>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl overflow-hidden mb-4">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  {["스테이지", "난이도 (전투력 비)", "승률", "평균 턴", "예상 플레이타임"].map((h) => (
                    <th key={h} className="px-2.5 py-1.5 text-left font-medium text-[#6b6b77] border-b border-[#2a2a2f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.map((s, i) => (
                  <tr key={i} className="hover:bg-[#1a1a1c]">
                    <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#ededed] font-medium">{s.label}</td>
                    <td className={`px-2.5 py-1.5 border-b border-[#1f1f24] font-medium ${s.powerRatio > 1.2 ? "text-[#f87171]" : s.powerRatio > 0.9 ? "text-[#f59e0b]" : "text-[#4ade80]"}`}>×{s.powerRatio.toFixed(2)}</td>
                    <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#9a9aa3]">{(s.winRate * 100).toFixed(1)}%</td>
                    <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#9a9aa3]">{s.avgTurns.toFixed(1)}</td>
                    <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#ededed]">{fmtPlaytime(s.playtimeSec)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.length >= 2 && powerSeries && timeSeries && (
            <>
              <SectionLabel>전투력 비 추이</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <LineChart series={powerSeries} xLabels={xLabels} />
              </div>
              <SectionLabel>예상 플레이타임 추이 (초)</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <LineChart series={timeSeries} xLabels={xLabels} />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
