// Wilson 95% 신뢰구간 (이항 비율). 정규근사보다 작은 표본·극단 비율에서 안정적.
export interface WilsonCI {
  center: number;
  low: number;
  high: number;
}

const Z_95 = 1.96;

// k=성공 횟수, n=시행 횟수. n=0 가드.
export function wilsonCI(k: number, n: number, z: number = Z_95): WilsonCI {
  if (n <= 0) return { center: 0, low: 0, high: 0 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    center,
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
  };
}
