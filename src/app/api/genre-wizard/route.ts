import { NextRequest, NextResponse } from "next/server";
import { spawnClaude } from "@/lib/util/claude";

// claude 헤드리스 호출이 필요하므로 Node 런타임 고정
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── 장르 6종 (계약 §1) ─────────────────────────────────────────────
const GENRE_LABELS: Record<string, { label: string; hint: string }> = {
  collection_rpg: { label: "수집형 RPG", hint: "캐릭터 수집·가챠·성장" },
  idle_rpg: { label: "방치형 RPG", hint: "자동 전투·방치 보상·경제" },
  mmorpg: { label: "MMORPG", hint: "직업·장비 강화·던전·거래소" },
  battle_rpg: { label: "턴제/액션 RPG", hint: "속성 상성·스킬·챕터" },
  roguelike_rpg: { label: "로그라이크 RPG", hint: "런/층 스케일링·아이템 시너지" },
  srpg: { label: "SRPG (전략)", hint: "유닛 성장률·무기 상성·그리드" },
};

// ── 시드 테이블 셋 (계약 §5 단일 출처를 글자까지 그대로 전개) ───────────
// 각 장르 = 메타 테이블 + <entity>_levels 등 전개 테이블을 한 배열로 flatten.
// type ∈ {string, number, boolean}. 공통: 모든 테이블에 id(자동) PK, FK는 <col>_id.
type SeedColumn = { name: string; type: "string" | "number" | "boolean" };
type SeedTable = { name: string; columns: SeedColumn[] };

