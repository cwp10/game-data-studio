import { describe, it, expect } from "vitest";
import { simulatePacing, type PacingInput } from "./pacing";
import { type StageInput } from "./difficulty";
import { type CurveParams } from "../curve/generate";
import { type Unit } from "./combat";

// ── 결정적 앵커 입력 (계약 F1_contract.md 와 동일) ──
// 스테이지 5개: hp 100→500, atk 10→50, def=0, speed=5.
function makeStages(): StageInput[] {
  return Array.from({ length: 5 }, (_, i): StageInput => {
    const enemy: Unit = {
      name: `stage${i}`,
      hp: 100 + i * 100, // 100,200,300,400,500
      atk: 10 + i * 10, // 10,20,30,40,50
      def: 0,
      speed: 5,
    };
    return { label: `stage${i}`, enemy };
  });
}

// 플레이어 곡선: lv1 player가 stage0(hp100,atk10)을 이기도록.
//   hp base 1000 (생존), atk base 200 (def0이라 damage=atk=200 → 1타에 가까움).
const hpCurve: CurveParams = { type: "linear", base: 1000, factor: 200, count: 100 };
const atkCurve: CurveParams = { type: "linear", base: 200, factor: 30, count: 100 };
// exp 요구: 저렴하게 (6일 내 레벨업 발생). lv1→2 = 50.
const expCurve: CurveParams = { type: "linear", base: 50, factor: 25, count: 100 };
// 승급 골드: 저렴 (gold 충분). lv1→2 = 30.
const upgradeCostCurve: CurveParams = { type: "linear", base: 30, factor: 20, count: 100 };

function anchorInput(): PacingInput {
  return {
    hpCurve,
    atkCurve,
    expCurve,
    expPerStage: 50,
    stages: makeStages(),
    goldPerStage: 100,
    upgradeCostCurve,
    days: 7,
    attemptsPerDay: 10,
    seed: 42,
  };
}

describe("simulatePacing — 결정적 앵커 (seed=42, days=7)", () => {
  const r = simulatePacing(anchorInput());

  it("days.length === 7", () => {
    expect(r.days.length).toBe(7);
  });

  it("day1.level === 1 (첫날 시작 레벨)", () => {
    expect(r.days[0].level).toBe(1);
  });

  it("day7.level > day1.level (레벨이 증가함)", () => {
    expect(r.days[6].level).toBeGreaterThan(r.days[0].level);
  });

  it("day7.stageCleared >= day1.stageCleared (스테이지 단조 증가)", () => {
    expect(r.days[6].stageCleared).toBeGreaterThanOrEqual(r.days[0].stageCleared);
  });

  it("finalGold >= 0 (골드 음수 없음)", () => {
    expect(r.finalGold).toBeGreaterThanOrEqual(0);
  });

  it("모든 일자 gold >= 0 (불변식)", () => {
    for (const day of r.days) expect(day.gold).toBeGreaterThanOrEqual(0);
  });

  it("stageCleared 전체 단조 증가 (불변식)", () => {
    for (let i = 1; i < r.days.length; i++) {
      expect(r.days[i].stageCleared).toBeGreaterThanOrEqual(r.days[i - 1].stageCleared);
    }
  });

  it("level 전체 단조 증가 (시작 레벨은 비감소)", () => {
    for (let i = 1; i < r.days.length; i++) {
      expect(r.days[i].level).toBeGreaterThanOrEqual(r.days[i - 1].level);
    }
  });

  it("day는 1-indexed 연속", () => {
    r.days.forEach((d, i) => expect(d.day).toBe(i + 1));
  });

  it("winRate 0~1 범위", () => {
    for (const day of r.days) {
      expect(day.winRate).toBeGreaterThanOrEqual(0);
      expect(day.winRate).toBeLessThanOrEqual(1);
    }
  });
});

describe("simulatePacing — 결정성", () => {
  it("같은 seed → 동일 결과 (byte-identical)", () => {
    const a = simulatePacing(anchorInput());
    const b = simulatePacing(anchorInput());
    expect(a).toEqual(b);
  });
});

describe("simulatePacing — 불변식·가드", () => {
  it("totalStagesCleared = 마지막 stageCleared + 1", () => {
    const r = simulatePacing(anchorInput());
    const last = r.days[r.days.length - 1].stageCleared;
    expect(r.totalStagesCleared).toBe(last + 1);
  });

  it("finalLevel >= 마지막 일 시작 레벨 (당일 레벨업 반영)", () => {
    const r = simulatePacing(anchorInput());
    expect(r.finalLevel).toBeGreaterThanOrEqual(r.days[r.days.length - 1].level);
  });

  it("stages 비어도 크래시 없음 (winRate 0, 레벨업/클리어 없음)", () => {
    const input = { ...anchorInput(), stages: [] };
    const r = simulatePacing(input);
    expect(r.days.length).toBe(7);
    expect(r.totalStagesCleared).toBe(0);
    expect(r.days.every((d) => d.winRate === 0)).toBe(true);
  });

  it("골드 부족 시 레벨업 보류 (cost 과대 → 레벨 1 고정)", () => {
    const input: PacingInput = {
      ...anchorInput(),
      upgradeCostCurve: { type: "linear", base: 1e9, factor: 0, count: 100 },
    };
    const r = simulatePacing(input);
    // exp는 쌓여도 골드 부족 → 레벨업 불가.
    expect(r.finalLevel).toBe(1);
    expect(r.finalGold).toBeGreaterThanOrEqual(0);
  });

  it("승률 환산: attemptsPerDay 늘리면 누적 보상 비감소", () => {
    const few = simulatePacing({ ...anchorInput(), attemptsPerDay: 2 });
    const many = simulatePacing({ ...anchorInput(), attemptsPerDay: 20 });
    // 더 많이 도전 → 더 많은 exp/gold (또는 최소 동일).
    expect(many.finalLevel).toBeGreaterThanOrEqual(few.finalLevel);
  });

  it("days 범위 clamp (366 → 365)", () => {
    const r = simulatePacing({ ...anchorInput(), days: 366 });
    expect(r.days.length).toBe(365);
  });

  it("seed 미지정 시 기본 0으로 결정적", () => {
    const input = anchorInput();
    delete input.seed;
    const a = simulatePacing({ ...input });
    const b = simulatePacing({ ...input });
    expect(a).toEqual(b);
  });
});
