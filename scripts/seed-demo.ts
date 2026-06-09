/**
 * 데모 프로젝트 시드 스크립트
 * 모든 메뉴(프로젝트·스키마·데이터·타입·밸런싱·시뮬레이션·경제·관계·스냅샷)를 체험할 수 있는 더미 데이터 생성
 *
 * 실행: npm run seed-demo
 */

import { createProject } from "../src/lib/db/repo/projects.js";
import { createTable } from "../src/lib/db/repo/tables.js";
import { addColumn, updateColumn, listColumns } from "../src/lib/db/repo/columns.js";
import { upsertRow, readRows } from "../src/lib/db/repo/rows.js";
import { createEnumType } from "../src/lib/db/repo/enumTypes.js";
import { setRelation } from "../src/lib/db/repo/relations.js";
import { createSnapshot } from "../src/lib/db/repo/snapshots.js";
import { saveSimulation } from "../src/lib/db/repo/simulations.js";
import { saveEconomyScenario } from "../src/lib/db/repo/economy.js";

// ─── 프로젝트 ────────────────────────────────────────────────────────────────
const proj = createProject({
  name: "수집형 RPG 데모",
  genre: "수집형 RPG",
  description: "Game Data Studio 모든 기능을 체험할 수 있는 더미 프로젝트입니다.",
});
console.log(`✓ 프로젝트: ${proj.name} (${proj.id})`);

// ─── Enum 타입 (타입 메뉴) ────────────────────────────────────────────────────
const gradeEnum    = createEnumType({ project_id: proj.id, name: "Grade",        values: ["SSR", "SR", "R"] });
const elementEnum  = createEnumType({ project_id: proj.id, name: "Element",      values: ["빛", "불", "물", "바람", "땅", "어둠"] });
const skillTypeEnum= createEnumType({ project_id: proj.id, name: "SkillType",    values: ["단일", "광역", "버프", "디버프"] });
const itemCatEnum  = createEnumType({ project_id: proj.id, name: "ItemCategory", values: ["장비", "소비", "재료"] });
console.log("✓ Enum 타입 4개 생성 (Grade / Element / SkillType / ItemCategory)");

// ─── characters (스키마·데이터·밸런싱 메뉴) ──────────────────────────────────
const characters = createTable({ project_id: proj.id, name: "characters", description: "플레이어가 수집하는 캐릭터", order_index: 0 });
addColumn({ table_id: characters.id, name: "name",     type: "string",  description: "캐릭터 이름",    order_index: 1 });
addColumn({ table_id: characters.id, name: "grade",    type: "enum",    description: "등급",            order_index: 2, enum_type_id: gradeEnum.id });
addColumn({ table_id: characters.id, name: "element",  type: "enum",    description: "속성",            order_index: 3, enum_type_id: elementEnum.id });
addColumn({ table_id: characters.id, name: "hp",       type: "number",  description: "기본 HP",         order_index: 4 });
addColumn({ table_id: characters.id, name: "atk",      type: "number",  description: "기본 공격력",     order_index: 5 });
addColumn({ table_id: characters.id, name: "def",      type: "number",  description: "기본 방어력",     order_index: 6 });
addColumn({ table_id: characters.id, name: "spd",      type: "number",  description: "기본 속도",       order_index: 7 });
addColumn({ table_id: characters.id, name: "skill_id", type: "string",  description: "보유 스킬 코드",  order_index: 8 });
addColumn({ table_id: characters.id, name: "cost",     type: "number",  description: "가챠 비용 (젬)",  order_index: 9 });

