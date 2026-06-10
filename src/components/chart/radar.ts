// 레이더 차트 정규화 + 극좌표 — 순수 함수 (React 비의존, 단위 테스트 대상).
// 함정: hp(~5000)/def(~250)/crit(~0.2)를 raw로 그리면 hp가 폴리곤을 지배해 비교 무의미.
// → 각 축을 "자기 축의 max"(주어진 max 또는 전체 시리즈 축별 max)로 0~1 정규화한다.
//   per-series 정규화(시리즈마다 제 max)는 금지 — 모든 폴리곤이 가장자리로 붕괴해 비교 불가.

export interface RadarAxis { label: string; max?: number }
export interface RadarSeriesIn { name: string; color: string; values: number[] }

// 축별 max 산출: axes[k].max 가 주어지면 그 값, 아니면 모든 시리즈에 걸친 축 k 의 최대값.
// 음수/빈 시리즈 방어. 결과 0 이면 호출부에서 0 정규화로 처리(아래 normalizeSeries).
export function axisMaxes(axes: RadarAxis[], series: RadarSeriesIn[]): number[] {
  return axes.map((ax, k) => {
    if (ax.max != null && Number.isFinite(ax.max)) return ax.max;
    let m = 0;
    for (const s of series) {
      const v = s.values[k];
      if (Number.isFinite(v) && v > m) m = v;
    }
    return m;
  });
}

// 한 시리즈의 값들을 축별 max 로 0~1 정규화. max=0 가드(0 반환, NaN 금지). 0~1 클램프.
export function normalizeSeries(values: number[], maxes: number[]): number[] {
  return maxes.map((mx, k) => {
    const v = values[k];
    if (!Number.isFinite(v) || mx <= 0) return 0;
    const r = v / mx;
    return r < 0 ? 0 : r > 1 ? 1 : r;
  });
}

// 정규화값(0~1) → SVG 극좌표. 각도 = -π/2 + i·2π/n (축 0 은 12시 방향, 시계방향).
// norm=1 → 반지름 radius. cx/cy 중심.
export function polarPoint(
  normValue: number,
  axisIndex: number,
  axisCount: number,
  cx: number,
  cy: number,
  radius: number,
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (axisIndex / axisCount) * Math.PI * 2;
  const r = normValue * radius;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}
