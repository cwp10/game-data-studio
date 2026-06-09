/**
 * 방치형 RPG 데모 시드 스크립트
 * 실행: npm run seed-demo
 */

import { createProject } from "../src/lib/db/repo/projects.js";
import { createTable } from "../src/lib/db/repo/tables.js";
import { addColumn } from "../src/lib/db/repo/columns.js";
import { upsertRow } from "../src/lib/db/repo/rows.js";
import { createEnumType } from "../src/lib/db/repo/enumTypes.js";
import { setRelation } from "../src/lib/db/repo/relations.js";
import { saveSimulation } from "../src/lib/db/repo/simulations.js";
import { saveEconomyScenario } from "../src/lib/db/repo/economy.js";

// ─── 프로젝트 ─────────────────────────────────────────────────────────────────
const proj = createProject({
  name: "방치형 RPG 데모",
  genre: "방치형 RPG",
  description: "자동 전투 기반 방치형 RPG 수치 기획 데이터",
});
console.log(`✓ 프로젝트: ${proj.name} (${proj.id})`);

// ─── Enum 타입 (영문/숫자만) ──────────────────────────────────────────────────
const gradeEnum    = createEnumType({ project_id: proj.id, name: "Grade",      values: ["SSR", "SR", "R", "N"] });
const elementEnum  = createEnumType({ project_id: proj.id, name: "Element",    values: ["Fire", "Water", "Wind", "Earth", "Light", "Dark"] });
const skillTypeEnum= createEnumType({ project_id: proj.id, name: "SkillType",  values: ["Active", "Passive", "Ultimate"] });
const equipSlotEnum= createEnumType({ project_id: proj.id, name: "EquipSlot",  values: ["Weapon", "Armor", "Ring", "Necklace"] });
const equipGradeEnum=createEnumType({ project_id: proj.id, name: "EquipGrade", values: ["Legend", "Epic", "Rare", "Common"] });
console.log("✓ Enum 5개 (Grade / Element / SkillType / EquipSlot / EquipGrade)");

// ─── heroes ───────────────────────────────────────────────────────────────────
const heroes = createTable({ project_id: proj.id, name: "heroes", description: "영웅 기본 스탯 (레벨 1 기준)", order_index: 0 });
addColumn({ table_id: heroes.id, name: "name",       type: "string",  order_index: 1 });
addColumn({ table_id: heroes.id, name: "grade",      type: "enum",    order_index: 2,  enum_type_id: gradeEnum.id });
addColumn({ table_id: heroes.id, name: "element",    type: "enum",    order_index: 3,  enum_type_id: elementEnum.id });
addColumn({ table_id: heroes.id, name: "role",       type: "string",  order_index: 4,  description: "Dealer / Tank / Healer / Support" });
addColumn({ table_id: heroes.id, name: "base_hp",    type: "number",  order_index: 5 });
addColumn({ table_id: heroes.id, name: "base_atk",   type: "number",  order_index: 6 });
addColumn({ table_id: heroes.id, name: "base_def",   type: "number",  order_index: 7 });
addColumn({ table_id: heroes.id, name: "base_spd",   type: "number",  order_index: 8,  description: "행동 속도 (높을수록 먼저 행동)" });
addColumn({ table_id: heroes.id, name: "crit_rate",  type: "number",  order_index: 9,  description: "크리티컬 확률 (%)" });
addColumn({ table_id: heroes.id, name: "crit_dmg",   type: "number",  order_index: 10, description: "크리티컬 배율 (%)" });
addColumn({ table_id: heroes.id, name: "skill_id",   type: "string",  order_index: 11 });