const charRows = [
  { name: "아르테미스", grade: "SSR", element: "빛",   hp: 4800, atk: 620, def: 280, spd: 115, skill_id: "SK001", cost: 300 },
  { name: "드라코",     grade: "SSR", element: "불",   hp: 5200, atk: 700, def: 240, spd: 108, skill_id: "SK002", cost: 300 },
  { name: "실비아",     grade: "SR",  element: "물",   hp: 4200, atk: 540, def: 310, spd: 121, skill_id: "SK003", cost: 300 },
  { name: "레온",       grade: "SR",  element: "바람", hp: 3900, atk: 580, def: 260, spd: 130, skill_id: "SK004", cost: 300 },
  { name: "카이로스",   grade: "SR",  element: "어둠", hp: 4500, atk: 560, def: 295, spd: 118, skill_id: "SK005", cost: 300 },
  { name: "루나",       grade: "R",   element: "땅",   hp: 3600, atk: 490, def: 320, spd: 105, skill_id: "SK006", cost: 300 },
  { name: "제이든",     grade: "R",   element: "불",   hp: 3400, atk: 510, def: 275, spd: 112, skill_id: "SK007", cost: 300 },
  { name: "미아",       grade: "R",   element: "물",   hp: 3500, atk: 475, def: 305, spd: 119, skill_id: "SK008", cost: 300 },
];
for (const d of charRows) upsertRow(characters.id, undefined, d);
console.log(`✓ characters ${charRows.length}행`);

// ─── skills ───────────────────────────────────────────────────────────────────
const skills = createTable({ project_id: proj.id, name: "skills", description: "캐릭터 스킬 정의", order_index: 1 });
addColumn({ table_id: skills.id, name: "skill_id",    type: "string",  description: "스킬 코드",       order_index: 1 });
addColumn({ table_id: skills.id, name: "name",        type: "string",  description: "스킬 이름",       order_index: 2 });
addColumn({ table_id: skills.id, name: "type",        type: "enum",    description: "스킬 유형",       order_index: 3, enum_type_id: skillTypeEnum.id });
addColumn({ table_id: skills.id, name: "cooldown",    type: "number",  description: "쿨타임 (턴)",     order_index: 4 });
addColumn({ table_id: skills.id, name: "mp_cost",     type: "number",  description: "MP 소모",          order_index: 5 });
addColumn({ table_id: skills.id, name: "power_ratio", type: "number",  description: "공격력 배율 (%)", order_index: 6 });
addColumn({ table_id: skills.id, name: "description", type: "string",  description: "스킬 설명",       order_index: 7 });

const skillRows = [
  { skill_id: "SK001", name: "성광의 화살",  type: "단일",  cooldown: 3, mp_cost: 30, power_ratio: 280, description: "빛의 화살로 단일 적 강타" },
  { skill_id: "SK002", name: "용염 폭발",    type: "광역",  cooldown: 4, mp_cost: 45, power_ratio: 220, description: "화염 폭발로 전체 적에게 피해" },
  { skill_id: "SK003", name: "조류 치유",    type: "버프",  cooldown: 3, mp_cost: 35, power_ratio:   0, description: "아군 전체 HP 18% 회복" },
  { skill_id: "SK004", name: "폭풍 연격",    type: "단일",  cooldown: 2, mp_cost: 25, power_ratio: 195, description: "바람을 타고 3연속 공격" },
  { skill_id: "SK005", name: "어둠의 낫",    type: "광역",  cooldown: 4, mp_cost: 50, power_ratio: 240, description: "어둠 광역 + 2턴 독" },
  { skill_id: "SK006", name: "대지 분쇄",    type: "단일",  cooldown: 3, mp_cost: 30, power_ratio: 210, description: "지면 내리쳐 단일 적 강타" },
  { skill_id: "SK007", name: "불꽃 찌르기",  type: "단일",  cooldown: 2, mp_cost: 20, power_ratio: 170, description: "화염 찌르기 + 화상 1턴" },
  { skill_id: "SK008", name: "물의 보호막",  type: "버프",  cooldown: 4, mp_cost: 40, power_ratio:   0, description: "아군 전체 2턴 피해 감소" },
];
for (const d of skillRows) upsertRow(skills.id, undefined, d);
console.log(`✓ skills ${skillRows.length}행`);

