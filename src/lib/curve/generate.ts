// 레벨 1..count 의 성장 곡선 값 계산 (게임 데이터 자동 생성용)
export type CurveType = "linear" | "power" | "exponential" | "logarithmic" | "quadratic" | "s_curve";

export interface CurveParams {
  type: CurveType;
  base: number;    // 레벨 1의 기준값. (★s_curve: 하한 점근선 — level=1 값이 아님, 다른 5종과 의미 다름)
  factor: number;  // linear=레벨당 증가량, power=지수, exponential=레벨당 배율 (s_curve에선 미사용)
  count: number;   // 생성할 레벨 수
  round?: boolean; // 정수 반올림 (기본 true)
  // S-Curve 전용 (다른 타입에서는 무시)
  range?: number;    // 최대 증가폭 (상한 = base + range)
  rate?: number;     // 가파름 (>0이면 단조 증가)
  midpoint?: number; // 변곡점 레벨 (이 레벨에서 value = base + range/2)
}

// count에 의존하지 않는 단일 레벨 계산. s_curve는 모든 파라미터가 사전 확정되어야 함.
export interface ComputeAtOptions {
  type: CurveType;
  base: number;
  factor: number;
  round?: boolean;
  range?: number;
  rate?: number;
  midpoint?: number; // s_curve 사용 시 필수 (count 기반 기본값 없음)
}

export function computeAt(opts: ComputeAtOptions, level: number): number {
  const { type, base, factor } = opts;
  let v: number;
  if (type === "linear") v = base + factor * (level - 1);
  else if (type === "power") v = base * Math.pow(level, factor);
  else if (type === "logarithmic") v = base + factor * Math.log(level);
  else if (type === "quadratic") v = base + factor * (level - 1) ** 2;
  else if (type === "s_curve") {
    const range = opts.range ?? 100;
    const rate = opts.rate ?? 0.5;
    const midpoint = opts.midpoint ?? 50; // eval_formula 경로: midpoint 명시 필수
    v = base + range / (1 + Math.exp(-rate * (level - midpoint)));
  } else v = base * Math.pow(factor, level - 1); // exponential
  return opts.round === false ? v : Math.round(v);
}

export function computeCurve(p: CurveParams): number[] {
  const count = Math.max(0, Math.min(p.count, 10000));
  // s_curve의 midpoint 기본값은 count 기반으로 여기서 확정
  const opts: ComputeAtOptions = {
    type: p.type, base: p.base, factor: p.factor, round: p.round,
    range: p.range, rate: p.rate,
    midpoint: p.type === "s_curve" ? (p.midpoint ?? count / 2) : p.midpoint,
  };
  const out: number[] = [];
  for (let level = 1; level <= count; level++) {
    out.push(computeAt(opts, level));
  }
  return out;
}
