# 방치형 RPG (idle_rpg) — 스키마 사양

> 단일 출처: `game-data-feature/_workspace/00_genre_contract.md §5.2`

## 테이블 (6개 메타 + 1개 전개)

**heroes** — 영웅 (메타)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id / name | | |
| class | string | warrior/mage/archer/healer |
| base_dps | number | 기본 초당 피해 |
| unlock_level | number | |
| upgrade_cost_gold | number | |
| growth_type | string | linear/power/exponential |

**hero_levels** — 전개 (`generate_curve` 산출)
| 컬럼 | 타입 |
|------|------|
| id / hero_id | string (hero_id → heroes.id) |
| level | number |
| dps / upgrade_cost | number |

**buildings** — 건물/시설
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (production/combat/storage) |
| level | number |
| gold_per_hour / upgrade_cost / upgrade_time_sec | number |

**enemies** — 몬스터
| 컬럼 | 타입 |
|------|------|
| id / name | |
| zone | number |
| hp / dps / gold_drop / exp_drop | number |

**quests** — 퀘스트
| 컬럼 | 타입 |
|------|------|
| id / name | |
| type | string (daily/weekly/story) |
| requirement_type | string (kill/collect/reach) |
| requirement_value / reward_gold / reward_gem | number |

**economy_config** — 경제 파라미터
| 컬럼 | 타입 |
|------|------|
| id / key | |
| value | number |
| description | string |

**offline_rewards** — 방치 보상 테이블
| 컬럼 | 타입 |
|------|------|
| id | |
| hours_offline | number |
| gold_reward | number |
| efficiency | number (0~1) |

## 관계
```
hero_levels.hero_id → heroes.id
```