// ─── items ────────────────────────────────────────────────────────────────────
const items = createTable({ project_id: proj.id, name: "items", description: "장비·소비 아이템", order_index: 2 });
addColumn({ table_id: items.id, name: "name",        type: "string",  description: "아이템 이름",   order_index: 1 });
addColumn({ table_id: items.id, name: "category",    type: "enum",    description: "카테고리",       order_index: 2, enum_type_id: itemCatEnum.id });
addColumn({ table_id: items.id, name: "grade",       type: "enum",    description: "등급",           order_index: 3, enum_type_id: gradeEnum.id });
addColumn({ table_id: items.id, name: "sell_price",  type: "number",  description: "판매 가격 (골드)", order_index: 4 });
addColumn({ table_id: items.id, name: "atk_bonus",   type: "number",  description: "공격력 추가",   order_index: 5 });
addColumn({ table_id: items.id, name: "def_bonus",   type: "number",  description: "방어력 추가",   order_index: 6 });
addColumn({ table_id: items.id, name: "hp_bonus",    type: "number",  description: "HP 추가",        order_index: 7 });
addColumn({ table_id: items.id, name: "description", type: "string",  description: "아이템 설명",   order_index: 8 });

const itemRows = [
  { name: "폭풍의 검",     category: "장비", grade: "SSR", sell_price: 5000, atk_bonus: 180, def_bonus:   0, hp_bonus:    0, description: "폭풍 속성의 전설 검" },
  { name: "수호의 갑옷",   category: "장비", grade: "SSR", sell_price: 4800, atk_bonus:   0, def_bonus: 210, hp_bonus:  600, description: "전설 수호자의 갑옷" },
  { name: "날카로운 검",   category: "장비", grade: "SR",  sell_price: 2000, atk_bonus: 120, def_bonus:   0, hp_bonus:    0, description: "잘 벼려진 검" },
  { name: "철의 방패",     category: "장비", grade: "SR",  sell_price: 1800, atk_bonus:   0, def_bonus: 150, hp_bonus:  300, description: "단단한 철 방패" },
  { name: "강철 단검",     category: "장비", grade: "R",   sell_price:  800, atk_bonus:  60, def_bonus:   0, hp_bonus:    0, description: "기본 강철 단검" },
  { name: "HP 포션 (소)",  category: "소비", grade: "R",   sell_price:  100, atk_bonus:   0, def_bonus:   0, hp_bonus:  500, description: "HP 500 회복" },
  { name: "HP 포션 (대)",  category: "소비", grade: "SR",  sell_price:  500, atk_bonus:   0, def_bonus:   0, hp_bonus: 2000, description: "HP 2000 회복" },
  { name: "공격의 룬",     category: "재료", grade: "R",   sell_price:  200, atk_bonus:  30, def_bonus:   0, hp_bonus:    0, description: "장비 강화 재료" },
  { name: "수호의 룬",     category: "재료", grade: "R",   sell_price:  200, atk_bonus:   0, def_bonus:  40, hp_bonus:    0, description: "장비 강화 재료" },
];
for (const d of itemRows) upsertRow(items.id, undefined, d);
console.log(`✓ items ${itemRows.length}행`);

// ─── stages ───────────────────────────────────────────────────────────────────
const stages = createTable({ project_id: proj.id, name: "stages", description: "스테이지 구성 데이터", order_index: 3 });
addColumn({ table_id: stages.id, name: "stage_id",     type: "string",  description: "스테이지 코드",    order_index: 1 });
addColumn({ table_id: stages.id, name: "chapter",      type: "number",  description: "챕터",             order_index: 2 });
addColumn({ table_id: stages.id, name: "stage",        type: "number",  description: "스테이지 번호",    order_index: 3 });
addColumn({ table_id: stages.id, name: "recommend_cp", type: "number",  description: "권장 전투력",      order_index: 4 });
addColumn({ table_id: stages.id, name: "enemy_count",  type: "number",  description: "적 수",            order_index: 5 });
addColumn({ table_id: stages.id, name: "boss_hp",      type: "number",  description: "보스 HP",          order_index: 6 });
addColumn({ table_id: stages.id, name: "stamina",      type: "number",  description: "소모 스태미나",    order_index: 7 });
addColumn({ table_id: stages.id, name: "exp_reward",   type: "number",  description: "획득 경험치",      order_index: 8 });
addColumn({ table_id: stages.id, name: "gold_reward",  type: "number",  description: "획득 골드",        order_index: 9 });

