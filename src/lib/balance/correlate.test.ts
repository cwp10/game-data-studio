import { describe, it, expect } from "vitest";
import { pearson, winRateMatrix } from "./correlate";
import { type Unit } from "../simulation/combat";

describe("pearson", () => {
  it("완전 양의 상관 y=2x → 1", () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
  });

  it("완전 음의 상관 → -1", () => {
    expect(pearson([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 10);
  });

  it("대칭(y=x²) 데이터 → 선형 무상관 0", () => {
    expect(pearson([-2, -1, 0, 1, 2], [4, 1, 0, 1, 4])).toBeCloseTo(0, 10);
  });

  it("상수열(분산 0) → NaN 아니라 0 가드", () => {
    const r = pearson([1, 2, 3], [5, 5, 5]);
    expect(Number.isNaN(r)).toBe(false);
    expect(r).toBe(0);
  });

  it("n<2 → 0", () => {
    expect(pearson([1], [2])).toBe(0);
    expect(pearson([], [])).toBe(0);
  });

  it("길이 불일치 → 짧은 쪽 기준(앞 2개로 r=1)", () => {
    expect(pearson([1, 2, 999], [2, 4])).toBeCloseTo(1, 10);
  });
});

const strong: Unit = { name: "강", hp: 5000, atk: 800, def: 600, speed: 100 };
const weak: Unit = { name: "약", hp: 300, atk: 30, def: 5, speed: 100 };

describe("winRateMatrix", () => {
  it("결정성: 같은 (units, seed) → 동일 매트릭스", () => {
    const a = winRateMatrix([strong, weak], 200, 42);
    const b = winRateMatrix([strong, weak], 200, 42);
    expect(a.matrix).toEqual(b.matrix);
    expect(a.labels).toEqual(["강", "약"]);
  });

  it("지배: 강(i=0) → 약(j=1) ≈ 1.0, 약(i=1) → 강(j=0) ≈ 0.0", () => {
    const { matrix } = winRateMatrix([strong, weak], 200, 7);
    expect(matrix[0][1]).toBeGreaterThan(0.95); // 강 attacker가 약 압도
    expect(matrix[1][0]).toBeLessThan(0.05); // 약 attacker는 강 상대 거의 패배
  });

  it("대각선: 동일스탯 자기 vs 자기 = 선공 규칙값(≈1.0, 0.5 아님)", () => {
    const { matrix } = winRateMatrix([strong, weak], 200, 13);
    // critRate=0 → 결정적. 속도 동률 → attacker 선공이 항상 승 → 정확히 1.0.
    expect(matrix[0][0]).toBeCloseTo(1.0, 10);
    expect(matrix[1][1]).toBeCloseTo(1.0, 10);
    expect(matrix[0][0]).not.toBeCloseTo(0.5, 1);
  });

  it("비대칭: cell[i][j] + cell[j][i] ≠ 1 (선공 우위 때문)", () => {
    const even: Unit = { name: "동", hp: 1000, atk: 200, def: 100, speed: 50 };
    const even2: Unit = { name: "동2", hp: 1000, atk: 200, def: 100, speed: 50 };
    const { matrix } = winRateMatrix([even, even2], 300, 99);
    const sum = matrix[0][1] + matrix[1][0];
    // 동일스탯·critRate=0 → 양쪽 다 attacker 선공이 항상 승 → 합 = 2.0 (대칭합=1 모델 반증).
    expect(sum).toBeGreaterThan(1.5);
    expect(sum).toBeCloseTo(2.0, 10);
  });

  it("truncated: units > maxUnits → matrix 크기 maxUnits, truncated true", () => {
    const many: Unit[] = Array.from({ length: 5 }, (_, k) => ({
      name: `u${k}`,
      hp: 1000,
      atk: 100,
      def: 50,
      speed: 50,
    }));
    const res = winRateMatrix(many, 20, 1, 3);
    expect(res.truncated).toBe(true);
    expect(res.matrix.length).toBe(3);
    expect(res.matrix[0].length).toBe(3);
    expect(res.labels).toEqual(["u0", "u1", "u2"]);
  });

  it("truncated false: units <= maxUnits", () => {
    const res = winRateMatrix([strong, weak], 20, 1, 10);
    expect(res.truncated).toBe(false);
    expect(res.matrix.length).toBe(2);
  });
});
