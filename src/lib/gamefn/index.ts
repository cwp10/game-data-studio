// 순수 게임 함수 라이브러리 (시뮬 엔진이 소비). 결정적·손계산 가능. MCP 노출 안 함.

// 표준 데미지 경감 모델: def 계수 = def / (def + K). atk 에서 경감 비율만큼 차감.
// 0 이하 방지: 최소 1. round 로 정수 데미지.
const DEF_CONST = 1200;

export function damage(atk: number, def: number, defConst: number = DEF_CONST): number {
  const safeDef = Math.max(0, def);
  const defCoef = safeDef / (safeDef + defConst);
  return Math.max(1, Math.round(atk * (1 - defCoef)));
}

// 기대 데미지(크리티컬 반영). critRate 0~1, critMult 배율. 결정적 기대값.
export function expectedDamage(
  atk: number,
  def: number,
  critRate: number = 0,
  critMult: number = 1.5,
  defConst: number = DEF_CONST,
): number {
  const base = damage(atk, def, defConst);
  const r = Math.max(0, Math.min(1, critRate));
  return base * (1 - r) + base * critMult * r;
}

// 초당 피해 = 1회 피해 × 초당 공격 횟수(attackSpeed).
export function dps(perHitDamage: number, attackSpeed: number): number {
  return perHitDamage * Math.max(0, attackSpeed);
}

// 유효 체력: hp 를 데미지 경감 역수로 보정. ehp = hp / (1 - defCoef) = hp × (def + K) / K.
export function ehp(hp: number, def: number, defConst: number = DEF_CONST): number {
  const safeDef = Math.max(0, def);
  return hp * (safeDef + defConst) / defConst;
}

// 처치 소요 시간(초). dps 0 이하 가드 → Infinity.
export function ttk(targetHp: number, dpsValue: number): number {
  if (dpsValue <= 0) return Infinity;
  return Math.ceil(targetHp / dpsValue);
}

// 스탯 계산식: 최종 = 기본 × 레벨 성장 보정 × 강화 보정.
export function finalStat(base: number, levelMult: number, enhanceMult: number): number {
  return base * levelMult * enhanceMult;
}
