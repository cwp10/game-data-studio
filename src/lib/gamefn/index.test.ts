import { describe, it, expect } from "vitest";
import { damage, expectedDamage, dps, ehp, ttk, finalStat } from "./index";

describe("gamefn", () => {
  // 손계산: defCoef = 300/(300+1200) = 0.2 → 1000 × 0.8 = 800
  it("damage applies def reduction (hand-calc)", () => {
    expect(damage(1000, 300)).toBe(800);
  });

  // def=0 → 경감 0 → 데미지 = atk
  it("damage with no def equals atk", () => {
    expect(damage(500, 0)).toBe(500);
  });

  // 과다 def 하한: atk=10, def 매우 큼 → 0.x 로 떨어져도 최소 1
  it("damage floors at 1 when def overwhelms atk", () => {
    expect(damage(10, 1_000_000)).toBe(1);
  });

  // 기대 데미지: base=800(위와 동일), crit 50% × 1.5 → 800×0.5 + 1200×0.5 = 1000
  it("expectedDamage blends crit (hand-calc)", () => {
    expect(expectedDamage(1000, 300, 0.5, 1.5)).toBeCloseTo(1000);
  });

  it("expectedDamage with 0 crit equals base damage", () => {
    expect(expectedDamage(1000, 300, 0)).toBe(damage(1000, 300));
  });

  // dps = 200 × 2.5 = 500
  it("dps multiplies per-hit by attack speed", () => {
    expect(dps(200, 2.5)).toBe(500);
  });

  // ehp = hp × (def+K)/K = 1000 × (1200+1200)/1200 = 1000 × 2 = 2000
  it("ehp scales hp by effective mitigation (hand-calc)", () => {
    expect(ehp(1000, 1200)).toBe(2000);
  });

  it("ehp with no def equals hp", () => {
    expect(ehp(1000, 0)).toBe(1000);
  });

  // ttk = ceil(100/10) = 10
  it("ttk is ceil(hp/dps)", () => {
    expect(ttk(100, 10)).toBe(10);
    expect(ttk(101, 10)).toBe(11);
  });

  it("ttk guards zero dps with Infinity", () => {
    expect(ttk(100, 0)).toBe(Infinity);
    expect(ttk(100, -5)).toBe(Infinity);
  });

  // finalStat = 100 × 1.5 × 1.2 = 180
  it("finalStat = base × level × enhance (hand-calc)", () => {
    expect(finalStat(100, 1.5, 1.2)).toBeCloseTo(180);
  });
});
