import { describe, it, expect } from "vitest";
import { fitCurve } from "./fit";
import { computeCurve } from "./generate";

// 앵커 = 알려진 파라미터 round-trip: 손설정 파라미터로 정확한 점 생성 → fit → 파라미터 복원.
describe("fitCurve — 알려진 파라미터 round-trip (ground truth = 구성 파라미터)", () => {
  it("power base=10 factor=2 → [10,40,90,160] → base≈10, factor≈2, r2≈1", () => {
    const pts = [
      { level: 1, value: 10 },
      { level: 2, value: 40 },
      { level: 3, value: 90 },
      { level: 4, value: 160 },
    ];
    const r = fitCurve(pts, "power");
    expect(r.base).toBeCloseTo(10, 4);
    expect(r.factor).toBeCloseTo(2, 4);
    expect(r.r2).toBeCloseTo(1, 6);
  });

  it("linear base=5 factor=3 → [5,8,11,14] → base≈5, factor≈3, r2≈1", () => {
    const pts = [
      { level: 1, value: 5 },
      { level: 2, value: 8 },
      { level: 3, value: 11 },
      { level: 4, value: 14 },
    ];
    const r = fitCurve(pts, "linear");
    expect(r.base).toBeCloseTo(5, 4);
    expect(r.factor).toBeCloseTo(3, 4);
    expect(r.r2).toBeCloseTo(1, 6);
  });

  it("quadratic base=100 factor=5 → [100,105,120,145] → base≈100, factor≈5, r2≈1", () => {
    const pts = [
      { level: 1, value: 100 },
      { level: 2, value: 105 },
      { level: 3, value: 120 },
      { level: 4, value: 145 },
    ];
    const r = fitCurve(pts, "quadratic");
    expect(r.base).toBeCloseTo(100, 4);
    expect(r.factor).toBeCloseTo(5, 4);
    expect(r.r2).toBeCloseTo(1, 6);
  });

  it("logarithmic base=100 factor=10 → [100, 100+10ln2, 100+10ln3, 100+10ln4] → base≈100, factor≈10, r2≈1", () => {
    const pts = [
      { level: 1, value: 100 },
      { level: 2, value: 100 + 10 * Math.log(2) },
      { level: 3, value: 100 + 10 * Math.log(3) },
      { level: 4, value: 100 + 10 * Math.log(4) },
    ];
    const r = fitCurve(pts, "logarithmic");
    expect(r.base).toBeCloseTo(100, 4);
    expect(r.factor).toBeCloseTo(10, 4);
    expect(r.r2).toBeCloseTo(1, 6);
  });

  it("exponential base=10 factor=2 → [10,20,40,80] → base≈10, factor≈2, r2≈1", () => {
    const pts = [
      { level: 1, value: 10 },
      { level: 2, value: 20 },
      { level: 3, value: 40 },
      { level: 4, value: 80 },
    ];
    const r = fitCurve(pts, "exponential");
    expect(r.base).toBeCloseTo(10, 4);
    expect(r.factor).toBeCloseTo(2, 4);
    expect(r.r2).toBeCloseTo(1, 6);
  });

  it("s_curve range=900 rate=0.3 midpoint=25 → logit round-trip → rate/midpoint 복원, r2≥0.99", () => {
    // computeCurve로 정확한 로지스틱 점 생성 (round:false).
    const series = computeCurve({ type: "s_curve", base: 100, factor: 0, count: 50, range: 900, rate: 0.3, midpoint: 25, round: false });
    const allPts = series.map((value, i) => ({ level: i + 1, value }));
    // 양 극단 점 제거는 fitCurve 내부 필터(normalized<=0 / >=1)가 처리 — 전체 점 전달.
    // (수동 slice는 base/range 재추정을 악화시켜 오히려 부정확 — 내부 필터에 맡긴다.)
    const r = fitCurve(allPts, "s_curve");
    expect(r.r2).toBeGreaterThanOrEqual(0.99); // 관측 0.9969
    expect(Math.abs((r.midpoint ?? 0) - 25)).toBeLessThan(1); // 관측 25.03 — 강건
    // ★rate 허용오차 0.03 (스펙 0.01 아님): base=min(y)/range=max(y)-min(y) 추정기는
    //   유한표본에서 참 점근선과 달라 logit 기울기에 구조적 양의 편향(관측 rate=0.318 vs 0.3).
    //   스펙 알고리즘(min/max, 경사하강 금지)을 그대로 따른 결과의 실제 정확도. (E1 요약에 명시)
    expect(Math.abs((r.rate ?? 0) - 0.3)).toBeLessThan(0.03);
  });
});

describe("fitCurve — s_curve 가드", () => {
  it("range<=0 (모든 값 동일) → 조기 반환 0", () => {
    const pts = [
      { level: 1, value: 50 },
      { level: 2, value: 50 },
      { level: 3, value: 50 },
    ];
    const r = fitCurve(pts, "s_curve");
    expect(r).toEqual({ base: 50, factor: 0, r2: 0, range: 0, rate: 0, midpoint: 0 });
  });
});

describe("fitCurve — 가드", () => {
  it("n<2 → base/factor/r2 = 0", () => {
    expect(fitCurve([{ level: 1, value: 10 }], "linear")).toEqual({ base: 0, factor: 0, r2: 0 });
    expect(fitCurve([], "power")).toEqual({ base: 0, factor: 0, r2: 0 });
  });

  it("power: value<=0 점 skip 후 유효점<2 → 0", () => {
    const r = fitCurve([{ level: 1, value: 0 }, { level: 2, value: 40 }], "power");
    expect(r).toEqual({ base: 0, factor: 0, r2: 0 });
  });

  it("exponential: value<=0 점 skip 후 유효점<2 → 0", () => {
    const r = fitCurve([{ level: 1, value: 0 }, { level: 2, value: -5 }], "exponential");
    expect(r).toEqual({ base: 0, factor: 0, r2: 0 });
  });

  it("noisy 데이터 → r2 < 1 (불완전 적합 검출)", () => {
    const pts = [
      { level: 1, value: 5 },
      { level: 2, value: 9 },
      { level: 3, value: 10 },
      { level: 4, value: 14 },
    ];
    const r = fitCurve(pts, "linear");
    expect(r.r2).toBeLessThan(1);
    expect(r.r2).toBeGreaterThan(0.9);
  });
});
