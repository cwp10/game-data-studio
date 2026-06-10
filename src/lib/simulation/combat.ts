// 단순 데미지 교환 전투 (턴제). 스킬/effect 파이프라인 없음 (P2-3b로 분리).
// gamefn(damage) + rng(createRng) + stats(wilsonCI) 소비.
import { damage } from "../gamefn";
import { createRng, type Rng } from "./rng";
import { wilsonCI, type WilsonCI } from "./stats";

export interface Unit {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;     // 선공/턴 순서 결정
  critRate?: number; // 0~1, 미지정 시 0
  critMult?: number; // 기본 1.5
}

export type Team = Unit[]; // 1명이면 1:1, 다수면 N:N

export interface HpTracePoint {
  turn: number;
  attackerHp: number; // 공격 팀 총 HP
  defenderHp: number; // 방어 팀 총 HP
}

export interface CombatLogEntry {
  turn: number;
  actor: string;
  target: string;
  damage: number;
  crit: boolean;
  remainingHp: number; // 피격자 잔여 HP
}

export type Winner = "attacker" | "defender" | "draw";

export interface BattleResult {
  winner: Winner;
  turns: number;
  hpTrace: HpTracePoint[];
  log: CombatLogEntry[];
}

export interface CombatResult {
  iterations: number;
  winRate: number; // attacker 승 / 전체 시행 (무승부는 분모에 포함 → 승률 희석)
  ci: WilsonCI;    // Wilson 95% (k=attacker 승, n=iterations)
  avgTurns: number;
  hpTrace: HpTracePoint[];   // 대표 1전투 (마지막 시드 전투)
  log: CombatLogEntry[];     // 대표 1전투
}

const MAX_TURNS = 1000;

interface LiveUnit extends Unit {
  side: "attacker" | "defender";
  curHp: number;
}

function teamHp(units: LiveUnit[]): number {
  return units.reduce((s, u) => s + Math.max(0, u.curHp), 0);
}

function firstAlive(units: LiveUnit[]): LiveUnit | undefined {
  return units.find((u) => u.curHp > 0);
}

// 단일 전투 (rng 주입 → 결정적). attacker 팀과 defender 팀의 단순 교환.
export function simulateBattle(attacker: Team, defender: Team, rng: Rng): BattleResult {
  const a: LiveUnit[] = attacker.map((u) => ({ ...u, side: "attacker", curHp: u.hp }));
  const d: LiveUnit[] = defender.map((u) => ({ ...u, side: "defender", curHp: u.hp }));

  // 모든 유닛을 speed 내림차순(동률이면 attacker 우선)으로 행동 순서 고정.
  const order = [...a, ...d].sort((x, y) =>
    y.speed - x.speed || (x.side === "attacker" ? -1 : 1),
  );

  const log: CombatLogEntry[] = [];
  const hpTrace: HpTracePoint[] = [{ turn: 0, attackerHp: teamHp(a), defenderHp: teamHp(d) }];

  let turn = 0;
  while (teamHp(a) > 0 && teamHp(d) > 0 && turn < MAX_TURNS) {
    turn++;
    for (const actor of order) {
      if (actor.curHp <= 0) continue;
      const enemies = actor.side === "attacker" ? d : a;
      const target = firstAlive(enemies);
      if (!target) break;

      const r = actor.critRate ?? 0;
      const crit = rng() < r;
      const mult = crit ? (actor.critMult ?? 1.5) : 1;
      const dmg = Math.round(damage(actor.atk, target.def) * mult);
      target.curHp -= dmg;

      log.push({
        turn,
        actor: actor.name,
        target: target.name,
        damage: dmg,
        crit,
        remainingHp: Math.max(0, target.curHp),
      });

      if (teamHp(a) <= 0 || teamHp(d) <= 0) break;
    }
    hpTrace.push({ turn, attackerHp: teamHp(a), defenderHp: teamHp(d) });
  }

  const aAlive = teamHp(a) > 0;
  const dAlive = teamHp(d) > 0;
  const winner: Winner = aAlive && !dAlive ? "attacker" : dAlive && !aAlive ? "defender" : "draw";

  return { winner, turns: turn, hpTrace, log };
}

// 몬테카를로: N회 반복 → attacker 승률 + Wilson CI + 대표 전투 추이/로그.
export function runMonteCarlo(
  attacker: Team,
  defender: Team,
  iterations: number,
  seed: number,
): CombatResult {
  const n = Math.max(1, Math.floor(iterations));
  let wins = 0;
  let totalTurns = 0;
  let last: BattleResult | undefined;

  for (let i = 0; i < n; i++) {
    // 시드 + 반복 인덱스로 매 전투 독립 시드 (전체는 seed 로 결정적).
    const rng = createRng(seed + i);
    const res = simulateBattle(attacker, defender, rng);
    if (res.winner === "attacker") wins++;
    totalTurns += res.turns;
    last = res;
  }

  return {
    iterations: n,
    winRate: wins / n,
    ci: wilsonCI(wins, n),
    avgTurns: totalTurns / n,
    hpTrace: last!.hpTrace,
    log: last!.log,
  };
}
