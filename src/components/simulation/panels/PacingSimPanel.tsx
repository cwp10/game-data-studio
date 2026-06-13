"use client";
import { useEffect, useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { Btn, SectionLabel, Input, Select } from "@/components/ui";
import { LineChart } from "@/components/chart/LineChart";
import { CHART_PALETTE, Column, RowWithData, Table, guessCol, num } from "./types";

const CURVE_TYPES = ["linear", "power", "exponential"] as const;
type CurveType = typeof CURVE_TYPES[number];

// ════════════════════════════════════════════════════════════════════
// F-1 진척도 페이싱 시뮬레이터 (pacing API)
// 플레이어 곡선 + 스테이지 목록 → /api/simulation {action:"pacing"} → PacingResult
// 스테이지: stages 테이블 자동 감지(label/hp/atk 컬럼 매핑) 또는 수동 입력(최대 10개).
// 표시: 요약 칩 + LineChart 2개(레벨·골드 추이) + 타임라인 표(최대 30일).
// ════════════════════════════════════════════════════════════════════

// PacingResult 계약 (F1_contract.md — 글자 그대로 로컬 선언, import 없이)
interface DayResult { day: number; level: number; stageCleared: number; gold: number; exp: number; winRate: number; }
interface PacingResult { days: DayResult[]; totalStagesCleared: number; finalLevel: number; finalGold: number; }

interface ManualStage { label: string; hp: number; atk: number; }

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

const DEFAULT_STAGES: ManualStage[] = [
  { label: "1-1", hp: 500, atk: 30 },
  { label: "1-2", hp: 1000, atk: 50 },
  { label: "1-3", hp: 2000, atk: 80 },
];

export function PacingSimPanel({ tables }: { tables: Table[] }) {
  // 시뮬 파라미터
  const [days, setDays] = useState(30);
  const [attemptsPerDay, setAttemptsPerDay] = useState(10);
  const [expPerStage, setExpPerStage] = useState(50);
  const [goldPerStage, setGoldPerStage] = useState(100);

  // 플레이어 곡선
  const [curveType, setCurveType] = useState<CurveType>("linear");
  const [hpBase, setHpBase] = useState(1000);
  const [hpFactor, setHpFactor] = useState(200);
  const [atkBase, setAtkBase] = useState(200);
  const [atkFactor, setAtkFactor] = useState(30);
  const [expBase, setExpBase] = useState(100);
  const [expFactor, setExpFactor] = useState(50);
  const [costBase, setCostBase] = useState(50);
  const [costFactor, setCostFactor] = useState(30);

  // 스테이지 소스 (테이블 자동 감지 또는 수동)
  const [tableId, setTableId] = useState("");
  const [rows, setRows] = useState<RowWithData[]>([]);
  const [cols, setCols] = useState<Column[]>([]);
  const [labelCol, setLabelCol] = useState("");
  const [hpCol, setHpCol] = useState("");
  const [atkCol, setAtkCol] = useState("");
  const [manualStages, setManualStages] = useState<ManualStage[]>(DEFAULT_STAGES);

  const [result, setResult] = useState<PacingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // stages 테이블 선택 → 컬럼/행 로드 + label/hp/atk 컬럼 추정
  useEffect(() => {
    if (!tableId) { setRows([]); setCols([]); setLabelCol(""); setHpCol(""); setAtkCol(""); return; }
    fetch(`/api/tables/${tableId}`).then((r) => r.json()).then((d) => {
      const c: Column[] = d.columns ?? [];
      setCols(c);
      setLabelCol(guessLabelCol(c, ["stage", "chapter", "name", "label", "title"]));
      setHpCol(guessCol(c, ["enemy_hp", "boss_hp", "hp", "health"]));
      setAtkCol(guessCol(c, ["enemy_atk", "boss_atk", "atk", "attack", "power"]));
    });
    fetch(`/api/rows?table_id=${tableId}`).then((r) => r.json()).then((d: RowWithData[]) => setRows(Array.isArray(d) ? d : []));
  }, [tableId]);

  // 실제 사용할 스테이지 → { label, enemy:{ hp, atk, def:0, speed:5 } }[]
  // 테이블 선택 시: 행에서 추출 / 미선택 시: 수동 입력
  const stages = useMemo(() => {
    const src = tableId
      ? rows.map((r, i) => ({
          label: String((labelCol ? r.data[labelCol] : null) ?? r.data.name ?? r.data.id ?? `스테이지 ${i + 1}`),
          hp: num(r.data[hpCol]),
          atk: num(r.data[atkCol]),
        }))
      : manualStages;
    return src.map((s) => ({ label: s.label, enemy: { name: s.label, hp: s.hp, atk: s.atk, def: 0, speed: 5 } }));
  }, [tableId, rows, labelCol, hpCol, atkCol, manualStages]);

  const updateManual = (i: number, field: keyof ManualStage, value: string) => {
    setManualStages((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: field === "label" ? value : (Number(value) || 0) } : s));
  };
  const addManual = () => setManualStages((prev) => prev.length < 10 ? [...prev, { label: `스테이지 ${prev.length + 1}`, hp: 1000, atk: 50 }] : prev);
  const removeManual = (i: number) => setManualStages((prev) => prev.filter((_, idx) => idx !== i));

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pacing",
          hpCurve: { type: curveType, base: hpBase, factor: hpFactor, count: 100 },
          atkCurve: { type: curveType, base: atkBase, factor: atkFactor, count: 100 },
          expCurve: { type: curveType, base: expBase, factor: expFactor, count: 100 },
          upgradeCostCurve: { type: curveType, base: costBase, factor: costFactor, count: 100 },
          stages,
          expPerStage,
          goldPerStage,
          days,
          attemptsPerDay,
          seed: 0,
        }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? `HTTP ${res.status}`);
      setResult(d as PacingResult);
    } catch (e) {
      console.error("[pacing]", e);
      setError(e instanceof Error ? e.message : "페이싱 시뮬 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 추이 차트: 레벨·골드는 스케일이 달라 2개 차트로 분리
  const xLabels = result?.days.map((d) => String(d.day));
  const levelSeries = result ? [{ name: "레벨", color: CHART_PALETTE[0], values: result.days.map((d) => d.level) }] : null;
  const goldSeries = result ? [{ name: "골드", color: CHART_PALETTE[2], values: result.days.map((d) => d.gold) }] : null;

  const stageLabel = (idx: number) => idx < 0 ? "—" : (stages[idx]?.label ?? String(idx + 1));

  return (
    <>
      <SectionLabel><Gauge size={11} className="inline mr-1 -mt-0.5" />시뮬 기간 · 경제</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">시뮬 기간 (일)</div>
            <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">하루 도전 횟수</div>
            <Input type="number" min={1} value={attemptsPerDay} onChange={(e) => setAttemptsPerDay(Math.max(1, Number(e.target.value) || 1))} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">스테이지당 exp</div>
            <Input type="number" min={0} value={expPerStage} onChange={(e) => setExpPerStage(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">스테이지당 골드</div>
            <Input type="number" min={0} value={goldPerStage} onChange={(e) => setGoldPerStage(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
      </div>

      <SectionLabel>플레이어 성장 곡선</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
        <div className="mb-3">
          <div className="text-[11px] text-[#6b6b77] mb-1.5">곡선 타입 (HP·ATK·exp·승급골드 공통)</div>
          <div className="flex gap-1.5">
            {CURVE_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setCurveType(t)}
                className={`text-[11px] px-3 py-1 rounded-md border transition-colors ${curveType === t ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#0f0f10] border-[#3a3a42] text-[#6b6b77] hover:border-[#7c3aed]/50"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {([
            ["HP base", hpBase, setHpBase], ["HP factor", hpFactor, setHpFactor],
            ["ATK base", atkBase, setAtkBase], ["ATK factor", atkFactor, setAtkFactor],
            ["exp base", expBase, setExpBase], ["exp factor", expFactor, setExpFactor],
            ["승급골드 base", costBase, setCostBase], ["승급골드 factor", costFactor, setCostFactor],
          ] as const).map(([label, val, setter]) => (
            <div key={label}>
              <div className="text-[11px] text-[#6b6b77] mb-1.5">{label}</div>
              <Input type="number" value={val} onChange={(e) => setter(Number(e.target.value) || 0)} />
            </div>
          ))}
        </div>
      </div>

      <SectionLabel>스테이지 목록</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4 space-y-3">
        <div>
          <div className="text-[11px] text-[#6b6b77] mb-1.5">stages 테이블 (선택 시 자동 감지, 미선택 시 수동 입력)</div>
          <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">— 수동 입력 —</option>
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>

        {tableId && cols.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-[11px] text-[#6b6b77] mb-1.5">라벨 컬럼</div>
                <Select value={labelCol} onChange={(e) => setLabelCol(e.target.value)}>
                  <option value="">id 사용</option>
                  {cols.filter((c) => c.type === "string").map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                </Select>
              </div>
              {([["적 HP", hpCol, setHpCol], ["적 ATK", atkCol, setAtkCol]] as const).map(([label, val, setter]) => (
                <div key={label}>
                  <div className="text-[11px] text-[#6b6b77] mb-1.5">{label}</div>
                  <Select value={val} onChange={(e) => setter(e.target.value)}>
                    <option value="">—</option>
                    {cols.filter((c) => c.type === "number").map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-[#6b6b77]">{rows.length}개 스테이지 · def=0 / speed=5 적용</div>
          </>
        )}

        {!tableId && (
          <div className="space-y-2">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  {["라벨", "HP", "ATK", ""].map((h) => (
                    <th key={h} className="px-2 py-1 text-left font-medium text-[#6b6b77]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {manualStages.map((s, i) => (
                  <tr key={i}>
                    <td className="px-1 py-1"><Input value={s.label} onChange={(e) => updateManual(i, "label", e.target.value)} /></td>
                    <td className="px-1 py-1"><Input type="number" min={0} value={s.hp} onChange={(e) => updateManual(i, "hp", e.target.value)} /></td>
                    <td className="px-1 py-1"><Input type="number" min={0} value={s.atk} onChange={(e) => updateManual(i, "atk", e.target.value)} /></td>
                    <td className="px-1 py-1">
                      <button onClick={() => removeManual(i)} className="text-[#6b6b77] hover:text-[#f87171] text-[11px] px-1.5">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {manualStages.length < 10 && (
              <button onClick={addManual} className="text-[11px] text-[#9a9aa3] hover:text-[#ededed] px-2 py-1 rounded-md border border-[#3a3a42] bg-[#16161a]">＋ 스테이지 추가</button>
            )}
          </div>
        )}
      </div>

      <Btn variant="primary" onClick={run} disabled={loading || stages.length === 0} className="mb-4"><Gauge size={11} />{loading ? "시뮬 중..." : "시뮬 실행"}</Btn>

      {error && <div className="bg-[#2d0a0a] border border-[#f87171]/20 rounded-xl px-4 py-3 text-[11px] text-[#f87171] mb-4">⚠ {error}</div>}

      {result && (
        <>
          <SectionLabel>요약</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {([
              ["최종 레벨", result.finalLevel.toLocaleString()],
              ["최종 스테이지", `${result.totalStagesCleared} 클리어`],
              ["최종 골드", result.finalGold.toLocaleString()],
            ] as const).map(([label, val]) => (
              <div key={label} className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4">
                <div className="text-[11px] text-[#6b6b77] mb-1">{label}</div>
                <div className="text-2xl font-medium text-[#ededed]">{val}</div>
              </div>
            ))}
          </div>

          {result.days.length >= 2 && levelSeries && goldSeries && (
            <>
              <SectionLabel>레벨 추이</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <LineChart series={levelSeries} xLabels={xLabels} />
              </div>
              <SectionLabel>골드 추이</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <LineChart series={goldSeries} xLabels={xLabels} />
              </div>
            </>
          )}

          <SectionLabel>타임라인 (최대 30일 표시)</SectionLabel>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl overflow-hidden mb-4">
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 bg-[#16161a]">
                  <tr>
                    {["일차", "레벨", "스테이지", "골드", "승률"].map((h) => (
                      <th key={h} className="px-2.5 py-1.5 text-left font-medium text-[#6b6b77] border-b border-[#2a2a2f]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.days.slice(0, 30).map((d) => (
                    <tr key={d.day} className="hover:bg-[#1a1a1c]">
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#9a9aa3]">{d.day}</td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#ededed] font-medium">{d.level}</td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#9a9aa3]">{stageLabel(d.stageCleared)}</td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#ededed]">{d.gold.toLocaleString()}</td>
                      <td className={`px-2.5 py-1.5 border-b border-[#1f1f24] font-medium ${d.winRate >= 0.7 ? "text-[#4ade80]" : d.winRate >= 0.4 ? "text-[#f59e0b]" : "text-[#f87171]"}`}>{(d.winRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.days.length > 30 && <div className="px-2.5 py-1.5 text-[11px] text-[#6b6b77] border-t border-[#2a2a2f]">… 외 {result.days.length - 30}일 (상위 30일만 표시)</div>}
          </div>
        </>
      )}
    </>
  );
}
