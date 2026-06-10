---
name: game-schema
description: 게임 장르별 DB 스키마 설계 패턴. 수집형 RPG, 방치형 RPG 등 장르에 맞는 테이블/컬럼/관계 구조를 제공한다. "스키마 설계", "테이블 구조", "장르별 데이터 모델", "어떤 테이블이 필요해" 등 게임 데이터 모델링 요청 시 반드시 이 스킬을 사용한다.
---

> **RPG 6종 전용.** 지원 장르 코드: `collection_rpg`, `idle_rpg`, `mmorpg`, `battle_rpg`, `roguelike_rpg`, `srpg`.
> 테이블·컬럼 사양의 단일 출처는 `game-data-feature/_workspace/00_genre_contract.md` §5다. 이 문서는 그 계약을 글자까지 그대로 옮긴 것이며, 충돌 시 계약이 우선한다.

## 공통 규칙

- `id`: TEXT (nanoid, PRIMARY KEY) — 모든 테이블 필수 (`create_table`이 자동 생성)
- 수치 데이터: number (INTEGER/REAL)
- 텍스트 분류: string (TEXT)
- 플래그: boolean (INTEGER 0/1)
- `created_at`, `updated_at`: INTEGER (epoch ms)
- FK 컬럼명은 `<target>_id` 패턴 (예: `characters.skill_1_id → skills.id`)

### 하이브리드 성장 구조 (전 장르 공통)

성장하는 엔티티는 **메타 테이블 + `<entity>_levels` 전개 테이블** 두 층으로 나눈다.

- **메타 테이블**: 등급·속성·`base_*` 기본 스탯 + 성장 곡선 파라미터(`growth_type` 등 — linear/power/exponential). 디자이너가 손으로 채우는 원천 데이터.
- **전개 테이블**: `(<entity>_id, level, hp, atk, def, …)` 레벨별 실제 전개값. `generate_curve`(linear/power/exponential)로 base 값 + growth_type에서 산출한다. 손으로 채우지 않는다.

따라서 메타의 `base_hp`/`growth_type` → `generate_curve` → `<entity>_levels`의 레벨별 `hp` 흐름이 표준이다.
예외: 일부 장르는 곡선 대신 다른 성장 축을 쓴다 — roguelike는 `floor_scaling`(층별 배율, `floor_no` 키), srpg는 메타의 `growth_*`(%) 성장률을 `unit_levels`로 전개한다.

---

## 수집형 RPG (collection_rpg)

### 핵심 테이블 (6개 + 전개 1개)

**characters** — 캐릭터 기본 스탯 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | nanoid PK |
| name | string | 캐릭터명 |
| grade | string | N/R/SR/SSR |
| element | string | fire/ice/dark/nature/light |
| base_hp | number | 기본 체력 |
| base_atk | number | 기본 공격력 |
| base_def | number | 기본 방어력 |
| base_spd | number | 기본 속도 |
| crit_rate | number | 치명타율 (0~1) |
| growth_type | string | linear/power/exponential |
| skill_1_id | string | → skills.id |
| skill_2_id | string | → skills.id |

**character_levels** 🆕전개 — 레벨별 전개 스탯 (`generate_curve` 산출)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| character_id | string | → characters.id |
| level | number | |
| hp | number | |
| atk | number | |
| def | number | |
| spd | number | |

**skills** — 스킬 정의
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | active/passive |
| damage_ratio | number | 공격력 배율 (0~5) |
| cooldown | number | 쿨타임(초) |
| description | string | |

**items** — 장비/아이템
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | weapon/armor/accessory/consumable |
| grade | string | N/R/SR/SSR |
| stat_type | string | hp/atk/def/spd |
| stat_value | number | |

**stages** — 스테이지
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| chapter | number | |
| stage_no | number | |
| recommend_cp | number | 권장 전투력 |
| boss_hp | number | |
| boss_atk | number | |
| energy_cost | number | |

**drop_tables** — 드롭 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| stage_id | string | → stages.id |
| item_id | string | → items.id |
| drop_rate | number | 0~1 |
| min_count | number | |
| max_count | number | |

