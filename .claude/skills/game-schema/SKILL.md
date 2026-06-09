---
name: game-schema
description: 게임 장르별 DB 스키마 설계 패턴. 수집형 RPG, 방치형 RPG 등 장르에 맞는 테이블/컬럼/관계 구조를 제공한다. "스키마 설계", "테이블 구조", "장르별 데이터 모델", "어떤 테이블이 필요해" 등 게임 데이터 모델링 요청 시 반드시 이 스킬을 사용한다.
---

## 공통 규칙

- `id`: TEXT (nanoid, PRIMARY KEY) — 모든 테이블 필수
- 수치 데이터: number (INTEGER/REAL)
- 텍스트 분류: string (TEXT)
- 플래그: boolean (INTEGER 0/1)
- `created_at`, `updated_at`: INTEGER (epoch ms)
- 관계는 `{table}_{target}_id` 컬럼명 패턴 (예: `characters.skill_1_id`)

---

## 수집형 RPG (collection_rpg)

### 핵심 테이블 (7개)

**characters** — 캐릭터 기본 스탯
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | nanoid PK |
| name | string | 캐릭터명 |
| grade | string | N/R/SR/SSR |
| element | string | fire/ice/dark/nature/light |
| hp | number | 최대 체력 |
| atk | number | 공격력 |
| def | number | 방어력 |
| spd | number | 속도 |
| crit_rate | number | 치명타율 (0~1) |
| skill_1_id | string | → skills.id |
| skill_2_id | string | → skills.id |

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

**balance_curves** — 성장 곡선 (레벨별 수치)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| level | number | 1~100 |
| grade | string | N/R/SR/SSR |
| hp_multiplier | number | |
| atk_multiplier | number | |
| exp_required | number | |

### 관계
```
characters.skill_1_id → skills.id
characters.skill_2_id → skills.id
drop_tables.stage_id  → stages.id
drop_tables.item_id   → items.id
gacha_tables.character_id → characters.id
```

---

## 방치형 RPG (idle_rpg)

### 핵심 테이블 (6개)

**heroes** — 영웅
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| class | string | warrior/mage/archer/healer |
| base_dps | number | 기본 초당 피해 |
| unlock_level | number | 해금 레벨 |
| upgrade_cost_gold | number | 강화 비용 |

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

---

## MCP 호출 시퀀스 패턴

```typescript
// 1. 프로젝트 생성
create_project({ name: "ProjectZ", genre: "collection_rpg" })

// 2. 테이블 생성 (순서 중요: FK 대상 테이블 먼저)
create_table({ project_id, name: "skills", description: "스킬 정의" })
create_table({ project_id, name: "characters", description: "캐릭터 스탯" })

// 3. 컬럼 추가
add_column({ table_id: skills_id, name: "name", type: "string" })
add_column({ table_id: skills_id, name: "damage_ratio", type: "number" })
add_column({ table_id: characters_id, name: "skill_1_id", type: "string" })

// 4. 관계 설정
set_relation({ from_table_id: characters_id, from_column: "skill_1_id",
               to_table_id: skills_id, to_column: "id" })
```

## 설계 원칙

- 수치 컬럼은 등급(grade)으로 그룹화 가능해야 밸런싱 비교 가능
- MVP에는 핵심 테이블만 (5~8개), Post-MVP는 나중에 추가
- 관계가 복잡해지면 junction 테이블 대신 JSON 컬럼 고려 (SQLite 특성)