const heroRows = [
  // SSR
  { name: "아이제아",  grade: "SSR", element: "Light", role: "Dealer",  base_hp: 4800, base_atk: 720, base_def: 260, base_spd: 118, crit_rate: 22, crit_dmg: 165, skill_id: "SK001" },
  { name: "블레이즈",  grade: "SSR", element: "Fire",  role: "Dealer",  base_hp: 5100, base_atk: 680, base_def: 240, base_spd: 112, crit_rate: 18, crit_dmg: 180, skill_id: "SK002" },
  { name: "아이스퀸",  grade: "SSR", element: "Water", role: "Support", base_hp: 4200, base_atk: 520, base_def: 310, base_spd: 125, crit_rate: 12, crit_dmg: 150, skill_id: "SK003" },
  { name: "다크나이트", grade: "SSR", element: "Dark",  role: "Tank",   base_hp: 7200, base_atk: 480, base_def: 480, base_spd: 95,  crit_rate: 10, crit_dmg: 150, skill_id: "SK004" },
  // SR
  { name: "스톰윙",   grade: "SR",  element: "Wind",  role: "Dealer",  base_hp: 3800, base_atk: 580, base_def: 210, base_spd: 135, crit_rate: 20, crit_dmg: 160, skill_id: "SK005" },
  { name: "어스가드",  grade: "SR",  element: "Earth", role: "Tank",    base_hp: 6000, base_atk: 380, base_def: 420, base_spd: 88,  crit_rate:  8, crit_dmg: 150, skill_id: "SK006" },
  { name: "플레임",   grade: "SR",  element: "Fire",  role: "Dealer",  base_hp: 3600, base_atk: 560, base_def: 200, base_spd: 120, crit_rate: 16, crit_dmg: 155, skill_id: "SK007" },
  { name: "티아라",   grade: "SR",  element: "Light", role: "Healer",  base_hp: 4000, base_atk: 320, base_def: 280, base_spd: 130, crit_rate: 10, crit_dmg: 150, skill_id: "SK008" },
  // R
  { name: "철검사",   grade: "R",   element: "Earth", role: "Dealer",  base_hp: 3200, base_atk: 460, base_def: 190, base_spd: 105, crit_rate: 12, crit_dmg: 150, skill_id: "SK009" },
  { name: "파수꾼",   grade: "R",   element: "Wind",  role: "Tank",    base_hp: 5200, base_atk: 300, base_def: 360, base_spd: 90,  crit_rate:  6, crit_dmg: 150, skill_id: "SK010" },
  { name: "불꽃술사",  grade: "R",   element: "Fire",  role: "Dealer",  base_hp: 3000, base_atk: 440, base_def: 170, base_spd: 115, crit_rate: 14, crit_dmg: 150, skill_id: "SK011" },
  { name: "성수사",   grade: "R",   element: "Water", role: "Support", base_hp: 3400, base_atk: 280, base_def: 230, base_spd: 122, crit_rate:  8, crit_dmg: 150, skill_id: "SK012" },
];
for (const d of heroRows) upsertRow(heroes.id, undefined, d);
console.log(`✓ heroes ${heroRows.length}행`);

// ─── hero_levels (레벨 성장 테이블, 1~50) ─────────────────────────────────────
const heroLevels = createTable({ project_id: proj.id, name: "hero_levels", description: "레벨별 스탯 성장 보정값", order_index: 1 });
addColumn({ table_id: heroLevels.id, name: "level",      type: "number", order_index: 1 });
addColumn({ table_id: heroLevels.id, name: "exp_req",    type: "number", order_index: 2, description: "해당 레벨 달성에 필요한 누적 경험치" });
addColumn({ table_id: heroLevels.id, name: "atk_total",  type: "number", order_index: 3, description: "공격력 누적 추가량 (base_atk에 합산)" });
addColumn({ table_id: heroLevels.id, name: "hp_total",   type: "number", order_index: 4, description: "HP 누적 추가량" });
addColumn({ table_id: heroLevels.id, name: "def_total",  type: "number", order_index: 5, description: "방어력 누적 추가량" });
addColumn({ table_id: heroLevels.id, name: "atk_rate",   type: "number", order_index: 6, description: "기본값 대비 최종 배율 (%)" });

// 1~50레벨 성장 (지수 곡선: y = base * (1.05)^(level-1))
for (let lv = 1; lv <= 50; lv++) {
  const rate = Math.pow(1.05, lv - 1);
  const expReq = lv === 1 ? 0 : Math.round(100 * Math.pow(1.18, lv - 2));
  upsertRow(heroLevels.id, undefined, {
    level:     lv,
    exp_req:   expReq,
    atk_total: Math.round((rate - 1) * 500),
    hp_total:  Math.round((rate - 1) * 3000),
    def_total: Math.round((rate - 1) * 200),
    atk_rate:  Math.round(rate * 100),
  });
}
console.log("✓ hero_levels 50행 (레벨 1~50 지수 성장)");

// ─── enhancement (강화 테이블, +0~+15) ────────────────────────────────────────
const enhancement = createTable({ project_id: proj.id, name: "enhancement", description: "영웅 강화 단계별 보너스·비용", order_index: 2 });
addColumn({ table_id: enhancement.id, name: "enhance_lv",   type: "number", order_index: 1 });
addColumn({ table_id: enhancement.id, name: "atk_bonus_pct", type: "number", order_index: 2, description: "공격력 보너스 (%)" });
addColumn({ table_id: enhancement.id, name: "hp_bonus_pct",  type: "number", order_index: 3, description: "HP 보너스 (%)" });
addColumn({ table_id: enhancement.id, name: "def_bonus_pct", type: "number", order_index: 4, description: "방어력 보너스 (%)" });
addColumn({ table_id: enhancement.id, name: "mat_count",     type: "number", order_index: 5, description: "필요 강화석 수" });
addColumn({ table_id: enhancement.id, name: "gold_cost",     type: "number", order_index: 6 });
addColumn({ table_id: enhancement.id, name: "success_rate",  type: "number", order_index: 7, description: "성공 확률 (%, +10이하 100%)" });

