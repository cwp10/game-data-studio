"use client";
import { useState } from "react";
import { Swords, FileDown } from "lucide-react";
import { Btn, SectionLabel, Input } from "@/components/ui";
import { LineChart } from "@/components/chart/LineChart";
import { CombatResult, EMPTY_UNIT, Table, Unit } from "./types";
import { UnitForm, SKILL_EVENT_META } from "./UnitForm";

// ════════════════════════════════════════════════════════════════════
// P2-3 전투 시뮬 (montecarlo API)
// ════════════════════════════════════════════════════════════════════
export function CombatSimPanel({ tables }: { tables: Table[] }) {
  const [attacker, setAttacker] = useState<Unit>({ ...EMPTY_UNIT, name: "공격자" });
  const [defender, setDefender] = useState<Unit>({ ...EMPTY_UNIT, name: "방어자" });
  const [iterations, setIterations] = useState(1000);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "montecarlo", attacker: [attacker], defender: [defender], iterations, seed }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? `HTTP ${res.status}`);
      setResult(d as CombatResult);
    } catch (e) {
      console.error("[montecarlo]", e);
      setError(e instanceof Error ? e.message : "전투 시뮬 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 로그 export — DataEditor CSV/JSON 다운로드 패턴 재사용
  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };
  const exportCsv = () => {
    if (!result) return;
    const header = "turn,actor,target,damage,crit,remainingHp,event,heal";
    const body = result.log.map((l) => `${l.turn},${l.actor},${l.target},${l.damage},${l.crit},${l.remainingHp},${l.event ?? ""},${l.heal ?? ""}`).join("\n");
    download(`${header}\n${body}`, "combat_log.csv", "text/csv");
  };
  const exportJson = () => {
    if (!result) return;
    download(JSON.stringify(result.log, null, 2), "combat_log.json", "application/json");
  };

  const hpChart = result && result.hpTrace.length >= 2 ? {
    series: [
      { name: attacker.name || "공격자", color: "#8b5cf6", values: result.hpTrace.map((p) => p.attackerHp) },
      { name: defender.name || "방어자", color: "#f59e0b", values: result.hpTrace.map((p) => p.defenderHp) },
    ],
    xLabels: result.hpTrace.map((p) => `T${p.turn}`),
  } : null;

  return (
    <>
      <SectionLabel><Swords size={11} className="inline mr-1 -mt-0.5" />유닛 구성 (1:1)</SectionLabel>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <UnitForm title="공격자" unit={attacker} onChange={setAttacker} tables={tables} showSkills />
        <UnitForm title="방어자" unit={defender} onChange={setDefender} tables={tables} showSkills />
      </div>

      <SectionLabel>실행 조건</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">반복 횟수</div>
            <Input type="number" min={1} max={100000} value={iterations} onChange={(e) => setIterations(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))} />
            <div className="flex gap-1.5 mt-2">
              {[1000, 10000, 100000].map((n) => (
                <button key={n} onClick={() => setIterations(n)} className={`text-[11px] px-2.5 py-1 rounded-md border ${iterations === n ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#16161a] border-[#3a3a42] text-[#9a9aa3]"}`}>{n >= 1000 ? `${n / 1000}k` : n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">시드</div>
            <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
          </div>
        </div>
        <Btn variant="primary" onClick={run} disabled={loading}><Swords size={11} />{loading ? "시뮬 중..." : "전투 시뮬 실행"}</Btn>
      </div>

      {error && <div className="bg-[#2d0a0a] border border-[#f87171]/20 rounded-xl px-4 py-3 text-[11px] text-[#f87171] mb-4">⚠ {error}</div>}

      {result && (
        <>
          <SectionLabel>결과</SectionLabel>
          {/* 승률 막대 + Wilson CI */}
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#6b6b77]">공격자 승률 ({result.iterations.toLocaleString()}회)</span>
              <span className="text-[18px] font-medium text-[#ededed]">{(result.winRate * 100).toFixed(1)}%</span>
            </div>
            <div className="relative h-4 bg-[#0f0f10] rounded-full overflow-hidden">
              {/* Wilson CI 구간 오버레이 */}
              <div className="absolute top-0 bottom-0 bg-[#7c3aed]/25" style={{ left: `${result.ci.low * 100}%`, width: `${(result.ci.high - result.ci.low) * 100}%` }} />
              {/* 승률(center) 막대 */}
              <div className="absolute top-0 bottom-0 left-0 bg-[#7c3aed]/70 rounded-full" style={{ width: `${result.winRate * 100}%` }} />
              {/* center 마커 */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-[#ededed]" style={{ left: `${result.ci.center * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6b6b77] mt-2">
              <span>95% CI [{(result.ci.low * 100).toFixed(1)}% – {(result.ci.high * 100).toFixed(1)}%]</span>
              <span>평균 턴 <span className="text-[#ededed] font-medium">{result.avgTurns.toFixed(1)}</span></span>
            </div>
          </div>

          {/* HP 추이 차트 */}
          {hpChart && (
            <>
              <SectionLabel>HP 추이 (대표 전투)</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <LineChart series={hpChart.series} xLabels={hpChart.xLabels} />
              </div>
            </>
          )}

          {/* 전투 로그 + export */}
          <div className="flex items-center justify-between mb-2.5 mt-5">
            <div className="text-[10px] font-semibold text-[#4a4a55] uppercase tracking-widest">전투 로그 (대표 전투 · {result.log.length}건)</div>
            <div className="flex gap-1.5">
              <Btn onClick={exportCsv}><FileDown size={11} />CSV</Btn>
              <Btn onClick={exportJson}><FileDown size={11} />JSON</Btn>
            </div>
          </div>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl overflow-hidden mb-4 max-h-72 overflow-y-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead className="sticky top-0 bg-[#16161a]">
                <tr>
                  {["턴", "행동", "대상", "데미지", "치명", "남은 HP"].map((h) => (
                    <th key={h} className="px-2.5 py-1.5 text-left font-medium text-[#6b6b77] border-b border-[#2a2a2f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.log.map((l, i) => {
                  const ev = l.event && l.event !== "attack" ? l.event : null;
                  const meta = ev ? SKILL_EVENT_META[ev] : null;
                  return (
                    <tr key={i} className={`hover:bg-[#1a1a1c] ${meta ? meta.rowBg : ""}`}>
                      <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#6b6b77]">{l.turn}</td>
                      <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#ededed]">
                        {meta && <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mr-1.5 ${meta.badge}`}>{meta.label}</span>}
                        {l.actor}
                      </td>
                      <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#9a9aa3]">{l.target}</td>
                      <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#ededed]">
                        {l.heal != null && l.heal > 0
                          ? <span className="text-[#4ade80] font-medium">+{l.heal.toLocaleString()}</span>
                          : l.damage.toLocaleString()}
                      </td>
                      <td className="px-2.5 py-1 border-b border-[#1f1f24]">{l.crit ? <span className="text-[#f59e0b] font-medium">CRIT</span> : <span className="text-[#4a4a55]">—</span>}</td>
                      <td className="px-2.5 py-1 border-b border-[#1f1f24] text-[#9a9aa3]">{l.remainingHp.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
