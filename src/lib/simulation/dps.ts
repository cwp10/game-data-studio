// 데미지 몬테카를로. 빌드별 per-hit 데미지(크리티컬 분산)를 굴려 분포 + 빌드 비교.
// gamefn(damage/expectedDamage) + rng(createRng/chance) 재사용.
// samples = per-hit 데미지(언라운드, attackSpeed 미적용) → expectedDamage 와 정확히 교차검증.
import { damage } from "../gamefn";
import { createRng, chance } from "./rng";

export interface BuildSpec {
  name: string;
  atk: number;
  def: number;
  critRate?: number; // 0~1, 미지정 시 0
  critMult?: number; // 기본 1.5
  attackSpeed?: number; // 미지정 시 1 (DPS 환산용; per-hit samples 에는 미적용)
}

export interface DpsBuildResult {
  name: string;
  samples: number[]; // 히트당 데미지 (크리 발생 시 ×critMult). 언라운드.
  mean: number;
  min: number;
  max: number;
}

export interface DpsResult {
  iterations: number;
  builds: DpsBuildResult[];
}

const MAX_ITERATIONS = 20000;

export function runDpsSimulation(builds: BuildSpec[], iterations: number, seed: number): DpsResult {
  const iters = Math.max(1, Math.min(MAX_ITERATIONS, Math.floor(iterations)));

  const results: DpsBuildResult[] = builds.map((b, bi) => {
    const base = damage(b.atk, b.def);
    const critRate = Math.max(0, Math.min(1, b.critRate ?? 0));
    const critMult = b.critMult ?? 1.5;
    // 빌드별 + 시드로 독립 시드 (전체는 seed 로 결정적).
    const rng = createRng(seed + bi);

    const samples = new Array<number>(iters);
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < iters; i++) {
      const crit = chance(rng, critRate);
      const dmg = crit ? base * critMult : base;
      samples[i] = dmg;
      sum += dmg;
      if (dmg < min) min = dmg;
      if (dmg > max) max = dmg;
    }

    return { name: b.name, samples, mean: sum / iters, min, max };
  });

  return { iterations: iters, builds: results };
}
