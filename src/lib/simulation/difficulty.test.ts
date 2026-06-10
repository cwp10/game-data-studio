import { describe, it, expect } from "vitest";
import { unitPower, difficultyCurve, type StageInput } from "./difficulty";
import { type Unit } from "./combat";

const player: Unit = { name: "player", hp: 1000, atk: 200, def: 100, speed: 10 };

const weakEnemy: Unit = { name: "weak", hp: 100, atk: 20, def: 0, speed: 5 };
const strongEnemy: Unit = { name: "strong", hp: 5000, atk: 800, def: 400, speed: 20 };

describe("unitPower", () => {
  it("= hp + atk + def", () => {
    expect(unitPower(player)).toBe(1300); // 1000 + 200 + 100
    expect(unitPower({ name: "e", hp: 2000, atk: 300, def: 200, speed: 1 })).toBe(2500);
  });
});

describe("difficultyCurve", () => {
  it("빈 stages → 빈 배열", () => {
    expect(difficultyCurve(player, [], 2, 100, 1)).toEqual([]);
  });

  it("playtimeSec === avgTurns * secondsPerTurn (정확 환산)", () => {
    const stages: StageInput[] = [{ label: "s1", enemy: weakEnemy }];
    const r = difficultyCurve(player, stages, 2, 200, 7);
    expect(r[0].playtimeSec).toBeCloseTo(r[0].avgTurns * 2);
    // secondsPerTurn=2 → 정확히 2배
    const r1 = difficultyCurve(player, stages, 1, 200, 7);
    expect(r[0].playtimeSec).toBeCloseTo(r1[0].playtimeSec * 2);
  });

  it("secondsPerTurn 음수 가드 → 0", () => {
    const stages: StageInput[] = [{ label: "s1", enemy: weakEnemy }];
    const r = difficultyCurve(player, stages, -5, 100, 1);
    expect(r[0].playtimeSec).toBe(0);
  });

  it("powerRatio 손계산: player 1300, enemy 2500 → ≈1.923", () => {
    const enemy: Unit = { name: "e", hp: 2000, atk: 300, def: 200, speed: 1 };
    const r = difficultyCurve(player, [{ label: "s", enemy }], 2, 100, 1);
    expect(r[0].powerRatio).toBeCloseTo(2500 / 1300, 5); // ≈ 1.923
  });

  it("player power 0 가드 → powerRatio 0", () => {
    const zeroPlayer: Unit = { name: "z", hp: 0, atk: 0, def: 0, speed: 1 };
    const r = difficultyCurve(zeroPlayer, [{ label: "s", enemy: weakEnemy }], 2, 100, 1);
    expect(r[0].powerRatio).toBe(0);
  });

  it("시드 결정적: 같은 seed → 동일 결과", () => {
    const stages: StageInput[] = [
      { label: "s1", enemy: weakEnemy },
      { label: "s2", enemy: strongEnemy },
    ];
    const a = difficultyCurve(player, stages, 2, 300, 42);
    const b = difficultyCurve(player, stages, 2, 300, 42);
    expect(a).toEqual(b);
  });

  it("단조 sanity: 약한 적 winRate 높음, 강한 적 winRate 낮음", () => {
    const stages: StageInput[] = [
      { label: "easy", enemy: weakEnemy },
      { label: "hard", enemy: strongEnemy },
    ];
    const r = difficultyCurve(player, stages, 2, 500, 1);
    const easy = r.find((s) => s.label === "easy")!;
    const hard = r.find((s) => s.label === "hard")!;
    expect(easy.winRate).toBeGreaterThan(hard.winRate);
    expect(easy.winRate).toBe(1); // 압도적 우위 → 전승
    expect(hard.winRate).toBe(0); // 압도적 열세 → 전패
    // 약한 적은 powerRatio < 1, 강한 적은 > 1
    expect(easy.powerRatio).toBeLessThan(1);
    expect(hard.powerRatio).toBeGreaterThan(1);
  });

  it("stage 인덱스별 seed 분리 (seed+i)", () => {
    // 같은 enemy를 두 stage에 넣어도 seed가 i로 분리되므로 각자 독립 시드로 굴러간다.
    // winRate가 결정적이고 동일 enemy면 양쪽 동일(0 또는 1 같은 극단)이거나 미세차 가능.
    // 여기서는 결정성만 재확인 (label 보존 + 길이).
    const stages: StageInput[] = [
      { label: "a", enemy: weakEnemy },
      { label: "b", enemy: weakEnemy },
    ];
    const r = difficultyCurve(player, stages, 2, 100, 1);
    expect(r.map((s) => s.label)).toEqual(["a", "b"]);
    expect(r).toHaveLength(2);
  });
});