const enhRows = [
  { enhance_lv:  0, atk_bonus_pct:   0, hp_bonus_pct:   0, def_bonus_pct:   0, mat_count:  0, gold_cost:       0, success_rate: 100 },
  { enhance_lv:  1, atk_bonus_pct:   4, hp_bonus_pct:   3, def_bonus_pct:   3, mat_count:  2, gold_cost:    1000, success_rate: 100 },
  { enhance_lv:  2, atk_bonus_pct:   8, hp_bonus_pct:   6, def_bonus_pct:   6, mat_count:  3, gold_cost:    2500, success_rate: 100 },
  { enhance_lv:  3, atk_bonus_pct:  12, hp_bonus_pct:  10, def_bonus_pct:  10, mat_count:  5, gold_cost:    5000, success_rate: 100 },
  { enhance_lv:  4, atk_bonus_pct:  17, hp_bonus_pct:  14, def_bonus_pct:  14, mat_count:  7, gold_cost:    9000, success_rate: 100 },
  { enhance_lv:  5, atk_bonus_pct:  23, hp_bonus_pct:  19, def_bonus_pct:  19, mat_count: 10, gold_cost:   15000, success_rate: 100 },
  { enhance_lv:  6, atk_bonus_pct:  30, hp_bonus_pct:  25, def_bonus_pct:  25, mat_count: 14, gold_cost:   25000, success_rate: 100 },
  { enhance_lv:  7, atk_bonus_pct:  38, hp_bonus_pct:  32, def_bonus_pct:  32, mat_count: 18, gold_cost:   40000, success_rate: 100 },
  { enhance_lv:  8, atk_bonus_pct:  47, hp_bonus_pct:  40, def_bonus_pct:  40, mat_count: 24, gold_cost:   60000, success_rate: 100 },
  { enhance_lv:  9, atk_bonus_pct:  57, hp_bonus_pct:  49, def_bonus_pct:  49, mat_count: 30, gold_cost:   90000, success_rate: 100 },
  { enhance_lv: 10, atk_bonus_pct:  68, hp_bonus_pct:  59, def_bonus_pct:  59, mat_count: 38, gold_cost:  130000, success_rate: 100 },
  { enhance_lv: 11, atk_bonus_pct:  82, hp_bonus_pct:  72, def_bonus_pct:  72, mat_count: 48, gold_cost:  180000, success_rate:  80 },
  { enhance_lv: 12, atk_bonus_pct:  97, hp_bonus_pct:  86, def_bonus_pct:  86, mat_count: 60, gold_cost:  250000, success_rate:  65 },
  { enhance_lv: 13, atk_bonus_pct: 115, hp_bonus_pct: 102, def_bonus_pct: 102, mat_count: 75, gold_cost:  350000, success_rate:  50 },
  { enhance_lv: 14, atk_bonus_pct: 135, hp_bonus_pct: 120, def_bonus_pct: 120, mat_count: 95, gold_cost:  500000, success_rate:  40 },
  { enhance_lv: 15, atk_bonus_pct: 160, hp_bonus_pct: 142, def_bonus_pct: 142, mat_count:120, gold_cost:  750000, success_rate:  30 },
];
for (const d of enhRows) upsertRow(enhancement.id, undefined, d);
console.log(`✓ enhancement ${enhRows.length}행 (+0~+15)`);

// ─── skills ───────────────────────────────────────────────────────────────────
const skills = createTable({ project_id: proj.id, name: "skills", description: "영웅 스킬 정의", order_index: 3 });
addColumn({ table_id: skills.id, name: "skill_id",    type: "string",  order_index: 1 });
addColumn({ table_id: skills.id, name: "name",        type: "string",  order_index: 2 });
addColumn({ table_id: skills.id, name: "type",        type: "enum",    order_index: 3, enum_type_id: skillTypeEnum.id });
addColumn({ table_id: skills.id, name: "cooldown",    type: "number",  order_index: 4, description: "초 단위 (방치형은 실수 가능)" });
addColumn({ table_id: skills.id, name: "dmg_ratio",   type: "number",  order_index: 5, description: "공격력 대비 데미지 배율 (%)" });
addColumn({ table_id: skills.id, name: "hit_count",   type: "number",  order_index: 6, description: "히트 수" });
addColumn({ table_id: skills.id, name: "target",      type: "string",  order_index: 7, description: "Single / All / Random3" });
addColumn({ table_id: skills.id, name: "description", type: "string",  order_index: 8 });

