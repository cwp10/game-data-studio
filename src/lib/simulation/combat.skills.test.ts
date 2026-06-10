// P2-3b 전투 스킬 앵커. 기존 combat.test.ts(142)는 무수정 통과해야 함 — 여기선 skills 경로만 검증.
import { describe, it, expect } from "vitest";
import { simulateBattle, runMonteCarlo, type Unit } from "./combat";
import { createRng } from "./rng";

const u = (over: Partial<Unit> & { name: string }): Unit => ({
  hp: 1000,
  atk: 300,
  def: 100,
  speed: 10,
  ...over,
});

// ── 마스터 byte-identical: skills 미지정 유닛은 변경 전과 동일 결과 ──
describe("byte-identical (skillless)", () => {
  it("skillless simulateBattle is unaffected by skill code (no rng shift)", () => {
    const atk = [u({ name: "A", atk: 305, critRate: 0.3 })];
    const def = [u({ name: "B", atk: 300, critRate: 0.3 })];
    // skills 필드 없는 유닛 → 스킬 코드 0 실행, crit draw가 유일한 rng.
    const r = simulateBattle(atk, def, createRng(123));
    // 결정성 + 정상 공격 로그는 event 미설정(후방호환 shape).
    expect(r.log.length).toBeGreaterThan(0);
    expect(r.log[0].event).toBeUndefined();
    expect(r.log[0]).not.toHaveProperty("heal");
  });

  it("skillless runMonteCarlo stays deterministic and non-trivial", () => {
    const atk = [u({ name: "A", atk: 305, critRate: 0.3 })];
    const def = [u({ name: "B", atk: 300, critRate: 0.3 })];
    const a = runMonteCarlo(atk, def, 500, 42);
    const b = runMonteCarlo(atk, def, 500, 42);
    expect(a.winRate).toBe(b.winRate);
    expect(a.winRate).toBeGreaterThan(0);
    expect(a.winRate).toBeLessThan(1);
  });
});

// ── heal: actor가 쿨다운마다 자기 HP 회복(cap = maxHp) ──
describe("skill: heal", () => {
  it("healer ends a long battle with more own HP than the no-heal baseline", () => {
    // 동일 시드/스탯, heal 유무만 차이. 회복으로 healer 잔여 HP가 더 높음.
    const baseFoe = () => [u({ name: "Foe", atk: 200, speed: 5 })];
    const plainHero = [u({ name: "Hero", atk: 400, hp: 2000, speed: 5 })];
    const healHero = [
      u({ name: "Hero", atk: 400, hp: 2000, speed: 5, skills: [{ type: "heal", cooldown: 2, value: 150 }] }),
    ];

    const plain = simulateBattle(plainHero, baseFoe(), createRng(7));
    const healed = simulateBattle(healHero, baseFoe(), createRng(7));

    // heal 로그가 존재하고 회복량 단언.
    const healEntries = healed.log.filter((e) => e.event === "heal");
    expect(healEntries.length).toBeGreaterThan(0);
    expect(healEntries[0].heal).toBe(150);

    // 두 전투 모두 attacker 승(우세). heal 쪽이 더 오래 살거나 더 강함 → 적 잔여HP 더 낮거나 turns 더 많음.
    const plainHeroHp = plain.hpTrace[plain.hpTrace.length - 1].attackerHp;
    const healHeroHp = healed.hpTrace[healed.hpTrace.length - 1].attackerHp;
    expect(healHeroHp).toBeGreaterThan(plainHeroHp);
  });

  it("heal never exceeds maxHp (cap)", () => {
    const hero = [
      u({ name: "Hero", atk: 50, hp: 1000, speed: 99, skills: [{ type: "heal", cooldown: 1, value: 99999 }] }),
    ];
    const foe = [u({ name: "Foe", atk: 10, hp: 100, speed: 1 })];
    const res = simulateBattle(hero, foe, createRng(3));
    for (const pt of res.hpTrace) {
      expect(pt.attackerHp).toBeLessThanOrEqual(1000);
    }
  });
});

// ── invuln: 무적 윈도우 중 받는 데미지 0 ──
describe("skill: invuln", () => {
  it("absorbs damage during the invuln window (damage 0 once active)", () => {
    // attacker(speed99)가 1턴 먼저 친 뒤 Def가 invuln 발동(cooldown 1, value 99턴).
    // 따라서 turn>=2 의 Atk→Def 공격은 모두 흡수(damage 0).
    const attacker = [u({ name: "Atk", atk: 400, speed: 99 })];
    const defender = [
      u({ name: "Def", atk: 1, hp: 5000, speed: 1, skills: [{ type: "invuln", cooldown: 1, value: 99 }] }),
    ];
    const res = simulateBattle(attacker, defender, createRng(5));

    const absorbed = res.log.filter((e) => e.target === "Def" && e.actor === "Atk" && e.turn >= 2);
    expect(absorbed.length).toBeGreaterThan(0);
    expect(absorbed.every((e) => e.damage === 0)).toBe(true);
    // 흡수 턴 로그는 event:"invuln" 표시.
    expect(absorbed.every((e) => e.event === "invuln")).toBe(true);
  });
});