**gacha_tables** — 가챠 설정
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| pool_name | string | 풀 이름 |
| character_id | string | → characters.id |
| weight | number | 가중치 |
| pity_count | number | 천장 (0이면 미적용) |

> 변경점(계약 §5.1): 기존 `balance_curves`(multiplier 방식)는 제거하고 `character_levels` 전개 테이블로 대체. characters의 hp/atk/def/spd → `base_*` 명명 + `growth_type` 추가.

### 관계
```
characters.skill_1_id      → skills.id
characters.skill_2_id      → skills.id
character_levels.character_id → characters.id
drop_tables.stage_id       → stages.id
drop_tables.item_id        → items.id
gacha_tables.character_id  → characters.id
```

---

## 방치형 RPG (idle_rpg)

### 핵심 테이블 (6개 + 전개 1개)

**heroes** — 영웅 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| class | string | warrior/mage/archer/healer |
| base_dps | number | 기본 초당 피해 |
| unlock_level | number | 해금 레벨 |
| upgrade_cost_gold | number | 강화 비용 |
| growth_type | string | linear/power/exponential |

**hero_levels** 🆕전개 — 레벨별 전개 (`generate_curve` 산출)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| hero_id | string | → heroes.id |
| level | number | |
| dps | number | |
| upgrade_cost | number | |

**buildings** — 건물/시설
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | production/combat/storage |
| level | number | |
| gold_per_hour | number | 시간당 골드 |
| upgrade_cost | number | |
| upgrade_time_sec | number | |

**enemies** — 몬스터
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| zone | number | 구역 번호 |
| hp | number | |
| dps | number | |
| gold_drop | number | |
| exp_drop | number | |

**quests** — 퀘스트
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | daily/weekly/story |
| requirement_type | string | kill/collect/reach |
| requirement_value | number | |
| reward_gold | number | |
| reward_gem | number | |

**economy_config** — 경제 파라미터
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| key | string | 파라미터명 |
| value | number | |
| description | string | |

**offline_rewards** — 방치 보상 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| hours_offline | number | 방치 시간 |
| gold_reward | number | |
| efficiency | number | 효율 (0~1) |

### 관계
```
hero_levels.hero_id → heroes.id
```

---

## MMORPG (mmorpg)

### 핵심 테이블 (8개 + 전개 1개)

**classes** — 직업 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| role | string | tank/dps/healer |
| base_hp | number | |
| base_atk | number | |
| base_def | number | |
| resource_type | string | 자원 유형(mp/rage 등) |
| growth_type | string | linear/power/exponential |

**class_levels** 전개 — 레벨별 전개 (`generate_curve` 산출)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| class_id | string | → classes.id |
| level | number | |
| hp | number | |
| atk | number | |
| def | number | |
| mp | number | |

**skills** — 스킬
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| class_id | string | → classes.id |
| name | string | |
| type | string | |
| damage_ratio | number | |
| cooldown | number | |
| mp_cost | number | |
| range | number | |

**equipment** — 장비
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| slot | string | weapon/armor/accessory |
| grade | string | |
| stat_type | string | |
| stat_value | number | |
| enhance_max | number | 최대 강화 단계 |

**enhance_table** — 강화 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| enhance_level | number | |
| success_rate | number | 0~1 |
| cost_gold | number | |
| stat_bonus | number | |

**monsters** — 몬스터
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | normal/elite/raid |
| hp | number | |
| atk | number | |
| def | number | |
| exp | number | |
| gold | number | |

**dungeons** — 던전/레이드
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | dungeon/raid |
| recommend_cp | number | 권장 전투력 |
| boss_monster_id | string | → monsters.id |
| party_size | number | |

**market_items** — 거래소
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| equipment_id | string | → equipment.id |
| base_price | number | |
| supply | number | 공급 |
| demand | number | 수요 |

**pvp_tiers** — PvP 티어
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| tier_name | string | |
| mmr_min | number | |
| mmr_max | number | |
| reward_gold | number | |

### 관계
```
class_levels.class_id     → classes.id
skills.class_id           → classes.id
dungeons.boss_monster_id  → monsters.id
market_items.equipment_id → equipment.id
```

