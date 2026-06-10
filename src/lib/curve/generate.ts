// 레벨 1..count 의 성장 곡선 값 계산 (게임 데이터 자동 생성용)
export type CurveType = "linear" | "power" | "exponential" | "logarithmic" | "quadratic";

export interface CurveParams {
  type: CurveType;
  base: number;    // 레벨 1의 기준값
  factor: number;  // linear=레벨당 증가량, power=지수, exponential=레벨당 배율
  count: number;   // 생성할 레벨 수
  round?: boolean; // 정수 반올림 (기본 true)
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
    else v = p.base * Math.pow(p.factor, level - 1); // exponential
    out.push(p.round === false ? v : Math.round(v));
  }
  return out;
}
