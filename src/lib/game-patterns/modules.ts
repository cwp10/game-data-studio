import { SEED_TEMPLATES, type SeedTable } from "@/lib/genre-seeds";

interface FkIntent {
  fromTable: string;
  fromColumn: string;
  targetCandidates: string[];
}

interface OverlayModule {
  key: string;
  tables: SeedTable[];
  fkIntents: FkIntent[];
  skipFor?: string[];
  onlyFor?: string[];
}

export interface AssembledSchema {
  baseTables: string[];
  overlayTables: string[];
  allTables: SeedTable[];
  relations: Array<{ from_table: string; from_column: string; to_table: string; to_column: string }>;
}

// 사용처: assembleOverlays / getTableCountPreview 가 참조하는 기능 오버레이 정의 (internal only)
const FEATURE_MODULES: OverlayModule[] = [
  {
    key: "가챠·뽑기",
    tables: [
      { name: "gacha_pools", columns: [
        { name: "pool_name", type: "string" }, { name: "pool_type", type: "string" },
        { name: "cost_type", type: "string" }, { name: "cost_amount", type: "number" }, { name: "pity_limit", type: "number" },
      ] },
      { name: "gacha_pool_items", columns: [
        { name: "pool_id", type: "string" }, { name: "character_id", type: "string" },
        { name: "weight", type: "number" }, { name: "grade", type: "string" }, { name: "is_rate_up", type: "boolean" },
      ] },
    ],
    fkIntents: [
      { fromTable: "gacha_pool_items", fromColumn: "pool_id", targetCandidates: ["gacha_pools"] },
      { fromTable: "gacha_pool_items", fromColumn: "character_id", targetCandidates: ["characters", "heroes", "units"] },
    ],
    skipFor: ["collection_rpg"],
  },
  {
    key: "길드",
    tables: [
      { name: "guilds", columns: [
        { name: "name", type: "string" }, { name: "level", type: "number" },
        { name: "max_members", type: "number" }, { name: "min_power_req", type: "number" },
      ] },
      { name: "guild_members", columns: [
        { name: "guild_id", type: "string" }, { name: "role", type: "string" },
        { name: "contribution", type: "number" }, { name: "joined_at", type: "string" },
      ] },
    ],
    fkIntents: [
      { fromTable: "guild_members", fromColumn: "guild_id", targetCandidates: ["guilds"] },
    ],
  },
  {
    key: "레이드·던전",
    tables: [
      { name: "raids", columns: [
        { name: "name", type: "string" }, { name: "difficulty", type: "string" },
        { name: "boss_hp", type: "number" }, { name: "boss_atk", type: "number" },
        { name: "recommend_cp", type: "number" }, { name: "energy_cost", type: "number" },
      ] },
      { name: "raid_rewards", columns: [
        { name: "raid_id", type: "string" }, { name: "item_id", type: "string" },
        { name: "drop_rate", type: "number" }, { name: "min_count", type: "number" }, { name: "max_count", type: "number" },
      ] },
    ],
    fkIntents: [
      { fromTable: "raid_rewards", fromColumn: "raid_id", targetCandidates: ["raids"] },
      { fromTable: "raid_rewards", fromColumn: "item_id", targetCandidates: ["items", "equipment"] },
    ],
  },
  {
    key: "PvP",
    tables: [
      { name: "pvp_tiers", columns: [
        { name: "tier_name", type: "string" }, { name: "mmr_min", type: "number" },
        { name: "mmr_max", type: "number" }, { name: "reward_gold", type: "number" },
      ] },
      { name: "pvp_seasons", columns: [
        { name: "season_no", type: "number" }, { name: "start_date", type: "string" },
        { name: "end_date", type: "string" }, { name: "top_reward_type", type: "string" },
      ] },
    ],
    fkIntents: [],
    skipFor: ["mmorpg"],
  },
  {
    key: "시즌패스",
    tables: [
      { name: "season_pass", columns: [
        { name: "season_no", type: "number" }, { name: "level", type: "number" }, { name: "exp_required", type: "number" },
        { name: "free_reward_type", type: "string" }, { name: "free_reward_amount", type: "number" },
        { name: "premium_reward_type", type: "string" }, { name: "premium_reward_amount", type: "number" },
      ] },
      { name: "season_missions", columns: [
        { name: "name", type: "string" }, { name: "type", type: "string" },
        { name: "requirement_value", type: "number" }, { name: "exp_reward", type: "number" }, { name: "is_daily", type: "boolean" },
      ] },
    ],
    fkIntents: [],
  },
  {
    key: "강화",
    tables: [
      { name: "enhance_table", columns: [
        { name: "enhance_level", type: "number" }, { name: "success_rate", type: "number" },
        { name: "cost_gold", type: "number" }, { name: "stat_bonus", type: "number" },
      ] },
    ],
    fkIntents: [],
    skipFor: ["mmorpg"],
  },
  {
    key: "이벤트",
    tables: [
      { name: "events", columns: [
        { name: "name", type: "string" }, { name: "type", type: "string" },
        { name: "start_date", type: "string" }, { name: "end_date", type: "string" },
        { name: "reward_type", type: "string" }, { name: "reward_amount", type: "number" },
      ] },
    ],
    fkIntents: [],
    skipFor: ["roguelike_rpg"],
  },
  {
    key: "퀘스트",
    tables: [
      { name: "quests", columns: [
        { name: "name", type: "string" }, { name: "type", type: "string" },
        { name: "requirement_type", type: "string" }, { name: "requirement_value", type: "number" },
        { name: "reward_gold", type: "number" }, { name: "reward_gem", type: "number" },
      ] },
    ],
    fkIntents: [],
    skipFor: ["idle_rpg"],
  },
  {
    key: "전생",
    tables: [
      { name: "prestige_bonuses", columns: [
        { name: "prestige_level", type: "number" }, { name: "gold_mult", type: "number" }, { name: "dps_mult", type: "number" },
        { name: "unlock_reward_type", type: "string" }, { name: "unlock_reward_amount", type: "number" },
      ] },
    ],
    fkIntents: [],
    onlyFor: ["idle_rpg"],
  },
  {
    key: "랭킹·리더보드",
    tables: [
      { name: "leaderboards", columns: [
        { name: "board_type", type: "string" }, { name: "season_id", type: "string" },
        { name: "rank", type: "number" }, { name: "score", type: "number" },
        { name: "reward_type", type: "string" }, { name: "reward_amount", type: "number" },
      ] },
    ],
    fkIntents: [],
  },
  {
    key: "방치·경제",
    tables: [
      { name: "buildings", columns: [
        { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "level", type: "number" },
        { name: "gold_per_hour", type: "number" }, { name: "upgrade_cost", type: "number" }, { name: "upgrade_time_sec", type: "number" },
      ] },
      { name: "offline_rewards", columns: [
        { name: "hours_offline", type: "number" }, { name: "gold_reward", type: "number" }, { name: "efficiency", type: "number" },
      ] },
      { name: "economy_config", columns: [
        { name: "key", type: "string" }, { name: "value", type: "number" }, { name: "description", type: "string" },
      ] },
    ],
    fkIntents: [],
    skipFor: ["idle_rpg"],  // idle_rpg 베이스에는 이미 포함됨
  },
  {
    key: "도감",
    tables: [
      { name: "collection_records", columns: [
        { name: "entity_type", type: "string" }, { name: "entity_id", type: "string" },
        { name: "unlock_condition", type: "string" },
        { name: "reward_type", type: "string" }, { name: "reward_amount", type: "number" },
      ] },
    ],
    fkIntents: [
      { fromTable: "collection_records", fromColumn: "entity_id", targetCandidates: ["characters", "heroes", "units"] },
    ],
  },
];

