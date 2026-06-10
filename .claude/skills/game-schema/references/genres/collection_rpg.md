# 수집형 RPG (collection_rpg) — 스키마 사양

> 단일 출처: `game-data-feature/_workspace/00_genre_contract.md §5.1`

## 테이블 (6개 메타 + 1개 전개)

**characters** — 캐릭터 기본 스탯 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | nanoid PK |
| name | string | |
| grade | string | N/R/SR/SSR |
| element | string | fire/ice/dark/nature/light |
| base_hp | number | |
| base_atk | number | |
| base_def | number | |
| base_spd | number | |
| crit_rate | number | 0~1 |
| growth_type | string | linear/power/exponential |
| skill_1_id | string | → skills.id |
| skill_2_id | string | → skills.id |

**character_levels** — 전개 (`generate_curve` 산출)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| character_id | string | → characters.id |
| level | number | |
| hp / atk / def / spd | number | |

**skills** — 스킬 정의
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | string | |
| name | string | |
| type | string | active/passive |
| damage_ratio | number | 공격력 배율 0~5 |
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
| chapter / stage_no | number | |
| recommend_cp / boss_hp / boss_atk / energy_cost | number | |

**drop_tables** — 드롭 테이블
| 컬럼 | 타입 |
|------|------|
| id / stage_id / item_id | string |
| drop_rate / min_count / max_count | number |

**gacha_tables** — 가챠 설정
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id / pool_name | string | |
| character_id | string | → characters.id |
| weight | number | |
| pity_count | number | 천장 (0이면 미적용) |

## 관계
```
characters.skill_1_id / skill_2_id → skills.id
character_levels.character_id      → characters.id
drop_tables.stage_id               → stages.id
drop_tables.item_id                → items.id
gacha_tables.character_id          → characters.id
```
