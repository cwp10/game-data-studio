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
});