// UI 칩 렌더링용 그룹 정의
export const FEATURE_GROUPS: Array<{ label: string; keys: string[] }> = [
  { label: "수집·뽑기", keys: ["가챠·뽑기", "도감"] },
  { label: "소셜·경쟁", keys: ["길드", "PvP", "랭킹·리더보드"] },
  { label: "콘텐츠", keys: ["레이드·던전", "이벤트", "퀘스트", "전생"] },
  { label: "경제·운영", keys: ["시즌패스", "강화", "방치·경제"] },
];

// 적용 가능 여부 판정: skipFor 에 baseGenre 포함 시 제외, onlyFor 지정 시 해당 장르만 허용
function moduleApplies(mod: OverlayModule, baseGenre: string): boolean {
  if (mod.skipFor?.includes(baseGenre)) return false;
  if (mod.onlyFor && !mod.onlyFor.includes(baseGenre)) return false;
  return true;
}

// 베이스 장르 시드 + 선택 기능 오버레이를 조립해 최종 스키마(테이블·관계)를 산출
export function assembleOverlays(baseGenre: string, features: string[]): AssembledSchema {
  const baseSeedTables = SEED_TEMPLATES[baseGenre] ?? [];
  const allTableNames = new Set(baseSeedTables.map((t) => t.name));

  const overlayTablesList: SeedTable[] = [];
  const overlayTableNames: string[] = [];
  const relations: AssembledSchema["relations"] = [];

  for (const feature of features) {
    const mod = FEATURE_MODULES.find((m) => m.key === feature);
    if (!mod) continue;
    if (!moduleApplies(mod, baseGenre)) continue;

    for (const table of mod.tables) {
      if (allTableNames.has(table.name)) continue;
      allTableNames.add(table.name);
      overlayTableNames.push(table.name);
      overlayTablesList.push(table);
    }
  }

  // FK 의도 해소: targetCandidates 중 실제로 존재하는 첫 테이블로 관계 생성 (to_column: "id")
  for (const feature of features) {
    const mod = FEATURE_MODULES.find((m) => m.key === feature);
    if (!mod) continue;
    if (!moduleApplies(mod, baseGenre)) continue;

    for (const intent of mod.fkIntents) {
      if (!allTableNames.has(intent.fromTable)) continue;
      const target = intent.targetCandidates.find((c) => allTableNames.has(c));
      if (!target) continue;
      relations.push({
        from_table: intent.fromTable,
        from_column: intent.fromColumn,
        to_table: target,
        to_column: "id",
      });
    }
  }

  return {
    baseTables: baseSeedTables.map((t) => t.name),
    overlayTables: overlayTableNames,
    allTables: [...baseSeedTables, ...overlayTablesList],
    relations,
  };
}

// 클라이언트 실시간 미리보기용 테이블 개수 산출 (assembleOverlays 와 동일 적용 로직)
export function getTableCountPreview(baseGenre: string, features: string[]): { base: number; overlay: number } {
  const baseSeedTables = SEED_TEMPLATES[baseGenre] ?? [];
  const allTableNames = new Set(baseSeedTables.map((t) => t.name));
  let overlay = 0;

  for (const feature of features) {
    const mod = FEATURE_MODULES.find((m) => m.key === feature);
    if (!mod) continue;
    if (!moduleApplies(mod, baseGenre)) continue;

    for (const table of mod.tables) {
      if (allTableNames.has(table.name)) continue;
      allTableNames.add(table.name);
      overlay++;
    }
  }

  return { base: baseSeedTables.length, overlay };
}
