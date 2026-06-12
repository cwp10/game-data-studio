import { describe, it, expect } from "vitest";
import { projectEconomy } from "./project";

describe("projectEconomy", () => {
  it("daily income and spend over N days", () => {
    const r = projectEconomy([{ amount: 100, every: 1 }], [{ amount: 40, every: 1 }], 3, 0);
    expect(r.cumInc).toBe(300);
    expect(r.cumSp).toBe(120);
    expect(r.net).toBe(180);
    expect(r.finalBalance).toBe(180);
    expect(r.balSeries).toEqual([60, 120, 180]);
  });

  it("periodic source (every 7) fires on days 1,8,15,22,29", () => {
    const r = projectEconomy([{ amount: 1000, every: 7 }], [], 30, 0);
    expect(r.cumInc).toBe(5000); // 5 occurrences
  });

  it("respects starting balance", () => {
    const r = projectEconomy([], [{ amount: 50, every: 1 }], 2, 1000);
    expect(r.finalBalance).toBe(900);
    expect(r.balSeries).toEqual([950, 900]);
  });

  it("matches the seeded example (14000 / 12500 / 1500)", () => {
    const r = projectEconomy(
      [{ amount: 300, every: 1 }, { amount: 1000, every: 7 }],
      [{ amount: 1600, every: 7 }, { amount: 150, every: 1 }],
      30,
      0
    );
    expect(r.cumInc).toBe(14000);
    expect(r.cumSp).toBe(12500);
    expect(r.net).toBe(1500);
  });

  it("backward-compat: inflation 미지정 → realBalSeries === balSeries (byte-identical)", () => {
    const r = projectEconomy([{ amount: 100, every: 1 }], [{ amount: 40, every: 1 }], 3, 0);
    expect(r.realBalSeries).toEqual([60, 120, 180]);
    expect(r.realBalSeries).toEqual(r.balSeries);
  });

  it("per-entry 복리 성장: amount=100,every=1,growth=0.1,days=3 → bal 100/210/331", () => {
    const r = projectEconomy([{ amount: 100, every: 1, growth: 0.1 }], [], 3, 0);
    expect(r.balSeries[0]).toBeCloseTo(100, 6);
    expect(r.balSeries[1]).toBeCloseTo(210, 6);
    expect(r.balSeries[2]).toBeCloseTo(331, 6);
  });

  it("inflation 실질잔액: 위 케이스 inflation=0.1 → realBal[3]=331/1.21≈273.55", () => {
    const r = projectEconomy([{ amount: 100, every: 1, growth: 0.1 }], [], 3, 0, 0.1);
    expect(r.realBalSeries[2]).toBeCloseTo(273.55, 2);
  });
});
