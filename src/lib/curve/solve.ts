// Goal Solver: targetLevel 에서 targetValue 가 되는 factor 를 이분탐색으로 역산.
// base/type 고정, factor 만 역산. computeCurve(generate.ts) 재사용(곡선식 재구현 금지).
import { CurveType, computeCurve } from "./generate";

export interface SolveResult {
  solved: boolean;
  factor: number;
  achievedValue: number;
}

// factor 후보로 targetLevel 의 연속값을 평가 (★round:false — 연속·단조, 계단함수 회피).
function evalAt(type: CurveType, base: number, factor: number, targetLevel: number): number {
  const series = computeCurve({ type, base, factor, count: targetLevel, round: false });
  return series[targetLevel - 1];
}

export function solveCurve(
  type: CurveType,
  base: number,
  targetLevel: number,
  targetValue: number
): SolveResult {
  // 부정 입력 가드.
  if (base <= 0 || !Number.isFinite(base) || !Number.isFinite(targetValue)) {
    return { solved: false, factor: 0, achievedValue: 0 };
  }
  // targetLevel<=1: v=base 고정(factor 무관) → 해 없음.
  if (targetLevel <= 1) {
    return { solved: false, factor: 0, achievedValue: 0 };
  }

  // 모든 타입에서 lo=0 으로 통일(exponential 의 U-shape 회피, 단조 보장).
  // f(0): linear/power = base, exponential = 0. f 는 factor 증가 시 단조 증가.
  let lo = 0;
  let hi = 1e6;
  const fLo = evalAt(type, base, lo, targetLevel);
  const fHi = evalAt(type, base, hi, targetLevel);

  // target 이 단조함수 도달 불가 범위([f(lo), f(hi)] 밖) → 해 없음.
  if (targetValue < fLo || targetValue > fHi) {
    return { solved: false, factor: 0, achievedValue: 0 };
  }

  // 이분탐색 (단조 증가 가정).
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fMid = evalAt(type, base, mid, targetLevel);
    if (fMid < targetValue) lo = mid;
    else hi = mid;
    if (Math.abs(hi - lo) < 1e-9) break;
  }
  const factor = (lo + hi) / 2;

  // achievedValue: 구한 factor 로 computeCurve(round 기본 true) 적용한 targetLevel 값.
  const rounded = computeCurve({ type, base, factor, count: targetLevel });
  return { solved: true, factor, achievedValue: rounded[targetLevel - 1] };
}