const SEED_TEMPLATES: Record<string, SeedTable[]> = {
  // 5.1 collection_rpg (7테이블)
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

  // 5.2 idle_rpg (7테이블)
  idle_rpg: [
    { name: "heroes", columns: [
      { name: "name", type: "string" }, { name: "class", type: "string" }, { name: "base_dps", type: "number" },
      { name: "unlock_level", type: "number" }, { name: "upgrade_cost_gold", type: "number" }, { name: "growth_type", type: "string" },
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

  // 5.3 mmorpg (9테이블)
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

  // 5.4 battle_rpg (8테이블)
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

  // 5.5 roguelike_rpg (9테이블)
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

  // 5.6 srpg (7테이블)
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

// 시드 테이블 셋을 프롬프트에 넣을 텍스트로 직렬화
function seedToText(tables: SeedTable[]): string {
  return tables
    .map((t) => `- ${t.name}: ${t.columns.map((c) => `${c.name}(${c.type})`).join(", ")}`)
    .join("\n");
}

// claude -p --output-format json 으로 호출하고 assistant 최종 텍스트를 반환
function runClaude(prompt: string, system: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 마법사는 단순 구조 생성이라 빠르고 저렴한 모델로 충분 (WIZARD_MODEL 로 override)
    const model = process.env.WIZARD_MODEL ?? "haiku";
    // MCP/툴 없이 순수 텍스트 생성만 (strict-mcp-config 로 외부 MCP 서버 미로드)
    const child = spawnClaude(
      ["-p", "--output-format", "json", "--strict-mcp-config", "--model", model, "--append-system-prompt", system],
      { input: prompt },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (c: Buffer) => (out += c.toString()));
    child.stderr.on("data", (c: Buffer) => (err += c.toString()));
    child.on("error", reject);
    child.on("close", () => {
      try {
        const o = JSON.parse(out);
        resolve(typeof o.result === "string" ? o.result : out);
      } catch {
        reject(new Error("claude 응답 파싱 실패: " + (err || out).slice(0, 300)));
      }
    });
  });
}

// 응답 텍스트에서 JSON 객체만 추출 (코드펜스/서두 제거)
function extractJSON(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  return JSON.parse(t);
}

export async function POST(req: NextRequest) {
  const { choices = [], finish = false, genre } = await req.json();
  const path = (choices as string[]).filter(Boolean);
  const genreCode = typeof genre === "string" && GENRE_LABELS[genre] ? genre : undefined;
  const genreInfo = genreCode ? GENRE_LABELS[genreCode] : undefined;
  // 검증된 시드 테이블 셋 보유 여부 (없으면 빈손 생성 = 후방호환 분기)
  const seed = genreCode ? SEED_TEMPLATES[genreCode] : undefined;

  const system = [
    "너는 RPG 게임 수치 데이터 기획 온보딩 도우미다.",
    "이 툴은 RPG 6종(수집형 RPG / 방치형 RPG / MMORPG / 턴제·액션 RPG / 로그라이크 RPG / SRPG) 전용이다.",
    "사용자가 선택한 RPG 장르의 게임성·성장 구조를 단계적으로 구체화한다.",
    "모든 RPG는 메타 테이블 + <entity>_levels 전개 테이블의 하이브리드 성장 구조를 따른다.",
    "반드시 JSON 객체 하나만 출력한다. 마크다운, 코드펜스, 설명 문장 금지.",
  ].join("\n");

  const genreLine = genreInfo
    ? `선택한 장르: ${genreInfo.label} (${genreCode}) — ${genreInfo.hint}`
    : "선택한 장르: (미지정)";

  let prompt: string;
  if (finish) {
    if (seed && genreCode) {
      // finish + 검증된 장르: §5 시드 테이블 셋을 주입하고 그 위에서 보강·특화
      prompt = [
        genreLine,
        `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(없음)"}`,
        "아래는 이 장르에 검증된 시드 테이블 셋이다. 이 템플릿을 기반으로 보강·특화하라.",
        "핵심 테이블과 컬럼은 그대로 유지하고, 사용자의 선택 경로에 맞춰 컬럼·테이블을 추가하거나 조정할 수 있다. 빈손 생성 금지.",
        "",
        "[시드 테이블 셋]",
        seedToText(seed),
        "",
        "컬럼 type은 string | number | boolean 중 하나. 정확히 다음 JSON만 출력:",
        `{"type":"plan","name":"<프로젝트명 제안>","genre":"${genreCode}","description":"<2~3문장 컨셉>","tables":[{"name":"<영문 snake_case>","description":"<설명>","columns":[{"name":"<영문>","type":"string","description":"<설명>"}]}]}`,
      ].join("\n");
    } else {
      // 후방호환: genre 코드/시드 없을 때 기존 빈손 생성 흐름
      prompt = [
        `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(없음)"}`,
        "이 컨셉으로 RPG 게임 수치 데이터 프로젝트를 만든다. 장르에 핵심적인 테이블 4~8개와 각 컬럼을 설계해라.",
        "메타 테이블 + <entity>_levels 전개 테이블의 하이브리드 성장 구조를 권장한다.",
        "컬럼 type은 string | number | boolean 중 하나. 정확히 다음 JSON만 출력:",
        `{"type":"plan","name":"<프로젝트명 제안>","genre":"${path.join(" · ") || "RPG"}","description":"<2~3문장 컨셉>","tables":[{"name":"<영문 snake_case>","description":"<설명>","columns":[{"name":"<영문>","type":"string","description":"<설명>"}]}]}`,
      ].join("\n");
    }
  } else {
    // 추가 선택지: 선택한 RPG 장르 맥락에서 게임성을 세부 구체화
    prompt = [
      genreLine,
      `지금까지 사용자의 선택 경로: ${path.join(" > ") || "(시작)"}`,
      genreInfo
        ? `이 ${genreInfo.label}의 세부 게임성(성장 곡선·전투 방식·콘텐츠·경제 등)을 더 구체화할 선택지 4~6개를 제시해라.`
        : "다음 단계로 RPG 게임성을 더 구체화할 선택지 4~6개를 제시해라.",
      "보통 1~3단계면 충분하다.",
      "정확히 다음 JSON만 출력:",
      `{"type":"choices","question":"<이번 단계 질문>","options":[{"label":"<선택지>","hint":"<한 줄 설명>"}],"canFinish":<지금 만들어도 될 만큼 구체적이면 true, 아니면 false>}`,
    ].join("\n");
  }

  try {
    const text = await runClaude(prompt, system);
    const plan = extractJSON(text);
    // plan.genre 에는 항상 장르 코드가 들어가도록 결정적으로 덮어쓴다(haiku 출력 신뢰 금지).
    if (finish && genreCode && plan && typeof plan === "object") {
      (plan as Record<string, unknown>).genre = genreCode;
    }
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}
