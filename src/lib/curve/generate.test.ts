import { describe, it, expect } from "vitest";
import { computeCurve, computeAt } from "./generate";

describe("computeCurve", () => {
  it("linear: base + factor*(L-1)", () => {
    expect(computeCurve({ type: "linear", base: 100, factor: 50, count: 4 })).toEqual([100, 150, 200, 250]);
  });

  it("power: base * L^factor", () => {
    expect(computeCurve({ type: "power", base: 100, factor: 2, count: 3 })).toEqual([100, 400, 900]);
  });

  it("exponential: base * factor^(L-1)", () => {
    expect(computeCurve({ type: "exponential", base: 100, factor: 2, count: 4 })).toEqual([100, 200, 400, 800]);
  });

  it("rounds by default, keeps float with round:false", () => {
    expect(computeCurve({ type: "power", base: 100, factor: 1.5, count: 2 })).toEqual([100, 283]);
    expect(computeCurve({ type: "power", base: 100, factor: 1.5, count: 2, round: false })[1]).toBeCloseTo(282.84, 1);
  });

  it("handles count 0 and clamps to 10000", () => {
    expect(computeCurve({ type: "linear", base: 1, factor: 1, count: 0 })).toEqual([]);
    expect(computeCurve({ type: "linear", base: 1, factor: 1, count: 20000 }).length).toBe(10000);
  });

  it("quadratic: base + factor*(L-1)² (level=1 → base, L=3 base=100 f=5 → 120)", () => {
    expect(computeCurve({ type: "quadratic", base: 100, factor: 5, count: 3 })).toEqual([100, 105, 120]);
  });

  it("logarithmic: base + factor*ln(L) (level=1 → base, L=3 base=100 f=10 → round 111)", () => {
    expect(computeCurve({ type: "logarithmic", base: 100, factor: 10, count: 3 })).toEqual([100, 107, 111]);
    expect(computeCurve({ type: "logarithmic", base: 100, factor: 10, count: 3, round: false })[2]).toBeCloseTo(110.986, 2);
  });

  it("s_curve: level=midpoint → base + range/2 (변곡점 중간값)", () => {
    // count=100, midpoint=50 → index 49 (level 50) = base + range/2
    const series = computeCurve({ type: "s_curve", base: 0, factor: 0, count: 100, range: 100, rate: 1, midpoint: 50, round: false });
    expect(series[49]).toBeCloseTo(50, 2); // base + range/2 = 0 + 100/2
  });

  it("s_curve: level=1 → 하한 근방 (< 1), level=100 → 상한 근방 (> 99)", () => {
    const series = computeCurve({ type: "s_curve", base: 0, factor: 0, count: 100, range: 100, rate: 1, midpoint: 50, round: false });
    expect(series[0]).toBeLessThan(1);    // level=1 ≈ 하한 base
    expect(series[99]).toBeGreaterThan(99); // level=100 ≈ 상한 base+range
  });

  it("s_curve: 기본값(range=100, rate=0.5, midpoint=count/2) 동작", () => {
    // range/rate/midpoint 미지정 → 기본값. count=10 → midpoint=5.
    const series = computeCurve({ type: "s_curve", base: 0, factor: 0, count: 10, round: false });
    // level=5 (index 4) = midpoint → base + range/2 = 50
    expect(series[4]).toBeCloseTo(50, 5);
    expect(series[9]).toBeGreaterThan(50); // 상한 방향 단조 증가
    expect(series[0]).toBeLessThan(50);    // 하한 방향
  });
});

describe("computeAt", () => {
  it("power: L=100000 — count cap 없이 계산", () => {
    const v = computeAt({ type: "power", base: 100, factor: 1.5 }, 100000);
    expect(v).toBe(Math.round(100 * Math.pow(100000, 1.5)));
  });

  it("linear: computeAt 결과가 computeCurve 배열과 일치", () => {
    const fromCurve = computeCurve({ type: "linear", base: 100, factor: 50, count: 5 });
    // computeCurve는 10000 cap이 있으므로 범위 안에서 비교
    expect(computeAt({ type: "linear", base: 100, factor: 50 }, 5)).toBe(fromCurve[4]);
  });

  it("s_curve: midpoint 명시 필수 — count 독립적", () => {
    const v = computeAt({ type: "s_curve", base: 0, factor: 0, range: 100, rate: 1, midpoint: 50 }, 50);
    expect(v).toBeCloseTo(50, 0); // 변곡점에서 base + range/2
  });
});
