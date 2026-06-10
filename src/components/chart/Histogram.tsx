"use client";
import { computeBins } from "./bins";

export interface HistSeries { name: string; color: string; values: number[] }

// 다중 시리즈 SVG 막대 히스토그램 (공유 빈). LineChart 패턴 미러 — 축 라벨 + 범례 + 가로 그리드.
// 같은 빈 경계 위에서 시리즈를 그룹 막대로 겹쳐 비교한다.
export function Histogram({
  series,
  binCount = 20,
  xLabel,
  yLabel,
  height = 220,
}: {
  series: HistSeries[];
  binCount?: number;
  xLabel?: string;
  yLabel?: string;
  height?: number;
}) {
  const W = 720;
  const H = height;
  const padL = 48, padR = 12, padT = 12, padB = xLabel ? 40 : 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const { binEdges, seriesCounts } = computeBins(series.map((s) => s.values), binCount);
  const bins = binEdges.length > 0 ? binEdges.length - 1 : 0;
  const maxCount = Math.max(0, ...seriesCounts.flat());

  if (bins === 0 || maxCount === 0) {
    return <div className="flex items-center justify-center text-[12px] text-[#4a4a55] h-full">표시할 데이터가 부족합니다</div>;
  }

  const binW = plotW / bins;
  const groupPad = binW * 0.12;              // 빈 내부 좌우 여백
  const inner = binW - groupPad * 2;
  const barW = inner / series.length;        // 시리즈별 막대 폭 (그룹 막대)

  const y = (c: number) => padT + plotH - (c / maxCount) * plotH;

  const fmt = (v: number) => (Math.abs(v) >= 10000 ? (v / 1000).toFixed(0) + "k" : Math.round(v).toLocaleString());

  // 가로 그리드(카운트) 4등분
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxCount);
  // X 라벨: 처음/중간/끝 빈 경계
  const edgeIdx = [...new Set([0, Math.floor(bins / 2), bins])];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {/* 가로 그리드 + Y 라벨(카운트) */}
        {ticks.map((t, i) => {
          const yy = y(t);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#2a2a2f" strokeWidth={1} />
              <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={9} fill="#4a4a55">{fmt(t)}</text>
            </g>
          );
        })}
        {/* 막대 (시리즈별 그룹) */}
        {seriesCounts.map((counts, si) =>
          counts.map((c, bi) => {
            if (c <= 0) return null;
            const x = padL + bi * binW + groupPad + si * barW;
            const yy = y(c);
            return (
              <rect
                key={`${si}-${bi}`}
                x={x}
                y={yy}
                width={Math.max(0.5, barW - 0.5)}
                height={padT + plotH - yy}
                fill={series[si].color}
                opacity={0.85}
              />
            );
          })
        )}
        {/* X 라벨(빈 경계값) */}
        {edgeIdx.map((i) => (
          <text key={i} x={padL + i * binW} y={H - (xLabel ? 22 : 10)} textAnchor="middle" fontSize={9} fill="#4a4a55">{fmt(binEdges[i])}</text>
        ))}
        {/* 축 캡션 */}
        {xLabel && <text x={padL + plotW / 2} y={H - 6} textAnchor="middle" fontSize={9} fill="#6b6b77">{xLabel}</text>}
        {yLabel && <text x={12} y={padT + plotH / 2} textAnchor="middle" fontSize={9} fill="#6b6b77" transform={`rotate(-90 12 ${padT + plotH / 2})`}>{yLabel}</text>}
      </svg>
      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 px-1">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-[#9a9aa3]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
