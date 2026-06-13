export type SeedColumn = { name: string; type: "string" | "number" | "boolean" };
export type SeedTable = { name: string; columns: SeedColumn[] };

export const GENRES: { code: string; label: string; hint: string }[] = [
  { code: "collection_rpg", label: "수집형 RPG", hint: "캐릭터 수집·가챠·성장" },
  { code: "idle_rpg", label: "방치형 RPG", hint: "자동 전투·방치 보상·경제" },
  { code: "mmorpg", label: "MMORPG", hint: "직업·장비 강화·던전·거래소" },
  { code: "battle_rpg", label: "턴제/액션 RPG", hint: "속성 상성·스킬·챕터" },
  { code: "roguelike_rpg", label: "로그라이크 RPG", hint: "런/층 스케일링·아이템 시너지" },
  { code: "srpg", label: "SRPG (전략)", hint: "유닛 성장률·무기 상성·그리드" },
];

export const SEED_TEMPLATES: Record<string, SeedTable[]> = {
  collection_rpg: [
    { name: "characters", columns: [
      { name: "name", type: "string" }, { name: "grade", type: "string" }, { name: "element", type: "string" },
      { name: "base_hp", type: "number" }, { name: "base_atk", type: "number" }, { name: "base_def", type: "number" },
      { name: "base_spd", type: "number" }, { name: "crit_rate", type: "number" }, { name: "growth_type", type: "string" },
      { name: "skill_1_id", type: "string" }, { name: "skill_2_id", type: "string" },
    ] },
    { name: "character_levels", columns: [
      { name: "character_id", type: "string" }, { name: "level", type: "number" },
      { name: "hp", type: "number" }, { name: "atk", type: "number" }, { name: "def", type: "number" }, { name: "spd", type: "number" },
    ] },
    { name: "skills", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "damage_ratio", type: "number" },
      { name: "cooldown", type: "number" }, { name: "description", type: "string" },
    ] },
    { name: "items", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "grade", type: "string" },
      { name: "stat_type", type: "string" }, { name: "stat_value", type: "number" },
    ] },
    { name: "stages", columns: [
      { name: "name", type: "string" }, { name: "chapter", type: "number" }, { name: "stage_no", type: "number" },
      { name: "recommend_cp", type: "number" }, { name: "boss_hp", type: "number" }, { name: "boss_atk", type: "number" }, { name: "energy_cost", type: "number" },
    ] },
    { name: "drop_tables", columns: [
      { name: "stage_id", type: "string" }, { name: "item_id", type: "string" }, { name: "drop_rate", type: "number" },
      { name: "min_count", type: "number" }, { name: "max_count", type: "number" },
    ] },
    { name: "gacha_tables", columns: [
      { name: "pool_name", type: "string" }, { name: "character_id", type: "string" },
      { name: "weight", type: "number" }, { name: "pity_count", type: "number" },
    ] },
  ],

  idle_rpg: [
    { name: "heroes", columns: [
      { name: "name", type: "string" }, { name: "class", type: "string" }, { name: "base_dps", type: "number" },
      { name: "unlock_level", type: "number" }, { name: "upgrade_cost_gold", type: "number" },
      { name: "growth_type", type: "string" }, { name: "growth_base", type: "number" }, { name: "growth_factor", type: "number" },
    ] },
    { name: "hero_levels", columns: [
      { name: "hero_id", type: "string" }, { name: "level", type: "number" },
      { name: "dps", type: "number" }, { name: "upgrade_cost", type: "number" },
    ] },
    { name: "buildings", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "level", type: "number" },
      { name: "gold_per_hour", type: "number" }, { name: "upgrade_cost", type: "number" }, { name: "upgrade_time_sec", type: "number" },
    ] },
    { name: "enemies", columns: [
      { name: "name", type: "string" }, { name: "zone", type: "number" }, { name: "hp", type: "number" },
      { name: "dps", type: "number" }, { name: "gold_drop", type: "number" }, { name: "exp_drop", type: "number" },
    ] },
    { name: "quests", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "requirement_type", type: "string" },
      { name: "requirement_value", type: "number" }, { name: "reward_gold", type: "number" }, { name: "reward_gem", type: "number" },
    ] },
    { name: "economy_config", columns: [
      { name: "key", type: "string" }, { name: "value", type: "number" }, { name: "description", type: "string" },
    ] },
    { name: "offline_rewards", columns: [
      { name: "hours_offline", type: "number" }, { name: "gold_reward", type: "number" }, { name: "efficiency", type: "number" },
    ] },
  ],

  mmorpg: [
    { name: "classes", columns: [
      { name: "name", type: "string" }, { name: "role", type: "string" }, { name: "base_hp", type: "number" },
      { name: "base_atk", type: "number" }, { name: "base_def", type: "number" }, { name: "resource_type", type: "string" }, { name: "growth_type", type: "string" },
    ] },
    { name: "class_levels", columns: [
      { name: "class_id", type: "string" }, { name: "level", type: "number" },
      { name: "hp", type: "number" }, { name: "atk", type: "number" }, { name: "def", type: "number" }, { name: "mp", type: "number" },
    ] },
    { name: "skills", columns: [
      { name: "class_id", type: "string" }, { name: "name", type: "string" }, { name: "type", type: "string" },
      { name: "damage_ratio", type: "number" }, { name: "cooldown", type: "number" }, { name: "mp_cost", type: "number" }, { name: "range", type: "number" },
    ] },
    { name: "equipment", columns: [
      { name: "name", type: "string" }, { name: "slot", type: "string" }, { name: "grade", type: "string" },
      { name: "stat_type", type: "string" }, { name: "stat_value", type: "number" }, { name: "enhance_max", type: "number" },
    ] },
    { name: "enhance_table", columns: [
      { name: "enhance_level", type: "number" }, { name: "success_rate", type: "number" },
      { name: "cost_gold", type: "number" }, { name: "stat_bonus", type: "number" },
    ] },
    { name: "monsters", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "hp", type: "number" },
      { name: "atk", type: "number" }, { name: "def", type: "number" }, { name: "exp", type: "number" }, { name: "gold", type: "number" },
    ] },
    { name: "dungeons", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "recommend_cp", type: "number" },
      { name: "boss_monster_id", type: "string" }, { name: "party_size", type: "number" },
    ] },
    { name: "market_items", columns: [
      { name: "equipment_id", type: "string" }, { name: "base_price", type: "number" },
      { name: "supply", type: "number" }, { name: "demand", type: "number" },
    ] },
    { name: "pvp_tiers", columns: [
      { name: "tier_name", type: "string" }, { name: "mmr_min", type: "number" },
      { name: "mmr_max", type: "number" }, { name: "reward_gold", type: "number" },
    ] },
  ],

  battle_rpg: [
    { name: "characters", columns: [
      { name: "name", type: "string" }, { name: "element", type: "string" }, { name: "role", type: "string" },
      { name: "base_hp", type: "number" }, { name: "base_atk", type: "number" }, { name: "base_def", type: "number" },
      { name: "base_spd", type: "number" }, { name: "crit_rate", type: "number" }, { name: "growth_type", type: "string" },
    ] },
    { name: "character_levels", columns: [
      { name: "character_id", type: "string" }, { name: "level", type: "number" },
      { name: "hp", type: "number" }, { name: "atk", type: "number" }, { name: "def", type: "number" }, { name: "spd", type: "number" },
    ] },
    { name: "skills", columns: [
      { name: "character_id", type: "string" }, { name: "name", type: "string" }, { name: "type", type: "string" },
      { name: "damage_ratio", type: "number" }, { name: "sp_cost", type: "number" }, { name: "element", type: "string" }, { name: "target", type: "string" },
    ] },
    { name: "equipment", columns: [
      { name: "name", type: "string" }, { name: "slot", type: "string" },
      { name: "stat_type", type: "string" }, { name: "stat_value", type: "number" },
    ] },
    { name: "elements", columns: [
      { name: "attacker_element", type: "string" }, { name: "defender_element", type: "string" }, { name: "multiplier", type: "number" },
    ] },
    { name: "enemies", columns: [
      { name: "name", type: "string" }, { name: "element", type: "string" }, { name: "hp", type: "number" },
      { name: "atk", type: "number" }, { name: "def", type: "number" }, { name: "spd", type: "number" }, { name: "is_boss", type: "boolean" },
    ] },
    { name: "chapters", columns: [
      { name: "name", type: "string" }, { name: "chapter_no", type: "number" }, { name: "stage_no", type: "number" },
      { name: "recommend_level", type: "number" }, { name: "enemy_id", type: "string" }, { name: "exp_reward", type: "number" },
    ] },
    { name: "exp_curves", columns: [
      { name: "level", type: "number" }, { name: "exp_required", type: "number" },
    ] },
  ],

  roguelike_rpg: [
    { name: "characters", columns: [
      { name: "name", type: "string" }, { name: "base_hp", type: "number" }, { name: "base_atk", type: "number" },
      { name: "base_speed", type: "number" }, { name: "starting_item_id", type: "string" },
    ] },
    { name: "items", columns: [
      { name: "name", type: "string" }, { name: "rarity", type: "string" }, { name: "effect_type", type: "string" },
      { name: "effect_value", type: "number" }, { name: "synergy_tag", type: "string" },
    ] },
    { name: "synergies", columns: [
      { name: "synergy_tag", type: "string" }, { name: "pieces_required", type: "number" },
      { name: "bonus_type", type: "string" }, { name: "bonus_value", type: "number" },
    ] },
    { name: "enemies", columns: [
      { name: "name", type: "string" }, { name: "hp", type: "number" }, { name: "atk", type: "number" },
      { name: "behavior", type: "string" }, { name: "is_elite", type: "boolean" },
    ] },
    { name: "floors", columns: [
      { name: "floor_no", type: "number" }, { name: "room_type", type: "string" }, { name: "enemy_count", type: "number" },
    ] },
    { name: "floor_scaling", columns: [
      { name: "floor_no", type: "number" }, { name: "hp_mult", type: "number" }, { name: "atk_mult", type: "number" },
    ] },
    { name: "events", columns: [
      { name: "name", type: "string" }, { name: "floor_min", type: "number" }, { name: "probability", type: "number" },
      { name: "reward_type", type: "string" }, { name: "risk_type", type: "string" },
    ] },
    { name: "shop_items", columns: [
      { name: "item_id", type: "string" }, { name: "base_price", type: "number" }, { name: "appear_rate", type: "number" },
    ] },
    { name: "run_modifiers", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" },
      { name: "stat_affected", type: "string" }, { name: "modifier", type: "number" },
    ] },
  ],

  srpg: [
    { name: "units", columns: [
      { name: "name", type: "string" }, { name: "class_id", type: "string" }, { name: "base_hp", type: "number" },
      { name: "base_atk", type: "number" }, { name: "base_def", type: "number" }, { name: "base_mov", type: "number" }, { name: "base_range", type: "number" },
      { name: "growth_hp", type: "number" }, { name: "growth_atk", type: "number" }, { name: "growth_def", type: "number" },
    ] },
    { name: "unit_levels", columns: [
      { name: "unit_id", type: "string" }, { name: "level", type: "number" },
      { name: "hp", type: "number" }, { name: "atk", type: "number" }, { name: "def", type: "number" },
    ] },
    { name: "classes", columns: [
      { name: "name", type: "string" }, { name: "tier", type: "number" },
      { name: "move_type", type: "string" }, { name: "promote_to_id", type: "string" },
    ] },
    { name: "weapons", columns: [
      { name: "name", type: "string" }, { name: "type", type: "string" }, { name: "might", type: "number" },
      { name: "hit", type: "number" }, { name: "weight", type: "number" }, { name: "range_min", type: "number" }, { name: "range_max", type: "number" },
    ] },
    { name: "weapon_triangle", columns: [
      { name: "attacker_type", type: "string" }, { name: "defender_type", type: "string" },
      { name: "hit_bonus", type: "number" }, { name: "damage_bonus", type: "number" },
    ] },
    { name: "terrain", columns: [
      { name: "name", type: "string" }, { name: "def_bonus", type: "number" },
      { name: "avoid_bonus", type: "number" }, { name: "move_cost", type: "number" },
    ] },
    { name: "maps", columns: [
      { name: "name", type: "string" }, { name: "chapter_no", type: "number" }, { name: "width", type: "number" },
      { name: "height", type: "number" }, { name: "turn_limit", type: "number" }, { name: "objective", type: "string" },
    ] },
  ],
};

export const SIM_SUMMARY: Record<string, string[]> = {
  collection_rpg: ["가챠", "전투", "스탯 계산기"],
  idle_rpg: ["경제+인플레이션", "난이도/플레이타임"],
  mmorpg: ["경제+인플레이션", "DPS 분산(레이드)", "PvP 승률 매트릭스"],
  battle_rpg: ["전투", "스탯 계산기", "DPS 분산", "난이도/플레이타임"],
  roguelike_rpg: ["전투(런)", "DPS 분산(빌드)", "난이도(층)"],
  srpg: ["전투", "스탯 계산기", "난이도/플레이타임"],
};
