import { describe, it, expect } from "vitest";
import { computeCurve } from "./generate";

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
});
