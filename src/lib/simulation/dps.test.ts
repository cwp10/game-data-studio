import { describe, it, expect } from "vitest";
import { runDpsSimulation } from "./dps";
import { damage, expectedDamage } from "../gamefn";

const ATK = 1000;
const DEF = 300;

describe("runDpsSimulation — 결정적 앵커", () => {
  it("★교차검증: MC mean ≈ gamefn.expectedDamage(같은 인자)", () => {
    const critRate = 0.5;
    const critMult = 1.5;
    const r = runDpsSimulation(
      [{ name: "A", atk: ATK, def: DEF, critRate, critMult }],
      20000,
      123,
    );
    const exp = expectedDamage(ATK, DEF, critRate, critMult);
    // 언라운드 per-hit samples → 기대값이 expectedDamage 로 수렴.
    // base=800, crit=1200, SD=200 @ p=.5, SE=200/sqrt(20000)≈1.41 → 3·SE≈4.2.
    // 허용오차 5(≈3.5·SE)로 단언: no-crit 버그(mean=800, |diff|=200)는 압도적으로 탈락.
    expect(Math.abs(r.builds[0].mean - exp)).toBeLessThan(5);
  });

  it("critRate=0 → 분산 0 (모든 sample == base, min==max==base)", () => {
    const base = damage(ATK, DEF);
    const r = runDpsSimulation([{ name: "A", atk: ATK, def: DEF, critRate: 0 }], 5000, 1);
    const b = r.builds[0];
    expect(b.min).toBe(base);
    expect(b.max).toBe(base);
    expect(b.mean).toBe(base);
    expect(new Set(b.samples).size).toBe(1);
  });

  it("critRate=1 → 전부 base×critMult", () => {
    const base = damage(ATK, DEF);
    const critMult = 1.5;
    const r = runDpsSimulation(
      [{ name: "A", atk: ATK, def: DEF, critRate: 1, critMult }],
      5000,
      2,
    );
    const b = r.builds[0];
    const expected = base * critMult;
    expect(b.min).toBe(expected);
    expect(b.max).toBe(expected);
    expect(b.mean).toBe(expected);
  });

  it("crit sample 언라운드: base×critMult가 비정수여도 그대로 (라운딩 회귀 가드)", () => {
    // damage(901,300)=round(901*0.8)=721, ×1.5=1081.5 (비정수). 라운딩 버그면 1082로 깨짐.
    const base = damage(901, DEF);
    const expectedCrit = base * 1.5;
    expect(Number.isInteger(expectedCrit)).toBe(false); // 가드의 전제 — 비정수 보장
    const r = runDpsSimulation([{ name: "A", atk: 901, def: DEF, critRate: 1 }], 1000, 4);
    expect(r.builds[0].max).toBe(expectedCrit);
    expect(r.builds[0].mean).toBe(expectedCrit);
  });

  it("시드 재현: 같은 seed → 동일 결과", () => {
    const builds = [{ name: "A", atk: ATK, def: DEF, critRate: 0.3 }];
    const a = runDpsSimulation(builds, 3000, 77);
    const b = runDpsSimulation(builds, 3000, 77);
    expect(a).toEqual(b);
  });

  it("다중 빌드: 각 빌드 독립 시드 → 동일 스펙이면 결과 동일하지 않음(bi 오프셋)", () => {
    const r = runDpsSimulation(
      [
        { name: "A", atk: ATK, def: DEF, critRate: 0.5 },
        { name: "B", atk: ATK, def: DEF, critRate: 0.5 },
      ],
      5000,
      9,
    );
    expect(r.builds.length).toBe(2);
    expect(r.builds[0].name).toBe("A");
    expect(r.builds[1].name).toBe("B");
    // 둘 다 같은 expectedDamage 로 수렴하지만 시드 오프셋 때문에 samples 자체는 다름
    expect(r.builds[0].samples).not.toEqual(r.builds[1].samples);
  });

  it("iterations 상한 20000 적용", () => {
    const r = runDpsSimulation([{ name: "A", atk: ATK, def: DEF }], 999999, 1);
    expect(r.iterations).toBe(20000);
    expect(r.builds[0].samples.length).toBe(20000);
  });

  it("samples 길이 == iterations", () => {
    const r = runDpsSimulation([{ name: "A", atk: ATK, def: DEF, critRate: 0.4 }], 1234, 3);
    expect(r.iterations).toBe(1234);
    expect(r.builds[0].samples.length).toBe(1234);
  });
});