---

## 턴제/액션 RPG (battle_rpg)

### 핵심 테이블 (7개 + 전개 1개)

> `character_levels`가 하이브리드 전개 테이블이고, `exp_curves`는 별도 일반 테이블(레벨업 경험치 곡선)이다.

**characters** — 캐릭터 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| element | string | 속성 |
| role | string | 역할 |
| base_hp | number | |
| base_atk | number | |
| base_def | number | |
| base_spd | number | |
| crit_rate | number | |
| growth_type | string | linear/power/exponential |

**character_levels** 전개 — 레벨별 전개 (`generate_curve` 산출)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| character_id | string | → characters.id |
| level | number | |
| hp | number | |
| atk | number | |
| def | number | |
| spd | number | |

**skills** — 스킬
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| character_id | string | → characters.id |
| name | string | |
| type | string | active/passive |
| damage_ratio | number | |
| sp_cost | number | |
| element | string | |
| target | string | single/all |

**equipment** — 장비
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| slot | string | |
| stat_type | string | |
| stat_value | number | |

**elements** — 속성 상성표
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| attacker_element | string | |
| defender_element | string | |
| multiplier | number | 피해 배율 |

**enemies** — 적
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| element | string | |
| hp | number | |
| atk | number | |
| def | number | |
| spd | number | |
| is_boss | boolean | |

**chapters** — 챕터/스테이지
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| chapter_no | number | |
| stage_no | number | |
| recommend_level | number | |
| enemy_id | string | → enemies.id |
| exp_reward | number | |

**exp_curves** — 경험치 곡선 (일반)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| level | number | |
| exp_required | number | |

### 관계
```
character_levels.character_id → characters.id
skills.character_id           → characters.id
chapters.enemy_id             → enemies.id
```

---

## 로그라이크 RPG (roguelike_rpg)

> 성장 축 = 런/층 스케일링 + 아이템 시너지. 전개 테이블 = `floor_scaling`(층별 적 스탯 배율, `floor_no` 키 — FK 아님).

### 핵심 테이블 (8개 + 전개 1개)

**characters** — 캐릭터 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| base_hp | number | |
| base_atk | number | |
| base_speed | number | 기본 속도 |
| starting_item_id | string | → items.id |

**items** — 아이템
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| rarity | string | common/rare/epic/legendary |
| effect_type | string | |
| effect_value | number | |
| synergy_tag | string | 시너지 태그 |

**synergies** — 시너지
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| synergy_tag | string | |
| pieces_required | number | 발동 필요 개수 |
| bonus_type | string | |
| bonus_value | number | |

**enemies** — 적
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| hp | number | |
| atk | number | |
| behavior | string | 행동 패턴 |
| is_elite | boolean | |

**floors** — 층
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| floor_no | number | |
| room_type | string | combat/elite/shop/boss/treasure |
| enemy_count | number | |

**floor_scaling** 전개 — 층별 적 스탯 배율 (`floor_no` 키, FK 아님)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| floor_no | number | |
| hp_mult | number | 체력 배율 |
| atk_mult | number | 공격 배율 |

**events** — 이벤트
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| floor_min | number | 등장 최소 층 |
| probability | number | |
| reward_type | string | |
| risk_type | string | |

**shop_items** — 상점 아이템
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| item_id | string | → items.id |
| base_price | number | |
| appear_rate | number | |

**run_modifiers** — 런 변경자
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | boon/curse |
| stat_affected | string | |
| modifier | number | |

### 관계
```
characters.starting_item_id → items.id
shop_items.item_id          → items.id
```
> 주의: `floor_scaling.floor_no`는 `floors.floor_no`와 값이 같아도 FK가 아니다. 관계로 등록하지 않는다.

---

## SRPG (전략) (srpg)

> 핵심 = 성장률(growth rate). 전개 = `unit_levels`. units의 `growth_hp/growth_atk/growth_def`(%) 성장률을 전개한다(이 장르는 `growth_type` 미사용). 무기 상성·지형 보정 포함.

### 핵심 테이블 (6개 + 전개 1개)