const stageRows = [
  { stage_id: "1-1", chapter: 1, stage: 1, recommend_cp:   1000, enemy_count: 3, boss_hp:   5000, stamina: 3, exp_reward:  120, gold_reward:   200 },
  { stage_id: "1-2", chapter: 1, stage: 2, recommend_cp:   1200, enemy_count: 4, boss_hp:   7000, stamina: 3, exp_reward:  150, gold_reward:   250 },
  { stage_id: "1-3", chapter: 1, stage: 3, recommend_cp:   1500, enemy_count: 5, boss_hp:  10000, stamina: 3, exp_reward:  200, gold_reward:   350 },
  { stage_id: "2-1", chapter: 2, stage: 1, recommend_cp:   2500, enemy_count: 4, boss_hp:  15000, stamina: 4, exp_reward:  350, gold_reward:   500 },
  { stage_id: "2-2", chapter: 2, stage: 2, recommend_cp:   3000, enemy_count: 5, boss_hp:  20000, stamina: 4, exp_reward:  420, gold_reward:   620 },
  { stage_id: "2-3", chapter: 2, stage: 3, recommend_cp:   3500, enemy_count: 6, boss_hp:  28000, stamina: 4, exp_reward:  520, gold_reward:   800 },
  { stage_id: "3-1", chapter: 3, stage: 1, recommend_cp:   5000, enemy_count: 5, boss_hp:  40000, stamina: 5, exp_reward:  750, gold_reward:  1100 },
  { stage_id: "3-2", chapter: 3, stage: 2, recommend_cp:   6000, enemy_count: 6, boss_hp:  55000, stamina: 5, exp_reward:  900, gold_reward:  1350 },
  { stage_id: "3-3", chapter: 3, stage: 3, recommend_cp:   7500, enemy_count: 7, boss_hp:  75000, stamina: 5, exp_reward: 1200, gold_reward:  1800 },
  { stage_id: "4-1", chapter: 4, stage: 1, recommend_cp:  10000, enemy_count: 6, boss_hp: 100000, stamina: 6, exp_reward: 1600, gold_reward:  2400 },
];
for (const d of stageRows) upsertRow(stages.id, undefined, d);
console.log(`✓ stages ${stageRows.length}행`);

// ─── gacha_tables ─────────────────────────────────────────────────────────────
const gacha = createTable({ project_id: proj.id, name: "gacha_tables", description: "가챠 확률 설정", order_index: 4 });
addColumn({ table_id: gacha.id, name: "pool_name",  type: "string",  description: "풀 이름",       order_index: 1 });
addColumn({ table_id: gacha.id, name: "grade",      type: "enum",    description: "등급",           order_index: 2, enum_type_id: gradeEnum.id });
addColumn({ table_id: gacha.id, name: "base_rate",  type: "number",  description: "기본 확률 (%)", order_index: 3 });
addColumn({ table_id: gacha.id, name: "pity_count", type: "number",  description: "천장 횟수",     order_index: 4 });
addColumn({ table_id: gacha.id, name: "pity_rate",  type: "number",  description: "천장 확률 (%)", order_index: 5 });
addColumn({ table_id: gacha.id, name: "cost_gem",   type: "number",  description: "1회 소모 젬",   order_index: 6 });
addColumn({ table_id: gacha.id, name: "is_pickup",  type: "boolean", description: "픽업 여부",     order_index: 7 });

