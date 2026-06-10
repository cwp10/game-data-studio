import { describe, it, expect } from "vitest";
import { createRng, randInt, chance } from "./rng";

describe("createRng (mulberry32)", () => {
  it("reproduces the same sequence for the same seed", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces a different sequence for a different seed", () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it("outputs lie in [0, 1) and are not all equal", () => {
    const rng = createRng(42);
    const vals = Array.from({ length: 1000 }, () => rng());
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...vals)).toBeLessThan(1);
    expect(new Set(vals).size).toBeGreaterThan(1);
  });

  // 균등성: ~10k 표본 평균이 0.5 근방 (깨진 PRNG 탐지)
  it("is approximately uniform (mean ~ 0.5)", () => {
    const rng = createRng(999);
    const n = 10000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += rng();
    expect(sum / n).toBeCloseTo(0.5, 1);
  });
});

describe("randInt", () => {
  it("stays within [min, max] inclusive", () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = randInt(rng, 1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe("chance", () => {
  it("p=0 never succeeds, p=1 always succeeds", () => {
    const rng = createRng(3);
    expect(chance(rng, 0)).toBe(false);
    expect(chance(rng, 1)).toBe(true);
  });
});