const skillRows = [
  { skill_id: "SK001", name: "빛의 심판",   type: "Ultimate", cooldown: 20, dmg_ratio: 420, hit_count: 1, target: "Single",  description: "단일 적에게 강력한 빛 데미지" },
  { skill_id: "SK002", name: "폭염 폭발",   type: "Active",   cooldown: 12, dmg_ratio: 280, hit_count: 1, target: "All",     description: "전체 적에게 화염 데미지" },
  { skill_id: "SK003", name: "빙하 보호막", type: "Active",   cooldown: 15, dmg_ratio:   0, hit_count: 0, target: "All",     description: "아군 전체 2턴 방어력 30% 증가" },
  { skill_id: "SK004", name: "어둠의 방패", type: "Passive",  cooldown:  0, dmg_ratio:   0, hit_count: 0, target: "Self",    description: "HP 30% 이하 시 받는 피해 40% 감소" },
  { skill_id: "SK005", name: "폭풍 연격",   type: "Active",   cooldown:  8, dmg_ratio: 160, hit_count: 3, target: "Random3", description: "무작위 3타 연속 공격" },
  { skill_id: "SK006", name: "대지 방벽",   type: "Passive",  cooldown:  0, dmg_ratio:   0, hit_count: 0, target: "Self",    description: "방어력이 공격력에 15% 추가 반영" },
  { skill_id: "SK007", name: "화염 창",     type: "Active",   cooldown: 10, dmg_ratio: 240, hit_count: 1, target: "Single",  description: "단일 대상에게 화염 관통 공격" },
  { skill_id: "SK008", name: "신성한 빛",   type: "Active",   cooldown: 18, dmg_ratio:   0, hit_count: 0, target: "All",     description: "아군 전체 HP 20% 회복" },
  { skill_id: "SK009", name: "강철 베기",   type: "Active",   cooldown:  8, dmg_ratio: 185, hit_count: 1, target: "Single",  description: "단일 적 근접 공격" },
  { skill_id: "SK010", name: "도발",        type: "Active",   cooldown: 12, dmg_ratio:   0, hit_count: 0, target: "Self",    description: "2턴간 적의 공격을 자신에게 집중" },
  { skill_id: "SK011", name: "화염 투척",   type: "Active",   cooldown:  9, dmg_ratio: 200, hit_count: 1, target: "All",     description: "전체 적에게 화염 데미지" },
  { skill_id: "SK012", name: "회복의 물결", type: "Passive",  cooldown:  0, dmg_ratio:   0, hit_count: 0, target: "All",     description: "매 턴 아군 전체 HP 3% 회복" },
];
for (const d of skillRows) upsertRow(skills.id, undefined, d);
console.log(`✓ skills ${skillRows.length}행`);

// ─── stages (챕터 1~3, 스테이지별 10단계) ────────────────────────────────────
const stages = createTable({ project_id: proj.id, name: "stages", description: "스테이지 구성 및 보상", order_index: 4 });
addColumn({ table_id: stages.id, name: "chapter",       type: "number", order_index: 1 });
addColumn({ table_id: stages.id, name: "stage",         type: "number", order_index: 2 });
addColumn({ table_id: stages.id, name: "recommend_cp",  type: "number", order_index: 3, description: "권장 전투력" });
addColumn({ table_id: stages.id, name: "wave_count",    type: "number", order_index: 4 });
addColumn({ table_id: stages.id, name: "enemy_atk",     type: "number", order_index: 5, description: "적 기본 공격력" });
addColumn({ table_id: stages.id, name: "enemy_hp",      type: "number", order_index: 6, description: "적 기본 HP" });
addColumn({ table_id: stages.id, name: "boss_atk",      type: "number", order_index: 7 });
addColumn({ table_id: stages.id, name: "boss_hp",       type: "number", order_index: 8 });
addColumn({ table_id: stages.id, name: "stamina",       type: "number", order_index: 9 });
addColumn({ table_id: stages.id, name: "gold_reward",   type: "number", order_index: 10 });
addColumn({ table_id: stages.id, name: "exp_reward",    type: "number", order_index: 11 });
addColumn({ table_id: stages.id, name: "gem_reward",    type: "number", order_index: 12 });

