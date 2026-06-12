"use client";
import { useState } from "react";
import { Zap, Plus, Trash2 } from "lucide-react";
import { Btn, SectionLabel, Input } from "@/components/ui";
import { Histogram } from "@/components/chart/Histogram";
import { BuildSpec, CHART_PALETTE, DpsResult } from "./types";

// ════════════════════════════════════════════════════════════════════
// P2-5 DPS 빌드 비교 (dps API)
// 빌드 N개(name/atk/def/crit/attackSpeed) → /api/simulation {action:"dps"}
// 표시: 빌드별 mean/min/max + DPS 환산(mean×attackSpeed) + samples를 공유 빈 Histogram으로 겹쳐 비교.
// (samples는 per-hit 언라운드 — attackSpeed는 samples에 미적용, 환산은 소비측 메트릭에서만)
// ════════════════════════════════════════════════════════════════════
const EMPTY_BUILD: BuildSpec = { name: "", atk: 1000, def: 300, critRate: 0.2, critMult: 1.5, attackSpeed: 1.0 };

export function DpsSimPanel() {
  const [builds, setBuilds] = useState<BuildSpec[]>([
    { ...EMPTY_BUILD, name: "빌드 A" },
    { ...EMPTY_BUILD, name: "빌드 B", critRate: 0.5, attackSpeed: 0.7 },
  ]);
  const [iterations, setIterations] = useState(10000);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<DpsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBuild = (i: number, patch: Partial<BuildSpec>) =>
    setBuilds((prev) => prev.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const addBuild = () => setBuilds((prev) => [...prev, { ...EMPTY_BUILD, name: `빌드 ${String.fromCharCode(65 + prev.length)}` }]);
  const removeBuild = (i: number) => setBuilds((prev) => prev.filter((_, j) => j !== i));

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dps", builds, iterations, seed }),
      });
      const d = await res.json();
      if (!res.ok || d.error) throw new Error(d.error ?? `HTTP ${res.status}`);
      setResult(d as DpsResult);
    } catch (e) {
      console.error("[dps]", e);
      setError(e instanceof Error ? e.message : "DPS 시뮬 실패");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // attackSpeed 환산: DPS = per-hit mean × attackSpeed. 입력 빌드의 attackSpeed로 환산.
  const attackSpeedOf = (name: string) => builds.find((b) => b.name === name)?.attackSpeed ?? 1;

  // samples → 공유 빈 다중 시리즈 Histogram (per-hit 데미지 비교)
  const histSeries = result
    ? result.builds.map((b, i) => ({ name: b.name, color: CHART_PALETTE[i % CHART_PALETTE.length], values: b.samples }))
    : null;

  return (
    <>
      <SectionLabel><Zap size={11} className="inline mr-1 -mt-0.5" />빌드 구성</SectionLabel>
      <div className="space-y-2 mb-2">
        {builds.map((b, i) => (
          <div key={i} className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
              <Input placeholder="빌드 이름" value={b.name} onChange={(e) => setBuild(i, { name: e.target.value })} />
              {builds.length > 1 && (
                <button onClick={() => removeBuild(i)} className="text-[#6b6b77] hover:text-[#f87171] flex-shrink-0"><Trash2 size={13} /></button>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {([
                ["ATK", "atk", 1],
                ["DEF", "def", 1],
                ["치명타율", "critRate", 0.01],
                ["치명 배율", "critMult", 0.1],
                ["공속", "attackSpeed", 0.1],
              ] as const).map(([label, k, step]) => (
                <div key={k}>
                  <div className="text-[10px] text-[#6b6b77] mb-1">{label}</div>
                  <Input type="number" step={step} value={b[k] as number} onChange={(e) => setBuild(i, { [k]: Number(e.target.value) || 0 } as Partial<BuildSpec>)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Btn onClick={addBuild} className="mb-4"><Plus size={11} />빌드 추가</Btn>

      <SectionLabel>실행 조건</SectionLabel>
      <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">반복 횟수 (상한 20k)</div>
            <Input type="number" min={1} max={20000} value={iterations} onChange={(e) => setIterations(Math.max(1, Math.min(20000, Number(e.target.value) || 1)))} />
            <div className="flex gap-1.5 mt-2">
              {[1000, 10000, 20000].map((n) => (
                <button key={n} onClick={() => setIterations(n)} className={`text-[11px] px-2.5 py-1 rounded-md border ${iterations === n ? "bg-[#1e1b4b] border-[#7c3aed] text-[#c4b5fd]" : "bg-[#16161a] border-[#3a3a42] text-[#9a9aa3]"}`}>{n >= 1000 ? `${n / 1000}k` : n}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#6b6b77] mb-1.5">시드</div>
            <Input type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
          </div>
        </div>
        <Btn variant="primary" onClick={run} disabled={loading || builds.length === 0}><Zap size={11} />{loading ? "시뮬 중..." : "DPS 시뮬 실행"}</Btn>
      </div>

      {error && <div className="bg-[#2d0a0a] border border-[#f87171]/20 rounded-xl px-4 py-3 text-[11px] text-[#f87171] mb-4">⚠ {error}</div>}

      {result && (
        <>
          <SectionLabel>빌드별 결과 ({result.iterations.toLocaleString()}회 · per-hit 데미지)</SectionLabel>
          <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl overflow-hidden mb-4">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  {["빌드", "평균(per-hit)", "최소", "최대", "공속", "DPS = 평균×공속"].map((h) => (
                    <th key={h} className="px-2.5 py-1.5 text-left font-medium text-[#6b6b77] border-b border-[#2a2a2f]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.builds.map((b, i) => {
                  const as = attackSpeedOf(b.name);
                  return (
                    <tr key={i} className="hover:bg-[#1a1a1c]">
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24]">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-sm" style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
                          <span className="text-[#ededed] font-medium">{b.name}</span>
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#ededed]">{b.mean.toFixed(1)}</td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#9a9aa3]">{b.min.toFixed(1)}</td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#9a9aa3]">{b.max.toFixed(1)}</td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#9a9aa3]">×{as}</td>
                      <td className="px-2.5 py-1.5 border-b border-[#1f1f24] text-[#4ade80] font-medium">{(b.mean * as).toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {histSeries && (
            <>
              <SectionLabel>per-hit 데미지 분포 (공유 빈 비교)</SectionLabel>
              <div className="bg-[#16161a] border border-[#2a2a2f] rounded-xl p-4 mb-4">
                <Histogram series={histSeries} binCount={30} xLabel="per-hit 데미지" yLabel="횟수" />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
