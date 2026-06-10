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

describe("simulateBattle", () => {
  it("is deterministic for a fixed seed (same winner / turns / log)", () => {
    const atk = [u({ name: "A" })];
    const def = [u({ name: "B", atk: 250 })];
    const r1 = simulateBattle(atk, def, createRng(123));
    const r2 = simulateBattle(atk, def, createRng(123));
    expect(r1.winner).toBe(r2.winner);
    expect(r1.turns).toBe(r2.turns);
    expect(r1.log).toEqual(r2.log);
  });

  it("higher-stat unit wins a 1:1", () => {
    const strong = [u({ name: "Strong", atk: 800, hp: 2000 })];
    const weak = [u({ name: "Weak", atk: 100, hp: 500 })];
    const res = simulateBattle(strong, weak, createRng(1));
    expect(res.winner).toBe("attacker");
  });

  it("records an hp trace and a turn-by-turn log", () => {
    const res = simulateBattle([u({ name: "A" })], [u({ name: "B" })], createRng(5));
    expect(res.hpTrace.length).toBeGreaterThan(1);
    expect(res.log.length).toBeGreaterThan(0);
    expect(res.log[0]).toHaveProperty("damage");
    expect(res.log[0]).toHaveProperty("remainingHp");
  });

  it("supports N:N (team sizes > 1)", () => {
    const teamA = [u({ name: "A1" }), u({ name: "A2" })];
    const teamB = [u({ name: "B1", atk: 150 })];
    const res = simulateBattle(teamA, teamB, createRng(9));
    expect(["attacker", "defender", "draw"]).toContain(res.winner);
    expect(res.log.some((e) => e.actor === "A2")).toBe(true);
  });
});

describe("runMonteCarlo", () => {
  it("is deterministic for a fixed seed across rng-driven outcomes", () => {
    // crit 으로 rng 가 결과에 실제 영향 → 시드 스레딩이 맞아야만 두 run 이 일치.
    const atk = [u({ name: "A", atk: 305, critRate: 0.3 })];
    const def = [u({ name: "B", atk: 300, critRate: 0.3 })];
    const a = runMonteCarlo(atk, def, 500, 42);
    const b = runMonteCarlo(atk, def, 500, 42);
    expect(a.winRate).toBe(b.winRate);
    expect(a.avgTurns).toBe(b.avgTurns);
    expect(a.ci).toEqual(b.ci);
    // 비자명: rng 가 outcome 을 흔들어 승률이 양끝이 아님 (Math.random 이면 실패).
    expect(a.winRate).toBeGreaterThan(0);
    expect(a.winRate).toBeLessThan(1);
  });

  it("overwhelming advantage → win rate ~ 1.0", () => {
    const strong = [u({ name: "Strong", atk: 1500, hp: 5000, speed: 99 })];
    const weak = [u({ name: "Weak", atk: 50, hp: 300 })];
    const res = runMonteCarlo(strong, weak, 1000, 7);
    expect(res.winRate).toBeGreaterThan(0.99);
  });

  it("returns a Wilson CI that brackets the win rate", () => {
    const atk = [u({ name: "A", atk: 305, critRate: 0.2 })];
    const def = [u({ name: "B", atk: 300, critRate: 0.2 })];
    const res = runMonteCarlo(atk, def, 2000, 11);
    expect(res.ci.low).toBeLessThanOrEqual(res.winRate);
    expect(res.ci.high).toBeGreaterThanOrEqual(res.winRate);
    expect(res.iterations).toBe(2000);
  });
});
