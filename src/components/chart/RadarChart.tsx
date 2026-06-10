"use client";
import { axisMaxes, normalizeSeries, polarPoint, type RadarAxis, type RadarSeriesIn } from "./radar";

// 자체 SVG 극좌표 레이더(폴리곤). LineChart/Histogram 패턴 미러 — 그리드 링 + 축선 + 범례.
// 축별 정규화는 radar.ts(순수·테스트됨)에 위임. 여기선 그리기만.
export function RadarChart({
  axes,
  series,
  size = 280,
}: {
  axes: RadarAxis[];
  series: RadarSeriesIn[];
  size?: number;
}) {
  const n = axes.length;
  if (n < 3 || series.length === 0) {
    return <div className="flex items-center justify-center text-[12px] text-[#4a4a55] h-full py-8">축 3개 이상 + 시리즈 1개 이상이 필요합니다</div>;
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 36; // 라벨 여백

  const maxes = axisMaxes(axes, series);
  const rings = [0.25, 0.5, 0.75, 1];

  // 축 끝점(라벨 위치용)
  const axisEnds = axes.map((_, k) => polarPoint(1, k, n, cx, cy, radius));
  const labelEnds = axes.map((_, k) => polarPoint(1.16, k, n, cx, cy, radius));

  return (
    <div className="w-full flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        {/* 그리드 링(정규화 0.25~1 폴리곤) */}
        {rings.map((rr, ri) => {
          const pts = axes.map((_, k) => polarPoint(rr, k, n, cx, cy, radius)).map((p) => `${p.x},${p.y}`).join(" ");
          return <polygon key={ri} points={pts} fill="none" stroke="#2a2a2f" strokeWidth={1} />;
        })}
        {/* 축선 */}
        {axisEnds.map((p, k) => (
          <line key={k} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#2a2a2f" strokeWidth={1} />
        ))}
        {/* 축 라벨 */}
        {axes.map((ax, k) => {
          const p = labelEnds[k];
          const anchor = p.x < cx - 1 ? "end" : p.x > cx + 1 ? "start" : "middle";
          return (
            <text key={k} x={p.x} y={p.y + 3} textAnchor={anchor} fontSize={10} fill="#9a9aa3">{ax.label}</text>
          );
        })}
        {/* 시리즈 폴리곤 */}
        {series.map((s) => {
          const norm = normalizeSeries(s.values, maxes);
          const pts = norm.map((v, k) => polarPoint(v, k, n, cx, cy, radius));
          const ptsStr = pts.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <g key={s.name}>
              <polygon points={ptsStr} fill={s.color} fillOpacity={0.14} stroke={s.color} strokeWidth={1.75} strokeLinejoin="round" />
              {pts.map((p, k) => <circle key={k} cx={p.x} cy={p.y} r={2.2} fill={s.color} />)}
            </g>
          );
        })}
      </svg>
      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 px-1 justify-center">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-[#9a9aa3]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