const stageRows = [
  // 챕터 1: 입문 (CP 1,000~8,000)
  { chapter:1, stage: 1, recommend_cp:  1000, wave_count:2, enemy_atk:  180, enemy_hp:  1200, boss_atk:  320, boss_hp:   6000, stamina:3, gold_reward:  200, exp_reward: 120, gem_reward:0 },
  { chapter:1, stage: 2, recommend_cp:  1400, wave_count:2, enemy_atk:  210, enemy_hp:  1600, boss_atk:  380, boss_hp:   8000, stamina:3, gold_reward:  260, exp_reward: 150, gem_reward:0 },
  { chapter:1, stage: 3, recommend_cp:  1900, wave_count:3, enemy_atk:  250, enemy_hp:  2100, boss_atk:  450, boss_hp:  11000, stamina:3, gold_reward:  340, exp_reward: 190, gem_reward:5 },
  { chapter:1, stage: 4, recommend_cp:  2500, wave_count:3, enemy_atk:  300, enemy_hp:  2700, boss_atk:  540, boss_hp:  14500, stamina:4, gold_reward:  440, exp_reward: 240, gem_reward:0 },
  { chapter:1, stage: 5, recommend_cp:  3200, wave_count:3, enemy_atk:  360, enemy_hp:  3500, boss_atk:  650, boss_hp:  19000, stamina:4, gold_reward:  560, exp_reward: 300, gem_reward:10},
  { chapter:1, stage: 6, recommend_cp:  3900, wave_count:3, enemy_atk:  420, enemy_hp:  4400, boss_atk:  760, boss_hp:  24000, stamina:4, gold_reward:  680, exp_reward: 360, gem_reward:0 },
  { chapter:1, stage: 7, recommend_cp:  4700, wave_count:4, enemy_atk:  490, enemy_hp:  5400, boss_atk:  880, boss_hp:  30000, stamina:5, gold_reward:  820, exp_reward: 430, gem_reward:0 },
  { chapter:1, stage: 8, recommend_cp:  5600, wave_count:4, enemy_atk:  570, enemy_hp:  6600, boss_atk: 1020, boss_hp:  37000, stamina:5, gold_reward:  980, exp_reward: 510, gem_reward:15},
  { chapter:1, stage: 9, recommend_cp:  6600, wave_count:4, enemy_atk:  660, enemy_hp:  8000, boss_atk: 1180, boss_hp:  45000, stamina:5, gold_reward: 1160, exp_reward: 600, gem_reward:0 },
  { chapter:1, stage:10, recommend_cp:  8000, wave_count:5, enemy_atk:  780, enemy_hp:  9800, boss_atk: 1400, boss_hp:  56000, stamina:6, gold_reward: 1400, exp_reward: 720, gem_reward:30},
  // 챕터 2: 성장 (CP 9,000~40,000)
  { chapter:2, stage: 1, recommend_cp:  9500, wave_count:3, enemy_atk:  920, enemy_hp: 12000, boss_atk: 1650, boss_hp:  68000, stamina:5, gold_reward: 1700, exp_reward: 850, gem_reward:0 },
  { chapter:2, stage: 2, recommend_cp: 11500, wave_count:3, enemy_atk: 1100, enemy_hp: 14500, boss_atk: 1960, boss_hp:  83000, stamina:5, gold_reward: 2050, exp_reward:1020, gem_reward:0 },
  { chapter:2, stage: 3, recommend_cp: 13500, wave_count:4, enemy_atk: 1300, enemy_hp: 17500, boss_atk: 2320, boss_hp: 100000, stamina:6, gold_reward: 2440, exp_reward:1220, gem_reward:20},
  { chapter:2, stage: 4, recommend_cp: 16000, wave_count:4, enemy_atk: 1530, enemy_hp: 21000, boss_atk: 2740, boss_hp: 121000, stamina:6, gold_reward: 2900, exp_reward:1450, gem_reward:0 },
  { chapter:2, stage: 5, recommend_cp: 19000, wave_count:4, enemy_atk: 1800, enemy_hp: 25500, boss_atk: 3240, boss_hp: 146000, stamina:6, gold_reward: 3450, exp_reward:1720, gem_reward:30},
  { chapter:2, stage: 6, recommend_cp: 22500, wave_count:4, enemy_atk: 2120, enemy_hp: 30500, boss_atk: 3820, boss_hp: 176000, stamina:7, gold_reward: 4100, exp_reward:2040, gem_reward:0 },
  { chapter:2, stage: 7, recommend_cp: 26500, wave_count:5, enemy_atk: 2500, enemy_hp: 37000, boss_atk: 4500, boss_hp: 212000, stamina:7, gold_reward: 4860, exp_reward:2420, gem_reward:0 },
  { chapter:2, stage: 8, recommend_cp: 31000, wave_count:5, enemy_atk: 2940, enemy_hp: 44500, boss_atk: 5300, boss_hp: 255000, stamina:7, gold_reward: 5760, exp_reward:2880, gem_reward:40},
  { chapter:2, stage: 9, recommend_cp: 36000, wave_count:5, enemy_atk: 3450, enemy_hp: 53500, boss_atk: 6220, boss_hp: 306000, stamina:8, gold_reward: 6820, exp_reward:3400, gem_reward:0 },
  { chapter:2, stage:10, recommend_cp: 42000, wave_count:6, enemy_atk: 4060, enemy_hp: 64500, boss_atk: 7320, boss_hp: 368000, stamina:8, gold_reward: 8080, exp_reward:4040, gem_reward:60},
  // 챕터 3: 도전 (CP 50,000~200,000)
  { chapter:3, stage: 1, recommend_cp:  50000, wave_count:4, enemy_atk:  4780, enemy_hp:  78000, boss_atk:  8620, boss_hp:  442000, stamina:8,  gold_reward: 9600,  exp_reward: 4800, gem_reward:0  },
  { chapter:3, stage: 2, recommend_cp:  60000, wave_count:4, enemy_atk:  5620, enemy_hp:  94000, boss_atk: 10140, boss_hp:  530000, stamina:8,  gold_reward:11360,  exp_reward: 5680, gem_reward:0  },
  { chapter:3, stage: 3, recommend_cp:  72000, wave_count:5, enemy_atk:  6610, enemy_hp: 113000, boss_atk: 11940, boss_hp:  636000, stamina:9,  gold_reward:13440,  exp_reward: 6720, gem_reward:50 },
  { chapter:3, stage: 4, recommend_cp:  86000, wave_count:5, enemy_atk:  7780, enemy_hp: 136000, boss_atk: 14040, boss_hp:  763000, stamina:9,  gold_reward:15880,  exp_reward: 7940, gem_reward:0  },
  { chapter:3, stage: 5, recommend_cp: 103000, wave_count:5, enemy_atk:  9150, enemy_hp: 163000, boss_atk: 16520, boss_hp:  915000, stamina:10, gold_reward:18760,  exp_reward: 9380, gem_reward:80 },
  { chapter:3, stage: 6, recommend_cp: 123000, wave_count:5, enemy_atk: 10760, enemy_hp: 196000, boss_atk: 19440, boss_hp: 1098000, stamina:10, gold_reward:22160,  exp_reward:11080, gem_reward:0  },
  { chapter:3, stage: 7, recommend_cp: 147000, wave_count:6, enemy_atk: 12660, enemy_hp: 235000, boss_atk: 22860, boss_hp: 1318000, stamina:10, gold_reward:26180,  exp_reward:13080, gem_reward:0  },
  { chapter:3, stage: 8, recommend_cp: 176000, wave_count:6, enemy_atk: 14900, enemy_hp: 282000, boss_atk: 26900, boss_hp: 1581000, stamina:11, gold_reward:30920,  exp_reward:15460, gem_reward:100},
  { chapter:3, stage: 9, recommend_cp: 210000, wave_count:6, enemy_atk: 17520, enemy_hp: 338000, boss_atk: 31640, boss_hp: 1897000, stamina:11, gold_reward:36520,  exp_reward:18260, gem_reward:0  },
  { chapter:3, stage:10, recommend_cp: 250000, wave_count:7, enemy_atk: 20620, enemy_hp: 406000, boss_atk: 37240, boss_hp: 2276000, stamina:12, gold_reward:43120,  exp_reward:21560, gem_reward:150},
];
for (const d of stageRows) upsertRow(stages.id, undefined, d);
console.log(`✓ stages ${stageRows.length}행 (챕터 1~3 × 10스테이지)`);

