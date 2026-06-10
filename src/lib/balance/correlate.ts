// 밸런싱 확장 코어: Pearson 상관 + 승률 매트릭스.
// combat(runMonteCarlo)만 재사용 — 새 전투 수학 없음. 의존성 0.
import { type Unit, runMonteCarlo } from "../simulation/combat";

// 표준 Pearson 상관계수.
// 가드: 길이 불일치 → 짧은 쪽 기준, n<2 → 0, 어느 한쪽 분산 0(상수열) → 0 (NaN 금지).
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
  }
  const mx = sx / n;
  const my = sy / n;

  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }

  if (vx === 0 || vy === 0) return 0; // 상수열 → 분산 0 가드
  return cov / Math.sqrt(vx * vy);
}

export interface WinMatrix {
  labels: string[];
  matrix: number[][]; // matrix[i][j] = units[i]가 attacker일 때 i의 승률
  truncated: boolean;
}

// 유닛 간 승률 매트릭스. matrix[i][j] = runMonteCarlo([i],[j]).winRate (i가 선공 attacker).
// 대각선 i==j 포함(자기 vs 자기). units > maxUnits 면 앞 maxUnits만 + truncated:true.
export function winRateMatrix(
  units: Unit[],
  iterations: number,
  seed: number,
  maxUnits = 10,
): WinMatrix {
  const truncated = units.length > maxUnits;
  const used = truncated ? units.slice(0, maxUnits) : units;
  const m = used.length;

  const labels = used.map((u) => u.name);
  const matrix: number[][] = [];
  const stride = units.length; // 셀별 시드 오프셋 기준(계약: seed + i*units.length + j)

  for (let i = 0; i < m; i++) {
    const row: number[] = [];
    for (let j = 0; j < m; j++) {
      // 셀별 시드 오프셋 → 결정적이면서 셀마다 다른 전투 시퀀스.
      const mc = runMonteCarlo([used[i]], [used[j]], iterations, seed + i * stride + j);
      row.push(mc.winRate);
    }
    matrix.push(row);
  }

  return { labels, matrix, truncated };
}