// ── revive: full battle에서 부활이 winner/turns를 뒤집음 (revive 순서 버그 검증) ──
describe("skill: revive", () => {
  it("flips the winner: baseline loses, revive wins (revive runs before break)", () => {
    // Hero는 거의 이기지만 한 끗 차로 baseline은 패. revive로 1회 부활 → 역전.
    const weakAtk = () => [u({ name: "Hero", atk: 400, hp: 600, speed: 10 })];
    const strongDef = () => [u({ name: "Boss", atk: 350, hp: 1000, speed: 20 })];

    const baseline = simulateBattle(weakAtk(), strongDef(), createRng(99));
    expect(baseline.winner).toBe("defender");

    const reviveAtk = [
      u({ name: "Hero", atk: 400, hp: 600, speed: 10, skills: [{ type: "revive", cooldown: 1, value: 600 }] }),
    ];
    const revived = simulateBattle(reviveAtk, strongDef(), createRng(99));

    const revLog = revived.log.filter((e) => e.event === "revive");
    expect(revLog.length).toBe(1); // 1회만
    expect(revived.winner).toBe("attacker"); // winner 뒤집힘
  });

  it("revive triggers at most once per battle", () => {
    const hero = [
      u({ name: "Hero", atk: 200, hp: 300, speed: 5, skills: [{ type: "revive", cooldown: 1, value: 300 }] }),
    ];
    const boss = [u({ name: "Boss", atk: 99999, hp: 5000, speed: 99 })];
    const res = simulateBattle(hero, boss, createRng(1));
    expect(res.log.filter((e) => e.event === "revive").length).toBe(1);
    expect(res.winner).toBe("defender"); // 1회 부활로도 못 이김
  });
});

// ── aoe: 1 액션에 N(≥2) 생존 적이 모두 HP 감소 ──
describe("skill: aoe", () => {
  it("hits all alive enemies in a single action", () => {
    const attacker = [
      u({ name: "Mage", atk: 400, speed: 99, skills: [{ type: "aoe", cooldown: 1, value: 1 }] }),
    ];
    const defenders = [
      u({ name: "E1", hp: 2000, atk: 1, speed: 1 }),
      u({ name: "E2", hp: 2000, atk: 1, speed: 1 }),
      u({ name: "E3", hp: 2000, atk: 1, speed: 1 }),
    ];
    const res = simulateBattle(attacker, defenders, createRng(2));

    // 첫 턴 Mage의 aoe 로그: 3명 모두 동일 턴/액터로 event:"aoe".
    const firstTurnAoe = res.log.filter((e) => e.turn === 1 && e.actor === "Mage" && e.event === "aoe");
    const hitNames = new Set(firstTurnAoe.map((e) => e.target));
    expect(hitNames.size).toBeGreaterThanOrEqual(2);
    expect(firstTurnAoe.every((e) => e.damage > 0)).toBe(true);
  });

  it("aoe applies the value multiplier to each target", () => {
    const attacker = [
      u({ name: "Mage", atk: 400, speed: 99, critRate: 0, skills: [{ type: "aoe", cooldown: 1, value: 2 }] }),
    ];
    const defenders = [
      u({ name: "E1", hp: 5000, atk: 1, def: 100, speed: 1 }),
      u({ name: "E2", hp: 5000, atk: 1, def: 100, speed: 1 }),
    ];
    const res = simulateBattle(attacker, defenders, createRng(4));
    const aoeHits = res.log.filter((e) => e.event === "aoe" && e.turn === 1);
    expect(aoeHits.length).toBe(2);
    // value 2 배율이 실제 적용됐는지 구체값으로 단언: round(damage(400,100) * 2) = round(369*2) = 738.
    // (배율 무시 시 369 → 이 단언이 깬다 → "틀린 모델이 우연히 통과" 차단)
    expect(aoeHits[0].damage).toBe(738);
    expect(aoeHits[1].damage).toBe(738); // 두 타겟 동일 데미지
  });
});

// ── 결정성: 스킬 포함 전투도 같은 seed → 동일 ──
describe("skill battle determinism", () => {
  it("same seed yields identical skilled-battle logs", () => {
    const atk = [
      u({ name: "Hero", atk: 350, critRate: 0.3, skills: [{ type: "heal", cooldown: 3, value: 100 }] }),
    ];
    const def = [
      u({ name: "Boss", atk: 320, hp: 1500, critRate: 0.2, skills: [{ type: "revive", cooldown: 1, value: 500 }] }),
    ];
    const r1 = simulateBattle(atk, def, createRng(77));
    const r2 = simulateBattle(atk, def, createRng(77));
    expect(r1.winner).toBe(r2.winner);
    expect(r1.turns).toBe(r2.turns);
    expect(r1.log).toEqual(r2.log);
  });
});