// ─── equipment (장비) ─────────────────────────────────────────────────────────
const equipment = createTable({ project_id: proj.id, name: "equipment", description: "장비 아이템 스탯", order_index: 5 });
addColumn({ table_id: equipment.id, name: "name",        type: "string",  order_index: 1 });
addColumn({ table_id: equipment.id, name: "slot",        type: "enum",    order_index: 2, enum_type_id: equipSlotEnum.id });
addColumn({ table_id: equipment.id, name: "grade",       type: "enum",    order_index: 3, enum_type_id: equipGradeEnum.id });
addColumn({ table_id: equipment.id, name: "set_name",    type: "string",  order_index: 4, description: "세트 이름 (없으면 빈 값)" });
addColumn({ table_id: equipment.id, name: "atk_flat",    type: "number",  order_index: 5, description: "공격력 고정 추가" });
addColumn({ table_id: equipment.id, name: "atk_pct",     type: "number",  order_index: 6, description: "공격력 % 추가" });
addColumn({ table_id: equipment.id, name: "hp_flat",     type: "number",  order_index: 7 });
addColumn({ table_id: equipment.id, name: "hp_pct",      type: "number",  order_index: 8 });
addColumn({ table_id: equipment.id, name: "def_flat",    type: "number",  order_index: 9 });
addColumn({ table_id: equipment.id, name: "crit_rate",   type: "number",  order_index: 10 });
addColumn({ table_id: equipment.id, name: "crit_dmg",    type: "number",  order_index: 11 });