**units** — 유닛 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| class_id | string | → classes.id |
| base_hp | number | |
| base_atk | number | |
| base_def | number | |
| base_mov | number | 기본 이동력 |
| base_range | number | 기본 사거리 |
| growth_hp | number | 체력 성장률 (%) |
| growth_atk | number | 공격 성장률 (%) |
| growth_def | number | 방어 성장률 (%) |

**unit_levels** 전개 — 레벨별 전개 (성장률 기반 산출)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| unit_id | string | → units.id |
| level | number | |
| hp | number | |
| atk | number | |
| def | number | |

**classes** — 병종
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| tier | number | |
| move_type | string | infantry/cavalry/flying |
| promote_to_id | string | → classes.id (승급 대상, 자기참조) |

**weapons** — 무기
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | sword/lance/axe/bow/magic |
| might | number | 위력 |
| hit | number | 명중 |
| weight | number | 무게 |
| range_min | number | |
| range_max | number | |

**weapon_triangle** — 무기 상성표
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| attacker_type | string | |
| defender_type | string | |
| hit_bonus | number | |
| damage_bonus | number | |

**terrain** — 지형
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| def_bonus | number | 방어 보정 |
| avoid_bonus | number | 회피 보정 |
| move_cost | number | 이동 비용 |

**maps** — 맵
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| chapter_no | number | |
| width | number | |
| height | number | |
| turn_limit | number | |
| objective | string | rout/seize/survive |

### 관계
```
units.class_id        → classes.id
unit_levels.unit_id   → units.id
classes.promote_to_id → classes.id  (자기참조)
```

---

## MCP 호출 시퀀스 패턴

하이브리드 구조에서는 **메타 테이블 → 전개 테이블** 순으로 만들고, 전개값은 `generate_curve`로 채운다.

```typescript
// 1. 프로젝트 생성 (genre는 6종 코드 중 하나)
create_project({ name: "ProjectZ", genre: "collection_rpg" })

// 2. 테이블 생성 (순서 중요: FK 대상 테이블 먼저)
create_table({ project_id, name: "skills", description: "스킬 정의" })
create_table({ project_id, name: "characters", description: "캐릭터 메타" })
create_table({ project_id, name: "character_levels", description: "레벨별 전개" })

// 3. 컬럼 추가 (메타는 base_*/growth_type, 전개는 level/hp/atk/...)
add_column({ table_id: characters_id, name: "base_hp", type: "number" })
add_column({ table_id: characters_id, name: "growth_type", type: "string" })
add_column({ table_id: characters_id, name: "skill_1_id", type: "string" })
add_column({ table_id: character_levels_id, name: "character_id", type: "string" })
add_column({ table_id: character_levels_id, name: "level", type: "number" })
add_column({ table_id: character_levels_id, name: "hp", type: "number" })

// 4. 관계 설정 (각 장르 "관계" 표의 "→" 그대로)
set_relation({ from_table_id: characters_id, from_column: "skill_1_id",
               to_table_id: skills_id, to_column: "id" })
set_relation({ from_table_id: character_levels_id, from_column: "character_id",
               to_table_id: characters_id, to_column: "id" })

// 5. 전개 테이블 채우기 (base + growth_type → 레벨별 행)
generate_curve({ table_id: character_levels_id, /* base, growth_type, level 범위 */ })
```

## 설계 원칙

- **하이브리드 우선**: 성장 엔티티는 메타(`base_*`+`growth_type`) / 전개(`<entity>_levels`) 두 층으로. 전개값은 손이 아니라 `generate_curve`로 생성한다.
- 수치 컬럼은 등급(grade)·역할(role)로 그룹화 가능해야 밸런싱 비교가 쉽다.
- 시드는 각 장르의 핵심 테이블만(계약 §5). 임의 테이블/컬럼 추가 금지 — 계약과 글자까지 일치시킨다.
- 관계가 복잡해지면 junction 테이블 대신 JSON 컬럼 고려 (SQLite 특성).
- 계약 §5에 없는 정규화(예: `floor_scaling`을 `floors`에 FK로 묶기)는 하지 않는다 — 의도된 비정규화다.
