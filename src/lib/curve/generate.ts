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

export function computeCurve(p: CurveParams): number[] {
  const count = Math.max(0, Math.min(p.count, 10000));
  const out: number[] = [];
  for (let level = 1; level <= count; level++) {
    let v: number;
    if (p.type === "linear") v = p.base + p.factor * (level - 1);
    else if (p.type === "power") v = p.base * Math.pow(level, p.factor);
    else if (p.type === "logarithmic") v = p.base + p.factor * Math.log(level); // level=1 → ln1=0 → base
    else if (p.type === "quadratic") v = p.base + p.factor * (level - 1) ** 2; // level=1 → base
    else if (p.type === "s_curve") {
      // 로지스틱: base + range / (1 + exp(-rate*(level-midpoint)))
      // ★base는 하한 점근선 — level=1 값이 아님 (다른 5종과 의미 다름)
      const range = p.range ?? 100;
      const rate = p.rate ?? 0.5;
      const midpoint = p.midpoint ?? p.count / 2;
      v = p.base + range / (1 + Math.exp(-rate * (level - midpoint)));
    } else v = p.base * Math.pow(p.factor, level - 1); // exponential
    out.push(p.round === false ? v : Math.round(v));
  }
  return out;
}
