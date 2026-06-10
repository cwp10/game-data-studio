// 가챠 몬테카를로 (소프트 천장). per-pull 획득 확률 rate(i)를 굴려 "획득까지" 뽑기 수 분포 산출.
// rng(createRng/chance) 재사용. gamefn/stats 불필요(단순 베르누이 시퀀스).
import { createRng, chance } from "./rng";

export interface GachaResult {
  iterations: number; // 시뮬한 "획득까지" 시행 수
  avgPulls: number; // 평균 뽑기 수(획득까지)
  maxPulls: number;
  pityHitRate: number; // 천장(i==N)에서 획득한 비율
  distribution: { pulls: number; count: number }[]; // 뽑기수별 빈도(Histogram 소비)
}

// 소프트 천장 per-pull 획득 확률. i = 직전 획득 이후 누적 뽑기 수(1-indexed).
//  i <= s        → p (base_rate)
//  s < i < N     → 선형 램프 p + (1-p)*(i-s)/(N-s)
//  i >= N        → 1.0 (하드 보장; i=N 대입 시 위 식도 1.0 → 연속)
// 엣지: p는 [0,1] 클램프, N은 >=1, s는 [0,N] 클램프.
export function rate(i: number, baseRate: number, pityStart: number, pityCap: number): number {
  const N = Math.max(1, Math.floor(pityCap));
  const p = Math.max(0, Math.min(1, baseRate));
  const s = Math.max(0, Math.min(N, Math.floor(pityStart)));
  if (i >= N) return 1.0;
  if (i <= s) return p;
  return p + (1 - p) * (i - s) / (N - s);
}

export function runGachaSimulation(
  baseRate: number,
  pityStart: number,
  pityCap: number,
  iterations: number,
  seed: number,
): GachaResult {
  const N = Math.max(1, Math.floor(pityCap));
  const iters = Math.max(1, Math.floor(iterations));

  const counts = new Map<number, number>();
  let totalPulls = 0;
  let maxPulls = 0;
  let pityHits = 0;

  for (let run = 0; run < iters; run++) {
    // 시드 + 반복 인덱스로 매 시행 독립 시드 (전체는 seed 로 결정적).
    const rng = createRng(seed + run);
    let pulls = 0;
    // i는 1-indexed 실패 카운터. rate(N)=1.0 → 늦어도 i=N 에서 획득(불변식 maxPulls<=N).
    for (let i = 1; i <= N; i++) {
      pulls = i;
      if (chance(rng, rate(i, baseRate, pityStart, N))) break;
    }
    if (pulls === N) pityHits++;
    totalPulls += pulls;
    if (pulls > maxPulls) maxPulls = pulls;
    counts.set(pulls, (counts.get(pulls) ?? 0) + 1);
  }

  const distribution = [...counts.entries()]
    .map(([pulls, count]) => ({ pulls, count }))
    .sort((a, b) => a.pulls - b.pulls);

  return {
    iterations: iters,
    avgPulls: totalPulls / iters,
    maxPulls,
    pityHitRate: pityHits / iters,
    distribution,
  };
}
