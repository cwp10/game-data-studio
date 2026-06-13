// 단순 데미지 교환 전투 (턴제). 스킬/effect 파이프라인 없음 (P2-3b로 분리).
// gamefn(damage) + rng(createRng) + stats(wilsonCI) 소비.
import { damage } from "../gamefn";
import { createRng, type Rng } from "./rng";
import { wilsonCI, type WilsonCI } from "./stats";

// 전투 스킬 (P2-3b). 결정적 트리거(쿨다운/턴)만 — RNG 미사용(byte-identical 보존).
export interface Skill {
  type: "heal" | "invuln" | "revive" | "aoe";
  cooldown: number; // 발동 주기(턴). actor 턴 카운터 % cooldown === 0 발동. (revive는 1회 한정)
  value: number;    // heal=회복량, invuln=무적 지속 턴수, revive=부활 HP, aoe=데미지 배율(기본 1)
}

export interface Unit {
  name: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;     // 선공/턴 순서 결정
  critRate?: number; // 0~1, 미지정 시 0
  critMult?: number; // 기본 1.5
  skills?: Skill[];  // optional → 후방호환
  extra?: Record<string, number>; // 추가 스탯 (전투력 지수 반영, 데미지 공식 미사용)
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
  event?: "attack" | "heal" | "invuln" | "revive" | "aoe"; // 신규 optional. 미설정 = 기존 공격(후방호환).
  heal?: number;       // heal/revive 회복량 (신규 optional)
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
  maxHp: number;       // heal HP cap (= 원본 hp)
  turnCount: number;   // actor별 행동 횟수 (결정적 스킬 트리거)
  invulnTurns: number; // 남은 무적 턴수 (>0이면 받는 데미지 0)
  revived: boolean;    // revive 1회 한정 플래그
}

function teamHp(units: LiveUnit[]): number {
  return units.reduce((s, u) => s + Math.max(0, u.curHp), 0);
}

function firstAlive(units: LiveUnit[]): LiveUnit | undefined {
  return units.find((u) => u.curHp > 0);
}

// 단일 전투 (rng 주입 → 결정적). attacker 팀과 defender 팀의 단순 교환.
function toLive(u: Unit, side: "attacker" | "defender"): LiveUnit {
  return {
    ...u,
    side,
    curHp: u.hp,
    maxHp: u.hp,
    turnCount: 0,
    invulnTurns: 0,
    revived: false,
  };
}

export function simulateBattle(attacker: Team, defender: Team, rng: Rng): BattleResult {
  const a: LiveUnit[] = attacker.map((u) => toLive(u, "attacker"));
  const d: LiveUnit[] = defender.map((u) => toLive(u, "defender"));

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
      const allies = actor.side === "attacker" ? a : d;

      // actor 턴 카운터 증가 — 스킬 결정적 트리거 기준. (skillless면 사용 안 함)
      actor.turnCount++;

      // 무적 윈도우 카운트다운 (actor 자신의 턴 시작 시 1 감소).
      if (actor.invulnTurns > 0) actor.invulnTurns--;

      // ── 훅(actor 턴 시작): heal / invuln / aoe 발동 판정 (skills 있는 유닛만) ──
      let aoeActive = false;
      let aoeMult = 1;
      if (actor.skills?.length) {
        for (const skill of actor.skills) {
          if (skill.cooldown <= 0) continue;
          const triggers = actor.turnCount % skill.cooldown === 0;
          if (!triggers) continue;

          if (skill.type === "heal") {
            const before = actor.curHp;
            actor.curHp = Math.min(actor.maxHp, actor.curHp + skill.value);
            const healed = actor.curHp - before;
            log.push({
              turn, actor: actor.name, target: actor.name,
              damage: 0, crit: false, remainingHp: Math.max(0, actor.curHp),
              event: "heal", heal: healed,
            });
          } else if (skill.type === "invuln") {
            actor.invulnTurns = skill.value;
            log.push({
              turn, actor: actor.name, target: actor.name,
              damage: 0, crit: false, remainingHp: Math.max(0, actor.curHp),
              event: "invuln",
            });
          } else if (skill.type === "aoe") {
            aoeActive = true;
            aoeMult = skill.value || 1;
          }
        }
      }
      void allies; // (현재 heal은 self only — allies 예약)

      const target = firstAlive(enemies);
      if (!target) break;

      // 단일 crit draw — 유일한 rng() 소비점(byte-identical). aoe도 같은 1 draw 공유.
      const r = actor.critRate ?? 0;
      const crit = rng() < r;
      const mult = crit ? (actor.critMult ?? 1.5) : 1;

      // ── 타겟 적용: aoe면 모든 생존 적, 아니면 firstAlive 1명 ──
      const targets = aoeActive ? enemies.filter((e) => e.curHp > 0) : [target];
      for (const tgt of targets) {
        const base = Math.round(damage(actor.atk, tgt.def) * mult);
        const dmg = aoeActive ? Math.round(base * aoeMult) : base;

        // ── 훅(데미지 적용): 무적 윈도우면 흡수(0) ──
        const applied = tgt.invulnTurns > 0 ? 0 : dmg;
        tgt.curHp -= applied;

        log.push({
          turn, actor: actor.name, target: tgt.name,
          damage: applied, crit,
          remainingHp: Math.max(0, tgt.curHp),
          ...(aoeActive ? { event: "aoe" as const } : tgt.invulnTurns > 0 ? { event: "invuln" as const } : {}),
        });

        // ── 훅(사망): revive — teamHp/break 재평가 *전*에 1회 부활 (revive 순서 버그 회피) ──
        if (tgt.curHp <= 0 && tgt.skills?.length) {
          const rev = tgt.skills.find((s) => s.type === "revive");
          if (rev && !tgt.revived) {
            tgt.revived = true;
            tgt.curHp = Math.min(tgt.maxHp, Math.max(1, rev.value));
            log.push({
              turn, actor: tgt.name, target: tgt.name,
              damage: 0, crit: false, remainingHp: tgt.curHp,
              event: "revive", heal: tgt.curHp,
            });
          }
        }
      }

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
