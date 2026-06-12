import { describe, it, expect } from "vitest";
import { rate, runGachaSimulation } from "./gacha";

describe("rate(i) — 소프트 천장 램프", () => {
  const p = 0.02;
  const s = 70;
  const N = 90;

  it("i <= pityStart 구간은 baseRate", () => {
    expect(rate(1, p, s, N)).toBeCloseTo(p);
    expect(rate(s, p, s, N)).toBeCloseTo(p); // rate(s) = p
  });

  it("rate(N) = 1.0 (하드 보장)", () => {
    expect(rate(N, p, s, N)).toBeCloseTo(1.0);
    expect(rate(N + 5, p, s, N)).toBe(1.0);
  });

  it("중간 램프값이 선형 공식과 일치", () => {
    const i = 80; // s < i < N
    const expected = p + (1 - p) * (i - s) / (N - s);
    expect(rate(i, p, s, N)).toBeCloseTo(expected);
    expect(rate(i, p, s, N)).toBeGreaterThan(p);
    expect(rate(i, p, s, N)).toBeLessThan(1.0);
  });

  it("엣지: s>=N 클램프, N<1 가드", () => {
    // s가 N으로 클램프 → i=1 <= s(=90) 이므로 baseRate
    expect(rate(1, p, 200, N)).toBeCloseTo(p);
    expect(rate(1, p, s, 0)).toBe(1.0); // N<1 → N=1, i=1>=N → 1.0
  });
});

describe("runGachaSimulation — 결정적 앵커", () => {
  it("★불변식: 모든 런 maxPulls <= pityCap", () => {
    const N = 90;
    const r = runGachaSimulation(0.02, 70, N, 5000, 1);
    expect(r.maxPulls).toBeLessThanOrEqual(N);
    // distribution 어느 항목도 cap 초과 없음
    for (const d of r.distribution) expect(d.pulls).toBeLessThanOrEqual(N);
  });

  it("baseRate=1 → 항상 1뽑 (avgPulls==1, maxPulls==1)", () => {
    const r = runGachaSimulation(1.0, 70, 90, 1000, 7);
    expect(r.avgPulls).toBe(1);
    expect(r.maxPulls).toBe(1);
    expect(r.distribution).toEqual([{ pulls: 1, count: 1000 }]);
  });

  it("시드 재현: 같은 seed → 동일 결과", () => {
    const a = runGachaSimulation(0.02, 70, 90, 2000, 42);
    const b = runGachaSimulation(0.02, 70, 90, 2000, 42);
    expect(a).toEqual(b);
  });

  it("다른 seed → 다른 결과 (현실성)", () => {
    const a = runGachaSimulation(0.02, 70, 90, 2000, 1);
    const b = runGachaSimulation(0.02, 70, 90, 2000, 999);
    expect(a.avgPulls).not.toBe(b.avgPulls);
  });

  it("avgPulls 합리적: 소프트 천장이 평균을 1/p 이하로 낮춤", () => {
    const p = 0.02;
    const r = runGachaSimulation(p, 70, 90, 5000, 3);
    expect(r.avgPulls).toBeGreaterThan(1);
    expect(r.avgPulls).toBeLessThanOrEqual(1 / p); // 50 이하
  });

  it("distribution count 합 == iterations", () => {
    const r = runGachaSimulation(0.02, 70, 90, 3000, 11);
    const total = r.distribution.reduce((s, d) => s + d.count, 0);
    expect(total).toBe(3000);
  });

  it("pityHitRate 는 0~1 (천장 도달 비율)", () => {
    const r = runGachaSimulation(0.02, 70, 90, 5000, 5);
    expect(r.pityHitRate).toBeGreaterThanOrEqual(0);
    expect(r.pityHitRate).toBeLessThanOrEqual(1);
  });
});