const equipRows = [
  { name: "전설의 대검",     slot: "Weapon",   grade: "Legend", set_name: "Conqueror", atk_flat: 680, atk_pct: 22, hp_flat:    0, hp_pct:  0, def_flat:   0, crit_rate:  0, crit_dmg: 20 },
  { name: "멸망의 활",       slot: "Weapon",   grade: "Legend", set_name: "Destroyer", atk_flat: 620, atk_pct: 18, hp_flat:    0, hp_pct:  0, def_flat:   0, crit_rate: 12, crit_dmg: 25 },
  { name: "용사의 판금갑옷", slot: "Armor",    grade: "Legend", set_name: "Conqueror", atk_flat:   0, atk_pct:  8, hp_flat: 4200, hp_pct: 18, def_flat: 380, crit_rate:  0, crit_dmg:  0 },
  { name: "빛의 로브",       slot: "Armor",    grade: "Legend", set_name: "",          atk_flat: 120, atk_pct: 14, hp_flat: 2400, hp_pct: 12, def_flat: 180, crit_rate:  8, crit_dmg:  0 },
  { name: "영웅의 검",       slot: "Weapon",   grade: "Epic",   set_name: "Valor",     atk_flat: 480, atk_pct: 15, hp_flat:    0, hp_pct:  0, def_flat:   0, crit_rate:  0, crit_dmg: 15 },
  { name: "마력 지팡이",     slot: "Weapon",   grade: "Epic",   set_name: "",          atk_flat: 420, atk_pct: 12, hp_flat:    0, hp_pct:  0, def_flat:   0, crit_rate:  6, crit_dmg: 18 },
  { name: "강철 갑옷",       slot: "Armor",    grade: "Epic",   set_name: "Valor",     atk_flat:   0, atk_pct:  5, hp_flat: 2800, hp_pct: 12, def_flat: 260, crit_rate:  0, crit_dmg:  0 },
  { name: "정령의 로브",     slot: "Armor",    grade: "Epic",   set_name: "",          atk_flat:  80, atk_pct:  9, hp_flat: 1600, hp_pct:  8, def_flat: 120, crit_rate:  5, crit_dmg:  0 },
  { name: "용기의 반지",     slot: "Ring",     grade: "Epic",   set_name: "Valor",     atk_flat: 160, atk_pct:  8, hp_flat:  800, hp_pct:  5, def_flat:   0, crit_rate:  6, crit_dmg: 12 },
  { name: "수호의 목걸이",   slot: "Necklace", grade: "Epic",   set_name: "",          atk_flat:   0, atk_pct:  4, hp_flat: 2000, hp_pct: 10, def_flat: 180, crit_rate:  0, crit_dmg:  0 },
  { name: "기사의 검",       slot: "Weapon",   grade: "Rare",   set_name: "",          atk_flat: 280, atk_pct:  8, hp_flat:    0, hp_pct:  0, def_flat:   0, crit_rate:  0, crit_dmg:  8 },
  { name: "기사의 갑옷",     slot: "Armor",    grade: "Rare",   set_name: "",          atk_flat:   0, atk_pct:  3, hp_flat: 1600, hp_pct:  7, def_flat: 150, crit_rate:  0, crit_dmg:  0 },
  { name: "은 반지",         slot: "Ring",     grade: "Rare",   set_name: "",          atk_flat:  90, atk_pct:  4, hp_flat:  500, hp_pct:  3, def_flat:   0, crit_rate:  4, crit_dmg:  6 },
  { name: "은 목걸이",       slot: "Necklace", grade: "Rare",   set_name: "",          atk_flat:   0, atk_pct:  2, hp_flat: 1100, hp_pct:  5, def_flat: 100, crit_rate:  0, crit_dmg:  0 },
  { name: "철 검",           slot: "Weapon",   grade: "Common", set_name: "",          atk_flat: 120, atk_pct:  3, hp_flat:    0, hp_pct:  0, def_flat:   0, crit_rate:  0, crit_dmg:  0 },
  { name: "철 갑옷",         slot: "Armor",    grade: "Common", set_name: "",          atk_flat:   0, atk_pct:  0, hp_flat:  700, hp_pct:  3, def_flat:  70, crit_rate:  0, crit_dmg:  0 },
];
for (const d of equipRows) upsertRow(equipment.id, undefined, d);
console.log(`✓ equipment ${equipRows.length}행`);

// ─── gacha (뽑기 확률) ────────────────────────────────────────────────────────
const gacha = createTable({ project_id: proj.id, name: "gacha", description: "뽑기 풀 확률 설정", order_index: 6 });
addColumn({ table_id: gacha.id, name: "pool_name",   type: "string",  order_index: 1 });
addColumn({ table_id: gacha.id, name: "grade",       type: "enum",    order_index: 2, enum_type_id: gradeEnum.id });
addColumn({ table_id: gacha.id, name: "base_rate",   type: "number",  order_index: 3, description: "기본 확률 (%)" });
addColumn({ table_id: gacha.id, name: "pity_start",  type: "number",  order_index: 4, description: "연속 실패 시 확률 증가 시작 횟수" });
addColumn({ table_id: gacha.id, name: "pity_cap",    type: "number",  order_index: 5, description: "천장 (이 횟수에 100% 보장)" });
addColumn({ table_id: gacha.id, name: "cost_gem",    type: "number",  order_index: 6, description: "1회 소모 젬" });
addColumn({ table_id: gacha.id, name: "is_pickup",   type: "boolean", order_index: 7 });

const gachaRows = [
  { pool_name: "일반 소환", grade: "SSR", base_rate:  1.5, pity_start: 75, pity_cap: 90, cost_gem: 300, is_pickup: false },
  { pool_name: "일반 소환", grade: "SR",  base_rate: 13.5, pity_start:  0, pity_cap:  0, cost_gem: 300, is_pickup: false },
  { pool_name: "일반 소환", grade: "R",   base_rate: 71.0, pity_start:  0, pity_cap:  0, cost_gem: 300, is_pickup: false },
  { pool_name: "일반 소환", grade: "N",   base_rate: 14.0, pity_start:  0, pity_cap:  0, cost_gem: 300, is_pickup: false },
  { pool_name: "픽업 소환", grade: "SSR", base_rate:  2.0, pity_start: 60, pity_cap: 80, cost_gem: 300, is_pickup: true  },
  { pool_name: "픽업 소환", grade: "SR",  base_rate: 13.0, pity_start:  0, pity_cap:  0, cost_gem: 300, is_pickup: false },
  { pool_name: "픽업 소환", grade: "R",   base_rate: 70.0, pity_start:  0, pity_cap:  0, cost_gem: 300, is_pickup: false },
  { pool_name: "픽업 소환", grade: "N",   base_rate: 15.0, pity_start:  0, pity_cap:  0, cost_gem: 300, is_pickup: false },
  { pool_name: "장비 소환", grade: "SSR", base_rate:  3.0, pity_start: 50, pity_cap: 80, cost_gem: 200, is_pickup: false },
  { pool_name: "장비 소환", grade: "SR",  base_rate: 17.0, pity_start:  0, pity_cap:  0, cost_gem: 200, is_pickup: false },
  { pool_name: "장비 소환", grade: "R",   base_rate: 55.0, pity_start:  0, pity_cap:  0, cost_gem: 200, is_pickup: false },
  { pool_name: "장비 소환", grade: "N",   base_rate: 25.0, pity_start:  0, pity_cap:  0, cost_gem: 200, is_pickup: false },
];
for (const d of gachaRows) upsertRow(gacha.id, undefined, d);
console.log(`✓ gacha ${gachaRows.length}행`);