const gachaRows = [
  { pool_name: "일반 소환",   grade: "SSR", base_rate:  1.5, pity_count: 100, pity_rate: 100, cost_gem: 300, is_pickup: false },
  { pool_name: "일반 소환",   grade: "SR",  base_rate:  8.5, pity_count:  10, pity_rate: 100, cost_gem: 300, is_pickup: false },
  { pool_name: "일반 소환",   grade: "R",   base_rate: 90.0, pity_count:   0, pity_rate:   0, cost_gem: 300, is_pickup: false },
  { pool_name: "픽업 소환",   grade: "SSR", base_rate:  2.0, pity_count:  80, pity_rate: 100, cost_gem: 300, is_pickup: true  },
  { pool_name: "픽업 소환",   grade: "SR",  base_rate:  8.0, pity_count:  10, pity_rate: 100, cost_gem: 300, is_pickup: true  },
  { pool_name: "픽업 소환",   grade: "R",   base_rate: 90.0, pity_count:   0, pity_rate:   0, cost_gem: 300, is_pickup: false },
  { pool_name: "초보자 소환", grade: "SSR", base_rate:  4.0, pity_count:  50, pity_rate: 100, cost_gem: 150, is_pickup: true  },
  { pool_name: "초보자 소환", grade: "SR",  base_rate: 16.0, pity_count:  10, pity_rate: 100, cost_gem: 150, is_pickup: false },
  { pool_name: "초보자 소환", grade: "R",   base_rate: 80.0, pity_count:   0, pity_rate:   0, cost_gem: 150, is_pickup: false },
];
for (const d of gachaRows) upsertRow(gacha.id, undefined, d);
console.log(`✓ gacha_tables ${gachaRows.length}행`);

// ─── 관계 (relations 메뉴) ────────────────────────────────────────────────────
setRelation({ project_id: proj.id, from_table_id: characters.id, from_column: "skill_id", to_table_id: skills.id, to_column: "skill_id" });
setRelation({ project_id: proj.id, from_table_id: gacha.id,      from_column: "pool_name", to_table_id: items.id, to_column: "name" });
console.log("✓ 관계 2개 (characters.skill_id → skills.skill_id, gacha_tables.pool_name → items.name)");

// ─── 스냅샷 (snapshots 메뉴) ─────────────────────────────────────────────────
const charData = readRows(characters.id);
createSnapshot(characters.id, "v1.0 캐릭터 출시 초안", charData);

const stageData = readRows(stages.id);
createSnapshot(stages.id, "챕터 1~3 스테이지 확정본", stageData.filter((r) => (r.data as { chapter?: number }).chapter !== undefined && (r.data as { chapter?: number }).chapter! <= 3));
console.log("✓ 스냅샷 2개 (characters / stages)");

// ─── 시뮬레이션 (시뮬레이션 메뉴) ────────────────────────────────────────────
saveSimulation({
  project_id: proj.id,
  name: "캐릭터 DPS 비교 (Lv.60)",
  description: "동일 레벨 60에서 공격력·배율·속도를 고려한 턴당 데미지 시뮬레이션",
  input_tables: [characters.id, skills.id],
  result: {
    columns: ["name", "grade", "dps_estimate", "rank"],
    rows: [
      { name: "드라코",     grade: "SSR", dps_estimate: 4550, rank: 1 },
      { name: "아르테미스", grade: "SSR", dps_estimate: 4020, rank: 2 },
      { name: "카이로스",   grade: "SR",  dps_estimate: 3180, rank: 3 },
      { name: "레온",       grade: "SR",  dps_estimate: 2970, rank: 4 },
      { name: "실비아",     grade: "SR",  dps_estimate: 2450, rank: 5 },
      { name: "제이든",     grade: "R",   dps_estimate: 1890, rank: 6 },
      { name: "미아",       grade: "R",   dps_estimate: 1750, rank: 7 },
      { name: "루나",       grade: "R",   dps_estimate: 1680, rank: 8 },
    ],
    note: "dps_estimate = atk * power_ratio/100 / cooldown",
  },
  formula_cs: `// Unity C# DPS 추정 수식 (Lv.60 기준)
float DpsEstimate(float atk, float powerRatio, int cooldown) {
    return atk * (powerRatio / 100f) / Mathf.Max(1, cooldown);
}`,
});

