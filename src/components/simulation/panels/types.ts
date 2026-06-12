// 시뮬레이션 패널 간 공유 타입·상수·유틸. SimulationView 분리 시 패널들이 공통으로 참조.

export interface Table { id: string; name: string; }
export interface Column { id: string; name: string; type: string; }
export interface Simulation { id: string; name: string; description: string | null; formula_cs: string | null; input_tables: string | null; }
export interface RowWithData { id: string; data: Record<string, unknown>; }

// ── 전투 계약 (21_combat_contract.md) ──────────────────────────────
export interface Skill { type: "heal" | "invuln" | "revive" | "aoe"; cooldown: number; value: number; }
export interface Unit { name: string; hp: number; atk: number; def: number; speed: number; critRate?: number; critMult?: number; skills?: Skill[]; }
export interface HpTracePoint { turn: number; attackerHp: number; defenderHp: number; }
export interface CombatLogEntry { turn: number; actor: string; target: string; damage: number; crit: boolean; remainingHp: number; event?: "attack" | "heal" | "invuln" | "revive" | "aoe"; heal?: number; }
export interface CombatResult {
  iterations: number;
  winRate: number;
  ci: { center: number; low: number; high: number };
  avgTurns: number;
  hpTrace: HpTracePoint[];
  log: CombatLogEntry[];
}

// ── 난이도 계약 (51_difficulty_contract.md) ────────────────────────
export interface StageInput { label: string; enemy: Unit; }
export interface StageDifficulty {
  label: string;
  winRate: number;
  ci: { center: number; low: number; high: number };
  avgTurns: number;
  playtimeSec: number;
  powerRatio: number;
}

// ── 가챠/DPS 계약 (31_gachadps_contract.md) ────────────────────────
export interface GachaResult {
  iterations: number;
  avgPulls: number;
  maxPulls: number;
  pityHitRate: number;
  distribution: { pulls: number; count: number }[];
}
export interface BuildSpec { name: string; atk: number; def: number; critRate?: number; critMult?: number; attackSpeed?: number; }
export interface DpsBuildResult { name: string; samples: number[]; mean: number; min: number; max: number; }
export interface DpsResult { iterations: number; builds: DpsBuildResult[]; }

// 빌드 비교용 차트 팔레트 (DataEditor와 동일 6색 — 6개 문자열이라 공유 모듈 대신 로컬 복제)
export const CHART_PALETTE = ["#7c3aed", "#4ade80", "#f59e0b", "#f87171", "#38bdf8", "#c4b5fd"];

export const EMPTY_UNIT: Unit = { name: "", hp: 5000, atk: 600, def: 250, speed: 110, critRate: 0, critMult: 1.5 };

// 컬럼명에서 ATK/DEF/HP/SPEED 후보를 추정 (base_atk, atk_total, atk 등 모두 매칭)
export function guessCol(cols: Column[], keys: string[]): string {
  const nums = cols.filter((c) => c.type === "number");
  // 정확/접미 우선 → 부분 일치
  for (const k of keys) {
    const exact = nums.find((c) => c.name.toLowerCase() === k);
    if (exact) return exact.name;
  }
  for (const k of keys) {
    const part = nums.find((c) => c.name.toLowerCase().includes(k));
    if (part) return part.name;
  }
  return "";
}

export function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}