// ─── 관계 ─────────────────────────────────────────────────────────────────────
setRelation({ project_id: proj.id, from_table_id: heroes.id,    from_column: "skill_id", to_table_id: skills.id,    to_column: "skill_id" });
setRelation({ project_id: proj.id, from_table_id: heroes.id,    from_column: "grade",    to_table_id: gacha.id,     to_column: "grade" });
setRelation({ project_id: proj.id, from_table_id: equipment.id, from_column: "grade",    to_table_id: gacha.id,     to_column: "grade" });
console.log("✓ 관계 3개");

// ─── 시뮬레이션 ───────────────────────────────────────────────────────────────
saveSimulation({
  project_id: proj.id,
  name: "아이제아 Lv50 +7강화 최종 스탯",
  description: "SSR 딜러 아이제아의 레벨 50, 강화 +7 기준 최종 스탯 계산",
  input_tables: [heroes.id, heroLevels.id, enhancement.id],
  result: {
    character: "아이제아",
    conditions: { level: 50, enhance: 7 },
    base:  { atk: 720,  hp: 4800, def: 260 },
    level_bonus: { atk: 1520, hp: 9040, def: 608 },
    enhance_bonus_pct: 38,
    final: {
      atk: Math.round((720 + 1520) * (1 + 38 / 100)),
      hp:  Math.round((4800 + 9040) * (1 + 32 / 100)),
      def: Math.round((260 + 608)  * (1 + 32 / 100)),
    },
  },
});

saveSimulation({
  project_id: proj.id,
  name: "챕터별 권장 CP 성장 곡선",
  description: "30개 스테이지의 권장 전투력 증가율 분석",
  input_tables: [stages.id],
});
console.log("✓ 시뮬레이션 2개");

// ─── 경제 시나리오 ─────────────────────────────────────────────────────────────
saveEconomyScenario(proj.id, "무과금 30일 젬 수급", {
  sources: [
    { name: "일일 퀘스트",     amount: 60,  every: 1 },
    { name: "주간 퀘스트",     amount: 280, every: 7 },
    { name: "스테이지 클리어", amount: 50,  every: 1 },
    { name: "이벤트 (평균)",   amount: 80,  every: 3 },
    { name: "출석 체크",       amount: 30,  every: 1 },
  ],
  sinks: [
    { name: "영웅 소환 10연", amount: 3000, every: 7 },
    { name: "장비 소환 10연", amount: 2000, every: 7 },
  ],
  days: 30,
  start: 500,
});

saveEconomyScenario(proj.id, "월정액 30일 젬 수급", {
  sources: [
    { name: "일일 퀘스트",      amount: 60,   every: 1  },
    { name: "주간 퀘스트",      amount: 280,  every: 7  },
    { name: "스테이지 클리어",  amount: 50,   every: 1  },
    { name: "이벤트 (평균)",    amount: 80,   every: 3  },
    { name: "출석 체크",        amount: 30,   every: 1  },
    { name: "월정액 일일 지급", amount: 100,  every: 1  },
    { name: "월정액 일시 지급", amount: 1200, every: 30 },
  ],
  sinks: [
    { name: "영웅 소환 10연", amount: 3000, every: 4 },
    { name: "장비 소환 10연", amount: 2000, every: 5 },
    { name: "스태미나 충전",  amount: 150,  every: 1 },
  ],
  days: 30,
  start: 3000,
});
console.log("✓ 경제 시나리오 2개 (무과금/월정액)");

// ─── 완료 ─────────────────────────────────────────────────────────────────────
console.log("\n✅ 방치형 RPG 데모 생성 완료!");
console.log(`   프로젝트 ID: ${proj.id}`);
console.log("   테이블: heroes / hero_levels / enhancement / skills / stages / equipment / gacha");
console.log("   Enum: Grade / Element / SkillType / EquipSlot / EquipGrade");
console.log("   스테이지: 챕터 3 × 10단계 = 30개 | 레벨 성장: 1~50 | 강화: +0~+15");
