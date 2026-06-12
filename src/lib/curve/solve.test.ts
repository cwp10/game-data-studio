import { describe, it, expect } from "vitest";
import { solveCurve } from "./solve";
import { computeCurve } from "./generate";

describe("solveCurve — 닫힌형 앵커 (독립 ground truth)", () => {
  it("linear: solveCurve('linear',100,11,200) → factor ≈ 10 (100+f·10=200)", () => {
    const r = solveCurve("linear", 100, 11, 200);
    expect(r.solved).toBe(true);
    expect(r.factor).toBeCloseTo(10, 4);
  });

  it("power: base=10,L=10,target=1000 → factor=ln(100)/ln(10)=2", () => {
    const r = solveCurve("power", 10, 10, 1000);
    expect(r.solved).toBe(true);
    expect(r.factor).toBeCloseTo(2, 4);
  });

  it("exponential: base=100,L=11,target=100·2^10=102400 → factor ≈ 2", () => {
    const r = solveCurve("exponential", 100, 11, 102400);
    expect(r.solved).toBe(true);
    expect(r.factor).toBeCloseTo(2, 4);
  });
});

describe("solveCurve — round-trip 보조", () => {
  it("solve → computeCurve(round:false) → achieved ≈ target", () => {
    const r = solveCurve("power", 50, 20, 4000);
    expect(r.solved).toBe(true);
    const cont = computeCurve({ type: "power", base: 50, factor: r.factor, count: 20, round: false });
    expect(cont[19]).toBeCloseTo(4000, 2);
  });
});

describe("solveCurve — no-solution (garbage 금지)", () => {
  it("targetLevel<=1 → solved:false", () => {
    const r = solveCurve("linear", 100, 1, 200);
    expect(r.solved).toBe(false);
  });

  it("증가곡선인데 target<base → solved:false (power)", () => {
    const r = solveCurve("power", 100, 10, 50);
    expect(r.solved).toBe(false);
  });

  it("증가곡선인데 target<base → solved:false (linear)", () => {
    const r = solveCurve("linear", 100, 10, 50);
    expect(r.solved).toBe(false);
  });

  it("base<=0 가드 → solved:false", () => {
    const r = solveCurve("linear", 0, 10, 200);
    expect(r.solved).toBe(false);
  });

  it("s_curve → unsupported (factor 구동 아님) → solved:false", () => {
    const r = solveCurve("s_curve", 100, 11, 200);
    expect(r.solved).toBe(false);
    expect(r.factor).toBe(0);
    expect(r.achievedValue).toBe(0);
  });
});
