// 난이도/플레이타임 곡선. combat.ts(runMonteCarlo) 재사용 — 새 수학 없이 환산·조합만.
// 플레이어 1유닛 vs 스테이지별 적 1유닛을 MC로 돌려 승률·평균 턴 → 플레이타임 + 난이도 지표.
import { runMonteCarlo, type Unit } from "./combat";
import { type WilsonCI } from "./stats";

export interface StageInput {
  label: string;
  enemy: Unit; // UI가 stages 행에서 enemy 추출해 전달
}

export interface StageDifficulty {
  label: string;
  winRate: number; // 플레이어(attacker) 승률
  ci: WilsonCI;
  avgTurns: number;
  playtimeSec: number; // = avgTurns * secondsPerTurn
  powerRatio: number; // = unitPower(enemy) / unitPower(player)  (>1 = 적이 강함)
}

// 난이도 지표. extra 스탯도 전투력 지수에 합산 (extra가 없으면 기존 동작 유지).
export function unitPower(u: Unit): number {
  const extraSum = u.extra ? Object.values(u.extra).reduce((s, v) => s + v, 0) : 0;
  return u.hp + u.atk + u.def + extraSum;
}

// 스테이지별 난이도 곡선. 각 stage i: runMonteCarlo([player], [enemy], iterations, seed+i).
export function difficultyCurve(
  player: Unit,
  stages: StageInput[],
  secondsPerTurn: number,
  iterations: number,
  seed: number,
): StageDifficulty[] {
  const sec = Math.max(0, secondsPerTurn);
  const playerPower = unitPower(player);

  return stages.map((stage, i) => {
    const mc = runMonteCarlo([player], [stage.enemy], iterations, seed + i);
    return {
      label: stage.label,
      winRate: mc.winRate,
      ci: mc.ci,
      avgTurns: mc.avgTurns,
      playtimeSec: mc.avgTurns * sec,
      powerRatio: playerPower > 0 ? unitPower(stage.enemy) / playerPower : 0,
    };
  });
}
