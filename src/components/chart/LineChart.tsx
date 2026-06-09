"use client";

export interface Series { name: string; color: string; values: number[] }

// 다중 시리즈 SVG 라인 차트 (축 라벨 + 범례 + 가로 그리드)
export function LineChart({ series, xLabels, height = 220 }: { series: Series[]; xLabels?: string[]; height?: number }) {
  const W = 720;
  const H = height;
  const padL = 48, padR = 12, padT = 12, padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const n = Math.max(...series.map((s) => s.values.length), 0);
  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  if (n < 2 || all.length === 0) {
    return <div className="flex items-center justify-center text-[12px] text-[#4a4a55] h-full">표시할 데이터가 부족합니다 (2개 이상 행 + 숫자 컬럼)</div>;
  }
  const max = Math.max(...all);
  const min = Math.min(...all, 0);
  const span = max - min || 1;

  const x = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * plotW);
  const y = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  const fmt = (v: number) => (Math.abs(v) >= 10000 ? (v / 1000).toFixed(0) + "k" : Math.round(v).toLocaleString());

  // 가로 그리드 4등분
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * span);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {/* 그리드 + Y 라벨 */}
        {ticks.map((t, i) => {
          const yy = y(t);
          return (
            <g key={i}>
              <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#2a2a2f" strokeWidth={1} />
              <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={9} fill="#4a4a55">{fmt(t)}</text>
            </g>
          );
        })}
        {/* X 라벨 (처음/중간/끝) — n=2 등에서 인덱스 중복 제거 */}
        {xLabels && [...new Set([0, Math.floor((n - 1) / 2), n - 1])].map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="#4a4a55">{xLabels[i]}</text>
        ))}
        {/* 시리즈 라인 */}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(Number.isFinite(v) ? v : min)}`).join(" ");
          return <polyline key={s.name} points={pts} fill="none" stroke={s.color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />;
        })}
      </svg>
      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 px-1">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-[#9a9aa3]">
            <span className="w-2.5 h-0.5 rounded-full" style={{ background: s.color }} />{s.name}
          </div>
        ))}
      </div>
    </div>
  );
}
