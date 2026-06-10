import { describe, it, expect } from "vitest";
import { wilsonCI } from "./stats";

describe("wilsonCI", () => {
  // 앵커(독립 손계산): n=100, k=50, z=1.96 → low≈0.40383, high≈0.59617
  it("matches the hand-computed anchor for n=100, k=50", () => {
    const { center, low, high } = wilsonCI(50, 100);
    expect(center).toBeCloseTo(0.5, 3);
    expect(low).toBeCloseTo(0.404, 3);
    expect(high).toBeCloseTo(0.596, 3);
  });

  it("guards n=0 (no NaN, degenerate zero interval)", () => {
    const ci = wilsonCI(0, 0);
    expect(ci).toEqual({ center: 0, low: 0, high: 0 });
    expect(Number.isNaN(ci.low)).toBe(false);
  });

  // k=0 (전패): low≈0 이지만 high>0 — Wilson 의 핵심(정규근사면 [0,0])
  it("k=0 gives low≈0 but a non-zero upper bound", () => {
    const { low, high } = wilsonCI(0, 20);
    expect(low).toBeCloseTo(0, 5);
    expect(high).toBeGreaterThan(0);
  });

  // k=n (전승): high≈1 이지만 low<1 — 비퇴화 구간
  it("k=n gives high≈1 but a sub-1 lower bound", () => {
    const { low, high } = wilsonCI(20, 20);
    expect(high).toBeCloseTo(1, 5);
    expect(low).toBeLessThan(1);
    expect(low).toBeGreaterThan(0);
  });

  it("clamps bounds into [0, 1]", () => {
    const { low, high } = wilsonCI(1, 3);
    expect(low).toBeGreaterThanOrEqual(0);
    expect(high).toBeLessThanOrEqual(1);
  });
});