saveSimulation({
  project_id: proj.id,
  name: "스테이지 적정 전투력 곡선",
  description: "챕터별 권장 CP 증가율 — 등차·등비 구간 확인용",
  input_tables: [stages.id],
  result: {
    columns: ["stage_id", "recommend_cp", "cp_increase", "increase_rate_pct"],
    rows: [
      { stage_id: "1-1", recommend_cp:  1000, cp_increase:    0, increase_rate_pct:    0 },
      { stage_id: "1-2", recommend_cp:  1200, cp_increase:  200, increase_rate_pct:   20 },
      { stage_id: "1-3", recommend_cp:  1500, cp_increase:  300, increase_rate_pct:   25 },
      { stage_id: "2-1", recommend_cp:  2500, cp_increase: 1000, increase_rate_pct:   67 },
      { stage_id: "2-2", recommend_cp:  3000, cp_increase:  500, increase_rate_pct:   20 },
      { stage_id: "2-3", recommend_cp:  3500, cp_increase:  500, increase_rate_pct:   17 },
      { stage_id: "3-1", recommend_cp:  5000, cp_increase: 1500, increase_rate_pct:   43 },
      { stage_id: "3-2", recommend_cp:  6000, cp_increase: 1000, increase_rate_pct:   20 },
      { stage_id: "3-3", recommend_cp:  7500, cp_increase: 1500, increase_rate_pct:   25 },
      { stage_id: "4-1", recommend_cp: 10000, cp_increase: 2500, increase_rate_pct:   33 },
    ],
  },
});
console.log("✓ 시뮬레이션 2개 (DPS 비교 / 스테이지 CP 곡선)");

// ─── 경제 시나리오 (경제 메뉴) ────────────────────────────────────────────────
// sources/sinks: { amount, every } 형식 (projectEconomy 코어에 맞춤)
saveEconomyScenario(proj.id, "기본 과금 없는 플레이어 (30일)", {
  sources: [
    { label: "일일 퀘스트 젬",       amount: 60,   every: 1  },
    { label: "주간 보상 젬",         amount: 420,  every: 7  },
    { label: "스테이지 클리어 (평균)", amount: 80,  every: 1  },
    { label: "이벤트 보상 (평균)",    amount: 100,  every: 3  },
  ],
  sinks: [
    { label: "가챠 10연 (매주)",     amount: 3000, every: 7  },
    { label: "스태미나 구매",        amount: 150,  every: 2  },
  ],
  days: 30,
  start: 1000,
});

saveEconomyScenario(proj.id, "소과금 플레이어 월정액 (30일)", {
  sources: [
    { label: "일일 퀘스트 젬",       amount: 60,   every: 1  },
    { label: "주간 보상 젬",         amount: 420,  every: 7  },
    { label: "스테이지 클리어",      amount: 80,   every: 1  },
    { label: "이벤트 보상",          amount: 100,  every: 3  },
    { label: "월정액 보상",          amount: 100,  every: 1  },
  ],
  sinks: [
    { label: "가챠 10연 (격일)",     amount: 3000, every: 2  },
    { label: "스태미나 구매",        amount: 150,  every: 1  },
    { label: "한정 아이템 구매",     amount: 500,  every: 7  },
  ],
  days: 30,
  start: 5000,
});
console.log("✓ 경제 시나리오 2개 (무과금 / 소과금)");

console.log("\n데모 프로젝트 생성 완료!");
console.log(`  프로젝트 ID: ${proj.id}`);
console.log("  테이블: characters / skills / items / stages / gacha_tables");
console.log("  Enum 타입: Grade / Element / SkillType / ItemCategory");
console.log("  관계: 2개 | 스냅샷: 2개 | 시뮬레이션: 2개 | 경제 시나리오: 2개");
